#!/usr/bin/env node
'use strict';
/*
 * _build/seo/validate-meta.js — verificador de _build/seo/meta.json.
 *
 *   node _build/seo/validate-meta.js          (independiente; sale 1 si falla)
 *
 * Lo llama también _build/seo-inject.js ANTES de escribir nada: si algo no
 * pasa, no se toca ninguna página. Comprueba:
 *   - título <= 60, descripción <= 155, marca al final, únicos entre páginas;
 *   - og:image absoluta, en el dominio, y que el PNG exista en assets/seo;
 *   - el JSON-LD de cada página: ida y vuelta por JSON.parse, @context,
 *     @type y @id en cada nodo, @id únicos, referencias {"@id"} resueltas,
 *     propiedades obligatorias por tipo, y NINGUNA propiedad de las
 *     prohibidas (valoraciones, reseñas, teléfono, email, contactPoint:
 *     nada de eso está confirmado);
 *   - que no quede ningún {{SITE}} sin sustituir.
 * Lee el archivo real: si se renombra una página o se cambia un texto, mide
 * lo nuevo, no una copia escrita a mano.
 */
const fs = require('fs');
const path = require('path');

const PROJECT = path.resolve(__dirname, '..', '..');
const META_FILE = path.join(__dirname, 'meta.json');
const TITLE_MAX = 60;
const DESC_MAX = 155;
const DESC_MIN = 70;
const BRAND_SUFFIX = '| Holdera';
const FORBIDDEN = ['aggregateRating', 'review', 'reviews', 'ratingValue', 'telephone', 'email', 'contactPoint', 'faxNumber', 'streetAddress', 'postalCode', 'priceRange', 'offers', 'potentialAction'];

const REQUIRED = {
  Organization: ['name', 'url', 'logo'],
  ProfessionalService: ['name', 'url', 'address'],
  WebSite: ['name', 'url', 'publisher'],
  WebPage: ['name', 'url', 'isPartOf', 'breadcrumb'],
  AboutPage: ['name', 'url', 'isPartOf', 'breadcrumb'],
  ContactPage: ['name', 'url', 'isPartOf', 'breadcrumb'],
  BreadcrumbList: ['itemListElement'],
  Service: ['name', 'description', 'provider', 'serviceType'],
  WebApplication: ['name', 'url', 'applicationCategory', 'operatingSystem'],
  PostalAddress: ['addressLocality', 'addressRegion', 'addressCountry'],
  ImageObject: ['url'],
};
const PAGE_TYPES = ['WebPage', 'AboutPage', 'ContactPage'];

function loadMeta(SITE, file) {
  const raw = fs.readFileSync(file || META_FILE, 'utf8');
  const resolved = raw.split('{{SITE}}').join(SITE);
  return JSON.parse(resolved);
}

function buildGraph(meta, page) {
  const org = Object.assign({}, meta.shared.organization, page.organization || {});
  return { '@context': 'https://schema.org', '@graph': [org, meta.shared.website].concat(page.graph || []) };
}

function types(node) {
  const t = node['@type'];
  return Array.isArray(t) ? t : (t ? [t] : []);
}

// Recorre el árbol y llama a fn(obj, ruta) por cada objeto.
function walk(v, fn, p) {
  p = p || '$';
  if (Array.isArray(v)) return v.forEach((x, i) => walk(x, fn, p + '[' + i + ']'));
  if (v && typeof v === 'object') { fn(v, p); Object.keys(v).forEach((k) => walk(v[k], fn, p + '.' + k)); }
}

function validate(meta, SITE, opts) {
  opts = opts || {};
  const project = opts.project || PROJECT;
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  if (!SITE || !/^https:\/\/[^/]+$/.test(SITE)) err('SITE debe ser https://dominio sin barra final; es: ' + SITE);
  if (!Array.isArray(meta.pages) || !meta.pages.length) { err('meta.pages vacío'); return { errors, warnings }; }
  if (JSON.stringify(meta).indexOf('{{') >= 0) err('Queda algún marcador {{...}} sin sustituir en meta.json');

  const titles = new Map();
  const descs = new Map();

  for (const page of meta.pages) {
    const tag = '[' + page.file + '] ';
    if (!page.file) err('Página sin "file"');
    if (page.path !== null && !(typeof page.path === 'string' && page.path.charAt(0) === '/')) err(tag + 'path debe empezar por "/" o ser null (404)');

    // ---- título / descripción
    const t = page.title || '';
    const d = page.description || '';
    const tLen = Array.from(t).length;
    const dLen = Array.from(d).length;
    if (!t) err(tag + 'sin título');
    if (tLen > TITLE_MAX) err(tag + 'título de ' + tLen + ' caracteres (máx ' + TITLE_MAX + '): ' + t);
    if (t.slice(-BRAND_SUFFIX.length) !== BRAND_SUFFIX) err(tag + 'el título debe acabar en "' + BRAND_SUFFIX + '": ' + t);
    if (!d) err(tag + 'sin descripción');
    if (dLen > DESC_MAX) err(tag + 'descripción de ' + dLen + ' caracteres (máx ' + DESC_MAX + ')');
    if (dLen && dLen < DESC_MIN) warn(tag + 'descripción corta (' + dLen + ' < ' + DESC_MIN + ')');
    if (d && !/[.!?…]$/.test(d.trim())) warn(tag + 'la descripción no termina en frase completa');
    if (titles.has(t)) err(tag + 'título repetido con ' + titles.get(t)); else titles.set(t, page.file);
    if (descs.has(d)) err(tag + 'descripción repetida con ' + descs.get(d)); else descs.set(d, page.file);

    // ---- robots / sitemap
    if (!page.robots) err(tag + 'sin robots');
    if (page.file === '404.html' && !/noindex/.test(page.robots || '')) err(tag + '404 debe ser noindex');
    if (page.sitemap && /noindex/.test(page.robots || '')) err(tag + 'está en el sitemap y es noindex');
    if (page.sitemap && !(page.sitemap.priority && /^(0\.\d|1\.0)$/.test(page.sitemap.priority))) err(tag + 'sitemap.priority debe ser "0.x" o "1.0"');

    // ---- Open Graph
    const og = page.og || {};
    ['title', 'description', 'image', 'imageAlt', 'type'].forEach((k) => { if (!og[k]) err(tag + 'og.' + k + ' falta'); });
    if (og.image) {
      if (og.image.indexOf(SITE + '/') !== 0) err(tag + 'og.image no es absoluta en ' + SITE + ': ' + og.image);
      const rel = og.image.slice(SITE.length + 1);
      if (!fs.existsSync(path.join(project, rel))) err(tag + 'og.image no existe en disco: ' + rel + ' (ejecuta _build/seo/build-og.js)');
    }
    if (og.title && Array.from(og.title).length > 70) warn(tag + 'og.title largo (' + Array.from(og.title).length + ' > 70)');
    if (og.description && Array.from(og.description).length > 200) warn(tag + 'og.description larga (> 200)');

    // ---- JSON-LD
    let graph;
    try {
      graph = JSON.parse(JSON.stringify(buildGraph(meta, page)));
    } catch (e) { err(tag + 'el JSON-LD no sobrevive a JSON.parse: ' + e.message); continue; }
    if (graph['@context'] !== 'https://schema.org') err(tag + '@context debe ser https://schema.org');
    const nodes = graph['@graph'];
    if (!Array.isArray(nodes) || !nodes.length) { err(tag + '@graph vacío'); continue; }

    const ids = new Set();
    let pageNodes = 0, crumbs = 0;
    nodes.forEach((n, i) => {
      const nt = types(n);
      if (!nt.length) err(tag + 'nodo ' + i + ' sin @type');
      if (!n['@id']) err(tag + 'nodo ' + i + ' (' + nt.join('/') + ') sin @id');
      else if (ids.has(n['@id'])) err(tag + '@id repetido: ' + n['@id']); else ids.add(n['@id']);
      if (n['@id'] && n['@id'].indexOf(SITE + '/') !== 0) err(tag + '@id fuera del dominio: ' + n['@id']);
      if (nt.some((x) => PAGE_TYPES.indexOf(x) >= 0)) pageNodes++;
      if (nt.indexOf('BreadcrumbList') >= 0) crumbs++;
      // "url" absolutas en el dominio
      if (typeof n.url === 'string' && n.url.indexOf(SITE + '/') !== 0) err(tag + n['@id'] + ' url fuera del dominio: ' + n.url);
    });
    if (pageNodes !== 1) err(tag + 'debe haber exactamente UN nodo WebPage/AboutPage/ContactPage (hay ' + pageNodes + ')');
    if (crumbs !== 1) err(tag + 'debe haber exactamente UNA BreadcrumbList (hay ' + crumbs + ')');
    if (!nodes.some((n) => types(n).indexOf('Organization') >= 0)) err(tag + 'falta Organization');
    if (!nodes.some((n) => types(n).indexOf('WebSite') >= 0)) err(tag + 'falta WebSite');
    // Un @id definido ANIDADO (p. ej. el ImageObject dentro de "logo") también
    // es un nodo del grafo y se puede referenciar: se recogen todos.
    walk(graph, (obj) => { if (obj['@id'] && Object.keys(obj).length > 1) ids.add(obj['@id']); });

    // Recorrido: obligatorias por tipo, prohibidas, referencias
    walk(graph, (obj, p) => {
      Object.keys(obj).forEach((k) => {
        if (FORBIDDEN.indexOf(k) >= 0) err(tag + 'propiedad prohibida "' + k + '" en ' + p + ' (dato no confirmado)');
      });
      const nt = types(obj);
      nt.forEach((ty) => {
        (REQUIRED[ty] || []).forEach((req) => { if (obj[req] === undefined || obj[req] === '') err(tag + ty + ' en ' + p + ' sin "' + req + '"'); });
      });
      // referencia {"@id": ...} sola → tiene que existir en el grafo
      const keys = Object.keys(obj);
      if (keys.length === 1 && keys[0] === '@id' && !ids.has(obj['@id'])) err(tag + 'referencia a un @id que no está en el grafo: ' + obj['@id'] + ' (' + p + ')');
      if (nt.indexOf('BreadcrumbList') >= 0) {
        const items = obj.itemListElement || [];
        items.forEach((it, i) => {
          if (it['@type'] !== 'ListItem') err(tag + 'breadcrumb ' + i + ' no es ListItem');
          if (it.position !== i + 1) err(tag + 'breadcrumb ' + i + ' position debe ser ' + (i + 1));
          if (!it.name) err(tag + 'breadcrumb ' + i + ' sin name');
          // El último elemento puede ir sin "item" (Google lo permite); los demás no.
          if (i < items.length - 1 && !it.item) err(tag + 'breadcrumb ' + i + ' sin item');
        });
      }
    });

    // Reglas concretas de este sitio
    if (page.file === 'index.html') {
      const org = nodes[0];
      if (types(org).indexOf('ProfessionalService') < 0) err(tag + 'la Organization de la home debe ser también ProfessionalService');
      const a = org.address || {};
      if (a.addressLocality !== 'Barcelona' || a.addressCountry !== 'ES') err(tag + 'address debe ser Barcelona / ES');
      const services = nodes.filter((n) => types(n).indexOf('Service') >= 0);
      if (services.length !== 5) err(tag + 'la home debe llevar 5 Service (hay ' + services.length + ')');
      services.forEach((s) => { if (!s.provider || s.provider['@id'] !== org['@id']) err(tag + 'Service ' + s.name + ' sin provider = organización'); });
    } else if (nodes[0].address) {
      warn(tag + 'address fuera de la home (no hace falta repetirla)');
    }
    if (page.file === 'panel.html' && !nodes.some((n) => types(n).indexOf('WebApplication') >= 0)) err(tag + 'panel.html debe llevar WebApplication');
  }
  return { errors, warnings };
}

module.exports = { loadMeta, buildGraph, validate, META_FILE, PROJECT };

if (require.main === module) {
  const { SITE } = require(path.join(__dirname, '..', 'seo-inject.js'));
  const meta = loadMeta(SITE);
  const { errors, warnings } = validate(meta, SITE);
  meta.pages.forEach((p) => {
    console.log(p.file.padEnd(17) + ' título ' + String(Array.from(p.title).length).padStart(2) + '/60  descripción ' + String(Array.from(p.description).length).padStart(3) + '/155  nodos: ' +
      buildGraph(meta, p)['@graph'].map((n) => (Array.isArray(n['@type']) ? n['@type'].join('+') : n['@type'])).join(', '));
  });
  warnings.forEach((w) => console.log('AVISO ' + w));
  errors.forEach((e) => console.log('ERROR ' + e));
  console.log(errors.length ? 'FALLO: ' + errors.length + ' error(es)' : 'OK: meta.json válido (' + meta.pages.length + ' páginas, ' + warnings.length + ' aviso(s))');
  process.exit(errors.length ? 1 : 0);
}
