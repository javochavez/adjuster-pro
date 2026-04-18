// data.js — stub que delega al estado global del inline
export const data = {};
export function loadAll(){ return window.loadAll ? window.loadAll() : Promise.resolve(); }
export function renderAll(){ return window.renderAll ? window.renderAll() : undefined; }
export function poblarSelectores(){ return window.poblarSelectores ? window.poblarSelectores() : undefined; }
export default data;
