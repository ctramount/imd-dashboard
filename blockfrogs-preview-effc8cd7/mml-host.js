// BlockFrogs preview "MML host" glue for frog-mml.html. Runs after mml-client.min.js, before the renderer markup.
// It adds nothing to the frog: optional host-world lighting/ground (what any MML world supplies itself),
// frames the orbit camera on the frog once its models have loaded, and maps touch drags to the client's orbit controls.
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
        + '<m-plane width="30" height="30" rx="-90" color="#2b3a2e"></m-plane>'
        + '<m-cylinder radius="0.04" height="1.8" x="-3" y="0.9" z="-3" color="#ffd166"></m-cylinder>'
        + '<m-label content="1.8 m" x="-3" y="2.05" z="-3" width="0.9" height="0.3" font-size="16" alignment="center" color="#0b1220" font-color="#ffd166"></m-label>';
      document.body.appendChild(host);
    }
    const ctl = adapter.controls; const B = window.__mml.Box3, V = window.__mml.Vector3;
    const group = document.getElementById('group');
    let last = -1, stable = 0;
    const tick = () => {
      const c = group && group.getContainer && group.getContainer();
      let meshes = 0; if (c) c.traverse((o) => { if (o.isMesh) meshes++; });
      status.meshes = meshes;
      status.models = document.querySelectorAll('#group m-model:not([visible="false"])').length;
      if (meshes > 0 && meshes === last) stable++; else stable = 0; last = meshes;
      if (c && meshes > 0 && stable >= 4 && !status.framed) {
        c.updateMatrixWorld(true);
        // Frame on the always-present parts (shoes + bodies), like the renderer's three.js view does,
        // so long accessories (e.g. the laser beam) don't push the camera away.
        const box = new B();
        ['shoes', 'body1', 'body2', 'body3', 'body4', 'body5'].forEach((id) => { const e = document.getElementById(id); const cc = e && e.getContainer && e.getContainer(); if (cc) box.expandByObject(cc, true); });
        if (box.isEmpty()) box.setFromObject(c, true); const size = box.getSize(new V()); const ctr = box.getCenter(new V());
        status.box = { min: box.min.toArray().map((v) => +v.toFixed(3)), max: box.max.toArray().map((v) => +v.toFixed(3)) };
        const dim = Math.max(size.x, size.y, size.z, 0.5);
        ctl.setLookAt(ctr.x, ctr.y, ctr.z); ctl.setDistance(dim * (innerWidth < innerHeight ? 2.0 : 1.45)); ctl.setPitchDegrees(70);
        status.framed = true; document.documentElement.dataset.framed = '1';
        return;
      }
      setTimeout(tick, 250);
    };
    tick();
    if (ov.spin === false) ctl.setDegreesPerSecond(0);
    // Touch -> orbit (the stock orbit controls listen to mouse events only).
    let last2 = null; const el = adapter.getRenderer().domElement.parentElement || document.body;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') last2 = { x: e.clientX, y: e.clientY }; });
    el.addEventListener('pointermove', (e) => { if (!last2 || e.pointerType === 'mouse') return;
      ctl.yaw += (e.clientX - last2.x) * -0.006; ctl.pitch = Math.max(0.05, Math.min(Math.PI - 0.05, ctl.pitch + (e.clientY - last2.y) * -0.006)); last2 = { x: e.clientX, y: e.clientY }; });
    el.addEventListener('pointerup', () => { last2 = null; }); el.addEventListener('pointercancel', () => { last2 = null; });
  });
})();
