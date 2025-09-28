# buffcat

```sh
> npm install buffcat
```

buffcat is a small library for serializing and deserializing objects to and from ArrayBuffers.

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

<RenderType type="import('buffcat').serDes" />

### Schema

<RenderType type="import('buffcat').boolean" />

<RenderType type="import('buffcat').string" />

<RenderType type="import('buffcat').number" />

<RenderType type="import('buffcat').int8" />

<RenderType type="import('buffcat').uint8" />

<RenderType type="import('buffcat').int16" />

<RenderType type="import('buffcat').uint16" />

<RenderType type="import('buffcat').int32" />

<RenderType type="import('buffcat').uint32" />

<RenderType type="import('buffcat').float32" />

<RenderType type="import('buffcat').float64" />

<RenderType type="import('buffcat').any" />

<RenderType type="import('buffcat').list" />

<RenderType type="import('buffcat').object" />

<RenderType type="import('buffcat').record" />
