// auth.js — delega al inline de index.html
// Este módulo solo expone funciones que el inline necesita importar.
// El flujo real de autenticación (doLogin, doLogout, mostrarApp, userMenuInit)
// vive en el inline de index.html y se ejecuta desde ahí.

export function noop(){}
