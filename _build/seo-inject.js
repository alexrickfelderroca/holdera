#!/usr/bin/env node
'use strict';
/*
 * _build/seo-inject.js — escribe la capa SEO en el <head> de cada página.
 *
 *   node _build/seo-inject.js                 escribe en las páginas del proyecto
 *   node _build/seo-inject.js --dry-run       solo informa, no escribe
 *   node _build/seo-inject.js --root <dir>    trabaja sobre copias (pruebas)
 *   node _build/seo-inject.js --only index.html,panel.html
 *
 * Qué hace, por página de _build/seo/meta.json:
 *   1. Localiza <head>…</head>. NO toca nada fuera de ahí.
 *   2. Busca el marcador <!-- seo:head --> (las páginas nuevas lo llevan como
 *      última línea del head). Si falta en index.html, lo crea justo antes de
 *      </head>; si falta en cualquier otra página, es ERROR y no se escribe
 *      NINGÚN archivo (salida 1).
 *   3. Sustituye todo lo que haya entre <!-- seo:head --> y <!-- /seo:head -->
 *      (creando el cierre si no existe) por el bloque generado: canonical,
 *      robots, Open Graph, Twitter, iconos, manifest y el JSON-LD.
 *   4. Los tags que la página YA tiene fuera del bloque (<title>, description,
 *      og:title, og:description, og:type, og:locale, canonical, robots) se
 *      actualizan EN SU SITIO y no se repiten en el bloque: nunca hay dos.
 *   5. Es idempotente: ejecutarlo dos veces deja los archivos idénticos.
 *   6. Solo edita archivos que existen (los que faltan se saltan con aviso).
 *   7. Antes de escribir pasa _build/seo/validate-meta.js: si meta.json no
 *      es válido, no se toca nada.
 *
 * El DOMINIO vive solo aquí (SITE). meta.json usa {{SITE}}; sitemap.xml y
 * robots.txt los genera _build/seo/build-sitemap.js con esta misma constante.
 * Si cambia el dominio: cambiar SITE, y volver a ejecutar los dos scripts.
 */
const fs = require('fs');
const path = require('path');

// TODO (Alex): confirmar el dominio. Es el ÚNICO sitio donde se escribe.
const SITE = 'https://holdera.es';
const SITE_NAME = 'Holdera';
const START = '<!-- seo:head -->';
const END = '<!-- /seo:head -->';
const LD_MARK = 'data-seo="ld"';

// ---------------------------------------------------------------- utilidades
function escAttr(s) {
  return String(s).split('&').join('&amp;').split('"').join('&quot;').split('<').join('&lt;').split('>').join('&gt;');
}
function escText(s) {
  return String(s).split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;');
}
function abs(p) { return p === '/' ? SITE + '/' : SITE + p; }

function parseArgs(argv) {
  const out = { root: null, dryRun: false, only: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') out.root = argv[++i];
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--only') out.only = argv[++i].split(',').map((s) => s.trim());
    else { console.error('Argumento desconocido: ' + a); process.exit(2); }
  }
  return out;
}

// Regex de un tag por atributo (el orden de atributos puede variar).
const RX = {
  title: /<title\b[^>]*>[\s\S]*?<\/title>/i,
  metaName: (name) => new RegExp('<meta\\b[^>]*\\bname\\s*=\\s*["\']' + name + '["\'][^>]*>', 'i'),
  metaProp: (prop) => new RegExp('<meta\\b[^>]*\\bproperty\\s*=\\s*["\']' + prop.replace(':', '\\:') + '["\'][^>]*>', 'i'),
  linkRel: (rel) => new RegExp('<link\\b[^>]*\\brel\\s*=\\s*["\']' + rel + '["\'][^>]*>', 'i'),
};

function findHead(html) {
  const open = /<head\b[^>]*>/i.exec(html);
  if (!open) return null;
  const closeIdx = html.search(/<\/head\s*>/i);
  if (closeIdx < 0 || closeIdx < open.index) return null;
  return { innerStart: open.index + open[0].length, innerEnd: closeIdx };
}

function ldJson(graph) {
  // "</" dentro de una cadena JSON cerraría el <script>: se escapa. Sin
  // String.replace con "$" (ver CLAUDE.md): split/join.
  return JSON.stringify(graph, null, 2).split('</').join('<\\/');
}

// ------------------------------------------------------------ bloque por página
// Devuelve { lines, inPlace } donde inPlace = { key: tagString } son los tags
// que hay que sustituir fuera del bloque, y lines las que van dentro.
function buildTags(meta, page, buildGraph) {
  const og = page.og;
  const canonical = page.path === null ? null : abs(page.path);
  const icons = meta.site.icons;
  const tags = [];
  const push = (key, html, inPlaceRx) => tags.push({ key, html, rx: inPlaceRx || null });

  push('title', '<title>' + escText(page.title) + '</title>', RX.title);
  push('description', '<meta name="description" content="' + escAttr(page.description) + '">', RX.metaName('description'));
  if (canonical) push('canonical', '<link rel="canonical" href="' + canonical + '">', RX.linkRel('canonical'));
  push('robots', '<meta name="robots" content="' + escAttr(page.robots) + '">', RX.metaName('robots'));
  push('og:type', '<meta property="og:type" content="' + escAttr(og.type) + '">', RX.metaProp('og:type'));
  push('og:locale', '<meta property="og:locale" content="' + escAttr(meta.site.locale) + '">', RX.metaProp('og:locale'));
  push('og:site_name', '<meta property="og:site_name" content="' + escAttr(meta.site.name) + '">');
  if (canonical) push('og:url', '<meta property="og:url" content="' + canonical + '">');
  push('og:title', '<meta property="og:title" content="' + escAttr(og.title) + '">', RX.metaProp('og:title'));
  push('og:description', '<meta property="og:description" content="' + escAttr(og.description) + '">', RX.metaProp('og:description'));
  push('og:image', '<meta property="og:image" content="' + escAttr(og.image) + '">');
  push('og:image:type', '<meta property="og:image:type" content="image/png">');
  push('og:image:width', '<meta property="og:image:width" content="1200">');
  push('og:image:height', '<meta property="og:image:height" content="630">');
  push('og:image:alt', '<meta property="og:image:alt" content="' + escAttr(og.imageAlt) + '">');
  push('twitter:card', '<meta name="twitter:card" content="' + escAttr(meta.site.twitterCard) + '">');
  push('twitter:title', '<meta name="twitter:title" content="' + escAttr(og.title) + '">');
  push('twitter:description', '<meta name="twitter:description" content="' + escAttr(og.description) + '">');
  push('twitter:image', '<meta name="twitter:image" content="' + escAttr(og.image) + '">');
  push('twitter:image:alt', '<meta name="twitter:image:alt" content="' + escAttr(og.imageAlt) + '">');
  push('apple-touch-icon', '<link rel="apple-touch-icon" sizes="180x180" href="' + icons.apple + '">');
  push('icon-32', '<link rel="icon" type="image/png" sizes="32x32" href="' + icons.png32 + '">');
  push('manifest', '<link rel="manifest" href="' + icons.manifest + '">', RX.linkRel('manifest'));
  push('ld+json', '<script type="application/ld+json" ' + LD_MARK + '>\n' + ldJson(buildGraph(meta, page)) + '\n</script>');
  return tags;
}

// Tags que, si existen fuera del bloque, deberían estar SOLO en el bloque:
// se avisa, no se borran (podría ser algo puesto a mano por otra sesión).
const WARN_IF_OUTSIDE = [
  ['og:url', RX.metaProp('og:url')], ['og:image', RX.metaProp('og:image')], ['og:site_name', RX.metaProp('og:site_name')],
  ['twitter:card', RX.metaName('twitter:card')], ['twitter:image', RX.metaName('twitter:image')],
  ['apple-touch-icon', RX.linkRel('apple-touch-icon')],
];

function detectIndent(head) {
  // Sangría de la última línea no vacía del head (normalmente "  ").
  const lines = head.split('\n').filter((l) => l.trim());
  if (!lines.length) return '  ';
  const m = /^[ \t]*/.exec(lines[lines.length - 1]);
  return m ? m[0] : '';
}

function processPage(html, meta, page, buildGraph) {
  const summary = { file: page.file, block: null, inPlace: [], added: [], warnings: [], changed: false };
  const h = findHead(html);
  if (!h) throw new Error('no encuentro <head>…</head>');
  const head = html.slice(h.innerStart, h.innerEnd);

  // ---- límites del bloque
  let pre, post, indent;
  const si = head.indexOf(START);
  if (si < 0) {
    if (page.file !== 'index.html') throw new Error('falta el marcador ' + START + ' en <head>');
    indent = detectIndent(head);
    pre = head.replace(/\s+$/, '') + '\n' + indent;
    post = '\n';
    summary.block = 'creado antes de </head>';
  } else {
    if (head.indexOf(START, si + 1) >= 0) throw new Error('hay más de un ' + START);
    const lineStart = head.lastIndexOf('\n', si) + 1;
    const lead = head.slice(lineStart, si);
    indent = /^[ \t]*$/.test(lead) ? lead : detectIndent(head);
    pre = head.slice(0, si);
    const ei = head.indexOf(END, si);
    if (ei < 0) { post = head.slice(si + START.length); summary.block = 'marcador encontrado, cierre creado'; }
    else { post = head.slice(ei + END.length); summary.block = 'bloque sustituido'; }
    // Cualquier resto de "<!-- /seo:head -->" duplicado fuera del bloque sería un error de mano.
    if (post.indexOf(END) >= 0 || pre.indexOf(END) >= 0) throw new Error('hay un ' + END + ' fuera del bloque');
  }

  // ---- tags: en su sitio (fuera del bloque) o dentro del bloque
  const tags = buildTags(meta, page, buildGraph);
  const inner = [];
  for (const t of tags) {
    let placed = false;
    if (t.rx) {
      for (const side of ['pre', 'post']) {
        const src = side === 'pre' ? pre : post;
        const m = t.rx.exec(src);
        if (m) {
          const replaced = src.slice(0, m.index) + t.html + src.slice(m.index + m[0].length);
          if (side === 'pre') pre = replaced; else post = replaced;
          // ¿hay un segundo? no se toca, pero se avisa
          if (t.rx.exec(replaced.slice(m.index + t.html.length))) summary.warnings.push('hay más de un ' + t.key + ' fuera del bloque; solo se ha actualizado el primero');
          summary.inPlace.push(t.key);
          placed = true;
          break;
        }
      }
    }
    if (!placed) { inner.push(t.html); summary.added.push(t.key); }
  }
  for (const [key, rx] of WARN_IF_OUTSIDE) {
    if (rx.test(pre) || rx.test(post)) summary.warnings.push(key + ' existe fuera del bloque y también se emite dentro: revisar a mano');
  }

  // ---- montar
  const body = inner.map((t) => t.split('\n').map((l) => indent + l).join('\n')).join('\n');
  const newHead = pre + START + '\n' + body + '\n' + indent + END + post;
  const out = html.slice(0, h.innerStart) + newHead + html.slice(h.innerEnd);
  summary.changed = out !== html;
  return { out, summary };
}

// ------------------------------------------------------------------- main
function main() {
  const args = parseArgs(process.argv.slice(2));
  const { loadMeta, buildGraph, validate } = require(path.join(__dirname, 'seo', 'validate-meta.js'));
  const root = args.root ? path.resolve(args.root) : path.resolve(__dirname, '..');
  const meta = loadMeta(SITE);

  // 1) meta.json válido o no se toca nada
  const v = validate(meta, SITE);
  v.warnings.forEach((w) => console.log('AVISO  ' + w));
  if (v.errors.length) {
    v.errors.forEach((e) => console.log('ERROR  ' + e));
    console.log('meta.json no es válido: no se escribe nada.');
    process.exit(1);
  }

  // 2) primera pasada: calcular todo; si algo falla, nada se escribe
  const results = [];
  let fatal = 0;
  for (const page of meta.pages) {
    if (args.only && args.only.indexOf(page.file) < 0) continue;
    const file = path.join(root, page.file);
    if (!fs.existsSync(file)) { results.push({ file: page.file, skipped: 'no existe todavía' }); continue; }
    const html = fs.readFileSync(file, 'utf8');
    try {
      const r = processPage(html, meta, page, buildGraph);
      results.push({ file: page.file, path: file, out: r.out, summary: r.summary });
    } catch (e) {
      results.push({ file: page.file, error: e.message });
      fatal++;
    }
  }

  // 3) informe
  console.log('SEO inject · raíz ' + root + (args.dryRun ? ' · DRY RUN' : ''));
  for (const r of results) {
    if (r.skipped) { console.log('  - ' + r.file.padEnd(17) + ' saltada: ' + r.skipped); continue; }
    if (r.error) { console.log('  ! ' + r.file.padEnd(17) + ' ERROR: ' + r.error); continue; }
    const s = r.summary;
    console.log('  * ' + r.file.padEnd(17) + (s.changed ? 'cambia' : 'sin cambios') + ' · ' + s.block +
      ' · en su sitio: ' + (s.inPlace.length ? s.inPlace.join(', ') : '—') +
      ' · en el bloque: ' + s.added.length + ' tags');
    s.warnings.forEach((w) => console.log('      AVISO ' + w));
  }
  if (fatal) { console.log('Hay ' + fatal + ' página(s) con error: no se escribe NINGÚN archivo.'); process.exit(1); }

  // 4) escribir
  if (!args.dryRun) {
    let written = 0;
    for (const r of results) {
      if (!r.out || !r.summary.changed) continue;
      fs.writeFileSync(r.path, r.out, 'utf8');
      written++;
    }
    console.log(written ? 'Escritos ' + written + ' archivo(s).' : 'Nada que escribir: todo estaba al día.');
  }
}

module.exports = { SITE, SITE_NAME, START, END, processPage, buildTags };

if (require.main === module) main();
