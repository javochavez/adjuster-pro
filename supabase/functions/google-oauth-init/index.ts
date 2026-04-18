import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GOOGLE_CLIENT_ID     = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_REDIRECT_URI  = Deno.env.get("GOOGLE_REDIRECT_URI")!;

const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

serve(async (req) => {
  // Obtener el user_id del header que envía la app
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return new Response(JSON.stringify({ error: "Missing user_id" }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }

  const state = btoa(JSON.stringify({ userId, ts: Date.now() }));

  const params = new URLSearchParams({
    client_id:     GOOGLE_CLIENT_ID,
    redirect_uri:  GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope:         SCOPES,
    access_type:   "offline",
    prompt:        "consent",
    state,
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  return new Response(JSON.stringify({ url }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    }
  });
});
