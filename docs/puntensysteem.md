# Pixel Quest – puntensysteem

Versie 2, 10 okt 2026. Deze versie verwerkt [controle-ontwerp.md](controle-ontwerp.md) en bouwt op [onderzoek-taken-apps.md](onderzoek-taken-apps.md); verwijzingen naar het onderzoek staan er als *(onderzoek §3.1)*. De techniek staat in [app-ontwerp.md](app-ontwerp.md). Alle getallen zijn startwaarden, die jullie na twee weken samen bijstellen (bijlage). De open keuzes staan in één lijst: app-ontwerp §9.

## 1. Uitgangspunten

1. **Samen tegen de klus.** Er is één weekdoel, één streak en één pet. Niemand wint *(onderzoek §3.3)*.
2. **Punten maken werk zichtbaar en zijn geen stand.** Er is geen persoonlijk saldo dat je kunt vergelijken. Er zijn geen percentages en geen bonus voor wat de ander liet liggen *(§3.1, controle R1/R2)*.
3. **Denkwerk is gewoon werk.** Plannen en bijhouden zijn taken met een eigenaar en een waarde *(Daminger, Fair Play, §3.1)*.
4. **Belonen gebeurt cosmetisch en samen.** De munten komen pas met de winkel, en ze komen in één gedeelde pot *(Deci 1999, §3.2)*.
5. **Er is geen straf.** Het pet gaat nooit dood. Wie ziek is, verlaagt de norm. Een gemiste week kost niets *(Finch/Habitica, §3.4)*.

## 2. Het hele MVP-systeem in vijf begrippen

| Begrip | In één zin |
|---|---|
| **Inzet** | Hoeveel gewogen minuten een klus kost. |
| **Weekdoel** | Samen halen jullie de weeknorm: "Samen 420 van 600". |
| **Streak** | Het aantal weken op rij dat jullie samen minstens 80% van de norm haalden. |
| **Pet** | Het draakje groeit op jullie samen-inzet. |
| **Bedankje** | Een hartje op de taak van de ander. Het levert niets op, behalve een blij pet. |

Meer is er in fase 1 niet. Alles daarna (winkel, collectie, mijlpalen) bouwt op dezelfde inzet en staat in §10.

## 3. Inzet

```
inzet = minuten × (1 + 0,3 · zwaarte)        zwaarte ∈ {0, 1, 2}  →  factor 1,0 / 1,3 / 1,6
```

Zwaarte is één knop. Die beantwoordt de vraag "hoe zwaar of vervelend is dit?", en jullie beantwoorden hem samen. Minuten zijn de normale duur, niet de snelste. De uitkomst wordt naar een heel getal afgerond, met de helft naar boven. Bij een samen-taak krijgt ieder de helft van de inzet.

| Sjabloon | soort werk | min | zwaarte | inzet |
|---|---|---|---|---|
| Vaatwasser uitruimen | doen | 10 | 1 | 13 |
| Koken | doen | 40 | 0 | 40 |
| Boodschappen | doen | 45 | 1 | 59 |
| Badkamer | doen | 45 | 2 | 72 |
| Stofzuigen | doen | 30 | 1 | 39 |
| Was draaien + ophangen | doen | 25 | 0 | 25 |
| Was vouwen | doen | 20 | 1 | 26 |
| Planten water geven | doen | 5 | 0 | 5 |
| Afval buiten zetten | doen | 5 | 1 | 7 |
| Weekmenu + boodschappenlijst | plannen | 30 | 0 | 30 |
| Sociale agenda bijhouden | plannen | 20 | 0 | 20 |
| Geld & administratie | plannen | 20 | 0 | 20 |
| Voorraad bijhouden | bijhouden | 20 | 0 | 20 |

**Samen bevestigd.** Wie een sjabloon maakt, stelt de minuten en de zwaarte voor. De ander bevestigt of past aan in de wekelijkse terugblik. Tot dan staat de waarde grijs als *voorlopig*, maar hij telt wel mee. Een aanpassing geldt alleen vooruit; er wordt niets herrekend *(§3.4: zwaarte is subjectief, dus beide partners stellen hem vast)*. Bij de start waarderen jullie samen de eerste ~15 sjablonen. Dat is de eerste quest (app-ontwerp §3.0).

**Soort werk** (`doen`, `plannen` of `bijhouden`) verandert niets aan de waarde. Het bepaalt alleen hoe de week in woorden wordt beschreven (§5).

## 4. Onzichtbaar werk: vaste plantaken met een eigenaar

Het denkwerk dat over losse klussen heen gaat, wordt een **gewone terugkerende taak met een vaste eigenaar** en soort `plannen` of `bijhouden`. Voorbeelden zijn "Weekmenu + boodschappenlijst" (elke zondag, 30), "Sociale agenda bijhouden" (wekelijks, 20) en "Geld & administratie" (wekelijks, 20). De eigenaar vinkt de taak af wanneer het werk die week gedaan is, net als bij de vaatwasser. Er is geen apart object, er is geen "liep"-tik en wie de terugblik overslaat, verliest niets *(controle: schrappen domeinkaarten)*.

Een taak heeft altijd één eigenaar die de keten draagt *(Fair Play, §3.1)*. Een plantaak overdragen gaat via een verzoek dat de ander accepteert (§6). Een eenmalige planklus, zoals een cadeau regelen of de vakantie boeken, is een gewone taak met soort `plannen`.

## 5. Eerlijkheid zonder scorebord

- **De week in woorden.** In het weekscherm staat "Samen 693 van 600 – gehaald". Daaronder staan per persoon woorden en iconen: "Hidde: koken, badkamer, de fiets, geldzaken. Tessie: was, boodschappen, eten plannen, verjaardagen." Er staat geen balk en er staan geen getallen. Wie die wil zien, tikt op "details", en ook daar staan ze zonder percentages *(controle R5)*.
- **Gevoelde eerlijkheid is de maat.** In de terugblik geeft ieder privé een cijfer van 1 tot 5 op de vraag "Voelde deze week eerlijk?". Daarna onthullen jullie samen. Verschillen jullie twee punten of meer, dan stelt de app één gespreksvraag *(Le & Aune, §3.1)*.
- **Afspraak-signaal (fase 3, heeft data nodig).** Eén regel: wijkt de verdeling in **3 van de laatste 4 weken** meer dan 15 procentpunt af van jullie afspraak, gecorrigeerd voor afwezigheid, dan staat er in de terugblik: "De verdeling liep de laatste weken anders dan jullie afspraak. Klopt dat voor jullie?" Er staat geen naam bij, geen getal en er volgt geen melding.
- **Bedankje.** Een hartje op een afgeronde taak laat het pet blij springen en komt terug in de terugblik. Het levert bewust geen punten op. Het onderzoek noemt "bonuspunt voor dank je wel" (Nipto), maar punten voor dank maken zorg tot een transactie *(§3.2)*. Dit is een bewuste afwijking.

## 6. Prikbord, claimen, verzoek, overnemen

- **Het prikbord is de standaard.** Een nieuwe taak zonder "wie" ligt open voor allebei, zodat niemand de manager is *(Maple/Cozi, §3.4)*.
- **Claimen.** Een claim geldt tot het eind van de volgende dag of tot de deadline. Daarna gaat de taak stil terug naar het prikbord.
- **Verzoek in plaats van toewijzen.** Met "Kun jij dit doen?" stuur je een vraag. De ander accepteert of legt de taak terug, en nee zeggen kost niets.
- **Overnemen.** Pak je een taak die de ander geclaimd had, dan krijgt die een vriendelijke melding ("Hidde nam de boodschappen over"). Er is geen bonus: de hangende plant is signaal genoeg *(controle R2)*.
- **Ruilen 1-op-1** volgt in fase 2: taak tegen taak, met akkoord van allebei, en zonder munten erbij.

## 7. Behoefte-klok

Er zijn twee soorten terugkerende taken. **Behoefte** ("~elke 7 dagen") begint opnieuw te tellen bij het afronden. **Vast** ("dinsdagavond afval") hangt aan een vaste dag. Voor een behoefte-taak geldt `klok = dagen sinds laatst / interval`. Het blad-icoon *plant* toont drie standen, en elke stand heeft een eigen icoon en tekst, zodat het niet alleen om kleur gaat:

| Stand | Klok |
|---|---|
| fris | < 0,7 |
| dorstig | 0,7 – 1,0 |
| hangend | > 1,0 |

De *gieter* is de afvinkknop. De klok bepaalt de volgorde op het prikbord. Er gaan **standaard geen alarmen** af *(Tody-kritiek, §3.4)*.

## 8. Weekdoel en stel-streak

- **Weeknorm.** De norm is wat jullie samen in een week doen, met als start 600 inzet.
- **Gehaald.** Een week is gehaald bij ≥ 80% van de (aangepaste) weeknorm. Dat is de enige drempel. De voortgangsbalk loopt tot 100% voor het gevoel, maar 80% telt.
- **Afwezigheid (fase 2).** Is één van jullie ziek of weg, dan zakt de norm per dag met **diens aandeel** uit de afspraak: bij 50/50 is dat 300 / 7 ≈ 43 per dag, bij 45/55 is dat voor Tessie 330 / 7 ≈ 47. Zijn jullie samen op vakantie, dan is de norm voor die dagen 0. Een week met norm 0 is *bevroren*: hij telt niet en breekt niets.
- **Rustweek (fase 2).** Je hebt één rustweek per kalendermaand. Haal je een week niet en heb je die maand nog een rustweek, dan zet de app die er vanzelf in en loopt de streak door. Je kunt een rustweek ook vooraf aankondigen ("drukke deadlineweek").
- **Breuk.** Breekt de streak toch, dan blijft je **record** staan. De volgende gehaalde week begint een nieuwe streak. Er is geen herstelweek en niets gaat verloren *(onderzoek §3.4, controle R4)*.
- **Weeksluiting.** De week sluit maandag om 04:00 vanzelf, ook zonder terugblik, zonder dat dat iets kost. Een afronding die offline gebeurde en later binnenkomt, telt in de lopende week, met de oorspronkelijke datum erbij.

## 9. Het pet

**MVP: één draakje** dat mee loopt op Vandaag. Het groeit op de **totale samen-inzet**, dus er is geen aparte XP:

| Stadium | Samen-inzet sinds start |
|---|---|
| ei | – (komt uit na de eerste gehaalde week) |
| draakje | 0 |
| jonge draak | 1.500 |
| draak | 5.000 |

Bij ~700 inzet per week is dat ongeveer 2 weken tot jonge draak en 7 weken daarna tot draak.

Het pet gaat **nooit dood, wordt nooit ziek en verwijt niets.** Zonder activiteit slaapt het onder een dekentje en zegt bij terugkeer "Ik heb je gemist!". Is één van jullie ziek, dan ligt het pet bij die persoon op de bank. Aaien kan, maar er is geen honger-meter. Er is ook geen schade als de ander iets mist *(§3.4)*. Voor elk stadium is art nodig; die bestaat nog niet (LEESMIJ "Groei van ei naar draak").

**Fase 3: collectie van 13 pets** via een nest met 3 eieren dat jullie samen kiezen. Taken van allebei tellen mee, en er zijn geen sterren of munten voor nodig:

| Pet | Ei komt uit na |
|---|---|
| Konijntje | 2 gehaalde weken |
| Hondje | 4 gehaalde weken (trouw) |
| Katje | 10 bedankjes gegeven |
| Parkietje | 10 taken met tijdslot op tijd gedaan |
| Kikkertje | 20× planten water geven |
| Cavia | 8× boodschappen |
| Schildpadje | 3 lange klussen (≥ 90 min) |
| Salamander | 6× badkamer |
| Kameleon | 5 ruilen of overnames |
| Haaitje | 30× afwas of vaatwasser |
| Ottertje | 10 samen-taken |
| Egeltje | 5 buitentaken tussen sep en nov |
| Varkentje | 10× opruimen of afval |

Art per groeistadium komt per seizoen *(controle R15)*. Een nieuw pet kan meelopen; de groei geldt dan voor dat pet.

## 10. Na de MVP: huispot, winkel en mijlpalen (fase 3)

**Huispot: één gedeelde pot met munten.** Elke week komt er 0,5 munt per inzet in, tot **maximaal de weeknorm** (dus ≤ 300 per week). Wie meer doet, levert geen persoonlijke munten op, en extra of nep-inzet boven de norm levert niets op.

- **Uitgeven.** Ieder koopt uit dezelfde pot voor de eigen kast of als cadeau. Elke aankoop verschijnt in de feed. Of jullie vrij uit de pot kopen of elk de helft van het inkomen krijgen, is een keuze.
- **Inflatierem.** De inkomsten zijn begrensd door de norm. Prijzen zijn vast en dalen nooit. Munten kun je nergens in omwisselen. Putten zijn de winkelitems, extra kastvakken, cadeau-inpakken en een seizoenscollectie. De pot meet bij elke weeksluiting hoeveel er verdiend en uitgegeven is. Het doel is dat 70–100% van de munten wordt besteed; blijft het daaronder, dan komen er meer items bij.
- **Prijzen.** Accessoire 60–120, outfit 200–350, zeldzaam 600, pet-accessoire 40–80, extra kastvak 75, inpakken 5. Bij ~300 munten per week is dat voor jullie samen ongeveer één outfit plus een accessoire per week.
- **Zelfgemaakte outfits** (editor van de andere agent). Ontwerpen en dragen is gratis: er komt geen belasting op creativiteit. Er zijn 6 gratis kastvakken voor eigen ontwerpen; extra vakken en speciale materialen (paletten, glitter, animatie) komen uit de pot. Wat je voor de ander maakt, geef je als cadeau voor 5 munten inpakken. Een item heeft `bron ∈ {winkel, zelf, cadeau, drop}`, `maker_id` en `slot`.
- **Verrassingsdrop.** Bij het afronden van een taak is er ~1 op 25 kans op een klein cosmetisch item, als extraatje en niet als motor *(§3.4)*.

**Samen-mijlpalen in plaats van een Sterrenpot.** Echte beloningen zijn gezamenlijke rituelen, geen aankopen van de een bij de ander, en ze zijn **herhaalbaar** *(controle R6)*. Een voorbeeld: elke 3 gehaalde weken een date night, elke 8 gehaalde weken een dagje uit. Rustweken tellen niet en breken niets. Bij een mijlpaal maakt de app een voucher en zet hij een plantaak "Date night regelen" op het prikbord. Een mijlpaal wordt aangekondigd als ritueel ("over één week is het weer date night"), niet als prijs. Persoonlijke gunsten zoals ontbijt op bed vallen erbuiten; die geef je als cadeau.

**Privé-taken en verrassingen.** Een privé-taak is een eigen lijstje: hij levert **niets** op en telt nergens mee, zodat er geen lek is voor onzichtbare nep-inzet. Een verrassingstaak telt wel mee als inzet. De ander ziet dan "Geheime quest" met de waarde, maar zonder titel.

## 11. Rekenvoorbeelden

Bij alle voorbeelden geldt: weeknorm 600, drempel 80% (480) en afspraak 50/50. Elk voorbeeld wordt een golden test **in de fase waarin de regels bestaan** (app-ontwerp §7).

### A. Gewone week (golden test fase 1)

| Hidde | inzet | Tessie | inzet |
|---|---|---|---|
| Koken 2× | 80 | Koken 3× | 120 |
| Vaatwasser 3× | 39 | Vaatwasser 4× | 52 |
| Stofzuigen | 39 | Boodschappen | 59 |
| Afval 2× | 14 | Was draaien 2× | 50 |
| Badkamer | 72 | Was vouwen | 26 |
| Fietsband plakken (40 min, zwaarte 1) | 52 | Planten 4× | 20 |
| Geld & administratie (plannen) | 20 | Weekmenu + lijst (plannen) | 30 |
| | | Sociale agenda (plannen) | 20 |
| **Totaal** | **316** | **Totaal** | **377** |

- **Samen:** 693 van 600, dat is 116%. De week is gehaald en de streak gaat +1.
- **Pet:** het draakje stond op 1.200 en komt op 1.893. Het wordt een **jonge draak**.
- **Wat je ziet:** "Samen 693 van 600 – gehaald. Hidde: koken, badkamer, de fiets, geldzaken. Tessie: was, boodschappen, eten plannen, verjaardagen." Er staan geen getallen per persoon bij.

### B. Tessie twee dagen ziek (golden test fase 2, afwezigheid)

Tessie is woensdag en donderdag ziek.

- **Norm:** 600 − 2 × 43 = **514**, en de drempel wordt 411.
- **Wat er gebeurde:** Hidde doet 290 en Tessie 160. Samen is dat **450, ofwel 88%**: de week is gehaald.
- **Zonder ziektecorrectie** was het 450 / 600 = 75% geweest. De week was dan **niet** gehaald en de streak had via de rustweek gered moeten worden. De correctie zorgt ervoor dat ziek zijn geen rustweek opeet en geen schuldgevoel geeft.
- **Boodschappen:** die lagen sinds maandag dorstig op het prikbord. Hidde pakte ze donderdag op, zonder bonus, en Tessie gaf een bedankje.
- **Afspraak-signaal:** dat speelt hier niet. Het kijkt naar 3 van de laatste 4 weken, en één week is nooit genoeg.
- **Bij een afspraak van 45/55** zakt de norm met Tessies aandeel van 2 × 47 tot 506.

### C. Onzichtbaar werk zichtbaar (golden test fase 1, soort werk)

| | doen | plannen/bijhouden | totaal |
|---|---|---|---|
| Hidde | 330 | Geld & administratie 20 | 350 |
| Tessie | 250 | Weekmenu 30, Sociale agenda 20, Voorraad 20, cadeau regelen 30 | 350 |

Telt alleen het doen, dan lijkt het 330 tegen 250. Met het denkwerk erbij, dat als gewone taken in de inzet staat, is het 350 tegen 350 *(Daminger, §3.1)*. De weekbeschrijving zet het cadeau onder "plannen", omdat het die soort werk heeft.

### D. Huispot (golden test fase 3)

| Week | Samen-inzet | Inkomen pot |
|---|---|---|
| A | 693 | 0,5 × min(693, 600) = **300** |
| B (norm 514) | 450 | 0,5 × 450 = **225** |
| Een week met 900 inzet, waarvan 300 nep | 900 | nog steeds **300** |

De begrenzing op de norm maakt nep-inzet waardeloos voor de pot. Wie die nep-inzet ziet, kijkt in de feed.

## 12. Later / bewust geschrapt

| Idee (uit versie 1) | Status | Waarom |
|---|---|---|
| Persoonlijke munten (0,5 per eigen inzet, teambonus, aftopping) | **geschrapt** | Een verborgen scorebord: de kast van de één laat zien wie meer deed *(controle R1)*. Vervangen door de huispot in fase 3. |
| Opraapbonus voor wat blijft liggen | **geschrapt** | Beloont de misser van de ander, het spiegelbeeld van de Habitica-schade. Het lokt wachten en makkelijke punten uit, en de regel sloot niet *(R2, F3)*. |
| Dagsterren (★1–5, "allebei"-ster) | **geschrapt** | Vier drempels plus uitzonderingen zijn een dagelijkse druk in een weekjas. Het weekdoel dekt hetzelfde *(R4)*. |
| Rustdagen sparen + herstelweek | **geschrapt** | De herstelweek was strenger dan een gewone week. Eén rustweek per maand is eenvoudiger en vergevingsgezinder. |
| Domeinkaarten met "liep"-tik | **opgegaan in taken** | Een wekelijkse plantaak met eigenaar doet hetzelfde, zonder extra tabellen en zonder verlies bij een gemiste terugblik. |
| Aparte XP-valuta | **opgegaan in inzet** | XP was altijd 1 op 1 gelijk aan inzet. |
| Twee knoppen (vervelend + zwaar) | **vereenvoudigd** | Eén zwaarteknop is in één zin uit te leggen, en jullie stellen hem toch samen vast. |
| Bewijsfoto's | **geschrapt** | Ze voelen als controle, bevatten privé-beelden en vallen buiten de back-up. Vertrouwen is de basis. |
| Draft-modus bij verdelen | **geschrapt** | Leuk, maar extra. Het verdeelvoorstel (fase 3) en het prikbord volstaan. |
| Munten meegeven bij een ruil | **geschrapt** | Dan wordt zorg een markt *(§3.2)*. |
| Sterrenpot op sterren, eenmalige mijlpalen | **vervangen** | Het worden herhaalbare samen-mijlpalen op gehaalde weken (fase 3). |
| Gestapelde balk standaard zichtbaar, signaal met naam | **vervangen** | Een balk is 60/40 zonder getal. Nu staan er woorden, details pas na een tik, en het signaal is neutraal. |
| Kalibratie van minuten met gemeten tijd | **later** (fase 5) | Heeft timerdata nodig (Uurwerk K3). |
| Verdeelvoorstel op basis van voorkeuren en agenda | **later** (fase 3) | Heeft privévoorkeuren en een agenda-import nodig. |
| 14 eieren met losse voorwaarden | **later** (fase 3) | Het MVP-draakje volstaat. Art is het knelpunt. |
| Verrassingsdrop, privé- en verrassingstaken | **later** (fase 3) | Ze zijn niet nodig om samen af te vinken. |

## Bijlage: parameters (startwaarden)

| Parameter | Waarde | Fase |
|---|---|---|
| zwaartefactor | 0,3 per niveau (0–2) | 1 |
| weeknorm samen | 600 | 1 |
| week gehaald | ≥ 80% van de aangepaste norm | 1 |
| claim geldig | tot het eind van de volgende dag of tot de deadline | 1 |
| late offline-afronding | telt in de lopende week; `gedaan_op` maximaal 48 u terug | 1 |
| pet-groei | jonge draak 1.500, draak 5.000 samen-inzet | 1 |
| norm bij afwezigheid | − aandeel per dag van de afwezige; vakantie samen = 0 | 2 |
| rustweek | 1 per kalendermaand, automatisch of vooraf | 2 |
| huispot | 0,5 per inzet, maximaal tot de weeknorm | 3 |
| afspraak-signaal | > 15 pp in 3 van de laatste 4 weken, neutraal geformuleerd | 3 |
| nest | 3 eieren | 3 |
| verrassingsdrop | 1/25 | 3 |
| prijzen | accessoire 60–120, outfit 200–350, zeldzaam 600, kastvak 75, inpakken 5 | 3 |
| mijlpalen | herhaalbaar, bv. 3 / 8 gehaalde weken | 3 |
