import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID     = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const GOOGLE_REDIRECT_URI  = Deno.env.get("GOOGLE_REDIRECT_URI")!;
const APP_URL              = Deno.env.get("APP_URL")!;
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  const url    = new URL(req.url);
  const code   = url.searchParams.get("code");
  const state  = url.searchParams.get("state");
  const errParam = url.searchParams.get("error");

  if (errParam) {
    return Response.redirect(`${APP_URL}?drive_error=${errParam}`, 302);
  }

  if (!code || !state) {
    return new Response("Missing code or state", { status: 400 });
  }

  // Decodificar state para obtener userId
  let userId: string;
  try {
    const decoded = JSON.parse(atob(state));
    userId = decoded.userId;
  } catch {
    return new Response("Invalid state", { status: 400 });
  }

  // Intercambiar code por tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri:  GOOGLE_REDIRECT_URI,
      grant_type:    "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return Response.redirect(`${APP_URL}?drive_error=token_exchange_failed`, 302);
  }

  const tokens = await tokenRes.json();

  // Guardar tokens en tabla perfiles usando service role
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { error } = await supabase
    .from("perfiles")
    .update({
      google_access_token:  tokens.access_token,
      google_refresh_token: tokens.refresh_token || null,
      google_token_expiry:  tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
    })
    .eq("id", userId);

  if (error) {
    return Response.redirect(`${APP_URL}?drive_error=db_update_failed`, 302);
  }

  // Redirigir de vuelta a la app con éxito
  return Response.redirect(`${APP_URL}?drive_connected=1`, 302);
});
