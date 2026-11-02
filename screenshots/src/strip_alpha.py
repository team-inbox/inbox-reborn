"""Write a 24-bit RGB PNG: drop any alpha channel, replace the window's 1px
border columns on both sides, fill the rounded bottom corners, and (with
BOTTOM_ROWS=n) refill the last n rows from the row above them."""
import os, sys, struct, zlib
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from png import load
w, h, bpp, rows = load(sys.argv[1])
rows = [bytearray(b for i, b in enumerate(r) if i % 4 != 3) if bpp == 4 else bytearray(r) for r in rows]
px = lambda r, x: r[x * 3:x * 3 + 3]
def put(r, x, v): r[x * 3:x * 3 + 3] = v
for r in rows:  # window border columns
    for x in (0, 1): put(r, x, px(r, 2))
    for x in (w - 1, w - 2): put(r, x, px(r, w - 3))
for y in range(h - 30, h):  # rounded bottom corners
    r = rows[y]
    for x in range(4): put(r, x, px(r, 4)); put(r, w - 1 - x, px(r, w - 5))
n = int(os.environ.get('BOTTOM_ROWS', '0'))  # deeper corner fill, corners only
C = 20
for y in range(h - n, h):
    r = rows[y]
    for x in range(C): put(r, x, px(r, C)); put(r, w - 1 - x, px(r, w - 1 - C))
raw = b''.join(b'\x00' + bytes(r) for r in rows)
def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xFFFFFFFF)
open(sys.argv[2], 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
