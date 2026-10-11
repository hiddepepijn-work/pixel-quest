// Taken in de app: selectie (vandaag, filters), de taakrij, afronden met feestje en "ongedaan maken", de
// detail-sheet (claimen, loslaten, vragen, bedanken) en de sheet om een taak te maken of te bewerken.
(function (wortel) {
  'use strict';
  const R = wortel.PQRegels, S = wortel.PQStore, U = wortel.PQUI, { el } = U;
  const ander = () => S.ander(), ik = () => S.ik();
  const SJABLONEN = [   // puntensysteem §3
    ['Vaatwasser uitruimen', 10, 1, 'doen'], ['Koken', 40, 0, 'doen'], ['Boodschappen', 45, 1, 'doen'], ['Badkamer', 45, 2, 'doen'],
    ['Stofzuigen', 30, 1, 'doen'], ['Was draaien + ophangen', 25, 0, 'doen'], ['Was vouwen', 20, 1, 'doen'],
    ['Planten water geven', 5, 0, 'doen'], ['Afval buiten zetten', 5, 1, 'doen'], ['Weekmenu + boodschappenlijst', 30, 0, 'plannen'],
    ['Sociale agenda bijhouden', 20, 0, 'plannen'], ['Geld & administratie', 20, 0, 'plannen'], ['Voorraad bijhouden', 20, 0, 'bijhouden'],
  ];
  const ZWAARTE = ['licht', 'gewoon', 'zwaar'];

  // ---------- selectie ----------
  function verrijk(t, nu) {
    const k = R.klok(t, nu), wie = R.eigenaarNu(t, nu), inzet = t.prive ? 0 : R.inzetVan(t);
    const vandaag = R.dagSleutel(nu);
    const nodig = k ? k.waarde >= 0.7 : (!t.deadline || t.deadline <= R.dagSleutel(nu + 864e5)) || (t.tijdslot && t.tijdslot.slice(0, 10) <= vandaag);
    const urgentie = k ? k.waarde : t.deadline ? Math.max(0.2, 1.5 - (R.uitSleutel(t.deadline) - R.uitSleutel(vandaag)) / 864e5 / 7) : 0.75;
    return { t, k, wie, inzet, nodig, waarde: urgentie * (10 + inzet) };
  }
  function zichtbaar(nu) {
    const st = S.staat(), mij = ik();
    return Object.values(st.taken).filter(t => R.actief(t) && R.zichtbaarVoor(t, mij)).map(t => verrijk(t, nu)).sort((a, b) => b.waarde - a.waarde);
  }
  // Vandaag: jouw taken die nu nodig zijn, samen-taken, verzoeken aan jou en wat op het prikbord klaar ligt.
  function vandaag(nu) {
    const mij = ik(), alle = zichtbaar(nu);
    return {
      verzoek: alle.filter(x => x.t.verzoek_aan === mij),
      mijn: alle.filter(x => x.nodig && x.wie === mij && x.t.verzoek_aan !== mij),
      samen: alle.filter(x => x.nodig && x.wie === 'samen'),
      open: alle.filter(x => x.nodig && !x.wie && x.t.verzoek_aan !== mij),
    };
  }
  function filter(soort, nu) {
    const mij = ik(), alle = zichtbaar(nu);
    const f = { mijn: x => x.wie === mij, open: x => !x.wie, samen: x => x.wie === 'samen', alles: () => true }[soort] || (() => true);
    return alle.filter(f);
  }

  // ---------- taakrij ----------
  function wieLabel(x) {
    if (x.t.prive) return el('span.label.prive', { tekst: 'privé' });
    if (!x.wie) return el('span.label.prikbord', { tekst: 'prikbord' });
    return el('span.label.' + x.wie, { tekst: U.naam(x.wie) + (x.t.claim && x.t.claim.door === x.wie && x.t.eigenaar !== x.wie ? ' (pakt het)' : '') });
  }
  function standEl(x) {
    if (!x.k) {
      if (x.t.deadline) return el('span', { tekst: 'vóór ' + U.datumTekst(x.t.deadline) });
      if (x.t.tijdslot) return el('span', { tekst: U.datumTekst(x.t.tijdslot.slice(0, 10)) + ' ' + x.t.tijdslot.slice(11, 16) });
      return el('span', { tekst: 'eenmalig' });
    }
    const s = x.k.stand;
    return el('span.stand.' + s.id, { title: s.tekst }, el('img.plant', { src: U.ASSETS + 'items/bron/plant.png', alt: '' }), s.id);
  }
  function rij(x, opties) {
    opties = opties || {};
    const t = x.t;
    const gieter = el('button.gieter', { type: 'button', 'aria-label': `${t.titel} afvinken`, onclick: e => { U.tik(gieter); afronden(t.id, gieter, li); e.stopPropagation(); } },
      el('img', { src: U.ASSETS + 'items/bron/gieter.png', alt: '' }));
    const meta = el('span.meta', null, wieLabel(x), standEl(x), t.voorbeeld ? el('span.label.voorbeeld', { tekst: 'voorbeeld' }) : null,
      t.verzoek_aan ? el('span.label.goud', { tekst: t.verzoek_aan === ik() ? 'vraag aan jou' : 'gevraagd' }) : null);
    const open = el('button.open-knop', { type: 'button', onclick: () => wortel.PQTaken.detail(t.id), 'aria-label': `${t.titel}, details` },
      el('span.titel', { tekst: t.titel }), meta);
    const li = el('li.taak', { 'data-taak': t.id }, gieter, open,
      el('span.inzet', { 'aria-label': `inzet ${x.inzet}` }, String(x.inzet), el('small', { tekst: t.prive ? 'privé' : 'inzet' })));
    if (opties.pak && !x.wie) {
      li.append(el('div.actie', null, el('button.knop.mini', { type: 'button', onclick: () => claim(t.id) }, 'Ik pak het')));
    }
    if (x.t.verzoek_aan === ik()) {
      li.append(el('div.actie', null,
        el('button.knop.mini.goud', { type: 'button', onclick: () => doe('taak.verzoek.ja', { id: t.id }, `Je doet "${t.titel}".`) }, 'Ja, ik doe het'),
        el('button.knop.mini', { type: 'button', onclick: () => doe('taak.verzoek.nee', { id: t.id }, 'Teruggelegd op het prikbord. Nee zeggen kost niets.') }, 'Liever niet')));
    }
    return li;
  }
  function lijstEl(items, leegTekst, opties) {
    if (!items.length) return leegTekst ? el('div.leeg', null, leegTekst) : null;
    return el('ul.takenlijst', null, items.map(x => rij(x, opties)));
  }

  // ---------- acties ----------
  function doe(soort, data, gelukt, opties) {
    const r = S.doe(soort, data, opties);
    if (!r.ok) { U.fout(r.fout); return null; }
    if (gelukt) U.meld(gelukt);
    return r;
  }
  const claim = id => doe('taak.claim', { id }, 'Geclaimd: hij staat nu bij jou, tot morgenavond.');
  function afronden(id, bron, li) {
    const t = S.staat().taken[id];
    if (!t) return;
    const rect = bron && bron.isConnected ? bron.getBoundingClientRect() : null;
    const r = S.doe('taak.klaar', { id });
    if (!r.ok) return U.fout(r.fout);
    if (rect && rect.width) U.feestje(rect.left + rect.width / 2, rect.top + rect.height / 2);
    else U.feestje(innerWidth / 2, innerHeight / 2);
    if (li) li.classList.add('klaar-net');
    const a = S.staat().afrondingen.find(x => x.id === r.id);
    document.dispatchEvent(new CustomEvent('pq-afgerond', { detail: { taak: t, afronding: a } }));
    U.meld(t.prive ? `${t.titel}: gedaan.` : `${t.titel}: gedaan. Samen +${a.inzet} inzet.`, {
      ongedaan: () => { const o = S.doe('taak.ongedaan', { afronding: r.id }); if (!o.ok) U.fout(o.fout); else U.meld('Teruggezet. Er is niets verloren.'); },
    });
  }
  wortel.PQTaken = { SJABLONEN, ZWAARTE, verrijk, zichtbaar, vandaag, filter, rij, lijstEl, doe, claim, afronden, wieLabel, standEl };
})(window);
