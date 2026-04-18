// stub — modal functions delegadas al inline legacy
export const modalPublic = {};
export function cerrarModal(id){ return window.cerrarModal ? window.cerrarModal(id) : undefined; }
export function abrirModal(id){ return window.abrirModal ? window.abrirModal(id) : undefined; }
export function toast(msg){ return window.toast ? window.toast(msg) : undefined; }
