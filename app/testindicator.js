// Testindicator: met ?test in het adres telt deze JS-fouten en toont ze rechtsboven, met de paginabreedte
// (horizontale scroll = breedte groter dan het venster). Zonder ?test doet dit bestand niets.
// Laad het als eerste script in <head>, zodat ook fouten in de datascripts worden geteld.
(function () {
  'use strict';
  if (!/[?&]test(=|&|$)/.test(location.search)) return;
  const T = window.PQ_TEST = { fouten: [], info: {} };
  window.addEventListener('error', e => {
    const waar = e.filename ? ` (${String(e.filename).split('/').pop()}:${e.lineno})` : '';
    T.fouten.push((e.message || 'onbekende fout') + waar);
  });
  window.addEventListener('unhandledrejection', e => {
    T.fouten.push('promise: ' + ((e.reason && e.reason.message) || e.reason));
  });
  function toon() {
    let el = document.getElementById('pq-test');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pq-test';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    const ok = T.fouten.length === 0;
    const breed = document.documentElement.scrollWidth, venster = window.innerWidth;
    el.style.cssText = 'position:fixed;top:4px;right:4px;z-index:9999;max-width:min(70vw,440px);' +
      'font:12px/1.3 Consolas,monospace;padding:4px 6px;border:2px solid #0b1238;color:#0b1238;' +
      'white-space:pre-wrap;pointer-events:none;background:' + (ok && breed <= venster ? '#d6ebd0' : '#f8c9bd');
    const info = Object.entries(T.info).map(([k, v]) => `${k}: ${v}`).join('\n');
    el.textContent = (ok ? 'JS OK, 0 fouten' : `JS-FOUTEN: ${T.fouten.length}\n` + T.fouten.slice(0, 5).join('\n')) +
      `\npaginabreedte ${breed} / venster ${venster}` + (info ? '\n' + info : '');
  }
  T.toon = toon;
  window.addEventListener('load', () => { toon(); setInterval(toon, 500); });
})();
