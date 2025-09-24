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
    const calculateSizeSrc = buildCalculateSizeSrc(schema, 'value');

    const serializerFn = new Function('value', 'buffer', 'offset', serializerSrc) as (
        value: SchemaType<S>,
        buffer: DataView,
        offset: number,
    ) => number;

    const deserializerFn = new Function('buffer', 'offset', deserializerSrc) as (
        buffer: DataView,
        offset: number,
    ) => SchemaType<S>;

    const calculateSizeFn = new Function('value', calculateSizeSrc) as (value: any) => number;

    const ser = (value: SchemaType<S>): ArrayBuffer => {
        const size = calculateSizeFn(value);
        const buffer = new ArrayBuffer(size);
        const view = new DataView(buffer);
        serializerFn(value, view, 0);
        return buffer;
    };

    const des = (buffer: ArrayBuffer) => {
        return deserializerFn(new DataView(buffer), 0);
    };

    return { ser, des, source: { size: calculateSizeSrc, ser: serializerSrc, des: deserializerSrc } };
}

function containsString(s: Schema): boolean {
    if (s.type === 'string') return true;
    if (s.type === 'record') return true;
    if (s.type === 'list') return containsString(s.of);
    if (s.type === 'object') return Object.values(s.fields).some(containsString);
    return false;
}

function buildCalculateSizeSrc(schema: Schema, valueVar: string): string {
    let code = '';

    if (containsString(schema)) {
        code += 'const textEncoder = new TextEncoder(); ';
    }

    code += 'let size = 0;';

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
                // encode using shared textEncoder, count bytes, add 4 for length
                return `{
                    const _b = textEncoder.encode(${v} ?? '');
                    size += 4 + _b.length;
                }`;
            case 'list':
                if ('length' in s && typeof s.length === 'number') {
                    const len = s.length;
                    let body = `const len = ${len}; for (let i = 0; i < len; i++) { `;
                    body += gen(s.of, `${v}[i]`);
                    body += ` }`;
                    return body;
                } else {
                    let body = ` size += 4; if (Array.isArray(${v})) { for (let i = 0; i < ${v}.length; i++) { `;
                    body += gen(s.of, `${v}[i]`);
                    body += ` } }`;
                    return body;
                }
            case 'object': {
                let out = '';
                for (const [k, f] of Object.entries(s.fields)) {
                    out += gen(f, `${v}[${JSON.stringify(k)}]`);
                }
                return out;
            }
            case 'record': {
                return `{
                    size += 4;
                    if (${v} && typeof ${v} === 'object') {
                        const keys = Object.keys(${v});
                        for (let i = 0; i < keys.length; i++) {
                            const k = keys[i];
                            const kb = textEncoder.encode(k);
                            size += 4 + kb.length;
                            ${gen(s.field, `${v}[k]`)}
                        }
                    }
                }`;
            }
            default: {
                return ` throw new Error('Unsupported schema type: ${s.type}');`;
            }
        }
    }

    code += gen(schema, valueVar);

    code += ' return size;';

    return code;
}

function buildSerializerSrc(schema: Schema): string {
    let code = `let o = offset;`;

    if (containsString(schema)) {
        code += 'const textEncoder = new TextEncoder(); ';
    }

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
                return `{
                    const bytes = textEncoder.encode(${v} ?? '');
                    buffer.setUint32(o, bytes.length); o += 4;
                    for (let i = 0; i < bytes.length; i++) { buffer.setUint8(o + i, bytes[i]); }
                    o += bytes.length;
                }`;
            }
            case 'list': {
                if ('length' in s && typeof s.length === 'number') {
                    const len = s.length;
                    let body = `for (let i = 0; i < ${len}; i++) { `;
                    body += gen(s.of, `${v}[i]`);
                    body += ` }`;
                    return body;
                } else {
                    let body = `buffer.setUint32(o, ${v}.length); o += 4; for (let i = 0; i < ${v}.length; i++) { `;
                    body += gen(s.of, `${v}[i]`);
                    body += ` }`;
                    return body;
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
                return `{
                    const keys = ${v} ? Object.keys(${v}) : [];
                    buffer.setUint32(o, keys.length); o += 4;
                    for (let i = 0; i < keys.length; i++) {
                        const k = keys[i];
                        const kb = textEncoder.encode(k);
                        buffer.setUint32(o, kb.length); o += 4;
                        for (let j = 0; j < kb.length; j++) { buffer.setUint8(o + j, kb[j]); }
                        o += kb.length;
                        ${gen(s.field, `${v}[k]`)}
                    }
                }`;
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
                return `{
                    const len = buffer.getUint32(o); o += 4;
                    ${target} = len === 0 ? '' : textDecoder.decode(new Uint8Array(buffer.buffer, buffer.byteOffset + o, len));
                    o += len;
                }`;
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
                    let inner = `const len = buffer.getUint32(o); o += 4; ${target} = new Array(len); for (let i = 0; i < len; i++) { `;
                    inner += gen(s.of, `${target}[i]`);
                    inner += ` }`;
                    return inner;
                }
            }
            case 'object': {
                let parts = `${target} = {};`;
                for (const [key, fieldSchema] of Object.entries(s.fields)) {
                    parts += gen(fieldSchema, `${target}[${JSON.stringify(key)}]`);
                }
                return parts;
            }
            case 'record': {
                return `{
                    const count = buffer.getUint32(o); o += 4;
                    ${target} = {};
                    for (let i = 0; i < count; i++) {
                        const klen = buffer.getUint32(o); o += 4;
                        const k = klen === 0 ? '' : textDecoder.decode(new Uint8Array(buffer.buffer, buffer.byteOffset + o, klen));
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

    if (containsString(schema)) {
        code = `const textDecoder = new TextDecoder(); ${code}`;
    }

    code += 'return value;';

    return code;
}
