![./docs/cover.png](./docs/cover.png)

```sh
> npm install packcat
```

> 🚧 packcat is undergoing heavy development ahead of a v1 release. if you want to try it out early, go ahead! but prepare for breaking changes :)

# packcat

packcat is a small library for serializing and deserializing objects to and from buffers.

## Table Of Contents

- [Overview](#overview)
- [Usage](#usage)
- [API Documentation](#api-documentation)
  - [Ser/Des](#serdes)
  - [Schema](#schema)
    - [Schema Utilities](#schema-utilities)
    - [Schema Types](#schema-types)

## Overview

This library takes defined schemas, and then generates efficient functions that serialize and deserialize objects fitting the schemas into compact buffers.

It is great for use cases like networked games/apps where minimizing bandwidth is important, and both the client and server use javascript and can share schema definitions.

Currently there is no formal specification for the serialized data format, and no guarantees are made about the stability of the format between versions. As such, the same version of packcat should be used on both the serializing and deserializing end, and it is not recommended to persist serialized data.

This library assumes the host machine is little-endian in its use of JavaScript typed arrays. While supporting big-endian is technically possible, it falls outside the practical scope and realistic use cases of this library.

## Usage

First, define your data format with the schema utils:

```ts
import type { SchemaType } from 'packcat';
import { boolean, bitset, float32, list, literal, object, uint32, union } from 'packcat';

const playerInputSchema = object({
    frame: uint32(),
    nipple: list(float32(), 2),
    buttons: bitset(['jump', 'sprint', 'crouch'] as const),
    cmd: list(
        union('type', [
            // literals are not included in the serialised data, only used for discrimination
            object({ type: literal('interact') }),
            object({ type: literal('use'), primary: boolean(), secondary: boolean() }),
        ] as const),
    ),
});

type PlayerInputType = SchemaType<typeof playerInputSchema>;
```

Next, you can build the schema, which gives you `ser`, `des`, and `validate` functions, and use `SchemaType` to infer the TypeScript type of the schema:

```ts
import { build } from 'packcat';

const { ser, des, validate } = build(playerInputSchema);

const playerInput: PlayerInputType = {
    frame: 1,
    nipple: [0, 1],
    buttons: { jump: true, sprint: false, crouch: true },
    cmd: [{ type: 'interact' }, { type: 'use', primary: true, secondary: false }],
};

const u8 = ser(playerInput);

console.log(u8); // Uint8Array

const deserialized = des(u8);

console.log(deserialized); // { frame: 1, nipple: [ 0, 1 ], buttons: { jump: true, sprint: false, crouch: true }, cmd: [ { type: 'interact' }, { type: 'use', primary: true, secondary: false } ] }
```

You can also use `validate` if you don't trust whether the input data confirms to the schema type:

```ts
console.log(validate(playerInput)); // true

// @ts-expect-error this doesn't conform to the schema type!
console.log(validate({ foo: 'bar' })); // false
```

## API Documentation

### Ser/Des

```ts
export function build<S extends Schema>(schema: S): {
    ser: (value: SchemaType<S>) => Uint8Array;
    des: (u8: Uint8Array) => SchemaType<S>;
    validate: (value: SchemaType<S>) => boolean;
    source: {
        ser: string;
        des: string;
        validate: string;
    };
};
```

### Schema

#### Schema Utilities

```ts
export function boolean(): {
    type: 'boolean';
};
```

```ts
export function string(): {
    type: 'string';
};
```

```ts
export function number(): {
    type: 'number';
};
```

```ts
export function int8(): {
    type: 'int8';
};
```

```ts
export function uint8(): {
    type: 'uint8';
};
```

```ts
export function int16(): {
    type: 'int16';
};
```

```ts
export function uint16(): {
    type: 'uint16';
};
```

```ts
export function int32(): {
    type: 'int32';
};
```

```ts
export function uint32(): {
    type: 'uint32';
};
```

```ts
export function float32(): {
    type: 'float32';
};
```

```ts
export function float64(): {
    type: 'float64';
};
```

```ts
export function literal<S extends PrimitiveSchema, V extends SchemaType<S>>(value: V): {
    type: 'literal';
    value: V;
};
```

```ts
export function list<T extends Schema, L extends number>(of: T, length?: L);
```

```ts
export function tuple<T extends Schema[]>(of: T): {
    type: 'tuple';
    of: [
        ...T
    ];
};
```

```ts
export function object<F extends Record<string, Schema>>(fields: F): {
    type: 'object';
    fields: F;
};
```

```ts
export function record<F extends Schema>(field: F): {
    type: 'record';
    field: F;
};
```

```ts
export function uint8Array(): {
    type: 'uint8Array';
};
```

```ts
export function bitset<Keys extends string[]>(keys: [
    ...Keys
]): {
    type: 'bitset';
    keys: [
        ...Keys
    ];
};
```

```ts
export function optional<S extends Schema>(of: S): {
    type: 'optional';
    of: S;
};
```

```ts
export function nullable<S extends Schema>(of: S): {
    type: 'nullable';
    of: S;
};
```

```ts
export function nullish<S extends Schema>(of: S): {
    type: 'nullish';
    of: S;
};
```

```ts
export function union<K extends string, V extends (ObjectSchema & {
    fields: {
        [k in K]: LiteralSchema;
    };
})[]>(key: K, variants: [
    ...V
]): {
    type: 'union';
    key: K;
    variants: [
        ...V
    ];
};
```

#### Schema Types

```ts
export type Schema = BooleanSchema | NumberSchema | VarIntSchema | VarUintSchema | Int8Schema | Uint8Schema | Int16Schema | Uint16Schema | Int32Schema | Uint32Schema | Float32Schema | Float64Schema | StringSchema | ListSchema | TupleSchema | ObjectSchema | RecordSchema | Uint8ArraySchema | BitSetSchema | UnionSchema | LiteralSchema | NullableSchema | OptionalSchema | NullishSchema;
```

```ts
export type BooleanSchema = {
    type: 'boolean';
};
```

```ts
export type StringSchema = {
    type: 'string';
};
```

```ts
export type NumberSchema = {
    type: 'number';
};
```

```ts
export type Int8Schema = {
    type: 'int8';
};
```

```ts
export type Uint8Schema = {
    type: 'uint8';
};
```

```ts
export type Int16Schema = {
    type: 'int16';
};
```

```ts
export type Uint16Schema = {
    type: 'uint16';
};
```

```ts
export type Int32Schema = {
    type: 'int32';
};
```

```ts
export type Uint32Schema = {
    type: 'uint32';
};
```

```ts
export type Float32Schema = {
    type: 'float32';
};
```

```ts
export type Float64Schema = {
    type: 'float64';
};
```

```ts
export type LiteralSchema = {
    type: 'literal';
    value: SchemaType<PrimitiveSchema>;
};
```

```ts
export type ListSchema = {
    type: 'list';
    of: Schema;
    length?: number;
};
```

```ts
export type TupleSchema = {
    type: 'tuple';
    of: Schema[];
};
```

```ts
export type ObjectSchema = {
    type: 'object';
    fields: Record<string, Schema>;
};
```

```ts
export type RecordSchema = {
    type: 'record';
    field: Schema;
};
```

```ts
export type Uint8ArraySchema = {
    type: 'uint8Array';
};
```

```ts
export type BitSetSchema = {
    type: 'bitset';
    keys: string[];
};
```

```ts
export type OptionalSchema = {
    type: 'optional';
    of: Schema;
};
```

```ts
export type NullableSchema = {
    type: 'nullable';
    of: Schema;
};
```

```ts
export type NullishSchema = {
    type: 'nullish';
    of: Schema;
};
```

```ts
export type UnionSchema = {
    type: 'union';
    key: string;
    variants: Array<ObjectSchema>;
};
```
