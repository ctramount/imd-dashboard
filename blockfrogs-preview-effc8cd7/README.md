# BlockFrogs preview (local only, never inscribe, not published)

Open `index.html` through any static server. It won't work from `file://`, because it uses `fetch` and module imports.

    cd blockfrogs/v2/preview && node serve.mjs 8087     # then http://127.0.0.1:8087/  (phone on the same Wi-Fi: http://<pc-ip>:8087/)

Rebuild after changing `../blockfrogs-child.v2.html`: `node src/build.mjs`. Headless check (server running): `node src/verify.mjs`, which writes `shots/`.

## How it stays faithful to the renderer
- `frog-three.html` and `frog-mml.html` are generated from `../blockfrogs-child.v2.html` by `src/build.mjs`. It uses the official `tools/fill-ids.mjs --preview`, which sets PREVIEW=true and so enables `?height=` / `?confhash=`, with preview inscription ids. It then makes 5 asserted one-line hook edits, each marked `/*PREVIEW HOOK*/`:
  traits override (`__bfPreview.traits`), size-tier override (`__bfPreview.size`, applied twice), animation pause (`__bfPreview.dt`), auto-rotate toggle (`__bfPreview.spin`) and a post-`applyMML()` snapshot (`__bfPreview.applied`). Everything else is the renderer's own code. In Auto mode every hook is the identity.
- The build checks that the TRAIT DERIVATION section is byte-identical to the source. `index.html` evaluates that same section (read from `frog-three.html`) for its trait lists and checkboxes, and cross-checks them against what each iframe's renderer reports (✓ badges).
- `bf-shim.js` stands in for ord. `/content/<id>` maps to local files via `ids-map.json`, `/r/blockhash/0` returns the mainnet genesis hash and `/r/blockheight` returns the live tip. three r178 (`lib/`, npm-identical to the on-chain copy) is wired up through an import map.
- MML view: `mml-client.min.js` is @mml-io/mml-web 0.26.1 + mml-web-threejs-standalone 0.26.1 + three 0.182, bundled with esbuild (`src/mml-entry.js`). It takes the same inline-document path as @mml-io/mml-web-client 0.26.1, without PlayCanvas and with Orbit controls. The renderer detects the registered `m-*` elements and takes its MML-host path. `mml-host.js` adds only the optional host lights, ground and 1.8 m pole, camera framing, and a touch-to-orbit bridge.
