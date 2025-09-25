import type { Schema, SchemaType } from './schema';

type Tmps = {
    f32: Float32Array;
    f32_u8: Uint8Array;
    f64: Float64Array;
    f64_u8: Uint8Array;
    textEncoder: TextEncoder;
    textDecoder: TextDecoder;
}

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


    const serFn = new Function('value', '{ textEncoder, f32, f32_u8, f64, f64_u8 }', serSource) as (
        value: SchemaType<S>,
        tmps: Tmps,
    ) => ArrayBuffer;

    const desFn = new Function('buffer', '{ textDecoder, f32, f32_u8, f64, f64_u8 }', desSource) as (
        buffer: ArrayBuffer,
        tmps: Tmps,
    ) => SchemaType<S>;

    const ser = (value: SchemaType<S>): ArrayBuffer => {
        return serFn(value, tmps);
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

    if (schemaFixedSize !== null) {
        code += `let size = ${schemaFixedSize};`;
    } else {
        code += 'let size = 0;';
    }

    function genCalcSize(s: Schema, v: string): string {
        switch (s.type) {
            case 'boolean':
            case 'int8':
            case 'uint8':
                return 'size += 1;';
            case 'int16':
            case 'uint16':
                return 'size += 2;';
            case 'int32':
            case 'uint32':
            case 'float32':
                return 'size += 4;';
            case 'number':
            case 'float64':
                return 'size += 8;';
            case 'string':
                return `bytes = textEncoder.encode(${v} ?? ''); size += 4 + bytes.length;`;
            case 'list': {
                // fixed-length list
                if ('length' in s && typeof s.length === 'number') {
                    const len = s.length;
                    const elemFixed = fixedSize(s.of);
                    if (elemFixed !== null) {
                        // fixed total for this sub-list
                        return ` size += ${elemFixed * len};`;
                    }
                    // fall back to element-wise computation
                    let inner = `len = ${len}; for (let i = 0; i < len; i++) { `;
                    inner += genCalcSize(s.of, `${v}[i]`);
                    inner += ` }`;
                    return inner;
                } else {
                    // variable-length list: length prefix is 4 bytes
                    const elemFixed = fixedSize(s.of);
                    if (elemFixed !== null) {
                        // can compute per-length contribution at runtime without per-element loop
                        return ` size += 4; if (Array.isArray(${v})) { size += ${elemFixed} * ${v}.length; }`;
                    }
                    let inner = ` size += 4; if (Array.isArray(${v})) { for (let i = 0; i < ${v}.length; i++) { `;
                    inner += genCalcSize(s.of, `${v}[i]`);
                    inner += ` } }`;
                    return inner;
                }
            }
            case 'object': {
                let inner = '';
                for (const [k, f] of Object.entries(s.fields)) {
                    inner += genCalcSize(f, `${v}[${JSON.stringify(k)}]`);
                }
                return inner;
            }
            case 'record': {
                let inner = '';
                inner += 'size += 4;';
                inner += `if (${v} && typeof ${v} === 'object') { `;
                inner += `const keys = Object.keys(${v}); `;
                inner += `for (let i = 0; i < keys.length; i++) { `;
                inner += `const k = keys[i]; `;
                inner += `const kb = textEncoder.encode(k); `;
                inner += `size += 4 + kb.length; `;
                inner += genCalcSize(s.field, `${v}[k]`);
                inner += `}}`;
                return inner;
            }
            default: {
                return ` throw new Error('Unsupported schema type: ${s.type}');`;
            }
        }
    }

    code += genCalcSize(schema, 'value');

    code += 'const arrayBuffer = new ArrayBuffer(size);';
    code += 'const view = new DataView(arrayBuffer);';
    code += 'let o = 0;';

    code += 'const u8 = new Uint8Array(arrayBuffer); ';

    code += 'let keys;';
    code += 'let val = 0;';

    function gen(s: Schema, v: string): string {
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
                if ('length' in s && typeof s.length === 'number') {
                    const len = s.length;
                    let inner = `for (let i = 0; i < ${len}; i++) { `;
                    inner += gen(s.of, `${v}[i]`);
                    inner += ` }`;
                    return inner;
                } else {
                    let inner = `view.setUint32(o, ${v}.length); o += 4; for (let i = 0; i < ${v}.length; i++) { `;
                    inner += gen(s.of, `${v}[i]`);
                    inner += ` }`;
                    return inner;
                }
            }
            case 'object': {
                let out = '';
                for (const [k, f] of Object.entries(s.fields)) {
                    out += gen(f, `${v}[${JSON.stringify(k)}]`);
                }
                return out;
            }
            case 'record': {
                let inner = '';
                inner += `keys = ${v} ? Object.keys(${v}) : [];`;
                inner += writeU32('keys.length');
                inner += `for (let i = 0; i < keys.length; i++) {`;
                inner += `const k = keys[i];`;
                inner += `const kb = textEncoder.encode(k);`;
                inner += writeU32('kb.length');
                inner += `u8.set(kb, o);`;
                inner += `o += kb.length;`;
                inner += gen(s.field, `${v}[k]`);
                inner += `}`;
                return inner;
            }
            default:
                return `throw new Error('Unsupported schema type: ${s.type}');`;
        }
    }

    code += gen(schema, 'value');

    code += 'return arrayBuffer;';

    return code;
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
    code += `bytes = textEncoder.encode(${value} ?? '');`;
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

function buildDes(schema: Schema): string {
    let code = '';

    code += 'let o = 0;';
    code += 'const view = new DataView(buffer);';
    code += 'const u8 = new Uint8Array(buffer);';
    code += 'let len = 0;';
    code += 'let val = 0;';

    function gen(s: Schema, target: string): string {
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
                    // fixed-length list
                    const len = s.length;
                    let inner = `for (let i = 0; i < ${len}; i++) { `;
                    inner += gen(s.of, `${target}[i]`);
                    inner += ` }`;
                    return `${target} = new Array(${len}); ${inner}`;
                } else {
                    // variable-length list: first read length
                    let inner = `len = view.getUint32(o); o += 4; ${target} = new Array(len); for (let i = 0; i < len; i++) { `;
                    inner += gen(s.of, `${target}[i]`);
                    inner += ` }`;
                    return inner;
                }
            }
            case 'object': {
                let inner = `${target} = {};`;
                for (const [key, fieldSchema] of Object.entries(s.fields)) {
                    inner += gen(fieldSchema, `${target}[${JSON.stringify(key)}]`);
                }
                return inner;
            }
            case 'record': {
                let inner = '';
                inner += readU32('count');
                inner += `${target} = {};`;
                inner += `for (let i = 0; i < count; i++) { `;
                inner += readU32('klen');
                inner += `const k = klen === 0 ? '' : textDecoder.decode(u8.subarray(o, o + klen)); o += klen;`;
                inner += gen(s.field, `${target}[k]`);
                inner += `}`;
                return inner;
            }
            default:
                return `throw new Error('Unsupported schema type: ${s.type}');`;
        }
    }

    const rootAssign = 'let value;';
    code += rootAssign;
    code += gen(schema, 'value');
    code += 'return value;';

    return code;
}
