# Long Branch Farms — Session Kickoff Prompt (Codex)

You are picking up an in-progress marketing website build for a small Kentucky
farm. Read this whole brief before touching files. Everything below reflects the
actual state of `twinlakeswebco/longbranch-farms` as of 2026-09-03.

## 1. Client and project

Long Branch Farms is a family farm in Grayson County, Kentucky (120 Long Branch
Drive, Leitchfield, KY 42754), established 2022, two employees, serving Western
Central Kentucky. Contact is Courtney Decker, longbranchfarmsky@gmail.com,
(270) 230-2339, prefers text. They sell pasture-raised pork and grass-finished
beef plus farm eggs, and plan to add chicken later. Facebook is live; Instagram
is not. They are a Kentucky Proud member. The requirements of record are in
`Website Project Intake Form - Courtney Decker.pdf` at the repo root, an emailed
Jotform submission; treat it as the source of truth for product names, prices,
copy claims, and goals.

Stated website goals are selling products, building credibility, and providing
information to existing customers. Third-party tooling budget is $30 to $100 per
month, which is the constraint that decides the commerce approach. The intake
listed a target launch of 2026-07-31, which has already passed, so treat launch
as overdue rather than distant. The registered domain is
www.longbranch-farms.com; it is not wired to anything in this repo yet. The
client also asked whether packaged-meat photos with labels can be added later,
so image swaps should stay easy.

## 2. Current state of the code

This is a hand-written static site with no build step, no package manager, no
dependencies, no tests, and no CI. Three tracked source files sit at the repo
root: `index.html` (454 lines), `about.html` (218 lines), and `styles.css` (821
lines), plus an `images/` directory with a logo, a transparent logo, and 27
photos. Fonts come from Google Fonts (Playfair Display for display serif, Jost
for sans). All JavaScript is inline at the bottom of each HTML file: current
year in the footer, a scroll-triggered `.scrolled` class on the fixed header, an
IntersectionObserver that adds `.in` to `.reveal` elements, a hero background
zoom on load, and a click-driven product tab switcher on the home page.

`styles.css` is one flat, indented stylesheet that reads like an extracted
`<style>` block. It defines the design tokens on `:root`: colors `--soil`
#1a1208, `--bark` #2e2010, `--moss` #3b4a2f, `--moss-lt` #5a7048, `--hay`
#c4a45a, `--hay-lt` #dfc07a, `--cream` #f5f0e8, `--cream-dk` #ede5d5, `--white`
#fdfaf4; fonts `--serif` and `--sans`; motion `--ease` and `--dur`; layout
`--max-w` 1200px and `--side` a clamped side gutter. Two breakpoints exist, 960px
and 660px. Section background images are set in CSS (`.hero-bg` uses
`photo-24-background.jpeg`, `.cta-bg` uses `photo-6.jpeg`), while `about.html`
overrides both with inline `style` background-image and adds a page-scoped
`<style>` block for `#about-hero`, `#about-body`, `.about-copy`, and
`#about-gallery`.

`index.html` runs header, hero, trust badge row, story section with four
pillars, a four-photo strip, the products section with Beef / Pork / Bundles &
Bulk tabs, a feature photo grid, the promise section with an eight-item list, a
pull-quote band attributed to Courtney Decker, a closing CTA, and the footer.
`about.html` reuses the same header, hero pattern, feature grid, photo strip,
CTA, and footer around a centered long-form story section. Header, footer, and
the inline scripts are duplicated verbatim across both pages, so any nav or
footer change has to be made twice today.

Product data is hard-coded as HTML cards. Beef: Ribeye $22/lb, T-Bone $18/lb,
Ground Beef $8.50/lb, Bulk Beef starting at $4/lb. Pork: Bacon $8/lb, Boston
Butt $8.50/lb, Pork Chops $8.50/lb, Breakfast Sausage $6/lb, Ribs $8/lb, Ham
Steak $8/lb, Shoulder Steak $8/lb, Tenderloin $9/lb, Lard $3/lb. Bundles: Bulk
Pork $4/lb, Pork Bundle Box $80, Breakfast Bundle Box $35, Eggs $3/dozen. These
match the intake form. Bulk pricing includes the processing fee, and the Pork
Bundle Box includes delivery.

Git state: `main` and `claude/longbranch-farms-kickoff-1rzulk` currently point at
the same commit, `fca7c38`. History is seven commits of bulk uploads with no
meaningful messages. There are no open or closed pull requests and no issues.

## 3. Known gaps and defects

`contact.html` does not exist, yet it is linked from the header nav, the CTA
buttons, and the footer on both pages. Every visitor who clicks Contact gets a
404. This is the single most visible break.

The site has no commerce. "Sell Products" is a stated goal, but every Shop,
Order Now, Shop Now, and See All Cuts control is an anchor to `#products` on the
same page, so "See All Cuts" scrolls to the section it already sits in. There is
no cart, no checkout, no inventory, and no order form. The copy under the
products section promises "Inventory updates in real time" and invites visitors
to "Sign up to be notified when new inventory drops", neither of which exists;
either build those or change the copy.

Images are unoptimized originals totaling roughly 97 MB, with individual JPEGs
between 0.9 MB and 7.5 MB and the two logo PNGs at 1.36 MB and 0.57 MB. The hero
background alone is a full-size JPEG loaded via CSS. This will dominate load time
on the rural mobile connections this audience actually uses, and it needs
resizing, compression, WebP or AVIF derivatives, and responsive `srcset` before
launch.

Below 660px the nav links are hidden by `nav a:not(.nav-cta) { display: none; }`
with no hamburger or drawer replacing them, so mobile visitors can reach only the
Order Now button. Mobile navigation has to be built.

Other loose ends: the Instagram social link and the Privacy and Terms footer
links are `#` placeholders; `logo.png` appears unused next to
`LBF-logo-transparent.png`; there is no favicon, no Open Graph or Twitter card
metadata, no `robots.txt`, no `sitemap.xml`, and no LocalBusiness structured
data; there is no analytics; many photo `alt` attributes are generic ("Farm
photo"); nothing honors `prefers-reduced-motion` despite the reveal animations;
and there is no deployment configuration of any kind, no Pages workflow, no
CNAME, no host settings.

## 4. Remaining work, in the order it should be done

Build `contact.html` first, matching the existing header, footer, and visual
language, with the farm's address, email, phone, Facebook link, and a working
form. A form service inside the client's stated budget is the right call here
since there is no backend; pick one and document the choice. That single page
closes the 404 on every page of the site.

Second, decide and implement the selling mechanism, then reconcile the products
copy with whatever ships. The realistic options are a hosted checkout such as
Stripe Payment Links or a lightweight store embed, or an order-request form that
the farm fulfills manually by text, which matches how they already operate. This
is the decision that most needs the client's input; surface it rather than
assuming.

Third, add mobile navigation, then optimize the image pipeline, then add the SEO
and metadata layer including favicon, social cards, sitemap, robots, and
LocalBusiness JSON-LD with the Leitchfield address. Then clean up the
placeholders: real or removed Instagram, real or removed Privacy and Terms,
descriptive alt text, and a reduced-motion guard on the reveal animations.
Finally, set up deployment to www.longbranch-farms.com and confirm the domain
points at it.

Keep chicken in mind as a future product category, and keep the product card
markup easy to extend for the labeled meat photos the client wants to add later.

## 5. How to work in this repo

Preserve the existing architecture unless there is a stated reason to change it.
This is a static site by design and it does not need a framework. If you
introduce any tooling, justify it against the fact that the client has no
developer on staff. Reuse the CSS custom properties rather than introducing new
hard-coded colors, and follow the existing class naming, which is flat and
kebab-case with section-scoped prefixes such as `fg-item`, `product-card`,
`promise-list`. New pages should reuse `styles.css` and add page-scoped styles in
a `<style>` block only when the rule genuinely belongs to that page, which is the
pattern `about.html` already establishes.

Because the header, footer, and inline scripts are duplicated, changing shared
chrome means editing every page. If you add a third page, consider whether
extracting shared markup is worth it before the duplication becomes three-way.

Do all work on the branch `claude/longbranch-farms-kickoff-1rzulk`, commit with
descriptive messages, and push there. Do not push to `main`. Do not open a pull
request unless asked.
