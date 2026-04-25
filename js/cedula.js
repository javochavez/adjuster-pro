// ══════════════════════════════════════════════════════════════════
// cedula.js — Cédula de Ajuste: exportación Excel y PDF
// Usa la cadena de cálculo de reservas ya definida en el proyecto:
//   Reserva Bruta − Ajuste = Subtotal Ajustado
//   Subtotal Ajustado − Bajo Seguro = Pérdida Ajustada
//   Pérdida Ajustada − Deducible − Coaseguro = Cantidad Indemnizable Neta
// ══════════════════════════════════════════════════════════════════

export function generarCedula(formato) {
  // formato: 'excel' | 'pdf'
  const s = (typeof window._appCurrentSin === 'function') ? window._appCurrentSin() : window.currentSin;
  if (!s) { window.toast('Abre un expediente primero.'); return; }
  const _d  = window._appData || window.data || {};
  const pol = (_d.pol  || []).find(p => p.id === s.id_poliza) || {};
  const asdo= (_d.asdo || []).find(a => a.id === pol.id_asegurado) || {};

  // Reservas vigentes (más reciente por concepto)
  const vigMap = {};
  (_d.res || [])
    .filter(r => r.id_siniestro === s.id)
    .forEach(r => { if (!vigMap[r.concepto] || r.id > vigMap[r.concepto].id) vigMap[r.concepto] = r; });
  const reservas = Object.values(vigMap);

  const CONCEPTO_LABEL = {
    edificio:'Edificio / Estructura', contenidos:'Contenidos / Inventario',
    maquinaria:'Maquinaria y Equipo', perdida_utilidades:'Pérdida de Utilidades',
    rc:'Responsabilidad Civil', transporte:'Transporte de Mercancías',
    equipo_electronico:'Equipo Electrónico', rotura_maquinaria:'Rotura de Maquinaria',
    otro:'Cobertura Adicional'
  };

  const fD = d => { if (!d) return '—'; const [y, m, dy] = d.split('-'); return `${dy}/${m}/${y}`; };
  const fM = n => (n == null ? '—' : new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2 }).format(n));

  // Encabezado del expediente
  const header = {
    asegurado   : asdo.nombre        || s.asegurado_nombre || '—',
    siniestro   : s.numero_siniestro || s.referencia_aseg  || '—',
    refAASA     : s.referencia_aasa  || s.id               || '—',
    poliza      : pol.numero         || '—',
    fechaSin    : fD(s.fecha_siniestro),
    tipoDanios  : s.tipo_siniestro   || s.ramo             || '—',
    lugar       : s.lugar_siniestro  || s.municipio        || '—',
  };

  // Cálculo por cobertura
  const calc = reservas.map(r => {
    const bruta      = r.monto                   || 0;
    const ajuste     = r.depreciacion_pct         || 0;   // campo reutilizado para Ajuste manual
    const subtotalAj = bruta - ajuste;
    const bajo       = r.monto_bajo_seguro        || 0;
    const perdidaAj  = subtotalAj - bajo;
    const ded        = r.deducible                || 0;
    const coasPct    = r.coaseguro_pct            || 0;
    const subtotal2  = perdidaAj - ded;
    const coas       = r.monto_coaseguro || (subtotal2 * coasPct / 100);
    const neta       = subtotal2 - coas;
    return {
      concepto   : CONCEPTO_LABEL[r.concepto] || r.concepto || 'Cobertura',
      moneda     : r.moneda || 'MXN',
      bruta, ajuste, subtotalAj, bajo, perdidaAj, ded, coasPct, coas, neta,
      bases      : r.bases_determinacion || '',
    };
  });

  if (formato === 'excel') _exportExcel(header, calc, fM);
  else                     _exportPDF  (header, calc, fM, fD, s);
}

// ── Excel ────────────────────────────────────────────────────────────
function _exportExcel(hdr, calc, fM) {
  if (typeof XLSX === 'undefined') {
    window.toast('Cargando librería Excel…');
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = () => _exportExcel(hdr, calc, fM);
    document.head.appendChild(s);
    return;
  }

  const wb = XLSX.utils.book_new();
  const rows = [];

  // ── Título ──────────────────────────────────────────────────────────
  rows.push(['CÉDULA DE AJUSTE — ALMARAZ AJUSTADORES (AASA)']);
  rows.push([]);

  // ── Encabezado del expediente ────────────────────────────────────────
  rows.push(['Asegurado',           hdr.asegurado]);
  rows.push(['No. Siniestro',       hdr.siniestro]);
  rows.push(['Referencia AASA',     hdr.refAASA]);
  rows.push(['Póliza',              hdr.poliza]);
  rows.push(['Fecha del siniestro', hdr.fechaSin]);
  rows.push(['Tipo de daños',       hdr.tipoDanios]);
  rows.push(['Lugar del evento',    hdr.lugar]);
  rows.push([]);

  // ── Tabla: filas = conceptos, columnas = coberturas ──────────────────
  const showTotal = calc.length > 1;

  // Fila de encabezados de columna
  const hdrs = ['Concepto', ...calc.map(c => c.concepto)];
  if (showTotal) hdrs.push('TOTAL');
  rows.push(hdrs);

  // Moneda
  rows.push(['Moneda', ...calc.map(c => c.moneda), ...(showTotal ? [''] : [])]);

  // Función auxiliar para fila de concepto
  const fila = (label, key, totVal) => {
    const r = [label, ...calc.map(c => c[key])];
    if (showTotal) r.push(totVal);
    return r;
  };

  let totBruta=0, totAjuste=0, totSubAj=0, totBajo=0, totPerdAj=0,
      totDed=0, totCoas=0, totNeta=0;
  calc.forEach(c => {
    totBruta  += c.bruta;   totAjuste += c.ajuste;
    totSubAj  += c.subtotalAj; totBajo += c.bajo;
    totPerdAj += c.perdidaAj;  totDed  += c.ded;
    totCoas   += c.coas;    totNeta   += c.neta;
  });

  rows.push(fila('Reserva Bruta',          'bruta',       totBruta));
  rows.push(fila('Ajuste',                 'ajuste',      totAjuste));
  rows.push(fila('Subtotal Ajustado',      'subtotalAj',  totSubAj));
  rows.push(fila('Bajo Seguro',            'bajo',        totBajo));
  rows.push(fila('Pérdida Ajustada',       'perdidaAj',   totPerdAj));
  rows.push(fila('Deducible',              'ded',         totDed));

  // Coaseguro % — no suma
  rows.push(['Coaseguro %', ...calc.map(c => c.coasPct ? c.coasPct.toFixed(2)+'%' : 'N/A'),
             ...(showTotal ? [''] : [])]);

  rows.push(fila('Coaseguro Monto',        'coas',        totCoas));
  rows.push(fila('Cantidad Indemnizable Neta', 'neta',    totNeta));
  rows.push([]);

  // Bases de reserva por cobertura
  rows.push(['Bases de reserva', ...calc.map(c => c.bases), ...(showTotal ? [''] : [])]);

  // ── Hoja ─────────────────────────────────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Ancho de columnas: etiqueta ancha + una por cobertura + total
  const colWidths = [{ wch: 28 }, ...calc.map(() => ({ wch: 20 }))];
  if (showTotal) colWidths.push({ wch: 20 });
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Cédula');
  const fname = `Cedula_${hdr.refAASA}_${hdr.siniestro}.xlsx`.replace(/[\\/:*?"<>|]/g, '_');
  XLSX.writeFile(wb, fname);
}

// ── PDF (ventana de impresión) ────────────────────────────────────────
function _exportPDF(hdr, calc, fM, fD, s) {
  const td  = (t, extra='') => `<td style="border:1px solid #bbb;padding:4px 8px;font-size:10px;${extra}">${t}</td>`;
  const tdr = (t, extra='') => td(t, `text-align:right;${extra}`);
  const th  = (t, extra='') => `<th style="background:#1F3864;color:#fff;border:1px solid #1F3864;padding:5px 8px;font-size:10px;text-align:center;${extra}">${t}</th>`;

  let dataRows = '';
  let totBruta=0, totAjuste=0, totSubAj=0, totBajo=0, totPerdAj=0,
      totDed=0, totCoas=0, totNeta=0;

  calc.forEach(c => {
    totBruta+=c.bruta; totAjuste+=c.ajuste; totSubAj+=c.subtotalAj;
    totBajo+=c.bajo; totPerdAj+=c.perdidaAj; totDed+=c.ded;
    totCoas+=c.coas; totNeta+=c.neta;

    dataRows += `<tr>
      ${td(c.concepto)}${td(c.moneda,'text-align:center')}
      ${tdr(fM(c.bruta))}${tdr(fM(c.ajuste))}${tdr(fM(c.subtotalAj),'background:#f0f4ff')}
      ${tdr(c.bajo ? fM(c.bajo) : 'N/A','color:#b45309')}
      ${tdr(fM(c.perdidaAj),'background:#fff8e1')}
      ${tdr(fM(c.ded))}
      ${tdr(c.coasPct ? c.coasPct.toFixed(2)+'%' : 'N/A','text-align:center')}
      ${tdr(c.coas ? fM(c.coas) : 'N/A')}
      ${tdr(fM(c.neta),'font-weight:700;background:#e8f5e9;color:#1a6b2f')}
    </tr>
    ${c.bases ? `<tr><td colspan="11" style="font-size:9px;padding:3px 8px;color:#555;border:1px solid #ddd;background:#fafafa;">
      <b>Bases:</b> ${c.bases}</td></tr>` : ''}`;
  });

  const totalRow = calc.length > 1 ? `<tr style="background:#1F3864;color:#fff;">
    ${td('<b>TOTAL</b>','font-weight:700;color:#fff;background:#1F3864')}
    ${td('','background:#1F3864')}
    ${tdr('<b>'+fM(totBruta)+'</b>','background:#1F3864;color:#fff')}
    ${tdr('<b>'+fM(totAjuste)+'</b>','background:#1F3864;color:#fff')}
    ${tdr('<b>'+fM(totSubAj)+'</b>','background:#1F3864;color:#fff')}
    ${tdr(totBajo?'<b>'+fM(totBajo)+'</b>':'N/A','background:#1F3864;color:#fff')}
    ${tdr('<b>'+fM(totPerdAj)+'</b>','background:#1F3864;color:#fff')}
    ${tdr('<b>'+fM(totDed)+'</b>','background:#1F3864;color:#fff')}
    ${td('','background:#1F3864')}
    ${tdr(totCoas?'<b>'+fM(totCoas)+'</b>':'N/A','background:#1F3864;color:#fff')}
    ${tdr('<b>'+fM(totNeta)+'</b>','background:#1F3864;color:#fff;font-size:11px')}
  </tr>` : '';

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Cédula de Ajuste</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #222; }
    @media print { body { margin: 10mm; } .no-print { display:none; } }
    h2 { color: #1F3864; margin:0 0 6px; }
    .sub { font-size:12px; color:#555; margin-bottom:16px; }
    .hdr-grid { display:grid; grid-template-columns:1fr 1fr; gap:2px 20px; margin-bottom:16px; font-size:11px; }
    .hdr-grid b { color:#1F3864; }
    table { border-collapse:collapse; width:100%; margin-top:8px; }
  </style></head><body>
  <h2>CÉDULA DE AJUSTE</h2>
  <div class="sub">Almaraz Ajustadores, S.A. de C.V. (AASA) &nbsp;|&nbsp; Generada: ${new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'})}</div>
  <div class="hdr-grid">
    <div><b>Asegurado:</b> ${hdr.asegurado}</div>
    <div><b>No. Siniestro:</b> ${hdr.siniestro}</div>
    <div><b>Referencia AASA:</b> ${hdr.refAASA}</div>
    <div><b>Póliza:</b> ${hdr.poliza}</div>
    <div><b>Fecha del siniestro:</b> ${hdr.fechaSin}</div>
    <div><b>Tipo de daños:</b> ${hdr.tipoDanios}</div>
    <div><b>Lugar del evento:</b> ${hdr.lugar}</div>
  </div>
  <button class="no-print" onclick="window.print()" style="background:#1F3864;color:#fff;border:none;padding:8px 20px;border-radius:4px;cursor:pointer;margin-bottom:12px;font-size:13px;">🖨 Imprimir / Guardar PDF</button>
  <table>
    <thead><tr>
      ${th('Cobertura','text-align:left')}${th('Mon.')}
      ${th('Reserva Bruta')}${th('Ajuste')}${th('Subtotal Ajustado','background:#2563a8')}
      ${th('Bajo Seguro')}${th('Pérdida Ajustada','background:#2563a8')}
      ${th('Deducible')}${th('Coas. %')}${th('Coas. Monto')}
      ${th('Cantidad Indemnizable Neta','background:#1a5c2a')}
    </tr></thead>
    <tbody>${dataRows}${totalRow}</tbody>
  </table>
  </body></html>`;

  const win = window.open('', '_blank', 'width=1100,height=700');
  win.document.write(html);
  win.document.close();
}

// Registro en window para onclick en HTML
export function generarCedulaPublic(formato) { return generarCedula(formato); }
