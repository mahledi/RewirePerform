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
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { answers, questions, sport, position, level } = await req.json();

    if (!answers || !questions) {
      return new Response(
        JSON.stringify({ error: "Missing answers or questions" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build a detailed prompt with all Q&A pairs
    const qaPairs = questions.map((q: any) => {
      const answer = answers[q.id];
      const answerText = Array.isArray(answer) ? answer.join(", ") : String(answer ?? "Keine Antwort");
      return `[${q.category}] ${q.question}\nAntwort: ${answerText}`;
    }).join("\n\n");

    // Build sport-specific context
    const sportContext = sport ? `\n\nSPORTART-KONTEXT:\nDer Athlet betreibt: ${sport}${position ? `, Position: ${position}` : ""}${level ? `, Level: ${level}` : ""}.

SPORTART-ADAPTION (PFLICHT):
Passe ALLE Szenarien, Visualisierungen, Beispiele und Empfehlungen an die spezifische Sportart und Position an:
- Fußball: Elfmeter, Ecken, Pressing, Zweikämpfe, Fehlpass-Recovery, Positionsspezifisch (Torwart: 1v1, Abwehr: Kopfballduell, Sturm: Abschluss unter Druck)
- American Football: 4th Down, Red Zone, Audibles, Coverage-Reads, Snap Count, Positionsspezifisch (QB: Pocket Presence, WR: Route-Running unter Coverage, DB: Ball-Hawk Mentalität, LB: Pre-Snap Reads)
- Basketball: Freiwurf-Routine, Crunch-Time, Pick-and-Roll Entscheidungen
- Handball: 7-Meter, Überzahl-Unterzahl, Tempogegenstöße
- Tennis: Breakball, Tiebreak, Service-Games
- Andere Sportarten: Leite passende Szenarien aus den Antworten und der Position ab

Die Analyse muss sich anfühlen, als wäre sie von einem Sportpsychologen geschrieben, der diese Sportart und Position tief versteht.` : "";

    const systemPrompt = `Du bist ein erfahrener Sportpsychologe mit Expertise in Neurowissenschaften, Verhaltenspsychologie und mentalem Performance-Training. Du analysierst die Fragebogen-Antworten eines Sportlers und erstellst ein umfassendes mentales Profil.${sportContext}

Deine Analyse muss auf wissenschaftlichen Prinzipien basieren und folgendes enthalten:

1. **Stärkenprofil**: Die 3-4 größten mentalen Stärken des Sportlers mit wissenschaftlicher Begründung
2. **Entwicklungsfelder**: Die 3-4 wichtigsten Bereiche mit Verbesserungspotenzial
3. **Kernmuster**: Tiefere psychologische Muster die du in den Antworten erkennst
4. **Empfehlungen**: Konkrete, wissenschaftlich fundierte Empfehlungen für die nächsten 4 Wochen
5. **Tägliche Fokus-Bereiche**: Spezifische Aufgaben für Trainings- und Ruhetage
6. **Inner Excellence Profil**: Analysiere gezielt die Inner Excellence Fragen (ie-01 bis ie-25) und bewerte folgende Dimensionen:
   - **Growth Mindset Score** (0-100): Wie stark ist die Wachstumsorientierung vs. Ergebnisorientierung? Basierend auf ie-05, ie-06, ie-07, ie-08, ie-21, ie-23
   - **Präsenz-Level** (low/medium/high): Wie präsent und im Moment ist der Athlet? Basierend auf ie-03, ie-04, ie-19, ie-20
   - **Ego-Freiheit Score** (0-100): Wie frei ist der Athlet von externem Validierungsbedürfnis? Basierend auf ie-09, ie-10, ie-11
   - **Emotionale Kontrolle Score** (0-100): Wie gut reguliert der Athlet Emotionen unter Druck? Basierend auf ie-12, ie-13, ie-17, ie-18, ie-22
   - **Core Insight**: Eine tiefe Erkenntnis über die psychologische Kernstruktur des Athleten, die Psychologie und Neurowissenschaft verbindet

Antworte auf Deutsch. Sei direkt, wissenschaftlich fundiert aber verständlich. Verwende neurowissenschaftliche und sportpsychologische Fachbegriffe wo angemessen, aber erkläre sie. 

Strukturiere deine Antwort als JSON mit folgender Struktur:
{
  "summary": "2-3 Sätze Gesamteinschätzung",
  "strengths": [{"title": "...", "description": "...", "science": "..."}],
  "development_areas": [{"title": "...", "description": "...", "priority": "high/medium/low", "science": "..."}],
  "patterns": [{"title": "...", "description": "..."}],
  "recommendations": [{"title": "...", "description": "...", "duration": "...", "frequency": "..."}],
  "training_day_tasks": ["...", "...", "..."],
  "rest_day_tasks": ["...", "...", "..."],
  "mental_score": 0-100,
  "dominant_category": "focus/resilience/motivation/confidence/neurocognition/inner_excellence/...",
  "inner_excellence_profile": {
    "growth_mindset_score": 0-100,
    "presence_level": "low/medium/high",
    "ego_freedom_score": 0-100,
    "emotional_control_score": 0-100,
    "core_insight": "..."
  }
}`;

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
              content: `Hier sind die vollständigen Fragebogen-Antworten des Sportlers:\n\n${qaPairs}\n\nErstelle eine umfassende Analyse als JSON.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "create_mental_profile",
                description: "Creates a comprehensive mental performance profile based on questionnaire answers",
                parameters: {
                  type: "object",
                  properties: {
                    summary: { type: "string", description: "2-3 sentence overall assessment" },
                    strengths: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          description: { type: "string" },
                          science: { type: "string" },
                        },
                        required: ["title", "description", "science"],
                      },
                    },
                    development_areas: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          description: { type: "string" },
                          priority: { type: "string", enum: ["high", "medium", "low"] },
                          science: { type: "string" },
                        },
                        required: ["title", "description", "priority", "science"],
                      },
                    },
                    patterns: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          description: { type: "string" },
                        },
                        required: ["title", "description"],
                      },
                    },
                    recommendations: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          description: { type: "string" },
                          duration: { type: "string" },
                          frequency: { type: "string" },
                        },
                        required: ["title", "description", "duration", "frequency"],
                      },
                    },
                    training_day_tasks: { type: "array", items: { type: "string" } },
                    rest_day_tasks: { type: "array", items: { type: "string" } },
                    mental_score: { type: "number" },
                    dominant_category: { type: "string", description: "Dominant category: focus, resilience, motivation, confidence, neurocognition, inner_excellence, or other" },
                    inner_excellence_profile: {
                      type: "object",
                      properties: {
                        growth_mindset_score: { type: "number", description: "0-100 score for growth vs result orientation" },
                        presence_level: { type: "string", enum: ["low", "medium", "high"], description: "How present the athlete is during performance" },
                        ego_freedom_score: { type: "number", description: "0-100 score for freedom from external validation" },
                        emotional_control_score: { type: "number", description: "0-100 score for emotional regulation under pressure" },
                        core_insight: { type: "string", description: "Deep psychological insight connecting psychology and neuroscience" },
                      },
                      required: ["growth_mindset_score", "presence_level", "ego_freedom_score", "emotional_control_score", "core_insight"],
                    },
                  },
                  required: [
                    "summary", "strengths", "development_areas", "patterns",
                    "recommendations", "training_day_tasks", "rest_day_tasks",
                    "mental_score", "dominant_category", "inner_excellence_profile",
                  ],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "create_mental_profile" } },
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
          JSON.stringify({ error: "KI-Credits aufgebraucht. Bitte lade dein Konto auf." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-questionnaire error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
