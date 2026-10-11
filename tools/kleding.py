"""Kleding- en outfitsysteem voor Pixel Quest.

Draait naast tools/uitsnijden.py en leest diens uitvoer (assets/bron, assets/native,
manifest.json). Het past die bestanden niet aan.

Stappen:
  1. Kledingzones per character (bron + native): kleursegmentatie binnen handmatig
     gekozen gebieden, plus correctiepunten (zoals GATEN in uitsnijden.py).
  2. Recolor: luminantie per zone behouden en op een kleurramp uit het palet zetten.
  3. Catalogus met outfits (combinaties van ramps per zone).
  4. Outfitfiguren en items exact uit het characterblad snijden.
  5. Ankerpunten voor accessoires + voorbeeldaccessoires (nieuw getekend).
  6. Data voor app/kledingkast.html (assets/kleding.js, werkt via file://).

Gebruik:  python tools/kleding.py
"""
import base64
import io
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

sys.path.insert(0, str(Path(__file__).resolve().parent))
import uitsnijden as U  # noqa: E402

ROOT = U.ROOT
UIT = U.UIT
DEBUG = UIT / 'debug'

# ---------------------------------------------------------------------------
# Zones
# ---------------------------------------------------------------------------
# Index in de zonekaarten. 'lijn' en 'detail' worden nooit verkleurd.
ZONES = ['leeg', 'lijn', 'haar', 'huid', 'shirt', 'broek', 'schoenen', 'accessoire', 'detail']
Z = {n: i for i, n in enumerate(ZONES)}
# Alleen deze zones mogen verkleurd worden. Haar en huid zijn vergrendeld:
# de goedgekeurde figuren behouden hun gezicht en haar.
KLEURBAAR = ['shirt', 'broek', 'schoenen', 'accessoire']
ZONEKLEUR = {  # alleen voor debug-overlays
    'leeg': (0, 0, 0), 'lijn': (40, 40, 40), 'haar': (150, 80, 30), 'huid': (255, 190, 120),
    'shirt': (40, 120, 255), 'broek': (40, 200, 90), 'schoenen': (255, 60, 200),
    'accessoire': (255, 230, 0), 'detail': (0, 230, 230),
}

# Regels per character in bron-canvascoördinaten (291 x 508). Volgorde telt:
# de eerste regel waarvan gebied én kleurtest kloppen, wint.
#   gebied: ('vak', x0, y0, x1, y1) of ('poly', [(x, y), ...]) of None (overal)
#   test:   naam van een kleurtest in KLEURTEST
REGELS = {
    'hidde': [
        ('lijn', None, 'outline'),
        ('lijn', None, 'halo'),
        ('detail', ('vak', 140, 168, 200, 205), 'oog'),
        ('huid', ('vak', 60, 150, 235, 310), 'huid'),
        ('huid', ('vak', 60, 310, 235, 360), 'huid_sterk'),
        ('huid', ('vak', 70, 300, 113, 352), 'huid'),       # linkerhand in zak
        ('huid', ('vak', 182, 300, 210, 352), 'huid'),      # rechterhand in zak
        ('haar', ('vak', 60, 95, 240, 226), 'alles'),
        ('shirt', ('vak', 60, 214, 240, 336), 'neutraal_donker'),
        ('huid', ('vak', 60, 214, 240, 345), 'huid_donker'),
        # schoenen: zelfde crème als de broek, dus op vorm (de broekzoom valt over de neus)
        ('schoenen', ('poly', [(58, 461), (124, 461), (126, 495), (50, 495)]), 'alles'),
        ('schoenen', ('poly', [(166, 457), (196, 457), (214, 466), (214, 495), (138, 495),
                               (138, 469), (160, 467)]), 'alles'),
        ('broek', ('vak', 40, 318, 250, 495), 'alles'),
    ],
    'tessie': [
        ('lijn', None, 'outline'),
        ('lijn', None, 'halo'),
        ('accessoire', ('poly', [(112, 262), (145, 262), (132, 288), (124, 288)]), 'goud'),
        ('accessoire', ('vak', 118, 322, 136, 338), 'goud_rand'),   # riemgesp
        ('detail', ('vak', 100, 195, 175, 225), 'oog'),
        ('broek', ('vak', 40, 462, 250, 495), 'rood'),
        ('schoenen', ('vak', 40, 462, 250, 495), 'alles'),
        ('lijn', None, 'wit'),        # crème stipjes tussen de krullen en naast de arm
        ('huid', ('vak', 60, 160, 235, 318), 'huid'),
        ('huid', ('vak', 60, 318, 235, 360), 'huid_sterk'),
        ('huid', ('vak', 70, 290, 104, 362), 'huid'),       # handen op de heupen
        ('huid', ('vak', 158, 290, 198, 362), 'huid'),
        ('shirt', ('poly', [(95, 262), (112, 260), (145, 260), (163, 258), (168, 272),
                            (163, 296), (160, 323), (100, 323), (97, 298), (92, 280)]), 'alles'),
        ('huid', ('vak', 60, 290, 235, 360), 'huid_donker'),
        ('huid', ('vak', 70, 290, 104, 362), 'huid_licht'),
        ('huid', ('vak', 158, 290, 198, 362), 'huid_licht'),
        ('haar', ('vak', 30, 120, 260, 322), 'alles'),
        ('broek', ('vak', 40, 318, 250, 495), 'alles'),
    ],
}

# Handmatige correcties: (zone, (x, y)) in bron-canvascoördinaten. Het samenhangende
# stuk met hetzelfde automatische label rond het punt krijgt de opgegeven zone.
CORRECTIES = {
    'hidde': [],
    'tessie': [],
}

DREMPEL_LIJN = {'hidde': 26, 'tessie': 24}


def kenmerken(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1)
    v = mx / 255
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    d = np.maximum(mx - mn, 1e-6)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    h = np.where(mx - mn < 1e-6, 0, h)
    return {'L': U.luminantie(rgb), 'h': h, 's': s, 'v': v, 'r': r, 'g': g, 'b': b}


def kleurtest(naam, k, fid, rand):
    L, h, s, v = k['L'], k['h'], k['s'], k['v']
    if naam == 'alles':
        return np.ones_like(L, bool)
    if naam == 'outline':
        return L < DREMPEL_LIJN[fid]
    if naam == 'halo':  # lichte anti-aliasrand tegen de (verwijderde) achtergrond
        return rand & (s < 0.22) & (L > 120)
    if naam == 'oog':   # blauwe iris of oogwit
        return ((k['b'] > k['r'] + 15) & (k['b'] > 90)) | ((s < 0.16) & (L > 170))
    if naam == 'huid':
        return (h >= 4) & (h <= 40) & (s > 0.28) & (v > 0.80)
    if naam == 'goud':
        return (h >= 30) & (h <= 60) & (s > 0.45) & (v > 0.55)
    if naam == 'neutraal_donker':
        return (L < 125) & (s < 0.35)
    if naam == 'huid_donker':
        return (h >= 8) & (h <= 45) & (s > 0.5) & (v > 0.45)
    if naam == 'goud_rand':
        return (h >= 20) & (h <= 60) & (s > 0.4) & (v > 0.45)
    if naam == 'huid_licht':   # oranje-roze huidtinten, ook minder verzadigd
        return (h >= 4) & (h <= 40) & (s > 0.2) & (v > 0.7)
    if naam == 'wit':
        return (s < 0.15) & (L > 200)
    if naam == 'huid_sterk':
        return (h >= 4) & (h <= 40) & (s > 0.5) & (v > 0.5)
    if naam == 'rood':
        return ((h < 20) | (h > 330)) & (s > 0.4)
    raise KeyError(naam)


def in_gebied(gebied, shape):
    hh, ww = shape
    if gebied is None:
        return np.ones(shape, bool)
    if gebied[0] == 'vak':
        _, x0, y0, x1, y1 = gebied
        m = np.zeros(shape, bool)
        m[max(0, y0):y1, max(0, x0):x1] = True
        return m
    im = Image.new('L', (ww, hh), 0)
    ImageDraw.Draw(im).polygon(gebied[1], fill=1)
    return np.asarray(im, bool)


def segmenteer_bron(fid, rgba):
    alpha = rgba[..., 3] > 0
    rgb = rgba[..., :3].astype(float)
    k = kenmerken(rgb)
    rand = alpha & ~ndi.binary_erosion(alpha, iterations=2)
    lab = np.zeros(alpha.shape, np.uint8)
    vrij = alpha.copy()
    for zone, gebied, test in REGELS[fid]:
        sel = vrij & in_gebied(gebied, alpha.shape) & kleurtest(test, k, fid, rand)
        lab[sel] = Z[zone]
        vrij &= ~sel
    # Rest: label van dichtstbijzijnde gelabelde pixel.
    if vrij.any():
        _, (iy, ix) = ndi.distance_transform_edt(lab == 0, return_indices=True)
        lab[vrij] = lab[iy[vrij], ix[vrij]]
    for zone, (x, y) in CORRECTIES[fid]:
        oud = lab[y, x]
        comp, _ = ndi.label(lab == oud)
        lab[comp == comp[y, x]] = Z[zone]
    lab[~alpha] = 0
    return lab


# ---------------------------------------------------------------------------
# Geometrie: exact dezelfde uitsnede en hetzelfde raster als uitsnijden.py
# ---------------------------------------------------------------------------
def geometrie(fid):
    rij = next(f for f in U.FIGUREN if f[0] == fid)
    _, naam, cat, blad, (x0, y0, x1, y1) = rij
    manifest = json.loads((UIT / 'manifest.json').read_text('utf-8'))
    asset = next(a for a in manifest['assets'] if a['id'] == fid)
    pe = float(U.PERIODES[np.argmin(np.abs(U.PERIODES - asset["raster_gemeten"]))]) * asset["figuurschaal"]
    a = np.asarray(Image.open(U.BRON / blad).convert('RGB')).astype(float)[y0:y1, x0:x1]
    m = U.masker(a, U.GATEN.get(fid, ()), (x0, y0))
    ys, xs = np.nonzero(m)
    sa = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    sm = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    c = U.CANVAS[cat]
    bw, bh, bv = asset['afmetingen']['bron'][0], asset['afmetingen']['bron'][1], asset['anker']['bron'][1]
    h, w = sm.shape
    bx0, by0 = (bw - w) // 2, bv - h
    nat, gx, gy = U.native(sa, sm, pe)
    nn, (cx, cy) = U.bijsnijden(nat)
    nx0, ny0 = (c['w'] - nn.shape[1]) // 2, c['voet_y'] - nn.shape[0]
    bron = np.asarray(Image.open(UIT / 'bron' / f'{fid}.png').convert('RGBA'))
    natc = np.asarray(Image.open(UIT / 'native' / f'{fid}.png').convert('RGBA'))
    # Controle: herberekening moet exact de bestaande assets opleveren.
    assert (bron[by0:by0 + h, bx0:bx0 + w, 3] > 0).sum() == sm.sum(), 'bron wijkt af'
    cellen = {}  # native canvas (rij, kolom) -> bron-canvasvak (y0, y1, x0, x1)
    for r in range(len(gy) - 1):
        for k in range(len(gx) - 1):
            if nat[r, k, 3] == 0:
                continue
            cellen[(ny0 + r - cy, nx0 + k - cx)] = (by0 + gy[r], by0 + gy[r + 1], bx0 + gx[k], bx0 + gx[k + 1])
    nat_check = np.zeros_like(natc)
    for (r, k), _ in cellen.items():
        nat_check[r, k] = natc[r, k]
    assert (natc[..., 3] > 0).sum() == len(cellen), 'native wijkt af'
    return {'bron': bron, 'native': natc, 'cellen': cellen, 'pe': pe, 'asset': asset}


def native_zones(geo, lab_bron):
    """Zone per artpixel: meerderheid van de bronlabels in de celkern."""
    lab = np.zeros(geo['native'].shape[:2], np.uint8)
    for (r, k), (y0, y1, x0, x1) in geo['cellen'].items():
        ky0, ky1 = (y0 + 1, y1 - 1) if y1 - y0 > 3 else (y0, y1)
        kx0, kx1 = (x0 + 1, x1 - 1) if x1 - x0 > 3 else (x0, x1)
        blok = lab_bron[ky0:ky1, kx0:kx1].ravel()
        blok = blok[blok > 0]
        if len(blok) == 0:
            blok = lab_bron[y0:y1, x0:x1].ravel()
            blok = blok[blok > 0]
        lab[r, k] = np.bincount(blok, minlength=len(ZONES)).argmax() if len(blok) else Z['lijn']
    return lab


# ---------------------------------------------------------------------------
# Recolor
# ---------------------------------------------------------------------------
PALET = U.PALET


def hex2rgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float)


def rgb2hex(c):
    return '#' + ''.join(f'{int(round(v)):02x}' for v in np.clip(c, 0, 255))


def mix(a, b, t):
    return a * (1 - t) + b * t


def lum(c):
    return float(c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114)


def maak_ramp(naam):
    """Vijf tinten (donker -> licht) rond één paletkleur, alleen gemengd met andere
    paletkleuren: schaduw naar nacht/titel (koel), licht naar papier/crème (warm)."""
    p = {k: hex2rgb(v) for k, v in PALET.items()}
    c = p[naam]
    if lum(c) > 200:      # crème/papier: schaduw via eik en koffie
        stops = [mix(c, p['koffie'], 0.62), mix(c, p['eik'], 0.42), mix(c, p['eik'], 0.17), c,
                 mix(c, np.array([255.0, 255, 255]), 0.6)]
    elif lum(c) < 70:     # nacht/titel/koffie: licht via nacht/lavendel, schaduw naar bijna zwart
        stops = [mix(c, np.array([6.0, 8, 20]), 0.55), mix(c, np.array([6.0, 8, 20]), 0.25), c,
                 mix(c, p['papier'], 0.22), mix(c, p['papier'], 0.45)]
    else:
        stops = [mix(c, p['titel'], 0.65), mix(c, p['nacht'], 0.38), c,
                 mix(c, p['papier'], 0.38), mix(c, p['creme'], 0.72)]
    stops = sorted(stops, key=lum)
    return {'basis': rgb2hex(c), 'stops': [rgb2hex(s) for s in stops]}


RAMPEN = {naam: maak_ramp(naam) for naam in PALET}
# Doelcontrast: het p10-p90-bereik van een zone wordt ~ zoveel luminantie breed.
DOEL_SPREIDING = 60.0
K_MIN, K_MAX = 0.5, 2.2


def zone_stats(rgba, lab):
    L = U.luminantie(rgba[..., :3].astype(float))
    st = {}
    for z in KLEURBAAR:
        v = L[lab == Z[z]]
        if len(v) == 0:
            continue
        p10, p50, p90 = np.percentile(v, [10, 50, 90])
        st[z] = {'mediaan': round(float(p50), 2), 'spreiding': round(float(max(p90 - p10, 4.0)), 2)}
    return st


def ramp_kleur(ramp_hex, Lt):
    """Kleur op de ramp bij doel-luminantie Lt (lineair tussen de stops, geklemd)."""
    st = np.array([hex2rgb(h) for h in ramp_hex])
    ls = np.array([lum(c) for c in st])
    Lt = np.clip(Lt, ls[0], ls[-1])
    i = np.clip(np.searchsorted(ls, Lt, side='right') - 1, 0, len(ls) - 2)
    t = (Lt - ls[i]) / np.maximum(ls[i + 1] - ls[i], 1e-6)
    return st[i] * (1 - t[..., None]) + st[i + 1] * t[..., None]


def ramp_verschuiving(ramp, breedte):
    """Schuif de mapping zodat het p10-p90-bereik binnen de ramp valt; anders klemt de
    arcering weg bij heel lichte (crème) of heel donkere (titel) basiskleuren."""
    ls = [lum(hex2rgb(h)) for h in ramp['stops']]
    Lb = lum(hex2rgb(ramp['basis']))
    boven = ls[-1] - (Lb + 0.5 * breedte)
    onder = ls[0] - (Lb - 0.5 * breedte)
    if boven < 0 and onder <= 0:
        return max(boven, onder)
    if onder > 0 and boven >= 0:
        return min(onder, boven)
    return 0.0


def verkleur(rgba, lab, stats, keuze):
    """keuze: {zone: rampnaam}. Behoudt alpha, outline en vergrendelde zones."""
    out = rgba.copy()
    L = U.luminantie(rgba[..., :3].astype(float))
    for zone, rampnaam in keuze.items():
        if zone not in KLEURBAAR or not rampnaam or rampnaam == 'origineel' or zone not in stats:
            continue
        sel = lab == Z[zone]
        ramp = RAMPEN[rampnaam]
        k = float(np.clip(DOEL_SPREIDING / stats[zone]['spreiding'], K_MIN, K_MAX))
        Lt = lum(hex2rgb(ramp['basis'])) + (L[sel] - stats[zone]['mediaan']) * k
        Lt += ramp_verschuiving(ramp, stats[zone]['spreiding'] * k)
        out[sel, :3] = np.round(ramp_kleur(ramp['stops'], Lt)).astype(np.uint8)
    return out


# ---------------------------------------------------------------------------
# Debug
# ---------------------------------------------------------------------------
def overlay(rgba, lab, schaal):
    rgb = rgba[..., :3].astype(float)
    kl = np.array([ZONEKLEUR[z] for z in ZONES], float)
    o = rgb * 0.45 + kl[lab] * 0.55
    o[lab == 0] = (235, 235, 235)
    o[lab == Z['lijn']] = rgb[lab == Z['lijn']] * 0.4 + 40
    links = np.where(rgba[..., 3:] > 0, rgb, 235)
    duo = np.concatenate([links, np.full((rgb.shape[0], 4, 3), 255.0), o], 1)
    im = Image.fromarray(duo.astype(np.uint8))
    return im.resize((im.width * schaal, im.height * schaal), Image.NEAREST)


# ---------------------------------------------------------------------------
# Ankerpunten (native canvas 64 x 112) - handmatig gekozen op het native raster,
# gecontroleerd met assets/debug/ankers.png.
# ---------------------------------------------------------------------------
ANKERS = {
    'hidde': {'kruin': [33, 27], 'voorhoofd': [34, 35], 'ogen': [35, 40], 'nek': [31, 50],
              'hand_links': [18, 68], 'hand_rechts': [41, 70]},
    'tessie': {'kruin': [28, 33], 'voorhoofd': [27, 39], 'ogen': [26, 47], 'nek': [26, 57],
               'hand_links': [17, 70], 'hand_rechts': [37, 70]},
}
# Kant waarnaar het gezicht gedraaid is (vanuit de kijker). Accessoires zijn
# getekend voor 'rechts' en worden voor 'links' automatisch gespiegeld.
KIJKRICHTING = {'hidde': 'rechts', 'tessie': 'links'}


def native_naar_bron(geo):
    """Lineaire afbeelding native -> bron-canvas (kleinste kwadraten over de cellen)."""
    rk = np.array(list(geo['cellen'].keys()), float)
    bx = np.array(list(geo['cellen'].values()), float)
    sx, ox = np.polyfit(rk[:, 1], bx[:, 2], 1)
    sy, oy = np.polyfit(rk[:, 0], bx[:, 0], 1)
    return {'sx': round(float(sx), 4), 'ox': round(float(ox), 2),
            'sy': round(float(sy), 4), 'oy': round(float(oy), 2)}


# ---------------------------------------------------------------------------
# Catalogus: combinaties van ramps per zone (alleen kleurbare zones)
# ---------------------------------------------------------------------------
CATALOGUS = [
    {'id': 'bosrijk', 'naam': 'Bosrijk', 'stel': True,
     'omschrijving': 'Bosgroen en mos boven, warme bruintinten eronder.',
     'hidde': {'shirt': 'blad', 'broek': 'hazelnoot'},
     'tessie': {'shirt': 'mos', 'broek': 'koffie'}},
    {'id': 'zonsondergang', 'naam': 'Zonsondergang', 'stel': True,
     'omschrijving': 'Koraal en abrikoos boven, avondblauw en bordeaux eronder.',
     'hidde': {'shirt': 'koraal', 'broek': 'nacht'},
     'tessie': {'shirt': 'abrikoos', 'broek': 'origineel'}},
    {'id': 'nachtwacht', 'naam': 'Nachtwacht', 'stel': True,
     'omschrijving': 'Alles in nachtblauw, met zilver in plaats van goud.',
     'hidde': {'shirt': 'titel', 'broek': 'nacht', 'schoenen': 'nacht'},
     'tessie': {'shirt': 'nacht', 'broek': 'titel', 'schoenen': 'nacht', 'accessoire': 'creme'}},
    {'id': 'zeebries', 'naam': 'Zeebries', 'stel': True,
     'omschrijving': 'Petrol en crème, bij elkaar in spiegelbeeld.',
     'hidde': {'shirt': 'petrol', 'broek': 'creme'},
     'tessie': {'shirt': 'creme', 'broek': 'petrol'}},
    {'id': 'lavendelveld', 'naam': 'Lavendelveld', 'stel': True,
     'omschrijving': 'Allebei lavendel boven.',
     'hidde': {'shirt': 'lavendel', 'broek': 'papier'},
     'tessie': {'shirt': 'lavendel', 'broek': 'nacht'}},
    {'id': 'goudhaantje', 'naam': 'Goudhaantje', 'stel': True,
     'omschrijving': 'Matching: goud shirt en koffiebruine broek voor allebei.',
     'hidde': {'shirt': 'goud', 'broek': 'koffie'},
     'tessie': {'shirt': 'goud', 'broek': 'koffie'}},
    {'id': 'rollenruil', 'naam': 'Rollenruil', 'stel': True,
     'omschrijving': 'Ze ruilen kleuren: hij in bruin en bordeaux, zij in donker en crème.',
     'hidde': {'shirt': 'koffie', 'broek': 'bordeaux'},
     'tessie': {'shirt': 'titel', 'broek': 'creme'}},
    {'id': 'hoodiedag', 'naam': 'Hoodiedag', 'stel': True,
     'omschrijving': 'De kleuren van de hoodie-outfit van het blad: crème boven.',
     'hidde': {'shirt': 'creme', 'broek': 'nacht'},
     'tessie': {'shirt': 'creme', 'broek': 'origineel'}},
    {'id': 'koffietijd', 'naam': 'Koffietijd', 'stel': True,
     'omschrijving': 'Hazelnoot en papier, rustig en warm.',
     'hidde': {'shirt': 'hazelnoot', 'broek': 'papier'},
     'tessie': {'shirt': 'papier', 'broek': 'eik'}},
]


# ---------------------------------------------------------------------------
# Outfits en items van het characterblad (exacte bronpixels)
# ---------------------------------------------------------------------------
OUTFITVAK = (1000, 160, 1522, 540)
# Watershed-zaadgebieden (bladcoördinaten) om het overlappende hoodie-paar te splitsen.
HOODIE_ZADEN = {'hidde_hoodie': (1020, 200, 1090, 500), 'tessie_hoodie': (1150, 220, 1240, 500)}
FIGUURVARIANTEN = [
    # id, naam, character, selectie (vak in bladcoördinaten of 'hoodie')
    ('hidde_hoodie', 'Hidde in hoodie', 'hidde', 'hoodie'),
    ('tessie_hoodie', 'Tessie in hoodie', 'tessie', 'hoodie'),
    ('hidde_avontuur', 'Hidde als avonturier', 'hidde', (1255, 160, 1384, 540)),
    ('tessie_avontuur', 'Tessie als avonturier', 'tessie', (1400, 200, 1522, 540)),
]
# Eerlijke kwaliteitsnotitie per figuurvariant (komt in kleding.json en de kledingkast).
BEPERKINGEN = {
    'hidde_hoodie': 'Gesplitst van Tessie (watershed langs de outline). Tessies haar ligt over '
                    'zijn rechtermouw: daar ontbreekt de outline en een strookje mouw. Niet bijgetekend.',
    'tessie_hoodie': 'Gesplitst van Hidde. Waar de mouwen elkaar raken mist een stukje outline '
                     'links onderaan haar mouw. Niet bijgetekend.',
    'hidde_avontuur': 'Los van Tessie, schoon uitgesneden.',
    'tessie_avontuur': 'Los van Hidde, schoon uitgesneden.',
}
ITEMS = [
    ('gieter', 'Gieter', (1010, 560, 1150, 672)),
    ('bezem', 'Bezem', (1152, 560, 1265, 672)),
    ('klembord', 'Klembord', (1267, 560, 1385, 672)),
    ('ster', 'Ster', (1387, 560, 1515, 672)),
    ('plant', 'Plant', (1010, 676, 1150, 792)),
    ('hart', 'Hart', (1152, 676, 1265, 792)),
    ('rugzak', 'Rugzak', (1267, 676, 1385, 792)),
    ('munt', 'Munt', (1387, 676, 1515, 792)),
]
ITEMCANVAS = {'w': 36, 'h': 36, 'voet_y': 34}


def blad_rgb():
    return np.asarray(Image.open(U.BRON / U.CHARBLAD).convert('RGB')).astype(float)


def outfit_maskers(blad):
    from scipy.ndimage import watershed_ift
    x0, y0, x1, y1 = OUTFITVAK
    a = blad[y0:y1, x0:x1]
    m = U.masker(a, (), (x0, y0))
    lab, _ = ndi.label(m)
    uit = {}
    for fid, _, _, sel in FIGUURVARIANTEN:
        if sel == 'hoodie':
            continue
        vx0, vy0, vx1, vy1 = sel
        sub = np.zeros_like(m)
        sub[vy0 - y0:vy1 - y0, vx0 - x0:vx1 - x0] = True
        uit[fid] = lab == np.bincount(lab[sub & m]).argmax()
    # Hoodie-paar: één samenhangend stuk. Splitsen met watershed op donkerte
    # (outlines zijn de waterscheiding), gezaaid vanuit beide lijven.
    paar = lab == np.bincount(lab[:, :240][m[:, :240]]).argmax()
    mk = np.zeros(m.shape, np.int32)
    for i, (zx0, zy0, zx1, zy1) in enumerate(HOODIE_ZADEN.values(), start=1):
        mk[zy0 - y0:zy1 - y0, zx0 - x0:zx1 - x0] = i
    mk[~paar] = 0
    hoogte = np.clip(255 - U.luminantie(a), 0, 255).astype(np.uint8)
    hoogte[~paar] = 255
    ws = watershed_ift(hoogte, mk)
    for i, fid in enumerate(HOODIE_ZADEN, start=1):
        d = paar & (ws == i)
        lab2, n2 = ndi.label(d)   # losse snippers van de buurfiguur weg
        if n2 > 1:
            gr = ndi.sum(d, lab2, range(1, n2 + 1))
            d = lab2 == (int(np.argmax(gr)) + 1)
        uit[fid] = d
    return a, uit, (x0, y0)


def meet_periode(stukken, lo=4.0, hi=5.6):
    """Rasterperiode over meerdere uitsnedes samen. Begrensd tot het bereik van het
    characterblad: buiten de figuren is het profiel vlak en wint anders de rand (7,18)."""
    score = sum(U.raster_score(sa) for sa in stukken)
    binnen = (U.PERIODES >= lo) & (U.PERIODES <= hi)
    return float(U.PERIODES[binnen][int(np.argmax(score[binnen]))])


def png_data_url(arr):
    buf = io.BytesIO()
    Image.fromarray(arr).save(buf, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode('ascii')


def zone_png(lab):
    """Zonekaart als grijswaarde-PNG: waarde = zone-index x 30 (robuust tegen afronding)."""
    return lab.astype(np.uint8) * 30


def snij_figuren(blad, per_id):
    """Outfitfiguren: bron (exact), native (eigen gemeten raster), referentie."""
    a, maskers, (x0, y0) = outfit_maskers(blad)
    stukken = {}
    for fid, m in maskers.items():
        ys, xs = np.nonzero(m)
        stukken[fid] = (a[ys.min():ys.max() + 1, xs.min():xs.max() + 1],
                        m[ys.min():ys.max() + 1, xs.min():xs.max() + 1], (xs.min() + x0, ys.min() + y0))
    p = meet_periode([s[0] for s in stukken.values()])
    c = U.CANVAS['character']
    resultaat = []
    for fid, naam, char, _ in FIGUURVARIANTEN:
        sa, sm, (bx, by) = stukken[fid]
        rgba = U.rgba_bron(sa, sm)
        bw, bh, bv = round(c['w'] * p), round(c['h'] * p), round(c['voet_y'] * p)
        Image.fromarray(U.op_canvas(rgba, bw, bh, bv)).save(UIT / 'outfits' / 'bron' / f'{fid}.png')
        h, w = sm.shape
        ref = blad[max(0, by - 6):by + h + 6, max(0, bx - 6):bx + w + 6]
        Image.fromarray(ref.astype(np.uint8)).save(UIT / 'outfits' / 'referentie' / f'{fid}.png')
        nat, _, _ = U.native(sa, sm, p)
        nat, _ = U.bijsnijden(nat)
        doek = U.op_canvas(nat, c['w'], c['h'], c['voet_y'])
        Image.fromarray(doek).save(UIT / 'outfits' / 'native' / f'{fid}.png')
        resultaat.append({
            'id': fid, 'naam': naam, 'character': char, 'herkomst': 'uitgesneden',
            'beperking': BEPERKINGEN[fid] + ' Eigen tekening op het blad: gezicht en haar '
                         'wijken iets af van de basisfiguur; fijner raster.',
            'bestanden': {'bron': f'outfits/bron/{fid}.png', 'native': f'outfits/native/{fid}.png',
                          'referentie': f'outfits/referentie/{fid}.png'},
            'afmetingen': {'bron': [bw, bh], 'native': [c['w'], c['h']]},
            'anker': {'bron': [bw // 2, bv], 'native': [c['w'] // 2, c['voet_y']]},
            'figuur': {'bron': [int(w), int(h)], 'native': [int(nat.shape[1]), int(nat.shape[0])]},
            'figuur_basis_native': per_id[char]['figuur']['native'],
            'referentie': {'blad': U.CHARBLAD, 'vak': [int(bx), int(by), int(w), int(h)]},
            'bronpx_per_artpixel': round(p, 3),
        })
    return resultaat, maskers, a


def snij_items(blad):
    stukken = []
    for iid, naam, (x0, y0, x1, y1) in ITEMS:
        a = blad[y0:y1, x0:x1]
        m = U.masker(a, (), (x0, y0))
        ys, xs = np.nonzero(m)
        stukken.append((iid, naam, a[ys.min():ys.max() + 1, xs.min():xs.max() + 1],
                        m[ys.min():ys.max() + 1, xs.min():xs.max() + 1], (x0 + xs.min(), y0 + ys.min())))
    p = meet_periode([s[2] for s in stukken])
    c = ITEMCANVAS
    uit = []
    for iid, naam, sa, sm, (bx, by) in stukken:
        Image.fromarray(U.rgba_bron(sa, sm)).save(UIT / 'items' / 'bron' / f'{iid}.png')
        nat, _, _ = U.native(sa, sm, p)
        nat, _ = U.bijsnijden(nat)
        doek = U.op_canvas(nat, c['w'], c['h'], c['voet_y'])
        Image.fromarray(doek).save(UIT / 'items' / 'native' / f'{iid}.png')
        uit.append({'id': iid, 'naam': naam, 'herkomst': 'uitgesneden',
                    'bestanden': {'bron': f'items/bron/{iid}.png', 'native': f'items/native/{iid}.png'},
                    'figuur': {'bron': [int(sa.shape[1]), int(sa.shape[0])],
                               'native': [int(nat.shape[1]), int(nat.shape[0])]},
                    'native_canvas': [c['w'], c['h']], 'anker_native': [c['w'] // 2, c['voet_y']],
                    'referentie': {'blad': U.CHARBLAD,
                                   'vak': [int(bx), int(by), int(sa.shape[1]), int(sa.shape[0])]},
                    'bronpx_per_artpixel': round(p, 3)})
    return uit


# ---------------------------------------------------------------------------
# Voorbeeldaccessoires - NIEUW GETEKEND (niet van het blad). Zelfde vorm als de
# editor: tekens -> kleuren, '.' = transparant. 'ankerpunt' is de pixel van het
# accessoire die op het anker van het character valt.
# ---------------------------------------------------------------------------
ACCESSOIRES = [
    {'id': 'petje', 'naam': 'Petje', 'anker': 'kruin', 'laag': 'voor', 'ankerpunt': [7, 6],
     'kijkrichting': 'rechts', 'herkomst': 'nieuw getekend',
     'kleuren': {'o': 'titel', 'a': 'petrol', 'b': '#2f6670', 'c': '#6fa3ac', 'w': 'creme'},
     'pixels': [
         '....oooooo.......',
         '...oaaccaao......',
         '..oaaaccaaao.....',
         '..oaaaaaaaao.....',
         '.oaaaawaaaaao....',
         '.obbbbbbbbbbooooo',
         '.oooooooobbbbbbbo',
         '.........oooooooo',
     ]},
    {'id': 'bril', 'naam': 'Ronde bril', 'anker': 'ogen', 'laag': 'voor', 'ankerpunt': [5, 1],
     'kijkrichting': 'rechts', 'herkomst': 'nieuw getekend',
     'kleuren': {'o': 'titel', 'g': '#cfe3e6'},
     'pixels': [
         '.ooo...ooo.',
         'o.g.ooo.g.o',
         'o...o.o...o',
         '.ooo...ooo.',
     ]},
    {'id': 'kroontje', 'naam': 'Kroontje', 'anker': 'kruin', 'laag': 'voor', 'ankerpunt': [4, 5],
     'kijkrichting': 'rechts', 'herkomst': 'nieuw getekend',
     'kleuren': {'o': 'koffie', 'g': 'goud', 'l': '#fed78a', 'r': 'koraal'},
     'pixels': [
         'o...o...o',
         'og.oro.go',
         'oggglgggo',
         'oglgggglo',
         'ogggggggo',
         '.ooooooo.',
     ]},
    {'id': 'sjaal', 'naam': 'Sjaal', 'anker': 'nek', 'laag': 'voor', 'ankerpunt': [7, 1],
     'kijkrichting': 'rechts', 'herkomst': 'nieuw getekend',
     'kleuren': {'o': 'koffie', 'r': 'bordeaux', 'k': 'koraal', 'l': 'abrikoos'},
     'pixels': [
         '.ooooooooooooo.',
         'orrkkrrkkrrkkro',
         'orkkrrkkrrkkrro',
         '.orrkkrrkkrrko.',
         '..oooorkkroooo.',
         '.....orkkro....',
         '.....okkrro....',
         '.....orrkko....',
         '.....ollllo....',
         '.....l.l.l.....',
     ]},
]


def accessoire_rgba(acc):
    pal = {k: hex2rgb(PALET.get(v, v)) for k, v in acc['kleuren'].items()}
    h, w = len(acc['pixels']), max(len(r) for r in acc['pixels'])
    out = np.zeros((h, w, 4), np.uint8)
    for y, rij in enumerate(acc['pixels']):
        for x, ch in enumerate(rij):
            if ch in pal:
                out[y, x, :3] = pal[ch]
                out[y, x, 3] = 255
    return out


def plaats_accessoire(doek, acc, fid):
    """Teken accessoire op een native canvas (in place); spiegelt bij andere kijkrichting."""
    img = accessoire_rgba(acc)
    ax, ay = acc['ankerpunt']
    if acc.get('kijkrichting', 'rechts') != KIJKRICHTING[fid]:
        img = img[:, ::-1]
        ax = img.shape[1] - 1 - ax
    dx, dy = acc.get('verschuiving', {}).get(fid, [0, 0])
    kx, ky = ANKERS[fid][acc['anker']]
    x0, y0 = kx - ax + dx, ky - ay + dy
    for y in range(img.shape[0]):
        for x in range(img.shape[1]):
            if img[y, x, 3] and 0 <= y0 + y < doek.shape[0] and 0 <= x0 + x < doek.shape[1]:
                doek[y0 + y, x0 + x] = img[y, x]
    return doek


def compositie(beelden, achtergrond=(214, 222, 205), schaal=1, tussen=6):
    """Zet RGBA-beelden naast elkaar (onderkant gelijk) op een egale achtergrond."""
    hh = max(b.shape[0] for b in beelden)
    rij = []
    for b in beelden:
        vlak = np.zeros((hh, b.shape[1], 4), np.uint8)
        vlak[hh - b.shape[0]:] = b
        rij += [vlak, np.zeros((hh, tussen, 4), np.uint8)]
    im = np.concatenate(rij[:-1], 1)
    bg = np.full(im.shape[:2] + (3,), achtergrond, float)
    a = im[..., 3:] / 255
    o = Image.fromarray((im[..., :3] * a + bg * (1 - a)).astype(np.uint8))
    return o.resize((o.width * schaal, o.height * schaal), Image.NEAREST)


def main():
    DEBUG.mkdir(parents=True, exist_ok=True)
    for sub in ('zones/bron', 'zones/native', 'outfits/bron', 'outfits/native', 'outfits/referentie',
                'catalogus/bron', 'catalogus/native', 'items/bron', 'items/native', 'accessoires'):
        (UIT / sub).mkdir(parents=True, exist_ok=True)
    manifest = json.loads((UIT / 'manifest.json').read_text('utf-8'))
    per_id = {a['id']: a for a in manifest['assets']}
    data = {
        'versie': 1,
        'uitleg': 'Kledingzones, kleurrampen, catalogus en accessoires. Gegenereerd door '
                  'tools/kleding.py; niet met de hand bewerken.',
        'zones': ZONES, 'kleurbaar': KLEURBAAR, 'vergrendeld': ['haar', 'huid'],
        'zone_codering': 'zonekaart-PNG: grijswaarde = zone-index x 30',
        'palet': PALET, 'rampen': RAMPEN,
        'recolor': {'doel_spreiding': DOEL_SPREIDING, 'k_min': K_MIN, 'k_max': K_MAX},
        'characters': {}, 'catalogus': CATALOGUS,
    }
    ankerbeelden, catalogusrijen = [], {'bron': [], 'native': []}
    for fid in ('hidde', 'tessie'):
        geo = geometrie(fid)
        lb = segmenteer_bron(fid, geo['bron'])
        ln = native_zones(geo, lb)
        Image.fromarray(zone_png(lb)).save(UIT / 'zones' / 'bron' / f'{fid}.png')
        Image.fromarray(zone_png(ln)).save(UIT / 'zones' / 'native' / f'{fid}.png')
        ov = overlay(geo['bron'], lb, 3)
        ov.save(DEBUG / f'zones_bron_{fid}.png')
        if '--crops' in sys.argv:
            for i, (y0, y1) in enumerate(((95, 240), (220, 360), (340, 495))):
                ov.crop((0, y0 * 3, ov.width, y1 * 3)).save(DEBUG / f'crop_{fid}_{i}.png')
        overlay(geo['native'], ln, 8).save(DEBUG / f'zones_native_{fid}.png')
        st_b, st_n = zone_stats(geo['bron'], lb), zone_stats(geo['native'], ln)
        data['characters'][fid] = {
            'naam': per_id[fid]['naam'], 'kijkrichting': KIJKRICHTING[fid], 'ankers': ANKERS[fid],
            'native_naar_bron': native_naar_bron(geo),
            'bron': {'canvas': per_id[fid]['afmetingen']['bron'], 'sprite': png_data_url(geo['bron']),
                     'zones': png_data_url(zone_png(lb)), 'stats': st_b,
                     'pixels': {z: int((lb == Z[z]).sum()) for z in ZONES[1:]}},
            'native': {'canvas': per_id[fid]['afmetingen']['native'], 'sprite': png_data_url(geo['native']),
                       'zones': png_data_url(zone_png(ln)), 'stats': st_n,
                       'pixels': {z: int((ln == Z[z]).sum()) for z in ZONES[1:]}},
        }
        # Ankers en voorbeeldaccessoires zichtbaar maken
        a = geo['native'].copy()
        for x, y in ANKERS[fid].values():
            a[y, x] = (255, 0, 255, 255)
        ankerbeelden.append(a)
        for acc in ACCESSOIRES:
            ankerbeelden.append(plaats_accessoire(geo['native'].copy(), acc, fid))
        # Catalogus renderen
        for variant, img, lab, st in (('bron', geo['bron'], lb, st_b), ('native', geo['native'], ln, st_n)):
            rij = [img]
            for o in CATALOGUS:
                r = verkleur(img, lab, st, o[fid])
                Image.fromarray(r).save(UIT / 'catalogus' / variant / f'{o["id"]}-{fid}.png')
                rij.append(r)
            catalogusrijen[variant].append(rij)
        if fid == 'hidde':  # pariteitscontrole voor de JS-versie (kledingkast.html?test)
            data['controle'] = {'character': fid, 'variant': 'native', 'outfit': CATALOGUS[0]['id'],
                                'verwacht': png_data_url(verkleur(geo['native'], ln, st_n, CATALOGUS[0][fid]))}
        for z in ZONES[1:]:
            print(f'{fid:7s} {z:11s} bron {int((lb == Z[z]).sum()):6d}  native {int((ln == Z[z]).sum()):4d}')
    compositie(ankerbeelden, schaal=4).save(DEBUG / 'ankers.png')
    compositie([b[18:62, 10:54] for b in ankerbeelden], schaal=5, tussen=2).save(DEBUG / 'ankers_zoom.png')
    for variant, rijen in catalogusrijen.items():
        beelden = [np.concatenate([np.pad(r, ((0, 0), (0, 4), (0, 0))) for r in rij], 1) for rij in rijen]
        hoog = np.concatenate([np.pad(b, ((0, 6), (0, 0), (0, 0))) for b in beelden], 0)
        compositie([hoog], schaal=1 if variant == 'bron' else 3).save(DEBUG / f'catalogus_{variant}.png')

    blad = blad_rgb()
    figuren, maskers, a = snij_figuren(blad, per_id)
    data['figuurvarianten'] = figuren
    o = a.copy()   # debug: welke bladpixels bij welke figuur horen
    kl = {'hidde_hoodie': (60, 60, 230), 'tessie_hoodie': (230, 60, 60),
          'hidde_avontuur': (60, 200, 60), 'tessie_avontuur': (230, 180, 0)}
    for fid, m in maskers.items():
        o[m] = o[m] * 0.5 + np.array(kl[fid]) * 0.5
    Image.fromarray(o.astype(np.uint8)).resize((o.shape[1] * 2, o.shape[0] * 2), Image.NEAREST).save(
        DEBUG / 'outfits_splitsing.png')
    compositie([np.asarray(Image.open(UIT / f['bestanden']['native'])) for f in figuren]
               + [np.asarray(Image.open(UIT / 'native' / f'{c}.png')) for c in ('hidde', 'tessie')],
               schaal=4).save(DEBUG / 'outfits_native.png')
    data['items'] = snij_items(blad)
    compositie([np.asarray(Image.open(UIT / i['bestanden']['native'])) for i in data['items']],
               schaal=6).save(DEBUG / 'items_native.png')
    compositie([np.asarray(Image.open(UIT / i['bestanden']['bron'])) for i in data['items']],
               schaal=1).save(DEBUG / 'items_bron.png')
    data['accessoires'] = ACCESSOIRES
    for acc in ACCESSOIRES:
        (UIT / 'accessoires' / f'{acc["id"]}.json').write_text(
            json.dumps(acc, indent=2, ensure_ascii=False), 'utf-8')
        Image.fromarray(accessoire_rgba(acc)).save(UIT / 'accessoires' / f'{acc["id"]}.png')
    # kleding.js: alles incl. ingebedde PNG's (werkt via file://, canvas raakt niet 'tainted').
    (UIT / 'kleding.js').write_text(f'window.PQ_KLEDING = {json.dumps(data, ensure_ascii=False)};\n', 'utf-8')
    # kleding.json: leesbaar, met paden in plaats van ingebedde afbeeldingen.
    data.pop('controle')
    for fid, c in data['characters'].items():
        for v in ('bron', 'native'):
            c[v]['sprite'] = f'{v}/{fid}.png'
            c[v]['zones'] = f'zones/{v}/{fid}.png'
    (UIT / 'kleding.json').write_text(json.dumps(data, indent=2, ensure_ascii=False), 'utf-8')
    print('figuurvarianten:', [(f['id'], f['figuur']['native'], f['bronpx_per_artpixel']) for f in figuren])
    print('items:', [(i['id'], i['figuur']['native']) for i in data['items']],
          data['items'][0]['bronpx_per_artpixel'])


if __name__ == '__main__':
    main()
