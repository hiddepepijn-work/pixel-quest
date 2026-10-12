// Menu → Winkel: alles wat geld kost op één plek (docs/winkel.md). Afdelingen Uitgelicht, Kleding, Sets, Meubels,
// Zeldzaam en Bouwen; bovenin de huispot, voor wie je kijkt en het filter "kan ik betalen". Kopen gaat als voorstel
// uit de gedeelde huispot met akkoord van de ander. De afdelingen staan in winkel-afdelingen.js.
(function (wortel) {
  'use strict';
  const R = wortel.PQRegels, S = wortel.PQStore, U = wortel.PQUI, P = wortel.PQWinkel, V = wortel.PQVoorstel, WU = wortel.PQWinkelUI, { el } = U;
  const AFD = [['uitgelicht', 'Uitgelicht'], ['kleding', 'Kleding'], ['sets', 'Sets'], ['meubels', 'Meubels'], ['zeldzaam', 'Zeldzaam'], ['bouwen', 'Bouwen']];
  let root, kop, nav, inhoud;

  // Voorkeuren per apparaat (niet gedeeld): afdeling, voor wie, filter, slot en meubelgroep.
  function voorkeur() {
    const a = S.apparaat().winkel || {};
    return { afd: AFD.some(x => x[0] === a.afd) ? a.afd : 'uitgelicht', voor: ['hidde', 'tessie'].includes(a.voor) ? a.voor : S.ik(),
      betaalbaar: !!a.betaalbaar, slot: a.slot || 'alles', groep: a.groep || 'alles' };
  }
  function zet(k, v) { const a = Object.assign({}, S.apparaat().winkel || {}, { [k]: v }); S.zetApparaat('winkel', a); teken(); }

  // Een tegel in het raster: beeld, naam, prijs of status. uit = gedimd (niet te koop of past nog niet).
  function tegel(o) {
    return el('button.wtegel' + (o.uit ? '.uit' : '') + (o.aan ? '.aan' : ''), { type: 'button', onclick: o.onclick, 'aria-label': o.aria || o.naam, 'data-id': o.id || null },
      el('span.wbeeld', null, o.beeld, o.tag ? el('span.wtag', { tekst: o.tag }) : null), el('b', { tekst: o.naam }), o.sub ? el('small', { tekst: o.sub }) : null,
      el('span.wstatus', null, o.status));
  }
  // Wat kun je van dit kledingstuk nu kopen (voor wie), en wat kost het goedkoopste?
  function kledingStand(st, fid, it, w) {
    const heb = st.kleding.bezit[fid][it.id] || [], look = st.kleding.looks[fid] || {};
    const opties = it.kleuren.filter(k => !heb.includes(k) && P.kleurTeKoop(it, k, w)).map(k => P.kledingPrijs(st, fid, it, k));
    return { heb, draagt: !!(look[it.slot] && look[it.slot].item === it.id), goedkoopst: opties.length ? Math.min(...opties) : null };
  }
  function kledingTegel(ctx, it, kleur) {
    const { st, fid, w } = ctx, k = kledingStand(st, fid, it, w), heb = k.heb.includes(kleur || it.kleuren[0]);
    const prijs = kleur ? P.kledingPrijs(st, fid, it, kleur) : k.goedkoopst;
    const status = kleur ? (heb ? el('span.label.blad', { tekst: 'in bezit' }) : WU.prijsLabel(prijs))
      : k.draagt ? el('span.label.goud', { tekst: 'draag je' }) : k.heb.length ? el('span.label.blad', { tekst: k.heb.length > 1 ? `${k.heb.length} kleuren` : 'in bezit' })
        : WU.prijsLabel(prijs);
    return tegel({ id: it.id, beeld: WU.uitsnede(fid, it, kleur || (k.heb[0] || it.kleuren[0]), 64), naam: it.naam, sub: kleur ? P.kleurNaam(kleur) : it.zeldzaamheid === 'zeldzaam' ? 'zeldzaam item' : null, status,
      uit: !heb && prijs != null && prijs > ctx.saldo, aria: `${it.naam}${kleur ? ' in ' + kleur : ''}: ${heb || (!kleur && k.heb.length) ? 'in bezit' : prijs + ' munten'}`,
      onclick: () => wortel.PQWinkelSheet.kleding(fid, it.id, kleur || null) });
  }
  const betaalbaarKleding = (ctx, it) => { const k = kledingStand(ctx.st, ctx.fid, it, ctx.w); return k.goedkoopst != null && k.goedkoopst <= ctx.saldo; };

  function kopTeken() {
    const st = S.staat(), nu = Date.now(), pot = R.pot(st, nu), vk = voorkeur();
    const open = st.voorstellen.filter(v => v.status === 'open' && ['kleding', 'set', 'meubel'].includes(v.soort));
    kop.replaceChildren(...[
      el('header.kopregel', null, el('div', null, el('h1', { tekst: 'Winkel' }), el('p.sub', { tekst: 'Alles uit de gedeelde huispot' })),
        el('button.potregel.groot.potknop', { type: 'button', onclick: potSheet, 'aria-label': `${pot.saldo} munten in de huispot. Uitleg.` }, U.munt(22), U.getal(pot.saldo))),
      pot.saldo <= 0 && !open.length ? el('div.winkel-leeg', null, el('p', null, el('b', { tekst: 'Nog geen munten?' }), ' Rond samen een paar quests af; elke inzet doet 0,5 munt in de pot.'),
        el('button.knop.mini.goud', { type: 'button', onclick: () => wortel.PQApp.ga('quests') }, 'Quests')) : null,
      open.length ? el('div.voorstellen', { 'aria-label': 'Open voorstellen' }, open.map(v => V.kaart(v, teken))) : null,
      el('div.winkelbalk', null,
        el('div.chips.wie', { role: 'radiogroup', 'aria-label': 'Voor wie' }, el('span.wie-label', { tekst: 'Voor' }), ['hidde', 'tessie'].map(f =>
          el('button.chip', { type: 'button', role: 'radio', 'aria-checked': String(vk.voor === f), 'aria-pressed': String(vk.voor === f), 'aria-label': `Voor ${U.naam(f)}`, onclick: () => zet('voor', f) }, U.naam(f)))),
        el('button.chip.filter', { type: 'button', 'aria-pressed': String(vk.betaalbaar), onclick: () => zet('betaalbaar', !vk.betaalbaar) }, vk.betaalbaar ? '✓ Kan ik betalen' : 'Kan ik betalen')),
    ].filter(Boolean));
    nav.replaceChildren(...AFD.map(([id, naam]) =>
        el('button.chip', { type: 'button', role: 'tab', 'aria-selected': String(vk.afd === id), 'aria-pressed': String(vk.afd === id), 'data-afd': id, onclick: () => { zet('afd', id); root.scrollTo({ top: 0 }); } }, naam)));
    const a = nav.querySelector('[aria-selected="true"]');
    if (a && (a.offsetLeft + a.offsetWidth > nav.scrollLeft + nav.clientWidth || a.offsetLeft < nav.scrollLeft)) nav.scrollLeft = Math.max(0, a.offsetLeft - 16);
    randNav();
  }
  const randNav = () => nav.classList.toggle('eind', nav.scrollLeft + nav.clientWidth >= nav.scrollWidth - 4);
  function potSheet() {
    const st = S.staat(), nu = Date.now(), pot = R.pot(st, nu);
    U.sheet({ titel: 'De huispot', inhoud: [el('p.potregel.groot', null, U.munt(22), `${U.getal(pot.saldo)} munten`),
      el('p', { tekst: `Elke inzet doet 0,5 munt in de pot, tot ${pot.maxWeek} per week (deze week al ${pot.dezeWeek}). De winkel zelf geeft geen munten.` }),
      el('p.noot', { tekst: `Bij een volle week is een gewoon item ongeveer 1 dag sparen voor jullie samen (2 als je de pot eerlijk deelt), een set ongeveer een halve week samen. Verbouwingen kosten 1 tot 10 weken.` }),
      el('p.noot', { tekst: 'Kopen doen jullie samen: de ander keurt goed. Prijzen zijn vast en dalen nooit.' })] });
  }
  function teken() {
    if (!inhoud) return;
    const top = root.scrollTop, vk = voorkeur(), st = S.staat(), nu = Date.now();
    const ctx = { st, nu, w: R.weekVan(nu), fid: vk.voor, saldo: R.pot(st, nu).saldo, vk, zet, tegel, kledingTegel, betaalbaarKleding, teken };
    kopTeken();
    try { inhoud.replaceChildren(...wortel.PQWinkelAfd[vk.afd](ctx).filter(Boolean)); }
    catch (e) { inhoud.replaceChildren(el('p.noot', { tekst: 'Deze afdeling kon niet worden getoond.' })); if (wortel.PQ_TEST) wortel.PQ_TEST.fouten.push('winkel: ' + e.message); }
    root.scrollTop = top;
  }
  function maak(r) {
    root = r;
    kop = el('div.winkel-kop'); inhoud = el('div.winkel-inhoud');
    nav = el('nav.chips.afdelingen', { role: 'tablist', 'aria-label': 'Afdelingen' });   // los kind van de view: plakt bovenaan bij scrollen
    root.append(kop, nav, inhoud);
    nav.addEventListener('scroll', randNav, { passive: true });
  }
  wortel.PQApp.scherm('winkel', {
    maak, toon: o => { if (o && o.afd) S.zetApparaat('winkel', Object.assign({}, S.apparaat().winkel || {}, { afd: o.afd })); teken(); },
    ververs(op) { if (!op || op.soort !== 'klok') teken(); },
  });
  wortel.PQWinkelScherm = { teken, AFD };
})(window);
