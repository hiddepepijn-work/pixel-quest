# Pixel Quest – de winkel

12 okt 2026, branch `winkel`. Bouwt op [puntensysteem.md](puntensysteem.md) §10 (huispot) en de spec `spec-kleding-weer-seizoenen-feestdagen.pdf` ("Kleuren", "Kopen en sets"). De winkel is een eigen tab in het menu: **Vandaag · Quests · Kast · Winkel · Bouwen · Pets · Meer**. De Kast is je kledingkast en wat je draagt; de Winkel is kopen. De koopknop in de Kast opent het item in de winkel.

## Afdelingen

Bovenin: de huispot (tik = uitleg), open voorstellen, **voor wie** je kijkt (Hidde of Tessie) en het filter **Kan ik betalen**. De afdelingen staan in een balk die bij het scrollen bovenaan blijft plakken. Afdeling, persoon en filter onthoudt het apparaat (`pq-apparaat.winkel`, niet gedeeld).

| Afdeling | Wat |
|---|---|
| **Uitgelicht** | De set van de week, 2–3 losse items en de *kleuren van de week*. Wisselt elke maandag (04:00). |
| **Kleding** | Alle getekende items voor dit lichaam, per slot (Alles, Hoofd, Boven …). Tegel = het item op je eigen figuur, met prijs of *in bezit* / *draag je* / *N kleuren*. Onderaan wat nog in de maak is. |
| **Sets** | Alle sets met beide figuren in de set, losse som doorgestreept, setprijs, korting naar rato. |
| **Meubels** | Meubels uit `assets/huis.js` die niet in de startinrichting staan, plus 13 nieuwe decoritems. Groepen: nieuw decor, planten, lampen, aan de muur, buiten. |
| **Zeldzaam** | Wat niet te koop is: de zeldzame kleuren, de volgende drops met voortgang, jullie drops, en de stel-sets (op slot met voorwaarde, of *in jullie kast*). |
| **Bouwen** | Kaart van de volgende verbouwing met prijs en "Naar Bouwen". Zo staat alles wat geld kost op één plek. |

Een tik op een tegel opent een sheet:

- **Kleding:** de paspop (jij in het item), met *Samen (stel-look)*: Hidde en Tessie naast elkaar, allebei in de nieuwe look; bestaat het item niet voor het lichaam van de ander, dan staat dat eronder. Daaronder de kleurstalen (✓ in bezit, gestreept = niet deze week, ✦ zeldzaam), prijs, *Je hebt 2 van 5 kleuren*, *Hoort bij de set …* en de knop.
- **Set:** paspop en stel-look in de set, de items met *in bezit* of losse prijs, en de uitleg van de korting.
- **Meubel:** de placeholder-tekening groot, waar hij past, *vraagt een tuin (verbouwing 4)* of *er is nu geen vrije plek* (kopen kan wel: hij wacht in de doos), en hoeveel jullie er al hebben.

De knop zegt altijd wat er kan: **Kopen 30** (goud), **Nog 12 sparen (~1 dag)**, **Voorstel staat open**, **Komt terug in de winkel**, **Alleen als drop**, **Vraagt tuin (niveau 4)**, of **Aantrekken** als je het al hebt.

**Kopen** gaat als voorstel uit de gedeelde huispot met akkoord van de ander (`app-voorstel.js`, hergebruikt). Zolang er geen server is, staat de testknop "Tessie keurt goed (op dit apparaat)" erbij. Na het akkoord volgt een feestje (*Gekocht!*) met **Aantrekken** (kleding en sets: de look wordt meteen bijgewerkt) of **Plaatsen** (meubel: menu dicht, bewerkmodus aan, het meubel uit de doos midden in een passende kamer, gekozen en in beeld; daarna slepen). Past er niets, dan wordt het **Ruimte maken**. Elke aankoop staat in **Meer → Aankopen** (wie voorstelde, wie goedkeurde, prijs, plus de gratis drops).

**Lege toestand:** met een lege pot staat bovenin "Nog geen munten? Rond samen een paar quests af" met een knop naar Quests; met het filter aan en niets binnen bereik: "Nog niets binnen bereik".

## Prijzen en economie

Prijzen komen uit `PQ_KAST.items[].prijs` (spec: hoofd, schoenen en accessoire 20–40; boven en onder 30–60; jas en heel lichaam 50–90). Meubels en decor kosten 15–140 (`winkel-data.js`). Prijzen zijn vast en dalen nooit.

| Wat | Prijs |
|---|---|
| Basiskleur van een item | de itemprijs (nu gemiddeld 40) |
| Extra kleur van een item dat je al hebt | de helft, afgerond op 5, minstens 10 |
| Set | som min 20%, **naar rato**: 0,8 × de som van wat je nog mist (winterwandeling 165 → 132; met de sjaal al in bezit 112) |
| Stel-set, zeldzame kleur | niet te koop |
| Meubel of decor | 15–140 (gemiddeld 53) |
| Verbouwing | 400–3.000 (in Bouwen) |

**Inkomen:** de huispot krijgt 0,5 munt per inzet, tot de weeknorm: hooguit **300 per week ≈ 43 per dag** samen. De winkel zelf geeft **geen munten** (geen terugverkoop, geen beloning voor kopen; drops zijn items, geen munten), zoals de spec voor events voorschrijft.

| | samen (volle pot) | per persoon (de helft van de pot) |
|---|---|---|
| hoofd/accessoire (20–40) | ½–1 dag | 1–2 dagen |
| boven/onder (30–60) | 1–1½ dag | 2–3 dagen |
| jas/heel lichaam (50–90) | 1½–2 dagen | 3–4 dagen |
| set winterwandeling (132) | 3 dagen | ~6 dagen: ruwweg een week |
| set studiedag (84) | 2 dagen | 4 dagen |
| verbouwing 2 (400) | 9 dagen | – |

Een normaal item kost dus een paar dagen sparen per persoon en een set ongeveer een week. "Nog N sparen (~D dagen)" rekent met de volle week (`PQWinkel.dagen`). Putten in totaal: alle basiskleuren voor allebei ≈ 2.700, alle extra kleuren ≈ 4.300, alle meubels ≈ 1.800, alle verbouwingen 11.900: samen ruim een jaar volle pot, en er komen nog items bij.

## Uitgelicht, rotatie, drops en sets

- **Uitgelicht** (`PQWinkel.uitgelicht(week, fid)`): deterministisch op het weeknummer. De set is `sets[weekIndex % n]` uit de verkoopbare sets (compleet getekend, niet de startkast); de 3 items zijn een geschudde keuze met een zaad uit de week (één per slot, geen startkast, niet uit de set). Geen `Math.random`: elke telefoon en later de server ziet hetzelfde.
- **Gewone slots / kleuren van de week** (`rotatie(week)`): alle extra kleuren (niet de basiskleur) van alle getekende items in een vaste geschudde volgorde; elke week de volgende 8. Zo komt elke kleur vanzelf terug. De basiskleur is altijd te koop. Een extra kleur kopen buiten de rotatie weigert de store ("is deze week niet te koop"). Een voorstel blijft geldig als de week ondertussen wisselt (gecontroleerd op het moment van het voorstel).
- **Sets kopen:** alle sets zijn het hele jaar te koop in Sets; de set van de week staat bovenaan Uitgelicht. (De spec noemt het uitgelicht-slot; een set alleen in zijn week verkopen zou missen-is-weg betekenen, wat de spec elders juist vermijdt.) Een set is te koop als al zijn items voor dat lichaam getekend zijn; anders staat er "2 van 3 getekend".
- **Drops** (opdracht `drop`, `store-winkel.js`): bij elke 3 gehaalde weken (glitter, dan regenboog, om en om) en bij een streak-record van 4, 8, 12 … (de seizoenstint van dat moment: lente-, zomer-, herfst- of wintertint). Een drop geeft Hidde én Tessie een zeldzame kleur op een item dat ze al hebben. Het apparaat dat de mijlpaal ziet, boekt de opdracht; de sleutel (`gehaald:6`, `record:4`) zorgt dat hij maar één keer wordt uitgedeeld, en de store controleert of de mijlpaal echt bereikt is. De inhoud volgt uit de sleutel en de staat (hash, geen toeval). Melding met feestje; de drop staat in Winkel → Zeldzaam, in **Pets** (kaart *Zeldzame kleuren*) en in Meer → Aankopen. In de Kast verschijnen zeldzame kleuren als extra staal met ✦.
- **Stel-sets** (`winkel-data.js stelsets`): *Samen warm* (4 gehaalde weken), *Date night* (8), *Zondagochtend* (10 samen-taken), *Pyjamafeest* (15 bedankjes). Ook een `drop` met sleutel `stelset:<id>`. De items komen voor allebei in de kast; wat nog op art wacht, komt vanzelf zodra het getekend is.
- **Set dragen = glinstering:** draagt iemand van elk slot van een set (minstens 2 slots, niet de startkast; stel-sets tellen ook) een item uit die set, dan krijgt die bewoner in huis een paar pixelsterretjes (`huis.js glans`). Ze zijn één keer getekend in twee standen; het bestaande loopgedrag wisselt de stand hooguit eens per 0,9 s (alleen zichtbaarheid, geen tekenwerk, geen CSS-animatie). Tijdens gebaren wordt niets getekend (perf.js groen).
- **Startkast:** per persoon de items met `startkast: true` in `PQ_KAST` (shirt, broek, schoenen, pyjama, en Tessies kettinkje), gratis in de basiskleur, **alleen als ze getekend zijn**. Dat is een afgeleide stap bij elke opbouw van de staat (`PQWinkel.afgeleid`), dus de pyjama komt bij een bestaand log vanzelf in de kast zodra hij op `klaar` staat. Zonder vlaggen valt het terug op `winkel-data.js startkast`.

## Hoe de data wordt ingelezen

- **Kleding:** alles uit `window.PQ_KAST` (`assets/kast.js`, gegenereerd door de kleding-agent): `items[]` met `slot`, `lichaam`, `kleuren` (de eerste = basiskleur), `prijs`, `set_id`, `zeldzaamheid`, `tags`, `status`, `startkast`, en `sets[]`. Alleen items op `status: 'klaar'` zijn te koop of te passen; de rest staat onder "Binnenkort". De winkel hard-codeert geen item: komen er 44 items bij, dan staan ze er na de volgende build vanzelf in (tegels, sets, rotatie, uitgelicht, drops). Alleen de stel-sets noemen item-id's; ontbreekt een item, dan wordt het overgeslagen.
- **Zeldzame kleuren** zijn kleurrampen (5 stops) in `winkel-data.js`; bij het laden worden ze aan `PQ_KLEDING.rampen` toegevoegd, zodat `figuur.js` ze tekent zoals elke andere kleur.
- **Meubels:** `PQ_HUIS.meubels` + de prijzen in `winkel-data.js meubelprijs`. Het extra decor staat in `winkel-data.js decor` in exact het meubelschema van `docs/huis.md` (`op`, `hoort`, `maat`, `delen`, `licht`) en wordt bij het laden in `PQ_HUIS.meubels` gezet (`winkel: true`, `placeholder: true`). **Alle 13 decoritems zijn placeholders** in de bestaande code-tekenstijl (vloerkleed, wandlamp, hangplant, monstera, cactus, fotolijstjes, spiegel, wandklok, wandkunst zee, poster, vogelhuisje, lantaarn, moestuinbak); in de winkel en in de bewerkmodus staan ze gemarkeerd als placeholder. Een sprite vervangt ze later zonder codewijziging.
- **Kamers en niveaus:** `meubelVraagt(soort, niveau)` zoekt of een kamer van het huidige niveau in `hoort` staat; anders de eerste verbouwing die zo'n kamer geeft ("vraagt tuin (niveau 4)"). Zo'n meubel is pas te koop als de kamer er is. Een gekocht meubel krijgt id `<soort>-w<n>` en gaat in `huis.doos`. *Indeling herstellen* zet gekochte meubels voortaan in de doos in plaats van ze te laten verdwijnen.

## Bestanden

| Bestand | Rol |
|---|---|
| `app/winkel-data.js` | Startkast, kortingen, rotatie, zeldzame kleuren, drops, stel-sets, meubelprijzen, decor (placeholders); registreert rampen en meubels |
| `app/winkel-regels.js`, `app/winkel-drops.js` | `PQWinkel`, puur (node en browser): prijzen, rotatie, uitgelicht, sets, meubels, mijlpalen, drop-inhoud, afgeleide kast, glinstering, spaartijd |
| `app/store-winkel.js` | Voorstellen voor `kleding`, `set`, `meubel` (naast `verbouwing`) en de opdracht `drop` |
| `app/scherm-winkel.js`, `winkel-afdelingen.js`, `winkel-zeldzaam.js` | De tab, de afdelingen en Zeldzaam |
| `app/winkel-ui.js`, `winkel-sheet.js`, `winkel-feest.js` | Beeldjes en paspop, de koop-sheets, het feestje na aankoop en het boeken van drops |
| `app/winkel.css` | Stijl |
| `tools/qa/winkel.js` | QA-scenario (ook in `tools/qa/alles.sh`, op 390 en 430 px) |

Testen: `node tools/test_regels.js` (o.a. startkast, setkorting naar rato, halve prijs extra kleur, rotatie, uitgelicht per week, meubel vraagt tuin, drop één keer, economie, naspelen) en `PQ_PUPPETEER=… bash tools/qa/alles.sh`.

## Open punten

1. **Vrij kopen of elk de helft?** Iedereen koopt uit dezelfde pot (puntensysteem §10 laat dit open). De spaartijd "per persoon" in deze doc rekent met de helft.
2. **Verrassingsdrop 1/25 bij een taak** (puntensysteem §10) is niet gebouwd; de drops komen alleen bij mijlpalen en streaks.
3. **Cadeau inpakken (5), extra kastvakken (75)** en event-items (Sinterklaas, Kerst) zijn nog niet in de winkel.
4. **Het starthuisje is vol:** een vloermeubel past daar pas na ruimte maken of een verbouwing. De winkel zegt dat vooraf.
