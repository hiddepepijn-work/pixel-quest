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
    const P = wortel.PQWinkel, voorNaam = fid => (fid === 'hidde' ? 'Hidde' : fid === 'tessie' ? 'Tessie' : fout('Kies voor wie het is.'));
    if (soort === 'kleding') {
      const it = KAST() && KAST().items.find(i => i.id === data.item);
      if (!it) fout('Dit kledingstuk bestaat niet.');
      if (!it.lichaam.includes(data.fid)) fout(`${it.naam} bestaat (nog) niet voor ${voorNaam(data.fid)}.`);
      if (it.status !== 'klaar') fout(`${it.naam} wacht nog op art.`);
      if (P && P.isZeldzaam(data.kleur)) fout('Zeldzame kleuren zijn niet te koop; ze komen als drop bij een mijlpaal.');
      if (!it.kleuren.includes(data.kleur)) fout('Deze kleur bestaat niet voor dit item.');
      if (((st.kleding.bezit[data.fid] || {})[it.id] || []).includes(data.kleur)) fout('Dit heb je al.');
      if (P && !P.kleurTeKoop(it, data.kleur, R.weekVan(nu))) fout(`${it.naam} in ${data.kleur} is deze week niet te koop. De kleur komt terug in de winkel.`);
      return { prijs: P ? P.kledingPrijs(st, data.fid, it, data.kleur) : it.prijs, naam: `${it.naam} (${data.kleur}) voor ${voorNaam(data.fid)}` };
    }
    if (soort === 'set') {
      const s = P && P.sets().find(x => x.id === data.set);
      if (!s) fout('Deze set bestaat niet.');
      const i = P.setInfo(st, data.fid, s);
      if (i.start) fout('Deze set zit al in de startkast.');
      if (!i.compleet) fout(i.wacht ? `De set ${s.naam} is nog niet helemaal getekend.` : `De set ${s.naam} bestaat niet voor ${voorNaam(data.fid)}.`);
      if (!i.mist.length) fout('Deze set heb je al.');
      return { prijs: i.prijs, naam: `Set ${s.naam} voor ${voorNaam(data.fid)}${i.inBezit ? ` (${i.mist.length} van ${i.getekend.length})` : ''}` };
    }
    if (soort === 'meubel') {
      const m = P && P.meubel(data.soort);
      if (!m) fout('Dit meubel is niet te koop.');
      const vraagt = P.meubelVraagt(m.soort, st.huis.niveau);
      if (vraagt) fout(vraagt.niveau ? `${m.naam} vraagt een ${vraagt.kamer} (verbouwing ${vraagt.niveau}).` : `${m.naam} past nog nergens in jullie huis.`);
      return { prijs: m.prijs, naam: m.naam };
    }
    fout('Onbekend soort aankoop.');
  }
  function voer(st, v, tijd) {
    if (v.soort === 'verbouwing') {
      const hm = HM(), van = hm.bouw(hm.niveauVan(st.huis.niveau)), naar = hm.bouw(hm.niveauVan(v.data.niveau));
      const r = hm.verbouw(st.huis.inrichting, st.huis.doos, van, naar);
      st.huis = Object.assign({}, st.huis, { niveau: v.data.niveau, inrichting: r.inrichting, doos: r.doos, posities: {} });
    } else if (v.soort === 'kleding') {
      const b = st.kleding.bezit[v.data.fid] = st.kleding.bezit[v.data.fid] || {};
      b[v.data.item] = [...new Set([...(b[v.data.item] || []), v.data.kleur])];
    } else if (v.soort === 'set') {
      const P = wortel.PQWinkel, i = P.setInfo(st, v.data.fid, P.sets().find(x => x.id === v.data.set));
      const b = st.kleding.bezit[v.data.fid] = st.kleding.bezit[v.data.fid] || {};
      for (const it of i.mist) b[it.id] = [...new Set([...(b[it.id] || []), it.kleuren[0]])];
      v.items = i.mist.map(it => it.id);
    } else if (v.soort === 'meubel') {
      const id = wortel.PQWinkel.nieuwMeubelId(st, v.data.soort);
      st.huis = Object.assign({}, st.huis, { doos: st.huis.doos.concat([{ id, soort: v.data.soort }]) });
      v.meubel_id = id;   // na de aankoop staat hij in de verhuisdoos; plaatsen gaat in Bewerken
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
      // Gecontroleerd op het moment van het voorstel (de kleur van die week blijft te koop). De prijs kan intussen
      // gezakt zijn (een set waarvan je al een deel hebt, een extra kleur van een item dat je nu hebt), nooit gestegen.
      v.prijs = Math.min(v.prijs, controleer(st, v.soort, v.data, v.op || o.tijd).prijs);
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
    // Drop: een zeldzame kleur of een stel-set, gratis, bij een bereikte samen-mijlpaal (docs/winkel.md). Elk apparaat
    // mag hem boeken zodra het de mijlpaal ziet; de sleutel ('gehaald:6', 'stelset:date_night') zorgt dat hij maar één
    // keer uitgedeeld wordt. De inhoud volgt deterministisch uit de sleutel en de staat; geen munten.
    'drop'(st, o) {
      const P = wortel.PQWinkel, sleutel = String(o.data.sleutel || '');
      if (!P) fout('Deze app-versie kent geen drops.');
      st.winkel = st.winkel || { drops: [] };
      if (P.gedropt(st, sleutel)) return null;
      const m = P.mijlpalen(st, o.tijd).find(x => x.sleutel === sleutel);
      if (!m) fout('Deze mijlpaal is nog niet bereikt.');
      const inhoud = P.dropInhoud(st, sleutel, o.tijd);
      for (const i of inhoud.items) {
        const b = st.kleding.bezit[i.fid] = st.kleding.bezit[i.fid] || {};
        b[i.item] = [...new Set([...(b[i.item] || []), i.kleur])];
      }
      st.winkel.drops.push(Object.assign({ id: o.id, sleutel, tekst: m.tekst, op: o.tijd, door: o.door }, inhoud));
      return o.id;
    },
  });
  wortel.PQOpdrachten.controleer = controleer;
  wortel.PQOpdrachten.ander = ander;
})(typeof window !== 'undefined' ? window : globalThis);
