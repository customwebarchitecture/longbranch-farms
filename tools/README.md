# tools/

One-off generators for committed assets. Nothing here runs at page load — the
site is hand-written static HTML with no build step and no `package.json`.

## Brand assets (favicons + social card)

`generate-brand-assets.js` produces, from `images/LBF-logo-transparent.png` and
`images/photo-2.jpeg`:

| Output | Notes |
| --- | --- |
| `favicon.ico` | multi-size, 16 / 32 / 48, PNG payloads in an ICO container |
| `favicon-16x16.png`, `favicon-32x32.png` | standard PNG favicons |
| `apple-touch-icon.png` | 180x180, opaque cream ground (iOS does not honour transparency) |
| `android-chrome-192x192.png`, `android-chrome-512x512.png` | referenced by `site.webmanifest` |
| `images/social-card.jpg` | 1200x630 Open Graph / Twitter card, kept under 300 KB |

Run it from the repo root:

```sh
npm i --no-save sharp
node tools/generate-brand-assets.js
rm -rf node_modules            # node_modules is gitignored; do not commit it
```

Then commit the regenerated files.

### Why the favicon is a monogram

The logo lockup is a fine-line plough engraving above four lines of type. Scaled
to 16 px it turns into grey mush, so the favicon instead sets the brand monogram
"LBF" in the logo's own ink-on-cream colourway (`--soil` on `--cream`, with a
`--hay` rule at the larger sizes). The opaque cream tile stays legible against
both light and dark browser chrome. The 16 and 32 px tiles drop the rule and set
slightly larger type to buy back pixels.

## Metadata check

`check-metadata.mjs` verifies the `<head>` layer of every page: canonical, Open
Graph and Twitter tags present and non-empty, every asset URL referenced in
metadata resolving with HTTP 200, and the `index.html` / `contact/index.html` JSON-LD
parsing and carrying the expected (and only the expected) properties.

```sh
npx http-server . -p 8103 -s &
node tools/check-metadata.mjs http://localhost:8103
```
