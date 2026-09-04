#!/usr/bin/env node
/*
 * Verifies the head / metadata layer of every page.
 *
 *   npx http-server . -p 8103 -s &
 *   node tools/check-metadata.mjs http://localhost:8103
 *
 * Uses only Node built-ins and a regex head parser: the site has no build step
 * and no dependencies, so this must run on a bare checkout.
 */
const BASE = (process.argv[2] || 'http://localhost:8103').replace(/\/$/, '');
const SITE = 'https://www.longbranch-farms.com';

const PAGES = [
  { path: '/index.html', canonical: SITE + '/', title: 'Long Branch Farms | Grayson County, KY' },
  { path: '/about/', canonical: SITE + '/about/', title: 'About Us | Long Branch Farms' },
  { path: '/contact/', canonical: SITE + '/contact/', title: 'Contact Us | Long Branch Farms' },
  { path: '/privacy/', canonical: SITE + '/privacy/', title: 'Privacy Policy | Long Branch Farms' },
  { path: '/terms/', canonical: SITE + '/terms/', title: 'Terms of Sale | Long Branch Farms' }
];

const REQUIRED_META = [
  ['property', 'og:type'],
  ['property', 'og:site_name'],
  ['property', 'og:locale'],
  ['property', 'og:title'],
  ['property', 'og:description'],
  ['property', 'og:url'],
  ['property', 'og:image'],
  ['property', 'og:image:width'],
  ['property', 'og:image:height'],
  ['property', 'og:image:alt'],
  ['name', 'twitter:card'],
  ['name', 'twitter:title'],
  ['name', 'twitter:description'],
  ['name', 'twitter:image'],
  ['name', 'twitter:image:alt'],
  ['name', 'description'],
  ['name', 'robots'],
  ['name', 'theme-color']
];

const REQUIRED_ICONS = [
  '/favicon.ico',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png',
  '/site.webmanifest'
];

let failures = 0;
const fail = (m) => { failures++; console.log('  FAIL ' + m); };
const pass = (m) => console.log('  ok   ' + m);

function head(html) {
  const m = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return m ? m[1] : '';
}

function attr(tag, name) {
  const m = tag.match(new RegExp(name + '\\s*=\\s*"([^"]*)"', 'i'));
  return m ? m[1] : null;
}

function tags(src, el) {
  return src.match(new RegExp('<' + el + '\\b[^>]*>', 'gi')) || [];
}

function metaContent(h, kind, key) {
  for (const t of tags(h, 'meta')) {
    if ((attr(t, kind) || '').toLowerCase() === key) return attr(t, 'content');
  }
  return null;
}

/* Map an absolute production URL onto the local server so assets can be fetched. */
function local(url) {
  if (url.startsWith(SITE)) return BASE + url.slice(SITE.length);
  if (url.startsWith('/')) return BASE + url;
  return null;
}

async function assetOk(url, label) {
  const target = local(url);
  if (!target) return fail(label + ': not a site-relative URL (' + url + ')');
  let res;
  try {
    res = await fetch(target, { method: 'GET' });
  } catch (e) {
    return fail(label + ': fetch failed for ' + target + ' (' + e.message + ')');
  }
  if (res.status !== 200) return fail(label + ': HTTP ' + res.status + ' for ' + target);
  pass(label + ' -> 200 ' + url);
}

/* ---- JSON-LD ------------------------------------------------------------ */

function ldBlocks(h) {
  const out = [];
  const re = /<script[^>]*type\s*=\s*"application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(h))) out.push(m[1]);
  return out;
}

/* Properties we must never emit: no real data exists behind them. */
const FORBIDDEN = [
  'geo', 'latitude', 'longitude',
  'openingHours', 'openingHoursSpecification',
  'aggregateRating', 'ratingValue', 'reviewCount', 'ratingCount', 'review',
  'priceRange'
];

function walkKeys(node, cb, path) {
  if (Array.isArray(node)) return node.forEach((n, i) => walkKeys(n, cb, path + '[' + i + ']'));
  if (node && typeof node === 'object') {
    for (const k of Object.keys(node)) {
      cb(k, path);
      walkKeys(node[k], cb, path + '.' + k);
    }
  }
}

function countOffers(node) {
  let n = 0;
  const rec = (x) => {
    if (Array.isArray(x)) return x.forEach(rec);
    if (x && typeof x === 'object') {
      if (x['@type'] === 'Offer') n++;
      Object.values(x).forEach(rec);
    }
  };
  rec(node);
  return n;
}

function checkIndexLd(h) {
  const blocks = ldBlocks(h);
  if (blocks.length !== 1) return fail('index.html: expected exactly 1 JSON-LD block, found ' + blocks.length);
  let data;
  try {
    data = JSON.parse(blocks[0]);
  } catch (e) {
    return fail('index.html: JSON-LD is not valid JSON (' + e.message + ')');
  }
  pass('index.html: JSON-LD parses');

  const eq = (got, want, label) =>
    JSON.stringify(got) === JSON.stringify(want)
      ? pass('JSON-LD ' + label)
      : fail('JSON-LD ' + label + ': got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want));

  eq(data['@context'], 'https://schema.org', '@context');
  eq(data['@type'], ['LocalBusiness', 'Farm'], '@type');
  eq(data.name, 'Long Branch Farms', 'name');
  eq(data.telephone, '+1-270-230-2339', 'telephone');
  eq(data.email, 'longbranchfarmsky@gmail.com', 'email');
  eq(data.foundingDate, '2022', 'foundingDate');
  eq(data.numberOfEmployees, { '@type': 'QuantitativeValue', value: 2 }, 'numberOfEmployees');
  eq(data.areaServed, 'Western Central Kentucky', 'areaServed');
  eq(data.url, SITE + '/', 'url');
  eq(data.address, {
    '@type': 'PostalAddress',
    streetAddress: '120 Long Branch Drive',
    addressLocality: 'Leitchfield',
    addressRegion: 'KY',
    postalCode: '42754',
    addressCountry: 'US'
  }, 'address');
  eq(data.sameAs, [
    'https://www.facebook.com/profile.php?id=61573708114780',
    'https://www.kyproud.com/members/long-branch-farms'
  ], 'sameAs');

  // Offer catalog: 3 sub-catalogs, 17 offers, every price positive and USD.
  const cat = data.hasOfferCatalog;
  if (!cat || cat['@type'] !== 'OfferCatalog') return fail('JSON-LD hasOfferCatalog missing');
  const subs = cat.itemListElement || [];
  if (subs.length !== 3) fail('JSON-LD expected 3 sub-catalogs, got ' + subs.length);
  else pass('JSON-LD 3 sub-catalogs (' + subs.map((s) => s.name).join(', ') + ')');

  const offers = countOffers(cat);
  if (offers !== 17) fail('JSON-LD expected 17 offers, got ' + offers);
  else pass('JSON-LD 17 offers');

  let priceProblems = 0;
  const walkOffers = (x) => {
    if (Array.isArray(x)) return x.forEach(walkOffers);
    if (x && typeof x === 'object') {
      if (x['@type'] === 'Offer') {
        if (x.priceCurrency !== 'USD') priceProblems++;
        const ps = x.priceSpecification;
        const amount = ps ? (ps.price !== undefined ? ps.price : ps.minPrice) : x.price;
        if (typeof amount !== 'number' || !(amount > 0)) priceProblems++;
        if (!x.itemOffered || !x.itemOffered.name) priceProblems++;
      }
      Object.values(x).forEach(walkOffers);
    }
  };
  walkOffers(cat);
  if (priceProblems) fail('JSON-LD ' + priceProblems + ' offer(s) with a bad price/currency/product');
  else pass('JSON-LD every offer has a positive USD price and a named product');

  // Nothing fabricated.
  const found = new Set();
  walkKeys(data, (k) => { if (FORBIDDEN.includes(k)) found.add(k); });
  if (found.size) fail('JSON-LD contains fabricated propert(ies): ' + [...found].join(', '));
  else pass('JSON-LD contains no fabricated hours / geo / ratings');

  return data;
}

function checkContactLd(h) {
  const blocks = ldBlocks(h);
  if (blocks.length !== 1) return fail('contact.html: expected 1 JSON-LD block, found ' + blocks.length);
  let data;
  try {
    data = JSON.parse(blocks[0]);
  } catch (e) {
    return fail('contact.html: JSON-LD is not valid JSON (' + e.message + ')');
  }
  if (data['@type'] !== 'ContactPage') fail('contact.html: @type is ' + JSON.stringify(data['@type']));
  else pass('contact.html: ContactPage JSON-LD parses');
  if (data.about && data.about['@id'] === SITE + '/#business') pass('contact.html: links to the business @id');
  else fail('contact.html: about.@id does not point at ' + SITE + '/#business');
  const found = new Set();
  walkKeys(data, (k) => { if (FORBIDDEN.includes(k)) found.add(k); });
  if (found.size) fail('contact.html JSON-LD fabricated propert(ies): ' + [...found].join(', '));
  else pass('contact.html: no fabricated properties');
}

/* ---- main --------------------------------------------------------------- */

const seenAssets = new Set();
const seenTitles = new Set();

for (const page of PAGES) {
  console.log('\n== ' + page.path);
  const res = await fetch(BASE + page.path);
  if (res.status !== 200) { fail('page returned HTTP ' + res.status); continue; }
  const h = head(await res.text());
  if (!h) { fail('no <head> found'); continue; }

  const titleMatch = h.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : null;
  if (title !== page.title) fail('<title> is ' + JSON.stringify(title) + ', want ' + JSON.stringify(page.title));
  else pass('title ' + JSON.stringify(title));
  if (seenTitles.has(title)) fail('<title> is duplicated across pages');
  seenTitles.add(title);
  if (metaContent(h, 'property', 'og:title') !== page.title) fail('og:title != <title>');
  if (metaContent(h, 'name', 'twitter:title') !== page.title) fail('twitter:title != <title>');
  const desc = metaContent(h, 'name', 'description');
  if (metaContent(h, 'property', 'og:description') !== desc) fail('og:description != meta description');
  if (metaContent(h, 'name', 'twitter:description') !== desc) fail('twitter:description != meta description');

  const canon = tags(h, 'link').find((t) => (attr(t, 'rel') || '').toLowerCase() === 'canonical');
  if (!canon) fail('missing <link rel="canonical">');
  else if (attr(canon, 'href') !== page.canonical) fail('canonical is ' + attr(canon, 'href') + ', want ' + page.canonical);
  else pass('canonical ' + page.canonical);

  for (const [kind, key] of REQUIRED_META) {
    const v = metaContent(h, kind, key);
    if (!v || !v.trim()) fail('missing or empty ' + kind + '="' + key + '"');
  }
  pass(REQUIRED_META.length + ' required meta tags present and non-empty');

  if (metaContent(h, 'property', 'og:url') !== page.canonical) fail('og:url != canonical');
  if (metaContent(h, 'property', 'og:type') !== 'website') fail('og:type is not "website"');
  if (metaContent(h, 'name', 'twitter:card') !== 'summary_large_image') fail('twitter:card is not summary_large_image');
  if (metaContent(h, 'property', 'og:image:width') !== '1200' ||
      metaContent(h, 'property', 'og:image:height') !== '630') fail('og:image dimensions are not 1200x630');
  if (!/^index,\s*follow/.test(metaContent(h, 'name', 'robots') || '')) fail('robots meta does not allow indexing');

  const hrefs = tags(h, 'link')
    .filter((t) => /(^|\s)(icon|apple-touch-icon|manifest)(\s|$)/i.test(attr(t, 'rel') || ''))
    .map((t) => attr(t, 'href'));
  for (const need of REQUIRED_ICONS) {
    if (!hrefs.includes(need)) fail('head does not declare ' + need);
  }

  const assets = [...hrefs, metaContent(h, 'property', 'og:image'), metaContent(h, 'name', 'twitter:image')];
  for (const a of assets) {
    if (!a || seenAssets.has(a)) continue;
    seenAssets.add(a);
    await assetOk(a, 'asset');
  }

  if (page.path === '/index.html') checkIndexLd(h);
  if (page.path === '/contact/') checkContactLd(h);
}

// The bare "/" route and the automatic /favicon.ico request browsers make.
console.log('\n== root routes');
await assetOk('/', 'site root');
await assetOk('/favicon.ico', 'implicit favicon');
await assetOk('/android-chrome-192x192.png', 'manifest icon 192');
await assetOk('/android-chrome-512x512.png', 'manifest icon 512');

// site.webmanifest must be valid JSON and its icons must resolve.
const man = await (await fetch(BASE + '/site.webmanifest')).json().catch((e) => {
  fail('site.webmanifest is not valid JSON (' + e.message + ')');
  return null;
});
if (man) {
  pass('site.webmanifest parses');
  for (const i of man.icons || []) await assetOk(i.src, 'manifest icon ' + i.sizes);
}

console.log('\n' + (failures ? failures + ' FAILURE(S)' : 'all metadata checks passed'));
process.exit(failures ? 1 : 0);
