# Making the farm photos web-ready

The photos that come off a phone or camera are huge — five to seven megabytes
each. A visitor on a phone out in the county would have to download all of them
just to read the page, which can take a minute or more and eats their data.

`optimize-images.mjs` fixes that. It takes each photo in `images/` and saves
several smaller copies of it. The website then hands each visitor whichever
copy fits their screen: a small one on a phone, a larger one on a desktop.

Nothing on the site needs this script to run day to day. You only need it when
you **add new photos**.

## Adding new photos

1. Put the new photo in the `images/` folder and name it in the same pattern as
   the others — `photo-28.jpeg`, `photo-29.jpeg`, and so on. It must be a
   `.jpeg` file.
2. Open a terminal in the project folder and run these two commands:

   ```
   npm install --no-save sharp
   node tools/optimize-images.mjs
   ```

3. That's it. The script prints a line per photo showing how much smaller it
   got. It skips any photo it has already handled, so it is safe to run again.
4. Add the photo to a page. Copy an existing `<picture>` block from
   `index.html` and change the photo number, the `width`/`height` numbers, and
   the `alt` description.

The `width` and `height` numbers, and the exact list of files that exist for
each photo, are recorded in `tools/image-manifest.json` every time the script
runs. Look your photo up there rather than guessing — a wrong `width`/`height`
makes the page jump around while it loads.

If the photo is going to be used as a full-page background behind a heading
rather than as a normal picture, add a `.bg-photo-NN` rule to `styles.css`
instead; copy one of the existing ones in the "background photos" section.

`npm install` downloads a helper library called sharp into a `node_modules`
folder. That folder is deliberately not part of the project — it is listed in
`.gitignore` — so don't worry about it.

## What the script produces

For `photo-3.jpeg` it writes:

```
images/photo-3-480.webp    images/photo-3-480.jpeg     small, for phones
images/photo-3-960.webp    images/photo-3-960.jpeg     medium, for tablets
images/photo-3-1440.webp   images/photo-3.jpeg         large, for desktops
images/photo-3-1920.webp   images/photo-3-1920.jpeg    extra large
```

Two things worth knowing:

- **WebP and JPEG.** WebP is a newer picture format that is roughly a third
  smaller at the same quality. Every current browser reads it. The JPEG next to
  it is the backup for anything that doesn't.
- **The large JPEG keeps the plain name** (`photo-3.jpeg`, no number on the
  end). That is on purpose: it means any older link to `images/photo-3.jpeg`
  still works, and it is the safe fallback everywhere.

Tall (portrait) photos stop at the 1440 size. At 1920 pixels wide a tall photo
would hold nearly twice as many pixels as a wide photo at the same width, so
the script budgets by pixels instead of by width and both orientations end up
costing about the same to download.

Every file it writes is kept under 400 KB. If a photo can't get there it says
so on screen rather than shipping it quietly.

## The originals

The script **replaces** each original photo with the web-sized version. The
full-resolution originals are not deleted from the project's history — they are
saved in Git at commit `fca7c38`.

If you ever need an original back:

```
git checkout fca7c38 -- images/photo-3.jpeg
```

That also means you should not run the script twice over the same photo, since
the second run would be shrinking an already-shrunk file. It guards against
this by keeping a record in `tools/image-manifest.json` of everything it has
already done and skipping those. If you genuinely need to redo one — say you
want a different quality setting — restore the original from Git first and
then run:

```
node tools/optimize-images.mjs --force
```

## Settings

Near the top of `optimize-images.mjs` there are a few plainly named settings if
someone technical ever needs to adjust them: the sizes it renders, the quality
level for each format, and the 400 KB ceiling. It automatically lowers the
quality on any photo that would otherwise come out over that ceiling, and for a
few very grainy low-light photos it also softens the camera noise slightly,
which is invisible on screen but saves a lot of file size.
