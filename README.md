# The Hollow Isle

### ▶ [Play it here](https://benbirt.github.io/2dRPG/)

A Zelda-like top-down action RPG in the spirit of *Link's Awakening* — low-poly 3D,
tilted top-down camera, built with [three.js](https://threejs.org/). Runs entirely in
the browser (desktop and phone), served as a static site from GitHub Pages.

A knight washes ashore on the isle of Vessa, where the dead walk and the light is
failing. Recover the three shards of the Heartlight from the isle's vaults — and learn
why its last guardian shattered it.

## Play

- **Desktop**: WASD / arrow keys to move, `Space`/`J` to attack & interact, `K`/`X` to
  use the equipped item, `Tab`/`I` to switch items, `Esc` to pause.
- **Phone**: virtual joystick (left half of screen), B = attack/interact, A = item.

Progress autosaves to localStorage; savestates can also be exported/imported as JSON
files from the pause menu.

## Development

No build step — plain ES modules plus an import map (three.js is vendored under
`vendor/three/`). Serve the repo root over HTTP:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

`node tools/validate-maps.mjs` sanity-checks the level data.

Deployment to GitHub Pages happens via `.github/workflows/deploy.yml` on push to
`main` (repo Settings → Pages → Source: **GitHub Actions** must be enabled once).

## Credits

- 3D assets: [KayKit](https://kaylousberg.itch.io/) Dungeon Remastered, Adventurers &
  Skeletons packs (CC0) — see `assets/LICENSES.md`.
- Engine: three.js (MIT) — see `vendor/three/LICENSE`.
- Music & sound effects are synthesized at runtime with WebAudio.
