export type BooleanSchema = {
    type: 'boolean';
};

export type StringSchema = {
    type: 'string';
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
    step: number;
    bytes: number;
};

export type QuatSchema = {
    type: 'quat';
    step: number;
    bytes: number;
};

export type UV2Schema = {
    type: 'uv2';
    step: number;
    bytes: number;
};

export type UV3Schema = {
    type: 'uv3';
    step: number;
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

export type EnumerationSchema = {
    type: 'enumeration';
    values: readonly (string | number)[];
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
    | EnumerationSchema
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
    S extends EnumerationSchema ? S['values'][number] :
    S extends NullableSchema ? SchemaType<S['of'], DecrementDepth<Depth>> | null :
    S extends OptionalSchema ? SchemaType<S['of'], DecrementDepth<Depth>> | undefined :
    S extends NullishSchema ? SchemaType<S['of'], DecrementDepth<Depth>> | null | undefined :
    S extends UnionSchema ? SchemaType<S['variants'][number], DecrementDepth<Depth>> :
    never;

/* lightweight helpers that just return objects */

/**
 * Boolean schema - stores true/false values using 1 byte.
 * 
 * @returns A boolean schema definition
 * 
 * @example
 * boolean() // Stores boolean value (1 byte)
 */
export const boolean = (): { type: 'boolean' } => ({ type: 'boolean' });

/**
 * String schema - variable-length UTF-8 encoded strings.
 * 
 * Strings are prefixed with a varuint length followed by UTF-8 bytes.
 * 
 * @returns A string schema definition
 * 
 * @example
 * string() // Variable-length string
 */
export const string = (): { type: 'string' } => ({ type: 'string' });

/**
 * Alias for float64(), which is JavaScript's native number type.
 *
 * For smaller numbers, consider using `float32()`, `int32()`, or `varint()`.
 * 
 * @returns A number schema definition
 * 
 * @example
 * number() // Standard JavaScript float64 number (8 bytes)
 */
export const number = (): { type: 'float64' } => ({ type: 'float64' });

/**
 * Variable-length signed integer using zigzag encoding.
 * 
 * Uses 1-5 bytes depending on magnitude. Smaller absolute values use fewer bytes.
 * 
 * Range: -2,147,483,648 to 2,147,483,647 (32-bit signed)
 * 
 * @returns A varint schema definition
 * 
 * @example
 * varint() // 1-5 bytes, optimal for small integers
 */
export const varint = (): { type: 'varint' } => ({ type: 'varint' });

/**
 * Variable-length unsigned integer.
 * 
 * Uses 1-5 bytes depending on magnitude. Smaller values use fewer bytes.
 * 
 * Range: 0 to 4,294,967,295 (32-bit unsigned)
 * 
 * @returns A varuint schema definition
 * 
 * @example
 * varuint() // 1-5 bytes, optimal for small positive integers
 */
export const varuint = (): { type: 'varuint' } => ({ type: 'varuint' });

/**
 * 8-bit signed integer (1 byte).
 * 
 * Range: -128 to 127
 * 
 * @returns An int8 schema definition
 * 
 * @example
 * int8() // 1 byte signed integer
 */
export const int8 = (): { type: 'int8' } => ({ type: 'int8' });

/**
 * 8-bit unsigned integer (1 byte).
 * 
 * Range: 0 to 255
 * 
 * @returns A uint8 schema definition
 * 
 * @example
 * uint8() // 1 byte unsigned integer
 */
export const uint8 = (): { type: 'uint8' } => ({ type: 'uint8' });

/**
 * 16-bit signed integer (2 bytes).
 * 
 * Range: -32,768 to 32,767
 * 
 * @returns An int16 schema definition
 * 
 * @example
 * int16() // 2 bytes signed integer
 */
export const int16 = (): { type: 'int16' } => ({ type: 'int16' });

/**
 * 16-bit unsigned integer (2 bytes).
 * 
 * Range: 0 to 65,535
 * 
 * @returns A uint16 schema definition
 * 
 * @example
 * uint16() // 2 bytes unsigned integer
 */
export const uint16 = (): { type: 'uint16' } => ({ type: 'uint16' });

/**
 * 32-bit signed integer (4 bytes).
 * 
 * Range: -2,147,483,648 to 2,147,483,647
 * 
 * @returns An int32 schema definition
 * 
 * @example
 * int32() // 4 bytes signed integer
 */
export const int32 = (): { type: 'int32' } => ({ type: 'int32' });

/**
 * 32-bit unsigned integer (4 bytes).
 * 
 * Range: 0 to 4,294,967,295
 * 
 * @returns A uint32 schema definition
 * 
 * @example
 * uint32() // 4 bytes unsigned integer
 */
export const uint32 = (): { type: 'uint32' } => ({ type: 'uint32' });

/**
 * 64-bit signed integer (8 bytes) stored as BigInt.
 * 
 * Range: -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807
 * 
 * @returns An int64 schema definition
 * 
 * @example
 * int64() // 8 bytes signed BigInt
 */
export const int64 = (): { type: 'int64' } => ({ type: 'int64' });

/**
 * 64-bit unsigned integer (8 bytes) stored as BigInt.
 * 
 * Range: 0 to 18,446,744,073,709,551,615
 * 
 * @returns A uint64 schema definition
 * 
 * @example
 * uint64() // 8 bytes unsigned BigInt
 */
export const uint64 = (): { type: 'uint64' } => ({ type: 'uint64' });

/**
 * 16-bit floating point (2 bytes) - half precision.
 * 
 * Range: ±65,504 with ~3 decimal digits of precision
 * Useful for reduced bandwidth when full precision isn't needed.
 * 
 * @returns A float16 schema definition
 * 
 * @example
 * float16() // 2 bytes floating point
 */
export const float16 = (): { type: 'float16' } => ({ type: 'float16' });

/**
 * 32-bit floating point (4 bytes) - single precision.
 * 
 * Range: ±3.4e38 with ~7 decimal digits of precision
 * 
 * @returns A float32 schema definition
 * 
 * @example
 * float32() // 4 bytes floating point
 */
export const float32 = (): { type: 'float32' } => ({ type: 'float32' });

/**
 * 64-bit floating point (8 bytes) - double precision.
 * 
 * Range: ±1.7e308 with ~15 decimal digits of precision
 * This is JavaScript's native number type.
 * 
 * @returns A float64 schema definition
 * 
 * @example
 * float64() // 8 bytes floating point
 */
export const float64 = (): { type: 'float64' } => ({ type: 'float64' });

/**
 * List (array) schema - variable or fixed-length homogeneous arrays.
 * 
 * Without length: Variable-length array prefixed with varuint count
 * With length: Fixed-length array with no length prefix
 * 
 * @param of Schema for array elements
 * @param length Optional fixed length
 * @returns A list schema definition
 * 
 * @example
 * // Variable-length array of numbers
 * list(number())
 * 
 * @example
 * // Fixed-length array of 3 floats (like a 3D vector)
 * list(float32(), 3)
 */
export function list<T extends Schema>(of: T): { type: 'list'; of: T };
export function list<T extends Schema, L extends number>(of: T, length: L): { type: 'list'; of: T; length: L };
export function list<T extends Schema, L extends number>(of: T, length?: L) {
    return (length === undefined ? { type: 'list', of } : { type: 'list', of, length }) as any;
}

/**
 * Tuple schema - fixed-length array with heterogeneous types.
 * 
 * Each element can have a different schema. No length prefix is stored.
 * 
 * @param of Array of schemas for each tuple element
 * @returns A tuple schema definition
 * 
 * @example
 * // Position with metadata: [x, y, timestamp]
 * tuple([float32(), float32(), uint32()])
 *
 * @example
 * // Player data: [id, name, score]
 * tuple([uint16(), string(), varuint()])
 */
export const tuple = <T extends Schema[]>(of: [...T]): { type: 'tuple'; of: [...T] } => ({
    type: 'tuple',
    of,
});

/**
 * Object schema - fixed set of named fields.
 * 
 * Fields are serialized in alphabetically sorted order (by field name).
 * Field names are not stored in the binary format.
 * 
 * @param fields Record mapping field names to their schemas
 * @returns An object schema definition
 * 
 * @example
 * object({
 *   id: uint32(),
 *   position: tuple([float32(), float32(), float32()]),
 *   health: uint8()
 * })
 */
export const object = <F extends Record<string, Schema>>(fields: F): { type: 'object'; fields: F } => ({
    type: 'object',
    fields,
});

/**
 * Record schema - dynamic key-value map with homogeneous values.
 * 
 * Keys are strings, all values share the same schema.
 * Stored as varuint count followed by [key, value] pairs.
 * 
 * @param field Schema for all values
 * @returns A record schema definition
 * 
 * @example
 * // Map of player IDs to scores
 * record(uint32())
 * 
 * @example
 * // Map of item names to quantities
 * record(varuint())
 */
export const record = <F extends Schema>(field: F): { type: 'record'; field: F } => ({
    type: 'record',
    field,
});

/**
 * Uint8Array schema - raw byte buffer.
 * 
 * Without length: Variable-length buffer prefixed with varuint count
 * With length: Fixed-length buffer with no length prefix
 * 
 * @param length Optional fixed length in bytes
 * @returns A Uint8Array schema definition
 * 
 * @example
 * // Variable-length binary data
 * uint8Array()
 * 
 * @example
 * // 16-byte UUID or hash
 * uint8Array(16)
 */
export const uint8Array = (length?: number) => 
    length === undefined ? { type: 'uint8Array' as const } : { type: 'uint8Array' as const, length };

/**
 * Bitset schema - compact storage for boolean flags.
 * 
 * Each key uses 1 bit. Stored as a variable number of bytes based on key count.
 * More efficient than storing individual booleans for multiple flags.
 * 
 * @param keys Array of flag names
 * @returns A bitset schema definition
 * 
 * @example
 * bitset(['hasShield', 'isInvincible', 'canFly', 'isGrounded'])
 * // Stores 4 flags in 1 byte
 */
export const bitset = <Keys extends string[]>(keys: [...Keys]): { type: 'bitset'; keys: [...Keys] } => {
    return { type: 'bitset', keys };
};

/**
 * Literal schema - constant value that doesn't need to be serialized.
 * 
 * The value is part of the schema definition and takes 0 bytes to encode.
 * Useful for discriminators in unions or constant metadata.
 * 
 * @param value The constant primitive value
 * @returns A literal schema definition
 */
export const literal = <S extends PrimitiveSchema, V extends SchemaType<S>>(
    value: V,
): {
    type: 'literal';
    value: V;
} => {
    return { type: 'literal', value };
};

/**
 * Enumeration schema - value restricted to a predefined set of literals.
 * @param values Array of allowed string or number values
 * @returns A enumeration schema definition
 * 
 * @example
 * enumeration(['red', 'green', 'blue'] as const)
 * 
 * @example
 * enumeration([1, 2, 3] as const)
 */
export const enumeration = <V extends (string | number)[]>(values: [...V]): { type: 'enumeration'; values: [...V] } => {
    return { type: 'enumeration', values };
};

/**
 * Nullable schema - value that can be null.
 * 
 * Uses 1 byte to indicate presence (0=null, 1=present), followed by the value if non-null.
 * 
 * @param of - Schema for the non-null value
 * @returns A nullable schema definition
 * 
 * @example
 * nullable(string()) // string | null
 * 
 * @example
 * nullable(object({ x: float32(), y: float32() })) // object | null
 */
export const nullable = <S extends Schema>(of: S): { type: 'nullable'; of: S } => ({ type: 'nullable', of });

/**
 * Optional schema - value that can be undefined.
 * 
 * Uses 1 byte to indicate presence (0=undefined, 1=present), followed by the value if defined.
 * 
 * @param of - Schema for the defined value
 * @returns An optional schema definition
 * 
 * @example
 * optional(uint32()) // number | undefined
 * 
 * @example
 * optional(string()) // string | undefined
 */
export const optional = <S extends Schema>(of: S): { type: 'optional'; of: S } => ({ type: 'optional', of });

/**
 * Nullish schema - value that can be null or undefined.
 * 
 * Uses 1 byte to indicate state (0=null, 1=undefined, 2=present), followed by the value if present.
 * 
 * @param of - Schema for the non-nullish value
 * @returns A nullish schema definition
 * 
 * @example
 * nullish(float32()) // number | null | undefined
 * 
 * @example
 * nullish(string()) // string | null | undefined
 */
export const nullish = <S extends Schema>(of: S): { type: 'nullish'; of: S } => ({ type: 'nullish', of });

/**
 * Union schema - discriminated union of object variants.
 * 
 * Each variant must be an object with a literal discriminator field.
 * The discriminator is used to determine which variant to deserialize.
 * 
 * @param key - Name of the discriminator field
 * @param variants - Array of object schemas, each with a literal for the key field
 * @returns A union schema definition
 * 
 * @example
 * union('type', [
 *   object({ type: literal('player'), id: uint32(), name: string() }),
 *   object({ type: literal('enemy'), id: uint32(), level: uint8() }),
 *   object({ type: literal('npc'), id: uint32(), dialog: string() })
 * ])
 */
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
        
        // calculate bytes needed for 2 components + 3 bits overhead
        const numSteps = Math.ceil(range / step);
        const bitsPerComponent = Math.ceil(Math.log2(numSteps));
        const totalBits = (bitsPerComponent * 2) + 3; // 2 components + index(2) + sign(1)
        bytes = Math.ceil(totalBits / 8);
    } else {
        bytes = precision.bytes;
        if (bytes <= 0 || !Number.isInteger(bytes)) {
            throw new Error(`uv3: bytes must be a positive integer (got ${bytes})`);
        }

        // calculate step from bytes (subtract 3 overhead bits, divide by 2 components)
        const totalBits = bytes * 8;
        const bitsPerComponent = Math.floor((totalBits - 3) / 2);
        const maxValue = (1 << bitsPerComponent) - 1;
        step = range / maxValue;
    }
    
    return { type: 'uv3', step, bytes };
};
