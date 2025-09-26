export type BooleanSchema = {
    type: 'boolean';
};

export type StringSchema = {
    type: 'string';
};

export type NumberSchema = {
    type: 'number';
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

export type ListSchema = {
    type: 'list';
    of: Schema;
    length?: number;
};

export type ObjectSchema = {
    type: 'object';
    fields: Record<string, Schema>;
};

export type RecordSchema = {
    type: 'record';
    field: Schema;
};

export type AnySchema<T = any> = {
    type: 'any';
    __tsType?: T;
};

export type Schema =
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
    | StringSchema
    | ListSchema
    | ObjectSchema
    | RecordSchema
    | AnySchema;

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
	S extends Int8Schema ? number :
	S extends Uint8Schema ? number :
	S extends Int16Schema ? number :
	S extends Uint16Schema ? number :
	S extends Int32Schema ? number :
	S extends Uint32Schema ? number :
	S extends Float32Schema ? number :
	S extends Float64Schema ? number :
	S extends AnySchema<infer T> ? T :
	S extends ListSchema ? SchemaType<S['of'], DecrementDepth<Depth>>[] :
	S extends ObjectSchema ? Simplify<{ [K in keyof S['fields']]: SchemaType<S['fields'][K], DecrementDepth<Depth>> }> :
	S extends RecordSchema ? Record<string, SchemaType<S['field'], DecrementDepth<Depth>>> :
	never;

/* lightweight helpers that just return objects */

export const boolean = (): { type: 'boolean' } => ({ type: 'boolean' });

export const string = (): { type: 'string' } => ({ type: 'string' });

export const number = (): { type: 'number' } => ({ type: 'number' });

export const int8 = (): { type: 'int8' } => ({ type: 'int8' });

export const uint8 = (): { type: 'uint8' } => ({ type: 'uint8' });

export const int16 = (): { type: 'int16' } => ({ type: 'int16' });

export const uint16 = (): { type: 'uint16' } => ({ type: 'uint16' });

export const int32 = (): { type: 'int32' } => ({ type: 'int32' });

export const uint32 = (): { type: 'uint32' } => ({ type: 'uint32' });

export const float32 = (): { type: 'float32' } => ({ type: 'float32' });

export const float64 = (): { type: 'float64' } => ({ type: 'float64' });

export const any = <T>(): AnySchema<T> =>
    ({
        type: 'any',
    }) as AnySchema<T>;

export const list = <T extends Schema>(of: T, o?: { length: number }): { type: 'list'; of: T; length?: number } => ({
    type: 'list',
    of,
    ...o,
});

export const object = <F extends Record<string, Schema>>(fields: F): { type: 'object'; fields: F } => ({
    type: 'object',
    fields,
});

export const record = <F extends Schema>(field: F): { type: 'record'; field: F } => ({
    type: 'record',
    field,
});
