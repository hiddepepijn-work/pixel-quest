"""Onderkleding - NIEUW GETEKEND per lichaam (kast_vorm.Kleed).

De originele broek (en de outline eromheen) wordt gewist, zodat elk model zijn eigen pijp
heeft: rechte jeans, een joggingbroek met boord, een korte broek of rok met blote benen.
Blote benen zijn nieuw getekend in de huidtinten van dat figuur, binnen de omtrek van de
originele broek en boven de schoenen (de schoenen komen er later overheen).
Hidde staat wijdbeens met zijn tenen naar rechts, Tessie met haar tenen naar links.
"""
import numpy as np

from kast_vorm import Kleed, veelhoek, wis_zones

GEO = {
    'hidde': {
        'taille': 71, 'midden': 32, 'kruis': 84,
        'heup': [(22, 71), (44, 71), (45, 79), (45, 85), (33, 85), (32, 83), (31, 85), (20, 85), (20, 79)],
        'recht': [[(20, 82), (31, 82), (29, 101), (16, 101)], [(33, 82), (45, 82), (46, 101), (34, 101)]],
        'been': [[(22, 84), (30, 84), (29, 89), (26, 93), (25, 101), (18, 101), (18, 95), (20, 89)],
                 [(34, 84), (43, 84), (42, 89), (41, 94), (41, 100), (35, 100), (35, 94), (35, 89)]],
        'knie': [(23, 91), (38, 91)], 'zak': [(23, 73), (41, 73)],
        'zoom': 101,
    },
    'tessie': {
        'taille': 71, 'midden': 29, 'kruis': 83,
        'heup': [(22, 71), (37, 71), (39, 78), (40, 84), (30, 84), (29, 82), (28, 84), (18, 84), (20, 78)],
        'recht': [[(19, 81), (29, 81), (28, 102), (17, 102)], [(30, 81), (40, 81), (41, 102), (31, 102)]],
        'been': [[(20, 83), (28, 83), (27, 89), (26, 94), (26, 102), (21, 102), (20, 95), (20, 89)],
                 [(31, 83), (38, 83), (38, 89), (37, 94), (37, 102), (32, 102), (31, 95), (31, 89)]],
        'knie': [(22, 91), (33, 91)], 'zak': [(23, 73), (35, 73)],
        'zoom': 102,
    },
}


def wis_broek(fid):
    return wis_zones(fid, ['broek', 'accessoire'], behoud=('shirt', 'schoenen', 'huid'), vanaf=70)


def benen(kl, fid, vanaf):
    """Blote benen in de huidtinten van dit figuur, vanaf rij `vanaf` tot de schoenen."""
    g = GEO[fid]
    for pts, (kx, ky) in zip(g['been'], g['knie']):
        m = veelhoek(pts)
        m[:vanaf] = False
        kl.huid_stuk(m)
        kl.huid_pixels(['AA', '.A'], kx + 1, ky)          # knieschijf
        kl.huid_pixels(['C'], kx + 1, ky - 1)


def tailleband(kl, fid, lussen=True):
    g = GEO[fid]
    t = g['taille']
    kl.rij(t + 1, 'c')
    kl.rij(t + 2, 'a')
    if lussen:
        for x in (g['heup'][0][0] + 3, g['midden'] - 4, g['midden'] + 4, g['heup'][1][0] - 3):
            kl.zet(x, t + 1, 'a')
            kl.zet(x, t + 2, 'b')


def gulp(kl, fid, tot=None):
    g = GEO[fid]
    mx, t = g['midden'], g['taille']
    tot = tot or g['kruis'] - 2
    for y in range(t + 3, tot):
        kl.zet(mx + 1, y, 'a')
    kl.zet(mx, tot, 'a')


def broek_basis(fid, kleur, pijpen, vast=None):
    kl = Kleed(fid, kleur, vast, slot='onder')
    kl.wis = wis_broek(fid)
    kl.stuk(veelhoek(GEO[fid]['heup']), schaduw=1)
    for pts in pijpen:
        kl.stuk(veelhoek(pts), naad='a', schaduw=1)
    return kl


def jeans(fid):
    """Rechte jeans: band met lussen, gulp, zakken met klinknagels, lichte knieën, omgeslagen zoom."""
    g = GEO[fid]
    kl = broek_basis(fid, 'petrol', g['recht'], vast={'k': 'goud'})
    tailleband(kl, fid)
    gulp(kl, fid)
    (zl, zy), (zr, _) = g['zak']
    kl.lijn([(zl, zy + 1), (zl + 2, zy + 3), (zl + 4, zy + 4)], 'a', licht='c')
    kl.lijn([(zr, zy + 1), (zr - 2, zy + 3), (zr - 4, zy + 4)], 'a')
    kl.zet(zl + 4, zy + 4, 'k')
    kl.zet(zr - 4, zy + 4, 'k')
    for kx, ky in g['knie']:                              # verwassen knieën
        kl.pixels(['cc', '.c'], kx + 1, ky - 1)
    mx, kr = g['midden'], g['kruis']
    kl.lijn([(mx - 3, kr - 2), (mx - 1, kr - 3)], 'c')       # snorren bij het kruis
    kl.lijn([(mx + 3, kr - 2), (mx + 2, kr - 3)], 'c')
    z = g['zoom']
    kl.rij(z - 1, 'c')
    kl.rij(z - 2, 'a')
    return kl.laag()


def joggingbroek(fid):
    """Joggingbroek: elastische band met koord, ruime pijp die bij de enkel in een boord valt."""
    g = GEO[fid]
    z = g['zoom']
    pijpen = []
    for (a, b, c, d), naar in zip(g['recht'], (1, -1)):
        pijpen.append([a, b, (c[0] - 1, z - 5), (c[0] - 2, z), (d[0] + 2, z), (d[0] + 1, z - 5)])
    kl = broek_basis(fid, 'nacht', pijpen, vast={'k': 'creme'})
    kl.rib(g['taille'] + 1, g['taille'] + 2)
    mx, t = g['midden'], g['taille']
    for x, l in ((mx - 1, 3), (mx + 2, 4)):                # koordje
        for y in range(t + 2, t + 2 + l):
            kl.zet(x, y, 'h')
        kl.zet(x, t + 2 + l, 'k')
    kl.rib(z - 2, z, stap=2)
    kl.rij(z - 3, 'a')
    for pts in g['recht']:                                 # bloes boven het boord
        x0 = pts[3][0] + 2
        kl.lijn([(x0 + 1, z - 5), (x0 + 3, z - 4)], 'a', licht='c')
    kl.lijn([(mx - 4, t + 9), (mx - 2, t + 11)], 'a', licht='c')
    return kl.laag()


def korte_broek(fid):
    """Korte broek tot boven de knie; de benen zijn nieuw getekend in de huidtinten."""
    g = GEO[fid]
    kort = 87 if fid == 'hidde' else 85
    kl = Kleed(fid, 'creme', slot='onder')
    kl.wis = wis_broek(fid)
    benen(kl, fid, kort - 1)
    (x0, _), (x1, _) = g['heup'][0], g['heup'][1]
    mx = g['midden']
    kl.stuk(veelhoek([(x0, 71), (x1, 71), (x1 + 1, 79), (x1 + 1, kort), (mx + 1, kort), (mx, kort - 3),
                      (mx - 1, kort), (x0 - 2, kort), (x0 - 2, 79)]), schaduw=1)
    tailleband(kl, fid)
    gulp(kl, fid, kort - 4)
    kl.rij(kort - 1, 'c')
    (zl, zy), (zr, _) = g['zak']
    kl.lijn([(zl, zy + 1), (zl + 3, zy + 4)], 'a', licht='c')
    kl.lijn([(zr, zy + 1), (zr - 3, zy + 4)], 'a')
    return kl.laag()



# --- alleen Tessie ---
def alleen_tessie(fid):
    if fid != 'tessie':
        raise KeyError(fid)


def rok(fid):
    """A-lijn rok tot net boven de knie, met plooien; blote benen in Tessies huidtinten."""
    alleen_tessie(fid)
    kl = Kleed(fid, 'bordeaux', slot='onder')
    kl.wis = wis_broek(fid)
    benen(kl, fid, 87)
    kl.stuk(veelhoek([(22, 71), (37, 71), (38, 76), (41, 88), (39, 89), (19, 89), (17, 88), (20, 76)]),
            schaduw=1)
    kl.rij(72, 'c')
    kl.rij(73, 'a')
    for xa, xb in ((24, 22), (28, 27), (32, 33), (35, 37)):   # plooien die naar de zoom uitwaaieren
        kl.lijn([(xa, 75), (xb, 88)], 'a', licht='c')
    kl.rij(88, 'a')
    return kl.laag()


def legging(fid):
    """Strakke legging: slanke benen tot de enkel, glans voor op de pijp."""
    alleen_tessie(fid)
    g = GEO[fid]
    kl = Kleed(fid, 'titel', slot='onder')
    kl.wis = wis_broek(fid)
    kl.stuk(veelhoek([(22, 71), (37, 71), (38, 78), (38, 84), (30, 84), (29, 82), (28, 84), (20, 84),
                      (20, 78)]), schaduw=1)
    for pts in g['been']:
        x = [p[0] for p in pts]
        kl.stuk(veelhoek([(p[0] + (-1 if p[0] == min(x) else 0), p[1]) for p in pts]), naad='a')
    kl.rib(71, 72)
    for kx in (22, 33):                                   # glanslijn voor op het been
        kl.lijn([(kx, 85), (kx, 98)], 'c')
        kl.zet(kx, 90, 'h')
        kl.zet(kx, 91, 'h')
    return kl.laag()


def wijde_broek(fid):
    """Wijde broek met hoge band en persplooien, ruimer dan het origineel."""
    alleen_tessie(fid)
    kl = broek_basis(fid, 'creme', [[(18, 81), (29, 81), (28, 103), (13, 103)],
                                    [(30, 81), (41, 81), (44, 103), (30, 103)]], vast={'k': 'koffie'})
    kl.rij(72, 'c')
    kl.rij(73, 'b')
    kl.rij(74, 'a')
    kl.zet(29, 73, 'k')
    gulp(kl, fid)
    for xa, xb in ((24, 21), (35, 37)):                   # persplooi
        kl.lijn([(xa, 76), (xb, 102)], 'a', licht='c')
    kl.rij(102, 'a')
    return kl.laag()


ONDER = {'jeans': jeans, 'joggingbroek': joggingbroek, 'korte_broek': korte_broek,
         'rok': rok, 'legging': legging, 'wijde_broek': wijde_broek}
