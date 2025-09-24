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

    const calculateSizeFn = new Function('value', 'textEncoder', calculateSizeSrc) as (value: any, textEncoder: TextEncoder) => number;

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

function buildCalculateSizeSrc(schema: Schema, valueVar: string): string {
    let code = '';

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
            case 'list':
                if ('length' in s && typeof s.length === 'number') {
                    const len = s.length;
                    let inner = `len = ${len}; for (let i = 0; i < len; i++) { `;
                    inner += gen(s.of, `${v}[i]`);
                    inner += ` }`;
                    return inner;
                } else {
                    let inner = ` size += 4; if (Array.isArray(${v})) { for (let i = 0; i < ${v}.length; i++) { `;
                    inner += gen(s.of, `${v}[i]`);
                    inner += ` } }`;
                    return inner;
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

    code += gen(schema, valueVar);

    code += ' return size;';

    return code;
}

function buildSerializerSrc(schema: Schema): string {
    let code = `let o = offset;`;

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
                return `bytes = textEncoder.encode(${v} ?? ''); buffer.setUint32(o, bytes.length); o += 4; new Uint8Array(buffer.buffer, buffer.byteOffset + o, bytes.length).set(bytes); o += bytes.length;`;
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
                inner += ` new Uint8Array(buffer.buffer, buffer.byteOffset + o, kb.length).set(kb);`;
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
                return `len = buffer.getUint32(o); o += 4; ${target} = len === 0 ? '' : textDecoder.decode(new Uint8Array(buffer.buffer, buffer.byteOffset + o, len)); o += len;`;
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
    code += 'return value;';

    return code;
}
