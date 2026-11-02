# Store asset sources

The Chrome Web Store screenshots (`../store/`) and promo tiles (`../marquee.png`, `../small.png`)
are HTML pages rendered with headless Chrome. The screenshots inside them are the manual's
staged captures from `website/static/img/` (made-up names and mail), so nothing has to be
retaken for a copy change: edit the page, run the command below, and re-upload.

```sh
# from this folder; the pages reference the manual's images by name
ln -sf ../../website/static/img/*.png .
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ICC="/System/Library/ColorSync/Profiles/sRGB Profile.icc"
for n in light drag dial options dark; do
  "$CH" --headless=new --disable-gpu --hide-scrollbars --window-size=1280,800 \
    --force-device-scale-factor=2 --virtual-time-budget=4000 \
    --screenshot=raw-$n.png "file://$PWD/s-$n.html"
  sips -z 800 1280 raw-$n.png --out ../store/store-$n.png
  python3 -I strip_alpha.py ../store/store-$n.png ../store/store-$n.png   # 24-bit RGB, no alpha
  sips -m "$ICC" ../store/store-$n.png --out ../store/store-$n.png
done
# marquee.html at 1400x560 and small.html at 440x280 the same way, to ../marquee.png and ../small.png
```

The store takes 1280x800 screenshots and 440x280 / 1400x560 tiles, JPEG or 24-bit PNG without
alpha. `../store/listing.md` is the listing text that goes with them.
