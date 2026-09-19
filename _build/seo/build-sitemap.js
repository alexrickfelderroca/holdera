#!/usr/bin/env node
'use strict';
/*
 * _build/seo/build-sitemap.js — genera sitemap.xml y robots.txt en la raíz.
 *
 *   node _build/seo/build-sitemap.js
 *
 * Lee las páginas de _build/seo/meta.json (las que tienen "sitemap") y la
 * constante SITE de _build/seo-inject.js, así el dominio sigue viviendo en
 * un solo sitio. 404.html no entra (sitemap: null, noindex).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const { SITE } = require(path.join(__dirname, '..', 'seo-inject.js'));
const { loadMeta } = require(path.join(__dirname, 'validate-meta.js'));

const meta = loadMeta(SITE);
const lastmod = meta.site.lastmod;

const urls = meta.pages.filter((p) => p.sitemap && p.path !== null).map((p) => {
  const loc = p.path === '/' ? SITE + '/' : SITE + p.path;
  return '  <url>\n    <loc>' + loc + '</loc>\n    <lastmod>' + (p.lastmod || lastmod) + '</lastmod>\n    <priority>' + p.sitemap.priority + '</priority>\n  </url>';
});

/* URLs que van al sitemap pero NO son paginas del sitio: hoy, la entrada del
   panel (/panel/), que es el producto capturado en estatico y no lleva el
   bloque <!-- seo:head --> que reescribe seo-inject.js. Sin esto, regenerar el
   sitemap la borraba en silencio, porque solo miraba `meta.pages`. */
for (const extra of meta.extraSitemap || []) {
  urls.push(
    '  <url>\n    <loc>' + SITE + extra.path + '</loc>\n    <lastmod>' +
    (extra.lastmod || lastmod) + '</lastmod>\n    <priority>' + extra.priority + '</priority>\n  </url>'
  );
}

const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.join('\n') + '\n</urlset>\n';

const robots = [
  '# holdera.es — robots.txt',
  'User-agent: *',
  'Allow: /',
  '# Herramientas de build y fuentes de los modelos 3D: no son páginas.',
  'Disallow: /_build/',
  'Disallow: /brain-hologram/',
  'Disallow: /fish-hologram/',
  'Disallow: /hologram-gezegen/',
  '# Vídeos de referencia sueltos en la raíz (no son contenido del sitio).',
  'Disallow: /*.mp4$',
  '',
  'Sitemap: ' + SITE + '/sitemap.xml',
  '',
].join('\n');

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');
fs.writeFileSync(path.join(ROOT, 'robots.txt'), robots, 'utf8');
console.log('sitemap.xml: ' + urls.length + ' URLs · lastmod ' + lastmod);
console.log('robots.txt: escrito · Sitemap: ' + SITE + '/sitemap.xml');
