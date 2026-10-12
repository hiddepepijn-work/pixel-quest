# Pixel Quest – app-UI

11 okt 2026, branch `app-ui`. De losse prototypepagina's zijn één app geworden: `app/index.html`, telefoon-eerst (390–430 px). **Huis-eerst, zoals een game:** het huis is het startscherm en vult het hele scherm; een dunne HUD ligt erboven en onderin opent de menuknop het menu **Vandaag · Quests · Kast · Winkel · Bouwen · Pets · Meer** óver het huis. Geen bundler: gewone scripts, werkt via `file://`, op de VPS en in Capacitor. Spelregels volgens [puntensysteem.md](puntensysteem.md) v2; schermen volgens [app-ontwerp.md](app-ontwerp.md) v2.

## Openen, bouwen, testen

- **Openen:** dubbelklik `app/index.html`. Met `?test` zie je rechtsboven de JS-foutenteller; `#kast`, `#quests` enz. opent het menu op dat tabblad (niet na herladen: dan start de app weer op het huis).
- **Bouwen:** `bash tools/bouw_web.sh` zet de app in `dist/` (`dist/index.html` = de app). De workflow `.github/workflows/ios.yml` roept dit ongewijzigd aan.
- **Testen:** `node tools/test_regels.js` (spelregels, zonder browser) en `PQ_PUPPETEER=<pad>/node_modules/puppeteer-core node tools/test_app.js [--dist]` (de app in Edge; zie *Testscript*).

## Schermen

| Scherm | Wat er werkt |
|---|---|
| **Wie ben jij?** | Bij de eerste start kies je Hidde of Tessie. Het apparaat onthoudt het; wisselen kan onder Meer. |
| **Het huis (startscherm)** | De scène vult het scherm (safe-areas gerespecteerd) met knijpzoom, pannen, dubbeltik, +, − en "alles in beeld" (zie *Zoom*). Startzoom 2× op het midden van de kamer van Hidde en Tessie, de grondlijn op ~76% van de hoogte. Taakbubbels hangen boven het meubel of de kamer van de **echte** taken (boven de kruin); tik = taakdetails met *Gedaan*. Linksonder "+ Taak", in het midden de menuknop (rugzak, "Menu", met een rustige badge), rechts de zoomknoppen. Vanaf de onderkant omhoog vegen opent ook het menu. Afvinken (waar dan ook) geeft het feestje in het huis: sterretjes en "+inzet" bij het meubel van de taak of boven wie hem deed, het lopende pet huppelt, de munten en het pet in de HUD springen. |
| **HUD** | Eén dunne balk bovenin, half doorzichtig crème met pixelrand: profiel (tik = Meer → profiel), "SAMEN X / Y" met mini-balk en 80%-streep (tik = sheet *Samen deze week* met streak, record, huispot en knoppen naar terugblik en taken), streak, huispot (tik = Bouwen), het actieve pet of ei met groeibalk (tik = Pets) en ☼ gereedschap: *Bewerken*, *Verhuisdoos*, *Verbouwen* en weer/seizoen/plaats/feestdagen/weerkleding/placeholders. |
| **Menu** | Telefoon: een paneel van ~70% hoog over het huis, met tabs bovenin; het huis schuift dan zo dat Hidde en Tessie boven het menu in beeld staan, en bij sluiten terug. Sluiten: omlaag vegen over de kop, ×, Escape of een tik op het huis. Breed scherm (≥ 900 px): een zijpaneel van 440 px rechts; het huis schuift naar het vrije stuk links. De menuknop opent altijd op Vandaag, dus afvinken kan in twee tikken (Menu → knop van de taak). Meldingen staan met het menu open over de HUD, zodat ze geen taken en geen feestje bedekken. |
| **Vandaag** (menu) | Eerst *Gevraagd aan jou*, *Jouw quests*, *Samen* en *Op het prikbord* (met "Ik pak het"), dan *Deze week* (X / Y, streak, huispot) en het pet (of ei) met groeibalk en een recent bedankje. Afvinken met de knop links (een icoon per soort taak, zelf te kiezen): feestje, 10 s "Ongedaan maken". |
| **Quests** (menu) | Filters Mijn, Open, Samen, Alles (met aantallen). Groepen *Nu*, *Deze week*, *Later* (ingeklapt) en *Gedaan deze week* (bedanken met ♥). Tik op een taak: details met afvinken, claimen/overnemen, loslaten, "Kun jij, Tessie?", bewerken, verwijderen, laatst gedaan. "+ Taak": bottom sheet met sjablonen, wie, herhalen, wanneer, minuten, zwaarte, soort werk, plek in huis, icoon en privé. |
| **Bouwen** (menu) | Huis-gereedschap (meubels verplaatsen, verhuisdoos, weer en weergave), de huispot, de *volgende verbouwing* bovenaan (kopen als voorstel, of "Nog N sparen") en daarna alle niveaus. *Bekijk in huis* sluit het menu en toont dat niveau als voorbeeld, met het hele huis in beeld. |
| **Kast** (menu) | De kledingkast compact: preview van Hidde of Tessie, de look per slot, slottabs, itemtegels, kleuren, stel-outfits, eigen outfits, de pixel-editor en weergave. De koopknop opent het item in de Winkel. |
| **Winkel** (menu) | Alles wat geld kost op één plek: Uitgelicht (wisselt per week), Kleding, Sets, Meubels en decor, Zeldzaam (drops en stel-sets) en Bouwen. Passen op je eigen figuur en als stel, kopen als voorstel met akkoord, daarna Aantrekken of Plaatsen. Zie [winkel.md](winkel.md). |
| **Pets** (menu) | De collectie van 14 pets: uitgekomen of ei met voortgang; tik = naam geven of laten meelopen (dan loopt hij in het huis en staat hij in de HUD). |
| **Meer** (menu) | Profiel (wisselen), open voorstellen, de weekterugblik (week in woorden, privé cijfer 1–5 met trots/dwars, samen onthullen, gespreksvraag bij ≥ 2 verschil, tekst daarna gewist), instellingen (weekdoel, ziek/afwezig, rustweek, plaats en licht, voorbeeldtaken verwijderen), *Over en sync*, debug (assetcontrole, losse pagina's, testweken) en een reset. |

Alles zonder `alert`, `confirm` of `prompt`: bevestigen gaat via een eigen sheet (`PQUI.vraag`). Foutmeldingen staan in gewone taal onderin (met een sheet open bovenin). Toegankelijkheid: tikvlakken ≥ 44 px, labels op icoonknoppen en sprites, focusval en Escape in sheets, pijltjes in de menutabs, `prefers-reduced-motion` zet springen, feestjes, glijden en overgangen uit. "Haptisch" gevoel is een korte indruk-animatie (`.tik`); `navigator.vibrate` werkt niet op iOS.

## Bestandskaart

| Bestand | Rol |
|---|---|
| `app/index.html` | De app: het huis (`#view-huis`), het menu met tabs en views, de markup van de kast, alle scripts in volgorde |
| `app/app.css`, `app/app-schermen.css`, `app/app-menu.css` | Basis (knoppen, taakrij, sheets, melding), per scherm, en huis-eerst (HUD, menuknop, menu, zijpaneel) |
| `app/store-regels.js`, `store-week.js` | Pure spelregels (`PQRegels`): inzet, week, klok, claims, norm, streak, pot, pet, eieren |
| `app/store-opdrachten.js`, `store-winkel.js` | Opdrachten (`PQOpdrachten.VOER[soort]`): taken, terugblik, weekdoel, afwezigheid, voorstellen, huis, kast, pets |
| `app/store-start.js` | Startstaat met 17 voorbeeldtaken; neemt een eerder huis/kast van de prototypes over |
| `app/store.js` | `PQStore`: log, opbouwen, opslaan, migreren, apparaatinstellingen |
| `app/ui.js` | `PQUI`: elementen, sprites, ei, melding, sheet, vraag, feestje |
| `app/app.js` | Schil: "Wie ben jij?", het huis als startscherm, menu openen/sluiten (knop, vegen, ×, tik op het huis, Escape), schermcyclus (maak/toon/verberg/ververs), badges, `pq-menu`-gebeurtenis |
| `app/app-taken.js`, `app-taken-sheet.js` | Selectie, taakrij, afronden + ongedaan, detail- en bewerk-sheet |
| `app/app-voorstel.js` | Kopen als voorstel, goedkeuren (ook "namens de ander op dit apparaat") |
| `app/scherm-huis.js` | Het startscherm: huis, HUD, menuknop, + Taak, zoomknoppen, gereedschap, feestje in huis, het huis laten meeschuiven met het menu |
| `app/scherm-*.js` | Menutabs: Vandaag, Quests, Kast, Bouwen (`scherm-verbouwen.js`), Pets (`scherm-collectie.js`), Meer |
| `app/winkel-*.js`, `app/scherm-winkel.js`, `app/winkel.css` | De winkel: data, regels (`PQWinkel`), afdelingen, koop-sheets, drops ([winkel.md](winkel.md)) |
| `app/huis.js`, `app/huis-zoom.js` | Het huis als component (`PQHuis.mount`) en zoomen/pannen (`PQZoom`) |
| `app/kledingkast.js` | Ongewijzigde kast-logica, met in de app looks en bezit uit de store |
| `app/assets.html` (+ `preview.js`), `huis.html` (+ `huis-los.js`), `kledingkast.html`, `huis-filmstrip.html` | Debugpagina's, bereikbaar onder Meer |
| `tools/test_app.js` | Scenariotest (Edge, puppeteer-core) |

## De store en het opdrachtenlog

Alles wat gedeeld is, verandert alleen via een **opdracht** `{ id (uuid), soort, data, door, tijd, v }`. `PQStore.doe(soort, data)` probeert de opdracht eerst op een kopie; lukt dat, dan komt hij in het log, wordt de staat bewaard en horen de schermen het. Lukt het niet, dan krijg je `{ ok: false, fout }` in gewone taal ("Er zit nog te weinig in de huispot (nodig: 400)."). De staat wordt altijd **opgebouwd** door het log na te spelen op de basis (`PQStart.basis`); er is geen los saldo, de pot en het weekdoel worden uit de afrondingen afgeleid.

- **Idempotent:** dezelfde `id` twee keer = één keer uitgevoerd (`PQStore.ontvang(ops)` slaat geziene id's over). De opdrachten gebruiken geen `Date.now()` of toeval, alleen `opdracht.tijd`, dus een server kan hetzelfde log later precies zo naspelen.
- **Ongedaan maken** is een eigen opdracht (`taak.ongedaan`) die de afronding markeert; de oorspronkelijke opdracht blijft staan (tegenregel, app-ontwerp §5.5).
- **Opslag:** `localStorage['pq-app'] = { versie: 1, basis, log }` (altijd in try/catch; lukt opslaan niet, dan zegt de app dat). `MIGRATIES[n]` zet een oudere versie om; een kapot bestand wordt bewaard als `pq-app-kapot` en de app begint schoon.
- **Per apparaat** (niet in het log): `pq-apparaat` = wie je bent, het laatste tabblad, het questfilter, de huiszoom.
- **Kleding en huis** staan in de store. Voor `figuur.js` (`lookVoor`) spiegelt de store de looks en het bezit naar de oude sleutels `pq-kk-look`/`pq-kk-bezit`. Een eerder ingericht huis (`pq-huis-staat`) en de oude kast worden bij de eerste start overgenomen.
- **Sync:** er is nog geen server. Meer zegt eerlijk: "Nog niet gesynchroniseerd met Tessie; dat komt met de server." Voorstellen goedkeuren kan daarom ook met "Tessie keurt goed (op dit apparaat)", die de opdracht met `door: tessie` boekt.

| Opdracht | Wat |
|---|---|
| `taak.nieuw`, `taak.bewerk`, `taak.verwijder`, `voorbeelden.weg` | taken (titel, minuten, zwaarte 0–2, eigenaar null/hidde/tessie/samen, interval, deadline, tijdslot, plek, soort werk, privé) |
| `taak.claim`, `taak.los`, `taak.verzoek`, `taak.verzoek.ja`, `taak.verzoek.nee` | prikbord, claimen (tot eind volgende dag of de deadline), overnemen, "Kun jij?" |
| `taak.klaar`, `taak.ongedaan`, `bedank` | afronden, tegenregel, hartje zonder punten |
| `weekdoel`, `afwezig.nieuw`, `afwezig.weg`, `rustweek` | norm (gaat de week erna in), ziek/weg/vakantie, rustweek vooraf |
| `terugblik`, `terugblik.onthul`, `terugblik.wis` | privé cijfer 1–5, samen onthullen, tekst wissen |
| `voorstel.nieuw`, `voorstel.akkoord`, `voorstel.nee`, `voorstel.intrekken` | kopen uit de huispot (verbouwing of kleding) met akkoord van de ander |
| `huis.inrichting`, `kleding.look`, `pet.actief`, `pet.naam` | inrichting na slepen, look per persoon, meeloper en naam |

## Spelregels in code (`store-regels.js`, `store-week.js`)

- **Inzet** = minuten × (1 + 0,3 · zwaarte), afgerond; privé = 0. Samen-taak: het hele getal telt voor de week (ieder de helft, alleen voor de woorden).
- **Week** begint maandag 04:00 (lokale tijd). **Norm** = het weekdoel van die week, min per afwezige dag diens aandeel (50/50 → 600/7/2 ≈ 43), samen weg = 0 voor die dag; een aangekondigde rustweek = 0 (bevroren). Golden test A (693 van 600, Hidde 316, Tessie 377) en B (norm 514) kloppen met node.
- **Gehaald** bij ≥ 80%. **Streak** telt gehaalde weken; een gesloten, niet-gehaalde week gebruikt automatisch de rustweek van die kalendermaand, anders breekt de streak. Het record blijft.
- **Huispot:** per week 0,5 × min(inzet, norm), samen minus de goedgekeurde aankopen.
- **Pet:** XP = samen-inzet sinds het pet meeloopt. Draakje: ei tot de eerste gehaalde week, dan draakje (0), jonge draak (1.500), draak (5.000). Andere pets: baby/jong/volwassen op dezelfde grenzen. Nooit dood, geen straf.
- **Eieren** (§9-tabel): komen uit op samen-mijlpalen (gehaalde weken, bedankjes, taken op tijd, 20× planten, 8× boodschappen, enz.). De soort klus komt uit de titel (`categorieVan`) of een eigen `categorie`.
- **Behoefte-klok:** klok = dagen sinds laatst / interval; fris < 0,7, dorstig < 1, hangend daarboven. Het plant-item uit het blad toont de stand (met tekst), het huis een glinster of vraagteken.

## Zoom (Huis)

`huis-zoom.js` houdt `eff` (schermpx per artpx) en `tx, ty` bij en zet één CSS-transform op de laag met het diorama. Twee vingers knijpen (punt tussen de vingers blijft staan), één vinger pant, dubbeltik zoomt naar 3× of terug naar alles in beeld, Ctrl + scrollwiel of knijpen op een trackpad zoomt op desktop, gewoon scrollen pant. Na een veeg glijdt het beeld uit (traagheid). De rand van de getekende wereld is een harde grens: pannen, knijpen en de traagheid stoppen daar, zonder rubberband (zie [perf.md](perf.md)).

**Scherpte:** tijdens het gebaar schaalt de transform de laag (alles met `image-rendering: pixelated`). Na het gebaar klikt de zoom vast op een **hele stap** (1×–4×) en tekent het huis zichzelf op die schaal opnieuw (`herteken(Z)`), zodat de transform weer precies 1 is en elke artpixel een heel aantal schermpixels. Onder 1× ("alles in beeld" op de telefoon) is de zoom vrij en schakelt de laag naar zacht verkleinen. "Alles in beeld" zet de scène in het midden van het zichtbare stuk. De stand (zoom en midden) wordt per apparaat bewaard.

**Startzoom (zoom-fix, 12 okt 2026).** Op Hiddes iPhone opende het huis piepklein onderin (zoom ≈ 0,59 = "alles in beeld") met een vlak luchtvlak erboven. Oorzaak: de bewaarde zoomstand (`huisZoom`) uit eerder gebruik, waarin "alles in beeld" was opgeslagen; die werd bij elke start teruggezet. Nu: de oude sleutel wordt bij de start weggehaald (migratie), de nieuwe `huisZoom2` bewaart alleen hele stappen van 2× tot 4×, en bij het lezen wordt een stand verworpen als hij geen hele stap van 2–4× is of zijn midden buiten de scène ligt. Standaard is 2× op de kamer van Hidde en Tessie, met de vloer op ~2/3 van de hoogte. Zolang niemand het huis aanraakt, wordt de start opnieuw bepaald als de maat van het venster verandert (na `load`, een resize van `visualViewport`, de eerste twee frames, na 600 ms en via de ResizeObserver), omdat de maten en safe-areas in WKWebView vlak na het mounten nog kunnen verschuiven.

**De wereld rond het huis.** De scène zelf blijft even groot. Daaromheen tekent `huis-verte.js` een *verte*: een aparte canvas onder het decor met alleen het zichtbare stuk plus 25% marge, op dezelfde artpx-coördinaten. Die wordt alleen opnieuw getekend als het beeld buiten dat stuk komt, of bij een nieuw dagdeel. Boven lopen de gedithered luchtbanden door in de bovenste band (hoog in de lucht een tint donkerder), met wolken en 's nachts sterren per vak met een vast zaad. Opzij lopen heuvels, de verre bomenrij en het gras door. Onder volgen aardlagen die dieper donkerder worden, met stenen en wortels. De dagdeel-tint en de weerdeeltjes (regen, sneeuw, blad) bedekken hetzelfde stuk. De wereld loopt tot 360 artpx opzij, 900 erboven en 360 eronder; dat zijn ook de pan-grenzen. Je kunt uitzoomen tot het huis met zijn erf de breedte of de hoogte vult, maar nooit zo ver dat de wereld het scherm niet meer vult. Er is dus nergens meer een leeg kleurvlak (getest met `tools/qa/zoom.js`: magenta-achtergrond, 0 pixels zichtbaar).

**Conflicten:** in de bewerkmodus begint een sleep op een meubel of bewoner een verplaatsing (pointer capture) en pant alleen een lege plek. Een veeg of knijp houdt de klik erna tegen, zodat je niet per ongeluk een signaal opent of een pet aait. Het menu legt een *veld* op de zoom (`zetVeld`): met het menu open mag je verticaal (telefoon) of horizontaal (zijpaneel) verder pannen, zodat het huis boven of naast het menu in beeld kan.

**Batterij:** er draait maar één huis tegelijk (`PQHuis.mount(...).hervat()` pauzeert het vorige). Verlaat je het tabblad, dan stoppen de loopanimaties, de pet-timers en de weerdeeltjes.

## Testscript

`tools/test_app.js` draait in Edge (headless) via puppeteer-core, als telefoon met touch (standaard 390×844, `--maat 430x932`) en daarna als desktop (1400×900), met een leeg profiel. Laatste run (zoom-fix): **57 goed, 0 fout** op 390 en 430 px, zowel `app/` als het gebouwde `dist/` via `file://`. De QA-scripts (`bash tools/qa/alles.sh`, dist via http op 390 en 430 px) zijn naar de nieuwe navigatie omgezet, plus `zoom.js` (startzoom op een nagebootste iPhone, uitzoomgrens, geen gaten): **220 goed, 0 fout**; `node tools/test_regels.js`: alles goed. Schermafbeeldingen staan in `test-uitvoer/` (`app`, `app430`, `dist`, `dist430`, `qa`; niet in git).

De uitgebreide QA-ronde vóór de eerste uitrol staat in [qa-app-ui.md](qa-app-ui.md). In de QA-scripts opent `h.tab(naam)` nu het menu op dat tabblad en sluit `h.tab('huis')` het menu.

Getest in `test_app.js`: eerste start en "Wie ben jij?"; start op het huis met de HUD en startzoom 2×; menuknop opent Vandaag; taak maken; afronden (feestje op het scherm én in het huis, weekdoel +inzet, pot stijgt); ongedaan maken; afvinken in twee tikken (Menu → knop); menu sluiten met een tik op het huis en omlaag vegen, openen met omhoog vegen vanaf de onderkant; claimen; knijpen in en uit met twee touchpoints, vastklikken op een hele stap, pannen, alles in beeld, knop +, zoom bewaard; bewerken via het HUD-gereedschap (meubel slepen boekt `huis.inrichting` en pant niet, een lege plek pant wel); verbouwing kopen via Menu → Bouwen met akkoord; kleding kopen; herladen (alles bewaard, weer op het huis); elk menutabblad zonder JS-fouten en zonder horizontale scroll; desktop met zijpaneel en Ctrl + scrollwiel; `prefers-reduced-motion`.

Niet getest: een echte iPhone (Safari/WKWebView: knijpen, safe-areas, `:has()`), Android, VoiceOver, twee telefoons tegelijk (er is geen server), offline/online, de terugblik-flow en ziek/rustweek via de UI (wel de rekenregels), de pixel-editor en eigen outfits in de nieuwe kast-layout, alle 10 niveaus op het scherm.

## Nog niet gebouwd

- **Server en sync:** geen `/api/opdracht`, outbox, live (SSE), koppelcode of inloggen. Het log is er klaar voor.
- **Meldingen** (Web Push of lokaal), **agenda/ICS** (feeds, import, vrije tijd, *Plan voor ons*), **Uurwerk/Jarvis**.
- Fase 3 deels: geen verdeelvoorstel, herhaalbare mijlpalen/vouchers, verrassingsdrops, verrassingstaken, ruilen 1-op-1, nest van 3 eieren (alle eieren lopen tegelijk), cadeau inpakken, extra kastvakken.
- Onboarding van Tessie (koppelcode, toestemming, eerste quest met de ~15 sjablonen samen waarderen) en de "voorlopig"-tint van sjabloonwaarden.
- "Vast" herhalen (dinsdagavond afval): nu alleen behoefte ("~elke n dagen").

## Open punten en keuzes

1. **Zwaarte 0–2 of 0–3?** De opdracht noemde 0–3, puntensysteem §3 zegt {0, 1, 2}. Gebouwd volgens het puntensysteem (licht, gewoon, zwaar).
2. **Het ei.** Volgens §9 is het draakje een ei tot de eerste gehaalde week; tot dan lopen er geen pets door het huis. Er is geen ei-art: het ei is een kleine CSS-vorm. Willen jullie het draakje meteen?
3. **Toewijzen** is "Kun jij?" (een verzoek dat de ander aanneemt of teruglegt), zoals §6. Direct toewijzen bestaat niet.
4. **Weekdoel wijzigen** gaat de week erna in (app-ontwerp §2.8); het akkoord van allebei is er nog niet.
5. **Pinch op iOS:** `user-scalable=no` en `gesturestart` houden de paginazoom tegen; op een echte iPhone nog proberen.
