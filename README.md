# buffcat

```sh
> npm install buffcat
```

buffcat is a small library for serializing and deserializing objects to and from ArrayBuffers.

## Table Of Contents

- [API Documentation](#api-documentation)
  - [Ser/Des](#serdes)
  - [Schema](#schema)

## API Documentation

### Ser/Des

```ts
export function createSerDes<S extends Schema>(schema: S);
```

### Schema

```ts
export function boolean<O extends Partial<Omit<BooleanSchema, 'type'>>>(opts: O = {} as O): {
    type: 'boolean';
} & O;
```

```ts
export function string<O extends Partial<Omit<StringSchema, 'type'>>>(opts: O = {} as O): {
    type: 'string';
} & O;
```

```ts
export function number<O extends Partial<Omit<NumberSchema, 'type'>>>(opts: O = {} as O): {
    type: 'number';
} & O;
```

```ts
export function int8<O extends Partial<Omit<Int8Schema, 'type'>>>(opts: O = {} as O): {
    type: 'int8';
} & O;
```

```ts
export function uint8<O extends Partial<Omit<Uint8Schema, 'type'>>>(opts: O = {} as O): {
    type: 'uint8';
} & O;
```

```ts
export function int16<O extends Partial<Omit<Int16Schema, 'type'>>>(opts: O = {} as O): {
    type: 'int16';
} & O;
```

```ts
export function uint16<O extends Partial<Omit<Uint16Schema, 'type'>>>(opts: O = {} as O): {
    type: 'uint16';
} & O;
```

```ts
export function int32<O extends Partial<Omit<Int32Schema, 'type'>>>(opts: O = {} as O): {
    type: 'int32';
} & O;
```

```ts
export function uint32<O extends Partial<Omit<Uint32Schema, 'type'>>>(opts: O = {} as O): {
    type: 'uint32';
} & O;
```

```ts
export function float32<O extends Partial<Omit<Float32Schema, 'type'>>>(opts: O = {} as O): {
    type: 'float32';
} & O;
```

```ts
export function float64<O extends Partial<Omit<Float64Schema, 'type'>>>(opts: O = {} as O): {
    type: 'float64';
} & O;
```

```ts
export function any<T, O extends Partial<Omit<AnySchema<T>, 'type' | '__tsType'>>>(opts: O = {} as O): AnySchema<T> & O;
```

```ts
export function list<T extends Schema, O extends Partial<Omit<ListSchema, 'type' | 'of'>>>(of: T, opts?: O): {
    type: 'list';
    of: T;
} | ({
    type: 'list';
    of: T;
} & O);
```

```ts
export function object<F extends Record<string, Schema>, O extends Partial<Omit<ObjectSchema, 'type' | 'fields'>>>(fields: F, opts?: O): {
    type: 'object';
    fields: F;
} | ({
    type: 'object';
    fields: F;
} & O);
```

```ts
export function record<F extends Schema, O extends Partial<Omit<RecordSchema, 'type' | 'field'>>>(field: F, opts?: O): {
    type: 'record';
    field: F;
} | ({
    type: 'record';
    field: F;
} & O);
```
