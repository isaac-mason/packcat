![./docs/cover.png](./docs/cover.png)

```sh
> npm install packcat
```

# packcat

packcat is a small library for packing objects to and from buffers.

## Table Of Contents

<TOC />

## Overview

This library takes defined schemas, and then generates efficient functions that pack and unpack objects fitting the schemas into compact buffers.

It is great for use cases like networked games/apps where minimizing bandwidth is important, and both the client and server use javascript and can share schema definitions.

## Usage

First, define your data format with the schema utils:

<Snippet source="./snippets.ts" select="schema" />

Next, you can build the schema, which gives you `pack`, `unpack`, `validate`, `packInto`, and `size` functions, and use `SchemaType` to infer the TypeScript type of the schema:

<Snippet source="./snippets.ts" select="serdes" />

You can also use `validate` if you don't trust whether the input data confirms to the schema type:

<Snippet source="./snippets.ts" select="validate" />

If you want to pack directly into an existing buffer, you can use `packInto`. It writes in a single pass without measuring up front, and reports the number of bytes required via `result.size` (including when the buffer was too small, so you can grow it and retry):

<Snippet source="./snippets.ts" select="packInto" />

If you need to know how many bytes a value requires before allocating a buffer, use `size`:

<Snippet source="./snippets.ts" select="size" />

## Memory & lifetimes (views vs. copies)

`unpack` returns single-byte arrays (`uint8Array`, `int8Array`, `uint8ClampedArray`) as **zero-copy views** into the input buffer — only valid while that buffer is alive and unchanged. Don't mutate, transfer, or recycle the buffer while such a result is in use; `.slice()` for an owned copy.

Multi-byte typed arrays (`uint16Array`, `float32Array`, `float64Array`, etc.) are returned as **owned copies**, so they're safe to cache or hold across a transfer. (This split is forced by alignment: a multi-byte view needs an element-aligned offset, which packed fields can't guarantee.)

## API Documentation

<RenderType type="import('packcat').build" />

<RenderType type="import('packcat').boolean" />

<RenderType type="import('packcat').string" />

<RenderType type="import('packcat').number" />

<RenderType type="import('packcat').int8" />

<RenderType type="import('packcat').uint8" />

<RenderType type="import('packcat').int16" />

<RenderType type="import('packcat').uint16" />

<RenderType type="import('packcat').int32" />

<RenderType type="import('packcat').uint32" />

<RenderType type="import('packcat').int64" />

<RenderType type="import('packcat').uint64" />

<RenderType type="import('packcat').float16" />

<RenderType type="import('packcat').float32" />

<RenderType type="import('packcat').float64" />

<RenderType type="import('packcat').literal" />

<RenderType type="import('packcat').enumeration" />

<RenderType type="import('packcat').list" />

<RenderType type="import('packcat').tuple" />

<RenderType type="import('packcat').object" />

<RenderType type="import('packcat').record" />

<RenderType type="import('packcat').uint8Array" />

<RenderType type="import('packcat').int8Array" />

<RenderType type="import('packcat').uint8ClampedArray" />

<RenderType type="import('packcat').int16Array" />

<RenderType type="import('packcat').uint16Array" />

<RenderType type="import('packcat').int32Array" />

<RenderType type="import('packcat').uint32Array" />

<RenderType type="import('packcat').float32Array" />

<RenderType type="import('packcat').float64Array" />

<RenderType type="import('packcat').bigInt64Array" />

<RenderType type="import('packcat').bigUint64Array" />

<RenderType type="import('packcat').optional" />

<RenderType type="import('packcat').nullable" />

<RenderType type="import('packcat').nullish" />

<RenderType type="import('packcat').union" />

<RenderType type="import('packcat').quantized" />

<RenderType type="import('packcat').quat" />

<RenderType type="import('packcat').uv2" />

<RenderType type="import('packcat').uv3" />

#### Schema Types

<RenderType type="import('packcat').Schema" />

<RenderType type="import('packcat').BooleanSchema" />

<RenderType type="import('packcat').StringSchema" />

<RenderType type="import('packcat').Int8Schema" />

<RenderType type="import('packcat').Uint8Schema" />

<RenderType type="import('packcat').Int16Schema" />

<RenderType type="import('packcat').Uint16Schema" />

<RenderType type="import('packcat').Int32Schema" />

<RenderType type="import('packcat').Uint32Schema" />

<RenderType type="import('packcat').Int64Schema" />

<RenderType type="import('packcat').Uint64Schema" />

<RenderType type="import('packcat').Float16Schema" />

<RenderType type="import('packcat').Float32Schema" />

<RenderType type="import('packcat').Float64Schema" />

<RenderType type="import('packcat').LiteralSchema" />

<RenderType type="import('packcat').EnumerationSchema" />

<RenderType type="import('packcat').ListSchema" />

<RenderType type="import('packcat').TupleSchema" />

<RenderType type="import('packcat').ObjectSchema" />

<RenderType type="import('packcat').RecordSchema" />

<RenderType type="import('packcat').Uint8ArraySchema" />

<RenderType type="import('packcat').Int8ArraySchema" />

<RenderType type="import('packcat').Uint8ClampedArraySchema" />

<RenderType type="import('packcat').Int16ArraySchema" />

<RenderType type="import('packcat').Uint16ArraySchema" />

<RenderType type="import('packcat').Int32ArraySchema" />

<RenderType type="import('packcat').Uint32ArraySchema" />

<RenderType type="import('packcat').Float32ArraySchema" />

<RenderType type="import('packcat').Float64ArraySchema" />

<RenderType type="import('packcat').BigInt64ArraySchema" />

<RenderType type="import('packcat').BigUint64ArraySchema" />

<RenderType type="import('packcat').OptionalSchema" />

<RenderType type="import('packcat').NullableSchema" />

<RenderType type="import('packcat').NullishSchema" />

<RenderType type="import('packcat').UnionSchema" />

<RenderType type="import('packcat').QuantizedSchema" />

<RenderType type="import('packcat').QuatSchema" />

<RenderType type="import('packcat').UV2Schema" />

<RenderType type="import('packcat').UV3Schema" />

## Advanced

### What is the packed data format?

Currently there is no formal specification for the packed data format, and no guarantees are made about the stability of the format between versions. As such, the same version of packcat should be used on both the packing and unpacking end, and it is not recommended to persist packed data.

### Does this library support big-endian machines?

This library assumes the host machine is little-endian in its use of JavaScript typed arrays. While supporting big-endian is technically possible, it falls outside the practical scope and realistic use cases of this library.
