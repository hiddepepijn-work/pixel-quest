// Spelregels, deel 2: weekdoel, streak, huispot, pet en eieren (puntensysteem §8–§10). Puur, zoals store-regels.js.
(function (wortel) {
  'use strict';
  const R = wortel.PQRegels || (typeof require === 'function' ? require('./store-regels.js') : null);
  const { P } = R;

  // Weekdoel dat in week w geldt (een wijziging gaat de week erna in; app-ontwerp §2.8).
  function weekdoelVoor(st, w) {
    let v = P.weekdoel;
    for (const d of st.weekdoel || []) if (d.vanaf <= w) v = d.waarde;
    return v;
  }
  // Norm na afwezigheid: per afwezige dag zakt de norm met diens aandeel; samen weg = 0 voor die dag (§8).
  function normVoor(st, w) {
    if ((st.rustweken || []).includes(w)) return 0;
    const basis = weekdoelVoor(st, w), perDag = basis / 7;
    let norm = basis;
    for (const dag of R.dagenVanWeek(w)) {
      const weg = (st.afwezig || []).filter(a => a.van <= dag && dag <= a.tot);
      if (weg.some(a => a.wie === 'samen')) { norm -= perDag; continue; }
      const aandeel = ['hidde', 'tessie'].filter(p => weg.some(a => a.wie === p)).reduce((s, p) => s + P.aandeel[p], 0);
      norm -= perDag * Math.min(1, aandeel);
    }
    return Math.max(0, Math.round(norm));
  }
  const telt = a => !a.ongedaan && !a.prive;
  const totaalVan = (st, w) => (st.afrondingen || []).filter(a => telt(a) && a.week === w).reduce((s, a) => s + a.inzet, 0);

  // Alle weken van de start tot nu, met gehaald, rustweek, bevroren, streak en record.
  // Een gesloten week die niet gehaald is, gebruikt automatisch de rustweek van die maand (1 per kalendermaand).
  function weken(st, nu) {
    const nuW = R.weekVan(nu), lijst = [];
    const eerste = Math.min(st.start || nu, nu, ...(st.afrondingen || []).map(a => a.op));
    let w = R.weekVan(eerste), streak = 0, record = 0, gehaaldTotaal = 0;
    const rustGebruikt = {};
    for (const r of st.rustweken || []) rustGebruikt[R.maandVan(r)] = true;
    for (let i = 0; w <= nuW && i < 600; i++, w = R.weekPlus(w, 1)) {
      const norm = normVoor(st, w), totaal = totaalVan(st, w), open = w === nuW;
      const rec = { week: w, norm, totaal, open, gehaald: false, bevroren: norm === 0, rustweek: (st.rustweken || []).includes(w) };
      // De week waarin de app begon, is maar half gespeeld: niet gehaald kost dan geen rustweek en breekt niets.
      const aanloop = st.start != null && w === R.weekVan(st.start) && st.start > R.weekStart(w) + 864e5 / 2;
      if (!rec.bevroren && totaal >= P.drempel * norm) { rec.gehaald = true; streak++; gehaaldTotaal++; }
      else if (aanloop && !open) rec.aanloop = true;
      else if (!rec.bevroren && !open) {
        if (!rustGebruikt[R.maandVan(w)]) { rustGebruikt[R.maandVan(w)] = true; rec.rustweek = true; }
        else streak = 0;
      }
      record = Math.max(record, streak);
      rec.streak = streak; rec.record = record;
      lijst.push(rec);
    }
    return { lijst, nu: lijst[lijst.length - 1], streak, record, gehaald: gehaaldTotaal };
  }
  // Is de rustweek van de maand van w nog vrij? Aangekondigd telt, en (met nu) ook een rustweek die een gesloten,
  // niet-gehaalde week die maand al automatisch gebruikte; anders zou een aankondiging achteraf de streak breken.
  function rustweekVrij(st, w, nu) {
    const maand = R.maandVan(w);
    if ((st.rustweken || []).some(r => R.maandVan(r) === maand)) return false;
    if (nu == null) return true;
    return !weken(st, nu).lijst.some(r => !r.open && r.rustweek && R.maandVan(r.week) === maand);
  }

  // ---------- huispot (§10): 0,5 munt per inzet, per week hooguit tot de norm ----------
  function pot(st, nu) {
    const wk = weken(st, nu);
    const inkomen = wk.lijst.reduce((s, r) => s + Math.floor(P.potPerInzet * Math.min(r.totaal, r.norm)), 0);
    const uit = (st.voorstellen || []).filter(v => v.status === 'akkoord').reduce((s, v) => s + v.prijs, 0);
    const dezeWeek = Math.floor(P.potPerInzet * Math.min(wk.nu.totaal, wk.nu.norm));
    return { saldo: inkomen - uit, inkomen, uit, dezeWeek, maxWeek: Math.floor(P.potPerInzet * wk.nu.norm) };
  }

  // ---------- pet (§9) ----------
  const samenInzet = st => (st.afrondingen || []).filter(telt).reduce((s, a) => s + a.inzet, 0);
  function stats(st, nu) {
    const af = (st.afrondingen || []).filter(telt), wk = weken(st, nu);
    const tel = f => af.filter(f).length;
    const maand = ms => new Date(ms).getMonth();
    return {
      gehaald: wk.gehaald, bedankjes: (st.bedankjes || []).length, opTijd: tel(a => a.op_tijd),
      planten: tel(a => a.categorie === 'planten'), boodschappen: tel(a => a.categorie === 'boodschappen'),
      lang: tel(a => a.minuten >= P.langeKlus), badkamer: tel(a => a.categorie === 'badkamer'),
      overnames: st.overnames || 0, afwas: tel(a => a.categorie === 'afwas'), samen: tel(a => a.samen),
      buitenHerfst: tel(a => a.categorie === 'buiten' && [8, 9, 10].includes(maand(a.op))),
      opruimen: tel(a => a.categorie === 'opruimen' || a.categorie === 'afval'),
    };
  }
  // De collectie: draakje (start) + 13 eieren die uitkomen op samen-mijlpalen.
  const EIEREN = [
    ['draakje', 'gehaald', 1, 'de eerste gehaalde week'],
    ['konijntje', 'gehaald', 2, '2 gehaalde weken'], ['hondje', 'gehaald', 4, '4 gehaalde weken'],
    ['katje', 'bedankjes', 10, '10 bedankjes'], ['parkietje', 'opTijd', 10, '10 taken op tijd'],
    ['kikkertje', 'planten', 20, '20× planten water'], ['cavia', 'boodschappen', 8, '8× boodschappen'],
    ['schildpadje', 'lang', 3, '3 lange klussen'], ['salamander', 'badkamer', 6, '6× badkamer'],
    ['kameleon', 'overnames', 5, '5 overnames'], ['haaitje', 'afwas', 30, '30× afwas'],
    ['ottertje', 'samen', 10, '10 samen-taken'], ['egeltje', 'buitenHerfst', 5, '5 buitentaken in de herfst'],
    ['varkentje', 'opruimen', 10, '10× opruimen of afval'],
  ].map(([id, teller, doel, tekst]) => ({ id, teller, doel, tekst }));
  function collectie(st, nu) {
    const s = stats(st, nu);
    return EIEREN.map(e => ({ ...e, stand: Math.min(e.doel, s[e.teller]), uit: s[e.teller] >= e.doel }));
  }
  function pet(st, nu) {
    const id = (st.pets && st.pets.actief) || 'draakje';
    const col = collectie(st, nu), mijn = col.find(c => c.id === id) || col[0];
    const xp = Math.max(0, samenInzet(st) - ((st.pets && st.pets.start && st.pets.start[id]) || 0));
    const tabel = id === 'draakje' ? P.petGroei.slice(1) : P.petGroeiAnder;
    let stadium = tabel[0][0], volgende = null;
    for (let i = 0; i < tabel.length; i++) if (xp >= tabel[i][1]) { stadium = tabel[i][0]; volgende = tabel[i + 1] || null; }
    if (!mijn.uit) return { id, ei: true, stadium: 'ei', xp, vanaf: 0, tot: null, ei_tekst: mijn.tekst, ei_stand: mijn.stand, ei_doel: mijn.doel };
    const vanaf = tabel.find(t => t[0] === stadium)[1];
    return { id, ei: false, stadium, xp, vanaf, tot: volgende ? volgende[1] : null, volgende: volgende && volgende[0] };
  }

  Object.assign(R, { weekdoelVoor, normVoor, totaalVan, weken, rustweekVrij, pot, samenInzet, stats, EIEREN, collectie, pet, telt });
})(typeof window !== 'undefined' ? window : globalThis);
