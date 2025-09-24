import type { Schema, SchemaType } from './schema';

export function serDes<S extends Schema>(
    schema: S,
): {
    ser: (value: SchemaType<S>) => ArrayBuffer;
    des: (buffer: ArrayBuffer) => SchemaType<S>;
    source: { size: string; ser: string; des: string };
} {
    const serializerSrc = buildSerializerSrc(schema);
    const deserializerSrc = buildDeserializerSrc(schema);
    const calculateSizeSrc = buildCalculateSizeSrc(schema);

    // shared encoder/decoder to avoid constructing per call
    const sharedTextEncoder = new TextEncoder();
    const sharedTextDecoder = new TextDecoder();

    const serializerFn = new Function('value', 'buffer', 'offset', 'textEncoder', serializerSrc) as (
        value: SchemaType<S>,
        buffer: DataView,
        offset: number,
        textEncoder: TextEncoder,
    ) => number;

    const deserializerFn = new Function('buffer', 'offset', 'textDecoder', deserializerSrc) as (
        buffer: DataView,
        offset: number,
        textDecoder: TextDecoder,
    ) => SchemaType<S>;

    const calculateSizeFn = new Function('value', 'textEncoder', calculateSizeSrc) as (
        value: any,
        textEncoder: TextEncoder,
    ) => number;

    const ser = (value: SchemaType<S>): ArrayBuffer => {
        const size = calculateSizeFn(value, sharedTextEncoder);
        const buffer = new ArrayBuffer(size);
        const view = new DataView(buffer);
        serializerFn(value, view, 0, sharedTextEncoder);
        return buffer;
    };

    const des = (buffer: ArrayBuffer) => {
        return deserializerFn(new DataView(buffer), 0, sharedTextDecoder);
    };

    return { ser, des, source: { size: calculateSizeSrc, ser: serializerSrc, des: deserializerSrc } };
}

function needsU8(s: Schema): boolean {
    if (s.type === 'int8') return true;
    if (s.type === 'uint8') return true;
    if (s.type === 'int16') return true;
    if (s.type === 'uint16') return true;
    if (s.type === 'int32') return true;
    if (s.type === 'uint32') return true;
    if (s.type === 'string') return true;
    if (s.type === 'record') return true;
    if (s.type === 'list') return needsU8(s.of);
    if (s.type === 'object') return Object.values(s.fields).some(needsU8);
    return false;
}

function buildCalculateSizeSrc(schema: Schema): string {
    // helper to compute a fully-fixed size at codegen time; returns number or null
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

    // if the whole schema is fixed-size, emit a constant return
    const schemaKnownSize = fixedSize(schema);

    if (schemaKnownSize !== null) {
        return `return ${schemaKnownSize};`;
    }

    let code = '';

    // keep small runtime vars
    code += 'let size = 0;';
    code += 'let len = 0;';
    code += 'let bytes = 0;';

    function gen(s: Schema, v: string): string {
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
                    inner += gen(s.of, `${v}[i]`);
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
                    inner += gen(s.of, `${v}[i]`);
                    inner += ` } }`;
                    return inner;
                }
            }
            case 'object': {
                let inner = '';
                for (const [k, f] of Object.entries(s.fields)) {
                    inner += gen(f, `${v}[${JSON.stringify(k)}]`);
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
                inner += gen(s.field, `${v}[k]`);
                inner += `}}`;
                return inner;
            }
            default: {
                return ` throw new Error('Unsupported schema type: ${s.type}');`;
            }
        }
    }

    code += gen(schema, 'value');

    code += ' return size;';

    return code;
}

function buildSerializerSrc(schema: Schema): string {
    let code = `let o = offset;`;

    if (needsU8(schema)) {
        code += 'const u8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength); ';
    }

    code += 'let bytes = 0;';
    code += 'let keys;';

    function gen(s: Schema, v: string): string {
        switch (s.type) {
            case 'boolean':
                return `buffer.setUint8(o, ${v} ? 1 : 0); o += 1;`;
            case 'number':
                return `buffer.setFloat64(o, ${v}); o += 8;`;
            case 'int8':
                return `buffer.setInt8(o, ${v}); o += 1;`;
            case 'uint8':
                return `buffer.setUint8(o, ${v}); o += 1;`;
            case 'int16':
                return `buffer.setInt16(o, ${v}); o += 2;`;
            case 'uint16':
                return `buffer.setUint16(o, ${v}); o += 2;`;
            case 'int32':
                return `buffer.setInt32(o, ${v}); o += 4;`;
            case 'uint32':
                return `buffer.setUint32(o, ${v}); o += 4;`;
            case 'float32':
                return `buffer.setFloat32(o, ${v}); o += 4;`;
            case 'float64':
                return `buffer.setFloat64(o, ${v}); o += 8;`;
            case 'string': {
                return `bytes = textEncoder.encode(${v} ?? ''); buffer.setUint32(o, bytes.length); o += 4; u8.set(bytes, o); o += bytes.length;`;
            }
            case 'list': {
                if ('length' in s && typeof s.length === 'number') {
                    const len = s.length;
                    let inner = `for (let i = 0; i < ${len}; i++) { `;
                    inner += gen(s.of, `${v}[i]`);
                    inner += ` }`;
                    return inner;
                } else {
                    let inner = `buffer.setUint32(o, ${v}.length); o += 4; for (let i = 0; i < ${v}.length; i++) { `;
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
                inner += `buffer.setUint32(o, keys.length); o += 4;`;
                inner += `for (let i = 0; i < keys.length; i++) {`;
                inner += ` const k = keys[i];`;
                inner += ` const kb = textEncoder.encode(k);`;
                inner += ` buffer.setUint32(o, kb.length); o += 4;`;
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

    code += 'return o;';

    return code;
}

function buildDeserializerSrc(schema: Schema): string {
    let code = 'let o = offset;';

    code += 'let len = 0;';

    if (needsU8(schema)) {
        code += 'const u8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength); ';
    }

    function gen(s: Schema, target: string): string {
        switch (s.type) {
            case 'boolean':
                return `${target} = buffer.getUint8(o) !== 0; o += 1;`;
            case 'number':
                return `${target} = buffer.getFloat64(o); o += 8;`;
            case 'int8':
                return `${target} = buffer.getInt8(o); o += 1;`;
            case 'uint8':
                return `${target} = buffer.getUint8(o); o += 1;`;
            case 'int16':
                return `${target} = buffer.getInt16(o); o += 2;`;
            case 'uint16':
                return `${target} = buffer.getUint16(o); o += 2;`;
            case 'int32':
                return `${target} = buffer.getInt32(o); o += 4;`;
            case 'uint32':
                return `${target} = buffer.getUint32(o); o += 4;`;
            case 'float32':
                return `${target} = buffer.getFloat32(o); o += 4;`;
            case 'float64':
                return `${target} = buffer.getFloat64(o); o += 8;`;
            case 'string': {
                return `len = buffer.getUint32(o); o += 4; ${target} = len === 0 ? '' : textDecoder.decode(u8.subarray(o, o + len)); o += len;`;
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
                    let inner = `len = buffer.getUint32(o); o += 4; ${target} = new Array(len); for (let i = 0; i < len; i++) { `;
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
                    const count = buffer.getUint32(o); o += 4;
                    ${target} = {};
                    for (let i = 0; i < count; i++) {
                        const klen = buffer.getUint32(o); o += 4;
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
