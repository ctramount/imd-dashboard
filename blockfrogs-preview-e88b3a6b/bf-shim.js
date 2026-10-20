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
