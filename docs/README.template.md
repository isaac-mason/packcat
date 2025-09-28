![./docs/cover.png](./docs/cover.png)

```sh
> npm install packcat
```

# packcat

packcat is a small library for serializing and deserializing objects to and from ArrayBuffers.

## Table Of Contents

<TOC />

## Usage

First, define your data format with the schema utils:

<Snippet source="./snippets.ts" select="schema" />

Next, you can create a serializer/deserializer for that schema, and use `SchemaType` to infer the TypeScript type of the schema:

<Snippet source="./snippets.ts" select="serdes" />

You can also use `validate` if you don't trust whether the input data confirms to the schema type:

<Snippet source="./snippets.ts" select="validate" />

## API Documentation

### Ser/Des

<RenderType type="import('packcat').serDes" />

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

<RenderType type="import('packcat').list" />

<RenderType type="import('packcat').tuple" />

<RenderType type="import('packcat').object" />

<RenderType type="import('packcat').record" />

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

<RenderType type="import('packcat').ListSchema" />

<RenderType type="import('packcat').TupleSchema" />

<RenderType type="import('packcat').ObjectSchema" />

<RenderType type="import('packcat').RecordSchema" />

