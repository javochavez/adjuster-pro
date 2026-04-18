import { db } from './db.js';
import { g, v, toast } from './ui.js';
import { data } from './state.js';
import * as state from './state.js';
import { loadAll } from './data.js';

export function authMostrar(vista){
  g('auth-login').style.display    = vista==='login'    ? '' : 'none';
  g('auth-register').style.display = vista==='register' ? '' : 'none';
  g('auth-pending').style.display  = vista==='pending'  ? '' : 'none';
}

// Muestra mensajes desde query string (?aprobado=1 o ?error=...)
(function authQueryParams(){
  const p = new URLSearchParams(window.location.search);
  if(p.get('aprobado')==='1'){
    const email = decodeURIComponent(p.get('email')||'');
    const ok = g('login-ok');
    if(ok) ok.textContent = email
      ? `Acceso aprobado para ${email}. Ya puede iniciar sesión.`
      : 'Cuenta aprobada. Ya puede iniciar sesión.';
    history.replaceState({}, '', window.location.pathname);
  }
  const errCode = p.get('error');
  if(errCode){
    const msgs = {
      token_invalido:  'El enlace de aprobación no es válido.',
      token_ya_usado:  'Este enlace ya fue utilizado.',
      token_expirado:  'El enlace de aprobación ha expirado.',
      token_requerido: 'Enlace incompleto.',
      error_interno:   'Ocurrió un error al procesar la aprobación.',
    };
    const err = g('login-err');
    if(err) err.textContent = msgs[errCode] || 'Error desconocido.';
    history.replaceState({}, '', window.location.pathname);
  }
})();

export async function doLogin(){
  const email = v('l-email').trim().toLowerCase();
  const pass  = v('l-pass');
  const errEl = g('login-err'), okEl = g('login-ok'), btn = g('login-btn');
  errEl.textContent = ''; okEl.textContent = '';
  if(!email || !pass){ errEl.textContent='Completa todos los campos.'; return; }
  btn.textContent='Verificando...'; btn.disabled=true;
  const {data:d, error} = await db.auth.signInWithPassword({email, password:pass});
  btn.textContent='Ingresar'; btn.disabled=false;
  if(error){ errEl.textContent='Correo o contraseña incorrectos.'; return; }
  const {data:perfil, error:errP} = await db
    .from('perfiles')
    .select('aprobado, rol')
    .eq('id', d.user.id)
    .single();
  if(errP || !perfil){ errEl.textContent='No se pudo verificar el acceso. Intenta de nuevo.'; return; }
  if(perfil.aprobado === true) mostrarApp(d.user.email, perfil.rol || '');
  else authMostrar('pending');
}

export async function doRegister(){
  const nombre = v('r-nombre').trim();
  const email  = v('r-email').trim().toLowerCase();
  const pass   = v('r-pass');
  const pass2  = v('r-pass2');
  const rol    = v('r-rol');
  const errEl  = g('register-err'), okEl = g('register-ok'), btn = g('register-btn');
  errEl.textContent = ''; okEl.textContent = '';
  if(!nombre || !email || !pass || !pass2){ errEl.textContent='Completa todos los campos.'; return; }
  if(pass.length < 8){ errEl.textContent='La contraseña debe tener al menos 8 caracteres.'; return; }
  if(pass !== pass2){ errEl.textContent='Las contraseñas no coinciden.'; return; }
  btn.textContent='Enviando solicitud...'; btn.disabled=true;
  const {error} = await db.auth.signUp({
    email,
    password: pass,
    options: { data: { nombre, rol } }
  });
  btn.textContent='Solicitar acceso'; btn.disabled=false;
  if(error){
    if(error.status === 422 || /already registered|already exists/i.test(error.message)){
      errEl.textContent = 'Este correo ya tiene una cuenta. Inicia sesión o usa otro correo.';
    } else {
      errEl.textContent = error.message || 'Error al registrar. Intenta de nuevo.';
    }
    return;
  }
  okEl.textContent = 'Solicitud enviada. El administrador recibirá un correo para aprobar tu acceso.';
  ['r-nombre','r-email','r-pass','r-pass2'].forEach(id => { const el=g(id); if(el) el.value=''; });
  setTimeout(()=>authMostrar('pending'), 2800);
}

export async function doLogout(){
  await db.auth.signOut();
  state.currentUserRole     = '';
  state.currentUserReadonly = false;
  document.body.classList.remove('modo-lectura');
  g('app').style.display        = 'none';
  g('login-wrap').style.display = 'flex';
  authMostrar('login');
  g('l-pass').value = '';
}

export function mostrarApp(email, rol){
  state.currentUserRole     = rol || '';
  state.currentUserReadonly = (rol === 'consultor');
  g('login-wrap').style.display = 'none';
  g('app').style.display        = 'flex';
  const lbl = g('user-lbl');
  if(lbl){
    const rolLabel = {admin:'Admin', ajustador:'Ajustador', consultor:'Consultor'}[rol] || '';
    lbl.textContent = rolLabel ? `${email}  [${rolLabel}]` : email;
  }
  if(state.currentUserReadonly) document.body.classList.add('modo-lectura');
  else                          document.body.classList.remove('modo-lectura');
  loadAll();
}
