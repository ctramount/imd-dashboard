# BlockFrogs v3.3 preview (local/static preview only, never inscribe)

Open `index.html` through any static server. It won't work from `file://`, because it uses `fetch` and module imports.

    cd blockfrogs/v3traits/preview && node serve.mjs 8093     # then http://127.0.0.1:8093/  (also /sub/)

Rebuild after changing `../blockfrogs-child.v3.3.html`: `node src/build.mjs`. Headless check (server running): `node src/verify.mjs`, which writes screenshots and `results.json` to `../renders/preview-v3.3/`.

Built from the v2 preview pipeline (`v2/preview`), adapted to the v3.3 master.

## What it shows
- Enter one or more Bitmap block heights. Every v3.3 trait comes from the height N alone: body layers 1-5 from its digits (units first), special traits from `SPECIALS` (fly socks /7, sunglasses /9, wings palindrome, halo perfect square, UFO "314", laser "100", joint "420", gold chain "888", PepeCash hat /69, Trump hair /47, Dorian hair "300", Hairpepe 441,487-441,629), the size tier from `SIZE_TIERS`, and head-stack lifts from `stackOffsets`. Head traits stack.
- There is no confirmation-hash input: v3 does not use one. Block data (ordinals.com / mempool.space) is info only; the page works without it.

## How it stays faithful to the renderer
- `frog-three.html` and `frog-mml.html` are generated from `../blockfrogs-child.v3.3.html` (v3.3.0, E3 delegate master) by `src/build.mjs`. It uses the official `v2/tools/fill-ids.mjs --preview`, which sets `PREVIEW = true` and so enables the renderer's own `?h=` override (verdict code `PREVIEW`, so no mint validation runs), with preview inscription ids. It then makes 5 asserted hook edits (7 lines), each marked `/*PREVIEW HOOK*/`: traits override (`__bfPreview.traits`), size-tier override (`__bfPreview.size`, applied 3x: applyMML, getFrog, buildMeta), animation pause (`__bfPreview.dt`), auto-rotate toggle (`__bfPreview.spin`) and a post-`applyMML()` snapshot (`__bfPreview.applied`). In Auto mode every hook is the identity.
- The build asserts that TRAIT DERIVATION, `TRAITS-BEGIN..END`, `MINT-RULES-BEGIN..END` and `VALIDATE-BEGIN..END` are byte-identical to the source, and that outside CONFIG exactly 8 lines differ (the PREVIEW flag + the 7 hook lines). `index.html` evaluates the TRAIT DERIVATION section (read from `frog-three.html`) for its trait lists and checkboxes and cross-checks them against what each iframe's renderer reports (✓ badges).
- `bf-shim.js` stands in for ord. `/content/<id>` maps to local files via `ids-map.json`, `/r/blockhash/0` returns the mainnet genesis hash and `/r/blockheight` returns the tip. With `?h=` the page has no child id in its path, so the v3.3 script reads no parents, no `/r/metadata` CBOR and no collection-parent children; every other `/r/` call would answer 404. three r178 (`lib/`, npm-identical to the on-chain copy) is wired up through an import map.
- MML view: `mml-client.min.js` is @mml-io/mml-web 0.26.1 + mml-web-threejs-standalone 0.26.1 + three 0.182 (unchanged from v2). The renderer detects the registered `m-*` elements and takes its MML-host path. `mml-host.js` adds only optional host lights, a small ground and the 1.8 m pole, and places the camera like v3.3's own `renderThree()` does: bounding sphere of every visible part except the laser, FOV 35, theta 0.6, phi 1.2, distance fitted to the narrower FOV (these are inline literals in the renderer, mirrored here). Like the renderer, this is a per-frog fit.
- Models: the 63 `v2/glb-min` files; every part v3.3 can draw has one (the build asserts it). hair = Trump, hair3 = Dorian (grey hair model), hair2 = Hairpepe (black hair model), hat = PepeCash hat.
