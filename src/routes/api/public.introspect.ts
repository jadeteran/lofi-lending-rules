import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/introspect")({
  server: {
    handlers: {
      GET: async () => {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.LOFI_SUPABASE_URL!,
          process.env.LOFI_SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );
        const { data, error } = await supabase
          .from("guideline_library")
          .select("*")
          .limit(1);
        return new Response(
          JSON.stringify({
            error: error?.message ?? null,
            columns: data && data[0] ? Object.keys(data[0]) : [],
            sample: data?.[0] ?? null,
          }),
          { headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});
