import type { Schema, SchemaType } from './schema';

type Tmps = {
    f32: Float32Array;
    f32_u8: Uint8Array;
    f64: Float64Array;
    f64_u8: Uint8Array;
    textEncoder: TextEncoder;
    textDecoder: TextDecoder;
};
export function serDes<S extends Schema>(
    schema: S,
): {
    ser: (value: SchemaType<S>) => ArrayBuffer;
    des: (buffer: ArrayBuffer) => SchemaType<S>;
    source: { ser: string; des: string };
} {
    const f32_buffer = new ArrayBuffer(4);
    const f32 = new Float32Array(f32_buffer);
    const f32_u8 = new Uint8Array(f32_buffer);

    const f64_buffer = new ArrayBuffer(8);
    const f64 = new Float64Array(f64_buffer);
    const f64_u8 = new Uint8Array(f64_buffer);

    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder();

    const tmps: Tmps = {
        f32,
        f32_u8,
        f64,
        f64_u8,
        textEncoder,
        textDecoder,
    };

    const serSource = buildSer(schema);
    const desSource = buildDes(schema);

    const serFn = new Function('value', '{ textEncoder, f32, f32_u8, f64, f64_u8 }, utf8Length', serSource) as (
        value: SchemaType<S>,
        tmps: Tmps,
        utf8Length: (s: string) => number,
    ) => ArrayBuffer;

    const desFn = new Function('buffer', '{ textDecoder, f32, f32_u8, f64, f64_u8 }', desSource) as (
        buffer: ArrayBuffer,
        tmps: Tmps,
    ) => SchemaType<S>;

    const ser = (value: SchemaType<S>): ArrayBuffer => {
        return serFn(value, tmps, utf8Length);
    };

    const des = (buffer: ArrayBuffer) => {
        return desFn(buffer, tmps);
    };

    return { ser, des, source: { ser: serSource, des: desSource } };
}

function buildSer(schema: Schema): string {
    let code = '';

    code += 'let len = 0;';
    code += 'let bytes = 0;';

    const schemaFixedSize = fixedSize(schema);

    type SizeCalc = { code: string; fixed: number };

    function genCalcSize(s: Schema, v: string): SizeCalc {
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
                    const len = s.length;
                    const elem = genCalcSize(s.of, `${v}[i]`);
                    if (elem.code === '' && elem.fixed > 0) {
                        return { code: '', fixed: elem.fixed * len };
                    }
                    // element-wise computation at runtime
                    const inner = `len = ${len}; for (let i = 0; i < len; i++) { ${elem.code} }`;
                    return { code: inner, fixed: 0 };
                } else {
                    const elem = genCalcSize(s.of, `${v}[i]`);
                    if (elem.code === '' && elem.fixed > 0) {
                        // length prefix is unconditional (writer always writes length), hoist the 4 bytes
                        // per-item fixed contribution can be multiplied by length at runtime
                        return {
                            code: `if (Array.isArray(${v})) { size += ${elem.fixed} * ${v}.length; }`,
                            fixed: 4,
                        };
                    }
                    const inner = `if (Array.isArray(${v})) { for (let i = 0; i < ${v}.length; i++) { ${elem.code} } }`;
                    return { code: `size += 4; ${inner}`, fixed: 0 };
                }
            }
            case 'object': {
                // sum all unconditional fixed child sizes into fixed; collect dynamic parts separately.
                let fixed = 0;
                const parts: string[] = [];
                for (const [k, f] of Object.entries(s.fields)) {
                    const child = genCalcSize(f, `${v}[${JSON.stringify(k)}]`);
                    // always accumulate unconditional fixed bytes
                    fixed += child.fixed;
                    if (child.code !== '') {
                        parts.push(child.code);
                    }
                }
                return { code: parts.join(' '), fixed };
            }
            case 'record': {
                const child = genCalcSize(s.field, `${v}[k]`);
                let inner = '';
                inner += `size += 4; if (${v} && typeof ${v} === 'object') { const keys = Object.keys(${v}); `;
                if (child.fixed > 0) {
                    inner += ` size += ${child.fixed} * keys.length; `;
                }
                inner += ` for (let i = 0; i < keys.length; i++) { const k = keys[i]; const kb = textEncoder.encode(k); size += 4 + kb.length; `;
                if (child.code !== '') {
                    inner += child.code;
                }
                inner += ` } }`;
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
        const calc = genCalcSize(schema, 'value');

        code += `let size = ${calc.fixed};`;
        code += calc.code;
    }

    code += 'const arrayBuffer = new ArrayBuffer(size);';
    code += 'const view = new DataView(arrayBuffer);';
    code += 'let o = 0;';

    code += 'const u8 = new Uint8Array(arrayBuffer); ';

    code += 'let keys;';
    code += 'let val = 0;';

    function gen(s: Schema, v: string, depth: number): string {
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
                        inner += gen(s.of, `${v}[${i}]`, depth + 1);
                    }
                    return inner;
                } else {
                    // let inner = `view.setUint32(o, ${v}.length); o += 4; for (let i = 0; i < ${v}.length; i++) { `;
                    let inner = '';
                    inner += writeU32(`${v}.length`);
                    inner += `for (let ${index(depth)} = 0; ${index(depth)} < ${v}.length; ${index(depth)}++) {`;
                    inner += gen(s.of, `${v}[${index(depth)}]`, depth + 1);
                    inner += '}';
                    return inner;
                }
            }
            case 'object': {
                let out = '';
                for (const [k, f] of Object.entries(s.fields)) {
                    out += gen(f, `${v}[${JSON.stringify(k)}]`, depth + 1);
                }
                return out;
            }
            case 'record': {
                let inner = '';
                inner += `keys = Object.keys(${v});`;
                inner += writeU32('keys.length');
                inner += `for (let ${index(depth)} = 0; ${index(depth)} < keys.length; ${index(depth)}++) {`;
                inner += `const k = keys[${index(depth)}];`;
                inner += `const kb = textEncoder.encode(k);`;
                inner += writeU32('kb.length');
                inner += `u8.set(kb, o);`;
                inner += `o += kb.length;`;
                inner += gen(s.field, `${v}[k]`, depth + 1);
                inner += `}`;
                return inner;
            }
            default:
                return `throw new Error('Unsupported schema type: ${s.type}');`;
        }
    }

    code += gen(schema, 'value', 1);

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

    function gen(s: Schema, target: string, depth: number): string {
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
                    const len = s.length;
                    for (let i = 0; i < len; i++) {
                        inner += gen(s.of, `${target}[${i}]`, depth + 1);
                    }
                    return inner;
                } else {
                    // variable-length list: read length then loop
                    let inner = '';
                    inner += readU32('len');
                    inner += `${target} = new Array(len);`;
                    inner += `for (let ${index(depth)} = 0; ${index(depth)} < len; ${index(depth)}++) { `;
                    inner += gen(s.of, `${target}[${index(depth)}]`, depth + 1);
                    inner += ` }`;
                    return inner;
                }
            }
            case 'object': {
                let inner = `${target} = {};`;
                for (const [key, fieldSchema] of Object.entries(s.fields)) {
                    inner += gen(fieldSchema, `${target}[${JSON.stringify(key)}]`, depth + 1);
                }
                return inner;
            }
            case 'record': {
                let inner = '';
                inner += readU32('count');
                inner += `${target} = {};`;
                inner += `for (let ${index(depth)} = 0; ${index(depth)} < count; ${index(depth)}++) { `;
                inner += readU32('klen');
                inner += `const k = klen === 0 ? '' : textDecoder.decode(u8.subarray(o, o + klen)); o += klen;`;
                inner += gen(s.field, `${target}[k]`, depth + 1);
                inner += `}`;
                return inner;
            }
            default:
                return `throw new Error('Unsupported schema type: ${s.type}');`;
        }
    }

    const rootAssign = 'let value;';
    code += rootAssign;
    code += gen(schema, 'value', 1);
    code += 'return value;';

    return code;
}

function index(depth: number): string {
    return 'i'.repeat(depth);
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

function readBool(target: string): string {
    return `${target} = u8[o++] !== 0;`;
}

function writeBool(value: string): string {
    return `u8[o++] = ${value} ? 1 : 0;`;
}

function readI8(target: string): string {
    return `${target} = (u8[o++] << 24) >> 24;`;
}

function writeI8(value: string): string {
    return `u8[o++] = ${value};`;
}

function readU8(target: string): string {
    return `${target} = u8[o++];`;
}

function writeU8(value: string): string {
    return `u8[o++] = ${value} & 0xff;`;
}

function readI16(target: string): string {
    return `val = u8[o++] | (u8[o++] << 8); ${target} = (val << 16) >> 16;`;
}

function writeI16(value: string): string {
    return `val = ${value} & 0xffff; u8[o++] = val & 0xff; u8[o++] = (val >> 8) & 0xff;`;
}

function readU16(target: string): string {
    return `val = u8[o++] | (u8[o++] << 8); ${target} = val & 0xffff;`;
}

function writeU16(value: string): string {
    return `val = ${value} & 0xffff; u8[o++] = val & 0xff; u8[o++] = (val >> 8) & 0xff;`;
}

function readI32(target: string): string {
    return `val = (u8[o++] | (u8[o++] << 8) | (u8[o++] << 16) | (u8[o++] << 24)) | 0; ${target} = val | 0;`;
}

function writeI32(value: string): string {
    return `val = ${value} | 0; u8[o++] = val & 0xff; u8[o++] = (val >> 8) & 0xff; u8[o++] = (val >> 16) & 0xff; u8[o++] = (val >> 24) & 0xff;`;
}

function readU32(target: string): string {
    return `${target} = (u8[o++] | (u8[o++] << 8) | (u8[o++] << 16) | (u8[o++] << 24)) >>> 0;`;
}

function writeU32(value: string): string {
    return `val = ${value} >>> 0; u8[o++] = val & 0xff; u8[o++] = (val >> 8) & 0xff; u8[o++] = (val >> 16) & 0xff; u8[o++] = (val >> 24) & 0xff;`;
}

function readString(target: string): string {
    let code = '';
    code += readU32('len');
    code += `${target} = len === 0 ? '' : textDecoder.decode(u8.subarray(o, o + len)); o += len;`;

    return code;
}

function writeString(value: string): string {
    let code = '';
    code += `bytes = textEncoder.encode(${value});`;
    code += writeU32('bytes.length');
    code += `u8.set(bytes, o); o += bytes.length;`;
    return code;
}

function readF32(target: string): string {
    let code = '';
    code += `f32_u8[0] = u8[o++]; f32_u8[1] = u8[o++]; f32_u8[2] = u8[o++]; f32_u8[3] = u8[o++];`;
    code += `${target} = f32[0];`;
    return code;
}

function writeF32(value: string): string {
    let code = '';
    code += `f32[0] = ${value};`;
    code += `u8[o++] = f32_u8[0]; u8[o++] = f32_u8[1]; u8[o++] = f32_u8[2]; u8[o++] = f32_u8[3];`;
    return code;
}

function readF64(target: string): string {
    let code = '';
    code += `f64_u8[0] = u8[o++]; f64_u8[1] = u8[o++]; f64_u8[2] = u8[o++]; f64_u8[3] = u8[o++];`;
    code += `f64_u8[4] = u8[o++]; f64_u8[5] = u8[o++]; f64_u8[6] = u8[o++]; f64_u8[7] = u8[o++];`;
    code += `${target} = f64[0];`;
    return code;
}

function writeF64(value: string): string {
    let code = '';
    code += `f64[0] = ${value};`;
    code += `u8[o++] = f64_u8[0]; u8[o++] = f64_u8[1]; u8[o++] = f64_u8[2]; u8[o++] = f64_u8[3];`;
    code += `u8[o++] = f64_u8[4]; u8[o++] = f64_u8[5]; u8[o++] = f64_u8[6]; u8[o++] = f64_u8[7];`;
    return code;
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
