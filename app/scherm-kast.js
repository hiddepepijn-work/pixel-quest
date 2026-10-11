// Kast: de kledingkast als scherm (kledingkast.js draait op de markup in index.html). Looks van Hidde en Tessie,
// slots, items, kleuren, stel-outfits, eigen outfits en de pixel-editor. Kopen gaat uit de huispot, als voorstel
// dat de ander goedkeurt (PQKastKoop hieronder; kledingkast.js roept die aan).
(function (wortel) {
  'use strict';
  const R = wortel.PQRegels, S = wortel.PQStore, U = wortel.PQUI, V = wortel.PQVoorstel, { el } = U;
  let root, potEl, openEl;

  wortel.PQKastKoop = {
    open: (fid, item, kleur) => V.open('kleding', d => d.fid === fid && d.item === item && d.kleur === kleur),
    koop(fid, it, kleur) { V.nieuw('kleding', { fid, item: it.id, kleur }); },
  };
  function kopTeken() {
    if (!potEl) return;
    const st = S.staat(), pot = R.pot(st, Date.now());
    potEl.replaceChildren(U.munt(18), U.getal(pot.saldo));
    potEl.setAttribute('aria-label', `${pot.saldo} munten in de huispot`);
    const open = st.voorstellen.filter(v => v.status === 'open' && v.soort === 'kleding');
    openEl.replaceChildren(...open.map(v => V.kaart(v, kopTeken)));
    openEl.hidden = !open.length;
  }
  function maak(r) {
    root = r;
    potEl = el('span.potregel', { title: 'De gedeelde huispot' });
    openEl = el('div.voorstellen', { hidden: true, 'aria-label': 'Open voorstellen' });
    const kop = el('header.kopregel', null, el('div', null, el('h1', { tekst: 'Kast' }), el('p.sub', { tekst: 'Jullie looks. Kopen doen jullie samen.' })), potEl);
    root.prepend(kop, openEl);
    // Na een goedgekeurde aankoop: bezit opnieuw uit de store.
    document.addEventListener('pq-gekocht', e => { if (e.detail.soort === 'kleding' && wortel.PQ_KLEDINGKAST) wortel.PQ_KLEDINGKAST.herlaad(); kopTeken(); });
  }
  wortel.PQApp.scherm('kast', {
    maak,
    toon() { kopTeken(); if (wortel.PQ_KLEDINGKAST) wortel.PQ_KLEDINGKAST.alles(); },
    ververs(op) {
      kopTeken();
      if (op && /^voorstel|^reset|^sync/.test(op.soort) && wortel.PQ_KLEDINGKAST) wortel.PQ_KLEDINGKAST.herlaad();
    },
    verouderd(op) { if (op && /^(voorstel|reset|sync)/.test(op.soort) && wortel.PQ_KLEDINGKAST) wortel.PQ_KLEDINGKAST.herlaad(); },
  });
})(window);
