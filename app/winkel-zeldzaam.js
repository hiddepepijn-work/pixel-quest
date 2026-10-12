// Afdeling Zeldzaam: wat niet te koop is. Zeldzame kleuren (glitter, regenboog, seizoenstint) komen als drop bij
// samen-mijlpalen en streaks; stel-sets voor allebei komen vrij bij een gezamenlijke mijlpaal. Ook de plek in de
// collectie (Pets) gebruikt dropsLijst().
(function (wortel) {
  'use strict';
  const S = wortel.PQStore, U = wortel.PQUI, P = wortel.PQWinkel, WU = wortel.PQWinkelUI, { el } = U;
  const { sectie, leeg } = wortel.PQWinkelAfdHulp;
  const datum = ms => new Date(ms).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });

  function balk(stand, doel) {
    return el('span.mini-balk.breed', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': doel, 'aria-valuenow': stand }, el('i', { stijl: { width: Math.min(100, stand / doel * 100) + '%' } }));
  }
  // De drops die jullie kregen, nieuwste eerst.
  function dropsLijst(st) {
    const d = P.drops(st).slice().reverse();
    if (!d.length) return leeg('Nog geen drops', 'De eerste komt bij 3 gehaalde weken samen. Een drop is gratis en altijd voor jullie allebei.');
    return el('ul.droplijst', null, d.map(x => {
      if (x.soort === 'stelset') {
        const s = wortel.PQ_WINKELDATA.stelsets.find(y => y.id === x.stelset);
        return el('li', null, el('span.label.goud', { tekst: 'stel-set' }), el('span', null, el('b', { tekst: s ? s.naam : x.stelset }), el('small', { tekst: ` · ${x.tekst} · ${datum(x.op)}` })));
      }
      return el('li', null, WU.staal(x.kleur, { label: P.kleurNaam(x.kleur) }),
        el('span', null, el('b', { tekst: P.kleurNaam(x.kleur) }), el('small', { tekst: ` · ${x.tekst} · ${datum(x.op)}` }),
          el('small.dropwie', { tekst: x.items.map(i => `${U.naam(i.fid)}: ${(P.item(i.item) || {}).naam || i.item}`).join(' · ') })));
    }));
  }
  function stelKaart(s) {
    const wie = ['hidde', 'tessie'];
    const duo = el('div.duo', null, wie.map(f => WU.figuur(f, WU.metItems(f, (s.look[f] || []).map(([item, kleur]) => ({ item, kleur }))), 56, `${U.naam(f)} in ${s.naam}`)));
    const getekend = wie.every(f => (s.look[f] || []).every(([id]) => (P.item(id) || {}).status === 'klaar'));
    return el('article.setkaart.stel' + (s.vrij ? '' : '.op-slot'), { 'data-stelset': s.id }, duo,
      el('span.setinfo', null, el('b', { tekst: s.naam }), el('small', { tekst: s.omschrijving }),
        s.vrij ? el('span.label.blad', { tekst: 'in jullie kast' })
          : el('span.voorwaarde', null, el('small', { tekst: `Op slot: komt vrij bij ${s.voorwaarde.tekst} (nu ${s.stand}).` }), balk(s.stand, s.voorwaarde.doel)),
        getekend ? null : el('small', { tekst: 'Deels nog in de maak: die items komen vanzelf in de kast zodra ze getekend zijn.' })));
  }

  wortel.PQWinkelAfd.zeldzaam = ctx => {
    const nu = Date.now(), Z = wortel.PQ_WINKELDATA.zeldzaam, seizoen = P.seizoen(nu);
    const volgende = P.volgende(ctx.st, nu).map(v => {
      const wat = v.teller === 'gehaald' ? 'Glitter of regenboog' : `Seizoenstint (nu: ${seizoen})`;
      return el('li.volgende', null, el('span', null, el('b', { tekst: wat }), el('small', { tekst: ` bij ${v.tekst} (nu ${v.stand})` })), balk(v.stand - v.vanaf, v.doel - v.vanaf));
    });
    return [
      el('p.noot', { tekst: 'Niet te koop: dit verdienen jullie samen. Zeldzame kleuren komen als drop bij een mijlpaal of streak, stel-sets bij een gezamenlijke mijlpaal.' }),
      sectie('Zeldzame kleuren', 'alleen als drop', el('div.swatches.zeldzaam-rij', null, Object.keys(Z).map(k => el('figure.zstaal', null, WU.staal(k, { label: `${Z[k].naam}: niet te koop`, heb: ['hidde', 'tessie'].some(f => Object.values(ctx.st.kleding.bezit[f] || {}).some(l => (l || []).includes(k))) }), el('figcaption', { tekst: Z[k].naam.replace('tint', '') })))),
        el('ul.volgendelijst', null, volgende)),
      sectie('Jullie drops', null, dropsLijst(ctx.st)),
      sectie('Stel-sets', 'voor allebei', el('div.setlijst-kaarten', null, P.stelsets(ctx.st, nu).map(stelKaart))),
    ];
  };
  wortel.PQWinkelZeldzaam = { dropsLijst, stelKaart };
})(window);
