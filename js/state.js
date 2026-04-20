export let data = {
  sin:[], pol:[], aseg:[], asdo:[], cont:[], res:[], pag:[], hon:[], viat:[],
  act:[], doc:[], tc:[], bit:[], inf:[], sublim:[], coas:[], ajust:[], ofic:[],
  sinajust:[], graf:[]
};

export let currentSin          = null;
export let currentUserRole     = '';
export let currentUserReadonly = false;

export let logoDataUrl  = null; // initialized from LOGO_AASA_B64 at runtime
export let logoMimeType = 'image/jpeg';
export let logoW        = 184;
export let logoH        = 48;

export let grafFiltroActivo    = 'all';
export let grafQueue           = [];

export let tipoReporte         = 'formal';

export let mobCurrentSin       = null;
export let mobCurrentTab       = 'bitacora';

export let _iaCurrentSuffix    = null;
export let _iaCurrentText      = '';
export let _iaCurrentPrompt    = null;
export let _iaPendingApply     = false;

export let _idb                = null;
export let _isOnline           = navigator.onLine;
export let _syncRunning        = false;

export let solRamoActivo       = 'General';
export let solCatalogoExtendido = {};

export const state = {};

export function setIdb(val)             { _idb = val; }
export function setIsOnline(val)        { _isOnline = val; }
export function setSyncRunning(val)     { _syncRunning = val; }
export function setCurrentSin(val)      { currentSin = val; }
export function setIaCurrentText(val)   { _iaCurrentText = val; }
export function setIaCurrentSuffix(val) { _iaCurrentSuffix = val; }
export function setIaCurrentPrompt(val) { _iaCurrentPrompt = val; }
export function setIaPendingApply(val)  { _iaPendingApply = val; }
