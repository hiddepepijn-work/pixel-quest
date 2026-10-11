// Beweging: welke stukken van de bestaande sprites procedureel bewegen (loopcycli, staart, kop, vleugel, oog).
// Met de hand bewerkbaar. Coördinaten in native artpx van het sprite (pets 80 x 72, anker 40,68); huis-anim.js
// rekent ze om naar bronpixels met bronpx_per_artpixel uit het manifest. Er wordt niets nieuw getekend: elk frame is
// een verschuiving van bestaande pixels (rijen of kolommen), zie docs/huis.md "Beweging".
//   rect: [x0, y0, x1, y1] (x1/y1 exclusief). groep: 0/1 = diagonaal paar in de gang (0 = linksvoor + rechtsachter).
//   basis: waar een staart vastzit ('onder', 'rechts', 'links'); de punt beweegt het meest.
window.PQ_BEWEGING = {
  versie: 1,
  // Hidde en Tessie: heup, kruis, enkel en de beenscheiding worden gemeten uit de zonekaart (kleding.js).
  // pas: staplengte in artpx (de voet op de grond schuift per frame precies 1 artpx terug, dus 2 x pas frames per
  // cyclus); til: hoe hoog de zwaaivoet komt; deining: 1 artpx omhoog in de passeerfase.
  mensen: {
    pas: 6, til: 2, deining: 1, adem: 1, snelheid: 15,
    hidde: { kijk: 'rechts' },
    tessie: { kijk: 'links' },
  },
  pets: {
    hondje: {
      soort: 'viervoeter', kijk: 'voor', pas: 6, til: 2, deining: 2, snelheid: 22,
      poten: [
        { rect: [0, 56, 24, 68], groep: 1 },
        { rect: [24, 55, 33, 68], groep: 0 },
        { rect: [33, 55, 45, 68], groep: 1 },
        { rect: [45, 55, 80, 68], groep: 0 },
      ],
      staart: { rect: [50, 37, 66, 53], basis: 'onder', zwaai: 2 },
      kop: { rect: [15, 16, 53, 45], dip: 3 },
    },
    katje: {
      soort: 'viervoeter', kijk: 'voor', pas: 6, til: 2, deining: 2, snelheid: 18,
      poten: [
        { rect: [0, 56, 31, 68], groep: 1 },
        { rect: [31, 56, 39, 68], groep: 0 },
        { rect: [39, 56, 47, 68], groep: 1 },
        { rect: [47, 56, 80, 68], groep: 0 },
      ],
      staart: { rect: [12, 34, 28, 55], basis: 'onder', zwaai: 3 },
      kop: { rect: [29, 18, 65, 46], dip: 3 },
    },
    draakje: {
      soort: 'viervoeter', kijk: 'rechts', pas: 6, til: 2, deining: 2, snelheid: 18,
      poten: [
        { rect: [0, 57, 30, 68], groep: 1 },
        { rect: [30, 57, 40, 68], groep: 0 },
        { rect: [40, 57, 49, 68], groep: 1 },
        { rect: [49, 57, 80, 68], groep: 0 },
      ],
      vleugel: { rect: [13, 31, 37, 51], basis: 'rechts', flap: 2 },
    },
    haaitje: {
      soort: 'vis', kijk: 'links', snelheid: 9,
      staart: { rect: [44, 25, 71, 69], basis: 'links', golf: 3 },
    },
    kameleon: {
      soort: 'kameleon', kijk: 'rechts',
      oog: { rect: [53, 35, 59, 43], stap: 1 },
      kop: { rect: [44, 20, 70, 50], knik: 2 },
    },
    salamander: {
      soort: 'salamander', kijk: 'links', snelheid: 3,
      lijf: { rect: [6, 33, 76, 69], golf: 1 },
    },
    parkietje: {
      soort: 'vogel', kijk: 'links',
      kop: { rect: [10, 22, 37, 38], dip: 2 },
      vleugel: { rect: [28, 38, 57, 62], basis: 'links', flap: 2 },
    },
  },
};
