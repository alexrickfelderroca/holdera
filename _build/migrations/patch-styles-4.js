/* Stage 4: fixes from the adversarial review of the light-sheet round.
   Only the findings that survived an independent verifier are here, and where
   the verifier corrected the proposed fix, the corrected version is what is
   applied. Run once: `node _build/migrations/patch-styles-4.js`. */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', '..', 'styles.css');
let css = fs.readFileSync(file, 'utf8');

let count = 0;
function sub(needle, replacement, label) {
  const hits = css.split(needle).length - 1;
  if (hits === 0) throw new Error('NOT FOUND: ' + label);
  css = css.split(needle).join(replacement);
  count += hits;
}

/* 1. The hero star rating measured 1.99:1 on the light hero. --accent-ink is
      4.27:1 there. (.form__done-mark is deliberately NOT changed: its disc also
      carries an ink glyph, which would drop from 7.58:1 to 3.54:1.) */
sub('.stars { display: inline-flex; gap: 2px; color: var(--accent); }',
    '.stars { display: inline-flex; gap: 2px; color: var(--accent-ink); }',
    'stars accent');

/* 2. The tag pill dot was 2.22:1 on the sheet; the glow around it cannot read on
      a light ground at all, so it goes rather than being re-tinted. */
sub('.tag::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 8px var(--accent-glow); }',
    '.tag::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: var(--accent-ink); }',
    'tag dot');

/* 3. The illustration line work lost about a third of its strength: flipping
      white alphas to black alphas is not linear, and three of the four alphas
      were also reduced. Re-measured against --sh-surface-3. */
sub('  --k-18: rgba(0, 0, 0, 0.18);',
    '  --k-18: rgba(0, 0, 0, 0.18);\n  --k-24: rgba(0, 0, 0, 0.24);\n  --k-38: rgba(0, 0, 0, 0.38);',
    'k-24 / k-38');
sub('.viz__path--2 { stroke: var(--k-18); }', '.viz__path--2 { stroke: var(--k-38); }', 'viz path 2 alpha');
sub('.viz__spokes { stroke: var(--k-12); }', '.viz__spokes { stroke: var(--k-24); }', 'viz spokes alpha');
sub('.viz__box { fill: var(--sh-surface-3); stroke: var(--sh-border); }',
    '.viz__box { fill: var(--sh-surface-3); stroke: var(--sh-border-strong); }', 'viz box stroke');
/* the pulses sit on white cards now, where the bright accent is 2.4:1 */
sub('.viz__pulse, .viz__ring { stroke: var(--accent); }',
    '.viz__pulse, .viz__ring { stroke: var(--accent-ink); }', 'viz pulses');

/* 4. --sh-hi was the dark sheet's white bevel highlight re-pointed at near-white
      surfaces, where it composites to a measured 1.00:1 — it renders nothing.
      The panels already read: their 6px tray gutter got *more* contrast in the
      flip (dL* 1.46 -> 9.92 on .steps). So the dead layers go, rather than being
      replaced by a new bevel that risks looking worse than no bevel. */
sub('  box-shadow: inset 0 1px 1px var(--sh-hi), inset 0 0 0 1px var(--sh-border);',
    '  box-shadow: inset 0 0 0 1px var(--sh-border);', 'feature visual bevel');
sub('.feature__body { padding: clamp(28px, 3.2vw, 44px); background: var(--sh-surface-2); box-shadow: inset 0 1px 1px var(--sh-hi); display: flex; flex-direction: column; justify-content: center; }',
    '.feature__body { padding: clamp(28px, 3.2vw, 44px); background: var(--sh-surface-2); display: flex; flex-direction: column; justify-content: center; }',
    'feature body bevel');
sub('  background: var(--sh-surface); box-shadow: inset 0 1px 1px var(--sh-hi);\n}',
    '  background: var(--sh-surface);\n}', 'steps card bevel');
sub('  border-radius: calc(var(--r-xl) - 6px); background: var(--sh-surface-2); box-shadow: inset 0 1px 1px var(--sh-hi);',
    '  border-radius: calc(var(--r-xl) - 6px); background: var(--sh-surface-2);', 'form shell bevel');
sub('  --sh-hi: rgba(255, 255, 255, 0.85);\n', '', 'drop --sh-hi token');

/* 5. .sheet .btn--primary was a byte-for-byte duplicate of the base .btn--primary
      rules once the sheet went light (verified: 16/16 computed values identical). */
sub('.sheet .btn--primary { background: var(--ink); color: var(--white); box-shadow: var(--shadow-ink); }\n'
  + '.sheet .btn--primary .btn__icon { background: var(--ink-hi); }\n'
  + '.sheet .btn--primary:hover { background: var(--ink-2); }\n'
  + '.sheet .btn--primary:hover .btn__icon { transform: translate(2px, -1px) scale(1.06); background: var(--accent); }\n',
  '', 'duplicate sheet primary button');

/* 6. "Evenly spread" means constant gaps. Four equal 1fr columns with the outer
      two pinned to the edges gives equal COLUMNS but unequal gaps, because the
      labels differ in length. max-content columns + space-between gives the
      constant gaps. Kept as a grid so the 2x2 mobile override still applies. */
sub('  display: grid; grid-template-columns: repeat(4, 1fr); align-items: center;\n',
    '  display: grid; grid-template-columns: repeat(4, max-content); justify-content: space-between; align-items: center; gap: 16px;\n',
    'bar columns');
sub('.hero__bar > * { display: inline-flex; align-items: center; justify-content: center; min-width: 0; color: inherit; }\n'
  + '.hero__bar > *:first-child { justify-content: flex-start; }\n'
  + '.hero__bar > *:last-child { justify-content: flex-end; }',
    '.hero__bar > * { display: inline-flex; align-items: center; min-width: 0; color: inherit; }',
    'bar children');
sub('/* four service chips on an even 4-column grid: the outer two align to the\n'
  + '   bar edges, the inner two centre in their column, so the run reads evenly\n'
  + '   spaced whatever the label lengths are. */',
    '/* Four service chips with equal gaps between them: max-content tracks laid\n'
  + '   out with space-between, so the spacing is even regardless of how long the\n'
  + '   labels are. Still a grid, so the 2x2 mobile override below just works. */',
    'bar comment');
sub('  .hero__bar > *, .hero__bar > *:first-child, .hero__bar > *:last-child { justify-content: flex-start; }',
    '  .hero__bar > * { justify-content: flex-start; }', 'mobile bar children');
sub('    grid-template-columns: repeat(2, 1fr); gap: 6px 14px; padding: 11px 16px; font-size: 11px;',
    '    grid-template-columns: repeat(2, 1fr); justify-content: stretch; gap: 8px 16px; padding: 12px 16px; font-size: 11px;',
    'mobile bar grid (also back on the 4/8 spacing scale)');

/* 7. max-width: 38vw at the 1280px breakpoint was tuned for the old 3/4 robot
      image. It cannot make the cloud smaller (brain.js fits to the canvas), only
      eat the margin and then clip, so it goes: the single width rule covers the
      whole desktop range continuously. */
sub('  .hero__figure { max-width: 38vw; }\n', '', 'drop 1280 figure override');

fs.writeFileSync(file, css);
console.log('patch-styles stage 4: ' + count + ' substitutions applied');
