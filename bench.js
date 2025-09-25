import { boolean, list, number, object, record, serDes, string, uint8, uint16, uint32, float32 } from './dist/index.js';

function now() {
    return performance.now();
}

function bench(name, fn, iterations = 100_000) {
    // warm up
    for (let i = 0; i < 1000; i++) fn();
    const start = now();
    for (let i = 0; i < iterations; i++) fn();
    const end = now();
    const totalMs = end - start;
    console.log(`${name}: ${iterations} ops in ${totalMs.toFixed(2)}ms — ${(iterations / totalMs).toFixed(2)} ops/ms`);
}

const playerSchema = object({
    id: uint32(),
    name: string(),
    score: number(),
    isActive: boolean(),
    inventory: record(object({ item: uint8(), quantity: uint16() })),
    friends: list(uint32()),
});

/** @type {import('./dist').SchemaType<typeof playerSchema>} */
const playerVal = {
    id: 1,
    name: 'PlayerOne',
    score: 1000,
    isActive: true,
    inventory: {
        potion: { item: 1, quantity: 10 },
        sword: { item: 2, quantity: 1 },
    },
    friends: [2, 3, 4],
};

const playerSerDes = serDes(playerSchema);

// console.log(playerSerDes.source)

bench('ser player', () => playerSerDes.ser(playerVal), 10000);
const serPlayer = playerSerDes.ser(playerVal);
bench('des player', () => playerSerDes.des(serPlayer), 10000);

console.log('serPlayer byteLength:', serPlayer.byteLength);

bench('JSON.stringify player', () => JSON.stringify(playerVal), 10000);
const serJsonPlayer = JSON.stringify(playerVal);
bench('JSON.parse player', () => JSON.parse(serJsonPlayer), 10000);

console.log('serJsonPlayer byteLength:', new TextEncoder().encode(serJsonPlayer).byteLength);

console.log('---');

const vec3Schema = list(float32(), { length: 3 });

const positionsSchema = list(
    object({
        id: uint16(),
        pos: vec3Schema,
    }),
);

/** @type {import('./dist').SchemaType<typeof positionsSchema>} */
const positionsVal = [
    { id: 4, pos: [1, 2, 4] },
    { id: 0, pos: [12, 24, 48] },
    { id: 1, pos: [120, 240, 480] },
    { id: 2, pos: [1200, 2400, 4800] },
    { id: 3, pos: [1.2, 2.4, 4.8] },
];

const positionsSerDes = serDes(positionsSchema);

bench('ser positions', () => positionsSerDes.ser(positionsVal), 10000);
const serPositions = positionsSerDes.ser(positionsVal);
bench('des positions', () => positionsSerDes.des(serPositions), 10000);

console.log('serPositions byteLength:', serPositions.byteLength);

// JSON comparison
bench('JSON.stringify positions', () => JSON.stringify(positionsVal), 10000);
const serJsonPositions = JSON.stringify(positionsVal);
bench('JSON.parse positions', () => JSON.parse(serJsonPositions), 10000);

console.log('serJsonPositions byteLength:', new TextEncoder().encode(serJsonPlayer).byteLength);

console.log('---');

console.log('done');
