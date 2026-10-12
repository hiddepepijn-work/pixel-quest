// QA-hulpmiddelen: Edge starten, telefoonviewport, http-server voor dist/, klok verzetten, foto's, checks.
'use strict';
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http');
const puppeteer = require(process.env.PQ_PUPPETEER || 'puppeteer-core');
const EDGE = process.env.PQ_EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const REPO = path.resolve(__dirname, '..', '..');
const DIST = process.env.PQ_DIST ? path.resolve(process.env.PQ_DIST) : path.join(REPO, 'dist');   // PQ_DIST: een andere build meten (bv. de baseline)
const FOTO = path.join(REPO, 'test-uitvoer', 'qa');
fs.mkdirSync(FOTO, { recursive: true });
const wacht = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, mis = 0; const missers = [];
function check(naam, waar, extra) {
  if (waar) { ok++; console.log('  ✓ ' + naam); }
  else { mis++; missers.push(naam); console.log('  ✗ ' + naam + (extra != null ? '  (' + JSON.stringify(extra).slice(0, 400) + ')' : '')); }
}
const telling = () => ({ ok, mis, missers });

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };
function server(root) {
  return new Promise(res => {
    const s = http.createServer((q, a) => {
      let p = decodeURIComponent(q.url.split('?')[0].split('#')[0]);
      if (p === '/') p = '/index.html';
      const f = path.join(root, p);
      if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { a.writeHead(404); return a.end('nee'); }
      a.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(a);
    });
    s.listen(0, '127.0.0.1', () => res({ s, url: `http://127.0.0.1:${s.address().port}/` }));
  });
}

// Klok: localStorage 'qa-klok' = offset in ms; wordt bij elke paginalaad toegepast (vóór de app-scripts).
const KLOK = `(() => {
  let off = 0; try { off = +(localStorage.getItem('qa-klok') || 0); } catch (e) {}
  if (!off) return;
  const Echt = Date;
  class Nep extends Echt { constructor(...a) { if (a.length) super(...a); else super(Echt.now() + off); } static now() { return Echt.now() + off; } }
  window.Date = Nep;
})();`;
// Fouten tellen: pageerror, console.error en onafgevangen promise-rejections.
const FOUTVANG = `window.__qaFouten = []; window.addEventListener('unhandledrejection', e => window.__qaFouten.push('rejection: ' + (e.reason && e.reason.message || e.reason)));`;

async function start(opties) {
  opties = opties || {};
  const profiel = fs.mkdtempSync(path.join(os.tmpdir(), 'pq-qa-'));
  const args = ['--allow-file-access-from-files'];
  if (opties.offline) args.push('--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1:9,MAP fonts.gstatic.com 127.0.0.1:9');
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', userDataDir: profiel, args });
  const p = await browser.newPage();
  await p.setViewport({ width: opties.w || 390, height: opties.h || 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const fouten = [];
  p.on('pageerror', e => fouten.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) fouten.push('console: ' + m.text()); });
  await p.evaluateOnNewDocument(KLOK);
  await p.evaluateOnNewDocument(FOUTVANG);
  const R = (f, ...a) => p.evaluate(f, ...a);
  const h = {
    browser, p, R, fouten,
    async foto(naam, vol) {
      await R(() => { const t = document.getElementById('pq-test'); if (t) t.style.visibility = 'hidden'; });
      await p.screenshot({ path: path.join(FOTO, naam + '.png'), fullPage: !!vol });
      await R(() => { const t = document.getElementById('pq-test'); if (t) t.style.visibility = ''; });
    },
    async tik(sel) { await p.waitForSelector(sel, { visible: true, timeout: 5000 }); await p.tap(sel); await wacht(250); },
    async tikTekst(sel, tekst) {
      const e = await p.evaluateHandle((s, t) => (() => { const a = [...document.querySelectorAll(s)].filter(e => e.offsetParent); return a.find(e => e.textContent.trim() === t) || a.filter(e => e.textContent.includes(t)).pop(); })(), sel, tekst);
      if (!e.asElement()) throw new Error(`niet gevonden: ${sel} "${tekst}"`);
      await e.asElement().evaluate(x => x.scrollIntoView({ block: 'center' }));
      await wacht(100);
      await e.asElement().tap(); await wacht(300);
    },
    // Huis-eerst: tab('huis') sluit het menu; elke andere naam opent het menu (menuknop) op dat tabblad.
    async tab(n) {
      const open = await R(() => window.PQApp && window.PQApp.menuOpen());
      if (n === 'huis') { if (open) { await h.tik('#menuSluit'); await wacht(450); } return; }
      if (!open) { await h.tik('#menuKnop'); await wacht(450); }
      await h.tik(`.menu-tabs [data-tab="${n}"]`); await wacht(500);
    },
    st: () => R(() => JSON.parse(JSON.stringify(window.PQStore.staat()))),
    week: () => R(() => { const R = window.PQRegels, S = window.PQStore; const wk = R.weken(S.staat(), Date.now()); return { nu: wk.nu, streak: wk.streak, record: wk.record, gehaald: wk.gehaald, pot: R.pot(S.staat(), Date.now()), lijst: wk.lijst }; }),
    async klok(dagen, laad) { await R(ms => localStorage.setItem('qa-klok', String(ms)), Math.round(dagen * 864e5)); if (laad !== false) { await p.reload({ waitUntil: 'load' }); await wacht(1200); } },
    sheetDicht: async () => { await R(() => window.PQUI.sluitAlles()); await wacht(350); },
    async jsFouten() { const w = await R(() => (window.__qaFouten || []).concat((window.PQ_TEST && window.PQ_TEST.fouten) || [])).catch(() => []); return fouten.concat(w); },
    async horizontaal() { return R(() => [...document.querySelectorAll('.view:not([hidden]), .sheet-binnen, .hud')].some(v => v.scrollWidth > v.clientWidth + 1)); },
  };
  return h;
}
module.exports = { start, server, check, telling, wacht, DIST, REPO, FOTO };
