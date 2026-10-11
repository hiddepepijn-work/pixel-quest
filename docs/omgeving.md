# Omgeving: licht, weer, seizoenen en feestdagen

v1, 11 okt 2026. Bouwt op [spec-kleding-weer-seizoenen-feestdagen.pdf](spec-kleding-weer-seizoenen-feestdagen.pdf) (onderdelen Dynamisch licht, Weer, Seizoenen en Feestdagen; Kleding staat los). Zie ook [huis.md](huis.md).

## Omgevingsstatus

Eén status, elke minuut opnieuw berekend (`PQ_OMGEVING.bereken`, pure functie in `app/omgeving.js`). Alle tekenlagen lezen alleen hieruit. De pagina tekent alles opnieuw als fase, lampen, weertype, seizoen, sneeuwlaag of events veranderen. Schuift alleen het licht (menging van de lucht, zon, maan, tint, lampsterkte), dan worden alleen het decor, de tint en de lichtlaag opnieuw getekend en lopen Hidde, Tessie en de pets gewoon door.

```js
bereken({ datum, lat, lon, weer /* record of null */, instellingen })
// -> { licht: { fase, zonhoogte, lampen, op, onder },
//      weer: { type, temp_c, wind_kmh, bron, regen_verwacht_om? },
//      seizoen: { naam, boomstadium }, sneeuwlaag: 0-3, events: ['sinterklaas', 'kerst'] }
```

`instellingen`: `{ stad, lat, lon, altijdDag, weer: 'echt'|type, seizoen: 'echt'|naam, events: { sinterklaas, kerst }, kerstsfeer }`, in localStorage `pq-omgeving` (altijd in try/catch). Het weer staat in `pq-weer`, per locatie.

| Bestand | Wat |
|---|---|
| `app/omgeving.js` | Status: zonnestand, lichtfase, WMO → weertype, seizoen, events, sneeuwlaag; browserkant: steden, instellingen, Open-Meteo ophalen en cachen |
| `app/omgeving-teken.js` | Status → dagdeel-object voor de bestaande tekenpaden; luchtbanden per fase en weer; seizoenshaakjes voor het erf; sneeuw op daken en randen; druppels en sneeuw bij de ramen; kerstlampjes en slinger; sprites (kerstboom, schoen, pepernoten, nachtdoek) |
| `app/omgeving-huis.js` | Pagina: minuuttimer, weer ophalen, bediening in de balk, event-decor plaatsen, nachtplek van de kat, weerdeeltjes |
| `app/omgeving-test.js` | `node app/omgeving-test.js`: zonnetijden, fases, events 2026/2027, WMO, fallback, sneeuwlaag |

Haakjes in de bestaande bestanden: `huis-buiten.js` (luchtbanden, wolken, achtergrond, gras, kruin, haag, bloemen, gazon), `huis-teken.js` (uitzicht, raam, lichtbanen, sneeuw op het pannendak, `tekenDecor`) en `huis.js` (dagdeel uit de status, extra decor, pets, deeltjes). Zonder status (mini-preview bij Verbouwen) tekent alles het oude zomerbeeld.

## Formules

- **Zonnestand**: NOAA-formules (Juliaanse eeuw → declinatie en tijdsvereffening). Zonhoogte uit het uurhoek; opkomst en ondergang bij −0,833° (bovenrand met breking), twee iteraties. Getest tegen Open-Meteo op 11 okt 2026: Zevenaar op 07:53 / onder 18:50, Amsterdam 07:58 / 18:54, beide op de minuut gelijk. (De verwachting "07:59 / 18:46" in de opdracht klopt niet voor Zevenaar; 07:59 is Rotterdam.)
- **Fase**: nacht < −6°; dageraad −6° tot opkomst (vóór de zonsmiddag); ochtend de eerste 2 uur na opkomst; gouden uur het laatste uur vóór ondergang; schemering ondergang tot −6°; anders middag.
- **Vloeiend verloop**: ankerpunten op de zonhoogte, apart voor de ochtend (nacht −12°, dageraad −3,5°, ochtend 4°, middag 16°) en de avond (middag 16°, gouden uur 6°, schemering −2°, nacht −10°). Tussen twee ankers mengt de lucht de banden van beide fases met een geordende 8×8 Bayer-dither (elke pixel blijft een paletkleur), ook in het uitzicht door de ramen. De tint over de kamers mengt lineair (kleur en sterkte); de lampsterkte loopt van 0,4 (zon op 3°) naar 1 (zon onder −6°); sterren komen één voor één tussen −3° en −10°; wolken verdwijnen geleidelijk op een heldere nacht. Zon en maan staan op hun echte plek: azimut 90° (oost) links tot 270° (west) rechts (we kijken naar het zuiden), hoogte 0 achter de heuvels tot 50° bovenin. De maan (vereenvoudigde formules zoals SunCalc) heeft een schijngestalte; bij nieuwe maan (< 4 % verlicht, zoals op 11 okt 2026) is hij er niet.
- **Lampen**: aan bij nacht, dageraad (60 % sterkte) en schemering; bij donker weer eerder: bewolkt onder 6°, regen en sneeuw onder 10° zonhoogte. *Altijd dag* = middag, lampen uit.
- **Weertype uit WMO**: 0 helder; 1–2 halfbewolkt (getekend als helder met meer wolken); 3, 45, 48 bewolkt; 51–67, 80–82, 95–99 regen; 71–77, 85–86 sneeuw.
- **Weer verlopen**: geen record of ouder dan 3 uur → "licht bewolkt" (halfbewolkt).
- **Seizoen**: meteorologisch (lente 1 mrt, zomer 1 jun, herfst 1 sep, winter 1 dec); boomstadium 2/4/6/8 op de schaal van acht.
- **Sneeuwlaag (v1-light)**: sneeuwweer = laagje (2); bij ≥ 1 cm/uur of 5 cm gemeten sneeuwhoogte een dik pak (3); gemeten 2 cm = laagje, > 0 = poedertje. Kerstsfeer (20 dec t/m 6 jan, standaard aan) minimaal een poedertje.
- **Events**: Sinterklaas van de intocht (eerste zaterdag op of na 12 november; klopt voor 2018–2025; 2026: 14 nov, 2027: 13 nov) t/m 5 dec. Kerst 1 t/m 26 dec.

## Wat er getekend wordt

- **Lucht**: banden per fase (nacht, dageraad paars-roze, ochtend helder-oranje, middag blauw, gouden uur oranjegoud, schemering roze-diepblauw) en per luchtsoort (helder, grijs, nat, sneeuwlucht). Zon alleen bij helder weer en zon boven de horizon; sterren en maan alleen bij helder weer en een donkere lucht (zie *Vloeiend verloop*). Tint over het huis: blauw 's nachts, warm in het gouden uur, grijs bij bewolking en regen, koud bij sneeuw.
- **Regen**: grijze lucht, druppels en sporen op het glas, plassen op het maaiveld en het gazon, schuine strepen als deeltjes (schuiner bij wind).
- **Sneeuw**: vlokken (deeltjes en in het raam), sneeuw op het pannenvlak, op elke open bovenkant (dakrand, dakkapel, schoorsteen, haag, takken, balkon; gevonden met een alfamasker op een los canvas), een deken op de grond en een richel onder in elk raam. Niet onder een overkapping of carportdak.
- **Bomen** (`app/huis-bomen.js`): een **kers** in de tuin (in plaats van het krentenboompje) en een **eik** op het erf (in plaats van de generieke boom). Kers: rond en laag, gladde roodbruine stam met lenticellen; lente roze-witte bloesem met blaadjes op de grond en bloesemblaadjes als deeltjes in april (of met Seizoen: lente), zomer donkergroen met kersjes, herfst rood-oranje, winter kaal met donkere twijgen. Eik: breed en grillig, gegroefde stam met wortelvoet en dikke knoestige takken die tussen de lobben zichtbaar blijven; lente lichtgroen, zomer diepgroen, herfst bruin-oranje met goud, winter kaal maar met een deel van het dorre bruine blad (marcescentie), dus anders dan de kers. De olijfboom blijft.
- **Seizoenen**: overige kruinen (lente groen met roze/witte trosjes, zomer zoals het was, herfst oranje met rode en gele plukjes en vallend blad, winter kale takken), beukenhaag (fris groen, groengoud, droog bruin; de taxushaag blijft groen), borders (tulpen, zomermix, late asters, droge stengels), gras (lentegroen met madeliefjes, herfstblad en bladhopen, winterrijp), bomenrij op de achtergrond per seizoen. Olijf en buxus blijven groen.
- **Events**: Kerst: kerstboom met lampjes (vrij vak in woonkamer, keuken of slaapkamer; anders achter een bank of bed, niet achter Hidde of Tessie), slinger met ballen in de woonkamer, lampjessnoer onder elke dakrand (brandt bij lampen aan). Sinterklaas: schoen met wortel bij de radiator (of op een vrij plekje) en een schaaltje pepernoten op de salontafel of naast de schoen.
- **Pets**: 's nachts ligt de kat in de petmand (vanaf niveau 5) of op het bed, met een klein "z". De parkiet krijgt 's nachts een theedoek over het stokje. Alleen bestaande sprites, alleen verplaatst.
- **Kleding**: bij *Kleding: Uit de kledingkast* tekent het huis de bewoners met `F.tekenLook(c, fid, 'bron', look)` uit `figuur.js` (look uit `F.lookVoor`). `kiesAutoLook` uit `kast-auto.js` past die look aan op de status: regen → regenjas, sneeuw of vorst → puffer, beanie en sjaal, alleen met items in bezit (`pq-kk-bezit`, anders de startkast). Per persoon uit te zetten (balk: *Weerkleding*; `?autokleding=0`; `?bezit=alles` voor tests). Gaat het mis of staat er een andere outfit, dan de oude `tekenFiguur`-route.
- **Deeltjes**: eigen canvas boven de scène, ~30 beelden per seconde, max 150 (regen W/6, sneeuw W/8, herfstblad en bloesem 14), niet in de kamers. Bij `prefers-reduced-motion`: geen deeltjes, alleen het stilstaande beeld.

## Testoverrides

`huis.html?test&schoon&niveau=10&…`

- `datum=2026-12-10`, `uur=20` (ook `20.5`) of `tijd=18:20`
- `weer=helder|bewolkt|regen|sneeuw` (geen fetch), `seizoen=lente|zomer|herfst|winter`, `stad=rotterdam`, `dagnacht=0` (altijd dag), `geenweer` (niet ophalen)
- Balk: Weer (echt/helder/bewolkt/regen/sneeuw), Seizoen (op datum/…), Plaats (8 steden of eigen lat/lon), Altijd dag, Feestdagen (Sinterklaas, Kerst, Kerstsfeer-sneeuw). Statusregel met plaats, fase, weer, seizoen en zonnetijden.

## v1 en later

| Onderdeel | Nu (v1) | Later |
|---|---|---|
| Licht | zonnestand, 6 fases, vloeiend verloop per minuut (gedithered mengen, tint en lampsterkte mee), zon en maan op hun echte plek, altijd dag | lampen per kamer met drempel, bleke maan overdag |
| Weer | helder, (half)bewolkt, regen, sneeuw; Open-Meteo direct vanuit de browser met cache | server, mist, motregen, onweer, hagel, storm, wind op bomen, voorspelling ("het gaat regenen"), tip bij taken, icoontje van de ander |
| Seizoenen | 4 seizoenen, 1 boomstadium per seizoen, grond en tuin mee, sneeuwlaag light, kerstsfeer | 8 stadia met overgangen, sneeuw die blijft liggen (groei/smelt per uur), sneeuwpop-quest, tik op bladhoop |
| Events | Sinterklaas en Kerst met automatisch decor, aan/uit per event | volledige kalender (Pasen, Carnaval, Koningsdag …), event-items in de winkel, quests, persoonlijke events |

## Weer via de server (later, niet gebouwd)

- De VPS haalt per locatie elke **20 minuten** `api.open-meteo.com/v1/forecast` op met `current=weather_code,temperature_2m,precipitation,snowfall,cloud_cover,wind_speed_10m,is_day`, `hourly=precipitation_probability,precipitation,snowfall,snow_depth,weather_code`, `daily=sunrise,sunset`, `timezone=auto` (`weerUrl()` en `leesOpenMeteo()` zijn herbruikbaar).
- Cache per locatie (stad afgerond op 0,01°) in het geheugen of een tabel `weer_cache { locatie, opgehaald, record }`. Twee locaties = ~144 verzoeken per dag, ruim binnen de gratis limiet.
- Endpoint `GET /api/weer?stad=zevenaar` geeft het record plus de **sneeuwlaag** (de server houdt die per uur bij, zodat de sneeuw voor allebei hetzelfde verloopt). De app vervangt alleen `haalWeer()`; `bereken()` blijft gelijk. Valt de server weg: laatst bekende record, na 3 uur "licht bewolkt".
- Niet-commercieel gebruik is gratis zonder API-key; bij commercieel gebruik is een betaald plan nodig.

## Getest

- Vloeiend verloop (11 okt 2026, Zevenaar): `?tijd=18:10`, `18:30`, `18:50` en `19:10` op niveau 4, zoom 1 en 2: de lucht schuift van gouden uur via een gedithered mengsel naar schemering, de zon zakt rechts (azimut 251° → 259°) achter de heuvels, sterren verschijnen geleidelijk; 0 JS-fouten. `node app/omgeving-test.js`: alles ok. Bomen: kers en eik in vier seizoenen op 3–4× uitsnede bekeken (winterkers donkerder gemaakt tegen de bruine haag, meer dor blad in de wintereik).

- `node app/omgeving-test.js`: alles ok (zonnetijden gelijk aan Open-Meteo, fases door de dag, events 2026 en 2027, WMO, fallback, sneeuwlaag, altijd dag).
- Headless Edge, 0 JS-fouten op elke opname: vier seizoenen (niveau 4 en 10), regen overdag, sneeuw 's avonds en overdag, gouden uur, Kerst 's avonds op niveau 1 en 10, Sinterklaas (niveau 5), 500 px breed (geen horizontale paginascroll), reduced motion, en echt weer via Open-Meteo vanaf file:// (werkt in Edge). Drie verbeterrondes op uitsneden: bloesem als trosjes, herfstkruin als plukjes, haagkleuren, grijze verte bij regen, sneeuw op het pannenvlak, nachtdoek (eerst leek het een lampenkap), kerstboom kleiner en weg achter de bewoners.

## Open vragen

1. **Locatie**: ieder de eigen stad zolang jullie apart wonen, of één gezamenlijke? (Nu: per apparaat, standaard Zevenaar.)
2. **Kerstsfeer-sneeuw** standaard aan of uit? (Nu: aan, uit te zetten bij Feestdagen.)
3. **Boomsoorten** (beantwoord 11 okt 2026): kers in de tuin en eik op het erf, met eigen seizoensgedrag (zie *Bomen*); beukenhaag, olijf en taxus blijven. Nog open: later een derde soort (bijvoorbeeld een berk of appelboom bij de villa), en eikels als herfstdeeltje?
4. Kerstboom in een vol huis: bij niveau 1–4 is er in de woonkamer geen vrij vak; hij staat dan in de slaaphoek of achter de bank. Goed zo, of liever een kleiner tafelboompje?
5. De nachtdoek ligt over een vogelstokje (er is geen kooi). Een echte kooi als meubel?
