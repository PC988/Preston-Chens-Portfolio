/* 3D model viewer for project pages.
   Loaded on demand by app.js when a project has a `models` list in content.js.
   Uses one WebGL canvas and swaps models with the switcher. */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";

const CYAN = 0x00e5ff;

export function mount({ canvasWrap, onProgress, onReady, onError }) {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  canvasWrap.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 50);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 0.8;
  controls.maxDistance = 6;
  controls.maxPolarAngle = Math.PI * 0.53;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 1.1;
  // Wheel zoom only after the user clicks into the viewer, so page scroll isn't hijacked
  controls.enableZoom = false;
  const armZoom = () => { controls.enableZoom = true; canvasWrap.classList.add("zoom-on"); };
  const disarmZoom = () => { controls.enableZoom = false; canvasWrap.classList.remove("zoom-on"); };
  renderer.domElement.addEventListener("pointerdown", armZoom);
  renderer.domElement.addEventListener("pointerleave", disarmZoom);

  // Lights: soft key, cyan rim from behind
  scene.add(new THREE.HemisphereLight(0xdff6ff, 0x050809, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(2, 3, 2.5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(CYAN, 2.2);
  rim.position.set(-2.5, 1.5, -3);
  scene.add(rim);

  // Floor: cyan grid + glow disc
  const grid = new THREE.GridHelper(4, 40, CYAN, 0x0d3a42);
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  scene.add(grid);
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(0.9, 64),
    new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.06, depthWrite: false })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.001;
  scene.add(glow);

  const material = new THREE.MeshStandardMaterial({ color: 0xc4ced1, metalness: 0.35, roughness: 0.5 });
  const wireMat = new THREE.MeshBasicMaterial({ color: CYAN, wireframe: true, transparent: true, opacity: 0.35 });

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  const cache = new Map();   // src -> Promise<Group>
  let current = null;
  let wire = false;
  let token = 0;
  let home = { pos: new THREE.Vector3(1.6, 1.1, 1.9), target: new THREE.Vector3(0, 0.4, 0) };

  function prepare(gltf) {
    const group = new THREE.Group();
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      let g = o.geometry.clone().applyMatrix4(o.matrixWorld);
      g.deleteAttribute("normal");
      g = toCreasedNormals(g, THREE.MathUtils.degToRad(32));
      const mesh = new THREE.Mesh(g, material);
      group.add(mesh);
    });
    // Sit on the floor, centered, largest side = 1
    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    const s = 1 / Math.max(size.x, size.y, size.z);
    group.scale.setScalar(s);
    const c = box.getCenter(new THREE.Vector3());
    group.position.set(-c.x * s, -box.min.y * s, -c.z * s);
    group.userData.height = size.y * s;
    return group;
  }

  function load(src) {
    if (!cache.has(src)) {
      cache.set(src, new Promise((res, rej) => {
        loader.load(src, (g) => res(prepare(g)), (e) => {
          if (e.lengthComputable) onProgress?.(e.loaded / e.total);
        }, rej);
      }));
    }
    return cache.get(src);
  }

  function frameModel(group) {
    const h = group.userData.height || 0.6;
    home.target.set(0, h * 0.45, 0);
    const dist = 2.35;
    home.pos.set(dist * 0.62, h * 0.45 + dist * 0.42, dist * 0.75);
    camera.position.copy(home.pos);
    controls.target.copy(home.target);
    controls.update();
  }

  async function show(src, rotateDeg) {
    const my = ++token;
    onProgress?.(0);
    try {
      const group = await load(src);
      if (my !== token) return;
      if (current) scene.remove(current);
      if (rotateDeg) group.rotation.y = THREE.MathUtils.degToRad(rotateDeg);
      current = group;
      setWire(wire);
      scene.add(group);
      frameModel(group);
      onReady?.();
    } catch (err) {
      if (my === token) onError?.(err);
    }
  }

  function setWire(on) {
    wire = on;
    if (!current) return;
    current.traverse((o) => { if (o.isMesh) o.material = on ? wireMat : material; });
  }

  function resize() {
    const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvasWrap);
  resize();

  // Pause auto-rotate while the user is dragging, resume after a beat
  let resumeTimer = 0, userSpin = controls.autoRotate;
  controls.addEventListener("start", () => { clearTimeout(resumeTimer); controls.autoRotate = false; });
  controls.addEventListener("end", () => { resumeTimer = setTimeout(() => (controls.autoRotate = userSpin), 2500); });

  let raf = 0, visible = true;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
  io.observe(canvasWrap);
  function tick() {
    raf = requestAnimationFrame(tick);
    if (!visible) return;
    controls.update();
    renderer.render(scene, camera);
  }
  tick();

  return {
    show,
    preload: (src) => load(src).catch(() => {}),
    reset() { camera.position.copy(home.pos); controls.target.copy(home.target); controls.update(); },
    toggleSpin() { userSpin = !userSpin; controls.autoRotate = userSpin; return userSpin; },
    toggleWire() { setWire(!wire); return wire; },
    dispose() {
      cancelAnimationFrame(raf);
      clearTimeout(resumeTimer);
      ro.disconnect(); io.disconnect();
      controls.dispose();
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      cache.forEach((p) => p.then((g) => g.traverse((o) => o.geometry && o.geometry.dispose())).catch(() => {}));
      material.dispose(); wireMat.dispose(); pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
