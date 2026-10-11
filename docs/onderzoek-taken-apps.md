# Onderzoek: gegamificeerde taken-apps voor stellen

Desk research, 10 okt 2026, voor het puntensysteem en de app-flow van "Pixel Quest" (Hidde en Tessie).
Conventie: **[Bron]** = onderbouwd met URL. **[Eigen]** = eigen interpretatie, niet bewezen. **[Beperking]** = zwakke of ontbrekende bewijsbasis.

## 1. Samenvatting (lessen voor ons ontwerp)

1. Onzichtbaar werk (anticiperen, plannen, bijhouden) is de kern van mental load. Een app die alleen "uitvoeren" telt, mist het probleem. Taken moeten van begin tot eind een eigenaar hebben (Fair Play: conceive/plan/execute). [Daminger, Rodsky]
2. Gelijke uren is niet hetzelfde als gevoelde eerlijkheid. Veel stellen vinden een ongelijke verdeling toch eerlijk, en eerlijkheid hangt af van totale werkdruk. Toon dus geen enkel "wie deed meer"-getal als oordeel. [Fairness-onderzoek]
3. Punten kunnen scorekeeping en "makkelijke punten oppakken" uitlokken. De enige beschreven stellen-ervaring (Labor of Love) bevestigt dat. Gebruik punten als zichtbaarheid, niet als competitie. [MEL Magazine]
4. Tastbare beloningen die vooraf bekend zijn ondermijnen intrinsieke motivatie (meta-analyse, 128 studies; wel betwist). Positieve feedback doet het omgekeerde. Houd beloningen cosmetisch en feedback-achtig (pets, outfits, complimenten) en koppel geen echte privileges aan punten. [Deci 1999]
5. Samen tegen een baas/doel is veiliger dan tegen elkaar. Pure competitie geeft meer gebruik in sommige experimenten, maar het bewijs is gemengd en niet gemeten op stellen. Kies coöperatief met optionele, lichte vriendelijke competitie. [Zie 3.3, deels Eigen]
6. Straf voor gemiste dagen werkt tegen ons: Finch laat de pet nooit doodgaan en wordt daarom geprezen, Habitica laat teamgenoten schade lijden voor andermans misser (inn-regel als noodrem). Bij een stel van twee is die externe schade snel een ruzieonderwerp. [Finch, Habitica]
7. Streaks: het mechanisme (verliesaversie) is plausibel, causaal bewijs is dun. Bouw vergevingsregels in (freeze, "hervatten telt") en maak de streak per stel, niet per persoon. [Zie 3.4]
8. Gewogen punten per taak zijn nodig (Nipto/Choretastic/Tody), maar de weging moet door beide partners worden vastgesteld, want "zwaar" is subjectief. Eigen waarde per persoon is een bekende bron van discussie. [MEL, MIT TR]
9. Tody's "vuilheid in plaats van deadline" (taak wordt urgenter naarmate tijd verstrijkt, klok herstart bij afronden) past bij terugkerende huishoudtaken. Reviewers noemen het ook bazig. Gebruik kleur, geen alarmen. [Tody]
10. Agenda: de beste aanpak in de markt is een abonneerbare ICS-feed (Todoist) naast optionele tweerichtingssync. Taken met tijdslot horen als event in de agenda, deadline-taken als hele-dagen-event. Feeds zijn alleen-lezen en verversen traag. [Todoist-help]

## 2. Appvergelijking

Peilingen: bewijs komt vooral uit App Store-teksten, reviewsites en blogs. Redditdraden zijn niet gevonden. [Beperking]

| App | Kernmechaniek | Punten/beloning | Eerlijke verdeling | Geprezen | Klachten |
|---|---|---|---|---|---|
| OurHome | Taken toewijzen binnen gezin, gedeelde boodschappenlijst en agenda | Punten per taak, ouder stelt beloning; ouders kunnen punten toevoegen of aftrekken; iemand anders mag een taak overnemen | Handmatig toewijzen | Ontwerp, gedragsmanagement bij kinderen | Taken verschijnen niet altijd, sortering reset dagelijks, reminders verdwijnen, support onbruikbaar (reviews 2023) |
| Sweepy | Kamers met schoonheidsstatus, dagelijkse lijst per persoon op basis van "inspanning per dag" | Leaderboard; kinderen: taak telt na goedkeuring ouder | Automatische dagelijkse lijst per persoon (premium) | Hoge rating, weinig reviews | Premium-muur; bug bij vakantiemodus. Puntensysteem zelf niet bevestigd |
| Tody | Interval-/behoefte-gebaseerd schoonmaken met kleurbalken (rood/groen) | Credit voor afgevinkte taken, maandelijkse puntenrace, prijzen, "Dusty challenges" | Functie "FairShare" om verantwoordelijkheden af te spreken (versiehistorie) | 4,8 sterren (~11k); helpt bij ADHD/depressie | "Beveelt je" en overweldigt; wens voor widget; sync is betaald |
| Flatastic | Poetsrooster, boodschappen, uitgaven, prikbord | Geen puntensysteem gevonden | Zichtbaarheid van wie wat doet via rooster | n.v.t. | n.v.t. [Beperking: geen reviewdata] |
| Nipto | Chores met punten naar "vervelendheid", wekelijkse winnaar op zondag | Punten, bonuspunten als bedankje, beloning voor winnaar; modus competitie of persoonlijke doelen | Punten weerspiegelen last, niet tijd | Een gebruiker: verdeling van ca. 90/10 naar 60/40 (anekdote) | "Soms buggy", premium |
| Habitica | RPG-takenlijst; party-quests (bazen) | Goud, uitrusting, XP; schade aan baas door voltooide taken | Geen verdeling; gezamenlijke uitkomst | Teamsociale druk | Gemiste Dailies van anderen schaden jou; dood = level, goud, uitrusting kwijt |
| Finch | Zelfzorgvogel, kleine doelen | Energie, regenboogstenen voor kleding en meubels | Niet van toepassing (solo) | Vogel gaat nooit dood; geen schuld | Abonnement/trial-verwarring, dataverlies, soms toch druk of "ook een taak" |
| Splitwise / Spliit | Uitgaven delen, saldo's vereenvoudigen | Geen | Splitsen in gelijk/percentage/aandelen; "debts simplify" aan/uit per groep | Spliit: gratis, geen account, open source | Splitwise: vertrouwen-en-casual; geen prijs op schuld |
| Tiimo | Visueel dagplan/timer | Geen echte beloning | n.v.t. | ADHD-vriendelijk | Google-agenda-sync niet betrouwbaar bevestigd |
| Structured | Visuele dagtijdlijn | n.v.t. | n.v.t. | n.v.t. | Agenda alleen-lezen import, betaald |
| Any.do | Gedeelde lijsten + agenda | n.v.t. | Toewijzen | Agenda-integratie gratis | Docs spreken zichzelf tegen over tweerichtingssync |
| Paired | Dagelijkse vraag/quiz, antwoord ontgrendelt dat van partner | Geen punten (wel ritme van 3 dagelijkse activiteiten) | n.v.t. | Licht ritme | Paywall, herhaling, sync-fouten (bedrijfs- en ranglijsten) |
| Lasting | Cursus, Gottman-gebaseerd | Geen | n.v.t. | Therapeutische diepgang | Paywall |
| Labor of Love (stellen) | Taken met puntwaarde, beloning naar keuze | Eigen beloning (massage, avondje uit) | Maakt zichtbaar wie wat doet | Gesprek op gang gebracht | Scorekeeping-risico, "makkelijke punten", waarde per persoon wisselt |

Bronnen: OurHome: <https://www.littledayout.com/parent-review-ourhome-app-for-home-organisation-and-behaviour-management/>, <https://justuseapp.com/en/app/879717020/ourhome-chores-and-rewards/reviews>. Sweepy: <https://sweepy.com/>, <https://www.commonsensemedia.org/app-reviews/sweepy-home-cleaning-schedule>, <https://apps.apple.com/app/id1498897320>. Tody: <https://apps.apple.com/us/app/-/id595339588>. Flatastic: <https://apps.apple.com/app/id840810742>. Nipto: <https://apps.apple.com/us/app/id1504877473>, <https://www.technologyreview.com/2022/05/10/1051954/chore-apps/amp/>. Habitica: <https://habitica.fandom.com/wiki/Rest_in_the_Inn>, <https://habitica.fandom.com/wiki/Obstacles>. Finch: <https://www.internetmatters.org/advice/apps-and-platforms/wellbeing/finch/>, <https://appbot.co/blog/finch-app-reviews-emotional-attachment-user-retention-product-loyalty/>, <https://www.trustpilot.com/review/finchcare.com>. Splitwise: <https://www.pilotplans.com/blog/splitwise-review>, Spliit: <https://opencollective.com/spliit>. Tiimo: <https://apps.apple.com/app/tiimo/id1480220328>. Structured: <https://help.structured.app/en/articles/329730>. Any.do: <https://support.any.do/en/articles/8610622-getting-started-with-the-calendar-integration>. Paired: <https://www.paired.com/frequently-asked-questions>, <https://unstar.app/th/blog/paired-lasting-love-nudge-evergreen-cupla-couples-apps-ranked-2026>. Lasting: <https://learnofchrist.com/resources/lasting>. Labor of Love: <https://melmagazine.com/en-us/story/labor-of-love-app-household-chores-couples>.

## 3. Bevindingen per thema

### 3.1 Huishoudverdeling bij stellen: mental load en eerlijkheid

- Allison Daminger (ASR 2019, 70 interviews, 35 stellen) splitst cognitieve arbeid in vier stappen: anticiperen, opties zoeken, beslissen, monitoren. Vrouwen deden meer, vooral anticiperen en monitoren. Beslissen was ongeveer gelijk verdeeld. <https://dash.harvard.edu/entities/publication/6d12f9be-79aa-4766-bbd7-4717571a2b87>, <https://daily.jstor.org/the-gendered-labor-of-noticing-and-anticipating>
- Fair Play (Rodsky): 100 taken, per taak conceive-plan-execute bij één eigenaar, "eerlijk, niet noodzakelijk gelijk", een minimale zorgstandaard per taak. Dit is een boek met werkwijze, geen getoetste interventie. [Beperking: geen onderzoek naar effect gevonden] <https://www.getabstract.com/en/summary/fair-play/38684>. De details "Own It" en minimale standaard heb ik niet kunnen bevestigen uit bronnen. Controleer in het boek.
- Perceived fairness: in een steekproef van 404 Italiaanse tweeverdieners vond 55% van beide partners de verdeling eerlijk, ook als vrouwen ca. twee derde deden. <https://iris.unito.it/handle/2318/83726>. Een Nederlandse studie vond dat ongelijke verdelingen vaak als eerlijk worden gezien, vooral bij zorg voor kinderen, met sterker onrechtgevoel bij vrouwen, en dat eerlijkheid wordt afgemeten aan totale werkdruk. <https://journals.sagepub.com/doi/10.1177/0192513X21993899>. In 29 landen (N=16.633) dacht wie meer deed ook vaker "meer dan mijn deel" te doen. <https://metatoc.com/papers/50660-perceived-fairness-of-the-division-of-household-labor-a-comparative-study-in-29-countries>
- Verschil in kijk op de verdeling hangt samen met onzekerheid in de relatie. Le & Aune (2011, 33 stellen) vonden dat koppels met gelijke inschatting zekerder waren over de relatie. Kleine, gemiddeld tevreden steekproef, correlationeel. <https://pmc.ncbi.nlm.nih.gov/articles/PMC4114516>
- Apps verbeteren dit niet vanzelf. MIT Technology Review: delegerende apps (Cozi) maken de gebruiker manager of "zeur"; succes hangt af van de bereidheid van de minst betrokken partner; apps kunnen de norm versterken dat de vrouw het huishouden beheert. De gamification-evidentie in het stuk is één stel, geen studie. <https://www.technologyreview.com/2022/05/10/1051954/chore-apps/amp/>
- Scorekeeping: bij Labor of Love maakt de app zichtbaar "hoeveel we allebei deden" en beide partners voelden dat de ander dat niet zag, maar de bouwer grijpt "de makkelijke punten" en wijst op risico dat punten de zorgmotivatie wegnemen. <https://melmagazine.com/en-us/story/labor-of-love-app-household-chores-couples>
- [Eigen] Ontwerpconsequentie: toon in de app geen verdeling in procenten als "stand". Maak onzichtbaar werk (plannen, herinneren, boodschappenlijst bijhouden) tot expliciete taken met punten, en laat een taak één eigenaar hebben die de hele keten draagt.

### 3.2 Extrinsieke beloningen en intrinsieke motivatie

- Deci, Koestner & Ryan (1999, Psychological Bulletin, 128 experimenten): verwachte, tastbare beloningen verlaagden vrije-keuze-motivatie. Effecten: engagement-contingent d=-0,40, completion-contingent -0,36, performance-contingent -0,28. Positieve feedback verhoogde intrinsieke motivatie. <https://depts.washington.edu/techdocs/papers/deciExtrinsicRewardsAndIntrinsicMotivation99.pdf>
- Het onderzoek is betwist: Cameron en Pierce (1994) vonden een minimaal effect en Cameron, Banko & Pierce (2001) verdedigen dat. <https://scholarhub.vn/publication/:slug/9460423c-1ed9-4760-995d-5dd57e6628aa>. Nuance: ik heb de argumenten uit de volledige tekst niet gelezen.
- Klassiek: Lepper, Greene & Nisbett (1973) lieten kleuters die al graag tekenden een certificaat in het vooruitzicht stellen, en zij tekenden later minder uit vrije wil. Effect geldt alleen voor activiteiten die al leuk waren; één experiment. <https://www.psychologynoteshq.com/overjustification-effect/>
- [Eigen] Huishoudtaken zijn doorgaans niet intrinsiek leuk, dus het ondermijningsrisico is kleiner dan bij hobby's. Het relevante risico is eerder: zorg voor de partner verandert in een transactie. Dat voedt de keuze voor cosmetische, onverwachte en samen gedeelde beloningen en voor waarderingsberichten.

### 3.3 Coöperatief versus competitief

- Fitness Castle (2x2 veldstudie): competitie verhoogde gebruik; puur coöperatief niet duidelijk; samen aangeboden hoogste gebruik. <https://research.cbs.dk/en/publications/effects-of-cooperative-and-competitive-gamification-on-fitness-mo/>
- ParKing-veldexperiment (crowdsourcing): onderlinge teamcompetitie gaf de meeste deelname en plezier; auteurs adviseren coöperatief voor bereidheid tot aanbevelen. <https://webpages.tuni.fi/gamification/2018/12/13/788/>
- Gerandomiseerde stappenstudie (4 weken): gamification maakte geen verschil in zelfgerapporteerde intrinsieke motivatie. <https://pmc.ncbi.nlm.nih.gov/articles/PMC10828797>
- [Beperking] Geen studie gevonden naar coöperatieve versus competitieve gamification voor huishoudtaken of bij stellen. Alles hierboven komt uit fitness en crowdsourcing met vreemden.
- Praktijk: Habitica deelt de uitkomst van een baas (iedereen krijgt gelijke beloning, maar gemiste Dailies schaden de hele party) en biedt een "Inn"-pauze. <https://habitica.fandom.com/wiki/Rest_in_the_Inn>, <https://habitica.fandom.com/wiki/Obstacles>. Nipto biedt een wekelijkse winnaar of persoonlijke doelen. [Zie app-tabel]
- [Eigen] Voor twee personen werkt "wij vs. de baas" en "wij vs. gisteren" beter dan "ik vs. jij", omdat een stel altijd met elkaar verder moet. Schade door elkaars gemiste taken (Habitica) vermijden we.

### 3.4 Mechanieken

**Streaks.**
- Een Northwestern-werkdocument stelt dat er weinig causaal bewijs is voor streak-effecten, en beschrijft een veldexperiment met Peruaanse leerlingen; de resultaten zijn niet gevonden. <https://www.ipr.northwestern.edu/documents/working-papers/2026/wp-26-05.pdf>
- Lift-habit-app (CHI 2016): herinneringen en streaks ondersteunen herhaling maar scheppen afhankelijkheid van de app; wie stopte met de app stopte vaak ook met het gedrag. <https://researchportal.northumbria.ac.uk/en/publications/dont-kick-the-habit-the-role-of-dependency-in-habit-formation-app/>
- Barasch (CU Boulder, perscitaat): een gebroken streak is extra demotiverend. <https://www.newswise.com/articles/research-explains-why-streaks-make-resolutions-stick>. Het veelgenoemde "CHB 2021"-onderzoek naar guilt en uitval kon ik niet verifiëren en neem ik niet op. [Beperking]
- Gewoontevorming: gemiddeld 66 dagen (UCL), maar de streakgevolgtrekking is van een leverancier. <https://discovery-pp.ucl.ac.uk/id/eprint/1477627>
- [Eigen] Streak voor het stel, met wekelijkse (niet dagelijkse) basis, minstens één gratis "freeze" per week en "hervatten telt als nieuwe start met behoud van record". Zie ook Finch en Habitica.

**Pets en verzorging.**
- Tamagotchi: ontwerper wilde verantwoordelijkheid via dood door verwaarlozing; dat is ontwerpargument, geen effectbewijs. <https://www.maize.io/cultural-factory/tamagotchi-story/>. Kinderen namen ze mee naar school vanwege het ontbreken van pauze. <https://popmatters.com/harvey040922-2496174683.html>
- Finch: de vogel gaat nooit dood; prijzen als "geen schuld". Kritische analyse noemt dat dagelijkse voltooiing toch druk of schuld kan geven, en sommige gebruikers voelen zich "angstig" om de vogel. <https://www.internetmatters.org/advice/apps-and-platforms/wellbeing/finch/>, <https://appbot.co/blog/finch-app-reviews-emotional-attachment-user-retention-product-loyalty/>
- [Beperking] Geen gecontroleerd onderzoek naar schuldgevoel of motivatie door pets gevonden.
- [Eigen] 14 pets verzamelen past bij Finch-aanpak: pets worden verdiend (collectie, geen overlijden), kunnen "slapen" bij inactiviteit en komen terug. Laat niet één persoon verantwoordelijk zijn voor de pet.

**Variabele beloningen.**
- Gerandomiseerde studie, 6 weken, 61 deelnemers: vaste en variabele schema's gaven vergelijkbare betrokkenheid, variabel met directe uitkering was goedkoper. <https://research.tue.nl/en/publications/health-promotion-through-monetary-incentives-evaluating-the-impac/>
- Crossover (JMIR 2026, n=20): loterij versus vaste prikkel zonder significant verschil in stappen. <https://formative.jmir.org/2026/1/e86189/PDF>
- [Beperking] Beide studies gaan over geld, kleine n. Niets over pixel-loot of stellen.
- [Eigen] Kleine, niet-wedstrijdgebonden verrassing (willekeurig cosmetisch item bij afronden) is goedkoop en laag risico; maak geen kern van de motivatie van kansbeloning.

**Moeite- of tijdgewogen punten.**
- Nipto geeft punten naar "vervelendheid". Choretastic noemt waarde naar complexiteit of tijd en een "fairness index". Labor of Love: waarde volgt wat je het vervelendst vindt, wat per persoon verschilt. <https://www.technologyreview.com/2022/05/10/1051954/chore-apps/amp/>, <https://apps.apple.com/cd/app/choretastic/id6462757605>, <https://melmagazine.com/en-us/story/labor-of-love-app-household-chores-couples>
- [Eigen] Combineer geschatte minuten met een door beiden bevestigde "zwaarte"-modifier (zwaar, vervelend, onzichtbare planning). Laat afwijkende zwaarte per persoon niet toe of maak het expliciet onderhandelbaar.

**Terugkerende taken en verval (Tody).**
- Tody: beheer op basis van behoefte, kleurindicator (rood/groen, "clean, between, due, overdue"), klok herstart bij afronden, achterstallige taken schuiven door naar de volgende dag, geen deadlines en optionele meldingen. <https://apps.apple.com/us/app/-/id595339588>, <https://www.macworld.com/article/223326/six-helpful-apps-for-keeping-house.html>
- Kritiek: de app "beveelt" en overweldigt. Gebruikerstip: dagelijks zones checken in plaats van wachten tot hoofdzones rood zijn.
- De exacte vuilheidsformule is niet openbaar. [Beperking]

**Claimen, ruilen, overnemen.**
- OurHome: een ander gezinslid kan een niet-afgemaakte taak overnemen. Maple: kies uit een gedeelde lijst zonder dat iemand toewijst. Cozi: één persoon wijst toe (draagt de last). <https://www.technologyreview.com/2022/05/10/1051954/chore-apps/amp/>
- [Eigen] Claimen uit een open lijst voorkomt de manager-rol. Voeg "overnemen" met bedankje toe.

**Gezamenlijke doelen.**
- Habitica-bazen: iedereen krijgt dezelfde beloning ongeacht eigen bijdrage; de bijdrage is zichtbaar via damage. <https://habitica.fandom.com/wiki/Rest_in_the_Inn> (zie ook 3.3)

**Eerlijkheid in geld: Splitwise-patroon.**
- Splitwise simplify-debts staat bewust niet standaard aan, omdat vertrouwen per relatie verschilt; geen rente op schulden om het casual te houden. <https://www.pilotplans.com/blog/splitwise-review>. [Eigen] Voor ons: een rustig saldo "wie heeft recent meer gedaan" met zachte toon is beter dan boekhouding.

### 3.5 Agenda-integratie

- Todoist: twee ICS-feeds (account, per project), alleen vanuit web/desktop te krijgen. Taken met datum zijn hele-dag-events, met datum+tijd een event van 1 uur of de ingestelde duur; voltooide taken verdwijnen; herhalende taken tonen maar 7 voorkomens. Daarnaast tweerichtingssync met Google/Outlook voor eigen taken, één account tegelijk. <https://www.todoist.com/help/todoist/integrations/add-a-todoist-calendar-feed-pAk3tk>, <https://www.todoist.com/help/articles/use-the-calendar-integration-rCqwLCt3G>
- Any.do: op mobiel een spiegel van de apparaatagenda, op web één account; per apparaat instellen. Tweerichtingssync wordt in blog en support verschillend omschreven. <https://support.any.do/en/articles/8610622-getting-started-with-the-calendar-integration>
- Structured: alleen eenrichtings-import, Pro, tweerichtingssync alleen op de roadmap; Android/web beperkt tot 3 maanden terug/vooruit. <https://help.structured.app/en/articles/329730>, <https://feedback.structured.app/p/two-way-calendar-sync>
- Tiimo: Apple Agenda/Herinneringen via de apparaatkoppeling; Google Agenda-sync niet betrouwbaar bevestigd, gebruikers vragen erom. <https://apps.apple.com/app/tiimo/id1480220328>
- Chore-apps (Sweepy, Tody, OurHome, Flatastic, Nipto): geen ICS-export, CalDAV of Google-sync gevonden in de documentatie. OurHome heeft een eigen gezinsagenda. Tody noemt geen agenda-weergave. [Beperking: afwezigheid niet bewezen] <https://apps.apple.com/us/app/-/id595339588>, <https://foxdata.com/cn/app-marketing-analytics/879717020/as/HU>
- Technische beperking: geabonneerde ICS-feeds zijn read-only in Google/Microsoft en verversen traag (15-60 min of langer). <https://docs.onecal.io/docs/help/ics-calendars>
- [Eigen] Ontwerp: per persoon één abonneerbare ICS-feed met "wat ik moet doen" (tijdslot = event met duur, deadline = hele-dag-event, flexibele terugkerende taken geen event totdat ze "due" worden), plus optioneel lezen van de gedeelde agenda om drukke momenten te vermijden bij verdelen. Tweerichtingssync pas later.

## 4. Doen / vermijden voor ons puntensysteem

**Doen**
- Eén eigenaar per taak over conceive-plan-execute, met "plannen" en "bijhouden" als punten-waardig werk. [Rodsky, Daminger]
- Punten = zichtbaarheid van wie wat doet, uitgedrukt in minuten × zwaarte-modifier die beiden bevestigen. [Nipto, Choretastic, Tody]
- Open takenlijst met "claimen" en "overnemen" in plaats van toewijzen door één persoon. [Maple, OurHome]
- Gezamenlijke doelen en een stel-streak (wekelijks, met freeze en herstel zonder straf). [Habitica, Finch]
- Beloningen cosmetisch: pets, outfits, scènes; af en toe een niet-aangekondigd bonusitem. [Deci 1999, variabele-beloningsstudies]
- Veel positieve feedback (bedankjes, bonuspunt voor "dank je wel"). [Deci 1999, Nipto]
- Pets blijven nooit achter met straf; inactiviteit = slapen, terugkomst = welkom. [Finch]
- Terugkerende taken met behoefte-klok en kleur (groen-geel-rood), geen alarmen als standaard. [Tody]
- Wekelijks rustig overzicht in tekst, geen leaderboard als hoofdscherm. [Eigen]
- Rust-/vakantiemodus die taken en streaks pauzeert voor beiden. [Habitica Inn, Sweepy-bug als leerpunt]
- Eigen ICS-feed per persoon, tijdslot als event, deadline als hele-dag-event. [Todoist]

**Vermijden**
- Ranglijst Hidde vs. Tessie als hoofdweergave of "winnaar van de week". [MEL, Nipto-modus competitie]
- Schade/straf voor jou door andermans gemiste taak. [Habitica]
- Echte privileges of geld aan punten koppelen. [Deci 1999]
- Dagelijkse streak zonder vergeving of met verlies van collectie bij breuk. [Streak-bronnen, Habitica]
- Eén persoon als "beheerder" die toewijst. [MIT TR, Cozi]
- Een enkel "stand: 60/40"-getal als oordeel over eerlijkheid. [Fairness-onderzoek]
- Een app die bazig is of veel meldingen stuurt. [Tody-reviews]
- Alleen uitvoeringstijd tellen en cognitief werk negeren. [Daminger]
- Afhankelijk maken van de app voor de gewoonte zelf: zorg dat afspraken ook zonder app bestaan. [Lift-studie]

## 5. Openstaande vragen en bewijsgaten

- Geen onderzoek gevonden naar punten of gamification specifiek bij stellen. De lessen komen uit aanpalende gebieden (fitness, crowdsourcing, gezinsapps).
- Geen Reddit-/app-store-reviews rechtstreeks geraadpleegd (alleen via aggregators); sentiment per app is indicatief.
- De effectiviteit van Fair Play is niet getoetst in de gevonden bronnen.
- Check voor oplevering: "Own It"-stap en minimale zorgstandaard in het boek; Tody FairShare en Sweepy-puntenfunctie in de actuele apps; of Nipto ICS ondersteunt.
