"""Meet het pixelraster (periode + fase) van een uitsnede via gradiëntprofiel-autocorrelatie."""
import sys
import numpy as np
from PIL import Image

def profiel(a, as_):
    g = np.abs(np.diff(a.astype(float), axis=as_)).sum(axis=2)
    return g.sum(axis=1 - as_)

def periode(p, lo=3, hi=14):
    p = p - p.mean()
    ac = np.correlate(p, p, 'full')[len(p) - 1:]
    ac /= ac[0]
    return {k: round(float(ac[k]), 3) for k in range(lo, hi)}

def fase_score(p, per):
    # Voor niet-gehele periode: score per fase over een fijn raster
    best = []
    for ph in np.arange(0, per, 0.25):
        idx = np.round(np.arange(ph, len(p) - 1, per)).astype(int)
        best.append((p[idx].sum() / len(idx), ph))
    best.sort(reverse=True)
    return best[:3]

if __name__ == '__main__':
    f, x0, y0, x1, y1 = sys.argv[1], *map(int, sys.argv[2:6])
    a = np.asarray(Image.open(f).convert('RGB'))[y0:y1, x0:x1]
    for as_, naam in ((1, 'x'), (0, 'y')):
        p = profiel(a, as_)
        print(naam, periode(p))
