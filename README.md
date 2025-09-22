# buffcat

```sh
> npm install buffcat
```

buffcat is a small library for serializing and deserializing objects to and from ArrayBuffers.

## Table Of Contents

- [API Documentation](#api-documentation)
  - [schema](#schema)
    - [`BooleanSchema`](#booleanschema)
    - [`NumberSchema`](#numberschema)
    - [`Int8Schema`](#int8schema)
    - [`Uint8Schema`](#uint8schema)
    - [`Int16Schema`](#int16schema)
    - [`Uint16Schema`](#uint16schema)
    - [`Int32Schema`](#int32schema)
    - [`Uint32Schema`](#uint32schema)
    - [`Float32Schema`](#float32schema)
    - [`Float64Schema`](#float64schema)
    - [`StringSchema`](#stringschema)
    - [`ListSchema`](#listschema)
    - [`ObjectSchema`](#objectschema)
    - [`RecordSchema`](#recordschema)
    - [`AnySchema`](#anyschema)
    - [`Schema`](#schema)
    - [`SchemaType`](#schematype)
    - [`boolean`](#boolean)
    - [`number`](#number)
    - [`int8`](#int8)
    - [`uint8`](#uint8)
    - [`int16`](#int16)
    - [`uint16`](#uint16)
    - [`int32`](#int32)
    - [`uint32`](#uint32)
    - [`float32`](#float32)
    - [`float64`](#float64)
    - [`string`](#string)
    - [`any`](#any)
    - [`list`](#list)
    - [`list`](#list)
    - [`list`](#list)
    - [`object`](#object)
    - [`object`](#object)
    - [`object`](#object)
    - [`record`](#record)
    - [`record`](#record)
    - [`record`](#record)
  - [serdes](#serdes)
    - [`createSerDes`](#createserdes)

## API Documentation

### schema

#### `BooleanSchema`

```ts
export type BooleanSchema = {
    type: 'boolean';
} & CommonSchema;
```

#### `NumberSchema`

```ts
export type NumberSchema = {
    type: 'number';
} & CommonSchema;
```

#### `Int8Schema`

```ts
export type Int8Schema = {
    type: 'int8';
} & CommonSchema;
```

#### `Uint8Schema`

```ts
export type Uint8Schema = {
    type: 'uint8';
} & CommonSchema;
```

#### `Int16Schema`

```ts
export type Int16Schema = {
    type: 'int16';
} & CommonSchema;
```

#### `Uint16Schema`

```ts
export type Uint16Schema = {
    type: 'uint16';
} & CommonSchema;
```

#### `Int32Schema`

```ts
export type Int32Schema = {
    type: 'int32';
} & CommonSchema;
```

#### `Uint32Schema`

```ts
export type Uint32Schema = {
    type: 'uint32';
} & CommonSchema;
```

#### `Float32Schema`

```ts
export type Float32Schema = {
    type: 'float32';
} & CommonSchema;
```

#### `Float64Schema`

```ts
export type Float64Schema = {
    type: 'float64';
} & CommonSchema;
```

#### `StringSchema`

```ts
export type StringSchema = {
    type: 'string';
} & CommonSchema;
```

#### `ListSchema`

```ts
export type ListSchema = {
    type: 'list';
    of: Schema;
} & CommonSchema;
```

#### `ObjectSchema`

```ts
export type ObjectSchema = {
    type: 'object';
    fields: Record<string, Schema>;
} & CommonSchema;
```

#### `RecordSchema`

```ts
export type RecordSchema = {
    type: 'record';
    field: Schema;
} & CommonSchema;
```

#### `AnySchema`

```ts
export type AnySchema<T = any> = {
    type: 'any';
    __tsType?: T;
} & CommonSchema;
```

#### `Schema`

```ts
export type Schema = BooleanSchema | NumberSchema | Int8Schema | Uint8Schema | Int16Schema | Uint16Schema | Int32Schema | Uint32Schema | Float32Schema | Float64Schema | StringSchema | ListSchema | ObjectSchema | RecordSchema | AnySchema;
```

#### `SchemaType`

```ts
// biome-ignore format: readability
export type SchemaType<S extends Schema> = S extends BooleanSchema ? NullableOptionalize<S, boolean> : S extends NumberSchema ? NullableOptionalize<S, number> : S extends Int8Schema ? NullableOptionalize<S, number> : S extends Uint8Schema ? NullableOptionalize<S, number> : S extends Int16Schema ? NullableOptionalize<S, number> : S extends Uint16Schema ? NullableOptionalize<S, number> : S extends Int32Schema ? NullableOptionalize<S, number> : S extends Uint32Schema ? NullableOptionalize<S, number> : S extends Float32Schema ? NullableOptionalize<S, number> : S extends Float64Schema ? NullableOptionalize<S, number> : S extends StringSchema ? NullableOptionalize<S, string> : S extends AnySchema<infer T> ? NullableOptionalize<S, T> : S extends {
    type: "list";
    of: infer U extends Schema;
} ? NullableOptionalize<S, SchemaType<U>[]> : S extends {
    type: "object";
    fields: infer F extends Record<string, Schema>;
} ? Simplify<NullableOptionalize<S, ({
    [K in keyof F as F[K] extends Schema ? (F[K]["optional"] extends true ? never : K) : never]: F[K] extends Schema ? SchemaType<F[K]> : never;
}) & ({
    [K in keyof F as F[K] extends Schema ? (F[K]["optional"] extends true ? K : never) : never]?: F[K] extends Schema ? SchemaType<F[K]> : never;
})>> : S extends {
    type: "record";
    field: infer V extends Schema;
} ? NullableOptionalize<S, Record<string, SchemaType<V>>> : never;
```

#### `boolean`

```ts
export function boolean<O extends Partial<Omit<BooleanSchema, 'type'>>>(opts: O = {} as O): {
    type: 'boolean';
} & O;
```

#### `number`

```ts
export function number<O extends Partial<Omit<NumberSchema, 'type'>>>(opts: O = {} as O): {
    type: 'number';
} & O;
```

#### `int8`

```ts
export function int8<O extends Partial<Omit<Int8Schema, 'type'>>>(opts: O = {} as O): {
    type: 'int8';
} & O;
```

#### `uint8`

```ts
export function uint8<O extends Partial<Omit<Uint8Schema, 'type'>>>(opts: O = {} as O): {
    type: 'uint8';
} & O;
```

#### `int16`

```ts
export function int16<O extends Partial<Omit<Int16Schema, 'type'>>>(opts: O = {} as O): {
    type: 'int16';
} & O;
```

#### `uint16`

```ts
export function uint16<O extends Partial<Omit<Uint16Schema, 'type'>>>(opts: O = {} as O): {
    type: 'uint16';
} & O;
```

#### `int32`

```ts
export function int32<O extends Partial<Omit<Int32Schema, 'type'>>>(opts: O = {} as O): {
    type: 'int32';
} & O;
```

#### `uint32`

```ts
export function uint32<O extends Partial<Omit<Uint32Schema, 'type'>>>(opts: O = {} as O): {
    type: 'uint32';
} & O;
```

#### `float32`

```ts
export function float32<O extends Partial<Omit<Float32Schema, 'type'>>>(opts: O = {} as O): {
    type: 'float32';
} & O;
```

#### `float64`

```ts
export function float64<O extends Partial<Omit<Float64Schema, 'type'>>>(opts: O = {} as O): {
    type: 'float64';
} & O;
```

#### `string`

```ts
export function string<O extends Partial<Omit<StringSchema, 'type'>>>(opts: O = {} as O): {
    type: 'string';
} & O;
```

#### `any`

```ts
export function any<T, O extends Partial<Omit<AnySchema<T>, 'type' | '__tsType'>>>(opts: O = {} as O): AnySchema<T> & O;
```

#### `list`

```ts
export function list<T extends Schema, O extends Partial<Omit<ListSchema, 'type' | 'of'>>>(of: T, opts?: O): {
    type: 'list';
    of: T;
} | ({
    type: 'list';
    of: T;
} & O);
```

#### `list`

```ts
export function list<T extends Schema, O extends Partial<Omit<ListSchema, 'type' | 'of'>>>(of: T, opts?: O): {
    type: 'list';
    of: T;
} | ({
    type: 'list';
    of: T;
} & O);
```

#### `list`

```ts
export function list<T extends Schema, O extends Partial<Omit<ListSchema, 'type' | 'of'>>>(of: T, opts?: O): {
    type: 'list';
    of: T;
} | ({
    type: 'list';
    of: T;
} & O);
```

#### `object`

```ts
export function object<F extends Record<string, Schema>, O extends Partial<Omit<ObjectSchema, 'type' | 'fields'>>>(fields: F, opts?: O): {
    type: 'object';
    fields: F;
} | ({
    type: 'object';
    fields: F;
} & O);
```

#### `object`

```ts
export function object<F extends Record<string, Schema>, O extends Partial<Omit<ObjectSchema, 'type' | 'fields'>>>(fields: F, opts?: O): {
    type: 'object';
    fields: F;
} | ({
    type: 'object';
    fields: F;
} & O);
```

#### `object`

```ts
export function object<F extends Record<string, Schema>, O extends Partial<Omit<ObjectSchema, 'type' | 'fields'>>>(fields: F, opts?: O): {
    type: 'object';
    fields: F;
} | ({
    type: 'object';
    fields: F;
} & O);
```

#### `record`

```ts
export function record<F extends Schema, O extends Partial<Omit<RecordSchema, 'type' | 'field'>>>(field: F, opts?: O): {
    type: 'record';
    field: F;
} | ({
    type: 'record';
    field: F;
} & O);
```

#### `record`

```ts
export function record<F extends Schema, O extends Partial<Omit<RecordSchema, 'type' | 'field'>>>(field: F, opts?: O): {
    type: 'record';
    field: F;
} | ({
    type: 'record';
    field: F;
} & O);
```

#### `record`

```ts
export function record<F extends Schema, O extends Partial<Omit<RecordSchema, 'type' | 'field'>>>(field: F, opts?: O): {
    type: 'record';
    field: F;
} | ({
    type: 'record';
    field: F;
} & O);
```

### serdes

#### `createSerDes`

```ts
export function createSerDes<S extends Schema>(schema: S);
```


