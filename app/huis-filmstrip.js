// Filmstrip van de procedurele loopcycli (huis-anim.js), om frames kritisch te bekijken: gezichten intact, geen kapotte
// pixels, voeten die logisch bewegen. Per figuur een rij op ZOOM x artpx en, voor de pets, een rij zoals in het huis
// (echte maat op 2x, met de zachte verkleining) maar vier keer vergroot. Openen: huis-filmstrip.html?test
(function () {
  'use strict';
  const A = window.PQ_HUISANIM, F = window.PQ_FIGUUR, MAN = window.PQ_MANIFEST, H = window.PQ_HUIS;
  const q = new URLSearchParams(location.search), ZOOM = +q.get('zoom') || 4;
  const alleen = q.get('alleen') ? q.get('alleen').split(',') : null;
  const uit = document.getElementById('uit');
  const asset = id => MAN.assets.find(a => a.id === id);
  const el = (tag, cls, tekst) => { const e = document.createElement(tag); if (cls) e.className = cls; if (tekst != null) e.textContent = tekst; return e; };
  // Zelfde rekenregel als huis.js (echte maat t.o.v. Hidde = 190 cm).
  function petFactor(a) {
    const e = H.echte_maten && H.echte_maten[a.id], ijk = asset(H.ijk.figuur);
    if (!e || !ijk) return 1;
    const cmPerArtpx = H.ijk.cm / (ijk.figuur.bron[1] / ijk.bronpx_per_artpixel);
    const nu = (e.maat === 'hoogte' ? a.figuur.bron[1] : a.figuur.bron[0]) / a.bronpx_per_artpixel;
    return (e.cm / cmPerArtpx) / nu;
  }
  // Uitsnede rond de figuur, in bronpixels.
  function uitsnede(a) {
    const [ax, ay] = a.anker.bron, [fw, fh] = a.figuur.bron, k = a.bronpx_per_artpixel;
    return [Math.max(0, ax - fw / 2 - 6 * k), Math.max(0, ay - fh - 6 * k), ax + fw / 2 + 6 * k, ay + 3 * k];
  }
  // Rij frames. s = schermpx per bronpixel; ws = schaal van het frame t.o.v. de bron; wereld = verschuiving per frame
  // (schermpx) in looprichting.
  function rij(titel, frames, a, s, ws, opties = {}) {
    if (!frames || !frames.length) return;
    uit.appendChild(el('h2', null, titel));
    const box = el('div', 'rij'), c = uitsnede(a), [ax, ay] = a.anker.bron;
    const wereld = opties.wereld || 0, extra = Math.abs(wereld) * frames.length;
    frames.forEach((fr, i) => {
      const cel = el('div', 'cel' + (opties.donker ? ' donker' : ''));
      const bw = (c[2] - c[0]) * s, bh = (c[3] - c[1]) * s;
      cel.style.width = Math.round(bw + extra) + 'px'; cel.style.height = Math.round(bh) + 'px';
      const schuif = wereld < 0 ? extra + wereld * i : wereld * i;
      let doel = fr;
      if (opties.huis) {   // zoals de browser het in het huis toont: zacht verkleind, dan 4x vergroot
        const [k, kx] = A.doek(fr.width / ws * opties.huis, fr.height / ws * opties.huis);
        kx.imageSmoothingEnabled = true; kx.imageSmoothingQuality = 'high';
        kx.drawImage(fr, 0, 0, k.width, k.height);
        doel = k;
      } else doel = kopie(fr);
      doel.style.width = Math.round(fr.width / ws * s) + 'px'; doel.style.height = Math.round(fr.height / ws * s) + 'px';
      doel.style.left = Math.round(-c[0] * s + schuif) + 'px'; doel.style.top = Math.round(-c[1] * s) + 'px';
      const grond = el('div', 'grond'); grond.style.top = Math.round((ay - c[1]) * s) + 'px';
      cel.append(doel, grond);
      if (opties.lijn != null) { const l = el('div', 'lijn'); l.style.left = Math.round((ax - c[0] + opties.lijn) * s + (wereld < 0 ? extra : 0)) + 'px'; cel.appendChild(l); }
      cel.appendChild(el('span', 'nr', String(i)));
      box.appendChild(cel);
    });
    uit.appendChild(box);
  }
  function kopie(c) { const [k, x] = A.doek(c.width, c.height); x.drawImage(c, 0, 0); return k; }

  function mensen() {
    for (const fid of ['hidde', 'tessie']) {
      if (alleen && !alleen.includes(fid)) continue;
      const a = asset(fid), k = a.bronpx_per_artpixel, s = ZOOM / k, c = el('canvas');
      F.tekenLook(c, fid, 'bron', F.lookVoor(fid));
      const fr = A.mens(fid, c), r = fr.kijk === 'links' ? -1 : 1, mt = A.meetMens(fid);
      rij(`${a.naam}: loopcyclus (${fr.N} frames, pas ${fr.pas} artpx; heup ${mt.heup}, draai ${mt.draai}, kruis ${mt.kruis}, enkel ${mt.enkel}, scheiding ${mt.c})`, fr.loop, a, s, 1);
      rij(`${a.naam}: wereld (lichaam 1 artpx per frame vooruit)`, fr.loop, a, s, 1, { wereld: r * ZOOM, lijn: r * fr.pas / 2 * k });
      rij(`${a.naam}: adem (rust)`, fr.adem, a, s, 1);
    }
  }
  function pets() {
    for (const id of Object.keys(window.PQ_BEWEGING.pets)) {
      if (alleen && !alleen.includes(id)) continue;
      const a = asset(id), k = a.bronpx_per_artpixel, f = petFactor(a);
      const kunst = A.pet(id, ZOOM / k), huisSc = 2 / k * f, huis = A.pet(id, huisSc);
      const naam = `${a.naam} (${kunst.soort}, echte maat x${f.toFixed(2)}, in huis ${(2 * f).toFixed(2)} schermpx per artpx)`;
      const donker = id === 'haaitje';
      for (const [set, lijst] of Object.entries(kunst)) {
        if (!lijst || typeof lijst !== 'object' || set === 'loop' && !lijst[1]) continue;
        const reeksen = set === 'loop' ? Object.entries(lijst) : [['', lijst]];
        for (const [dir, fr] of reeksen) {
          if (!Array.isArray(fr) || !(fr[0] instanceof HTMLCanvasElement)) continue;
          const r = +dir || 1;
          rij(`${naam}: ${set}${dir ? ' richting ' + dir : ''}`, fr, a, ZOOM / k, kunst.ws, { donker });
          if (set === 'loop') rij(`${a.naam}: wereld`, fr, a, ZOOM / k, kunst.ws, { wereld: r * ZOOM, lijn: r * kunst.pas / 2 * k, donker });
          const hfr = set === 'loop' ? huis.loop[dir] : huis[set];
          if (hfr) rij(`${a.naam}: ${set}${dir ? ' ' + dir : ''} zoals in het huis (x4)`, hfr, a, huisSc * 4, huis.ws, { huis: huisSc, donker });
        }
      }
    }
  }
  Promise.all([F.laadAlles(), A.laad()]).then(() => {
    mensen(); pets();
    if (window.PQ_TEST) window.PQ_TEST.info.frames = document.querySelectorAll('.cel').length;
  }).catch(e => { uit.textContent = 'Fout: ' + e; if (window.PQ_TEST) window.PQ_TEST.fouten.push(String(e)); });
})();
