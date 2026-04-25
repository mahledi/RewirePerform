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
import { toast } from "sonner";

const feedbackTypes = [
  { value: "bug", label: "Bug melden", icon: Bug },
  { value: "suggestion", label: "Vorschlag", icon: Lightbulb },
  { value: "general", label: "Allgemein", icon: MessageCircle },
] as const;

const faqItems = [
  {
    q: "Was ist MindGame?",
    a: "MindGame ist ein wissenschaftlich fundiertes Mentaltraining-Programm speziell für Sportler. Es analysiert dein mentales Profil und erstellt darauf basierend personalisierte tägliche Aufgaben, die dich mental stärker machen — auf und neben dem Platz.",
  },
  {
    q: "Wie funktioniert das Programm?",
    a: "Nach der Registrierung füllst du einen Fragebogen aus, der dein mentales Profil erfasst. Eine KI analysiert deine Antworten und erstellt einen individuellen Trainingsplan. Jeden Tag bekommst du angepasste Aufgaben — abgestimmt auf deinen Sport, deine Position und ob du trainierst oder einen Ruhetag hast.",
  },
  {
    q: "Was sind die täglichen Aufgaben?",
    a: "Jede Aufgabe besteht aus zwei Teilen: Zuerst ein kurzer Wissens-Input (Knowledge), der dir erklärt, warum die Übung wirkt. Dann eine praktische Übung (Exercise), die du direkt umsetzen kannst. Die Aufgaben dauern insgesamt 10–15 Minuten.",
  },
  {
    q: "Wie verändert mich das?",
    a: "Mentales Training wirkt wie körperliches Training — durch regelmäßige Wiederholung. Die Übungen basieren auf Neuroplastizität: Dein Gehirn baut durch gezielte Übungen neue neuronale Verbindungen auf. Fokus, Stressresistenz, Selbstvertrauen und Konzentration verbessern sich nachweislich innerhalb weniger Wochen.",
  },
  {
    q: "Sieht mein Coach meine Antworten?",
    a: "Nein. Dein Coach sieht ausschließlich, ob du aktiv bist (Check-ins gemacht hast) und deinen allgemeinen Aktivitätsstatus. Deine individuellen Antworten, Reflexionen und dein detailliertes mentales Profil sind nur für dich sichtbar.",
  },
  {
    q: "Kann ich meine Daten löschen?",
    a: "Ja. Du kannst jederzeit die Löschung deines Accounts und aller damit verbundenen Daten anfragen. Schreib uns dazu einfach über das Feedback-Formular auf dieser Seite.",
  },
  {
    q: "Wie oft sollte ich das machen?",
    a: "Idealerweise täglich — egal ob Trainings- oder Ruhetag. Die Aufgaben sind an deinen Tagestyp angepasst. 10–15 Minuten pro Tag reichen aus, um langfristige Ergebnisse zu erzielen. Regelmäßigkeit ist wichtiger als Dauer.",
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

        {/* Feedback */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-semibold text-lg">Feedback</h2>
            </div>
            <p className="text-sm text-muted-foreground">Hilf uns, MindGame besser zu machen. Melde Bugs, teile Vorschläge oder schreib uns einfach.</p>

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
                <p>Deine Fragebogen-Antworten, täglichen Check-ins, Kalender-Einträge und die daraus generierte KI-Analyse. Alles wird verschlüsselt in einer sicheren Datenbank gespeichert.</p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-1">Wer hat Zugriff?</h3>
                <p>Nur du. Deine Daten sind durch Row-Level-Security geschützt — das bedeutet, technisch kann niemand außer dir auf deine Einträge zugreifen. Nicht einmal Administratoren sehen deine individuellen Antworten.</p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-1">Was sieht mein Coach?</h3>
                <p>Dein Coach sieht ausschließlich deinen <strong className="text-foreground">Aktivitätsstatus</strong>: Ob du deine Check-ins machst und aktiv am Programm teilnimmst. Deine Antworten, Reflexionen und dein mentales Profil bleiben privat.</p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-1">Daten löschen</h3>
                <p>Du kannst jederzeit die vollständige Löschung deines Accounts und aller Daten anfragen. Nutze dafür das Feedback-Formular oben auf dieser Seite. Wir löschen alles innerhalb von 48 Stunden.</p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-1">DSGVO</h3>
                <p>MindGame entspricht der Datenschutz-Grundverordnung (DSGVO). Deine Daten werden ausschließlich in der EU verarbeitet und nicht an Dritte weitergegeben.</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* App Installation */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-semibold text-lg">Als App installieren</h2>
            </div>

            <p className="text-sm text-muted-foreground">Du kannst MindGame wie eine echte App auf deinem Handy nutzen — ohne App Store. So geht's:</p>

            <div className="space-y-4">
              <div className="rounded-lg bg-secondary/50 p-4 space-y-2">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">📱</span>
                  iPhone (Safari)
                </h3>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Öffne MindGame in <strong className="text-foreground">Safari</strong></li>
                  <li>Tippe auf das <strong className="text-foreground">Teilen-Symbol</strong> (Quadrat mit Pfeil nach oben)</li>
                  <li>Scrolle runter und wähle <strong className="text-foreground">"Zum Home-Bildschirm"</strong></li>
                  <li>Tippe auf <strong className="text-foreground">"Hinzufügen"</strong></li>
                </ol>
              </div>

              <div className="rounded-lg bg-secondary/50 p-4 space-y-2">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">🤖</span>
                  Android (Chrome)
                </h3>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Öffne MindGame in <strong className="text-foreground">Chrome</strong></li>
                  <li>Tippe auf die <strong className="text-foreground">drei Punkte</strong> oben rechts</li>
                  <li>Wähle <strong className="text-foreground">"Zum Startbildschirm hinzufügen"</strong></li>
                  <li>Bestätige mit <strong className="text-foreground">"Hinzufügen"</strong></li>
                </ol>
              </div>

              <p className="text-xs text-muted-foreground">Nach der Installation öffnet sich MindGame im Vollbildmodus — genau wie eine normale App. Du bleibst eingeloggt und bekommst direkten Zugriff.</p>
            </div>
          </div>
        </motion.section>

        <div className="pb-8" />
      </div>
    </div>
  );
};

export default Settings;
