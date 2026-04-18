export const SUPA_URL = 'https://lxtieqaldwcntxaqklww.supabase.co';
export const SUPA_KEY = 'sb_publishable_nj0KDujN_1_nX33n3VceBA_f_NWCuos';

export const EST = {
  asignado:    {label:'Asignado',           cls:'b-asignado'},
  inspeccion:  {label:'En inspección',      cls:'b-inspeccion'},
  informe:     {label:'Elaborando informe', cls:'b-informe'},
  documentando:{label:'Documentando',       cls:'b-informe'},
  cobro:       {label:'Pte. de cobro',      cls:'b-cobro'},
  cerrado:     {label:'Cerrado',            cls:'b-cerrado'}
};

export const RAMOS = {
  incendio:'Incendio y líneas aliadas', robo:'Robo', rc:'Resp. civil',
  transporte:'Transporte', energia:'Energía', construccion:'Construcción',
  equipo_contratistas:'Equipo de Contratistas',
  interrupcion:'Interrupción de negocios', catastrofico:'Catastrófico'
};

export const MON_CLS = {MXN:'b-mxn', USD:'b-usd', EUR:'b-eur'};

export const HON_EST = {pactado:'b-pactado', parcial:'b-parcial', pagado:'b-pagado'};

export const TIPO_LABEL = {
  fecha:'Registro', fecha_pacto:'Honorario pactado', fecha_pago:'Honorario pagado',
  fecha_envio:'Informe enviado', asignacion:'Asignación', created_at:'Creación'
};

export const INF_TIPOS = {preliminar:'Preliminar',actualizacion:'Actualización',final:'Final',nota_tecnica:'Nota Técnica'};

export const CONCEPTO_LABEL = {
  "edificio":"Edificio / Estructura",
  "contenidos":"Contenidos / Inventario",
  "maquinaria":"Maquinaria y Equipo",
  "perdida_utilidades":"Pérdida de Utilidades",
  "rc":"Responsabilidad Civil",
  "transporte":"Transporte de Mercancías",
  "equipo_electronico":"Equipo Electrónico",
  "rotura_maquinaria":"Rotura de Maquinaria",
  "otro":"Cobertura Adicional"
};

export const GRAF_BUCKET = 'graficos-expediente';

export const GRAF_TIPOS = {
  localizacion:    { label:'Localización',        icon:'🗺',  color:'#4a9eff',
    hint:'Vista satelital o aérea del predio/zona — Google Maps, Google Earth. Incluir nombre de calle, colonia y orientación (Norte).' },
  foto_inspeccion: { label:'Foto Inspección',     icon:'🔍', color:'#f0a030',
    hint:'Fotos tomadas por el Ajustador durante inspección física. Indicar: área fotografiada y relevancia para el ajuste.' },
  foto_asegurado:  { label:'Foto Asegurado',      icon:'👤', color:'#5cc87a',
    hint:'Fotos proporcionadas por el Asegurado o su representante. Indicar: quién las proporcionó, fecha aproximada y qué muestran.' },
  foto_bien:       { label:'Foto Bien Asegurado', icon:'📦', color:'#e06070',
    hint:'Fotos de bienes afectados o de referencia. Indicar: nombre del bien, estado y propósito de la foto.' },
};

export const TODO_PRIO = {
  alta:  { label:'🔴 Alta',  cls:'b-critico',  color:'#ef9f9f' },
  media: { label:'🟡 Media', cls:'b-warning',  color:'#ffcc80' },
  baja:  { label:'🟢 Baja',  cls:'b-ok',       color:'#a5d6a7' },
};

export const REGLAS_INFORMES = {
  'GNP':     { ventana_ini:1,  ventana_fin:5,  demanda:true, label:'GNP'    },
  'INBURSA': { ventana_ini:1,  ventana_fin:5,  demanda:true, label:'Inbursa' },
  'ATLAS':   { ventana_ini:15, ventana_fin:20, demanda:true, label:'Atlas'   },
};

export const IA_MODEL = 'gpt-4o';

export const IA_VISION_PROMPT = `Eres un perito ajustador de seguros de daños con 44 años de experiencia en México. Analiza esta fotografía del siniestro y proporciona:
1. Descripción técnica breve (2-3 líneas) de lo que muestra la imagen: tipo de bien, estado visible, daños observables.
2. Relevancia para el ajuste: qué información aporta esta foto al expediente.
Sé conciso, técnico y objetivo. Sin adornos ni saludos. Solo el análisis.`;

export const SOL_CATALOGO_BASE = {
  'General': [
    { cat:'Documentación General', desc:'Carta reclamación dirigida a la aseguradora, detallada y valorizada' },
    { cat:'Documentación General', desc:'Copia de factura de compra del bien afectado' },
    { cat:'Documentación General', desc:'Póliza de seguro vigente y endosos aplicables' },
    { cat:'Documentación General', desc:'Identificación oficial del asegurado o representante legal' },
    { cat:'Documentación General', desc:'Poder notarial del representante legal (si aplica)' },
    { cat:'Documentación General', desc:'Acta constitutiva y RFC de la empresa asegurada' },
    { cat:'Legal',                 desc:'Denuncia ante el Ministerio Público o autoridad competente (si aplica)' },
    { cat:'Legal',                 desc:'Acta de hechos o declaración notarial de los hechos' },
    { cat:'Legal',                 desc:'Cualquier otro documento que apoye la reclamación' },
  ],
  'Rotura de Maquinaria': [
    { cat:'Técnica',     desc:'Ficha técnica del equipo afectado (marca, modelo, año, número de serie)' },
    { cat:'Técnica',     desc:'Manuales de operación y mantenimiento del equipo' },
    { cat:'Técnica',     desc:'Número de serie y año de fabricación del equipo' },
    { cat:'Técnica',     desc:'Fotografías anteriores al siniestro del equipo (si existen)' },
    { cat:'Técnica',     desc:'Layout o plano de ubicación del equipo dentro de la planta' },
    { cat:'Técnica',     desc:'Diagrama unifilar eléctrico del equipo' },
    { cat:'Técnica',     desc:'Bitácoras de mantenimiento de los 6 meses previos al evento' },
    { cat:'Técnica',     desc:'Bitácoras de operación de los días previos al evento' },
    { cat:'Técnica',     desc:'Bitácoras del CNC (si aplica)' },
    { cat:'Operacional', desc:'Orden de producción en proceso al momento del evento' },
    { cat:'Operacional', desc:'Operación que realizaba la máquina al momento del evento' },
    { cat:'Operacional', desc:'Nombre del operador, supervisor y personal presente' },
    { cat:'Operacional', desc:'Secuencia cronológica detallada de lo observado' },
    { cat:'Operacional', desc:'Videos del momento del evento o inmediatamente posterior' },
    { cat:'Diagnóstico',  desc:'Reporte técnico interno de mantenimiento post-siniestro' },
    { cat:'Diagnóstico',  desc:'Diagnóstico preliminar o final del fabricante o su representante' },
    { cat:'Diagnóstico',  desc:'Historial de fallas previas del equipo' },
    { cat:'Diagnóstico',  desc:'Evidencia de disparo de protecciones eléctricas' },
    { cat:'Diagnóstico',  desc:'Reportes de reparaciones previas al siniestro' },
    { cat:'Diagnóstico',  desc:'Cambios recientes de componentes eléctricos o electrónicos' },
    { cat:'Diagnóstico',  desc:'Evidencia de calibraciones recientes' },
    { cat:'Diagnóstico',  desc:'Registro de capacitación del operador' },
    { cat:'Diagnóstico',  desc:'Procedimientos de arranque, paro y seguridad del equipo' },
    { cat:'Diagnóstico',  desc:'Últimas inspecciones internas de seguridad industrial' },
    { cat:'Valuación',    desc:'Presupuesto de reparación desglosado y detallado' },
    { cat:'Valuación',    desc:'Cotización de refacciones necesarias' },
    { cat:'Valuación',    desc:'Cotización de reposición del equipo (si procede)' },
    { cat:'Valuación',    desc:'Comparativo técnico-económico entre reparar y reemplazar' },
    { cat:'Valuación',    desc:'Tiempos estimados de reparación o entrega del equipo nuevo' },
    { cat:'Valuación',    desc:'Relación de maquinaria total de la planta (inventario)' },
    { cat:'Facturación',  desc:'Factura de compra, pedimento de importación o contrato de leasing' },
  ],
  'Incendio': [
    { cat:'Técnica',     desc:'Dictamen del Cuerpo de Bomberos o autoridad que atendió el siniestro' },
    { cat:'Técnica',     desc:'Plano o croquis del área siniestrada con dimensiones' },
    { cat:'Técnica',     desc:'Relación detallada de bienes afectados con valores' },
    { cat:'Técnica',     desc:'Inventario de mercancías o existencias al momento del siniestro' },
    { cat:'Técnica',     desc:'Planos de instalaciones eléctricas y de gas (si aplica)' },
    { cat:'Operacional', desc:'Descripción de las actividades realizadas al momento del siniestro' },
    { cat:'Operacional', desc:'Nombre y declaración de testigos presenciales' },
    { cat:'Operacional', desc:'Videos o fotografías del área afectada pre y post siniestro' },
    { cat:'Valuación',   desc:'Facturas de adquisición de bienes afectados' },
    { cat:'Valuación',   desc:'Presupuesto de reparación o reconstrucción del inmueble' },
    { cat:'Valuación',   desc:'Avalúo del inmueble afectado (si aplica cobertura de inmueble)' },
    { cat:'Valuación',   desc:'Cotizaciones de reposición de bienes muebles afectados' },
    { cat:'Legal',       desc:'Dictamen de causa del incendio por perito especializado' },
    { cat:'Legal',       desc:'Constancia de no adeudo de impuesto predial (si aplica inmueble)' },
  ],
  'Robo': [
    { cat:'Legal',       desc:'Denuncia formal ante el Ministerio Público con sello de recepción' },
    { cat:'Legal',       desc:'Copia de la averiguación previa o carpeta de investigación' },
    { cat:'Técnica',     desc:'Relación detallada de bienes robados con descripción y valores' },
    { cat:'Técnica',     desc:'Facturas de los bienes sustraídos' },
    { cat:'Técnica',     desc:'Fotografías del área de robo y evidencias de violencia (si aplica)' },
    { cat:'Técnica',     desc:'Videos de cámaras de seguridad del evento' },
    { cat:'Operacional', desc:'Descripción cronológica del descubrimiento del robo' },
    { cat:'Operacional', desc:'Declaración de empleados o testigos' },
    { cat:'Seguridad',   desc:'Bitácora de vigilancia y accesos del día del siniestro' },
    { cat:'Seguridad',   desc:'Contrato con empresa de seguridad (si aplica)' },
    { cat:'Seguridad',   desc:'Inventario previo al robo (últimas existencias verificadas)' },
  ],
  'Responsabilidad Civil': [
    { cat:'Legal',       desc:'Carta o documento de reclamación del tercero afectado' },
    { cat:'Legal',       desc:'Identificación del tercero reclamante' },
    { cat:'Legal',       desc:'Documentos que acrediten la titularidad del bien dañado' },
    { cat:'Técnica',     desc:'Descripción detallada del evento generador de la responsabilidad' },
    { cat:'Técnica',     desc:'Fotografías de los daños causados al tercero' },
    { cat:'Técnica',     desc:'Testimonios de testigos del evento' },
    { cat:'Valuación',   desc:'Presupuesto de reparación de daños causados al tercero' },
    { cat:'Valuación',   desc:'Dictamen médico (si hay lesiones a personas)' },
    { cat:'Valuación',   desc:'Historial médico y gastos de hospitalización (si aplica)' },
  ],
  'Transporte': [
    { cat:'Embarque',    desc:'Carta porte o Bill of Lading' },
    { cat:'Embarque',    desc:'Factura comercial de la mercancía transportada' },
    { cat:'Embarque',    desc:'Lista de empaque (Packing List)' },
    { cat:'Embarque',    desc:'Certificado de origen (si aplica)' },
    { cat:'Embarque',    desc:'Pedimento de importación o exportación (si aplica)' },
    { cat:'Técnica',     desc:'Carta de protesta o reserva al transportista' },
    { cat:'Técnica',     desc:'Reporte del transportista sobre el siniestro' },
    { cat:'Técnica',     desc:'Fotografías de la mercancía dañada en destino o en tránsito' },
    { cat:'Técnica',     desc:'Acta de inspección en destino' },
    { cat:'Valuación',   desc:'Cotización de reposición de la mercancía afectada' },
  ],
  'Construcción / Montaje': [
    { cat:'Contractual', desc:'Contrato de obra o de suministro e instalación' },
    { cat:'Contractual', desc:'Planos del proyecto aprobados' },
    { cat:'Contractual', desc:'Especificaciones técnicas de la obra o del equipo a montar' },
    { cat:'Técnica',     desc:'Bitácora de obra del período afectado' },
    { cat:'Técnica',     desc:'Memoria de cálculo estructural (si aplica)' },
    { cat:'Técnica',     desc:'Estudios de mecánica de suelos (si aplica)' },
    { cat:'Técnica',     desc:'Reporte del supervisor o director de obra' },
    { cat:'Valuación',   desc:'Estimación de avance de obra al momento del siniestro' },
    { cat:'Valuación',   desc:'Presupuesto de reparación o reconstrucción de lo dañado' },
    { cat:'Valuación',   desc:'Facturación de materiales y mano de obra afectados' },
  ],
};

export const IDB_NAME    = 'aasa_offline';
export const IDB_VERSION = 1;
export const IDB_STORES  = ['siniestros','reservas','pagos','honorarios','viaticos',
                            'polizas','aseguradoras','asegurados','contactos',
                            'actividades','documentos','tipos_cambio','bitacora_ajustador',
                            'informes','sublimites','coaseguradoras','ajustadores',
                            'oficinas','siniestro_ajustadores','todos','graficos_expediente',
                            'sync_queue','meta'];

export const LOGO_AASA_B64 = 'data:image/jpeg;base64,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';
