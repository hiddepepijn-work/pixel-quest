// QA performance: frametijd met CPU-throttling 4×, lange taken, offline fonts, en (deel 3) knijpen en uitgezoomd
// stilstaan op een telefoon met CPU 6× (perfmeting.js) met drempels, zodat het haperen niet ongemerkt terugkomt.
// Getallen en achtergrond: docs/perf.md.
'use strict';
const { start, server, check, telling, wacht, DIST } = require('./hulp');

const TELLER = `(() => {
  const echt = window.requestAnimationFrame.bind(window);
  window.__qa = { raf: 0, frames: [], timers: 0, lang: [] };
  window.requestAnimationFrame = cb => echt(t => { window.__qa.raf++; cb(t); });
  const st = window.setTimeout.bind(window);
  window.setTimeout = (f, ms, ...a) => { window.__qa.timers++; return st(f, ms, ...a); };
  try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__qa.lang.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true }); } catch (e) {}
})();`;

(async () => {
  const { s, url } = await server(DIST);
  const h = await start(), { p, R } = h;
  await p.evaluateOnNewDocument(TELLER);
  await p.goto(url + 'index.html?test', { waitUntil: 'load' }); await wacht(1000);
  await h.tik('.wiekaart[aria-label="Ik ben Hidde"]'); await wacht(1500);
  const cdp = await p.target().createCDPSession();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  async function meet(naam, ms = 4000) {
    await R(() => { window.__qa.raf = 0; window.__qa.timers = 0; window.__qa.lang = []; window.__qa.d = []; let v = performance.now(); const l = t => { window.__qa.d.push(t - v); v = t; if (window.__qa.meet) requestAnimationFrame(l); }; window.__qa.meet = true; requestAnimationFrame(l); });
    await wacht(ms);
    const r = await R(() => { window.__qa.meet = false; const d = window.__qa.d.slice(2).sort((a, b) => a - b); const q = f => Math.round(d[Math.floor(d.length * f)] || 0); return { fps: Math.round(d.length / (d.reduce((a, b) => a + b, 0) / 1000)), p50: q(0.5), p95: q(0.95), max: Math.round(d[d.length - 1] || 0), raf: window.__qa.raf - d.length - 2, timers: window.__qa.timers, lang: window.__qa.lang }; });
    console.log(`    ${naam}: ${JSON.stringify(r)}`);
    return r;
  }
  console.log('1. Frametijd met CPU 4× trager');
  await h.tab('vandaag'); await wacht(800);
  const v = await meet('Menu open op Vandaag (huis loopt erboven)');
  check('Menu open: p95 frametijd < 50 ms bij 4× throttling', v.p95 < 50, v);
  await h.tab('huis'); await wacht(1500);
  const hu = await meet('Huis volledig');
  check('Huis: p95 frametijd < 50 ms bij 4× throttling', hu.p95 < 50, hu);
  // pinch-achtig: zoomknoppen met hertekenen
  await R(() => { window.__qa.lang = []; document.querySelector('.zoomknoppen [aria-label="Inzoomen"]').click(); });
  await wacht(1500);
  const lang = await R(() => window.__qa.lang);
  console.log('    lange taken bij inzoomen (hertekenen):', JSON.stringify(lang));
  // Huis-eerst: het huis staat altijd in beeld (ook boven het menu) en loopt dus door. Op de achtergrond stopt het:
  // de browser draait dan geen animatieframes en het gedrag/de weerdeeltjes slaan document.hidden over.
  await h.tab('quests'); await wacht(1500);
  const q = await meet('Menu open op Quests', 3000);
  check('menu open: weinig timers (< 10 in 3 s)', q.timers < 10, q);
  check('menu open: p95 frametijd < 50 ms', q.p95 < 50, q);
  await h.tab('huis'); await wacht(500);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const f = await h.jsFouten();
  check('0 JS-fouten', f.length === 0, f);
  await h.browser.close();

  console.log('2. Offline: Google Fonts onbereikbaar');
  const o = await start({ offline: true });
  const t0 = Date.now();
  await o.p.goto(url + 'index.html?test', { waitUntil: 'load' }); const laad = Date.now() - t0; await wacht(800);
  await o.tik('.wiekaart[aria-label="Ik ben Tessie"]'); await wacht(1000);
  const fonts = await o.R(async () => { await document.fonts.ready; return { geladen: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family), menuknop: getComputedStyle(document.querySelector('.menuknop')).fontFamily }; });
  console.log(`    laadtijd ${laad} ms, fonts ${JSON.stringify(fonts)}`);
  await o.foto('o00-offline-huis'); await o.tab('vandaag'); await o.foto('o01-offline-vandaag');
  await o.tab('quests'); await o.foto('o02-offline-quests');
  await o.tab('meer'); await o.foto('o03-offline-meer');
  check('offline: lokale fonts geladen', fonts.geladen.includes('Pixelify Sans') && fonts.geladen.includes('Nunito'), fonts);
  check('offline: app laadt en werkt', await o.R(() => !!document.querySelector('#view-meer .meerkaart')));
  const fo = await o.jsFouten();
  check('offline: 0 JS-fouten', fo.length === 0, fo);
  await o.browser.close(); s.close();

  console.log('3. Knijpen en uitgezoomd stilstaan (390×844, DPR 3, CPU 6×)');
  const r = await require('./perfmeting').meet({ cpu: 6 });
  for (const [k, naam] of [['snel', 'snel knijpen'], ['langzaam', 'langzaam knijpen'], ['inzoom', 'snel inknijpen']]) {
    const g = r[k], t = g.tekenen || {};
    // De harde controles zijn de tellers (niets opnieuw getekend tijdens een gebaar); de tijden hebben ruimte voor een
    // drukke pc (de meting draait met CPU 6× bovenop wat de pc al doet). Vóór de fix: tientallen taken van 100–600 ms.
    check(`${naam}: hoogstens één long task, < 150 ms, tijdens het gebaar`, g.lang.every(x => x < 150) && g.lang.length <= 1, g.lang);
    check(`${naam}: script per frame p95 ≤ 10 ms, max ≤ 60 ms`, g.scriptPerFrameP95 <= 10 && g.scriptPerFrameMax <= 60, [g.scriptPerFrameP95, g.scriptPerFrameMax]);
    check(`${naam}: niets opnieuw getekend tijdens het gebaar`, !t.verte && !t.decor && !t.licht && !t.deeltjes && !t.scene, t);
  }
  for (const k of ['snelLos', 'inzoomLos']) {
    const g = r[k];
    check(`${k}: verte en decor niet opnieuw bij alleen een zoomstap`, !(g.tekenen || {}).verte && !(g.tekenen || {}).decor, g.tekenen);
    check(`${k}: hoogstens één long task (< 500 ms) bij het vastklikken`, g.lang.length <= 1 && g.lang.every(x => x < 500), g.lang);
  }
  check('snel uitknijpen: klikt vast op de grens', Math.abs(r.naSnel.eff - r.naDubbel.grens.min) < 1e-6, r.naSnel);
  check('knijpen tijdens het vastklikken: eindigt op de grens', Math.abs(r.naDubbel.st.eff - r.naDubbel.grens.min) < 1e-6, r.naDubbel);
  check('snel inknijpen: klikt vast op 4×', r.naInzoom.eff === 4, r.naInzoom);
  check('stil uitgezoomd: < 4 ms script per frame gemiddeld', r.stil.scriptPerFrameGem < 4, r.stil.scriptPerFrameGem);
  check('stil uitgezoomd: weinig stijlwerk (< 1500 ms in 10 s; vóór de fix 956–2738)', r.stil.stijlMs < 1500, r.stil.stijlMs);
  check('canvassen samen < 8 Mpx, grootste < 5 Mpx (iOS-geheugen)', r.stil.canvasPx < 8e6 && r.stil.grootsteCanvas < 5e6, [r.stil.canvasPx, r.stil.grootsteCanvas]);
  check('perfmeting: 0 JS-fouten', !r.fouten.length, r.fouten);
  console.log(JSON.stringify(telling()));
})().catch(e => { console.error('CRASH', e); process.exit(1); });
