"""Bovenkleding - NIEUW GETEKEND per lichaam (kast_vorm.Kleed).

Hidde kijkt naar rechts: zijn rug is links, licht van linksboven. Tessie kijkt naar links;
haar krullen vallen over de schouders (de haarlaag komt er later weer overheen), dus haar
schouders hoeven niet af. Mouwen eindigen bij de pols (POLS), de handen blijven van het origineel.
"""
from kast_vorm import Kleed, veelhoek, wis_zones, POLS

# Romp en mouwen per lichaam. 'lang' = verlenging van de zoom (rijen onder de taille).
GEO = {
    'hidde': {
        'romp': [(22, 49), (26, 49), (28, 50), (35, 50), (37, 49), (40, 49), (43, 51), (41, 56),
                 (41, 71), (23, 71), (23, 56), (19, 51)],
        'mouw_l': [(20, 50), (17, 53), (15, 57), (15, 62), (16, 69), (22, 69), (23, 64), (23, 54)],
        'mouw_r': [(41, 50), (44, 53), (46, 57), (46, 62), (45, 69), (40, 69), (40, 55)],
        'taille': 71, 'midden': 32, 'hals': 50, 'romp_x': (23, 41),
        'halslijn': [(23, 50), (26, 50), (28, 51), (35, 51), (37, 50), (40, 50)],
        'plooi_mouw': [[(17, 63), (19, 62)], [(17, 66), (20, 65)], [(42, 63), (44, 62)], [(42, 66), (45, 65)]],
        'plooi_romp': [[(25, 57), (27, 60)], [(39, 57), (37, 60)], [(28, 68), (29, 70)], [(35, 68), (35, 70)]],
    },
    'tessie': {
        'romp': [(20, 57), (23, 57), (25, 58), (29, 58), (31, 57), (35, 57), (38, 59), (36, 64),
                 (36, 70), (22, 70), (22, 64), (18, 59)],
        'mouw_l': [(19, 57), (16, 61), (15, 65), (17, 70), (23, 70), (23, 61)],
        'mouw_r': [(35, 57), (39, 60), (42, 64), (42, 70), (36, 70), (35, 62)],
        'taille': 70, 'midden': 28, 'hals': 58, 'romp_x': (22, 36),
        'halslijn': [(21, 58), (23, 58), (25, 59), (29, 59), (31, 58), (35, 58)],
        'plooi_mouw': [[(17, 66), (19, 65)], [(18, 68), (21, 67)], [(37, 66), (39, 65)], [(37, 68), (40, 67)]],
        'plooi_romp': [[(24, 62), (25, 64)], [(34, 62), (33, 64)], [(27, 68), (27, 69)]],
    },
}


def romp(fid, lang=0, breder=0):
    g = GEO[fid]
    pts = []
    for x, y in g['romp']:
        if y >= g['taille'] - 1:
            y += lang
        if breder and y > g['hals'] + 3:
            x += -breder if x < g['midden'] else breder
        pts.append((x, y))
    return veelhoek(pts)


def mouwen(fid, kort=None, breder=0):
    """Beide mouwen. kort = laatste rij van een korte mouw (anders tot de pols)."""
    g = GEO[fid]
    uit = []
    for k in ('mouw_l', 'mouw_r'):
        pts = []
        for x, y in g[k]:
            if kort is not None and y > kort:
                y = kort
            if breder:
                x += -breder if k == 'mouw_l' and x < g['midden'] else (breder if x > g['midden'] else 0)
            pts.append((x, y))
        uit.append(veelhoek(pts))
    return uit


def basis_top(fid, kleur, lang=0, breder=0, vast=None):
    """Romp + twee lange mouwen, met de originele shirtzone en onderarmen gewist."""
    kl = Kleed(fid, kleur, vast, slot='boven')
    kl.wis = wis_zones(fid, ['shirt'], armen=True)
    kl.stuk(romp(fid, lang, breder))
    ml, mr = mouwen(fid, breder=breder)
    kl.stuk(ml)
    kl.stuk(mr)
    kl.mouw = ml | mr
    return kl


def manchet(kl, fid, rijen=1, rib=False):
    p = POLS[fid]
    for y in range(p - rijen + 1, p + 1):
        for x in range(64):
            if kl.mouw[y, x] and kl.t[y, x] not in ('o', 'L'):
                kl.t[y, x] = ('a' if x % 2 == 0 else 'b') if rib else 'a'
    for x in range(64):
        if kl.mouw[p - rijen, x] and kl.t[p - rijen, x] not in ('o', 'L'):
            kl.t[p - rijen, x] = 'c'


def plooien(kl, fid, romp=True, mouw=True):
    g = GEO[fid]
    for pl in (g['plooi_mouw'] if mouw else []) + (g['plooi_romp'] if romp else []):
        kl.lijn(pl, 'a', licht='c')


def halsboord(kl, fid, rijen=1):
    """Ronde hals: lichte boord langs de halslijn, schaduwrij eronder."""
    pts = GEO[fid]['halslijn']
    kl.lijn(pts, 'c')
    if rijen > 1:
        kl.lijn([(x, y + 1) for x, y in pts], 'b')
    kl.lijn([(x, y + rijen) for x, y in pts], 'a')


def zoom_rib(kl, fid, lang, rijen=2):
    y1 = GEO[fid]['taille'] + lang - 1
    kl.rib(y1 - rijen + 1, y1)
    kl.rij(y1 - rijen, 'a')


def longsleeve(fid):
    kl = basis_top(fid, 'creme', lang=1)
    manchet(kl, fid, 1)
    halsboord(kl, fid)
    plooien(kl, fid)
    kl.rij(GEO[fid]['taille'], 'a')
    return kl.laag()



def trui(fid):
    """Gebreide trui: iets ruimer, ribboord aan hals, pols en zoom, kabel over de borst."""
    kl = basis_top(fid, 'koffie', lang=3, breder=1)
    g = GEO[fid]
    manchet(kl, fid, 2, rib=True)
    halsboord(kl, fid, rijen=2)
    zoom_rib(kl, fid, 3, rijen=3)
    plooien(kl, fid, romp=False)
    mx, h = g['midden'], g['hals']
    for kx in (mx - 4, mx + 3):                      # twee kabels
        for y in range(h + 3, g['taille'] - 1):
            kl.zet(kx + (1 if (y // 2) % 2 else 0), y, 'a')
            kl.zet(kx + (0 if (y // 2) % 2 else 1), y, 'c')
    return kl.laag()


HART = ['.r.r.', 'rrrrr', '.rrr.', '..r..']


def capuchon(kl, fid):
    """Capuchon plat in de nek: een dikke opgerolde kraag, aan de rugkant hoger."""
    if fid == 'hidde':      # rug links
        kl.stuk(veelhoek([(19, 47), (24, 45), (27, 47), (29, 50), (36, 51), (38, 49), (41, 49),
                          (42, 52), (37, 54), (28, 54), (22, 53), (18, 51)]), naad='o', schaduw=1)
        kl.lijn([(23, 50), (27, 52), (36, 52), (40, 51)], 'a', licht='c')
        kl.lijn([(21, 48), (24, 47)], 'c')
    else:                   # rug rechts, valt onder de krullen
        kl.stuk(veelhoek([(19, 57), (22, 56), (25, 58), (29, 58), (32, 56), (37, 55), (39, 58),
                          (34, 61), (24, 61), (19, 59)]), naad='o', schaduw=1)
        kl.lijn([(21, 58), (24, 60), (31, 60), (36, 58)], 'a', licht='c')


def koorden(kl, fid):
    g = GEO[fid]
    mx, y0 = g['midden'], g['hals'] + (4 if fid == 'hidde' else 3)
    for kx in (mx - 2, mx + 2):
        for y in range(y0, y0 + 4):
            kl.zet(kx, y, 'h')
        kl.zet(kx, y0 + 4, 'k')


def buidelzak(kl, fid, lang):
    g = GEO[fid]
    mx, yb = g['midden'], g['taille'] + lang - 3
    b = 6 if fid == 'hidde' else 5
    yt = yb - (5 if fid == 'hidde' else 4)
    kl.lijn([(mx - b, yb), (mx - b + 2, yt), (mx + b - 2, yt), (mx + b, yb)], 'a', licht='c')
    kl.lijn([(mx - b + 2, yt + 1), (mx + b - 2, yt + 1)], 'c')


def hoodie_basic(fid):
    """Hoodie zoals op het characterblad: capuchon in de nek, koordjes, buidelzak, hartje."""
    kl = basis_top(fid, 'nacht', lang=5, breder=1, vast={'r': 'koraal', 'k': 'creme'})
    manchet(kl, fid, 2, rib=True)
    zoom_rib(kl, fid, 5, rijen=2)
    plooien(kl, fid, romp=False)
    buidelzak(kl, fid, 5)
    capuchon(kl, fid)
    koorden(kl, fid)
    g = GEO[fid]
    kl.pixels(HART, g['midden'] + (1 if fid == 'hidde' else -6), g['hals'] + (6 if fid == 'hidde' else 5))
    return kl.laag()


def overhemd(fid):
    """Overhemd: puntkraag, knoopsluiting, borstzakje, manchetten met knoopje."""
    kl = basis_top(fid, 'creme', lang=2, vast={'k': '#e9e4d8'})
    g = GEO[fid]
    mx, h = g['midden'], g['hals']
    manchet(kl, fid, 2)
    kl.rij(g['taille'] + 1, 'a')
    for y in range(h + 1, g['taille'] + 2):          # knoopsluiting
        kl.zet(mx, y, 'a')
        kl.zet(mx + 1, y, 'c')
        if (y - h) % 4 == 2:
            kl.zet(mx + 1, y, 'k')
    if fid == 'hidde':
        kl.pixels(['hhc.....chh', '.hhc...chh.', '..hc...ch..'], mx - 5, h - 1, alleen_op=False)
        kl.pixels(['aaaa', 'cbba', 'cbba', 'aaaa'], mx - 7, h + 6)
    else:
        kl.pixels(['hhc....chh', '.hc...ch.', '..c...c..'], mx - 5, h - 1, alleen_op=False)
        kl.pixels(['aaa', 'cba', 'aaa'], mx + 3, h + 4)
    plooien(kl, fid)
    return kl.laag()



# --- alleen Tessie ---
def crop_top(fid):
    """Kort topje tot boven de navel; de buik is nieuw getekend in Tessies huidtinten."""
    if fid != 'tessie':
        raise KeyError(fid)
    kl = Kleed(fid, 'creme', slot='boven')
    kl.wis = wis_zones(fid, ['shirt'])
    kl.stuk(veelhoek([(20, 57), (23, 57), (25, 58), (29, 58), (31, 57), (35, 57), (38, 59), (36, 63),
                      (36, 65), (22, 65), (22, 63), (18, 59)]))
    kl.rib(64, 65, stap=2)
    kl.rij(63, 'a')
    halsboord(kl, fid)
    kl.lijn([(24, 61), (25, 62)], 'a', licht='c')
    kl.lijn([(34, 61), (33, 62)], 'a', licht='c')
    # buik: zelfde omtrek als het origineel (romp x 22..35 tot de broekband)
    kl.huid_stuk(veelhoek([(22, 64), (36, 64), (36, 70), (35, 71), (23, 71), (22, 70)]))
    kl.huid_pixels(['CCBBBBBBBBBBAA', '.CBBBBBBBBBBA.', '..BBBBABBBBA..'], 22, 66)
    kl.huid_pixels(['A'], 29, 68)               # navel
    return kl.laag()


def blouse(fid):
    """Blouse met pofmouwtjes, ronde kraagjes en knoopjes, ingestopt."""
    if fid != 'tessie':
        raise KeyError(fid)
    kl = Kleed(fid, 'creme', slot='boven')
    kl.wis = wis_zones(fid, ['shirt'])
    kl.stuk(romp(fid, lang=1))
    for pts in ([(19, 57), (15, 60), (14, 64), (16, 67), (22, 67), (23, 60)],
                [(35, 57), (40, 60), (43, 64), (42, 67), (36, 67), (35, 61)]):
        m = veelhoek(pts)
        kl.stuk(m)
        ys, xs = m.nonzero()
        for x in range(xs.min() + 1, xs.max()):      # gerimpelde band onderaan
            kl.zet(x, 66, 'a' if x % 2 else 'c')
    mx, h = 28, 58
    for y in range(h + 2, 71):
        kl.zet(mx, y, 'c')
        if (y - h) % 3 == 0:
            kl.zet(mx, y, 'a')
    kl.stuk(veelhoek([(22, 57), (27, 58), (27, 60), (25, 61), (22, 59)]), naad='o', toon='h', glans=False)
    kl.stuk(veelhoek([(29, 58), (34, 57), (34, 59), (31, 61), (29, 60)]), naad='o', toon='h', glans=False)
    for x0, y0 in ((24, 69), (31, 69)):              # ingestopt: plooitjes bij de band
        kl.lijn([(x0, y0), (x0 + 1, y0 + 1)], 'a', licht='c')
    kl.rij(70, 'a')
    return kl.laag()


def cardigan(fid):
    """Open vest: het shirt van het lichaam blijft zichtbaar in de opening."""
    if fid != 'tessie':
        raise KeyError(fid)
    lang = 5
    open_ = veelhoek([(25, 56), (31, 56), (30, 63), (30, 76), (27, 76), (27, 63)])
    kl = Kleed(fid, 'mos', {'k': 'creme'}, slot='boven')
    kl.wis = wis_zones(fid, ['shirt'], armen=True) & ~open_
    links = romp(fid, lang, breder=1) & ~open_
    kl.stuk(links)
    ml, mr = mouwen(fid, breder=1)
    kl.stuk(ml)
    kl.stuk(mr)
    kl.mouw = ml | mr
    manchet(kl, fid, 2, rib=True)
    zoom_rib(kl, fid, lang, rijen=2)
    for y in range(58, 75):                          # voorbies met knoopjes
        for x in (26, 31):
            if kl.stukken[y, x - 1 if x == 26 else x + 1]:
                kl.zet(x - 1 if x == 26 else x + 1, y, 'c')
        if y % 4 == 1:
            kl.zet(24, y, 'k')
    for x0 in (21, 32):                              # opgestikte zakken
        kl.pixels(['aaaa', 'cbba', 'cbba'], x0, 69)
    plooien(kl, fid, romp=False)
    return kl.laag()


BOVEN = {'longsleeve': longsleeve, 'trui': trui, 'hoodie_basic': hoodie_basic, 'overhemd': overhemd,
         'crop_top': crop_top, 'blouse': blouse, 'cardigan': cardigan}
