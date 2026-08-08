import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { motion } from "framer-motion";
import { BookOpen, Bug, ChevronRight, CircleUserRound, HelpCircle, Lightbulb, Loader2, MessageCircle, MessageSquare, Send, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TrainingAndNotifications } from "@/components/settings/TrainingAndNotifications";
import { toast } from "sonner";
import {
  AthleteAppHeader,
  AthleteBottomNavigation,
  athleteAppBackground,
  athleteAppViewport,
} from "@/components/app/AthleteAppChrome";

const feedbackTypes = [
  { value: "bug", label: "Bug melden", icon: Bug },
  { value: "suggestion", label: "Vorschlag", icon: Lightbulb },
  { value: "general", label: "Allgemein", icon: MessageCircle },
] as const;

const faqItems = [
  {
    q: "Was ist RewirePerform?",
    a: "RewirePerform ist ein strukturiertes 56-Tage-Programm für mentale Fähigkeiten im Sport. Es unterstützt Athletinnen und Athleten dabei, Fokus, Selbststeuerung und den Umgang mit Druck systematisch zu üben — unabhängig von der Sportart. Empfohlen ab 15 Jahren.",
  },
  {
    q: "Wie funktioniert das Programm?",
    a: "Nach der Registrierung lernst du den Ablauf in einer kurzen Einführung kennen. Danach füllst du den Onboarding-Fragebogen zu Sport und mentaler Ausgangslage aus. Daraus entsteht dein Startprofil. Anschließend führt dich ein festes 56-Tage-System durch aufeinander aufbauende Lernphasen. Jeder Tag hat ein klares Werkzeug, einen kurzen Wissens-Input und eine Mission.",
  },
  {
    q: "Wie sehen die täglichen Aufgaben aus?",
    a: "Du startest mit deinem Tages-Puls und einem kurzen Wissens-Input. Danach folgt genau eine Mission mit wenigen zusammengehörenden Schritten. Vor Training oder Wettkampf erinnerst du deinen Satz aktiv. An Ruhetagen führt dich die App stattdessen durch eine kurze Visualisierung. Im Journal gehst du später eine Frage nach der anderen durch.",
  },
  {
    q: "Warum wird das Journal eingesprochen?",
    a: "Sprechen ist eine freiwillige Möglichkeit, Gedanken direkt festzuhalten. Aktives Formulieren und das Benennen eigener Reaktionen können Reflexion und innere Distanz unterstützen. In der iPhone- und iPad-App wird Sprache nur lokal auf dem Gerät in Text umgewandelt. Du kannst den Text anschließend bearbeiten oder stattdessen vollständig tippen.",
  },
  {
    q: "Was ist die Visualisierung am Ruhetag?",
    a: "An einem Ruhetag führt dich die App durch eine kurze Visualisierung aus deinem Sport. Die Situation passt zum Werkzeug und Satz deines Programmtags. Du füllst sie mit deiner eigenen Sportszene. Gespeichert wird nur, ob du die Einheit abgeschlossen hast — nicht, welche Szene du visualisiert hast.",
  },
  {
    q: "Wie verändert mich das?",
    a: "Über 56 Tage übst du systematisch Fokus, Selbststeuerung, den Umgang mit Druck und die Rückkehr zur nächsten Handlung. Regelmäßige Wiederholung kann mentale Fähigkeiten leichter verfügbar machen. Neuroplastizität beschreibt die grundsätzliche Fähigkeit des Gehirns, sich durch Erfahrung anzupassen; RewirePerform misst oder garantiert keine körperliche Gehirnveränderung.",
  },
  {
    q: "Was sieht mein Coach?",
    a: "Dein Coach sieht operative Programmdaten wie letzte Aktivität, erledigte Tage, Abschlussquote, aktuelle Serie und die Anzahl deiner Check-ins oder Journal-Einträge — niemals deren Inhalt. Sensible Zustandswerte werden nur für ausreichend große Gruppen aggregiert angezeigt. Journaltexte, Freitextantworten und individuelle Assessment-Ergebnisse bleiben privat.",
  },
  {
    q: "Wie komme ich in ein Team?",
    a: "Dein Coach gibt dir einen 6-stelligen Zugangscode. Den trägst du beim Onboarding ein — fertig. Ohne Code nutzt du das Programm einfach individuell.",
  },
  {
    q: "Wie oft sollte ich das machen?",
    a: "Täglich — an Trainings-, Wettkampf- und Ruhetagen. Die Inhalte sind auf den jeweiligen Tagestyp abgestimmt. 10–15 Minuten reichen. Regelmäßiges Üben hilft dabei, die trainierten Schritte in relevanten Situationen schneller abzurufen.",
  },
  {
    q: "Was passiert, wenn ich einen Tag verpasse?",
    a: "Nichts Schlimmes. Das Programm läuft weiter und du steigst am nächsten Tag wieder ein. Es gibt keine Strafen, keine roten Zahlen — nur deine eigene Streak und die Klarheit, dass jeder Tag zählt.",
  },
  {
    q: "Kann ich meine Daten löschen?",
    a: "Ja. Öffne in den Einstellungen den Bereich „Konto & Daten“ und wähle dort „Account löschen“. Die Löschung wird direkt in der App bestätigt.",
  },
];


const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNativeApp = Capacitor.isNativePlatform();
  const [feedbackType, setFeedbackType] = useState<string>("general");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleFeedback = async () => {
    if (!feedbackMessage.trim() || !user) return;
    if (feedbackMessage.trim().length < 5) {
      toast.error("Bitte schreib mindestens ein paar Worte.");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from("feedback").insert({
        user_id: user.id,
        type: feedbackType,
        message: feedbackMessage.trim().slice(0, 2000),
      });
      if (error) throw error;
      toast.success("Danke für dein Feedback!");
      setFeedbackMessage("");
      setFeedbackType("general");
    } catch {
      toast.error("Feedback konnte nicht gesendet werden.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={athleteAppBackground}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-8%,rgba(46,173,137,0.08),transparent_34%)]" />
      <AthleteAppHeader />

      <main className={`${athleteAppViewport} space-y-6`}>
        <div className="pb-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Mehr</p>
          <h1 className="mt-3 text-[32px] font-semibold leading-none tracking-[-0.045em]">Dein Bereich.</h1>
          <p className="mt-4 text-sm leading-6 text-white/58">Konto, Erinnerungen, Hilfe und Feedback an einem Ort.</p>
        </div>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <button
            type="button"
            onClick={() => navigate("/settings/account")}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-5 text-left transition-colors hover:bg-secondary/30"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CircleUserRound className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-base font-semibold">Konto & Daten</h2>
              <p className="mt-1 truncate text-sm text-muted-foreground">{user?.email ?? "Account verwalten"}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </button>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
          <button
            type="button"
            onClick={() => navigate("/welcome?replay=1&return=%2Fsettings")}
            className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-5 text-left transition-colors hover:bg-secondary/30"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-base font-semibold">Einführung ansehen</h2>
              <p className="mt-1 text-sm text-muted-foreground">Programm, Tagestypen und Privatsphäre</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <TrainingAndNotifications />
        </motion.section>

        {/* Feedback */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-semibold text-lg">Feedback</h2>
            </div>
            <p className="text-sm text-muted-foreground">Hilf uns, RewirePerform besser zu machen. Melde Bugs, teile Vorschläge oder schreib uns einfach.</p>

            <div className="flex gap-2">
              {feedbackTypes.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    onClick={() => setFeedbackType(t.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      feedbackType === t.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <Textarea
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              placeholder="Was möchtest du uns mitteilen?"
              className="min-h-[100px] bg-secondary/50 border-border"
              maxLength={2000}
            />

            <Button onClick={handleFeedback} disabled={sending || !feedbackMessage.trim()} className="w-full">
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Absenden
            </Button>
          </div>
        </motion.section>

        {/* FAQ */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="faq-section" className="rounded-xl border border-border bg-card px-5">
              <AccordionTrigger className="py-5 text-left hover:no-underline">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="font-heading font-semibold text-lg">Häufige Fragen</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Antworten aufklappen</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-5">
                <Accordion type="single" collapsible className="w-full space-y-2">
                  {faqItems.map((item, i) => (
                    <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-border/60 bg-secondary/30 px-4">
                      <AccordionTrigger className="py-3 text-sm text-left hover:no-underline">{item.q}</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{item.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </motion.section>

        {!isNativeApp && (
          <motion.section id="app-install-guide" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                <h2 className="font-heading font-semibold text-lg">Als App installieren</h2>
              </div>

              <p className="text-sm text-muted-foreground">
                Du kannst RewirePerform wie eine echte App auf deinem Handy nutzen. In der Home-Screen-App bleibst du
                normalerweise eingeloggt und kommst schneller zurück in deinen Flow. Auf iPhone/iPad sind
                Push-Benachrichtigungen nur zuverlässig möglich, wenn du die App über den Home-Bildschirm öffnest.
              </p>

              <div className="space-y-4">
                <div className="rounded-lg bg-secondary/50 p-4 space-y-2">
                  <h3 className="font-medium text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">📱</span>
                    iPhone (Safari)
                  </h3>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Öffne RewirePerform in <strong className="text-foreground">Safari</strong></li>
                    <li>Tippe auf das <strong className="text-foreground">Teilen-Symbol</strong> (Quadrat mit Pfeil nach oben)</li>
                    <li>Scrolle runter und wähle <strong className="text-foreground">"Zum Home-Bildschirm"</strong></li>
                    <li>Tippe auf <strong className="text-foreground">"Hinzufügen"</strong></li>
                    <li>Öffne RewirePerform danach über das neue App-Symbol und aktiviere Push in den Einstellungen</li>
                  </ol>
                </div>

                <div className="rounded-lg bg-secondary/50 p-4 space-y-2">
                  <h3 className="font-medium text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">🤖</span>
                    Android (Chrome)
                  </h3>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Öffne RewirePerform in <strong className="text-foreground">Chrome</strong></li>
                    <li>Tippe auf die <strong className="text-foreground">drei Punkte</strong> oben rechts</li>
                    <li>Wähle <strong className="text-foreground">"Zum Startbildschirm hinzufügen"</strong></li>
                    <li>Bestätige mit <strong className="text-foreground">"Hinzufügen"</strong></li>
                  </ol>
                </div>

                <p className="text-xs text-muted-foreground">
                  Nach der Installation öffnet sich RewirePerform im Vollbildmodus. Dein Login bleibt in der installierten
                  App gespeichert, solange du dich nicht selbst abmeldest oder iOS/WebKit die Website-Daten löscht.
                  Wichtig: Benachrichtigungen immer aus dieser installierten App heraus aktivieren, nicht aus einem normalen Safari-Tab.
                </p>
              </div>
            </div>
          </motion.section>
        )}

        <div className="pb-3" />
      </main>
      <AthleteBottomNavigation active="more" />
    </div>
  );
};

export default Settings;
