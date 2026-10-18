// BlockFrogs preview "MML host" glue for frog-mml.html. Runs after mml-client.min.js, before the renderer markup.
// It adds nothing to the frog: optional host-world lighting/ground (what any MML world supplies itself),
// places the orbit camera with the renderer's fixed default framing once the models have loaded, and maps touch drags to the client's orbit controls.
(function () {
  const ov = (window.__bfPreview && window.__bfPreview.ov) || {};
  const status = window.__mmlStatus = { models: 0, loaded: 0, meshes: 0, framed: false, box: null };
  window.addEventListener('load', async () => {
    document.documentElement.style.background = document.body.style.background = '#0b1220'; // host-world backdrop
    document.body.style.margin = '0'; document.body.style.overflow = 'hidden';
    const adapter = await window.__mml.ready;
    if (ov.host !== false) {
      const host = document.createElement('m-group'); host.id = 'host-world';
      host.innerHTML = '<m-light type="point" x="4" y="9" z="6" intensity="120" distance="60" cast-shadows="false"></m-light>'
        + '<m-light type="point" x="-6" y="6" z="-5" intensity="60" distance="60" cast-shadows="false" color="#9fd8ff"></m-light>'
        + '<m-light type="point" x="0" y="4" z="9" intensity="50" distance="60" cast-shadows="false"></m-light>'
        + '<m-plane width="9" height="9" rx="-90" z="0.6" color="#18241b"></m-plane>' // small, dark ground (was 30 x 30 m, which filled the view)
        + '<m-cylinder radius="0.04" height="1.8" x="-2.4" y="0.9" z="-1.2" color="#ffd166"></m-cylinder>'
        + '<m-label content="1.8 m" x="-2.4" y="2.05" z="-1.2" width="0.9" height="0.3" font-size="16" alignment="center" color="#0b1220" font-color="#ffd166"></m-label>';
      document.body.appendChild(host);
    }
    // The renderer's own SIZE_TIERS / CAM (TRAIT DERIVATION section of the inline renderer script; byte-checked by src/build.mjs).
    const renderer = () => { const src = [...document.scripts].map((x) => x.textContent).find((t) => t.includes('/* ======================= TRAIT DERIVATION'));
      const A = src.indexOf('/* ======================= TRAIT DERIVATION'), Bi = src.indexOf('/* ======================= RECURSIVE HELPERS');
      return new Function(src.slice(A, Bi) + '\nreturn { SIZE_TIERS, CAM };')(); };
    const ctl = adapter.controls; const B = window.__mml.Box3, V = window.__mml.Vector3;
    const group = document.getElementById('group');
    let last = -1, stable = 0;
    const tick = () => {
      const c = group && group.getContainer && group.getContainer();
      let meshes = 0; if (c) c.traverse((o) => { if (o.isMesh) meshes++; });
      status.meshes = meshes;
      status.models = document.querySelectorAll('#group m-model:not([visible="false"])').length;
      if (meshes > 0 && meshes === last) stable++; else stable = 0; last = meshes;
      if (c && meshes > 0 && stable >= 4 && !status.framed && !posing) {
        // Measure in the clip's t=0 pose, like renderThree does (mixers.update(0)): pause every model at 0 for a moment,
        // then restore the attributes exactly as they were. (The MML snapshot shown in the page was taken before this.)
        const ms = [...document.querySelectorAll('#group m-model')]; const saved = ms.map((m) => [m.getAttribute('anim-start-time'), m.getAttribute('anim-pause-time')]);
        ms.forEach((m) => { m.setAttribute('anim-start-time', '0'); m.setAttribute('anim-pause-time', '0'); }); posing = true;
        let n = 0; const later = (fn) => (++n < 6 ? requestAnimationFrame(() => later(fn)) : setTimeout(fn, 150)); // a few rendered frames, so the pause is applied even on a slow GPU
        later(() => { frame(c); ms.forEach((m, i) => { const [a, b] = saved[i]; if (a === null) m.removeAttribute('anim-start-time'); else m.setAttribute('anim-start-time', a); if (b === null) m.removeAttribute('anim-pause-time'); else m.setAttribute('anim-pause-time', b); }); });
        return;
      }
      setTimeout(tick, 250);
    };
    let posing = false;
    const frame = (c) => {
        c.updateMatrixWorld(true);
        // Measure the always-present parts (shoes + bodies), like the renderer's three.js view does,
        // so long accessories (e.g. the laser beam) don't push the camera away.
        const box = new B();
        ['shoes', 'body1', 'body2', 'body3', 'body4', 'body5'].forEach((id) => { const e = document.getElementById(id); const cc = e && e.getContainer && e.getContainer(); if (cc) box.expandByObject(cc, true); });
        if (box.isEmpty()) box.setFromObject(c, true); const size = box.getSize(new V()); const ctr = box.getCenter(new V());
        status.box = { min: box.min.toArray().map((v) => +v.toFixed(3)), max: box.max.toArray().map((v) => +v.toFixed(3)) };
        // Same FIXED default camera as the renderer's three.js view (renderThree): the core box mapped to the largest size
        // tier, the renderer's CAM constants, read from the page's own TRAIT DERIVATION section. No per-frog zoom-to-fit, so
        // the tier size (m-group sx/sy/sz + y) stays visible and both views show a frog at the same size.
        const E = renderer(); const big = E.SIZE_TIERS.reduce((a, t) => (Number(t[1]) > Number(a[1]) ? t : a));
        const gs = Number(group.getAttribute('sy') || 1), gy = Number(group.getAttribute('y') || 0), k = Number(big[1]) / gs, C = E.CAM;
        const rs = size.clone().multiplyScalar(k); const radius = Math.max(rs.x, rs.y, rs.z) * 0.5 || 1;
        const look = new V(ctr.x * k, (ctr.y - gy) * k + Number(big[2]) + radius * C.lift, ctr.z * k);
        adapter.setCameraFOV(C.fov);
        const spinRate = ov.spin === false ? 0 : -0.35 * 180 / Math.PI; // the three.js view turns +0.35 rad/s; this client's yaw runs the other way
        ctl.setDegreesPerSecond(spinRate);
        let base = radius * C.dist; const aspectK = () => Math.max(1, C.minAspect / (innerWidth / innerHeight));
        ctl.setLookAt(look.x, look.y, look.z); ctl.setDistance(base * aspectK()); ctl.pitch = C.phi; ctl.yaw = C.theta - ctl.getBaseYaw();
        let lastK = aspectK(); window.addEventListener('resize', () => { const k2 = aspectK(); ctl.setDistance(ctl.distance * k2 / lastK); lastK = k2; });
        status.view = { center: look.toArray(), radius, dist: base, theta: C.theta, phi: C.phi, fov: C.fov, scale: gs, y: gy };
        status.framed = true; document.documentElement.dataset.framed = '1';
    };
    ctl.setDegreesPerSecond(0); // no turning until the camera is placed (spin, if on, starts then)
    tick();
    // Touch -> orbit (the stock orbit controls listen to mouse events only).
    let last2 = null; const el = adapter.getRenderer().domElement.parentElement || document.body;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') last2 = { x: e.clientX, y: e.clientY }; });
    el.addEventListener('pointermove', (e) => { if (!last2 || e.pointerType === 'mouse') return;
      ctl.yaw += (e.clientX - last2.x) * -0.006; ctl.pitch = Math.max(0.05, Math.min(Math.PI - 0.05, ctl.pitch + (e.clientY - last2.y) * -0.006)); last2 = { x: e.clientX, y: e.clientY }; });
    el.addEventListener('pointerup', () => { last2 = null; }); el.addEventListener('pointercancel', () => { last2 = null; });
  });
})();
