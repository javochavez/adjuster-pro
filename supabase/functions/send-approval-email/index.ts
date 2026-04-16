// supabase/functions/send-approval-email/index.ts
// Llamada desde el trigger handle_new_user() vía pg_net.
// Envía un correo al administrador con el link de aprobación.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

interface ApprovalPayload {
  user_id: string
  email:   string
  nombre:  string
  rol:     string
  token:   string
}

serve(async (req: Request): Promise<Response> => {
  // Solo acepta POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // Valida que la solicitud viene del propio proyecto (bearer = service_role_key)
  const authHeader = req.headers.get('Authorization') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!authHeader.startsWith('Bearer ') || authHeader.slice(7) !== serviceKey) {
    return new Response('Unauthorized', { status: 401 })
  }

  let payload: ApprovalPayload
  try {
    payload = await req.json()
  } catch {
    return new Response('Bad Request: invalid JSON', { status: 400 })
  }

  const { email, nombre, rol, token } = payload

  const APP_URL     = Deno.env.get('APP_URL')      ?? ''
  const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL')  ?? ''
  const RESEND_KEY  = Deno.env.get('RESEND_API_KEY') ?? ''
  const FROM_EMAIL  = Deno.env.get('FROM_EMAIL')   ?? 'noreply@adjuster-pro.app'

  if (!APP_URL || !ADMIN_EMAIL || !RESEND_KEY) {
    console.error('send-approval-email: faltan variables de entorno', {
      APP_URL: !!APP_URL,
      ADMIN_EMAIL: !!ADMIN_EMAIL,
      RESEND_KEY: !!RESEND_KEY,
    })
    return new Response('Internal Server Error: missing env vars', { status: 500 })
  }

  const approvalUrl = `${APP_URL}/aprobar?token=${token}`

  const rolLabel: Record<string, string> = {
    admin:     'Administrador',
    ajustador: 'Ajustador',
    consultor: 'Consultor',
  }

  const emailBody = {
    from:    `AdjusterPro <${FROM_EMAIL}>`,
    to:      [ADMIN_EMAIL],
    subject: `[AdjusterPro] Solicitud de acceso: ${nombre}`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;background:#f4f4f5;margin:0;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;
              padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.1)">
    <h2 style="color:#1e293b;margin-top:0">Nueva solicitud de acceso</h2>
    <p style="color:#475569">Un usuario se ha registrado y espera tu aprobación:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr>
        <td style="padding:8px 0;color:#64748b;width:120px">Nombre</td>
        <td style="padding:8px 0;color:#1e293b;font-weight:600">${nombre}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#64748b">Correo</td>
        <td style="padding:8px 0;color:#1e293b">${email}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#64748b">Rol solicitado</td>
        <td style="padding:8px 0;color:#1e293b">${rolLabel[rol] ?? rol}</td>
      </tr>
    </table>
    <div style="text-align:center;margin:32px 0">
      <a href="${approvalUrl}"
         style="display:inline-block;background:#2563eb;color:#fff;
                padding:14px 32px;border-radius:6px;text-decoration:none;
                font-weight:600;font-size:15px">
        Aprobar acceso
      </a>
    </div>
    <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0">
      Este enlace expira en 7 días y es de un solo uso.<br>
      Si no reconoces esta solicitud, ignora este correo.
    </p>
  </div>
</body>
</html>`,
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(emailBody),
  })

  if (!resendRes.ok) {
    const errText = await resendRes.text()
    console.error('send-approval-email: error de Resend:', errText)
    return new Response('Error al enviar correo', { status: 502 })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status:  200,
    headers: { 'Content-Type': 'application/json' },
  })
})
