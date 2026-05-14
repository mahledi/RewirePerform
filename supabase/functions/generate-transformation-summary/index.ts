// DEPRECATED: This edge function previously called Lovable AI Gateway.
// As of the P0 stabilization pass, the progress / re-test summary is computed
// deterministically on the client (src/lib/deterministicProgressSummary.ts).
// This stub is kept to avoid breaking deployments that still reference the
// function name. It returns 410 Gone if invoked.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return new Response(
    JSON.stringify({
      error:
        "deprecated: replaced by deterministic client-side summary (no AI / no credits)",
    }),
    {
      status: 410,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
