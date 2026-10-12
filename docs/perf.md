# Pixel Quest – snelheid van het huis (knijpen en uitzoomen)

12 okt 2026, branch `perf`. Aanleiding: Hidde op zijn iPhone (v0.1.3): *"Als ik snel en hard uitzoom, werkt het niet lekker. Ook wordt hij erg traag als ik verder uitzoom."*

## Meten

`tools/qa/perfmeting.js` (Edge headless via puppeteer-core) meet het huis op 390×844 met deviceScaleFactor 3, touch (CDP-touchpoints) en **CPU 6× trager**, als benadering van een iPhone-webview met batterijbesparing. De fases:

1. snelle, harde pinch-out: twee vingers in ~150 ms van 300 naar 30 px (2× → onder het minimum), daarna loslaten;
2. langzame pinch-out (1,5 s);
3. een tweede pinch terwijl het vastklikken nog loopt;
4. 10 s stil op maximaal uitgezoomd;
5. snelle pinch-in naar boven het maximum.

Per fase meet het script:

- de scripttijd per frame (eigen rAF-callbacks samengeteld per frame);
- long tasks > 50 ms (PerformanceObserver);
- de CDP-taak-, script-, layout- en stijltijd;
- hoe vaak de verte, het decor, de lichtlaag, de deeltjes en de hele scène opnieuw tekenen;
- het aantal canvassen en hun pixels.

**Headless Edge synchroniseert niet met een scherm**, dus "fps" is daar geen betrouwbaar getal. Als maat voor vloeiend telt daarom: geen long tasks tijdens het gebaar, en een paar ms werk per frame. Daarmee blijft ruim onder de 16,7 ms voor 60 fps over.

Een andere build meten kan zo: `PQ_DIST=<map met dist> node tools/qa/perfmeting.js`. De baseline is `main` (`76e4ea6`), gebouwd in een aparte worktree.

## Wat er misging (baseline, `76e4ea6`)

| Fase (CPU 6×) | Long tasks | Script max/frame | Opnieuw getekend | Duur |
|---|---|---|---|---|
| snelle pinch-out, gebaar (150 ms) | **10** (53–184 ms) | 92 ms | verte **17×**, deeltjes **17×** | **1444 ms** (events liepen achter) |
| loslaten + 1 s | 2 (102, 308 ms) | 287 ms | decor, licht, scène, verte 2×, deeltjes 2× | |
| langzame pinch-out, gebaar (1,5 s) | **68** (57–170 ms) | 77 ms | verte **134×**, deeltjes 134× | 11 s (95% bezet) |
| pinch tijdens het vastklikken | 30 | 90 ms | verte 58×, deeltjes 58× | |
| 10 s stil uitgezoomd | 0 | 3,4 ms | – | 33% bezet, stijl 956 ms |
| snelle pinch-in, loslaten | 1 (131 ms) | 126 ms | decor, licht, scène, verte | |

Canvassen: 21 stuks, samen tot 4,5 Mpx (grootste 1,9 Mpx).

Oorzaken, in volgorde van gewicht:

1. **Elke pointer-move tekende de verte opnieuw.** De verte omvatte het zichtbare stuk plus 25% marge, en bij uitzoomen viel het beeld steeds buiten dat stuk. Bij elk event volgde dan een nieuwe tekening van tot 1,9 Mpx, plus een herstart van het deeltjescanvas. Daardoor liepen de events achter: een gebaar van 150 ms duurde 1,4 s.
2. **Per event werd layout gelezen** (`getBoundingClientRect`, `clientWidth` in de zoomgrenzen) direct na het zetten van de transform. Elke move werd apart verwerkt.
3. **Bij het vastklikken werd alles opnieuw getekend**, ook de verte en het decor. Die hangen niet af van de zoom: ze staan in artpx en worden alleen geschaald.
4. **Stil uitgezoomd:** elk taaksignaal had een eigen oneindige CSS-animatie (`translate`). Die kostte elke frame een stijlberekening (≈ 1 s per 4 s bij 6×). Hidde en Tessie en de pets liepen op volle snelheid door, ook als ze heel klein of buiten beeld waren.

## Wat er veranderd is

- **Gebaar = alleen een transform.**
  - Pointer-events worden per frame samengevoegd: één transform per frame, de laatste vingerstand telt.
  - Maten en de positie van het venster worden alleen bij een nieuw gebaar of een resize gemeten.
  - Tijdens het gebaar krijgt de laag `will-change: transform` (klasse `beweegt`). In rust gaat die eraf, zodat de pixels na het vastklikken weer scherp gerasterd worden.
  - Tijdens het gebaar wordt **niets** getekend.
- **Harde grens (op verzoek van Hidde):** geen rubberband en geen terugveren. Bij elke samengevoegde move wordt de zoom geklemd tussen het minimum en 4×, en de translate zo dat de getekende wereld (scène plus verte, 1 artpx naar binnen) de viewport altijd helemaal dekt. Dat geldt ook voor het knijpmiddelpunt, de traagheid na een swipe (die stopt op de rand), het scrollwiel en een resize of verbouwing. Het minimum is de zoom waarbij de wereld het scherm in de breedte én de hoogte nog dekt.
  Gevolg: helemaal uitgezoomd zie je de hele wereld in de hoogte (900 artpx lucht, de scène, 360 artpx grond). Het huis staat dan in het onderste deel van het scherm, op ~60–77% van de hoogte.
- **Loslaten:** een korte, zachte animatie naar de hele zoomstap (alleen bij ≥ 1×), daarna één keer hertekenen op de nieuwe schaal. Decor en lichtlaag worden dan hergebruikt (`decorCache`) en alleen opnieuw geschaald.
- **De verte is één bitmap van de hele wereld.** 1 canvaspixel per artpx: niveau 1 ≈ 2,1 Mpx, de villa ≈ 4,6 Mpx. Hij wordt alleen getekend bij een nieuwe scène of als de lucht echt verandert (dagdeel, weer, sterren). Een tekening kost 17 ms (niveau 1) of 47 ms (villa) bij 1×. Pannen en zoomen schuiven en schalen alleen de laag.
- **Deeltjes:** alleen over het zichtbare stuk plus 15%, opnieuw opgezet als het beeld na een gebaar tot rust komt (`opRust`). Uitgezoomd (< 1×) zijn het hooguit 50 deeltjes op 15 beelden per seconde.
- **Gedrag** (`huis-anim-gedrag.js`):
  - uitgezoomd of met het menu open hooguit 15 stappen per seconde;
  - Hidde en Tessie buiten beeld staan stil.
- **Taaksignalen** dobberen samen met één animatie op hun laag; uitgezoomd dobberen ze niet.
- **DPR:** alle grote lagen (verte, decor, licht, deeltjes) zijn bitmaps in artpx, met `image-rendering: pixelated` CSS-geschaald. Hun grootte hangt dus niet af van de DPR (3 op de iPhone). Een DPR-plafond is daarom niet nodig.

## Na de fix (`perf`)

| Fase (CPU 6×) | Long tasks | Script max/frame | Opnieuw getekend | Duur |
|---|---|---|---|---|
| snelle pinch-out, gebaar (150 ms) | **0** | 1,8 ms | niets | 165 ms |
| loslaten + 1 s | 1 (60 ms; hertekenen op 1×) | 55 ms | scène 1×, deeltjes 2× | |
| langzame pinch-out, gebaar (1,5 s) | **0** | 1,0 ms | niets | 1,3 s |
| pinch tijdens het vastklikken | **0** | 2,8 ms | deeltjes 1× | eindigt op de grens |
| 10 s stil uitgezoomd | 0 | gem. **0,1 ms** (max 3,1) | – | **18%** bezet, stijl **154 ms** |
| snelle pinch-in, loslaten | 1 (59–179 ms; hertekenen op 4×) | 53 ms | scène 1×, deeltjes 1× | klikt vast op 4× |

De tabel hierboven is gemeten op een rustige pc, vóór de harde grens. Met de harde grens is het minimum iets lager (0,55 in plaats van 0,59), omdat de wereld het scherm dan nog net dekt.

**Vergelijking direct na elkaar, met harde grens.** Beide builds zijn in dezelfde sessie gemeten. De pc was daarbij drukker, dus alle getallen liggen hoger:

| Fase (CPU 6×) | Baseline: long tasks | Baseline: script max | Nu: long tasks | Nu: script max | Nu: opnieuw getekend |
|---|---|---|---|---|---|
| snelle pinch-out, gebaar | 9 (155–599 ms), gebaar duurde **4,5 s** | 284 ms | **0**, 535 ms | 6,4 ms | niets |
| langzame pinch-out, gebaar | > 60 (220–380 ms), 33 s | 188 ms | 1 (56 ms), 4,2 s | 24 ms | niets |
| pinch tijdens het vastklikken | 15+ (160–700 ms) | 240 ms | **0** | 8,6 ms | deeltjes 1× |
| 10 s stil uitgezoomd | 2 (491, 50 ms), stijl 2738 ms | 7,9 ms | **0**, stijl **33 ms** | gem. 0,4 ms | niets |
| snelle pinch-in, loslaten | 1 (450 ms) | 425 ms | 1 (86 ms) | 80 ms | scène 1× |

- **Doel gehaald:**
  - Tijdens het gebaar zijn er geen long tasks, en er is hooguit ~3 ms script per frame bij 6× op een rustige pc. Dat is ruim binnen 16,7 ms, dus ≥ 55 fps. Op een drukke pc liep het op tot 6–25 ms, met één losse taak van 56 ms.
  - Stil uitgezoomd is het gemiddeld 0,1–0,4 ms script per frame (doel < 4 ms).
- **Canvassen** uitgezoomd: 21, samen 3,8 Mpx, de grootste 2,1 Mpx (de verte van niveau 1). Bij de villa wordt de grootste 4,6 Mpx, ongeveer 18 MB.
- **Wat er overblijft:** het vastklikken op een andere hele zoomstap tekent de meubels en figuren één keer opnieuw op die schaal (60–180 ms bij 6×, dus ~10–30 ms op een echte telefoon). Dat gebeurt na het gebaar, niet tijdens.

## Bewaking

`tools/qa/perf.js` deel 3 draait de meting en faalt als:

- er tijdens een gebaar iets opnieuw getekend wordt (verte, decor, licht, deeltjes of scène; dat is de harde controle), of er meer dan één long task is, of een long task van 150 ms of meer, of de p95 van het script per frame boven 10 ms of het maximum boven 60 ms komt. Er zit ruimte in voor een drukke pc: de meting draait met CPU 6× bovenop wat de pc al doet. Vóór de fix waren het tientallen taken van 100–600 ms;
- het vastklikken bij alleen een zoomstap de verte of het decor opnieuw tekent, of meer dan één long task geeft, of een long task van 500 ms of meer;
- snel knijpen niet op de grens (of op 4×) eindigt;
- het stilstaan uitgezoomd gemiddeld 4 ms script per frame of meer kost, of 1500 ms stijlwerk of meer in 10 s (vóór de fix 956–2738 ms);
- de canvassen samen 8 Mpx of meer zijn, of de grootste 5 Mpx of meer.

`tools/qa/zoom.js` controleert de harde grens:

- een snelle, harde pinch-out tot ver voorbij het minimum;
- snelle swipes naar alle vier de kanten, en daarna blijven doorswipen;
- **elke frame** tijdens die gebaren: de getekende wereld (de verte-canvas) dekt het venster helemaal, en de zoom komt nooit onder het minimum;
- midden in het gebaar een schermafbeelding met een magenta achtergrond: er mag geen enkele magenta pixel in staan.

Beide draaien mee in `bash tools/qa/alles.sh`.

## Niet gemeten

Een echte iPhone. De GPU-kant (rasteren en compositen van grote lagen) wordt in headless Edge maar ten dele meegeteld. Batterij over langere tijd. Op het toestel zelf kijken: snel hard uitknijpen (geen haperen of verspringen), daarna rustig rondpannen uitgezoomd, en het menu openen en sluiten.
