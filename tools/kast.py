"""Kast: modulaire kleding per slot voor Pixel Quest (spec 'Kleding, weer, seizoenen').

Leest de goedgekeurde figuren en zonekaarten (uitvoer van uitsnijden.py en kleding.py)
en verandert die niet. Schrijft:
  assets/kast/native/<id>_<h|t>.png     itemlaag op het native canvas 64 x 112 (anker 32,108)
  assets/kast/native/<id>_<h|t>_m.png   recolormasker (0 vast, 50..250 toon, 255 luminantie)
  assets/kast/native/<id>_<h|t>_k.png   knipmasker voor het haar (alleen hoofddeksels)
  assets/kast/bron/<id>_<h|t>[_m].png   bronversie (alleen uitgesneden items)
  assets/kast.js   window.PQ_KAST met ingebedde PNG's (werkt via file://)
  assets/kast.json leesbaar, met paden
  assets/debug/kast_*.png

Herkomst per item:
  uitgesneden     kleding van de goedgekeurde sprite, losgeknipt met de zonekaart
  nieuw getekend  met de hand op het native raster (kast_hoofd.py, kast_acc.py, kast_jas.py)
  wacht_op_art    vraagt een nieuw basislichaam of nieuwe vorm; staat in de kast zonder sprite

Gebruik:  python tools/kast.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

SLOTS = ['hoofd', 'boven', 'jas', 'onder', 'heel_lichaam', 'schoenen', 'accessoire']
# Onder naar boven. 'haar' is de haarlaag van het lichaam, opnieuw getekend boven de jas.
LAAGVOLGORDE = ['lichaam', 'schoenen', 'onder', 'heel_lichaam', 'boven', 'jas', 'haar', 'accessoire', 'hoofd']
PRIJZEN = {'hoofd': [20, 40], 'schoenen': [20, 40], 'accessoire': [20, 40], 'boven': [30, 60],
           'onder': [30, 60], 'jas': [50, 90], 'heel_lichaam': [50, 90]}
BEIDE, TESSIE = ['hidde', 'tessie'], ['tessie']


def item(id, naam, slot, lichaam, prijs, kleuren, herkomst, set_id=None, tags=(),
         zeldzaamheid='gewoon', **extra):
    lo, hi = PRIJZEN[slot]
    assert lo <= prijs <= hi, (id, prijs)
    d = {'id': id, 'naam': naam, 'slot': slot, 'lichaam': list(lichaam), 'sprites': {},
         'kleuren': list(kleuren), 'prijs': prijs, 'set_id': set_id, 'tags': list(tags),
         'zeldzaamheid': zeldzaamheid, 'herkomst': herkomst,
         'status': 'wacht_op_art' if herkomst == 'wacht_op_art' else 'klaar'}
    d.update(extra)
    return d


U, N, W = 'uitgesneden', 'nieuw getekend', 'wacht_op_art'
NH = 'nieuw getekend (incl. huid)'   # tekent ook blote huid (benen, buik, enkels) in de tinten van het figuur
CATALOGUS = [
    # --- hoofd ---
    item('petje', 'Petje', 'hoofd', BEIDE, 30, ['petrol', 'bordeaux', 'nacht', 'goud'], N, 'zomerdag', ['zomer']),
    item('beanie', 'Beanie', 'hoofd', BEIDE, 30, ['koraal', 'mos', 'nacht', 'abrikoos', 'lavendel'], N,
         'winterwandeling', ['warm']),
    item('bucket_hat', 'Bucket hat', 'hoofd', BEIDE, 35, ['hazelnoot', 'mos', 'creme', 'lavendel'], N,
         'regendag', ['regen']),
    item('koptelefoon', 'Koptelefoon', 'hoofd', BEIDE, 40, ['nacht', 'creme', 'koraal', 'lavendel'], N, 'studie'),
    item('haarband', 'Haarband', 'hoofd', TESSIE, 20, ['koraal', 'goud', 'lavendel', 'petrol'], N),
    item('strik', 'Strik', 'hoofd', TESSIE, 20, ['koraal', 'bordeaux', 'creme', 'lavendel'], N),
    item('baret', 'Baret', 'hoofd', TESSIE, 35, ['bordeaux', 'nacht', 'creme', 'mos'], N, 'parijs', ['warm']),
    item('haarclip', 'Haarclip', 'hoofd', TESSIE, 20, ['goud', 'koraal', 'lavendel', 'creme'], N),
    item('kroontje', 'Kroontje', 'hoofd', BEIDE, 40, ['goud', 'creme', 'koraal'], N, zeldzaamheid='zeldzaam'),
    # --- boven ---
    item('tshirt_basis', 'T-shirt', 'boven', BEIDE, 30, ['origineel', 'petrol', 'bordeaux', 'mos', 'creme'], U,
         'basis', startkast=True, zone='shirt'),
    item('longsleeve', 'Longsleeve', 'boven', BEIDE, 40, ['creme', 'nacht', 'mos', 'lavendel'], N, 'studie'),
    item('trui', 'Trui', 'boven', BEIDE, 50, ['koffie', 'mos', 'bordeaux', 'creme'], N, tags=['warm']),
    item('hoodie_basic', 'Hoodie', 'boven', BEIDE, 45, ['nacht', 'petrol', 'bordeaux', 'creme'], N,
         'chill_zondag', ['warm', 'huis']),
    item('overhemd', 'Overhemd', 'boven', BEIDE, 50, ['creme', 'petrol', 'lavendel', 'blad'], N, 'kantoor',
         ['kantoor']),
    item('crop_top', 'Crop top', 'boven', TESSIE, 35, ['creme', 'koraal', 'lavendel', 'nacht'], NH, 'zomerdag',
         ['zomer']),
    item('blouse', 'Blouse', 'boven', TESSIE, 45, ['creme', 'lavendel', 'blad', 'petrol'], N, 'parijs'),
    item('cardigan', 'Cardigan', 'boven', TESSIE, 50, ['creme', 'mos', 'bordeaux', 'lavendel'], N, tags=['warm']),
    # --- jas (overlay over romp en armen) ---
    item('spijkerjas', 'Spijkerjas', 'jas', BEIDE, 70, ['petrol', 'nacht', 'creme', 'koffie'], N, 'kantoor', ['lente']),
    item('puffer', 'Puffer', 'jas', BEIDE, 90, ['petrol', 'nacht', 'koraal', 'lavendel', 'creme'], N,
         'winterwandeling', ['warm', 'sneeuw']),
    item('regenjas', 'Regenjas', 'jas', BEIDE, 75, ['goud', 'koraal', 'petrol', 'mos'], N, 'regendag', ['regen']),
    item('teddyjas', 'Teddyjas', 'jas', TESSIE, 85, ['creme', 'hazelnoot', 'mos', 'lavendel'], N, 'herfstdag',
         ['warm']),
    # --- onder ---
    item('broek_basis', 'Broek', 'onder', BEIDE, 30, ['origineel', 'nacht', 'koffie', 'petrol', 'mos'], U, 'basis',
         startkast=True, zone='broek'),
    item('jeans', 'Jeans', 'onder', BEIDE, 45, ['petrol', 'nacht', 'creme', 'titel'], N, 'kantoor'),
    item('joggingbroek', 'Joggingbroek', 'onder', BEIDE, 40, ['nacht', 'creme', 'mos', 'lavendel'], N,
         'chill_zondag', ['huis']),
    item('korte_broek', 'Korte broek', 'onder', BEIDE, 35, ['creme', 'petrol', 'mos', 'koraal'], NH, 'zomerdag',
         ['zomer']),
    item('rok', 'Rok', 'onder', TESSIE, 40, ['bordeaux', 'nacht', 'mos', 'lavendel'], NH, 'parijs', ['zomer']),
    item('legging', 'Legging', 'onder', TESSIE, 30, ['titel', 'bordeaux', 'mos', 'lavendel'], N),
    item('wijde_broek', 'Wijde broek', 'onder', TESSIE, 50, ['creme', 'bordeaux', 'petrol', 'koffie'], N, 'herfstdag'),
    # --- heel lichaam (vervangt boven en onder) ---
    item('pyjama', 'Pyjama', 'heel_lichaam', BEIDE, 60, ['lavendel', 'petrol', 'koraal', 'creme'], N, None,
         ['nacht', 'huis'], startkast=True),
    item('onesie', 'Onesie', 'heel_lichaam', BEIDE, 80, ['hazelnoot', 'mos', 'lavendel', 'creme'], N, None,
         ['nacht', 'huis', 'warm']),
    item('schort', 'Schort', 'heel_lichaam', BEIDE, 50, ['creme', 'koraal', 'petrol', 'mos'], N, tags=['keuken', 'huis']),
    item('jurk', 'Jurk', 'heel_lichaam', TESSIE, 75, ['bordeaux', 'lavendel', 'creme', 'blad'], NH, tags=['zomer']),
    item('overall', 'Overall', 'heel_lichaam', TESSIE, 80, ['petrol', 'creme', 'mos', 'koffie'], N),
    # --- schoenen ---
    item('sneakers_basis', 'Sneakers', 'schoenen', BEIDE, 30, ['origineel', 'nacht', 'koraal', 'lavendel'], U,
         'basis', startkast=True, zone='schoenen'),
    item('laarzen', 'Laarzen', 'schoenen', BEIDE, 40, ['koffie', 'nacht', 'mos', 'goud'], N, 'regendag',
         ['regen', 'warm']),
    item('sloffen', 'Sloffen', 'schoenen', BEIDE, 20, ['creme', 'lavendel', 'koraal', 'nacht'], NH, 'chill_zondag',
         ['huis', 'nacht']),
    item('ballerinas', "Ballerina's", 'schoenen', TESSIE, 30, ['bordeaux', 'nacht', 'creme', 'koraal'], NH, 'parijs'),
    item('enkellaarsjes', 'Enkellaarsjes', 'schoenen', TESSIE, 40, ['koffie', 'nacht', 'eik', 'bordeaux'], N,
         'herfstdag', ['warm']),
    # --- accessoire ---
    item('bril', 'Ronde bril', 'accessoire', BEIDE, 30, ['koffie', 'titel', 'goud', 'koraal'], N, 'studie'),
    item('tas', 'Schoudertas', 'accessoire', BEIDE, 35, ['eik', 'koffie', 'mos', 'bordeaux'], N),
    item('sjaal', 'Sjaal', 'accessoire', BEIDE, 25, ['bordeaux', 'mos', 'goud', 'nacht', 'creme'], N,
         'winterwandeling', ['warm']),
    item('handschoenen', 'Handschoenen', 'accessoire', BEIDE, 20, ['petrol', 'koraal', 'mos', 'creme'], N, None,
         ['warm']),
    item('ketting_basis', 'Kettinkje', 'accessoire', TESSIE, 30, ['origineel', 'creme', 'koraal', 'lavendel'], U,
         startkast=True, zone='accessoire', zone_tot_y=66, onder_jas=True),
    item('oorbellen', 'Oorbellen', 'accessoire', TESSIE, 25, ['goud', 'creme', 'koraal'], N, 'herfstdag'),
]

SETS = [
    {'id': 'basis', 'naam': 'Basis', 'items': ['tshirt_basis', 'broek_basis', 'sneakers_basis']},
    {'id': 'winterwandeling', 'naam': 'Winterwandeling', 'items': ['puffer', 'beanie', 'sjaal']},
    {'id': 'regendag', 'naam': 'Regendag', 'items': ['regenjas', 'bucket_hat', 'laarzen']},
    {'id': 'chill_zondag', 'naam': 'Chill zondag', 'items': ['hoodie_basic', 'joggingbroek', 'sloffen']},
    {'id': 'kantoor', 'naam': 'Kantoor', 'items': ['overhemd', 'jeans', 'spijkerjas']},
    {'id': 'zomerdag', 'naam': 'Zomer', 'items': ['petje', 'korte_broek', 'crop_top']},
    {'id': 'parijs', 'naam': 'Parijs', 'items': ['baret', 'blouse', 'rok', 'ballerinas']},
    {'id': 'herfstdag', 'naam': 'Herfstdag', 'items': ['teddyjas', 'wijde_broek', 'enkellaarsjes', 'oorbellen']},
    {'id': 'studie', 'naam': 'Studiedag', 'items': ['bril', 'koptelefoon', 'longsleeve']},
]


# ---------------------------------------------------------------------------
# Sprites maken
# ---------------------------------------------------------------------------
import json  # noqa: E402

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402
from scipy import ndimage as ndi  # noqa: E402

import kleding as K  # noqa: E402
from kast_teken import lichaam, TONEN, toon_stop  # noqa: E402
from kast_hoofd import HOOFD  # noqa: E402
from kast_acc import ACC  # noqa: E402
from kast_jas import JAS  # noqa: E402
from kast_boven import BOVEN  # noqa: E402
from kast_onder import ONDER  # noqa: E402
from kast_schoen import SCHOEN  # noqa: E402
from kast_heel import HEEL  # noqa: E402

TEKENAARS = {**HOOFD, **ACC, **JAS, **BOVEN, **ONDER, **SCHOEN, **HEEL}
KORT = {'hidde': 'h', 'tessie': 't'}
UITMAP = K.UIT / 'kast'


def lichaam_bron(fid):
    sp = np.asarray(Image.open(K.UIT / 'bron' / f'{fid}.png').convert('RGBA'))
    z = np.asarray(Image.open(K.UIT / 'zones' / 'bron' / f'{fid}.png'))
    z = (z[..., 0] if z.ndim == 3 else z).astype(int)
    return sp, (z + 15) // 30


def lum_stats(rgba, sel):
    """Zelfde als kleding.zone_stats, voor één selectie."""
    v = K.U.luminantie(rgba[..., :3].astype(float))[sel]
    p10, p50, p90 = np.percentile(v, [10, 50, 90])
    return {'mediaan': round(float(p50), 2), 'spreiding': round(float(max(p90 - p10, 4.0)), 2)}


def snij_uit(it, fid, variant, nb):
    """Uitgesneden item: de pixels van één zone van de goedgekeurde sprite."""
    sp, z = lichaam(fid) if variant == 'native' else lichaam_bron(fid)
    sel = z == K.Z[it['zone']]
    if it.get('zone_tot_y'):
        y = it['zone_tot_y'] if variant == 'native' else int(round(nb['oy'] + nb['sy'] * it['zone_tot_y']))
        sel[y:] = False
    rgba = sp.copy()
    rgba[~sel] = 0
    return rgba, (sel * 255).astype(np.uint8), lum_stats(sp, sel)


def png(pad, arr):
    pad.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(arr).save(pad, optimize=True)
    return pad.relative_to(K.UIT).as_posix()


def maak_sprites(kleding):
    """Vult per item sprites/maskers/knip/stats en geeft {pad: array} terug voor kast.js."""
    beelden = {}
    for it in CATALOGUS:
        if it['status'] != 'klaar':
            continue
        it['modus'] = 'luminantie' if it['herkomst'] == U else 'toon'
        for k in ('maskers', 'knip', 'bron', 'stats', 'wis', 'huid'):
            it[k] = {}
        for fid in it['lichaam']:
            naam = f"{it['id']}_{KORT[fid]}"
            nb = kleding['characters'][fid]['native_naar_bron']
            if it['herkomst'] == U:
                rgba, m, st = snij_uit(it, fid, 'native', nb)
                rb, mb, stb = snij_uit(it, fid, 'bron', nb)
                it['stats'][fid] = {'native': st, 'bron': stb}
                it['bron'][fid] = {'sprite': png(UITMAP / 'bron' / f'{naam}.png', rb),
                                   'masker': png(UITMAP / 'bron' / f'{naam}_m.png', mb)}
                beelden[it['bron'][fid]['sprite']] = rb
                beelden[it['bron'][fid]['masker']] = mb
            else:
                lg = TEKENAARS[it['id']](fid)
                rgba, m = lg.rgba, lg.masker
                if lg.knip.any():
                    kp = (lg.knip * 255).astype(np.uint8)
                    it['knip'][fid] = png(UITMAP / 'native' / f'{naam}_k.png', kp)
                    beelden[it['knip'][fid]] = kp
                if getattr(lg, 'boven_haar', True) is False:
                    it['onder_haar'] = True
                if getattr(lg, 'over_kleding', False):
                    it['over_kleding'] = True
                wis = getattr(lg, 'wis_masker', None)
                if wis is not None and wis.any():
                    wm = (wis * 255).astype(np.uint8)
                    it['wis'][fid] = png(UITMAP / 'native' / f'{naam}_w.png', wm)
                    beelden[it['wis'][fid]] = wm
                huid = getattr(lg, 'huid', None)
                if huid is not None and huid[..., 3].any():
                    it['huid'][fid] = png(UITMAP / 'native' / f'{naam}_s.png', huid)
                    beelden[it['huid'][fid]] = huid
            it['sprites'][fid] = png(UITMAP / 'native' / f'{naam}.png', rgba)
            it['maskers'][fid] = png(UITMAP / 'native' / f'{naam}_m.png', m)
            beelden[it['sprites'][fid]] = rgba
            beelden[it['maskers'][fid]] = m
        for k in ('knip', 'bron', 'stats', 'wis', 'huid'):
            if not it[k]:
                del it[k]
    return beelden


# ---------------------------------------------------------------------------
# Samenstellen (zelfde regels als tekenLook in app/figuur.js) - voor debug en controle
# ---------------------------------------------------------------------------
def verkleur_item(it, fid, rgba, masker, kleur):
    if not kleur or kleur == 'origineel' or kleur not in K.RAMPEN:
        return rgba
    out = rgba.copy()
    if it['modus'] == 'luminantie':
        lab = np.where(masker == 255, K.Z['shirt'], 0).astype(np.uint8)
        return K.verkleur(rgba, lab, {'shirt': it['stats'][fid]['native']}, {'shirt': kleur})
    ramp = K.RAMPEN[kleur]
    for i, t in enumerate(TONEN):
        sel = masker == 50 * (i + 1)
        out[sel, :3] = K.hex2rgb(ramp['stops'][toon_stop(ramp, t)]).astype(np.uint8)
    return out


def haarlaag(z):
    haar = z == K.Z['haar']
    return haar | (ndi.binary_dilation(haar, np.ones((3, 3), bool)) & (z == K.Z['lijn']))


def samenstel(fid, look):
    """look = {slot: {'item': id, 'kleur': ramp}} -> RGBA native canvas."""
    sp, z = lichaam(fid)
    per_id = {i['id']: i for i in CATALOGUS}
    lagen = {}
    for slot, keuze in look.items():
        it = per_id.get(keuze.get('item'))
        if it and it['status'] == 'klaar' and fid in it['sprites']:
            lagen[slot] = it
    over = 'heel_lichaam' in lagen and lagen['heel_lichaam'].get('over_kleding', False)
    if 'heel_lichaam' in lagen and not over:
        lagen.pop('boven', None)
        lagen.pop('onder', None)
    knip = np.zeros(z.shape, bool)
    for it in lagen.values():
        if it.get('knip', {}).get(fid):
            knip |= np.asarray(Image.open(K.UIT / it['knip'][fid])) > 0
    weg = knip & np.isin(z, [K.Z['haar'], K.Z['lijn']])
    wis = np.zeros(z.shape, bool)
    for it in lagen.values():
        if it.get('wis', {}).get(fid):
            wis |= np.asarray(Image.open(K.UIT / it['wis'][fid])) > 0
    basis = sp.copy()
    basis[weg | wis] = 0
    doek = basis.copy()
    for laag in LAAGVOLGORDE:              # huid-onderlagen (blote benen, buik) direct boven het lichaam
        it = lagen.get(laag)
        if it and it.get('huid', {}).get(fid):
            h = np.asarray(Image.open(K.UIT / it['huid'][fid]).convert('RGBA'))
            a = h[..., 3] > 0
            doek[a] = h[a]

    def leg(it):
        rgba = np.asarray(Image.open(K.UIT / it['sprites'][fid]).convert('RGBA'))
        m = np.asarray(Image.open(K.UIT / it['maskers'][fid]))
        kleur = next(v.get('kleur') for s, v in look.items() if v.get('item') == it['id'])
        r = verkleur_item(it, fid, rgba, m, kleur)
        a = r[..., 3] > 0
        if it.get('modus') == 'luminantie':   # uitgesneden = kopie van het lichaam: valt ook onder wis
            a &= ~wis
        doek[a] = r[a]

    acc = lagen.get('accessoire')
    for laag in LAAGVOLGORDE[1:]:
        if laag == 'haar':
            if acc and acc.get('onder_haar'):
                leg(acc)
            hl = haarlaag(z) & ~weg & (basis[..., 3] > 0)
            doek[hl] = basis[hl]
        elif laag == 'jas':
            if acc and acc.get('onder_jas'):
                leg(acc)
            if 'jas' in lagen:
                leg(lagen['jas'])
        elif laag == 'accessoire':
            if acc and not acc.get('onder_haar') and not acc.get('onder_jas'):
                leg(acc)
        elif laag == 'heel_lichaam':
            if 'heel_lichaam' in lagen and not over:
                leg(lagen['heel_lichaam'])
        else:
            if laag in lagen:
                leg(lagen[laag])
            if laag == 'boven' and over:
                leg(lagen['heel_lichaam'])
    return doek


# Vaste testlook: JS (kledingkast.html?test) vergelijkt zijn tekenLook hiermee.
CONTROLE = {'hidde': {'hoofd': {'item': 'beanie', 'kleur': 'mos'},
                      'boven': {'item': 'tshirt_basis', 'kleur': 'petrol'},
                      'jas': {'item': 'regenjas', 'kleur': 'koraal'},
                      'onder': {'item': 'korte_broek', 'kleur': 'petrol'},
                      'schoenen': {'item': 'sloffen', 'kleur': 'lavendel'},
                      'accessoire': {'item': 'sjaal', 'kleur': 'goud'}},
            'tessie': {'hoofd': {'item': 'baret', 'kleur': 'nacht'},
                       'boven': {'item': 'crop_top', 'kleur': 'lavendel'},
                       'onder': {'item': 'rok', 'kleur': 'mos'},
                       'schoenen': {'item': 'ballerinas', 'kleur': 'nacht'},
                       'accessoire': {'item': 'ketting_basis', 'kleur': 'creme'}}}
# De controle raakt alle laagregels: knip (muts), wis + uitgesneden item eronder (T-shirt onder de
# regenjas), huid-onderlagen (benen, buik, enkels), onder_haar (sjaal) en onder_jas (ketting).


# ---------------------------------------------------------------------------
# Pipeline-stap voor nieuwe kunst (Codex-bladen) - STUB, zie docs/kleding-art-brief.md
# ---------------------------------------------------------------------------
def snij_itemblad(blad_pad, fid, vakken, uitmap=UITMAP / 'native'):
    """Snij een itemblad (of het basislichaamblad) uit en lijn elk vak uit op het
    native canvas 64 x 112 met anker (32, 108).

    TODO (wacht op de bladen uit docs/kleding-art-brief.md):
      1. Per vak: achtergrond weg met uitsnijden.masker() (zelfde kleurafstand als de figuren).
      2. Raster meten met kleding.meet_periode() op het hele blad; verwacht 4,0-5,6 bronpx.
      3. Native maken met uitsnijden.native(sa, sm, periode) - één kleur per artpixel.
      4. Uitlijnen: het blad tekent elk vak met het basislichaam als lichtgrijze
         onderlaag. Zoek de verschuiving (dx, dy) waarbij de onderlaag het best op
         assets/native/<fid>.png valt (kruiscorrelatie op de outline, zoekvenster +-6 px),
         en verwijder die onderlaag daarna (kleur #d0d0d0 +-12).
      5. Controle: anker (32, 108) en voetlijn y = 108 gelijk aan het lichaam; meld items
         die buiten het canvas vallen of minder dan 20 pixels hebben.
      6. Zonemasker maken: alles behalve outline (L < DREMPEL) = 255 (luminantie-recolor),
         of met de hand toonletters toekennen voor modus 'toon'.
      7. Schrijf <id>_<h|t>.png en _m.png naar uitmap en zet het item op status 'klaar'
         in CATALOGUS (herkomst 'getekend (Codex)').
    vakken: [{'id': 'hoodie_basic', 'vak': (x0, y0, x1, y1)}, ...] in bladcoördinaten.
    """
    raise NotImplementedError('snij_itemblad: wacht op de bladen uit docs/kleding-art-brief.md')


# ---------------------------------------------------------------------------
# Uitvoer
# ---------------------------------------------------------------------------
def debugblad(pad, rijen, crop=(14, 110), schaal=3):
    beelden = [np.pad(b[crop[0]:crop[1], 4:60], ((0, 0), (0, 2), (0, 0))) for rij in rijen for b in rij]
    per = max(len(r) for r in rijen)
    hoog = []
    for i in range(0, len(beelden), per):
        stuk = beelden[i:i + per] + [np.zeros_like(beelden[0])] * (per - len(beelden[i:i + per]))
        hoog.append(np.concatenate(stuk, 1))
    K.compositie([np.concatenate(hoog, 0)], schaal=schaal).save(pad)


def controleer_sets():
    """Elk set-item bestaat en wijst terug naar zijn set; 3-4 items, samen draagbaar (verschillende slots)."""
    per = {i['id']: i for i in CATALOGUS}
    for st in SETS:
        assert 3 <= len(st['items']) <= 4, st['id']
        assert len({per[i]['slot'] for i in st['items']}) == len(st['items']), st['id']
        for i in st['items']:
            assert per[i]['set_id'] == st['id'], (i, st['id'])
    for it in CATALOGUS:
        assert it['set_id'] is None or any(it['id'] in st['items'] for st in SETS), it['id']


def main():
    controleer_sets()
    kleding = json.loads((K.UIT / 'kleding.json').read_text('utf-8'))
    beelden = maak_sprites(kleding)
    klaar = [i for i in CATALOGUS if i['status'] == 'klaar']
    # debug: elk item in de basiskleur, en elk item in al zijn kleuren
    rijen = []
    for fid in ('hidde', 'tessie'):
        rijen.append([samenstel(fid, {i['slot']: {'item': i['id'], 'kleur': i['kleuren'][0]}})
                      for i in klaar if fid in i['sprites']])
    debugblad(K.UIT / 'debug' / 'kast_items.png', rijen)
    kleurrijen = [[samenstel(fid, {i['slot']: {'item': i['id'], 'kleur': k}}) for k in i['kleuren']]
                  for i in klaar for fid in i['sprites']]
    debugblad(K.UIT / 'debug' / 'kast_kleuren.png', kleurrijen, crop=(16, 84), schaal=2)
    controle = {fid: K.png_data_url(samenstel(fid, look)) for fid, look in CONTROLE.items()}
    data = {
        'versie': 1,
        'uitleg': 'Modulaire kleding per slot. Gegenereerd door tools/kast.py; niet met de hand bewerken.',
        'canvas': {'native': [64, 112], 'anker': [32, 108]},
        'slots': SLOTS, 'laagvolgorde': LAAGVOLGORDE, 'prijzen': PRIJZEN, 'sets': SETS,
        'masker_codering': '0 = vaste kleur; 50/100/150/200/250 = toon o/a/b/c/h op de ramp '
                           '(modus toon); 255 = luminantie-recolor (modus luminantie)',
        'items': CATALOGUS,
    }
    (K.UIT / 'kast.json').write_text(json.dumps(data, indent=1, ensure_ascii=False), 'utf-8')
    data['beelden'] = {p: K.png_data_url(a) for p, a in beelden.items()}
    data['controle'] = {'look': CONTROLE, 'verwacht': controle}
    (K.UIT / 'kast.js').write_text(f'window.PQ_KAST = {json.dumps(data, ensure_ascii=False)};\n', 'utf-8')
    tel = {}
    for i in CATALOGUS:
        tel[i['herkomst']] = tel.get(i['herkomst'], 0) + 1
    print('items:', len(CATALOGUS), tel, '| beelden:', len(beelden),
          '| kast.js', round((K.UIT / 'kast.js').stat().st_size / 1024), 'KB')


if __name__ == '__main__':
    main()
