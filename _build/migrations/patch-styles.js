/* Patch styles.css for the brain-hologram round.
   Written as a file and run with `node _build/patch-styles.js` because bash
   here-docs and `node -e` both mangle the $ signs and quotes in this file
   (see "Trampas de este proyecto" in CLAUDE.md). Every substitution uses
   split/join, never replace(): "$$" is an escape in a replacement string.

   What it does:
     1. renames the dark-sheet tokens --dk-* to --sh-* and re-values them light
     2. adds --on-ink-* for the surfaces that stay dark (drawer, floating
        island, hero bar, terminal)
     3. adds --accent-ink, because #f08a24 is only 2.42:1 on a light card
     4. makes the side drawer opaque (it was 94% and the hero read through it)

   Idempotency: it throws if a needle is missing, so a second run fails loudly
   rather than silently corrupting the file. Restore styles.css.bak first. */
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

/* ---------------------------------------------------------------- tokens */

sub(
  [
    '  /* dark sheet */',
    '  --dk-bg: #080808;',
    '  --dk-bg-2: #0f0f0f;',
    '  --dk-surface: #131313;',
    '  --dk-surface-2: #181818;',
    '  --dk-text: #f4f4f4;',
    '  --dk-text-2: #c9c9c9;',
    '  --dk-muted: #8f8f8f;',
    '  --dk-border: rgba(255, 255, 255, 0.08);',
    '  --dk-border-strong: rgba(255, 255, 255, 0.16);',
    '  --dk-hi: rgba(255, 255, 255, 0.06);',
    '  --dk-surface-3: #1a1a1a;',
  ].join('\n'),
  [
    '  /* content sheet (light) — slides up over the hero */',
    '  --sh-bg: #f2f1ef;',
    '  --sh-bg-2: #eae9e6;',
    '  --sh-surface: #ffffff;',
    '  --sh-surface-2: #fbfbfa;',
    '  --sh-surface-3: #f4f3f1;',
    '  --sh-text: #131313;',
    '  --sh-text-2: #3c3a38;',
    '  --sh-muted: #5f5c58;',
    '  --sh-border: rgba(20, 18, 16, 0.10);',
    '  --sh-border-strong: rgba(20, 18, 16, 0.20);',
    '  --sh-hi: rgba(255, 255, 255, 0.85);',
    '  --sh-tint: rgba(20, 18, 16, 0.03);',
    '',
    '  /* on ink — the surfaces that stay dark on a light page:',
    '     side drawer, floating island, hero bar, terminal */',
    '  --on-ink-text: #f4f4f4;',
    '  --on-ink-text-2: #c9c9c9;',
    '  --on-ink-muted: #8f8f8f;',
    '  --on-ink-border: rgba(255, 255, 255, 0.08);',
    '  --on-ink-border-strong: rgba(255, 255, 255, 0.16);',
    '  --on-ink-hi: rgba(255, 255, 255, 0.06);',
  ].join('\n'),
  'sheet token block'
);

// accent as TEXT on the light sheet: #f08a24 measures 2.42:1 on #fbfbfa,
// #a8530a measures 5.19:1 (see _build/contrast.js).
sub(
  '  --accent-soft: rgba(240, 138, 36, 0.18);',
  '  --accent-ink: #a8530a;\n  --accent-soft: rgba(240, 138, 36, 0.18);',
  'accent-ink'
);

// black alpha steps: the sheet used white alphas that vanish on light
sub(
  '  --k-08: rgba(0, 0, 0, 0.08);',
  '  --k-08: rgba(0, 0, 0, 0.08);\n  --k-12: rgba(0, 0, 0, 0.12);\n  --k-18: rgba(0, 0, 0, 0.18);',
  'k-12 / k-18'
);

// the reported bug: the panel was translucent, so the hero widget and the whole
// partner list read straight through the open menu.
sub('  --panel: rgba(12, 12, 12, 0.94);', '  --panel: #0e0e0e;', 'opaque drawer panel');

// bar geometry as tokens, so anything that has to clear the bar derives from it
sub(
  '  --nav-h: 76px;',
  '  --nav-h: 76px;\n  --bar-h: 46px;\n  --bar-inset: 20px;',
  'bar tokens'
);

// the light sheet needs its own card shadow; --shadow-dk stays for dark chrome
sub(
  '  --shadow-sheet: 0 -1px 0 rgba(255, 255, 255, 0.06), 0 -12px 32px -12px rgba(0, 0, 0, 0.5), 0 -40px 100px -20px rgba(0, 0, 0, 0.55);',
  '  --shadow-sh: 0 1px 2px rgba(20, 18, 16, 0.04), 0 12px 28px -14px rgba(20, 18, 16, 0.16), 0 32px 64px -32px rgba(20, 18, 16, 0.18);\n'
  + '  --shadow-sheet: 0 -1px 0 rgba(20, 18, 16, 0.07), 0 -14px 34px -14px rgba(20, 18, 16, 0.20), 0 -44px 110px -24px rgba(20, 18, 16, 0.18);',
  'shadow-sh'
);

/* ------------------------------------------- blanket rename, then hand back
   the surfaces that are still dark --------------------------------------- */

sub('--dk-', '--sh-', 'dk -> sh rename');

// a near-white focus ring on the now-light sheet would be invisible
sub(
  '.sheet :focus-visible, .drawer :focus-visible, .fab :focus-visible, .footer :focus-visible { outline-color: var(--sh-text); }',
  '.sheet :focus-visible, .footer :focus-visible { outline-color: var(--ink); }\n'
  + '.drawer :focus-visible, .fab :focus-visible { outline-color: var(--on-ink-text); }',
  'focus rings'
);

sub(
  '.btn--on-dark.btn--secondary { border-color: var(--sh-border-strong); color: var(--sh-text); background: transparent; }\n'
  + '.btn--on-dark.btn--secondary:hover { background: var(--sh-hi); border-color: var(--sh-text-2); }',
  '.btn--on-dark.btn--secondary { border-color: var(--on-ink-border-strong); color: var(--on-ink-text); background: transparent; }\n'
  + '.btn--on-dark.btn--secondary:hover { background: var(--on-ink-hi); border-color: var(--on-ink-text-2); }',
  'btn--on-dark secondary'
);

// the sheet's primary button was white-on-dark; on a light sheet it is ink
sub(
  '.btn--on-dark.btn--primary, .sheet .btn--primary { background: var(--white); color: var(--ink); box-shadow: var(--shadow-dk); }\n'
  + '.btn--on-dark.btn--primary .btn__icon, .sheet .btn--primary .btn__icon { background: var(--k-08); }\n'
  + '.btn--on-dark.btn--primary:hover, .sheet .btn--primary:hover { background: var(--surface-2); }\n'
  + '.sheet .btn--secondary { border-color: var(--sh-border-strong); color: var(--sh-text); background: transparent; }\n'
  + '.sheet .btn--secondary:hover { background: var(--sh-hi); }',
  '.btn--on-dark.btn--primary { background: var(--white); color: var(--ink); box-shadow: var(--shadow-dk); }\n'
  + '.btn--on-dark.btn--primary .btn__icon { background: var(--k-08); }\n'
  + '.btn--on-dark.btn--primary:hover { background: var(--surface-2); }\n'
  + '.sheet .btn--primary { background: var(--ink); color: var(--white); box-shadow: var(--shadow-ink); }\n'
  + '.sheet .btn--primary .btn__icon { background: var(--ink-hi); }\n'
  + '.sheet .btn--primary:hover { background: var(--ink-2); }\n'
  + '.sheet .btn--primary:hover .btn__icon { transform: translate(2px, -1px) scale(1.06); background: var(--accent); }\n'
  + '.sheet .btn--secondary { border-color: var(--sh-border-strong); color: var(--sh-text); background: transparent; }\n'
  + '.sheet .btn--secondary:hover { background: var(--sh-tint); }',
  'sheet buttons'
);

sub(
  '  border-radius: var(--r-md); border: 1px solid var(--sh-hi);',
  '  border-radius: var(--r-md); border: 1px solid var(--on-ink-hi);',
  'hero bar border'
);

sub(
  '  background: var(--fab-bg); border: 1px solid var(--sh-border-strong); color: var(--sh-text);',
  '  background: var(--fab-bg); border: 1px solid var(--on-ink-border-strong); color: var(--on-ink-text);',
  'floating island'
);
sub(
  '.fab .btn--secondary { border-color: transparent; background: var(--sh-hi); }',
  '.fab .btn--secondary { border-color: transparent; background: var(--on-ink-hi); }',
  'island button'
);
sub(
  '  background: var(--panel); color: var(--sh-text); border-left: 1px solid var(--sh-border-strong);',
  '  background: var(--panel); color: var(--on-ink-text); border-left: 1px solid var(--on-ink-border-strong);',
  'drawer panel'
);
sub(
  '  color: var(--sh-text); opacity: 0; transform: translateY(26px);',
  '  color: var(--on-ink-text); opacity: 0; transform: translateY(26px);',
  'drawer links'
);
sub(
  '.drawer__meta { display: flex; justify-content: space-between; margin: 0; font-size: 12px; color: var(--sh-muted); font-family: var(--font-mono); }',
  '.drawer__meta { display: flex; justify-content: space-between; margin: 0; font-size: 12px; color: var(--on-ink-muted); font-family: var(--font-mono); }',
  'drawer meta'
);

fs.writeFileSync(file, css);
console.log('patch-styles stage 1: ' + count + ' substitutions applied');
