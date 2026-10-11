// Startstaat van de store: lege speltoestand plus voorbeeldtaken voor een stel. De voorbeeldtaken zijn gemarkeerd
// (voorbeeld: true) en los of allemaal te verwijderen. Een huis en kledingkast van de losse prototypepagina's
// (pq-huis-staat, pq-kk-look, pq-kk-bezit) worden één keer overgenomen, zodat niemand zijn inrichting kwijtraakt.
(function (wortel) {
  'use strict';
  const DAG = 864e5;
  // [titel, minuten, zwaarte, eigenaar, interval (dagen, null = eenmalig), soort werk, plek, laatst (× interval geleden)]
  const VOORBEELDEN = [
    ['Afwas en vaatwasser', 10, 1, null, 1, 'doen', { meubel: 'keukenblok-1' }, 1.1],
    ['Koken', 40, 0, 'samen', 1, 'doen', { meubel: 'keukenblok-1' }, 0.4],
    ['Was draaien en ophangen', 25, 0, 'tessie', 4, 'doen', { meubel: 'wasmand-1' }, 0.8],
    ['Was vouwen', 20, 1, 'hidde', 4, 'doen', { meubel: 'wasmand-1' }, 0.5],
    ['Stofzuigen', 30, 1, null, 7, 'doen', { meubel: 'bank-1' }, 1.2],
    ['Boodschappen', 45, 1, 'tessie', 7, 'doen', null, 0.75],
    ['Planten water geven', 5, 0, 'hidde', 3, 'doen', { meubel: 'plant-1' }, 0.9],
    ['Aquarium verversen', 20, 1, 'hidde', 14, 'doen', { meubel: 'aquarium-1' }, 0.95],
    ['Container aan de straat', 5, 1, null, 14, 'doen', null, 0.6],
    ['Bed verschonen', 15, 1, 'samen', 14, 'doen', { meubel: 'bed-1' }, 1.05],
    ['Badkamer schoonmaken', 45, 2, null, 7, 'doen', { kamer: 'bad' }, 0.5],
    ['Weekmenu en boodschappenlijst', 30, 0, 'tessie', 7, 'plannen', { meubel: 'klembord-1' }, 0.3],
    ['Geld en administratie', 20, 0, 'hidde', 7, 'plannen', { meubel: 'klembord-1' }, 0.8],
    ['Sociale agenda bijhouden', 20, 0, 'tessie', 7, 'plannen', null, 0.2],
    ['Voorraad bijhouden', 20, 0, null, 7, 'bijhouden', null, 0.7],
    ['Lamp in de gang vervangen', 15, 0, null, null, 'doen', null, null],
    ['Cadeau voor mama regelen', 30, 0, 'hidde', null, 'plannen', null, null, 5],
  ];
  function lees(sleutel) { try { return JSON.parse(localStorage.getItem(sleutel) || 'null'); } catch (e) { return null; } }

  function kledingStart() {
    const bezit = { hidde: {}, tessie: {} }, K = wortel.PQ_KAST;
    for (const it of (K && K.items) || []) {
      if (!it.startkast) continue;
      for (const f of it.lichaam) bezit[f][it.id] = [it.kleuren[0]];
    }
    return { bezit, looks: { hidde: null, tessie: null } };
  }
  function huisStart() {
    const HM = wortel.PQ_HUISMODEL;
    return HM ? HM.normaliseer(null) : { versie: 3, niveau: 1, inrichting: [], doos: [], posities: {} };
  }

  // De basis: wat er is vóór de eerste opdracht. De voorbeeldtaken staan erin (met hun klokstand van nu).
  function basis(nu, metVoorbeelden) {
    const st = {
      start: nu, taken: {}, afrondingen: [], bedankjes: [], weekdoel: [], afwezig: [], rustweken: [], terugblik: {},
      voorstellen: [], overnames: 0, huis: huisStart(), kleding: kledingStart(),
      pets: { actief: 'draakje', start: { draakje: 0 }, namen: {} },
    };
    if (metVoorbeelden !== false) {
      VOORBEELDEN.forEach(([titel, minuten, zwaarte, eigenaar, interval, soort, plek, laatst, deadlineDagen], i) => {
        const id = 'vb-' + (i + 1);
        st.taken[id] = { id, titel, minuten, zwaarte, eigenaar, interval, soort_werk: soort, plek, prive: false, status: 'open',
          voorbeeld: true, gemaakt_door: null, gemaakt_op: nu, laatst: interval ? Math.round(nu - laatst * interval * DAG) : null,
          deadline: deadlineDagen ? wortel.PQRegels.dagSleutel(nu + deadlineDagen * DAG) : null };
      });
    }
    // Eerder ingericht huis en eerdere kast overnemen (prototype-opslag).
    const HM = wortel.PQ_HUISMODEL, oudHuis = lees('pq-huis-staat');
    if (HM && oudHuis) { try { st.huis = HM.normaliseer(oudHuis); } catch (e) { /* dan het starthuis */ } }
    const looks = lees('pq-kk-look'), bezit = lees('pq-kk-bezit');
    for (const f of ['hidde', 'tessie']) {
      if (looks && looks[f] && typeof looks[f] === 'object') st.kleding.looks[f] = looks[f];
      if (bezit && bezit[f] && typeof bezit[f] === 'object') st.kleding.bezit[f] = Object.assign(st.kleding.bezit[f], bezit[f]);
    }
    return st;
  }
  wortel.PQStart = { basis, VOORBEELDEN };
})(typeof window !== 'undefined' ? window : globalThis);
