import type { Schema, SchemaType } from './schema';

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

let variableCounter = 0;

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

export function build<S extends Schema>(
    schema: S,
): {
    ser: (value: SchemaType<S>) => Uint8Array;
    des: (u8: Uint8Array) => SchemaType<S>;
    validate: (value: SchemaType<S>) => boolean;
    source: { ser: string; des: string; validate: string };
} {
    const serSource = buildSer(schema);

    const ser = new Function('textEncoder', 'f16', 'f16_u8', 'f32', 'f32_u8', 'f64', 'f64_u8', 'i64', 'i64_u8', 'u64', 'u64_u8', 'utf8Length', 'value', serSource).bind(
        null,
        textEncoder,
        f16,
        f16_u8,
        f32,
        f32_u8,
        f64,
        f64_u8,
        i64,
        i64_u8,
        u64,
        u64_u8,
        utf8Length,
    ) as (value: SchemaType<S>) => Uint8Array;

    const desSource = buildDes(schema);

    const des = new Function('textDecoder', 'f16', 'f16_u8', 'f32', 'f32_u8', 'f64', 'f64_u8', 'i64', 'i64_u8', 'u64', 'u64_u8', 'u8', desSource).bind(
        null,
        textDecoder,
        f16,
        f16_u8,
        f32,
        f32_u8,
        f64,
        f64_u8,
        i64,
        i64_u8,
        u64,
        u64_u8,
    ) as (u8: Uint8Array) => SchemaType<S>;

    const validateSource = buildValidate(schema);

    const validate = new Function('value', validateSource) as (value: SchemaType<S>) => boolean;

    return { ser, des, validate, source: { ser: serSource, des: desSource, validate: validateSource } };
}

function buildSer(schema: Schema): string {
    variableCounter = 1;
    
    let code = '';

    code += 'let len = 0;';
    code += 'let vint = 0;';
    code += 'let vuint = 0;';
    code += 'let keys;';
    code += 'let val = 0;';
    code += 'let textEncoderResult;';

    type SizeCalc = { code: string; fixed: number };

    function size(s: Schema, v: string): SizeCalc {
        switch (s.type) {
            case 'boolean':
            case 'int8':
            case 'uint8':
                return { code: '', fixed: 1 };
            case 'int16':
            case 'uint16':
            case 'float16':
                return { code: '', fixed: 2 };
            case 'int32':
            case 'uint32':
            case 'float32':
                return { code: '', fixed: 4 };
            case 'int64':
            case 'uint64':
            case 'float64':
                return { code: '', fixed: 8 };
            case 'quantized': {
                // Calculate bits needed, round up to bytes
                const steps = Math.ceil((s.max - s.min) / s.step);
                const bits = Math.ceil(Math.log2(steps));
                const bytes = Math.ceil(bits / 8);
                return { code: '', fixed: bytes };
            }
            case 'quat': {
                // Calculate bits from step, range is -1/√2 to 1/√2 (√2 total range)
                const steps = Math.ceil(Math.SQRT2 / s.step);
                const bits = Math.ceil(Math.log2(steps));
                
                // 1 byte metadata + component bytes
                let bytes = 1; // metadata byte
                if (bits <= 8) {
                    bytes += 3; // 3 components x 1 byte each
                } else if (bits <= 16) {
                    bytes += 6; // 3 components x 2 bytes each
                } else {
                    bytes += 12; // 3 components x 4 bytes each
                }
                return { code: '', fixed: bytes };
            }
            case 'uv2': {
                // Calculate bits from step, range is 0 to 2π
                const steps = Math.ceil((Math.PI * 2) / s.step);
                const bits = Math.ceil(Math.log2(steps));
                const bytes = Math.ceil(bits / 8);
                return { code: '', fixed: bytes };
            }
            case 'uv3': {
                // Calculate bits from step, range is -1/√2 to 1/√2 (√2 total range)
                const steps = Math.ceil(Math.SQRT2 / s.step);
                const bits = Math.ceil(Math.log2(steps));
                
                // 2 bits for index + 1 bit for sign + (bits * 2) for components
                const totalBits = 2 + 1 + bits * 2;
                const bytes = Math.ceil(totalBits / 8);
                return { code: '', fixed: bytes };
            }
            case 'string': {
                const strVar = variable('str');
                const code = `const ${strVar} = ${v}; len = utf8Length(${strVar}); ${varuintSize('len')} size += len;`;
                return { code, fixed: 0 };
            }
            case 'varint': {
                return { code: varintSize(v), fixed: 0 };
            }
            case 'varuint': {
                return { code: varuintSize(v), fixed: 0 };
            }
            case 'uint8Array': {
                if ('length' in s && typeof s.length === 'number') {
                    // fixed-length: just the bytes
                    return { code: '', fixed: s.length };
                }
                // variable-length: varuint length prefix followed by raw bytes
                const lenVar = variable('len');
                return { code: `const ${lenVar} = ${v}.length; ${varuintSize(lenVar)} size += ${lenVar};`, fixed: 0 };
            }
            case 'list': {
                if ('length' in s && typeof s.length === 'number') {
                    // fixed-length list: each element exists at compile time
                    const i = variable('i');
                    const elem = size(s.of, `${v}[${i}]`);
                    // if the element is fully fixed-size, we can compute total size at compile time
                    if (elem.code === '' && elem.fixed > 0) {
                        return { code: '', fixed: elem.fixed * s.length };
                    }
                    // element-wise computation at runtime for dynamic parts
                    const inner = `for (let ${i} = 0; ${i} < ${s.length}; ${i}++) { ${elem.code} }`;
                    return { code: inner, fixed: 0 };
                } else {
                    // variable-length list: include varuint length prefix and per-element dynamic parts
                    const i = variable('i');
                    const lenVar = variable('len');
                    const elem = size(s.of, `${v}[${i}]`);

                    let parts = '';
                    parts += `const ${lenVar} = ${v}.length;`;
                    parts += varuintSize(lenVar);
                    if (elem.fixed > 0) {
                        // account for unconditional fixed bytes per element
                        parts += `size += ${elem.fixed} * ${lenVar};`;
                    }
                    if (elem.code && elem.code !== '') {
                        parts += `for (let ${i} = 0; ${i} < ${lenVar}; ${i}++) { ${elem.code} }`;
                    }

                    return { code: parts, fixed: 0 };
                }
            }
            case 'literal': {
                // literal values are known ahead-of-time and are not serialized at all.
                // they contribute zero bytes to the encoded form and when deserialising
                // we simply inject the known value.
                return { code: '', fixed: 0 };
            }
            case 'object': {
                // sum all unconditional fixed child sizes into fixed; collect dynamic parts separately.
                let fixed = 0;
                const parts: string[] = [];
                // Sort keys for deterministic serialization order
                const sortedKeys = Object.keys(s.fields).sort();
                for (const k of sortedKeys) {
                    const f = s.fields[k];
                    const child = size(f, `${v}[${JSON.stringify(k)}]`);
                    // always accumulate unconditional fixed bytes
                    fixed += child.fixed;
                    if (child.code !== '') {
                        parts.push(child.code);
                    }
                }
                return { code: parts.join(' '), fixed };
            }
            case 'tuple': {
                let fixed = 0;
                const parts: string[] = [];
                for (let i = 0; i < s.of.length; i++) {
                    const child = size(s.of[i], `${v}[${i}]`);
                    fixed += child.fixed;
                    if (child.code !== '') {
                        parts.push(child.code);
                    }
                }
                return { code: parts.join(' '), fixed };
            }
            case 'record': {
                const i = variable('i');
                const keys = variable('keys');
                const keysLen = variable('keysLen');

                const childSize = size(s.field, `${v}[k]`);

                let inner = '';
                inner += `if (${v} && typeof ${v} === 'object') {`;
                inner += `const ${keys} = Object.keys(${v});`;
                inner += `const ${keysLen} = ${keys}.length;`;
                inner += `${varuintSize(keysLen)}`;
                if (childSize.fixed > 0) {
                    inner += ` size += ${childSize.fixed} * ${keysLen}; `;
                }
                const strVar = variable('str');
                inner += `for (let ${i} = 0; ${i} < ${keysLen}; ${i}++) { const k = ${keys}[${i}]; const ${strVar} = k; len = utf8Length(${strVar}); ${varuintSize('len')} size += len; `;
                if (childSize.code !== '') {
                    inner += childSize.code;
                }
                inner += `}}`;
                return { code: inner, fixed: 0 };
            }
            case 'bitset': {
                const bytes = Math.ceil(s.keys.length / 8);
                return { code: '', fixed: bytes };
            }
            case 'nullable': {
                const child = size(s.of, v);

                let inner = '';
                inner += `if (${v} !== null) {`;
                inner += child.code;
                inner += `size += ${child.fixed};`;
                inner += `}`;

                return { code: inner, fixed: 1 };
            }
            case 'optional': {
                const child = size(s.of, v);

                let inner = '';
                inner += `if (${v} !== undefined) {`;
                inner += child.code;
                inner += `size += ${child.fixed};`;
                inner += `}`;

                return { code: inner, fixed: 1 };
            }
            case 'nullish': {
                const child = size(s.of, v);

                let inner = '';
                inner += `if (${v} !== null && ${v} !== undefined) {`;
                inner += child.code;
                inner += `size += ${child.fixed};`;
                inner += `}`;

                return { code: inner, fixed: 1 };
            }
            case 'union': {
                // discriminated union: each variant MUST have a literal
                // discriminant in the field `s.key`. At runtime we compare the
                // object's discriminant value against those literals and add
                // the size for the matching variant. We encode a varuint tag
                // (the variant index) followed by the variant data.
                const keyVar = variable('keyVal');

                let inner = '';
                inner += `const ${keyVar} = ${v}[${JSON.stringify(s.key)}];`;

                // build an if/else chain comparing the discriminant to each
                // variant's literal value. Throw at runtime if no variant
                // matches.
                for (let i = 0; i < s.variants.length; i++) {
                    const variant = s.variants[i];
                    const disc = variant.fields[s.key];

                    if (disc.type !== 'literal') {
                        throw new Error('Union discriminant must be a literal in every variant');
                    }

                    const discriminant = disc.value;
                    const elem = size(variant, v);

                    inner += ` ${i !== 0 ? 'else' : ''} if (${keyVar} === ${JSON.stringify(discriminant)}) { ${varuintSize(i.toString())} size += ${elem.fixed}; ${elem.code} }`;
                }

                inner += ` else { throw new Error('Invalid discriminant for union key: ' + ${keyVar}); }`;

                return { code: inner, fixed: 0 };
            }
            default: {
                return {
                    code: `throw new Error('Unsupported schema: ${s}');`,
                    fixed: 0,
                };
            }
        }
    }

    const calc = size(schema, 'value');

    code += `let size = ${calc.fixed};`;
    code += calc.code;

    code += 'const arrayBuffer = new ArrayBuffer(size);';
    code += 'let o = 0;';

    code += 'const u8 = new Uint8Array(arrayBuffer); ';

    function ser(s: Schema, v: string): string {
        switch (s.type) {
            case 'boolean':
                return writeBool(v);
            case 'int8':
                return writeI8(v);
            case 'uint8':
                return writeU8(v);
            case 'int16':
                return writeI16(v);
            case 'uint16':
                return writeU16(v);
            case 'int32':
                return writeI32(v);
            case 'uint32':
                return writeU32(v);
            case 'int64':
                return writeI64(v);
            case 'uint64':
                return writeU64(v);
            case 'float16':
                return writeF16(v);
            case 'float32':
                return writeF32(v);
            case 'float64':
                return writeF64(v);
            case 'quantized': {
                // quantize value to discrete steps
                const steps = Math.ceil((s.max - s.min) / s.step);
                const bits = Math.ceil(Math.log2(steps));
                const bytes = Math.ceil(bits / 8);
                const maxVal = (1 << bits) - 1;
                
                const clampedVar = variable('clamped');
                const quantVar = variable('quant');
                
                // clamp input value to [min, max] range, then quantize to step index
                let code = `const ${clampedVar} = Math.max(${s.min}, Math.min(${s.max}, ${v}));`;
                code += `const ${quantVar} = Math.max(0, Math.min(${maxVal}, Math.round((${clampedVar} - ${s.min}) / ${s.step})));`;
                
                if (bytes === 1) {
                    code += writeU8(quantVar);
                } else if (bytes === 2) {
                    code += writeU16(quantVar);
                } else if (bytes <= 4) {
                    code += writeU32(quantVar);
                } else {
                    code += writeVaruint(quantVar);
                }
                
                return code;
            }
            case 'quat': {
                // Smallest-three encoding
                // Calculate bits from step
                const steps = Math.ceil(Math.SQRT2 / s.step);
                const bits = Math.ceil(Math.log2(steps));
                const maxVal = (1 << bits) - 1;
                const scale = maxVal / Math.sqrt(2); // max component value is 1/√2
                
                const qx = `${v}[0]`;
                const qy = `${v}[1]`;
                const qz = `${v}[2]`;
                const qw = `${v}[3]`;
                
                const ax = variable('ax');
                const ay = variable('ay');
                const az = variable('az');
                const aw = variable('aw');
                const maxIdx = variable('maxIdx');
                const c0 = variable('c0');
                const c1 = variable('c1');
                const c2 = variable('c2');
                const sign = variable('sign');
                
                let code = '';
                // Find largest component by absolute value
                code += `const ${ax} = Math.abs(${qx}), ${ay} = Math.abs(${qy}), ${az} = Math.abs(${qz}), ${aw} = Math.abs(${qw});`;
                code += `let ${maxIdx} = 0;`;
                code += `if (${ay} > ${ax}) ${maxIdx} = 1;`;
                code += `if (${az} > (${maxIdx} === 0 ? ${ax} : ${ay})) ${maxIdx} = 2;`;
                code += `if (${aw} > (${maxIdx} === 0 ? ${ax} : ${maxIdx} === 1 ? ${ay} : ${az})) ${maxIdx} = 3;`;
                
                // Get the three smallest components and the sign of largest
                code += `let ${c0}, ${c1}, ${c2}, ${sign};`;
                code += `if (${maxIdx} === 0) { ${c0} = ${qy}; ${c1} = ${qz}; ${c2} = ${qw}; ${sign} = ${qx} < 0 ? 1 : 0; }`;
                code += `else if (${maxIdx} === 1) { ${c0} = ${qx}; ${c1} = ${qz}; ${c2} = ${qw}; ${sign} = ${qy} < 0 ? 1 : 0; }`;
                code += `else if (${maxIdx} === 2) { ${c0} = ${qx}; ${c1} = ${qy}; ${c2} = ${qw}; ${sign} = ${qz} < 0 ? 1 : 0; }`;
                code += `else { ${c0} = ${qx}; ${c1} = ${qy}; ${c2} = ${qz}; ${sign} = ${qw} < 0 ? 1 : 0; }`;
                
                // Quantize components
                code += `${c0} = Math.max(0, Math.min(${maxVal}, Math.round((${c0} + ${1 / Math.sqrt(2)}) * ${scale})));`;
                code += `${c1} = Math.max(0, Math.min(${maxVal}, Math.round((${c1} + ${1 / Math.sqrt(2)}) * ${scale})));`;
                code += `${c2} = Math.max(0, Math.min(${maxVal}, Math.round((${c2} + ${1 / Math.sqrt(2)}) * ${scale})));`;
                
                // Write metadata byte (2 bits index + 1 bit sign)
                code += `u8[o++] = (${maxIdx} << 1) | ${sign};`;
                
                // Write components based on bit size
                if (bits <= 8) {
                    // Components fit in 1 byte each
                    code += `u8[o++] = ${c0};`;
                    code += `u8[o++] = ${c1};`;
                    code += `u8[o++] = ${c2};`;
                } else if (bits <= 16) {
                    // Components need 2 bytes each
                    code += writeU16(c0);
                    code += writeU16(c1);
                    code += writeU16(c2);
                } else {
                    // Fallback: write as 32-bit
                    code += writeU32(c0);
                    code += writeU32(c1);
                    code += writeU32(c2);
                }
                
                return code;
            }
            case 'uv2': {
                // Encode as angle
                // Calculate bits from step
                const steps = Math.ceil((Math.PI * 2) / s.step);
                const bits = Math.ceil(Math.log2(steps));
                const maxVal = (1 << bits) - 1;
                const angle = variable('angle');
                const quantized = variable('quant');
                
                let code = '';
                // atan2 returns [-π, π], normalize to [0, 2π]
                code += `let ${angle} = Math.atan2(${v}[1], ${v}[0]);`;
                code += `if (${angle} < 0) ${angle} += ${Math.PI * 2};`;
                code += `const ${quantized} = Math.round(${angle} / ${Math.PI * 2} * ${maxVal}) & ${maxVal};`;
                
                const bytes = Math.ceil(bits / 8);
                if (bytes === 1) {
                    code += writeU8(quantized);
                } else if (bytes === 2) {
                    code += writeU16(quantized);
                } else {
                    code += writeU32(quantized);
                }
                
                return code;
            }
            case 'uv3': {
                // Smallest-two encoding (similar to quaternion)
                // Calculate bits from step
                const steps = Math.ceil(Math.SQRT2 / s.step);
                const bits = Math.ceil(Math.log2(steps));
                const maxVal = (1 << bits) - 1;
                const scale = maxVal / Math.sqrt(2);
                
                const vx = `${v}[0]`;
                const vy = `${v}[1]`;
                const vz = `${v}[2]`;
                
                const ax = variable('ax');
                const ay = variable('ay');
                const az = variable('az');
                const maxIdx = variable('maxIdx');
                const c0 = variable('c0');
                const c1 = variable('c1');
                const sign = variable('sign');
                const packed = variable('packed');
                
                let code = '';
                // Find largest component
                code += `const ${ax} = Math.abs(${vx}), ${ay} = Math.abs(${vy}), ${az} = Math.abs(${vz});`;
                code += `let ${maxIdx} = 0;`;
                code += `if (${ay} > ${ax}) ${maxIdx} = 1;`;
                code += `if (${az} > (${maxIdx} === 0 ? ${ax} : ${ay})) ${maxIdx} = 2;`;
                
                // Get two smallest components and sign of largest
                code += `let ${c0}, ${c1}, ${sign};`;
                code += `if (${maxIdx} === 0) { ${c0} = ${vy}; ${c1} = ${vz}; ${sign} = ${vx} < 0 ? 1 : 0; }`;
                code += `else if (${maxIdx} === 1) { ${c0} = ${vx}; ${c1} = ${vz}; ${sign} = ${vy} < 0 ? 1 : 0; }`;
                code += `else { ${c0} = ${vx}; ${c1} = ${vy}; ${sign} = ${vz} < 0 ? 1 : 0; }`;
                
                // Quantize
                code += `${c0} = Math.max(0, Math.min(${maxVal}, Math.round((${c0} + ${1 / Math.sqrt(2)}) * ${scale})));`;
                code += `${c1} = Math.max(0, Math.min(${maxVal}, Math.round((${c1} + ${1 / Math.sqrt(2)}) * ${scale})));`;
                
                // Pack
                const totalBits = 2 + 1 + bits * 2;
                const bytes = Math.ceil(totalBits / 8);
                code += `let ${packed} = (${maxIdx} << ${totalBits - 2}) | (${sign} << ${totalBits - 3}) | (${c0} << ${bits}) | ${c1};`;
                
                // Write bytes
                for (let i = bytes - 1; i >= 0; i--) {
                    code += `u8[o++] = (${packed} >> ${i * 8}) & 0xFF;`;
                }
                
                return code;
            }
            case 'string': 
                return writeString(v);
            case 'varint': 
                return writeVarint(v);
            case 'varuint':
                return writeVaruint(v);
            case 'uint8Array': {
                if ('length' in s && typeof s.length === 'number') {
                    // fixed-length: direct byte copy
                    return `u8.set(${v}, o); o += ${s.length};`;
                }
                // variable-length: write varuint length then copy raw bytes
                const lenVar = variable('len');
                let inner = '';
                inner += `const ${lenVar} = ${v}.length;`;
                inner += writeVaruint(lenVar);
                inner += `u8.set(${v}, o); o += ${lenVar};`;
                return inner;
            }
            case 'list': {
                if (s.length !== undefined) {
                    // generate unrolled fixed-length list serialization
                    let inner = '';
                    for (let i = 0; i < s.length; i++) {
                        inner += ser(s.of, `${v}[${i}]`);
                    }
                    return inner;
                } else {
                    // generate dynamic list serialization
                    const i = variable('i');
                    const lenVar = variable('len');

                    let inner = '';
                    inner += `const ${lenVar} = ${v}.length;`;
                    inner += writeVaruint(lenVar);
                    inner += `for (let ${i} = 0; ${i} < ${lenVar}; ${i}++) {`;
                    inner += ser(s.of, `${v}[${i}]`);
                    inner += '}';
                    return inner;
                }
            }
            case 'object': {
                let out = '';
                // Sort keys for deterministic serialization order
                const sortedKeys = Object.keys(s.fields).sort();
                for (const k of sortedKeys) {
                    const f = s.fields[k];
                    out += ser(f, `${v}[${JSON.stringify(k)}]`);
                }
                return out;
            }
            case 'literal': {
                return ''; // do not write anything for literal - it's known
            }
            case 'tuple': {
                let out = '';
                for (let i = 0; i < s.of.length; i++) {
                    out += ser(s.of[i], `${v}[${i}]`);
                }
                return out;
            }
            case 'record': {
                const i = variable('i');
                const keys = variable('keys');
                const keysLen = variable('keysLen');
                const keyVar = variable('key');
                const valVar = variable('val');

                let inner = '';
                inner += `${keys} = Object.keys(${v});`;
                inner += `${keysLen} = ${keys}.length;`;
                inner += writeVaruint(keysLen);
                inner += `for (let ${i} = 0; ${i} < ${keysLen}; ${i}++) {`;
                inner += `const ${keyVar} = ${keys}[${i}];`;
                inner += writeString(keyVar);
                inner += `const ${valVar} = ${v}[${keyVar}];`;
                inner += ser(s.field, valVar);
                inner += `}`;
                return inner;
            }
            case 'union': {
                // write varuint tag followed by variant payload
                const discriminant = variable('discriminant');
                let inner = '';
                inner += `const ${discriminant} = ${v}[${JSON.stringify(s.key)}];`;

                for (let i = 0; i < s.variants.length; i++) {
                    const variant = s.variants[i];
                    const disc = variant.fields[s.key];
                    if (!disc || (disc as any).type !== 'literal') {
                        throw new Error('Union discriminant must be a literal in every variant');
                    }
                    const lit = (disc as any).value;

                    if (i === 0) {
                        inner += `if (${discriminant} === ${JSON.stringify(lit)}) { ${writeVaruint(i.toString())} ${ser(variant, v)} }`;
                    } else {
                        inner += ` else if (${discriminant} === ${JSON.stringify(lit)}) { ${writeVaruint(i.toString())} ${ser(variant, v)} }`;
                    }
                }

                inner += ` else { throw new Error('Invalid discriminant for union key at serialize: ' + ${discriminant}); }`;

                return inner;
            }
            case 'bitset': {
                // pack keys into bitset, unrolled per-output-byte to avoid per-iteration modulo
                const byteVar = variable('byte');
                const objVar = variable('obj');

                const total = s.keys.length;
                const bytes = Math.ceil(total / 8);

                let inner = '';
                // hoist object reference to avoid repeated property chain lookups
                inner += `const ${objVar} = ${v};`;
                // declare the byte variable once to avoid redeclaration when unrolling bytes
                inner += `let ${byteVar};`;
                // for each output byte, check up to 8 keys and set bits accordingly
                for (let b = 0; b < bytes; b++) {
                    inner += `${byteVar} = 0;`;
                    for (let bit = 0; bit < 8; bit++) {
                        const idx = b * 8 + bit;
                        if (idx >= total) break;
                        // inline the static key name directly instead of referencing a runtime keys array
                        inner += `if (${objVar}[${JSON.stringify(s.keys[idx])}]) ${byteVar} |= ${1 << bit};`;
                    }
                    inner += `u8[o++] = ${byteVar};`;
                }

                return inner;
            }
            case 'nullable': {
                let inner = '';

                inner += `if (${v} === null) {`;
                inner += `u8[o++] = 0;`;
                inner += `} else {`;
                inner += `u8[o++] = 1;`;
                inner += ser(s.of, v);
                inner += `}`;

                return inner;
            }
            case 'optional': {
                let inner = '';

                inner += `if (${v} === undefined) {`;
                inner += `u8[o++] = 0;`;
                inner += `} else {`;
                inner += `u8[o++] = 1;`;
                inner += ser(s.of, v);
                inner += `}`;

                return inner;
            }
            case 'nullish': {
                let inner = '';

                inner += `if (${v} === null) {`;
                inner += `u8[o++] = 0;`;
                inner += `} else if (${v} === undefined) {`;
                inner += `u8[o++] = 1;`;
                inner += `} else {`;
                inner += `u8[o++] = 2;`;
                inner += ser(s.of, v);
                inner += `}`;

                return inner;
            }
            default:
                return `throw new Error('Unsupported schema: ${s}');`;
        }
    }

    code += ser(schema, 'value');

    code += 'return u8;';

    return code;
}

function buildDes(schema: Schema): string {
    variableCounter = 1;
    
    let code = '';

    code += 'let o = 0;';
    code += 'let len = 0;';
    code += 'let val = 0;';
    code += 'let shift = 0;';
    code += 'let byte = 0;';

    function des(s: Schema, target: string): string {
        switch (s.type) {
            case 'boolean':
                return readBool(target);
            case 'int8':
                return readI8(target);
            case 'uint8':
                return readU8(target);
            case 'int16':
                return readI16(target);
            case 'uint16':
                return readU16(target);
            case 'int32':
                return readI32(target);
            case 'uint32':
                return readU32(target);
            case 'int64':
                return readI64(target);
            case 'uint64':
                return readU64(target);
            case 'float16':
                return readF16(target);
            case 'float32':
                return readF32(target);
            case 'float64':
                return readF64(target);
            case 'quantized': {
                // read quantized value and dequantize
                const steps = Math.ceil((s.max - s.min) / s.step);
                const bits = Math.ceil(Math.log2(steps));
                const bytes = Math.ceil(bits / 8);
                
                const quantVar = variable('quant');
                let code = '';
                
                // read based on byte size
                if (bytes === 1) {
                    code += readU8(quantVar);
                } else if (bytes === 2) {
                    code += readU16(quantVar);
                } else if (bytes <= 4) {
                    code += readU32(quantVar);
                } else {
                    code += readVaruint(quantVar);
                }
                
                // dequantize: convert step index back to value
                code += `${target} = ${s.min} + ${quantVar} * ${s.step};`;
                
                return code;
            }
            case 'quat': {
                // Decode smallest-three quaternion
                // Calculate bits from step
                const steps = Math.ceil(Math.SQRT2 / s.step);
                const bits = Math.ceil(Math.log2(steps));
                const maxVal = (1 << bits) - 1;
                const scale = maxVal / Math.sqrt(2);
                
                const metaByte = variable('meta');
                const maxIdx = variable('maxIdx');
                const sign = variable('sign');
                const c0 = variable('c0');
                const c1 = variable('c1');
                const c2 = variable('c2');
                const c3 = variable('c3');
                
                let code = '';
                // Read metadata byte (2 bits index + 1 bit sign)
                code += `const ${metaByte} = u8[o++];`;
                code += `const ${maxIdx} = ${metaByte} >> 1;`;
                code += `const ${sign} = ${metaByte} & 0x1;`;
                
                // Read components based on bit size
                if (bits <= 8) {
                    code += `let ${c0} = u8[o++];`;
                    code += `let ${c1} = u8[o++];`;
                    code += `let ${c2} = u8[o++];`;
                } else if (bits <= 16) {
                    code += readU16(c0);
                    code += readU16(c1);
                    code += readU16(c2);
                } else {
                    code += readU32(c0);
                    code += readU32(c1);
                    code += readU32(c2);
                }
                
                // Dequantize
                code += `${c0} = ${c0} / ${scale} - ${1 / Math.sqrt(2)};`;
                code += `${c1} = ${c1} / ${scale} - ${1 / Math.sqrt(2)};`;
                code += `${c2} = ${c2} / ${scale} - ${1 / Math.sqrt(2)};`;
                
                // Reconstruct largest component
                code += `let ${c3} = Math.sqrt(Math.max(0, 1 - ${c0}*${c0} - ${c1}*${c1} - ${c2}*${c2}));`;
                code += `if (${sign}) ${c3} = -${c3};`;
                
                // Assign based on which was dropped (as tuple [x, y, z, w])
                code += `if (${maxIdx} === 0) ${target} = [${c3}, ${c0}, ${c1}, ${c2}];`;
                code += `else if (${maxIdx} === 1) ${target} = [${c0}, ${c3}, ${c1}, ${c2}];`;
                code += `else if (${maxIdx} === 2) ${target} = [${c0}, ${c1}, ${c3}, ${c2}];`;
                code += `else ${target} = [${c0}, ${c1}, ${c2}, ${c3}];`;
                
                return code;
            }
            case 'uv2': {
                // Decode angle
                // Calculate bits from step
                const steps = Math.ceil((Math.PI * 2) / s.step);
                const bits = Math.ceil(Math.log2(steps));
                const maxVal = (1 << bits) - 1;
                const quantized = variable('quant');
                const angle = variable('angle');
                
                const bytes = Math.ceil(bits / 8);
                
                let code = '';
                if (bytes === 1) {
                    code += readU8(quantized);
                } else if (bytes === 2) {
                    code += readU16(quantized);
                } else {
                    code += readU32(quantized);
                }
                
                code += `const ${angle} = ${quantized} / ${maxVal} * ${Math.PI * 2};`;
                code += `${target} = [Math.cos(${angle}), Math.sin(${angle})];`;
                
                return code;
            }
            case 'uv3': {
                // Decode smallest-two
                // Calculate bits from step
                const steps = Math.ceil(Math.SQRT2 / s.step);
                const bits = Math.ceil(Math.log2(steps));
                const maxVal = (1 << bits) - 1;
                const scale = maxVal / Math.sqrt(2);
                
                const packed = variable('packed');
                const maxIdx = variable('maxIdx');
                const sign = variable('sign');
                const c0 = variable('c0');
                const c1 = variable('c1');
                const c2 = variable('c2');
                
                const totalBits = 2 + 1 + bits * 2;
                const bytes = Math.ceil(totalBits / 8);
                
                let code = '';
                // Read bytes
                code += `let ${packed} = 0;`;
                for (let i = bytes - 1; i >= 0; i--) {
                    code += `${packed} |= u8[o++] << ${i * 8};`;
                }
                
                // Unpack
                code += `const ${maxIdx} = (${packed} >> ${totalBits - 2}) & 0x3;`;
                code += `const ${sign} = (${packed} >> ${totalBits - 3}) & 0x1;`;
                code += `let ${c0} = (${packed} >> ${bits}) & ${maxVal};`;
                code += `let ${c1} = ${packed} & ${maxVal};`;
                
                // Dequantize
                code += `${c0} = ${c0} / ${scale} - ${1 / Math.sqrt(2)};`;
                code += `${c1} = ${c1} / ${scale} - ${1 / Math.sqrt(2)};`;
                
                // Reconstruct largest
                code += `let ${c2} = Math.sqrt(Math.max(0, 1 - ${c0}*${c0} - ${c1}*${c1}));`;
                code += `if (${sign}) ${c2} = -${c2};`;
                
                // Assign (as tuple [x, y, z])
                code += `if (${maxIdx} === 0) ${target} = [${c2}, ${c0}, ${c1}];`;
                code += `else if (${maxIdx} === 1) ${target} = [${c0}, ${c2}, ${c1}];`;
                code += `else ${target} = [${c0}, ${c1}, ${c2}];`;
                
                return code;
            }
            case 'string': {
                return readString(target);
            }
            case 'varint': {
                return readVarint(target);
            }
            case 'varuint': {
                return readVaruint(target);
            }
            case 'uint8Array': {
                if ('length' in s && typeof s.length === 'number') {
                    // fixed-length: direct subarray slice
                    return `${target} = u8.subarray(o, o + ${s.length}); o += ${s.length};`;
                }
                // variable-length: read varuint length then create a view on the main buffer
                let inner = '';
                inner += readVaruint('len');
                inner += `${target} = u8.subarray(o, o + len); o += len;`;
                return inner;
            }
            case 'list': {
                if ('length' in s && typeof s.length === 'number') {
                    // fixed-length list: generate unrolled reads
                    let inner = '';
                    inner += `${target} = new Array(${s.length});`;
                    for (let i = 0; i < s.length; i++) {
                        inner += des(s.of, `${target}[${i}]`);
                    }
                    return inner;
                } else {
                    // variable-length list: read length then loop
                    const i = variable('i');
                    const l = variable('l');

                    let inner = '';
                    inner += `let ${l};`;
                    inner += readVaruint(l);
                    inner += `${target} = new Array(${l});`;
                    inner += `for (let ${i} = 0; ${i} < ${l}; ${i}++) {`;
                    inner += des(s.of, `${target}[${i}]`);
                    inner += `}`;
                    return inner;
                }
            }
            case 'object': {
                let inner = `${target} = {};`;
                // Sort keys for deterministic deserialization order (must match serialization)
                const sortedKeys = Object.keys(s.fields).sort();
                for (const key of sortedKeys) {
                    const fieldSchema = s.fields[key];
                    inner += des(fieldSchema, `${target}[${JSON.stringify(key)}]`);
                }
                return inner;
            }
            case 'tuple': {
                let inner = `${target} = new Array(${s.of.length});`;
                for (let i = 0; i < s.of.length; i++) {
                    inner += des(s.of[i], `${target}[${i}]`);
                }
                return inner;
            }
            case 'record': {
                const i = variable('i');
                const k = variable('k');
                const count = variable('count');

                let inner = '';
                inner += `let ${k}, ${count};`;
                inner += readVaruint(count);
                inner += `${target} = {};`;
                inner += `for (let ${i} = 0; ${i} < ${count}; ${i}++) { `;
                inner += readString(k);
                inner += des(s.field, `${target}[${k}]`);
                inner += `}`;
                return inner;
            }
            case 'bitset': {
                // unpack bitset into object, unrolled per-output-byte and inline keys
                const total = s.keys.length;
                const bytes = Math.ceil(total / 8);

                let out = '';
                out += `${target} = {};`;

                // read one byte per output byte and assign up to 8 keys each
                for (let b = 0; b < bytes; b++) {
                    const byteIdx = variable('bval');
                    out += `const ${byteIdx} = u8[o++];`;
                    for (let bit = 0; bit < 8; bit++) {
                        const idx = b * 8 + bit;
                        if (idx >= total) break;
                        out += `${target}[${JSON.stringify(s.keys[idx])}] = (${byteIdx} & ${1 << bit}) !== 0;`;
                    }
                }
                return out;
            }
            case 'literal': {
                return `${target} = ${JSON.stringify(s.value)};`;
            }
            case 'nullable': {
                let inner = '';

                inner += `const flag = u8[o++];`;
                inner += `if (flag === 0) {`;
                inner += `${target} = null;`;
                inner += `} else {`;
                inner += des(s.of, target);
                inner += `}`;

                return inner;
            }
            case 'optional': {
                let inner = '';

                inner += `const flag = u8[o++];`;
                inner += `if (flag === 1) {`;
                inner += des(s.of, target);
                inner += `}`;

                return inner;
            }
            case 'nullish': {
                let inner = '';

                inner += `const flag = u8[o++];`;
                inner += `if (flag === 0) {`;
                inner += `${target} = null;`;
                inner += `} else if (flag === 2) {`;
                inner += des(s.of, target);
                inner += `}`;

                return inner;
            }
            case 'union': {
                const tag = variable('tag');
                let out = '';
                out += `let ${tag};`;
                out += readVaruint(tag);
                out += `${target} = {};`;
                out += `switch (${tag}) {`;
                for (let i = 0; i < s.variants.length; i++) {
                    const variant = s.variants[i];
                    out += `case ${i}: `;
                    out += des(variant, target);
                    out += ` break;`;
                }
                out += `default: throw new Error('Invalid union tag: ' + ${tag});`;
                out += `}`;
                return out;
            }
            default:
                return `throw new Error('Unsupported schema: ${s}');`;
        }
    }

    const rootAssign = 'let value;';
    code += rootAssign;
    code += des(schema, 'value');
    code += 'return value;';

    return code;
}

function buildValidate(schema: Schema): string {
    variableCounter = 1;
    
    let code = '';

    function validate(s: Schema, v: string): string {
        switch (s.type) {
            case 'boolean':
                return `if (typeof ${v} !== 'boolean') return false;`;
            case 'varint':
                return `if (typeof ${v} !== 'number' || !Number.isInteger(${v})) return false;`;
            case 'varuint':
                return `if (typeof ${v} !== 'number' || !Number.isInteger(${v}) || ${v} < 0) return false;`;
            case 'int8':
                return `if (typeof ${v} !== 'number' || !Number.isInteger(${v}) || ${v} < -128 || ${v} > 127) return false;`;
            case 'uint8':
                return `if (typeof ${v} !== 'number' || !Number.isInteger(${v}) || ${v} < 0 || ${v} > 255) return false;`;
            case 'int16':
                return `if (typeof ${v} !== 'number' || !Number.isInteger(${v}) || ${v} < -32768 || ${v} > 32767) return false;`;
            case 'uint16':
                return `if (typeof ${v} !== 'number' || !Number.isInteger(${v}) || ${v} < 0 || ${v} > 65535) return false;`;
            case 'int32':
                return `if (typeof ${v} !== 'number' || !Number.isInteger(${v}) || ${v} < -2147483648 || ${v} > 2147483647) return false;`;
            case 'uint32':
                return `if (typeof ${v} !== 'number' || !Number.isInteger(${v}) || ${v} < 0 || ${v} > 4294967295) return false;`;
            case 'int64':
                return `if (typeof ${v} !== 'bigint' || ${v} < -9223372036854775808n || ${v} > 9223372036854775807n) return false;`;
            case 'uint64':
                return `if (typeof ${v} !== 'bigint' || ${v} < 0n || ${v} > 18446744073709551615n) return false;`;
            case 'float16':
                return `if (typeof ${v} !== 'number') return false;`;
            case 'float32':
                return `if (typeof ${v} !== 'number') return false;`;
            case 'float64':
                return `if (typeof ${v} !== 'number') return false;`;
            case 'quantized':
                return `if (typeof ${v} !== 'number' || ${v} < ${s.min} || ${v} > ${s.max}) return false;`;
            case 'quat':
                return `if (!Array.isArray(${v}) || ${v}.length !== 4 || typeof ${v}[0] !== 'number' || typeof ${v}[1] !== 'number' || typeof ${v}[2] !== 'number' || typeof ${v}[3] !== 'number') return false;`;
            case 'uv2':
                return `if (!Array.isArray(${v}) || ${v}.length !== 2 || typeof ${v}[0] !== 'number' || typeof ${v}[1] !== 'number') return false;`;
            case 'uv3':
                return `if (!Array.isArray(${v}) || ${v}.length !== 3 || typeof ${v}[0] !== 'number' || typeof ${v}[1] !== 'number' || typeof ${v}[2] !== 'number') return false;`;
            case 'string': {
                return `if (typeof ${v} !== 'string') return false;`;
            }
            case 'list': {
                if (s.length !== undefined) {
                    let inner = '';
                    inner += `if (!Array.isArray(${v})) return false;`;
                    inner += `if (${v}.length !== ${s.length}) return false;`;

                    for (let i = 0; i < s.length; i++) {
                        inner += validate(s.of, `${v}[${i}]`);
                    }

                    return inner;
                } else {
                    const i = variable('i');

                    let inner = '';
                    inner += `if (!Array.isArray(${v})) return false;`;
                    inner += `for (let ${i} = 0; ${i} < ${v}.length; ${i}++) {`;
                    inner += validate(s.of, `${v}[${i}]`);
                    inner += '}';
                    return inner;
                }
            }
            case 'object': {
                let inner = '';

                inner += `if (typeof (${v}) !== "object") return false;`;

                // Sort keys for consistency (though order doesn't matter for validation)
                const sortedKeys = Object.keys(s.fields).sort();
                for (const k of sortedKeys) {
                    const f = s.fields[k];
                    const key = JSON.stringify(k);

                    inner += `if (!(${key} in ${v})) return false;`;
                    inner += validate(f, `${v}[${key}]`);
                }

                return inner;
            }
            case 'tuple': {
                let inner = '';
                inner += `if (!Array.isArray(${v})) return false;`;
                inner += `if (${v}.length !== ${s.of.length}) return false;`;
                for (let i = 0; i < s.of.length; i++) {
                    inner += validate(s.of[i], `${v}[${i}]`);
                }
                return inner;
            }
            case 'record': {
                const i = variable('i');
                const keys = variable('keys');

                let inner = '';
                inner += `if (typeof (${v}) !== "object") return false;`;
                inner += `${keys} = Object.keys(${v});`;
                inner += `for (let ${i} = 0; ${i} < ${keys}.length; ${i}++) {`;
                inner += validate(s.field, `${v}[${keys}[${i}]]`);
                inner += `}`;
                return inner;
            }
            case 'bitset': {
                let inner = '';
                inner += `if (typeof (${v}) !== "object") return false;`;
                for (let i = 0; i < s.keys.length; i++) {
                    const key = JSON.stringify(s.keys[i]);
                    inner += `if (!(${key} in ${v})) return false;`;
                    inner += `if (typeof ${v}[${key}] !== 'boolean') return false;`;
                }
                return inner;
            }
            case 'literal': {
                return `if (${JSON.stringify(s.value)} !== ${v}) return false;`;
            }
            case 'uint8Array': {
                let inner = `if (!(${v} instanceof Uint8Array)) return false;`;
                if ('length' in s && typeof s.length === 'number') {
                    inner += ` if (${v}.length !== ${s.length}) return false;`;
                }
                return inner;
            }
            case 'nullable': {
                let inner = '';
                inner += `if (${v} === null) return true;`;
                inner += validate(s.of, v);
                return inner;
            }
            case 'optional': {
                let inner = '';
                inner += `if (${v} === undefined) return true;`;
                inner += validate(s.of, v);
                return inner;
            }
            case 'nullish': {
                let inner = '';
                inner += `if (${v} === null || ${v} === undefined) return true;`;
                inner += validate(s.of, v);
                return inner;
            }
            case 'union': {
                // ensure value is an object and its discriminant matches one of the
                // variant literals, then validate against that variant.
                let inner = '';
                inner += `if (typeof (${v}) !== "object") return false;`;
                const keyVar = variable('key');
                inner += `const ${keyVar} = ${v}[${JSON.stringify(s.key)}];`;

                // validate against matching literal
                let first = true;
                for (let i = 0; i < s.variants.length; i++) {
                    const variant = s.variants[i];
                    const disc = variant.fields[s.key];
                    if (!disc || (disc as any).type !== 'literal') {
                        throw new Error('Union discriminant must be a literal in every variant');
                    }
                    const lit = (disc as any).value;
                    if (first) {
                        inner += `if (${keyVar} === ${JSON.stringify(lit)}) {`;
                        first = false;
                    } else {
                        inner += ` else if (${keyVar} === ${JSON.stringify(lit)}) {`;
                    }

                    inner += validate(variant, v);
                    inner += ` }`;
                }

                inner += ` else { return false; }`;
                return inner;
            }
            default:
                return `throw new Error('Unsupported schema: ${s}');`;
        }
    }

    code += validate(schema, 'value');

    code += 'return true;';

    return code;
}

function variable(str: string): string {
    return str + variableCounter++;
}

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

function readF32(target: string, offset = 'o'): string {
    let code = '';
    code += `f32_u8[0] = u8[${offset}++]; f32_u8[1] = u8[${offset}++]; f32_u8[2] = u8[${offset}++]; f32_u8[3] = u8[${offset}++];`;
    code += `${target} = f32[0];`;
    return code;
}

function writeF16(value: string, offset = 'o'): string {
    let code = '';
    code += `f16[0] = ${value};`;
    code += `u8[${offset}++] = f16_u8[0]; u8[${offset}++] = f16_u8[1];`;
    return code;
}

function readF16(target: string, offset = 'o'): string {
    let code = '';
    code += `f16_u8[0] = u8[${offset}++]; f16_u8[1] = u8[${offset}++];`;
    code += `${target} = f16[0];`;
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
    // Read varuint length
    code += readVaruint('len', offset);
    // Decode string
    code += `${target} = len === 0 ? '' : textDecoder.decode(u8.subarray(${offset}, ${offset} + len)); ${offset} += len;`;

    return code;
}

function writeString(value: string, offset = 'o'): string {
    let code = '';

    const strVar = variable('str');
    code += `const ${strVar} = ${value};`;
    
    code += `len = utf8Length(${strVar});`;
    code += writeVaruint('len', offset);
    
    code += `textEncoder.encodeInto(${strVar}, u8.subarray(${offset}));`;
    code += `${offset} += len;`;

    return code;
}
