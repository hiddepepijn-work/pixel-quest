// Vandaag: het huis als levende scène (compact, tik = naar Huis), het weekdoel samen, de taken die nu nodig zijn
// (jouw taken, samen, verzoeken en het prikbord), snel afvinken met een feestje, en het pet met de XP-balk.
(function (wortel) {
  'use strict';
  const R = wortel.PQRegels, S = wortel.PQStore, U = wortel.PQUI, T = wortel.PQTaken, { el } = U;
  let root, huis = null, inhoud, petVak = null;

  function weekdoelKaart(nu) {
    const st = S.staat(), wk = R.weken(st, nu), w = wk.nu, pot = R.pot(st, nu);
    const pct = w.norm ? Math.min(100, w.totaal / w.norm * 100) : 100;
    const tekst = w.bevroren ? 'Rustweek: deze week telt niet en breekt niets.' : w.gehaald ? 'Gehaald! Alles erboven is extra.' : `Nog ${Math.max(0, Math.ceil(R.P.drempel * w.norm - w.totaal))} tot de week gehaald is (80%).`;
    return el('section.kaart.weekdoel', { 'aria-labelledby': 'wdTitel' },
      el('div.getallen', null, el('h2.pix-font', { id: 'wdTitel', stijl: { margin: 0, fontSize: '16px' } }, 'SAMEN DEZE WEEK'),
        el('span.groot', { 'aria-label': `Samen ${w.totaal} van ${w.norm}` }, `${U.getal(w.totaal)} / ${U.getal(w.norm)}`)),
      el('div.balk-week' + (w.gehaald ? '.gehaald' : ''), { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': w.norm, 'aria-valuenow': w.totaal, 'aria-label': 'Weekdoel samen' },
        el('div.vul', { stijl: { width: pct + '%' } }), el('div.drempel', { stijl: { left: '80%' }, title: '80%: week gehaald' })),
      el('p.noot', { tekst }),
      el('div.regel', null,
        el('span', null, el('b', { tekst: `Streak ${wk.streak} ${wk.streak === 1 ? 'week' : 'weken'}` }), wk.record > wk.streak ? ` · record ${wk.record}` : ''),
        el('span.potregel', { id: 'vdPot', title: 'De gedeelde huispot' }, U.munt(18), U.getal(pot.saldo),
          el('small', { stijl: { font: '600 12px var(--tekstfont)', opacity: .75 } }, ` (+${pot.dezeWeek} deze week)`))));
  }
  function petKaart(nu) {
    const st = S.staat(), p = R.pet(st, nu), naam = (st.pets.namen[p.id]) || (wortel.PQ_MANIFEST.assets.find(a => a.id === p.id) || {}).naam;
    petVak = el('div.petvak', null, p.ei ? U.ei(44, `Ei van ${naam}`) : U.sprite(p.id, 1.6, `${naam}, ${p.stadium}`));
    const dank = st.bedankjes.filter(b => b.aan === S.ik()).slice(-1)[0];
    const tekst = p.ei ? `Komt uit na ${p.ei_tekst} (${p.ei_stand}/${p.ei_doel}).` : p.tot ? `${U.getal(p.xp - p.vanaf)} / ${U.getal(p.tot - p.vanaf)} XP tot ${p.volgende}` : 'Helemaal volgroeid.';
    const pct = p.ei ? (p.ei_stand / p.ei_doel) * 100 : p.tot ? (p.xp - p.vanaf) / (p.tot - p.vanaf) * 100 : 100;
    return el('section.kaart.petkaart', { 'aria-label': 'Jullie pet' }, petVak,
      el('div', null, el('h3', { tekst: p.ei ? `Ei van ${naam.toLowerCase()}` : `${naam} · ${p.stadium}` }),
        el('div.xpbalk', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(pct), 'aria-label': 'Groei' }, el('div.vul', { stijl: { width: pct + '%' } })),
        el('p.noot', { tekst }),
        dank && Date.now() - dank.op < 3 * 864e5 ? el('p.noot', { stijl: { color: 'var(--koraal)', opacity: 1, fontWeight: 700 } }, `♥ ${U.naam(dank.van)} bedankte je`) : null));
  }
  function sectie(titel, items, leeg, opties) {
    if (!items.length && !leeg) return null;
    return el('section', null, el('div.sectiekop', null, el('h2', { tekst: titel })), T.lijstEl(items, leeg, opties));
  }
  function teken() {
    if (!inhoud) return;
    const nu = Date.now(), v = T.vandaag(nu), mij = S.ik();
    const alles = v.verzoek.length + v.mijn.length + v.samen.length + v.open.length;
    inhoud.replaceChildren(...[
      weekdoelKaart(nu),
      sectie('Gevraagd aan jou', v.verzoek),
      sectie('Jouw quests', v.mijn, alles ? null : el('div', null, el('b', { tekst: 'Niets dat nu moet' }), 'Lekker. Kijk bij Quests wat er later komt, of zet iets op het bord.',
        el('div', { stijl: { marginTop: '10px' } }, el('button.knop.goud', { type: 'button', onclick: () => T.bewerk() }, '+ Nieuwe taak')))),
      sectie('Samen', v.samen),
      sectie('Op het prikbord', v.open, null, { pak: true }),
      el('div.sectiekop', null, el('h2', { tekst: 'Jullie pet' }), el('button.meer-link', { type: 'button', onclick: () => wortel.PQApp.ga('meer', { naar: 'collectie' }) }, 'Collectie')),
      petKaart(nu)].filter(Boolean));
    root.querySelector('.datum').textContent = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
    const av = root.querySelector('.avatarknop');
    av.className = 'avatarknop ' + mij; av.replaceChildren(U.sprite(mij, 0.62, U.naam(mij)));
    av.setAttribute('aria-label', `Je bent ${U.naam(mij)}. Profiel wisselen onder Meer.`);
  }
  function maak(r) {
    root = r;
    const huisVak = el('div.huis-compact', { role: 'button', tabindex: 0, 'aria-label': 'Ons huis. Tik om het huis groot te openen.' });
    const naarHuis = () => wortel.PQApp.ga('huis');
    huisVak.onclick = e => { if (!e.target.closest('.signaal, .tik')) naarHuis(); };
    huisVak.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); naarHuis(); } };
    inhoud = el('div.vandaag-inhoud');
    root.append(
      el('header.kopregel', null, el('div', null, el('h1', { tekst: 'Vandaag' }), el('p.sub.datum')),
        el('div.knoprij', null, el('button.knop.mini.goud', { type: 'button', onclick: () => T.bewerk(), 'aria-label': 'Nieuwe taak' }, '+ Taak'),
          el('button.avatarknop', { type: 'button', onclick: () => wortel.PQApp.ga('meer', { naar: 'profiel' }) }))),
      huisVak, el('div.huis-label', { 'aria-hidden': 'true' }, 'Ons huis ›'), inhoud);
    huis = wortel.PQHuis.mount(huisVak, { store: S, compact: true, meld: (t) => U.meld(t),
      opTaak: id => T.detail(id), taken: huisTaken, pets: uitgekomen, petNaam: id => S.staat().pets.namen[id] });
    document.addEventListener('pq-afgerond', e => {
      if (wortel.PQApp.huidig() !== 'vandaag') return;
      const pot = root.querySelector('#vdPot');
      if (pot) U.tik(pot);
      if (huis && e.detail.taak.plek) huis.feestje(e.detail.taak.plek);
      setTimeout(() => { if (petVak) { petVak.classList.add('blij'); } }, 50);
    });
    document.addEventListener('pq-bedankt', () => { if (petVak) { petVak.classList.remove('blij'); void petVak.offsetWidth; petVak.classList.add('blij'); } });
  }
  // Taken met een plek in huis en hun signaal (glinster = dorstig, vraagteken = hangend), voor het huis.
  function huisTaken() {
    const nu = Date.now();
    return T.zichtbaar(nu).filter(x => x.t.plek).map(x => {
      const s = x.k ? x.k.stand : x.nodig ? R.STANDEN[2] : R.STANDEN[0];
      return { id: x.t.id, titel: x.t.titel, plek: x.t.plek, signaal: s.signaal, tekst: s.tekst };
    });
  }
  function uitgekomen() { return new Set(R.collectie(S.staat(), Date.now()).filter(c => c.uit).map(c => c.id)); }

  wortel.PQApp.scherm('vandaag', {
    maak, ververs: teken,
    toon() { teken(); huis.hervat(); },
    verberg() { huis.pauze(); },
  });
  wortel.PQVandaag = { huisTaken, uitgekomen };
})(window);
