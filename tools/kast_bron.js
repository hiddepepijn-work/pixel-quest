// Kast in de app: tekent elke testlook met F.tekenLook (app/figuur.js) in headless Edge en vergelijkt
// native pixel voor pixel met tools/kast.py samenstel(). Maakt ook contactvellen van de bronversie
// (zoals in het huis): assets/debug/kast_bron_<slot>.png.
//   python tools/kast.py && python tools/kast_contactvel.py      (schrijft test-uitvoer/kast_looks.json)
//   PQ_PUPPETEER=<pad>/node_modules/puppeteer-core node tools/kast_bron.js
'use strict';
const path = require('path'), fs = require('fs'), os = require('os');
const puppeteer = require(process.env.PQ_PUPPETEER || 'puppeteer-core');
const EDGE = process.env.PQ_EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const REPO = path.resolve(__dirname, '..');
const looks = JSON.parse(fs.readFileSync(path.join(REPO, 'test-uitvoer', 'kast_looks.json'), 'utf8'));

(async () => {
  const profiel = fs.mkdtempSync(path.join(os.tmpdir(), 'pq-kast-'));
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', userDataDir: profiel,
    args: ['--allow-file-access-from-files'] });
  const p = await browser.newPage();
  const fouten = [];
  p.on('pageerror', e => fouten.push(e.message));
  await p.goto('file:///' + path.join(REPO, 'app', 'kledingkast.html').replace(/\\/g, '/') + '?test',
    { waitUntil: 'load' });
  await p.waitForFunction(() => /Controle lagen/.test((document.getElementById('pariteitLook') || {}).textContent || ''),
    { timeout: 20000 });
  const controle = await p.$eval('#pariteitLook', e => e.textContent);
  const uit = await p.evaluate(async lijst => {
    const F = window.PQ_FIGUUR;
    await F.laadAlles();
    const laad = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
    const res = [];
    for (const l of lijst) {
      const c = document.createElement('canvas');
      F.tekenLook(c, l.fid, 'native', l.look);
      const js = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const img = await laad(l.verwacht);
      const v = document.createElement('canvas');
      v.width = img.width; v.height = img.height;
      v.getContext('2d').drawImage(img, 0, 0);
      const py = v.getContext('2d').getImageData(0, 0, v.width, v.height).data;
      let max = 0, n = 0;
      for (let i = 0; i < js.length; i += 4) {
        let d = 0;
        for (let k = 0; k < 4; k++) d = Math.max(d, Math.abs(js[i + k] - py[i + k]));
        if (d > 0) n++;
        max = Math.max(max, d);
      }
      const b = document.createElement('canvas');
      F.tekenLook(b, l.fid, 'bron', l.look);
      res.push({ naam: l.naam, fid: l.fid, max, n, bron: b.toDataURL(), bw: b.width, bh: b.height });
    }
    return res;
  }, looks);
  // contactvel bron per slot: tegels naast elkaar, schaal 1 (bron is al ~4,5 px per artpixel)
  const groepen = {};
  for (const r of uit) (groepen[r.naam.split('/')[0]] = groepen[r.naam.split('/')[0]] || []).push(r);
  for (const [slot, rs] of Object.entries(groepen)) {
    const html = await p.evaluate(async (rs) => {
      const W = 250, H = 440, per = 10, rijen = Math.ceil(rs.length / per);
      const c = document.createElement('canvas');
      c.width = Math.min(rs.length, per) * W; c.height = rijen * (H + 16);
      const x = c.getContext('2d');
      x.fillStyle = '#d6dccd'; x.fillRect(0, 0, c.width, c.height);
      x.imageSmoothingEnabled = false;
      for (let i = 0; i < rs.length; i++) {
        const img = await new Promise(ok => { const m = new Image(); m.onload = () => ok(m); m.src = rs[i].bron; });
        const s = Math.min(W / img.width, H / img.height);
        const cx = (i % per) * W, cy = Math.floor(i / per) * (H + 16);
        x.drawImage(img, cx, cy + 14, img.width * s, img.height * s);
        x.fillStyle = '#222'; x.font = '11px sans-serif';
        x.fillText(rs[i].naam.split('/')[1] + ' ' + rs[i].fid[0], cx + 4, cy + 11);
      }
      return c.toDataURL();
    }, rs);
    const pad = path.join(REPO, 'assets', 'debug', `kast_bron_${slot}.png`);
    fs.writeFileSync(pad, Buffer.from(html.split(',')[1], 'base64'));
  }
  const fout = uit.filter(r => r.max > 0);
  console.log(controle);
  console.log(`tekenLook = samenstel: ${uit.length - fout.length}/${uit.length} looks exact gelijk`);
  for (const r of fout) console.log(`  AFWIJKING ${r.naam} ${r.fid}: ${r.n} px, max ${r.max}`);
  console.log('JS-fouten:', fouten.length ? fouten : 0);
  await browser.close();
  try { fs.rmSync(profiel, { recursive: true, force: true }); } catch (e) { /* Edge houdt soms nog iets vast */ }
  process.exit(fout.length || fouten.length || !/hidde OK.*tessie OK/.test(controle) ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
