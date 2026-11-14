// 3D views inside the Chicken Fire slides. One script drives every <div class="v3d" data-view="…">:
// bucket, chicken (buttons play the real clips), oak (burns down), result (tabs: reference sheet ↔ model),
// seethrough (round window in the tree). Renderers start when a view scrolls into sight and only draw while visible.
import * as THREE from '../../vendor/three/three.module.js';
import { GLTFLoader } from '../../vendor/three/GLTFLoader.js';
import { OrbitControls } from '../../vendor/three/OrbitControls.js';
import { clone } from '../../vendor/three/SkeletonUtils.js';

const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const loader = new GLTFLoader();
const cache = {};
const load = (name) => (cache[name] ??= loader.loadAsync(new URL(`models/${name}.glb`, import.meta.url).href));

// game look (CartoonLook.txt): 3-step toon shading, warm light, cool shadow, dark plum outline on characters and gear
const steps = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
steps.needsUpdate = true;
const PLUM = 0x3a1d2c;
const blobTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(0,0,0,.45)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

// inverted hull pushed out in screen space, so the line is the same few pixels at any model scale
function outline(mesh, res) {
  const mat = new THREE.MeshBasicMaterial({ color: PLUM, side: THREE.BackSide });
  mat.onBeforeCompile = (s) => {
    s.uniforms.uRes = res;
    s.vertexShader = 'uniform vec2 uRes;\n' + s.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      #ifdef USE_SKINNING
        vec3 olN = transformedNormal;
      #else
        vec3 olN = normalMatrix * normal;
      #endif
      vec2 olD = (projectionMatrix * vec4(olN, 0.0)).xy;
      if (dot(olD, olD) > 1e-10) gl_Position.xy += normalize(olD) * 4.0 / uRes * gl_Position.w;  // 2 CSS px`);
  };
  const o = mesh.isSkinnedMesh ? new THREE.SkinnedMesh(mesh.geometry, mat) : new THREE.Mesh(mesh.geometry, mat);
  if (mesh.isSkinnedMesh) o.bind(mesh.skeleton, mesh.bindMatrix);
  o.frustumCulled = false;
  return o;
}

function toon(root, res) {
  const meshes = [];
  root.traverse((o) => o.isMesh && meshes.push(o));
  for (const m of meshes) {
    m.material = new THREE.MeshToonMaterial({ color: m.material.color.clone(), vertexColors: m.material.vertexColors, gradientMap: steps });
    m.frustumCulled = false;   // skinned bounds are the bind pose
    if (res && !m.name.startsWith('Eyes')) m.add(outline(m, res));
  }
}

const box = (o) => new THREE.Box3().setFromObject(o);

// load a model, toon it, scale it to `height` and stand it on the origin
async function place(v, name, height, lined = true) {
  const gltf = await load(name);
  const root = clone(gltf.scene);
  toon(root, lined && v.res);
  const g = new THREE.Group();
  g.add(root);
  const b = box(g);
  g.scale.setScalar(height / (b.max.y - b.min.y));
  g.updateMatrixWorld(true);
  const c = box(g);
  g.position.set(-(c.min.x + c.max.x) / 2, -c.min.y, -(c.min.z + c.max.z) / 2);
  g.updateMatrixWorld(true);
  v.scene.add(g);
  return { g, root, gltf };
}

function blob(v, x, z, size) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.002, z);
  v.scene.add(m);
}

// enemy chicken: real clips, two eye sets, red hit flash (Body only; eyes stay black as in the game)
function chicken({ gltf, root }) {
  const mixer = new THREE.AnimationMixer(root);
  const body = root.getObjectByName('Body'), round = root.getObjectByName('EyesNormal'), squeezed = root.getObjectByName('EyesSqueezed');
  for (const e of [round, squeezed]) e.material = new THREE.MeshBasicMaterial({ color: 0x0b0908 });
  let cur, flash = 0;
  const c = {
    eyes(sq) { round.visible = !sq; squeezed.visible = sq; },
    play(name, once) {
      const clip = gltf.animations.find((a) => a.name === name), a = mixer.clipAction(clip);
      a.reset().setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
      a.clampWhenFinished = true;
      a.setEffectiveWeight(1);
      if (cur && cur !== a) a.crossFadeFrom(cur, 0.08, false);
      a.play();
      cur = a;
      return clip.duration;
    },
    flash() { flash = 1; },
    update(dt) {
      mixer.update(dt);
      flash = Math.max(0, flash - dt / 0.25);
      body.material.color.setScalar(1 - flash);
      body.material.emissive.setRGB(flash, flash * 0.025, flash * 0.015);
    },
  };
  c.eyes(false);
  return c;
}

// [clip, play once, > < eyes, label]
const STATES = { idle: ['idle', 0, 0, '평소'], startle: ['BurnStartle', 1, 1, '놀람'], run: ['PanicRun', 0, 1, '도주'], recover: ['PanicRecover', 1, 1, '회복'] };
// the game's hit reaction (EnemyDirector): startle 0.2 s → panic run 2 s → recover 0.3 s → idle
const HIT = [['startle', 0.2], ['run', 2], ['recover', 0.3], ['idle']];

// steps run on the render clock, so a hidden slide pauses the sequence instead of skipping it
function sequencer(c, onState) {
  let q = [], loop = null, left = Infinity;
  const next = () => {
    if (!q.length && loop) q = loop.slice();
    const s = q.shift();
    if (!s) { left = Infinity; return; }
    const [clip, once, sq, label] = STATES[s[0]];
    const d = c.play(clip, once);
    c.eyes(!!sq);
    if (s[0] === 'startle') c.flash();
    left = s[1] ?? (once && q.length ? d : Infinity);
    onState?.(s[0], label, s[1] ?? (once ? d : 0));
  };
  return {
    run(seq, looping) { q = seq.slice(); loop = looping ? seq : null; next(); },
    update(dt) { if ((left -= dt) <= 0) next(); },
  };
}

// leaves burn away from the bottom up (height + noise against uBurn, orange edge); wood chars as the front passes.
// The same material opens a dithered round window around the hidden chicken (uHole: x, y, radius in pixels).
function burnable(root) {
  const lb = box(root.getObjectByName('Leaves'));
  const u = { uBurn: { value: 0 }, uY0: { value: lb.min.y }, uY1: { value: lb.max.y }, uOpen: { value: 0 }, uHole: { value: new THREE.Vector3(0, 0, 1) } };
  root.traverse((o) => {
    if (!o.isMesh) return;
    const leaf = o.name === 'Leaves';
    if (leaf) o.material.side = THREE.DoubleSide;
    o.material.customProgramCacheKey = () => 'burn' + leaf;
    o.material.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, u);
      s.vertexShader = 'varying vec3 vWPos;\n' + s.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      s.fragmentShader = `uniform float uBurn, uY0, uY1, uOpen; uniform vec3 uHole; varying vec3 vWPos;
float hash3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float bayer4(vec2 p) {
  const float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
  ivec2 i = ivec2(mod(p, 4.0)); return (m[i.x + i.y * 4] + 0.5) / 16.0;
}
` + s.fragmentShader
        .replace('#include <color_fragment>', `#include <color_fragment>
  if (uOpen > 0.0) {
    float fade = uOpen * (1.0 - smoothstep(0.55, 1.0, distance(gl_FragCoord.xy, uHole.xy) / uHole.z));
    if (fade > bayer4(gl_FragCoord.xy)) discard;
  }
  float h = (vWPos.y - uY0) / (uY1 - uY0) + (vnoise(vWPos * 3.0) - 0.5) * 0.35;
  float gap = h - (uBurn * 1.6 - 0.35);
  float edge = 0.0;
  ${leaf ? `if (gap < 0.0) discard;
  edge = 1.0 - smoothstep(0.0, 0.05, gap);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.03, 0.02), 1.0 - smoothstep(0.0, 0.18, gap));`
    : 'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.012, 0.008, 0.006), 1.0 - smoothstep(-0.1, 0.1, max(h, 0.0) - (uBurn * 1.6 - 0.35)));'}`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.25, 0.03) * 1.8 * edge;');
    };
  });
  return u;
}

const buttons = (v, sel) => [...v.block.querySelectorAll(sel)];

const VIEWS = {
  async bucket(v) {
    const m = await place(v, 'bucket', 1);
    blob(v, 0, 0, 1.4);
    v.fit(m.g, [0.3, 0.55, 1]);
  },

  async chicken(v) {
    const m = await place(v, 'chicken', 1);
    blob(v, 0, 0, 1);
    const c = chicken(m), live = v.block.querySelector('.v-live'), btns = buttons(v, '[data-act]');
    const seq = sequencer(c, (key, label, t) => {
      live.textContent = `지금: ${label} · ${t ? `${+t.toFixed(2)}초` : '반복'}`;
      for (const b of btns) if (b.dataset.act !== 'hit') b.setAttribute('aria-pressed', b.dataset.act === key);
    });
    const SEQ = { idle: [['idle']], startle: [['startle']], run: [['run']], recover: [['recover'], ['idle']], hit: HIT };
    for (const b of btns) b.addEventListener('click', () => seq.run(SEQ[b.dataset.act]));
    seq.run(SEQ.idle);
    v.tick = (dt) => { seq.update(dt); c.update(dt); };
    v.fit(m.g, [0.45, 0.25, 1]);
  },

  async oak(v) {
    const m = await place(v, 'oak', 5, false);
    blob(v, 0, 0, 3.2);
    const u = burnable(m.root);
    let on = 0;
    for (const b of buttons(v, '[data-act]')) b.addEventListener('click', () => { on = b.dataset.act === 'burn' ? 1 : 0; if (!on) u.uBurn.value = 0; });
    v.tick = (dt) => { if (on) u.uBurn.value = Math.min(1, u.uBurn.value + dt / 3); };
    v.fit(m.g, [0.4, 0.2, 1]);
  },

  async result(v) {
    const [ch, pl] = await Promise.all([place(v, 'chicken', 1), place(v, 'player', 1.15)]);
    blob(v, 0, 0, 1.1);
    const c = chicken(ch), seq = sequencer(c), head = ch.root.getObjectByName('DEF-head');
    const tabs = buttons(v, '[data-tab]'), img = v.block.querySelector('.v-ref img'), note = v.block.querySelector('.v-tabnote');
    let tab = 0, t = 0, sq = false;
    const show = (i) => {
      tab = i;
      ch.g.visible = i < 2;
      pl.g.visible = i === 2;
      tabs.forEach((b, j) => b.setAttribute('aria-pressed', i === j));
      img.src = tabs[i].dataset.img;
      img.alt = tabs[i].dataset.alt;
      note.textContent = tabs[i].dataset.note;
      if (i === 0) seq.run([['startle', 0.2], ['run', 2], ['recover', 0.3], ['idle', 1.2]], true);
      if (i === 1) { seq.run([['idle']]); t = 0; sq = false; }
      v.controls.autoRotate = !still && !v.dragged && i !== 1;   // the face close-up stays facing you
      if (i === 1) {
        ch.root.updateMatrixWorld(true);
        v.fit({ c: head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.02, 0.08)), r: 0.42 }, [0.15, 0.08, 1]);
      } else v.fit(i ? pl.g : ch.g, i ? [0.9, 0.3, 1] : [0.45, 0.25, 1]);
    };
    for (const [i, b] of tabs.entries()) b.addEventListener('click', () => show(i));
    show(0);
    v.tick = (dt) => {
      if (tab === 2) return;
      seq.update(dt);
      c.update(dt);
      if (tab === 1 && (t += dt) > 1) { t = 0; c.eyes(sq = !sq); }
    };
  },

  async seethrough(v) {
    const [oak, ch] = await Promise.all([place(v, 'oak', 3.6, false), place(v, 'chicken', 1)]);
    v.controls.autoRotate = false;   // starts with the tree hiding the chicken
    // put the chicken on the ground behind the crown as seen from a 40° quarter view, facing the camera
    const crown = box(oak.root.getObjectByName('Leaves')).getCenter(new THREE.Vector3());
    const look = new THREE.Vector3(0.35, 0, 1).normalize(), back = (crown.y - 0.5) / Math.tan(THREE.MathUtils.degToRad(40));
    ch.g.position.x += -look.x * back + crown.x;
    ch.g.position.z += -look.z * back + crown.z;
    ch.g.rotation.y = Math.atan2(look.x, look.z);
    ch.g.updateMatrixWorld(true);
    const mid = box(ch.g).getCenter(new THREE.Vector3()).setY(0.5);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(4.6, 48), new THREE.MeshToonMaterial({ color: 0x5f7a45, gradientMap: steps }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(mid.x / 2, 0, mid.z / 2);
    v.scene.add(ground);   // grass, so the window shows ground as in the game
    blob(v, mid.x, mid.z, 1);
    blob(v, 0, 0, 2.4);
    const c = chicken(ch), seq = sequencer(c);
    seq.run([['run']]);
    const u = burnable(oak.root);
    let open = 0;
    const [btn] = buttons(v, '[data-act]');
    btn.addEventListener('click', () => btn.setAttribute('aria-pressed', (open = 1 - open) === 1));
    const p = new THREE.Vector3(), px = new THREE.Vector2();
    v.tick = (dt) => {
      seq.update(dt);
      c.update(dt);
      u.uOpen.value += THREE.MathUtils.clamp(open - u.uOpen.value, -dt / 0.25, dt / 0.25);
      // window follows the chicken's projected position while orbiting
      v.renderer.getDrawingBufferSize(px);
      p.copy(mid).project(v.camera);
      const r = 0.8 / (v.camera.position.distanceTo(mid) * Math.tan(THREE.MathUtils.degToRad(v.camera.fov / 2))) * px.y / 2;
      u.uHole.value.set((p.x * 0.5 + 0.5) * px.x, (p.y * 0.5 + 0.5) * px.y, r);
    };
    const all = box(oak.g).union(box(ch.g));
    v.fit({ c: crown.clone().add(mid).multiplyScalar(0.5), r: all.getSize(new THREE.Vector3()).length() * 0.4 }, crown.clone().sub(mid).toArray());
  },
};

function start(el) {
  const fallback = () => el.querySelector('img')?.removeAttribute('hidden');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    fallback();
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  el.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  // flat cool fill + one warm key, so the toon ramp gives clean steps
  scene.add(new THREE.AmbientLight(0x9aa6c8, 1.15));
  const sun = new THREE.DirectionalLight(0xffe6c4, 2.3);
  sun.position.set(-2, 4, 3);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 200);
  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enablePan: false, enableZoom: false, enableDamping: true, autoRotate: !still, autoRotateSpeed: 1.5, minPolarAngle: 0.35, maxPolarAngle: 1.75 });
  const v = { el, block: el.closest('.v-block') || el.parentElement, renderer, scene, camera, controls, res: { value: new THREE.Vector2(1, 1) }, tick: null, aim: null };
  controls.addEventListener('start', () => { controls.autoRotate = false; v.dragged = true; });
  const frame = () => {
    if (!v.aim) return;
    const { c, r, dir } = v.aim;
    const half = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(1, camera.aspect));
    controls.target.copy(c);
    camera.position.copy(c).addScaledVector(dir, (r / Math.sin(half)) * 0.72);   // a little closer than the bounding sphere: the models are the point of the slide
    controls.update();
  };
  // aim at an object (or {c, r}) from a direction; resizing keeps the user's current angle
  v.fit = (o, dir) => {
    const s = o.isObject3D ? box(o).getBoundingSphere(new THREE.Sphere()) : { center: o.c, radius: o.r };
    v.aim = { c: s.center, r: s.radius, dir: new THREE.Vector3(...dir).normalize() };
    frame();
  };
  new ResizeObserver(() => {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    v.res.value.set(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (v.aim) { v.aim.dir.subVectors(camera.position, controls.target).normalize(); frame(); }
  }).observe(el);
  let last = 0;
  v.loop = (now) => {
    const dt = Math.min((now - (last || now)) / 1000, 0.1);
    last = now;
    v.tick?.(dt);
    controls.update(dt);
    renderer.render(scene, camera);
  };
  VIEWS[el.dataset.view](v).catch((e) => { console.warn('3D view failed', e); renderer.setAnimationLoop(null); renderer.domElement.remove(); fallback(); v.dead = true; });
  return v;
}

const views = new Map();
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting && !views.has(e.target)) views.set(e.target, start(e.target));
    const v = views.get(e.target);
    if (v && !v.dead) {
      v.renderer.setAnimationLoop(e.isIntersecting ? v.loop : null);
    }
  }
});
for (const el of document.querySelectorAll('.v3d[data-view]')) io.observe(el);
