import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuestionnaireFlow from "@/components/questionnaire/QuestionnaireFlow";
import QuestionnaireNotificationOnboarding from "@/components/questionnaire/QuestionnaireNotificationOnboarding";
import QuestionnaireResults from "@/components/questionnaire/QuestionnaireResults";
import { ONBOARDING_V2_QUESTIONS } from "@/content/questionnaireV2";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  subscribe: vi.fn(),
  push: {
    enabled: false,
    loading: false,
    supported: true,
    morningHour: 7,
    morningMinute: 30,
    eveningHour: 21,
    eveningMinute: 0,
    preTrainingMinutes: 60,
    mode: "native" as "native" | "web" | null,
    supportReason: null as null | "preview_host" | "insecure" | "browser",
  },
}));

const queryBuilder = () => {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    update: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    single: vi.fn(async () => ({ data: { id: "draft-1" }, error: null })),
    maybeSingle: vi.fn(async () => ({ data: { id: "draft-1" }, error: null })),
    then: (resolvePromise: (value: { data: null; error: null }) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(resolvePromise),
  };
  return builder;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: "athlete-1" } }, error: null })),
      signOut: mocks.signOut,
    },
    from: vi.fn(() => queryBuilder()),
  },
}));

vi.mock("@/lib/programInstance", () => ({
  getOrCreateActiveInstance: vi.fn(async () => ({ id: "program-1" })),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@/hooks/usePushSubscription", () => ({
  usePushSubscription: () => ({
    ...mocks.push,
    subscribe: mocks.subscribe,
  }),
}));

describe("questionnaire V1.2 block A", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.push.enabled = false;
    mocks.push.loading = false;
    mocks.push.supported = true;
    mocks.push.mode = "native";
    mocks.push.supportReason = null;
    mocks.subscribe.mockResolvedValue(undefined);
  });

  it("neutralizes question 15 without changing its scoring contract", () => {
    const question15 = ONBOARDING_V2_QUESTIONS[14];

    expect(question15).toMatchObject({
      id: "err-07",
      text: "Wie oft verhältst du dich nach einem Fehler vorsichtiger, um nicht noch einmal aufzufallen?",
      type: "scale",
      dimension: "protection_after_mistake",
      scoringDirection: "lower_is_better",
      privacy: "aggregate_allowed",
      retestEligible: true,
      coachAggregateDimension: "Schutzmodus nach Fehlern",
      includeInScore: true,
    });
  });

  it("pauses locally and server-side without signing the athlete out", async () => {
    const onPauseExit = vi.fn();
    render(
      <MemoryRouter>
        <QuestionnaireFlow
          onComplete={vi.fn()}
          onBack={vi.fn()}
          onPauseExit={onPauseExit}
          draftStorageKey="questionnaire:test"
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Speichern & Pause" }));

    await waitFor(() => expect(onPauseExit).toHaveBeenCalledWith({
      answers: {},
      lastCategoryIndex: 0,
      lastGlobalIndex: undefined,
    }));
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("rewire:draft:questionnaire:test")).toContain('"lastCategoryIndex":0');
  });

  it("keeps the OS permission request behind explanation, time choice and an explicit tap", async () => {
    const onContinue = vi.fn();
    render(<QuestionnaireNotificationOnboarding onContinue={onContinue} />);

    expect(screen.getByRole("heading", { name: "Möchtest du erinnert werden?" })).toBeInTheDocument();
    expect(mocks.subscribe).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Zeiten auswählen" }));
    expect(screen.getByRole("heading", { name: "Wann sollen wir dich erinnern?" })).toBeInTheDocument();
    expect(mocks.subscribe).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Benachrichtigungen erlauben" }));

    await waitFor(() => expect(mocks.subscribe).toHaveBeenCalledWith({
      morningHour: 7,
      morningMinute: 30,
      eveningHour: 21,
      eveningMinute: 0,
      preTrainingMinutes: 60,
    }));
    expect(await screen.findByRole("heading", { name: "Dein Start ist vorbereitet." })).toBeInTheDocument();
  });

  it("explains the voluntary program-start reminder in both supported notification flows", () => {
    const { rerender } = render(<QuestionnaireNotificationOnboarding onContinue={vi.fn()} />);

    expect(screen.getByText(/Erinnerungen helfen dir beim Programmstart/)).toBeInTheDocument();

    mocks.push.mode = "web";
    rerender(<QuestionnaireNotificationOnboarding onContinue={vi.fn()} />);
    expect(screen.getByText(/Erinnerungen helfen dir beim Programmstart/)).toBeInTheDocument();
  });

  it("keeps new web users on the intended local default times", () => {
    mocks.push.mode = "web";
    render(<QuestionnaireNotificationOnboarding onContinue={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Zeiten auswählen" }));

    expect(screen.getByRole("combobox", { name: "Uhrzeit für den Check-in am Morgen" })).toHaveTextContent("07:30 Uhr");
    expect(screen.getByRole("combobox", { name: "Uhrzeit für das Journal am Abend" })).toHaveTextContent("21:00 Uhr");
  });

  it("shows notification onboarding only after the questionnaire save succeeds", async () => {
    render(
      <MemoryRouter>
        <QuestionnaireResults answers={{ "sport-01": "Boxen" }} draftStorageKey="questionnaire:test-result" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Fragebogen wird gespeichert..." })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Möchtest du erinnert werden?" })).not.toBeInTheDocument();

    expect(
      await screen.findByRole("heading", { name: "Möchtest du erinnert werden?" }, { timeout: 2000 }),
    ).toBeInTheDocument();
  });

  it("allows a voluntary skip and does not trap unsupported clients", () => {
    mocks.push.supported = false;
    mocks.push.mode = null;
    mocks.push.supportReason = "browser";
    const onContinue = vi.fn();
    render(<QuestionnaireNotificationOnboarding onContinue={onContinue} />);

    expect(screen.getByText(/in dieser Umgebung gerade nicht verfügbar/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Zeiten auswählen" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Jetzt nicht" }));
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(mocks.subscribe).not.toHaveBeenCalled();
  });

  it("wires the completed save to notification onboarding and preserves explicit sign-out separately", () => {
    const questionnaireSource = readFileSync(resolve(process.cwd(), "src/pages/Questionnaire.tsx"), "utf8");
    const resultsSource = readFileSync(
      resolve(process.cwd(), "src/components/questionnaire/QuestionnaireResults.tsx"),
      "utf8",
    );

    expect(questionnaireSource).toContain("onPauseExit={handleQuestionnairePause}");
    expect(questionnaireSource).not.toContain("onPauseExit={handleSignOutToStart}");
    expect(questionnaireSource).toContain("onClick={handleSignOutToStart}");
    expect(resultsSource).toContain("setSaveCompleted(true)");
    expect(resultsSource).toContain("<QuestionnaireNotificationOnboarding");
  });

  it("uses the agreed honest coach program-start copy on the existing web-push path", () => {
    const functionSource = readFileSync(
      resolve(process.cwd(), "supabase/functions/send-program-start-notification/index.ts"),
      "utf8",
    );

    expect(functionSource).toContain('title: "Dein Programm startet morgen"');
    expect(functionSource).toContain(
      'body: "Dein Coach hat das Programm gestartet. Dein erster Tag beginnt morgen."',
    );
    expect(functionSource).toContain('import webpush from "npm:web-push@3.6.7"');
  });
});
