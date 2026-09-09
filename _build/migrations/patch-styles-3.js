/* Stage 3: drop the tokens that the light-sheet re-theme orphaned.

     --ink-3, --ink-a0, --shadow-figure   only the robot silhouette used these
     --w-03, --w-05, --w-18, --w-25       white alpha steps the dark sheet used;
                                          the light sheet uses --sh-tint/--sh-hi
                                          and the --k-* black steps instead

   --accent-hover is deliberately NOT removed: it was already unreferenced
   before this change set and it is a documented brand token in CLAUDE.md.
   _build/check-tokens.js allowlists it for that reason. */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'styles.css');
let css = fs.readFileSync(file, 'utf8');

const DEAD = [
  '  --ink-3: #2c2c2c;\n',
  '  --ink-a0: rgba(16, 16, 16, 0);\n',
  '  --shadow-figure: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.18)) drop-shadow(0 40px 50px rgba(0, 0, 0, 0.28));\n',
  '  --w-03: rgba(255, 255, 255, 0.03);\n',
  '  --w-05: rgba(255, 255, 255, 0.05);\n',
  '  --w-18: rgba(255, 255, 255, 0.18);\n',
  '  --w-25: rgba(255, 255, 255, 0.25);\n',
];

let removed = 0;
for (const line of DEAD) {
  const hits = css.split(line).length - 1;
  if (hits !== 1) throw new Error(`expected exactly one ${line.trim()}, found ${hits}`);
  // guard: never drop a token that something still references
  const name = line.trim().split(':')[0];
  if (css.indexOf('var(' + name + ')') !== -1) throw new Error(`${name} is still referenced`);
  css = css.split(line).join('');
  removed++;
}

fs.writeFileSync(file, css);
console.log(`patch-styles stage 3: removed ${removed} orphaned tokens`);
