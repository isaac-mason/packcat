# CHANGELOG

## 0.2.0 (Unreleased)

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

- Early development releases, use at your own risk!