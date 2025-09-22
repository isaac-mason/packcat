import type { Schema, SchemaType } from './schema';

export function createSerDes<S extends Schema>(schema: S) {
    const state = { hasString: false };
    const serializerSrc = buildSerializerSrc(schema, 'value', 'buffer', 'offset', state, true);
    const deserializerSrc = buildDeserializerSrc(schema, 'buffer', 'offset', true);

    function calcSize(schema: Schema, value: any): number {
        switch (schema.type) {
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
            case 'string': {
                const enc = new TextEncoder();
                const bytes = enc.encode(value ?? '');
                return 4 + bytes.length;
            }
            case 'list': {
                let size = 4; // length prefix
                if (Array.isArray(value)) {
                    for (const v of value) {
                        size += calcSize(schema.of, v);
                    }
                }
                return size;
            }
            case 'object': {
                let size = 0;
                for (const [key, fieldSchema] of Object.entries(schema.fields)) {
                    size += calcSize(fieldSchema, value ? value[key] : undefined);
                }
                return size;
            }
            default:
                throw new Error('Unsupported schema type: ' + schema.type);
        }
    }

    const serializerFn = new Function('value', 'buffer', 'offset', serializerSrc) as (
        value: SchemaType<S>,
        buffer: DataView,
        offset: number,
    ) => number;

    const deserializerFn = new Function('buffer', 'offset', deserializerSrc) as (
        buffer: DataView,
        offset: number,
    ) => { value: SchemaType<S>; offset: number };

    const serialize = (value: SchemaType<S>): ArrayBuffer => {
        const size = calcSize(schema, value);
        const buffer = new ArrayBuffer(size);
        const view = new DataView(buffer);
        serializerFn(value, view, 0);
        return buffer;
    };

    const deserialize = (buffer: ArrayBuffer) => {
        return deserializerFn(new DataView(buffer), 0);
    };

    return { serialize, deserialize };
}

function buildSerializerSrc(
    schema: Schema,
    valueVar: string,
    bufferVar: string,
    offsetVar: string,
    state: { hasString: boolean },
    root: boolean,
): string {
    let code = root ? `let o = ${offsetVar};` : '';

    switch (schema.type) {
        case 'boolean': {
            code += `${bufferVar}.setUint8(o, ${valueVar} ? 1 : 0); o += 1;`;
            break;
        }
        case 'number': {
            code += `${bufferVar}.setFloat64(o, ${valueVar}); o += 8;`;
            break;
        }
        case 'int8': {
            code += `${bufferVar}.setInt8(o, ${valueVar}); o += 1;`;
            break;
        }
        case 'uint8': {
            code += `${bufferVar}.setUint8(o, ${valueVar}); o += 1;`;
            break;
        }
        case 'int16': {
            code += `${bufferVar}.setInt16(o, ${valueVar}); o += 2;`;
            break;
        }
        case 'uint16': {
            code += `${bufferVar}.setUint16(o, ${valueVar}); o += 2;`;
            break;
        }
        case 'int32': {
            code += `${bufferVar}.setInt32(o, ${valueVar}); o += 4;`;
            break;
        }
        case 'uint32': {
            code += `${bufferVar}.setUint32(o, ${valueVar}); o += 4;`;
            break;
        }
        case 'float32': {
            code += `${bufferVar}.setFloat32(o, ${valueVar}); o += 4;`;
            break;
        }
        case 'float64': {
            code += `${bufferVar}.setFloat64(o, ${valueVar}); o += 8;`;
            break;
        }
        case 'string': {
            state.hasString = true;
            code += `const bytes = enc.encode(${valueVar});`;
            code += `${bufferVar}.setUint32(o, bytes.length); o += 4;`;
            code += `for (let i = 0; i < bytes.length; i++) { ${bufferVar}.setUint8(o + i, bytes[i]); } o += bytes.length;`;
            break;
        }
        case 'list':
            code += `${bufferVar}.setUint32(o, ${valueVar}.length); o += 4;`;
            code += `for (let i = 0; i < ${valueVar}.length; i++) {`;
            code += `o = (function(value, buffer, offset) {`;
            code += buildSerializerSrc(schema.of, 'value', 'buffer', 'offset', state, false);
            code += `})(`;
            code += `${valueVar}[i], ${bufferVar}, o);`;
            code += `}`;
            break;
        case 'object': {
            for (const [key, fieldSchema] of Object.entries(schema.fields)) {
                code += `o = (function(value, buffer, offset) {`;
                code += buildSerializerSrc(fieldSchema, 'value', 'buffer', 'offset', state, false);
                code += `})(`;
                code += `${valueVar}[${JSON.stringify(key)}], ${bufferVar}, o);`;
            }
            break;
        }
        default: {
            code += `throw new Error('Unsupported schema type: ${schema.type}');`;
        }
    }
    code += 'return o;';

    if (root && state.hasString) {
        code = `const enc = new TextEncoder();` + code;
    }

    return code;
}

function buildDeserializerSrc(schema: Schema, bufferVar: string, offsetVar: string, root: boolean = false): string {
    let code = root ? `let o = ${offsetVar};` : '';

    switch (schema.type) {
        case 'boolean': {
            code += `const value = !!${bufferVar}.getUint8(o); o += 1;`;
            code += 'return { value, offset: o };';
            break;
        }
        case 'number': {
            code += `const value = ${bufferVar}.getFloat64(o); o += 8;`;
            code += 'return { value, offset: o };';
            break;
        }
        case 'int8': {
            code += `const value = ${bufferVar}.getInt8(o); o += 1;`;
            code += 'return { value, offset: o };';
            break;
        }
        case 'uint8': {
            code += `const value = ${bufferVar}.getUint8(o); o += 1;`;
            code += 'return { value, offset: o };';
            break;
        }
        case 'int16': {
            code += `const value = ${bufferVar}.getInt16(o); o += 2;`;
            code += 'return { value, offset: o };';
            break;
        }
        case 'uint16': {
            code += `const value = ${bufferVar}.getUint16(o); o += 2;`;
            code += 'return { value, offset: o };';
            break;
        }
        case 'int32': {
            code += `const value = ${bufferVar}.getInt32(o); o += 4;`;
            code += 'return { value, offset: o };';
            break;
        }
        case 'uint32': {
            code += `const value = ${bufferVar}.getUint32(o); o += 4;`;
            code += 'return { value, offset: o };';
            break;
        }
        case 'float32': {
            code += `const value = ${bufferVar}.getFloat32(o); o += 4;`;
            code += 'return { value, offset: o };';
            break;
        }
        case 'float64': {
            code += `const value = ${bufferVar}.getFloat64(o); o += 8;`;
            code += 'return { value, offset: o };';
            break;
        }
        case 'string': {
            code += `const len = ${bufferVar}.getUint32(o); o += 4;`;
            code += `const bytes = new Uint8Array(${bufferVar}.buffer, ${bufferVar}.byteOffset + o, len);`;
            code += `const value = new TextDecoder().decode(bytes); o += len;`;
            code += 'return { value, offset: o };';
            break;
        }
        case 'list': {
            code += `const len = ${bufferVar}.getUint32(o); o += 4; const arr = [];`;
            code += `for (let i = 0; i < len; i++) {`;
            code += `const result = (function() {${buildDeserializerSrc(schema.of, bufferVar, 'o', false)}})(); arr.push(result.value); o = result.offset;`;
            code += `}`;
            code += 'return { value: arr, offset: o };';
            break;
        }
        case 'object': {
            code += 'const obj = {};';
            for (const [key, fieldSchema] of Object.entries(schema.fields)) {
                code += `const result_${key} = (function() {${buildDeserializerSrc(fieldSchema, bufferVar, 'o', false)}})(); obj[${JSON.stringify(key)}] = result_${key}.value; o = result_${key}.offset;`;
            }
            code += 'return { value: obj, offset: o };';
            break;
        }
        default: {
            code += `throw new Error('Unsupported schema type: ${schema.type}');`;
        }
    }
    return code;
}
