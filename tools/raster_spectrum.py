import sys, numpy as np
from PIL import Image
def prof(a, ax):
    return np.abs(np.diff(a.astype(float), axis=ax)).sum(axis=2).sum(axis=1-ax)
f, x0, y0, x1, y1 = sys.argv[1], *map(int, sys.argv[2:6])
a = np.asarray(Image.open(f).convert('RGB'))[y0:y1, x0:x1]
for ax, n in ((1,'x'),(0,'y')):
    p = prof(a, ax); p = p - p.mean(); t = np.arange(len(p))
    pers = np.arange(3.5, 6.5, 0.01)
    pw = [abs((p*np.exp(-2j*np.pi*t/P)).sum()) for P in pers]
    i = int(np.argmax(pw)); P = pers[i]
    ph = np.angle((p*np.exp(-2j*np.pi*t/P)).sum())
    off = (-ph/(2*np.pi)*P) % P
    print(n, 'periode %.2f' % P, 'grensfase %.2f' % off, 'sterkte %.0f' % pw[i])
