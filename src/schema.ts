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
    step: number;
};

export type QuaternionSchema = {
    type: 'quaternion';
    /** Bits per component (9-15 typical, default 10) */
    bits: number;
};

export type UnitVec2Schema = {
    type: 'unitVec2';
    /** Bits for angle encoding (10-16 typical, default 12) */
    bits: number;
};

export type UnitVec3Schema = {
    type: 'unitVec3';
    /** Bits per component (9-15 typical, default 10) */
    bits: number;
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
    | Float32Schema
    | Float64Schema
    | QuantizedSchema
    | QuaternionSchema
    | UnitVec2Schema
    | UnitVec3Schema
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
    S extends Float32Schema ? number :
    S extends Float64Schema ? number :
    S extends QuantizedSchema ? number :
    S extends QuaternionSchema ? [x: number, y: number, z: number, w: number] :
    S extends UnitVec2Schema ? [x: number, y: number] :
    S extends UnitVec3Schema ? [x: number, y: number, z: number] :
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

export const uint8Array = (): { type: 'uint8Array' } => ({ type: 'uint8Array' });

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
 * The actual step size may be slightly smaller than requested due to rounding
 * up to the nearest power of 2. For example, a range of 0-100 with step=1
 * requires 101 steps, which rounds to 128 (7 bits), giving an actual step
 * size of ~0.787.
 * 
 * @param min - Minimum value in the range
 * @param max - Maximum value in the range
 * @param step - Desired step size (precision). Must be positive and <= (max - min)
 * 
 * @example
 * // Rotation angle with 0.5° precision (uses 2 bytes, actual ~0.35°)
 * quantized(0, 360, 0.5)
 * 
 * @example
 * // Health percentage as whole numbers (uses 1 byte, actual ~0.79)
 * quantized(0, 100, 1)
 * 
 * @example
 * // Position with 10cm precision (uses 2 bytes, actual ~3cm)
 * quantized(-1000, 1000, 0.1)
 * 
 * @example
 * // Normalized value with 1% increments (uses 1 byte, actual ~0.39%)
 * quantized(0, 1, 0.01)
 */
export const quantized = (min: number, max: number, step: number): { type: 'quantized'; min: number; max: number; step: number } => {
    if (min >= max) {
        throw new Error(`quantized: min must be less than max (got min=${min}, max=${max})`);
    }
    if (step <= 0) {
        throw new Error(`quantized: step must be positive (got ${step})`);
    }
    if (step > max - min) {
        throw new Error(`quantized: step must be <= (max - min) (got step=${step}, range=${max - min})`);
    }
    
    return { type: 'quantized', min, max, step };
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
 * - 3 quantized components (bits per component × 3)
 * 
 * Total size is always rounded up to the nearest byte.
 * 
 * @param bits - Bits per component (9-15 typical, default 10)
 *               9 bits = ~0.002 precision, 4 bytes total
 *               10 bits = ~0.001 precision, 4 bytes total
 *               12 bits = ~0.0002 precision, 5 bytes total
 * 
 * @example
 * // Default 10 bits per component (4 bytes total, ~0.001 precision)
 * quaternion()
 * 
 * @example
 * // High precision 12 bits per component (5 bytes total, ~0.0002 precision)
 * quaternion(12)
 */
export const quaternion = (bits = 10): { type: 'quaternion'; bits: number } => {
    if (bits < 2 || bits > 15) {
        throw new Error(`quaternion: bits must be between 2 and 15 (got ${bits})`);
    }
    return { type: 'quaternion', bits };
};

/**
 * Compressed unit vector in 2D using angle encoding.
 * 
 * Since 2D unit vectors can be represented as a single angle (0 to 2π),
 * this is more efficient than storing x,y components.
 * 
 * @param bits - Bits for angle encoding (10-16 typical, default 12)
 *               10 bits = ~0.35° precision, 2 bytes total
 *               12 bits = ~0.09° precision, 2 bytes total
 *               16 bits = ~0.006° precision, 2 bytes total
 * 
 * @example
 * // Default 12 bits (2 bytes, ~0.09° precision)
 * unitVec2()
 * 
 * @example
 * // High precision 16 bits (2 bytes, ~0.006° precision)
 * unitVec2(16)
 */
export const unitVec2 = (bits = 12): { type: 'unitVec2'; bits: number } => {
    if (bits < 2 || bits > 16) {
        throw new Error(`unitVec2: bits must be between 2 and 16 (got ${bits})`);
    }
    return { type: 'unitVec2', bits };
};

/**
 * Compressed unit vector in 3D using "smallest two" encoding.
 * 
 * Similar to quaternion compression, we exploit the unit length constraint.
 * We store the 2 smallest components and reconstruct the largest, plus
 * the index and sign of the dropped component.
 * 
 * @param bits - Bits per component (9-15 typical, default 10)
 *               9 bits = ~0.002 precision, 3 bytes total
 *               10 bits = ~0.001 precision, 3 bytes total
 *               12 bits = ~0.0002 precision, 3 bytes total
 * 
 * @example
 * // Default 10 bits per component (3 bytes, ~0.001 precision)
 * unitVec3()
 * 
 * @example
 * // Low bandwidth 9 bits per component (3 bytes, ~0.002 precision)
 * unitVec3(9)
 */
export const unitVec3 = (bits = 10): { type: 'unitVec3'; bits: number } => {
    if (bits < 2 || bits > 15) {
        throw new Error(`unitVec3: bits must be between 2 and 15 (got ${bits})`);
    }
    return { type: 'unitVec3', bits };
};
