/* Stage 2 of the brain-hologram round: component-level re-theme.
   Stage 1 (patch-styles.js) only moved tokens; this file re-values the pieces
   that need a real decision rather than a rename:

     - surfaces that stay INK on the light sheet: the terminal, and the two
       "Holdera system" nodes inside the flow/network illustrations (both hold
       a white monogram, so they cannot go light)
     - white alpha layers -> black alpha layers wherever they sit on the sheet
     - accent-as-text and accent-as-focus-border -> --accent-ink (2.42:1 -> 5.19:1)
     - hero bottom bar: four service chips on an even 4-column grid, no dots
     - partner marks: real brand logos, brand colour on hover
     - hero figure: the WebGL brain point cloud + its poster fallback

   Run with `node _build/patch-styles-2.js`; split/join only, never replace(). */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'styles.css');
let css = fs.readFileSync(file, 'utf8');

let count = 0;
function sub(needle, replacement, label) {
  const hits = css.split(needle).length - 1;
  if (hits === 0) throw new Error('NOT FOUND: ' + (label || needle.slice(0, 70)));
  css = css.split(needle).join(replacement);
  count += hits;
}

sub('   Content sheet (dark) — slides over the sticky hero',
    '   Content sheet (light) — slides up over the sticky hero',
    'sheet comment');

/* ------------------------------------------------------- feature cards */

sub(
  '  border-radius: var(--r-xl); background: var(--w-03); border: 1px solid var(--sh-border);\n'
  + '  box-shadow: var(--shadow-dk);',
  '  border-radius: var(--r-xl); background: var(--sh-tint); border: 1px solid var(--sh-border);\n'
  + '  box-shadow: var(--shadow-sh);',
  'feature card'
);
sub(
  '  background: radial-gradient(80% 60% at 50% 40%, var(--sh-surface-2), var(--sh-surface));\n'
  + '  box-shadow: inset 0 1px 1px var(--sh-hi), inset 0 0 0 1px var(--sh-border);',
  '  background: radial-gradient(80% 60% at 50% 40%, var(--sh-surface), var(--sh-surface-3));\n'
  + '  box-shadow: inset 0 1px 1px var(--sh-hi), inset 0 0 0 1px var(--sh-border);',
  'feature visual'
);
sub(
  '.feature__body { padding: clamp(28px, 3.2vw, 44px); background: var(--sh-surface-2); box-shadow: inset 0 1px 1px var(--w-05);',
  '.feature__body { padding: clamp(28px, 3.2vw, 44px); background: var(--sh-surface-2); box-shadow: inset 0 1px 1px var(--sh-hi);',
  'feature body'
);
sub(
  '.feature__num { font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.14em; color: var(--accent); margin-bottom: 16px; }',
  '.feature__num { font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.14em; color: var(--accent-ink); margin-bottom: 16px; }',
  'feature num'
);

/* ------------------------------------------------- illustrations (viz) */

sub('.viz__grid { stroke: var(--w-05); }', '.viz__grid { stroke: var(--k-06); }', 'viz grid');
sub('.viz__path--2 { stroke: var(--w-25); }', '.viz__path--2 { stroke: var(--k-18); }', 'viz path 2');
sub('.viz__spokes { stroke: var(--w-18); }', '.viz__spokes { stroke: var(--k-12); }', 'viz spokes');
sub('.viz__box { fill: var(--sh-surface-3); stroke: var(--ink-hi); }',
    '.viz__box { fill: var(--sh-surface-3); stroke: var(--sh-border); }', 'viz box');
// both node cores hold the white monogram / white type, so they stay ink
sub('.viz__core { fill: var(--sh-bg); stroke: var(--accent); stroke-opacity: 0.6; }',
    '.viz__core { fill: var(--ink); stroke: var(--accent); stroke-opacity: 0.6; }', 'viz core');
sub('.viz__hub { fill: var(--sh-bg); stroke: var(--accent); stroke-opacity: 0.7; }',
    '.viz__hub { fill: var(--ink); stroke: var(--accent); stroke-opacity: 0.7; }', 'viz hub');
sub('.viz__label--hi { fill: var(--sh-text); font-size: 11px; letter-spacing: 1.5px; }',
    '.viz__label--hi { fill: var(--on-ink-text); font-size: 11px; letter-spacing: 1.5px; }', 'viz label hi');
sub('.viz__dot { fill: var(--accent); }', '.viz__dot { fill: var(--accent-ink); }', 'viz dot');

/* --------------------------------------------------- terminal stays ink */

sub(
  '  background: var(--sh-bg); border: 1px solid var(--sh-border-strong); box-shadow: var(--shadow-dk);\n'
  + '  font-family: var(--font-mono); font-size: 12.5px; line-height: 1.7; color: var(--sh-text-2);',
  '  background: var(--ink); border: 1px solid var(--ink-hi); box-shadow: var(--shadow-dk);\n'
  + '  font-family: var(--font-mono); font-size: 12.5px; line-height: 1.7; color: var(--on-ink-text-2);',
  'terminal shell'
);
sub(
  '.term__bar { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: var(--sh-surface-2); border-bottom: 1px solid var(--sh-border); }',
  '.term__bar { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: var(--ink-2); border-bottom: 1px solid var(--on-ink-border); }',
  'terminal bar'
);
sub('.term__bar i { width: 9px; height: 9px; border-radius: 50%; background: var(--sh-border-strong); }',
    '.term__bar i { width: 9px; height: 9px; border-radius: 50%; background: var(--on-ink-border-strong); }', 'terminal dots');
sub('.term__bar span { margin-left: 8px; font-size: 11px; color: var(--sh-muted); }',
    '.term__bar span { margin-left: 8px; font-size: 11px; color: var(--on-ink-muted); }', 'terminal title');
sub('.term__muted { color: var(--sh-muted); }', '.term__muted { color: var(--on-ink-muted); }', 'terminal muted');
sub('.term__cursor { display: inline-block; width: 7px; height: 13px; vertical-align: -2px; background: var(--sh-text-2);',
    '.term__cursor { display: inline-block; width: 7px; height: 13px; vertical-align: -2px; background: var(--on-ink-text-2);', 'terminal cursor');

/* ------------------------------------------------------- steps + stats */

sub(
  '  border-radius: var(--r-xl); background: var(--w-03); border: 1px solid var(--sh-border);\n}\n.steps li {',
  '  border-radius: var(--r-xl); background: var(--sh-tint); border: 1px solid var(--sh-border);\n}\n.steps li {',
  'steps shell'
);
sub('  background: var(--sh-surface); box-shadow: inset 0 1px 1px var(--w-05);\n}',
    '  background: var(--sh-surface); box-shadow: inset 0 1px 1px var(--sh-hi);\n}', 'steps card');
sub('.steps__num { display: block; font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.14em; color: var(--accent); margin-bottom: 40px; }',
    '.steps__num { display: block; font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.14em; color: var(--accent-ink); margin-bottom: 40px; }', 'steps num');

/* ------------------------------------------------------------ the form */

sub(
  '.form { padding: 6px; border-radius: var(--r-xl); background: var(--w-03); border: 1px solid var(--sh-border); box-shadow: var(--shadow-dk); }',
  '.form { padding: 6px; border-radius: var(--r-xl); background: var(--sh-tint); border: 1px solid var(--sh-border); box-shadow: var(--shadow-sh); }',
  'form shell'
);
sub('  border-radius: calc(var(--r-xl) - 6px); background: var(--sh-surface-2); box-shadow: inset 0 1px 1px var(--w-05);',
    '  border-radius: calc(var(--r-xl) - 6px); background: var(--sh-surface-2); box-shadow: inset 0 1px 1px var(--sh-hi);', 'form inner');
sub('  background: var(--sh-bg); color: var(--sh-text); font: inherit; font-size: 15px; resize: vertical;',
    '  background: var(--sh-surface); color: var(--sh-text); font: inherit; font-size: 15px; resize: vertical;', 'form inputs');
// focus + error borders need 3:1 against their surface, which the bright accent misses
sub('.form input:focus, .form textarea:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-soft); }',
    '.form input:focus, .form textarea:focus { outline: none; border-color: var(--accent-ink); box-shadow: 0 0 0 4px var(--accent-soft); }', 'form focus');
sub('.form .is-invalid { border-color: var(--accent); }', '.form .is-invalid { border-color: var(--accent-ink); }', 'form invalid');
sub('.form__consent input { width: 18px; height: 18px; flex: none; margin: 2px 0 0; padding: 0; border-radius: 4px; accent-color: var(--accent); }',
    '.form__consent input { width: 18px; height: 18px; flex: none; margin: 2px 0 0; padding: 0; border-radius: 4px; accent-color: var(--accent-ink); }', 'consent box');
sub('.form__consent input.is-invalid { outline: 2px solid var(--accent); outline-offset: 2px; }',
    '.form__consent input.is-invalid { outline: 2px solid var(--accent-ink); outline-offset: 2px; }', 'consent invalid');
sub('.field__err { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 12px; color: var(--accent); }',
    '.field__err { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 12px; color: var(--accent-ink); }', 'field error');
sub('.form__error { grid-column: 1 / -1; margin: 0; font-size: 13px; color: var(--accent); }',
    '.form__error { grid-column: 1 / -1; margin: 0; font-size: 13px; color: var(--accent-ink); }', 'form error');

/* ----------------------------------------------------------- the footer */

sub('.footer { position: relative; z-index: var(--z-sheet); background: var(--sh-bg); color: var(--sh-muted); border-top: 1px solid var(--sh-border); padding: 48px 0 40px; }',
    '.footer { position: relative; z-index: var(--z-sheet); background: var(--sh-bg-2); color: var(--sh-muted); border-top: 1px solid var(--sh-border); padding: 48px 0 40px; }',
    'footer');

/* ------------------------------------- hero bottom bar: four even chips */

sub(
  '.hero__bar {\n'
  + '  position: absolute; left: 20px; right: 20px; bottom: 20px; height: 46px; z-index: 4; pointer-events: auto;\n'
  + '  display: flex; align-items: center; justify-content: space-between; padding: 0 24px;\n'
  + '  border-radius: var(--r-md); border: 1px solid var(--on-ink-hi);\n'
  + '  background: linear-gradient(90deg, var(--bar-a) 0%, var(--bar-b) 50%, var(--bar-a) 100%);\n'
  + '  color: var(--w-84); font-size: 12px; letter-spacing: 0.01em;\n'
  + '  box-shadow: var(--shadow-ink);\n'
  + '}\n'
  + '.hero__bar > * { display: inline-flex; align-items: center; gap: 8px; text-decoration: none; color: inherit; }\n'
  + '.hero__bar .dot { width: 4px; height: 4px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 8px var(--accent-glow); }\n'
  + '.hero__scroll svg { transition: transform var(--t-fast) var(--ease); }\n'
  + '.hero__scroll:hover svg { transform: translateY(2px); }',

  '/* four service chips on an even 4-column grid: the outer two align to the\n'
  + '   bar edges, the inner two centre in their column, so the run reads evenly\n'
  + '   spaced whatever the label lengths are. */\n'
  + '.hero__bar {\n'
  + '  position: absolute; left: var(--bar-inset); right: var(--bar-inset); bottom: var(--bar-inset);\n'
  + '  height: var(--bar-h); z-index: 4; pointer-events: auto;\n'
  + '  display: grid; grid-template-columns: repeat(4, 1fr); align-items: center;\n'
  + '  padding: 0 clamp(20px, 2.4vw, 32px);\n'
  + '  border-radius: var(--r-md); border: 1px solid var(--on-ink-hi);\n'
  + '  background: linear-gradient(90deg, var(--bar-a) 0%, var(--bar-b) 50%, var(--bar-a) 100%);\n'
  + '  color: var(--w-84); font-size: 12px; letter-spacing: 0.01em;\n'
  + '  box-shadow: var(--shadow-ink);\n'
  + '}\n'
  + '.hero__bar > * { display: inline-flex; align-items: center; justify-content: center; min-width: 0; color: inherit; }\n'
  + '.hero__bar > *:first-child { justify-content: flex-start; }\n'
  + '.hero__bar > *:last-child { justify-content: flex-end; }',
  'hero bar'
);

/* ------------------------------------------------- partners: real marks */

sub(
  '.partners__grid li {\n'
  + '  display: flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 600; letter-spacing: -0.01em;\n'
  + '  color: var(--text-2); opacity: 0.85; white-space: nowrap;\n'
  + '  transition: opacity var(--t-fast) var(--ease);\n'
  + '}\n'
  + '.partners__grid li:hover { opacity: 1; }\n'
  + '.partners__grid svg { width: 14px; height: 14px; flex: none; }',

  '.partners__grid li {\n'
  + '  display: flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 600; letter-spacing: -0.01em;\n'
  + '  color: var(--text-2); opacity: 0.85; white-space: nowrap;\n'
  + '  transition: opacity var(--t-fast) var(--ease);\n'
  + '}\n'
  + '.partners__grid li:hover { opacity: 1; }\n'
  + '/* the real brand marks: monochrome at rest so the strip reads as one system,\n'
  + '   each brand colour (--brand, set per item) on hover. */\n'
  + '.partners__grid svg { width: 15px; height: 15px; flex: none; fill: currentColor; color: var(--text); transition: color var(--t-fast) var(--ease); }\n'
  + '.partners__grid li:hover svg { color: var(--brand, var(--text)); }',
  'partners marks'
);

/* --------------------------------- hero figure: the brain point cloud */

sub(
  '.hero__figure {\n'
  + '  position: relative; margin: 0;\n'
  + '  height: min(93%, 93dvh); aspect-ratio: 3 / 4; max-width: 44vw;\n'
  + '  will-change: transform, opacity;\n'
  + '}\n'
  + '.hero__figure img {\n'
  + '  width: 100%; height: 100%; object-fit: contain; object-position: center bottom;\n'
  + '  filter: var(--shadow-figure);\n'
  + '}\n'
  + '/* designed fallback if the render is missing: a matte bust silhouette */\n'
  + '.hero__figure.is-missing img { display: none; }\n'
  + '.hero__figure.is-missing::before {\n'
  + '  content: ""; position: absolute; left: 30%; right: 30%; top: 6%; height: 34%;\n'
  + '  border-radius: 50% 50% 46% 46% / 55% 55% 45% 45%;\n'
  + '  background: radial-gradient(60% 45% at 40% 30%, var(--ink-3), var(--ink) 70%);\n'
  + '}\n'
  + '.hero__figure.is-missing::after {\n'
  + '  content: ""; position: absolute; left: 8%; right: 8%; top: 38%; bottom: 0;\n'
  + '  border-radius: 48% 48% 0 0 / 30% 30% 0 0;\n'
  + '  background: linear-gradient(180deg, var(--ink-2), var(--ink) 60%, var(--ink-a0));\n'
  + '}',

  '/* The brain hologram: a 10.000-point cloud pulled out of Brain.fbx and drawn\n'
  + '   in raw WebGL (see brain.js). The poster underneath is the first paint and\n'
  + '   the fallback for no-JS and no-WebGL, and fades out once the cloud is live. */\n'
  + '.hero__figure {\n'
  + '  position: relative; margin: 0;\n'
  + '  height: min(96%, 96dvh); aspect-ratio: 1 / 1; max-width: 52vw;\n'
  + '  will-change: transform, opacity;\n'
  + '}\n'
  + '.brain__poster, .brain__canvas {\n'
  + '  position: absolute; inset: 0; width: 100%; height: 100%;\n'
  + '  object-fit: contain; object-position: center;\n'
  + '}\n'
  + '.brain__poster { transition: opacity 700ms var(--ease); }\n'
  + '.brain__canvas { display: block; opacity: 0; transition: opacity 700ms var(--ease); }\n'
  + '.hero__figure.is-live .brain__poster { opacity: 0; }\n'
  + '.hero__figure.is-live .brain__canvas { opacity: 1; }',
  'hero figure -> brain'
);

/* the figure no longer bleeds off the bottom edge (a floating cloud, not a
   bust), so the mobile fade that hid the cut torso has nothing left to hide */
sub(
  '  /* the figure\'s bottom edge is mid-page here, not a viewport edge: fade it out behind the bar (12px inset + 42px tall) */\n'
  + '  .hero__figure img {\n'
  + '    -webkit-mask-image: linear-gradient(180deg, black calc(100% - 54px), transparent calc(100% - 12px));\n'
  + '    mask-image: linear-gradient(180deg, black calc(100% - 54px), transparent calc(100% - 12px));\n'
  + '  }\n',
  '',
  'mobile figure mask'
);

/* mobile bar: four chips do not fit on one 390px row, so two rows of two */
sub(
  '  .hero__bar { left: 12px; right: 12px; bottom: 12px; height: 42px; padding: 0 16px; font-size: 11px; gap: 8px; }\n'
  + '  .hero__scroll { display: none; }',
  '  .hero__bar {\n'
  + '    --bar-inset: 12px; --bar-h: auto;\n'
  + '    grid-template-columns: repeat(2, 1fr); gap: 6px 14px; padding: 11px 16px; font-size: 11px;\n'
  + '  }\n'
  + '  .hero__bar > *, .hero__bar > *:first-child, .hero__bar > *:last-child { justify-content: flex-start; }',
  'mobile bar'
);

fs.writeFileSync(file, css);
console.log('patch-styles stage 2: ' + count + ' substitutions applied');
