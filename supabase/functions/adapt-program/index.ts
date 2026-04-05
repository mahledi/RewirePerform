import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { calendarEvents, analysis, competitionDate, competitionName, programStartDate, sport, position, level } = await req.json();

    if (!calendarEvents || !analysis) {
      return new Response(
        JSON.stringify({ error: "Missing calendarEvents or analysis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build calendar context
    const calendarSummary = calendarEvents.map((e: any) =>
      `${e.date}: ${e.event_type}${e.title ? ` (${e.title})` : ""}`
    ).join("\n");

    const competitionContext = competitionDate
      ? `\n\nHauptwettkampf: "${competitionName || 'Wettkampf'}" am ${competitionDate}. Alle Aufgaben sollen auf diesen Wettkampf hin periodisiert werden. Je näher der Wettkampf, desto spezifischer und wettkampfnäher die mentalen Aufgaben.`
      : "";

    // Determine day number context for periodization
    let periodizationContext = "";
    if (programStartDate) {
      const start = new Date(programStartDate);
      const eventDates = calendarEvents.map((e: any) => ({
        date: e.date,
        dayNumber: Math.floor((new Date(e.date).getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      }));
      const dayRangeInfo = eventDates.map((d: any) => `${d.date} = Tag ${d.dayNumber}`).join(", ");
      periodizationContext = `\nDie Tage im Kalender entsprechen folgenden Programm-Tagen: ${dayRangeInfo}`;
    }

    // Build sport-specific prompt section
    const sportAdaptionPrompt = sport ? `\nSPORTART & POSITION: ${sport}${position ? `, ${position}` : ""}${level ? ` (${level})` : ""}

SPORTART-ADAPTION (PFLICHT):
Passe ALLE Aufgaben, Szenarien, Visualisierungen und Beispiele an die spezifische Sportart und Position an:
- Fußball: Elfmeter-Visualisierung, Pressing-Kommunikation, Zweikampf-Mindset, Fehlpass-Recovery. Positionsspezifisch: Torwart (1v1-Szenarien, Entscheidungsdruck), Verteidiger (Kopfballduell, Organisationsrolle), Mittelfeld (Spielaufbau unter Druck, Umschaltmomente), Sturm (Abschluss-Mentalität, Torjäger-Instinkt)
- American Football: 4th Down Entscheidungen, Red Zone Fokus, Audible-Situationen, Two-Minute-Drill. Positionsspezifisch: QB (Pocket Presence, Pre-Snap Reads, Leadership unter Druck), WR (Route-Running Fokus, Contested Catches), RB (Vision, Geduld in der Lücke), Defense (Ball-Hawk Mentalität, Gap Discipline, Tackling Commitment)
- Andere Sportarten: Leite passende Szenarien aus Sportart, Position und Antworten ab

Jede Aufgabe muss sich anfühlen, als wäre sie GENAU für diese Position in dieser Sportart geschrieben – nicht generisch.\n` : "";

    const systemPrompt = `Du bist ein erfahrener Sportpsychologe der personalisierte tägliche mentale Trainingsaufgaben erstellt.

Du hast folgende Informationen über den Sportler:
- Mental Score: ${analysis.mental_score}/100
- Stärken: ${analysis.strengths?.map((s: any) => s.title).join(", ") || "keine"}
- Entwicklungsfelder: ${analysis.development_areas?.map((d: any) => `${d.title} (${d.priority})`).join(", ") || "keine"}
- Erkannte Muster: ${analysis.patterns?.map((p: any) => p.title).join(", ") || "keine"}
${sportAdaptionPrompt}${competitionContext}
${periodizationContext}

PERIODISIERUNG (8-Wochen / 56-Tage-Programm):
Das Programm ist in 4 Phasen unterteilt. Passe Schwierigkeit und Komplexität der Aufgaben entsprechend der Phase an:

Phase 1 (Tag 1-14): FUNDAMENT & SELBSTANALYSE
- Fokus: Identität und Selbstwahrnehmung
- Aufgaben: Selbstreflexion, Journaling, Werte-Klärung, Ist-Zustand-Analyse
- Schwierigkeit: Niedrig – Grundlagen legen, Bewusstsein schaffen
- Neurokognitiver Fokus: Metakognition, Default Mode Network bewusst nutzen

Phase 2 (Tag 15-28): SKILL-ERWERB
- Fokus: Konkrete mentale Techniken erlernen
- Aufgaben: Atemtechniken (Box-Breathing, 4-7-8), Visualisierung nach Murphy (2005), Selbstgespräch-Techniken, Progressive Muskelentspannung
- Schwierigkeit: Mittel – aktives Üben neuer Skills
- Neurokognitiver Fokus: PFC-Training, Amygdala-Regulation, neue neuronale Pfade anlegen (Neuroplastizität)

Phase 3 (Tag 29-42): INTENSIVIERUNG & TRANSFER
- Fokus: Gelerntes ins Mannschaftstraining und Wettkampf-Szenarien transferieren
- Aufgaben: Drucksimulationen, Challenge-Reframing unter Stress, Team-Kommunikation, Visualisierung spezifischer Wettkampfszenarien
- Schwierigkeit: Hoch – unter Druck anwenden
- Neurokognitiver Fokus: Threat vs. Challenge Mindset, PFC-Shutdown-Prävention, Amygdala-Hijack erkennen und umlenken

Phase 4 (Tag 43-56): MEISTERSCHAFT & RE-TEST-VORBEREITUNG
- Fokus: Festigung der "Inner Excellence", Automatisierung der Skills
- Aufgaben: Eigenständige Routinen ohne Anleitung, Mental-Gameplan für Wettkämpfe erstellen, Mentoring-Elemente (Teamkollegen helfen), Reflexion der Transformation
- Schwierigkeit: Experte – selbstständige Anwendung, Skills sollen in Basalganglien übergehen
- Neurokognitiver Fokus: Von PFC zu Basalganglien (Automatisierung), Energiehaushalt optimieren, Selbstwirksamkeit festigen

WICHTIG: Die Schwierigkeit und Komplexität der Aufgaben MUSS über die 8 Wochen progressiv ansteigen. 
Phase 1 = einfache Reflexionsübungen, Phase 4 = komplexe Anwendungsszenarien unter Druck.

Erstelle für JEDEN Tag im Kalender 3-5 spezifische mentale Aufgaben die:
1. An den Tagestyp angepasst sind (Training/Ruhe/Wettkampf)
2. Die Entwicklungsfelder des Sportlers gezielt adressieren
3. Wissenschaftlich fundiert sind
4. Aufeinander aufbauen (Progression über die Wochen, gemäß der 4-Phasen-Periodisierung)
5. Bei Wettkampftagen: Aktivierung und Fokussierung
6. Bei Ruhetagen: Regeneration und Reflexion
7. Bei Trainingstagen: Mentales Training parallel zum physischen
8. Der Phase entsprechend in Schwierigkeit und Komplexität angepasst sind

WICHTIG – Science Bite:
Jede Aufgabe MUSS ein "science_bite" Feld enthalten: 2-3 Sätze die dem Sportler erklären WARUM diese Übung wirkt. Nenne dabei:
- Den konkreten neurowissenschaftlichen oder psychologischen Mechanismus (z.B. "Visualisierung aktiviert denselben prämotorischen Kortex wie die echte Bewegung")
- Eine Studie oder Forschungsrichtung als Referenz (z.B. "Jeannerod, 2001" oder "Meta-Analyse von Hatzigeorgiadis et al., 2011")
- Warum das WISSEN darüber die Wirkung verstärkt (Metakognition erhöht Compliance und Engagement – Flavell, 1979; Ryan & Deci, 2000: Autonomie durch Verständnis)

NEUROKOGNITIVE RAHMUNG (PFLICHT):
Jede science_bite MUSS dem Spieler erklären, welcher Gehirn-Mechanismus bei der Aufgabe aktiv ist. Verwende diese Konzepte:
- AMYGDALA-HIJACK: Erkläre, wie Fehler den Fight-or-Flight-Modus triggern. Die Amygdala reagiert in 12ms – schneller als bewusstes Denken (LeDoux, 1996)
- EGO/SURVIVAL: Das Gehirn schützt uns vor sozialem Ausschluss durch Risikovermeidung – das ist evolutionär sinnvoll, aber limitierend im Sport (Friston, 2010)
- ENERGIEHAUSHALT: Neue Muster kosten mehr Glukose als Routinen. Gewohnheiten laufen über die Basalganglien (günstig), neue Muster über den PFC (teuer). Deshalb fühlt sich Wachstum anstrengend an – das ist normal (Graybiel, 2008)
- METAKOGNITION: "Ich bemerke, dass ich gerade..." – allein das Benennen reduziert Amygdala-Aktivität um 50% (Lieberman et al., 2007). Wissen über den Mechanismus erhöht die Wirksamkeit der Übung
- DEFAULT MODE NETWORK: Grübeln nach Fehlern ist keine Charakter-Schwäche, sondern ein aktives Netzwerk das man durch Achtsamkeit unterbrechen kann (Brewer et al., 2011)
- NEUROPLASTIZITÄT: Jede bewusste Rep formt neue neuronale Pfade und stärkt die Myelinschicht (Fields, 2008)
- THREAT vs. CHALLENGE: Dieselbe Drucksituation kann als Bedrohung oder Challenge interpretiert werden – die Interpretation verändert die Hormonantwort (Blascovich, 2008)
- PFC-SHUTDOWN: Unter Stress fährt der Prefrontale Kortex herunter. Atemübungen reaktivieren ihn in 90 Sekunden (Arnsten, 2009)

Formuliere science_bites so, dass der Spieler versteht: "Mein Gehirn tut das nicht GEGEN mich, sondern FÜR mich – aber ich kann es umprogrammieren."

Jede Aufgabe hat: title, description (2-3 Sätze, konkrete Anleitung), science_bite (2-3 Sätze, wissenschaftliche Erklärung mit neurokognitivem Rahmen), icon (eines von: brain, eye, flame, heart, target, wind, sunrise, book, sparkles, shield), phase (1-4, die aktuelle Programmphase).`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Hier ist der Kalender des Sportlers:\n\n${calendarSummary}\n\nErstelle für jeden Tag personalisierte mentale Aufgaben. Beachte die 4-Phasen-Periodisierung und passe die Schwierigkeit entsprechend an.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "create_daily_tasks",
                description: "Creates personalized daily mental training tasks for each calendar day with phase-based periodization",
                parameters: {
                  type: "object",
                  properties: {
                    daily_plans: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          date: { type: "string", description: "YYYY-MM-DD format" },
                          event_type: { type: "string" },
                          phase: { type: "number", description: "Program phase 1-4 based on day number" },
                          tasks: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                id: { type: "string" },
                                title: { type: "string" },
                                description: { type: "string" },
                                science_bite: { type: "string", description: "2-3 sentences explaining WHY this exercise works, with scientific mechanism and study reference" },
                                icon: { type: "string", enum: ["brain", "eye", "flame", "heart", "target", "wind", "sunrise", "book", "sparkles", "shield"] },
                                phase: { type: "number", description: "Program phase 1-4" },
                              },
                              required: ["id", "title", "description", "science_bite", "icon", "phase"],
                            },
                          },
                        },
                        required: ["date", "event_type", "phase", "tasks"],
                      },
                    },
                  },
                  required: ["daily_plans"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "create_daily_tasks" } },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit erreicht. Bitte versuche es in einer Minute erneut." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "KI-Credits aufgebraucht." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ daily_plans: result.daily_plans }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("adapt-program error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
