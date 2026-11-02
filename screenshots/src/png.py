import sys, zlib, struct
from collections import Counter
def load(p):
    d = open(p, 'rb').read(); pos = 8; idat = b''
    while pos < len(d):
        ln, = struct.unpack('>I', d[pos:pos+4]); t = d[pos+4:pos+8]; body = d[pos+8:pos+8+ln]; pos += 12 + ln
        if t == b'IHDR': w, h, bd, ct = struct.unpack('>IIBB', body[:10])
        elif t == b'IDAT': idat += body
    bpp = {2: 3, 6: 4}[ct]; raw = zlib.decompress(idat); stride = w * bpp; rows = []; prev = bytearray(stride); i = 0
    for y in range(h):
        f = raw[i]; i += 1; cur = bytearray(raw[i:i+stride]); i += stride
        for x in range(stride):
            a = cur[x-bpp] if x >= bpp else 0; b = prev[x]; c = prev[x-bpp] if x >= bpp else 0
            if f == 1: cur[x] = (cur[x] + a) & 255
            elif f == 2: cur[x] = (cur[x] + b) & 255
            elif f == 3: cur[x] = (cur[x] + (a + b) // 2) & 255
            elif f == 4:
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                cur[x] = (cur[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(cur); prev = cur
    return w, h, bpp, rows
def darkest(p, box, n=3):
    w, h, bpp, rows = load(p); x0, y0, x1, y1 = box; cnt = Counter()
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b = rows[y][x*bpp:x*bpp+3]
            if r + g + b < 600: cnt[(r // 4 * 4, g // 4 * 4, b // 4 * 4)] += 1
    return ['#%02x%02x%02x x%d' % (k + (v,)) for k, v in cnt.most_common(n)]
if __name__ == '__main__':
    p = sys.argv[1]; w, h, _, _ = load(p); print('size', w, h)
    for name, box in [('inbox-text', (100, 25, 160, 50)), ('snoozed-bold', (100, 80, 190, 105)), ('done-text', (100, 135, 155, 158)),
                      ('drafts-icon', (30, 215, 70, 245)), ('drafts-text', (100, 218, 160, 242)), ('sent-icon', (30, 270, 70, 298)),
                      ('trash-icon', (35, 378, 65, 408)), ('section-head', (30, 618, 200, 640)), ('hover-bg', (240, 60, 290, 120))]:
        print(name, darkest(p, box))
