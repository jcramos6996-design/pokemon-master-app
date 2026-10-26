(() => {
'use strict';

/* ============================================================
   Utilidades
   ============================================================ */
const $ = (s, r = document) => r.querySelector(s);
const CFG = Object.assign({ imageDir: 'cards/', imageExts: ['webp', 'png', 'jpg', 'jpeg'], regions: null },
  window.CARD_CONFIG || {});
if (!CFG.imageDir.endsWith('/')) CFG.imageDir += '/';
// Ids: "025" (carta base) o "025_ash" (variante). El número de Pokédex es la parte numérica.
const pad = x => {
  const m = /^(\d+)(?:[_\-\s]*(.+))?$/.exec(String(x).trim().toLowerCase());
  if (!m) return String(x).trim();
  const suf = (m[2] || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
  return m[1].padStart(3, '0') + (suf ? '_' + suf : '');
};
const dexOf = id => id.split('_')[0];
const norm = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const flat = s => norm(s).replace(/[^a-z0-9]/g, '');
const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const list = v => Array.isArray(v) ? v : (v ? [v] : []);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

const TYPE_ES = { bug: 'Bicho', dark: 'Siniestro', dragon: 'Dragón', electric: 'Eléctrico', fairy: 'Hada',
  fighting: 'Lucha', fire: 'Fuego', flying: 'Volador', ghost: 'Fantasma', grass: 'Planta', ground: 'Tierra',
  ice: 'Hielo', normal: 'Normal', poison: 'Veneno', psychic: 'Psíquico', rock: 'Roca', steel: 'Acero', water: 'Agua' };

// Alias en español -> etiqueta interna (sin acentos)
const ES_ALIAS = {
  bicho: 'bug', siniestro: 'dark', dragon: 'dragon', electrico: 'electric', hada: 'fairy', lucha: 'fighting',
  fuego: 'fire', volador: 'flying', fantasma: 'ghost', planta: 'grass', tierra: 'ground', hielo: 'ice',
  veneno: 'poison', psiquico: 'psychic', roca: 'rock', acero: 'steel', agua: 'water',
  rosa: 'pink', verde: 'green', azul: 'blue', amarillo: 'yellow', rojo: 'red', legendario: 'legendary',
  inicial: 'starter', fosil: 'fossil', excavar: 'dig', volar: 'fly', surfear: 'surf', teletransporte: 'teleport'
};

const DEFAULT_REGIONS = [['kanto', 'Kanto'], ['johto', 'Johto'], ['hoenn', 'Hoenn'], ['sinnoh', 'Sinnoh'],
  ['unova', 'Teselia'], ['kalos', 'Kalos'], ['alola', 'Alola'], ['galar', 'Galar'], ['paldea', 'Paldea'], ['hisui', 'Hisui']];

/* ============================================================
   Secciones de filtros
   ============================================================ */
const SECTIONS = [
  { key: 'gen', title: 'Generación', tags: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ['gen' + n, 'Gen ' + n]) },
  { key: 'region', title: 'Pokédex regional', tags: (CFG.regions || DEFAULT_REGIONS).slice() },
  { key: 'evo', title: 'Estado evolutivo', match: true, tags: [
    ['stage1', 'Etapa 1'], ['stage2', 'Etapa 2'], ['stage3', 'Etapa 3'], ['canevolve', 'Puede evolucionar'],
    ['splitevo', 'Evolución ramificada'], ['noevo', 'Sin evoluciones'], ['mega', 'Megaevolución'],
    ['canmega', 'Puede megaevolucionar'], ['evocanmega', 'Su línea megaevoluciona'], ['gmax', 'Gigamax'],
    ['cangmax', 'Puede gigamaxear'], ['evocangmax', 'Su línea gigamaxea'] ] },
  { key: 'color', title: 'Color / categoría', tags: [
    ['pink', 'Rosa'], ['green', 'Verde'], ['blue', 'Azul'], ['yellow', 'Amarillo'], ['red', 'Rojo'],
    ['legendary', 'Legendario'], ['mega', 'Mega'], ['ultrabeast', 'Ultraente'], ['gmax', 'Gigamax'], ['paradox', 'Paradoja'] ] },
  { key: 'type', title: 'Tipos', match: true, max: 2, tags:
    Object.keys(TYPE_ES).map(t => [t, TYPE_ES[t]]).concat([['monotype', 'Sin tipo secundario']]) },
  { key: 'ability', title: 'Habilidades de campo', match: true, tags: [
    ['dig', 'Excavar'], ['fly', 'Volar'], ['surf', 'Surf'], ['teleport', 'Teletransporte'] ] },
  { key: 'prop', title: 'Propiedades únicas', match: true, tags: [
    ['starter', 'Inicial'], ['regional', 'Regional'], ['formchange', 'Varias formas'], ['fossil', 'Fósil'],
    ['ultrabeast', 'Ultraente'], ['paradox', 'Paradoja'], ['special', 'Especial'], ['variant', 'Variante'] ] }
];

/* ============================================================
   Datos: normalización, familias evolutivas y etiquetas
   ============================================================ */
const CARDS = (window.CARDS || []).map(c => {
  const o = Object.assign({ types: [], regions: [], abilities: [], props: [], evolvesTo: [], forms: [], aliases: [] }, c);
  o.id = pad(o.id);
  o.dex = dexOf(o.id);
  o.variant = o.id.includes('_');
  o.types = list(o.types).map(norm);
  o.evolvesTo = list(o.evolvesTo).map(pad);
  o.regions = list(o.regions).map(norm);
  o.abilities = list(o.abilities).map(norm);
  o.props = list(o.props).map(norm);
  o.forms = list(o.forms);
  o.aliases = list(o.aliases);
  return o;
}).sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));

const byId = new Map(CARDS.map(c => [c.id, c]));

const parents = {};
CARDS.forEach(c => c.evolvesTo.forEach(t => (parents[t] = parents[t] || []).push(c.id)));
// Una variante sin enlaces evolutivos propios hereda la línea de su carta base
CARDS.forEach(c => {
  c._inherit = c.variant && !c.evolvesTo.length && !(parents[c.id] || []).length && byId.has(c.dex) ? byId.get(c.dex) : null;
});

// Familias (grupos unidos por evolución)
const uf = {};
const find = x => (uf[x] === x ? x : (uf[x] = find(uf[x])));
CARDS.forEach(c => { uf[c.id] = c.id; });
CARDS.forEach(c => c.evolvesTo.forEach(t => { if (byId.has(t)) uf[find(t)] = find(c.id); }));
CARDS.forEach(c => { if (c._inherit) uf[find(c.id)] = find(c._inherit.id); });
const famMembers = {};
CARDS.forEach(c => { c._fam = find(c.id); (famMembers[c._fam] = famMembers[c._fam] || []).push(c); });

const depthMemo = {};
function depth(id, seen = {}) {
  if (depthMemo[id]) return depthMemo[id];
  if (seen[id]) return 1;
  seen[id] = 1;
  const c = byId.get(id);
  if (c && c._inherit) return (depthMemo[id] = depth(c._inherit.id, seen));
  const p = (parents[id] || []).filter(x => byId.has(x));
  return (depthMemo[id] = p.length ? 1 + Math.max(...p.map(x => depth(x, seen))) : 1);
}

CARDS.forEach(c => {
  const fam = famMembers[c._fam];
  const t = (c.tags = new Set());
  if (c.gen) t.add('gen' + c.gen);
  c.types.forEach(x => t.add(x));
  if (c.types.length < 2) t.add('monotype');
  c.regions.forEach(x => t.add(x));
  list(c.color).forEach(x => t.add(norm(x)));
  c.abilities.forEach(x => t.add(x));
  c.props.forEach(x => t.add(x));
  const d = depth(c.id);
  if (d <= 3) t.add('stage' + d);
  if (c.variant) t.add('variant');
  if (c.evolvesTo.length || (c._inherit && c._inherit.evolvesTo.length)) t.add('canevolve');
  if (fam.filter(m => !m._inherit).length === 1) t.add('noevo');
  if (fam.some(m => m.evolvesTo.length > 1)) t.add('splitevo');
  if (c.mega) t.add('mega');
  if (c.canMega) t.add('canmega');
  if (c.gmax) t.add('gmax');
  if (c.canGmax) t.add('cangmax');
  if (fam.some(m => m.canMega)) t.add('evocanmega');
  if (fam.some(m => m.canGmax)) t.add('evocangmax');
  c._keys = [flat(c.name), ...norm(c.name).split(/[^a-z0-9]+/).filter(Boolean), ...c.aliases.map(flat)];
});
const FAMKEYS = {};
CARDS.forEach(c => { (FAMKEYS[c._fam] = FAMKEYS[c._fam] || []).push(...c._keys); });

// Regiones que aparezcan en tus cartas pero no en la lista por defecto
{
  const reg = SECTIONS.find(s => s.key === 'region');
  const known = new Set(reg.tags.map(x => x[0]));
  CARDS.forEach(c => c.regions.forEach(r => { if (!known.has(r)) { known.add(r); reg.tags.push([r, cap(r)]); } }));
}

const TAGSET = new Set();
const SEC_OF = {};
const TAGCOUNT = {};
SECTIONS.forEach(s => s.tags.forEach(([tag]) => { TAGSET.add(tag); if (!SEC_OF[tag]) SEC_OF[tag] = s.key; }));
CARDS.forEach(c => c.tags.forEach(tag => { TAGSET.add(tag); TAGCOUNT[tag] = (TAGCOUNT[tag] || 0) + 1; }));

/* ============================================================
   Estado y búsqueda
   ============================================================ */
const state = { q: '', sel: {}, neg: new Set(), mode: {} };
SECTIONS.forEach(s => { state.sel[s.key] = new Set(); state.mode[s.key] = 'any'; });
state.sel.misc = new Set(); state.mode.misc = 'any';

function parseQuery(q) {
  return norm(q).split(/\s+/).filter(Boolean).map(tok => {
    let neg = false;
    if (tok[0] === '-') { neg = true; tok = tok.slice(1); }
    if (!tok) return null;
    const alts = tok.split('/').filter(Boolean).map(a => a.split('+').filter(Boolean).map(x => ES_ALIAS[x] || x));
    if (!alts.length) return null;
    return { neg, alts, simple: alts.length === 1 && alts[0].length === 1 ? alts[0][0] : null };
  }).filter(Boolean);
}

function atomMatch(c, a) {
  if (/^\d+(_[a-z0-9]+)?$/.test(a)) return a.includes('_') ? c.id === pad(a) : c.dex === pad(a);
  if (TAGSET.has(a)) return c.tags.has(a);
  const f = flat(a);
  if (!f) return true;
  return FAMKEYS[c._fam].some(k => k.startsWith(f));
}
const termMatch = (c, term) => term.alts.some(and => and.every(a => atomMatch(c, a)));

function buildPredicate() {
  const preds = [];
  const groups = {};
  const group = key => (groups[key] = groups[key] || { mode: state.mode[key] || 'any', tags: new Set() });

  Object.keys(state.sel).forEach(key => state.sel[key].forEach(tag => group(key).tags.add(tag)));
  state.neg.forEach(tag => preds.push(c => !c.tags.has(tag)));

  parseQuery(state.q).forEach(term => {
    if (term.neg) preds.push(c => !termMatch(c, term));
    else if (term.simple && TAGSET.has(term.simple)) group(SEC_OF[term.simple] || 'misc').tags.add(term.simple);
    else preds.push(c => termMatch(c, term));
  });

  Object.values(groups).forEach(g => {
    const tags = [...g.tags];
    if (!tags.length) return;
    preds.push(g.mode === 'all' ? c => tags.every(t => c.tags.has(t)) : c => tags.some(t => c.tags.has(t)));
  });
  return c => preds.every(p => p(c));
}

/* ============================================================
   Imágenes (con búsqueda de extensión y marcador de posición)
   ============================================================ */
let learnedExt = null;
function candidates(c, formImg) {
  if (formImg) return [CFG.imageDir + formImg];
  if (c.image) return [CFG.imageDir + c.image];
  const exts = learnedExt ? [learnedExt, ...CFG.imageExts.filter(e => e !== learnedExt)] : CFG.imageExts;
  return exts.map(e => CFG.imageDir + c.id + '.' + e);
}
function placeholder(c) {
  const d = document.createElement('div');
  d.className = 'ph';
  if (c.types[0]) d.dataset.type = c.types[0];
  d.innerHTML = `<b>${esc(c.name)}</b><span>#${esc(c.id)}</span><small>sin imagen</small>`;
  return d;
}
function artEl(c, formImg, eager) {
  const wrap = document.createElement('div');
  wrap.className = 'art';
  const cands = candidates(c, formImg);
  let i = 0;
  const img = new Image();
  img.decoding = 'async';
  if (!eager) img.loading = 'lazy';
  img.alt = c.name;
  img.onload = () => { const m = /\.(\w+)$/.exec(img.src); if (m && !c.image && !formImg) learnedExt = m[1]; };
  img.onerror = () => {
    i++;
    if (i < cands.length) img.src = cands[i];
    else { img.remove(); wrap.appendChild(placeholder(c)); }
  };
  img.src = cands[0];
  wrap.appendChild(img);
  return wrap;
}

/* ============================================================
   Rejilla (render por lotes)
   ============================================================ */
const grid = $('#grid');
let filtered = [];
let shown = 0;
const BATCH = 48;

function cardEl(c) {
  const b = document.createElement('button');
  b.className = 'card';
  b.type = 'button';
  b.dataset.id = c.id;
  b.setAttribute('aria-label', `${c.name} #${c.id}`);
  b.appendChild(artEl(c));
  return b;
}
function renderBatch() {
  const end = Math.min(shown + BATCH, filtered.length);
  const frag = document.createDocumentFragment();
  for (let i = shown; i < end; i++) frag.appendChild(cardEl(filtered[i]));
  shown = end;
  grid.appendChild(frag);
}
new IntersectionObserver(es => { if (es[0].isIntersecting && shown < filtered.length) renderBatch(); },
  { rootMargin: '800px' }).observe($('#sentinel'));

grid.addEventListener('click', e => {
  const b = e.target.closest('.card');
  if (b) openDetail(b.dataset.id);
});

/* ============================================================
   Filtros: interfaz
   ============================================================ */
const fbody = $('#fbody');
const tagBtns = [];

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, 2200);
}

function toggleSel(tag, sec) {
  if (state.neg.has(tag)) { state.neg.delete(tag); return update(); }
  const set = state.sel[sec];
  if (set.has(tag)) set.delete(tag);
  else {
    const s = SECTIONS.find(x => x.key === sec);
    if (s && s.max && state.mode[sec] === 'all' && tag !== 'monotype' &&
        [...set].filter(t => t !== 'monotype').length >= s.max) { toast('Ningún Pokémon tiene más de dos tipos'); return; }
    set.add(tag);
  }
  update();
}
function toggleNeg(tag, sec) {
  if (state.neg.has(tag)) state.neg.delete(tag);
  else { state.neg.add(tag); state.sel[sec].delete(tag); }
  update();
}

function bindTagBtn(btn, tag, sec) {
  let timer = null, long = false, moved = false, sx = 0, sy = 0;
  btn.addEventListener('pointerdown', e => {
    long = false; moved = false; sx = e.clientX; sy = e.clientY;
    clearTimeout(timer);
    timer = setTimeout(() => { long = true; if (navigator.vibrate) navigator.vibrate(15); toggleNeg(tag, sec); }, 450);
  });
  btn.addEventListener('pointermove', e => {
    if (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8) { moved = true; clearTimeout(timer); }
  });
  ['pointercancel', 'pointerleave'].forEach(ev => btn.addEventListener(ev, () => clearTimeout(timer)));
  btn.addEventListener('pointerup', e => {
    clearTimeout(timer);
    if (long || moved) return;
    if (e.shiftKey) toggleNeg(tag, sec); else toggleSel(tag, sec);
    btn._handled = true;
  });
  btn.addEventListener('click', () => {            // teclado (Enter / espacio)
    if (btn._handled) { btn._handled = false; return; }
    toggleSel(tag, sec);
  });
  btn.addEventListener('contextmenu', e => e.preventDefault());
}

function buildFilters() {
  SECTIONS.forEach(s => {
    const tags = s.tags.filter(([t]) => TAGCOUNT[t] > 0);
    if (!tags.length) return;
    const sec = document.createElement('section');
    sec.className = 'fsec';
    sec.innerHTML = `<div class="fhead"><h3>${esc(s.title)}</h3><div class="fctl">
      ${s.match ? '<button type="button" class="match" data-sec="' + s.key + '">Coincidir: Cualquiera</button>' : ''}
      <button type="button" class="showall" data-sec="${s.key}">Todos</button></div></div><div class="fbtns"></div>`;
    const box = $('.fbtns', sec);
    tags.forEach(([tag, label]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tagbtn'; b.dataset.tag = tag; b.dataset.sec = s.key;
      b.innerHTML = `${esc(label)}<small>${TAGCOUNT[tag]}</small>`;
      bindTagBtn(b, tag, s.key);
      box.appendChild(b);
      tagBtns.push(b);
    });
    fbody.appendChild(sec);
  });
  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent = 'Toca para activar · mantén pulsado para excluir · toca otra vez para quitar.';
  fbody.appendChild(hint);
}

fbody.addEventListener('click', e => {
  const m = e.target.closest('.match');
  if (m) {
    const k = m.dataset.sec;
    state.mode[k] = state.mode[k] === 'all' ? 'any' : 'all';
    const s = SECTIONS.find(x => x.key === k);
    if (state.mode[k] === 'all' && s.max) {                 // tipos: máximo 2
      const keep = [...state.sel[k]].filter(t => t !== 'monotype');
      keep.slice(s.max).forEach(t => state.sel[k].delete(t));
    }
    return update();
  }
  const a = e.target.closest('.showall');
  if (a) {
    const k = a.dataset.sec;
    state.sel[k].clear();
    SECTIONS.find(x => x.key === k).tags.forEach(([t]) => state.neg.delete(t));
    update();
  }
});

function syncUI() {
  let n = 0;
  tagBtns.forEach(b => {
    const tag = b.dataset.tag, sec = b.dataset.sec;
    const isNeg = state.neg.has(tag), isOn = state.sel[sec].has(tag);
    b.classList.toggle('neg', isNeg);
    b.classList.toggle('on', isOn && !isNeg);
    b.classList.toggle('all', isOn && state.mode[sec] === 'all');
    b.setAttribute('aria-pressed', isOn || isNeg ? 'true' : 'false');
  });
  fbody.querySelectorAll('.match').forEach(m => {
    const all = state.mode[m.dataset.sec] === 'all';
    m.classList.toggle('all', all);
    m.textContent = 'Coincidir: ' + (all ? 'Todas' : 'Cualquiera');
  });
  // chips de filtros activos
  const chips = $('#chips');
  chips.innerHTML = '';
  const label = tag => { for (const s of SECTIONS) { const f = s.tags.find(x => x[0] === tag); if (f) return f[1]; } return tag; };
  Object.keys(state.sel).forEach(sec => state.sel[sec].forEach(tag => {
    n++;
    const c = document.createElement('button');
    c.className = 'chip' + (state.mode[sec] === 'all' ? ' all' : '');
    c.dataset.tag = tag; c.dataset.sec = sec;
    c.textContent = label(tag) + ' ×';
    chips.appendChild(c);
  }));
  state.neg.forEach(tag => {
    n++;
    const c = document.createElement('button');
    c.className = 'chip neg'; c.dataset.tag = tag; c.dataset.neg = '1';
    c.textContent = label(tag) + ' ×';
    chips.appendChild(c);
  });
  const fc = $('#fcount');
  fc.textContent = n; fc.hidden = !n;
  $('#clearQ').hidden = !state.q;
}
$('#chips').addEventListener('click', e => {
  const c = e.target.closest('.chip');
  if (!c) return;
  if (c.dataset.neg) state.neg.delete(c.dataset.tag); else state.sel[c.dataset.sec].delete(c.dataset.tag);
  update();
});

function clearAll() {
  state.q = ''; $('#q').value = '';
  state.neg.clear();
  Object.keys(state.sel).forEach(k => { state.sel[k].clear(); state.mode[k] = 'any'; });
  update();
}
$('#clearAll').onclick = clearAll;
$('#clearAll2').onclick = clearAll;

const filtersEl = $('#filters');
const openFilters = () => { filtersEl.classList.add('open'); document.body.classList.add('noscroll'); };
const closeFilters = () => { filtersEl.classList.remove('open'); document.body.classList.remove('noscroll'); };
$('#openFilters').onclick = openFilters;
$('#closeFilters').onclick = closeFilters;
$('#applyFilters').onclick = closeFilters;
matchMedia('(min-width:900px)').addEventListener('change', closeFilters);

/* ============================================================
   Actualizar resultados
   ============================================================ */
function update() {
  const pred = buildPredicate();
  filtered = CARDS.filter(pred);
  grid.innerHTML = '';
  shown = 0;
  renderBatch();
  $('#count').textContent = filtered.length === CARDS.length
    ? `${CARDS.length} cartas`
    : `${filtered.length} de ${CARDS.length} cartas`;
  $('#empty').hidden = filtered.length > 0;
  $('#applyFilters').textContent = `Ver ${filtered.length} resultado${filtered.length === 1 ? '' : 's'}`;
  syncUI();
  try { history.replaceState(history.state, '', state.q ? '#q=' + encodeURIComponent(state.q) : location.pathname + location.search); } catch (_) {}
}

let qTimer;
$('#q').addEventListener('input', e => {
  clearTimeout(qTimer);
  qTimer = setTimeout(() => { state.q = e.target.value; update(); }, 120);
  $('#clearQ').hidden = !e.target.value;
});
$('#q').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
$('#clearQ').onclick = () => { $('#q').value = ''; state.q = ''; update(); $('#q').focus(); };

/* ============================================================
   Detalle de carta
   ============================================================ */
const modal = $('#detail');
const dcontent = $('#dcontent');
let cur = null, navList = [], detailOpen = false;

function openDetail(id) {
  const c = byId.get(id);
  if (!c) return;
  cur = c;
  navList = filtered.includes(c) ? filtered : CARDS;
  renderDetail();
  if (!detailOpen) {
    detailOpen = true;
    modal.hidden = false;
    document.body.classList.add('noscroll');
    try { history.pushState({ detail: 1 }, ''); } catch (_) {}
  }
}
function hideDetail() {
  if (!detailOpen) return;
  detailOpen = false;
  modal.hidden = true;
  $('#zoom').hidden = true;
  document.body.classList.remove('noscroll');
}
function closeDetail() {
  if (!detailOpen) return;
  if (history.state && history.state.detail) history.back(); else hideDetail();
}
window.addEventListener('popstate', () => hideDetail());

function step(dir) {
  const i = navList.indexOf(cur);
  if (i < 0) return;
  const n = navList[(i + dir + navList.length) % navList.length];
  cur = n;
  renderDetail();
}

function renderDetail() {
  const c = cur;
  const i = navList.indexOf(c);
  $('#pos').textContent = i >= 0 ? `${i + 1} / ${navList.length}` : '';
  dcontent.scrollTop = 0;
  dcontent.innerHTML = '';

  // Imagen principal
  const artWrap = document.createElement('div');
  artWrap.className = 'dart';
  artWrap.appendChild(artEl(c, null, true));
  dcontent.appendChild(artWrap);

  // Formas alternativas
  if (c.forms.length) {
    const f = document.createElement('div');
    f.className = 'forms';
    const opts = [{ label: 'Base', image: null }, ...c.forms];
    opts.forEach((o, k) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = o.label; if (k === 0) b.classList.add('on');
      b.onclick = () => {
        f.querySelectorAll('button').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        artWrap.innerHTML = '';
        artWrap.appendChild(artEl(c, o.image, true));
      };
      f.appendChild(b);
    });
    dcontent.appendChild(f);
  }

  // Título y tipos
  const head = document.createElement('div');
  head.innerHTML = `<div class="dtitle"><h2>${esc(c.name)}</h2><span>#${esc(c.id)}</span></div>
    <div class="types">${c.types.map(t => `<span class="tp" data-type="${esc(t)}">${esc(TYPE_ES[t] || cap(t))}</span>`).join('')}</div>`;
  dcontent.appendChild(head);

  // Descripción opcional
  if (c.text) {
    const p = document.createElement('div');
    p.className = 'dsec';
    p.innerHTML = `<h3>Información</h3><p>${esc(c.text)}</p>`;
    dcontent.appendChild(p);
  }

  // Otras versiones con el mismo número de Pokédex (que no estén ya en la línea evolutiva)
  const famSet = new Set(famMembers[c._fam]);
  const sibs = CARDS.filter(m => m.dex === c.dex && m !== c && !famSet.has(m));
  if (sibs.length) {
    const sec = document.createElement('div');
    sec.className = 'dsec';
    sec.innerHTML = '<h3>Otras versiones</h3>';
    const row = document.createElement('div');
    row.className = 'evrow';
    sibs.forEach(m => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'evthumb'; b.dataset.go = m.id;
      b.appendChild(artEl(m));
      const em = document.createElement('em'); em.textContent = m.name; b.appendChild(em);
      row.appendChild(b);
    });
    sec.appendChild(row);
    dcontent.appendChild(sec);
  }

  // Evoluciones
  const fam = famMembers[c._fam];
  if (fam.length > 1) {
    const levels = {};
    fam.forEach(m => (levels[depth(m.id)] = levels[depth(m.id)] || []).push(m));
    const sec = document.createElement('div');
    sec.className = 'dsec';
    sec.innerHTML = '<h3>Evoluciones / formas</h3>';
    const row = document.createElement('div');
    row.className = 'evrow';
    Object.keys(levels).sort((a, b) => a - b).forEach((lv, k) => {
      if (k) { const ar = document.createElement('span'); ar.className = 'arrow'; ar.textContent = '›'; row.appendChild(ar); }
      const col = document.createElement('div');
      col.className = 'evlvl';
      levels[lv].forEach(m => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'evthumb' + (m === c ? ' cur' : ''); b.dataset.go = m.id;
        b.appendChild(artEl(m));
        const em = document.createElement('em'); em.textContent = m.name; b.appendChild(em);
        col.appendChild(b);
      });
      row.appendChild(col);
    });
    sec.appendChild(row);
    dcontent.appendChild(sec);
  }

  // Etiquetas
  const tsec = document.createElement('div');
  tsec.className = 'dsec';
  tsec.innerHTML = '<h3>Etiquetas (toca para buscar)</h3><div class="tags">' +
    [...c.tags].map(t => `<button type="button" data-tag="${esc(t)}">${esc(t)}</button>`).join('') + '</div>';
  dcontent.appendChild(tsec);
}

dcontent.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go) { cur = byId.get(go.dataset.go); navList = filtered.includes(cur) ? filtered : CARDS; return renderDetail(); }
  const tg = e.target.closest('.tags button');
  if (tg) { state.q = tg.dataset.tag; $('#q').value = state.q; closeDetail(); setTimeout(update, 0); return; }
  const art = e.target.closest('.dart');
  if (art) {
    const img = art.querySelector('img');
    if (img) { $('#zoom img').src = img.src; $('#zoom').hidden = false; }
  }
});
$('#zoom').onclick = () => { $('#zoom').hidden = true; };
modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeDetail));
$('#prevCard').onclick = () => step(-1);
$('#nextCard').onclick = () => step(1);

// Deslizar para cambiar de carta
{
  let sx = 0, sy = 0, t0 = 0;
  dcontent.addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; t0 = Date.now(); }, { passive: true });
  dcontent.addEventListener('touchend', e => {
    if (!e.target.closest('.dart')) return;
    const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - t0 < 600) step(dx < 0 ? 1 : -1);
  }, { passive: true });
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!$('#zoom').hidden) $('#zoom').hidden = true;
    else if (detailOpen) closeDetail();
    else if (filtersEl.classList.contains('open')) closeFilters();
  } else if (detailOpen && !$('#help').open) {
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  }
});

/* ============================================================
   Ayuda y arranque
   ============================================================ */
$('#helpBtn').onclick = () => $('#help').showModal();
$('#helpClose').onclick = () => $('#help').close();
$('#help').addEventListener('click', e => { if (e.target === $('#help')) $('#help').close(); });

// Altura de cabecera para el panel lateral de escritorio
new ResizeObserver(() => document.documentElement.style.setProperty('--hh', $('#top').offsetHeight + 'px'))
  .observe($('#top'));

buildFilters();
{
  const m = /[#&]q=([^&]*)/.exec(location.hash);
  if (m) { state.q = decodeURIComponent(m[1]); $('#q').value = state.q; }
}
update();
})();
