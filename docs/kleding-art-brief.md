# Art-brief kleding: basislichamen en eerste itemblad

Deze brief hoort bij de spec *Kleding, weer, seizoenen en feestdagen* (pagina 1–3) en bij `docs/kleding.md`. Het systeem met slots, lagen, kleuren en kast is gebouwd. Wat nog ontbreekt, is kunst die we niet zelf kunnen maken zonder de goedgekeurde figuren te veranderen:

- **(a)** twee basislichamen in neutrale onderkleding;
- **(b)** het eerste itemblad: items die de vorm van het lichaam veranderen (mouwen, rok, broekpijpen, jurk).

Hieronder staan twee kant-en-klare prompts voor Codex, daarna hoe wij de bladen uitsnijden.

## Wat Codex meekrijgt

1. `bron/pixel-quest-uitwerking.png`: het goedgekeurde blad. Hidde en Tessie staan linksboven onder CHARACTERS.
2. `assets/native-4x/hidde.png` en `assets/native-4x/tessie.png`: de figuren op het native raster, vier keer vergroot. Eén artpixel is hier 4×4 px. Dit is de maat die telt.
3. Het palet (hex): nacht `#2b364f`, crème `#fcf8ec`, papier `#fef2dc`, eik `#915b43`, hazelnoot `#a16242`, koffie `#543228`, bordeaux `#8b2e38`, koraal `#f16446`, abrikoos `#fea463`, goud `#febb42`, lavendel `#b27fc8`, petrol `#3f808c`, blad `#557f5a`, mos `#6d8348`, titel `#0b1238`.

## Prompt (a): basislichamen

> Je tekent pixelart voor de app Pixel Quest. Bijgevoegd zijn het goedgekeurde characterblad en de twee figuren Hidde en Tessie op hun native raster (64 × 112 artpixels, 4× vergroot).
>
> Maak één blad met twee **basislichamen**: Hidde en Tessie in **neutrale onderkleding**.
>
> - **Exact dezelfde pose, maat en plaats** als de bijgevoegde native figuren: zelfde hoofd, zelfde gezicht, zelfde ogen, zelfde haar (pixel voor pixel), zelfde handen. Hidde heeft zijn handen in zijn zakken en kijkt naar rechts. Tessie heeft haar handen op haar heupen en kijkt naar links. De voeten staan op dezelfde plek.
> - Alleen de kleding verandert. Hidde draagt een effen crème hemdje (tanktop) en een crème boxershort tot halverwege het bovenbeen. Tessie draagt een effen crème hemdje met smalle bandjes en een crème shortje. Allebei op blote voeten.
> - Waar nu kleding zit, teken je huid met dezelfde huidtinten en dezelfde schaduwrichting als het gezicht. Armen, benen en schouders krijgen dezelfde dikte als onder de huidige kleding. Er komt geen extra lichaamsvorm bij.
> - Stijl: dezelfde als het blad. Donkere, getrapte outline (`#0b1238` of het donkerste bruin van de huid), 3 tinten per vlak, licht van linksboven, geen anti-aliasing, geen verloop.
> - **Raster**: elk figuur staat in een eigen vak van precies 64 × 112 artpixels. Teken op **5 px per artpixel**, dus een vak is 320 × 560 px. Zet de vakken naast elkaar met 40 px tussenruimte. Eén artpixel is altijd één effen vierkant van 5 × 5 px.
> - Het **anker** is het midden onder de voeten: artpixel (32, 108) in het vak. De onderkant van de schoenzolen ligt op rij 107.
> - Achtergrond: één effen kleur `#e6f2e6` (mintgrijs), die nergens in de figuren voorkomt. Geen grondschaduw, geen tekst, geen rasterlijnen in de vakken.
> - Lever ook een tweede versie van elk lichaam met het haar **onder een hoofddeksel**: haar plat tegen de schedel, niets boven de lijn van 2 artpixels boven het voorhoofd. Het gezicht blijft gelijk.

## Prompt (b): eerste itemblad

> Je tekent kledingitems voor Pixel Quest. Gebruik de bijgevoegde **basislichamen** (prompt a) als onderlaag.
>
> Teken elk item als **losse laag op het lichaam**, in een eigen vak van 64 × 112 artpixels (5 px per artpixel, 320 × 560 px), op exact dezelfde plek als het lichaam in dat vak. Zet in elk vak het basislichaam als **effen lichtgrijze silhouet** (`#d0d0d0`, zonder details) eronder. Het item tekent er in volle kleur overheen. Wij gebruiken de grijze silhouet om het vak uit te lijnen en halen hem daarna weg.
>
> - Per lichaam een eigen tekening. Unisex-items teken je twee keer (Hidde-blad en Tessie-blad), Tessie-items alleen op Tessie.
> - Elk item in **één basiskleur** uit het palet, met 3 tinten (schaduw, basis, licht) en een donkere outline. Geen extra kleurdetails, behalve kleine vaste details die uitdrukkelijk genoemd zijn (knopen in goud, een veter in crème). Wij maken de andere kleuren zelf.
> - Mouwen houden de armpose van het lichaam. Hidde's handen blijven in zijn zakken, Tessie's handen op haar heupen. De handen zelf blijven zichtbaar en worden niet overgetekend.
> - Het haar valt **over** de kleding. Teken de kleding gewoon door onder de plek waar het haar hangt; wij leggen het haar er weer overheen.
> - Achtergrond rond de vakken: `#e6f2e6`. Onder elk vak een label in gewone tekst met het item-id. Het label staat buiten het vak.
>
> **Unisex (15), op Hidde én op Tessie:** `tshirt_basis` (zwart, zoals nu), `longsleeve` (crème), `trui` (koffie), `hoodie_basic` (nacht, capuchon plat in de nek), `overhemd` (crème, knoopjes), `broek_basis` (crème wijde broek, zoals Hidde nu), `jeans` (petrol), `joggingbroek` (nacht, boord bij de enkel), `korte_broek` (crème, tot boven de knie), `pyjama` (lavendel, heel lichaam), `onesie` (hazelnoot, heel lichaam, capuchon plat), `schort` (crème, over shirt en broek), `sneakers_basis` (crème), `laarzen` (koffie, over de broekpijp), `sloffen` (crème).
>
> **Tessie (8):** `crop_top` (crème, buik bloot), `blouse` (crème, pofmouwtjes), `cardigan` (mos, open), `rok` (bordeaux, tot de knie), `legging` (titel), `wijde_broek` (bordeaux, zoals Tessie nu), `jurk` (lavendel, tot de knie), `overall` (petrol). Als er ruimte is: `ballerinas` (bordeaux) en `enkellaarsjes` (koffie).
>
> Zet maximaal 6 vakken per rij. Lever per lichaam één blad.

## Uitsnijden en uitlijnen (onze stap)

De stap staat als stub in `tools/kast.py`: `snij_itemblad(blad_pad, fid, vakken)`. Hij gooit nu `NotImplementedError` met een TODO. Zo gaat hij werken:

1. **Vakken.** Per blad schrijven we de vakken (bladcoördinaten) en item-id's in een kleine lijst. Bij een regelmatig blad volgen die uit het raster van 320 + 40 px.
2. **Achtergrond weg.** Met `uitsnijden.masker()`, op kleurafstand tot `#e6f2e6`, net als bij de huidige figuren.
3. **Raster meten.** Met `kleding.meet_periode()`. Verwacht 5,0 bronpx per artpixel. Wijkt het meer dan 4% af, dan stoppen en opnieuw vragen.
4. **Native maken.** Met `uitsnijden.native()`: één kleur per artpixel op een canvas van 64 × 112.
5. **Uitlijnen.** De grijze silhouet (`#d0d0d0` ± 12) is de mal. Zoek de verschuiving (dx, dy, binnen ± 6 artpx) waarbij die silhouet het best overlapt met het masker van het basislichaam (IoU). Daarna gaat de silhouet weg. Het anker (32, 108) en de voetlijn liggen dan gelijk met het lichaam. Bij een IoU onder 0,9 meldt het script het item en slaat het over.
6. **Recolormasker.** Outline (L < drempel) wordt vast (0). De rest wordt 255 (luminantie-recolor, modus `luminantie`, zoals de uitgesneden items). Toonletters (modus `toon`) kunnen later met de hand in de editor.
7. **Wegschrijven.** `assets/kast/native/<id>_<h|t>.png` en `_m.png`. Het item gaat in `CATALOGUS` naar status `klaar` met herkomst `getekend (Codex)`.
8. **Basislichaam.** Het lichaamsblad (prompt a) gaat door dezelfde stappen naar `assets/native/<fid>_basis.png`. Daarna draaien `kleding.py` en `kast.py` met het basislichaam als laag `lichaam`. De uitgesneden items (`tshirt_basis`, `broek_basis`, `sneakers_basis`) worden dan vervangen door de nieuw getekende versies. Uittrekken kan vanaf dat moment echt.
9. **Controle.** Bekijk `assets/debug/kast_items.png` en `kast_kleuren.png`. Een mens kijkt elk item na op het native raster en ruimt het op in de pixel-editor van de kledingkast.

**Let op:** een beeldmodel tekent niet pixel-exact. Reken erop dat elk item na het uitlijnen nog met de hand wordt nagelopen: losse pixels, een outline die een pixel verschoven is, haar dat door de kleding steekt. Het basislichaam moet daarna opnieuw worden goedgekeurd, omdat gezicht en haar exact gelijk moeten blijven.
