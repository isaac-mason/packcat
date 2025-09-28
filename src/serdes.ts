import type { Schema, SchemaType } from './schema';

export function serDes<S extends Schema>(
    schema: S,
): {
    ser: (value: SchemaType<S>) => ArrayBuffer;
    des: (buffer: ArrayBuffer) => SchemaType<S>;
    validate: (value: SchemaType<S>) => boolean;
    source: { ser: string; des: string; validate: string };
} {
    const f32_buffer = new ArrayBuffer(4);
    const f32 = new Float32Array(f32_buffer);
    const f32_u8 = new Uint8Array(f32_buffer);

    const f64_buffer = new ArrayBuffer(8);
    const f64 = new Float64Array(f64_buffer);
    const f64_u8 = new Uint8Array(f64_buffer);

    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder();

    const ctx: Ctx = {
        f32,
        f32_u8,
        f64,
        f64_u8,
        textEncoder,
        textDecoder,
        utf8Length,
    };

    const serSource = buildSer(schema);

    const serFn = new Function('value', '{ textEncoder, f32, f32_u8, f64, f64_u8, utf8Length }', serSource) as (
        value: SchemaType<S>,
        tmps: Ctx,
    ) => ArrayBuffer;

    const ser = (value: SchemaType<S>): ArrayBuffer => {
        return serFn(value, ctx);
    };

    const desSource = buildDes(schema);

    const desFn = new Function('buffer', '{ textDecoder, f32, f32_u8, f64, f64_u8 }', desSource) as (
        buffer: ArrayBuffer,
        tmps: Ctx,
    ) => SchemaType<S>;

    const des = (buffer: ArrayBuffer): SchemaType<S> => {
        return desFn(buffer, ctx);
    };

    const validateSource = buildValidate(schema);

    const validateFn = new Function('value', validateSource) as (value: SchemaType<S>) => boolean;

    const validate = (value: SchemaType<S>): boolean => {
        return validateFn(value);
    };

    return { ser, des, validate, source: { ser: serSource, des: desSource, validate: validateSource } };
}

function buildSer(schema: Schema): string {
    let code = '';

    code += 'let len = 0;';

    const schemaFixedSize = fixedSize(schema);

    type SizeCalc = { code: string; fixed: number };

    function genCalcSize(s: Schema, v: string, depth: number): SizeCalc {
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
            case 'string':
                return { code: `len = utf8Length(${v}); size += 4 + len;`, fixed: 0 };
            case 'list': {
                if ('length' in s && typeof s.length === 'number') {
                    // fixed-length list: each element exists at compile time
                    const i = variable('i', depth);
                    const elem = genCalcSize(s.of, `${v}[${i}]`, depth + 1);
                    // if the element is fully fixed-size, we can compute total size at compile time
                    if (elem.code === '' && elem.fixed > 0) {
                        return { code: '', fixed: elem.fixed * s.length };
                    }
                    // element-wise computation at runtime for dynamic parts
                    const inner = `for (let ${i} = 0; ${i} < ${s.length}; ${i}++) { ${elem.code} }`;
                    return { code: inner, fixed: 0 };
                } else {
                    // variable-length list: include 4-byte length prefix and per-element dynamic parts
                    const i = variable('i', depth);
                    const elem = genCalcSize(s.of, `${v}[${i}]`, depth + 1);

                    let parts = '';
                    if (elem.fixed > 0) {
                        // account for unconditional fixed bytes per element
                        parts += `size += ${elem.fixed} * ${v}.length;`;
                    }
                    if (elem.code && elem.code !== '') {
                        parts += `for (let ${i} = 0; ${i} < ${v}.length; ${i}++) { ${elem.code} }`;
                    }

                    return { code: `size += 4; ${parts}`, fixed: 0 };
                }
            }
            case 'object': {
                // sum all unconditional fixed child sizes into fixed; collect dynamic parts separately.
                let fixed = 0;
                const parts: string[] = [];
                for (const [k, f] of Object.entries(s.fields)) {
                    const child = genCalcSize(f, `${v}[${JSON.stringify(k)}]`, depth + 1);
                    // always accumulate unconditional fixed bytes
                    fixed += child.fixed;
                    if (child.code !== '') {
                        parts.push(child.code);
                    }
                }
                return { code: parts.join(' '), fixed };
            }
            case 'record': {
                const i = variable('i', depth);

                const child = genCalcSize(s.field, `${v}[k]`, depth + 1);
                let inner = '';
                inner += `size += 4; if (${v} && typeof ${v} === 'object') { const keys = Object.keys(${v}); `;
                if (child.fixed > 0) {
                    inner += ` size += ${child.fixed} * keys.length; `;
                }
                inner += `for (let ${i} = 0; ${i} < keys.length; ${i}++) { const k = keys[${i}]; size += 4 + utf8Length(k); `;
                if (child.code !== '') {
                    inner += child.code;
                }
                inner += `}}`;
                return { code: inner, fixed: 0 };
            }
            default:
                return {
                    code: `throw new Error('Unsupported schema type: ${s.type}');`,
                    fixed: 0,
                };
        }
    }

    if (schemaFixedSize !== null) {
        // initialize size to the compile-time-known total when possible
        code += `let size = ${schemaFixedSize};`;
    } else {
        // else, emit code for known size and dynamic parts
        const calc = genCalcSize(schema, 'value', 1);

        code += `let size = ${calc.fixed};`;
        code += calc.code;
    }

    code += 'const arrayBuffer = new ArrayBuffer(size);';
    code += 'const view = new DataView(arrayBuffer);';
    code += 'let o = 0;';

    code += 'const u8 = new Uint8Array(arrayBuffer); ';

    code += 'let keys;';
    code += 'let val = 0;';
    code += 'let o_size = 0;';
    code += 'let textEncoderResult;';

    function write(s: Schema, v: string, depth: number): string {
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
            case 'list': {
                if (s.length !== undefined) {
                    // generate unrolled fixed-length list serialization
                    let inner = '';
                    for (let i = 0; i < s.length; i++) {
                        inner += write(s.of, `${v}[${i}]`, depth + 1);
                    }
                    return inner;
                } else {
                    const i = variable('i', depth);

                    let inner = '';
                    inner += writeU32(`${v}.length`);
                    inner += `for (let ${i} = 0; ${i} < ${v}.length; ${i}++) {`;
                    inner += write(s.of, `${v}[${i}]`, depth + 1);
                    inner += '}';
                    return inner;
                }
            }
            case 'object': {
                let out = '';
                for (const [k, f] of Object.entries(s.fields)) {
                    out += write(f, `${v}[${JSON.stringify(k)}]`, depth + 1);
                }
                return out;
            }
            case 'record': {
                const i = variable('i', depth);
                const keys = variable('keys', depth);

                let inner = '';
                inner += `${keys} = Object.keys(${v});`;
                inner += writeU32(`${keys}.length`);
                inner += `for (let ${i} = 0; ${i} < ${keys}.length; ${i}++) {`;
                inner += writeString(`${keys}[${i}]`);
                inner += write(s.field, `${v}[${keys}[${i}]]`, depth + 1);
                inner += `}`;
                return inner;
            }
            default:
                return `throw new Error('Unsupported schema type: ${s.type}');`;
        }
    }

    code += write(schema, 'value', 1);

    code += 'return arrayBuffer;';

    return code;
}

function buildDes(schema: Schema): string {
    let code = '';

    code += 'let o = 0;';
    code += 'const view = new DataView(buffer);';
    code += 'const u8 = new Uint8Array(buffer);';
    code += 'let len = 0;';
    code += 'let val = 0;';

    function read(s: Schema, target: string, depth: number): string {
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
            case 'list': {
                if ('length' in s && typeof s.length === 'number') {
                    // fixed-length list: generate unrolled reads
                    let inner = '';
                    inner += `${target} = new Array(${s.length});`;
                    for (let i = 0; i < s.length; i++) {
                        inner += read(s.of, `${target}[${i}]`, depth + 1);
                    }
                    return inner;
                } else {
                    // variable-length list: read length then loop
                    const i = variable('i', depth);
                    const l = variable('l', depth);

                    let inner = '';
                    inner += `let ${l};`;
                    inner += readU32(l);
                    inner += `${target} = new Array(${l});`;
                    inner += `for (let ${i} = 0; ${i} < ${l}; ${i}++) {`;
                    inner += read(s.of, `${target}[${i}]`, depth + 1);
                    inner += `}`;
                    return inner;
                }
            }
            case 'object': {
                let inner = `${target} = {};`;
                for (const [key, fieldSchema] of Object.entries(s.fields)) {
                    inner += read(fieldSchema, `${target}[${JSON.stringify(key)}]`, depth + 1);
                }
                return inner;
            }
            case 'record': {
                const i = variable('i', depth);
                const k = variable('k', depth);
                const klen = variable('klen', depth);
                const count = variable('count', depth);

                let inner = '';
                inner += `let ${k}, ${klen}, ${count};`;
                inner += readU32(count);
                inner += `${target} = {};`;
                inner += `for (let ${i} = 0; ${i} < ${count}; ${i}++) { `;
                inner += readU32(klen);
                inner += `const ${k} = ${klen} === 0 ? '' : textDecoder.decode(u8.subarray(o, o + ${klen})); o += ${klen};`;
                inner += read(s.field, `${target}[${k}]`, depth + 1);
                inner += `}`;
                return inner;
            }
            default:
                return `throw new Error('Unsupported schema type: ${s.type}');`;
        }
    }

    const rootAssign = 'let value;';
    code += rootAssign;
    code += read(schema, 'value', 1);
    code += 'return value;';

    return code;
}

function buildValidate(schema: Schema): string {
    let code = '';

    function validate(s: Schema, v: string, depth: number): string {
        switch (s.type) {
            case 'boolean':
                return `if (typeof ${v} !== 'boolean') return false;`;
            case 'number':
                return `if (typeof ${v} !== 'number') return false;`;
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
                        inner += validate(s.of, `${v}[${i}]`, depth + 1);
                    }

                    return inner;
                } else {
                    const i = variable('i', depth);

                    let inner = '';
                    inner += `if (!Array.isArray(${v})) return false;`;
                    inner += `for (let ${i} = 0; ${i} < ${v}.length; ${i}++) {`;
                    inner += validate(s.of, `${v}[${i}]`, depth + 1);
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
                    inner += validate(f, `${v}[${key}]`, depth + 1);
                }

                return inner;
            }
            case 'record': {
                const i = variable('i', depth);
                const keys = variable('keys', depth);

                let inner = '';
                inner += `if (typeof (${v}) !== "object") return false;`;
                inner += `${keys} = Object.keys(${v});`;
                inner += `for (let ${i} = 0; ${i} < ${keys}.length; ${i}++) {`;
                inner += validate(s.field, `${v}[${keys}[${i}]]`, depth + 1);
                inner += `}`;
                return inner;
            }
            default:
                return `throw new Error('Unsupported schema type: ${s.type}');`;
        }
    }

    code += validate(schema, 'value', 1);

    code += 'return true;';

    return code;
}

type Ctx = {
    f32: Float32Array;
    f32_u8: Uint8Array;
    f64: Float64Array;
    f64_u8: Uint8Array;
    textEncoder: TextEncoder;
    textDecoder: TextDecoder;
    utf8Length: (s: string) => number;
};

function variable(str: string, depth: number): string {
    return str + depth;
}

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

function fixedSize(s: Schema): number | null {
    switch (s.type) {
        case 'boolean':
        case 'int8':
        case 'uint8':
            return 1;
        case 'int16':
        case 'uint16':
            return 2;
        case 'int32':
        case 'uint32':
        case 'float32':
            return 4;
        case 'number':
        case 'float64':
            return 8;
        case 'string':
            return null; // string length is dynamic (even though it has a 4-byte prefix)
        case 'list': {
            if ('length' in s && typeof s.length === 'number') {
                const elemFixed = fixedSize(s.of);
                if (elemFixed !== null) return elemFixed * s.length;
                return null;
            }
            return null;
        }
        case 'object': {
            let total = 0;
            for (const f of Object.values(s.fields)) {
                const fs = fixedSize(f);
                if (fs === null) return null;
                total += fs;
            }
            return total;
        }
        case 'record':
            return null;
        default:
            return null;
    }
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
    code += readU32('len', offset);
    code += `${target} = len === 0 ? '' : textDecoder.decode(u8.subarray(${offset}, ${offset} + len)); ${offset} += len;`;

    return code;
}

function writeString(value: string, offset = 'o'): string {
    let code = '';

    code += `o_size = ${offset};`;
    code += `${offset} += 4;`;
    code += `textEncoderResult = textEncoder.encodeInto(${value}, u8.subarray(${offset}));`;
    code += `o = ${offset} + textEncoderResult.written;`;
    code += writeU32('textEncoderResult.written', 'o_size');

    return code;
}
