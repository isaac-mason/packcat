# CHANGELOG

## 0.4.0 (Unreleased)

- feat: add `size`, returns the number of bytes required to pack a value into a buffer (useful for pre-allocating before you have a buffer)
- feat!: `packInto` now writes in a single pass, allocates nothing, and returns the offset just past the packed value
    - **breaking**: `packInto` returns a number instead of `{ ok, bytesWritten }`, and `PackIntoResult` is removed. The value fit if the returned offset is `<= u8.length`; if it's greater, the return value is the length the buffer needs. Bytes written is `end - offset`, and calls chain: `offset = packInto(value, u8, offset)`.
    - **breaking**: `packInto` no longer measures the value up front — it writes optimistically and checks afterwards. As a result, when the value doesn't fit the buffer may be partially written rather than left untouched. Callers that grow/flush and retry on failure are unaffected.
- feat!: remove the `float16` schema type
    - **breaking**: it relied on `Float16Array`, which older browsers (Chrome before 135, Safari before 18.2) don't have, and packcat created one at load, so importing packcat at all failed there. Use `float32` or `quantized` instead.
- fix: prevent SchemaType signature-help OOM 

## 0.3.0

- feat: add schemas for all typed array types

## 0.2.0

- feat: re-worked schema pack and unpack code generation
- feat: removed `bitset` schema type, replaced with automatic boolean bitpacking
- feat: added `packInto` function to pack an object into an existing Uint8Array

## 0.1.0

- feat: renamed `ser` and `des` to `pack` and `unpack`

## 0.0.7

- feat: add `enumeration` schema type for string or number values that encodes as a varuint index

## 0.0.6

- feat: remove the need for `as const` in tuple schema usage
    - before: `tuple([uint16(), string(), varuint()] as const)`
    - after:  `tuple([uint16(), string(), varuint()])`

## 0.01 - 0.0.5

- Early development releases
