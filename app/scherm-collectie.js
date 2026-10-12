// Menu → Pets: de collectie van 14 pets. Uitgekomen pets kun je een naam geven en laten meelopen (in het huis en in
// de HUD); eieren tonen hun samen-mijlpaal en voortgang. Pets gaan nooit dood.
(function (wortel) {
  'use strict';
  const R = wortel.PQRegels, S = wortel.PQStore, U = wortel.PQUI, { el } = U;
  const MAN = () => wortel.PQ_MANIFEST;
  let root, inhoud;
  const petNaam = id => S.staat().pets.namen[id] || (MAN().assets.find(a => a.id === id) || {}).naam || id;
  const kaart = (id, titel, ...kids) => el('section.kaart.meerkaart', { id: 'meer-' + id, 'aria-labelledby': 'mk-' + id }, el('h2.meerkop', { id: 'mk-' + id, tekst: titel }), ...kids);

  // ---------- collectie ----------
  function collectie() {
    const st = S.staat(), nu = Date.now(), col = R.collectie(st, nu), actief = st.pets.actief, p = R.pet(st, nu);
    const vakken = col.map(c => {
      const naam = petNaam(c.id), aan = c.id === actief;
      const inhoudVak = c.uit ? U.sprite(c.id, 1.1, naam) : U.ei(30, `Ei van ${naam}`);
      return el('button.petvakje' + (aan ? '.actief' : '') + (c.uit ? '' : '.slot'), { type: 'button', 'aria-label': c.uit ? `${naam}${aan ? ', loopt mee' : ''}` : `${naam}: ei, ${c.stand} van ${c.doel}`,
        onclick: () => petSheet(c) }, el('span.petbeeld', null, inhoudVak), el('b', { tekst: c.uit ? naam : '???' }),
        c.uit ? el('small', { tekst: aan ? 'loopt mee' : 'uitgekomen' }) : el('span.mini-balk', null, el('i', { stijl: { width: (c.stand / c.doel * 100) + '%' } })));
    });
    return kaart('collectie', 'Collectie',
      el('p.noot', { tekst: `${col.filter(c => c.uit).length} van ${col.length} uitgekomen. Eieren komen uit op samen-mijlpalen; pets gaan nooit dood.` }),
      el('div.collectie-raster', null, vakken),
      el('p.noot', { tekst: p.ei ? `${petNaam(p.id)} is nog een ei.` : `${petNaam(p.id)} loopt mee: ${p.stadium}, ${U.getal(p.xp)} XP.` }));
  }
  function petSheet(c) {
    const naam = petNaam(c.id), st = S.staat();
    if (!c.uit) {
      return U.sheet({ titel: 'Ei', inhoud: [el('div.petgroot', null, U.ei(64, 'Ei')),
        el('p', { tekst: `Komt uit na ${c.tekst}. Nu: ${c.stand} van ${c.doel}.` }),
        el('div.xpbalk', { role: 'progressbar', 'aria-valuenow': c.stand, 'aria-valuemax': c.doel, 'aria-valuemin': 0 }, el('div.vul', { stijl: { width: (c.stand / c.doel * 100) + '%' } })),
        el('p.noot', { tekst: 'Taken van allebei tellen mee. Er zijn geen munten of sterren voor nodig.' })] });
    }
    const invoer = el('input.invoer', { type: 'text', maxlength: 24, value: st.pets.namen[c.id] || '', placeholder: naam, 'aria-label': 'Naam' });
    const s = U.sheet({ titel: naam, inhoud: [el('div.petgroot', null, U.sprite(c.id, 2.2, naam)),
      el('label.veld', null, el('span', { tekst: 'Naam' }), invoer)],
      knoppen: [el('button.knop.stil', { type: 'button', onclick: () => { const r = S.doe('pet.naam', { id: c.id, naam: invoer.value }); if (!r.ok) U.fout(r.fout); s.sluit(); } }, 'Bewaar naam'),
        st.pets.actief === c.id ? el('button.knop', { type: 'button', disabled: true }, 'Loopt al mee')
          : el('button.knop.goud', { type: 'button', onclick: () => { const r = S.doe('pet.actief', { id: c.id }); if (!r.ok) return U.fout(r.fout); U.meld(`${naam} loopt nu mee.`); s.sluit(); } }, 'Laat meelopen')] });
  }

  // De plek in de collectie voor drops: zeldzame kleuren en stel-sets (winkel-zeldzaam.js).
  function zeldzaam() {
    const Z = wortel.PQWinkelZeldzaam;
    if (!Z) return null;
    return kaart('zeldzaam', 'Zeldzame kleuren', el('p.noot', { tekst: 'Drops bij samen-mijlpalen en streaks: niet te koop, altijd voor jullie allebei.' }),
      Z.dropsLijst(S.staat()), el('button.knop.mini', { type: 'button', onclick: () => wortel.PQApp.ga('winkel', { afd: 'zeldzaam', naar: true }) }, 'Stel-sets en volgende drops'));
  }
  function teken() { if (inhoud) inhoud.replaceChildren(...[collectie(), zeldzaam()].filter(Boolean)); }
  function maak(r) {
    root = r;
    inhoud = el('div.meer-inhoud');
    root.append(el('header.kopregel.klein', null, el('div', null, el('h1', { tekst: 'Pets' }), el('p.sub', { tekst: 'Eieren komen uit op samen-mijlpalen.' }))), inhoud);
  }
  wortel.PQApp.scherm('collectie', { maak, toon: teken, ververs(op) { if (!op || op.soort !== 'klok') teken(); } });
})(window);
