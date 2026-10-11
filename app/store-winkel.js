// Opdrachten, deel 2: huispot-aankopen met akkoord van allebei (verbouwing en kleding), het huis, de kast en de pets.
// Kopen is altijd een voorstel; de ander keurt goed. Pas dan gaan de munten uit de pot (puntensysteem §10, huis.md).
(function (wortel) {
  'use strict';
  const R = wortel.PQRegels, { VOER, fout, ander } = wortel.PQOpdrachten;
  const H = () => wortel.PQ_HUIS, HM = () => wortel.PQ_HUISMODEL, KAST = () => wortel.PQ_KAST;

  // Wat kost het en mag het (nog)? Geeft { prijs, naam } of gooit een fout in gewone taal.
  function controleer(st, soort, data, nu) {
    if (soort === 'verbouwing') {
      const n = +data.niveau, h = H() && H().niveaus.find(x => x.niveau === n);
      if (!h) fout('Deze verbouwing bestaat niet.');
      if (n !== st.huis.niveau + 1) fout(n <= st.huis.niveau ? 'Deze verbouwing hebben jullie al.' : 'Eerst de vorige verbouwing.');
      if (h.voorwaarde && h.voorwaarde.aantal) {
        const gehaald = R.weken(st, nu).gehaald;
        if (gehaald < h.voorwaarde.aantal) fout(`Pas te koop ${h.voorwaarde.tekst} (nu ${gehaald}).`);
      }
      return { prijs: h.prijs || 0, naam: `Verbouwing ${n}: ${h.naam}` };
    }
    if (soort === 'kleding') {
      const it = KAST() && KAST().items.find(i => i.id === data.item);
      if (!it) fout('Dit kledingstuk bestaat niet.');
      if (!it.lichaam.includes(data.fid)) fout(`${it.naam} bestaat (nog) niet voor ${data.fid === 'hidde' ? 'Hidde' : 'Tessie'}.`);
      if (it.status !== 'klaar') fout(`${it.naam} wacht nog op art.`);
      if (!it.kleuren.includes(data.kleur)) fout('Deze kleur bestaat niet voor dit item.');
      if (((st.kleding.bezit[data.fid] || {})[it.id] || []).includes(data.kleur)) fout('Dit heb je al.');
      return { prijs: it.prijs, naam: `${it.naam} (${data.kleur}) voor ${data.fid === 'hidde' ? 'Hidde' : 'Tessie'}` };
    }
    fout('Onbekend soort aankoop.');
  }
  function voer(st, v, tijd) {
    if (v.soort === 'verbouwing') {
      const hm = HM(), van = hm.bouw(hm.niveauVan(st.huis.niveau)), naar = hm.bouw(hm.niveauVan(v.data.niveau));
      const r = hm.verbouw(st.huis.inrichting, st.huis.doos, van, naar);
      st.huis = Object.assign({}, st.huis, { niveau: v.data.niveau, inrichting: r.inrichting, doos: r.doos, posities: {} });
    } else {
      const b = st.kleding.bezit[v.data.fid] = st.kleding.bezit[v.data.fid] || {};
      b[v.data.item] = [...new Set([...(b[v.data.item] || []), v.data.kleur])];
    }
    v.status = 'akkoord'; v.akkoord_op = tijd;
  }
  const voorstelVan = (st, id) => st.voorstellen.find(v => v.id === id) || fout('Dit voorstel bestaat niet meer.');

  Object.assign(VOER, {
    'voorstel.nieuw'(st, o) {
      const { soort, data } = o.data;
      if (st.voorstellen.some(v => v.status === 'open' && v.soort === soort && JSON.stringify(v.data) === JSON.stringify(data))) {
        fout('Dit voorstel staat al open.');
      }
      const c = controleer(st, soort, data, o.tijd);
      if (R.pot(st, o.tijd).saldo < c.prijs) fout(`Er zit nog te weinig in de huispot (nodig: ${c.prijs}).`);
      st.voorstellen.push({ id: o.id, soort, data, prijs: c.prijs, naam: c.naam, door: o.door, op: o.tijd, status: 'open' });
      return o.id;
    },
    'voorstel.akkoord'(st, o) {
      const v = voorstelVan(st, o.data.id);
      if (v.status !== 'open') return;
      if (v.door === o.door) fout(`${v.door === 'hidde' ? 'Tessie' : 'Hidde'} moet dit goedkeuren.`);
      controleer(st, v.soort, v.data, o.tijd);
      if (R.pot(st, o.tijd).saldo < v.prijs) fout('Er zit niet genoeg meer in de huispot.');
      voer(st, v, o.tijd);
      v.akkoord_door = o.door;
    },
    'voorstel.nee'(st, o) { const v = voorstelVan(st, o.data.id); if (v.status === 'open') { v.status = 'afgewezen'; v.nee_door = o.door; } },
    'voorstel.intrekken'(st, o) { const v = voorstelVan(st, o.data.id); if (v.status === 'open' && v.door === o.door) v.status = 'ingetrokken'; },
    // Inrichting na slepen, de verhuisdoos of "indeling herstellen": de hele huisstaat in één keer (laatste wint).
    'huis.inrichting'(st, o) {
      const d = o.data;
      if (!Array.isArray(d.inrichting) || !Array.isArray(d.doos)) fout('Ongeldige inrichting.');
      st.huis = Object.assign({}, st.huis, { inrichting: d.inrichting, doos: d.doos, posities: d.posities || {} });
    },
    'kleding.look'(st, o) {
      if (!['hidde', 'tessie'].includes(o.data.fid)) fout('Onbekend profiel.');
      st.kleding.looks[o.data.fid] = o.data.look || null;
    },
    'pet.actief'(st, o) {
      const c = R.collectie(st, o.tijd).find(x => x.id === o.data.id);
      if (!c) fout('Dit pet bestaat niet.');
      if (!c.uit) fout('Dit ei is nog niet uitgekomen.');
      st.pets.actief = c.id;
      if (st.pets.start[c.id] == null) st.pets.start[c.id] = c.id === 'draakje' ? 0 : R.samenInzet(st);
    },
    'pet.naam'(st, o) { st.pets.namen[o.data.id] = String(o.data.naam || '').trim().slice(0, 24) || null; },
  });
  wortel.PQOpdrachten.controleer = controleer;
  wortel.PQOpdrachten.ander = ander;
})(typeof window !== 'undefined' ? window : globalThis);
