// BlockFrogs preview: override logic shared by the control page (index.html) and the frog pages (frog-*.html).
// It only post-processes the list returned by the renderer's own deriveTraits(); it never re-derives traits.
(function (g) {
  // Optional parts in the order of the <m-model> elements in blockfrogs-child.v2.html.
  const OPTIONAL = ['hat', 'hair', 'hair2', 'hair3', 'halo', 'joint', 'gold_chain', 'wings', 'ufo', 'laser', 'flyesocks', 'sunglasses'];
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
    return out;
  };
  const key = (t) => t.part + (t.color ? `_${t.color}` : '');
  g.BFOverrides = { OPTIONAL, apply, key };
})(window);
