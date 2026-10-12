// Winkel-UI, deel 1: beeldjes (figuur met een look, uitsnede per slot, meubel-placeholder), prijslabels, kleurstalen
// en de paspop (passen op je eigen figuur, of als stel naast elkaar). Gebruikt door winkel-sheet.js en scherm-winkel.js.
(function (wortel) {
  'use strict';
  const R = wortel.PQRegels, S = wortel.PQStore, U = wortel.PQUI, P = wortel.PQWinkel, { el } = U;
  const F = () => wortel.PQ_FIGUUR, D = () => wortel.PQ_KLEDING;
  const SLOTNAAM = { hoofd: 'Hoofd', boven: 'Boven', jas: 'Jas', onder: 'Onder', heel_lichaam: 'Heel lichaam', schoenen: 'Schoenen', accessoire: 'Accessoire' };
  const UITSNEDE = { hoofd: [14, 58], boven: [44, 86], jas: [40, 90], onder: [64, 108], heel_lichaam: [40, 108], schoenen: [88, 110], accessoire: [30, 84] };

  // De look die iemand nu draagt (of de startkast).
  const lookVan = fid => Object.assign({}, S.staat().kleding.looks[fid] || F().standaardLook(fid));
  // De look met een paar items erbij: lijst van { item, kleur }.
  function metItems(fid, extra) {
    const look = lookVan(fid);
    for (const e of extra || []) { const it = P.item(e.item); if (it && F().draagbaar(it, fid)) look[it.slot] = { item: it.id, kleur: e.kleur }; }
    return look;
  }
  const vol = () => { const c = document.createElement('canvas'); return c; };
  // Hele figuur (48 × 92 native, zonder lege rand), pixelscherp geschaald.
  function figuur(fid, look, breed, label) {
    const v = vol(), c = el('canvas.figuurbeeld', { width: 48, height: 92, role: 'img', 'aria-label': label || U.naam(fid) });
    try { F().tekenLook(v, fid, 'native', look); const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(v, 8, 18, 48, 92, 0, 0, 48, 92); } catch (e) { /* nog niet geladen */ }
    c.style.width = (breed || 96) + 'px';
    return c;
  }
  // Uitsnede rond een slot, voor de tegels.
  function uitsnede(fid, it, kleur, hoogte) {
    const look = metItems(fid, [{ item: it.id, kleur }]), [y0, y1] = UITSNEDE[it.slot] || [20, 100], h = y1 - y0;
    const v = vol(), c = el('canvas.uitsnede', { width: 48, height: h, 'aria-hidden': 'true' });
    try { F().tekenLook(v, fid, 'native', look); const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(v, 8, y0, 48, h, 0, 0, 48, h); } catch (e) { /* */ }
    c.style.height = (hoogte || 72) + 'px';
    return c;
  }
  // Meubel of decor als placeholder-tekening (huis-teken.js), op een hele schaal in een vak van maxB × maxH.
  function meubelBeeld(soort, maxB, maxH, maxS) {
    const def = wortel.PQ_HUIS.meubels[soort], HT = wortel.PQ_HUISTEKEN;
    const c = el('canvas.meubelbeeld', { 'aria-hidden': 'true' });
    if (!def || !HT) return c;
    try {
      const t = HT.tekenMeubel(def, false), s = Math.max(1, Math.min(maxS || 4, Math.floor(Math.min(maxB / t.w, maxH / t.h))));
      c.width = t.w; c.height = t.h;
      const x = c.getContext('2d');
      x.drawImage(t.achter, 0, 0); if (t.voor) x.drawImage(t.voor, 0, 0);
      c.style.width = t.w * s + 'px'; c.style.height = t.h * s + 'px';
    } catch (e) { /* */ }
    return c;
  }

  // ---------- prijs en geld ----------
  const saldo = () => R.pot(S.staat(), Date.now()).saldo;
  const prijsLabel = (prijs, extra) => el('span.prijslabel' + (extra ? '.' + extra : ''), { 'aria-label': `${prijs} munten` }, U.munt(14), U.getal(prijs));
  // "Nog 12 sparen (~1 dag)": de dagen bij een volle week, voor jullie samen.
  function sparen(prijs) {
    const st = S.staat(), nu = Date.now(), tekort = prijs - R.pot(st, nu).saldo;
    if (tekort <= 0) return null;
    const d = P.dagen(tekort, st, nu, false);
    return `Nog ${U.getal(tekort)} sparen${d ? ` (~${d} ${d === 1 ? 'dag' : 'dagen'})` : ''}`;
  }

  // ---------- kleurstaal (zelfde stijl als de kast) ----------
  function staal(kleur, opties) {
    opties = opties || {};
    const r = D().rampen[kleur], b = el('button.sw' + (opties.slot ? '.slot' : '') + (P.isZeldzaam(kleur) ? '.zeldzaam' : ''), {
      type: 'button', 'aria-pressed': String(!!opties.aan), 'aria-label': opties.label || P.kleurNaam(kleur), title: opties.label || P.kleurNaam(kleur), onclick: opties.onclick });
    if (kleur === 'origineel' || !r) { b.classList.add('orig'); b.textContent = 'O'; } else b.append(...[...r.stops].reverse().map(c => el('i', { stijl: { background: c } })));
    if (opties.heb) b.append(el('span.sw-vink', { 'aria-hidden': 'true', tekst: '✓' }));
    return b;
  }

  // ---------- paspop: passen op je eigen figuur, of als stel naast elkaar ----------
  // extra(fid) geeft de items voor die persoon ([{ item, kleur }]); bestaat het niet voor het lichaam van de ander,
  // dan staat die in de eigen look met een korte uitleg.
  function paspop(fid, extra, opties) {
    opties = opties || {};
    let samen = !!opties.samen;
    const vak = el('div.paspop');
    const keuze = el('div.chips.paskeuze', { role: 'group', 'aria-label': 'Passen' });
    function teken() {
      const wie = samen ? [fid, fid === 'hidde' ? 'tessie' : 'hidde'] : [fid];
      vak.replaceChildren(...wie.map(f => {
        const e = extra(f), past = e.length && e.every(x => F().draagbaar(P.item(x.item), f));
        return el('figure.pasfiguur.' + f, null, figuur(f, metItems(f, past ? e : []), samen ? 84 : 112, `${U.naam(f)} in de nieuwe look`),
          el('figcaption', { tekst: past || !e.length ? U.naam(f) : `${U.naam(f)}: bestaat (nog) niet` }));
      }));
      keuze.replaceChildren(
        el('button.chip', { type: 'button', 'aria-pressed': String(!samen), onclick: () => { samen = false; teken(); } }, `${U.naam(fid)} past`),
        el('button.chip', { type: 'button', 'aria-pressed': String(samen), onclick: () => { samen = true; teken(); } }, 'Samen (stel-look)'));
    }
    teken();
    return { el: el('div.paspop-houder', null, vak, keuze), teken, samen: () => samen };
  }

  wortel.PQWinkelUI = { SLOTNAAM, lookVan, metItems, figuur, uitsnede, meubelBeeld, saldo, prijsLabel, sparen, staal, paspop };
})(window);
