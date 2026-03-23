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

    const { calendarEvents, analysis, competitionDate, competitionName } = await req.json();

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

    const systemPrompt = `Du bist ein erfahrener Sportpsychologe der personalisierte tägliche mentale Trainingsaufgaben erstellt.

Du hast folgende Informationen über den Sportler:
- Mental Score: ${analysis.mental_score}/100
- Stärken: ${analysis.strengths?.map((s: any) => s.title).join(", ") || "keine"}
- Entwicklungsfelder: ${analysis.development_areas?.map((d: any) => `${d.title} (${d.priority})`).join(", ") || "keine"}
- Erkannte Muster: ${analysis.patterns?.map((p: any) => p.title).join(", ") || "keine"}
${competitionContext}

Erstelle für JEDEN Tag im Kalender 3-5 spezifische mentale Aufgaben die:
1. An den Tagestyp angepasst sind (Training/Ruhe/Wettkampf)
2. Die Entwicklungsfelder des Sportlers gezielt adressieren
3. Wissenschaftlich fundiert sind
4. Aufeinander aufbauen (Progression über die Wochen)
5. Bei Wettkampftagen: Aktivierung und Fokussierung
6. Bei Ruhetagen: Regeneration und Reflexion
7. Bei Trainingstagen: Mentales Training parallel zum physischen

Jede Aufgabe hat: title, description (2-3 Sätze, konkrete Anleitung), icon (eines von: brain, eye, flame, heart, target, wind, sunrise, book, sparkles, shield).`;

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
              content: `Hier ist der Kalender des Sportlers:\n\n${calendarSummary}\n\nErstelle für jeden Tag personalisierte mentale Aufgaben.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "create_daily_tasks",
                description: "Creates personalized daily mental training tasks for each calendar day",
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
                          tasks: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                id: { type: "string" },
                                title: { type: "string" },
                                description: { type: "string" },
                                icon: { type: "string", enum: ["brain", "eye", "flame", "heart", "target", "wind", "sunrise", "book", "sparkles", "shield"] },
                              },
                              required: ["id", "title", "description", "icon"],
                            },
                          },
                        },
                        required: ["date", "event_type", "tasks"],
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
