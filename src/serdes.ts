import type { Schema, SchemaType } from './schema';

export type PackIntoResult = { ok: boolean; size: number };

export function build<S extends Schema>(
    schema: S,
): {
    pack: (value: SchemaType<S>) => Uint8Array;
    packInto: (value: SchemaType<S>, u8: Uint8Array, offset: number) => PackIntoResult;
    unpack: (u8: Uint8Array) => SchemaType<S>;
    validate: (value: SchemaType<S>) => boolean;
    source: { pack: string; unpack: string; validate: string; packInto: string };
} {
    const { pack: packSource, packInto: packIntoSource } = buildPack(schema);

    const pack = new Function(
        'textEncoder',
        'f16',
        'f16_u8',
        'f32',
        'f32_u8',
        'f64',
        'f64_u8',
        'i64',
        'i64_u8',
        'u64',
        'u64_u8',
        'utf8Length',
        'value',
        packSource,
    ).bind(null, textEncoder, f16, f16_u8, f32, f32_u8, f64, f64_u8, i64, i64_u8, u64, u64_u8, utf8Length) as (
        value: SchemaType<S>,
    ) => Uint8Array;

    const packInto = new Function(
        'textEncoder',
        'f16',
        'f16_u8',
        'f32',
        'f32_u8',
        'f64',
        'f64_u8',
        'i64',
        'i64_u8',
        'u64',
        'u64_u8',
        'utf8Length',
        'value',
        'u8',
        'offset',
        packIntoSource,
    ).bind(null, textEncoder, f16, f16_u8, f32, f32_u8, f64, f64_u8, i64, i64_u8, u64, u64_u8, utf8Length) as (
        value: SchemaType<S>,
        u8: Uint8Array,
        offset: number,
    ) => PackIntoResult;

    const unpackSource = buildUnpack(schema);

    const unpack = new Function(
        'textDecoder',
        'f16',
        'f16_u8',
        'f32',
        'f32_u8',
        'f64',
        'f64_u8',
        'i64',
        'i64_u8',
        'u64',
        'u64_u8',
        'u8',
        unpackSource,
    ).bind(null, textDecoder, f16, f16_u8, f32, f32_u8, f64, f64_u8, i64, i64_u8, u64, u64_u8) as (
        u8: Uint8Array,
    ) => SchemaType<S>;

    const validateSource = buildValidate(schema);

    const validate = new Function('value', validateSource) as (value: SchemaType<S>) => boolean;

    return {
        pack,
        packInto,
        unpack,
        validate,
        source: { pack: packSource, unpack: unpackSource, validate: validateSource, packInto: packIntoSource },
    };
}

function buildPack(schema: Schema): { pack: string; packInto: string } {
    const ctx = createCtx();

    let preamble = '';
    preamble += 'let len = 0;';
    preamble += 'let vint = 0;';
    preamble += 'let vuint = 0;';
    preamble += 'let keys;';
    preamble += 'let val = 0;';

    const calc = size(ctx, schema, 'value');
    preamble += `let size = ${calc.fixed};`;
    preamble += calc.code;

    const body = pack(ctx, schema, 'value');

    const packSource =
        preamble +
        'const arrayBuffer = new ArrayBuffer(size);' +
        'let o = 0;' +
        'const u8 = new Uint8Array(arrayBuffer); ' +
        body +
        'return u8;';

    const packIntoSource =
        preamble +
        'let o = offset;' +
        'if (o + size > u8.length) return { ok: false, size };' +
        body +
        'return { ok: true, size };';

    return {
        pack: packSource,
        packInto: packIntoSource,
    };
}

function buildUnpack(schema: Schema): string {
    const ctx = createCtx();

    let code = '';
    code += 'let o = 0;';
    code += 'let len = 0;';
    code += 'let val = 0;';
    code += 'let shift = 0;';
    code += 'let byte = 0;';

    code += 'let value;';
    code += unpack(ctx, schema, 'value');
    code += 'return value;';

    return code;
}

function buildValidate(schema: Schema): string {
    const ctx = createCtx();

    let code = '';
    code += validate(ctx, schema, 'value');
    code += 'return true;';

    return code;
}

const f16_buffer = new ArrayBuffer(2);
const f16 = new Float16Array(f16_buffer);
const f16_u8 = new Uint8Array(f16_buffer);

const f32_buffer = new ArrayBuffer(4);
const f32 = new Float32Array(f32_buffer);
const f32_u8 = new Uint8Array(f32_buffer);

const f64_buffer = new ArrayBuffer(8);
const f64 = new Float64Array(f64_buffer);
const f64_u8 = new Uint8Array(f64_buffer);

const i64_buffer = new ArrayBuffer(8);
const i64 = new BigInt64Array(i64_buffer);
const i64_u8 = new Uint8Array(i64_buffer);

const u64_buffer = new ArrayBuffer(8);
const u64 = new BigUint64Array(u64_buffer);
const u64_u8 = new Uint8Array(u64_buffer);

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function utf8Length(s: string) {
    let l = 0;
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c < 0x80) {
            l += 1;
        } else if (c < 0x800) {
            l += 2;
        } else if (c >= 0xd800 && c <= 0xdbff) {
            // high surrogate
            const c2 = s.charCodeAt(i + 1);
            if (c2 >= 0xdc00 && c2 <= 0xdfff) {
                l += 4;
                i++; // valid surrogate pair
            } else {
                l += 3; // unpaired surrogate
            }
        } else {
            l += 3;
        }
    }
    return l;
}

type Context = {
    counter: number;
};

function createCtx(): Context {
    return { counter: 1 };
}

function variable(ctx: Context, str: string): string {
    return str + ctx.counter++;
}

function partition<T>(items: T[], pred: (item: T) => boolean): [T[], T[]] {
    const yes: T[] = [];
    const no: T[] = [];
    for (const item of items) {
        if (pred(item)) yes.push(item);
        else no.push(item);
    }
    return [yes, no];
}

/** static bitpack: compile-time known boolean refs */
function emitBitPack(ctx: Context, boolRefs: Array<{ varRef: string }>): string {
    if (boolRefs.length === 0) return '';
    const bytes = Math.ceil(boolRefs.length / 8);
    const byteVar = variable(ctx, 'byte');
    let code = `let ${byteVar};`;
    for (let b = 0; b < bytes; b++) {
        code += `${byteVar} = 0;`;
        for (let bit = 0; bit < 8; bit++) {
            const idx = b * 8 + bit;
            if (idx >= boolRefs.length) break;
            code += `if (${boolRefs[idx].varRef}) ${byteVar} |= ${1 << bit};`;
        }
        code += `u8[o++] = ${byteVar};`;
    }
    return code;
}

/** static bitunpack: compile-time known boolean targets */
function emitBitUnpack(ctx: Context, boolTargets: Array<{ target: string }>): string {
    if (boolTargets.length === 0) return '';
    const bytes = Math.ceil(boolTargets.length / 8);
    let code = '';
    for (let b = 0; b < bytes; b++) {
        const byteIdx = variable(ctx, 'bval');
        code += `const ${byteIdx} = u8[o++];`;
        for (let bit = 0; bit < 8; bit++) {
            const idx = b * 8 + bit;
            if (idx >= boolTargets.length) break;
            code += `${boolTargets[idx].target} = (${byteIdx} & ${1 << bit}) !== 0;`;
        }
    }
    return code;
}

type SizeCalc = { code: string; fixed: number };

type SchemaHandler<S> = {
    size: (ctx: Context, s: S, v: string) => SizeCalc;
    pack: (ctx: Context, s: S, v: string) => string;
    unpack: (ctx: Context, s: S, target: string) => string;
    validate: (ctx: Context, s: S, v: string) => string;
};

type Handlers = {
    [K in Schema['type']]: SchemaHandler<Extract<Schema, { type: K }>>;
};

function size(ctx: Context, s: Schema, v: string): SizeCalc {
    return (handlers[s.type] as SchemaHandler<Schema>).size(ctx, s, v);
}

function pack(ctx: Context, s: Schema, v: string): string {
    return (handlers[s.type] as SchemaHandler<Schema>).pack(ctx, s, v);
}

function unpack(ctx: Context, s: Schema, target: string): string {
    return (handlers[s.type] as SchemaHandler<Schema>).unpack(ctx, s, target);
}

function validate(ctx: Context, s: Schema, v: string): string {
    return (handlers[s.type] as SchemaHandler<Schema>).validate(ctx, s, v);
}

/** creates a handler for a fixed-size numeric type */
function fixedHandler<S>(
    bytes: number,
    packFn: (v: string) => string,
    unpackFn: (t: string) => string,
    validateCode: (v: string) => string,
): SchemaHandler<S> {
    return {
        size: () => ({ code: '', fixed: bytes }),
        pack: (_ctx, _s, v) => packFn(v),
        unpack: (_ctx, _s, t) => unpackFn(t),
        validate: (_ctx, _s, v) => validateCode(v),
    };
}

const handlers: Handlers = {
    boolean: fixedHandler(1, writeBool, readBool, (v) => `if (typeof ${v} !== 'boolean') return false;`),
    int8: fixedHandler(
        1,
        writeI8,
        readI8,
        (v) => `if (typeof ${v} !== 'number' || !Number.isInteger(${v}) || ${v} < -128 || ${v} > 127) return false;`,
    ),
    uint8: fixedHandler(
        1,
        writeU8,
        readU8,
        (v) => `if (typeof ${v} !== 'number' || !Number.isInteger(${v}) || ${v} < 0 || ${v} > 255) return false;`,
    ),
    int16: fixedHandler(
        2,
        writeI16,
        readI16,
        (v) => `if (typeof ${v} !== 'number' || !Number.isInteger(${v}) || ${v} < -32768 || ${v} > 32767) return false;`,
    ),
    uint16: fixedHandler(
        2,
        writeU16,
        readU16,
        (v) => `if (typeof ${v} !== 'number' || !Number.isInteger(${v}) || ${v} < 0 || ${v} > 65535) return false;`,
    ),
    int32: fixedHandler(
        4,
        writeI32,
        readI32,
        (v) =>
            `if (typeof ${v} !== 'number' || !Number.isInteger(${v}) || ${v} < -2147483648 || ${v} > 2147483647) return false;`,
    ),
    uint32: fixedHandler(
        4,
        writeU32,
        readU32,
        (v) => `if (typeof ${v} !== 'number' || !Number.isInteger(${v}) || ${v} < 0 || ${v} > 4294967295) return false;`,
    ),
    int64: fixedHandler(
        8,
        writeI64,
        readI64,
        (v) => `if (typeof ${v} !== 'bigint' || ${v} < -9223372036854775808n || ${v} > 9223372036854775807n) return false;`,
    ),
    uint64: fixedHandler(
        8,
        writeU64,
        readU64,
        (v) => `if (typeof ${v} !== 'bigint' || ${v} < 0n || ${v} > 18446744073709551615n) return false;`,
    ),
    float16: fixedHandler(2, writeF16, readF16, (v) => `if (typeof ${v} !== 'number') return false;`),
    float32: fixedHandler(4, writeF32, readF32, (v) => `if (typeof ${v} !== 'number') return false;`),
    float64: fixedHandler(8, writeF64, readF64, (v) => `if (typeof ${v} !== 'number') return false;`),

    // quantize value to discrete steps, round up bits to bytes
    quantized: {
        size: (_ctx, s) => {
            const steps = Math.ceil((s.max - s.min) / s.step);
            const bits = Math.ceil(Math.log2(steps));
            const bytes = Math.ceil(bits / 8);
            return { code: '', fixed: bytes };
        },
        pack: (ctx, s, v) => {
            const steps = Math.ceil((s.max - s.min) / s.step);
            const bits = Math.ceil(Math.log2(steps));
            const bytes = Math.ceil(bits / 8);
            const maxVal = (1 << bits) - 1;
            const clampedVar = variable(ctx, 'clamped');
            const quantVar = variable(ctx, 'quant');
            // clamp to [min, max], then quantize to step index
            let code = `const ${clampedVar} = Math.max(${s.min}, Math.min(${s.max}, ${v}));`;
            code += `const ${quantVar} = Math.max(0, Math.min(${maxVal}, Math.round((${clampedVar} - ${s.min}) / ${s.step})));`;
            if (bytes === 1) code += writeU8(quantVar);
            else if (bytes === 2) code += writeU16(quantVar);
            else if (bytes <= 4) code += writeU32(quantVar);
            else code += writeVaruint(quantVar);
            return code;
        },
        unpack: (ctx, s, target) => {
            const steps = Math.ceil((s.max - s.min) / s.step);
            const bits = Math.ceil(Math.log2(steps));
            const bytes = Math.ceil(bits / 8);
            const quantVar = variable(ctx, 'quant');
            let code = '';
            if (bytes === 1) code += readU8(quantVar);
            else if (bytes === 2) code += readU16(quantVar);
            else if (bytes <= 4) code += readU32(quantVar);
            else code += readVaruint(quantVar);
            // dequantize: convert step index back to value
            code += `${target} = ${s.min} + ${quantVar} * ${s.step};`;
            return code;
        },
        validate: (_ctx, s, v) => `if (typeof ${v} !== 'number' || ${v} < ${s.min} || ${v} > ${s.max}) return false;`,
    },

    // smallest-three quaternion encoding: range is -1/sqrt(2) to 1/sqrt(2)
    quat: {
        size: (_ctx, s) => {
            const steps = Math.ceil(Math.SQRT2 / s.step);
            const bits = Math.ceil(Math.log2(steps));
            // 1 byte metadata + 3 components
            let bytes = 1;
            if (bits <= 8) bytes += 3;
            else if (bits <= 16) bytes += 6;
            else bytes += 12;
            return { code: '', fixed: bytes };
        },
        pack: (ctx, s, v) => {
            const steps = Math.ceil(Math.SQRT2 / s.step);
            const bits = Math.ceil(Math.log2(steps));
            const maxVal = (1 << bits) - 1;
            const scale = maxVal / Math.sqrt(2); // max component value is 1/sqrt(2)
            const qx = `${v}[0]`;
            const qy = `${v}[1]`;
            const qz = `${v}[2]`;
            const qw = `${v}[3]`;
            const ax = variable(ctx, 'ax');
            const ay = variable(ctx, 'ay');
            const az = variable(ctx, 'az');
            const aw = variable(ctx, 'aw');
            const maxIdx = variable(ctx, 'maxIdx');
            const c0 = variable(ctx, 'c0');
            const c1 = variable(ctx, 'c1');
            const c2 = variable(ctx, 'c2');
            const sign = variable(ctx, 'sign');
            let code = '';
            // find largest component by absolute value
            code += `const ${ax} = Math.abs(${qx}), ${ay} = Math.abs(${qy}), ${az} = Math.abs(${qz}), ${aw} = Math.abs(${qw});`;
            code += `let ${maxIdx} = 0;`;
            code += `if (${ay} > ${ax}) ${maxIdx} = 1;`;
            code += `if (${az} > (${maxIdx} === 0 ? ${ax} : ${ay})) ${maxIdx} = 2;`;
            code += `if (${aw} > (${maxIdx} === 0 ? ${ax} : ${maxIdx} === 1 ? ${ay} : ${az})) ${maxIdx} = 3;`;
            // get three smallest components and sign of largest
            code += `let ${c0}, ${c1}, ${c2}, ${sign};`;
            code += `if (${maxIdx} === 0) { ${c0} = ${qy}; ${c1} = ${qz}; ${c2} = ${qw}; ${sign} = ${qx} < 0 ? 1 : 0; }`;
            code += `else if (${maxIdx} === 1) { ${c0} = ${qx}; ${c1} = ${qz}; ${c2} = ${qw}; ${sign} = ${qy} < 0 ? 1 : 0; }`;
            code += `else if (${maxIdx} === 2) { ${c0} = ${qx}; ${c1} = ${qy}; ${c2} = ${qw}; ${sign} = ${qz} < 0 ? 1 : 0; }`;
            code += `else { ${c0} = ${qx}; ${c1} = ${qy}; ${c2} = ${qz}; ${sign} = ${qw} < 0 ? 1 : 0; }`;
            // quantize components
            code += `${c0} = Math.max(0, Math.min(${maxVal}, Math.round((${c0} + ${1 / Math.sqrt(2)}) * ${scale})));`;
            code += `${c1} = Math.max(0, Math.min(${maxVal}, Math.round((${c1} + ${1 / Math.sqrt(2)}) * ${scale})));`;
            code += `${c2} = Math.max(0, Math.min(${maxVal}, Math.round((${c2} + ${1 / Math.sqrt(2)}) * ${scale})));`;
            // metadata byte: 2 bits index + 1 bit sign
            code += `u8[o++] = (${maxIdx} << 1) | ${sign};`;
            if (bits <= 8) {
                code += `u8[o++] = ${c0}; u8[o++] = ${c1}; u8[o++] = ${c2};`;
            } else if (bits <= 16) {
                code += writeU16(c0) + writeU16(c1) + writeU16(c2);
            } else {
                code += writeU32(c0) + writeU32(c1) + writeU32(c2);
            }
            return code;
        },
        unpack: (ctx, s, target) => {
            const steps = Math.ceil(Math.SQRT2 / s.step);
            const bits = Math.ceil(Math.log2(steps));
            const maxVal = (1 << bits) - 1;
            const scale = maxVal / Math.sqrt(2);
            const metaByte = variable(ctx, 'meta');
            const maxIdx = variable(ctx, 'maxIdx');
            const sign = variable(ctx, 'sign');
            const c0 = variable(ctx, 'c0'),
                c1 = variable(ctx, 'c1'),
                c2 = variable(ctx, 'c2'),
                c3 = variable(ctx, 'c3');
            let code = '';
            // read metadata byte (2 bits index + 1 bit sign)
            code += `const ${metaByte} = u8[o++];`;
            code += `const ${maxIdx} = ${metaByte} >> 1;`;
            code += `const ${sign} = ${metaByte} & 0x1;`;
            if (bits <= 8) {
                code += `let ${c0} = u8[o++]; let ${c1} = u8[o++]; let ${c2} = u8[o++];`;
            } else if (bits <= 16) {
                code += readU16(c0) + readU16(c1) + readU16(c2);
            } else {
                code += readU32(c0) + readU32(c1) + readU32(c2);
            }
            // dequantize
            code += `${c0} = ${c0} / ${scale} - ${1 / Math.sqrt(2)};`;
            code += `${c1} = ${c1} / ${scale} - ${1 / Math.sqrt(2)};`;
            code += `${c2} = ${c2} / ${scale} - ${1 / Math.sqrt(2)};`;
            // reconstruct largest component
            code += `let ${c3} = Math.sqrt(Math.max(0, 1 - ${c0}*${c0} - ${c1}*${c1} - ${c2}*${c2}));`;
            code += `if (${sign}) ${c3} = -${c3};`;
            // assign based on which component was dropped (as [x, y, z, w])
            code += `if (${maxIdx} === 0) ${target} = [${c3}, ${c0}, ${c1}, ${c2}];`;
            code += `else if (${maxIdx} === 1) ${target} = [${c0}, ${c3}, ${c1}, ${c2}];`;
            code += `else if (${maxIdx} === 2) ${target} = [${c0}, ${c1}, ${c3}, ${c2}];`;
            code += `else ${target} = [${c0}, ${c1}, ${c2}, ${c3}];`;
            return code;
        },
        validate: (_ctx, _s, v) =>
            `if (!Array.isArray(${v}) || ${v}.length !== 4 || typeof ${v}[0] !== 'number' || typeof ${v}[1] !== 'number' || typeof ${v}[2] !== 'number' || typeof ${v}[3] !== 'number') return false;`,
    },

    // unit vector 2d: encode as angle, range is 0 to 2pi
    uv2: {
        size: (_ctx, s) => {
            const steps = Math.ceil((Math.PI * 2) / s.step);
            const bits = Math.ceil(Math.log2(steps));
            const bytes = Math.ceil(bits / 8);
            return { code: '', fixed: bytes };
        },
        pack: (ctx, s, v) => {
            const steps = Math.ceil((Math.PI * 2) / s.step);
            const bits = Math.ceil(Math.log2(steps));
            const maxVal = (1 << bits) - 1;
            const angle = variable(ctx, 'angle');
            const quantized = variable(ctx, 'quant');
            const bytes = Math.ceil(bits / 8);
            let code = '';
            // atan2 returns [-pi, pi], normalize to [0, 2pi]
            code += `let ${angle} = Math.atan2(${v}[1], ${v}[0]);`;
            code += `if (${angle} < 0) ${angle} += ${Math.PI * 2};`;
            code += `const ${quantized} = Math.round(${angle} / ${Math.PI * 2} * ${maxVal}) & ${maxVal};`;
            if (bytes === 1) code += writeU8(quantized);
            else if (bytes === 2) code += writeU16(quantized);
            else code += writeU32(quantized);
            return code;
        },
        unpack: (ctx, s, target) => {
            const steps = Math.ceil((Math.PI * 2) / s.step);
            const bits = Math.ceil(Math.log2(steps));
            const maxVal = (1 << bits) - 1;
            const quantized = variable(ctx, 'quant');
            const angle = variable(ctx, 'angle');
            const bytes = Math.ceil(bits / 8);
            let code = '';
            if (bytes === 1) code += readU8(quantized);
            else if (bytes === 2) code += readU16(quantized);
            else code += readU32(quantized);
            code += `const ${angle} = ${quantized} / ${maxVal} * ${Math.PI * 2};`;
            code += `${target} = [Math.cos(${angle}), Math.sin(${angle})];`;
            return code;
        },
        validate: (_ctx, _s, v) =>
            `if (!Array.isArray(${v}) || ${v}.length !== 2 || typeof ${v}[0] !== 'number' || typeof ${v}[1] !== 'number') return false;`,
    },

    // unit vector 3d: smallest-two encoding (similar to quaternion)
    uv3: {
        size: (_ctx, s) => {
            const steps = Math.ceil(Math.SQRT2 / s.step);
            const bits = Math.ceil(Math.log2(steps));
            // 2 bits for index + 1 bit for sign + (bits * 2) for components
            const totalBits = 2 + 1 + bits * 2;
            const bytes = Math.ceil(totalBits / 8);
            return { code: '', fixed: bytes };
        },
        pack: (ctx, s, v) => {
            const steps = Math.ceil(Math.SQRT2 / s.step);
            const bits = Math.ceil(Math.log2(steps));
            const maxVal = (1 << bits) - 1;
            const scale = maxVal / Math.sqrt(2);
            const vx = `${v}[0]`;
            const vy = `${v}[1]`;
            const vz = `${v}[2]`;
            const ax = variable(ctx, 'ax');
            const ay = variable(ctx, 'ay');
            const az = variable(ctx, 'az');
            const maxIdx = variable(ctx, 'maxIdx');
            const c0 = variable(ctx, 'c0');
            const c1 = variable(ctx, 'c1');
            const sign = variable(ctx, 'sign');
            const packed = variable(ctx, 'packed');
            const totalBits = 2 + 1 + bits * 2;
            const bytes = Math.ceil(totalBits / 8);
            let code = '';
            code += `const ${ax} = Math.abs(${vx}), ${ay} = Math.abs(${vy}), ${az} = Math.abs(${vz});`;
            code += `let ${maxIdx} = 0;`;
            code += `if (${ay} > ${ax}) ${maxIdx} = 1;`;
            code += `if (${az} > (${maxIdx} === 0 ? ${ax} : ${ay})) ${maxIdx} = 2;`;
            code += `let ${c0}, ${c1}, ${sign};`;
            code += `if (${maxIdx} === 0) { ${c0} = ${vy}; ${c1} = ${vz}; ${sign} = ${vx} < 0 ? 1 : 0; }`;
            code += `else if (${maxIdx} === 1) { ${c0} = ${vx}; ${c1} = ${vz}; ${sign} = ${vy} < 0 ? 1 : 0; }`;
            code += `else { ${c0} = ${vx}; ${c1} = ${vy}; ${sign} = ${vz} < 0 ? 1 : 0; }`;
            code += `${c0} = Math.max(0, Math.min(${maxVal}, Math.round((${c0} + ${1 / Math.sqrt(2)}) * ${scale})));`;
            code += `${c1} = Math.max(0, Math.min(${maxVal}, Math.round((${c1} + ${1 / Math.sqrt(2)}) * ${scale})));`;
            code += `let ${packed} = (${maxIdx} << ${totalBits - 2}) | (${sign} << ${totalBits - 3}) | (${c0} << ${bits}) | ${c1};`;
            for (let i = bytes - 1; i >= 0; i--) {
                code += `u8[o++] = (${packed} >> ${i * 8}) & 0xFF;`;
            }
            return code;
        },
        unpack: (ctx, s, target) => {
            const steps = Math.ceil(Math.SQRT2 / s.step);
            const bits = Math.ceil(Math.log2(steps));
            const maxVal = (1 << bits) - 1;
            const scale = maxVal / Math.sqrt(2);
            const packed = variable(ctx, 'packed');
            const maxIdx = variable(ctx, 'maxIdx');
            const sign = variable(ctx, 'sign');
            const c0 = variable(ctx, 'c0');
            const c1 = variable(ctx, 'c1');
            const c2 = variable(ctx, 'c2');
            const totalBits = 2 + 1 + bits * 2;
            const bytes = Math.ceil(totalBits / 8);
            let code = '';
            code += `let ${packed} = 0;`;
            for (let i = bytes - 1; i >= 0; i--) {
                code += `${packed} |= u8[o++] << ${i * 8};`;
            }
            code += `const ${maxIdx} = (${packed} >> ${totalBits - 2}) & 0x3;`;
            code += `const ${sign} = (${packed} >> ${totalBits - 3}) & 0x1;`;
            code += `let ${c0} = (${packed} >> ${bits}) & ${maxVal};`;
            code += `let ${c1} = ${packed} & ${maxVal};`;
            code += `${c0} = ${c0} / ${scale} - ${1 / Math.sqrt(2)};`;
            code += `${c1} = ${c1} / ${scale} - ${1 / Math.sqrt(2)};`;
            code += `let ${c2} = Math.sqrt(Math.max(0, 1 - ${c0}*${c0} - ${c1}*${c1}));`;
            code += `if (${sign}) ${c2} = -${c2};`;
            code += `if (${maxIdx} === 0) ${target} = [${c2}, ${c0}, ${c1}];`;
            code += `else if (${maxIdx} === 1) ${target} = [${c0}, ${c2}, ${c1}];`;
            code += `else ${target} = [${c0}, ${c1}, ${c2}];`;
            return code;
        },
        validate: (_ctx, _s, v) =>
            `if (!Array.isArray(${v}) || ${v}.length !== 3 || typeof ${v}[0] !== 'number' || typeof ${v}[1] !== 'number' || typeof ${v}[2] !== 'number') return false;`,
    },

    string: {
        size: (ctx, _s, v) => {
            const strVar = variable(ctx, 'str');
            const code = `const ${strVar} = ${v}; len = utf8Length(${strVar}); ${varuintSize('len')} size += len;`;
            return { code, fixed: 0 };
        },
        pack: (ctx, _s, v) => writeString(ctx, v),
        unpack: (_ctx, _s, target) => readString(target),
        validate: (_ctx, _s, v) => `if (typeof ${v} !== 'string') return false;`,
    },

    varint: {
        size: (_ctx, _s, v) => ({ code: varintSize(v), fixed: 0 }),
        pack: (_ctx, _s, v) => writeVarint(v),
        unpack: (_ctx, _s, target) => readVarint(target),
        validate: (_ctx, _s, v) => `if (typeof ${v} !== 'number' || !Number.isInteger(${v})) return false;`,
    },

    varuint: {
        size: (_ctx, _s, v) => ({ code: varuintSize(v), fixed: 0 }),
        pack: (_ctx, _s, v) => writeVaruint(v),
        unpack: (_ctx, _s, target) => readVaruint(target),
        validate: (_ctx, _s, v) => `if (typeof ${v} !== 'number' || !Number.isInteger(${v}) || ${v} < 0) return false;`,
    },

    // literals are not serialized; the known value is injected on unpack
    literal: {
        size: () => ({ code: '', fixed: 0 }),
        pack: () => '',
        unpack: (_ctx, s, target) => `${target} = ${JSON.stringify(s.value)};`,
        validate: (_ctx, s, v) => `if (${JSON.stringify(s.value)} !== ${v}) return false;`,
    },

    // enum values are mapped to varuint indices
    enumeration: {
        size: (_ctx, s, v) => {
            let inner = '';
            for (let i = 0; i < s.values.length; i++) {
                const prefix = i === 0 ? 'if' : ' else if';
                inner += `${prefix} (${v} === ${JSON.stringify(s.values[i])}) { ${varuintSize(i.toString())} }`;
            }
            inner += ` else { throw new Error('Invalid enum value: ' + ${v}); }`;
            return { code: inner, fixed: 0 };
        },
        pack: (_ctx, s, v) => {
            let inner = '';
            for (let i = 0; i < s.values.length; i++) {
                const prefix = i === 0 ? 'if' : ' else if';
                inner += `${prefix} (${v} === ${JSON.stringify(s.values[i])}) { ${writeVaruint(i.toString())} }`;
            }
            inner += ` else { throw new Error('Invalid enum value at serialize: ' + ${v}); }`;
            return inner;
        },
        unpack: (ctx, s, target) => {
            const tag = variable(ctx, 'enumTag');
            let out = '';
            out += `let ${tag};`;
            out += readVaruint(tag);
            for (let i = 0; i < s.values.length; i++) {
                const prefix = i === 0 ? 'if' : ' else if';
                out += `${prefix} (${tag} === ${i}) { ${target} = ${JSON.stringify(s.values[i])}; }`;
            }
            out += ` else { throw new Error('Invalid enum index: ' + ${tag}); }`;
            return out;
        },
        validate: (_ctx, s, v) => {
            const checks = s.values.map((val: string | number) => `${v} === ${JSON.stringify(val)}`).join(' || ');
            return `if (!(${checks})) return false;`;
        },
    },

    // raw bytes: fixed-length (no prefix) or variable-length (varuint prefix)
    uint8Array: {
        size: (ctx, s, v) => {
            if ('length' in s && typeof s.length === 'number') {
                return { code: '', fixed: s.length };
            }
            const lenVar = variable(ctx, 'len');
            return { code: `const ${lenVar} = ${v}.length; ${varuintSize(lenVar)} size += ${lenVar};`, fixed: 0 };
        },
        pack: (ctx, s, v) => {
            if ('length' in s && typeof s.length === 'number') {
                return `u8.set(${v}, o); o += ${s.length};`;
            }
            const lenVar = variable(ctx, 'len');
            let inner = '';
            inner += `const ${lenVar} = ${v}.length;`;
            inner += writeVaruint(lenVar);
            inner += `u8.set(${v}, o); o += ${lenVar};`;
            return inner;
        },
        unpack: (_ctx, s, target) => {
            if ('length' in s && typeof s.length === 'number') {
                return `${target} = u8.subarray(o, o + ${s.length}); o += ${s.length};`;
            }
            let inner = '';
            inner += readVaruint('len');
            inner += `${target} = u8.subarray(o, o + len); o += len;`;
            return inner;
        },
        validate: (_ctx, s, v) => {
            let inner = `if (!(${v} instanceof Uint8Array)) return false;`;
            if ('length' in s && typeof s.length === 'number') {
                inner += ` if (${v}.length !== ${s.length}) return false;`;
            }
            return inner;
        },
    },

    // Int8Array: signed 8-bit integers, 1 byte per element
    int8Array: {
        size: (ctx, s, v) => {
            if ('length' in s && typeof s.length === 'number') {
                return { code: '', fixed: s.length };
            }
            const lenVar = variable(ctx, 'len');
            return { code: `const ${lenVar} = ${v}.length; ${varuintSize(lenVar)} size += ${lenVar};`, fixed: 0 };
        },
        pack: (ctx, s, v) => {
            if ('length' in s && typeof s.length === 'number') {
                return `u8.set(new Uint8Array(${v}.buffer, ${v}.byteOffset, ${s.length}), o); o += ${s.length};`;
            }
            const lenVar = variable(ctx, 'len');
            let inner = '';
            inner += `const ${lenVar} = ${v}.length;`;
            inner += writeVaruint(lenVar);
            inner += `u8.set(new Uint8Array(${v}.buffer, ${v}.byteOffset, ${lenVar}), o); o += ${lenVar};`;
            return inner;
        },
        unpack: (_ctx, s, target) => {
            if ('length' in s && typeof s.length === 'number') {
                return `${target} = new Int8Array(u8.buffer, u8.byteOffset + o, ${s.length}); o += ${s.length};`;
            }
            let inner = '';
            inner += readVaruint('len');
            inner += `${target} = new Int8Array(u8.buffer, u8.byteOffset + o, len); o += len;`;
            return inner;
        },
        validate: (_ctx, s, v) => {
            let inner = `if (!(${v} instanceof Int8Array)) return false;`;
            if ('length' in s && typeof s.length === 'number') {
                inner += ` if (${v}.length !== ${s.length}) return false;`;
            }
            return inner;
        },
    },

    // Uint8ClampedArray: clamped unsigned 8-bit integers, 1 byte per element
    uint8ClampedArray: {
        size: (ctx, s, v) => {
            if ('length' in s && typeof s.length === 'number') {
                return { code: '', fixed: s.length };
            }
            const lenVar = variable(ctx, 'len');
            return { code: `const ${lenVar} = ${v}.length; ${varuintSize(lenVar)} size += ${lenVar};`, fixed: 0 };
        },
        pack: (ctx, s, v) => {
            if ('length' in s && typeof s.length === 'number') {
                return `u8.set(new Uint8Array(${v}.buffer, ${v}.byteOffset, ${s.length}), o); o += ${s.length};`;
            }
            const lenVar = variable(ctx, 'len');
            let inner = '';
            inner += `const ${lenVar} = ${v}.length;`;
            inner += writeVaruint(lenVar);
            inner += `u8.set(new Uint8Array(${v}.buffer, ${v}.byteOffset, ${lenVar}), o); o += ${lenVar};`;
            return inner;
        },
        unpack: (_ctx, s, target) => {
            if ('length' in s && typeof s.length === 'number') {
                return `${target} = new Uint8ClampedArray(u8.buffer, u8.byteOffset + o, ${s.length}); o += ${s.length};`;
            }
            let inner = '';
            inner += readVaruint('len');
            inner += `${target} = new Uint8ClampedArray(u8.buffer, u8.byteOffset + o, len); o += len;`;
            return inner;
        },
        validate: (_ctx, s, v) => {
            let inner = `if (!(${v} instanceof Uint8ClampedArray)) return false;`;
            if ('length' in s && typeof s.length === 'number') {
                inner += ` if (${v}.length !== ${s.length}) return false;`;
            }
            return inner;
        },
    },

    // Int16Array: signed 16-bit integers, 2 bytes per element
    int16Array: {
        size: (ctx, s, v) => {
            if ('length' in s && typeof s.length === 'number') {
                return { code: '', fixed: s.length * 2 };
            }
            const lenVar = variable(ctx, 'len');
            return { code: `const ${lenVar} = ${v}.length; ${varuintSize(lenVar)} size += ${lenVar} * 2;`, fixed: 0 };
        },
        pack: (ctx, s, v) => {
            if ('length' in s && typeof s.length === 'number') {
                return `u8.set(new Uint8Array(${v}.buffer, ${v}.byteOffset, ${s.length * 2}), o); o += ${s.length * 2};`;
            }
            const lenVar = variable(ctx, 'len');
            let inner = '';
            inner += `const ${lenVar} = ${v}.length;`;
            inner += writeVaruint(lenVar);
            inner += `u8.set(new Uint8Array(${v}.buffer, ${v}.byteOffset, ${lenVar} * 2), o); o += ${lenVar} * 2;`;
            return inner;
        },
        unpack: (ctx, s, target) => {
            if ('length' in s && typeof s.length === 'number') {
                const arrVar = variable(ctx, 'arr');
                return `const ${arrVar} = new Int16Array(${s.length}); new Uint8Array(${arrVar}.buffer).set(u8.subarray(o, o + ${s.length * 2})); ${target} = ${arrVar}; o += ${s.length * 2};`;
            }
            let inner = '';
            inner += readVaruint('len');
            const arrVar = variable(ctx, 'arr');
            inner += `const ${arrVar} = new Int16Array(len); new Uint8Array(${arrVar}.buffer).set(u8.subarray(o, o + len * 2)); ${target} = ${arrVar}; o += len * 2;`;
            return inner;
        },
        validate: (_ctx, s, v) => {
            let inner = `if (!(${v} instanceof Int16Array)) return false;`;
            if ('length' in s && typeof s.length === 'number') {
                inner += ` if (${v}.length !== ${s.length}) return false;`;
            }
            return inner;
        },
    },

    // Uint16Array: unsigned 16-bit integers, 2 bytes per element
    uint16Array: {
        size: (ctx, s, v) => {
            if ('length' in s && typeof s.length === 'number') {
                return { code: '', fixed: s.length * 2 };
            }
            const lenVar = variable(ctx, 'len');
            return { code: `const ${lenVar} = ${v}.length; ${varuintSize(lenVar)} size += ${lenVar} * 2;`, fixed: 0 };
        },
        pack: (ctx, s, v) => {
            if ('length' in s && typeof s.length === 'number') {
                return `u8.set(new Uint8Array(${v}.buffer, ${v}.byteOffset, ${s.length * 2}), o); o += ${s.length * 2};`;
            }
            const lenVar = variable(ctx, 'len');
            let inner = '';
            inner += `const ${lenVar} = ${v}.length;`;
            inner += writeVaruint(lenVar);
            inner += `u8.set(new Uint8Array(${v}.buffer, ${v}.byteOffset, ${lenVar} * 2), o); o += ${lenVar} * 2;`;
            return inner;
        },
        unpack: (ctx, s, target) => {
            if ('length' in s && typeof s.length === 'number') {
                const arrVar = variable(ctx, 'arr');
                return `const ${arrVar} = new Uint16Array(${s.length}); new Uint8Array(${arrVar}.buffer).set(u8.subarray(o, o + ${s.length * 2})); ${target} = ${arrVar}; o += ${s.length * 2};`;
            }
            let inner = '';
            inner += readVaruint('len');
            const arrVar = variable(ctx, 'arr');
            inner += `const ${arrVar} = new Uint16Array(len); new Uint8Array(${arrVar}.buffer).set(u8.subarray(o, o + len * 2)); ${target} = ${arrVar}; o += len * 2;`;
            return inner;
        },
        validate: (_ctx, s, v) => {
            let inner = `if (!(${v} instanceof Uint16Array)) return false;`;
            if ('length' in s && typeof s.length === 'number') {
                inner += ` if (${v}.length !== ${s.length}) return false;`;
            }
            return inner;
        },
    },

    // Int32Array: signed 32-bit integers, 4 bytes per element
    int32Array: {
        size: (ctx, s, v) => {
            if ('length' in s && typeof s.length === 'number') {
                return { code: '', fixed: s.length * 4 };
            }
            const lenVar = variable(ctx, 'len');
            return { code: `const ${lenVar} = ${v}.length; ${varuintSize(lenVar)} size += ${lenVar} * 4;`, fixed: 0 };
        },
        pack: (ctx, s, v) => {
            if ('length' in s && typeof s.length === 'number') {
                return `u8.set(new Uint8Array(${v}.buffer, ${v}.byteOffset, ${s.length * 4}), o); o += ${s.length * 4};`;
            }
            const lenVar = variable(ctx, 'len');
            let inner = '';
            inner += `const ${lenVar} = ${v}.length;`;
            inner += writeVaruint(lenVar);
            inner += `u8.set(new Uint8Array(${v}.buffer, ${v}.byteOffset, ${lenVar} * 4), o); o += ${lenVar} * 4;`;
            return inner;
        },
        unpack: (ctx, s, target) => {
            if ('length' in s && typeof s.length === 'number') {
                const arrVar = variable(ctx, 'arr');
                return `const ${arrVar} = new Int32Array(${s.length}); new Uint8Array(${arrVar}.buffer).set(u8.subarray(o, o + ${s.length * 4})); ${target} = ${arrVar}; o += ${s.length * 4};`;
            }
            let inner = '';
            inner += readVaruint('len');
            const arrVar = variable(ctx, 'arr');
            inner += `const ${arrVar} = new Int32Array(len); new Uint8Array(${arrVar}.buffer).set(u8.subarray(o, o + len * 4)); ${target} = ${arrVar}; o += len * 4;`;
            return inner;
        },
        validate: (_ctx, s, v) => {
            let inner = `if (!(${v} instanceof Int32Array)) return false;`;
            if ('length' in s && typeof s.length === 'number') {
                inner += ` if (${v}.length !== ${s.length}) return false;`;
            }
            return inner;
        },
    },

    // Uint32Array: unsigned 32-bit integers, 4 bytes per element
    uint32Array: {
        size: (ctx, s, v) => {
            if ('length' in s && typeof s.length === 'number') {
                return { code: '', fixed: s.length * 4 };
            }
            const lenVar = variable(ctx, 'len');
            return { code: `const ${lenVar} = ${v}.length; ${varuintSize(lenVar)} size += ${lenVar} * 4;`, fixed: 0 };
        },
        pack: (ctx, s, v) => {
            if ('length' in s && typeof s.length === 'number') {
                return `u8.set(new Uint8Array(${v}.buffer, ${v}.byteOffset, ${s.length * 4}), o); o += ${s.length * 4};`;
            }
            const lenVar = variable(ctx, 'len');
            let inner = '';
            inner += `const ${lenVar} = ${v}.length;`;
            inner += writeVaruint(lenVar);
            inner += `u8.set(new Uint8Array(${v}.buffer, ${v}.byteOffset, ${lenVar} * 4), o); o += ${lenVar} * 4;`;
            return inner;
        },
        unpack: (ctx, s, target) => {
            if ('length' in s && typeof s.length === 'number') {
                const arrVar = variable(ctx, 'arr');
                return `const ${arrVar} = new Uint32Array(${s.length}); new Uint8Array(${arrVar}.buffer).set(u8.subarray(o, o + ${s.length * 4})); ${target} = ${arrVar}; o += ${s.length * 4};`;
            }
            let inner = '';
            inner += readVaruint('len');
            const arrVar = variable(ctx, 'arr');
            inner += `const ${arrVar} = new Uint32Array(len); new Uint8Array(${arrVar}.buffer).set(u8.subarray(o, o + len * 4)); ${target} = ${arrVar}; o += len * 4;`;
            return inner;
        },
        validate: (_ctx, s, v) => {
            let inner = `if (!(${v} instanceof Uint32Array)) return false;`;
            if ('length' in s && typeof s.length === 'number') {
                inner += ` if (${v}.length !== ${s.length}) return false;`;
            }
            return inner;
        },
    },

    // Float32Array: 32-bit floating point, 4 bytes per element
    float32Array: {
        size: (ctx, s, v) => {
            if ('length' in s && typeof s.length === 'number') {
                return { code: '', fixed: s.length * 4 };
            }
            const lenVar = variable(ctx, 'len');
            return { code: `const ${lenVar} = ${v}.length; ${varuintSize(lenVar)} size += ${lenVar} * 4;`, fixed: 0 };
        },
        pack: (ctx, s, v) => {
            if ('length' in s && typeof s.length === 'number') {
                return `u8.set(new Uint8Array(${v}.buffer, ${v}.byteOffset, ${s.length * 4}), o); o += ${s.length * 4};`;
            }
            const lenVar = variable(ctx, 'len');
            let inner = '';
            inner += `const ${lenVar} = ${v}.length;`;
            inner += writeVaruint(lenVar);
            inner += `u8.set(new Uint8Array(${v}.buffer, ${v}.byteOffset, ${lenVar} * 4), o); o += ${lenVar} * 4;`;
            return inner;
        },
        unpack: (ctx, s, target) => {
            if ('length' in s && typeof s.length === 'number') {
                const arrVar = variable(ctx, 'arr');
                return `const ${arrVar} = new Float32Array(${s.length}); new Uint8Array(${arrVar}.buffer).set(u8.subarray(o, o + ${s.length * 4})); ${target} = ${arrVar}; o += ${s.length * 4};`;
            }
            let inner = '';
            inner += readVaruint('len');
            const arrVar = variable(ctx, 'arr');
            inner += `const ${arrVar} = new Float32Array(len); new Uint8Array(${arrVar}.buffer).set(u8.subarray(o, o + len * 4)); ${target} = ${arrVar}; o += len * 4;`;
            return inner;
        },
        validate: (_ctx, s, v) => {
            let inner = `if (!(${v} instanceof Float32Array)) return false;`;
            if ('length' in s && typeof s.length === 'number') {
                inner += ` if (${v}.length !== ${s.length}) return false;`;
            }
            return inner;
        },
    },

    // Float64Array: 64-bit floating point, 8 bytes per element
    float64Array: {
        size: (ctx, s, v) => {
            if ('length' in s && typeof s.length === 'number') {
                return { code: '', fixed: s.length * 8 };
            }
            const lenVar = variable(ctx, 'len');
            return { code: `const ${lenVar} = ${v}.length; ${varuintSize(lenVar)} size += ${lenVar} * 8;`, fixed: 0 };
        },
        pack: (ctx, s, v) => {
            if ('length' in s && typeof s.length === 'number') {
                return `u8.set(new Uint8Array(${v}.buffer, ${v}.byteOffset, ${s.length * 8}), o); o += ${s.length * 8};`;
            }
            const lenVar = variable(ctx, 'len');
            let inner = '';
            inner += `const ${lenVar} = ${v}.length;`;
            inner += writeVaruint(lenVar);
            inner += `u8.set(new Uint8Array(${v}.buffer, ${v}.byteOffset, ${lenVar} * 8), o); o += ${lenVar} * 8;`;
            return inner;
        },
        unpack: (ctx, s, target) => {
            if ('length' in s && typeof s.length === 'number') {
                const arrVar = variable(ctx, 'arr');
                return `const ${arrVar} = new Float64Array(${s.length}); new Uint8Array(${arrVar}.buffer).set(u8.subarray(o, o + ${s.length * 8})); ${target} = ${arrVar}; o += ${s.length * 8};`;
            }
            let inner = '';
            inner += readVaruint('len');
            const arrVar = variable(ctx, 'arr');
            inner += `const ${arrVar} = new Float64Array(len); new Uint8Array(${arrVar}.buffer).set(u8.subarray(o, o + len * 8)); ${target} = ${arrVar}; o += len * 8;`;
            return inner;
        },
        validate: (_ctx, s, v) => {
            let inner = `if (!(${v} instanceof Float64Array)) return false;`;
            if ('length' in s && typeof s.length === 'number') {
                inner += ` if (${v}.length !== ${s.length}) return false;`;
            }
            return inner;
        },
    },

    // BigInt64Array: signed 64-bit BigInt, 8 bytes per element
    bigInt64Array: {
        size: (ctx, s, v) => {
            if ('length' in s && typeof s.length === 'number') {
                return { code: '', fixed: s.length * 8 };
            }
            const lenVar = variable(ctx, 'len');
            return { code: `const ${lenVar} = ${v}.length; ${varuintSize(lenVar)} size += ${lenVar} * 8;`, fixed: 0 };
        },
        pack: (ctx, s, v) => {
            if ('length' in s && typeof s.length === 'number') {
                return `u8.set(new Uint8Array(${v}.buffer, ${v}.byteOffset, ${s.length * 8}), o); o += ${s.length * 8};`;
            }
            const lenVar = variable(ctx, 'len');
            let inner = '';
            inner += `const ${lenVar} = ${v}.length;`;
            inner += writeVaruint(lenVar);
            inner += `u8.set(new Uint8Array(${v}.buffer, ${v}.byteOffset, ${lenVar} * 8), o); o += ${lenVar} * 8;`;
            return inner;
        },
        unpack: (ctx, s, target) => {
            if ('length' in s && typeof s.length === 'number') {
                const arrVar = variable(ctx, 'arr');
                return `const ${arrVar} = new BigInt64Array(${s.length}); new Uint8Array(${arrVar}.buffer).set(u8.subarray(o, o + ${s.length * 8})); ${target} = ${arrVar}; o += ${s.length * 8};`;
            }
            let inner = '';
            inner += readVaruint('len');
            const arrVar = variable(ctx, 'arr');
            inner += `const ${arrVar} = new BigInt64Array(len); new Uint8Array(${arrVar}.buffer).set(u8.subarray(o, o + len * 8)); ${target} = ${arrVar}; o += len * 8;`;
            return inner;
        },
        validate: (_ctx, s, v) => {
            let inner = `if (!(${v} instanceof BigInt64Array)) return false;`;
            if ('length' in s && typeof s.length === 'number') {
                inner += ` if (${v}.length !== ${s.length}) return false;`;
            }
            return inner;
        },
    },

    // BigUint64Array: unsigned 64-bit BigInt, 8 bytes per element
    bigUint64Array: {
        size: (ctx, s, v) => {
            if ('length' in s && typeof s.length === 'number') {
                return { code: '', fixed: s.length * 8 };
            }
            const lenVar = variable(ctx, 'len');
            return { code: `const ${lenVar} = ${v}.length; ${varuintSize(lenVar)} size += ${lenVar} * 8;`, fixed: 0 };
        },
        pack: (ctx, s, v) => {
            if ('length' in s && typeof s.length === 'number') {
                return `u8.set(new Uint8Array(${v}.buffer, ${v}.byteOffset, ${s.length * 8}), o); o += ${s.length * 8};`;
            }
            const lenVar = variable(ctx, 'len');
            let inner = '';
            inner += `const ${lenVar} = ${v}.length;`;
            inner += writeVaruint(lenVar);
            inner += `u8.set(new Uint8Array(${v}.buffer, ${v}.byteOffset, ${lenVar} * 8), o); o += ${lenVar} * 8;`;
            return inner;
        },
        unpack: (ctx, s, target) => {
            if ('length' in s && typeof s.length === 'number') {
                const arrVar = variable(ctx, 'arr');
                return `const ${arrVar} = new BigUint64Array(${s.length}); new Uint8Array(${arrVar}.buffer).set(u8.subarray(o, o + ${s.length * 8})); ${target} = ${arrVar}; o += ${s.length * 8};`;
            }
            let inner = '';
            inner += readVaruint('len');
            const arrVar = variable(ctx, 'arr');
            inner += `const ${arrVar} = new BigUint64Array(len); new Uint8Array(${arrVar}.buffer).set(u8.subarray(o, o + len * 8)); ${target} = ${arrVar}; o += len * 8;`;
            return inner;
        },
        validate: (_ctx, s, v) => {
            let inner = `if (!(${v} instanceof BigUint64Array)) return false;`;
            if ('length' in s && typeof s.length === 'number') {
                inner += ` if (${v}.length !== ${s.length}) return false;`;
            }
            return inner;
        },
    },

    // fixed-length lists omit the length prefix; variable-length use varuint
    // booleans are bitpacked (8 per byte)
    list: {
        size: (ctx, s, v) => {
            if ('length' in s && typeof s.length === 'number') {
                if (s.of.type === 'boolean') {
                    return { code: '', fixed: Math.ceil(s.length / 8) };
                }
                const i = variable(ctx, 'i');
                const elem = size(ctx, s.of, `${v}[${i}]`);
                if (elem.code === '' && elem.fixed > 0) {
                    return { code: '', fixed: elem.fixed * s.length };
                }
                const inner = `for (let ${i} = 0; ${i} < ${s.length}; ${i}++) { ${elem.code} }`;
                return { code: inner, fixed: 0 };
            } else {
                const i = variable(ctx, 'i');
                const lenVar = variable(ctx, 'len');
                if (s.of.type === 'boolean') {
                    let parts = '';
                    parts += `const ${lenVar} = ${v}.length;`;
                    parts += varuintSize(lenVar);
                    const bytesVar = variable(ctx, 'bytes');
                    parts += `const ${bytesVar} = Math.ceil(${lenVar} / 8); size += ${bytesVar};`;
                    return { code: parts, fixed: 0 };
                }
                const elem = size(ctx, s.of, `${v}[${i}]`);
                let parts = '';
                parts += `const ${lenVar} = ${v}.length;`;
                parts += varuintSize(lenVar);
                if (elem.fixed > 0) parts += `size += ${elem.fixed} * ${lenVar};`;
                if (elem.code && elem.code !== '') {
                    parts += `for (let ${i} = 0; ${i} < ${lenVar}; ${i}++) { ${elem.code} }`;
                }
                return { code: parts, fixed: 0 };
            }
        },
        pack: (ctx, s, v) => {
            if (s.length !== undefined) {
                if (s.of.type === 'boolean') {
                    const boolRefs = Array.from({ length: s.length }, (_, i) => ({ varRef: `${v}[${i}]` }));
                    return emitBitPack(ctx, boolRefs);
                }
                let inner = '';
                for (let i = 0; i < s.length; i++) {
                    inner += pack(ctx, s.of, `${v}[${i}]`);
                }
                return inner;
            } else {
                if (s.of.type === 'boolean') {
                    const lenVar = variable(ctx, 'len');
                    let inner = '';
                    inner += `const ${lenVar} = ${v}.length;`;
                    inner += writeVaruint(lenVar);
                    const byteVar = variable(ctx, 'byte');
                    const bIdx = variable(ctx, 'bIdx');
                    const bitIdx = variable(ctx, 'bitIdx');
                    inner += `for (let ${bIdx} = 0; ${bIdx} < Math.ceil(${lenVar} / 8); ${bIdx}++) {`;
                    inner += `let ${byteVar} = 0;`;
                    inner += `for (let bit = 0; bit < 8; bit++) {`;
                    inner += `const ${bitIdx} = ${bIdx} * 8 + bit;`;
                    inner += `if (${bitIdx} >= ${lenVar}) break;`;
                    inner += `if (${v}[${bitIdx}]) ${byteVar} |= (1 << bit);`;
                    inner += `}`;
                    inner += `u8[o++] = ${byteVar};`;
                    inner += `}`;
                    return inner;
                }
                const i = variable(ctx, 'i');
                const lenVar = variable(ctx, 'len');
                let inner = '';
                inner += `const ${lenVar} = ${v}.length;`;
                inner += writeVaruint(lenVar);
                inner += `for (let ${i} = 0; ${i} < ${lenVar}; ${i}++) {`;
                inner += pack(ctx, s.of, `${v}[${i}]`);
                inner += '}';
                return inner;
            }
        },
        unpack: (ctx, s, target) => {
            if ('length' in s && typeof s.length === 'number') {
                if (s.of.type === 'boolean') {
                    let inner = `${target} = new Array(${s.length});`;
                    const boolTargets = Array.from({ length: s.length }, (_, i) => ({ target: `${target}[${i}]` }));
                    inner += emitBitUnpack(ctx, boolTargets);
                    return inner;
                }
                let inner = `${target} = new Array(${s.length});`;
                for (let i = 0; i < s.length; i++) {
                    inner += unpack(ctx, s.of, `${target}[${i}]`);
                }
                return inner;
            } else {
                if (s.of.type === 'boolean') {
                    const l = variable(ctx, 'l');
                    let inner = '';
                    inner += `let ${l};`;
                    inner += readVaruint(l);
                    inner += `${target} = new Array(${l});`;
                    const bIdx = variable(ctx, 'bIdx');
                    const bitIdx = variable(ctx, 'bitIdx');
                    const byteIdx = variable(ctx, 'bval');
                    inner += `for (let ${bIdx} = 0; ${bIdx} < Math.ceil(${l} / 8); ${bIdx}++) {`;
                    inner += `const ${byteIdx} = u8[o++];`;
                    inner += `for (let bit = 0; bit < 8; bit++) {`;
                    inner += `const ${bitIdx} = ${bIdx} * 8 + bit;`;
                    inner += `if (${bitIdx} >= ${l}) break;`;
                    inner += `${target}[${bitIdx}] = (${byteIdx} & (1 << bit)) !== 0;`;
                    inner += `}`;
                    inner += `}`;
                    return inner;
                }
                const i = variable(ctx, 'i');
                const l = variable(ctx, 'l');
                let inner = '';
                inner += `let ${l};`;
                inner += readVaruint(l);
                inner += `${target} = new Array(${l});`;
                inner += `for (let ${i} = 0; ${i} < ${l}; ${i}++) {`;
                inner += unpack(ctx, s.of, `${target}[${i}]`);
                inner += `}`;
                return inner;
            }
        },
        validate: (ctx, s, v) => {
            if (s.length !== undefined) {
                let inner = '';
                inner += `if (!Array.isArray(${v})) return false;`;
                inner += `if (${v}.length !== ${s.length}) return false;`;
                for (let i = 0; i < s.length; i++) {
                    inner += validate(ctx, s.of, `${v}[${i}]`);
                }
                return inner;
            } else {
                const i = variable(ctx, 'i');
                let inner = '';
                inner += `if (!Array.isArray(${v})) return false;`;
                inner += `for (let ${i} = 0; ${i} < ${v}.length; ${i}++) {`;
                inner += validate(ctx, s.of, `${v}[${i}]`);
                inner += '}';
                return inner;
            }
        },
    },

    // booleans are separated and bitpacked, non-booleans written in order
    tuple: {
        size: (ctx, s, v) => {
            let fixed = 0;
            const parts: string[] = [];
            const indexed = s.of.map((schema: Schema, i: number) => ({ schema, i }));
            const [bools, nonBools] = partition(indexed, (x: { schema: Schema; i: number }) => x.schema.type === 'boolean');
            if (bools.length > 0) fixed += Math.ceil(bools.length / 8);
            for (const { schema, i } of nonBools) {
                const child = size(ctx, schema, `${v}[${i}]`);
                fixed += child.fixed;
                if (child.code !== '') parts.push(child.code);
            }
            return { code: parts.join(' '), fixed };
        },
        pack: (ctx, s, v) => {
            let out = '';
            const indexed = s.of.map((schema: Schema, i: number) => ({ schema, i }));
            const [bools, nonBools] = partition(indexed, (x: { schema: Schema; i: number }) => x.schema.type === 'boolean');
            if (bools.length > 0) {
                out += emitBitPack(
                    ctx,
                    bools.map((x) => ({ varRef: `${v}[${x.i}]` })),
                );
            }
            for (const { schema, i } of nonBools) {
                out += pack(ctx, schema, `${v}[${i}]`);
            }
            return out;
        },
        unpack: (ctx, s, target) => {
            let inner = `${target} = new Array(${s.of.length});`;
            const indexed = s.of.map((schema: Schema, i: number) => ({ schema, i }));
            const [bools, nonBools] = partition(indexed, (x: { schema: Schema; i: number }) => x.schema.type === 'boolean');
            if (bools.length > 0) {
                inner += emitBitUnpack(
                    ctx,
                    bools.map((x) => ({ target: `${target}[${x.i}]` })),
                );
            }
            for (const { schema, i } of nonBools) {
                inner += unpack(ctx, schema, `${target}[${i}]`);
            }
            return inner;
        },
        validate: (ctx, s, v) => {
            let inner = '';
            inner += `if (!Array.isArray(${v})) return false;`;
            inner += `if (${v}.length !== ${s.of.length}) return false;`;
            for (let i = 0; i < s.of.length; i++) {
                inner += validate(ctx, s.of[i], `${v}[${i}]`);
            }
            return inner;
        },
    },

    // keys are sorted for deterministic order; booleans bitpacked separately
    object: {
        size: (ctx, s, v) => {
            let fixed = 0;
            const parts: string[] = [];
            const sortedKeys = Object.keys(s.fields).sort();
            const [boolKeys, nonBoolKeys] = partition(sortedKeys, (k) => s.fields[k].type === 'boolean');
            if (boolKeys.length > 0) fixed += Math.ceil(boolKeys.length / 8);
            for (const k of nonBoolKeys) {
                const child = size(ctx, s.fields[k], `${v}[${JSON.stringify(k)}]`);
                fixed += child.fixed;
                if (child.code !== '') parts.push(child.code);
            }
            return { code: parts.join(' '), fixed };
        },
        pack: (ctx, s, v) => {
            let out = '';
            const sortedKeys = Object.keys(s.fields).sort();
            const [boolKeys, nonBoolKeys] = partition(sortedKeys, (k) => s.fields[k].type === 'boolean');
            if (boolKeys.length > 0) {
                out += emitBitPack(
                    ctx,
                    boolKeys.map((k) => ({ varRef: `${v}[${JSON.stringify(k)}]` })),
                );
            }
            for (const k of nonBoolKeys) {
                out += pack(ctx, s.fields[k], `${v}[${JSON.stringify(k)}]`);
            }
            return out;
        },
        unpack: (ctx, s, target) => {
            let inner = `${target} = {};`;
            const sortedKeys = Object.keys(s.fields).sort();
            const [boolKeys, nonBoolKeys] = partition(sortedKeys, (k) => s.fields[k].type === 'boolean');
            if (boolKeys.length > 0) {
                inner += emitBitUnpack(
                    ctx,
                    boolKeys.map((k) => ({ target: `${target}[${JSON.stringify(k)}]` })),
                );
            }
            for (const key of nonBoolKeys) {
                inner += unpack(ctx, s.fields[key], `${target}[${JSON.stringify(key)}]`);
            }
            return inner;
        },
        validate: (ctx, s, v) => {
            let inner = '';
            inner += `if (typeof (${v}) !== "object") return false;`;
            const sortedKeys = Object.keys(s.fields).sort();
            for (const k of sortedKeys) {
                const key = JSON.stringify(k);
                inner += `if (!(${key} in ${v})) return false;`;
                inner += validate(ctx, s.fields[k], `${v}[${key}]`);
            }
            return inner;
        },
    },

    // varuint key count, then all keys (as strings), then all values
    // boolean values are bitpacked; keys accessed by index for value lookup
    record: {
        size: (ctx, s, v) => {
            const i = variable(ctx, 'i');
            const keys = variable(ctx, 'keys');
            const keysLen = variable(ctx, 'keysLen');
            const k = variable(ctx, 'k');
            let inner = '';
            inner += `if (${v} && typeof ${v} === 'object') {`;
            inner += `const ${keys} = Object.keys(${v});`;
            inner += `const ${keysLen} = ${keys}.length;`;
            inner += `${varuintSize(keysLen)}`;
            const strVar = variable(ctx, 'str');
            inner += `for (let ${i} = 0; ${i} < ${keysLen}; ${i}++) { const ${k} = ${keys}[${i}]; const ${strVar} = ${k}; len = utf8Length(${strVar}); ${varuintSize('len')} size += len; }`;
            if (s.field.type === 'boolean') {
                const bytesVar = variable(ctx, 'bytes');
                inner += `const ${bytesVar} = Math.ceil(${keysLen} / 8); size += ${bytesVar};`;
            } else {
                const childSize = size(ctx, s.field, `${v}[${k}]`);
                if (childSize.fixed > 0) inner += ` size += ${childSize.fixed} * ${keysLen}; `;
                if (childSize.code !== '') {
                    const i2 = variable(ctx, 'i');
                    inner += `for (let ${i2} = 0; ${i2} < ${keysLen}; ${i2}++) { const ${k} = ${keys}[${i2}]; ${childSize.code} }`;
                }
            }
            inner += `}`;
            return { code: inner, fixed: 0 };
        },
        pack: (ctx, s, v) => {
            const i = variable(ctx, 'i');
            const keys = variable(ctx, 'keys');
            const keysLen = variable(ctx, 'keysLen');
            const keyVar = variable(ctx, 'key');
            let inner = '';
            inner += `${keys} = Object.keys(${v});`;
            inner += `${keysLen} = ${keys}.length;`;
            inner += writeVaruint(keysLen);
            inner += `for (let ${i} = 0; ${i} < ${keysLen}; ${i}++) {`;
            inner += `const ${keyVar} = ${keys}[${i}];`;
            inner += writeString(ctx, keyVar);
            inner += `}`;
            if (s.field.type === 'boolean') {
                const valIdx = variable(ctx, 'valIdx');
                const byteVar = variable(ctx, 'byte');
                inner += `{`;
                inner += `let ${byteVar};`;
                inner += `for (let ${valIdx} = 0; ${valIdx} < Math.ceil(${keysLen} / 8); ${valIdx}++) {`;
                inner += `${byteVar} = 0;`;
                inner += `for (let bit = 0; bit < 8; bit++) {`;
                inner += `const idx = ${valIdx} * 8 + bit;`;
                inner += `if (idx >= ${keysLen}) break;`;
                inner += `if (${v}[${keys}[idx]]) ${byteVar} |= (1 << bit);`;
                inner += `}`;
                inner += `u8[o++] = ${byteVar};`;
                inner += `}`;
                inner += `}`;
            } else {
                const valIdx = variable(ctx, 'valIdx');
                const valVar = variable(ctx, 'val');
                inner += `for (let ${valIdx} = 0; ${valIdx} < ${keysLen}; ${valIdx}++) {`;
                inner += `const ${valVar} = ${v}[${keys}[${valIdx}]];`;
                inner += pack(ctx, s.field, valVar);
                inner += `}`;
            }
            return inner;
        },
        unpack: (ctx, s, target) => {
            const i = variable(ctx, 'i');
            const k = variable(ctx, 'k');
            const count = variable(ctx, 'count');
            const keys = variable(ctx, 'keys');
            let inner = '';
            inner += `let ${count};`;
            inner += readVaruint(count);
            inner += `${target} = {};`;
            inner += `const ${keys} = new Array(${count});`;
            inner += `for (let ${i} = 0; ${i} < ${count}; ${i}++) { `;
            inner += `let ${k};`;
            inner += readString(k);
            inner += `${keys}[${i}] = ${k};`;
            inner += `}`;
            if (s.field.type === 'boolean') {
                const byteIdx = variable(ctx, 'bval');
                const valIdx = variable(ctx, 'valIdx');
                inner += `{`;
                inner += `for (let ${valIdx} = 0; ${valIdx} < Math.ceil(${count} / 8); ${valIdx}++) {`;
                inner += `const ${byteIdx} = u8[o++];`;
                inner += `for (let bit = 0; bit < 8; bit++) {`;
                inner += `const idx = ${valIdx} * 8 + bit;`;
                inner += `if (idx >= ${count}) break;`;
                inner += `${target}[${keys}[idx]] = (${byteIdx} & (1 << bit)) !== 0;`;
                inner += `}`;
                inner += `}`;
                inner += `}`;
            } else {
                const valIdx = variable(ctx, 'valIdx');
                inner += `for (let ${valIdx} = 0; ${valIdx} < ${count}; ${valIdx}++) { `;
                inner += unpack(ctx, s.field, `${target}[${keys}[${valIdx}]]`);
                inner += `}`;
            }
            return inner;
        },
        validate: (ctx, s, v) => {
            const i = variable(ctx, 'i');
            const keys = variable(ctx, 'keys');
            let inner = '';
            inner += `if (typeof (${v}) !== "object") return false;`;
            inner += `${keys} = Object.keys(${v});`;
            inner += `for (let ${i} = 0; ${i} < ${keys}.length; ${i}++) {`;
            inner += validate(ctx, s.field, `${v}[${keys}[${i}]]`);
            inner += `}`;
            return inner;
        },
    },

    // 1-byte flag: 0 = null, 1 = present
    nullable: {
        size: (ctx, s, v) => {
            const child = size(ctx, s.of, v);
            let inner = '';
            inner += `if (${v} !== null) {`;
            inner += child.code;
            inner += `size += ${child.fixed};`;
            inner += `}`;
            return { code: inner, fixed: 1 };
        },
        pack: (ctx, s, v) => {
            let inner = '';
            inner += `if (${v} === null) {`;
            inner += `u8[o++] = 0;`;
            inner += `} else {`;
            inner += `u8[o++] = 1;`;
            inner += pack(ctx, s.of, v);
            inner += `}`;
            return inner;
        },
        unpack: (ctx, s, target) => {
            const flag = variable(ctx, 'flag');
            let inner = '';
            inner += `const ${flag} = u8[o++];`;
            inner += `if (${flag} === 0) {`;
            inner += `${target} = null;`;
            inner += `} else {`;
            inner += unpack(ctx, s.of, target);
            inner += `}`;
            return inner;
        },
        validate: (ctx, s, v) => {
            let inner = '';
            inner += `if (${v} === null) return true;`;
            inner += validate(ctx, s.of, v);
            return inner;
        },
    },

    // 1-byte flag: 0 = undefined, 1 = present
    optional: {
        size: (ctx, s, v) => {
            const child = size(ctx, s.of, v);
            let inner = '';
            inner += `if (${v} !== undefined) {`;
            inner += child.code;
            inner += `size += ${child.fixed};`;
            inner += `}`;
            return { code: inner, fixed: 1 };
        },
        pack: (ctx, s, v) => {
            let inner = '';
            inner += `if (${v} === undefined) {`;
            inner += `u8[o++] = 0;`;
            inner += `} else {`;
            inner += `u8[o++] = 1;`;
            inner += pack(ctx, s.of, v);
            inner += `}`;
            return inner;
        },
        unpack: (ctx, s, target) => {
            const flag = variable(ctx, 'flag');
            let inner = '';
            inner += `const ${flag} = u8[o++];`;
            inner += `if (${flag} === 1) {`;
            inner += unpack(ctx, s.of, target);
            inner += `}`;
            return inner;
        },
        validate: (ctx, s, v) => {
            let inner = '';
            inner += `if (${v} === undefined) return true;`;
            inner += validate(ctx, s.of, v);
            return inner;
        },
    },

    // 1-byte flag: 0 = null, 1 = undefined, 2 = present
    nullish: {
        size: (ctx, s, v) => {
            const child = size(ctx, s.of, v);
            let inner = '';
            inner += `if (${v} !== null && ${v} !== undefined) {`;
            inner += child.code;
            inner += `size += ${child.fixed};`;
            inner += `}`;
            return { code: inner, fixed: 1 };
        },
        pack: (ctx, s, v) => {
            let inner = '';
            inner += `if (${v} === null) {`;
            inner += `u8[o++] = 0;`;
            inner += `} else if (${v} === undefined) {`;
            inner += `u8[o++] = 1;`;
            inner += `} else {`;
            inner += `u8[o++] = 2;`;
            inner += pack(ctx, s.of, v);
            inner += `}`;
            return inner;
        },
        unpack: (ctx, s, target) => {
            const flag = variable(ctx, 'flag');
            let inner = '';
            inner += `const ${flag} = u8[o++];`;
            inner += `if (${flag} === 0) {`;
            inner += `${target} = null;`;
            inner += `} else if (${flag} === 2) {`;
            inner += unpack(ctx, s.of, target);
            inner += `}`;
            return inner;
        },
        validate: (ctx, s, v) => {
            let inner = '';
            inner += `if (${v} === null || ${v} === undefined) return true;`;
            inner += validate(ctx, s.of, v);
            return inner;
        },
    },

    // discriminated union: varuint tag selects variant, discriminant field must be a literal
    union: {
        size: (ctx, s, v) => {
            const keyVar = variable(ctx, 'keyVal');
            let inner = '';
            inner += `const ${keyVar} = ${v}[${JSON.stringify(s.key)}];`;
            for (let i = 0; i < s.variants.length; i++) {
                const variant = s.variants[i];
                const disc = variant.fields[s.key];
                if (disc.type !== 'literal') {
                    throw new Error('Union discriminant must be a literal in every variant');
                }
                const discriminant = disc.value;
                const elem = size(ctx, variant, v);
                inner += ` ${i !== 0 ? 'else' : ''} if (${keyVar} === ${JSON.stringify(discriminant)}) { ${varuintSize(i.toString())} size += ${elem.fixed}; ${elem.code} }`;
            }
            inner += ` else { throw new Error('Invalid discriminant for union key: ' + ${keyVar}); }`;
            return { code: inner, fixed: 0 };
        },
        pack: (ctx, s, v) => {
            const discriminant = variable(ctx, 'discriminant');
            let inner = '';
            inner += `const ${discriminant} = ${v}[${JSON.stringify(s.key)}];`;
            for (let i = 0; i < s.variants.length; i++) {
                const variant = s.variants[i];
                const disc = variant.fields[s.key];
                if (!disc || disc.type !== 'literal') {
                    throw new Error('Union discriminant must be a literal in every variant');
                }
                const lit = disc.value;
                if (i === 0) {
                    inner += `if (${discriminant} === ${JSON.stringify(lit)}) { ${writeVaruint(i.toString())} ${pack(ctx, variant, v)} }`;
                } else {
                    inner += ` else if (${discriminant} === ${JSON.stringify(lit)}) { ${writeVaruint(i.toString())} ${pack(ctx, variant, v)} }`;
                }
            }
            inner += ` else { throw new Error('Invalid discriminant for union key at serialize: ' + ${discriminant}); }`;
            return inner;
        },
        unpack: (ctx, s, target) => {
            const tag = variable(ctx, 'tag');
            let out = '';
            out += `let ${tag};`;
            out += readVaruint(tag);
            out += `${target} = {};`;
            out += `switch (${tag}) {`;
            for (let i = 0; i < s.variants.length; i++) {
                out += `case ${i}: `;
                out += unpack(ctx, s.variants[i], target);
                out += ` break;`;
            }
            out += `default: throw new Error('Invalid union tag: ' + ${tag});`;
            out += `}`;
            return out;
        },
        validate: (ctx, s, v) => {
            let inner = '';
            inner += `if (typeof (${v}) !== "object") return false;`;
            const keyVar = variable(ctx, 'key');
            inner += `const ${keyVar} = ${v}[${JSON.stringify(s.key)}];`;
            let first = true;
            for (let i = 0; i < s.variants.length; i++) {
                const variant = s.variants[i];
                const disc = variant.fields[s.key];
                if (!disc || disc.type !== 'literal') {
                    throw new Error('Union discriminant must be a literal in every variant');
                }
                const lit = disc.value;
                if (first) {
                    inner += `if (${keyVar} === ${JSON.stringify(lit)}) {`;
                    first = false;
                } else {
                    inner += ` else if (${keyVar} === ${JSON.stringify(lit)}) {`;
                }
                inner += validate(ctx, variant, v);
                inner += ` }`;
            }
            inner += ` else { return false; }`;
            return inner;
        },
    },
};

/* read/write utils */

function varuintSize(value: string): string {
    return `vuint = ${value} >>> 0; while (vuint > 127) { size++; vuint >>>= 7; } size += 1;`;
}

function writeVaruint(value: string, offset = 'o'): string {
    return `vuint = ${value} >>> 0; while (vuint > 127) { u8[${offset}++] = (vuint & 127) | 128; vuint >>>= 7; } u8[${offset}++] = vuint & 127;`;
}

function readVaruint(target: string, offset = 'o'): string {
    let code = '';
    code += `val = 0; shift = 0; byte = 0;`;
    code += `do { byte = u8[${offset}++]; val |= (byte & 0x7f) << shift; shift += 7; } while ((byte & 0x80) !== 0);`;
    code += `${target} = val >>> 0;`;
    return code;
}

// zigzag encoding: map signed to unsigned so small negatives are small too
function varintSize(value: string): string {
    return `vint = ((${value} << 1) ^ (${value} >> 31)) >>> 0; ${varuintSize('vint')}`;
}

function writeVarint(value: string, offset = 'o'): string {
    return `vint = (${value} << 1) ^ (${value} >> 31); ${writeVaruint('vint', offset)}`;
}

function readVarint(target: string, offset = 'o'): string {
    let code = readVaruint('val', offset);
    code += `${target} = (val >>> 1) ^ -(val & 1);`;
    return code;
}

function readBool(target: string, offset = 'o'): string {
    return `${target} = u8[${offset}++] !== 0;`;
}

function writeBool(value: string, offset = 'o'): string {
    return `u8[${offset}++] = ${value} ? 1 : 0;`;
}

// shift left then arithmetic shift right to sign-extend
function readI8(target: string, offset = 'o'): string {
    return `${target} = (u8[${offset}++] << 24) >> 24;`;
}

function writeI8(value: string, offset = 'o'): string {
    return `u8[${offset}++] = ${value};`;
}

function readU8(target: string, offset = 'o'): string {
    return `${target} = u8[${offset}++];`;
}

function writeU8(value: string, offset = 'o'): string {
    return `u8[${offset}++] = ${value} & 0xff;`;
}

function readI16(target: string, offset = 'o'): string {
    return `val = u8[${offset}++] | (u8[${offset}++] << 8); ${target} = (val << 16) >> 16;`;
}

function writeI16(value: string, offset = 'o'): string {
    return `val = ${value} & 0xffff; u8[${offset}++] = val & 0xff; u8[${offset}++] = (val >> 8) & 0xff;`;
}

function readU16(target: string, offset = 'o'): string {
    return `val = u8[${offset}++] | (u8[${offset}++] << 8); ${target} = val & 0xffff;`;
}

function writeU16(value: string, offset = 'o'): string {
    return `val = ${value} & 0xffff; u8[${offset}++] = val & 0xff; u8[${offset}++] = (val >> 8) & 0xff;`;
}

function readI32(target: string, offset = 'o'): string {
    return `val = (u8[${offset}++] | (u8[${offset}++] << 8) | (u8[${offset}++] << 16) | (u8[${offset}++] << 24)) | 0; ${target} = val | 0;`;
}

function writeI32(value: string, offset = 'o'): string {
    return `val = ${value} | 0; u8[${offset}++] = val & 0xff; u8[${offset}++] = (val >> 8) & 0xff; u8[${offset}++] = (val >> 16) & 0xff; u8[${offset}++] = (val >> 24) & 0xff;`;
}

function readU32(target: string, offset = 'o'): string {
    return `${target} = (u8[${offset}++] | (u8[${offset}++] << 8) | (u8[${offset}++] << 16) | (u8[${offset}++] << 24)) >>> 0;`;
}

function writeU32(value: string, offset = 'o'): string {
    return `val = ${value} >>> 0; u8[${offset}++] = val & 0xff; u8[${offset}++] = (val >> 8) & 0xff; u8[${offset}++] = (val >> 16) & 0xff; u8[${offset}++] = (val >> 24) & 0xff;`;
}

function readI64(target: string, offset = 'o'): string {
    let code = '';
    code += `i64_u8[0] = u8[${offset}++]; i64_u8[1] = u8[${offset}++]; i64_u8[2] = u8[${offset}++]; i64_u8[3] = u8[${offset}++];`;
    code += `i64_u8[4] = u8[${offset}++]; i64_u8[5] = u8[${offset}++]; i64_u8[6] = u8[${offset}++]; i64_u8[7] = u8[${offset}++];`;
    code += `${target} = i64[0];`;
    return code;
}

function writeI64(value: string, offset = 'o'): string {
    let code = '';
    code += `i64[0] = ${value};`;
    code += `u8[${offset}++] = i64_u8[0]; u8[${offset}++] = i64_u8[1]; u8[${offset}++] = i64_u8[2]; u8[${offset}++] = i64_u8[3];`;
    code += `u8[${offset}++] = i64_u8[4]; u8[${offset}++] = i64_u8[5]; u8[${offset}++] = i64_u8[6]; u8[${offset}++] = i64_u8[7];`;
    return code;
}

function readU64(target: string, offset = 'o'): string {
    let code = '';
    code += `u64_u8[0] = u8[${offset}++]; u64_u8[1] = u8[${offset}++]; u64_u8[2] = u8[${offset}++]; u64_u8[3] = u8[${offset}++];`;
    code += `u64_u8[4] = u8[${offset}++]; u64_u8[5] = u8[${offset}++]; u64_u8[6] = u8[${offset}++]; u64_u8[7] = u8[${offset}++];`;
    code += `${target} = u64[0];`;
    return code;
}

function writeU64(value: string, offset = 'o'): string {
    let code = '';
    code += `u64[0] = ${value};`;
    code += `u8[${offset}++] = u64_u8[0]; u8[${offset}++] = u64_u8[1]; u8[${offset}++] = u64_u8[2]; u8[${offset}++] = u64_u8[3];`;
    code += `u8[${offset}++] = u64_u8[4]; u8[${offset}++] = u64_u8[5]; u8[${offset}++] = u64_u8[6]; u8[${offset}++] = u64_u8[7];`;
    return code;
}

function readF16(target: string, offset = 'o'): string {
    let code = '';
    code += `f16_u8[0] = u8[${offset}++]; f16_u8[1] = u8[${offset}++];`;
    code += `${target} = f16[0];`;
    return code;
}

function writeF16(value: string, offset = 'o'): string {
    let code = '';
    code += `f16[0] = ${value};`;
    code += `u8[${offset}++] = f16_u8[0]; u8[${offset}++] = f16_u8[1];`;
    return code;
}

function readF32(target: string, offset = 'o'): string {
    let code = '';
    code += `f32_u8[0] = u8[${offset}++]; f32_u8[1] = u8[${offset}++]; f32_u8[2] = u8[${offset}++]; f32_u8[3] = u8[${offset}++];`;
    code += `${target} = f32[0];`;
    return code;
}

function writeF32(value: string, offset = 'o'): string {
    let code = '';
    code += `f32[0] = ${value};`;
    code += `u8[${offset}++] = f32_u8[0]; u8[${offset}++] = f32_u8[1]; u8[${offset}++] = f32_u8[2]; u8[${offset}++] = f32_u8[3];`;
    return code;
}

function readF64(target: string, offset = 'o'): string {
    let code = '';
    code += `f64_u8[0] = u8[${offset}++]; f64_u8[1] = u8[${offset}++]; f64_u8[2] = u8[${offset}++]; f64_u8[3] = u8[${offset}++];`;
    code += `f64_u8[4] = u8[${offset}++]; f64_u8[5] = u8[${offset}++]; f64_u8[6] = u8[${offset}++]; f64_u8[7] = u8[${offset}++];`;
    code += `${target} = f64[0];`;
    return code;
}

function writeF64(value: string, offset = 'o'): string {
    let code = '';
    code += `f64[0] = ${value};`;
    code += `u8[${offset}++] = f64_u8[0]; u8[${offset}++] = f64_u8[1]; u8[${offset}++] = f64_u8[2]; u8[${offset}++] = f64_u8[3];`;
    code += `u8[${offset}++] = f64_u8[4]; u8[${offset}++] = f64_u8[5]; u8[${offset}++] = f64_u8[6]; u8[${offset}++] = f64_u8[7];`;
    return code;
}

function readString(target: string, offset = 'o'): string {
    let code = '';
    code += readVaruint('len', offset);
    code += `${target} = len === 0 ? '' : textDecoder.decode(u8.subarray(${offset}, ${offset} + len)); ${offset} += len;`;
    return code;
}

function writeString(ctx: Context, value: string, offset = 'o'): string {
    let code = '';
    const strVar = variable(ctx, 'str');
    code += `const ${strVar} = ${value};`;
    code += `len = utf8Length(${strVar});`;
    code += writeVaruint('len', offset);
    code += `textEncoder.encodeInto(${strVar}, u8.subarray(${offset}));`;
    code += `${offset} += len;`;
    return code;
}
