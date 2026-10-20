// BlockFrogs v3.3 preview shim, loaded BEFORE the real renderer inside frog-three.html / frog-mml.html.
// Emulates only what ord would serve: /content/<id> -> local file (preview ids, see ids-map.json),
// /r/blockhash/0 -> mainnet genesis (network detection), /r/blockheight -> the tip the control page fetched.
// In the PREVIEW build the height comes from the renderer's own ?h= override, so the page has no child id in its path:
// the v3.3 script then reads no parents, no /r/metadata (CBOR) and runs no mint validation (verdict 'PREVIEW').
// Anything else under /r/ answers 404, like an ord server would for an unknown id. Everything is logged in __bfPreview.requests.
(function () {
  const qs = new URLSearchParams(location.search);
  let ov = {}; try { ov = JSON.parse(qs.get('ov') || '{}'); } catch (e) { /* ignore */ }
  const GENESIS = '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f';
  const realFetch = window.fetch.bind(window);
  const mapP = realFetch(new URL('ids-map.json', location.href)).then((r) => r.json());
  const requests = [];
  const P = window.__bfPreview = {
    ov, requests, auto: null, final: null, mml: null, snapshot: null,
    traits(auto, h) { P.auto = auto; P.final = BFOverrides.apply(auto, ov); return P.final; },
    size(s) { P.sizeAuto = s; return ov.mode === 'custom' && ov.size ? { scale: String(ov.size.scale), y: String(ov.size.y) } : s; },
    dt(d) { return ov.anim === false ? 0 : d; },
    spin() { return ov.spin !== false; },
    // ---- Size QA: fixed camera (preview only; ov.fixedCam, default ON). Off = the v3.3 renderer's own fit-to-frog camera. ----
    fixedCam() { return ov.fixedCam !== false; },
    /** The renderer's own SIZE_TIERS / getSize (its TRAIT DERIVATION section, byte-checked by src/build.mjs). */
    engine() {
      if (P._E) return P._E;
      const src = [...document.scripts].map((x) => x.textContent).find((t) => t.includes('/* ======================= TRAIT DERIVATION'));
      const A = src.indexOf('/* ======================= TRAIT DERIVATION'), B = src.indexOf('/* ======================= RECURSIVE HELPERS');
      return (P._E = new Function(src.slice(A, B) + '\nreturn { SIZE_TIERS, getSize };')());
    },
    /** v2 framing: the core box (shoes + bodies, world coords at scale s / y offset y) mapped to the LARGEST size tier.
     *  -> { center:[x,y,z], radius } for a camera that uses v3.3's fit (radius * 1.02 / sin(fov/2), FOV 35).
     *  lift 0.25 and pad 1.5625 reproduce v2's CAM (dist 5.3 x half the largest core dimension, headroom 0.25) under that fit. */
    FIX: { lift: 0.25, pad: 5.3 / (1.02 / Math.sin(35 * Math.PI / 360)) },
    fixedFrame(min, max, s, y) {
      const big = P.engine().SIZE_TIERS.reduce((a, t) => (Number(t[1]) > Number(a[1]) ? t : a));
      const k = Number(big[1]) / Number(s), Y = Number(big[2]);
      const lo = [min[0] * k, (min[1] - y) * k + Y, min[2] * k], hi = [max[0] * k, (max[1] - y) * k + Y, max[2] * k];
      const r = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) * 0.5 || 1;
      const center = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2 + r * P.FIX.lift, (lo[2] + hi[2]) / 2];
      return { center, radius: r * P.FIX.pad, bigScale: Number(big[1]) };
    },
    /** three.js view hook: identity when the fixed camera is off. */
    cam(center, radius, frog, THREE) {
      const core = new THREE.Box3(); frog.children.filter((c) => c.userData.bfCore).forEach((c) => core.expandByObject(c, true));
      P.coreHeight = core.isEmpty() ? null : core.max.y - core.min.y;
      if (!P.fixedCam() || core.isEmpty()) { P.camMode = 'fit'; return radius; }
      const f = P.fixedFrame(core.min.toArray(), core.max.toArray(), frog.scale.y, frog.position.y);
      center.set(f.center[0], f.center[1], f.center[2]); P.camMode = 'fixed'; P.camInfo = f;
      return f.radius;
    },
    applied(h, traits) {
      const g = document.getElementById('group');
      P.snapshot = g ? g.outerHTML : null; // the MML exactly as the renderer's applyMML() left it
      if (ov.anim === false) document.querySelectorAll('m-model').forEach((m) => m.setAttribute('anim-enabled', 'false')); // viewer option, after snapshot
      try { parent.postMessage({ type: 'bf:applied', frame: qs.get('frame'), h, traits }, '*'); } catch (e) { /* ignore */ }
    },
  };
  const resp = (body, status = 200, type = 'application/json') => new Response(body, { status, headers: { 'content-type': type } });
  window.fetch = async (input, init) => {
    const raw = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
    const u = new URL(raw, location.href);
    if (u.origin === location.origin) {
      let m;
      if ((m = u.pathname.match(/\/content\/([0-9a-f]{64}i\d+)$/))) {
        const f = (await mapP).map[m[1]];
        requests.push({ url: u.pathname, served: f || '404' });
        if (!f) return resp('not found', 404, 'text/plain');
        return realFetch(new URL(f, location.href), init && init.signal ? { signal: init.signal } : undefined);
      }
      if (/^\/r\//.test(u.pathname)) {
        let r;
        if (u.pathname === '/r/blockhash/0') r = resp(JSON.stringify(GENESIS));
        else if (u.pathname === '/r/blockheight' && qs.get('tip')) r = resp(qs.get('tip'), 200, 'text/plain');
        else r = resp('{}', 404);
        requests.push({ url: u.pathname, served: r.status === 200 ? 'emulated' : '404' });
        return r;
      }
    }
    requests.push({ url: raw, served: 'passthrough' });
    return realFetch(input, init);
  };
})();
