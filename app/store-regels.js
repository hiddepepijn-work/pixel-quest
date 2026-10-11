// Spelregels van Pixel Quest (docs/puntensysteem.md, versie 2). Puur: geen DOM, geen opslag, geen Date.now().
// Alles krijgt de staat en een tijdstip mee, zodat dezelfde regels later op de server kunnen draaien.
// Werkt in de browser (window.PQRegels) en in node (module.exports).
(function (wortel) {
  'use strict';
  const DAG = 864e5;
  const P = {
    zwaarteFactor: 0.3,      // inzet = minuten × (1 + 0,3·zwaarte)
    zwaarteMax: 2,           // zwaarte ∈ {0, 1, 2} (puntensysteem §3)
    weekdoel: 600,           // weeknorm samen
    drempel: 0.8,            // week gehaald bij ≥ 80% van de (aangepaste) norm
    aandeel: { hidde: 0.5, tessie: 0.5 },   // afspraak 50/50: bepaalt hoeveel de norm zakt bij afwezigheid
    potPerInzet: 0.5,        // huispot: 0,5 munt per inzet, tot de weeknorm
    petGroei: [['ei', null], ['draakje', 0], ['jonge draak', 1500], ['draak', 5000]],
    petGroeiAnder: [['baby', 0], ['jong', 1500], ['volwassen', 5000]],
    langeKlus: 90,           // schildpadje: klussen van ≥ 90 min
    weekstartUur: 4,         // de week sluit maandag 04:00
  };

  // ---------- inzet ----------
  const inzetVan = t => Math.round((+t.minuten || 0) * (1 + P.zwaarteFactor * Math.min(P.zwaarteMax, Math.max(0, +t.zwaarte || 0))));

  // ---------- datum en week (lokale tijd; de week begint maandag 04:00) ----------
  const twee = n => String(n).padStart(2, '0');
  const dagSleutel = ms => { const d = new Date(ms); return `${d.getFullYear()}-${twee(d.getMonth() + 1)}-${twee(d.getDate())}`; };
  const uitSleutel = s => { const [j, m, d] = String(s).split('-').map(Number); return new Date(j, m - 1, d); };
  function weekVan(ms) {
    const d = new Date(ms - P.weekstartUur * 36e5);
    const maandag = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (d.getDay() + 6) % 7);
    return dagSleutel(maandag.getTime());
  }
  const weekStart = w => { const d = uitSleutel(w); d.setHours(P.weekstartUur, 0, 0, 0); return d.getTime(); };
  const weekPlus = (w, n) => { const d = uitSleutel(w); d.setDate(d.getDate() + 7 * n); return dagSleutel(d.getTime()); };
  const dagenVanWeek = w => Array.from({ length: 7 }, (_, i) => { const d = uitSleutel(w); d.setDate(d.getDate() + i); return dagSleutel(d.getTime()); });
  function weekNummer(w) {     // ISO-weeknummer van de maandag
    const d = uitSleutel(w); d.setDate(d.getDate() + 3);
    const jan4 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - jan4) / DAG - 3 + (jan4.getDay() + 6) % 7) / 7);
  }
  const maandVan = w => w.slice(0, 7);

  // ---------- behoefte-klok (puntensysteem §7) ----------
  const STANDEN = [
    { id: 'fris', tot: 0.7, tekst: 'Fris', icoon: '✿', signaal: null },
    { id: 'dorstig', tot: 1.0, tekst: 'Dorstig: bijna aan de beurt', icoon: '❀', signaal: 'glinster' },
    { id: 'hangend', tot: null, tekst: 'Hangend: klaar voor een beurt', icoon: '?', signaal: 'vraag' },
  ];
  function klok(taak, nu) {
    if (!taak.interval) return null;
    const laatst = taak.laatst != null ? taak.laatst : taak.gemaakt_op;
    const waarde = Math.max(0, (nu - laatst) / DAG / taak.interval);
    return { waarde, stand: STANDEN.find(s => s.tot == null || waarde < s.tot) };
  }
  function klokTekst(taak, nu) {
    const k = klok(taak, nu);
    if (!k) return '';
    const over = Math.round((1 - k.waarde) * taak.interval);
    if (over > 1) return `Over ~${over} dagen weer aan de beurt`;
    if (over === 1) return 'Morgen weer aan de beurt';
    if (over === 0) return 'Vandaag aan de beurt';
    return k.waarde < 2 ? 'Klaar voor een beurt' : 'Al even klaar voor een beurt';
  }

  // ---------- categorie (voor de eieren) uit de titel, tenzij de taak er zelf een heeft ----------
  const CATEGORIE = [
    ['afwas', /afwas|vaatwasser|vaat\b/i], ['planten', /plant/i], ['boodschappen', /boodschap/i],
    ['badkamer', /badkamer|wc\b|toilet|douche/i], ['afval', /afval|container|vuilnis|kliko|glasbak|papier weg/i],
    ['opruimen', /opruim|ruim .* op|stofzuig|dweil|stof/i], ['buiten', /tuin|blad|gras|heg|onkruid|ramen buiten|stoep|buiten/i],
  ];
  const categorieVan = t => t.categorie || (CATEGORIE.find(([, re]) => re.test(t.titel || '')) || [null])[0];

  // ---------- icoon van een taak: een bestaand item uit assets/items (eigen keuze, anders uit soort en titel) ----------
  const ICONEN = ['gieter', 'bezem', 'klembord', 'plant', 'rugzak', 'ster', 'hart', 'munt'];
  const SCHOON = /schoon|poets|lappen|dweil|soppen|stof|afwas|vaat|badkamer|wc\b|toilet|douche|opruim|ruim .* op|afval|container|vuilnis|kliko|glasbak|verschon/i;
  function icoonVan(t) {
    if (ICONEN.includes(t.icoon)) return t.icoon;
    const titel = t.titel || '', cat = categorieVan(t);
    if (/cadeau|verjaardag|date\b|bloemen|verrass/i.test(titel)) return 'hart';
    if (t.soort_werk === 'plannen' || t.soort_werk === 'bijhouden' || /administratie|agenda|plannen|regelen/i.test(titel)) return 'klembord';
    if (cat === 'planten' || /water geven/i.test(titel)) return 'gieter';
    if (cat === 'boodschappen' || /winkel|markt|apotheek/i.test(titel)) return 'rugzak';
    if (SCHOON.test(titel) || ['afwas', 'badkamer', 'opruimen', 'afval'].includes(cat)) return 'bezem';
    if (cat === 'buiten') return 'plant';
    return 'ster';
  }

  // ---------- taken: wie, claims, zichtbaarheid ----------
  const isSamen = t => t.eigenaar === 'samen';
  // Een claim geldt tot het eind van de volgende dag of tot de deadline (§6).
  function claimTot(op, deadline) {
    const d = new Date(op); d.setDate(d.getDate() + 2); d.setHours(0, 0, 0, 0);
    const eind = d.getTime();
    if (deadline) { const dl = uitSleutel(deadline); dl.setDate(dl.getDate() + 1); return Math.min(eind, dl.getTime()); }
    return eind;
  }
  // Effectieve eigenaar: een verlopen claim valt stil terug op het prikbord.
  function eigenaarNu(t, nu) {
    if (t.claim && t.claim.tot > nu) return t.claim.door;
    return t.eigenaar || null;
  }
  const zichtbaarVoor = (t, ik) => !t.prive || t.gemaakt_door === ik || t.eigenaar === ik;
  const actief = t => t.status !== 'klaar' && t.status !== 'weg';

  wortel.PQRegels = Object.assign(wortel.PQRegels || {}, {
    P, DAG, STANDEN, inzetVan, dagSleutel, uitSleutel, weekVan, weekStart, weekPlus, dagenVanWeek, weekNummer, maandVan,
    klok, klokTekst, categorieVan, ICONEN, icoonVan, isSamen, claimTot, eigenaarNu, zichtbaarVoor, actief,
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = wortel.PQRegels;
})(typeof window !== 'undefined' ? window : globalThis);
