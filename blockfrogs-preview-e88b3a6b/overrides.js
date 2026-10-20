// BlockFrogs v3.3 preview: override logic shared by the control page (index.html) and the frog pages (frog-*.html).
// It only post-processes the list returned by the renderer's own deriveTraits(); it never re-derives traits.
(function (g) {
  // Draw order of blockfrogs-child.v3.3.html (Z_ORDER). app.js asserts this equals the renderer's Z_ORDER.
  const Z_ORDER = ['shoes', 'body1', 'body2', 'body3', 'body4', 'body5', 'wings', 'flyesocks', 'joint', 'gold_chain',
    'hair', 'hair3', 'hair2', 'sunglasses', 'laser', 'hat', 'halo', 'ufo'];
  const OPTIONAL = Z_ORDER.filter((p) => !/^(shoes|body[1-5])$/.test(p));
  /** ov = { mode:'auto'|'custom', parts:{hat:true|false,...}, colors:{body1:'50C878',...}, size:{scale,y}|null, anim, spin, host } */
  const apply = (auto, ov) => {
    if (!ov || ov.mode !== 'custom') return auto.map((t) => ({ ...t }));
    const parts = ov.parts || {}; const colors = ov.colors || {};
    const out = [];
    for (const t of auto) {
      if (/^body[1-5]$/.test(t.part)) { out.push({ part: t.part, color: colors[t.part] || t.color }); continue; }
      if (OPTIONAL.includes(t.part) && parts[t.part] === false) continue;
      out.push({ ...t });
    }
    for (const p of OPTIONAL) if (parts[p] === true && !out.some((t) => t.part === p)) out.push({ part: p });
    // keep the renderer's bottom-to-top draw order (it adds GLBs in list order and uses Z_ORDER for renderOrder)
    return out.sort((a, b) => Z_ORDER.indexOf(a.part) - Z_ORDER.indexOf(b.part));
  };
  const key = (t) => t.part + (t.color ? `_${t.color}` : '');
  g.BFOverrides = { Z_ORDER, OPTIONAL, apply, key };
})(window);
