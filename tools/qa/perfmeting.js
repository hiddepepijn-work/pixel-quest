// Meting van het huis bij knijpen en uitgezoomd stilstaan (docs/perf.md). Telefoon 390×844, DPR 3, touch, CPU 6×.
//   node tools/qa/perfmeting.js [--json uit.json]
// Meet per fase: frames (rAF), scripttijd per frame (eigen rAF-callbacks + gebeurtenissen), long tasks > 50 ms,
// CDP-taaktijd, en hoe vaak de verte, het decor, de lichtlaag, de deeltjes en de hele scène opnieuw tekenen.
// Ook de canvassen in het huis (pixels incl. DPR). Wordt ook gebruikt door perf.js (drempels).
'use strict';
const { start, server, wacht, DIST } = require('./hulp');

const MEET = `(() => {
  const q = window.__pm = { cb: [], lang: [], ev: [], draw: {}, frames: 0 };
  const echtRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = f => echtRaf(t => { q.frames++; const a = performance.now(); try { f(t); } finally { q.cb.push([t, performance.now() - a]); } });
  for (const soort of ['pointermove', 'pointerdown', 'pointerup', 'wheel']) {
    window.addEventListener(soort, () => { const a = performance.now(); queueMicrotask(() => {}); setTimeout(() => {}, 0); q.ev.push(a); }, true);
  }
  try { new PerformanceObserver(l => l.getEntries().forEach(e => q.lang.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true }); } catch (e) {}
})();`;
// Na het laden: de tekenfuncties tellen.
const TEL = () => {
  const q = window.__pm;
  const wrap = (obj, naam, sl) => { if (!obj || !obj[naam] || obj[naam].__pm) return; const f = obj[naam]; obj[naam] = function () { q.draw[sl] = (q.draw[sl] || 0) + 1; return f.apply(this, arguments); }; obj[naam].__pm = 1; };
  wrap(window.PQ_HUISVERTE, 'teken', 'verte'); wrap(window.PQ_HUISTEKEN, 'tekenDecor', 'decor'); wrap(window.PQ_HUISTEKEN, 'tekenLicht', 'licht');
  wrap(window.PQ_OMGEVINGHUIS, 'deeltjes', 'deeltjes'); wrap(window.PQ_HUISGEDRAG, 'begin', 'scene');
};

async function meet(opties) {
  opties = opties || {};
  const { s, url } = await server(DIST);
  const h = await start({ w: 390, h: 844 }), { p, R } = h;
  await p.evaluateOnNewDocument(MEET);
  await p.goto(url + 'index.html?geenweer' + (opties.weer ? '&weer=' + opties.weer : ''), { waitUntil: 'load' }); await wacht(1000);
  await h.tik('.wiekaart[aria-label="Ik ben Hidde"]'); await wacht(1500);
  await R(() => { const m = document.getElementById('melding'); if (m) m.hidden = true; });
  await R(TEL);
  const cdp = await p.target().createCDPSession();
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: opties.cpu || 6 });
  const metriek = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  async function fase(naam, doe) {
    await R(() => { const q = window.__pm; q.cb = []; q.lang = []; q.ev = []; q.draw = {}; q.frames = 0; q.t0 = performance.now(); });
    const m0 = await metriek(), t0 = Date.now();
    await doe();
    const m1 = await metriek(), ms = Date.now() - t0;
    const r = await R(() => {
      const q = window.__pm, perFrame = new Map();
      for (const [t, d] of q.cb) perFrame.set(t, (perFrame.get(t) || 0) + d);
      const w = [...perFrame.values()].sort((a, b) => a - b), n = w.length || 1;
      const p = f => Math.round((w[Math.floor((w.length - 1) * f)] || 0) * 10) / 10;
      const canv = [...document.querySelectorAll('#view-huis canvas')].map(c => ({ c, px: c.width * c.height, css: Math.round(c.getBoundingClientRect().width * c.getBoundingClientRect().height * devicePixelRatio ** 2) }));
      return { frames: q.frames, scriptPerFrameGem: Math.round(w.reduce((a, b) => a + b, 0) / n * 10) / 10, scriptPerFrameP95: p(0.95), scriptPerFrameMax: p(1),
        events: q.ev.length, lang: q.lang, tekenen: q.draw, canvassen: canv.length,
        canvasPx: canv.reduce((a, b) => a + b.px, 0), grootsteCanvas: Math.max(0, ...canv.map(c => c.px)), zoom: window.PQHuis.actief().zoom.stand().eff };
    });
    r.ms = ms; r.taakMs = Math.round((m1.TaskDuration - m0.TaskDuration) * 1000); r.scriptMs = Math.round((m1.ScriptDuration - m0.ScriptDuration) * 1000);
    r.layoutMs = Math.round((m1.LayoutDuration - m0.LayoutDuration) * 1000); r.stijlMs = Math.round((m1.RecalcStyleDuration - m0.RecalcStyleDuration) * 1000);
    r.drukte = Math.round(r.taakMs / ms * 100) + '%';
    console.log(`  ${naam}: ${JSON.stringify(r)}`);
    return r;
  }
  const knijp = async (van, naar, ms) => {
    const cx = 195, cy = 420, stappen = Math.max(4, Math.round(ms / 8));
    const pts = d => [{ x: cx - d / 2, y: cy, id: 0 }, { x: cx + d / 2, y: cy, id: 1 }];
    await touch('touchStart', pts(van));
    for (let i = 1; i <= stappen; i++) { await touch('touchMove', pts(van + (naar - van) * i / stappen)); }
    await touch('touchEnd', []);
  };
  const res = {};
  res.start = await R(() => window.PQHuis.actief().zoom.stand().eff);
  // snel en hard: in ~150 ms van 2× naar het minimum (vingers van 300 naar 30 px)
  // Het gebaar zelf en het loslaten (vastklikken + één keer hertekenen) apart gemeten.
  res.snel = await fase('snelle pinch-out (150 ms), gebaar', async () => { await knijp(300, 30, 150); });
  res.snelLos = await fase('snelle pinch-out, loslaten + 1 s', async () => { await wacht(1000); });
  res.naSnel = await R(() => window.PQHuis.actief().zoom.stand());
  await R(() => window.PQHuis.actief().zoom.naar(330, 150, 2)); await wacht(600);
  res.langzaam = await fase('langzame pinch-out (1,5 s), gebaar', async () => { await knijp(300, 40, 1500); });
  await wacht(1000);
  // nog een keer hard uitknijpen terwijl het vastklikken nog loopt
  res.dubbel = await fase('pinch tijdens het vastklikken', async () => { await knijp(300, 30, 120); await wacht(60); await knijp(60, 20, 120); await wacht(1200); });
  res.naDubbel = await R(() => { const z = window.PQHuis.actief().zoom; return { st: z.stand(), grens: z.grens() }; });
  res.stil = await fase('10 s stil, maximaal uitgezoomd', async () => { await wacht(10000); });
  res.inzoom = await fase('snelle pinch-in (150 ms), gebaar', async () => { await knijp(40, 300, 150); });
  res.inzoomLos = await fase('snelle pinch-in, loslaten + 1 s', async () => { await wacht(1000); });
  res.naInzoom = await R(() => window.PQHuis.actief().zoom.stand());
  res.fouten = await h.jsFouten();
  await h.browser.close(); s.close();
  return res;
}
module.exports = { meet };
if (require.main === module) {
  meet({ cpu: +(process.argv.find(a => /^--cpu=/.test(a)) || '--cpu=6').split('=')[1] }).then(r => {
    const i = process.argv.indexOf('--json');
    if (i > 0) require('fs').writeFileSync(process.argv[i + 1], JSON.stringify(r, null, 1));
    console.log('fouten:', r.fouten.length);
  }).catch(e => { console.error('CRASH', e); process.exit(1); });
}
