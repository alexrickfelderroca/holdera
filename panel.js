/* ==========================================================================
   HOLDERA — panel de demostración · comportamiento
   Vanilla JS, sin dependencias. Un solo objeto de estado (S) persistido en
   localStorage ("holdera-panel-demo"), vistas por hash, gráficas SVG dibujadas
   a mano, temporizadores que se paran cuando la pestaña no se ve.
   Todo lo que "responde" aquí es una simulación local: no hay ningún modelo
   detrás ni ninguna petición de red.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.PANEL_DATA;
  if (!D) return;

  const KEY = 'holdera-panel-demo';
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = (p) => (p || 'x') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  /* ---------- iconos: rejilla de 20px, trazo 1.5, extremos redondos ---------- */
  const I = {
    home: '<path d="M3.5 9.5 10 4l6.5 5.5"/><path d="M5.5 8.5V16h9V8.5"/><path d="M8.5 16v-4h3v4"/>',
    users: '<circle cx="8" cy="7" r="2.75"/><path d="M3.5 16c0-2.5 2-4.25 4.5-4.25S12.5 13.5 12.5 16"/><path d="M13 7.25a2.25 2.25 0 0 1 0 4.5"/><path d="M14.5 12.25c1.5.5 2.5 1.8 2.5 3.75"/>',
    inbox: '<path d="M3.5 11.5h3.75l1 2h3.5l1-2h3.75"/><path d="M5 4.5h10l1.5 7v4h-13v-4z"/>',
    calendar: '<rect x="3.5" y="4.5" width="13" height="12" rx="2.5"/><path d="M3.5 8.5h13M7 3v3M13 3v3"/>',
    euro: '<path d="M14 5.5A5 5 0 0 0 5.5 10a5 5 0 0 0 8.5 4.5"/><path d="M3.5 8.75h7M3.5 11.25h7"/>',
    megaphone: '<path d="M4 8.5v3l7 2.5v-8z"/><path d="M11 6.5c2 .5 3 1.5 3 3.5s-1 3-3 3.5"/><path d="M5.5 11.5l1 4.5h2l-.5-4"/>',
    globe: '<circle cx="10" cy="10" r="6.5"/><path d="M3.5 10h13M10 3.5c2 2 2 11 0 13M10 3.5c-2 2-2 11 0 13"/>',
    nodes: '<circle cx="10" cy="10" r="2.25"/><circle cx="4.5" cy="5" r="1.75"/><circle cx="15.5" cy="5" r="1.75"/><circle cx="4.5" cy="15" r="1.75"/><circle cx="15.5" cy="15" r="1.75"/><path d="M6 6.2l2.4 2.2M14 6.2l-2.4 2.2M6 13.8l2.4-2.2M14 13.8l-2.4-2.2"/>',
    plug: '<path d="M7 3.5v3.5M13 3.5v3.5"/><path d="M5 7h10v2.5a5 5 0 0 1-10 0z"/><path d="M10 14.5V17"/>',
    sparkle: '<path d="M10 3.5l1.6 4.4 4.4 1.6-4.4 1.6L10 15.5l-1.6-4.4L4 9.5l4.4-1.6z"/><path d="M15.5 14l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"/>',
    bell: '<path d="M6 13.5V9a4 4 0 0 1 8 0v4.5l1.25 1.5H4.75z"/><path d="M8.5 16.5a1.5 1.5 0 0 0 3 0"/>',
    search: '<circle cx="9" cy="9" r="5"/><path d="M12.75 12.75 16.5 16.5"/>',
    plus: '<path d="M10 4.5v11M4.5 10h11"/>',
    check: '<path d="M4.5 10.5 8.5 14.5 15.5 6"/>',
    x: '<path d="M5.5 5.5l9 9M14.5 5.5l-9 9"/>',
    edit: '<path d="M12.5 4.5l3 3L8 15H5v-3z"/><path d="M11 6l3 3"/>',
    trash: '<path d="M4.5 6h11M8 6V4.5h4V6"/><path d="M6 6l.75 10h6.5L14 6"/>',
    chevron: '<path d="M7 5.5l4.5 4.5L7 14.5"/>',
    chevronD: '<path d="M5.5 7.5 10 12l4.5-4.5"/>',
    dots: '<circle cx="5" cy="10" r="1"/><circle cx="10" cy="10" r="1"/><circle cx="15" cy="10" r="1"/>',
    whatsapp: '<path d="M4 16l1-3.2A6.5 6.5 0 1 1 7.5 15z"/><path d="M8 8.5c0 2 1.5 3.5 3.5 3.5l.75-1-1.25-.75-.5.5c-.5-.25-1-.75-1.25-1.25l.5-.5L9 7.75z"/>',
    instagram: '<rect x="4" y="4" width="12" height="12" rx="3.5"/><circle cx="10" cy="10" r="2.75"/><circle cx="13.4" cy="6.6" r=".6" fill="currentColor"/>',
    email: '<rect x="3.5" y="5" width="13" height="10" rx="2"/><path d="M4 6l6 4.5L16 6"/>',
    web: '<rect x="3.5" y="4" width="13" height="12" rx="2"/><path d="M3.5 7.5h13M6.5 10.5h4M6.5 13h7"/>',
    llamada: '<path d="M5 4.5h2.5l1.25 3-1.5 1a7 7 0 0 0 4.25 4.25l1-1.5 3 1.25V15a1.5 1.5 0 0 1-1.5 1.5A10.5 10.5 0 0 1 3.5 6 1.5 1.5 0 0 1 5 4.5z"/>',
    invoice: '<path d="M5.5 3.5h7l3 3v10h-10z"/><path d="M12.5 3.5v3h3M8 10h4M8 13h4"/>',
    star: '<path d="M10 3.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L10 13.3l-3.8 2 .7-4.3-3.1-3 4.3-.6z"/>',
    clock: '<circle cx="10" cy="10" r="6.5"/><path d="M10 6.5V10l2.5 1.5"/>',
    arrow: '<path d="M4 10h12M11 5l5 5-5 5"/>',
    back: '<path d="M16 10H4M9 5l-5 5 5 5"/>',
    refresh: '<path d="M16 10a6 6 0 0 1-10.5 4M4 10a6 6 0 0 1 10.5-4"/><path d="M14.5 3.5v2.5H12M5.5 16.5V14H8"/>',
    pause: '<path d="M7 5v10M13 5v10"/>',
    play: '<path d="M7 4.5v11l8-5.5z"/>',
    warn: '<path d="M10 3.5l7 12.5H3z"/><path d="M10 8v3.5M10 13.75v.25"/>',
    info: '<circle cx="10" cy="10" r="6.5"/><path d="M10 9v4M10 7v.25"/>',
    drag: '<circle cx="7.5" cy="6" r="1"/><circle cx="12.5" cy="6" r="1"/><circle cx="7.5" cy="10" r="1"/><circle cx="12.5" cy="10" r="1"/><circle cx="7.5" cy="14" r="1"/><circle cx="12.5" cy="14" r="1"/>',
    sort: '<path d="M7 4.5v11M4.5 13l2.5 2.5L9.5 13M13 15.5v-11M10.5 7 13 4.5 15.5 7"/>',
    export: '<path d="M10 3.5v9M6.5 9l3.5 3.5L13.5 9"/><path d="M4 13.5v2.5h12v-2.5"/>',
    filter: '<path d="M3.5 5h13l-5 6v4l-3 1.5V11z"/>',
    send: '<path d="M3.5 10 16.5 4l-3 12-4-4.5z"/><path d="M9.5 11.5 16.5 4"/>',
    list: '<path d="M4 6h12M4 10h12M4 14h12"/>',
    kanban: '<rect x="3.5" y="4" width="4" height="12" rx="1"/><rect x="8.5" y="4" width="4" height="8" rx="1"/><rect x="13.5" y="4" width="3" height="10" rx="1"/>',
    palette: '<circle cx="10" cy="10" r="6.5"/><circle cx="7.25" cy="8" r=".8" fill="currentColor"/><circle cx="10.75" cy="6.75" r=".8" fill="currentColor"/><circle cx="13.25" cy="9.5" r=".8" fill="currentColor"/><path d="M10 16.5c-1.25-1-1-2.75.5-3h1.75a2 2 0 0 0 .25-4"/>',
    external: '<path d="M8 4.5H4.5v11h11V12"/><path d="M11 4.5h4.5V9M15.5 4.5 9.5 10.5"/>',
    more: '<circle cx="10" cy="5" r="1"/><circle cx="10" cy="10" r="1"/><circle cx="10" cy="15" r="1"/>',
    lead: '<circle cx="10" cy="7" r="2.75"/><path d="M4.5 16.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/>',
    bolt: '<path d="M11 3.5 5 11h4.5l-.5 5.5 6-7.5h-4.5z"/>',
    crm: '<rect x="3.5" y="4.5" width="13" height="11" rx="2"/><path d="M3.5 8.5h13M7.5 8.5v7"/>',
    gastos: '<path d="M4 6.5h12v9H4z"/><path d="M4 9.5h12M7 13h2"/>',
    telefono: '<path d="M5 4.5h2.5l1.25 3-1.5 1a7 7 0 0 0 4.25 4.25l1-1.5 3 1.25V15a1.5 1.5 0 0 1-1.5 1.5A10.5 10.5 0 0 1 3.5 6 1.5 1.5 0 0 1 5 4.5z"/>'
  };
  const ico = (n, cls) => '<svg class="pn-ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (I[n] || '') + '</svg>';

  /* ---------- formato es-ES ---------- */
  const nfEur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' });
  const nfEur0 = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0, useGrouping: 'always' });
  const nfNum = new Intl.NumberFormat('es-ES', { useGrouping: 'always' });
  const nfDec2 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nfDec = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nfPct = new Intl.NumberFormat('es-ES', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const eur = (n) => nfEur.format(n || 0);
  const eur0 = (n) => nfEur0.format(Math.round(n || 0));
  const num = (n) => nfNum.format(Math.round(n || 0));
  const dec1 = (n) => nfDec.format(n || 0);
  const pct = (x) => (x > 0 ? '+' : '') + nfPct.format(x || 0);
  const compact = (n) => Math.abs(n) >= 1000 ? dec1(n / 1000).replace(',0', '') + ' k' : num(n);
  const hhmm = (d) => new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(d);
  const dayShort = (d) => new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric' }).format(d).replace(',', '').replace('.', '');
  const dayLong = (d) => new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(d).replace(',', '');
  const monthShort = (d) => new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(d).replace('.', '');
  const todayLabel = () => 'Hoy, ' + dayLong(new Date());
  function rel(iso) {
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'ahora';
    if (m < 60) return 'hace ' + m + ' min';
    const h = Math.round(m / 60);
    if (h < 24) return 'hace ' + h + ' h';
    const d = Math.round(h / 24);
    if (d === 1) return 'ayer';
    return 'hace ' + d + ' días';
  }
  const WEEKDAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  const DAY = 86400000;
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const mondayOf = (d) => { const x = startOfDay(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();
  const initials = (name) => name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const CH_LABEL = { whatsapp: 'WhatsApp', instagram: 'Instagram', web: 'Formulario web', email: 'Email', llamada: 'Llamada' };
  const CH_SHORT = { whatsapp: 'WhatsApp', instagram: 'Instagram', web: 'Web', email: 'Email', llamada: 'Llamada' };
  const CH_SLOT = { whatsapp: 1, instagram: 2, web: 3, email: 4, llamada: 5 };
  const STAGE_LABEL = { nuevo: 'Nuevo', contactado: 'Contactado', reunion: 'Reunión', propuesta: 'Propuesta', cerrado: 'Cerrado' };

  /* ---------- estado ---------- */
  let S = null;
  let view = 'resumen';
  const charts = [];
  let saveT = null;
  function load() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { saved = null; }
    if (saved && saved.v === 3 && saved.company && sameDay(new Date(saved.createdAt), new Date())) return saved;
    if (saved && saved.company) return D.buildState(saved.company.sector, { companyName: saved.company.name, highlight: saved.company.highlight });
    return D.buildState('b2b');
  }
  function save() {
    S.updatedAt = new Date().toISOString();
    clearTimeout(saveT);
    saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sin almacenamiento: la demo sigue en memoria */ } }, 120);
  }
  function commit(fn, o) {
    o = o || {};
    fn(S);
    save();
    if (!o.silent) render({ animate: false });
    if (o.toast) toast(o.toast, o.kind);
  }
  const preset = () => D.PRESETS[S.company.sector] || D.PRESETS.b2b;
  const leadWord = (plural) => { const p = preset(); return plural ? p.leadWordPlural : p.leadWord; };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  /* ---------- derivados ---------- */
  const thisMonth = () => S.finance.months[11];
  const prevMonth = () => S.finance.months[10];
  const delta = (a, b) => b ? (a - b) / b : 0;
  const leadsNew = () => S.kpi.leadsBase + S.leads.filter((l) => l.added).length;
  const automatedToday = () => S.automations.rules.reduce((s, r) => s + r.runsToday, 0);
  const hoursSaved = () => S.automations.rules.reduce((s, r) => s + r.runsMonth * r.minPerRun, 0) / 60;
  const activeLeads = () => S.leads.filter((l) => l.stage !== 'cerrado');
  const waitingThreads = () => S.threads.filter((t) => t.status === 'aprobacion' || t.unread);
  const weekEvents = (offset) => { const m = mondayOf(new Date()); m.setDate(m.getDate() + 7 * (offset || 0)); const e = new Date(m.getTime() + 7 * DAY); return S.events.filter((ev) => { const t = new Date(ev.start); return t >= m && t < e; }); };
  const byChannel = () => { const c = Object.assign({}, S.kpi.byChannel); S.leads.forEach((l) => { if (l.added) c[l.channel] = (c[l.channel] || 0) + 1; }); return c; };
  const expensesTotal = () => S.finance.expenses.reduce((s, e) => s + (+e.importe || 0), 0);
  const q = () => norm(S.ui.query || '');
  const hit = (str) => !q() || norm(str).indexOf(q()) >= 0;

  /* ---------- utilidades DOM ---------- */
  function toast(text, kind) {
    const box = $('[data-toasts]');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'pn-toast' + (kind ? ' pn-toast--' + kind : '');
    el.innerHTML = '<span class="pn-toast__ico">' + ico(kind === 'warn' ? 'warn' : 'check') + '</span><span>' + esc(text) + '</span>';
    box.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-in'));
    setTimeout(() => { el.classList.remove('is-in'); setTimeout(() => el.remove(), 300); }, 3800);
  }
  function log(kind, text, o) {
    o = o || {};
    S.feed.unshift({ id: uid('n'), at: new Date().toISOString(), kind, text });
    if (S.feed.length > 40) S.feed.length = 40;
    if (o.notify) S.notifications.unshift({ id: uid('v'), at: new Date().toISOString(), text, read: false });
    S.updatedAt = new Date().toISOString();
  }
  function bump(ruleName) {
    const r = S.automations.rules.find((x) => x.name === ruleName) || S.automations.rules[0];
    if (r && r.on) { r.runsToday += 1; r.runsMonth += 1; r.lastAt = new Date().toISOString(); }
  }

  /* tooltip único, compartido por gráficas y por [data-tip] */
  const tip = { el: null };
  function showTip(x, y, html, below) {
    if (!tip.el) tip.el = $('[data-tip]');
    const t = tip.el; if (!t) return;
    t.innerHTML = html;
    t.hidden = false;
    const r = t.getBoundingClientRect();
    const left = clamp(x - r.width / 2, 8, window.innerWidth - r.width - 8);
    const top = below ? y + 12 : y - r.height - 12;
    t.style.transform = 'translate(' + Math.round(left) + 'px,' + Math.round(clamp(top, 8, window.innerHeight - r.height - 8)) + 'px)';
    t.classList.add('is-in');
  }
  function hideTip() { if (tip.el) { tip.el.classList.remove('is-in'); tip.el.hidden = true; } }
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest && e.target.closest('[data-tiptext]');
    if (!el) return;
    const r = el.getBoundingClientRect();
    showTip(r.left + r.width / 2, r.top, esc(el.getAttribute('data-tiptext')));
  });
  document.addEventListener('pointerout', (e) => { if (e.target.closest && e.target.closest('[data-tiptext]')) hideTip(); });
  document.addEventListener('focusin', (e) => {
    const el = e.target.closest && e.target.closest('[data-tiptext]');
    if (!el) return;
    const r = el.getBoundingClientRect();
    showTip(r.left + r.width / 2, r.top, esc(el.getAttribute('data-tiptext')));
  });
  document.addEventListener('focusout', (e) => { if (e.target.closest && e.target.closest('[data-tiptext]')) hideTip(); });

  /* popovers: uno a la vez, Escape cierra, el foco vuelve al ancla */
  const pop = { el: null, anchor: null, onClose: null };
  function closePopover() {
    if (!pop.el) return;
    const a = pop.anchor;
    pop.el.remove(); pop.el = null;
    if (a && a.setAttribute) a.setAttribute('aria-expanded', 'false');
    if (pop.onClose) pop.onClose();
    pop.onClose = null;
    if (a && a.focus && document.contains(a)) a.focus({ preventScroll: true });
    pop.anchor = null;
    document.removeEventListener('pointerdown', onDocDown, true);
  }
  function onDocDown(e) { if (pop.el && !pop.el.contains(e.target) && !(pop.anchor && pop.anchor.contains && pop.anchor.contains(e.target))) closePopover(); }
  function openPopover(o) {
    closePopover();
    const layer = $('[data-layer]');
    const el = document.createElement('div');
    el.className = 'pn-popover' + (o.cls ? ' ' + o.cls : '');
    el.setAttribute('role', o.role || 'dialog');
    if (o.label) el.setAttribute('aria-label', o.label);
    el.innerHTML = o.html;
    layer.appendChild(el);
    pop.el = el; pop.anchor = o.anchor; pop.onClose = o.onClose || null;
    if (o.anchor && o.anchor.setAttribute) o.anchor.setAttribute('aria-expanded', 'true');
    const r = o.rect || o.anchor.getBoundingClientRect();
    const w = el.offsetWidth, h = el.offsetHeight;
    let left = o.align === 'right' ? r.right - w : r.left;
    let top = r.bottom + 8;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
    left = clamp(left, 8, window.innerWidth - w - 8);
    el.style.left = Math.round(left) + 'px';
    el.style.top = Math.round(top) + 'px';
    requestAnimationFrame(() => el.classList.add('is-in'));
    if (o.bind) o.bind(el);
    const f = el.querySelector('[autofocus], input, select, textarea, button, [tabindex="0"]');
    if (f) f.focus({ preventScroll: true });
    setTimeout(() => document.addEventListener('pointerdown', onDocDown, true), 0);
    return el;
  }

  /* ---------- gráficas (SVG a mano) ---------- */
  function niceMax(v) {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return step * p;
  }
  function ticks(max, n) { const out = []; for (let i = 0; i <= n; i++) out.push(max * i / n); return out; }
  const topRound = (x, y, w, h, r) => {
    r = Math.min(r, w / 2, h);
    if (h <= 0) return '';
    return 'M' + x + ' ' + (y + h) + 'V' + (y + r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' -' + r + 'h' + (w - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + r + 'V' + (y + h) + 'z';
  };
  const rightRound = (x, y, w, h, r) => {
    r = Math.min(r, h / 2, w);
    if (w <= 0) return '';
    return 'M' + x + ' ' + y + 'h' + (w - r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + r + 'v' + (h - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 -' + r + ' ' + r + 'H' + x + 'z';
  };
  function fmtVal(v, o) { return o.money ? (o.money === 'cents' ? eur(v) : eur0(v)) : o.unit ? dec1(v) + ' ' + o.unit : num(v); }
  function legend(series, kind) {
    if (series.length < 2) return '';
    return '<ul class="viz__legend" aria-label="Leyenda">' + series.map((s) => '<li><span class="viz__swatch viz__swatch--' + (kind || 'rect') + '" style="--c:var(' + s.color + ')"></span>' + esc(s.name) + '</li>').join('') + '</ul>';
  }
  function tableView(labels, series, o) {
    return '<details class="viz__table"><summary>Ver como tabla</summary><div class="pn-scroll"><table class="pn-table pn-table--mini"><thead><tr><th scope="col"></th>' + series.map((s) => '<th scope="col">' + esc(s.name) + '</th>').join('') + '</tr></thead><tbody>' +
      labels.map((l, i) => '<tr><th scope="row">' + esc(l) + '</th>' + series.map((s) => '<td>' + (s.values[i] == null ? '—' : fmtVal(s.values[i], o)) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div></details>';
  }

  /* barras agrupadas (o una serie). series: [{name, values, color:'--pn-s1'}] */
  function barsChart(el, o, animate) {
    const W = Math.max(240, el.clientWidth), H = o.h || 240;
    const pad = { l: 46, r: 8, t: 14, b: 26 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    const all = [].concat.apply([], o.series.map((s) => s.values)).filter((v) => v != null);
    const max = niceMax(Math.max.apply(null, all.concat([1])));
    const n = o.labels.length, gw = pw / n;
    const bw = Math.min(24, Math.max(6, (gw * 0.62 - 2 * (o.series.length - 1)) / o.series.length));
    const groupW = bw * o.series.length + 2 * (o.series.length - 1);
    let g = '';
    ticks(max, 4).forEach((t) => {
      const y = pad.t + ph - t / max * ph;
      g += '<line class="viz__grid" x1="' + pad.l + '" x2="' + (pad.l + pw) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>';
      g += '<text class="viz__tick" x="' + (pad.l - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + esc(o.money ? compact(t) : num(t)) + '</text>';
    });
    let bars = '';
    o.labels.forEach((lab, i) => {
      const x0 = pad.l + i * gw + (gw - groupW) / 2;
      const desc = o.series.map((s) => s.name + ' ' + (s.values[i] == null ? 'sin datos' : fmtVal(s.values[i], o))).join(', ');
      bars += '<g class="viz__group" tabindex="0" role="img" aria-label="' + esc(lab + ': ' + desc) + '" data-i="' + i + '">';
      bars += '<rect class="viz__hit" x="' + (pad.l + i * gw).toFixed(1) + '" y="' + pad.t + '" width="' + gw.toFixed(1) + '" height="' + ph + '"/>';
      o.series.forEach((s, k) => {
        const v = s.values[i];
        if (v == null) return;
        const h = v / max * ph;
        const x = x0 + k * (bw + 2);
        bars += '<path class="viz__bar' + (animate ? ' is-anim' : '') + '" style="--c:var(' + s.color + ');--i:' + (i * o.series.length + k) + '" d="' + topRound(x, pad.t + ph - h, bw, h, 4) + '"/>';
      });
      bars += '<text class="viz__tick" x="' + (pad.l + i * gw + gw / 2).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(lab) + '</text>';
      bars += '</g>';
    });
    el.innerHTML = '<svg class="viz" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="group" aria-label="' + esc(o.title || '') + '">' + g + '<line class="viz__axis" x1="' + pad.l + '" x2="' + (pad.l + pw) + '" y1="' + (pad.t + ph) + '" y2="' + (pad.t + ph) + '"/>' + bars + '</svg>' + legend(o.series) + tableView(o.labels, o.series, o);
    const onHover = (grp, ev) => {
      const i = +grp.getAttribute('data-i');
      const r = grp.querySelector('.viz__hit').getBoundingClientRect();
      const rows = o.series.map((s) => '<div class="pn-tip__row"><i class="viz__swatch viz__swatch--line" style="--c:var(' + s.color + ')"></i><strong>' + (s.values[i] == null ? '—' : esc(fmtVal(s.values[i], o))) + '</strong><span>' + esc(s.name) + '</span></div>').join('');
      showTip(r.left + r.width / 2, r.top, '<div class="pn-tip__head">' + esc(o.labels[i]) + '</div>' + rows);
    };
    $$('.viz__group', el).forEach((grp) => {
      grp.addEventListener('pointerenter', (ev) => onHover(grp, ev));
      grp.addEventListener('pointerleave', hideTip);
      grp.addEventListener('focus', (ev) => onHover(grp, ev));
      grp.addEventListener('blur', hideTip);
    });
    if (animate) requestAnimationFrame(() => requestAnimationFrame(() => $$('.is-anim', el).forEach((b) => b.classList.add('is-in'))));
    else $$('.viz__bar', el).forEach((b) => b.classList.add('is-in'));
  }

  /* barras horizontales, una serie nominal */
  function hbarsChart(el, o, animate) {
    const W = Math.max(240, el.clientWidth);
    const rowH = 30, pad = { l: Math.min(200, Math.round(W * 0.38)), r: 56, t: 6, b: 6 };
    const H = pad.t + pad.b + rowH * o.labels.length;
    const pw = W - pad.l - pad.r;
    const max = niceMax(Math.max.apply(null, o.values.concat([1])));
    let rows = '';
    o.labels.forEach((lab, i) => {
      const y = pad.t + i * rowH + 4, h = 18, w = o.values[i] / max * pw;
      rows += '<g class="viz__group" tabindex="0" role="img" aria-label="' + esc(lab + ': ' + fmtVal(o.values[i], o)) + '" data-i="' + i + '">';
      rows += '<rect class="viz__hit" x="0" y="' + (pad.t + i * rowH) + '" width="' + W + '" height="' + rowH + '"/>';
      rows += '<text class="viz__tick viz__tick--row" x="' + (pad.l - 10) + '" y="' + (y + 13) + '" text-anchor="end">' + esc(lab.length > 30 ? lab.slice(0, 29) + '…' : lab) + '</text>';
      rows += '<path class="viz__bar viz__bar--h' + (animate ? ' is-anim' : '') + '" style="--c:var(' + (o.colors ? o.colors[i] : '--pn-s1') + ');--i:' + i + '" d="' + rightRound(pad.l, y, Math.max(2, w), h, 4) + '"/>';
      rows += '<text class="viz__tick viz__tick--val" x="' + (pad.l + w + 8).toFixed(1) + '" y="' + (y + 13) + '">' + esc(fmtVal(o.values[i], o)) + '</text>';
      rows += '</g>';
    });
    el.innerHTML = '<svg class="viz" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="group" aria-label="' + esc(o.title || '') + '">' + rows + '</svg>';
    $$('.viz__group', el).forEach((grp) => {
      const f = () => { const i = +grp.getAttribute('data-i'); const r = grp.getBoundingClientRect(); showTip(r.left + r.width / 2, r.top, '<div class="pn-tip__head">' + esc(o.labels[i]) + '</div><div class="pn-tip__row"><strong>' + esc(fmtVal(o.values[i], o)) + '</strong><span>' + esc(o.valueName || '') + '</span></div>'); };
      grp.addEventListener('pointerenter', f); grp.addEventListener('focus', f);
      grp.addEventListener('pointerleave', hideTip); grp.addEventListener('blur', hideTip);
    });
    if (animate) requestAnimationFrame(() => requestAnimationFrame(() => $$('.is-anim', el).forEach((b) => b.classList.add('is-in'))));
    else $$('.viz__bar', el).forEach((b) => b.classList.add('is-in'));
  }

  /* líneas / áreas con cruceta. series: [{name, values, color, area, kind:'line'|'bars'}] */
  function lineChart(el, o, animate) {
    const W = Math.max(240, el.clientWidth), H = o.h || 220;
    const pad = { l: 46, r: 12, t: 14, b: 26 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    const all = [].concat.apply([], o.series.map((s) => s.values)).filter((v) => v != null);
    const max = niceMax(Math.max.apply(null, all.concat([1])));
    const n = o.labels.length;
    const X = (i) => pad.l + (n === 1 ? pw / 2 : i / (n - 1) * pw);
    const Y = (v) => pad.t + ph - v / max * ph;
    let g = '';
    ticks(max, 4).forEach((t) => {
      const y = Y(t);
      g += '<line class="viz__grid" x1="' + pad.l + '" x2="' + (pad.l + pw) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>';
      g += '<text class="viz__tick" x="' + (pad.l - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + esc(o.money ? compact(t) : compact(t)) + '</text>';
    });
    const every = Math.max(1, Math.ceil(n / Math.max(3, Math.floor(pw / 56))));
    const labIdx = o.labels.map((_, i) => i).filter((i) => i % every === 0); if (n > 1 && (n - 1) - labIdx[labIdx.length - 1] < every * 0.75) labIdx.pop(); if (n > 1 && labIdx[labIdx.length - 1] !== n - 1) labIdx.push(n - 1);
    o.labels.forEach((lab, i) => { if (labIdx.indexOf(i) < 0) return; g += '<text class="viz__tick" x="' + X(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="' + (i === n - 1 && n > 4 ? 'end' : i === 0 ? 'start' : 'middle') + '">' + esc(lab) + '</text>'; });
    let marks = '';
    o.series.forEach((s, k) => {
      if (s.kind === 'bars') {
        const bw = Math.min(24, Math.max(4, pw / n * 0.58));
        s.values.forEach((v, i) => { if (v == null) return; const h = v / max * ph; marks += '<path class="viz__bar' + (animate ? ' is-anim' : '') + '" style="--c:var(' + s.color + ');--i:' + i + '" d="' + topRound(X(i) - bw / 2, Y(v), bw, h, 4) + '"/>'; });
        return;
      }
      let d = '', first = true;
      s.values.forEach((v, i) => { if (v == null) { first = true; return; } d += (first ? 'M' : 'L') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); first = false; });
      if (s.area) {
        const idx = s.values.map((v, i) => v == null ? null : i).filter((i) => i != null);
        if (idx.length) marks += '<path class="viz__area' + (animate ? ' is-anim' : '') + '" style="--c:var(' + s.color + ')" d="' + d + 'L' + X(idx[idx.length - 1]).toFixed(1) + ' ' + (pad.t + ph) + 'L' + X(idx[0]).toFixed(1) + ' ' + (pad.t + ph) + 'z"/>';
      }
      marks += '<path class="viz__line' + (animate ? ' is-anim' : '') + '" style="--c:var(' + s.color + ')" d="' + d + '"' + (s.dashed ? ' stroke-dasharray="4 5"' : '') + '/>';
      const last = s.values.length - 1;
      if (s.values[last] != null) marks += '<circle class="viz__dot" style="--c:var(' + s.color + ')" cx="' + X(last).toFixed(1) + '" cy="' + Y(s.values[last]).toFixed(1) + '" r="4"/>';
    });
    const hits = o.labels.map((lab, i) => '<rect class="viz__hit" data-i="' + i + '" tabindex="0" role="img" aria-label="' + esc(lab + ': ' + o.series.map((s) => s.name + ' ' + (s.values[i] == null ? 'sin datos' : fmtVal(s.values[i], o))).join(', ')) + '" x="' + (X(i) - pw / n / 2).toFixed(1) + '" y="' + pad.t + '" width="' + (pw / n).toFixed(1) + '" height="' + ph + '"/>').join('');
    el.innerHTML = '<svg class="viz" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="group" aria-label="' + esc(o.title || '') + '">' + g + '<line class="viz__axis" x1="' + pad.l + '" x2="' + (pad.l + pw) + '" y1="' + (pad.t + ph) + '" y2="' + (pad.t + ph) + '"/>' + marks + '<line class="viz__cross" x1="0" x2="0" y1="' + pad.t + '" y2="' + (pad.t + ph) + '" hidden/><g class="viz__crossdots"></g>' + hits + '</svg>' + legend(o.series, 'line') + tableView(o.labels, o.series, o);
    const svg = $('svg', el), cross = $('.viz__cross', el), dots = $('.viz__crossdots', el);
    const show = (i) => {
      const x = X(i);
      cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.hidden = false;
      dots.innerHTML = o.series.filter((s) => s.kind !== 'bars' && s.values[i] != null).map((s) => '<circle class="viz__dot" style="--c:var(' + s.color + ')" cx="' + x.toFixed(1) + '" cy="' + Y(s.values[i]).toFixed(1) + '" r="4"/>').join('');
      const r = svg.getBoundingClientRect();
      const rows = o.series.map((s) => '<div class="pn-tip__row"><i class="viz__swatch viz__swatch--line" style="--c:var(' + s.color + ')"></i><strong>' + (s.values[i] == null ? '—' : esc(fmtVal(s.values[i], o))) + '</strong><span>' + esc(s.name) + '</span></div>').join('');
      showTip(r.left + x * (r.width / W), r.top + pad.t, '<div class="pn-tip__head">' + esc(o.labels[i]) + '</div>' + rows);
    };
    const hide = () => { cross.hidden = true; dots.innerHTML = ''; hideTip(); };
    svg.addEventListener('pointermove', (e) => { const r = svg.getBoundingClientRect(); const px = (e.clientX - r.left) * (W / r.width); const i = clamp(Math.round((px - pad.l) / pw * (n - 1)), 0, n - 1); show(i); });
    svg.addEventListener('pointerleave', hide);
    $$('.viz__hit', el).forEach((h) => { h.addEventListener('focus', () => show(+h.getAttribute('data-i'))); h.addEventListener('blur', hide); });
    const go = () => $$('.is-anim', el).forEach((p) => { if (p.classList.contains('viz__line')) { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.getBoundingClientRect(); } p.classList.add('is-in'); if (p.classList.contains('viz__line')) p.style.strokeDashoffset = 0; });
    if (animate) requestAnimationFrame(() => requestAnimationFrame(go)); else $$('.viz__bar,.viz__area,.viz__line', el).forEach((p) => p.classList.add('is-in'));
  }

  /* donut con leyenda; slices: [{name, value, color}] */
  function donutChart(el, o, animate) {
    const size = o.size || 176, R = size / 2 - 12, C = 2 * Math.PI * R;
    const total = o.slices.reduce((s, x) => s + x.value, 0) || 1;
    let off = 0, arcs = '';
    o.slices.forEach((s, i) => {
      const len = Math.max(0, s.value / total * C - 2);
      arcs += '<circle class="viz__arc' + (animate ? ' is-anim' : '') + '" tabindex="0" role="img" aria-label="' + esc(s.name + ': ' + num(s.value) + ' (' + nfPct.format(s.value / total) + ')') + '" data-i="' + i + '" style="--c:var(' + s.color + ');--i:' + i + '" r="' + R + '" cx="' + size / 2 + '" cy="' + size / 2 + '" stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '"/>';
      off += s.value / total * C;
    });
    const big = o.slices.slice().sort((a, b) => b.value - a.value)[0];
    el.innerHTML = '<div class="viz-donut"><svg class="viz viz--donut" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" role="group" aria-label="' + esc(o.title || '') + '"><g transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')">' + arcs + '</g><text class="viz__center" x="' + size / 2 + '" y="' + (size / 2 - 2) + '" text-anchor="middle">' + esc(o.centerValue != null ? o.centerValue : num(total)) + '</text><text class="viz__center-sub" x="' + size / 2 + '" y="' + (size / 2 + 16) + '" text-anchor="middle">' + esc(o.centerLabel || '') + '</text></svg>' +
      '<ul class="viz__legend viz__legend--col" aria-label="Leyenda">' + o.slices.map((s) => '<li><span class="viz__swatch" style="--c:var(' + s.color + ')"></span><span class="viz__legend-name">' + esc(s.name) + '</span><span class="viz__legend-val">' + esc(o.money ? eur0(s.value) : num(s.value)) + '</span><span class="viz__legend-pct">' + esc(nfPct.format(s.value / total)) + '</span></li>').join('') + '</ul></div>' +
      (big ? '<p class="viz__note">' + esc(big.name) + ' es el mayor: ' + esc(nfPct.format(big.value / total)) + ' del total.</p>' : '');
    $$('.viz__arc', el).forEach((a) => {
      const f = () => { const i = +a.getAttribute('data-i'); const s = o.slices[i]; const r = el.querySelector('svg').getBoundingClientRect(); showTip(r.left + r.width / 2, r.top + 20, '<div class="pn-tip__head">' + esc(s.name) + '</div><div class="pn-tip__row"><strong>' + esc(o.money ? eur0(s.value) : num(s.value)) + '</strong><span>' + esc(nfPct.format(s.value / total)) + '</span></div>'); };
      a.addEventListener('pointerenter', f); a.addEventListener('focus', f);
      a.addEventListener('pointerleave', hideTip); a.addEventListener('blur', hideTip);
    });
    if (animate) requestAnimationFrame(() => requestAnimationFrame(() => $$('.is-anim', el).forEach((b) => b.classList.add('is-in')))); else $$('.viz__arc', el).forEach((b) => b.classList.add('is-in'));
  }

  /* indicador radial (Core Web Vitals): bueno / mejorable / malo por umbrales */
  function gauge(el, o, animate) {
    const size = 128, R = 48, cx = size / 2, cy = size / 2 + 6;
    const a0 = 135, span = 270;
    const arc = (deg0, deg1) => { const p = (d) => { const r = d * Math.PI / 180; return [cx + R * Math.cos(r), cy + R * Math.sin(r)]; }; const A = p(deg0), B = p(deg1); return 'M' + A[0].toFixed(1) + ' ' + A[1].toFixed(1) + 'A' + R + ' ' + R + ' 0 ' + (deg1 - deg0 > 180 ? 1 : 0) + ' 1 ' + B[0].toFixed(1) + ' ' + B[1].toFixed(1); };
    const frac = clamp((o.value - o.min) / (o.max - o.min), 0, 1);
    const state = o.value <= o.good ? 'good' : o.value <= o.warn ? 'warn' : 'bad';
    const label = { good: 'Bien', warn: 'Mejorable', bad: 'Lento' }[state];
    const color = { good: '--pn-pos', warn: '--pn-warn', bad: '--pn-neg' }[state];
    el.innerHTML = '<figure class="pn-gauge" data-state="' + state + '"><svg viewBox="0 0 ' + size + ' ' + (size + 4) + '" width="' + size + '" height="' + (size + 4) + '" role="img" aria-label="' + esc(o.name + ': ' + o.display + ', ' + label) + '"><path class="pn-gauge__track" d="' + arc(a0, a0 + span) + '"/><path class="pn-gauge__fill' + (animate ? ' is-anim' : '') + '" style="--c:var(' + color + ');--dash:' + frac.toFixed(3) + ' 1" d="' + arc(a0, a0 + span) + '" pathLength="1"/><text class="pn-gauge__val" x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle">' + esc(o.display) + '</text><text class="pn-gauge__name" x="' + cx + '" y="' + (cy + 24) + '" text-anchor="middle">' + esc(o.name) + '</text></svg><figcaption class="pn-gauge__cap"><span class="pn-status pn-status--' + state + '">' + ico(state === 'good' ? 'check' : state === 'warn' ? 'info' : 'warn') + esc(label) + '</span><small>Bueno hasta ' + esc(o.goodLabel) + '</small></figcaption></figure>';
    if (animate) requestAnimationFrame(() => requestAnimationFrame(() => $$('.is-anim', el).forEach((b) => b.classList.add('is-in')))); else $$('.pn-gauge__fill', el).forEach((b) => b.classList.add('is-in'));
  }

  /* miniatura de 12 puntos: línea en el color del texto atenuado, último punto en acento */
  function spark(values, o) {
    o = o || {};
    const w = o.w || 96, h = o.h || 28, p = 3;
    const vals = values.filter((v) => v != null);
    const min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    const n = values.length;
    const X = (i) => p + i / (n - 1) * (w - 2 * p);
    const Y = (v) => max === min ? h / 2 : p + (o.invert ? (v - min) : (max - v)) / (max - min) * (h - 2 * p);
    const d = values.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join('');
    const lx = X(n - 1), ly = Y(values[n - 1]);
    return '<svg class="viz__spark" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true" focusable="false"><path class="viz__spark-line" d="' + d + '"/><circle class="viz__spark-dot" cx="' + lx.toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="3"/></svg>';
  }
  function chart(fn, cfg) { const id = uid('ch'); charts.push({ id, fn, cfg }); return '<div class="viz-slot" data-chart="' + id + '"></div>'; }
  function drawCharts(animate) {
    charts.forEach((c) => { const el = document.querySelector('[data-chart="' + c.id + '"]'); if (el) c.fn(el, c.cfg, animate && !RM); });
  }

  /* ---------- piezas de interfaz ---------- */
  const card = (inner, cls, attrs) => '<section class="pn-card' + (cls ? ' ' + cls : '') + '"' + (attrs || '') + '><div class="pn-card__in">' + inner + '</div></section>';
  const head = (title, right, eyebrow) => '<header class="pn-card__head"><div>' + (eyebrow ? '<p class="pn-eyebrow">' + esc(eyebrow) + '</p>' : '') + '<h2 class="pn-card__title">' + title + '</h2></div>' + (right ? '<div class="pn-card__tools">' + right + '</div>' : '') + '</header>';
  const deltaChip = (x, o) => { o = o || {}; const good = o.invert ? x < 0 : x > 0; const cls = x === 0 ? '' : good ? ' pn-delta--pos' : ' pn-delta--neg'; return '<span class="pn-delta' + cls + '">' + (x === 0 ? '' : ico(x > 0 ? 'arrowUp' : 'arrowUp', x > 0 ? '' : 'is-down')) + esc(pct(x)) + '</span>'; };
  const pill = (status, text) => '<span class="pn-pill" data-status="' + status + '"><i></i>' + esc(text) + '</span>';
  const avatar = (name, ch) => '<span class="pn-avatar" style="--c:var(--pn-s' + (ch ? CH_SLOT[ch] : 1) + ')" aria-hidden="true">' + esc(initials(name)) + '</span>';
  const chIcon = (ch, cls) => '<span class="pn-ch pn-ch--' + ch + (cls ? ' ' + cls : '') + '" style="--c:var(--pn-s' + CH_SLOT[ch] + ')" data-tiptext="' + esc(CH_LABEL[ch]) + '">' + ico(ch) + '<span class="sr-only">' + esc(CH_LABEL[ch]) + '</span></span>';
  const seg = (name, opts, cur) => '<div class="pn-seg" role="group" aria-label="' + esc(name) + '">' + opts.map((o) => '<button type="button" class="pn-seg__btn" aria-pressed="' + (o[0] === cur) + '" data-act="' + o[2] + '" data-val="' + o[0] + '">' + esc(o[1]) + '</button>').join('') + '</div>';
  const empty = (text, ico_) => '<div class="pn-empty">' + ico(ico_ || 'inbox') + '<p>' + esc(text) + '</p></div>';
  const btn = (label, act, o) => { o = o || {}; return '<button type="button" class="btn btn--' + (o.variant || 'secondary') + ' btn--xs' + (o.cls ? ' ' + o.cls : '') + '" data-act="' + act + '"' + (o.id ? ' data-id="' + o.id + '"' : '') + (o.attrs || '') + '>' + (o.icon ? ico(o.icon) : '') + '<span>' + esc(label) + '</span></button>'; };
  const viewHead = (title, sub, right) => '<header class="pn-view__head"><div><h1 class="pn-view__title">' + title + '</h1>' + (sub ? '<p class="pn-view__sub">' + sub + '</p>' : '') + '</div>' + (right ? '<div class="pn-view__actions">' + right + '</div>' : '') + '</header>';
  const feedIcon = { lead: 'lead', calendar: 'calendar', invoice: 'invoice', ads: 'megaphone', review: 'star', whatsapp: 'whatsapp', ok: 'check', web: 'globe', auto: 'bolt', money: 'euro', ia: 'sparkle' };
  const feedItem = (f, fresh) => '<li class="pn-feed__item' + (fresh ? ' is-new' : '') + '"><span class="pn-feed__ico">' + ico(feedIcon[f.kind] || 'bolt') + '</span><div><p class="pn-feed__text">' + esc(f.text) + '</p><time class="pn-feed__time" datetime="' + esc(f.at) + '">' + esc(rel(f.at)) + '</time></div></li>';

  /* ---------- RESUMEN ---------- */
  function rangeData() {
    const tm = thisMonth(), pm = prevMonth();
    const r = S.ui.range;
    if (r === 'semana') {
      const shape = [1.12, 0.96, 1.18, 1.03, 0.91, 0.42, 0.18];
      const dow = (new Date().getDay() + 6) % 7;
      return { labels: ['L', 'M', 'X', 'J', 'V', 'S', 'D'], cur: shape.map((f, i) => i <= dow ? Math.round(tm.ingresos / 22 * f * 100) / 100 : null), prev: shape.map((f) => Math.round(pm.ingresos / 22 * f * 0.94 * 100) / 100), names: ['Esta semana', 'Semana anterior'] };
    }
    if (r === 'trimestre') {
      const m = S.finance.months;
      return { labels: m.slice(9).map((x) => cap(x.label)), cur: m.slice(9).map((x) => x.ingresos), prev: m.slice(6, 9).map((x) => x.ingresos), names: ['Este trimestre', 'Trimestre anterior'] };
    }
    const shape = [0.84, 1.06, 1.12, 0.98];
    const day = new Date().getDate();
    const wk = Math.min(4, Math.ceil(day / 7.5));
    return { labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'], cur: shape.map((f, i) => i < wk ? Math.round(tm.ingresos / 2.6 * f * 100) / 100 : null), prev: shape.map((f) => Math.round(pm.ingresos / 4 * f * 100) / 100), names: ['Este mes', 'Mes anterior'] };
  }
  function rangeNote(rd) {
    const n = rd.cur.filter((v) => v != null).length;
    const cur = rd.cur.slice(0, n).reduce((s, v) => s + (v || 0), 0), prev = rd.prev.slice(0, n).reduce((s, v) => s + (v || 0), 0);
    const d = delta(cur, prev);
    return '<p class="pn-note pn-note--strong">' + (n ? 'A estas alturas del periodo llevas ' + esc(eur0(cur)) + ' frente a ' + esc(eur0(prev)) + ' en el anterior: ' + deltaChip(d) : '') + '</p>';
  }
  function kpiCard(o) {
    return '<article class="pn-card pn-kpi' + (o.hi ? ' pn-kpi--hi' : '') + '"><div class="pn-card__in"><p class="pn-kpi__label">' + esc(o.label) + '</p><p class="pn-kpi__value" data-kpi="' + o.key + '">' + esc(o.value) + '</p><div class="pn-kpi__foot">' + deltaChip(o.delta, { invert: o.invert }) + '<span class="pn-kpi__vs">' + esc(o.vs || 'vs mes anterior') + '</span></div><div class="pn-kpi__spark">' + spark(o.spark) + '</div></div></article>';
  }
  function viewResumen() {
    const tm = thisMonth(), pm = prevMonth();
    const rd = rangeData();
    const hrs = hoursSaved();
    const sparks = S.kpi.sparks;
    const pending = S.approvals.filter((a) => a.status === 'pending' && hit(a.title + ' ' + a.body));
    const feed = S.feed.filter((f) => hit(f.text));
    const bc = byChannel();
    const wk = weekEvents(0);
    const P = preset();
    const kpis = kpiCard({ key: 'ingresos', label: 'Ingresos del mes', value: eur(tm.ingresos), delta: delta(tm.ingresos, pm.ingresos), spark: sparks.ingresos.slice(0, 11).concat([tm.ingresos]), hi: true }) +
      kpiCard({ key: 'leads', label: cap(leadWord(true)) + ' nuevos', value: num(leadsNew()), delta: delta(leadsNew(), S.kpi.leadsLastMonth), spark: sparks.leads.slice(0, 11).concat([leadsNew()]) }) +
      kpiCard({ key: 'tareas', label: 'Tareas automatizadas hoy', value: num(automatedToday()), delta: delta(automatedToday(), S.kpi.automatedYesterday), vs: 'vs ayer', spark: sparks.tareas.slice(0, 11).concat([automatedToday()]) }) +
      kpiCard({ key: 'horas', label: 'Horas ahorradas este mes', value: dec1(hrs) + ' h', delta: delta(hrs, S.kpi.hoursLastMonth), spark: sparks.horas.slice(0, 11).concat([Math.round(hrs * 10) / 10]) });
    return '<div class="pn-view pn-view--resumen">' +
      viewHead('Hola, ' + esc(S.company.user), 'Esto es lo que está pasando en ' + esc(S.company.name) + ' este mes.', '<p class="pn-updated">' + ico('clock') + '<span>Última actualización: <span data-updated>hoy a las ' + esc(hhmm(new Date(S.updatedAt))) + '</span></span></p>') +
      '<div class="pn-kpis">' + kpis + '</div>' +
      '<div class="pn-grid">' +
      card(head('Ingresos: ' + esc(rd.names[0].toLowerCase()) + ' vs ' + esc(rd.names[1].toLowerCase()), seg('Periodo', [['semana', 'Semana', 'range'], ['mes', 'Mes', 'range'], ['trimestre', 'Trimestre', 'range']], S.ui.range), 'Ingresos') + chart(barsChart, { title: 'Ingresos por periodo', labels: rd.labels, series: [{ name: rd.names[0], values: rd.cur, color: '--accent' }, { name: rd.names[1], values: rd.prev, color: '--pn-dim' }], money: true, h: 250 }) + rangeNote(rd), 'span-8') +
      card(head('Necesitan tu aprobación', '<span class="pn-count">' + pending.length + '</span>', 'Pendiente') + (pending.length ? '<ul class="pn-approvals">' + pending.map((a) => '<li class="pn-approval" data-id="' + a.id + '"><span class="pn-approval__ico">' + ico(feedIcon[a.kind === 'factura' ? 'invoice' : a.kind === 'resena' ? 'review' : a.kind] || 'sparkle') + '</span><div class="pn-approval__body"><p class="pn-approval__title">' + esc(a.title) + '</p><p class="pn-approval__text">' + esc(a.body) + '</p><p class="pn-approval__meta">' + esc(a.meta) + '</p><div class="pn-approval__actions">' + btn('Aprobar', 'approve', { variant: 'primary', cls: 'btn--on-dark', id: a.id, icon: 'check' }) + btn('Editar', 'approve-edit', { variant: 'ghost', id: a.id, icon: 'edit' }) + btn('Rechazar', 'reject', { variant: 'ghost', id: a.id, icon: 'x' }) + '</div></div></li>').join('') + '</ul>' : empty('Nada pendiente. Cuando la IA necesite tu visto bueno, aparecerá aquí.', 'check')), 'span-4') +
      card(head('Actividad en directo', '<span class="pn-live" data-live><i></i>En directo</span>', 'Ahora') + '<ol class="pn-feed" data-feed aria-live="polite" aria-relevant="additions">' + feed.slice(0, 8).map((f) => feedItem(f)).join('') + '</ol>', 'span-4') +
      card(head(cap(leadWord(true)) + ' por canal', '', 'Este mes') + chart(donutChart, { title: 'Leads por canal', slices: ['whatsapp', 'instagram', 'web', 'email', 'llamada'].map((c) => ({ name: CH_SHORT[c], value: bc[c] || 0, color: '--pn-s' + CH_SLOT[c] })), centerLabel: leadWord(true) }), 'span-4') +
      '<div class="span-4 pn-bigs">' +
      '<a class="pn-card pn-big" href="#leads"><div class="pn-card__in"><p class="pn-big__num">' + num(activeLeads().length) + ' <small>' + esc(leadWord(true)) + ' activos</small></p><p class="pn-big__sub">' + num(waitingThreads().length) + ' esperan respuesta</p><span class="pn-big__link">Ver el CRM ' + ico('arrow') + '</span></div></a>' +
      '<a class="pn-card pn-big" href="#agenda"><div class="pn-card__in"><p class="pn-big__num">' + num(wk.length) + ' <small>citas esta semana</small></p><p class="pn-big__sub">' + num(wk.filter((e) => !e.confirmed).length) + ' sin confirmar</p><span class="pn-big__link">Abrir la agenda ' + ico('arrow') + '</span></div></a>' +
      '</div></div></div>';
  }

  /* ---------- LEADS (CRM) ---------- */
  function leadsFiltered() {
    return S.leads.filter((l) => (S.ui.leadsChannel === 'todos' || l.channel === S.ui.leadsChannel) && (S.ui.leadsSector === 'todos' || l.sector === S.ui.leadsSector) && hit(l.name + ' ' + l.company + ' ' + l.sector));
  }
  const leadCard = (l) => '<li class="pn-lead" draggable="false" tabindex="0" data-lead="' + l.id + '" data-fk="lead-' + l.id + '" aria-label="' + esc(l.name + ', ' + l.company + ', ' + eur0(l.value)) + '"><div class="pn-lead__top">' + avatar(l.name, l.channel) + '<div class="pn-lead__who"><p class="pn-lead__name">' + esc(l.name) + '</p><p class="pn-lead__org">' + esc(l.company) + '</p></div><button type="button" class="pn-iconbtn pn-iconbtn--sm" data-act="lead-menu" data-id="' + l.id + '" aria-label="Acciones de ' + esc(l.name) + '" aria-haspopup="menu" aria-expanded="false">' + ico('dots') + '</button></div><div class="pn-lead__meta"><span class="pn-tag">' + esc(l.sector) + '</span>' + chIcon(l.channel) + '<span class="pn-score" data-tiptext="Probabilidad de cierre estimada por la IA">IA ' + l.score + '</span></div><div class="pn-lead__foot"><span class="pn-lead__value">' + esc(eur0(l.value)) + '</span><span class="pn-lead__time">' + esc(rel(l.lastAt)) + '</span></div></li>';
  function viewLeads() {
    const list = leadsFiltered();
    const P = preset();
    const total = list.reduce((s, l) => s + l.value, 0);
    const chips = seg('Canal', [['todos', 'Todos', 'leads-ch']].concat(['whatsapp', 'instagram', 'web', 'email', 'llamada'].map((c) => [c, CH_LABEL[c], 'leads-ch'])), S.ui.leadsChannel);
    const sectors = '<label class="pn-field pn-field--inline"><span class="sr-only">' + esc(P.sectorLabel) + '</span><select class="pn-select" data-act="leads-sector"><option value="todos">' + esc(P.sectorLabel) + ': todos</option>' + P.sectors.map((s) => '<option value="' + esc(s) + '"' + (S.ui.leadsSector === s ? ' selected' : '') + '>' + esc(s) + '</option>').join('') + '</select></label>';
    const toolbar = '<div class="pn-toolbar">' + chips + sectors + '<div class="pn-toolbar__right">' + seg('Vista', [['kanban', 'Tablero', 'leads-mode'], ['table', 'Lista', 'leads-mode']], S.ui.leadsMode) + btn('Nuevo ' + leadWord(), 'lead-new', { variant: 'primary', cls: 'btn--on-dark', icon: 'plus' }) + '</div></div>';
    let body;
    if (S.ui.leadsMode === 'table') {
      body = '<div class="pn-scroll">' + (list.length ? '<table class="pn-table"><thead><tr><th scope="col">Nombre</th><th scope="col">' + esc(P.orgLabel) + '</th><th scope="col">' + esc(P.sectorLabel) + '</th><th scope="col">Canal</th><th scope="col">Etapa</th><th scope="col" class="is-num">Valor</th><th scope="col" class="is-num">IA</th><th scope="col">Última actividad</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>' + list.map((l) => '<tr data-lead-row="' + l.id + '"><td><button type="button" class="pn-linkbtn" data-act="lead-open" data-id="' + l.id + '">' + esc(l.name) + '</button></td><td>' + esc(l.company) + '</td><td>' + esc(l.sector) + '</td><td>' + chIcon(l.channel) + '</td><td>' + pill(l.stage, STAGE_LABEL[l.stage]) + '</td><td class="is-num">' + esc(eur0(l.value)) + '</td><td class="is-num">' + l.score + '</td><td>' + esc(rel(l.lastAt)) + '</td><td><button type="button" class="pn-iconbtn pn-iconbtn--sm" data-act="lead-menu" data-id="' + l.id + '" aria-label="Acciones de ' + esc(l.name) + '" aria-haspopup="menu" aria-expanded="false">' + ico('dots') + '</button></td></tr>').join('') + '</tbody></table>' : empty('Ningún ' + leadWord() + ' coincide con el filtro.', 'users')) + '</div>';
    } else {
      body = '<div class="pn-kanban" data-scroll="kanban">' + D.STAGES.map((st) => { const col = list.filter((l) => l.stage === st); const v = col.reduce((s, l) => s + l.value, 0); return '<section class="pn-col" data-stage="' + st + '" aria-label="' + esc(STAGE_LABEL[st]) + '"><header class="pn-col__head"><h2 class="pn-col__title">' + esc(STAGE_LABEL[st]) + ' <span class="pn-col__count">' + col.length + '</span></h2><p class="pn-col__total">' + esc(eur0(v)) + '</p></header><ul class="pn-col__cards">' + (col.length ? col.map(leadCard).join('') : '<li class="pn-col__empty">Sin ' + esc(leadWord(true)) + ' aquí todavía</li>') + '</ul></section>'; }).join('') + '</div>';
    }
    const sel = S.leads.find((l) => l.id === S.ui.selectedLead);
    return '<div class="pn-view pn-view--leads' + (sel ? ' has-detail' : '') + '">' + viewHead('CRM · ' + esc(cap(leadWord(true))), num(list.length) + ' ' + esc(leadWord(true)) + ' · ' + esc(eur0(total)) + ' en juego') + toolbar + '<div class="pn-leads__body"><div class="pn-leads__main">' + body + '</div>' + (sel ? leadDetail(sel) : '') + '</div></div>';
  }
  function leadDetail(l) {
    const P = preset();
    const tl = l.timeline.slice().sort((a, b) => new Date(b.at) - new Date(a.at));
    return '<aside class="pn-detail" data-detail aria-label="Detalle de ' + esc(l.name) + '"><div class="pn-card"><div class="pn-card__in"><header class="pn-detail__head">' + avatar(l.name, l.channel) + '<div><h2 class="pn-detail__name">' + esc(l.name) + '</h2><p class="pn-detail__org">' + esc(l.company) + ' · ' + esc(l.sector) + '</p></div><button type="button" class="pn-iconbtn" data-act="lead-close" aria-label="Cerrar detalle">' + ico('x') + '</button></header>' +
      '<div class="pn-detail__facts"><div><p class="pn-eyebrow">Valor</p><p class="pn-detail__fact">' + esc(eur0(l.value)) + '</p></div><div><p class="pn-eyebrow">Etapa</p><p class="pn-detail__fact">' + pill(l.stage, STAGE_LABEL[l.stage]) + '</p></div><div><p class="pn-eyebrow">Canal</p><p class="pn-detail__fact">' + chIcon(l.channel) + ' ' + esc(CH_LABEL[l.channel]) + '</p></div><div><p class="pn-eyebrow">IA</p><p class="pn-detail__fact">' + l.score + ' <small>/ 100</small></p></div></div>' +
      '<section class="pn-detail__ai"><p class="pn-eyebrow">' + ico('sparkle') + ' Resumen de la IA</p><p>' + esc(l.summary) + '</p><p class="pn-detail__next"><strong>Siguiente paso:</strong> ' + esc(l.next) + '</p></section>' +
      '<div class="pn-detail__actions">' + btn('Programar ' + P.eventTypes.reunion.toLowerCase(), 'lead-meeting', { variant: 'primary', cls: 'btn--on-dark', id: l.id, icon: 'calendar' }) + btn('Redactar respuesta con IA', 'lead-draft', { id: l.id, icon: 'sparkle' }) + '<label class="pn-field pn-field--inline"><span class="sr-only">Mover a</span><select class="pn-select" data-act="lead-stage" data-id="' + l.id + '">' + D.STAGES.map((s) => '<option value="' + s + '"' + (s === l.stage ? ' selected' : '') + '>Mover a: ' + esc(STAGE_LABEL[s]) + '</option>').join('') + '</select></label></div>' +
      '<section><p class="pn-eyebrow">Historial</p><ol class="pn-timeline">' + tl.map((t) => '<li class="pn-tl" data-from="' + t.from + '"><span class="pn-tl__ico">' + ico(t.channel) + '</span><div><p class="pn-tl__text">' + esc(t.text) + '</p><p class="pn-tl__meta">' + esc(t.from === 'ia' ? 'La IA' : t.from === 'tu' ? 'Tú' : l.name.split(' ')[0]) + ' · ' + esc(CH_LABEL[t.channel]) + ' · ' + esc(rel(t.at)) + '</p></div></li>').join('') + '</ol></section></div></div></aside>';
  }
  function moveLead(id, stage, viaText) {
    const l = S.leads.find((x) => x.id === id);
    if (!l || l.stage === stage) return;
    const was = l.stage;
    l.stage = stage; l.lastAt = new Date().toISOString();
    l.timeline.push({ at: l.lastAt, channel: 'web', from: 'tu', text: 'Movido de ' + STAGE_LABEL[was] + ' a ' + STAGE_LABEL[stage] + (viaText ? ' (' + viaText + ')' : '') + '.' });
    if (stage === 'cerrado') { thisMonth().ingresos = Math.round((thisMonth().ingresos + l.value) * 100) / 100; log('money', esc(l.name) + ' cerrado: ' + eur0(l.value) + ' sumados a los ingresos del mes.'); }
    if (was === 'cerrado') { thisMonth().ingresos = Math.round((thisMonth().ingresos - l.value) * 100) / 100; log('lead', l.name + ' reabierto: se retiran ' + eur0(l.value) + ' de los ingresos del mes.'); }
    else log('lead', l.name + ' pasa a ' + STAGE_LABEL[stage] + '.');
    save(); render({ animate: false });
    toast(l.name + ' → ' + STAGE_LABEL[stage]);
  }
  function leadMenu(anchor, id) {
    const l = S.leads.find((x) => x.id === id); if (!l) return;
    openPopover({ anchor, role: 'menu', label: 'Acciones de ' + l.name, cls: 'pn-menu', align: 'right', html: '<button type="button" class="pn-menu__item" role="menuitem" data-act="lead-open" data-id="' + id + '">' + ico('lead') + 'Ver detalle</button><p class="pn-menu__label">Mover a…</p>' + D.STAGES.filter((s) => s !== l.stage).map((s) => '<button type="button" class="pn-menu__item" role="menuitem" data-act="lead-move" data-id="' + id + '" data-stage="' + s + '">' + ico('arrow') + esc(STAGE_LABEL[s]) + '</button>').join('') });
  }
  function newLeadForm(anchor) {
    const P = preset();
    openPopover({ anchor, label: 'Nuevo ' + leadWord(), cls: 'pn-popover--form', align: 'right', html: '<form class="pn-form" data-form="lead-new"><p class="pn-eyebrow">Nuevo ' + esc(leadWord()) + '</p><label class="pn-field"><span>Nombre</span><input class="pn-input" name="name" required autocomplete="off" autofocus></label><label class="pn-field"><span>' + esc(P.orgLabel) + '</span><input class="pn-input" name="company" required autocomplete="off"></label><div class="pn-form__row"><label class="pn-field"><span>Canal</span><select class="pn-select" name="channel">' + ['whatsapp', 'instagram', 'web', 'email', 'llamada'].map((c) => '<option value="' + c + '">' + esc(CH_LABEL[c]) + '</option>').join('') + '</select></label><label class="pn-field"><span>Valor (€)</span><input class="pn-input" name="value" type="number" min="0" step="10" value="' + Math.round((P.value[0] + P.value[1]) / 2 / 10) * 10 + '" required></label></div><label class="pn-field"><span>' + esc(P.sectorLabel) + '</span><select class="pn-select" name="sector">' + P.sectors.map((s) => '<option>' + esc(s) + '</option>').join('') + '</select></label><div class="pn-form__actions">' + btn('Cancelar', 'pop-close', { variant: 'ghost' }) + '<button type="submit" class="btn btn--primary btn--on-dark btn--xs">' + ico('plus') + '<span>Añadir</span></button></div></form>' });
  }
  function addLead(fd) {
    const P = preset();
    const now = new Date().toISOString();
    const l = { id: uid('l'), name: fd.name.trim(), company: fd.company.trim(), sector: fd.sector, value: +fd.value || 0, channel: fd.channel, stage: 'nuevo', score: 40 + Math.floor(Math.random() * 40), createdAt: now, lastAt: now, service: P.services[0], summary: fd.name.trim().split(' ')[0] + ' acaba de entrar por ' + CH_LABEL[fd.channel] + '. Aún no hay conversación: la IA propondrá un primer mensaje cuando escriba.', next: 'Contactar en menos de 24 h', added: true, timeline: [{ at: now, channel: fd.channel, from: 'tu', text: 'Añadido a mano desde el panel.' }] };
    S.leads.unshift(l);
    log('lead', 'Nuevo ' + leadWord() + ' añadido a mano: ' + l.name + ' (' + l.company + ').');
    save(); closePopover(); render({ animate: false }); toast(l.name + ' añadido a ' + STAGE_LABEL.nuevo);
  }
  function scheduleMeeting(id) {
    const l = S.leads.find((x) => x.id === id); if (!l) return;
    const P = preset();
    const d = nextFreeSlot();
    const ev = { id: uid('e'), title: P.eventTypes.reunion + ' · ' + l.name, type: 'reunion', start: d.toISOString(), dur: 60, source: 'panel', confirmed: true, leadId: l.id, who: l.name };
    S.events.push(ev);
    if (l.stage === 'nuevo' || l.stage === 'contactado') l.stage = 'reunion';
    l.lastAt = new Date().toISOString();
    l.timeline.push({ at: l.lastAt, channel: 'email', from: 'tu', text: P.eventTypes.reunion + ' creada para el ' + WEEKDAYS[(d.getDay() + 6) % 7] + ' a las ' + hhmm(d) + ' y enviada a Google Calendar.' });
    log('calendar', P.eventTypes.reunion + ' con ' + l.name + ' creada en Google Calendar (' + WEEKDAYS[(d.getDay() + 6) % 7] + ' ' + hhmm(d) + ').');
    bump('Crea la cita cuando el cliente confirma');
    save(); render({ animate: false }); toast(P.eventTypes.reunion + ' creada: ' + WEEKDAYS[(d.getDay() + 6) % 7] + ' a las ' + hhmm(d));
  }
  function nextFreeSlot(dayWanted, hourWanted) {
    const d = dayWanted ? new Date(dayWanted) : new Date();
    if (!dayWanted) d.setDate(d.getDate() + 1);
    d.setHours(hourWanted || 10, 0, 0, 0);
    for (let k = 0; k < 40; k++) {
      const wd = (d.getDay() + 6) % 7;
      const busy = S.events.some((e) => Math.abs(new Date(e.start) - d) < 45 * 60000);
      if (wd < 5 && !busy && d.getHours() >= 9 && d.getHours() <= 18) return new Date(d);
      d.setHours(d.getHours() + 1);
      if (d.getHours() > 18) { d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); }
    }
    return d;
  }
  function draftFromLead(id) {
    const l = S.leads.find((x) => x.id === id); if (!l) return;
    let t = S.threads.find((th) => th.leadId === id);
    const first = l.name.split(' ')[0];
    const draft = 'Hola ' + first + ', soy del equipo de ' + S.company.name + '. He visto tu interés en «' + l.service + '»: te propongo una llamada corta esta semana para contarte cómo lo haríamos y qué plazos manejamos. ¿Te va bien el jueves a las 11:00?';
    if (!t) { t = { id: uid('t'), leadId: l.id, name: l.name, channel: l.channel, subject: l.company, unread: false, status: 'aprobacion', messages: l.timeline.filter((x) => x.from !== 'tu').slice(0, 2).map((x) => ({ at: x.at, from: x.from, text: x.text })), draft }; S.threads.unshift(t); }
    else { t.draft = draft; t.status = 'aprobacion'; }
    S.ui.selectedThread = t.id; S.ui.inboxPane = 'thread';
    log('ia', 'Borrador para ' + l.name + ' listo en la bandeja. Espera tu aprobación.');
    save(); toast('Borrador creado en la bandeja');
    location.hash = '#bandeja';
  }

  /* arrastrar y soltar tarjetas (pointer events); en táctil, con pulsación mantenida */
  const drag = { id: null, ghost: null, x0: 0, y0: 0, active: false, src: null, hold: null };
  function dragStart(e) {
    const cardEl = e.target.closest('.pn-lead');
    if (!cardEl || e.target.closest('button') || e.button > 0) return;
    const begin = () => { drag.id = cardEl.getAttribute('data-lead'); drag.src = cardEl; drag.x0 = e.clientX; drag.y0 = e.clientY; drag.active = false; window.addEventListener('pointermove', dragMove); window.addEventListener('pointerup', dragEnd); window.addEventListener('pointercancel', dragEnd); };
    if (e.pointerType === 'touch') { drag.hold = setTimeout(begin, 320); cardEl.addEventListener('pointerup', () => clearTimeout(drag.hold), { once: true }); cardEl.addEventListener('pointermove', () => { }, { once: true }); }
    else begin();
  }
  function dragMove(e) {
    if (!drag.id) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.active) {
      if (Math.abs(dx) + Math.abs(dy) < 6) return;
      drag.active = true;
      const r = drag.src.getBoundingClientRect();
      const g = drag.src.cloneNode(true);
      g.classList.add('pn-lead--ghost'); g.removeAttribute('tabindex'); g.setAttribute('aria-hidden', 'true');
      g.style.width = r.width + 'px'; g.style.left = r.left + 'px'; g.style.top = r.top + 'px';
      document.body.appendChild(g); drag.ghost = g;
      drag.src.classList.add('is-dragging'); document.body.classList.add('is-dragging-lead');
    }
    e.preventDefault();
    drag.ghost.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(1.5deg)';
    $$('.pn-col.is-over').forEach((c) => c.classList.remove('is-over'));
    const under = document.elementsFromPoint(e.clientX, e.clientY).find((n) => n.classList && n.classList.contains('pn-col'));
    if (under) under.classList.add('is-over');
  }
  function dragEnd(e) {
    window.removeEventListener('pointermove', dragMove); window.removeEventListener('pointerup', dragEnd); window.removeEventListener('pointercancel', dragEnd);
    const id = drag.id; drag.id = null;
    if (!drag.active) { if (drag.src && !drag.src.contains(document.activeElement)) { /* clic simple */ } drag.src = null; return; }
    const target = $$('.pn-col.is-over')[0];
    if (drag.ghost) drag.ghost.remove();
    if (drag.src) drag.src.classList.remove('is-dragging');
    document.body.classList.remove('is-dragging-lead');
    $$('.pn-col.is-over').forEach((c) => c.classList.remove('is-over'));
    drag.ghost = null; drag.src = null; drag.active = false;
    if (target) moveLead(id, target.getAttribute('data-stage'), 'arrastrado');
  }

  /* ---------- BANDEJA ---------- */
  const THREAD_STATUS = { ia: 'Respondido por la IA', aprobacion: 'Necesita tu aprobación', tu: 'Atendido por ti' };
  function threadsFiltered() {
    const f = S.ui.inboxFilter;
    return S.threads.filter((t) => (f === 'todos' || (f === 'unread' ? t.unread : f === 'aprobacion' ? t.status === 'aprobacion' : t.channel === f)) && hit(t.name + ' ' + t.subject + ' ' + t.messages.map((m) => m.text).join(' ')));
  }
  function viewBandeja() {
    const list = threadsFiltered();
    let sel = S.threads.find((t) => t.id === S.ui.selectedThread);
    if (!sel && list.length) { sel = list[0]; S.ui.selectedThread = sel.id; }
    const filters = seg('Filtro', [['todos', 'Todos', 'inbox-filter'], ['unread', 'Sin leer', 'inbox-filter'], ['aprobacion', 'Aprobación', 'inbox-filter'], ['whatsapp', 'WhatsApp', 'inbox-filter'], ['instagram', 'Instagram', 'inbox-filter'], ['email', 'Email', 'inbox-filter'], ['web', 'Web', 'inbox-filter']], S.ui.inboxFilter);
    const items = list.length ? '<ul class="pn-threads">' + list.map((t) => { const last = t.messages[t.messages.length - 1]; return '<li><button type="button" class="pn-thread' + (sel && sel.id === t.id ? ' is-active' : '') + (t.unread ? ' is-unread' : '') + '" data-act="thread-open" data-id="' + t.id + '" data-fk="thread-' + t.id + '" aria-current="' + (sel && sel.id === t.id ? 'true' : 'false') + '">' + avatar(t.name, t.channel) + '<div class="pn-thread__body"><p class="pn-thread__top"><span class="pn-thread__name">' + esc(t.name) + '</span><time class="pn-thread__time">' + esc(rel(last.at)) + '</time></p><p class="pn-thread__preview">' + esc(last.text) + '</p><p class="pn-thread__foot">' + chIcon(t.channel) + pill(t.status, THREAD_STATUS[t.status]) + '</p></div></button></li>'; }).join('') + '</ul>' : empty('Sin conversaciones con ese filtro.', 'inbox');
    return '<div class="pn-view pn-view--bandeja">' + viewHead('Bandeja', num(S.threads.filter((t) => t.unread).length) + ' sin leer · ' + num(S.threads.filter((t) => t.status === 'aprobacion').length) + ' esperan tu aprobación') + '<div class="pn-toolbar">' + filters + '</div><div class="pn-inbox' + (S.ui.inboxPane === 'thread' ? ' is-thread' : '') + '"><div class="pn-card pn-inbox__list"><div class="pn-card__in" data-scroll="threads">' + items + '</div></div><div class="pn-card pn-inbox__thread">' + (sel ? threadView(sel) : '<div class="pn-card__in">' + empty('Elige una conversación.', 'inbox') + '</div>') + '</div></div></div>';
  }
  function threadView(t) {
    const lead = S.leads.find((l) => l.id === t.leadId);
    return '<div class="pn-card__in pn-thread-view"><header class="pn-thread-view__head"><button type="button" class="pn-iconbtn pn-inbox__back" data-act="thread-back" aria-label="Volver a la lista">' + ico('back') + '</button>' + avatar(t.name, t.channel) + '<div><h2 class="pn-thread-view__name">' + esc(t.name) + '</h2><p class="pn-thread-view__sub">' + esc(t.subject) + ' · ' + esc(CH_LABEL[t.channel]) + '</p></div><div class="pn-thread-view__tools">' + pill(t.status, THREAD_STATUS[t.status]) + (lead ? '<a class="btn btn--ghost btn--xs" href="#leads" data-act="thread-lead" data-id="' + lead.id + '">' + ico('lead') + '<span>Ver en CRM</span></a>' : '') + '</div></header>' +
      '<ol class="pn-bubbles" data-scroll="bubbles" data-bubbles>' + t.messages.map((m) => '<li class="pn-bubble pn-bubble--' + m.from + '"><p>' + esc(m.text) + '</p><span class="pn-bubble__meta">' + esc(m.from === 'ia' ? 'La IA' : m.from === 'tu' ? 'Tú' : t.name.split(' ')[0]) + ' · ' + esc(hhmm(new Date(m.at))) + '</span></li>').join('') + '<li class="pn-bubble pn-bubble--typing" data-typing hidden aria-label="Escribiendo"><span></span><span></span><span></span></li></ol>' +
      '<form class="pn-reply" data-form="reply" data-id="' + t.id + '"><label class="pn-reply__label" for="pn-reply-' + t.id + '">' + ico('sparkle') + (t.draft ? 'Borrador de la IA' : 'Tu respuesta') + '</label><textarea class="pn-input pn-reply__box" id="pn-reply-' + t.id + '" name="text" rows="3" data-act="reply-edit" data-id="' + t.id + '" data-fk="reply-' + t.id + '" placeholder="Escribe una respuesta…">' + esc(t.draft || '') + '</textarea><div class="pn-reply__actions">' + (t.draft ? btn('Descartar', 'draft-discard', { variant: 'ghost', id: t.id, icon: 'x' }) : '') + '<button type="submit" class="btn btn--primary btn--on-dark btn--xs">' + ico('send') + '<span>' + (t.draft ? 'Aprobar y enviar' : 'Enviar') + '</span></button></div></form></div>';
  }
  function sendReply(id, text) {
    const t = S.threads.find((x) => x.id === id); if (!t || !text.trim()) return;
    const wasDraft = !!t.draft;
    t.messages.push({ at: new Date().toISOString(), from: 'tu', text: text.trim() });
    t.draft = null; t.status = 'tu'; t.unread = false;
    const l = S.leads.find((x) => x.id === t.leadId);
    if (l) { l.lastAt = new Date().toISOString(); if (l.stage === 'nuevo') l.stage = 'contactado'; l.timeline.push({ at: l.lastAt, channel: t.channel, from: 'tu', text: text.trim().slice(0, 90) + (text.length > 90 ? '…' : '') }); }
    log(t.channel === 'whatsapp' ? 'whatsapp' : 'ok', (wasDraft ? 'Borrador aprobado y enviado a ' : 'Respuesta enviada a ') + t.name + ' por ' + CH_LABEL[t.channel] + '.');
    if (wasDraft) bump('Responde en WhatsApp fuera de horario');
    save(); render({ animate: false }); toast('Enviado a ' + t.name + ' por ' + CH_LABEL[t.channel]);
  }
  function incomingMessage() {
    const pool = S.threads.filter((t) => t.status !== 'aprobacion');
    const t = pool.length ? pool[Math.floor(Math.random() * pool.length)] : S.threads[0];
    if (!t) return;
    const first = t.name.split(' ')[0];
    const asks = ['¿Podemos cerrarlo esta semana?', '¿Me pasáis el presupuesto por aquí?', 'Al final me viene mejor por la tarde, ¿tenéis hueco?', '¿Incluye el mantenimiento?', 'Vale, ¿cuál sería el siguiente paso?'];
    const drafts = ['Hola ' + first + ', sí: te propongo el jueves o el viernes por la mañana. Dime cuál y te lo dejo cerrado.', 'Hola ' + first + ', te lo mando en un momento por aquí mismo con el desglose.', 'Hola ' + first + ', por la tarde tenemos el miércoles a las 17:00 y el jueves a las 16:30. ¿Cuál prefieres?', 'Hola ' + first + ', sí, el primer año va incluido. Te lo detallo en el presupuesto.', 'Hola ' + first + ', el siguiente paso es una reunión corta para cerrar el alcance. ¿Te va bien esta semana?'];
    const k = Math.floor(Math.random() * asks.length);
    const doIt = () => {
      t.messages.push({ at: new Date().toISOString(), from: 'lead', text: asks[k] });
      t.draft = drafts[k]; t.status = 'aprobacion'; t.unread = t.id !== S.ui.selectedThread || view !== 'bandeja';
      log('ia', t.name + ' ha escrito por ' + CH_LABEL[t.channel] + '. La IA ha preparado un borrador.', { notify: true });
      save();
      updateBell();
      if (view === 'bandeja') render({ animate: false });
      else if (view === 'resumen') patchResumen(S.feed[0]);
    };
    const typing = view === 'bandeja' && t.id === S.ui.selectedThread ? $('[data-typing]') : null;
    if (typing && !RM) { typing.hidden = false; const box = $('[data-bubbles]'); if (box) box.scrollTop = box.scrollHeight; setTimeout(doIt, 1700); }
    else doIt();
  }

  /* ---------- AGENDA ---------- */
  const EV_TYPES = ['reunion', 'llamada', 'demo', 'visita'];
  function viewAgenda() {
    const P = preset();
    const monday = mondayOf(new Date()); monday.setDate(monday.getDate() + 7 * S.ui.weekOffset);
    const days = Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * DAY));
    const evs = weekEvents(S.ui.weekOffset).filter((e) => hit(e.title));
    const H0 = 8, H1 = 20, RH = 48;
    const now = new Date();
    const todayEvs = S.events.filter((e) => sameDay(new Date(e.start), now)).sort((a, b) => new Date(a.start) - new Date(b.start));
    const hours = Array.from({ length: H1 - H0 }, (_, i) => '<div class="pn-week__hour" style="--row:' + i + '">' + String(H0 + i).padStart(2, '0') + ':00</div>').join('');
    const cols = days.map((d, di) => {
      const isToday = sameDay(d, now);
      const items = evs.filter((e) => sameDay(new Date(e.start), d)).map((e) => { const s = new Date(e.start); const top = ((s.getHours() - H0) + s.getMinutes() / 60) * RH; const h = e.dur / 60 * RH; return '<button type="button" class="pn-week__event' + (e.confirmed ? '' : ' is-unconfirmed') + '" data-type="' + e.type + '" data-event="' + e.id + '" data-fk="ev-' + e.id + '" style="top:' + top + 'px;height:' + Math.max(22, h - 2) + 'px" aria-label="' + esc(e.title + ', ' + hhmm(s) + ', ' + e.dur + ' min' + (e.confirmed ? '' : ', sin confirmar')) + '"><span class="pn-week__event-title">' + esc(e.title) + '</span><span class="pn-week__event-time">' + esc(hhmm(s)) + ' · ' + e.dur + ' min</span>' + (e.source === 'gcal' ? '<span class="pn-week__src" data-tiptext="Sincronizado con Google Calendar">' + ico('calendar') + '</span>' : '') + '</button>'; }).join('');
      const nowLine = isToday && now.getHours() >= H0 && now.getHours() < H1 ? '<div class="pn-week__now" style="top:' + (((now.getHours() - H0) + now.getMinutes() / 60) * RH) + 'px" aria-hidden="true"></div>' : '';
      return '<div class="pn-week__col' + (isToday ? ' is-today' : '') + '" data-day="' + di + '" data-date="' + d.toISOString() + '">' + Array.from({ length: (H1 - H0) * 2 }, (_, i) => '<button type="button" class="pn-week__slot" data-act="slot" data-day="' + di + '" data-half="' + i + '" aria-label="Crear evento el ' + esc(dayLong(d)) + ' a las ' + String(H0 + Math.floor(i / 2)).padStart(2, '0') + ':' + (i % 2 ? '30' : '00') + '" tabindex="-1"></button>').join('') + items + nowLine + '</div>';
    }).join('');
    const suggestionLead = S.leads.find((l) => l.stage === 'nuevo' || l.stage === 'contactado') || S.leads[0];
    const thu = new Date(mondayOf(now).getTime() + 3 * DAY);
    if (thu < startOfDay(now)) thu.setDate(thu.getDate() + 7);
    const free = [10, 12, 16].filter((h) => !S.events.some((e) => Math.abs(new Date(e.start) - new Date(thu.getFullYear(), thu.getMonth(), thu.getDate(), h)) < 45 * 60000)).slice(0, 3);
    const suggestion = S.ui.suggestionDone ? '' : '<div class="pn-card pn-suggest"><div class="pn-card__in"><p class="pn-eyebrow">' + ico('sparkle') + ' Sugerencia de la IA</p><p class="pn-suggest__text"><strong>' + esc(suggestionLead.name) + '</strong> pidió cita: hay ' + free.length + ' huecos libres el jueves.</p><div class="pn-suggest__slots">' + free.map((h) => '<button type="button" class="btn btn--secondary btn--xs" data-act="suggest" data-id="' + suggestionLead.id + '" data-h="' + h + '" data-date="' + thu.toISOString() + '">' + ico('check') + '<span>Jueves ' + String(h).padStart(2, '0') + ':00</span></button>').join('') + '</div></div></div>';
    return '<div class="pn-view pn-view--agenda">' + viewHead('Agenda', 'Semana del ' + esc(dayShort(days[0])) + ' al ' + esc(dayShort(days[6])) + ' · ' + num(evs.length) + ' eventos · ' + num(evs.filter((e) => !e.confirmed).length) + ' sin confirmar', '<div class="pn-seg" role="group" aria-label="Semana"><button type="button" class="pn-seg__btn" data-act="week" data-val="-1" aria-label="Semana anterior">' + ico('back') + '</button><button type="button" class="pn-seg__btn" data-act="week" data-val="0">Hoy</button><button type="button" class="pn-seg__btn" data-act="week" data-val="1" aria-label="Semana siguiente">' + ico('arrow') + '</button></div><span class="pn-sync" data-tiptext="Los eventos se sincronizan en los dos sentidos">' + ico('calendar') + 'Google Calendar · sincronizado</span>') +
      '<div class="pn-agenda"><div class="pn-card pn-agenda__week"><div class="pn-card__in"><div class="pn-scroll" data-scroll="week"><div class="pn-week" style="--rh:' + RH + 'px;--rows:' + (H1 - H0) + '"><div class="pn-week__head"><div class="pn-week__corner"></div>' + days.map((d) => '<div class="pn-week__day' + (sameDay(d, now) ? ' is-today' : '') + '"><span>' + esc(WEEKDAYS[(d.getDay() + 6) % 7].slice(0, 3)) + '</span><strong>' + d.getDate() + '</strong></div>').join('') + '</div><div class="pn-week__body"><div class="pn-week__hours">' + hours + '</div><div class="pn-week__grid" data-week-grid>' + cols + '</div></div></div></div><p class="pn-hint">Haz clic en un hueco para crear un evento. Arrastra un evento para moverlo.</p></div></div>' +
      '<div class="pn-agenda__side">' + suggestion + '<div class="pn-card"><div class="pn-card__in">' + head('Hoy', '<span class="pn-count">' + todayEvs.length + '</span>', dayLong(now)) + (todayEvs.length ? '<ul class="pn-today">' + todayEvs.map((e) => '<li class="pn-today__item" data-type="' + e.type + '"><span class="pn-today__time">' + esc(hhmm(new Date(e.start))) + '</span><div><p class="pn-today__title">' + esc(e.title) + '</p><p class="pn-today__meta">' + e.dur + ' min · ' + esc(P.eventTypes[e.type] || e.type) + (e.confirmed ? '' : ' · <em>sin confirmar</em>') + '</p></div></li>').join('') + '</ul>' : empty('Hoy no tienes nada en la agenda.', 'calendar')) + '</div></div></div></div></div>';
  }
  function slotForm(anchorRect, dayISO, half) {
    const P = preset();
    const d = new Date(dayISO); d.setHours(8 + Math.floor(half / 2), half % 2 ? 30 : 0, 0, 0);
    openPopover({ anchor: { getBoundingClientRect: () => anchorRect }, rect: anchorRect, label: 'Nuevo evento', cls: 'pn-popover--form', html: '<form class="pn-form" data-form="event-new" data-start="' + d.toISOString() + '"><p class="pn-eyebrow">Nuevo evento · ' + esc(dayShort(d)) + ' ' + esc(hhmm(d)) + '</p><label class="pn-field"><span>Título</span><input class="pn-input" name="title" required autocomplete="off" autofocus placeholder="' + esc(P.eventTypes.reunion) + ' · nombre"></label><div class="pn-form__row"><label class="pn-field"><span>Tipo</span><select class="pn-select" name="type">' + EV_TYPES.map((t) => '<option value="' + t + '">' + esc(P.eventTypes[t]) + '</option>').join('') + '</select></label><label class="pn-field"><span>Duración</span><select class="pn-select" name="dur"><option value="30">30 min</option><option value="60" selected>1 h</option><option value="90">1 h 30</option><option value="120">2 h</option></select></label></div><div class="pn-form__actions">' + btn('Cancelar', 'pop-close', { variant: 'ghost' }) + '<button type="submit" class="btn btn--primary btn--on-dark btn--xs">' + ico('plus') + '<span>Crear</span></button></div></form>' });
  }
  function eventPopover(anchor, id) {
    const e = S.events.find((x) => x.id === id); if (!e) return;
    const P = preset();
    openPopover({ anchor, label: e.title, cls: 'pn-menu', html: '<p class="pn-menu__title">' + esc(e.title) + '</p><p class="pn-menu__label">' + esc(dayLong(new Date(e.start))) + ' · ' + esc(hhmm(new Date(e.start))) + ' · ' + e.dur + ' min · ' + esc(P.eventTypes[e.type] || e.type) + (e.source === 'gcal' ? ' · Google Calendar' : '') + '</p>' + (e.confirmed ? '' : '<button type="button" class="pn-menu__item" data-act="event-confirm" data-id="' + id + '">' + ico('check') + 'Marcar como confirmado</button>') + '<button type="button" class="pn-menu__item" data-act="event-delete" data-id="' + id + '">' + ico('trash') + 'Eliminar</button>' });
  }
  const evDrag = { id: null, el: null, x0: 0, y0: 0, active: false, top0: 0 };
  function evDragStart(e) {
    const el = e.target.closest('.pn-week__event'); if (!el || e.button > 0 || e.pointerType === 'touch') return;
    evDrag.id = el.getAttribute('data-event'); evDrag.el = el; evDrag.x0 = e.clientX; evDrag.y0 = e.clientY; evDrag.active = false; evDrag.top0 = parseFloat(el.style.top);
    window.addEventListener('pointermove', evDragMove); window.addEventListener('pointerup', evDragEnd);
  }
  function evDragMove(e) {
    if (!evDrag.id) return;
    const dx = e.clientX - evDrag.x0, dy = e.clientY - evDrag.y0;
    if (!evDrag.active) { if (Math.abs(dx) + Math.abs(dy) < 5) return; evDrag.active = true; evDrag.el.classList.add('is-dragging'); }
    e.preventDefault();
    evDrag.el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  }
  function evDragEnd(e) {
    window.removeEventListener('pointermove', evDragMove); window.removeEventListener('pointerup', evDragEnd);
    const id = evDrag.id, el = evDrag.el; evDrag.id = null;
    if (!el) return;
    if (!evDrag.active) { el.classList.remove('is-dragging'); evDrag.el = null; return; }
    el.style.transform = ''; el.classList.remove('is-dragging');
    const grid = $('[data-week-grid]'); const gr = grid.getBoundingClientRect();
    const colW = gr.width / 7;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2 + (e.clientX - evDrag.x0);
    const day = clamp(Math.floor((cx - gr.left) / colW), 0, 6);
    const RH = 48;
    const y = evDrag.top0 + (e.clientY - evDrag.y0);
    const half = clamp(Math.round(y / (RH / 2)), 0, 23);
    evDrag.el = null;
    const ev = S.events.find((x) => x.id === id); if (!ev) return;
    const col = $$('.pn-week__col', grid)[day];
    const d = new Date(col.getAttribute('data-date')); d.setHours(8 + Math.floor(half / 2), half % 2 ? 30 : 0, 0, 0);
    if (d.getTime() === new Date(ev.start).getTime()) { render({ animate: false }); return; }
    ev.start = d.toISOString();
    log('calendar', '«' + ev.title + '» movido al ' + WEEKDAYS[(d.getDay() + 6) % 7] + ' a las ' + hhmm(d) + '. Google Calendar actualizado.');
    save(); render({ animate: false }); toast('Movido al ' + WEEKDAYS[(d.getDay() + 6) % 7] + ' a las ' + hhmm(d));
  }

  /* ---------- FINANZAS ---------- */
  const CATS = ['Personal', 'Software', 'Publicidad', 'Alquiler', 'Proveedores', 'Otros'];
  const CAT_COLOR = { Personal: '--pn-s1', Software: '--pn-s2', Publicidad: '--pn-s3', Alquiler: '--pn-s4', Proveedores: '--pn-s5', Otros: '--pn-s-other' };
  function forecast() {
    const m = S.finance.months;
    const avgIn = m.slice(9).reduce((s, x) => s + x.ingresos, 0) / 3;
    const avgOut = m.slice(9).reduce((s, x) => s + x.gastos, 0) / 3;
    const pending = S.finance.invoices.reduce((s, i) => s + i.importe, 0);
    let cash = S.finance.cash;
    const out = [cash];
    for (let k = 1; k <= 3; k++) { cash += avgIn * Math.pow(1.018, k) - avgOut * Math.pow(1.006, k) + (k === 1 ? pending * 0.7 : k === 2 ? pending * 0.3 : 0); out.push(Math.round(cash)); }
    return out;
  }
  function viewFinanzas() {
    const m = S.finance.months; const tm = thisMonth(), pm = prevMonth();
    tm.gastos = Math.round(expensesTotal() * 100) / 100;
    const margin = tm.ingresos ? (tm.ingresos - tm.gastos) / tm.ingresos : 0;
    const marginPrev = pm.ingresos ? (pm.ingresos - pm.gastos) / pm.ingresos : 0;
    const fc = forecast();
    const exps = S.finance.expenses.filter((e) => hit(e.concepto + ' ' + e.categoria));
    const byCat = CATS.map((c) => ({ name: c, value: Math.round(S.finance.expenses.filter((e) => e.categoria === c).reduce((s, e) => s + (+e.importe || 0), 0)), color: CAT_COLOR[c] })).filter((x) => x.value > 0);
    const fcLabels = [0, 1, 2, 3].map((k) => { const d = new Date(); d.setMonth(d.getMonth() + k); return cap(monthShort(d)); });
    const cards = '<div class="pn-kpis pn-kpis--4">' +
      kpiCard({ key: 'f-ing', label: 'Ingresos del mes', value: eur(tm.ingresos), delta: delta(tm.ingresos, pm.ingresos), spark: m.map((x) => x.ingresos), hi: true }) +
      kpiCard({ key: 'f-gas', label: 'Gastos del mes', value: eur(tm.gastos), delta: delta(tm.gastos, pm.gastos), invert: true, spark: m.map((x) => x.gastos) }) +
      kpiCard({ key: 'f-mar', label: 'Margen', value: nfPct.format(margin), delta: margin - marginPrev, vs: 'puntos vs mes anterior', spark: m.map((x) => x.ingresos ? (x.ingresos - x.gastos) / x.ingresos : 0) }) +
      kpiCard({ key: 'f-tes', label: 'Tesorería prevista (3 meses)', value: eur0(fc[3]), delta: delta(fc[3], fc[0]), vs: 'vs hoy', spark: fc }) + '</div>';
    const table = '<div class="pn-scroll"><table class="pn-table pn-table--edit" aria-label="Gastos del mes"><thead><tr><th scope="col">Concepto</th><th scope="col">Categoría</th><th scope="col" class="is-num">Importe</th><th scope="col">Recurrente</th><th scope="col"><span class="sr-only">Quitar</span></th></tr></thead><tbody>' +
      exps.map((e) => '<tr data-exp="' + e.id + '"><td><input class="pn-input pn-input--cell" value="' + esc(e.concepto) + '" aria-label="Concepto" data-act="exp-edit" data-field="concepto" data-id="' + e.id + '" data-fk="exp-c-' + e.id + '"></td><td><select class="pn-select pn-select--cell" aria-label="Categoría" data-act="exp-edit" data-field="categoria" data-id="' + e.id + '" data-fk="exp-k-' + e.id + '">' + CATS.map((c) => '<option' + (c === e.categoria ? ' selected' : '') + '>' + c + '</option>').join('') + '</select></td><td class="is-num"><input class="pn-input pn-input--cell is-num" type="number" step="0.01" min="0" value="' + (+e.importe).toFixed(2) + '" aria-label="Importe en euros" data-act="exp-edit" data-field="importe" data-id="' + e.id + '" data-fk="exp-i-' + e.id + '"></td><td><label class="pn-switch pn-switch--sm"><input type="checkbox"' + (e.recurrente ? ' checked' : '') + ' data-act="exp-edit" data-field="recurrente" data-id="' + e.id + '" data-fk="exp-r-' + e.id + '"><span class="pn-switch__track" aria-hidden="true"></span><span class="sr-only">Recurrente</span></label></td><td><button type="button" class="pn-iconbtn pn-iconbtn--sm" data-act="exp-del" data-id="' + e.id + '" aria-label="Quitar ' + esc(e.concepto) + '">' + ico('trash') + '</button></td></tr>').join('') +
      '</tbody><tfoot><tr><th scope="row" colspan="2">Total del mes</th><td class="is-num" data-exp-total>' + esc(eur(expensesTotal())) + '</td><td colspan="2">' + num(S.finance.expenses.filter((e) => e.recurrente).length) + ' recurrentes</td></tr></tfoot></table></div><form class="pn-form pn-form--row" data-form="exp-new" aria-label="Añadir gasto"><label class="pn-field"><span>Concepto</span><input class="pn-input" name="concepto" required placeholder="Nuevo gasto"></label><label class="pn-field"><span>Categoría</span><select class="pn-select" name="categoria">' + CATS.map((c) => '<option>' + c + '</option>').join('') + '</select></label><label class="pn-field"><span>Importe (€)</span><input class="pn-input" name="importe" type="number" step="0.01" min="0" required placeholder="0,00"></label><label class="pn-field pn-field--check"><input type="checkbox" name="recurrente"><span>Recurrente</span></label><button type="submit" class="btn btn--secondary btn--xs">' + ico('plus') + '<span>Añadir gasto</span></button></form>';
    const inv = '<ul class="pn-invoices">' + S.finance.invoices.map((i) => '<li class="pn-invoice' + (i.dueDaysAgo > 14 ? ' is-late' : '') + '"><div><p class="pn-invoice__who">' + esc(i.cliente) + '</p><p class="pn-invoice__meta">' + (i.dueDaysAgo > 0 ? 'Vencida hace ' + i.dueDaysAgo + ' días' : 'Vence hoy') + (i.reminded ? ' · recordatorio enviado' : '') + '</p></div><p class="pn-invoice__amt">' + esc(eur(i.importe)) + '</p>' + (i.reminded ? '<span class="pn-status pn-status--good">' + ico('check') + 'Recordado</span>' : btn('Recordar por WhatsApp', 'invoice-remind', { id: i.id, icon: 'whatsapp' })) + '</li>').join('') + '</ul><p class="pn-invoices__sum">Pendiente de cobro: <strong>' + esc(eur(S.finance.invoices.reduce((s, i) => s + i.importe, 0))) + '</strong></p>';
    return '<div class="pn-view pn-view--finanzas">' + viewHead('Finanzas', 'Ingresos, gastos y previsión de ' + esc(S.company.name) + '. Edita cualquier gasto y las cifras se recalculan.') + cards + '<div class="pn-grid">' +
      card(head('Ingresos y gastos, últimos 12 meses', '', 'Evolución') + chart(lineChart, { title: 'Ingresos y gastos por mes', labels: m.map((x) => cap(x.label)), series: [{ name: 'Ingresos', values: m.map((x) => x.ingresos), color: '--accent', kind: 'bars' }, { name: 'Gastos', values: m.map((x) => x.gastos), color: '--pn-s2' }], money: true, h: 250 }), 'span-8') +
      card(head('Previsión de tesorería', '', '3 meses') + chart(lineChart, { title: 'Previsión de tesorería', labels: fcLabels, series: [{ name: 'Tesorería', values: fc, color: '--pn-s5', area: true }], money: true, h: 190 }) + '<p class="pn-note">Media de los tres últimos meses, con el ' + esc(nfPct.format(0.7)) + ' de las facturas pendientes cobrado el mes que viene.</p>', 'span-4') +
      card(head('Gastos del mes', '<span class="pn-count">' + S.finance.expenses.length + '</span>', 'Editable') + table, 'span-8') +
      card(head('Gastos por categoría', '', 'Este mes') + chart(donutChart, { title: 'Gastos por categoría', slices: byCat, money: true, centerValue: compact(expensesTotal()) + ' €', centerLabel: 'gastos', size: 168 }), 'span-4') +
      card(head('Facturas pendientes de cobro', '<span class="pn-count">' + S.finance.invoices.length + '</span>', 'Cobros') + inv, 'span-12') +
      '</div></div>';
  }

  /* ---------- MARKETING ---------- */
  /* Rendimientos decrecientes: los leads crecen con el presupuesto, pero cada
     euro extra rinde menos. leads(B) = leadsBase × (B / presupuestoBase)^0,62
     (elasticidad 0,62), y el CPL previsto es B / leads(B). Con el doble de
     presupuesto salen ~1,54× leads, no el doble. */
  const projLeads = (p, B) => p.baseLeads * Math.pow(Math.max(B, 1) / Math.max(p.baseBudget, 1), 0.62);
  function viewMarketing() {
    const pl = S.marketing.platforms;
    const camps = S.marketing.campaigns.filter((c) => hit(c.name + ' ' + c.platform));
    const P = preset();
    const platCard = (p) => { const B = p.projBudget || p.budget; const L = projLeads(p, B); const cpl = B / Math.max(L, 0.1); return '<article class="pn-card pn-platform" data-platform="' + p.key + '"><div class="pn-card__in"><header class="pn-platform__head"><span class="pn-platform__logo pn-platform__logo--' + p.key + '" aria-hidden="true">' + (p.key === 'meta' ? 'M' : 'G') + '</span><div><h2 class="pn-card__title">' + esc(p.name) + '</h2><p class="pn-platform__sub">Este mes · ' + esc(eur(p.spend)) + ' gastados de ' + esc(eur0(p.budget)) + '</p></div><span class="pn-platform__spark">' + spark(p.daily.slice(-12)) + '</span></header><dl class="pn-stats"><div><dt>Impresiones</dt><dd>' + num(p.impressions) + '</dd></div><div><dt>Clics</dt><dd>' + num(p.clicks) + '</dd></div><div><dt>' + esc(cap(leadWord(true))) + '</dt><dd data-plat-leads>' + num(p.leads) + '</dd></div><div><dt>CPL</dt><dd data-plat-cpl>' + esc(eur(p.leads ? p.spend / p.leads : 0)) + '</dd></div><div><dt>ROAS</dt><dd>' + esc(dec1(p.spend ? p.revenue / p.spend : 0)) + '×</dd></div><div><dt>CTR</dt><dd>' + esc(nfPct.format(p.impressions ? p.clicks / p.impressions : 0)) + '</dd></div></dl><div class="pn-slider"><label for="pn-budget-' + p.key + '"><span>Presupuesto mensual</span><output data-budget-out="' + p.key + '">' + esc(eur0(B)) + '</output></label><input id="pn-budget-' + p.key + '" class="pn-range" type="range" min="' + Math.round(p.baseBudget * 0.4) + '" max="' + Math.round(p.baseBudget * 2.5) + '" step="10" value="' + Math.round(B) + '" style="--pct:' + ((B - p.baseBudget * 0.4) / (p.baseBudget * 2.1) * 100).toFixed(1) + '%" data-act="budget" data-id="' + p.key + '" data-fk="budget-' + p.key + '"><p class="pn-slider__proj">Con ese presupuesto: <strong data-proj-leads="' + p.key + '">' + num(Math.round(L)) + '</strong> ' + esc(leadWord(true)) + ' previstos · CPL <strong data-proj-cpl="' + p.key + '">' + esc(eur(cpl)) + '</strong></p></div></div></article>'; };
    const rows = camps.map((c) => '<tr data-camp="' + c.id + '"' + (c.state === 'pausada' ? ' class="is-paused"' : '') + '><td>' + esc(c.name) + '</td><td>' + esc(pl[c.platform].name) + '</td><td>' + pill(c.state === 'activa' ? 'ok' : 'off', c.state === 'activa' ? 'Activa' : 'Pausada') + '</td><td class="is-num">' + esc(eur0(c.budget)) + '</td><td class="is-num">' + esc(eur(c.cpl)) + '</td><td class="is-num">' + num(c.leads) + '</td><td>' + btn(c.state === 'activa' ? 'Pausar' : 'Activar', 'camp-toggle', { variant: 'ghost', id: c.id, icon: c.state === 'activa' ? 'pause' : 'play' }) + '</td></tr>').join('');
    const prop = S.marketing.proposal;
    const proposal = prop ? '<div class="pn-proposal" role="status"><p class="pn-eyebrow">' + ico('sparkle') + ' Propuesta de la IA</p><p>' + esc(prop.text) + '</p><div class="pn-proposal__actions">' + btn('Aceptar', 'proposal-accept', { variant: 'primary', cls: 'btn--on-dark', icon: 'check' }) + btn('Descartar', 'proposal-discard', { variant: 'ghost', icon: 'x' }) + '</div></div>' : '';
    const active = S.marketing.campaigns.filter((c) => c.state === 'activa');
    const ads = P.adCopy.map((a, i) => '<figure class="pn-ad pn-ad--' + (i + 1) + '"><div class="pn-ad__art" aria-hidden="true"><i></i><i></i><i></i></div><figcaption><p class="pn-ad__brand">' + esc(S.company.name) + ' · Patrocinado</p><p class="pn-ad__title">' + esc(a[0]) + '</p><p class="pn-ad__sub">' + esc(a[1]) + '</p><span class="pn-ad__cta">Más información</span></figcaption></figure>').join('');
    return '<div class="pn-view pn-view--marketing">' + viewHead('Marketing', 'Meta Ads y Google Ads en un mismo sitio. Mueve el presupuesto y mira qué pasa con los ' + esc(leadWord(true)) + '.') + '<div class="pn-platforms">' + platCard(pl.meta) + platCard(pl.google) + '</div><div class="pn-grid">' +
      card(head('Campañas', btn('Optimizar con IA', 'optimize', { icon: 'sparkle' }), num(active.length) + ' activas') + proposal + '<div class="pn-scroll"><table class="pn-table"><thead><tr><th scope="col">Campaña</th><th scope="col">Plataforma</th><th scope="col">Estado</th><th scope="col" class="is-num">Presupuesto</th><th scope="col" class="is-num">CPL</th><th scope="col" class="is-num">' + esc(cap(leadWord(true))) + '</th><th scope="col"><span class="sr-only">Acción</span></th></tr></thead><tbody>' + (rows || '<tr><td colspan="7">' + empty('Ninguna campaña coincide.', 'megaphone') + '</td></tr>') + '</tbody></table></div>', 'span-8') +
      card(head(cap(leadWord(true)) + ' por campaña', '', 'Este mes') + chart(hbarsChart, { title: 'Leads por campaña', labels: active.map((c) => c.name), values: active.map((c) => c.leads), valueName: leadWord(true) }), 'span-4') +
      card(head('Anuncios en emisión', '', 'Vista previa') + '<div class="pn-ads">' + ads + '</div>', 'span-12') + '</div></div>';
  }
  function optimize() {
    const act = S.marketing.campaigns.filter((c) => c.state === 'activa').slice().sort((a, b) => a.cpl - b.cpl);
    if (act.length < 2) return;
    const best = act[0], worst = act[act.length - 1];
    const move = Math.round(worst.budget * 0.3 / 10) * 10;
    S.marketing.proposal = { from: worst.id, to: best.id, move, text: 'Mover ' + eur0(move) + ' al mes de «' + worst.name + '» (CPL ' + eur(worst.cpl) + ') a «' + best.name + '» (CPL ' + eur(best.cpl) + '). Con el mismo gasto saldrían unos ' + num(Math.round(move / best.cpl - move / worst.cpl)) + ' ' + leadWord(true) + ' más al mes.' };
    save(); render({ animate: false });
  }
  function acceptProposal() {
    const p = S.marketing.proposal; if (!p) return;
    const from = S.marketing.campaigns.find((c) => c.id === p.from), to = S.marketing.campaigns.find((c) => c.id === p.to);
    from.budget -= p.move; to.budget += p.move;
    from.leads = Math.max(0, Math.round(from.budget / from.cpl)); to.leads = Math.round(to.budget / to.cpl);
    S.marketing.proposal = null;
    recalcPlatforms();
    log('ads', 'Presupuesto reasignado: ' + eur0(p.move) + ' de «' + from.name + '» a «' + to.name + '».');
    bump('Avisa si el CPL sube más de un 20 %');
    save(); render({ animate: false }); toast('Presupuesto reasignado');
  }
  function recalcPlatforms() {
    ['meta', 'google'].forEach((k) => { const p = S.marketing.platforms[k]; const act = S.marketing.campaigns.filter((c) => c.platform === k && c.state === 'activa'); p.budget = Math.round(act.reduce((s, c) => s + c.budget, 0)); p.leads = act.reduce((s, c) => s + c.leads, 0); p.spend = Math.round(Math.min(act.reduce((s, c) => s + c.cpl * c.leads, 0), p.budget * 0.93) * 100) / 100; p.baseBudget = p.budget || p.baseBudget; p.baseLeads = p.leads || p.baseLeads; p.projBudget = p.budget; });
  }

  /* ---------- WEB Y SEO ---------- */
  function viewWeb() {
    const w = S.web;
    const sc = S.ui.scRange === '3m' ? w.sc.m3 : w.sc.d28;
    const labels = S.ui.scRange === '3m' ? sc.map((_, i) => 'S' + (i + 1)) : sc.map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (27 - i)); return d.getDate() + ' ' + monthShort(d); });
    const ks = S.ui.kwSort;
    const kws = w.keywords.filter((k) => hit(k.kw)).slice().sort((a, b) => { const va = a[ks.key], vb = b[ks.key]; const r = typeof va === 'string' ? va.localeCompare(vb) : va - vb; return ks.dir === 'asc' ? r : -r; });
    const th = (key, label, numCol) => '<th scope="col"' + (numCol ? ' class="is-num"' : '') + ' aria-sort="' + (ks.key === key ? (ks.dir === 'asc' ? 'ascending' : 'descending') : 'none') + '"><button type="button" class="pn-sortbtn" data-act="kw-sort" data-key="' + key + '">' + esc(label) + ico('sort') + '</button></th>';
    const done = w.tasks.filter((t) => t.done).length;
    const rv = w.reviews;
    const stars = (n) => '<span class="pn-stars" aria-label="' + n + ' de 5 estrellas">' + Array.from({ length: 5 }, (_, i) => '<i class="' + (i < n ? 'is-on' : '') + '">' + ico('star') + '</i>').join('') + '</span>';
    return '<div class="pn-view pn-view--web">' + viewHead('Web y SEO', 'Estado del sitio, velocidad, buscadores y reseñas.') + '<div class="pn-grid">' +
      card(head('Estado de la web', '<span class="pn-status pn-status--good">' + ico('check') + (w.online ? 'En línea' : 'Caída') + '</span>', 'Ahora') + '<dl class="pn-stats pn-stats--web"><div><dt>Disponibilidad (30 días)</dt><dd>' + esc(nfDec2.format(w.uptime)) + ' %</dd></div><div><dt>Visitas hoy</dt><dd>' + num(w.visitsToday) + '</dd></div><div><dt>Formularios enviados hoy</dt><dd>' + num(w.conversions) + '</dd></div><div><dt>Velocidad</dt><dd>' + esc(dec1(w.speed)) + ' s</dd></div></dl>', 'span-4') +
      card(head('Core Web Vitals', '', 'Velocidad percibida') + '<div class="pn-gauges">' + chart(gauge, { name: 'LCP', value: w.cwv.lcp, min: 0, max: 5, good: 2.5, warn: 4, display: dec1(w.cwv.lcp) + ' s', goodLabel: '2,5 s' }) + chart(gauge, { name: 'CLS', value: w.cwv.cls, min: 0, max: 0.4, good: 0.1, warn: 0.25, display: String(w.cwv.cls).replace('.', ','), goodLabel: '0,1' }) + chart(gauge, { name: 'INP', value: w.cwv.inp, min: 0, max: 700, good: 200, warn: 500, display: num(w.cwv.inp) + ' ms', goodLabel: '200 ms' }) + '</div>', 'span-8') +
      card(head('Clics e impresiones en Google', seg('Periodo', [['28d', '28 días', 'sc-range'], ['3m', '3 meses', 'sc-range']], S.ui.scRange), 'Search Console') + '<div class="pn-twin"><div><p class="pn-eyebrow">Clics</p>' + chart(lineChart, { title: 'Clics', labels, series: [{ name: 'Clics', values: sc.map((x) => x.clicks), color: '--accent', area: true }], h: 150 }) + '</div><div><p class="pn-eyebrow">Impresiones</p>' + chart(lineChart, { title: 'Impresiones', labels, series: [{ name: 'Impresiones', values: sc.map((x) => x.impressions), color: '--pn-s2', area: true }], h: 150 }) + '</div></div><p class="pn-note">Dos escalas distintas, dos gráficas: así no se inventa una relación que no existe.</p>', 'span-8') +
      card(head('Tareas sugeridas', '<span class="pn-count">' + done + '/' + w.tasks.length + '</span>', 'Por la IA') + '<div class="pn-progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + w.tasks.length + '" aria-valuenow="' + done + '" aria-label="Tareas completadas"><i style="width:' + (done / w.tasks.length * 100).toFixed(1) + '%"></i></div><ul class="pn-tasks">' + w.tasks.map((t) => '<li><label class="pn-task' + (t.done ? ' is-done' : '') + '"><input type="checkbox"' + (t.done ? ' checked' : '') + ' data-act="task" data-id="' + t.id + '" data-fk="task-' + t.id + '"><span class="pn-task__box" aria-hidden="true">' + ico('check') + '</span><span>' + esc(t.text) + '</span></label></li>').join('') + '</ul>', 'span-4') +
      card(head('Palabras clave', '', num(w.keywords.length) + ' seguidas') + '<div class="pn-scroll"><table class="pn-table pn-table--kw"><thead><tr>' + th('kw', 'Palabra clave') + th('pos', 'Posición', true) + th('delta', 'Cambio', true) + th('vol', 'Volumen', true) + '<th scope="col">Tendencia</th></tr></thead><tbody>' + kws.map((k) => '<tr><td>' + esc(k.kw) + '</td><td class="is-num">' + k.pos + '</td><td class="is-num">' + (k.delta === 0 ? '<span class="pn-delta">=</span>' : '<span class="pn-delta ' + (k.delta > 0 ? 'pn-delta--pos' : 'pn-delta--neg') + '">' + (k.delta > 0 ? '+' : '') + k.delta + '</span>') + '</td><td class="is-num">' + num(k.vol) + '</td><td>' + spark(k.spark, { invert: true, w: 80, h: 22 }) + '</td></tr>').join('') + '</tbody></table></div>', 'span-7') +
      card(head('Reseñas de Google', '<span class="pn-rating">' + esc(dec1(rv.rating)) + ' ' + stars(Math.round(rv.rating)) + ' <small>' + num(rv.count) + ' reseñas</small></span>', 'Reputación') + '<ul class="pn-reviews">' + rv.items.map((r) => '<li class="pn-review"><header>' + avatar(r.name) + '<div><p class="pn-review__name">' + esc(r.name) + '</p><p class="pn-review__meta">' + stars(r.stars) + ' · ' + esc(rel(r.at)) + '</p></div></header><p class="pn-review__text">' + esc(r.text) + '</p><div class="pn-review__reply' + (r.status === 'aprobada' ? ' is-sent' : '') + '"><p class="pn-eyebrow">' + ico('sparkle') + (r.status === 'aprobada' ? ' Respuesta publicada' : ' Respuesta propuesta por la IA') + '</p><p>' + esc(r.reply) + '</p>' + (r.status === 'aprobada' ? '' : '<div class="pn-review__actions">' + btn('Aprobar y publicar', 'review-approve', { variant: 'primary', cls: 'btn--on-dark', id: r.id, icon: 'check' }) + btn('Editar', 'review-edit', { variant: 'ghost', id: r.id, icon: 'edit' }) + '</div>') + '</div></li>').join('') + '</ul>', 'span-5') +
      '</div></div>';
  }

  /* ---------- AUTOMATIZACIONES ---------- */
  const NODES = {
    whatsapp: { label: 'WhatsApp', kind: 'canal', icon: 'whatsapp', what: 'Responde, confirma citas y envía recordatorios.' },
    instagram: { label: 'Instagram', kind: 'canal', icon: 'instagram', what: 'Contesta los mensajes directos y guarda cada contacto en el CRM.' },
    gmail: { label: 'Gmail', kind: 'canal', icon: 'email', what: 'Lee el correo, clasifica y prepara borradores.' },
    web: { label: 'Web', kind: 'canal', icon: 'web', what: 'Recoge los formularios y contesta en menos de un minuto.' },
    telefono: { label: 'Teléfono', kind: 'canal', icon: 'telefono', what: 'Transcribe las llamadas perdidas y las devuelve por WhatsApp.' },
    crm: { label: 'CRM', kind: 'sistema', icon: 'crm', what: 'Cada contacto, en su etapa, con su historial.' },
    gcal: { label: 'Google Calendar', kind: 'sistema', icon: 'calendar', what: 'Crea y mueve las citas confirmadas.' },
    facturacion: { label: 'Facturación', kind: 'sistema', icon: 'invoice', what: 'Emite y registra facturas.' },
    gads: { label: 'Google Ads', kind: 'sistema', icon: 'megaphone', what: 'Vigila el CPL y propone cambios de presupuesto.' },
    mads: { label: 'Meta Ads', kind: 'sistema', icon: 'megaphone', what: 'Lee el rendimiento de cada campaña.' },
    gastos: { label: 'Gastos', kind: 'sistema', icon: 'gastos', what: 'Registra facturas de proveedores en la hoja de gastos.' }
  };
  const NODE_MSGS = { whatsapp: 61, instagram: 19, gmail: 41, web: 9, telefono: 6 };
  function diagramSVG() {
    const W = 860, H = 470, cx = 430, cy = 232;
    const chan = ['whatsapp', 'instagram', 'gmail', 'web', 'telefono'], sys = ['crm', 'gcal', 'facturacion', 'gads', 'mads', 'gastos'];
    const pos = {};
    chan.forEach((k, i) => { pos[k] = { x: 118, y: 62 + i * 88 }; });
    sys.forEach((k, i) => { pos[k] = { x: 742, y: 44 + i * 76 }; });
    const on = S.automations.nodes;
    const edgePath = (a, b) => { const A = pos[a] || { x: cx, y: cy }, B = pos[b] || { x: cx, y: cy }; const mx = (A.x + B.x) / 2; return 'M' + A.x + ' ' + A.y + 'C' + mx + ' ' + A.y + ',' + mx + ' ' + B.y + ',' + B.x + ' ' + B.y; };
    let edges = '', packets = '';
    const active = (k) => on[k] !== false;
    const baseEdges = chan.map((k) => [k, 'ia']).concat(sys.map((k) => ['ia', k]));
    const custom = S.automations.rules.filter((r) => r.custom).map((r) => [r.from, r.to, r.id]);
    baseEdges.forEach(([a, b]) => {
      const k = a === 'ia' ? b : a; const isOn = active(k);
      const d = edgePath(a === 'ia' ? 'ia' : a, b === 'ia' ? 'ia' : b);
      edges += '<path class="pn-edge' + (isOn ? '' : ' is-off') + '" d="' + d + '"/>';
      if (isOn) packets += '<circle class="pn-packet" r="3.5"><animateMotion dur="' + (2.8 + (k.length % 4) * 0.35).toFixed(2) + 's" repeatCount="indefinite" path="' + d + '" begin="' + (-(k.length % 5) * 0.6).toFixed(1) + 's"/></circle><circle class="pn-packet pn-packet--2" r="2.5"><animateMotion dur="' + (3.4 + (k.length % 3) * 0.4).toFixed(2) + 's" repeatCount="indefinite" path="' + d + '" begin="' + (-(k.length % 4) * 0.9 - 1.3).toFixed(1) + 's"/></circle>';
    });
    custom.forEach(([a, b, id]) => {
      if (!pos[a] || !pos[b]) return;
      const rule = S.automations.rules.find((r) => r.id === id);
      const isOn = active(a) && active(b) && rule && rule.on;
      const A = pos[a], B = pos[b];
      const d = 'M' + A.x + ' ' + A.y + 'Q' + cx + ' ' + (cy + 130) + ',' + B.x + ' ' + B.y;
      edges += '<path class="pn-edge pn-edge--custom' + (isOn ? '' : ' is-off') + (S.ui.newEdge === id ? ' is-new' : '') + '" d="' + d + '"/>';
      if (isOn) packets += '<circle class="pn-packet" r="3.5"><animateMotion dur="3.6s" repeatCount="indefinite" path="' + d + '"/></circle>';
    });
    const node = (k) => { const p = pos[k], n = NODES[k]; const isOn = active(k); return '<g class="pn-node pn-node--' + n.kind + (isOn ? '' : ' is-off') + '" tabindex="0" role="button" aria-pressed="' + isOn + '" data-node="' + k + '" data-tiptext="' + esc(n.label + ': ' + n.what + (isOn ? ' Clic para apagar.' : ' Apagado. Clic para encender.')) + '" transform="translate(' + p.x + ' ' + p.y + ')"><circle class="pn-node__ring" r="30"/><circle class="pn-node__bg" r="26"/><g transform="translate(-10 -10)">' + ico(n.icon) + '</g><text class="pn-node__label" y="46" text-anchor="middle">' + esc(n.label) + '</text></g>'; };
    return '<svg class="pn-diagram" viewBox="0 0 ' + W + ' ' + H + '" role="group" aria-label="Diagrama de automatizaciones: canales a la izquierda, la IA de Holdera en el centro y los sistemas a la derecha" data-diagram><g class="pn-edges">' + edges + '</g><g class="pn-packets" aria-hidden="true">' + packets + '</g>' + chan.map(node).join('') + sys.map(node).join('') + '<g class="pn-node pn-node--core" transform="translate(' + cx + ' ' + cy + ')" tabindex="0" role="img" aria-label="IA de Holdera: recibe cada mensaje, decide qué hacer y lo ejecuta en tus sistemas" data-tiptext="Recibe cada mensaje, decide qué hacer y lo ejecuta en tus sistemas."><circle class="pn-node__halo" r="62"/><circle class="pn-node__ring" r="46"/><circle class="pn-node__bg" r="41"/><g transform="translate(-14 -14) scale(1.4)">' + ico('sparkle') + '</g><text class="pn-node__label pn-node__label--core" y="68" text-anchor="middle">IA de Holdera</text></g></svg>';
  }
  function viewAutomatizaciones() {
    const on = S.automations.nodes;
    const rules = S.automations.rules.filter((r) => hit(r.name));
    const chanOn = Object.keys(NODE_MSGS).filter((k) => on[k] !== false);
    const msgs = chanOn.reduce((s, k) => s + NODE_MSGS[k], 0);
    const ruleActive = (r) => r.on && on[r.from] !== false && on[r.to] !== false;
    const actions = S.automations.rules.filter(ruleActive).reduce((s, r) => s + r.runsToday, 0);
    const mins = S.automations.rules.filter(ruleActive).reduce((s, r) => s + r.runsToday * r.minPerRun, 0);
    const list = '<ul class="pn-rules">' + rules.map((r) => { const active = ruleActive(r); return '<li class="pn-rule' + (active ? '' : ' is-off') + '"><label class="pn-switch"><input type="checkbox"' + (r.on ? ' checked' : '') + ' data-act="rule-toggle" data-id="' + r.id + '" data-fk="rule-' + r.id + '"><span class="pn-switch__track" aria-hidden="true"></span><span class="sr-only">' + esc(r.name) + '</span></label><div class="pn-rule__body"><p class="pn-rule__name">' + esc(r.name) + '</p><p class="pn-rule__path">' + esc(NODES[r.from] ? NODES[r.from].label : r.from) + ' ' + ico('arrow') + ' ' + esc(NODES[r.to] ? NODES[r.to].label : r.to) + (on[r.from] === false || on[r.to] === false ? ' · <em>un nodo está apagado</em>' : '') + '</p></div><dl class="pn-rule__stats"><div><dt>Hoy</dt><dd>' + num(r.runsToday) + '</dd></div><div><dt>Ahorro</dt><dd>' + esc(dec1(r.runsMonth * r.minPerRun / 60)) + ' h</dd></div><div><dt>Última</dt><dd>' + esc(rel(r.lastAt)) + '</dd></div></dl>' + (r.custom ? '<button type="button" class="pn-iconbtn pn-iconbtn--sm" data-act="rule-del" data-id="' + r.id + '" aria-label="Eliminar ' + esc(r.name) + '">' + ico('trash') + '</button>' : '') + '</li>'; }).join('') + '</ul>';
    const evOpts = [['whatsapp', 'llega un WhatsApp fuera de horario'], ['instagram', 'entra un mensaje por Instagram'], ['web', 'alguien envía el formulario web'], ['gmail', 'llega una factura por Gmail'], ['telefono', 'se pierde una llamada'], ['crm', 'un ' + leadWord() + ' pasa a Cerrado'], ['gads', 'el CPL sube más de un 20 %']];
    const acOpts = [['crm', 'crear el contacto en el CRM'], ['gcal', 'crear la cita en Google Calendar'], ['whatsapp', 'responder por WhatsApp'], ['gmail', 'enviar un email'], ['gastos', 'registrar el gasto'], ['facturacion', 'emitir la factura'], ['mads', 'pausar la campaña']];
    const builder = '<form class="pn-builder" data-form="rule-new" aria-label="Nueva automatización"><p class="pn-eyebrow">Nueva automatización</p><div class="pn-builder__row"><span class="pn-builder__word">Cuando</span><label class="pn-field pn-field--inline"><span class="sr-only">Evento</span><select class="pn-select" name="from">' + evOpts.map((o) => '<option value="' + o[0] + '">' + esc(o[1]) + '</option>').join('') + '</select></label><span class="pn-builder__word">' + ico('arrow') + ' entonces</span><label class="pn-field pn-field--inline"><span class="sr-only">Acción</span><select class="pn-select" name="to">' + acOpts.map((o) => '<option value="' + o[0] + '">' + esc(o[1]) + '</option>').join('') + '</select></label><button type="submit" class="btn btn--primary btn--on-dark btn--xs">' + ico('plus') + '<span>Añadir</span></button></div></form>';
    const fallback = '<ul class="sr-only">' + Object.keys(NODES).map((k) => '<li>' + esc(NODES[k].label) + ' (' + NODES[k].kind + '): ' + esc(NODES[k].what) + ' ' + (on[k] === false ? 'Apagado.' : 'Conectado con la IA de Holdera.') + '</li>').join('') + '</ul>';
    return '<div class="pn-view pn-view--auto">' + viewHead('Automatizaciones', 'Lo que la IA hace sola. Pulsa un nodo para apagarlo y verás qué deja de pasar.') + '<div class="pn-grid">' +
      card(head('Cómo circula la información', '<span class="pn-legend-inline"><i class="pn-legend-inline__dot"></i>Canales · <i class="pn-legend-inline__dot pn-legend-inline__dot--sys"></i>Sistemas</span>', 'Diagrama') + '<div class="pn-diagram-wrap">' + diagramSVG() + fallback + '</div><dl class="pn-counters"><div><dt>Mensajes gestionados hoy</dt><dd data-counter="msgs">' + num(msgs) + '</dd></div><div><dt>Acciones ejecutadas hoy</dt><dd data-counter="actions">' + num(actions) + '</dd></div><div><dt>Minutos ahorrados hoy</dt><dd data-counter="mins">' + num(mins) + '</dd></div><div><dt>Nodos activos</dt><dd data-counter="nodes">' + num(Object.keys(NODES).filter((k) => on[k] !== false).length) + ' / ' + Object.keys(NODES).length + '</dd></div></dl>', 'span-12') +
      card(head('Automatizaciones activas', '<span class="pn-count">' + S.automations.rules.filter(ruleActive).length + '</span>', 'Reglas') + list + builder, 'span-12') + '</div></div>';
  }
  function toggleNode(k) {
    S.automations.nodes[k] = S.automations.nodes[k] === false;
    log('auto', NODES[k].label + (S.automations.nodes[k] ? ' encendido.' : ' apagado: sus automatizaciones se detienen.'));
    save(); render({ animate: false });
    toast(NODES[k].label + (S.automations.nodes[k] ? ' encendido' : ' apagado'), S.automations.nodes[k] ? '' : 'warn');
  }
  function addRule(from, to, fromLabel, toLabel) {
    const r = { id: uid('a'), name: 'Cuando ' + fromLabel + ', ' + toLabel, from, to, on: true, runsToday: 0, runsMonth: 0, minPerRun: 5, lastAt: new Date().toISOString(), custom: true };
    S.automations.rules.push(r);
    S.ui.newEdge = r.id;
    log('auto', 'Nueva automatización: ' + r.name + '.');
    save(); render({ animate: false }); toast('Automatización añadida');
    setTimeout(() => { S.ui.newEdge = null; }, 1500);
  }

  /* ---------- CONEXIONES ---------- */
  const CONN_STATUS = { ok: 'Conectado', warn: 'Requiere reconexión', off: 'No configurado', connecting: 'Conectando…' };
  function viewConexiones() {
    const list = S.connections.filter((c) => hit(c.name + ' ' + c.detail));
    const P = preset();
    return '<div class="pn-view pn-view--conn">' + viewHead('Conexiones', 'Las herramientas de las que el panel lee y en las que escribe.') + '<div class="pn-grid">' +
      card(head('Integraciones', '<span class="pn-count">' + S.connections.filter((c) => c.status === 'ok').length + ' de ' + S.connections.length + '</span>', 'Estado') + '<ul class="pn-conns">' + list.map((c) => { const st = c.status; const detail = c.detail.replace('{t}', c.lastAt ? hhmm(new Date(c.lastAt)) : ''); return '<li class="pn-conn" data-status="' + st + '"><span class="pn-conn__ico">' + ico(NODES[c.id] ? NODES[c.id].icon : c.id === 'sc' ? 'globe' : 'plug') + '</span><div class="pn-conn__body"><p class="pn-conn__name">' + esc(c.name) + ' <span class="pn-conn__state"><i></i>' + esc(CONN_STATUS[st]) + '</span></p><p class="pn-conn__detail">' + esc(st === 'connecting' ? 'Comprobando el acceso…' : detail) + '</p></div><div class="pn-conn__actions">' + (st === 'ok' ? btn('Probar', 'conn', { variant: 'ghost', id: c.id, attrs: ' data-op="test"', icon: 'refresh' }) + btn('Desconectar', 'conn', { variant: 'ghost', id: c.id, attrs: ' data-op="off"', icon: 'x' }) : st === 'warn' ? btn('Reconectar', 'conn', { variant: 'primary', cls: 'btn--on-dark', id: c.id, attrs: ' data-op="on"', icon: 'refresh' }) : st === 'off' ? btn('Conectar', 'conn', { variant: 'primary', cls: 'btn--on-dark', id: c.id, attrs: ' data-op="on"', icon: 'plug' }) : '<span class="pn-spinner" aria-hidden="true"></span>') + '</div></li>'; }).join('') + '</ul>', 'span-8') +
      card(head('De dónde salen los datos', '', 'En pocas palabras') + '<div class="pn-prose"><p>El panel no inventa nada: <strong>lee</strong> de las herramientas que ya usas (el correo, WhatsApp, el calendario, las plataformas de anuncios, tu hoja de gastos) y <strong>escribe</strong> en ellas cuando tú, o una regla que has aprobado, lo decide.</p><p>' + esc(P.hours) + '</p><p>Cada conexión se puede probar, desconectar o volver a conectar desde aquí. Si una caduca, lo verás en esta lista y en el timbre de avisos.</p><p class="pn-prose__note">' + ico('info') + ' En esta demostración todo se simula en tu navegador: no hay ninguna cuenta real conectada.</p></div>', 'span-4') + '</div></div>';
  }
  function connOp(id, op) {
    const c = S.connections.find((x) => x.id === id); if (!c || c.status === 'connecting') return;
    const prev = c.status;
    c.status = 'connecting';
    save(); render({ animate: false });
    setTimeout(() => {
      if (op === 'off') { c.status = 'off'; c.detail = 'Desconectado por ti'; c.lastAt = null; log('auto', c.name + ' desconectado.'); toast(c.name + ' desconectado', 'warn'); }
      else if (op === 'test') { c.status = 'ok'; c.lastAt = new Date().toISOString(); c.detail = c.detail.indexOf('{t}') >= 0 ? c.detail : 'Última comprobación: hoy a las {t}'; toast(c.name + ': la conexión funciona'); }
      else { c.status = 'ok'; c.lastAt = new Date().toISOString(); c.detail = 'Conectado hoy a las {t}'; log('auto', c.name + ' conectado.'); if (prev === 'warn') S.notifications = S.notifications.filter((n) => n.text.indexOf(c.name) < 0); toast(c.name + ' conectado'); }
      save(); render({ animate: false }); updateBell();
    }, 1400);
  }

  /* ---------- ASISTENTE ---------- */
  const CHIPS = ['¿Cuánto hemos facturado este mes?', '¿Qué ' + 'leads' + ' esperan respuesta?', 'Resume la semana', '¿Qué campaña va peor?', 'Crea una cita con Laia el jueves a las 11'];
  let assistantOpen = false, lastFocus = null, streaming = null;
  function assistantHTML() {
    const chips = CHIPS.map((c) => c.replace('leads', leadWord(true)));
    return '<div class="pn-drawer__in"><header class="pn-drawer__head"><div><h2 class="pn-drawer__title" id="pn-assistant-title">' + ico('sparkle') + 'Asistente IA</h2><p class="pn-drawer__engine">Claude, de Anthropic</p></div><button type="button" class="pn-iconbtn" data-act="assistant-close" aria-label="Cerrar el asistente">' + ico('x') + '</button></header>' +
      '<div class="pn-drawer__body" data-scroll="assistant"><ol class="pn-chat" data-chat aria-live="polite" aria-relevant="additions">' + (S.assistant.messages.length ? S.assistant.messages.map(chatMsg).join('') : '<li class="pn-chat__msg pn-chat__msg--ia"><p>Hola, ' + esc(S.company.user) + '. Pregúntame por las cifras del panel o pídeme que haga algo: crear una cita, pausar una campaña, aprobar un borrador.</p></li>') + '</ol></div>' +
      '<div class="pn-drawer__chips" aria-label="Sugerencias">' + chips.map((c) => '<button type="button" class="pn-chip" data-act="ask" data-q="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>' +
      '<form class="pn-drawer__form" data-form="ask"><label class="sr-only" for="pn-ask">Escribe tu pregunta</label><input class="pn-input" id="pn-ask" name="q" autocomplete="off" placeholder="Pregunta o pide algo…"><button type="submit" class="btn btn--primary btn--on-dark btn--icon" aria-label="Enviar">' + ico('send') + '</button></form><p class="pn-drawer__foot">Respuestas de demostración generadas localmente. Nada sale de tu navegador.</p></div>';
  }
  const chatMsg = (m) => '<li class="pn-chat__msg pn-chat__msg--' + m.role + '"><p>' + esc(m.text) + '</p>' + (m.pending ? '<div class="pn-confirm"><p>' + ico('info') + 'Necesito tu aprobación para ' + esc(m.pending.label) + '.</p><div class="pn-confirm__actions">' + btn('Aprobar', 'confirm-yes', { variant: 'primary', cls: 'btn--on-dark', id: m.id, icon: 'check' }) + btn('Cancelar', 'confirm-no', { variant: 'ghost', id: m.id, icon: 'x' }) + '</div></div>' : '') + (m.done ? '<p class="pn-chat__done">' + ico('check') + esc(m.done) + '</p>' : '') + '</li>';
  function openAssistant() {
    const d = $('[data-assistant]');
    if (!d) return;
    if (!assistantOpen) lastFocus = document.activeElement;
    d.innerHTML = assistantHTML();
    d.hidden = false; assistantOpen = true;
    document.body.classList.add('has-assistant');
    requestAnimationFrame(() => d.classList.add('is-open'));
    const box = $('[data-scroll="assistant"]', d); if (box) box.scrollTop = box.scrollHeight;
    $('#pn-ask', d).focus({ preventScroll: true });
    $$('[data-open-assistant]').forEach((b) => b.setAttribute('aria-expanded', 'true'));
  }
  function closeAssistant() {
    const d = $('[data-assistant]'); if (!d || !assistantOpen) return;
    d.classList.remove('is-open'); assistantOpen = false;
    document.body.classList.remove('has-assistant');
    setTimeout(() => { d.hidden = true; }, RM ? 0 : 420);
    $$('[data-open-assistant]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    if (location.hash === '#asistente') history.replaceState(null, '', '#' + view);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function pushChat(role, text, extra) {
    const m = Object.assign({ id: uid('m'), role, text }, extra || {});
    S.assistant.messages.push(m);
    if (S.assistant.messages.length > 30) S.assistant.messages.shift();
    save();
    const chat = $('[data-chat]'); if (!chat) return m;
    if (chat.querySelector('.pn-chat__msg--intro')) chat.innerHTML = '';
    chat.insertAdjacentHTML('beforeend', chatMsg(m));
    const box = $('[data-scroll="assistant"]'); if (box) box.scrollTop = box.scrollHeight;
    return m;
  }
  function stream(m) {
    const li = $$('.pn-chat__msg', $('[data-chat]')).pop(); if (!li) return;
    const p = li.querySelector('p'); const full = m.text;
    if (RM) { p.textContent = full; return; }
    p.textContent = ''; li.classList.add('is-streaming');
    let i = 0;
    clearInterval(streaming);
    streaming = setInterval(() => { i += 2; p.textContent = full.slice(0, i); const box = $('[data-scroll="assistant"]'); if (box) box.scrollTop = box.scrollHeight; if (i >= full.length) { clearInterval(streaming); li.classList.remove('is-streaming'); } }, 14);
  }
  function ask(qText) {
    const text = qText.trim(); if (!text) return;
    pushChat('tu', text);
    const chat = $('[data-chat]');
    const typing = document.createElement('li'); typing.className = 'pn-chat__msg pn-chat__msg--ia pn-chat__typing'; typing.innerHTML = '<span></span><span></span><span></span>'; typing.setAttribute('aria-label', 'Escribiendo');
    if (chat) chat.appendChild(typing);
    setTimeout(() => { typing.remove(); const a = answer(text); const m = pushChat('ia', a.text, a.pending ? { pending: a.pending } : null); stream(m); }, RM ? 60 : 700 + Math.random() * 500);
  }
  function answer(text) {
    const t = norm(text);
    const tm = thisMonth(), pm = prevMonth();
    const P = preset();
    const has = (re) => re.test(t);
    if (has(/factur|ingres|vendid|cobrad|ganad/)) return { text: 'Este mes llevas ' + eur(tm.ingresos) + ' de ingresos, un ' + pct(delta(tm.ingresos, pm.ingresos)) + ' respecto al mes pasado (' + eur(pm.ingresos) + '). Los gastos van por ' + eur(expensesTotal()) + ', así que el margen está en el ' + nfPct.format(tm.ingresos ? (tm.ingresos - expensesTotal()) / tm.ingresos : 0) + '. Lo tienes con detalle en Finanzas.' };
    if (has(/gasto/) && has(/categor/)) { const rows = CATS.map((c) => [c, S.finance.expenses.filter((e) => e.categoria === c).reduce((s, e) => s + (+e.importe || 0), 0)]).filter((r) => r[1] > 0).sort((a, b) => b[1] - a[1]); return { text: 'Gastos de este mes por categoría: ' + rows.map((r) => r[0] + ' ' + eur0(r[1])).join(' · ') + '. Total ' + eur(expensesTotal()) + '.' }; }
    if (has(/gasto/)) return { text: 'Los gastos del mes suman ' + eur(expensesTotal()) + ' en ' + S.finance.expenses.length + ' conceptos; ' + S.finance.expenses.filter((e) => e.recurrente).length + ' son recurrentes. La partida más grande es ' + CATS.map((c) => [c, S.finance.expenses.filter((e) => e.categoria === c).reduce((s, e) => s + (+e.importe || 0), 0)]).sort((a, b) => b[1] - a[1])[0][0].toLowerCase() + '.' };
    if (has(/(esperan|sin respuesta|pendiente|responder|contestar)/) && has(/lead|contacto|reserva|paciente|mensaje|conversaci/)) { const w = waitingThreads(); return { text: w.length ? 'Hay ' + w.length + ' conversaciones esperando: ' + w.map((x) => x.name + ' (' + CH_LABEL[x.channel] + (x.status === 'aprobacion' ? ', borrador listo' : '') + ')').join(', ') + '. Puedes aprobar los borradores desde la bandeja o pedírmelo aquí.' : 'Ahora mismo nadie espera respuesta. Todo está contestado.' }; }
    if (has(/aprueba|aprobar|envia el borrador|enviar el borrador/)) { const th = S.threads.find((x) => x.status === 'aprobacion' && x.draft); if (!th) return { text: 'No hay ningún borrador pendiente de aprobar.' }; return { text: 'Tengo un borrador para ' + th.name + ' por ' + CH_LABEL[th.channel] + ': «' + th.draft + '»', pending: { kind: 'approve-draft', id: th.id, label: 'enviar ese mensaje a ' + th.name } }; }
    if (has(/resum/) && has(/semana|mes|todo/)) { const wk = weekEvents(0); return { text: 'Resumen: ' + eur(tm.ingresos) + ' facturados este mes (' + pct(delta(tm.ingresos, pm.ingresos)) + '), ' + leadsNew() + ' ' + leadWord(true) + ' nuevos, ' + wk.length + ' citas esta semana (' + wk.filter((e) => !e.confirmed).length + ' sin confirmar), ' + automatedToday() + ' tareas automatizadas hoy y ' + dec1(hoursSaved()) + ' horas ahorradas en el mes. Lo que más te urge: ' + S.approvals.filter((a) => a.status === 'pending').length + ' aprobaciones en el resumen.' }; }
    if (has(/campa/) && has(/peor|mal|car[ao]|cpl alto|menos rinde/)) { const act = S.marketing.campaigns.filter((c) => c.state === 'activa').slice().sort((a, b) => b.cpl - a.cpl); const w = act[0]; return { text: 'La que peor va es «' + w.name + '» (' + S.marketing.platforms[w.platform].name + '): CPL de ' + eur(w.cpl) + ' con ' + w.leads + ' ' + leadWord(true) + ' por ' + eur0(w.budget) + ' al mes. La mejor es «' + act[act.length - 1].name + '» a ' + eur(act[act.length - 1].cpl) + '. ¿Quieres que la pause?', pending: { kind: 'pause', id: w.id, label: 'pausar «' + w.name + '»' } }; }
    if (has(/pausa/) && has(/campa/)) { const act = S.marketing.campaigns.filter((c) => c.state === 'activa'); const named = act.find((c) => t.indexOf(norm(c.name).slice(0, 12)) >= 0) || act.slice().sort((a, b) => b.cpl - a.cpl)[0]; if (!named) return { text: 'No hay campañas activas que pausar.' }; return { text: 'Puedo pausar «' + named.name + '» (CPL ' + eur(named.cpl) + '). Se reasignaría su presupuesto en la siguiente propuesta.', pending: { kind: 'pause', id: named.id, label: 'pausar «' + named.name + '»' } }; }
    const cita = /(crea|programa|agenda|pon|reserva)\w*\s+(una\s+)?(cita|reunion|llamada|visita|demo)\s+con\s+([a-z]+)/.exec(t);
    if (cita) {
      const first = cita[4]; const lead = S.leads.find((l) => norm(l.name).split(' ')[0] === first) || S.leads.find((l) => norm(l.name).indexOf(first) >= 0);
      const dayM = /(lunes|martes|miercoles|jueves|viernes|sabado|domingo|manana|hoy)/.exec(t);
      const hourM = /a\s+las\s+(\d{1,2})(?:[:.h](\d{2}))?/.exec(t);
      const d = new Date();
      if (dayM) { const w = dayM[1]; if (w === 'manana') d.setDate(d.getDate() + 1); else if (w !== 'hoy') { const target = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].indexOf(w); let diff = (target - ((d.getDay() + 6) % 7) + 7) % 7; if (diff === 0) diff = 7; d.setDate(d.getDate() + diff); } } else d.setDate(d.getDate() + 1);
      d.setHours(hourM ? +hourM[1] : 10, hourM && hourM[2] ? +hourM[2] : 0, 0, 0);
      const who = lead ? lead.name : cap(first);
      const busy = S.events.find((e) => Math.abs(new Date(e.start) - d) < 45 * 60000);
      const typeKey = { cita: 'reunion', reunion: 'reunion', llamada: 'llamada', visita: 'visita', demo: 'demo' }[cita[3]] || 'reunion';
      return { text: (busy ? 'Ojo: a esa hora ya tienes «' + busy.title + '». Aun así puedo crearla. ' : 'Ese hueco está libre. ') + 'Propongo «' + P.eventTypes[typeKey] + ' · ' + who + '» el ' + WEEKDAYS[(d.getDay() + 6) % 7] + ' ' + d.getDate() + ' a las ' + hhmm(d) + ', 60 minutos, y la envío a Google Calendar.', pending: { kind: 'event', title: P.eventTypes[typeKey] + ' · ' + who, type: typeKey, start: d.toISOString(), leadId: lead ? lead.id : null, label: 'crear esa cita el ' + WEEKDAYS[(d.getDay() + 6) % 7] + ' a las ' + hhmm(d) } };
    }
    if (has(/cita|agenda|reunion|proxim/)) { const next = S.events.filter((e) => new Date(e.start) > new Date()).sort((a, b) => new Date(a.start) - new Date(b.start)).slice(0, 3); return { text: next.length ? 'Lo siguiente en la agenda: ' + next.map((e) => e.title + ' (' + WEEKDAYS[(new Date(e.start).getDay() + 6) % 7] + ' ' + hhmm(new Date(e.start)) + (e.confirmed ? '' : ', sin confirmar') + ')').join(' · ') + '.' : 'No hay citas próximas.' }; }
    if (has(/hora|ahorr|automatiz|regla/)) return { text: 'Hay ' + S.automations.rules.filter((r) => r.on).length + ' automatizaciones activas. Hoy han hecho ' + automatedToday() + ' tareas y este mes te han ahorrado ' + dec1(hoursSaved()) + ' horas. La que más trabaja es «' + S.automations.rules.slice().sort((a, b) => b.runsToday - a.runsToday)[0].name + '».' };
    if (has(/web|visita|seo|posicion|palabra/)) { const w = S.web; return { text: 'La web está en línea (' + nfDec2.format(w.uptime) + ' % de disponibilidad), con ' + w.visitsToday + ' visitas y ' + w.conversions + ' formularios hoy. LCP ' + dec1(w.cwv.lcp) + ' s, CLS ' + String(w.cwv.cls).replace('.', ',') + ' e INP ' + w.cwv.inp + ' ms: el INP es lo único mejorable. La palabra clave mejor posicionada es «' + w.keywords.slice().sort((a, b) => a.pos - b.pos)[0].kw + '».' }; }
    if (has(/lead|contacto|reserva|paciente|crm/)) { const st = D.STAGES.map((s) => STAGE_LABEL[s] + ' ' + S.leads.filter((l) => l.stage === s).length); return { text: 'En el CRM hay ' + S.leads.length + ' ' + leadWord(true) + ': ' + st.join(', ') + '. Valor en juego: ' + eur0(activeLeads().reduce((s, l) => s + l.value, 0)) + '.' }; }
    if (has(/^(hola|buenas|hey|gracias)/)) return { text: 'Aquí estoy. Prueba con «¿Cuánto hemos facturado este mes?» o «Resume la semana».' };
    return { text: 'No tengo una respuesta preparada para eso en la demostración. Puedo contarte cifras de ingresos, gastos, ' + leadWord(true) + ', citas, campañas o la web, y hacer cosas como crear una cita, pausar una campaña o aprobar un borrador.' };
  }
  function confirmAction(id, yes) {
    const m = S.assistant.messages.find((x) => x.id === id); if (!m || !m.pending) return;
    const p = m.pending; m.pending = null;
    if (!yes) { m.done = 'Cancelado'; save(); openAssistant(); return; }
    if (p.kind === 'event') { const ev = { id: uid('e'), title: p.title, type: p.type, start: p.start, dur: 60, source: 'panel', confirmed: true, leadId: p.leadId, who: p.title.split(' · ')[1] }; S.events.push(ev); const l = S.leads.find((x) => x.id === p.leadId); if (l && (l.stage === 'nuevo' || l.stage === 'contactado')) l.stage = 'reunion'; log('calendar', '«' + p.title + '» creada desde el asistente y enviada a Google Calendar.'); bump('Crea la cita cuando el cliente confirma'); m.done = 'Cita creada y enviada a Google Calendar'; toast('Cita creada'); }
    else if (p.kind === 'pause') { const c = S.marketing.campaigns.find((x) => x.id === p.id); if (c) { c.state = 'pausada'; recalcPlatforms(); log('ads', '«' + c.name + '» pausada desde el asistente.'); m.done = 'Campaña pausada'; toast('«' + c.name + '» pausada'); } }
    else if (p.kind === 'approve-draft') { const th = S.threads.find((x) => x.id === p.id); if (th && th.draft) { const txt = th.draft; th.messages.push({ at: new Date().toISOString(), from: 'tu', text: txt }); th.draft = null; th.status = 'tu'; th.unread = false; log('ok', 'Borrador aprobado desde el asistente y enviado a ' + th.name + '.'); bump('Responde en WhatsApp fuera de horario'); m.done = 'Enviado a ' + th.name; toast('Enviado a ' + th.name); } }
    save(); openAssistant(); render({ animate: false });
  }

  /* ---------- aprobaciones del resumen ---------- */
  function approve(id, edited) {
    const a = S.approvals.find((x) => x.id === id); if (!a || a.status !== 'pending') return;
    a.status = 'approved';
    const body = edited || a.body;
    if (a.kind === 'whatsapp') { const th = S.threads.find((x) => x.name === a.payload.name && x.channel === 'whatsapp') || S.threads.find((x) => x.name === a.payload.name); if (th) { th.messages.push({ at: new Date().toISOString(), from: 'tu', text: body }); th.draft = null; th.status = 'tu'; th.unread = false; } log('whatsapp', 'Respuesta aprobada y enviada por WhatsApp a ' + a.payload.name + '.'); bump('Responde en WhatsApp fuera de horario'); }
    if (a.kind === 'factura') { S.finance.expenses.push({ id: uid('g'), concepto: 'Factura · ' + a.payload.concepto, categoria: 'Proveedores', importe: a.payload.importe, recurrente: false }); log('invoice', 'Factura de ' + a.payload.concepto + ' (' + eur(a.payload.importe) + ') registrada en Gastos.'); bump('Registra la factura del proveedor en Gastos'); }
    if (a.kind === 'ads') { const c = S.marketing.campaigns.find((x) => x.name === a.payload.campaign); if (c) { c.budget = Math.round(c.budget * (1 + a.payload.pct / 100)); c.leads = Math.round(c.budget / c.cpl); recalcPlatforms(); } log('ads', 'Presupuesto de «' + a.payload.campaign + '» subido un ' + a.payload.pct + ' %.'); }
    if (a.kind === 'resena') { const r = S.web.reviews.items.find((x) => x.name === a.payload.name); if (r) { r.reply = body; r.status = 'aprobada'; } log('review', 'Respuesta a la reseña de ' + a.payload.name + ' publicada.'); bump('Pide reseña 2 días después del servicio'); }
    save(); render({ animate: false }); toast('Aprobado: ' + a.title);
  }
  function reject(id) {
    const a = S.approvals.find((x) => x.id === id); if (!a) return;
    a.status = 'rejected';
    log('ok', 'Rechazado: ' + a.title + '.');
    save(); render({ animate: false }); toast('Rechazado', 'warn');
  }
  function editApproval(anchor, id) {
    const a = S.approvals.find((x) => x.id === id); if (!a) return;
    openPopover({ anchor, label: 'Editar antes de aprobar', cls: 'pn-popover--form', align: 'right', html: '<form class="pn-form" data-form="approve-edit" data-id="' + id + '"><p class="pn-eyebrow">Editar antes de aprobar</p><label class="pn-field"><span>' + esc(a.title) + '</span><textarea class="pn-input" name="body" rows="5" autofocus>' + esc(a.body) + '</textarea></label><div class="pn-form__actions">' + btn('Cancelar', 'pop-close', { variant: 'ghost' }) + '<button type="submit" class="btn btn--primary btn--on-dark btn--xs">' + ico('check') + '<span>Aprobar</span></button></div></form>' });
  }

  /* ---------- actividad en directo ---------- */
  const LIVE = [
    (P) => { const p = D.PEOPLE[Math.floor(Math.random() * D.PEOPLE.length)]; const ch = ['instagram', 'whatsapp', 'web'][Math.floor(Math.random() * 3)]; const exists = S.leads.some((l) => l.name === p.name); if (!exists) { const now = new Date().toISOString(); S.leads.unshift({ id: uid('l'), name: p.name, company: P.orgs[Math.floor(Math.random() * P.orgs.length)], sector: P.sectors[Math.floor(Math.random() * P.sectors.length)], value: Math.round((P.value[0] + Math.random() * (P.value[1] - P.value[0])) / 10) * 10, channel: ch, stage: 'nuevo', score: 35 + Math.floor(Math.random() * 45), createdAt: now, lastAt: now, service: P.services[Math.floor(Math.random() * P.services.length)], summary: p.name.split(' ')[0] + ' acaba de escribir por ' + CH_LABEL[ch] + '. La IA ha respondido en 40 s con horarios y dos huecos.', next: 'Llamar hoy', added: true, timeline: [{ at: now, channel: ch, from: 'lead', text: 'Primer mensaje por ' + CH_LABEL[ch] + '.' }, { at: now, channel: ch, from: 'ia', text: 'Respuesta enviada en 40 s.' }] }); } bump(ch === 'web' ? 'Contesta al formulario web en menos de 1 minuto' : 'Responde en WhatsApp fuera de horario'); return ['lead', 'Nuevo ' + leadWord() + ' desde ' + CH_LABEL[ch] + ': ' + p.name + '. Respondido por la IA en 40 s.']; },
    (P) => { const l = S.leads[Math.floor(Math.random() * S.leads.length)]; const d = nextFreeSlot(); S.events.push({ id: uid('e'), title: P.eventTypes.reunion + ' · ' + l.name, type: 'reunion', start: d.toISOString(), dur: 60, source: 'gcal', confirmed: true, leadId: l.id, who: l.name }); bump('Crea la cita cuando el cliente confirma'); return ['calendar', P.eventTypes.reunion + ' con ' + l.name + ' creada en Google Calendar para el ' + WEEKDAYS[(d.getDay() + 6) % 7] + ' a las ' + hhmm(d) + '.']; },
    (P) => { const amt = Math.round((60 + Math.random() * 640) * 100) / 100; const prov = ['Papelería Sants', 'Mensajería Rápida', 'Estudio Nau', 'Gestoría Blanch', 'Telefonía Nord'][Math.floor(Math.random() * 5)]; S.finance.expenses.push({ id: uid('g'), concepto: 'Factura · ' + prov, categoria: 'Proveedores', importe: amt, recurrente: false }); bump('Registra la factura del proveedor en Gastos'); return ['invoice', 'Factura de ' + prov + ' (' + eur(amt) + ') leída en Gmail y registrada en Gastos.']; },
    (P) => { const c = S.marketing.campaigns[Math.floor(Math.random() * S.marketing.campaigns.length)]; const up = 12 + Math.floor(Math.random() * 19); bump('Avisa si el CPL sube más de un 20 %'); return ['ads', 'Aviso: el CPL de «' + c.name + '» ha subido un ' + up + ' % en las últimas 24 h.', true]; },
    (P) => { const p = D.PEOPLE[Math.floor(Math.random() * D.PEOPLE.length)]; bump('Pide reseña 2 días después del servicio'); return ['review', 'Reseña de ' + p.name + ' (5 estrellas) respondida por la IA.']; },
    (P) => { const ev = S.events.filter((e) => new Date(e.start) > new Date())[0]; bump('Responde en WhatsApp fuera de horario'); return ['whatsapp', 'Recordatorio enviado por WhatsApp a ' + (ev ? ev.who : 'Marta Roig') + ' para ' + (ev ? WEEKDAYS[(new Date(ev.start).getDay() + 6) % 7] : 'mañana') + '.']; },
    (P) => { bump('Contesta al formulario web en menos de 1 minuto'); S.web.conversions += 1; S.web.visitsToday += 1 + Math.floor(Math.random() * 4); return ['web', 'Formulario web recibido y contestado en 38 s.']; }
  ];
  let liveT = null, inboxT = null, liveIdx = 0;
  function liveEvent() {
    const P = preset();
    const fn = LIVE[liveIdx % LIVE.length]; liveIdx += 1 + Math.floor(Math.random() * 2);
    const r = fn(P);
    log(r[0], r[1], { notify: !!r[2] });
    save();
    if (view === 'resumen') patchResumen(S.feed[0]);
    else if (view === 'leads' && r[0] === 'lead') render({ animate: false });
    else if (view === 'agenda' && r[0] === 'calendar') render({ animate: false });
    else if (view === 'finanzas' && r[0] === 'invoice') render({ animate: false });
    else if (view === 'automatizaciones') render({ animate: false });
    updateBell();
  }
  function patchResumen(f) {
    const feed = $('[data-feed]');
    if (feed) { const live = $('[data-live]'); if (live && !RM) { live.classList.add('is-arriving'); setTimeout(() => live.classList.remove('is-arriving'), 900); } feed.insertAdjacentHTML('afterbegin', feedItem(f, !RM)); while (feed.children.length > 8) feed.lastElementChild.remove(); }
    const set = (k, v) => { const el = $('[data-kpi="' + k + '"]'); if (el && el.textContent !== v) { el.textContent = v; el.classList.remove('is-tick'); void el.offsetWidth; el.classList.add('is-tick'); } };
    set('tareas', num(automatedToday())); set('leads', num(leadsNew())); set('horas', dec1(hoursSaved()) + ' h'); set('ingresos', eur(thisMonth().ingresos));
    const u = $('[data-updated]'); if (u) u.textContent = 'hoy a las ' + hhmm(new Date());
  }
  function schedule() {
    clearTimeout(liveT); clearTimeout(inboxT);
    if (document.hidden) return;
    liveT = setTimeout(() => { if (!document.hidden) liveEvent(); schedule(); }, 7000 + Math.random() * 7000);
    inboxT = setTimeout(() => { if (!document.hidden) incomingMessage(); }, 26000 + Math.random() * 20000);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(liveT); clearTimeout(inboxT); const svg = $('[data-diagram]'); if (svg && svg.pauseAnimations) svg.pauseAnimations(); } else { schedule(); const svg = $('[data-diagram]'); if (svg && svg.unpauseAnimations && !RM) svg.unpauseAnimations(); } });

  /* ---------- cabecera de la aplicación ---------- */
  const VIEWS = [
    { id: 'resumen', label: 'Resumen', icon: 'home' }, { id: 'leads', label: 'Leads', icon: 'users' }, { id: 'bandeja', label: 'Bandeja', icon: 'inbox' }, { id: 'agenda', label: 'Agenda', icon: 'calendar' },
    { id: 'finanzas', label: 'Finanzas', icon: 'euro' }, { id: 'marketing', label: 'Marketing', icon: 'megaphone' }, { id: 'web', label: 'Web y SEO', icon: 'globe' }, { id: 'automatizaciones', label: 'Automatizaciones', icon: 'nodes' }, { id: 'conexiones', label: 'Conexiones', icon: 'plug' }
  ];
  const RENDER = { resumen: viewResumen, leads: viewLeads, bandeja: viewBandeja, agenda: viewAgenda, finanzas: viewFinanzas, marketing: viewMarketing, web: viewWeb, automatizaciones: viewAutomatizaciones, conexiones: viewConexiones };
  const viewLabel = (v) => v.id === 'leads' ? cap(leadWord(true)) : v.label;
  function renderChrome() {
    const rail = $('[data-rail]');
    if (rail) rail.innerHTML = VIEWS.map((v) => '<li><a class="pn-rail__link' + (v.id === view ? ' is-active' : '') + '" href="#' + v.id + '" data-label="' + esc(viewLabel(v)) + '"' + (v.id === view ? ' aria-current="page"' : '') + '><span class="pn-rail__ico">' + ico(v.icon) + '</span><span class="pn-rail__label">' + esc(viewLabel(v)) + '</span>' + (v.id === 'bandeja' && S.threads.some((t) => t.unread) ? '<span class="pn-rail__dot" aria-label="Hay mensajes sin leer"></span>' : '') + '</a></li>').join('');
    const tabs = $('[data-tabs]');
    if (tabs) tabs.innerHTML = VIEWS.slice(0, 4).map((v) => '<a class="pn-tabs__btn' + (v.id === view ? ' is-active' : '') + '" href="#' + v.id + '"' + (v.id === view ? ' aria-current="page"' : '') + '>' + ico(v.icon) + '<span>' + esc(viewLabel(v)) + '</span></a>').join('') + '<button type="button" class="pn-tabs__btn' + (VIEWS.slice(4).some((v) => v.id === view) ? ' is-active' : '') + '" data-act="more" aria-haspopup="dialog" aria-expanded="false">' + ico('more') + '<span>Más</span></button>';
    const name = $('[data-company-name]'); if (name) name.textContent = S.company.name;
    const av = $('[data-avatar]'); if (av) av.textContent = initials(S.company.name);
    const date = $('[data-date]'); if (date) date.textContent = todayLabel();
    document.documentElement.setAttribute('data-hi', S.company.highlight || 'ivory');
    updateBell();
  }
  function updateBell() {
    const n = S.notifications.filter((x) => !x.read).length;
    const b = $('[data-bell-count]'); if (b) { b.textContent = n; b.hidden = !n; }
    const bell = $('[data-bell]'); if (bell) bell.setAttribute('aria-label', 'Notificaciones' + (n ? ', ' + n + ' sin leer' : ''));
    const dot = $('.pn-rail__dot'); const unread = S.threads.some((t) => t.unread); if (dot && !unread) dot.remove();
  }
  function bellPopover(anchor) {
    openPopover({ anchor, label: 'Notificaciones', align: 'right', cls: 'pn-popover--notif', html: '<header class="pn-popover__head"><p class="pn-eyebrow">Notificaciones</p>' + btn('Marcar todo como leído', 'notif-read', { variant: 'ghost' }) + '</header>' + (S.notifications.length ? '<ul class="pn-notifs">' + S.notifications.slice(0, 8).map((n) => '<li class="pn-notif' + (n.read ? '' : ' is-unread') + '"><p>' + esc(n.text) + '</p><time>' + esc(rel(n.at)) + '</time></li>').join('') + '</ul>' : empty('Sin avisos.', 'bell')) });
  }
  function customizePopover(anchor) {
    const P = D.PRESETS;
    openPopover({ anchor, label: 'Personalizar la demo', cls: 'pn-popover--form', html: '<form class="pn-form" data-form="customize"><p class="pn-eyebrow">Personalizar la demo</p><label class="pn-field"><span>Nombre de la empresa</span><input class="pn-input" name="name" value="' + esc(S.company.name) + '" required autofocus></label><label class="pn-field"><span>Sector</span><select class="pn-select" name="sector">' + Object.keys(P).map((k) => '<option value="' + k + '"' + (k === S.company.sector ? ' selected' : '') + '>' + esc(P[k].label) + '</option>').join('') + '</select></label><fieldset class="pn-field"><legend>Color de la tarjeta destacada</legend><div class="pn-swatches">' + [['ivory', 'Marfil'], ['ambar', 'Ámbar'], ['salvia', 'Salvia']].map((h) => '<label class="pn-swatch-opt"><input type="radio" name="highlight" value="' + h[0] + '"' + (S.company.highlight === h[0] ? ' checked' : '') + '><span class="pn-swatch-opt__chip" data-hi="' + h[0] + '" aria-hidden="true"></span><span>' + h[1] + '</span></label>').join('') + '</div></fieldset><p class="pn-form__hint">Cambiar de sector regenera los datos de ejemplo.</p><div class="pn-form__actions">' + btn('Cancelar', 'pop-close', { variant: 'ghost' }) + '<button type="submit" class="btn btn--primary btn--on-dark btn--xs">' + ico('check') + '<span>Aplicar</span></button></div></form>' });
  }
  function renamePopover(anchor) {
    openPopover({ anchor, label: 'Cambiar el nombre de la empresa', cls: 'pn-popover--form', align: 'right', html: '<form class="pn-form" data-form="rename"><label class="pn-field"><span>Nombre de la empresa</span><input class="pn-input" name="name" value="' + esc(S.company.name) + '" required autofocus></label><div class="pn-form__actions">' + btn('Cancelar', 'pop-close', { variant: 'ghost' }) + '<button type="submit" class="btn btn--primary btn--on-dark btn--xs">' + ico('check') + '<span>Guardar</span></button></div></form>' });
  }
  function moreSheet(anchor) {
    openPopover({ anchor, label: 'Más secciones', cls: 'pn-sheet', rect: { left: 0, right: window.innerWidth, top: 0, bottom: 0, width: window.innerWidth, height: 0 }, html: '<p class="pn-eyebrow">Más</p><ul class="pn-sheet__list">' + VIEWS.slice(4).map((v) => '<li><a class="pn-sheet__item' + (v.id === view ? ' is-active' : '') + '" href="#' + v.id + '">' + ico(v.icon) + esc(viewLabel(v)) + '</a></li>').join('') + '<li><a class="pn-sheet__item" href="#asistente">' + ico('sparkle') + 'Asistente IA</a></li><li><button type="button" class="pn-sheet__item" data-act="customize">' + ico('palette') + 'Personalizar</button></li><li><button type="button" class="pn-sheet__item" data-act="reset">' + ico('refresh') + 'Restablecer demo</button></li></ul>' });
  }
  function resetDemo() {
    try { localStorage.removeItem(KEY); } catch (e) { /* nada */ }
    S = D.buildState('b2b');
    save(); closePopover(); closeAssistant();
    if (location.hash && location.hash !== '#resumen') location.hash = '#resumen'; else render({ animate: true });
    toast('Demo restablecida');
  }

  /* ---------- render ---------- */
  const scrollMem = {};
  function render(o) {
    o = o || {};
    const main = $('[data-main]'); if (!main || !S) return;
    const fk = document.activeElement && document.activeElement.getAttribute ? document.activeElement.getAttribute('data-fk') : null;
    const sel = document.activeElement && document.activeElement.selectionStart;
    $$('[data-scroll]', main).forEach((el) => { scrollMem[el.getAttribute('data-scroll')] = { t: el.scrollTop, l: el.scrollLeft }; });
    const mainTop = main.scrollTop;
    charts.length = 0;
    hideTip();
    main.innerHTML = (RENDER[view] || viewResumen)();
    main.scrollTop = o.animate ? 0 : mainTop;
    $$('[data-scroll]', main).forEach((el) => { const m = scrollMem[el.getAttribute('data-scroll')]; if (m) { el.scrollTop = m.t; el.scrollLeft = m.l; } });
    const bubbles = $('[data-bubbles]', main); if (bubbles && !scrollMem.bubbles) bubbles.scrollTop = bubbles.scrollHeight;
    drawCharts(o.animate !== false);
    renderChrome();
    // the base title is the one in the HTML (written by _build/seo-inject.js from
    // meta.json); the default view keeps it intact so crawlers and the tab agree
    if (!window.__pnBaseTitle) window.__pnBaseTitle = document.title;
    document.title = (view === VIEWS[0].id ? '' : viewLabel(VIEWS.find((v) => v.id === view) || VIEWS[0]) + ' · ') + window.__pnBaseTitle;
    if (fk) { const el = main.querySelector('[data-fk="' + fk + '"]'); if (el) { el.focus({ preventScroll: true }); if (typeof sel === 'number' && el.setSelectionRange) { try { el.setSelectionRange(sel, sel); } catch (e) { /* tipo sin selección */ } } } }
    if (o.animate && !RM) { main.classList.remove('is-enter'); void main.offsetWidth; main.classList.add('is-enter'); }
    const svg = $('[data-diagram]'); if (svg && (RM || document.hidden) && svg.pauseAnimations) svg.pauseAnimations();
  }
  function route() {
    const h = location.hash.replace('#', '');
    if (h === 'asistente') { openAssistant(); render({ animate: false }); return; }
    const v = RENDER[h] ? h : 'resumen';
    const changed = v !== view;
    view = v;
    if (changed && S) { S.ui.query = ''; const qi = $('#pn-q'); if (qi) qi.value = ''; S.ui.selectedLead = null; S.ui.inboxPane = 'list'; }
    closePopover();
    render({ animate: changed });
    if (changed) { const main = $('[data-main]'); if (main && !document.activeElement.closest('.pn-top')) main.focus({ preventScroll: true }); }
  }

  /* ---------- acciones (delegación) ---------- */
  const ACTIONS = {
    'range': (b) => commit((s) => { s.ui.range = b.getAttribute('data-val'); }),
    'approve': (b) => approve(b.getAttribute('data-id')),
    'approve-edit': (b) => editApproval(b, b.getAttribute('data-id')),
    'reject': (b) => reject(b.getAttribute('data-id')),
    'leads-ch': (b) => commit((s) => { s.ui.leadsChannel = b.getAttribute('data-val'); }),
    'leads-mode': (b) => commit((s) => { s.ui.leadsMode = b.getAttribute('data-val'); }),
    'lead-new': (b) => newLeadForm(b),
    'lead-menu': (b) => leadMenu(b, b.getAttribute('data-id')),
    'lead-open': (b) => { closePopover(); const id = b.getAttribute('data-id') || b.getAttribute('data-lead'); commit((s) => { s.ui.selectedLead = id; }); const d = $('[data-detail]'); if (d) { const f = d.querySelector('button, select'); if (f) f.focus({ preventScroll: true }); } },
    'lead-close': () => commit((s) => { s.ui.selectedLead = null; }),
    'lead-move': (b) => { closePopover(); moveLead(b.getAttribute('data-id'), b.getAttribute('data-stage'), 'desde el menú'); },
    'lead-meeting': (b) => scheduleMeeting(b.getAttribute('data-id')),
    'lead-draft': (b) => draftFromLead(b.getAttribute('data-id')),
    'inbox-filter': (b) => commit((s) => { s.ui.inboxFilter = b.getAttribute('data-val'); }),
    'thread-open': (b) => commit((s) => { const t = s.threads.find((x) => x.id === b.getAttribute('data-id')); s.ui.selectedThread = b.getAttribute('data-id'); s.ui.inboxPane = 'thread'; if (t) t.unread = false; }),
    'thread-back': () => commit((s) => { s.ui.inboxPane = 'list'; }),
    'thread-lead': (b, e) => { S.ui.selectedLead = b.getAttribute('data-id'); save(); },
    'draft-discard': (b) => commit((s) => { const t = s.threads.find((x) => x.id === b.getAttribute('data-id')); if (t) { t.draft = null; t.status = 'tu'; } log('ok', 'Borrador descartado.'); }, { toast: 'Borrador descartado' }),
    'week': (b) => commit((s) => { const v = +b.getAttribute('data-val'); s.ui.weekOffset = v === 0 ? 0 : s.ui.weekOffset + v; }),
    'slot': (b) => { const col = b.closest('.pn-week__col'); slotForm(b.getBoundingClientRect(), col.getAttribute('data-date'), +b.getAttribute('data-half')); },
    'suggest': (b) => { const l = S.leads.find((x) => x.id === b.getAttribute('data-id')); const d = new Date(b.getAttribute('data-date')); d.setHours(+b.getAttribute('data-h'), 0, 0, 0); const P = preset(); commit((s) => { s.events.push({ id: uid('e'), title: P.eventTypes.reunion + ' · ' + l.name, type: 'reunion', start: d.toISOString(), dur: 60, source: 'panel', confirmed: true, leadId: l.id, who: l.name }); if (l.stage === 'nuevo' || l.stage === 'contactado') l.stage = 'reunion'; s.ui.suggestionDone = true; log('calendar', P.eventTypes.reunion + ' con ' + l.name + ' confirmada para el jueves a las ' + hhmm(d) + ' y enviada a Google Calendar.'); bump('Crea la cita cuando el cliente confirma'); }, { toast: 'Cita confirmada: jueves ' + hhmm(d) }); },
    'event-confirm': (b) => { closePopover(); commit((s) => { const e = s.events.find((x) => x.id === b.getAttribute('data-id')); if (e) e.confirmed = true; }, { toast: 'Evento confirmado' }); },
    'event-delete': (b) => { closePopover(); commit((s) => { const e = s.events.find((x) => x.id === b.getAttribute('data-id')); s.events = s.events.filter((x) => x.id !== b.getAttribute('data-id')); if (e) log('calendar', '«' + e.title + '» eliminado de Google Calendar.'); }, { toast: 'Evento eliminado', kind: 'warn' }); },
    'exp-del': (b) => commit((s) => { const e = s.finance.expenses.find((x) => x.id === b.getAttribute('data-id')); s.finance.expenses = s.finance.expenses.filter((x) => x.id !== b.getAttribute('data-id')); if (e) log('money', 'Gasto «' + e.concepto + '» eliminado.'); }, { toast: 'Gasto eliminado', kind: 'warn' }),
    'invoice-remind': (b) => commit((s) => { const i = s.finance.invoices.find((x) => x.id === b.getAttribute('data-id')); if (i) { i.reminded = true; log('whatsapp', 'Recordatorio de cobro enviado por WhatsApp a ' + i.cliente + ' (' + eur(i.importe) + ').'); bump('Responde en WhatsApp fuera de horario'); } }, { toast: 'Recordatorio enviado por WhatsApp' }),
    'camp-toggle': (b) => commit((s) => { const c = s.marketing.campaigns.find((x) => x.id === b.getAttribute('data-id')); if (c) { c.state = c.state === 'activa' ? 'pausada' : 'activa'; recalcPlatforms(); log('ads', '«' + c.name + '» ' + (c.state === 'activa' ? 'activada' : 'pausada') + '.'); } }),
    'optimize': () => optimize(),
    'proposal-accept': () => acceptProposal(),
    'proposal-discard': () => commit((s) => { s.marketing.proposal = null; }),
    'sc-range': (b) => commit((s) => { s.ui.scRange = b.getAttribute('data-val'); }),
    'kw-sort': (b) => commit((s) => { const k = b.getAttribute('data-key'); s.ui.kwSort = { key: k, dir: s.ui.kwSort.key === k && s.ui.kwSort.dir === 'asc' ? 'desc' : 'asc' }; }),
    'review-approve': (b) => commit((s) => { const r = s.web.reviews.items.find((x) => x.id === b.getAttribute('data-id')); if (r) { r.status = 'aprobada'; log('review', 'Respuesta a la reseña de ' + r.name + ' publicada.'); bump('Pide reseña 2 días después del servicio'); } }, { toast: 'Respuesta publicada' }),
    'review-edit': (b) => { const r = S.web.reviews.items.find((x) => x.id === b.getAttribute('data-id')); openPopover({ anchor: b, label: 'Editar respuesta', cls: 'pn-popover--form', html: '<form class="pn-form" data-form="review-edit" data-id="' + r.id + '"><label class="pn-field"><span>Respuesta a ' + esc(r.name) + '</span><textarea class="pn-input" name="reply" rows="5" autofocus>' + esc(r.reply) + '</textarea></label><div class="pn-form__actions">' + btn('Cancelar', 'pop-close', { variant: 'ghost' }) + '<button type="submit" class="btn btn--primary btn--on-dark btn--xs">' + ico('check') + '<span>Guardar y publicar</span></button></div></form>' }); },
    'rule-del': (b) => commit((s) => { s.automations.rules = s.automations.rules.filter((r) => r.id !== b.getAttribute('data-id')); }, { toast: 'Automatización eliminada', kind: 'warn' }),
    'conn': (b) => connOp(b.getAttribute('data-id'), b.getAttribute('data-op')),
    'ask': (b) => ask(b.getAttribute('data-q')),
    'assistant-close': () => closeAssistant(),
    'confirm-yes': (b) => confirmAction(b.getAttribute('data-id'), true),
    'confirm-no': (b) => confirmAction(b.getAttribute('data-id'), false),
    'notif-read': () => { S.notifications.forEach((n) => { n.read = true; }); save(); closePopover(); updateBell(); },
    'customize': (b) => { closePopover(); customizePopover(b); },
    'reset': () => resetDemo(),
    'more': (b) => moreSheet(b),
    'pop-close': () => closePopover()
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (b && b.tagName !== 'INPUT' && b.tagName !== 'SELECT' && b.tagName !== 'TEXTAREA') {
      const act = b.getAttribute('data-act');
      if (ACTIONS[act]) { if (b.tagName !== 'A') e.preventDefault(); ACTIONS[act](b, e); return; }
    }
    const node = e.target.closest('[data-node]');
    if (node) { toggleNode(node.getAttribute('data-node')); return; }
    const ev = e.target.closest('.pn-week__event');
    if (ev && !evDrag.active) { eventPopover(ev, ev.getAttribute('data-event')); return; }
    const lead = e.target.closest('.pn-lead');
    if (lead && !e.target.closest('button') && !drag.active) { ACTIONS['lead-open'](lead); return; }
    if (e.target.closest('[data-open-assistant]')) { e.preventDefault(); if (assistantOpen) closeAssistant(); else openAssistant(); return; }
    if (e.target.closest('[data-bell]')) { const b2 = e.target.closest('[data-bell]'); if (pop.el && pop.anchor === b2) closePopover(); else bellPopover(b2); return; }
    if (e.target.closest('[data-company]')) { renamePopover(e.target.closest('[data-company]')); return; }
    if (e.target.closest('[data-customize]')) { customizePopover(e.target.closest('[data-customize]')); return; }
    if (e.target.closest('[data-reset]')) { resetDemo(); return; }
    if (e.target.closest('[data-scrim]')) { closeAssistant(); return; }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (pop.el) { closePopover(); return; } if (assistantOpen) { closeAssistant(); return; } if (S && S.ui.selectedLead) { commit((s) => { s.ui.selectedLead = null; }); return; } }
    const t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t.classList) {
      if (t.classList.contains('pn-lead')) { e.preventDefault(); ACTIONS['lead-open'](t); }
      else if (t.hasAttribute('data-node')) { e.preventDefault(); toggleNode(t.getAttribute('data-node')); }
    }
    if (e.key === 'Tab' && assistantOpen) {
      const d = $('[data-assistant]'); const f = $$('button, input, [href], select, textarea, [tabindex="0"]', d).filter((x) => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-form]'); if (!f) return;
    e.preventDefault();
    const fd = {}; new FormData(f).forEach((v, k) => { fd[k] = v; });
    const kind = f.getAttribute('data-form');
    if (kind === 'lead-new') addLead(fd);
    else if (kind === 'reply') sendReply(f.getAttribute('data-id'), fd.text || '');
    else if (kind === 'event-new') { const P = preset(); const d = new Date(f.getAttribute('data-start')); closePopover(); commit((s) => { s.events.push({ id: uid('e'), title: fd.title.trim(), type: fd.type, start: d.toISOString(), dur: +fd.dur, source: 'panel', confirmed: true, who: fd.title.split('·').pop().trim() }); log('calendar', '«' + fd.title.trim() + '» creado el ' + WEEKDAYS[(d.getDay() + 6) % 7] + ' a las ' + hhmm(d) + ' y enviado a Google Calendar.'); }, { toast: 'Evento creado' }); }
    else if (kind === 'exp-new') { commit((s) => { s.finance.expenses.push({ id: uid('g'), concepto: fd.concepto.trim(), categoria: fd.categoria, importe: Math.round((+fd.importe || 0) * 100) / 100, recurrente: !!fd.recurrente }); log('money', 'Gasto añadido: ' + fd.concepto.trim() + ' (' + eur(+fd.importe || 0) + ').'); }, { toast: 'Gasto añadido' }); }
    else if (kind === 'rule-new') { const from = f.querySelector('[name="from"]'), to = f.querySelector('[name="to"]'); addRule(fd.from, fd.to, from.options[from.selectedIndex].text, to.options[to.selectedIndex].text); }
    else if (kind === 'approve-edit') { closePopover(); approve(f.getAttribute('data-id'), fd.body); }
    else if (kind === 'review-edit') { closePopover(); commit((s) => { const r = s.web.reviews.items.find((x) => x.id === f.getAttribute('data-id')); if (r) { r.reply = fd.reply; r.status = 'aprobada'; log('review', 'Respuesta a la reseña de ' + r.name + ' publicada.'); } }, { toast: 'Respuesta publicada' }); }
    else if (kind === 'rename') { closePopover(); commit((s) => { s.company.name = fd.name.trim() || s.company.name; }, { toast: 'Nombre actualizado' }); }
    else if (kind === 'customize') { closePopover(); if (fd.sector !== S.company.sector) { S = D.buildState(fd.sector, { companyName: fd.name.trim() === S.company.name ? undefined : fd.name.trim(), highlight: fd.highlight }); if (!fd.name.trim() || fd.name.trim() === (D.PRESETS[S.company.sector] || {}).company) { /* nombre del preset */ } save(); render({ animate: true }); toast('Demo regenerada: ' + D.PRESETS[fd.sector].label); } else commit((s) => { s.company.name = fd.name.trim() || s.company.name; s.company.highlight = fd.highlight; }, { toast: 'Cambios aplicados' }); }
    else if (kind === 'ask') { const inp = f.querySelector('input'); const v = inp.value; inp.value = ''; ask(v); }
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.getAttribute('data-act');
    if (act === 'leads-sector') commit((s) => { s.ui.leadsSector = el.value; });
    else if (act === 'lead-stage') moveLead(el.getAttribute('data-id'), el.value, 'desde el detalle');
    else if (act === 'exp-edit') { const ex = S.finance.expenses.find((x) => x.id === el.getAttribute('data-id')); if (!ex) return; const field = el.getAttribute('data-field'); commit((s) => { if (field === 'importe') ex.importe = Math.round((+el.value || 0) * 100) / 100; else if (field === 'recurrente') ex.recurrente = el.checked; else ex[field] = el.value; }); }
    else if (act === 'task') commit((s) => { const t = s.web.tasks.find((x) => x.id === el.getAttribute('data-id')); if (t) { t.done = el.checked; if (t.done) log('web', 'Tarea SEO completada: ' + t.text + '.'); } });
    else if (act === 'rule-toggle') commit((s) => { const r = s.automations.rules.find((x) => x.id === el.getAttribute('data-id')); if (r) { r.on = el.checked; log('auto', '«' + r.name + '» ' + (r.on ? 'activada' : 'desactivada') + '.'); } });
    else if (act === 'budget') { const p = S.marketing.platforms[el.getAttribute('data-id')]; p.projBudget = +el.value; save(); }
  });
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.id === 'pn-q') { clearTimeout(el._t); el._t = setTimeout(() => { S.ui.query = el.value; render({ animate: false }); }, 140); return; }
    const act = el.getAttribute && el.getAttribute('data-act');
    if (act === 'budget') { const k = el.getAttribute('data-id'); const p = S.marketing.platforms[k]; const B = +el.value; el.style.setProperty('--pct', ((B - el.min) / (el.max - el.min) * 100).toFixed(1) + '%'); const L = projLeads(p, B); const out = $('[data-budget-out="' + k + '"]'); if (out) out.textContent = eur0(B); const pl = $('[data-proj-leads="' + k + '"]'); if (pl) pl.textContent = num(Math.round(L)); const pc = $('[data-proj-cpl="' + k + '"]'); if (pc) pc.textContent = eur(B / Math.max(L, 0.1)); }
    else if (act === 'reply-edit') { const t = S.threads.find((x) => x.id === el.getAttribute('data-id')); if (t && t.draft != null) { t.draft = el.value; save(); } }
  });
  document.addEventListener('pointerdown', (e) => { if (e.target.closest('.pn-lead')) dragStart(e); else if (e.target.closest('.pn-week__event')) evDragStart(e); });
  window.addEventListener('hashchange', route);
  let rs = null;
  new ResizeObserver(() => { clearTimeout(rs); rs = setTimeout(() => { if (S) drawCharts(false); }, 160); }).observe(document.documentElement);

  /* ---------- arranque: esqueleto ~500 ms y a pintar ---------- */
  function skeleton() {
    return '<div class="pn-skel" aria-hidden="true"><div class="pn-skel__head"><i style="width:34%"></i><i style="width:52%"></i></div><div class="pn-kpis">' + '<div class="pn-skel__tile"></div>'.repeat(4) + '</div><div class="pn-grid"><div class="pn-skel__block span-8"></div><div class="pn-skel__block span-4"></div><div class="pn-skel__block span-4"></div><div class="pn-skel__block span-4"></div><div class="pn-skel__block span-4"></div></div></div>';
  }
  function boot() {
    S = load();
    const h = location.hash.replace('#', '');
    view = RENDER[h] ? h : 'resumen';
    S.ui.query = ''; S.ui.selectedLead = null; S.ui.inboxPane = 'list';
    renderChrome();
    const main = $('[data-main]');
    main.innerHTML = skeleton();
    main.setAttribute('aria-busy', 'true');
    setTimeout(() => { main.removeAttribute('aria-busy'); render({ animate: true }); if (h === 'asistente') openAssistant(); schedule(); }, RM ? 80 : 520);
    setInterval(() => { const d = $('[data-date]'); if (d) d.textContent = todayLabel(); }, 60000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
