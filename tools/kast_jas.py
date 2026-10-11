"""Jassen als overlay - NIEUW GETEKEND, vorm afgeleid van de zonekaart.

Een jas verandert de lichaamsvorm niet: hij ligt over romp en armen. De vorm komt uit
de goedgekeurde figuur (shirtzone + onderarmen + heupen tot de zoom), 1 px opgevuld naar
de achtergrond. De arcering volgt de luminantie van de pixels eronder, zodat de plooien
van het originele shirt blijven. Rits, kraag, zakken en stiksels zijn met de hand gezet.
"""
import numpy as np
from scipy import ndimage as ndi

import kleding as K
from kast_teken import Laag, toon_stop, TOON_CODE, lichaam, kleur_rgb

Z = K.Z
VIER = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], bool)

# Per figuur: armvakken (mouw tot de pols), voorkant-midden (x) en de halslijn (y).
MAAT = {
    'hidde': {'armen': [(14, 58, 25, 67), (38, 58, 47, 67)], 'midden': 32, 'hals': 50,
              'heup_x': (20, 44)},
    'tessie': {'armen': [(15, 62, 23, 69), (33, 62, 42, 69)], 'midden': 28, 'hals': 57,
               'heup_x': (18, 40)},
}


def vorm(fid, zoom_y, opvullen=1):
    """Masker van de jas en de bronzone per pixel."""
    sp, z = lichaam(fid)
    m = MAAT[fid]
    shirt = z == Z['shirt']
    arm = np.zeros_like(shirt)
    for x0, y0, x1, y1 in m['armen']:
        arm[y0:y1, x0:x1] |= z[y0:y1, x0:x1] == Z['huid']
    romp_onder = shirt.nonzero()[0].max()
    heup = np.zeros_like(shirt)
    if zoom_y > romp_onder:
        hx0, hx1 = m['heup_x']
        heup[romp_onder:zoom_y + 1, hx0:hx1] = z[romp_onder:zoom_y + 1, hx0:hx1] == Z['broek']
    kern = shirt | arm | heup
    # hangertje, gesp en ogen-detail binnen de romp horen onder de jas (anders gaten)
    ys, xs = np.nonzero(kern)
    binnen = np.zeros_like(kern)
    binnen[ys.min():ys.max() + 1, xs.min():xs.max() + 1] = True
    kern |= binnen & np.isin(z, [Z['accessoire'], Z['detail']]) & ndi.binary_dilation(kern, VIER, iterations=2)
    lijn = (z == Z['lijn']) & ndi.binary_dilation(kern, VIER)
    lijn[:m['hals'] - 1] = False          # geen gezichts- of haarlijnen
    r = kern | lijn
    leeg = sp[..., 3] == 0
    for _ in range(opvullen):            # jas is iets dikker dan het shirt
        r |= ndi.binary_dilation(r, VIER) & leeg & (np.arange(112)[:, None] >= m['hals'])
    return r, sp, z


def arceer(fid, r, sp, z, pct=(14, 84)):
    """Toonkaart: rand = o, binnen a/b/c op luminantie per bronzone, interne lijnen o."""
    L = ndi.median_filter(K.U.luminantie(sp[..., :3].astype(float)), size=3)
    t = np.full(r.shape, '', object)
    rand = r & ~ndi.binary_erosion(r, VIER)
    for zone in ('shirt', 'huid', 'broek'):
        m = r & (z == Z[zone]) & ~rand
        if not m.any():
            continue
        lo, hi = np.percentile(L[m], list(pct))
        t[m & (L < lo)] = 'a'
        t[m & (L >= lo) & (L <= hi)] = 'b'
        t[m & (L > hi)] = 'c'
    t[r & (t == '')] = 'b'
    t[r & (z == Z['lijn'])] = 'o'
    t[rand] = 'o'
    # licht van linksboven: eerste binnenpixel na de linkerrand iets lichter
    for y in range(t.shape[0]):
        xs = np.nonzero(r[y])[0]
        if len(xs) > 3 and t[y, xs[1]] == 'b':
            t[y, xs[1]] = 'c'
    return t


def naar_laag(t, basis, vast=None):
    lg = Laag()
    ramp = K.RAMPEN[basis]
    for y, x in zip(*np.nonzero(t != '')):
        c = t[y, x]
        if c in TOON_CODE:
            lg.zet(x, y, K.hex2rgb(ramp['stops'][toon_stop(ramp, c)]), TOON_CODE[c])
        else:
            lg.zet(x, y, kleur_rgb(vast[c]), 0)
    lg.slot = 'jas'
    return lg


def zet(t, r, x, y, c):
    if 0 <= y < t.shape[0] and 0 <= x < t.shape[1] and r[y, x]:
        t[y, x] = c


def rits(t, r, fid, y0, y1, knoop=None, stap=3):
    mx = MAAT[fid]['midden']
    for y in range(y0, y1 + 1):
        zet(t, r, mx, y, 'a')
        zet(t, r, mx + 1, y, 'c')
        if knoop and (y - y0) % stap == 1:
            zet(t, r, mx, y, knoop)


def kraag(t, r, fid, rijen=2, extra_boven=0):
    """Kraag/capuchon rond de hals: lichte rijen met een donkere schaduwrij eronder."""
    h = MAAT[fid]['hals']
    for y in range(h - extra_boven, h + rijen):
        for x in np.nonzero(r[y])[0]:
            if t[y, x] != 'o':
                t[y, x] = 'c' if y < h + rijen - 1 else 'b'
    for x in np.nonzero(r[h + rijen])[0]:
        if t[h + rijen, x] != 'o':
            t[h + rijen, x] = 'a'


def zakken(t, r, fid, y, breed=5, knoop=None):
    mx = MAAT[fid]['midden']
    for x0 in (mx - 3 - breed, mx + 3):
        for x in range(x0, x0 + breed):
            zet(t, r, x, y, 'o')
            zet(t, r, x, y + 1, 'a')
        if knoop:
            zet(t, r, x0 + breed // 2, y + 1, knoop)


def zoomrij(t, r, y):
    for x in np.nonzero(r[y])[0]:
        if t[y, x] != 'o':
            t[y, x] = 'a'


def regenjas(fid):
    zoom = {'hidde': 80, 'tessie': 81}[fid]
    r, sp, z = vorm(fid, zoom)
    t = arceer(fid, r, sp, z, pct=(5, 80))     # glanzend: weinig schaduw, meer licht
    kraag(t, r, fid, rijen=2)
    rits(t, r, fid, MAAT[fid]['hals'] + 2, zoom - 1, knoop='h', stap=4)
    zakken(t, r, fid, zoom - 7)
    zoomrij(t, r, zoom - 1)
    return naar_laag(t, 'goud')


def puffer(fid):
    zoom = {'hidde': 74, 'tessie': 75}[fid]
    r, sp, z = vorm(fid, zoom, opvullen=1)
    t = arceer(fid, r, sp, z)
    h = MAAT[fid]['hals']
    for y in range(h + 4, zoom, 4):         # doorgestikte banen
        for x in np.nonzero(r[y])[0]:
            if t[y, x] != 'o':
                t[y, x] = 'a'
                if r[y + 1, x] and t[y + 1, x] != 'o':
                    t[y + 1, x] = 'c'
    kraag(t, r, fid, rijen=2)
    rits(t, r, fid, h + 2, zoom - 1)
    return naar_laag(t, 'petrol')


def spijkerjas(fid):
    zoom = {'hidde': 73, 'tessie': 74}[fid]
    r, sp, z = vorm(fid, zoom, opvullen=0)
    t = arceer(fid, r, sp, z)
    h, mx = MAAT[fid]['hals'], MAAT[fid]['midden']
    for i in range(5):                       # revers
        zet(t, r, mx - 1 - i, h + i, 'c')
        zet(t, r, mx - 2 - i, h + i, 'c')
        zet(t, r, mx + 2 + i, h + i, 'c')
        zet(t, r, mx + 3 + i, h + i, 'c')
    zakken(t, r, fid, h + 7, breed=5, knoop='k')
    rits(t, r, fid, h + 5, zoom - 2, knoop='k', stap=4)
    zoomrij(t, r, zoom - 1)
    zoomrij(t, r, zoom - 2)
    return naar_laag(t, 'petrol', {'k': 'goud'})


def teddyjas(fid):
    zoom = {'hidde': 76, 'tessie': 77}[fid]
    r, sp, z = vorm(fid, zoom, opvullen=1)
    t = arceer(fid, r, sp, z)
    for y, x in zip(*np.nonzero(r)):        # pluizige textuur
        if t[y, x] in ('b', 'c'):
            k = (x * 7 + y * 3) % 6
            t[y, x] = 'c' if k == 0 else ('a' if k == 3 else t[y, x])
    kraag(t, r, fid, rijen=3)
    rits(t, r, fid, MAAT[fid]['hals'] + 3, zoom - 1, knoop='k', stap=5)
    return naar_laag(t, 'creme', {'k': 'koffie'})


JAS = {'regenjas': regenjas, 'puffer': puffer, 'spijkerjas': spijkerjas, 'teddyjas': teddyjas}
