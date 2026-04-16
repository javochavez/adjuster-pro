// supabase/functions/approve-user/index.ts
// Endpoint al que llega el administrador cuando hace clic en el link del correo.
// URL esperada: GET /functions/v1/approve-user?token=<uuid>
// No requiere autenticación: el token es el secreto.

import { serve }        from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req: Request): Promise<Response> => {
  const APP_URL = Deno.env.get('APP_URL') ?? ''

  // Solo acepta GET
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const url   = new URL(req.url)
  const token = url.searchParams.get('token')?.trim()

  if (!token) {
    return Response.redirect(`${APP_URL}/login?error=token_requerido`, 302)
  }

  // Cliente con service_role para bypassear RLS
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  // Busca el token válido, no usado y no expirado
  const { data: solicitud, error: fetchErr } = await supabase
    .from('solicitudes_aprobacion')
    .select('id, user_id, usado, expires_at')
    .eq('token', token)
    .single()

  if (fetchErr || !solicitud) {
    console.error('approve-user: token no encontrado:', fetchErr?.message)
    return Response.redirect(`${APP_URL}/login?error=token_invalido`, 302)
  }

  if (solicitud.usado) {
    return Response.redirect(`${APP_URL}/login?error=token_ya_usado`, 302)
  }

  if (new Date(solicitud.expires_at) < new Date()) {
    return Response.redirect(`${APP_URL}/login?error=token_expirado`, 302)
  }

  // Aprueba al usuario: marca perfil como aprobado
  const { error: updatePerfilErr } = await supabase
    .from('perfiles')
    .update({
      aprobado:    true,
      aprobado_at: new Date().toISOString(),
    })
    .eq('id', solicitud.user_id)

  if (updatePerfilErr) {
    console.error('approve-user: error al aprobar perfil:', updatePerfilErr.message)
    return Response.redirect(`${APP_URL}/login?error=error_interno`, 302)
  }

  // Marca el token como usado (no reutilizable)
  await supabase
    .from('solicitudes_aprobacion')
    .update({ usado: true })
    .eq('id', solicitud.id)

  // Obtiene el email del usuario aprobado para mostrarlo en la confirmación
  const { data: userData } = await supabase.auth.admin.getUserById(solicitud.user_id)
  const userEmail = userData?.user?.email ?? ''

  // Redirige al admin a la pantalla de confirmación con el email aprobado
  const successUrl = `${APP_URL}/login?aprobado=1&email=${encodeURIComponent(userEmail)}`
  return Response.redirect(successUrl, 302)
})
