'use strict';
const { start, server, wacht, DIST } = require('./hulp');
(async () => {
  const { s, url } = await server(DIST);
  const h = await start({ w: +(process.argv[2] || 390), h: 844 }), { p, R } = h;
  await p.goto(url + 'index.html', { waitUntil: 'load' }); await wacht(1000);
  await h.tik('.wiekaart[aria-label="Ik ben Hidde"]'); await wacht(800);
  for (const n of ['vandaag', 'quests', 'huis', 'kast', 'meer']) {
    await h.tab(n); await R(() => document.querySelectorAll('.view:not([hidden]) details').forEach(d => { d.open = true; })); await wacht(300);
    const r = await R(() => { const v = document.querySelector('.view:not([hidden])'); const vr = v.getBoundingClientRect(); return { scrollW: v.scrollWidth, clientW: v.clientWidth, scrollLeft: v.scrollLeft,
      breed: [...v.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > vr.right + 1 && !e.closest('.chips, .huisvenster, .huis-compact'); }).slice(0, 8).map(e => (e.tagName + '.' + e.className + '#' + e.id).slice(0, 60) + ' ' + Math.round(e.getBoundingClientRect().right)) }; });
    console.log(n, JSON.stringify(r));
  }
  await h.browser.close(); s.close();
})();
