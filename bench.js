import {
    bitset,
    boolean,
    build,
    float32,
    list,
    literal,
    number,
    object,
    quantized,
    quaternion,
    record,
    string,
    uint8,
    uint16,
    uint32,
    union,
    unitVec2,
    unitVec3,
} from './dist/index.js';

function now() {
    return performance.now();
}

function bench(name, fn, iterations) {
    // warm up
    for (let i = 0; i < 1000; i++) fn();
    const start = now();
    for (let i = 0; i < iterations; i++) fn();
    const end = now();
    const totalMs = end - start;
    console.log(`${name}: ${iterations} ops in ${totalMs.toFixed(2)}ms — ${(iterations / totalMs).toFixed(2)} ops/ms`);
}

function benchSchema(name, schema, val) {
    const { ser, des, source } = build(schema);

    const N = 100_000;

    bench(`ser ${name}`, () => ser(val), N);
    const serVal = ser(val);
    bench(`des ${name}`, () => des(serVal), N);

    console.log('serVal:', serVal);
    console.log('serVal byteLength:', serVal.byteLength);
    console.log('desVal:', des(serVal));

    bench(`JSON.stringify ${name}`, () => JSON.stringify(val), N);
    const serJsonVal = JSON.stringify(val);
    bench(`JSON.parse ${name}`, () => JSON.parse(serJsonVal), N);

    console.log('serJsonVal byteLength:', new TextEncoder().encode(serJsonVal).byteLength);

    console.log('source', source);

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
    buttons: bitset(['jump', 'sprint', 'crouch']),
    cmd: list(
        union('type', [
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

// A schema similar to the protobuf "Message" used in the legacy benchmark
const pbPlayerSchema = object({
    health: number(),
    jumping: boolean(),
    position: list(number()), // repeated int32 in the proto
    attributes: object({
        str: number(),
        agi: number(),
        int: number(),
    }),
});

/** @type {import('./dist').SchemaType<typeof pbPlayerSchema>} */
const pbPlayerVal = {
    health: 100,
    jumping: true,
    position: [10, 20, 30],
    attributes: { str: 12, agi: 8, int: 15 },
};

benchSchema('pb_player', pbPlayerSchema, pbPlayerVal);

// Quaternion benchmarks - compare different precision levels
const quatDefaultSchema = quaternion(); // 10 bits default
const quatLowSchema = quaternion(9); // 9 bits, smallest
const quatHighSchema = quaternion(12); // 12 bits, higher precision

/** @type {[number, number, number, number]} */
const quatVal = [0.2, 0.4, 0.6, Math.sqrt(1 - 0.2**2 - 0.4**2 - 0.6**2)];

benchSchema('quaternion(10)', quatDefaultSchema, quatVal);
benchSchema('quaternion(9)', quatLowSchema, quatVal);
benchSchema('quaternion(12)', quatHighSchema, quatVal);

// Compare quaternion vs storing 4 float32s
const quatAsFloatsSchema = list(float32(), 4);
benchSchema('quat_as_4xfloat32', quatAsFloatsSchema, quatVal);

// UnitVec2 benchmarks
const unitVec2DefaultSchema = unitVec2(); // 12 bits default
const unitVec2LowSchema = unitVec2(10); // 10 bits
const unitVec2HighSchema = unitVec2(16); // 16 bits

/** @type {[number, number]} */
const unitVec2Val = [Math.cos(1.5), Math.sin(1.5)];

benchSchema('unitVec2(12)', unitVec2DefaultSchema, unitVec2Val);
benchSchema('unitVec2(10)', unitVec2LowSchema, unitVec2Val);
benchSchema('unitVec2(16)', unitVec2HighSchema, unitVec2Val);

// Compare unitVec2 vs storing 2 float32s
const vec2AsFloatsSchema = list(float32(), 2);
benchSchema('unitVec2_as_2xfloat32', vec2AsFloatsSchema, unitVec2Val);

// UnitVec3 benchmarks
const unitVec3DefaultSchema = unitVec3(); // 10 bits default
const unitVec3LowSchema = unitVec3(9); // 9 bits
const unitVec3HighSchema = unitVec3(12); // 12 bits

/** @type {[number, number, number]} */
const unitVec3Val = [1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)];

benchSchema('unitVec3(10)', unitVec3DefaultSchema, unitVec3Val);
benchSchema('unitVec3(9)', unitVec3LowSchema, unitVec3Val);
benchSchema('unitVec3(12)', unitVec3HighSchema, unitVec3Val);

// Compare unitVec3 vs storing 3 float32s
const vec3AsFloatsSchema = list(float32(), 3);
benchSchema('unitVec3_as_3xfloat32', vec3AsFloatsSchema, unitVec3Val);

// Quantized benchmarks - useful for positions, angles, health, etc.
const angleSchema = quantized(0, 360, 0.5); // rotation angle with 0.5° precision
const healthSchema = quantized(0, 100, 1); // health percentage
const positionSchema = quantized(-1000, 1000, 0.1); // position with 10cm precision

benchSchema('quantized_angle', angleSchema, 123.4);
benchSchema('quantized_health', healthSchema, 75);
benchSchema('quantized_position', positionSchema, 456.789);

// Compare quantized vs float32
benchSchema('angle_as_float32', float32(), 123.4);
benchSchema('health_as_float32', float32(), 75);
benchSchema('position_as_float32', float32(), 456.789);

// Real-world game entity example with quaternions and unit vectors
const entitySchema = object({
    id: uint32(),
    position: list(quantized(-1000, 1000, 0.1), 3), // [x, y, z]
    rotation: quaternion(), // orientation
    velocity: unitVec3(), // normalized direction
    speed: quantized(0, 100, 0.1), // speed magnitude
});

/** @type {import('./dist').SchemaType<typeof entitySchema>} */
const entityVal = {
    id: 42,
    position: [100.5, 50.3, -25.7],
    rotation: [0, 0.707, 0, 0.707], // 90° rotation around Y
    velocity: [0.577, 0.577, 0.577], // normalized direction
    speed: 15.5,
};

benchSchema('game_entity', entitySchema, entityVal);

// Compare vs storing everything as float32
const entityAsFloatsSchema = object({
    id: uint32(),
    position: list(float32(), 3),
    rotation: list(float32(), 4),
    velocity: list(float32(), 3),
    speed: float32(),
});

benchSchema('game_entity_as_floats', entityAsFloatsSchema, entityVal);
