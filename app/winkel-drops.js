// Winkelregels, deel 2: drops (zeldzame kleuren bij samen-mijlpalen en streaks), stel-sets, de afgeleide kast
// (startkast en vrijgekomen stel-sets), set-glinstering, aankoopgeschiedenis en spaartijd. Puur, zoals winkel-regels.js.
(function (wortel) {
  'use strict';
  const P = wortel.PQWinkel, W = () => wortel.PQ_WINKELDATA, R = () => wortel.PQRegels;
  const { FIDS, item, voor, bezitVan, hash } = P;

  // ---------- mijlpalen ----------
  const tellers = (st, nu) => Object.assign({}, R().stats(st, nu), { record: R().weken(st, nu).record });
  const drops = st => (st.winkel && Array.isArray(st.winkel.drops) ? st.winkel.drops : []);
  const gedropt = (st, sleutel) => drops(st).some(d => d.sleutel === sleutel);
  // Alle bereikte mijlpalen (ook al uitgedeelde): kleur-drops per 'elke' stappen, en stel-sets.
  function mijlpalen(st, nu) {
    const t = tellers(st, nu), uit = [];
    for (const d of W().drops) for (let n = d.elke; n <= (t[d.teller] || 0); n += d.elke) uit.push({ sleutel: `${d.teller}:${n}`, soort: 'kleur', tekst: d.tekst(n) });
    for (const s of W().stelsets) if ((t[s.voorwaarde.teller] || 0) >= s.voorwaarde.doel) uit.push({ sleutel: 'stelset:' + s.id, soort: 'stelset', tekst: s.voorwaarde.tekst });
    return uit;
  }
  const openDrops = (st, nu) => mijlpalen(st, nu).filter(m => !gedropt(st, m.sleutel));
  // Wat komt er hierna (voor de afdeling Zeldzaam): per soort drop de volgende stap en de stand.
  function volgende(st, nu) {
    const t = tellers(st, nu);
    return W().drops.map(d => { const nu2 = t[d.teller] || 0, doel = (Math.floor(nu2 / d.elke) + 1) * d.elke; return { teller: d.teller, stand: nu2, doel, tekst: d.tekst(doel), vanaf: doel - d.elke }; });
  }
  function stelsets(st, nu) {
    const t = tellers(st, nu);
    return W().stelsets.map(s => ({ ...s, stand: Math.min(s.voorwaarde.doel, t[s.voorwaarde.teller] || 0), vrij: gedropt(st, 'stelset:' + s.id) }));
  }

  // ---------- inhoud van een drop (deterministisch uit de sleutel en de staat) ----------
  function seizoen(ms) { const m = new Date(ms).getMonth(); return m >= 2 && m <= 4 ? 'lente' : m >= 5 && m <= 7 ? 'zomer' : m >= 8 && m <= 10 ? 'herfst' : 'winter'; }
  function dropKleur(sleutel, tijd) {
    const [teller, n] = sleutel.split(':'), d = W().drops.find(x => x.teller === teller);
    if (teller === 'gehaald') return (Math.round(+n / (d ? d.elke : 3)) % 2) ? 'glitter' : 'regenboog';
    return Object.keys(W().zeldzaam).find(k => W().zeldzaam[k].seizoen === seizoen(tijd)) || 'glitter';
  }
  // Per persoon een item dat je al hebt (getekend, voor jouw lichaam) in een zeldzame kleur die je nog niet hebt.
  function dropInhoud(st, sleutel, tijd) {
    if (sleutel.startsWith('stelset:')) return { soort: 'stelset', stelset: sleutel.slice(8), items: [] };
    const eerst = dropKleur(sleutel, tijd), volgorde = [eerst, ...Object.keys(W().zeldzaam).filter(k => k !== eerst)];
    const uit = [];
    for (const fid of FIDS) {
      const heb = bezitVan(st, fid);
      const kandidaten = Object.keys(heb).sort().map(item).filter(it => it && it.status === 'klaar' && voor(it, fid));
      for (const kleur of volgorde) {
        const vrij = kandidaten.filter(it => !(heb[it.id] || []).includes(kleur));
        if (!vrij.length) continue;
        uit.push({ fid, item: vrij[hash(sleutel + fid) % vrij.length].id, kleur });
        break;
      }
    }
    return { soort: 'kleur', kleur: eerst, items: uit };
  }

  // ---------- de afgeleide kast: startkast en vrijgekomen stel-sets (bij elke opbouw opnieuw, idempotent) ----------
  // Zo komt een item dat later getekend wordt (de pyjama) vanzelf in de kast, ook bij een bestaand log.
  function afgeleid(st) {
    if (!st || !st.kleding || !st.huis) return st;
    const b = st.kleding.bezit = st.kleding.bezit || {};
    const geef = (fid, it, kleur) => {
      const k = it.kleuren.includes(kleur) ? kleur : it.kleuren[0];
      const kast = b[fid] = b[fid] && typeof b[fid] === 'object' ? b[fid] : {};
      const lijst = kast[it.id] = Array.isArray(kast[it.id]) ? kast[it.id] : [];
      if (!lijst.includes(k)) lijst.push(k);
    };
    for (const fid of FIDS) for (const it of P.startkast(fid)) geef(fid, it, it.kleuren[0]);
    for (const d of drops(st)) {
      if (d.soort !== 'stelset') continue;
      const s = W().stelsets.find(x => x.id === d.stelset);
      if (!s) continue;
      for (const fid of FIDS) for (const [id, kleur] of s.look[fid] || []) { const it = item(id); if (it && it.status === 'klaar' && voor(it, fid)) geef(fid, it, kleur); }
    }
    return st;
  }

  // ---------- set dragen = glinstering in huis (alleen cosmetisch) ----------
  // Een set telt als gedragen als elk slot van de set (met minstens 2 slots, getekend, voor dit lichaam) een item
  // uit die set draagt. De startkast telt niet. Geeft de naam van de set, of null.
  function glinster(look, fid) {
    if (!look) return null;
    const kandidaten = P.sets().filter(s => !P.isStartSet(s)).map(s => ({ naam: s.naam, delen: P.setDelen(s, fid).getekend }))
      .concat(W().stelsets.map(s => ({ naam: s.naam, delen: (s.look[fid] || []).map(([id]) => item(id)).filter(it => it && it.status === 'klaar' && voor(it, fid)) })));
    for (const k of kandidaten) {
      const slots = [...new Set(k.delen.map(it => it.slot))];
      if (slots.length < 2) continue;
      if (slots.every(sl => look[sl] && k.delen.some(it => it.slot === sl && it.id === look[sl].item))) return k.naam;
    }
    return null;
  }

  // ---------- aankoopgeschiedenis en spaartijd ----------
  const aankopen = st => (st.voorstellen || []).filter(v => v.status === 'akkoord').slice().sort((a, b) => (b.akkoord_op || b.op) - (a.akkoord_op || a.op));
  // Spaartijd: hoeveel dagen een volle week (0,5 × de norm) nodig heeft voor een bedrag. Samen of per persoon (de helft).
  function dagen(bedrag, st, nu, perPersoon) {
    const perDag = R().pot(st, nu).maxWeek / 7 / (perPersoon ? 2 : 1);
    return perDag > 0 ? Math.max(1, Math.ceil(bedrag / perDag)) : null;
  }

  Object.assign(P, { tellers, drops, gedropt, mijlpalen, openDrops, volgende, stelsets, seizoen, dropKleur, dropInhoud, afgeleid, glinster, aankopen, dagen });
})(typeof window !== 'undefined' ? window : globalThis);
