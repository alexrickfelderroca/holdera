/* Design-system guard rails, run over the real files rather than by eye:
     1. every custom property defined in a :root block is actually referenced
     2. every var(--x) referenced is actually defined
     3. no colour literal (hex / rgb() / rgba() / hsl()) appears outside a
        :root block — the house rule is that colour lives only in tokens

   node _build/check-tokens.js        exits 1 if anything is wrong

   Since step 5 the site is several pages and three stylesheets: styles.css
   (site tokens), pages.css (inner pages, --pg-* tokens) and panel.css (the
   demo panel, --pn-* tokens). Each may carry its own :root block; a token
   defined in any of them counts as defined for all, and every *.html at the
   project root is scanned for inline colour. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const exists = f => fs.existsSync(path.join(root, f));

/* Comments are stripped first. A hex quoted in a comment ("#f08a24 measures
   7.58:1 on ink") is documentation, not a colour literal, and flagging it is
   the same false-positive failure mode that made the first contrast.js
   untrustworthy — a guard that cries wolf stops being read. */
const CSS_FILES = ['styles.css', 'pages.css', 'panel.css'].filter(exists);
const HTML_FILES = fs.readdirSync(root).filter(f => /\.html$/i.test(f) && !/\.bak$/i.test(f));
/* Every script that can touch a token. Miss one and rule 1 turns into a liar:
   fish.js reads --fish-core and writes --persp, so leaving it out reported four
   perfectly-used tokens as orphans and four runtime properties as undefined. */
const JS_FILES = ['brain.js', 'fish.js', 'planet.js', 'script.js', 'waves.js', 'panel.js', 'panel-data.js'].filter(exists);

const stripCss = s => s.replace(/\/\*[\s\S]*?\*\//g, '');
const stripHtml = s => s.replace(/<!--[\s\S]*?-->/g, '');

const cssBy = {};
CSS_FILES.forEach(f => { cssBy[f] = stripCss(fs.readFileSync(path.join(root, f), 'utf8')); });
const htmlBy = {};
HTML_FILES.forEach(f => { htmlBy[f] = stripHtml(fs.readFileSync(path.join(root, f), 'utf8')); });
const js = JS_FILES.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');

/* Split every stylesheet into its :root block(s) and the rest. A file may
   declare :root more than once (panel.css keeps semantic tokens apart from
   surface tokens); all of them are token blocks. */
const rootBlocks = [];
const restBy = {};
for (const [f, css] of Object.entries(cssBy)) {
  let rest = '';
  let i = 0;
  const re = /:root\s*\{/g;
  let m;
  while ((m = re.exec(css))) {
    const end = css.indexOf('\n}', m.index);
    if (end < 0) break;
    rootBlocks.push(css.slice(m.index, end));
    rest += css.slice(i, m.index);
    i = end + 2;
    re.lastIndex = i;
  }
  rest += css.slice(i);
  restBy[f] = rest;
}
const rootBlock = rootBlocks.join('\n');
const rest = Object.values(restBy).join('\n');
const html = Object.values(htmlBy).join('\n');

/* Unreferenced but kept on purpose. --accent-hover is a documented brand token
   in CLAUDE.md and was already unreferenced before the light-sheet re-theme, so
   removing it would contradict the project's own brand notes. */
const ALLOW_UNUSED = new Set(['--accent-hover']);

const defined = new Set();
for (const m of rootBlock.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)) defined.add(m[1]);

/* Locally scoped custom properties — set on a selector or an inline style
   rather than in :root (--i, --d, --brand, --bar-h in a media query). They are
   legitimately "defined" even though they never appear in :root. */
const local = new Set();
for (const m of rest.matchAll(/(--[a-z0-9-]+)\s*:/gi)) local.add(m[1]);
for (const m of html.matchAll(/style="[^"]*?(--[a-z0-9-]+)\s*:/gi)) local.add(m[1]);

const used = new Set();
for (const src of [rest, rootBlock, html, js]) {
  for (const m of src.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) used.add(m[1]);
}
for (const m of html.matchAll(/style="[^"]*?(--[a-z0-9-]+)\s*:/gi)) used.add(m[1]);

/* A token can be consumed by JavaScript without any var() ever appearing.
   getPropertyValue('--brain-crown') is how the WebGL modules read brand colour
   out of :root — the whole reason those colours live in the stylesheet — and
   the var()-only scan reported every one of them as "defined but never used".
   That is the guard crying wolf about the correct pattern, so it is taught the
   pattern instead.

   Matching on getPropertyValue( directly is not enough: the modules wrap it
   (cssRGB('--brain-crown', '…')), so the call site holds the helper's name, not
   the DOM API's. Any token-shaped STRING LITERAL in the scripts counts instead —
   a '--foo' in JS source is a token reference by definition. */
for (const m of js.matchAll(/['"`](--[a-z0-9-]+)['"`]/gi)) used.add(m[1]);
/* And the mirror: setProperty('--persp', …) DEFINES a property at runtime.
   These are not in :root and never can be — their values are computed from the
   viewport — so without this they are reported as "used but never defined". */
for (const m of js.matchAll(/setProperty\(\s*['"`](--[a-z0-9-]+)/gi)) local.add(m[1]);
/* Tokens can also be written from JS via a template of the form `--x: …` inside
   a style string (the panel writes chart colours that way). */
for (const m of js.matchAll(/['"`][^'"`]*?(--[a-z0-9-]+)\s*:/gi)) local.add(m[1]);

/* A script may BUILD a token name from a prefix ('--pn-s' + i for the five
   chart series). The literal '--pn-s' is then a reference to the family, not
   an undefined token: a used literal that is a strict prefix of a defined
   token, followed there by a digit, is accepted as that family. */
const isFamilyPrefix = t => [...defined].some(d => d.startsWith(t) && /^\d/.test(d.slice(t.length)));
const unused = [...defined].filter(t => !used.has(t) && !ALLOW_UNUSED.has(t) && ![...used].some(u => u !== t && t.startsWith(u) && /^\d/.test(t.slice(u.length)))).sort();
const undef = [...used].filter(t => !defined.has(t) && !local.has(t) && !isFamilyPrefix(t)).sort();

// colour literals outside :root. Ignore data-URIs (SVG filters / inline SVG art)
const literals = [];
const COLOUR = /(#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\()/i;
for (const [f, r] of Object.entries(restBy)) {
  r.split('\n').forEach(line => {
    if (/data:image\/svg\+xml/.test(line) || /url\(["']?data:/.test(line)) return;
    if (COLOUR.test(line)) literals.push(f + ': ' + line.trim().slice(0, 120));
  });
}

// the same check for every html page, where an inline style could hide one
const htmlLiterals = [];
for (const [f, h] of Object.entries(htmlBy)) {
  h.split('\n').forEach((line, i) => {
    if (/application\/ld\+json/.test(line)) return;
    if (!/style="|stop-color|fill="|stroke="/.test(line)) return;
    if (/data:image\/svg\+xml/.test(line)) return;
    if (/(#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\()/i.test(line)) htmlLiterals.push(f + ':' + (i + 1) + ': ' + line.trim().slice(0, 120));
  });
}

let bad = 0;
const report = (title, items) => {
  if (!items.length) { console.log(`OK   ${title}: none`); return; }
  bad += items.length;
  console.log(`FAIL ${title}: ${items.length}`);
  items.forEach(i => console.log('       ' + i));
};

console.log('css: ' + CSS_FILES.join(', ') + ' · html: ' + HTML_FILES.join(', ') + ' · js: ' + JS_FILES.join(', '));
report('tokens defined but never used', unused);
report('tokens used but never defined', undef);
report('colour literals in css outside :root', literals);
report('colour literals in html', htmlLiterals);

console.log(`\n${defined.size} tokens defined, ${used.size} referenced`);
process.exit(bad ? 1 : 0);
