import {
    boolean,
    bools,
    float32,
    list,
    literal,
    number,
    object,
    record,
    serDes,
    string,
    uint8,
    uint16,
    uint32,
    union,
} from './dist/index.js';

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

function benchSchema(name, schema, val) {
    const { ser, des } = serDes(schema);

    bench(`ser ${name}`, () => ser(val), 10000);
    const serVal = ser(val);
    bench(`des ${name}`, () => des(serVal), 10000);

    console.log('serVal:', serVal);
    console.log('serVal byteLength:', serVal.byteLength);
    console.log('desVal:', des(serVal));

    bench(`JSON.stringify ${name}`, () => JSON.stringify(val), 10000);
    const serJsonVal = JSON.stringify(val);
    bench(`JSON.parse ${name}`, () => JSON.parse(serJsonVal), 10000);

    console.log('serJsonVal byteLength:', new TextEncoder().encode(serJsonVal).byteLength);
    console.log('---');
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
        0: { item: 1, quantity: 10 },
        1: { item: 2, quantity: 1 },
    },
    friends: [2, 3, 4],
};

benchSchema('player', playerSchema, playerVal);

const vec3Schema = list(float32(), 3);

const positionsSchema = list(
    object({
        id: uint16(),
        pos: vec3Schema,
    }),
);

/** @type {import('./dist').SchemaType<typeof positionsSchema>} */
const positionsVal = [
    { id: 0, pos: [12, 24, 48] },
    { id: 1, pos: [120, 240, 480] },
    { id: 2, pos: [1200, 2400, 4800] },
    { id: 3, pos: [1.2, 2.4, 4.8] },
    { id: 4, pos: [1, 2, 4] },
];

benchSchema('positions', positionsSchema, positionsVal);

const playerInputSchema = object({
    frame: uint32(),
    nipple: list(float32(), 2),
    // will be serialised as a bitset
    buttons: bools(['jump', 'sprint', 'crouch']),
    cmd: list(
        union('type', [
            // literals are not included in the serialised data, only used for discrimination
            object({ type: literal('interact') }),
            object({ type: literal('use'), primary: boolean(), secondary: boolean() }),
        ]),
    ),
});

const playerInput = {
    frame: 1,
    nipple: [0, 1],
    buttons: { jump: true, sprint: false, crouch: true },
    cmd: [{ type: 'interact' }, { type: 'use', primary: true, secondary: false }],
};

benchSchema('playerInput', playerInputSchema, playerInput);
