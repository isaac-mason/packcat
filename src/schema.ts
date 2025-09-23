/* schema type */

// schemas are simple objects

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

/* schema to type utility */
type Simplify<T> = { [K in keyof T]: T[K] } & {};

// biome-ignore format: readability
export type SchemaType<S extends Schema> =
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
	S extends { type: "list"; of: infer U extends Schema } ? SchemaType<U>[] :
    S extends { type: "object"; fields: infer F extends Record<string, Schema> } ? Simplify<{ [K in keyof F]: SchemaType<F[K]> }> :
	S extends { type: "record"; field: infer F extends Schema } ? Record<string, SchemaType<F>> :
	never;

/* lightweight helpers that just return objects */

export const boolean = <O extends Partial<Omit<BooleanSchema, 'type'>>>(opts: O = {} as O): { type: 'boolean' } & O => ({
    ...opts,
    type: 'boolean',
});

export const string = <O extends Partial<Omit<StringSchema, 'type'>>>(opts: O = {} as O): { type: 'string' } & O => ({
    ...opts,
    type: 'string',
});

export const number = <O extends Partial<Omit<NumberSchema, 'type'>>>(opts: O = {} as O): { type: 'number' } & O => ({
    ...opts,
    type: 'number',
});

export const int8 = <O extends Partial<Omit<Int8Schema, 'type'>>>(opts: O = {} as O): { type: 'int8' } & O => ({
    ...opts,
    type: 'int8',
});

export const uint8 = <O extends Partial<Omit<Uint8Schema, 'type'>>>(opts: O = {} as O): { type: 'uint8' } & O => ({
    ...opts,
    type: 'uint8',
});

export const int16 = <O extends Partial<Omit<Int16Schema, 'type'>>>(opts: O = {} as O): { type: 'int16' } & O => ({
    ...opts,
    type: 'int16',
});

export const uint16 = <O extends Partial<Omit<Uint16Schema, 'type'>>>(opts: O = {} as O): { type: 'uint16' } & O => ({
    ...opts,
    type: 'uint16',
});

export const int32 = <O extends Partial<Omit<Int32Schema, 'type'>>>(opts: O = {} as O): { type: 'int32' } & O => ({
    ...opts,
    type: 'int32',
});

export const uint32 = <O extends Partial<Omit<Uint32Schema, 'type'>>>(opts: O = {} as O): { type: 'uint32' } & O => ({
    ...opts,
    type: 'uint32',
});

export const float32 = <O extends Partial<Omit<Float32Schema, 'type'>>>(opts: O = {} as O): { type: 'float32' } & O => ({
    ...opts,
    type: 'float32',
});

export const float64 = <O extends Partial<Omit<Float64Schema, 'type'>>>(opts: O = {} as O): { type: 'float64' } & O => ({
    ...opts,
    type: 'float64',
});

export const any = <T, O extends Partial<Omit<AnySchema<T>, 'type' | '__tsType'>>>(opts: O = {} as O): AnySchema<T> & O =>
    ({
        type: 'any',
        ...opts,
    }) as AnySchema<T> & O;

export function list<T extends Schema>(of: T): { type: 'list'; of: T };
export function list<T extends Schema, O extends Partial<Omit<ListSchema, 'type' | 'of'>>>(
    of: T,
    opts: O,
): { type: 'list'; of: T } & O;
export function list<T extends Schema, O extends Partial<Omit<ListSchema, 'type' | 'of'>>>(
    of: T,
    opts?: O,
): { type: 'list'; of: T } | ({ type: 'list'; of: T } & O) {
    return {
        type: 'list',
        of,
        ...(opts as O | undefined),
    } as unknown as any;
}

export function object<F extends Record<string, Schema>>(fields: F): { type: 'object'; fields: F };
export function object<F extends Record<string, Schema>, O extends Partial<Omit<ObjectSchema, 'type' | 'fields'>>>(
    fields: F,
    opts: O,
): { type: 'object'; fields: F } & O;
export function object<F extends Record<string, Schema>, O extends Partial<Omit<ObjectSchema, 'type' | 'fields'>>>(
    fields: F,
    opts?: O,
): { type: 'object'; fields: F } | ({ type: 'object'; fields: F } & O) {
    return {
        type: 'object',
        fields,
        ...(opts as O | undefined),
    } as unknown as any;
}

export function record<F extends Schema>(fields: F): { type: 'record'; field: F };
export function record<F extends Schema, O extends Partial<Omit<RecordSchema, 'type' | 'field'>>>(
    field: F,
    opts: O,
): { type: 'record'; field: F } & O;
export function record<F extends Schema, O extends Partial<Omit<RecordSchema, 'type' | 'field'>>>(
    field: F,
    opts?: O,
): { type: 'record'; field: F } | ({ type: 'record'; field: F } & O) {
    return {
        type: 'record',
        field,
        ...(opts as O | undefined),
    } as unknown as any;
}
