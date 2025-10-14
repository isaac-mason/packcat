![./docs/cover.png](./docs/cover.png)

```sh
> npm install packcat
```

> 🚧 packcat is undergoing heavy development ahead of a v1 release. if you want to try it out early, go ahead! but prepare for breaking changes :)

# packcat

packcat is a small library for serializing and deserializing objects to and from buffers.

## Table Of Contents

<TOC />

## Overview

This library takes defined schemas, and then generates efficient functions that serialize and deserialize objects fitting the schemas into compact buffers.

It is great for use cases like networked games/apps where minimizing bandwidth is important, and both the client and server use javascript and can share schema definitions.

Currently there is no formal specification for the serialized data format, and no guarantees are made about the stability of the format between versions. As such, the same version of packcat should be used on both the serializing and deserializing end, and it is not recommended to persist serialized data.

This library assumes the host machine is little-endian in its use of JavaScript typed arrays. While supporting big-endian is technically possible, it falls outside the practical scope and realistic use cases of this library.

## Usage

First, define your data format with the schema utils:

<Snippet source="./snippets.ts" select="schema" />

Next, you can create a serializer/deserializer for that schema, and use `SchemaType` to infer the TypeScript type of the schema:

<Snippet source="./snippets.ts" select="serdes" />

You can also use `validate` if you don't trust whether the input data confirms to the schema type:

<Snippet source="./snippets.ts" select="validate" />

## API Documentation

### Ser/Des

<RenderType type="import('packcat').build" />

### Schema

#### Schema Utilities

<RenderType type="import('packcat').boolean" />

<RenderType type="import('packcat').string" />

<RenderType type="import('packcat').number" />

<RenderType type="import('packcat').int8" />

<RenderType type="import('packcat').uint8" />

<RenderType type="import('packcat').int16" />

<RenderType type="import('packcat').uint16" />

<RenderType type="import('packcat').int32" />

<RenderType type="import('packcat').uint32" />

<RenderType type="import('packcat').float32" />

<RenderType type="import('packcat').float64" />

<RenderType type="import('packcat').literal" />

<RenderType type="import('packcat').list" />

<RenderType type="import('packcat').tuple" />

<RenderType type="import('packcat').object" />

<RenderType type="import('packcat').record" />

<RenderType type="import('packcat').uint8Array" />

<RenderType type="import('packcat').bitset" />

<RenderType type="import('packcat').optional" />

<RenderType type="import('packcat').nullable" />

<RenderType type="import('packcat').nullish" />

<RenderType type="import('packcat').union" />

#### Schema Types

<RenderType type="import('packcat').Schema" />

<RenderType type="import('packcat').BooleanSchema" />

<RenderType type="import('packcat').StringSchema" />

<RenderType type="import('packcat').NumberSchema" />

<RenderType type="import('packcat').Int8Schema" />

<RenderType type="import('packcat').Uint8Schema" />

<RenderType type="import('packcat').Int16Schema" />

<RenderType type="import('packcat').Uint16Schema" />

<RenderType type="import('packcat').Int32Schema" />

<RenderType type="import('packcat').Uint32Schema" />

<RenderType type="import('packcat').Float32Schema" />

<RenderType type="import('packcat').Float64Schema" />

<RenderType type="import('packcat').LiteralSchema" />

<RenderType type="import('packcat').ListSchema" />

<RenderType type="import('packcat').TupleSchema" />

<RenderType type="import('packcat').ObjectSchema" />

<RenderType type="import('packcat').RecordSchema" />

<RenderType type="import('packcat').Uint8ArraySchema" />

<RenderType type="import('packcat').BitSetSchema" />

<RenderType type="import('packcat').OptionalSchema" />

<RenderType type="import('packcat').NullableSchema" />

<RenderType type="import('packcat').NullishSchema" />

<RenderType type="import('packcat').UnionSchema" />
