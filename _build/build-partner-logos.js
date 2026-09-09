/* Builds the "Partners tecnologicos" strip in index.html from simple-icons'
   official brand paths (CC0), so the marks are the real ones rather than
   hand-drawn approximations.

   Two pinned versions are installed side by side under npm aliases because
   neither set alone covers the list: v12+ dropped OpenAI and Microsoft Azure,
   and n8n was only added after v11. `current` wins when both have a mark.

     _build/logos/  ->  si-current (latest) + si-legacy (11)

   Run:  node _build/build-partner-logos.js          print the markup + tokens
         node _build/build-partner-logos.js --write  patch index.html in place

   The marks render monochrome in currentColor and pick up their brand colour on
   hover through the --brand-* tokens in :root, so no colour literal ever lands
   in the markup (see design-system.md).                                      */
const fs = require('fs');
const path = require('path');
const HERE = __dirname;
const req = n => require(path.join(HERE, 'logos', 'node_modules', n));
const current = req('si-current');
const legacy = req('si-legacy');

// label shown on the site | simple-icons export | token slug
const PARTNERS = [
  ['OpenAI',       'siOpenai',         'openai'],
  ['Anthropic',    'siAnthropic',      'anthropic'],
  ['Google Cloud', 'siGooglecloud',    'googlecloud'],
  ['Azure',        'siMicrosoftazure', 'azure'],
  ['n8n',          'siN8n',            'n8n'],
  ['Make',         'siMake',           'make'],
  ['HubSpot',      'siHubspot',        'hubspot'],
  ['Zapier',       'siZapier',         'zapier'],
];

const items = [], tokens = [];
for (const [label, key, slug] of PARTNERS) {
  const icon = current[key] || legacy[key];
  if (!icon) throw new Error(`simple-icons has no ${key} (${label}) in either pinned version`);
  items.push(
    `            <li style="--brand: var(--brand-${slug})">` +
    `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${icon.path}"/></svg>` +
    `<span>${label}</span></li>`
  );
  tokens.push(`  --brand-${slug}: #${icon.hex};`);
}

if (process.argv.includes('--write')) {
  const file = path.join(HERE, '..', 'index.html');
  let html = fs.readFileSync(file, 'utf8');
  const open = '<ul class="partners__grid">';
  const a = html.indexOf(open);
  if (a === -1) throw new Error('partners__grid not found in index.html');
  const b = html.indexOf('</ul>', a);
  if (b === -1) throw new Error('unterminated partners__grid');
  html = html.slice(0, a + open.length) + '\n' + items.join('\n') + '\n          ' + html.slice(b);
  fs.writeFileSync(file, html);
  console.log(`index.html: wrote ${PARTNERS.length} partner marks`);
  console.log('Add these to :root in styles.css if they are not there yet:');
  console.log(tokens.join('\n'));
} else {
  console.log('--- :root tokens ---\n' + tokens.join('\n'));
  console.log('\n--- markup ---\n' + items.join('\n'));
}
