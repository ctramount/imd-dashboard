// BlockFrogs preview control page. Trait logic is NOT re-implemented here: the TRAIT DERIVATION section is read out of
// frog-three.html (byte-identical to blockfrogs-child.v2.html, checked by src/build.mjs) and evaluated, so the page and the
// renderer run the same code. The frogs themselves are rendered by the real renderer inside the two iframes.
(async function () {
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v); } kids.flat().forEach((c) => c != null && e.append(c)); return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- the renderer's own trait code ---------- */
  const frogSrc = await (await fetch('frog-three.html', { cache: 'no-cache' })).text();
  const A = frogSrc.indexOf('/* ======================= TRAIT DERIVATION'), B = frogSrc.indexOf('/* ======================= RECURSIVE HELPERS');
  if (A < 0 || B < 0) throw new Error('trait section not found in frog-three.html');
  const E = new Function(frogSrc.slice(A, B) + '\nreturn { COLORS, BITMAP_BLOCKOUT_HEIGHT, SIZE_TIERS, getSize, HEIGHT_TRAITS, HASH_TRAITS, getHashTraits, deriveTraits };')();
  const IDS = await (await fetch('ids-map.json', { cache: 'no-cache' })).json();
  window.__engine = E;

  const NAMES = { hat: 'Hat', hair: 'Trump hair', hair2: 'Black hair', hair3: 'Grey hair', halo: 'Halo', joint: 'Joint', gold_chain: 'Gold chain',
    wings: 'Wings', ufo: 'UFO', laser: 'Laser eyes', flyesocks: 'Fly socks', sunglasses: 'Sunglasses' };
  const RULE = { hat: 'height contains "69" or "420"' };
  E.HEIGHT_TRAITS.forEach(([p, pat]) => { RULE[p] = `height contains "${pat}"`; });
  E.HASH_TRAITS.forEach(([p, pat]) => { RULE[p] = `conf. hash (leading 0s stripped) contains "${pat}"`; });
  const HEIGHT_PARTS = ['hat', ...E.HEIGHT_TRAITS.map(([p]) => p)], HASH_PARTS = E.HASH_TRAITS.map(([p]) => p);
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
      el('span', { class: 't' }, el('b', {}, NAMES[p]), ' ', el('code', {}, p), el('small', {}, RULE[p])), st);
    const paint = () => { const v = state.parts[p] || 'auto'; box.className = `tri ${v}`; box.textContent = v === 'on' ? '✓' : v === 'off' ? '✕' : '–'; st.textContent = v === 'on' ? 'forced on' : v === 'off' ? 'forced off' : 'auto'; row.setAttribute('aria-checked', v === 'on' ? 'true' : v === 'off' ? 'false' : 'mixed'); };
    const cycle = () => { const v = state.parts[p] || 'auto'; state.parts[p] = v === 'auto' ? 'on' : v === 'on' ? 'off' : 'auto'; paint(); touched(); };
    row.addEventListener('click', cycle); row.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cycle(); } });
    row._paint = paint; return row;
  };
  tg.append(el('div', { class: 'tg' }, el('h3', {}, 'Height-derived accessories & special heights'), HEIGHT_PARTS.map(triBox)));
  tg.append(el('div', { class: 'tg' }, el('h3', {}, 'Rare traits (confirmation hash)'), HASH_PARTS.map(triBox)));
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
    el('p', { class: 'hint' }, 'The tier is the m-group scale. The three.js view re-frames the camera on the frog, so it looks the same size there. In the MML view, compare it with the 1.8 m pole.')));
  const setMode = (m) => { document.querySelector(`input[name=mode][value=${m}]`).checked = true; };
  const mode = () => document.querySelector('input[name=mode]:checked').value;
  function touched() { setMode('custom'); schedule(); }
  $('#resetov').addEventListener('click', () => { state.parts = {}; state.colors = {}; state.tier = ''; tg.querySelectorAll('.trait').forEach((r) => r._paint()); tg.querySelectorAll('select').forEach((s) => { s.value = ''; }); setMode('auto'); schedule(); });
  document.querySelectorAll('input[name=mode]').forEach((r) => r.addEventListener('change', schedule));
  ['anim', 'spin', 'host'].forEach((id) => $('#' + id).addEventListener('change', schedule));
  const buildOv = () => {
    const ov = { mode: mode(), anim: $('#anim').checked, spin: $('#spin').checked, host: $('#host').checked };
    if (ov.mode === 'custom') {
      ov.parts = {}; for (const [p, v] of Object.entries(state.parts)) if (v !== 'auto') ov.parts[p] = v === 'on';
      ov.colors = {}; for (const [b, c] of Object.entries(state.colors)) if (c) ov.colors[b] = c;
      if (state.tier !== '') { const t = E.SIZE_TIERS[Number(state.tier)]; ov.size = { scale: t[1], y: t[2], tier: Number(state.tier) }; }
    }
    return ov;
  };
  const cm = $('#confmode');
  cm.addEventListener('change', () => { $('#confheight').hidden = cm.value !== 'height'; $('#confhex').hidden = cm.value !== 'hex'; });

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
  function schedule() { if (!lastReq) return; clearTimeout(timer); timer = setTimeout(() => render(lastReq), 350); }
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
    lastReq = req; const my = ++gen; out.innerHTML = '';
    const ov = buildOv(); const src = $('#source').value;
    let tipInfo;
    try { tipInfo = await getTip(src); } catch (e) { out.append(el('div', { class: 'card' }, el('h2', {}, 'Block data unavailable'), el('p', { class: 'err' }, String(e.message || e)))); return; }
    if (my !== gen) return;
    const tokens = req.split(/[\s,;]+/).filter(Boolean).map((t) => (/^(tip|latest)$/i.test(t) ? String(tipInfo.tip) : t));
    const uniq = [...new Set(tokens)];
    if (!uniq.length) { out.append(el('div', { class: 'card' }, el('p', { class: 'warn' }, 'Type at least one block height.'))); return; }
    if (uniq.length > 6) out.append(el('div', { class: 'card' }, el('p', { class: 'warn' }, `Showing the first 6 of ${uniq.length} heights (each frog uses 2 WebGL contexts).`)));
    // confirmation hash source shared by all heights
    let confFixed; const cmode = cm.value;
    try {
      if (cmode === 'height') { const ch = $('#confheight').value.trim() || String(tipInfo.tip); if (!/^\d+$/.test(ch)) throw new Error('confirmation height must be a number'); if (+ch > tipInfo.tip) throw new Error(`confirmation height ${ch} is above the tip ${tipInfo.tip}`); const b = await getBlock(+ch, src); confFixed = { hash: b.hash, note: `hash of block ${ch} (${b.source})` }; }
      if (cmode === 'hex') { const x = $('#confhex').value.trim().toLowerCase(); if (!/^[0-9a-f]{8,64}$/.test(x)) throw new Error('custom hash must be 8–64 hex characters (the PREVIEW build ignores anything else)'); confFixed = { hash: x, note: 'custom hex' }; }
      if (cmode === 'none') confFixed = { hash: null, note: 'none' };
    } catch (e) { out.append(el('div', { class: 'card' }, el('h2', {}, 'Confirmation hash'), el('p', { class: 'err' }, String(e.message || e)))); return; }
    for (const [i, raw] of uniq.slice(0, 6).entries()) { if (my !== gen) return; renderOne(raw, i, tipInfo, src, ov, confFixed, my); }
  }

  async function renderOne(raw, idx, tipInfo, src, ov, confFixed, my) {
    const card = el('div', { class: 'card' }); out.append(card);
    const title = el('h2', {}, `${raw}.bitmap`); card.append(title);
    if (!/^\d{1,9}$/.test(raw)) { title.append(el('span', { class: 'badge err' }, 'invalid')); card.append(el('p', { class: 'err' }, `"${raw}" is not a block height. Use digits only, e.g. 840000.`)); return; }
    const h = Number(raw); const hs = String(h);
    if (hs !== raw) { title.textContent = `${hs}.bitmap`; card.append(el('p', { class: 'warn' }, `Leading zeros removed. A Bitmap's text is "${hs}.bitmap".`)); }
    if (h > tipInfo.tip) {
      title.append(el('span', { class: 'badge err' }, 'future block'));
      card.append(el('p', { class: 'err' }, `Block ${hs} hasn't been mined yet (tip is ${tipInfo.tip.toLocaleString('en-US')}, via ${tipInfo.source === 'ord' ? 'ordinals.com /r/blockheight' : 'mempool.space'}). No Bitmap can exist for it. The inscribed renderer would mark such a parent INVALID ("BITMAP CLAIMS A FUTURE BLOCK") and show "FROG DID NOT LOAD".`));
      return;
    }
    const status = el('p', { class: 'hint' }, 'Fetching block data…'); card.append(status);
    let blk;
    try { blk = await getBlock(h, src); } catch (e) { status.className = 'err'; status.textContent = `Couldn't fetch block ${hs}: ${e.message || e}`; title.append(el('span', { class: 'badge err' }, 'no data')); return; }
    if (my !== gen) return;
    status.remove();
    const conf = confFixed || { hash: blk.hash, note: "stand-in: this block's own hash" };
    // ---- the renderer's own derivation (same code) ----
    const auto = E.deriveTraits(hs, conf.hash);
    const fin = BFOverrides.apply(auto, ov);
    const autoSize = E.getSize(hs); const ti = tierOf(hs);
    const size = ov.mode === 'custom' && ov.size ? ov.size : autoSize;
    title.append(el('span', { class: 'badge ' + (ov.mode === 'custom' ? 'warn' : 'ok') }, ov.mode === 'custom' ? 'custom overrides' : 'auto · true derivation'));
    const rev = hs.split('').reverse();
    const used = el('table', { class: 'kv' },
      el('tr', {}, el('td', {}, 'source'), el('td', {}, `${blk.source} · ${blk.endpoints.join(', ')}`)),
      el('tr', {}, el('td', {}, 'height'), el('td', {}, `${blk.height} (Bitmap text "${hs}.bitmap" → body colours, hat/hair, size tier)`)),
      el('tr', {}, el('td', {}, 'block hash'), el('td', {}, el('code', {}, blk.hash), ` (via ${blk.hashVia})`)),
      el('tr', {}, el('td', {}, 'conf. hash used'), el('td', {}, conf.hash ? el('code', {}, conf.hash) : '— (none)', ` · ${conf.note} → rare traits`)),
      el('tr', {}, el('td', {}, 'mined'), el('td', {}, fmtTime(blk.timestamp))),
      el('tr', {}, el('td', {}, 'txs / tip'), el('td', {}, `${blk.txCount ?? '–'} txs · tip ${tipInfo.tip.toLocaleString('en-US')} · ${(tipInfo.tip - h + 1).toLocaleString('en-US')} confirmations`)));
    const derivedBox = el('div', {},
      el('div', { class: 'hint' }, el('b', {}, 'Derived from the block (auto)'), ` · tier ${ti}: ${tierLabel(ti)}`), el('div', { class: 'tlist' }, auto.map((t) => chip(t))),
      el('div', { class: 'hint' }, BODIES.map((b, i) => `${b}←${DIGIT[i]} "${rev[i] ?? '0'}"`).join(' · ')),
      ov.mode === 'custom' ? el('div', {}, el('div', { class: 'hint' }, el('b', {}, 'Rendered with overrides'), ` · scale ${size.scale}, y ${size.y}${ov.size ? ` (forced tier ${ov.size.tier})` : ''} · green = added, red = removed, amber = recoloured`), el('div', { class: 'tlist' }, diffChips(auto, fin))) : null);
    card.append(el('details', { open: idx === 0 && !matchMedia('(max-width: 900px)').matches }, el('summary', {}, 'Block data fields used'), used), derivedBox);
    // ---- the two hosts ----
    const qs = new URLSearchParams({ height: hs, tip: String(tipInfo.tip), ov: JSON.stringify(ov) });
    if (conf.hash) qs.set('confhash', conf.hash);
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
          s3.innerHTML = `${same ? '<span class="badge ok">✓ renderer traits = page</span>' : '<span class="badge err">✕ renderer traits differ</span>'} loaded ${w.__bf.loaded} GLB(s)${w.__bf.failed ? `, <span class="err">${w.__bf.failed} failed</span>` : ''}${w.__bf.missing.length ? `, <span class="warn">${w.__bf.missing.length} missing</span>` : ''} · ${(Date.now() - t0) / 1000 | 0}s`;
          if (!same) s3.title = `renderer: ${JSON.stringify(w.__bf.traits)}\npage: ${expectKeys}`;
          done3 = true; }
        else { const o = w.document.getElementById('bf-o'); if (o && o.classList.contains('err')) { s3.innerHTML = `<span class="err">${esc(o.textContent)}</span>`; done3 = true; } }
      } catch (e) { /* not ready */ }
      try {
        const w = fm.contentWindow; const P = w.__bfPreview; const st = w.__mmlStatus;
        if (P && P.snapshot && !snap) { snap = P.snapshot; showSnap(); }
        if (st && st.framed) { const same = JSON.stringify((P.final || []).map(BFOverrides.key)) === expectKeys;
          sm.innerHTML = `${same ? '<span class="badge ok">✓ MML path traits = page</span>' : '<span class="badge err">✕ differ</span>'} ${st.models} visible m-model(s), ${st.meshes} meshes · frog bbox height ${(st.box.max[1] - st.box.min[1]).toFixed(2)} m`; doneM = true; }
      } catch (e) { /* not ready */ }
      if ((!done3 || !doneM) && Date.now() - t0 < 90000) setTimeout(poll, 400);
      else { if (!done3) s3.innerHTML = '<span class="warn">still loading after 90 s</span>'; if (!doneM) sm.innerHTML = '<span class="warn">MML client: models not loaded after 90 s</span>'; card.dataset.done = '1'; }
      if (done3 && doneM) card.dataset.done = '1';
    };
    poll();
  }

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
  if (q.get('conf')) { cm.value = q.get('conf'); cm.dispatchEvent(new Event('change')); if (q.get('confheight')) $('#confheight').value = q.get('confheight'); if (q.get('confhex')) $('#confhex').value = q.get('confhex'); }
  if (q.get('src')) $('#source').value = q.get('src');
  ['anim', 'spin', 'host'].forEach((k) => { if (q.get(k) === '0') $('#' + k).checked = false; });
  if (q.get('h')) $('#heights').value = q.get('h');
  render($('#heights').value);
})().catch((e) => { document.getElementById('out').innerHTML = `<div class="card"><p class="err">Preview failed to start: ${String(e && e.message || e)}</p></div>`; console.error(e); });
