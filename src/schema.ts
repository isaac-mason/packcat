export type BooleanSchema = {
    type: 'boolean';
};

export type StringSchema = {
    type: 'string';
};

export type NumberSchema = {
    type: 'number';
};

export type VarIntSchema = {
    type: 'varint';
};

export type VarUintSchema = {
    type: 'varuint';
};

export type Int8Schema = {
    type: 'int8';
};

export type Uint8Schema = {
    type: 'uint8';
};  

export type Int16Schema = {
    type: 'int16';
};

export type Uint16Schema = {
    type: 'uint16';
};

export type Int32Schema = {
    type: 'int32';
};

export type Uint32Schema = {
    type: 'uint32';
};

export type Int64Schema = {
    type: 'int64';
};

export type Uint64Schema = {
    type: 'uint64';
};

export type Float16Schema = {
    type: 'float16';
};

export type Float32Schema = {
    type: 'float32';
};

export type Float64Schema = {
    type: 'float64';
};

export type QuantizedSchema = {
    type: 'quantized';
    min: number;
    max: number;
    /** Precision/step size for quantization */
    step: number;
    /** Bytes used for encoding (derived from step or explicitly set) */
    bytes: number;
};

export type QuatSchema = {
    type: 'quat';
    /** Precision/step size for component quantization */
    step: number;
    /** Bytes used for encoding (derived from step or explicitly set) */
    bytes: number;
};

export type UV2Schema = {
    type: 'uv2';
    /** Precision/step size for angle quantization */
    step: number;
    /** Bytes used for encoding (derived from step or explicitly set) */
    bytes: number;
};

export type UV3Schema = {
    type: 'uv3';
    /** Precision/step size for component quantization */
    step: number;
    /** Bytes used for encoding (derived from step or explicitly set) */
    bytes: number;
};

export type ListSchema = {
    type: 'list';
    of: Schema;
    length?: number;
};

export type TupleSchema = {
    type: 'tuple';
    of: Schema[];
};

export type ObjectSchema = {
    type: 'object';
    fields: Record<string, Schema>;
};

export type RecordSchema = {
    type: 'record';
    field: Schema;
};

export type Uint8ArraySchema = {
    type: 'uint8Array';
    length?: number;
};

export type BitSetSchema = {
    type: 'bitset';
    keys: string[];
};

export type LiteralSchema = {
    type: 'literal';
    value: SchemaType<PrimitiveSchema>;
};

export type NullableSchema = {
    type: 'nullable';
    of: Schema;
};

export type OptionalSchema = {
    type: 'optional';
    of: Schema;
};

export type NullishSchema = {
    type: 'nullish';
    of: Schema;
};

export type UnionSchema = {
    type: 'union';
    key: string;
    variants: Array<ObjectSchema>;
};

export type PrimitiveSchema =
    | BooleanSchema
    | NumberSchema
    | Int8Schema
    | Uint8Schema
    | Int16Schema
    | Uint16Schema
    | Int32Schema
    | Uint32Schema
    | Float32Schema
    | Float64Schema
    | StringSchema;

export type Schema =
    | BooleanSchema
    | NumberSchema
    | VarIntSchema
    | VarUintSchema
    | Int8Schema
    | Uint8Schema
    | Int16Schema
    | Uint16Schema
    | Int32Schema
    | Uint32Schema
    | Int64Schema
    | Uint64Schema
    | Float16Schema
    | Float32Schema
    | Float64Schema
    | QuantizedSchema
    | QuatSchema
    | UV2Schema
    | UV3Schema
    | StringSchema
    | ListSchema
    | TupleSchema
    | ObjectSchema
    | RecordSchema
    | Uint8ArraySchema
    | BitSetSchema
    | UnionSchema
    | LiteralSchema
    | NullableSchema
    | OptionalSchema
    | NullishSchema;

type RepeatTypeMap<T> = {
    0: [];
    1: [T];
    2: [T, T];
    3: [T, T, T];
    4: [T, T, T, T];
    5: [T, T, T, T, T];
    6: [T, T, T, T, T, T];
    7: [T, T, T, T, T, T, T];
    8: [T, T, T, T, T, T, T, T];
    9: [T, T, T, T, T, T, T, T, T];
    10: [T, T, T, T, T, T, T, T, T, T];
    11: [T, T, T, T, T, T, T, T, T, T, T];
    12: [T, T, T, T, T, T, T, T, T, T, T, T];
    13: [T, T, T, T, T, T, T, T, T, T, T, T, T];
    14: [T, T, T, T, T, T, T, T, T, T, T, T, T, T];
    15: [T, T, T, T, T, T, T, T, T, T, T, T, T, T, T];
    16: [T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T];
};

type RepeatType<T, N extends number> = N extends keyof RepeatTypeMap<T> ? RepeatTypeMap<T>[N] : T[];

type Simplify<T> = { [K in keyof T]: T[K] } & {};

type NextDepth = {
    0: 0;
    1: 0;
    2: 1;
    3: 2;
    4: 3;
    5: 4;
    6: 5;
    7: 6;
    8: 7;
    9: 8;
    10: 9;
    11: 10;
    12: 11;
    13: 12;
    14: 13;
    15: 14;
};

type DecrementDepth<N extends keyof NextDepth> = N extends keyof NextDepth ? NextDepth[N] : 0;

// biome-ignore format: readability
export type SchemaType<S extends Schema, Depth extends keyof NextDepth = 15> =
    Depth extends 0 ? any :
    S extends BooleanSchema ? boolean :
    S extends StringSchema ? string :
    S extends NumberSchema ? number :
    S extends VarIntSchema ? number :
    S extends VarUintSchema ? number :
    S extends Int8Schema ? number :
    S extends Uint8Schema ? number :
    S extends Int16Schema ? number :
    S extends Uint16Schema ? number :
    S extends Int32Schema ? number :
    S extends Uint32Schema ? number :
    S extends Int64Schema ? bigint :
    S extends Uint64Schema ? bigint :
    S extends Float16Schema ? number :
    S extends Float32Schema ? number :
    S extends Float64Schema ? number :
    S extends QuantizedSchema ? number :
    S extends QuatSchema ? [x: number, y: number, z: number, w: number] :
    S extends UV2Schema ? [x: number, y: number] :
    S extends UV3Schema ? [x: number, y: number, z: number] :
    S extends ListSchema ? (
        S['length'] extends number
            ? RepeatType<SchemaType<S['of'], DecrementDepth<Depth>>, S['length']>
            : SchemaType<S['of'], DecrementDepth<Depth>>[]
    ) :
    S extends TupleSchema ? (
        S['of'] extends [...infer El]
            ? { [K in keyof El]: El[K] extends Schema ? SchemaType<El[K], DecrementDepth<Depth>> : never }
            : never 
    ) :
    S extends ObjectSchema ? Simplify<{ [K in keyof S['fields']]: SchemaType<S['fields'][K], DecrementDepth<Depth>> }> :
    S extends RecordSchema ? Record<string, SchemaType<S['field'], DecrementDepth<Depth>>> :
    S extends Uint8ArraySchema ? Uint8Array :
    S extends BitSetSchema ? Record<S['keys'][number], boolean> :
    S extends LiteralSchema ? S['value'] :
    S extends NullableSchema ? SchemaType<S['of'], DecrementDepth<Depth>> | null :
    S extends OptionalSchema ? SchemaType<S['of'], DecrementDepth<Depth>> | undefined :
    S extends NullishSchema ? SchemaType<S['of'], DecrementDepth<Depth>> | null | undefined :
    S extends UnionSchema ? SchemaType<S['variants'][number], DecrementDepth<Depth>> :
    never;

/* lightweight helpers that just return objects */

export const boolean = (): { type: 'boolean' } => ({ type: 'boolean' });

export const string = (): { type: 'string' } => ({ type: 'string' });

export const number = (): { type: 'number' } => ({ type: 'number' });

export const varint = (): { type: 'varint' } => ({ type: 'varint' });

export const varuint = (): { type: 'varuint' } => ({ type: 'varuint' });

export const int8 = (): { type: 'int8' } => ({ type: 'int8' });

export const uint8 = (): { type: 'uint8' } => ({ type: 'uint8' });

export const int16 = (): { type: 'int16' } => ({ type: 'int16' });

export const uint16 = (): { type: 'uint16' } => ({ type: 'uint16' });

export const int32 = (): { type: 'int32' } => ({ type: 'int32' });

export const uint32 = (): { type: 'uint32' } => ({ type: 'uint32' });

export const int64 = (): { type: 'int64' } => ({ type: 'int64' });

export const uint64 = (): { type: 'uint64' } => ({ type: 'uint64' });

export const float16 = (): { type: 'float16' } => ({ type: 'float16' });

export const float32 = (): { type: 'float32' } => ({ type: 'float32' });

export const float64 = (): { type: 'float64' } => ({ type: 'float64' });

export function list<T extends Schema>(of: T): { type: 'list'; of: T };
export function list<T extends Schema, L extends number>(of: T, length: L): { type: 'list'; of: T; length: L };
export function list<T extends Schema, L extends number>(of: T, length?: L) {
    return (length === undefined ? { type: 'list', of } : { type: 'list', of, length }) as any;
}

export const tuple = <T extends Schema[]>(of: T): { type: 'tuple'; of: [...T] } => ({
    type: 'tuple',
    of,
});

export const object = <F extends Record<string, Schema>>(fields: F): { type: 'object'; fields: F } => ({
    type: 'object',
    fields,
});

export const record = <F extends Schema>(field: F): { type: 'record'; field: F } => ({
    type: 'record',
    field,
});

export const uint8Array = (length?: number) => 
    length === undefined ? { type: 'uint8Array' as const } : { type: 'uint8Array' as const, length };

export const bitset = <Keys extends string[]>(keys: [...Keys]): { type: 'bitset'; keys: [...Keys] } => {
    return { type: 'bitset', keys };
};

export const literal = <S extends PrimitiveSchema, V extends SchemaType<S>>(
    value: V,
): {
    type: 'literal';
    value: V;
} => {
    return { type: 'literal', value };
};

export const nullable = <S extends Schema>(of: S): { type: 'nullable'; of: S } => ({ type: 'nullable', of });

export const optional = <S extends Schema>(of: S): { type: 'optional'; of: S } => ({ type: 'optional', of });

export const nullish = <S extends Schema>(of: S): { type: 'nullish'; of: S } => ({ type: 'nullish', of });

export const union = <K extends string, V extends (ObjectSchema & { fields: { [k in K]: LiteralSchema } })[]>(
    key: K,
    variants: [...V],
): { type: 'union'; key: K; variants: [...V] } => ({
    type: 'union',
    key,
    variants,
});

/**
 * Quantize a floating point number to discrete steps within a range.
 * 
 * Values are encoded using the minimum number of bits needed to represent
 * all possible steps, rounded up to the nearest byte boundary.
 * 
 * You can specify precision either by step size or byte budget:
 * - `{ step }`: Desired step size, bytes are calculated
 * - `{ bytes }`: Byte budget, actual step is calculated
 * 
 * The actual step size may be slightly smaller than requested due to rounding
 * up to the nearest power of 2. For example, a range of 0-100 with step=1
 * requires 101 steps, which rounds to 128 (7 bits), giving an actual step
 * size of ~0.787.
 * 
 * @param min - Minimum value in the range
 * @param max - Maximum value in the range
 * @param precision - Either `{ step: number }` or `{ bytes: number }`
 * 
 * @example
 * // Rotation angle with 0.5° precision (uses 2 bytes, actual ~0.35°)
 * quantized(0, 360, { step: 0.5 })
 * 
 * @example
 * // Health percentage with 1 byte budget (actual step ~0.39)
 * quantized(0, 100, { bytes: 1 })
 * 
 * @example
 * // Position with 10cm precision (uses 2 bytes, actual ~3cm)
 * quantized(-1000, 1000, { step: 0.1 })
 * 
 * @example
 * // Normalized value with 1% increments (uses 1 byte, actual ~0.39%)
 * quantized(0, 1, { step: 0.01 })
 */
export const quantized = (
    min: number, 
    max: number, 
    precision: { step: number } | { bytes: number } = { step: 0.01 }
): { type: 'quantized'; min: number; max: number; step: number; bytes: number } => {
    if (min >= max) {
        throw new Error(`quantized: min must be less than max (got min=${min}, max=${max})`);
    }
    
    const range = max - min;
    let step: number;
    let bytes: number;
    
    if ('step' in precision) {
        step = precision.step;
        if (step <= 0) {
            throw new Error(`quantized: step must be positive (got ${step})`);
        }
        if (step > range) {
            throw new Error(`quantized: step must be <= (max - min) (got step=${step}, range=${range})`);
        }
        
        // Calculate bytes needed for this step size
        const numSteps = Math.ceil(range / step);
        const bitsNeeded = Math.ceil(Math.log2(numSteps));
        bytes = Math.ceil(bitsNeeded / 8);
    } else {
        bytes = precision.bytes;
        if (bytes <= 0 || !Number.isInteger(bytes)) {
            throw new Error(`quantized: bytes must be a positive integer (got ${bytes})`);
        }
        
        // Calculate step from bytes
        const maxValue = (1 << (bytes * 8)) - 1;
        step = range / maxValue;
    }
    
    return { type: 'quantized', min, max, step, bytes };
};

/**
 * Compressed quaternion using "smallest three" encoding.
 * 
 * Since quaternions are unit length (x² + y² + z² + w² = 1), we can
 * store only the 3 smallest components and reconstruct the largest.
 * This uses significantly less space than storing all 4 components.
 * 
 * The encoding stores:
 * - Index of the dropped (largest) component (2 bits)
 * - Sign of the dropped component (1 bit)
 * - 3 quantized components
 * 
 * Component values range from -1/√2 to 1/√2, so the quantization step
 * is relative to this range (~1.414).
 * 
 * You can specify precision either by step size or byte budget:
 * - `{ step }`: Desired step size, bytes are calculated
 * - `{ bytes }`: Byte budget, actual step is calculated
 * 
 * @param precision - Either `{ step: number }` or `{ bytes: number }` (default: { step: 0.001 })
 * 
 * @example
 * // Default 0.001 precision (7 bytes)
 * quat()
 * 
 * @example
 * // High precision via step (7 bytes)
 * quat({ step: 0.0002 })
 * 
 * @example
 * // Low bandwidth via bytes (4 bytes, step ~0.002)
 * quat({ bytes: 4 })
 */
export const quat = (
    precision: { step: number } | { bytes: number } = { step: 0.001 }
): { type: 'quat'; step: number; bytes: number } => {
    const range = Math.SQRT2; // -1/√2 to 1/√2
    let step: number;
    let bytes: number;
    
    if ('step' in precision) {
        step = precision.step;
        if (step <= 0) {
            throw new Error(`quat: step must be positive (got ${step})`);
        }
        if (step > range) {
            throw new Error(`quat: step must be <= √2 ~1.414 (got ${step})`);
        }
        
        // Calculate bytes needed for 3 components + 3 bits overhead
        const numSteps = Math.ceil(range / step);
        const bitsPerComponent = Math.ceil(Math.log2(numSteps));
        const totalBits = (bitsPerComponent * 3) + 3; // 3 components + index(2) + sign(1)
        bytes = Math.ceil(totalBits / 8);
    } else {
        bytes = precision.bytes;
        if (bytes <= 0 || !Number.isInteger(bytes)) {
            throw new Error(`quat: bytes must be a positive integer (got ${bytes})`);
        }
        
        // Calculate step from bytes (subtract 3 overhead bits, divide by 3 components)
        const totalBits = bytes * 8;
        const bitsPerComponent = Math.floor((totalBits - 3) / 3);
        const maxValue = (1 << bitsPerComponent) - 1;
        step = range / maxValue;
    }
    
    return { type: 'quat', step, bytes };
};

/**
 * Compressed unit vector in 2D using angle encoding.
 * 
 * Since 2D unit vectors can be represented as a single angle (0 to 2π),
 * this is more efficient than storing x,y components. The angle range
 * is 0 to 2π (~6.283 radians).
 * 
 * You can specify precision either by step size or byte budget:
 * - `{ step }`: Desired step size in radians, bytes are calculated
 * - `{ bytes }`: Byte budget, actual step is calculated
 * 
 * @param precision - Either `{ step: number }` or `{ bytes: number }` (default: { step: 0.0015 })
 * 
 * @example
 * // Default ~0.09° precision (2 bytes)
 * uv2()
 * 
 * @example
 * // High precision ~0.006° via step (3 bytes)
 * uv2({ step: 0.0001 })
 * 
 * @example
 * // 1 byte budget (step ~0.025 radians = 1.4°)
 * uv2({ bytes: 1 })
 */
export const uv2 = (
    precision: { step: number } | { bytes: number } = { step: 0.0015 }
): { type: 'uv2'; step: number; bytes: number } => {
    const range = Math.PI * 2; // 0 to 2π
    let step: number;
    let bytes: number;
    
    if ('step' in precision) {
        step = precision.step;
        if (step <= 0) {
            throw new Error(`uv2: step must be positive (got ${step})`);
        }
        if (step > range) {
            throw new Error(`uv2: step must be <= 2π ~6.283 (got ${step})`);
        }
        
        // Calculate bytes needed for angle
        const numSteps = Math.ceil(range / step);
        const bitsNeeded = Math.ceil(Math.log2(numSteps));
        bytes = Math.ceil(bitsNeeded / 8);
    } else {
        bytes = precision.bytes;
        if (bytes <= 0 || !Number.isInteger(bytes)) {
            throw new Error(`uv2: bytes must be a positive integer (got ${bytes})`);
        }
        
        // Calculate step from bytes
        const maxValue = (1 << (bytes * 8)) - 1;
        step = range / maxValue;
    }
    
    return { type: 'uv2', step, bytes };
};

/**
 * Compressed unit vector in 3D using "smallest two" encoding.
 * 
 * Similar to quaternion compression, we exploit the unit length constraint.
 * We store the 2 smallest components and reconstruct the largest, plus
 * the index and sign of the dropped component.
 * 
 * Component values range from -1/√2 to 1/√2, so the quantization step
 * is relative to this range (~1.414).
 * 
 * You can specify precision either by step size or byte budget:
 * - `{ step }`: Desired step size, bytes are calculated
 * - `{ bytes }`: Byte budget, actual step is calculated
 * 
 * @param precision - Either `{ step: number }` or `{ bytes: number }` (default: { step: 0.001 })
 * 
 * @example
 * // Default 0.001 precision (3 bytes)
 * uv3()
 * 
 * @example
 * // Low bandwidth via bytes (2 bytes, step ~0.006)
 * uv3({ bytes: 2 })
 * 
 * @example
 * // High precision via step (4 bytes)
 * uv3({ step: 0.0002 })
 */
export const uv3 = (
    precision: { step: number } | { bytes: number } = { step: 0.001 }
): { type: 'uv3'; step: number; bytes: number } => {
    const range = Math.SQRT2; // -1/√2 to 1/√2
    let step: number;
    let bytes: number;
    
    if ('step' in precision) {
        step = precision.step;
        if (step <= 0) {
            throw new Error(`uv3: step must be positive (got ${step})`);
        }
        if (step > range) {
            throw new Error(`uv3: step must be <= √2 ~1.414 (got ${step})`);
        }
        
        // Calculate bytes needed for 2 components + 3 bits overhead
        const numSteps = Math.ceil(range / step);
        const bitsPerComponent = Math.ceil(Math.log2(numSteps));
        const totalBits = (bitsPerComponent * 2) + 3; // 2 components + index(2) + sign(1)
        bytes = Math.ceil(totalBits / 8);
    } else {
        bytes = precision.bytes;
        if (bytes <= 0 || !Number.isInteger(bytes)) {
            throw new Error(`uv3: bytes must be a positive integer (got ${bytes})`);
        }
        
        // Calculate step from bytes (subtract 3 overhead bits, divide by 2 components)
        const totalBits = bytes * 8;
        const bitsPerComponent = Math.floor((totalBits - 3) / 2);
        const maxValue = (1 << bitsPerComponent) - 1;
        step = range / maxValue;
    }
    
    return { type: 'uv3', step, bytes };
};
