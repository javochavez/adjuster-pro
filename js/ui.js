export function g(id) {
  return document.getElementById(id);
}

export function v(id) {
  return (g(id) || {}).value || '';
}

export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

export function fmt(n, mon) {
  if (!n && n !== 0) return '—';
  return Number(n).toLocaleString('es-MX', {
    style: 'currency', currency: mon || 'MXN',
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}

export function fmtD(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export function fmtMXN(n) {
  return Number(n || 0).toLocaleString('es-MX', {
    style: 'currency', currency: 'MXN',
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}

export function toMXN(m, mon, tc) {
  if (mon === 'MXN') return m;
  if (mon === 'USD') return m * tcUSD();
  if (mon === 'EUR') return m * tcEUR();
  return m * (tc || 1);
}

export function tcUSD() {
  return parseFloat(document.getElementById('tc-usd').value) || 17.5;
}

export function tcEUR() {
  return parseFloat(document.getElementById('tc-eur').value) || 19.2;
}
