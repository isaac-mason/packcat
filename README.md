# buffcat

```sh
> npm install buffcat
```

buffcat is a small library for serializing and deserializing objects to and from ArrayBuffers.

## Table Of Contents

- [Usage](#usage)
- [API Documentation](#api-documentation)
  - [Ser/Des](#serdes)
  - [Schema](#schema)

## Usage

First, define your data format with the schema utils:

```ts
import type { SchemaType } from 'buffcat';
import { list, number, object, record, string, uint8 } from 'buffcat';

const playerSchema = object({
    name: string(),
    health: number(),
    level: uint8(),
    inventory: record(object({ item: string(), qty: number() })),
    buffs: list(uint8()),
});

type PlayerType = SchemaType<typeof playerSchema>;
```

## API Documentation

### Ser/Des

```ts
export function serDes<S extends Schema>(schema: S);
```

### Schema

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
export function any<T>(): AnySchema<T>;
```

```ts
export function list<T extends Schema>(of: T): {
    type: 'list';
    of: T;
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
