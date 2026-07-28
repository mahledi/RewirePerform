import { addDays, isAfter, isValid, parseISO, startOfDay } from "date-fns";
import type { RetestStatus } from "@/lib/programProgress";

export type AthleteMeasurementStatus = Pick<
  RetestStatus,
  "midDue" | "midDone" | "postDue" | "postDone" | "programDay"
>;

export interface AthleteMeasurementDisplay {
  title: string;
  copy: string;
}

export const getAthleteMeasurementDisplay = (
  status: AthleteMeasurementStatus | null,
): AthleteMeasurementDisplay => {
  if (!status) {
    return {
      title: "Nächster Messpunkt",
      copy: "Dein Messstatus wird gerade aktualisiert.",
    };
  }

  if (status.postDone) {
    return {
      title: "Messungen abgeschlossen",
      copy: "Deine Start-, Zwischen- und Abschlussmessung sind abgeschlossen.",
    };
  }

  if (status.postDue) {
    return {
      title: "Abschlussmessung verfügbar",
      copy: "Deine Abschlussmessung ist jetzt freigeschaltet.",
    };
  }

  if (status.midDue) {
    return {
      title: "Zwischenmessung verfügbar",
      copy: "Deine Zwischenmessung ist jetzt freigeschaltet.",
    };
  }

  if (status.midDone) {
    return {
      title: "Nächster Messpunkt",
      copy: "Abschlussmessung an Tag 56. Bis dahin zählt deine tägliche Praxis.",
    };
  }

  if ((status.programDay ?? 0) < 28) {
    return {
      title: "Nächster Messpunkt",
      copy: "Zwischenmessung an Tag 28. Bis dahin zählt deine tägliche Praxis.",
    };
  }

  return {
    title: "Nächster Messpunkt",
    copy: "Dein Messstatus wird gerade aktualisiert.",
  };
};

export const resolveProgressReferenceDateIso = (
  programStart: string | null | undefined,
  referenceDate: Date,
): string => {
  if (!programStart) return referenceDate.toISOString();

  const parsedStart = startOfDay(parseISO(programStart));
  if (!isValid(parsedStart)) return referenceDate.toISOString();

  const programEnd = addDays(parsedStart, 55);
  return (isAfter(startOfDay(referenceDate), programEnd) ? programEnd : referenceDate).toISOString();
};
