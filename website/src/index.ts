import { build, list, object, quantized, quat, uint16, uint32 } from 'packcat';
import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 * packcat schema
 *
 * A snapshot of the whole scene: a frame counter plus one record per
 * entity (id, position, rotation). Described once, then `build` gives
 * us a `pack` that turns a matching object into a compact Uint8Array.
 * ------------------------------------------------------------------ */

// the scene fits comfortably inside a ±16 unit box; quantizing each
// position component to a 0.01 step packs it into 2 bytes instead of 4
const Position = list(quantized(-16, 16, { step: 0.01 }), 3); // 3 × 2 = 6 bytes

const Entity = object({
    id: uint16(),
    position: Position,
    rotation: quat(), // "smallest three" compressed quaternion — 7 bytes
});

const WorldSchema = object({
    frame: uint32(),
    entities: list(Entity),
});

const { pack, unpack } = build(WorldSchema);

type WorldState = {
    frame: number;
    entities: {
        id: number;
        position: [number, number, number];
        rotation: [number, number, number, number];
    }[];
};

/* ------------------------------------------------------------------ *
 * three.js scene — a cloud of drifting, spinning cubes ("entities")
 * ------------------------------------------------------------------ */

const container = document.getElementById('root')!;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);
scene.fog = new THREE.Fog(0x222222, 14, 34);

const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(0, 4, 18);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setSize(container.clientWidth, container.clientHeight);
// cap pixel ratio — on hidpi displays the uncapped ratio renders many more fragments
const MAX_PIXEL_RATIO = 1.5;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
container.appendChild(renderer.domElement);

const onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
};
window.addEventListener('resize', onResize);

scene.add(new THREE.AmbientLight(0xffffff, 1.2));

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.6);
directionalLight.position.set(6, 12, 8);
scene.add(directionalLight);

/* entities */

const ENTITY_COUNT = 64;
const CUBE_SIZE = 0.7;

const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const material = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.55, metalness: 0.1 });
const mesh = new THREE.InstancedMesh(geometry, material, ENTITY_COUNT);
scene.add(mesh);

// per-entity animation parameters
type Mover = {
    radius: number;
    height: number;
    orbitSpeed: number;
    orbitPhase: number;
    bobSpeed: number;
    bobPhase: number;
    spinAxis: THREE.Vector3;
    spinSpeed: number;
};

const entities: Mover[] = [];
for (let i = 0; i < ENTITY_COUNT; i++) {
    entities.push({
        radius: 3 + (i % 8) * 0.8,
        height: ((i * 2654435761) % 1000) / 1000 * 8 - 4,
        orbitSpeed: 0.15 + ((i * 40503) % 100) / 100 * 0.35,
        orbitPhase: (i / ENTITY_COUNT) * Math.PI * 2,
        bobSpeed: 0.5 + ((i * 22695) % 100) / 100,
        bobPhase: ((i * 12345) % 100) / 100 * Math.PI * 2,
        spinAxis: new THREE.Vector3(
            Math.sin(i * 1.1),
            Math.cos(i * 2.3),
            Math.sin(i * 0.7),
        ).normalize(),
        spinSpeed: 0.4 + ((i * 99991) % 100) / 100 * 1.2,
    });
}

// pre-allocated world state, reused every frame (no per-frame allocation)
const world: WorldState = {
    frame: 0,
    entities: entities.map((_, i) => ({
        id: i,
        position: [0, 0, 0],
        rotation: [0, 0, 0, 1],
    })),
};

const _matrix = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);

/* ------------------------------------------------------------------ *
 * live stats HUD
 * ------------------------------------------------------------------ */

const jsonBytesEl = document.getElementById('json-bytes')!;
const packBytesEl = document.getElementById('pack-bytes')!;
const jsonFillEl = document.getElementById('json-fill')!;
const packFillEl = document.getElementById('pack-fill')!;
const savingsEl = document.getElementById('savings')!;
const serJsonEl = document.getElementById('ser-json')!;
const serPackEl = document.getElementById('ser-pack')!;
const serXEl = document.getElementById('ser-x')!;
const deserJsonEl = document.getElementById('deser-json')!;
const deserPackEl = document.getElementById('deser-pack')!;
const deserXEl = document.getElementById('deser-x')!;

const encoder = new TextEncoder();

// number of serializations to average per sample — a single call is far too
// fast to time precisely, so we run a small batch and divide
const BENCH_ITERS = 200;

function formatBytes(n: number): string {
    return `${n.toLocaleString('en-US')} B`;
}

function formatMicros(ms: number): string {
    return `${(ms * 1000).toFixed(1)} µs`;
}

// `ratio` is (json time / packcat time): >1 means packcat is faster
function formatSpeedup(ratio: number): string {
    // a non-finite ratio means we don't have a usable sample yet (e.g. a
    // coarse-resolution timer measured 0µs for both sides → 0/0 = NaN)
    if (!Number.isFinite(ratio) || ratio <= 0) return '—';
    const [n, word] = ratio >= 1 ? [ratio, 'faster'] : [1 / ratio, 'slower'];
    return `${n.toFixed(1)}× <span class="demo-x-word">${word}</span>`;
}

// measure average ms per call of `fn` over BENCH_ITERS runs
function benchmark(fn: () => unknown): number {
    fn(); // warm up
    const start = performance.now();
    for (let i = 0; i < BENCH_ITERS; i++) fn();
    return (performance.now() - start) / BENCH_ITERS;
}

// smooth the displayed numbers a touch so they don't flicker
let jsonSmooth = 0;
let packSmooth = 0;
let serJsonSmooth = 0;
let serPackSmooth = 0;
let deserJsonSmooth = 0;
let deserPackSmooth = 0;
let serXSmooth = 0;
let deserXSmooth = 0;

const smooth = (prev: number, next: number, a: number) => {
    // ignore non-finite samples so a single bad reading (e.g. 0/0 from a
    // coarse timer) can't poison the accumulator permanently
    if (!Number.isFinite(next)) return prev;
    return prev === 0 ? next : prev + (next - prev) * a;
};

function updateStats() {
    const jsonStr = JSON.stringify(world);
    const json = encoder.encode(jsonStr).length;
    const packed = pack(world); // fresh buffer each call, safe to hold across benchmarks
    const packedBytes = packed.byteLength;

    // serialize: stringify vs pack. deserialize: parse vs unpack
    const stringifyTime = benchmark(() => JSON.stringify(world));
    const packTime = benchmark(() => pack(world));
    const parseTime = benchmark(() => JSON.parse(jsonStr));
    const unpackTime = benchmark(() => unpack(packed));

    jsonSmooth = smooth(jsonSmooth, json, 0.25);
    packSmooth = smooth(packSmooth, packedBytes, 0.25);
    serJsonSmooth = smooth(serJsonSmooth, stringifyTime, 0.15);
    serPackSmooth = smooth(serPackSmooth, packTime, 0.15);
    deserJsonSmooth = smooth(deserJsonSmooth, parseTime, 0.15);
    deserPackSmooth = smooth(deserPackSmooth, unpackTime, 0.15);
    serXSmooth = smooth(serXSmooth, stringifyTime / packTime, 0.15);
    deserXSmooth = smooth(deserXSmooth, parseTime / unpackTime, 0.15);

    jsonBytesEl.textContent = formatBytes(Math.round(jsonSmooth));
    packBytesEl.textContent = formatBytes(Math.round(packSmooth));

    jsonFillEl.style.width = '100%';
    packFillEl.style.width = `${Math.max(2, (packSmooth / jsonSmooth) * 100)}%`;

    const savings = Math.round((1 - packSmooth / jsonSmooth) * 100);
    savingsEl.textContent = `${savings}%`;

    serJsonEl.textContent = formatMicros(serJsonSmooth);
    serPackEl.textContent = formatMicros(serPackSmooth);
    deserJsonEl.textContent = formatMicros(deserJsonSmooth);
    deserPackEl.textContent = formatMicros(deserPackSmooth);
    serXEl.innerHTML = formatSpeedup(serXSmooth);
    deserXEl.innerHTML = formatSpeedup(deserXSmooth);
}

/* ------------------------------------------------------------------ *
 * animation loop
 * ------------------------------------------------------------------ */

const clock = new THREE.Clock();
let elapsed = 0;
let statsCountdown = 0;

function update() {
    const dt = clock.getDelta();
    elapsed += dt;
    world.frame = (world.frame + 1) >>> 0;

    for (let i = 0; i < ENTITY_COUNT; i++) {
        const e = entities[i];

        const angle = e.orbitPhase + elapsed * e.orbitSpeed;
        const x = Math.cos(angle) * e.radius;
        const z = Math.sin(angle) * e.radius;
        const y = e.height + Math.sin(elapsed * e.bobSpeed + e.bobPhase) * 0.8;

        _pos.set(x, y, z);
        _quat.setFromAxisAngle(e.spinAxis, elapsed * e.spinSpeed);
        _matrix.compose(_pos, _quat, _scale);
        mesh.setMatrixAt(i, _matrix);

        // mirror the transform into the world-state snapshot
        const ent = world.entities[i];
        ent.position[0] = x;
        ent.position[1] = y;
        ent.position[2] = z;
        ent.rotation[0] = _quat.x;
        ent.rotation[1] = _quat.y;
        ent.rotation[2] = _quat.z;
        ent.rotation[3] = _quat.w;
    }
    mesh.instanceMatrix.needsUpdate = true;

    // refresh the HUD every 0.2s — slow enough to actually read the numbers
    statsCountdown -= dt;
    if (statsCountdown <= 0) {
        statsCountdown = 0.2;
        updateStats();
    }

    renderer.render(scene, camera);
    requestAnimationFrame(update);
}

document.querySelector('#loading')!.remove();
update();
