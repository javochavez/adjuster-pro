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
  const _d = (typeof window._appData === 'function') ? window._appData()
           : (window._appData || window.data || {});
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
    asegurado   : asdo.nombre || s.referencia_ajustadora || s.asegurado_nombre || '—',
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
  const XLS = typeof XLSXStyle !== 'undefined' ? XLSXStyle
            : typeof XLSX      !== 'undefined' ? XLSX
            : null;
  if (!XLS) { window.toast('Librería Excel no disponible.'); return; }

  const wb = XLS.utils.book_new();

  // ── Helpers de estilo ──────────────────────────────────────────────
  const NAVY  = '1F3864';
  const BLUE  = '2563A8';
  const GREEN = '1A5C2F';
  const LGRAY = 'F2F5FB';
  const LYELL = 'FFF8E1';
  const LGREE = 'E8F5E9';
  const WHITE = 'FFFFFF';
  const NUM_FMT = '#,##0.00';
  const PCT_FMT = '0.00"%"';

  const border = {
    top:    { style: 'thin', color: { rgb: 'B0C4DE' } },
    bottom: { style: 'thin', color: { rgb: 'B0C4DE' } },
    left:   { style: 'thin', color: { rgb: 'B0C4DE' } },
    right:  { style: 'thin', color: { rgb: 'B0C4DE' } }
  };
  const borderStrong = {
    top:    { style: 'medium', color: { rgb: NAVY } },
    bottom: { style: 'medium', color: { rgb: NAVY } },
    left:   { style: 'medium', color: { rgb: NAVY } },
    right:  { style: 'medium', color: { rgb: NAVY } }
  };

  const cell = (v, opts = {}) => {
    const t = typeof v === 'number' ? 'n' : 's';
    const c = { v, t, s: {} };
    if (opts.bold)    c.s.font       = { bold: true, ...(opts.color ? { color: { rgb: opts.color } } : {}), sz: opts.sz || 11 };
    if (opts.color && !opts.bold) c.s.font = { color: { rgb: opts.color }, sz: opts.sz || 11 };
    if (opts.bg)      c.s.fill       = { fgColor: { rgb: opts.bg }, patternType: 'solid' };
    if (opts.border)  c.s.border     = opts.border === 'strong' ? borderStrong : border;
    if (opts.numFmt)  c.z            = opts.numFmt;
    if (opts.align)   c.s.alignment  = { horizontal: opts.align, vertical: 'center', wrapText: !!opts.wrap };
    else              c.s.alignment  = { vertical: 'center', wrapText: !!opts.wrap };
    return c;
  };

  const hdrCell = (v, bg = NAVY, color = WHITE, align = 'center') =>
    cell(v, { bold: true, bg, color, border: 'strong', align });

  const numCell = (v, bg, highlight) =>
    cell(v == null || v === 0 ? 0 : v, {
      numFmt: NUM_FMT, bg: bg || WHITE, border: 'thin',
      align: 'right', ...(highlight ? { bold: true, color: highlight } : {})
    });

  const labelCell = (v, bg) =>
    cell(v, { bold: false, bg: bg || LGRAY, border: 'thin', align: 'left' });

  const boldLabelCell = (v) =>
    cell(v, { bold: true, bg: NAVY, color: WHITE, border: 'strong', align: 'left' });

  // ── Construcción de la hoja ────────────────────────────────────────
  const ws = {};
  const ref = (r, c) => XLS.utils.encode_cell({ r, c });
  let row = 0;

  const showTotal = calc.length > 1;
  const totalCols = 1 + calc.length + (showTotal ? 1 : 0);  // label + coberturas + total

  // ── Fila 0: Logo placeholder + Título ─────────────────────────────
  // Logo va en A1:B3 (merge), título en C1
  ws[ref(row, 0)] = cell('', { bg: WHITE });
  ws[ref(row, 2)] = cell('CÉDULA DE AJUSTE', {
    bold: true, color: NAVY, sz: 16, align: 'center', bg: WHITE
  });
  ws[ref(row+1, 2)] = cell('ALMARAZ AJUSTADORES, S.A. DE C.V. (AASA)', {
    bold: false, color: '555555', sz: 11, align: 'center', bg: WHITE
  });
  ws[ref(row+2, 2)] = cell('Generada: ' + new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'}), {
    color: '888888', sz: 10, align: 'center', bg: WHITE
  });
  row += 4;

  // ── Encabezado del expediente ──────────────────────────────────────
  const expRows = [
    ['Asegurado',            hdr.asegurado],
    ['No. Siniestro',        hdr.siniestro],
    ['Referencia AASA',      hdr.refAASA],
    ['Póliza',               hdr.poliza],
    ['Fecha del siniestro',  hdr.fechaSin],
    ['Tipo de daños',        hdr.tipoDanios],
    ['Lugar del evento',     hdr.lugar],
  ];
  expRows.forEach(([lbl, val]) => {
    ws[ref(row, 0)] = cell(lbl, { bold: true, bg: LGRAY, border: 'thin', align: 'right', color: '333333' });
    ws[ref(row, 1)] = cell(String(val || '—'), { bg: WHITE, border: 'thin', align: 'left' });
    // Merge val a través de columnas restantes
    row++;
  });
  row++;  // fila vacía

  // ── Cabecera de tabla ──────────────────────────────────────────────
  ws[ref(row, 0)] = hdrCell('Concepto');
  calc.forEach((c, i) => { ws[ref(row, i + 1)] = hdrCell(c.concepto, NAVY); });
  if (showTotal) ws[ref(row, calc.length + 1)] = hdrCell('TOTAL', GREEN);
  row++;

  // Moneda
  ws[ref(row, 0)] = labelCell('Moneda');
  calc.forEach((c, i) => { ws[ref(row, i+1)] = cell(c.moneda||'MXN', { bg: LGRAY, border: 'thin', align: 'center' }); });
  if (showTotal) ws[ref(row, calc.length+1)] = cell('', { bg: LGRAY, border: 'thin' });
  row++;

  // Filas de importes
  let totBruta=0,totAjuste=0,totSubAj=0,totBajo=0,totPerdAj=0,totDed=0,totCoas=0,totNeta=0;
  calc.forEach(c=>{
    totBruta+=c.bruta; totAjuste+=c.ajuste; totSubAj+=c.subtotalAj;
    totBajo+=c.bajo; totPerdAj+=c.perdidaAj; totDed+=c.ded;
    totCoas+=c.coas; totNeta+=c.neta;
  });

  const dataRows = [
    { lbl: 'Reserva Bruta',              key: 'bruta',      tot: totBruta,   bg: null },
    { lbl: 'Ajuste',                     key: 'ajuste',     tot: totAjuste,  bg: null },
    { lbl: 'Subtotal Ajustado',          key: 'subtotalAj', tot: totSubAj,   bg: LGRAY, bold: true },
    { lbl: 'Bajo Seguro',                key: 'bajo',       tot: totBajo,    bg: LYELL },
    { lbl: 'Pérdida Ajustada',           key: 'perdidaAj',  tot: totPerdAj,  bg: LYELL, bold: true },
    { lbl: 'Deducible',                  key: 'ded',        tot: totDed,     bg: null },
  ];

  dataRows.forEach(({ lbl, key, tot, bg, bold }) => {
    ws[ref(row, 0)] = bold ? boldLabelCell(lbl) : labelCell(lbl);
    calc.forEach((c, i) => { ws[ref(row, i+1)] = numCell(c[key], bg); });
    if (showTotal) ws[ref(row, calc.length+1)] = numCell(tot, bg, bold ? NAVY : null);
    row++;
  });

  // Coaseguro %
  ws[ref(row, 0)] = labelCell('Coaseguro %');
  calc.forEach((c, i) => {
    ws[ref(row, i+1)] = cell(c.coasPct ? c.coasPct : 0, {
      numFmt: PCT_FMT, bg: WHITE, border: 'thin', align: 'right'
    });
  });
  if (showTotal) ws[ref(row, calc.length+1)] = cell('', { bg: WHITE, border: 'thin' });
  row++;

  // Coaseguro Monto
  ws[ref(row, 0)] = labelCell('Coaseguro Monto');
  calc.forEach((c, i) => { ws[ref(row, i+1)] = numCell(c.coas, null); });
  if (showTotal) ws[ref(row, calc.length+1)] = numCell(totCoas, null);
  row++;

  // Cantidad Indemnizable Neta — destacada
  ws[ref(row, 0)] = boldLabelCell('Cantidad Indemnizable Neta');
  calc.forEach((c, i) => { ws[ref(row, i+1)] = numCell(c.neta, LGREE, GREEN); });
  if (showTotal) ws[ref(row, calc.length+1)] = numCell(totNeta, LGREE, GREEN);
  row++;
  row++;

  // Bases de reserva
  ws[ref(row, 0)] = cell('Bases de reserva', { bold: true, bg: LGRAY, border: 'thin', align: 'left', color: NAVY });
  calc.forEach((c, i) => {
    ws[ref(row, i+1)] = cell(c.bases || '', { bg: WHITE, border: 'thin', align: 'left', wrap: true });
  });
  if (showTotal) ws[ref(row, calc.length+1)] = cell('', { bg: WHITE, border: 'thin' });
  row++;

  // ── Rango de la hoja ──────────────────────────────────────────────
  ws['!ref'] = XLS.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row, c: totalCols - 1 } });

  // ── Anchos de columna ─────────────────────────────────────────────
  ws['!cols'] = [{ wch: 28 }, { wch: 18 }, ...calc.map(() => ({ wch: 22 })), ...(showTotal ? [{ wch: 22 }] : [])];

  // ── Alturas de fila ───────────────────────────────────────────────
  ws['!rows'] = [{ hpt: 30 }, { hpt: 20 }, { hpt: 16 }];  // filas de título

  // ── Merges: título ocupa columnas 2..totalCols-1 ──────────────────
  ws['!merges'] = [
    { s: { r: 0, c: 2 }, e: { r: 0, c: totalCols - 1 } },
    { s: { r: 1, c: 2 }, e: { r: 1, c: totalCols - 1 } },
    { s: { r: 2, c: 2 }, e: { r: 2, c: totalCols - 1 } },
  ];
  // Merge valor del expediente a través de columnas restantes
  for (let i = 0; i < expRows.length; i++) {
    ws['!merges'].push({ s: { r: 4 + i, c: 1 }, e: { r: 4 + i, c: totalCols - 1 } });
  }

  // ── Logo: intentar insertar desde LOGO_AASA_B64 ──────────────────
  try {
    ws[ref(0, 0)] = {
      v: 'ALMARAZ AJUSTADORES\nS.A. DE C.V.\nAJUSTADORES DE SEGUROS',
      t: 's',
      s: {
        font:      { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
        fill:      { fgColor: { rgb: '1F3864' }, patternType: 'solid' },
        border:    {
          top:    { style: 'medium', color: { rgb: '1F3864' } },
          bottom: { style: 'medium', color: { rgb: '1F3864' } },
          left:   { style: 'medium', color: { rgb: '1F3864' } },
          right:  { style: 'medium', color: { rgb: '1F3864' } }
        },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
      }
    };
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 2, c: 1 } });
    ws['!rows'] = [{ hpt: 18 }, { hpt: 18 }, { hpt: 18 }];
  } catch(e) { /* silencioso */ }

  XLS.utils.book_append_sheet(wb, ws, 'Cédula');
  const fname = `Cedula_${hdr.refAASA}_${hdr.siniestro}.xlsx`.replace(/[\\/:*?"<>|]/g, '_');
  XLS.writeFile(wb, fname);
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
