// BlockFrogs v3.3 preview control page. Trait logic is NOT re-implemented here: the TRAIT DERIVATION section is read out of
// frog-three.html (byte-identical to blockfrogs-child.v3.3.html, checked by src/build.mjs) and evaluated, so the page and the
// renderer run the same code. v3 traits come from the Bitmap block height N alone (no confirmation hash). The frogs themselves are rendered by the real renderer inside the two iframes.
(async function () {
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v); } kids.flat().forEach((c) => c != null && e.append(c)); return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- the renderer's own trait code ---------- */
  const frogSrc = await (await fetch('frog-three.html', { cache: 'no-cache' })).text();
  const A = frogSrc.indexOf('/* ======================= TRAIT DERIVATION'), B = frogSrc.indexOf('/* ======================= RECURSIVE HELPERS');
  if (A < 0 || B < 0) throw new Error('trait section not found in frog-three.html');
  const E = new Function(frogSrc.slice(A, B) + '\nreturn { COLORS, BITMAP_BLOCKOUT_HEIGHT, SIZE_TIERS, getSize, SPECIALS, Z_ORDER, STACK, stackOffsets, deriveTraits };')();
  if (JSON.stringify(E.Z_ORDER) !== JSON.stringify(BFOverrides.Z_ORDER)) throw new Error('overrides.js Z_ORDER differs from the renderer\'s Z_ORDER');
  const TIER_NAMES = JSON.parse(((frogSrc.match(/const TIER_NAMES = (\[[^\]]*\])/) || [])[1] || '[]').replace(/'/g, '"')); // renderer's own names
  const VERSION = (frogSrc.match(/const VERSION = '([^']+)'/) || [])[1] || '?';
  const IDS = await (await fetch('ids-map.json', { cache: 'no-cache' })).json();
  window.__engine = E;

  const NAMES = { flyesocks: 'Fly socks', sunglasses: 'Sunglasses', wings: 'Wings', halo: 'Halo', ufo: 'UFO', laser: 'Laser eyes', joint: 'Joint',
    gold_chain: 'Gold chain', hat: 'PepeCash hat', hair: 'Trump hair', hair3: 'Dorian hair', hair2: 'Hairpepe' };
  // Plain-English labels; the code shown next to each is the renderer's own SPECIALS test (Function.toString of v3.3's code).
  const LABEL = { flyesocks: 'N divisible by 7', sunglasses: 'N divisible by 9', wings: 'height is a palindrome', halo: 'N is a perfect square',
    ufo: 'height contains "314"', laser: 'height contains "100"', joint: 'height contains "420"', gold_chain: 'height contains "888"',
    hat: 'N divisible by 69', hair: 'N divisible by 47', hair3: 'height contains "300"', hair2: 'N in 441,487–441,629' };
  const RULE = {};
  E.SPECIALS.forEach(([p, fn]) => { RULE[p] = String(fn).replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\(\s*/g, '(').replace(/\s*,\s*/g, ', ').trim(); });
  const SPECIAL_PARTS = E.SPECIALS.map(([p]) => p);
  for (const p of SPECIAL_PARTS) if (!NAMES[p]) NAMES[p] = p; // a part added to the renderer still shows up
  const BODIES = ['body1', 'body2', 'body3', 'body4', 'body5'];
  const DIGIT = ['units', 'tens', 'hundreds', 'thousands', 'ten-thousands'];
  const tierLabel = (i) => { const t = E.SIZE_TIERS[i]; const prev = i ? E.SIZE_TIERS[i - 1][0] : null;
    const range = t[0] === Infinity ? `> ${Number(prev).toLocaleString('en-US')}` : `≤ ${Number(t[0]).toLocaleString('en-US')}`;
    return `${range}${Number(t[0]) === E.BITMAP_BLOCKOUT_HEIGHT ? ' (up to BITMAP_BLOCKOUT_HEIGHT)' : t[0] === Infinity ? ' (after Blockout)' : ''} · scale ${t[1]}, y ${t[2]}`; };
  const tierOf = (h) => E.SIZE_TIERS.findIndex(([max]) => Number(h) <= Number(max));

  /* ---------- override controls ---------- */
  const state = { parts: {}, colors: {}, tier: '' };
  const tg = $('#traitgroups');
  const triBox = (p) => {
    const box = el('span', { class: 'tri auto' }, '–'); const st = el('span', { class: 'st' }, 'auto');
    const row = el('div', { class: 'trait', role: 'checkbox', tabindex: '0', 'data-part': p, 'aria-checked': 'mixed' }, box,
      el('span', { class: 't' }, el('b', {}, NAMES[p]), ' ', el('code', {}, p), el('small', {}, `${LABEL[p] || ''} · `, el('code', {}, RULE[p]))), st);
    const paint = () => { const v = state.parts[p] || 'auto'; box.className = `tri ${v}`; box.textContent = v === 'on' ? '✓' : v === 'off' ? '✕' : '–'; st.textContent = v === 'on' ? 'forced on' : v === 'off' ? 'forced off' : 'auto'; row.setAttribute('aria-checked', v === 'on' ? 'true' : v === 'off' ? 'false' : 'mixed'); };
    const cycle = () => { const v = state.parts[p] || 'auto'; state.parts[p] = v === 'auto' ? 'on' : v === 'on' ? 'off' : 'auto'; paint(); touched(); };
    row.addEventListener('click', cycle); row.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cycle(); } });
    row._paint = paint; return row;
  };
  tg.append(el('div', { class: 'tg' }, el('h3', {}, 'Special traits (v3.3: from the Bitmap height N only; head traits stack)'), SPECIAL_PARTS.map(triBox)));
  const colGroup = el('div', { class: 'tg' }, el('h3', {}, 'Body colours (one layer per digit, read right to left)'));
  BODIES.forEach((b, i) => {
    const sel = el('select', { 'data-body': b, onchange: () => { state.colors[b] = sel.value; touched(); } }, el('option', { value: '' }, `auto (${DIGIT[i]} digit)`),
      E.COLORS[b].map((c, d) => el('option', { value: c }, `${d} → #${c}`)));
    colGroup.append(el('div', { class: 'colrow' }, el('code', {}, b), sel));
  });
  tg.append(colGroup);
  const tierSel = el('select', { id: 'tier', onchange: () => { state.tier = tierSel.value; touched(); } }, el('option', { value: '' }, 'auto (from height)'),
    E.SIZE_TIERS.map((t, i) => el('option', { value: String(i) }, `tier ${i}: ${tierLabel(i)}`)));
  tg.append(el('div', { class: 'tg' }, el('h3', {}, 'Size tier (group sx/sy/sz + y)'), tierSel,
    el('p', { class: 'hint' }, 'The tier is the m-group scale (sx/sy/sz) and y offset. With "Fixed camera" on (Size QA box), both views use one camera framed for the largest tier, so smaller tiers really look smaller. With it off, both views use the v3.3 renderer\'s own fit-to-frog camera and every tier fills the view.')));
  const setMode = (m) => { document.querySelector(`input[name=mode][value=${m}]`).checked = true; };
  const mode = () => document.querySelector('input[name=mode]:checked').value;
  function touched() { setMode('custom'); schedule(); }
  $('#resetov').addEventListener('click', () => { state.parts = {}; state.colors = {}; state.tier = ''; tg.querySelectorAll('.trait').forEach((r) => r._paint()); tg.querySelectorAll('select').forEach((s) => { s.value = ''; }); setMode('auto'); schedule(); });
  document.querySelectorAll('input[name=mode]').forEach((r) => r.addEventListener('change', schedule));
  ['anim', 'spin', 'host', 'fixedcam'].forEach((id) => $('#' + id).addEventListener('change', () => (stripOn ? renderStrip() : schedule())));
  $('#stripview').addEventListener('change', () => { if (stripOn) renderStrip(); });
  const buildOv = () => {
    const ov = { mode: mode(), anim: $('#anim').checked, spin: $('#spin').checked, host: $('#host').checked, fixedCam: $('#fixedcam').checked };
    if (ov.mode === 'custom') {
      ov.parts = {}; for (const [p, v] of Object.entries(state.parts)) if (v !== 'auto') ov.parts[p] = v === 'on';
      ov.colors = {}; for (const [b, c] of Object.entries(state.colors)) if (c) ov.colors[b] = c;
      if (state.tier !== '') { const t = E.SIZE_TIERS[Number(state.tier)]; ov.size = { scale: t[1], y: t[2], tier: Number(state.tier) }; }
    }
    return ov;
  };

  /* ---------- block data ---------- */
  const cache = new Map();
  const ok = async (u, kind) => { const r = await fetch(u); if (!r.ok) { const e = new Error(`${u} → HTTP ${r.status}`); e.status = r.status; throw e; } return kind === 'json' ? r.json() : r.text(); };
  const getTip = async (src) => {
    const tries = src === 'mempool' ? ['mempool'] : src === 'ord' ? ['ord'] : ['ord', 'mempool'];
    let last;
    for (const s of tries) { try { const t = parseInt(await ok(s === 'ord' ? 'https://ordinals.com/r/blockheight' : 'https://mempool.space/api/blocks/tip/height'), 10); if (Number.isFinite(t)) return { tip: t, source: s }; } catch (e) { last = e; } }
    throw last || new Error('tip unavailable');
  };
  const getBlock = async (h, src) => {
    const k = `${src}:${h}`; if (cache.has(k)) return cache.get(k);
    const p = (async () => {
      const errs = [];
      if (src !== 'mempool') {
        try {
          const info = await ok(`https://ordinals.com/r/blockinfo/${h}`, 'json');
          let hash = info.hash; let hashVia = '/r/blockinfo';
          try { const hh = (await ok(`https://ordinals.com/r/blockhash/${h}`)).replace(/"/g, '').trim(); if (/^[0-9a-f]{64}$/.test(hh)) { hash = hh; hashVia = '/r/blockhash'; } } catch (e) { /* blockinfo hash is enough */ }
          return { source: 'ordinals.com', endpoints: [`/r/blockhash/${h}`, `/r/blockinfo/${h}`], hashVia, height: info.height, hash, timestamp: info.timestamp, txCount: info.transaction_count, medianTime: info.median_time };
        } catch (e) { errs.push(e); if (e.status === 404 || src === 'ord') throw e; }
      }
      const hash = (await ok(`https://mempool.space/api/block-height/${h}`)).trim();
      const b = await ok(`https://mempool.space/api/block/${hash}`, 'json');
      return { source: 'mempool.space' + (errs.length ? ' (fallback: ' + errs[0].message + ')' : ''), endpoints: [`/api/block-height/${h}`, `/api/block/${hash.slice(0, 12)}…`], hashVia: '/api/block-height', height: b.height, hash: b.id, timestamp: b.timestamp, txCount: b.tx_count, medianTime: b.mediantime };
    })();
    cache.set(k, p); p.catch(() => cache.delete(k)); return p;
  };
  const fmtTime = (ts) => { if (!ts) return '–'; const d = new Date(ts * 1000);
    return `${d.toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' })} ET · ${d.toISOString().replace('.000Z', 'Z')}`; };

  /* ---------- rendering ---------- */
  const out = $('#out');
  let gen = 0, timer = null, lastReq = null;
  let stripOn = false;
  const tierName = (i) => TIER_NAMES[i] || `tier ${i}`;
  const sizeText = (hs, size) => { const i = tierOf(hs); return `tier ${i} · ${tierName(i)} · scale ${size.scale} · y ${size.y}`; };
  function schedule() { if (stripOn) return renderStrip(); if (!lastReq) return; clearTimeout(timer); timer = setTimeout(() => render(lastReq), 350); }
  const chip = (t, cls = '') => el('span', { class: 'tchip ' + cls }, t.color ? el('i', { style: `background:#${t.color}` }) : null, BFOverrides.key(t));
  const diffChips = (auto, fin) => {
    const ak = new Map(auto.map((t) => [t.part, t])); const fk = new Map(fin.map((t) => [t.part, t])); const res = [];
    for (const t of fin) { const a = ak.get(t.part); res.push(chip(t, !a ? 'add' : (a.color !== t.color ? 'chg' : ''))); }
    for (const t of auto) if (!fk.has(t.part)) res.push(chip(t, 'del'));
    return res;
  };
  const highlight = (s) => esc(s).split('\n').map((line) => {
    const hid = /visible=&quot;false&quot;/.test(line);
    const l = line.replace(/(&lt;\/?)(m-[a-z-]+)/g, '$1<span class="tg2">$2</span>').replace(/ ([a-z-]+)=(&quot;.*?&quot;)/g, ' <span class="at">$1</span>=<span class="av">$2</span>');
    return hid ? `<span class="hid">${l}</span>` : l;
  }).join('\n');
  const toLocal = (s) => s.replace(/\/content\/([0-9a-f]{64}i\d+)/g, (m, id) => IDS.map[id] || m);
  const toAbs = (s) => s.replace(/\/content\/([0-9a-f]{64}i\d+)/g, (m, id) => IDS.map[id] ? new URL(IDS.map[id], location.href).href : m);
  const copy = async (text, btn) => {
    try { await navigator.clipboard.writeText(text); } catch (e) { const ta = el('textarea', {}, text); document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    const o = btn.textContent; btn.textContent = 'Copied ✓'; setTimeout(() => { btn.textContent = o; }, 1200);
  };

  async function render(req) {
    lastReq = req; stripOn = false; const my = ++gen; out.innerHTML = ''; $('#cursize').innerHTML = '';
    const ov = buildOv(); const src = $('#source').value;
    let tipInfo = null, tipErr = null;
    try { tipInfo = await getTip(src); } catch (e) { tipErr = e; } // block data is informational only: v3 traits need nothing but the height
    if (my !== gen) return;
    if (!tipInfo) out.append(el('div', { class: 'card' }, el('p', { class: 'warn' }, `Block data unavailable (${String(tipErr && tipErr.message || tipErr)}). Frogs still render: v3.3 traits use only the height. "latest" and the future-block check need the tip.`)));
    const tokens = req.split(/[\s,;]+/).filter(Boolean).map((t) => (/^(tip|latest)$/i.test(t) ? (tipInfo ? String(tipInfo.tip) : 'latest') : t));
    const uniq = [...new Set(tokens)];
    if (!uniq.length) { out.append(el('div', { class: 'card' }, el('p', { class: 'warn' }, 'Type at least one block height.'))); return; }
    if (uniq.length > 6) out.append(el('div', { class: 'card' }, el('p', { class: 'warn' }, `Showing the first 6 of ${uniq.length} heights (each frog uses 2 WebGL contexts).`)));
    for (const [i, raw] of uniq.slice(0, 6).entries()) { if (my !== gen) return; renderOne(raw, i, tipInfo, src, ov, my); }
  }

  async function renderOne(raw, idx, tipInfo, src, ov, my) {
    const card = el('div', { class: 'card' }); out.append(card);
    const title = el('h2', {}, `${raw}.bitmap`); card.append(title);
    if (!/^\d{1,9}$/.test(raw)) { title.append(el('span', { class: 'badge err' }, 'invalid')); card.append(el('p', { class: 'err' }, `"${raw}" is not a block height. Use digits only, e.g. 840000.`)); return; }
    const h = Number(raw); const hs = String(h);
    if (hs !== raw) { title.textContent = `${hs}.bitmap`; card.append(el('p', { class: 'warn' }, `Leading zeros removed. A Bitmap's text is "${hs}.bitmap".`)); }
    if (tipInfo && h > tipInfo.tip) {
      title.append(el('span', { class: 'badge err' }, 'future block'));
      card.append(el('p', { class: 'err' }, `Block ${hs} hasn't been mined yet (tip is ${tipInfo.tip.toLocaleString('en-US')}, via ${tipInfo.source === 'ord' ? 'ordinals.com /r/blockheight' : 'mempool.space'}). No Bitmap can exist for it. The inscribed v3.3 renderer would still draw the frog but flag the claim INVALID (FUTURE_BLOCK: "bitmap claims a block above the chain tip").`));
      return;
    }
    const status = el('p', { class: 'hint' }, 'Fetching block data…'); card.append(status);
    let blk = null, blkErr = null;
    if (tipInfo) { try { blk = await getBlock(h, src); } catch (e) { blkErr = e; } } else blkErr = new Error('tip unavailable');
    if (my !== gen) return;
    if (blk) status.remove(); else { status.className = 'warn'; status.textContent = `Block data for ${hs} unavailable (${blkErr.message || blkErr}); not needed for the traits.`; }
    // ---- the renderer's own derivation (same code) ----
    const auto = E.deriveTraits(hs);
    const fin = BFOverrides.apply(auto, ov);
    const autoSize = E.getSize(hs); const ti = tierOf(hs);
    const size = ov.mode === 'custom' && ov.size ? ov.size : autoSize;
    title.append(' ', el('span', { class: 'badge tier' }, `📏 ${sizeText(hs, size)}${ov.mode === 'custom' && ov.size ? ' (forced)' : ''}`), ' ');
    $('#cursize').append(el('div', { class: 'sz' }, el('b', {}, `${hs}`), ` → tier ${ti} · ${tierName(ti)} · scale ${size.scale} · y ${size.y}${ov.mode === 'custom' && ov.size ? ' (forced)' : ''}`));
    title.append(el('span', { class: 'badge ' + (ov.mode === 'custom' ? 'warn' : 'ok') }, ov.mode === 'custom' ? 'custom overrides' : 'auto · true derivation'));
    const rev = hs.split('').reverse();
    const n = Number(hs); const hits = E.SPECIALS.filter(([, fn]) => fn(n, hs)).map(([p]) => p);
    const lift = E.stackOffsets(new Set(fin.map((t) => t.part)));
    const used = el('table', { class: 'kv' },
      el('tr', {}, el('td', {}, 'height N'), el('td', {}, `${hs} (Bitmap text "${hs}.bitmap") → body colours, special traits and size tier. v3.3 uses nothing else.`)),
      el('tr', {}, el('td', {}, 'special rules hit'), el('td', {}, hits.length ? hits.map((p) => `${NAMES[p]} (${LABEL[p] || RULE[p]})`).join(' · ') : '— none (ordinary frog)')),
      el('tr', {}, el('td', {}, 'head stack lift'), el('td', {}, Object.keys(lift).length ? el('code', {}, JSON.stringify(lift)) : '— none', ' (renderer stackOffsets, model units before scale)')),
      blk ? el('tr', {}, el('td', {}, 'source'), el('td', {}, `${blk.source} · ${blk.endpoints.join(', ')}`)) : null,
      blk ? el('tr', {}, el('td', {}, 'block hash'), el('td', {}, el('code', {}, blk.hash), ' (info only; not used by v3 traits)')) : null,
      blk ? el('tr', {}, el('td', {}, 'mined'), el('td', {}, fmtTime(blk.timestamp))) : null,
      blk ? el('tr', {}, el('td', {}, 'txs / tip'), el('td', {}, `${blk.txCount ?? '–'} txs · tip ${tipInfo.tip.toLocaleString('en-US')} · ${(tipInfo.tip - h + 1).toLocaleString('en-US')} confirmations`)) : null);
    const derivedBox = el('div', {},
      el('div', { class: 'hint' }, el('b', {}, 'Derived from the height (auto, renderer deriveTraits)'), ` · tier ${ti}: ${tierLabel(ti)}`), el('div', { class: 'tlist' }, auto.map((t) => chip(t))),
      el('div', { class: 'hint' }, BODIES.map((b, i) => `${b}←${DIGIT[i]} "${rev[i] ?? '0'}"`).join(' · ')),
      ov.mode === 'custom' ? el('div', {}, el('div', { class: 'hint' }, el('b', {}, 'Rendered with overrides'), ` · scale ${size.scale}, y ${size.y}${ov.size ? ` (forced tier ${ov.size.tier})` : ''} · green = added, red = removed, amber = recoloured`), el('div', { class: 'tlist' }, diffChips(auto, fin))) : null);
    card.append(el('details', { open: idx === 0 && !matchMedia('(max-width: 900px)').matches }, el('summary', {}, 'Height rules & block data'), used), derivedBox);
    // ---- the two hosts ----
    const qs = new URLSearchParams({ h: hs, ov: JSON.stringify(ov) }); // ?h= is the v3.3 renderer's own PREVIEW override
    if (tipInfo) qs.set('tip', String(tipInfo.tip));
    const fid = `f${gen}_${idx}`;
    const q3 = new URLSearchParams(qs); q3.set('frame', fid + '_3'); const qm = new URLSearchParams(qs); qm.set('frame', fid + '_m');
    const s3 = el('div', { class: 'vs' }, 'loading…'), sm = el('div', { class: 'vs' }, 'loading…');
    const f3 = el('iframe', { src: `frog-three.html?${q3}`, title: `three.js view ${hs}`, loading: 'eager' });
    const fm = el('iframe', { src: `frog-mml.html?${qm}`, title: `MML view ${hs}`, loading: 'eager' });
    const pre = el('pre', { class: 'mml' }, '…waiting for the renderer to emit its MML');
    const viewSel = el('select', { style: 'width:auto;min-height:36px;padding:4px' }, el('option', { value: 'emit' }, 'src as emitted (/content/<preview id>)'), el('option', { value: 'local' }, 'src as local file names'));
    let snap = null;
    const showSnap = () => { if (snap) pre.innerHTML = highlight(viewSel.value === 'local' ? toLocal(snap) : snap); };
    viewSel.addEventListener('change', showSnap);
    const bCopy = el('button', { type: 'button' }, 'Copy MML (as emitted)'), bAbs = el('button', { type: 'button' }, 'Copy standalone MML (absolute GLB URLs)'), bDl = el('button', { type: 'button' }, 'Download .html');
    bCopy.addEventListener('click', () => snap && copy(snap, bCopy)); bAbs.addEventListener('click', () => snap && copy(toAbs(snap), bAbs));
    bDl.addEventListener('click', () => { if (!snap) return; const a = el('a', { href: URL.createObjectURL(new Blob([toAbs(snap) + '\n'], { type: 'text/html' })), download: `blockfrog-${hs}.mml.html` }); a.click(); });
    card.append(el('div', { class: 'cols' },
      el('div', { class: 'view' }, el('div', { class: 'vh' }, el('b', {}, 'three.js view'), ' · the renderer\'s own standalone view (three r178), drag to orbit, wheel/pinch to zoom'), f3, s3),
      el('div', { class: 'view' }, el('div', { class: 'vh' }, el('b', {}, 'MML view'), ' · @mml-io/mml-web 0.26.1 client running the renderer\'s MML path (orbit: drag)'), fm, sm)));
    card.append(el('details', { open: true }, el('summary', {}, 'MML markup emitted for this frog (renderer applyMML() output)'),
      el('div', { class: 'btns' }, viewSel, bCopy, bAbs, bDl), pre,
      el('p', { class: 'hint' }, 'This is the inscription\'s <m-group> after its script ran. Each src/anim points at /content/<inscription id>. Here the ids are preview ids, mapped to glb/ files by ids-map.json. In the production file today every asset id is still blank, so it emits no src until the GLBs are inscribed and fill-ids.mjs fills them in. "Standalone" swaps in absolute URLs to this server\'s GLBs, so you can paste it into any MML host to test.')));
    const expectKeys = JSON.stringify(fin.map(BFOverrides.key)), autoKeys = JSON.stringify(auto.map(BFOverrides.key));
    const t0 = Date.now();
    const poll = () => {
      if (my !== gen) return;
      let done3 = false, doneM = false;
      try {
        const w = f3.contentWindow; const P = w.__bfPreview;
        if (w.__bf) { const same = JSON.stringify(w.__bf.traits) === expectKeys && JSON.stringify((P.auto || []).map(BFOverrides.key)) === autoKeys;
          const ver = (w.blockfrog && w.blockfrog.version) || '?';
          s3.innerHTML = `${same ? '<span class="badge ok">✓ renderer traits = page</span>' : '<span class="badge err">✕ renderer traits differ</span>'} v${esc(ver)} · loaded ${w.__bf.loaded} GLB(s)${w.__bf.failed ? `, <span class="err">${w.__bf.failed} failed</span>` : ''}${w.__bf.missing.length ? `, <span class="warn">${w.__bf.missing.length} missing</span>` : ''} · ${(Date.now() - t0) / 1000 | 0}s · cam <b>${P.camMode === 'fixed' ? 'fixed' : 'fit'}</b>${P.coreHeight ? ` · frog ${P.coreHeight.toFixed(2)} m` : ''}`;
          if (!same) s3.title = `renderer: ${JSON.stringify(w.__bf.traits)}\npage: ${expectKeys}`;
          done3 = true; }
        else { const o = w.document.getElementById('bf-o'); if (o && o.classList.contains('err')) { s3.innerHTML = `<span class="err">${esc(o.textContent)}</span>`; done3 = true; } }
      } catch (e) { /* not ready */ }
      try {
        const w = fm.contentWindow; const P = w.__bfPreview; const st = w.__mmlStatus;
        if (P && P.snapshot && !snap) { snap = P.snapshot; showSnap(); }
        if (st && st.framed) { const same = JSON.stringify((P.final || []).map(BFOverrides.key)) === expectKeys;
          sm.innerHTML = `${same ? '<span class="badge ok">✓ MML path traits = page</span>' : '<span class="badge err">✕ differ</span>'} ${st.models} visible m-model(s), ${st.meshes} meshes · cam <b>${st.camMode === 'fixed' ? 'fixed' : 'fit'}</b> · frog (shoes+body) ${(st.box.max[1] - st.box.min[1]).toFixed(2)} m vs 1.8 m pole`; doneM = true; }
      } catch (e) { /* not ready */ }
      if ((!done3 || !doneM) && Date.now() - t0 < 90000) setTimeout(poll, 400);
      else { if (!done3) s3.innerHTML = '<span class="warn">still loading after 90 s</span>'; if (!doneM) sm.innerHTML = '<span class="warn">MML client: models not loaded after 90 s</span>'; card.dataset.done = '1'; }
      if (done3 && doneM) card.dataset.done = '1';
    };
    poll();
  }

  /* ---------- size-tier strip (Size QA) ---------- */
  // One ordinary frog (no special traits) per tier of the renderer's own SIZE_TIERS, picked with its own getSize/SPECIALS,
  // all under the fixed camera, so tiers are compared at the same framing next to the 1.8 m pole.
  const pickTierHeights = (tip) => E.SIZE_TIERS.map(([max], i) => {
    const lo = i ? Number(E.SIZE_TIERS[i - 1][0]) + 1 : 0; const hi = Number(max) === Infinity ? (tip || 972000) : Number(max);
    const ordinary = (n) => tierOf(n) === i && !E.SPECIALS.some(([, fn]) => fn(n, String(n)));
    for (let d = 0, mid = Math.floor((lo + hi) / 2); d <= hi - lo; d++) { for (const n of [mid + d, mid - d]) if (n >= lo && n <= hi && ordinary(n)) return n; }
    return lo;
  });
  async function renderStrip() {
    stripOn = true; const my = ++gen; out.innerHTML = '';
    let tip = null; try { tip = (await getTip($('#source').value)).tip; } catch (e) { /* fallback range */ }
    if (my !== gen) return;
    const view = $('#stripview').value; const ov = { ...buildOv(), mode: 'auto', fixedCam: true, spin: false }; // same pose for every tier (drag to orbit)
    const hs = pickTierHeights(tip);
    $('#cursize').innerHTML = ''; hs.forEach((h, i) => $('#cursize').append(el('div', { class: 'sz' }, el('b', {}, String(h)), ` → tier ${i} · ${tierName(i)} · scale ${E.getSize(h).scale}`)));
    const card = el('div', { class: 'card stripcard' }); out.append(card);
    card.append(el('h2', {}, 'Size tiers, side by side ', el('span', { class: 'badge tier' }, `fixed camera · ${view === 'mml' ? 'MML view + 1.8 m pole' : 'three.js view'}`)),
      el('p', { class: 'hint' }, `One ordinary frog per size tier (heights picked with the renderer's own SIZE_TIERS / SPECIALS), all with the same fixed camera framed for the largest tier, auto-rotate off so every frog has the same pose (drag to orbit). Real-world height = shoes+body bounding box in metres (MML units). ${view === 'mml' ? 'The yellow pole is 1.8 m.' : 'Switch "Strip view" to MML to see the 1.8 m pole.'}`));
    const grid = el('div', { class: 'strip' }); card.append(grid);
    const cells = hs.map((h, i) => {
      const sz = E.getSize(h); const t = E.SIZE_TIERS[i];
      const range = Number(t[0]) === Infinity ? `> ${Number(E.SIZE_TIERS[i - 1][0]).toLocaleString('en-US')}` : `≤ ${Number(t[0]).toLocaleString('en-US')}`;
      const q = new URLSearchParams({ h: String(h), ov: JSON.stringify(ov), frame: `strip${gen}_${i}` }); if (tip) q.set('tip', String(tip));
      const fr = el('iframe', { src: `frog-${view}.html?${q}`, title: `tier ${i} ${h}`, loading: 'eager' });
      const vs = el('div', { class: 'vs' }, 'loading…');
      grid.append(el('div', { class: 'cell', 'data-tier': String(i), 'data-h': String(h) },
        el('div', { class: 'lab' }, el('b', {}, `tier ${i} · ${tierName(i)}`), el('br'), `${h}.bitmap (${range})`, el('br'), `scale ${sz.scale} · y ${sz.y}`), fr, vs));
      return { h, i, fr, vs };
    });
    const t0 = Date.now();
    const poll = () => {
      if (my !== gen) return; let done = 0;
      for (const c of cells) {
        if (c.done) { done++; continue; }
        try {
          const w = c.fr.contentWindow; const P = w.__bfPreview;
          let m = null, cam = null;
          if (view === 'mml') { const st = w.__mmlStatus; if (st && st.framed) { m = st.coreHeight; cam = st.camMode; } }
          else if (w.__bf) { m = P.coreHeight; cam = P.camMode; }
          if (m != null) { c.done = true; c.m = m; c.vs.innerHTML = `<b style="color:var(--fg);font-size:14px">${m.toFixed(2)} m</b> tall (shoes+body) · ${(m / 1.8 * 100).toFixed(0)}% of the 1.8 m pole · cam ${cam}`; c.fr.closest('.cell').dataset.metres = m.toFixed(3); done++; }
        } catch (e) { /* not ready */ }
      }
      if (done < cells.length && Date.now() - t0 < 120000) setTimeout(poll, 400); else card.dataset.done = '1';
    };
    poll();
  }
  $('#strip').addEventListener('click', () => { renderStrip(); if (narrow()) setTimeout(() => out.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); });

  /* ---------- wiring ---------- */
  const narrow = () => matchMedia('(max-width: 900px)').matches;
  const go = (v) => { render(v); if (narrow()) setTimeout(() => out.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); };
  if (narrow()) document.querySelectorAll('details.sec').forEach((d) => { if (!/Traits/.test(d.querySelector('summary').textContent)) d.open = false; });
  $('#ctl').addEventListener('submit', (e) => { e.preventDefault(); go($('#heights').value); });
  $('#examples').addEventListener('click', (e) => { const b = e.target.closest('button[data-h]'); if (!b) return; $('#heights').value = b.dataset.h.replace(/,/g, ', '); go($('#heights').value); });
  // deep link: index.html?h=840000,842069&mode=custom&on=halo,ufo&off=hat&tier=0
  const q = new URLSearchParams(location.search);
  if (q.get('on') || q.get('off') || q.get('tier') || q.get('col')) {
    (q.get('on') || '').split(',').filter(Boolean).forEach((p) => { state.parts[p] = 'on'; });
    (q.get('off') || '').split(',').filter(Boolean).forEach((p) => { state.parts[p] = 'off'; });
    (q.get('col') || '').split(',').filter(Boolean).forEach((kv) => { const [b, c] = kv.split(':'); state.colors[b] = c.toUpperCase(); const s = tg.querySelector(`select[data-body=${b}]`); if (s) s.value = c.toUpperCase(); });
    if (q.get('tier')) { state.tier = q.get('tier'); tierSel.value = state.tier; }
    tg.querySelectorAll('.trait').forEach((r) => r._paint()); setMode('custom');
  }
  if (q.get('src')) $('#source').value = q.get('src');
  ['anim', 'spin', 'host', 'fixedcam'].forEach((k) => { if (q.get(k) === '0') $('#' + k).checked = false; });
  if (q.get('stripview')) $('#stripview').value = q.get('stripview');
  if (q.get('h')) $('#heights').value = q.get('h');
  if (q.get('strip') === '1') renderStrip(); else render($('#heights').value);
})().catch((e) => { document.getElementById('out').innerHTML = `<div class="card"><p class="err">Preview failed to start: ${String(e && e.message || e)}</p></div>`; console.error(e); });
