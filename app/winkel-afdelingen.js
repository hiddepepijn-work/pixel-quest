// De afdelingen van de winkel. Elke afdeling krijgt ctx (staat, voor wie, saldo, filter, hulpjes uit scherm-winkel.js)
// en geeft een lijst elementen terug. Kleding en meubels worden ingelezen uit PQ_KAST en PQ_HUIS: wat op 'klaar'
// staat, is te koop; wat nog op art wacht, staat onder "binnenkort".
(function (wortel) {
  'use strict';
  const R = wortel.PQRegels, S = wortel.PQStore, U = wortel.PQUI, P = wortel.PQWinkel, WU = wortel.PQWinkelUI, WS = () => wortel.PQWinkelSheet, { el } = U;
  const sectie = (titel, sub, ...kids) => el('section.winkelsectie', null, el('div.sectiekop', null, el('h2', { tekst: titel }), sub ? el('span.sectiesub', { tekst: sub }) : null), ...kids);
  const raster = kids => el('div.wraster', null, kids);
  const leeg = (kop, tekst) => el('div.leeg', null, el('b', { tekst: kop }), tekst);
  const ander = f => (f === 'hidde' ? 'tessie' : 'hidde');

  // Een set als kaart: beide figuren in de set (als hij voor allebei bestaat), prijs en status.
  function setKaart(ctx, set) {
    const i = P.setInfo(ctx.st, ctx.fid, set), wie = [ctx.fid, ander(ctx.fid)].filter(f => P.setDelen(set, f).getekend.length);
    const duo = el('div.duo', null, wie.map(f => WU.figuur(f, WU.metItems(f, P.setDelen(set, f).getekend.map(it => ({ item: it.id, kleur: it.kleuren[0] }))), 56, `${U.naam(f)} in de set ${set.naam}`)));
    const status = i.start ? el('span.label', { tekst: 'startkast' }) : !i.compleet ? el('span.label', { tekst: i.wacht ? `${i.getekend.length} van ${i.alle.length} getekend` : `niet voor ${U.naam(ctx.fid)}` })
      : !i.mist.length ? el('span.label.blad', { tekst: 'in bezit' }) : el('span.setprijs', null, el('s', { tekst: U.getal(i.som) }), WU.prijsLabel(i.prijs));
    return el('button.setkaart' + (i.teKoop && i.prijs > ctx.saldo ? '.uit' : ''), { type: 'button', 'data-set': set.id, onclick: () => WS().set(ctx.fid, set.id), 'aria-label': `Set ${set.naam}` },
      duo, el('span.setinfo', null, el('b', { tekst: set.naam }), el('small', { tekst: i.alle.map(it => it.naam).join(' · ') }),
        i.teKoop && i.inBezit ? el('small.korting', { tekst: `Je hebt er al ${i.inBezit}: korting naar rato` }) : null, status));
  }

  const A = {};
  A.uitgelicht = ctx => {
    const u = P.uitgelicht(ctx.w, ctx.fid), mijn = it => P.voor(it, ctx.fid);
    let items = u.items.filter(mijn), kleuren = u.kleuren.filter(p => mijn(P.item(p.item)));
    if (ctx.vk.betaalbaar) { items = items.filter(it => ctx.betaalbaarKleding(ctx, it)); kleuren = kleuren.filter(p => !P.heeftKleur(ctx.st, ctx.fid, p.item, p.kleur) && P.kledingPrijs(ctx.st, ctx.fid, P.item(p.item), p.kleur) <= ctx.saldo); }
    return [
      el('p.noot.weekregel', { tekst: `Week ${u.nummer} · wisselt maandag. Wat je mist, komt terug.` }),
      u.set ? sectie('Set van de week', '−20%', setKaart(ctx, u.set)) : null,
      sectie('Uitgelicht', null, items.length ? raster(items.map(it => ctx.kledingTegel(ctx, it))) : leeg('Niets binnen bereik', 'Spaar nog even, of zet het filter uit.')),
      sectie('Kleuren van de week', 'alleen nu', kleuren.length ? raster(kleuren.map(p => ctx.kledingTegel(ctx, P.item(p.item), p.kleur)))
        : leeg('Geen kleuren voor jou', ctx.vk.betaalbaar ? 'Niets binnen bereik deze week.' : 'Volgende week weer nieuwe.')),
    ];
  };

  A.kleding = ctx => {
    const slots = (wortel.PQ_KAST && wortel.PQ_KAST.slots) || Object.keys(WU.SLOTNAAM), mijn = P.klaar().filter(it => P.voor(it, ctx.fid));
    const slot = ctx.vk.slot === 'alles' || slots.includes(ctx.vk.slot) ? ctx.vk.slot : 'alles';
    let lijst = mijn.filter(it => slot === 'alles' || it.slot === slot);
    if (ctx.vk.betaalbaar) lijst = lijst.filter(it => ctx.betaalbaarKleding(ctx, it));
    const wacht = P.items().filter(it => it.status !== 'klaar' && P.voor(it, ctx.fid) && (slot === 'alles' || it.slot === slot));
    return [
      el('div.chips.slotchips', { role: 'group', 'aria-label': 'Slot' }, [['alles', 'Alles', mijn.length], ...slots.map(s => [s, WU.SLOTNAAM[s], mijn.filter(it => it.slot === s).length])]
        .filter(([, , n]) => n).map(([id, naam, n]) => el('button.chip', { type: 'button', 'aria-pressed': String(slot === id), onclick: () => ctx.zet('slot', id) }, naam, el('span.tel', { tekst: String(n) })))),
      el('p.noot', { tekst: 'Hoofd, schoenen, accessoire 20–40 · boven, onder 30–60 · jas, heel lichaam 50–90. De basiskleur is altijd te koop; extra kleuren rouleren.' }),
      lijst.length ? raster(lijst.map(it => ctx.kledingTegel(ctx, it))) : leeg(ctx.vk.betaalbaar ? 'Nog niets binnen bereik' : 'Hier is nog niets', ctx.vk.betaalbaar ? 'Rond samen een paar quests af, dan komt er meer binnen bereik.' : 'Er wordt nog getekend.'),
      wacht.length ? el('p.noot.binnenkort', { tekst: `Binnenkort (${wacht.length} in de maak): ${wacht.map(it => it.naam.toLowerCase()).join(', ')}.` }) : null,
    ];
  };

  A.sets = ctx => {
    let sets = P.sets().filter(s => !P.isStartSet(s));
    if (ctx.vk.betaalbaar) sets = sets.filter(s => { const i = P.setInfo(ctx.st, ctx.fid, s); return i.teKoop && i.prijs <= ctx.saldo; });
    const start = P.sets().filter(P.isStartSet);
    return [
      el('p.noot', { tekst: 'Een set kost de som min 20%. Heb je al items uit de set, dan betaal je alleen voor de rest (korting naar rato). Een complete set dragen geeft een glinstering in huis.' }),
      sets.length ? el('div.setlijst-kaarten', null, sets.map(s => setKaart(ctx, s))) : leeg('Geen set binnen bereik', 'Spaar nog even, of zet het filter uit.'),
      start.length ? el('p.noot', { tekst: `In de startkast: ${start.map(s => s.naam).join(', ')} (gratis voor allebei).` }) : null,
      el('p.noot', { tekst: 'Stel-sets voor jullie allebei zijn niet te koop: die komen vrij bij samen-mijlpalen (zie Zeldzaam).' }),
    ];
  };

  A.meubels = ctx => {
    const W = wortel.PQ_WINKELDATA, groepen = [['alles', 'Alles'], ['decor', 'Nieuw decor'], ['planten', 'Planten'], ['lampen', 'Lampen'], ['muur', 'Aan de muur'], ['buiten', 'Buiten']];
    const g = groepen.some(x => x[0] === ctx.vk.groep) ? ctx.vk.groep : 'alles', niveau = ctx.st.huis.niveau;
    let lijst = P.meubels().filter(m => g === 'alles' || (g === 'decor' ? m.decor : (W.meubelgroep[g] || []).includes(m.soort)));
    if (ctx.vk.betaalbaar) lijst = lijst.filter(m => m.prijs <= ctx.saldo && !P.meubelVraagt(m.soort, niveau));
    lijst.sort((a, b) => (!!P.meubelVraagt(a.soort, niveau) - !!P.meubelVraagt(b.soort, niveau)) || a.prijs - b.prijs);
    const doos = ctx.st.huis.doos.length;
    return [
      el('div.chips.slotchips', { role: 'group', 'aria-label': 'Soort' }, groepen.map(([id, naam]) => el('button.chip', { type: 'button', 'aria-pressed': String(g === id), onclick: () => ctx.zet('groep', id) }, naam))),
      el('div.doosregel', null, el('p.noot', { tekst: `Gekocht = in de verhuisdoos (nu ${doos}). Neerzetten doe je in Bewerken.` }),
        el('button.knop.mini', { type: 'button', onclick: () => { const HS = wortel.PQHuisScherm; if (HS) HS.doos(); } }, 'Verhuisdoos')),
      lijst.length ? raster(lijst.map(m => {
        const vraagt = P.meubelVraagt(m.soort, niveau), n = P.meubelAantal(ctx.st, m.soort);
        return ctx.tegel({ id: m.soort, beeld: WU.meubelBeeld(m.soort, 84, 64, 2), tag: m.def.sprite ? null : 'placeholder', naam: m.naam,
          sub: vraagt ? (vraagt.niveau ? `vraagt ${vraagt.kamer} (niveau ${vraagt.niveau})` : 'past nog nergens') : !P.meubelPlek(ctx.st, m.soort) ? 'nu geen vrije plek' : n ? `je hebt er ${n}` : null,
          status: WU.prijsLabel(m.prijs), uit: !!vraagt || m.prijs > ctx.saldo, aria: `${m.naam}: ${m.prijs} munten${vraagt && vraagt.niveau ? `, vraagt ${vraagt.kamer} (niveau ${vraagt.niveau})` : ''}`,
          onclick: () => WS().meubel(m.soort) });
      })) : leeg('Niets binnen bereik', 'Spaar nog even, of zet het filter uit.'),
    ];
  };

  A.bouwen = ctx => {
    const H = wortel.PQ_HUIS, volgende = H.niveaus.find(h => h.niveau === ctx.st.huis.niveau + 1);
    if (!volgende) return [leeg('Jullie huis is af', 'Een villa met zwembad. Meubels en decor kun je altijd nog kopen.')];
    const c = el('canvas', { 'aria-label': `Het huis na verbouwing ${volgende.niveau}` });
    try { wortel.PQHuis.mini(c, volgende.niveau, 300); } catch (e) { /* */ }
    const sp = WU.sparen(volgende.prijs);
    return [el('article.kaart.bouwkaart', null, el('div.kopregel-klein', null, el('h3', { tekst: `Volgende verbouwing: ${volgende.naam}` }), WU.prijsLabel(volgende.prijs)),
      el('div.minivak', null, c), el('p.noot', { tekst: volgende.omschrijving }),
      el('p.noot', { tekst: sp ? sp + '.' : 'Genoeg in de pot: kopen gaat in Bouwen, samen met de ander.' }),
      el('div.knoprij', null, el('button.knop.goud', { type: 'button', onclick: () => wortel.PQApp.ga('verbouwen') }, 'Naar Bouwen'))),
      el('p.noot', { tekst: 'Verbouwingen kopen jullie in Bouwen: daar zie je alle tien niveaus en kun je ze eerst in huis bekijken.' })];
  };
  wortel.PQWinkelAfd = A;
  wortel.PQWinkelAfdHulp = { sectie, raster, leeg, setKaart, ander };
})(window);
