// Winkeldata van Pixel Quest (docs/winkel.md): alles wat de winkel zelf bepaalt en niet uit de gegenereerde bestanden
// komt. Kleding (items, sets, prijzen, kleuren, status) leest de winkel uit PQ_KAST (assets/kast.js), meubels uit
// PQ_HUIS (assets/huis.js). Dit bestand voegt toe:
//   - de startkast (gratis per persoon), de zeldzame kleuren (alleen als drop) en de stel-sets (alleen via mijlpalen);
//   - de prijzen van meubels en het extra decor (placeholders in dezelfde code-tekenstijl als de meubels van het huis);
//   - de spelregels van de winkel: kortingen, rotatie per week en mijlpalen voor drops.
// Laden: na assets/kleding.js en assets/huis.js, vóór figuur.js (de zeldzame kleurrampen moeten er dan al zijn).
(function (wortel) {
  'use strict';

  const W = {
    // Startkast volgens de spec: per persoon 1 shirt, 1 broek, 1 paar schoenen en de pyjama gratis, in de basiskleur.
    // Per slot de eerste id die getekend is (status 'klaar') en voor dat lichaam bestaat. Een item dat nog op art
    // wacht (de pyjama), komt vanzelf in de kast zodra het getekend is.
    startkast: { boven: ['tshirt_basis'], onder: ['broek_basis'], schoenen: ['sneakers_basis'], heel_lichaam: ['pyjama'] },

    korting: {
      set: 0.2,          // setprijs = som min 20%, naar rato: 0,8 × de som van wat je nog niet hebt
      kleur: 0.5,        // een extra kleur van een item dat je al hebt: de helft van de prijs (afgerond op 5, minstens 10)
    },
    rotatie: {
      kleurSlots: 8,     // gewone winkelslots: zoveel extra kleuren per week, op volgorde door de hele kast
      uitgelichtItems: 3,
    },

    // Zeldzame kleuren: niet te koop, alleen als drop. Elke kleur is een kleurramp (5 stops, donker naar licht) die
    // bij het laden aan PQ_KLEDING.rampen wordt toegevoegd, zodat het bestaande kleursysteem ze gewoon kan tekenen.
    zeldzaam: {
      glitter: { naam: 'Glitter', stops: ['#6b4a7a', '#c76fa8', '#f2a7c8', '#ffe1ef', '#fffaf0'] },
      regenboog: { naam: 'Regenboog', stops: ['#4a3a8c', '#2f8fbf', '#5fb85a', '#f2c94c', '#ffd6e8'] },
      lentetint: { naam: 'Lentetint', seizoen: 'lente', stops: ['#7a4f6a', '#c9789a', '#f0a8c0', '#f8cfdc', '#fdeef2'] },
      zomertint: { naam: 'Zomertint', seizoen: 'zomer', stops: ['#7a5a1e', '#c8902a', '#f5c542', '#fbe08a', '#fff4cf'] },
      herfsttint: { naam: 'Herfsttint', seizoen: 'herfst', stops: ['#5a2a1a', '#a4471e', '#e0782a', '#f2a65a', '#f9d6a8'] },
      wintertint: { naam: 'Wintertint', seizoen: 'winter', stops: ['#2a3f5f', '#4f7fa8', '#8ec3e0', '#c8e6f2', '#f0fafd'] },
    },

    // Drops bij samen-mijlpalen en streaks (herhaalbaar, nooit te koop). Elke drop geeft Hidde én Tessie een zeldzame
    // kleur van een item dat ze al hebben. Een sleutel ('gehaald:6') wordt maar één keer uitgedeeld.
    drops: [
      { teller: 'gehaald', elke: 3, tekst: n => `${n} gehaalde weken samen` },
      { teller: 'record', elke: 4, tekst: n => `een streak van ${n} weken` },
    ],

    // Stel-sets: bijpassende looks voor allebei. Niet te koop; ze komen vrij bij een gezamenlijke mijlpaal (stats uit
    // PQRegels.stats). Items die nog op art wachten, komen in de kast zodra ze getekend zijn.
    stelsets: [
      { id: 'samen_warm', naam: 'Samen warm', omschrijving: 'Dezelfde puffer, muts en sjaal voor de winterwandeling.',
        voorwaarde: { teller: 'gehaald', doel: 4, tekst: '4 gehaalde weken' },
        look: { hidde: [['puffer', 'petrol'], ['beanie', 'nacht'], ['sjaal', 'goud']], tessie: [['puffer', 'petrol'], ['beanie', 'nacht'], ['sjaal', 'goud']] } },
      { id: 'date_night', naam: 'Date night', omschrijving: 'Netjes uit eten: spijkerjas en bril, teddyjas en oorbellen.',
        voorwaarde: { teller: 'gehaald', doel: 8, tekst: '8 gehaalde weken' },
        look: { hidde: [['spijkerjas', 'nacht'], ['bril', 'goud'], ['overhemd', 'creme']], tessie: [['teddyjas', 'creme'], ['oorbellen', 'goud'], ['jurk', 'bordeaux']] } },
      { id: 'zondagochtend', naam: 'Zondagochtend', omschrijving: 'Matchende hoodie, joggingbroek en sloffen voor een luie ochtend.',
        voorwaarde: { teller: 'samen', doel: 10, tekst: '10 samen-taken' },
        look: { hidde: [['hoodie_basic', 'lavendel'], ['joggingbroek', 'lavendel'], ['sloffen', 'creme']], tessie: [['hoodie_basic', 'lavendel'], ['joggingbroek', 'lavendel'], ['sloffen', 'creme']] } },
      { id: 'pyjamafeest', naam: 'Pyjamafeest', omschrijving: 'Dezelfde onesie voor een filmavond op de bank.',
        voorwaarde: { teller: 'bedankjes', doel: 15, tekst: '15 bedankjes aan elkaar' },
        look: { hidde: [['onesie', 'mos']], tessie: [['onesie', 'mos']] } },
    ],

    // Meubels uit assets/huis.js die niet in de startinrichting staan, met hun prijs. Vaste delen van een kamer
    // (keukenblok, bad, douche, inloopkast ...) zitten niet in de winkel: die komen met de verbouwing.
    meubelprijs: {
      lamp: 50, kamerplant: 45, salontafel: 60, mand: 35, nachtkastje: 40, bureau: 80, boekenkast: 90, leesstoel: 70,
      tafel: 90, opbergkist: 50, logeerbed: 110, tuinbank: 70, bloembak: 35, tuinstoel: 30, balkontafel: 30, ligbed: 60,
      parasol: 50, loungebank: 140, kijker: 75, palm: 60, serrestoel: 55,
    },
    // Groepen voor de filterchips in de afdeling Meubels.
    meubelgroep: {
      planten: ['kamerplant', 'palm', 'monstera', 'hangplant', 'cactus', 'bloembak', 'moestuin'],
      lampen: ['lamp', 'wandlamp', 'lantaarn'],
      muur: ['zeegezicht', 'poster', 'fotolijstjes', 'spiegel', 'klok'],
      buiten: ['tuinbank', 'tuinstoel', 'balkontafel', 'ligbed', 'parasol', 'loungebank', 'vogelhuisje', 'lantaarn', 'moestuin', 'bloembak'],
    },
  };

  // Extra decor voor de winkel. PLACEHOLDER: getekend in code, in dezelfde stijl als de meubels in assets/huis.js
  // (delen in drie tinten, textuur, outline; schema in docs/huis.md). Een sprite vervangt ze later zonder codewijziging.
  const KUNST = ['woonkamer', 'woonkeuken', 'keuken', 'werkkamer', 'master', 'slaapkamer', 'slaaphoek', 'logeerkamer'];
  const BINNEN = ['woonkamer', 'woonkeuken', 'slaapkamer', 'slaaphoek', 'werkkamer', 'master', 'logeerkamer'];
  W.decor = {
    // Berber vloerkleed, 150 cm, met franjes.
    kleed: { naam: 'Vloerkleed', op: 'vrij', hoort: BINNEN, prijs: 30, maat: [64, 3], delen: [
      { x: 0, y: 0, b: 64, h: 3, k: 'koraal.3', t: 'stof', vlak: true }, { x: 4, y: 1, b: 56, h: 1, k: 'creme.4', vlak: true },
      { x: -2, y: 1, b: 2, h: 2, k: 'creme.3', vlak: true }, { x: 64, y: 1, b: 2, h: 2, k: 'creme.3', vlak: true }] },
    // Messing wandlampje met linnen kapje, gaat 's avonds aan.
    wandlamp: { naam: 'Wandlamp', op: 'muur', hoort: BINNEN.concat(['keuken']), prijs: 35, maat: [10, 16], licht: [{ x: 5, y: 6, r: 26 }], delen: [
      { x: 4, y: 7, b: 2, h: 7, k: 'goud.2', t: 'metaal', vlak: true }, { x: 3, y: 13, b: 4, h: 3, k: 'goud.1', vlak: true },
      { x: 0, y: 0, b: 10, h: 8, k: 'papier.3', vorm: 'kap', t: 'stof', licht: 'kap' }] },
    // Hangplant in een macramé-hanger.
    hangplant: { naam: 'Hangplant', op: 'muur', hoort: ['woonkamer', 'woonkeuken', 'keuken', 'werkkamer', 'serre', 'slaapkamer', 'slaaphoek', 'badkamer'], prijs: 30, maat: [20, 30], delen: [
      { x: 9, y: 0, b: 1, h: 10, k: 'hazelnoot.3', vlak: true }, { x: 5, y: 3, b: 1, h: 7, k: 'hazelnoot.3', vlak: true }, { x: 14, y: 3, b: 1, h: 7, k: 'hazelnoot.3', vlak: true },
      { x: 1, y: 13, b: 7, h: 15, k: 'blad.2', t: 'blad', vorm: 'ovaal' }, { x: 12, y: 14, b: 7, h: 16, k: 'blad.3', t: 'blad', vorm: 'ovaal' },
      { x: 4, y: 9, b: 12, h: 8, k: 'creme.3', t: 'stuc', r: 2 }, { x: 6, y: 5, b: 9, h: 6, k: 'mos.2', t: 'blad', vorm: 'ovaal' }] },
    // Monstera van 130 cm in een terracotta pot.
    monstera: { naam: 'Monstera', op: 'vloer', hoort: ['woonkamer', 'woonkeuken', 'werkkamer', 'master', 'logeerkamer', 'serre', 'slaapkamer'], prijs: 55, maat: [34, 58], delen: [
      { x: 16, y: 20, b: 2, h: 24, k: 'blad.1', vlak: true }, { x: 10, y: 24, b: 6, h: 1, k: 'blad.1', vlak: true },
      { x: 0, y: 10, b: 16, h: 14, k: 'blad.2', t: 'blad', vorm: 'ovaal' }, { x: 17, y: 6, b: 17, h: 15, k: 'blad.2', t: 'blad', vorm: 'ovaal' },
      { x: 7, y: 0, b: 15, h: 13, k: 'blad.3', t: 'blad', vorm: 'ovaal' }, { x: 3, y: 24, b: 12, h: 10, k: 'mos.2', t: 'blad', vorm: 'ovaal' },
      { x: 20, y: 22, b: 13, h: 11, k: 'blad.2', t: 'blad', vorm: 'ovaal' },
      { x: 9, y: 44, b: 16, h: 14, k: 'koraal.1', t: 'stuc', r: 2 }, { x: 8, y: 43, b: 18, h: 3, k: 'koraal.2', r: 1 }] },
    // Cactusje in een potje, past op een plank of tafel.
    cactus: { naam: 'Cactus', op: 'vrij', hoort: ['woonkamer', 'woonkeuken', 'keuken', 'werkkamer', 'slaapkamer', 'slaaphoek', 'badkamer', 'master'], prijs: 15, maat: [10, 16], delen: [
      { x: 0, y: 3, b: 3, h: 5, k: 'mos.2', r: 1 }, { x: 7, y: 2, b: 3, h: 4, k: 'mos.3', r: 1 },
      { x: 3, y: 0, b: 4, h: 11, k: 'mos.2', r: 1 }, { x: 4, y: -1, b: 2, h: 2, k: 'koraal.3', vlak: true },
      { x: 1, y: 10, b: 8, h: 6, k: 'koraal.2', t: 'stuc', r: 1 }] },
    // Drie fotolijstjes (nog zonder foto's).
    fotolijstjes: { naam: 'Fotolijstjes', op: 'muur', hoort: KUNST, prijs: 25, maat: [40, 22], delen: [
      { x: 0, y: 4, b: 12, h: 16, k: 'nacht.2', vlak: true }, { x: 1, y: 5, b: 10, h: 14, k: 'petrol.4', vlak: true }, { x: 2, y: 12, b: 8, h: 6, k: 'blad.3', vorm: 'boog' },
      { x: 14, y: 0, b: 12, h: 12, k: 'eik.3', vlak: true }, { x: 15, y: 1, b: 10, h: 10, k: 'abrikoos.4', vlak: true }, { x: 18, y: 3, b: 4, h: 4, k: 'koraal.3', vorm: 'ovaal' },
      { x: 28, y: 6, b: 12, h: 16, k: 'goud.2', vlak: true }, { x: 29, y: 7, b: 10, h: 14, k: 'lavendel.4', vlak: true }, { x: 31, y: 13, b: 6, h: 7, k: 'lavendel.2', vorm: 'boog' }] },
    // Ronde spiegel van 55 cm in een messing rand.
    spiegel: { naam: 'Spiegel', op: 'muur', hoort: ['slaapkamer', 'slaaphoek', 'master', 'badkamer', 'ensuite', 'logeerkamer'], prijs: 40, maat: [24, 32], delen: [
      { x: 0, y: 0, b: 24, h: 32, k: 'goud.2', vorm: 'ovaal', t: 'metaal' }, { x: 2, y: 2, b: 20, h: 28, k: 'petrol.4', vorm: 'ovaal', t: 'spiegel' }] },
    // Stationsklok.
    klok: { naam: 'Wandklok', op: 'muur', hoort: ['woonkamer', 'woonkeuken', 'keuken', 'werkkamer'], prijs: 30, maat: [16, 16], delen: [
      { x: 0, y: 0, b: 16, h: 16, k: 'nacht.2', vorm: 'ovaal' }, { x: 1, y: 1, b: 14, h: 14, k: 'creme.4', vorm: 'ovaal' },
      { x: 7, y: 3, b: 1, h: 5, k: 'nacht.1', vlak: true }, { x: 7, y: 7, b: 4, h: 1, k: 'nacht.1', vlak: true }] },
    // Wandkunst: zeegezicht met zonsondergang in een koffiebruine lijst.
    zeegezicht: { naam: 'Wandkunst: zee', op: 'muur', hoort: KUNST, prijs: 45, maat: [48, 30], delen: [
      { x: 0, y: 0, b: 48, h: 30, k: 'koffie.2', vlak: true }, { x: 2, y: 2, b: 44, h: 26, k: 'abrikoos.4', vlak: true },
      { x: 30, y: 6, b: 7, h: 7, k: 'goud.3', vorm: 'ovaal' }, { x: 2, y: 15, b: 44, h: 13, k: 'petrol.2', t: 'water', vlak: true },
      { x: 12, y: 12, b: 10, h: 4, k: 'creme.4', vorm: 'boog' }] },
    // Poster met een zon, vastgeplakt met een stukje tape.
    poster: { naam: 'Poster', op: 'muur', hoort: ['slaapkamer', 'slaaphoek', 'werkkamer', 'logeerkamer', 'woonkamer'], prijs: 20, maat: [26, 36], delen: [
      { x: 0, y: 0, b: 26, h: 36, k: 'creme.4', vlak: true }, { x: 3, y: 3, b: 20, h: 20, k: 'koraal.3', vorm: 'ovaal' },
      { x: 4, y: 26, b: 18, h: 2, k: 'nacht.2', vlak: true }, { x: 4, y: 30, b: 12, h: 2, k: 'nacht.3', vlak: true },
      { x: 11, y: -1, b: 4, h: 3, k: 'papier.3', vlak: true }] },
    // Vogelhuisje op een paal, voor de tuin.
    vogelhuisje: { naam: 'Vogelhuisje', op: 'vloer', hoort: ['tuin', 'zwembad'], prijs: 45, maat: [16, 52], delen: [
      { x: 7, y: 16, b: 2, h: 36, k: 'eik.2', t: 'hout', vlak: true }, { x: 2, y: 6, b: 12, h: 12, k: 'koraal.2', t: 'hout' },
      { x: 0, y: 1, b: 16, h: 6, k: 'nacht.2', vorm: 'kap' }, { x: 6, y: 10, b: 4, h: 4, k: 'nacht.1', vorm: 'ovaal' }] },
    // Lantaarn met een kaarsje, gaat 's avonds aan.
    lantaarn: { naam: 'Lantaarn', op: 'vloer', hoort: ['tuin', 'terras', 'balkon', 'zwembad'], prijs: 40, maat: [12, 22], licht: [{ x: 6, y: 12, r: 22 }], delen: [
      { x: 4, y: 0, b: 4, h: 3, k: 'nacht.2', vorm: 'boog' }, { x: 0, y: 3, b: 12, h: 3, k: 'nacht.2', r: 1 },
      { x: 2, y: 6, b: 8, h: 13, k: 'papier.4', licht: 'kap' }, { x: 1, y: 6, b: 1, h: 13, k: 'nacht.2', vlak: true }, { x: 10, y: 6, b: 1, h: 13, k: 'nacht.2', vlak: true },
      { x: 1, y: 19, b: 10, h: 3, k: 'nacht.2', t: 'metaal' }] },
    // Moestuinbak met sla en tomaten.
    moestuin: { naam: 'Moestuinbak', op: 'vloer', hoort: ['tuin'], prijs: 60, maat: [48, 20], delen: [
      { x: 4, y: 0, b: 8, h: 8, k: 'blad.2', t: 'blad', vorm: 'ovaal' }, { x: 14, y: 2, b: 6, h: 6, k: 'mos.3', t: 'blad', vorm: 'ovaal' },
      { x: 22, y: 0, b: 8, h: 8, k: 'blad.3', t: 'blad', vorm: 'ovaal' }, { x: 32, y: 1, b: 7, h: 7, k: 'mos.2', t: 'blad', vorm: 'ovaal' },
      { x: 40, y: 0, b: 6, h: 8, k: 'blad.2', t: 'blad', vorm: 'ovaal' }, { x: 7, y: 3, b: 2, h: 2, k: 'koraal.3', vlak: true }, { x: 25, y: 3, b: 2, h: 2, k: 'koraal.3', vlak: true },
      { x: 2, y: 7, b: 44, h: 3, k: 'koffie.2', vlak: true }, { x: 0, y: 8, b: 48, h: 12, k: 'eik.3', t: 'hout' }] },
  };

  // ---------- registreren bij de bestaande systemen ----------
  // Zeldzame kleuren als kleurramp (figuur.js leest de rampen bij het laden); decor als meubel in PQ_HUIS.
  const D = wortel.PQ_KLEDING;
  if (D && D.rampen) for (const [id, z] of Object.entries(W.zeldzaam)) if (!D.rampen[id]) D.rampen[id] = { basis: z.stops[2], stops: z.stops.slice() };
  const H = wortel.PQ_HUIS;
  if (H && H.meubels) {
    for (const [id, d] of Object.entries(W.decor)) {
      if (H.meubels[id]) continue;
      H.meubels[id] = Object.assign({ prioriteit: 1, placeholder: true, sprite: null, winkel: true }, d);
    }
  }
  wortel.PQ_WINKELDATA = W;
})(typeof window !== 'undefined' ? window : globalThis);
