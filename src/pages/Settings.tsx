import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Brain, MessageSquare, Shield, HelpCircle, Smartphone, Send, Loader2, Bug, Lightbulb, MessageCircle, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TrainingAndNotifications } from "@/components/settings/TrainingAndNotifications";
import { toast } from "sonner";

const feedbackTypes = [
  { value: "bug", label: "Bug melden", icon: Bug },
  { value: "suggestion", label: "Vorschlag", icon: Lightbulb },
  { value: "general", label: "Allgemein", icon: MessageCircle },
] as const;

const faqItems = [
  {
    q: "Was ist RewirePerform?",
    a: "RewirePerform ist ein wissenschaftlich fundiertes 56-Tage-Mentaltraining für alle Athletinnen und Athleten. Es hilft jedem, der bereit ist, seinen mentalen Ansatz zu trainieren — unabhängig von Alter oder Sportart. Empfohlen ab 15 Jahren.",
  },
  {
    q: "Wie funktioniert das Programm?",
    a: "Nach der Registrierung füllst du einen tiefen Onboarding-Fragebogen aus (Sport, Position, mentale Ausgangslage). Daraus entsteht dein Startprofil. Anschließend läuft ein festes, deterministisches 56-Tage-System in vier neurokognitiven Phasen — jeder Tag hat eine klare Linse, einen Wissens-Input und konkrete Übungen.",
  },
  {
    q: "Wie sehen die täglichen Aufgaben aus?",
    a: "Jeder Tag besteht aus drei Bausteinen: kurzer Check-in (Stimmung, Energie, Fokus), Wissens-Input zur heutigen Linse und max. 3 konkrete Aufgaben. Dazu kommt ein Journal mit Reflexion und Dankbarkeit. Zusammen ca. 10–15 Minuten.",
  },
  {
    q: "Warum wird das Journal eingesprochen?",
    a: "Sprechen aktiviert mehr neuronale Netzwerke gleichzeitig als Tippen — Sprache, Motorik, Hören und Selbstwahrnehmung feuern parallel. Diese Synchronität beschleunigt synaptische Bahnung (Hebbian Plasticity). Studien zum Generation Effect und zu Self-distancing through speech (Kross) zeigen: Laut ausgesprochene Gedanken bleiben besser hängen und führen zu klareren Einsichten. Tippen bleibt jederzeit möglich.",
  },
  {
    q: "Was ist aMCC-Training?",
    a: "Der anterior midcingulate cortex (aMCC) ist eine Hirnregion, die mit Willenskraft und Handeln-trotz-Widerstand verbunden wird. Forschung zeigt, dass freiwillige kleine Unannehmlichkeiten diesen Bereich aktivieren. Das Prinzip fließt regelmäßig in Übungen mit ein — aber es gibt keine tägliche separate aMCC-Aufgabe. Die Challenges sind kurz, konkret und machbar.",
  },
  {
    q: "Wie verändert mich das?",
    a: "Mentales Training wirkt wie körperliches Training: durch regelmäßige Wiederholung baut dein Gehirn neue Verbindungen auf (Neuroplastizität). Über 56 Tage trainierst du systematisch Fokus, Stressresistenz, Selbstführung und mentale Stärke — gerahmt von wissenschaftlich validierten Skalen (CSAI-2R, SMTQ, Flow).",
  },
  {
    q: "Was sieht mein Coach?",
    a: "Dein Coach sieht ausschließlich aggregierte Team-Daten: ob das Team aktiv ist, wie der durchschnittliche mentale Zustand aussieht, wo das Team Unterstützung braucht. Deine individuellen Journal-Einträge, Reflexionen und detaillierten Antworten bleiben strikt privat — niemand außer dir sieht sie.",
  },
  {
    q: "Wie komme ich in ein Team?",
    a: "Dein Coach gibt dir einen 6-stelligen Zugangscode. Den trägst du beim Onboarding ein — fertig. Ohne Code nutzt du das Programm einfach individuell.",
  },
  {
    q: "Wie oft sollte ich das machen?",
    a: "Täglich — Trainings- oder Ruhetag. Die Inhalte sind auf den Tagestyp abgestimmt. 10–15 Minuten reichen. Regelmäßigkeit schlägt Dauer: das 56-Tage-System ist darauf ausgelegt, dass kleine konsistente Reize Strukturen im Gehirn verändern.",
  },
  {
    q: "Was passiert, wenn ich einen Tag verpasse?",
    a: "Nichts Schlimmes. Das Programm läuft weiter und du steigst am nächsten Tag wieder ein. Es gibt keine Strafen, keine roten Zahlen — nur deine eigene Streak und die Klarheit, dass jeder Tag zählt.",
  },
  {
    q: "Kann ich meine Daten löschen?",
    a: "Ja. Du kannst jederzeit die vollständige Löschung deines Accounts und aller Daten anfragen — über das Feedback-Formular auf dieser Seite. Wir löschen alles innerhalb von 48 Stunden.",
  },
];


const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [feedbackType, setFeedbackType] = useState<string>("general");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Profil: Sport + Position (Position ersetzt das alte Misuse von "team")
  const [sport, setSport] = useState("");
  const [position, setPosition] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("sport, position, team")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setSport(data.sport ?? "");
        // Fallback auf Legacy-"team"-Feld, falls position noch leer ist
        setPosition(data.position ?? data.team ?? "");
      }
      setProfileLoading(false);
    };
    loadProfile();
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        sport: sport.trim() || null,
        position: position.trim() || null,
      })
      .eq("id", user.id);
    setSavingProfile(false);
    if (error) {
      toast.error("Profil konnte nicht gespeichert werden.");
    } else {
      toast.success("Profil gespeichert.");
    }
  };

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
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <span className="font-heading font-bold text-lg">Info & Hilfe</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profil: Sport & Position */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-semibold text-lg">Dein Profil</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Sport und Position helfen uns, dein Mentaltraining auf deine Rolle zuzuschneiden.
            </p>
            {profileLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Sportart</label>
                  <Input
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                    placeholder="z.B. Fußball, Basketball, Leichtathletik"
                    className="bg-secondary/50 border-border"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Position / Rolle</label>
                  <Input
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="z.B. Stürmer, Point Guard, Sprinter"
                    className="bg-secondary/50 border-border"
                  />
                </div>
                <Button onClick={saveProfile} disabled={savingProfile} className="w-full">
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Profil speichern
                </Button>
              </div>
            )}
          </div>
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
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-semibold text-lg">Häufige Fragen</h2>
            </div>

            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-border">
                  <AccordionTrigger className="text-sm text-left hover:no-underline">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </motion.section>

        {/* Datenschutz */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-semibold text-lg">Datenschutz</h2>
            </div>

            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <div>
                <h3 className="font-medium text-foreground mb-1">Was wird gespeichert?</h3>
                <p>Deine Fragebogen-Antworten, täglichen Check-ins, Journaleinträge, Trainingszeiten, Programmfortschritte und daraus berechnete Auswertungen. Diese Daten helfen dem System, deinen Startpunkt, deine Aufgabenlogik, Erinnerungen und Fortschritte sinnvoll abzubilden.</p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-1">Warum wird das abgefragt?</h3>
                <p>RewirePerform nutzt Angaben nicht als Selbstzweck. Sie machen sichtbar, wo du startest, welche Schritte abgeschlossen sind, wie dein Tagesrhythmus funktioniert und welche Rückmeldungen für deinen weiteren Verlauf relevant sind.</p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-1">Wer hat Zugriff?</h3>
                <p>Persönliche Inhalte sind auf private Nutzung ausgelegt und werden nicht als Rohdaten in Coach-Ansichten angezeigt. Technische Schutzmechanismen begrenzen Zugriffe im Produkt; Admin-Bereiche sind auf Betrieb, Datenqualität und aggregierte Übersichten ausgerichtet.</p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-1">Was sieht mein Coach?</h3>
                <p>Dein Coach sieht operative Aktivität wie Teilnahme, erledigte Tage und Programmstatus. Sensible Antworten, private Reflexionen, Journaltexte und individuelle mentale Rohwerte werden Coaches nicht angezeigt; Teamwerte erscheinen nur geschützt und aggregiert.</p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-1">Daten löschen</h3>
                <p>Du kannst jederzeit die vollständige Löschung deines Accounts und aller Daten anfragen. Nutze dafür das Feedback-Formular oben auf dieser Seite. Wir löschen alles innerhalb von 48 Stunden.</p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-1">Mehr Details</h3>
                <p>
                  Die{" "}
                  <a href="/privacy" className="text-primary hover:underline">
                    ausführlichere Datenschutzseite
                  </a>{" "}
                  erklärt genauer, welche Datenarten relevant sind und wie sie für Aufgaben, Erinnerungen, Fortschritt
                  und geschützte Teamübersichten genutzt werden. Vor einer App-Store-Veröffentlichung wird diese
                  Kommunikation final geprüft.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* App Installation */}
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

        <div className="pb-8" />
      </div>
    </div>
  );
};

export default Settings;
