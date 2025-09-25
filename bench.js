import { boolean, list, number, object, record, serDes, string, uint8, uint16, uint32 } from './dist/index.js';

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

// Schemas
const playerSchema = object({
    id: uint32(),
    name: string(),
    score: number(),
    isActive: boolean(),
    inventory: record(object({ item: uint8(), quantity: uint16() })),
    friends: list(uint32()),
});

// Data
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

// SerDes factories
const playerSerDes = serDes(playerSchema);

console.log(playerSerDes.source)

console.log('Running benches...');

console.log('---');

bench('ser player', () => playerSerDes.ser(playerVal), 10000);
const serPlayer = playerSerDes.ser(playerVal);
bench('des player', () => playerSerDes.des(serPlayer), 10000);

console.log('serPlayer byteLength:', serPlayer.byteLength);

console.log('---');

// JSON comparison
bench('JSON.stringify player', () => JSON.stringify(playerVal), 10000);
const serJsonPlayer = JSON.stringify(playerVal);
bench('JSON.parse player', () => JSON.parse(serJsonPlayer), 10000);

console.log('serJsonPlayer byteLength:', new TextEncoder().encode(serJsonPlayer).byteLength);

console.log('---');

console.log('done');
