"""Tekenhulp voor kastitems op het native canvas (64 x 112, anker 32,108).

Een item is een laag op exact hetzelfde canvas als het lichaam:
  rgba    (112, 64, 4)  de pixels
  masker  (112, 64)     recolor per pixel: 0 = vaste kleur,
                        TOON_CODE (50..250) = tint op de ramp (modus 'toon'),
                        255 = luminantie-recolor (modus 'luminantie', uitgesneden items)
  knip    (112, 64)     bool: haar en haar-outline van het lichaam die hier wegvallen
                        (haarvariant 'onder hoofddeksel', voorlopig als masker)

Pixeltekens in de handgetekende items:
  o a b c h  = outline, donker, basis, licht, glans van de ramp van de itemkleur
               (verkleurbaar: in de kast kies je een andere ramp)
  andere     = vaste kleur uit 'vast' (paletnaam of #hex), niet verkleurbaar
  .          = leeg
"""
import numpy as np

import kleding as K

W, H = 64, 112
TONEN = 'oabch'
TOON_CODE = {t: 50 * (i + 1) for i, t in enumerate(TONEN)}   # o=50 ... h=250
ZI = K.Z


def basis_index(ramp):
    """Positie van de basiskleur in de (op luminantie gesorteerde) ramp."""
    return ramp['stops'].index(ramp['basis']) if ramp['basis'] in ramp['stops'] else 2


def toon_stop(ramp, toon):
    """Ramp-index voor een toon (o/a/b/c/h). Zelfde regel als figuur.js (toonStop)."""
    bi = basis_index(ramp)
    i = {'o': 0, 'a': bi - 1, 'b': bi, 'c': bi + 1, 'h': bi + 2}[toon]
    return int(min(max(i, 0), 4))


def kleur_rgb(naam):
    return K.hex2rgb(K.PALET.get(naam, naam)).astype(np.uint8)


class Laag:
    def __init__(self):
        self.rgba = np.zeros((H, W, 4), np.uint8)
        self.masker = np.zeros((H, W), np.uint8)
        self.knip = np.zeros((H, W), bool)

    def zet(self, x, y, rgb, code=0):
        if 0 <= x < W and 0 <= y < H:
            self.rgba[y, x, :3] = rgb
            self.rgba[y, x, 3] = 255
            self.masker[y, x] = code

    def wis(self, x, y):
        if 0 <= x < W and 0 <= y < H:
            self.rgba[y, x] = 0
            self.masker[y, x] = 0

    def gevuld(self):
        return self.rgba[..., 3] > 0


def teken(laag, pixels, x0, y0, basis, vast=None, spiegel=False):
    """Zet een pixeltekening met linkerbovenhoek (x0, y0). basis = rampnaam."""
    ramp = K.RAMPEN[basis]
    vast = vast or {}
    breed = max(len(r) for r in pixels)
    for dy, rij in enumerate(pixels):
        rij = rij.ljust(breed, '.')
        if spiegel:
            rij = rij[::-1]
        for dx, ch in enumerate(rij):
            if ch == '.' or ch == ' ':
                continue
            if ch in TONEN:
                laag.zet(x0 + dx, y0 + dy, K.hex2rgb(ramp['stops'][toon_stop(ramp, ch)]), TOON_CODE[ch])
            elif ch in vast:
                laag.zet(x0 + dx, y0 + dy, kleur_rgb(vast[ch]), 0)
            elif ch == '_':
                laag.wis(x0 + dx, y0 + dy)
            else:
                raise KeyError(f'onbekend pixelteken {ch!r}')
    return laag


def knip_boven(laag, x0, x1, y_tot, zijmarge=0, y_zij=None):
    """Haar boven het hoofddeksel wegknippen.
    Kolommen x0..x1: alles boven de bovenste itempixel van die kolom.
    Zijmarge: kolommen ernaast tot y_zij (bv. de bovenkant van de rand)."""
    g = laag.gevuld()
    for x in range(max(0, x0 - zijmarge), min(W, x1 + zijmarge + 1)):
        ys = np.nonzero(g[:, x])[0]
        if x0 <= x <= x1 and len(ys):
            laag.knip[:min(ys.min(), y_tot), x] = True
        elif y_zij is not None:
            laag.knip[:y_zij, x] = True
    return laag


def knip_vorm(laag, rijen, x0, y0):
    """Knipmasker met de hand: 'x' = knippen."""
    for dy, rij in enumerate(rijen):
        for dx, ch in enumerate(rij):
            if ch == 'x' and 0 <= x0 + dx < W and 0 <= y0 + dy < H:
                laag.knip[y0 + dy, x0 + dx] = True
    return laag


def buren(m, n=1):
    """Pixels die (8-buren) binnen n stappen van masker m liggen, zonder m zelf."""
    from scipy import ndimage as ndi
    return ndi.binary_dilation(m, np.ones((3, 3), bool), iterations=n) & ~m


def band(laag, punten, basis, dikte=2, outline=True):
    """Gebogen band (haarband, koptelefoonbeugel, riem) langs een polylijn.
    Bovenrand licht, onderrand donker, outline eromheen."""
    from scipy import ndimage as ndi
    ramp = K.RAMPEN[basis]
    m = np.zeros((H, W), bool)
    for (xa, ya), (xb, yb) in zip(punten, punten[1:]):
        n = max(abs(xb - xa), abs(yb - ya), 1)
        for t in np.linspace(0, 1, n * 3 + 1):
            x, y = xa + (xb - xa) * t, ya + (yb - ya) * t
            for dx in range(dikte):
                for dy in range(dikte):
                    xx, yy = int(round(x - (dikte - 1) / 2 + dx)), int(round(y - (dikte - 1) / 2 + dy))
                    if 0 <= xx < W and 0 <= yy < H:
                        m[yy, xx] = True
    if outline:
        rand = ndi.binary_dilation(m, np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], bool)) & ~m
        for y, x in zip(*np.nonzero(rand)):
            if not laag.gevuld()[y, x]:
                laag.zet(x, y, K.hex2rgb(ramp['stops'][toon_stop(ramp, 'o')]), TOON_CODE['o'])
    for y, x in zip(*np.nonzero(m)):
        boven = y == 0 or not m[y - 1, x]
        onder = y == H - 1 or not m[y + 1, x]
        t = 'c' if boven and not onder else ('a' if onder and not boven else 'b')
        laag.zet(x, y, K.hex2rgb(ramp['stops'][toon_stop(ramp, t)]), TOON_CODE[t])
    return m


_LICHAAM = {}


def lichaam(fid):
    """(sprite RGBA, zones) van het goedgekeurde native figuur. Gecachet."""
    if fid not in _LICHAAM:
        from PIL import Image
        sp = np.asarray(Image.open(K.UIT / 'native' / f'{fid}.png').convert('RGBA'))
        z = np.asarray(Image.open(K.UIT / 'zones' / 'native' / f'{fid}.png'))
        z = (z[..., 0] if z.ndim == 3 else z).astype(int)
        _LICHAAM[fid] = (sp, (z + 15) // 30)
    return _LICHAAM[fid]
