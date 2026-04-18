// data.js — re-exporta desde app.js para compatibilidad con auth.js
export const data = window.__appData || {};
export default data;
export function loadAll(){ return window.loadAll ? window.loadAll() : Promise.resolve(); }
export function renderAll(){ return window.renderAll ? window.renderAll() : undefined; }
export function poblarSelectores(){ return window.poblarSelectores ? window.poblarSelectores() : undefined; }
