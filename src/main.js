import * as THREE from 'three';

// M0 smoke test: renderer + lit spinning cube proves the import map,
// vendored three.js, and Pages-relative paths all work end to end.
// Replaced by the real Game bootstrap in M1.

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0c14);

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(0, 2, 5);
camera.lookAt(0, 0, 0);

scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x3a2f24, 1.2));
const sun = new THREE.DirectionalLight(0xfff2dd, 1.6);
sun.position.set(3, 6, 2);
scene.add(sun);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1.4, 1.4, 1.4),
  new THREE.MeshStandardMaterial({ color: 0x5a8ae0, roughness: 0.5 })
);
scene.add(cube);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const loading = document.getElementById('loading');
loading.classList.add('hidden');

renderer.setAnimationLoop((t) => {
  cube.rotation.y = t * 0.001;
  cube.rotation.x = t * 0.0006;
  renderer.render(scene, camera);
});
