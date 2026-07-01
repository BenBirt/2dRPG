# Asset licenses & provenance

All 3D models in this directory are **CC0 1.0 Universal** (public domain dedication)
by [Kay Lousberg (KayKit)](https://kaylousberg.itch.io/). No attribution is required;
it is given here gladly.

| Directory | Source pack | Repository |
|---|---|---|
| `models/dungeon/` | KayKit Dungeon Remastered 1.0 | <https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0> |
| `models/characters/` | KayKit Character Pack: Adventurers 1.0 | <https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0> |
| `models/enemies/` | KayKit Character Pack: Skeletons 1.0 | <https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0> |

Only the subset of models used by the game is committed. Character/enemy GLBs were
post-processed with [glTF Transform](https://gltf-transform.dev/) to remove unused
animation clips (95+ clips per file reduced to the ~10 the game plays), then
resampled and pruned. Geometry, materials, and textures are unmodified.

Music and sound effects contain no licensed assets — they are synthesized at runtime
with the Web Audio API.

three.js is vendored under `vendor/three/` (MIT license, see `vendor/three/LICENSE`).
