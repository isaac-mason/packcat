import type { Schema, SchemaType } from './schema';

const f32_buffer = new ArrayBuffer(4);
const f32 = new Float32Array(f32_buffer);
const f32_u8 = new Uint8Array(f32_buffer);

const f64_buffer = new ArrayBuffer(8);
const f64 = new Float64Array(f64_buffer);
const f64_u8 = new Uint8Array(f64_buffer);

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

export function build<S extends Schema>(
    schema: S,
): {
    ser: (value: SchemaType<S>) => Uint8Array;
    des: (u8: Uint8Array) => SchemaType<S>;
    validate: (value: SchemaType<S>) => boolean;
    source: { ser: string; des: string; validate: string };
} {
    const serSource = buildSer(schema);

    const ser = new Function('textEncoder', 'f32', 'f32_u8', 'f64', 'f64_u8', 'utf8Length', 'value', serSource).bind(
        null,
        textEncoder,
        f32,
        f32_u8,
        f64,
        f64_u8,
        utf8Length,
    ) as (value: SchemaType<S>) => Uint8Array;

    const desSource = buildDes(schema);

    const des = new Function('textDecoder', 'f32', 'f32_u8', 'f64', 'f64_u8', 'u8', desSource).bind(
        null,
        textDecoder,
        f32,
        f32_u8,
        f64,
        f64_u8,
    ) as (u8: Uint8Array) => SchemaType<S>;

    const validateSource = buildValidate(schema);

    const validate = new Function('value', validateSource) as (value: SchemaType<S>) => boolean;

    return { ser, des, validate, source: { ser: serSource, des: desSource, validate: validateSource } };
}

function buildSer(schema: Schema): string {
    let code = '';

    code += 'let len = 0;';
    code += 'let vint = 0;';
    code += 'let vuint = 0;';
    code += 'let keys;';
    code += 'let val = 0;';
    code += 'let textEncoderResult;';

    type SizeCalc = { code: string; fixed: number };

    let variableCounter = 1;

    function size(s: Schema, v: string): SizeCalc {
        switch (s.type) {
            case 'boolean':
            case 'int8':
            case 'uint8':
                return { code: '', fixed: 1 };
            case 'int16':
            case 'uint16':
                return { code: '', fixed: 2 };
            case 'int32':
            case 'uint32':
            case 'float32':
                return { code: '', fixed: 4 };
            case 'number':
            case 'float64':
                return { code: '', fixed: 8 };
            case 'string': {
                const code = `len = utf8Length(${v}); ${varuintSize('len')} size += len;`;
                return { code, fixed: 0 };
            }
            case 'varint': {
                return { code: varintSize(v), fixed: 0 };
            }
            case 'varuint': {
                return { code: varuintSize(v), fixed: 0 };
            }
            case 'uint8Array': {
                // store a 4-byte length prefix followed by raw bytes
                return { code: `size += 4 + ${v}.length;`, fixed: 0 };
            }
            case 'list': {
                if ('length' in s && typeof s.length === 'number') {
                    // fixed-length list: each element exists at compile time
                    const i = variable('i', variableCounter++);
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
                    const i = variable('i', variableCounter++);
                    const elem = size(s.of, `${v}[${i}]`);

                    let parts = '';
                    parts += varuintSize(`${v}.length`);
                    if (elem.fixed > 0) {
                        // account for unconditional fixed bytes per element
                        parts += `size += ${elem.fixed} * ${v}.length;`;
                    }
                    if (elem.code && elem.code !== '') {
                        parts += `for (let ${i} = 0; ${i} < ${v}.length; ${i}++) { ${elem.code} }`;
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
                for (const [k, f] of Object.entries(s.fields)) {
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
                const i = variable('i', variableCounter++);

                const childSize = size(s.field, `${v}[k]`);
                const keys = variable('keys', variableCounter++);

                let inner = '';
                inner += `if (${v} && typeof ${v} === 'object') {`;
                inner += `const ${keys} = Object.keys(${v});`;
                inner += `${varuintSize(`${keys}.length`)}`;
                if (childSize.fixed > 0) {
                    inner += ` size += ${childSize.fixed} * ${keys}.length; `;
                }
                inner += `for (let ${i} = 0; ${i} < ${keys}.length; ${i}++) { const k = ${keys}[${i}]; len = utf8Length(k); ${varuintSize('len')} size += len; `;
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
                const keyVar = variable('keyVal', variableCounter++);

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
            case 'number':
                return writeF64(v);
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
            case 'float32':
                return writeF32(v);
            case 'float64':
                return writeF64(v);
            case 'string': {
                return writeString(v);
            }
            case 'varint': {
                return writeVarint(v);
            }
            case 'varuint': {
                return writeVaruint(v);
            }
            case 'uint8Array': {
                // write 4-byte length then copy raw bytes
                let inner = '';
                inner += writeU32(`${v}.length`);
                inner += `u8.set(${v}, o); o += ${v}.length;`;
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
                    const i = variable('i', variableCounter++);

                    let inner = '';
                    inner += writeVaruint(`${v}.length`);
                    inner += `for (let ${i} = 0; ${i} < ${v}.length; ${i}++) {`;
                    inner += ser(s.of, `${v}[${i}]`);
                    inner += '}';
                    return inner;
                }
            }
            case 'object': {
                let out = '';
                for (const [k, f] of Object.entries(s.fields)) {
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
                const i = variable('i', variableCounter++);
                const keys = variable('keys', variableCounter++);

                let inner = '';
                inner += `${keys} = Object.keys(${v});`;
                inner += writeVaruint(`${keys}.length`);
                inner += `for (let ${i} = 0; ${i} < ${keys}.length; ${i}++) {`;
                inner += writeString(`${keys}[${i}]`);
                inner += ser(s.field, `${v}[${keys}[${i}]]`);
                inner += `}`;
                return inner;
            }
            case 'union': {
                // write varuint tag followed by variant payload
                const discriminant = variable('discriminant', variableCounter++);
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
                const byteVar = variable('byte', variableCounter++);

                const total = s.keys.length;
                const bytes = Math.ceil(total / 8);

                let inner = '';
                // declare the byte variable once to avoid redeclaration when unrolling bytes
                inner += `let ${byteVar};`;
                // for each output byte, check up to 8 keys and set bits accordingly
                for (let b = 0; b < bytes; b++) {
                    inner += `${byteVar} = 0;`;
                    for (let bit = 0; bit < 8; bit++) {
                        const idx = b * 8 + bit;
                        if (idx >= total) break;
                        // inline the static key name directly instead of referencing a runtime keys array
                        inner += `if (${v}[${JSON.stringify(s.keys[idx])}]) ${byteVar} |= ${1 << bit};`;
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
    let code = '';

    code += 'let o = 0;';
    code += 'let len = 0;';
    code += 'let val = 0;';
    code += 'let shift = 0;';
    code += 'let byte = 0;';

    let variableCounter = 1;

    function des(s: Schema, target: string): string {
        switch (s.type) {
            case 'boolean':
                return readBool(target);
            case 'number':
                return readF64(target);
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
            case 'float32':
                return readF32(target);
            case 'float64':
                return readF64(target);
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
                // read length then create a view on the main buffer
                let inner = '';
                inner += readU32('len');
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
                    const i = variable('i', variableCounter++);
                    const l = variable('l', variableCounter++);

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
                for (const [key, fieldSchema] of Object.entries(s.fields)) {
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
                const i = variable('i', variableCounter++);
                const k = variable('k', variableCounter++);
                const count = variable('count', variableCounter++);

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
                    const byteIdx = variable('bval', variableCounter++);
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
                const tag = variable('tag', variableCounter++);
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
    let code = '';

    let variableCounter = 1;

    function validate(s: Schema, v: string): string {
        switch (s.type) {
            case 'boolean':
                return `if (typeof ${v} !== 'boolean') return false;`;
            case 'number':
                return `if (typeof ${v} !== 'number') return false;`;
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
            case 'float32':
                return `if (typeof ${v} !== 'number') return false;`;
            case 'float64':
                return `if (typeof ${v} !== 'number') return false;`;
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
                    const i = variable('i', variableCounter++);

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

                for (const [k, f] of Object.entries(s.fields)) {
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
                const i = variable('i', variableCounter++);
                const keys = variable('keys', variableCounter++);

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
                return `if (!(${v} instanceof Uint8Array)) return false;`;
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
                const keyVar = variable('key', variableCounter++);
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

function variable(str: string, idx: number): string {
    return str + idx;
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
    // Read varuint length
    code += readVaruint('len', offset);
    // Decode string
    code += `${target} = len === 0 ? '' : textDecoder.decode(u8.subarray(${offset}, ${offset} + len)); ${offset} += len;`;

    return code;
}

function writeString(value: string, offset = 'o'): string {
    let code = '';

    code += `textEncoderResult = textEncoder.encode(${value});`;
    
    code += writeVaruint('textEncoderResult.length', offset);
    
    code += `u8.set(textEncoderResult, ${offset}); ${offset} += textEncoderResult.length;`;

    return code;
}
