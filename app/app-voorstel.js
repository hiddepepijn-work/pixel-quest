// Kopen uit de gedeelde huispot gaat altijd via een voorstel dat de ander goedkeurt (puntensysteem §10, huis.md).
// Zolang er geen server is, staan jullie op één apparaat: dan is er een duidelijke testknop
// "Tessie keurt goed (op dit apparaat)", die de opdracht namens de ander boekt.
(function (wortel) {
  'use strict';
  const R = wortel.PQRegels, S = wortel.PQStore, U = wortel.PQUI, { el } = U;

  function akkoord(id, namensAnder) {
    const r = S.doe('voorstel.akkoord', { id }, namensAnder ? { namens: S.ander() } : undefined);
    if (!r.ok) { U.fout(r.fout); return false; }
    const v = S.staat().voorstellen.find(x => x.id === id);
    U.meld(`Gekocht: ${v.naam}. Er ging ${v.prijs} uit de huispot.`);
    U.feestje(innerWidth / 2, innerHeight / 3, 18);
    document.dispatchEvent(new CustomEvent('pq-gekocht', { detail: v }));
    return true;
  }
  function knoppen(v, na) {
    const mij = S.ik(), ander = S.ander(), uit = [];
    if (v.door === mij) {
      uit.push(el('button.knop.mini.stil', { type: 'button', onclick: () => { const r = S.doe('voorstel.intrekken', { id: v.id }); if (!r.ok) U.fout(r.fout); else { U.meld('Voorstel ingetrokken.'); if (na) na(); } } }, 'Intrekken'));
      uit.push(el('button.knop.mini.goud.namens', { type: 'button', onclick: () => { if (akkoord(v.id, true) && na) na(); } }, `${U.naam(ander)} keurt goed (op dit apparaat)`));
    } else {
      uit.push(el('button.knop.mini', { type: 'button', onclick: () => { const r = S.doe('voorstel.nee', { id: v.id }); if (!r.ok) U.fout(r.fout); else { U.meld('Niet gekocht. De munten blijven in de pot.'); if (na) na(); } } }, 'Liever niet'));
      uit.push(el('button.knop.mini.goud', { type: 'button', onclick: () => { if (akkoord(v.id, false) && na) na(); } }, 'Goedkeuren'));
    }
    return uit;
  }
  function kaart(v, na) {
    return el('div.voorstel', null,
      el('div', null, el('b', { tekst: v.naam }), el('small', { tekst: `${U.naam(v.door)} stelt voor · ${U.getal(v.prijs)} munten` })),
      el('div.knoprij', null, knoppen(v, na)));
  }
  // Nieuw voorstel doen en meteen laten zien wat er nu gebeurt.
  function nieuw(soort, data) {
    const r = S.doe('voorstel.nieuw', { soort, data });
    if (!r.ok) { U.fout(r.fout); return null; }
    const v = S.staat().voorstellen.find(x => x.id === r.id), pot = R.pot(S.staat(), Date.now());
    const s = U.sheet({ titel: 'Voorstel gedaan',
      inhoud: [el('p', { tekst: `${v.naam} voor ${U.getal(v.prijs)} munten. ${U.naam(S.ander())} moet het goedkeuren; pas dan gaan de munten uit de pot (nu ${U.getal(pot.saldo)}).` }),
        el('p.noot', { tekst: 'Er is nog geen server, dus het voorstel staat alleen op dit apparaat. Samen testen? Gebruik de knop hieronder.' })],
      knoppen: [el('button.knop.stil', { type: 'button', onclick: () => s.sluit() }, 'Wacht op akkoord'),
        el('button.knop.goud', { type: 'button', onclick: () => { if (akkoord(v.id, true)) s.sluit(); } }, `${U.naam(S.ander())} keurt goed (op dit apparaat)`)] });
    return v;
  }
  const open = (soort, f) => S.staat().voorstellen.find(v => v.status === 'open' && v.soort === soort && f(v.data));
  wortel.PQVoorstel = { nieuw, akkoord, kaart, knoppen, open };
})(window);
