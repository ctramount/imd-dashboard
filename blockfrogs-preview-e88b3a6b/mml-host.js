// BlockFrogs preview "MML host" glue for frog-mml.html. Runs after mml-client.min.js, before the renderer markup.
// It adds nothing to the frog: optional host-world lighting/ground (what any MML world supplies itself),
// places the orbit camera with the v3.3 renderer's own framing (bounding-sphere fit) once the models have loaded, and maps touch drags to the client's orbit controls.
(function () {
  const P = window.__bfPreview; const ov = (P && P.ov) || {};
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
        + '<m-cylinder id="bf-pole" radius="0.04" height="1.8" x="-2.4" y="0.9" z="-1.2" color="#ffd166"></m-cylinder>'
        + '<m-label id="bf-pole-label" content="1.8 m" x="-2.4" y="2.05" z="-1.2" width="0.9" height="0.3" font-size="16" alignment="center" color="#0b1220" font-color="#ffd166"></m-label>';
      document.body.appendChild(host);
    }
    // v3.3 framing constants. They are inline literals in the renderer's renderThree() (not in a named constant), mirrored here:
    // FOV 35, theta 0.6, phi 1.2, bounding sphere of every part except the laser, distance = r * 1.02 / sin(min(vFov/2, hFov/2)).
    const V33 = { fov: 35, theta: 0.6, phi: 1.2, margin: 1.02 };
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
        // Same framing as the v3.3 renderer's own three.js view (renderThree): every visible part except the long laser beams,
        // in the t=0 pose, enclosed in a bounding sphere; camera at (theta 0.6, phi 1.2), FOV 35, fitted to the narrower FOV.
        // Like the renderer, this is a per-frog fit, so the size tier shows in the MML markup (m-group sx/sy/sz, y) and next to the 1.8 m pole.
        const box = new B(); const core = new B();
        document.querySelectorAll('#group m-model').forEach((e) => {
          if (e.getAttribute('visible') === 'false') return; const cc = e.getContainer && e.getContainer(); if (!cc) return;
          if (e.id !== 'laser') box.expandByObject(cc, true);
          if (/^(shoes|body[1-5])$/.test(e.id)) core.expandByObject(cc, true);
        });
        if (box.isEmpty()) box.setFromObject(c, true);
        let ctr = box.getCenter(new V()); let radius = box.getSize(new V()).length() * 0.5 || 1; // = Box3.getBoundingSphere().radius, as in renderThree
        const bb = core.isEmpty() ? box : core;
        const gs0 = Number(group.getAttribute('sy') || 1), gy0 = Number(group.getAttribute('y') || 0);
        status.coreHeight = core.isEmpty() ? null : core.max.y - core.min.y;
        status.camMode = 'fit';
        if (P && P.fixedCam() && !core.isEmpty()) { // Size QA (preview only): same fixed framing as the three.js view's /*PREVIEW HOOK*/
          const f = P.fixedFrame(core.min.toArray(), core.max.toArray(), gs0, gy0);
          ctr = new V(f.center[0], f.center[1], f.center[2]); radius = f.radius; status.camMode = 'fixed';
          // keep the 1.8 m pole in frame, just left of the frog on screen, at the same spot for every height
          const pole = document.getElementById('bf-pole'), lab = document.getElementById('bf-pole-label');
          if (pole) { // after the camera has moved: step left along the camera's own screen-right axis, on the ground
            const at = ctr.clone(), R0 = radius;
            requestAnimationFrame(() => requestAnimationFrame(() => {
              const cam = ctl.camera; cam.updateMatrixWorld(true); const e = cam.matrixWorld.elements; let rx = e[0], rz = e[2]; const l = Math.hypot(rx, rz) || 1; rx /= l; rz /= l;
              const v = (V33.fov * Math.PI / 180) / 2, half = Math.atan(Math.tan(v) * (innerWidth / innerHeight)); // horizontal half-FOV
              const a = Math.min(R0 * 0.7, ctl.distance * Math.tan(half) * 0.72);
              const px = at.x - rx * a, pz = at.z - rz * a;
              pole.setAttribute('x', String(px)); pole.setAttribute('z', String(pz)); lab.setAttribute('x', String(px)); lab.setAttribute('z', String(pz));
              status.pole = [px, pz];
            }));
          }
        }
        status.box = { min: bb.min.toArray().map((v) => +v.toFixed(3)), max: bb.max.toArray().map((v) => +v.toFixed(3)) };
        const fit = () => { const v = (V33.fov * Math.PI / 180) / 2; const asp = innerWidth / innerHeight; return radius * V33.margin / Math.sin(Math.min(v, Math.atan(Math.tan(v) * asp))); };
        adapter.setCameraFOV(V33.fov);
        const spinRate = ov.spin === false ? 0 : -0.35 * 180 / Math.PI; // the three.js view turns +0.35 rad/s; this client's yaw runs the other way
        ctl.setDegreesPerSecond(spinRate);
        ctl.setLookAt(ctr.x, ctr.y, ctr.z); ctl.setDistance(fit()); ctl.pitch = V33.phi; ctl.yaw = V33.theta - ctl.getBaseYaw();
        window.addEventListener('resize', () => ctl.setDistance(fit()));
        status.view = { center: ctr.toArray(), radius, dist: fit(), theta: V33.theta, phi: V33.phi, fov: V33.fov, scale: Number(group.getAttribute('sy') || 1), y: Number(group.getAttribute('y') || 0) };
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
