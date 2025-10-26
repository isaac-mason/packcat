import {
    bitset,
    boolean,
    build,
    enumeration,
    float32,
    int64,
    list,
    literal,
    number,
    object,
    quat,
    quantized,
    record,
    string,
    uint8,
    uint16,
    uint32,
    uint64,
    union,
    uv2,
    uv3,
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

    // Convert BigInt to string for JSON serialization
    const jsonReplacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;
    const jsonReviver = (key, value) => {
        // This is a simplified reviver - in practice you'd need schema info to know which strings should be BigInt
        return value;
    };

    bench(`JSON.stringify ${name}`, () => JSON.stringify(val, jsonReplacer), N);
    const serJsonVal = JSON.stringify(val, jsonReplacer);
    bench(`JSON.parse ${name}`, () => JSON.parse(serJsonVal, jsonReviver), N);

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

// Quat benchmarks - compare different precision levels
const quatDefaultSchema = quat(); // 0.001 step default
const quatLowSchema = quat({ step: 0.002 }); // 0.002 step, lower precision
const quatHighSchema = quat({ step: 0.0002 }); // 0.0002 step, higher precision

/** @type {[number, number, number, number]} */
const quatVal = [0.2, 0.4, 0.6, Math.sqrt(1 - 0.2**2 - 0.4**2 - 0.6**2)];

benchSchema('quat({ step: 0.001 })', quatDefaultSchema, quatVal);
benchSchema('quat({ step: 0.002 })', quatLowSchema, quatVal);
benchSchema('quat({ step: 0.0002 })', quatHighSchema, quatVal);

// Compare quaternion vs storing 4 float32s
const quatAsFloatsSchema = list(float32(), 4);
benchSchema('quat_as_4xfloat32', quatAsFloatsSchema, quatVal);

// UV2 benchmarks
const unitVec2DefaultSchema = uv2(); // 0.0015 step default
const unitVec2LowSchema = uv2({ step: 0.006 }); // 0.006 step, lower precision
const unitVec2HighSchema = uv2({ step: 0.0001 }); // 0.0001 step, higher precision

/** @type {[number, number]} */
const unitVec2Val = [Math.cos(1.5), Math.sin(1.5)];

benchSchema('uv2({ step: 0.0015 })', unitVec2DefaultSchema, unitVec2Val);
benchSchema('uv2({ step: 0.006 })', unitVec2LowSchema, unitVec2Val);
benchSchema('uv2({ step: 0.0001 })', unitVec2HighSchema, unitVec2Val);

// Compare uv2 vs storing 2 float32s
const vec2AsFloatsSchema = list(float32(), 2);
benchSchema('uv2_as_2xfloat32', vec2AsFloatsSchema, unitVec2Val);

// UV3 benchmarks
const unitVec3DefaultSchema = uv3(); // 0.001 step default
const unitVec3LowSchema = uv3({ step: 0.002 }); // 0.002 step, lower precision
const unitVec3HighSchema = uv3({ step: 0.0002 }); // 0.0002 step, higher precision

/** @type {[number, number, number]} */
const unitVec3Val = [1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)];

benchSchema('uv3({ step: 0.001 })', unitVec3DefaultSchema, unitVec3Val);
benchSchema('uv3({ step: 0.002 })', unitVec3LowSchema, unitVec3Val);
benchSchema('uv3({ step: 0.0002 })', unitVec3HighSchema, unitVec3Val);

// Compare uv3 vs storing 3 float32s
const vec3AsFloatsSchema = list(float32(), 3);
benchSchema('uv3_as_3xfloat32', vec3AsFloatsSchema, unitVec3Val);

// Quantized benchmarks - useful for positions, angles, health, etc.
const angleSchema = quantized(0, 360, { step: 0.5 }); // rotation angle with 0.5° precision
const healthSchema = quantized(0, 100, { step: 1 }); // health percentage
const positionSchema = quantized(-1000, 1000, { step: 0.1 }); // position with 10cm precision

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
    position: list(quantized(-1000, 1000, { step: 0.1 }), 3), // [x, y, z]
    rotation: quat(), // orientation
    velocity: uv3(), // normalized direction
    speed: quantized(0, 100, { step: 0.1 }), // speed magnitude
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

// BigInt (int64/uint64) benchmarks
const int64Schema = int64();
const uint64Schema = uint64();

// Test various int64 values
benchSchema('int64_small', int64Schema, 123456789n);
benchSchema('int64_negative', int64Schema, -987654321098765n);
benchSchema('int64_max', int64Schema, 9223372036854775807n); // 2^63 - 1
benchSchema('int64_min', int64Schema, -9223372036854775808n); // -2^63

// Test various uint64 values
benchSchema('uint64_small', uint64Schema, 123456789n);
benchSchema('uint64_large', uint64Schema, 18446744073709551000n);
benchSchema('uint64_max', uint64Schema, 18446744073709551615n); // 2^64 - 1

// Real-world use case: user IDs, timestamps, large counters
const userProfileSchema = object({
    userId: uint64(), // Large user ID
    createdAt: uint64(), // Unix timestamp in milliseconds
    totalViews: uint64(), // Large counter
    balance: int64(), // Can be negative
});

/** @type {import('./dist').SchemaType<typeof userProfileSchema>} */
const userProfileVal = {
    userId: 1234567890123456789n,
    createdAt: 1729000000000n, // ~Oct 2024 in ms
    totalViews: 9876543210n,
    balance: -50000n,
};

benchSchema('user_profile_bigint', userProfileSchema, userProfileVal);

// Enumeration benchmarks - compare enum vs string for representing game state
const gameStateEnumSchema = object({
    state: enumeration(['menu', 'loading', 'playing', 'paused', 'gameover']),
    difficulty: enumeration(['easy', 'normal', 'hard', 'expert']),
    weapon: enumeration(['sword', 'bow', 'staff', 'axe', 'dagger']),
});

const gameStateStringSchema = object({
    state: string(),
    difficulty: string(),
    weapon: string(),
});

/** @type {import('./dist').SchemaType<typeof gameStateEnumSchema>} */
const gameStateEnumVal = {
    state: 'playing',
    difficulty: 'hard',
    weapon: 'bow',
};

const gameStateStringVal = {
    state: 'playing',
    difficulty: 'hard',
    weapon: 'bow',
};

benchSchema('game_state_enum', gameStateEnumSchema, gameStateEnumVal);
benchSchema('game_state_string', gameStateStringSchema, gameStateStringVal);
