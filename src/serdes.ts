import type { Schema, SchemaType } from './schema';

export function serDes<S extends Schema>(schema: S): {
    ser: (value: SchemaType<S>) => ArrayBuffer;
    des: (buffer: ArrayBuffer) => SchemaType<S>;
} {
    const state = { hasString: false };

    const serializerSrc = buildSerializerSrc(schema, 'value', 'buffer', 'offset', state, true);
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
    ) => { value: SchemaType<S>; offset: number };

    const calculateSizeFn = new Function('value', calculateSizeSrc) as (value: any) => number;

    const ser = (value: SchemaType<S>): ArrayBuffer => {
        const size = calculateSizeFn(value);
        const buffer = new ArrayBuffer(size);
        const view = new DataView(buffer);
        serializerFn(value, view, 0);
        return buffer;
    };

    const des = (buffer: ArrayBuffer) => {
        return deserializerFn(new DataView(buffer), 0).value;
    };

    return { ser, des };
}

function containsString(s: Schema): boolean {
    if (s.type === 'string') return true;
    if (s.type === 'list') return containsString(s.of);
    if (s.type === 'object') return Object.values(s.fields).some(containsString);
    if (s.type === 'record') return containsString(s.field);
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
                    let body = `const _len = ${len}; for (let i = 0; i < _len; i++) { `;
                    body += gen(s.of, `${v}[i]`);
                    body += ` }`;
                    return body;
                } else {
                    let body = ` size += 4; if (Array.isArray(${v})) { for (let i = 0; i < ${v}.length; i++) { `;
                    body += gen(s.of, `${v}[i]`);
                    body += ` } }`;
                    return body;
                }
            case 'record': {
                // variable map: encode count (uint32) then for-in over keys: key string length+bytes + value
                let out = ` size += 4; if (${v} && typeof ${v} === 'object') { for (const _k in ${v}) { const _kb = textEncoder.encode(_k); size += 4 + _kb.length; `;
                out += gen(s.field, `${v}[_k]`);
                out += ` } }`;
                return out;
            }
            case 'object': {
                let out = '';
                for (const [k, f] of Object.entries(s.fields)) {
                    out += gen(f, `${v}[${JSON.stringify(k)}]`);
                }
                return out;
            }
            default:
                return ` throw new Error('Unsupported schema type: ${s.type}');`;
        }
    }

    code += gen(schema, valueVar);

    code += ' return size;';

    return code;
}

function buildSerializerSrc(
    schema: Schema,
    valueVar: string,
    bufferVar: string,
    offsetVar: string,
    state: { hasString: boolean },
    root: boolean,
): string {
    // Build source in a similar style to the deserializer generator: declare o at root, use direct set* calls.
    let code = root ? `let o = ${offsetVar};` : '';

    function gen(s: Schema, v: string): string {
        switch (s.type) {
            case 'boolean':
                return `${bufferVar}.setUint8(o, ${v} ? 1 : 0); o += 1;`;
            case 'number':
                return `${bufferVar}.setFloat64(o, ${v}); o += 8;`;
            case 'int8':
                return `${bufferVar}.setInt8(o, ${v}); o += 1;`;
            case 'uint8':
                return `${bufferVar}.setUint8(o, ${v}); o += 1;`;
            case 'int16':
                return `${bufferVar}.setInt16(o, ${v}); o += 2;`;
            case 'uint16':
                return `${bufferVar}.setUint16(o, ${v}); o += 2;`;
            case 'int32':
                return `${bufferVar}.setInt32(o, ${v}); o += 4;`;
            case 'uint32':
                return `${bufferVar}.setUint32(o, ${v}); o += 4;`;
            case 'float32':
                return `${bufferVar}.setFloat32(o, ${v}); o += 4;`;
            case 'float64':
                return `${bufferVar}.setFloat64(o, ${v}); o += 8;`;
            case 'string':
                // mark that schema contains strings so we can prepend a shared encoder
                state.hasString = true;
                // encode into bytes using shared textEncoder, then write length and bytes
                return `{
                    const _bytes = textEncoder.encode(${v} ?? '');
                    ${bufferVar}.setUint32(o, _bytes.length); o += 4;
                    for (let i = 0; i < _bytes.length; i++) { ${bufferVar}.setUint8(o + i, _bytes[i]); }
                    o += _bytes.length;
                }`;
            case 'list':
                if ('length' in s && typeof s.length === 'number') {
                    const len = s.length;
                    let body = `for (let i = 0; i < ${len}; i++) { `;
                    body += gen(s.of, `${v}[i]`);
                    body += ` }`;
                    return body;
                } else {
                    let body = `${bufferVar}.setUint32(o, ${v}.length); o += 4; for (let i = 0; i < ${v}.length; i++) { `;
                    body += gen(s.of, `${v}[i]`);
                    body += ` }`;
                    return body;
                }
            case 'object': {
                let out = '';
                for (const [k, f] of Object.entries(s.fields)) {
                    out += gen(f, `${v}[${JSON.stringify(k)}]`);
                }
                return out;
            }
            default:
                return `throw new Error('Unsupported schema type: ${s.type}');`;
        }
    }

    code += gen(schema, valueVar);

    if (root) code += 'return o;';

    if (root && state.hasString) {
        code = `const textEncoder = new TextEncoder(); ${code}`;
    }

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
                    let inner = `const _len = buffer.getUint32(o); o += 4; ${target} = new Array(_len); for (let i = 0; i < _len; i++) { `;
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
                // read count, then loop that many key/value entries
                let parts = `{
                    const _count = buffer.getUint32(o); o += 4;
                    ${target} = {};
                    for (let _i = 0; _i < _count; _i++) {
                        const _klen = buffer.getUint32(o); o += 4;
                        const _k = textDecoder.decode(new Uint8Array(buffer.buffer, buffer.byteOffset + o, _klen));
                        o += _klen;
                        ${gen(s.field, `${target}[_k]`)}
                    }
                }`;
                return parts;
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

    code += 'return { value, offset: o };';

    return code;
}
