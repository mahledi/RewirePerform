import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: authError } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { baseline, retest, questions } = await req.json();

    if (!baseline || !retest || !questions) {
      return new Response(
        JSON.stringify({ error: "Missing baseline, retest, or questions" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Du bist ein erfahrener Sportpsychologe. Analysiere die Veränderung zwischen Baseline- und Re-Test-Antworten eines Athleten.

Schreibe eine empathische, wissenschaftlich fundierte "Transformations-Zusammenfassung" (3-5 Absätze):
1. Fasse die wichtigsten Veränderungen zusammen (Skalenwerte, Wortwahl-Shifts bei Freitexten)
2. Interpretiere, was die Veränderungen über das Mindset des Athleten aussagen
3. Hebe positive Entwicklungen hervor und benenne Bereiche mit weiterem Potenzial
4. Nutze einen motivierenden, aber ehrlichen Ton
5. Beziehe dich auf sportpsychologische Konzepte (z.B. Selbstwirksamkeit, Druckregulation, kognitive Neubewertung)

Antworte auf Deutsch. Schreibe NUR die Zusammenfassung, keine Überschrift.`;

    const questionsContext = questions.map((q: any) => {
      const bAnswer = baseline[q.id];
      const rAnswer = retest[q.id];
      return `Frage: "${q.question}" (${q.type})
  Baseline: ${JSON.stringify(bAnswer)}
  Re-Test: ${JSON.stringify(rAnswer)}`;
    }).join("\n\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Hier sind die Antworten des Athleten:\n\n${questionsContext}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit erreicht." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "KI-Credits aufgebraucht." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "Zusammenfassung konnte nicht erstellt werden.";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("transformation-summary error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
