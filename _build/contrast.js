/* WCAG contrast guard for Holdera.
   node _build/contrast.js     exits 1 if anything fails

   It READS styles.css. The list below names WHAT to check — a selector and a
   property for the foreground, and the stack of surfaces behind it — and the
   stylesheet supplies every value. A token swap therefore cannot desync the
   guard, which is exactly how the first version of this file went wrong: it
   hardcoded --accent for .steps__num and kept reporting a failure for weeks
   after the CSS had moved to --accent-ink. A checker that cries wolf about a
   fixed problem is as useless as one that sleeps through a real one.

   If a selector or property named here disappears, the guard ERRORS rather than
   quietly passing — renaming a rule should break the check, not bypass it.

   Alpha colours are composited over their real backdrop stack before measuring,
   never read as literals (see rules/sesiones-en-paralelo.md: measure the
   composite, and remember a border is not the text).

   Known simplification: selectors are matched as written, and @media blocks are
   skipped, so this checks the base cascade only. Anything a media query
   re-colours has to be added here deliberately. */
'use strict';
const fs = require('fs');
const path = require('path');

/* Since step 5 there are three stylesheets. They are parsed as ONE cascade
   (styles.css first, so a later file can override a rule and "last wins"
   still holds), and every :root block feeds the same token table. */
const cssFiles = ['styles.css', 'pages.css', 'panel.css']
  .map(f => path.join(__dirname, '..', f))
  .filter(p => fs.existsSync(p));
const raw = cssFiles.map(p => fs.readFileSync(p, 'utf8')).join('\n');
const css = raw.replace(/\/\*[\s\S]*?\*\//g, '');

/* ---------------------------------------------------------------- parsing */

function splitDecls(body) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of body) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ';' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  const map = new Map();
  for (const d of out) {
    const i = d.indexOf(':');
    if (i === -1) continue;
    const prop = d.slice(0, i).trim();
    if (prop) map.set(prop, d.slice(i + 1).trim());
  }
  return map;
}

// top-level rules only; at-rules with blocks (@media, @keyframes) are skipped
const rules = [];
{
  let i = 0, prelude = '';
  while (i < css.length) {
    const ch = css[i];
    if (ch === '{') {
      let depth = 1, j = i + 1;
      while (j < css.length && depth > 0) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}') depth--;
        j++;
      }
      const p = prelude.trim();
      if (p && !p.startsWith('@')) rules.push({ selectors: p.split(',').map(s => s.trim()), decls: splitDecls(css.slice(i + 1, j - 1)) });
      prelude = '';
      i = j;
      continue;
    }
    if (ch === '}') { prelude = ''; i++; continue; }
    prelude += ch;
    i++;
  }
}

const vars = new Map();
for (const r of rules) {
  if (!r.selectors.includes(':root')) continue;
  for (const [k, v] of r.decls) if (k.startsWith('--')) vars.set(k, v);
}

function resolve(value, depth = 0) {
  if (depth > 12) throw new Error('var() cycle in: ' + value);
  const m = /var\(\s*(--[a-z0-9-]+)\s*(?:,\s*([^()]*))?\)/i.exec(value);
  if (!m) return value;
  const sub = vars.has(m[1]) ? vars.get(m[1]) : (m[2] || '').trim();
  if (!sub) throw new Error('undefined custom property ' + m[1]);
  return resolve(value.slice(0, m.index) + sub + value.slice(m.index + m[0].length), depth + 1);
}

// last declaration wins (source order); throws if the rule or property is gone
function declare(selector, prop) {
  let found = null;
  for (const r of rules) {
    if (!r.selectors.includes(selector)) continue;
    if (r.decls.has(prop)) found = r.decls.get(prop);
  }
  if (found === null) throw new Error(`no "${prop}" on "${selector}" in styles.css — rule renamed or removed?`);
  return resolve(found);
}

function pickColour(value, where) {
  const m = /(#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\))/.exec(value);
  if (!m) throw new Error(`no colour in "${value}" (${where})`);
  return m[1];
}

/* ------------------------------------------------------------- colour maths */

const hex = h => {
  h = h.slice(1);
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
};
const func = s => {
  const p = s.slice(s.indexOf('(') + 1, s.lastIndexOf(')')).split(/[,\s/]+/).filter(Boolean).map(Number);
  return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
};
const parse = s => (s.trim()[0] === '#' ? hex(s.trim()) : func(s.trim()));
const over = (fg, bg) => [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const ratio = (a, b) => { const la = L(a), lb = L(b); const [h, l] = la > lb ? [la, lb] : [lb, la]; return (h + 0.05) / (l + 0.05); };

// a backdrop entry is either ['selector', 'prop'] or {token: '--x'}
const surface = entry => (entry.token
  ? pickColour(resolve('var(' + entry.token + ')'), entry.token)
  : pickColour(declare(entry[0], entry[1]), entry[0] + ' ' + entry[1]));

/* ------------------------------------------------------------- what to check
   need 4.5 = body text (WCAG 1.4.3 AA)
   need 3   = UI boundary or focus indicator (WCAG 1.4.11)                    */

const SHEET = ['main', 'background'];
const STEP = ['main', 'background'];   // .ostep sits straight on the sheet
const FORM = ['.form__shell', 'background'];
const PANEL = ['.drawer__panel', 'background'];
/* The service showcase veil, composited over the light hero. This is the FLOOR,
   not the whole story: a backdrop image also sits on the veil. That image is
   knocked down by filter: brightness(0.38) in CSS, which this file cannot
   evaluate, so the artwork cases are measured for real in the browser by
   reading rendered pixels (rules/sesiones-en-paralelo.md: measure the
   composite, never the declared value). */
const VEIL = [{ token: '--sc-veil' }, { token: '--bg' }];
/* The hero's ground is NOT one colour. It is
   radial-gradient(120% 95% at 50% 32%, --bg-2, --bg 46%, --bg-3 100%) with the
   .hero::after vignette darkening the bottom by --k-06. The service list is
   pinned bottom-left, i.e. the darkest ground the page can produce — and
   checking it against --bg (the MID stop) is how this guard passed a hover
   colour that measures 3.99:1 where the text actually renders. This stack is
   the worst case: the vignette's black over the gradient's outer stop. */
const HERO_LOW = [{ token: '--k-06' }, { token: '--bg-3' }];

const CHECKS = [
  // light content sheet — body copy
  ['sheet lead',            ['.sheet__lead', 'color'],       [SHEET], 4.5],
  ['section tag',           ['.tag', 'color'],               [SHEET], 4.5],
  ['stat caption',          ['.stat span', 'color'],         [SHEET], 4.5],
  ['step body copy',        ['.ostep__desc', 'color'],       [STEP], 4.5],
  ['step number',           ['.ostep__num', 'color'],        [STEP], 4.5],
  // the resting colour of a step title, before the scroll wipe brightens it
  ['step title resting',    ['.ostep__title', 'color'],      [STEP], 3],
  ['step title wiped',      ['.ostep__title::before', 'color'], [STEP], 3],
  ['form label',            ['.form label', 'color'],        [FORM], 4.5],
  ['form legal note',       ['.form__legal', 'color'],       [FORM], 4.5],
  ['field error text',      ['.field__err', 'color'],        [FORM], 4.5],
  ['form error summary',    ['.form__error', 'color'],       [FORM], 4.5],
  ['footer text',           ['.footer', 'color'],            [['.footer', 'background']], 4.5],
  ['footer line',           ['.footer__line', 'color'],      [['.footer', 'background']], 4.5],
  ['footer link',           ['.footer__nav a', 'color'], [['.footer', 'background']], 4.5],
  ['footer placeholder',    ['[data-placeholder]', 'color'], [['.footer', 'background']], 4.5],
  ['footer legal link',     ['.footer__legal a', 'color'],   [['.footer', 'background']], 4.5],
  ['service index link',    ['.svc-index a', 'color'],       [SHEET], 4.5],
  ['service index note',    ['.svc-index a small', 'color'], [SHEET], 4.5],
  ['service index border',  ['.svc-index a', 'border'],      [SHEET], 3],
  // inner pages (pages.css) — the light band, worst ground = --bg-3 corner
  ['page band lead',        ['.phead__lead', 'color'],       [{ token: '--bg-3' }], 4.5],
  ['sector who',            ['.sector__who', 'color'],       [SHEET], 4.5],
  ['sector example',        ['.sector__ex li', 'color'],     [SHEET], 4.5],
  ['tech label',            ['.tech__label', 'color'],       [SHEET], 4.5],
  ['tech copy',             ['.tech__item p', 'color'],      [SHEET], 4.5],
  ['person bio on card',    ['.person p', 'color'],          [['.card__core', 'background']], 4.5],
  ['person role on card',   ['.person__role', 'color'],      [['.card__core', 'background']], 4.5],
  ['placeholder mark',      ['.ph', 'color'],                [['.card__core', 'background']], 4.5],
  ['contact channel key',   ['.channel__k', 'color'],        [SHEET], 4.5],
  ['contact placeholder',   ['.channel a[data-placeholder]', 'color'], [SHEET], 4.5],
  ['contact meta',          ['.contact__meta', 'color'],     [SHEET], 4.5],
  ['legal body',            ['.legal__body p', 'color'],     [SHEET], 4.5],
  ['legal toc link',        ['.legal__toc a', 'color'],      [SHEET], 4.5],
  ['legal date',            ['.legal__date', 'color'],       [SHEET], 4.5],
  ['404 exit note',         ['.exit__t small', 'color'],     [SHEET], 4.5],
  ['ghost numeral stroke',  ['.way__n', '-webkit-text-stroke'], [SHEET], 1],
  // surfaces that stay dark on the light page
  ['drawer link',           ['.mrow__link', 'color'],         [PANEL], 4.5],
  // the marquee band that slides over a menu row on hover: ink on accent
  ['menu marquee text',     ['.mrow__inner span', 'color'],   [['.mrow__band', 'background']], 4.5],
  ['drawer meta',           ['.drawer__meta', 'color'],       [PANEL], 4.5],
  // non-text: boundaries and focus indicators
  ['form field vs panel',   ['.form input', 'border'],        [FORM], 3],
  ['form field vs its fill',['.form input', 'border'],        [['.form input', 'background']], 3],
  ['focus ring on sheet',   ['.sheet :focus-visible', 'outline-color'], [SHEET], 3],
  ['focus ring on drawer',  ['.drawer :focus-visible', 'outline-color'], [PANEL], 3],
  ['text-field focus border', ['.form input:not([type="checkbox"]):focus', 'border-color'], [FORM], 3],
  // the hero: its background is a radial gradient, so the mid stop is named
  // directly. --bg is the value under the star row and the partner strip.
  ['hero star rating',      ['.stars', 'color'],             [{ token: '--bg' }], 3],
  ['partner name',          ['.partners__grid li', 'color'],  [{ token: '--bg' }], 4.5],
  ['hero bar chip',         ['.hero__bar', 'color'],          [{ token: '--bar-a' }], 4.5],
  // the service list, on the DARKEST ground the light hero can produce
  ['services label',        ['.hero__works-label', 'color'],   HERO_LOW, 4.5],
  ['service link',          ['.hero__works-list a', 'color'],  HERO_LOW, 4.5],
  ['service link hover',    ['.hero__works-list a:hover', 'color'], HERO_LOW, 4.5],
  // ...and the same list once the showcase veil is over it
  ['services label on veil', ['.hero.is-showcase .hero__works-label', 'color'], VEIL, 4.5],
  ['service link on veil',   ['.hero.is-showcase .hero__works-list a', 'color'], VEIL, 4.5],
  ['service current on veil',['.hero.is-showcase .hero__works-list a.is-current', 'color'], VEIL, 4.5],
  // the big service title is large text, so 3:1
  ['showcase title on veil', ['.sc__title', 'color'],          VEIL, 3],
  // the fixed bar over the two glasses (paso 6): text on glass on its ground
  ['nav link on light glass',  ['.nav__links > a', 'color'],                     [['.nav.is-scrolled', 'background'], { token: '--bg-3' }], 4.5],
  ['nav clock on light glass', ['.nav__tz-time', 'color'],                       [['.nav.is-scrolled', 'background'], { token: '--bg-3' }], 4.5],
  ['nav link on dark glass',   ['.nav.is-over-sheet .nav__links > a', 'color'],  [['.nav.is-over-sheet', 'background'], { token: '--sh-bg' }], 4.5],
  ['nav clock on dark glass',  ['.nav.is-over-sheet .nav__tz-time', 'color'],    [['.nav.is-over-sheet', 'background'], { token: '--sh-bg' }], 4.5],
  ['nav menu on dark glass',   ['.nav.is-over-sheet .btn--secondary', 'color'],  [['.nav.is-over-sheet', 'background'], { token: '--sh-bg' }], 4.5],
  ['nav menu border on dark glass', ['.nav.is-over-sheet .btn--secondary', 'border-color'], [['.nav.is-over-sheet', 'background'], { token: '--sh-bg' }], 3],
  // the nav keeps working while the hero is dark
  ['nav link on veil',       ['.nav.is-veiled .nav__links > a', 'color'], VEIL, 4.5],
  ['nav active on veil',     ['.nav.is-veiled .nav__links .is-active', 'color'], VEIL, 4.5],
  ['nav clock on veil',      ['.nav.is-veiled .nav__tz-time', 'color'], VEIL, 4.5],
  ['nav menu button on veil',['.nav.is-veiled .btn--secondary', 'color'], VEIL, 4.5],
  ['nav menu border on veil',['.nav.is-veiled .btn--secondary', 'border-color'], VEIL, 3],
  ['focus ring on veil',     ['.hero.is-showcase :focus-visible', 'outline-color'], VEIL, 3],
];

let failed = 0;
console.log('contrast guard — values read from styles.css\n');
for (const [label, fg, stack, need] of CHECKS) {
  let fgc, bg;
  try {
    fgc = parse(pickColour(declare(fg[0], fg[1]), fg[0] + ' ' + fg[1]));
    bg = parse(surface(stack[stack.length - 1]));
    for (let i = stack.length - 2; i >= 0; i--) bg = over(parse(surface(stack[i])), bg);
  } catch (e) {
    console.log(`ERROR  ${label}: ${e.message}`);
    failed++;
    continue;
  }
  const r = ratio(over(fgc, bg), bg);
  const ok = r >= need;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(6)}:1  (need ${need})  ${label}`);
}

/* The bright accent is 2.42:1 on the sheet's cards: it may never carry text or
   an indicator on a light surface. These four are on ink and are correct — do
   not "fix" them to --accent-ink. */
const ACCENT_ON_INK = new Set([
  '.drawer__links a:hover',
  /* The demo panel (panel.css) is a dark app surface throughout — --sh-* only —
     where #f08a24 measures 7.6:1. These four are decorative marks (a sparkline
     dot, review stars, the diagram's packets and core node), never body text. */
  '.viz__spark-dot', '.pn-stars i.is-on', '.pn-packet', '.pn-node--core .pn-node__bg',
  /* Both of these only ever apply under .hero.is-showcase — i.e. once the veil
     has turned the hero dark. They are checked as "service current on veil"
     above, and the guard caught them the moment they were written, which is
     the point of this list existing rather than a blanket exemption. */
  '.hero.is-showcase .hero__works-list a.is-current',
  '.hero.is-showcase .hero__works-list a:hover',
]);
console.log('\nbright --accent used as text/fill outside the on-ink allowlist:');
let strays = 0;
for (const r of rules) {
  for (const prop of ['color', 'fill']) {
    if (!r.decls.has(prop)) continue;
    if (!/var\(\s*--accent\s*\)/.test(r.decls.get(prop))) continue;
    for (const sel of r.selectors) {
      if (ACCENT_ON_INK.has(sel)) continue;
      console.log(`  FAIL  ${sel} { ${prop}: var(--accent) }  — use --accent-ink on light`);
      strays++; failed++;
    }
  }
}
if (!strays) console.log('  none');

/* The Perlin wave field, and why it is checked as an INVARIANT rather than a
   ratio. Every thread of the field crosses behind hero text, so it changes the
   ground that text is measured against. The palest stop of the H1 gradient
   (--text-fade) sits at 3.41:1 on --bg with the 3:1 floor right underneath it,
   so an ink thread would push it under. A WHITE thread lifts the local ground
   instead and every piece of hero text ends up with MORE contrast, not less.
   That is the property worth guarding: not a number, but the direction. Flip
   --wave-line back to ink and this fails. */
console.log('\nPerlin wave field — the thread must LIGHTEN the hero ground:');
{
  const bg = parse(resolve('var(--bg)'));
  const thread = parse(resolve('var(--wave-line)'));
  const woven = over(thread, bg);
  const lifts = L(woven) >= L(bg);
  const fade = parse(resolve('var(--text-fade)'));
  const before = ratio(fade, bg);
  const after = ratio(fade, woven);
  console.log(`  ${lifts ? 'PASS' : 'FAIL'}  --text-fade on plain --bg ${before.toFixed(2)}:1 ` +
              `-> on the woven ground ${after.toFixed(2)}:1`);
  if (!lifts || after < 3) failed++;
}

console.log(`\n${failed ? failed + ' FAILURE(S) — do not ship' : 'all checks pass'}`);
process.exit(failed ? 1 : 0);
