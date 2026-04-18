// stub — modal functions delegadas al inline legacy
export const modalPublic = {};
export function cerrarModal(id){ return window.cerrarModal ? window.cerrarModal(id) : undefined; }
export function abrirModal(id){ return window.abrirModal ? window.abrirModal(id) : undefined; }
export function toast(msg){ return window.toast ? window.toast(msg) : undefined; }
export function resetBuscadorSinModal(){ return window.resetBuscadorSinModal ? window.resetBuscadorSinModal() : undefined; }
export function seleccionarAseguradoSin(a,b){ return window.seleccionarAseguradoSin ? window.seleccionarAseguradoSin(a,b) : undefined; }
export function seleccionarPolizaSin(a,b){ return window.seleccionarPolizaSin ? window.seleccionarPolizaSin(a,b) : undefined; }
