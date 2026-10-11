import sys, json
from pathlib import Path
from PIL import Image
R = Path(__file__).resolve().parents[1] / 'assets'
ids = sys.argv[2].split(',')
man = {a['id']: a for a in json.loads((R/'manifest.json').read_text('utf-8'))['assets']}
tegels = []
for i in ids:
    b = Image.open(R/'bron'/f'{i}.png'); n = Image.open(R/'native'/f'{i}.png')
    n = n.resize((n.width*5, n.height*5), Image.NEAREST)
    t = Image.new('RGBA', (b.width+n.width+10, b.height), (60,140,90,255))
    t.alpha_composite(b, (0,0)); t.alpha_composite(n, (b.width+10, 0))
    tegels.append(t)
W = sum(t.width for t in tegels)+10*len(tegels); H = max(t.height for t in tegels)
v = Image.new('RGBA', (W,H), (255,255,255,255)); x=0
for t in tegels: v.alpha_composite(t,(x,0)); x+=t.width+10
v.save(sys.argv[1])
