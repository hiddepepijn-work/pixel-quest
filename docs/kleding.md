# Kleding en outfits

Open `app/kledingkast.html` (dubbelklik, werkt via file://). Opnieuw genereren:

```
C:\Users\hidde\miniconda3\envs\segment-reviewer\python.exe tools\uitsnijden.py
C:\Users\hidde\miniconda3\envs\segment-reviewer\python.exe tools\kleding.py
C:\Users\hidde\miniconda3\envs\segment-reviewer\python.exe tools\kast.py
node tools\test_kast_auto.js
```

`kleding.py` leest de uitvoer van `uitsnijden.py` en verandert daar niets aan. `uitsnijden.py` is niet gewijzigd. `kast.py` leest de uitvoer van beide en verandert die ook niet.

## Kast: modulaire kleding per slot

Dit volgt de spec *Kleding, weer, seizoenen en feestdagen* (pagina 1–3 en 10). `tools/kast.py` maakt de catalogus `assets/kast.js` (`window.PQ_KAST`, met ingebedde PNG's) en `assets/kast.json` (leesbaar). Alle itemlagen staan in `assets/kast/`. Wat nog getekend moet worden, staat in `docs/kleding-art-brief.md`.

**Datamodel per item:** `{ id, slot, lichaam, sprites: { hidde, tessie }, kleuren, prijs, set_id, tags, zeldzaamheid }`, zoals in de spec. Extra velden: `herkomst`, `status` (`klaar` of `wacht_op_art`), `maskers`, `knip`, `modus`, `stats`, `bron`, `startkast`, `onder_haar` en `onder_jas`.

- **Slots:** hoofd, boven, jas, onder, heel_lichaam, schoenen, accessoire.
- **Laagvolgorde:** lichaam, schoenen, onder, (heel lichaam), boven, jas, haar, accessoire, hoofd. `heel_lichaam` verbergt boven en onder. De laag `haar` bestaat uit het haar van het lichaam plus de outline die eraan grenst. Die laag wordt boven de jas opnieuw getekend, zodat Tessies krullen over de schouders vallen. Een sjaal of tas kan eronder (`onder_haar`), het kettinkje onder de jas (`onder_jas`).
- **Haar onder hoofddeksel:** voorlopig een knipmasker per hoofddeksel (`*_k.png`). Haar en haar-outline van het lichaam vallen daar weg, zodat er geen krul door een muts steekt.
- **Sprites:** PNG op hetzelfde canvas als het lichaam (native 64 × 112, anker 32,108). Op de bronversie wordt elk artpixel een blok via `native_naar_bron`, net als bij de accessoires. Uitgesneden items hebben ook een exacte bronversie.
- **Kleuren via masker:** 0 = vaste kleur. 50/100/150/200/250 = toon o/a/b/c/h op de ramp van de gekozen kleur (modus `toon`, handgetekende items, scherpe paletkleuren). 255 = luminantie-recolor zoals bij de zones (modus `luminantie`, uitgesneden items).
- **Prijzen** volgen de spectabel (hoofd, schoenen en accessoire 20–40; boven en onder 30–60; jas en heel lichaam 50–90). Sets hebben 3–4 items.
- **Startkast** (gratis): T-shirt, broek, sneakers en pyjama. De pyjama wacht nog op art. Tessie krijgt ook haar kettinkje, want dat zit al in het goedgekeurde figuur.

**Controle:** `kast.py` rendert twee vaste testlooks (`samenstel`, met dezelfde regels als de JS). De kledingkast tekent ze opnieuw met `tekenLook` en vergelijkt pixel voor pixel. De voettekst meldt nu "hidde OK (max 0), tessie OK (max 0)".

### Items per herkomst

| Herkomst | Items |
|---|---|
| **Uitgesneden** (4), uit de goedgekeurde sprite via de zonemaskers | `tshirt_basis`, `broek_basis`, `sneakers_basis`, `ketting_basis` (alleen het hangertje; de riemgesp blijft in het lichaam) |
| **Nieuw getekend** (18), op het native raster | hoofd: petje, beanie, bucket hat, koptelefoon, kroontje, haarband\*, strik\*, baret\*, haarclip\*; jas: spijkerjas, puffer, regenjas, teddyjas\*; accessoire: bril, sjaal, tas, handschoenen, oorbellen\* (\* = alleen Tessie) |
| **Wacht op art** (22), in de kast zonder sprite | longsleeve, trui, hoodie, overhemd, crop top, blouse, cardigan, jeans, joggingbroek, korte broek, rok, legging, wijde broek, pyjama, onesie, schort, jurk, overall, laarzen, sloffen, ballerina's, enkellaarsjes |

Hoe het nieuwe werk getekend is:

- **Hoofddeksels, bril, sjaal, tas, oorbellen:** met de hand gezet in pixelrijen (`tools/kast_hoofd.py`, `tools/kast_acc.py`). Ze zijn per figuur apart geplaatst, omdat Hidde en Tessie een ander hoofd hebben. Elk item heeft een donkere outline in de tint van het item, 3 tot 5 tinten en licht van linksboven. De 4 oude voorbeeldaccessoires (petje, bril, kroontje, sjaal) zijn opnieuw getekend en passen nu beter. Het petje zit bijvoorbeeld óm het hoofd in plaats van bovenop de krullen. De oude versies staan nog in `kleding.js` voor het huis.
- **Jassen:** de vorm komt uit de zonekaart (shirt, onderarmen en heupen tot de zoom, 1 px dikker naar buiten). De arcering volgt de gladgestreken plooien van het originele shirt. Rits, kraag, zakken, doorgestikte banen, revers en teddytextuur zijn met de hand gezet (`tools/kast_jas.py`). Een jas verandert de lichaamsvorm dus niet; hij ligt er als overlay overheen.
- **Handschoenen:** de vorm van de goedgekeurde handen uit de zonekaart, met een nieuwe tint en een manchet.
- Twee verbeterrondes, bekeken op 5–6× zoom (`assets/debug/kast_items.png`, `kast_kleuren.png`). Tessies hoofddeksels zitten nu lager en smaller, op het hoofd in plaats van erboven. De bril laat beide ogen vrij. De sjaal heeft geen witte franje meer. De haarband is dikker en de haarclip lichter. De regenjas heeft minder vlekkerige schaduw.

### Automatische kleding (nog niet aangesloten)

`app/kast-auto.js` bevat `kiesAutoLook(look, omgevingsstatus, bezit, opties)`, een pure functie. Bij regen kiest hij de regenjas, bij sneeuw of vorst de puffer (tag `sneeuw`, anders `warm`). Onder 5 °C komen er een muts en sjaal bij, boven 25 °C de korte broek. Na `huisTijd` (standaard 21:00) of bij `licht.fase = nacht` gaan pyjama en sloffen aan, en jas en muts uit. Na een keukentaak het schort. De functie gebruikt alleen items die je hebt en die getekend zijn. Per persoon is het uit te zetten via `opties.uit`. `tools/test_kast_auto.js` bevat 12 tests, allemaal geslaagd. Pyjama, sloffen, korte broek en schort wachten op art, dus huis- en taakkleding doen nu in de praktijk nog niets.

**Huis:** het huis tekent nog met `tekenFiguur` en leest de oude staat. De kledingkast houdt die staat bij: de kleuren van shirt, broek, schoenen en ketting gaan als zonekeuze mee, eigen items als accessoire. Hoofddeksels, jassen en de nieuwe accessoires verschijnen in het huis pas als `huis.html` `assets/kast.js` laadt en `huis.js` overstapt op `F.tekenLook(c, id, 'bron', F.lookVoor(id))`. Dat zit in de bestanden van de huis-agent en is bewust niet aangeraakt.

## Aanpak

**Zones.** Elk pixel van de bronasset krijgt één zone: `lijn`, `haar`, `huid`, `shirt`, `broek`, `schoenen`, `accessoire` of `detail` (ogen). Dat gebeurt met kleurtests (HSV en luminantie) binnen handmatig gekozen gebieden (`REGELS` in `kleding.py`). De volgorde van de regels bepaalt de uitkomst. Wat geen regel raakt, krijgt de zone van de dichtstbijzijnde gelabelde pixel. Voor losse correcties is er `CORRECTIES` (punt plus zone, zoals `GATEN`); die is nu leeg. De native-zones komen uit hetzelfde raster als `uitsnijden.py`: per artpixel telt de meerderheid van de bronlabels in de cel. `geometrie()` controleert dat de herberekening exact de bestaande assets oplevert.

**Recolor.** De luminantie van elk zonepixel wordt lineair afgebeeld op een ramp van vijf tinten rond één paletkleur. De mediaan van de zone komt op de basiskleur. Het p10–p90-bereik wordt ongeveer 60 luminantie breed (factor 0,5–2,2). Bij heel lichte of donkere doelkleuren schuift de afbeelding zo dat de arcering niet wegklemt. De ramps zijn alleen mengsels van paletkleuren: schaduw naar nacht/titel, licht naar papier/crème. Crème krijgt schaduw via eik en koffie. Daardoor werken zowel het zwarte T-shirt (spreiding 16–19, contrast ×2,2) als de crème broek (spreiding 128–136, contrast ×0,5). De grote spreiding van de broek komt door de donkere vouwlijnen die in de zone vallen. Outline (`lijn`), ogen, haar en huid worden nooit verkleurd. De JS-versie rekent hetzelfde. De voettekst van de kledingkast vergelijkt beide en meldt nu "max verschil 0".

**Ankers** (native canvas 64×112, met de hand gekozen en gecontroleerd in `assets/debug/ankers_zoom.png`):

| | kruin | voorhoofd | ogen | nek | hand links | hand rechts |
|---|---|---|---|---|---|---|
| Hidde | 33,27 | 34,35 | 35,40 | 31,50 | 18,68 | 41,70 |
| Tessie | 28,33 | 27,39 | 26,47 | 26,57 | 17,70 | 37,70 |

Hidde kijkt naar rechts, Tessie naar links. Accessoires worden getekend voor iemand die naar rechts kijkt en worden voor Tessie automatisch gespiegeld. Op de bronversie wordt een accessoirepixel een blok van ongeveer 4,5 bronpx (`native_naar_bron`, kleinste kwadraten over de rastercellen).

## Zonekwaliteit

- **Hidde: goed.** Het shirt (neutraal donker) scheidt schoon van huid en haar. In de broek naast de handen zijn een paar pixels als huid geteld; bij een donkere broekkleur blijven daar enkele crème stipjes over. Schoenen en broek zijn even crème. De schoenen worden daarom op vorm gescheiden (polygonen): de broekzoom over de neus is een rechte grens.
- **Tessie: redelijk tot goed.** Haar en shirt hebben dezelfde bruintinten. De shirtrand is daarom een handgetekende polygoon. Bij de schouders, waar de krullen over het shirt vallen, is die rand een inschatting. De handen op de heupen staan in vaste vakken. De zone `accessoire` bevat het hangertje én de riemgesp (goud), zodat "zilver" beide verandert. Het dunne kettinkje valt in native grotendeels weg: daar blijft alleen het hangertje (6 artpixels) over.
- Controle: `assets/debug/zones_{bron,native}_{hidde,tessie}.png` (links origineel, rechts zonekleuren).

## Wat is gemaakt

| Wat | Waar | Herkomst |
|---|---|---|
| Zonekaarten (grijswaarde = zone-index × 30) | `assets/zones/{bron,native}/` | afgeleid van bronpixels |
| 9 catalogus-outfits (Bosrijk, Zonsondergang, Nachtwacht, Zeebries, Lavendelveld, Goudhaantje, Rollenruil, Hoodiedag, Koffietijd) | `assets/catalogus/{bron,native}/` | recolor, geen nieuwe pixels |
| Hoodie- en avonturiersfiguren (4) | `assets/outfits/{bron,native,referentie}/` | exact uitgesneden |
| Items: gieter, bezem, klembord, ster, plant, hart, rugzak, munt | `assets/items/{bron,native}/` | exact uitgesneden |
| Data voor de pagina | `assets/kleding.js` (met ingebedde PNG's), `assets/kleding.json` (leesbaar) | gegenereerd |
| Kledingkast | `app/kledingkast.html/.js/.css` | nieuw, omgebouwd naar slots |
| Kast: catalogus (44 items), itemlagen, maskers | `tools/kast.py` (+ `kast_teken/_hoofd/_acc/_jas.py`), `assets/kast.js`, `assets/kast.json`, `assets/kast/` | zie *Items per herkomst* |
| Lagenrenderer `tekenLook` | `app/figuur.js` | nieuw; `tekenFiguur` werkt ongewijzigd |
| Automatische kleding | `app/kast-auto.js`, `tools/test_kast_auto.js` | nieuw, niet aangesloten |

**Outfits van het blad.** Het avonturierspaar staat los van elkaar en is schoon uitgesneden. Het hoodiepaar is één samenhangend stuk. Het is gesplitst met een watershed op donkerte, met een zaadgebied in elk lijf (`HOODIE_ZADEN`). Daarbij gaat iets verloren. Tessies haar ligt over Hidde's rechtermouw: daar mist een strookje mouw met outline. Links onderaan Tessies mouw mist een stukje outline waar de mouwen elkaar raken. Er is **niets bijgetekend**; zie `assets/debug/outfits_splitsing.png`. Alle vier figuren zijn eigen tekeningen op het blad. Gezicht, haar en houding wijken iets af van de goedgekeurde basisfiguren. Hun raster is fijner: 4,02 bronpx per artpixel tegenover 4,54, gemeten en begrensd op 4,0–5,6. In native zijn ze daardoor 92 (Hidde) en 82 (Tessie) artpx hoog, tegenover 85 en 79 bij de basisfiguren. Gebruik ze dus als losse figuurvarianten, niet als frames van de basisfiguur. De items zijn gemeten op 4,1 bronpx/artpixel en staan op een native canvas van 36×36 met het anker op (18, 34).

**Nieuw getekend in `kleding.py`:** de vier oude voorbeeldaccessoires `petje`, `bril`, `kroontje` en `sjaal` (`ACCESSOIRES`, ook als `assets/accessoires/*.json/.png`). Het huis gebruikt ze nog. In de kledingkast zijn ze vervangen door de nieuwe kastitems (zie hierboven).

## Kledingkast

- Character-keuze, bron/native, achtergrond, ankers tonen, PNG van de preview. Onder de preview staat de huidige look per slot.
- **Kast:** tabs per slot met het aantal items. Elke tegel toont het character met dat item aan (uitsnede rond het slot), de prijs of "in bezit"/"draag je", en een herkomstlabel. Wat op art wacht, is grijs. Tik = aantrekken. Heb je het item niet, dan pas je het (gele balk "Je past ..."), en dat wordt niet bewaard.
- **Detail:** prijs, zeldzaamheid, set, tags, voor welk lichaam, kleurswatches (niet-bezeten kleuren gearceerd, ook die kun je passen), Aantrekken/Uittrekken, een testknop "kleur in bezit zetten" (kopen is fase 3) en "Bewerk als kopie" voor getekende items. Uitgesneden items kun je niet uittrekken: het lichaam draagt ze nog zelf.
- Look per persoon in `localStorage` `pq-kk-look`, bezit in `pq-kk-bezit` (per item de kleuren die je hebt). De oude `pq-kk-staat` (zones + accessoires) wordt bijgehouden voor het huis. Alles in try/catch.
- Catalogus (stel-outfits): de startkast in de kleuren van de outfit, voor allebei. "Mijn outfits" bewaart de hele look van allebei. Oude bewaarde outfits (zones + accessoires) worden bij het aantrekken omgezet.
- Pixel-editor op het native raster (max. 40×48): zoals voorheen, plus een **slot** (hoofd, accessoire, jas-overlay). Het ontwerp verschijnt live in dat slot. Bewaren maakt een eigen item (label "eigen") dat in de kast staat. "Bewerk als kopie" laadt een getekend kastitem van het huidige lichaam in de editor.
- Testen via het adres, bijvoorbeeld `kledingkast.html?test&char=tessie&variant=native&slot=hoofd&kies=baret&bezit=alles&hlook=hoofd:beanie:mos,jas:regenjas:goud&tlook=hoofd:baret:bordeaux&bewerk=puffer`. Items uit `hlook`/`tlook`/`look` gaan als test in bezit. `bezit=start` zet de startkast terug.
- Met `?test` toont de indicator het aantal JS-fouten, de look en de lagencontrole.

Getest met headless Edge op 1400 px en 500 px: 0 JS-fouten, geen horizontale scroll, lagencontrole OK. `huis.html?test` en `index.html?test` geven ook 0 fouten.

## Beperkingen

- **Er is nog geen basislichaam in onderkleding.** Het lichaam is het volledige goedgekeurde figuur. Shirt, broek en schoenen liggen er als uitgesneden laag pixel-precies overheen, dus uittrekken laat het origineel zien. 22 items die de vorm veranderen, wachten daarom op art (`docs/kleding-art-brief.md`).
- Jassen volgen de vorm van het shirt en zijn dus wijd en kort zoals het T-shirt. Een echte jas met capuchon of een andere snit moet als nieuwe tekening komen.
- Het knipmasker voor hoofddeksels haalt haar weg maar tekent geen plat haar. Onder de rand loopt het haar door zoals in het origineel. Dat is een benadering van de haarvariant "onder hoofddeksel" uit de spec.
- Op de bronversie zijn getekende items blokjes van 4 of 5 bronpx (het blad heeft geen exact raster). Ze zien er iets grover uit dan de figuur. Uitgesneden items zijn op bron wel exact.
- Kopiëren uit een getekend item in de editor geeft vaste kleuren (geen recolormasker) en is per lichaam: een kopie van Hidde's beanie komt bij Tessie gespiegeld op haar kruin, niet precies passend.
- Op de bronversie zijn accessoirepixels 4 of 5 bronpx breed (het blad heeft geen exact raster). Dat ziet er iets grover uit dan de figuur.
- Zones zijn per pixel bepaald, met handmatige gebieden. Nieuwe of andere basisfiguren hebben eigen `REGELS` nodig.
- Een paar pixels in de overgang van hand naar broek horen bij de verkeerde zone (zie zonekwaliteit).
- De pixel-editor is in headless Edge alleen geladen en weergegeven (item laden, live preview in het slot). Tekenen met muis of vinger, opslaan en de downloads zijn niet automatisch getest. Hetzelfde geldt voor tikken in de kast: getest is de toestand via het adres.

## Volgende stappen

1. Laat Hidde en Tessie de catalogus bekijken en schrap of verander outfits die niet bevallen.
2. Teken de twee ontbrekende outlinestukjes van het hoodiepaar op het native raster bij, alleen als dat goed wordt bevonden, en markeer ze als nieuw getekend.
3. Maak een zonekaart voor de figuurvarianten, zodat ook hoodie en avonturier verkleurd kunnen worden.
4. Koppel outfits en items aan beloningen in de taken-app (de munt en de ster als XP-iconen).
5. Kies per accessoire eventueel een eigen verschuiving per character en neem die op in de JSON (`verschuiving`).
6. Laat Codex de basislichamen en het eerste itemblad maken (`docs/kleding-art-brief.md`) en bouw `snij_itemblad` in `tools/kast.py` uit (nu een stub met TODO).
7. Laat het huis `tekenLook` gebruiken (`huis.html` laadt `assets/kast.js`; `huis.js` roept `F.tekenLook(c, id, 'bron', F.lookVoor(id))` aan) en sluit `kiesAutoLook` aan op de omgevingsstatus.
8. Laat Hidde en Tessie de nieuw getekende items beoordelen. Vooral de baret, de teddyjas en de oorbellen zijn twijfelgevallen.
