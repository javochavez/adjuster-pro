import { EST, RAMOS, MON_CLS, TODO_PRIO, REGLAS_INFORMES, INF_TIPOS } from './config.js';
import { data, currentSin } from './state.js';
import { g, toast, fmt, fmtD, fmtMXN, toMXN } from './ui.js';
import { db, loadAll, poblarSelectores } from './db.js';
import { cerrarModal } from './modal.js';
import { renderDetalle, renderAjustBadges, editarSiniestro, verSiniestro } from './detalle.js';
import { eliminar } from './db.js';
import { renderPolizas, renderAseguradoras, renderAsegurados, renderContactos, renderTC, renderAjustadores } from './render.js';
import { renderSolicitudesAlertas } from './solicitudes.js';
import { switchMain } from './nav.js';

// ── Helpers de fecha / movimiento ─────────────────────────────────────────

export function ultimoMovimiento(sinId){
  const fechas=[];
  const addF=(arr,campo)=>arr.filter(r=>r.id_siniestro===sinId).forEach(r=>{ if(r[campo]) fechas.push({fecha:r[campo],tipo:campo}); });
  addF(data.res,'fecha');
  addF(data.pag,'fecha');
  addF(data.hon,'fecha_pacto');
  addF(data.hon,'fecha_pago');
  addF(data.viat,'fecha');
  addF(data.act,'fecha');
  addF(data.bit,'fecha');
  addF(data.inf,'fecha_envio');
  addF(data.doc,'fecha');
  const sin=data.sin.find(s=>s.id===sinId);
  if(sin?.fecha_asignacion) fechas.push({fecha:sin.fecha_asignacion,tipo:'asignacion'});
  if(!fechas.length) return null;
  fechas.sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
  return fechas[0];
}

export function diasInactivo(fechaStr){
  if(!fechaStr) return 9999;
  const hoy=new Date(); hoy.setHours(0,0,0,0);
  const f=new Date(fechaStr); f.setHours(0,0,0,0);
  return Math.floor((hoy-f)/(1000*60*60*24));
}

export function reservaVigente(sinId){
  const byConcepto={};
  data.res.filter(r=>r.id_siniestro===sinId).forEach(r=>{
    if(!byConcepto[r.concepto]||r.id>byConcepto[r.concepto].id) byConcepto[r.concepto]=r;
  });
  return Object.values(byConcepto).reduce((a,r)=>a+toMXN(r.monto,r.moneda,r.tipo_cambio_mxn),0);
}

// ── Reglas de informes ────────────────────────────────────────────────────

export function reglaInforme(aseg){
  if(!aseg) return null;
  const cod=(aseg.codigo_sistema||'').toUpperCase();
  if(REGLAS_INFORMES[cod]) return REGLAS_INFORMES[cod];
  const nom=(aseg.nombre||'').toUpperCase();
  for(const k of Object.keys(REGLAS_INFORMES)){
    if(nom.includes(k)) return REGLAS_INFORMES[k];
  }
  return null;
}

export function ultimoInformeActualizacion(sinId){
  const infs=data.inf.filter(i=>i.id_siniestro===sinId&&i.tipo==='actualizacion');
  if(!infs.length) return null;
  return infs.sort((a,b)=>new Date(b.fecha_envio||b.created_at)-new Date(a.fecha_envio||a.created_at))[0];
}

export function movimientoDespuesDeInforme(sinId, fechaInforme){
  if(!fechaInforme) return true;
  const fi=new Date(fechaInforme); fi.setHours(0,0,0,0);
  const chk=(arr,campo)=>arr.some(r=>r.id_siniestro===sinId&&r[campo]&&new Date(r[campo])>fi);
  return chk(data.res,'fecha')||chk(data.pag,'fecha')||chk(data.hon,'fecha_pacto')||
         chk(data.bit,'fecha')||chk(data.inf.filter(i=>i.tipo!=='actualizacion'),'fecha_envio');
}

// ── Cálculo de pendientes ─────────────────────────────────────────────────

export function calcInformesPendientes(){
  const hoy=new Date(); hoy.setHours(0,0,0,0);
  const diaHoy=hoy.getDate();
  const pendientes=[];
  const activos=data.sin.filter(s=>['asignado','inspeccion','informe','documentando','cobro'].includes(s.estatus));

  activos.forEach(s=>{
    const pol=data.pol.find(p=>p.id===s.id_poliza)||{};
    const aseg=data.aseg.find(a=>a.id===pol.id_aseguradora)||{};
    const regla=reglaInforme(aseg);
    if(!regla) return;

    const ultInf=ultimoInformeActualizacion(s.id);
    const fechaUltInf=ultInf?.fecha_envio||null;
    const diasDesde=fechaUltInf?Math.floor((hoy-new Date(fechaUltInf))/(864e5)):9999;

    let tieneEnMesActual=false;
    if(fechaUltInf){
      const fu=new Date(fechaUltInf);
      tieneEnMesActual=(fu.getFullYear()===hoy.getFullYear()&&fu.getMonth()===hoy.getMonth());
    }

    const enVentana=(diaHoy>=regla.ventana_ini&&diaHoy<=regla.ventana_fin);
    const hayMovimiento=regla.demanda&&movimientoDespuesDeInforme(s.id,fechaUltInf);

    let motivo=null;
    let urgencia='normal';

    if(enVentana&&!tieneEnMesActual){
      motivo=`Ventana mensual ${regla.label} (días ${regla.ventana_ini}–${regla.ventana_fin})`;
      urgencia='urgente';
    } else if(hayMovimiento&&!tieneEnMesActual){
      motivo='Cambios en el expediente sin informe de actualización posterior';
      urgencia='normal';
    }

    if(motivo){
      pendientes.push({s, aseg, pol, ultInf, fechaUltInf, diasDesde, motivo, urgencia});
    }
  });

  return pendientes.sort((a,b)=>{
    if(a.urgencia!==b.urgencia) return a.urgencia==='urgente'?-1:1;
    return b.diasDesde-a.diasDesde;
  });
}

export function calcTodoPendientes(){
  const diasAviso = parseInt(g('todo-dias-aviso')?.value ?? '3') || 3;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const limite = new Date(hoy); limite.setDate(limite.getDate() + diasAviso);
  return data.todos.filter(t=>{
    if(t.completado) return false;
    if(!t.fecha_limite) return false;
    const fl = new Date(t.fecha_limite + ' 00:00:00'); fl.setHours(0,0,0,0);
    return fl <= limite;
  }).sort((a,b)=>new Date(a.fecha_limite)-new Date(b.fecha_limite));
}

// ── Render ToDo grid ──────────────────────────────────────────────────────

export function renderTodoGrid(todos, wrap){
  if(!wrap) return;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const pending = todos.filter(t=>!t.completado);
  const done    = todos.filter(t=>t.completado);

  let html = '';
  if(!todos.length){
    html = `<div style="font-size:12px;color:var(--text-ter);padding:8px 0;">Sin ToDos registrados. Usa "+ Nuevo ToDo" para agregar actividades pendientes.</div>`;
  } else {
    html += `<div style="margin-bottom:12px;">`;
    if(pending.length){
      html += `<div style="font-size:11px;font-weight:600;color:var(--text-sec);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">Pendientes (${pending.length})</div>`;
      html += `<div style="display:flex;flex-direction:column;gap:6px;">`;
      pending.forEach(t=>{
        const fl   = t.fecha_limite ? new Date(t.fecha_limite+' 00:00:00') : null;
        const dias = fl ? Math.floor((fl-hoy)/(864e5)) : null;
        const vencido = dias!==null && dias<0;
        const urgente = dias!==null && dias<=3;
        const prio = TODO_PRIO[t.prioridad]||TODO_PRIO.media;
        const ajust = t.id_ajustador ? (data.ajust.find(a=>a.id===t.id_ajustador)||{}).nombre||'' : '';
        const bgRow    = vencido?'rgba(220,60,60,.07)':urgente?'rgba(186,117,23,.07)':'var(--surface2)';
        const borderClr= vencido?'rgba(220,60,60,.3)':urgente?'rgba(186,117,23,.3)':'var(--border)';
        const diasTxt  = dias===null?'Sin fecha':dias===0?'Hoy':dias<0?`Vencido ${Math.abs(dias)}d`:`En ${dias}d`;
        const diasClr  = vencido?'#ef9f9f':urgente?'#ffcc80':'var(--text-sec)';
        html += `<div style="background:${bgRow};border:1px solid ${borderClr};border-radius:var(--r);padding:8px 12px;display:flex;align-items:flex-start;gap:10px;">
          <input type="checkbox" onclick="completarTodo(${t.id})" title="Marcar como completado"
            style="margin-top:3px;cursor:pointer;width:15px;height:15px;flex-shrink:0;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;color:var(--text);margin-bottom:3px;">${t.descripcion||''}</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:11px;">
              <span style="color:${prio.color};">${prio.label}</span>
              <span style="color:${diasClr};font-weight:600;">${diasTxt}</span>
              ${fl?`<span style="color:var(--text-ter);">${fmtD(t.fecha_limite)}</span>`:''}
              ${ajust?`<span style="color:var(--text-ter);">→ ${ajust}</span>`:''}
            </div>
            ${t.notas?`<div style="font-size:11px;color:var(--text-ter);margin-top:3px;">${t.notas}</div>`:''}
          </div>
          <button class="btn btn-sm btn-danger" onclick="eliminar('todos',${t.id})" title="Eliminar" style="flex-shrink:0;padding:2px 8px;font-size:11px;">✕</button>
        </div>`;
      });
      html += `</div>`;
    }
    if(done.length){
      html += `<div style="margin-top:12px;">
        <div style="font-size:11px;font-weight:600;color:var(--text-ter);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Completados (${done.length})</div>
        <div style="display:flex;flex-direction:column;gap:4px;">`;
      done.slice(0,5).forEach(t=>{
        html += `<div style="padding:6px 10px;background:var(--surface);border-radius:var(--r);display:flex;gap:8px;align-items:center;opacity:.6;">
          <span style="color:#a5d6a7;font-size:14px;">✓</span>
          <span style="font-size:12px;color:var(--text-sec);text-decoration:line-through;">${t.descripcion||''}</span>
          <span style="font-size:10px;color:var(--text-ter);margin-left:auto;">${fmtD(t.fecha_completado||t.fecha_limite)}</span>
          <button class="btn btn-sm btn-danger" onclick="eliminar('todos',${t.id})" style="padding:1px 6px;font-size:10px;opacity:.7;">✕</button>
        </div>`;
      });
      if(done.length>5) html+=`<div style="font-size:11px;color:var(--text-ter);padding:4px 10px;">... y ${done.length-5} más completados</div>`;
      html += `</div></div>`;
    }
    html += `</div>`;
  }
  wrap.innerHTML = html;
}

export async function guardarTodo(){
  if(!currentSin) return;
  const desc = g('todo-desc')?.value?.trim();
  if(!desc){ toast('La descripción es obligatoria.'); return; }
  const {error} = await db.from('todos').insert({
    id_siniestro: currentSin.id,
    descripcion:  desc,
    fecha_limite: g('todo-fecha')?.value||null,
    prioridad:    g('todo-prioridad')?.value||'media',
    id_ajustador: parseInt(g('todo-ajustador')?.value)||null,
    notas:        g('todo-notas')?.value||null,
    completado:   false,
  });
  if(error){ toast('Error: '+error.message); return; }
  toast('ToDo registrado.'); cerrarModal('modal-todo');
  await loadAll(); renderDetalle();
}

export async function completarTodo(id){
  const hoy = new Date().toISOString().slice(0,10);
  const {error} = await db.from('todos').update({completado:true, fecha_completado:hoy}).eq('id',id);
  if(error){ toast('Error: '+error.message); return; }
  const t = data.todos.find(x=>x.id===id);
  if(t){ t.completado=true; t.fecha_completado=hoy; }
  toast('¡Tarea completada! ✓');
  if(currentSin){
    const todoWrap = g('todo-grid-'+currentSin.id);
    if(todoWrap) renderTodoGrid(data.todos.filter(t=>t.id_siniestro===currentSin.id), todoWrap);
  }
  renderTodosAlertas();
  renderDash();
}

// ── Render informes pendientes ────────────────────────────────────────────

export function renderInformesPendientes(){
  const pendientes=calcInformesPendientes();
  const urgentes=pendientes.filter(p=>p.urgencia==='urgente').length;
  const normales=pendientes.filter(p=>p.urgencia==='normal').length;

  const resWrap=g('inf-act-resumen');
  if(resWrap){
    resWrap.innerHTML=`
      <div class="mc" style="border-left-color:#e24b4a;">
        <div class="mc-lbl">En ventana mensual</div>
        <div class="mc-val" style="color:#ef9f9f;">${urgentes}</div>
        <div class="mc-sub">Requieren informe esta semana</div>
      </div>
      <div class="mc" style="border-left-color:#BA7517;">
        <div class="mc-lbl">Con cambios sin informe</div>
        <div class="mc-val" style="color:#ffcc80;">${normales}</div>
        <div class="mc-sub">Movimientos no reportados</div>
      </div>
      <div class="mc">
        <div class="mc-lbl">Total pendientes</div>
        <div class="mc-val">${pendientes.length}</div>
      </div>`;
  }

  const tbody=g('inf-act-body');
  if(!tbody) return;
  if(!pendientes.length){
    tbody.innerHTML=`<tr><td colspan="7" class="empty" style="color:#a5d6a7;">✓ No hay informes de actualización pendientes.</td></tr>`;
    return;
  }
  tbody.innerHTML=pendientes.map(({s,aseg,ultInf,fechaUltInf,diasDesde,motivo,urgencia})=>{
    const pol=data.pol.find(p=>p.id===s.id_poliza)||{};
    const asdo=data.asdo.find(a=>a.id===pol.id_asegurado)||{};
    const rowCls=urgencia==='urgente'?'alerta-critica':'alerta-warning';
    const diasTxt=diasDesde>=9999?'Nunca':diasDesde+' días';
    const diasCls=urgencia==='urgente'?'dias-critico':'dias-warning';
    return `<tr class="${rowCls}" style="cursor:pointer;" onclick="irAExpediente(${s.id})">
      <td><strong>${s.numero_exp}</strong></td>
      <td>${asdo.nombre||'—'}</td>
      <td>${aseg.nombre||'—'}</td>
      <td style="font-size:11px;">${motivo}</td>
      <td>${fechaUltInf?fmtD(fechaUltInf):'<span style="color:var(--text-ter);">Ninguno</span>'}</td>
      <td><span class="dias-badge ${diasCls}">${diasTxt}</span></td>
      <td><button class="btn btn-sm" onclick="event.stopPropagation();irAExpediente(${s.id})">Ver expediente</button></td>
    </tr>`;
  }).join('');
}

// ── Render ToDos alertas ──────────────────────────────────────────────────

export function renderTodosAlertas(){
  const pendientes = calcTodoPendientes();
  const hoyRef = new Date(); hoyRef.setHours(0,0,0,0);
  const vencidos = pendientes.filter(t=>{ const fl=new Date(t.fecha_limite+' 00:00:00'); fl.setHours(0,0,0,0); return fl<hoyRef; });
  const proximos = pendientes.filter(t=>{ const fl=new Date(t.fecha_limite+' 00:00:00'); fl.setHours(0,0,0,0); return fl>=hoyRef; });

  const resWrap = g('todo-alerta-resumen');
  if(resWrap) resWrap.innerHTML=`
    <div class="mc" style="border-left-color:#e24b4a;">
      <div class="mc-lbl">Vencidos</div>
      <div class="mc-val" style="color:#ef9f9f;">${vencidos.length}</div>
    </div>
    <div class="mc" style="border-left-color:#BA7517;">
      <div class="mc-lbl">Próximos 3 días</div>
      <div class="mc-val" style="color:#ffcc80;">${proximos.length}</div>
    </div>
    <div class="mc">
      <div class="mc-lbl">Total pendientes urgentes</div>
      <div class="mc-val">${pendientes.length}</div>
    </div>`;

  const tbody = g('todo-alerta-body');
  if(!tbody) return;
  if(!pendientes.length){
    tbody.innerHTML=`<tr><td colspan="7" class="empty" style="color:#a5d6a7;">✓ Sin ToDos vencidos ni próximos a vencer.</td></tr>`;
    return;
  }
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  tbody.innerHTML = pendientes.map(t=>{
    const s    = data.sin.find(x=>x.id===t.id_siniestro)||{};
    const fl   = new Date(t.fecha_limite+' 00:00:00');
    const dias = Math.floor((fl-hoy)/(864e5));
    const venc = dias<0;
    const prio = TODO_PRIO[t.prioridad]||TODO_PRIO.media;
    const ajust= t.id_ajustador?(data.ajust.find(a=>a.id===t.id_ajustador)||{}).nombre||'—':'—';
    const diasTxt = dias===0?'Hoy':dias<0?`Vencido ${Math.abs(dias)}d`:`En ${dias}d`;
    return `<tr class="${venc?'alerta-critica':'alerta-warning'}" style="cursor:pointer;" onclick="irAExpediente(${t.id_siniestro})">
      <td><strong>${s.numero_exp||'—'}</strong></td>
      <td>${t.descripcion||'—'}</td>
      <td><span style="color:${prio.color};font-size:12px;">${prio.label}</span></td>
      <td>${fmtD(t.fecha_limite)}</td>
      <td><span class="dias-badge ${venc?'dias-critico':'dias-warning'}">${diasTxt}</span></td>
      <td style="font-size:11px;">${ajust}</td>
      <td>
        <button class="btn btn-sm" onclick="event.stopPropagation();completarTodo(${t.id})" title="Marcar completado">✓</button>
        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();eliminar('todos',${t.id})">✕</button>
      </td>
    </tr>`;
  }).join('');
}

// ── Dashboard principal ───────────────────────────────────────────────────

export function renderDash(){
  const activos = data.sin.filter(s=>s.estatus!=='cerrado');
  const totRes  = data.sin.reduce((a,s)=>{ const rv=reservaVigente(s.id); return a+rv; },0);
  const totPag  = data.pag.reduce((a,p)=>a+toMXN(p.monto,p.moneda,p.tipo_cambio_mxn),0);
  const totHon  = data.hon.reduce((a,h)=>a+toMXN(h.monto,h.moneda,h.tipo_cambio_mxn),0);
  const totViat = data.viat.reduce((a,v)=>a+toMXN(v.monto,v.moneda,v.tipo_cambio_mxn),0);

  const inactivos15 = activos.filter(s=>{ const um=ultimoMovimiento(s.id); return diasInactivo(um?.fecha)>=15; });
  const inactivos30 = activos.filter(s=>{ const um=ultimoMovimiento(s.id); return diasInactivo(um?.fecha)>=30; });

  const infPendientes=calcInformesPendientes();
  const infUrgentes=infPendientes.filter(p=>p.urgencia==='urgente').length;

  const todosPend = calcTodoPendientes();
  const todosVenc = todosPend.filter(t=>{ const fl=new Date(t.fecha_limite+' 00:00:00'); const h=new Date(); h.setHours(0,0,0,0); return fl<h; }).length;

  g('dash-metrics').innerHTML=`
    <div class="mc"><div class="mc-lbl">Expedientes activos</div><div class="mc-val">${activos.length}<span style="font-size:13px;font-weight:400;color:var(--text-sec)"> / ${data.sin.length}</span></div></div>
    <div class="mc"><div class="mc-lbl">Reserva vigente total</div><div class="mc-val" style="font-size:15px;">${fmtMXN(totRes)}</div><div class="mc-sub">MXN equivalente</div></div>
    <div class="mc"><div class="mc-lbl">Pagos acumulados</div><div class="mc-val" style="font-size:15px;">${fmtMXN(totPag)}</div><div class="mc-sub">MXN equivalente</div></div>
    <div class="mc" style="cursor:pointer;" onclick="switchMain('alertas',document.getElementById('nav-alertas'))">
      <div class="mc-lbl">Sin movimiento ≥15 días</div>
      <div class="mc-val" style="font-size:20px;color:${inactivos15.length>0?'#ef9f9f':'#a5d6a7'};">${inactivos15.length}</div>
      <div class="mc-sub">${inactivos30.length} con ≥30 días — clic para ver alertas</div>
    </div>
    <div class="mc" style="cursor:pointer;border-left-color:${infPendientes.length>0?'#BA7517':'var(--accent)'};" onclick="switchMain('alertas',document.getElementById('nav-alertas'))">
      <div class="mc-lbl">Informes de actualización</div>
      <div class="mc-val" style="font-size:20px;color:${infUrgentes>0?'#ef9f9f':infPendientes.length>0?'#ffcc80':'#a5d6a7'};">${infPendientes.length}</div>
      <div class="mc-sub">${infUrgentes>0?infUrgentes+' en ventana mensual — urgente':'pendientes por movimientos'}</div>
    </div>
    <div class="mc" style="cursor:pointer;border-left-color:${todosVenc>0?'#e24b4a':todosPend.length>0?'#BA7517':'var(--accent)'};" onclick="switchMain('alertas',document.getElementById('nav-alertas'))">
      <div class="mc-lbl">📋 ToDos urgentes</div>
      <div class="mc-val" style="font-size:20px;color:${todosVenc>0?'#ef9f9f':todosPend.length>0?'#ffcc80':'#a5d6a7'};">${todosPend.length}</div>
      <div class="mc-sub">${todosVenc>0?todosVenc+' vencidos':todosPend.length>0?'próximos 3 días':'al día'}</div>
    </div>`;

  const bannerTodo = g('dash-todo-banner');
  if(bannerTodo){
    if(todosVenc>0){
      bannerTodo.innerHTML=`<div style="background:rgba(220,60,60,.12);border:1px solid rgba(220,60,60,.3);border-radius:var(--rl);padding:10px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12px;color:#ef9f9f;">📋 ${todosVenc} ToDo${todosVenc>1?'s':''} vencido${todosVenc>1?'s':''} — requiere${todosVenc>1?'n':''} atención inmediata.</span>
        <button class="btn btn-sm" style="font-size:11px;color:#ef9f9f;border-color:rgba(220,60,60,.4);" onclick="switchMain('alertas',document.getElementById('nav-alertas'))">Ver ToDos →</button>
      </div>`;
    } else if(todosPend.length>0){
      bannerTodo.innerHTML=`<div style="background:rgba(186,117,23,.08);border:1px solid rgba(186,117,23,.2);border-radius:var(--rl);padding:8px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12px;color:#ffcc80;">📋 ${todosPend.length} ToDo${todosPend.length>1?'s':''} vence${todosPend.length>1?'n':''} en los próximos 3 días.</span>
        <button class="btn btn-sm" style="font-size:11px;color:#ffcc80;border-color:rgba(186,117,23,.2);" onclick="switchMain('alertas',document.getElementById('nav-alertas'))">Ver ToDos →</button>
      </div>`;
    } else { bannerTodo.innerHTML=''; }
  }

  const bannerInf=g('dash-informes-banner');
  if(bannerInf){
    if(infUrgentes>0){
      bannerInf.innerHTML=`<div style="background:rgba(186,117,23,.15);border:1px solid rgba(186,117,23,.4);border-radius:var(--rl);padding:10px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12px;color:#ffcc80;">📋 ${infUrgentes} expediente${infUrgentes>1?'s':''} en ventana de informe de actualización — elaborar antes del día ${Math.max(...Object.values(REGLAS_INFORMES).map(r=>r.ventana_fin))} de este mes.</span>
        <button class="btn btn-sm" style="font-size:11px;color:#ffcc80;border-color:rgba(186,117,23,.4);" onclick="switchMain('alertas',document.getElementById('nav-alertas'))">Ver recordatorios →</button>
      </div>`;
    } else if(infPendientes.length>0){
      bannerInf.innerHTML=`<div style="background:rgba(186,117,23,.08);border:1px solid rgba(186,117,23,.2);border-radius:var(--rl);padding:8px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12px;color:#ffcc80;">📋 ${infPendientes.length} expediente${infPendientes.length>1?'s':''} con cambios pendientes de informe de actualización.</span>
        <button class="btn btn-sm" style="font-size:11px;color:#ffcc80;border-color:rgba(186,117,23,.2);" onclick="switchMain('alertas',document.getElementById('nav-alertas'))">Ver recordatorios →</button>
      </div>`;
    } else { bannerInf.innerHTML=''; }
  }

  const navBtn=g('nav-alertas');
  const totalBadge=inactivos15.length+infPendientes.length;
  if(navBtn){
    const existingBadge=navBtn.querySelector('.nav-badge');
    if(existingBadge) existingBadge.remove();
    if(totalBadge>0) navBtn.innerHTML+='<span class="nav-badge">'+totalBadge+'</span>';
  }

  const banner=g('dash-alerta-banner');
  if(banner){
    if(inactivos15.length>0){
      banner.innerHTML=`<div style="background:rgba(220,60,60,.12);border:1px solid rgba(220,60,60,.3);border-radius:var(--rl);padding:10px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12px;color:#ef9f9f;">⚠ ${inactivos15.length} expediente${inactivos15.length>1?'s':''} sin movimiento en los últimos 15 días o más.</span>
        <button class="btn btn-sm" style="font-size:11px;color:#ef9f9f;border-color:rgba(220,60,60,.4);" onclick="switchMain('alertas',document.getElementById('nav-alertas'))">Ver alertas →</button>
      </div>`;
    } else { banner.innerHTML=''; }
  }

  g('dash-body').innerHTML = activos.slice(0,20).map(s=>{
    const pol=data.pol.find(p=>p.id===s.id_poliza)||{};
    const asdo=data.asdo.find(a=>a.id===pol.id_asegurado)||{};
    const aseg=data.aseg.find(a=>a.id===pol.id_aseguradora)||{};
    const rv=reservaVigente(s.id);
    const pags=data.pag.filter(p=>p.id_siniestro===s.id).reduce((a,p)=>a+toMXN(p.monto,p.moneda,p.tipo_cambio_mxn),0);
    const saldo=rv-pags;
    const um=ultimoMovimiento(s.id);
    const dias=diasInactivo(um?.fecha);
    const diasCls=dias>=30?'dias-critico':dias>=15?'dias-warning':'';
    const rowCls=dias>=30?'alerta-critica':dias>=15?'alerta-warning':'';
    return `<tr class="${rowCls}" onclick="irAExpediente(${s.id})" style="cursor:pointer;">
      <td><strong>${s.numero_exp}</strong></td>
      <td>${asdo.nombre||'—'}</td><td>${aseg.nombre||'—'}</td>
      <td>${RAMOS[pol.ramo]||pol.ramo||'—'}</td>
      <td>${fmtMXN(rv)}</td>
      <td style="color:${saldo>0?'#ffcc80':'#a5d6a7'}">${fmtMXN(saldo)}</td>
      <td>${um?'<span class="dias-badge '+diasCls+'">'+(fmtD(um.fecha))+'</span>'+(diasCls?'<div class="td-sub" style="margin-top:2px;">'+dias+' días sin movimiento</div>':''):'<span style="color:var(--text-ter);">Sin registros</span>'}</td>
      <td><span class="badge ${EST[s.estatus]?.cls||''}">${EST[s.estatus]?.label||s.estatus}</span></td>
    </tr>`;}).join('')||'<tr><td colspan="8" class="empty">Sin expedientes activos.</td></tr>';
}

// ── Alertas de inactividad ────────────────────────────────────────────────

export function renderAlertas(){
  const limiteDias=parseInt(g('alerta-dias')?.value)||15;
  const activos=data.sin.filter(s=>s.estatus!=='cerrado');
  const inactivos=activos.map(s=>{
    const um=ultimoMovimiento(s.id);
    return {s, um, dias:diasInactivo(um?.fecha)};
  }).filter(x=>x.dias>=limiteDias).sort((a,b)=>b.dias-a.dias);

  const crit=inactivos.filter(x=>x.dias>=30).length;
  const warn=inactivos.filter(x=>x.dias>=15&&x.dias<30).length;

  g('alertas-resumen').innerHTML=`
    <div class="mc" style="border-left-color:#e24b4a;">
      <div class="mc-lbl">Críticos (≥30 días)</div>
      <div class="mc-val" style="color:#ef9f9f;">${crit}</div>
    </div>
    <div class="mc" style="border-left-color:#BA7517;">
      <div class="mc-lbl">Advertencia (15–29 días)</div>
      <div class="mc-val" style="color:#ffcc80;">${warn}</div>
    </div>
    <div class="mc">
      <div class="mc-lbl">Total sin movimiento ≥${limiteDias} días</div>
      <div class="mc-val">${inactivos.length}</div>
    </div>`;

  if(!inactivos.length){
    g('alertas-body').innerHTML=`<tr><td colspan="8" class="empty" style="color:#a5d6a7;">✓ Todos los expedientes activos tienen movimiento reciente.</td></tr>`;
    renderInformesPendientes();
    return;
  }

  g('alertas-body').innerHTML=inactivos.map(({s,um,dias})=>{
    const pol=data.pol.find(p=>p.id===s.id_poliza)||{};
    const asdo=data.asdo.find(a=>a.id===pol.id_asegurado)||{};
    const aseg=data.aseg.find(a=>a.id===pol.id_aseguradora)||{};
    const critico=dias>=30;
    const tipLabel=um?({
      fecha:'Último registro', fecha_pacto:'Honorario pactado', fecha_pago:'Honorario pagado',
      fecha_envio:'Informe enviado', asignacion:'Fecha de asignación'
    }[um.tipo]||'Registro'):'Sin registros';
    return `<tr class="${critico?'alerta-critica':'alerta-warning'}" style="cursor:pointer;" onclick="irAExpediente(${s.id})">
      <td><strong>${s.numero_exp}</strong></td>
      <td>${asdo.nombre||'—'}</td>
      <td>${aseg.nombre||'—'}</td>
      <td><span class="badge ${EST[s.estatus]?.cls||''}">${EST[s.estatus]?.label||s.estatus}</span></td>
      <td>${um?fmtD(um.fecha):'—'}</td>
      <td><span class="dias-badge ${critico?'dias-critico':'dias-warning'}">${dias} días</span></td>
      <td style="font-size:11px;color:var(--text-sec);">${tipLabel}</td>
      <td><button class="btn btn-sm" onclick="event.stopPropagation();irAExpediente(${s.id})">Ver expediente</button></td>
    </tr>`;}).join('');

  renderInformesPendientes();
  renderTodosAlertas();
  renderSolicitudesAlertas();
}

// ── Lista de siniestros ───────────────────────────────────────────────────

export function renderSiniestros(){
  const q=(g('sin-search') ? (g('sin-search').value||'') : '').toLowerCase();
  const est=g('sin-filtro-est') ? (g('sin-filtro-est').value||'') : '';
  const fil=data.sin.filter(s=>{
    const pol=data.pol.find(p=>p.id===s.id_poliza)||{};
    const asdo=data.asdo.find(a=>a.id===pol.id_asegurado)||{};
    const aseg=data.aseg.find(a=>a.id===pol.id_aseguradora)||{};
    const match=(s.numero_exp||'').toLowerCase().includes(q)||(asdo.nombre||'').toLowerCase().includes(q)||(aseg.nombre||'').toLowerCase().includes(q);
    return match&&(!est||s.estatus===est);
  });

  const activos  = fil.filter(s=>s.estatus!=='cerrado');
  const cerrados = fil.filter(s=>s.estatus==='cerrado');

  const renderFila = s => {
    const pol=data.pol.find(p=>p.id===s.id_poliza)||{};
    const asdo=data.asdo.find(a=>a.id===pol.id_asegurado)||{};
    return `<tr onclick="verSiniestro(${s.id})" style="cursor:pointer;${s.estatus==='cerrado'?'opacity:.7;':''}">
      <td><strong>${s.numero_exp}</strong></td>
      <td>${pol.numero||'—'}</td>
      <td>${asdo.nombre||'—'}</td>
      <td>${s.tipo_siniestro||'—'}</td>
      <td>${fmtD(s.fecha_siniestro)}</td>
      <td>${fmtD(s.fecha_asignacion)}</td>
      <td><span class="badge ${EST[s.estatus]?.cls||''}">${EST[s.estatus]?.label||s.estatus}</span></td>
      <td><div class="td-acts">
        <button class="btn btn-sm" onclick="event.stopPropagation();editarSiniestro(${s.id})">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();eliminar('siniestros',${s.id})">Eliminar</button>
      </div></td>
    </tr>`;
  };

  let rows = '';
  if(!activos.length && !cerrados.length){
    rows = '<tr><td colspan="8" class="empty">Sin expedientes.</td></tr>';
  } else {
    rows += activos.map(renderFila).join('');
    if(cerrados.length){
      rows += `<tr>
        <td colspan="8" style="padding:10px 12px 6px;background:var(--bg);border-top:2px solid var(--border-md);font-size:10px;font-weight:700;color:var(--text-ter);text-transform:uppercase;letter-spacing:.08em;pointer-events:none;">
          ── Expedientes cerrados (${cerrados.length}) ──
        </td>
      </tr>`;
      rows += cerrados.map(renderFila).join('');
    }
  }
  g('sin-body').innerHTML = rows;
}

export function recalcDash(){ renderDash(); }

export function renderAll(){
  renderDash(); renderAlertas(); renderSiniestros();
  renderPolizas(); renderAseguradoras(); renderAsegurados();
  renderContactos(); renderTC(); renderAjustadores();
  poblarSelectores();
}
