import type { Schema, SchemaType } from './schema';

export function serDes<S extends Schema>(
    schema: S,
): {
    ser: (value: SchemaType<S>) => ArrayBuffer;
    des: (buffer: ArrayBuffer) => SchemaType<S>;
    source: { ser: string; des: string };
} {
    const serSource = buildSer(schema);
    const desSource = buildDes(schema);

    const sharedTextEncoder = new TextEncoder();
    const sharedTextDecoder = new TextDecoder();

    const serFn = new Function('value', 'textEncoder', serSource) as (
        value: SchemaType<S>,
        textEncoder: TextEncoder,
    ) => ArrayBuffer;

    const desFn = new Function('view', 'offset', 'textDecoder', desSource) as (
        view: DataView,
        offset: number,
        textDecoder: TextDecoder,
    ) => SchemaType<S>;

    const ser = (value: SchemaType<S>): ArrayBuffer => {
        return serFn(value, sharedTextEncoder);
    };

    const des = (buffer: ArrayBuffer) => {
        return desFn(new DataView(buffer), 0, sharedTextDecoder);
    };

    return { ser, des, source: { ser: serSource, des: desSource } };
}

function buildSer(schema: Schema): string {
    let code = 'let len = 0; let bytes = 0;';

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
                return ` size += 1;`;
            case 'int16':
            case 'uint16':
                return ` size += 2;`;
            case 'int32':
            case 'uint32':
            case 'float32':
                return ` size += 4;`;
            case 'number':
            case 'float64':
                return ` size += 8;`;
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
                return `u8[o++] = ${v} ? 1 : 0;`;
            case 'number':
                return `view.setFloat64(o, ${v}); o += 8;`;
            case 'int8':
                return `u8[o++] = ${v} & 0xff;`;
            case 'uint8':
                return `u8[o++] = ${v} & 0xff;`;
            case 'int16':
                return `val = ${v} & 0xffff; u8[o++] = val & 0xff; u8[o++] = (val >> 8) & 0xff;`;
            case 'uint16':
                return `val = ${v} & 0xffff; u8[o++] = val & 0xff; u8[o++] = (val >> 8) & 0xff;`;
            case 'int32':
                return `val = ${v} | 0; u8[o++] = val & 0xff; u8[o++] = (val >> 8) & 0xff; u8[o++] = (val >> 16) & 0xff; u8[o++] = (val >> 24) & 0xff;`;
            case 'uint32':
                return `val = ${v} >>> 0; u8[o++] = val & 0xff; u8[o++] = (val >> 8) & 0xff; u8[o++] = (val >> 16) & 0xff; u8[o++] = (val >> 24) & 0xff;`;
            case 'float32':
                return `view.setFloat32(o, ${v}); o += 4;`;
            case 'float64':
                return `view.setFloat64(o, ${v}); o += 8;`;
            case 'string': {
                return `bytes = textEncoder.encode(${v} ?? ''); view.setUint32(o, bytes.length); o += 4; u8.set(bytes, o); o += bytes.length;`;
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
                inner += `view.setUint32(o, keys.length); o += 4;`;
                inner += `for (let i = 0; i < keys.length; i++) {`;
                inner += ` const k = keys[i];`;
                inner += ` const kb = textEncoder.encode(k);`;
                inner += ` view.setUint32(o, kb.length); o += 4;`;
                inner += ` u8.set(kb, o);`;
                inner += ` o += kb.length;`;
                inner += gen(s.field, `${v}[k]`);
                inner += ` }`;
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
    let code = 'let o = offset;';

    code += 'let len = 0;';
    code += 'let val = 0;';

    code += 'const u8 = new Uint8Array(view.buffer, view.byteOffset, view.byteLength); ';

    function gen(s: Schema, target: string): string {
        switch (s.type) {
            case 'boolean':
                return `${target} = u8[o++] !== 0;`;
            case 'number':
                return `${target} = view.getFloat64(o); o += 8;`;
            case 'int8':
                return `${target} = (u8[o++] << 24) >> 24;`;
            case 'uint8':
                return `${target} = u8[o++];`;
            case 'int16':
                return `val = u8[o++] | (u8[o++] << 8); ${target} = (val << 16) >> 16;`;
            case 'uint16':
                return `${target} = u8[o++] | (u8[o++] << 8);`;
            case 'int32':
                return `val = (u8[o++] | (u8[o++] << 8) | (u8[o++] << 16) | (u8[o++] << 24)) | 0; ${target} = val | 0;`;
            case 'uint32':
                return `${target} = (u8[o++] | (u8[o++] << 8) | (u8[o++] << 16) | (u8[o++] << 24)) >>> 0;`;
            case 'float32':
                return `${target} = view.getFloat32(o); o += 4;`;
            case 'float64':
                return `${target} = view.getFloat64(o); o += 8;`;
            case 'string': {
                return `len = view.getUint32(o); o += 4; ${target} = len === 0 ? '' : textDecoder.decode(u8.subarray(o, o + len)); o += len;`;
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
                return `{
                    const count = view.getUint32(o); o += 4;
                    ${target} = {};
                    for (let i = 0; i < count; i++) {
                        const klen = view.getUint32(o); o += 4;
                        const k = klen === 0 ? '' : textDecoder.decode(u8.subarray(o, o + klen));
                        o += klen;
                        ${gen(s.field, `${target}[k]`)}
                    }
                }`;
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
