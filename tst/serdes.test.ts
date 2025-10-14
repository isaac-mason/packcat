/** biome-ignore-all lint/suspicious/noApproximativeNumericConstant: test data */

import { describe, expect, test } from 'vitest';
import type { SchemaType } from '../src';
import {
    bitset,
    boolean,
    build,
    float32,
    float64,
    int8,
    int16,
    int32,
    list,
    literal,
    nullable,
    nullish,
    number,
    object,
    optional,
    record,
    string,
    tuple,
    uint8,
    uint8Array,
    uint16,
    uint32,
    union,
    varint,
    varuint,
} from '../src';

describe('serDes', () => {
    test('boolean', () => {
        const { ser, des } = build(boolean());
        const serializedTrue = ser(true);
        const result = des(serializedTrue);
        expect(result).toBe(true);
        const serializedFalse = ser(false);
        const result2 = des(serializedFalse);
        expect(result2).toBe(false);
    });

    test('numbers', () => {
        // number (float64)
        const { ser: serNum, des: desNum } = build(number());
        const serializedNumber = serNum(12345.6789);
        expect(serializedNumber.byteLength).toBe(8);
        const outNum = desNum(serializedNumber);
        expect(outNum).toBeCloseTo(12345.6789);

        // int8
        const { ser: serI8, des: desI8 } = build(int8());
        const serializedI8 = serI8(-12);
        expect(serializedI8.byteLength).toBe(1);
        expect(desI8(serializedI8)).toBe(-12);

        // uint8
        const { ser: serU8, des: desU8 } = build(uint8());
        const serializedU8 = serU8(250);
        expect(serializedU8.byteLength).toBe(1);
        expect(desU8(serializedU8)).toBe(250);

        // int16
        const { ser: serI16, des: desI16 } = build(int16());
        const serializedI16 = serI16(-1234);
        expect(serializedI16.byteLength).toBe(2);
        expect(desI16(serializedI16)).toBe(-1234);

        // uint16
        const { ser: serU16, des: desU16 } = build(uint16());
        const serializedU16 = serU16(60000);
        expect(serializedU16.byteLength).toBe(2);
        expect(desU16(serializedU16)).toBe(60000);

        // int32
        const { ser: serI32, des: desI32 } = build(int32());
        const serializedI32 = serI32(-123456789);
        expect(serializedI32.byteLength).toBe(4);
        expect(desI32(serializedI32)).toBe(-123456789);

        // uint32
        const { ser: serU32, des: desU32 } = build(uint32());
        const serializedU32 = serU32(4000000000);
        expect(serializedU32.byteLength).toBe(4);
        expect(desU32(serializedU32)).toBe(4000000000);

        // float32
        const { ser: serF32, des: desF32 } = build(float32());
        const serializedF32 = serF32(3.14159);
        expect(serializedF32.byteLength).toBe(4);
        const outF32 = desF32(serializedF32);
        expect(outF32).toBeCloseTo(3.14159, 5);

        // float64
        const { ser: serF64, des: desF64 } = build(float64());
        const serializedF64 = serF64(2.718281828459045);
        expect(serializedF64.byteLength).toBe(8);
        const outF64 = desF64(serializedF64);
        expect(outF64).toBeCloseTo(2.718281828459045, 12);
    });

    test('varint/varuint with expected byte lengths', () => {
        // varint tests
        const { ser: serVarInt, des: desVarInt, validate: validateVarInt } = build(varint());

        // Test small positive values (1 byte)
        const small1 = serVarInt(0);
        expect(small1.byteLength).toBe(1);
        expect(desVarInt(small1)).toBe(0);

        const small2 = serVarInt(63);
        expect(small2.byteLength).toBe(1);
        expect(desVarInt(small2)).toBe(63);

        // Test small negative values (1 byte due to zigzag encoding)
        const smallNeg1 = serVarInt(-1);
        expect(smallNeg1.byteLength).toBe(1);
        expect(desVarInt(smallNeg1)).toBe(-1);

        const smallNeg2 = serVarInt(-64);
        expect(smallNeg2.byteLength).toBe(1);
        expect(desVarInt(smallNeg2)).toBe(-64);

        // Test medium values (2 bytes)
        const medium1 = serVarInt(127);
        expect(medium1.byteLength).toBe(2);
        expect(desVarInt(medium1)).toBe(127);

        const medium2 = serVarInt(-128);
        expect(medium2.byteLength).toBe(2);
        expect(desVarInt(medium2)).toBe(-128);

        const medium3 = serVarInt(8191);
        expect(medium3.byteLength).toBe(2);
        expect(desVarInt(medium3)).toBe(8191);

        // Test larger values (3+ bytes)
        const large1 = serVarInt(16383);
        expect(large1.byteLength).toBe(3);
        expect(desVarInt(large1)).toBe(16383);

        const large2 = serVarInt(-100000);
        expect(large2.byteLength).toBe(3);
        expect(desVarInt(large2)).toBe(-100000);

        // Test very large values
        const veryLarge = serVarInt(67108863);
        expect(veryLarge.byteLength).toBe(4);
        expect(desVarInt(veryLarge)).toBe(67108863);

        // Validation tests
        expect(validateVarInt(0)).toBe(true);
        expect(validateVarInt(-1)).toBe(true);
        expect(validateVarInt(12345)).toBe(true);
        expect(validateVarInt(-67890)).toBe(true);
        expect(validateVarInt(1.5)).toBe(false);
        // @ts-expect-error testing invalid input
        expect(validateVarInt('123')).toBe(false);

        // varuint tests
        const { ser: serVarUInt, des: desVarUInt, validate: validateVarUInt } = build(varuint());

        // Test small values (1 byte)
        const usmall1 = serVarUInt(0);
        expect(usmall1.byteLength).toBe(1);
        expect(desVarUInt(usmall1)).toBe(0);

        const usmall2 = serVarUInt(127);
        expect(usmall2.byteLength).toBe(1);
        expect(desVarUInt(usmall2)).toBe(127);

        // Test medium values (2 bytes)
        const umedium1 = serVarUInt(128);
        expect(umedium1.byteLength).toBe(2);
        expect(desVarUInt(umedium1)).toBe(128);

        const umedium2 = serVarUInt(16383);
        expect(umedium2.byteLength).toBe(2);
        expect(desVarUInt(umedium2)).toBe(16383);

        // Test larger values (3 bytes)
        const ularge1 = serVarUInt(16384);
        expect(ularge1.byteLength).toBe(3);
        expect(desVarUInt(ularge1)).toBe(16384);

        const ularge2 = serVarUInt(2097151);
        expect(ularge2.byteLength).toBe(3);
        expect(desVarUInt(ularge2)).toBe(2097151);

        // Test very large values (4 bytes)
        const uveryLarge = serVarUInt(268435455);
        expect(uveryLarge.byteLength).toBe(4);
        expect(desVarUInt(uveryLarge)).toBe(268435455);

        // Validation tests
        expect(validateVarUInt(0)).toBe(true);
        expect(validateVarUInt(12345)).toBe(true);
        expect(validateVarUInt(4294967295)).toBe(true);
        expect(validateVarUInt(-1)).toBe(false);
        expect(validateVarUInt(1.5)).toBe(false);
        // @ts-expect-error testing invalid input
        expect(validateVarUInt('123')).toBe(false);
    });

    test('string', () => {
        const { ser, des } = build(string());
        const testStr = 'hello world';
        const serialized = ser(testStr);
        expect(serialized.byteLength).toBe(1 + testStr.length); // 1 byte varuint length prefix for short strings
        const result = des(serialized);
        expect(result).toBe(testStr);
    });

    test('string (long - 2 byte varuint)', () => {
        const { ser, des } = build(string());
        // String with 150 chars requires 2 bytes for varuint (128-16383 range)
        const testStr = 'a'.repeat(150);
        const serialized = ser(testStr);
        expect(serialized.byteLength).toBe(2 + testStr.length); // 2 byte varuint length prefix
        const result = des(serialized);
        expect(result).toBe(testStr);
    });

    test('arraybuffer empty and non-empty', () => {
        const { ser, des, validate } = build(uint8Array());

        // Empty array - varuint(0) = 1 byte
        const empty = new Uint8Array(0);
        const serializedEmpty = ser(empty);
        expect(serializedEmpty.byteLength).toBe(1); // varuint(0) = 1 byte
        const outEmpty = des(serializedEmpty);
        expect(outEmpty.byteLength).toBe(0);
        expect(outEmpty.buffer).toBe(serializedEmpty.buffer); // should be a view

        // Small array (length < 128) - varuint = 1 byte
        const src = new Uint8Array([1, 2, 3]);
        const serialized = ser(src);
        expect(serialized.byteLength).toBe(1 + src.length); // varuint(3) = 1 byte + 3 bytes data
        const out = des(serialized);
        expect(out).toEqual(src);
        expect(out.buffer).toBe(serialized.buffer); // should be a view

        // Length = 127 (edge case, still 1 byte varuint)
        const len127 = new Uint8Array(127).fill(42);
        const ser127 = ser(len127);
        expect(ser127.byteLength).toBe(1 + 127); // varuint(127) = 1 byte
        const out127 = des(ser127);
        expect(out127).toEqual(len127);

        // Length = 128 (crosses threshold, 2 byte varuint)
        const len128 = new Uint8Array(128).fill(43);
        const ser128 = ser(len128);
        expect(ser128.byteLength).toBe(2 + 128); // varuint(128) = 2 bytes
        const out128 = des(ser128);
        expect(out128).toEqual(len128);

        // Length = 255 (2 byte varuint)
        const len255 = new Uint8Array(255).fill(44);
        const ser255 = ser(len255);
        expect(ser255.byteLength).toBe(2 + 255); // varuint(255) = 2 bytes
        const out255 = des(ser255);
        expect(out255).toEqual(len255);

        // Length = 16383 (edge case, still 2 byte varuint)
        const len16383 = new Uint8Array(16383).fill(45);
        const ser16383 = ser(len16383);
        expect(ser16383.byteLength).toBe(2 + 16383); // varuint(16383) = 2 bytes
        const out16383 = des(ser16383);
        expect(out16383.byteLength).toBe(16383);

        // Length = 16384 (crosses threshold, 3 byte varuint)
        const len16384 = new Uint8Array(16384).fill(46);
        const ser16384 = ser(len16384);
        expect(ser16384.byteLength).toBe(3 + 16384); // varuint(16384) = 3 bytes
        const out16384 = des(ser16384);
        expect(out16384.byteLength).toBe(16384);

        expect(validate(src)).toBe(true);
        // @ts-expect-error wrong type
        expect(validate(123)).toBe(false);
    });

    test('uint8array nested in object and list', () => {
        const nestedSchema = object({ id: uint8(), data: uint8Array() });
        const { ser: s1, des: d1 } = build(nestedSchema);

        const payload = new Uint8Array([9, 8, 7]);
        const obj = { id: 5, data: payload };
        const serialized = s1(obj as any);
        const out = d1(serialized);
        expect(out.id).toBe(5);
        expect(new Uint8Array(out.data)).toEqual(payload);

        const listSchema = list(uint8Array());
        const { ser: s2, des: d2 } = build(listSchema);
        const arr = [new Uint8Array([1]), new Uint8Array([2, 3])];
        const serialized2 = s2(arr as any);
        const outArr = d2(serialized2);
        expect(new Uint8Array(outArr[0])).toEqual(new Uint8Array([1]));
        expect(new Uint8Array(outArr[1])).toEqual(new Uint8Array([2, 3]));
    });

    test('list of numbers', () => {
        const { ser, des } = build(list(number()));
        const arr = [1.1, 2.2, 3.3];
        const serialized = ser(arr);
        expect(serialized.byteLength).toBe(1 + arr.length * 8); // 1 byte varuint for length prefix + 8 bytes per number
        const result = des(serialized);
        expect(result).toEqual(arr);
    });

    test('list of fixed-length lists (vec3)', () => {
        const vec3Schema = list(float32(), 3);
        const { ser, des } = build(list(vec3Schema));

        const data: [number, number, number][] = [
            [1.1, 2.2, 3.3],
            [4.4, 5.5, 6.6],
        ];

        const serialized = ser(data);
        expect(serialized.byteLength).toBe(1 + data.length * 12); // 1 byte varuint for length prefix + 12 bytes per vec3 (3 * 4 bytes per float32)

        const result = des(serialized);
        expect(result.length).toBe(data.length);

        // use approximate equality for float32
        for (let i = 0; i < data.length; i++) {
            const inVec = data[i];
            const outVec = result[i];

            expect(inVec.length).toBe(outVec.length);

            for (let j = 0; j < inVec.length; j++) {
                expect(inVec[j]).toBeCloseTo(outVec[j], 5);
            }
        }
    });

    test('nested list of numbers', () => {
        const { ser, des } = build(list(list(number())));
        const arr = [
            [1, 2, 3],
            [4, 5, 6],
            [6, 7, 8],
        ];

        const serialized = ser(arr);
        expect(serialized.byteLength).toBe(1 + arr.length * 1 + arr.reduce((sum, item) => sum + item.length * 8, 0)); // outer varuint + inner varuints

        const result = des(serialized);
        expect(result).toEqual(arr);
    });

    test('large list (>127 elements, 2-byte varuint)', () => {
        const { ser, des } = build(list(uint8()));
        const arr = new Array(200).fill(0).map((_, i) => i % 256);
        const serialized = ser(arr);
        expect(serialized.byteLength).toBe(2 + arr.length * 1); // 2-byte varuint for length prefix + 1 byte per uint8
        const result = des(serialized);
        expect(result).toEqual(arr);
    });

    test('object', () => {
        const { ser, des } = build(
            object({
                a: number(),
                b: string(),
                c: boolean(),
            }),
        );

        const obj = { a: 123.45, b: 'test', c: true };

        const serialized = ser(obj);
        expect(serialized.byteLength).toBe(8 + 1 + obj.b.length + 1); // number (8) + string varuint prefix (1) + string bytes + boolean (1)

        const result = des(serialized);
        expect(result).toEqual(obj);
    });

    test('object (long string - 2 byte varuint)', () => {
        const { ser, des } = build(object({ a: number(), b: string(), c: boolean() }));
        const obj = { a: 123.45, b: 'x'.repeat(200), c: true };

        const serialized = ser(obj);
        expect(serialized.byteLength).toBe(8 + 2 + obj.b.length + 1); // number (8) + string 2-byte varuint prefix + string bytes + boolean (1)

        const result = des(serialized);
        expect(result).toEqual(obj);
    });

    test('object in object', () => {
        const { ser, des } = build(
            object({
                id: uint32(),
                name: string(),
                active: boolean(),
                stats: object({
                    score: number(),
                    level: uint32(),
                }),
            }),
        );

        const obj = {
            id: 1,
            name: 'PlayerOne',
            active: true,
            stats: {
                score: 9876.5,
                level: 42,
            },
        };

        const serialized = ser(obj);
        expect(serialized.byteLength).toBe(4 + 1 + obj.name.length + 1 + 8 + 4); // id (4) + name varuint prefix (1) + name bytes + active (1) + score (8) + level (4)

        const result = des(serialized);
        expect(result).toEqual(obj);
    });

    test('object in object (long string - 2 byte varuint)', () => {
        const { ser, des } = build(
            object({
                id: uint32(),
                name: string(),
                active: boolean(),
                stats: object({
                    score: number(),
                    level: uint32(),
                }),
            }),
        );

        const obj = {
            id: 42,
            name: 'y'.repeat(180),
            active: true,
            stats: { score: 98.5, level: 10 },
        };

        const serialized = ser(obj);
        expect(serialized.byteLength).toBe(4 + 2 + obj.name.length + 1 + 8 + 4); // id (4) + name 2-byte varuint prefix + name bytes + active (1) + score (8) + level (4)

        const result = des(serialized);
        expect(result).toEqual(obj);
    });

    test('tuple', () => {
        const { ser, des } = build(tuple([number(), string(), boolean()] as const));

        const data: [number, string, boolean] = [42.5, 'hello', true];
        const serialized = ser(data);
        expect(serialized.byteLength).toBe(8 + 1 + data[1].length + 1); // number (8) + string varuint prefix (1) + string bytes + boolean (1)

        const out = des(serialized) as [number, string, boolean];
        expect(out[0]).toBeCloseTo(data[0]);
        expect(out[1]).toBe(data[1]);
        expect(out[2]).toBe(data[2]);
    });

    test('tuple (long string - 2 byte varuint)', () => {
        const { ser, des } = build(tuple([number(), string(), boolean()] as const));

        const data: [number, string, boolean] = [42.5, 'z'.repeat(250), true];
        const serialized = ser(data);
        expect(serialized.byteLength).toBe(8 + 2 + data[1].length + 1); // number (8) + string 2-byte varuint prefix + string bytes + boolean (1)

        const out = des(serialized) as [number, string, boolean];
        expect(out[0]).toBeCloseTo(data[0]);
        expect(out[1]).toBe(data[1]);
        expect(out[2]).toBe(data[2]);
    });

    test('tuple of tuples', () => {
        const inner = tuple([number(), string()] as const);
        const schema = tuple([inner, inner] as const);
        const { ser, des } = build(schema);

        const data: [[number, string], [number, string]] = [
            [1.5, 'a'],
            [2.5, 'b'],
        ];

        const buf = ser(data);

        const out = des(buf) as [[number, string], [number, string]];

        expect(out.length).toBe(2);
        expect(out[0][0]).toBeCloseTo(data[0][0]);
        expect(out[0][1]).toBe(data[0][1]);
        expect(out[1][0]).toBeCloseTo(data[1][0]);
        expect(out[1][1]).toBe(data[1][1]);
    });

    test('list of objects', () => {
        const { ser, des } = build(
            list(
                object({
                    id: uint32(),
                    name: string(),
                }),
            ),
        );
        const arr = [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
        ];
        const serialized = ser(arr);
        const result = des(serialized);
        expect(result).toEqual(arr);
    });

    test('list of objects with vec3 positions (uint16 id + float32 vec3)', () => {
        const vec3Schema = list(float32(), 3);
        const schema = list(
            object({
                id: uint16(),
                pos: vec3Schema,
            }),
        );

        const { ser, des } = build(schema);

        const data: SchemaType<typeof schema> = [
            { id: 0, pos: [12, 24, 48] },
            { id: 1, pos: [120, 240, 480] },
            { id: 2, pos: [1200, 2400, 4800] },
            { id: 3, pos: [1.2, 2.4, 4.8] },
            { id: 4, pos: [1, 2, 4] },
        ];

        const buf = ser(data);
        const out = des(buf) as Array<{ id: number; pos: number[] }>;

        expect(out.length).toBe(data.length);

        for (let i = 0; i < data.length; i++) {
            expect(out[i].id).toBe(data[i].id);
            // compare floats approximately where relevant
            for (let j = 0; j < 3; j++) {
                expect(out[i].pos[j]).toBeCloseTo(data[i].pos[j], 5);
            }
        }
    });

    test('record (empty, simple, unicode keys)', () => {
        const { ser, des } = build(record(uint32()));

        // empty
        const empty = {};
        expect(des(ser(empty))).toEqual(empty);

        const simple = { a: 1, b: 42, hello: 12345 };
        expect(des(ser(simple))).toEqual(simple);

        const unicode = { ключ: 7, '😊': 999 };
        expect(des(ser(unicode))).toEqual(unicode);
    });

    test('object keys with quotes/newlines/emoji', () => {
        const { ser, des, validate } = build(record(uint32()));

        // keys with tricky characters
        const data: Record<string, number> = {
            simple: 1,
            'with"quote': 2,
            'with\nnewline': 3,
            'emoji-😊': 4,
        };

        expect(validate(data)).toBe(true);

        const buf = ser(data);
        const out = des(buf);
        expect(out).toEqual(data);
    });

    test('record of records', () => {
        const { ser, des } = build(record(record(uint32())));
        const data = {
            group1: { a: 1, b: 2 },
            group2: { x: 42, y: 99 },
        };
        const serialized = ser(data);
        const result = des(serialized);
        expect(result).toEqual(data);
    });

    test('bitset simple', () => {
        const { ser, des, validate } = build(bitset(['a', 'b', 'c'] as const));

        const v = { a: true, b: false, c: true };
        expect(validate(v)).toBe(true);

        const buf = ser(v);
        const out = des(buf);
        expect(out).toEqual(v);
    });

    test('bitset many keys (multi-byte)', () => {
        const keys: string[] = [];
        for (let i = 0; i < 10; i++) keys.push(`k${i}`);
        const s = build(bitset(keys));

        const obj: Record<string, boolean> = {};
        for (let i = 0; i < keys.length; i++) obj[keys[i]] = i % 2 === 0;

        const buf = s.ser(obj);
        const out = s.des(buf);
        expect(out).toEqual(obj);
    });

    test('literal', () => {
        const schema = literal('hello');
        const { ser, des, validate } = build(schema);

        const v = 'hello';
        expect(validate(v)).toBe(true);

        const buf = ser(v);
        expect(buf.byteLength).toBe(0);

        const out = des(buf);
        expect(out).toEqual(v);
    });

    test('optional', () => {
        const schema = optional(string());
        const { ser, des } = build(schema);

        const present = 'hi';
        const bufPresent = ser(present);
        expect(des(bufPresent)).toBe(present);

        const bufAbsent = ser(undefined);
        expect(des(bufAbsent)).toBeUndefined();
    });

    test('nullable', () => {
        const schema = nullable(string());
        const { ser, des } = build(schema);

        const bufNull = ser(null);
        expect(des(bufNull)).toBeNull();

        const bufVal = ser('hi');
        expect(des(bufVal)).toBe('hi');
    });

    test('nullish', () => {
        const schema = nullish(string());
        const { ser, des } = build(schema);

        const bufNull = ser(null);
        expect(des(bufNull)).toBeNull();

        const bufUndef = ser(undefined);
        expect(des(bufUndef)).toBeUndefined();

        const bufVal = ser('val');
        expect(des(bufVal)).toBe('val');
    });

    test('complex structure', () => {
        const complexSchema = object({
            id: uint32(),
            name: string(),
            active: boolean(),
            flags: bitset(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']),
            stats: object({
                score: number(),
                level: uint32(),
                ratios: list(float32(), 3),
            }),
            inventory: list(
                object({
                    itemId: uint32(),
                    qty: uint16(),
                    attrs: record(string()),
                }),
            ),
            matrix: list(list(int16())),
            nestedTuple: tuple([number(), object({ x: float64(), y: float64() }), list(boolean())] as const),
            mapOfMaps: record(record(uint32())),
        });

        type ComplexSchemaType = SchemaType<typeof complexSchema>;

        const data: ComplexSchemaType = {
            id: 12345,
            name: 'ComplexStructure',
            active: true,
            flags: { a: true, b: false, c: true, d: false, e: true, f: false, g: true, h: false, i: true, j: false },
            stats: { score: 9876.54321, level: 99, ratios: [1.1, 2.2, 3.3] },
            inventory: [
                { itemId: 1, qty: 2, attrs: { color: 'red' } },
                { itemId: 2, qty: 5, attrs: { size: 'L', gift: 'yes' } },
            ],
            matrix: [
                [1, 2, 3],
                [4, 5, 6],
            ],
            nestedTuple: [42.42, { x: 1.234567890123, y: -2.345678901234 }, [true, false, true]],
            mapOfMaps: { group1: { a: 1, b: 2 }, group2: { x: 42 } },
        };

        const s = build(complexSchema);
        expect(s.validate(data)).toBe(true);

        const buf = s.ser(data);
        const out = s.des(buf);

        // basic checks
        expect(out.id).toBe(data.id);
        expect(out.name).toBe(data.name);
        expect(out.active).toBe(data.active);
        expect(out.flags).toEqual(data.flags);

        // floats: use approximate equality
        expect(out.stats.level).toBe(data.stats.level);
        expect(out.stats.score).toBeCloseTo(data.stats.score, 6);
        for (let i = 0; i < data.stats.ratios.length; i++) {
            expect(out.stats.ratios[i]).toBeCloseTo(data.stats.ratios[i], 5);
        }

        // inventory
        expect(out.inventory.length).toBe(data.inventory.length);
        expect(out.inventory[0].itemId).toBe(data.inventory[0].itemId);
        expect(out.inventory[1].attrs.size).toBe(data.inventory[1].attrs.size);

        // matrix and nested structures
        expect(out.matrix).toEqual(data.matrix);

        expect(out.nestedTuple[0]).toBeCloseTo(data.nestedTuple[0], 5);
        expect(out.nestedTuple[1].x).toBeCloseTo(data.nestedTuple[1].x, 10);
        expect(out.nestedTuple[1].y).toBeCloseTo(data.nestedTuple[1].y, 10);
        expect(out.nestedTuple[2]).toEqual(data.nestedTuple[2]);

        // map of maps
        expect(out.mapOfMaps).toEqual(data.mapOfMaps);
    });

    test('union', () => {
        const pet = union('type', [
            object({ type: literal('dog'), name: string(), bark: uint8() }),
            object({ type: literal('cat'), name: string(), lives: uint8() }),
        ] as const);

        const { ser, des, validate } = build(pet);

        const dog = { type: 'dog', name: 'Rex', bark: 5 } as const;
        const cat = { type: 'cat', name: 'Mittens', lives: 9 } as const;

        expect(validate(dog)).toBe(true);
        expect(validate(cat)).toBe(true);

        const bufDog = ser(dog);
        const outDog = des(bufDog);
        expect(outDog).toEqual(dog);

        const bufCat = ser(cat);
        const outCat = des(bufCat);
        expect(outCat).toEqual(cat);
    });

    test('union with many variants (>255)', () => {
        // Create 300 variants to test varuint encoding
        const variants = Array.from({ length: 300 }, (_, i) =>
            object({ type: literal(`type${i}`), value: uint8() }),
        );
        const schema = union('type', variants as any);
        const { ser, des, validate } = build(schema);

        // Test first variant (1-byte varuint: 0)
        const first = { type: 'type0', value: 42 };
        expect(validate(first)).toBe(true);
        const bufFirst = ser(first);
        expect(bufFirst.byteLength).toBe(2); // 1 byte varuint tag + 1 byte value
        expect(des(bufFirst)).toEqual(first);

        // Test variant at 127 (1-byte varuint boundary)
        const at127 = { type: 'type127', value: 100 };
        expect(validate(at127)).toBe(true);
        const buf127 = ser(at127);
        expect(buf127.byteLength).toBe(2); // 1 byte varuint tag + 1 byte value
        expect(des(buf127)).toEqual(at127);

        // Test variant at 128 (2-byte varuint)
        const at128 = { type: 'type128', value: 50 };
        expect(validate(at128)).toBe(true);
        const buf128 = ser(at128);
        expect(buf128.byteLength).toBe(3); // 2 byte varuint tag + 1 byte value
        expect(des(buf128)).toEqual(at128);

        // Test variant at 200 (2-byte varuint)
        const at200 = { type: 'type200', value: 75 };
        expect(validate(at200)).toBe(true);
        const buf200 = ser(at200);
        expect(buf200.byteLength).toBe(3); // 2 byte varuint tag + 1 byte value
        expect(des(buf200)).toEqual(at200);

        // Test last variant
        const last = { type: 'type299', value: 99 };
        expect(validate(last)).toBe(true);
        const bufLast = ser(last);
        expect(bufLast.byteLength).toBe(3); // 2 byte varuint tag + 1 byte value
        expect(des(bufLast)).toEqual(last);
    });

    test('empty string', () => {
        const { ser, des } = build(string());
        const empty = '';
        const serialized = ser(empty);
        expect(serialized.byteLength).toBe(1); // just the varuint length prefix (0)
        expect(des(serialized)).toBe(empty);
    });

    test('string with emoji', () => {
        const { ser, des } = build(string());

        // Simple emoji (4 bytes in UTF-8)
        const simple = '😊';
        expect(des(ser(simple))).toBe(simple);

        // Emoji with zero-width joiner (family emoji)
        const family = '👨‍👩‍👧‍👦';
        expect(des(ser(family))).toBe(family);

        // Various emoji
        const multi = '🌍🔥💧🌊⚡';
        expect(des(ser(multi))).toBe(multi);
    });

    test('string with CJK characters', () => {
        const { ser, des } = build(string());

        const japanese = 'こんにちは世界';
        expect(des(ser(japanese))).toBe(japanese);

        const chinese = '你好世界';
        expect(des(ser(chinese))).toBe(chinese);

        const korean = '안녕하세요';
        expect(des(ser(korean))).toBe(korean);
    });

    test('string with mixed unicode', () => {
        const { ser, des } = build(string());

        const mixed = 'Hello 世界 🌍!';
        expect(des(ser(mixed))).toBe(mixed);

        const complex = 'Test: 测试 🧪 тест';
        expect(des(ser(complex))).toBe(complex);
    });

    test('string with surrogate pairs', () => {
        const { ser, des } = build(string());

        // Mathematical alphanumeric symbols (surrogate pairs)
        const math = '𝕳𝖊𝖑𝖑𝖔';
        expect(des(ser(math))).toBe(math);

        // Musical symbols
        const music = '𝄞𝄢𝄫';
        expect(des(ser(music))).toBe(music);
    });

    test('string with combining characters', () => {
        const { ser, des } = build(string());

        // Combining diacritical marks
        const accents = 'café'; // é is one codepoint
        expect(des(ser(accents))).toBe(accents);

        const combining = 'cafe\u0301'; // e + combining acute accent
        expect(des(ser(combining))).toBe(combining);
    });

    test('string with special whitespace', () => {
        const { ser, des } = build(string());

        const withNewline = 'hello\nworld';
        expect(des(ser(withNewline))).toBe(withNewline);

        const withTab = 'hello\tworld';
        expect(des(ser(withTab))).toBe(withTab);

        const withCarriageReturn = 'hello\r\nworld';
        expect(des(ser(withCarriageReturn))).toBe(withCarriageReturn);
    });

    test('empty list', () => {
        const { ser, des } = build(list(number()));
        const empty: number[] = [];
        const serialized = ser(empty);
        expect(serialized.byteLength).toBe(1); // just varuint length prefix (0)
        expect(des(serialized)).toEqual(empty);
    });

    test('empty nested list', () => {
        const { ser, des } = build(list(list(string())));
        const empty: string[][] = [];
        expect(des(ser(empty))).toEqual(empty);

        const withEmptyInner: string[][] = [[], []];
        expect(des(ser(withEmptyInner))).toEqual(withEmptyInner);
    });

    test('empty record', () => {
        const { ser, des } = build(record(number()));
        const empty: Record<string, number> = {};
        const serialized = ser(empty);
        expect(serialized.byteLength).toBe(1); // just varuint length prefix (0)
        expect(des(serialized)).toEqual(empty);
    });

    test('object with empty nested collections', () => {
        const schema = object({
            items: list(string()),
            metadata: record(number()),
        });
        const { ser, des } = build(schema);

        const data = {
            items: [],
            metadata: {},
        };

        expect(des(ser(data))).toEqual(data);
    });

    test('record with empty string key', () => {
        const { ser, des } = build(record(number()));

        const emptyKey = { '': 42 };
        expect(des(ser(emptyKey))).toEqual(emptyKey);

        const mixed = { '': 1, 'normal': 2, 'another': 3 };
        expect(des(ser(mixed))).toEqual(mixed);
    });

    test('record with very long keys', () => {
        const { ser, des } = build(record(number()));

        const longKey = 'x'.repeat(1000);
        const data = { [longKey]: 99 };
        expect(des(ser(data))).toEqual(data);

        // Multiple long keys
        const multiLong = {
            ['a'.repeat(500)]: 1,
            ['b'.repeat(500)]: 2,
        };
        expect(des(ser(multiLong))).toEqual(multiLong);
    });

    test('record with unicode keys', () => {
        const { ser, des } = build(record(string()));

        const unicodeKeys = {
            'ключ': 'Russian',
            '😊': 'emoji',
            '你好': 'Chinese',
            '🌍': 'Earth',
        };
        expect(des(ser(unicodeKeys))).toEqual(unicodeKeys);
    });

    test('record with special character keys', () => {
        const { ser, des } = build(record(number()));

        const specialKeys = {
            'with"quote': 1,
            'with\'apostrophe': 2,
            'with\nnewline': 3,
            'with\ttab': 4,
            'with\\backslash': 5,
        };
        expect(des(ser(specialKeys))).toEqual(specialKeys);
    });

    test('nested record with special keys', () => {
        const { ser, des } = build(record(record(number())));

        const longKey = 'x'.repeat(100);
        const data = {
            '': { 'inner': 1 },
            '😊': { '': 2, [longKey]: 3 },
        };
        expect(des(ser(data))).toEqual(data);
    });

    test('bitset with all true', () => {
        const { ser, des } = build(bitset(['a', 'b', 'c', 'd', 'e']));

        const allTrue = { a: true, b: true, c: true, d: true, e: true };
        expect(des(ser(allTrue))).toEqual(allTrue);
    });

    test('bitset with all false', () => {
        const { ser, des } = build(bitset(['a', 'b', 'c', 'd', 'e']));

        const allFalse = { a: false, b: false, c: false, d: false, e: false };
        expect(des(ser(allFalse))).toEqual(allFalse);
    });

    test('bitset with exactly 8 keys (1 byte)', () => {
        const keys8 = Array.from({ length: 8 }, (_, i) => `k${i}`);
        const { ser, des } = build(bitset(keys8));

        const allTrue = Object.fromEntries(keys8.map((k) => [k, true]));
        const serialized = ser(allTrue);
        expect(serialized.byteLength).toBe(1);
        expect(des(serialized)).toEqual(allTrue);

        const allFalse = Object.fromEntries(keys8.map((k) => [k, false]));
        expect(des(ser(allFalse))).toEqual(allFalse);

        const alternating = Object.fromEntries(keys8.map((k, i) => [k, i % 2 === 0]));
        expect(des(ser(alternating))).toEqual(alternating);
    });

    test('bitset with 9 keys (2 bytes)', () => {
        const keys9 = Array.from({ length: 9 }, (_, i) => `k${i}`);
        const { ser, des } = build(bitset(keys9));

        const mixed = Object.fromEntries(keys9.map((k, i) => [k, i % 2 === 0]));
        const serialized = ser(mixed);
        expect(serialized.byteLength).toBe(2);
        expect(des(serialized)).toEqual(mixed);
    });

    test('bitset with 16 keys (2 bytes)', () => {
        const keys16 = Array.from({ length: 16 }, (_, i) => `k${i}`);
        const { ser, des } = build(bitset(keys16));

        const pattern = Object.fromEntries(keys16.map((k, i) => [k, i < 8]));
        const serialized = ser(pattern);
        expect(serialized.byteLength).toBe(2);
        expect(des(serialized)).toEqual(pattern);
    });

    test('bitset with 17 keys (3 bytes)', () => {
        const keys17 = Array.from({ length: 17 }, (_, i) => `k${i}`);
        const { ser, des } = build(bitset(keys17));

        const pattern = Object.fromEntries(keys17.map((k, i) => [k, i === 16]));
        const serialized = ser(pattern);
        expect(serialized.byteLength).toBe(3);
        expect(des(serialized)).toEqual(pattern);
    });

    test('bitset with 24 keys (3 bytes)', () => {
        const keys24 = Array.from({ length: 24 }, (_, i) => `k${i}`);
        const { ser, des } = build(bitset(keys24));

        const checker = Object.fromEntries(keys24.map((k, i) => [k, (Math.floor(i / 8) + i) % 2 === 0]));
        const serialized = ser(checker);
        expect(serialized.byteLength).toBe(3);
        expect(des(serialized)).toEqual(checker);
    });

    test('bitset nested in object', () => {
        const schema = object({
            id: uint32(),
            flags: bitset(['flag1', 'flag2', 'flag3', 'flag4', 'flag5', 'flag6', 'flag7', 'flag8', 'flag9'] as const),
        });
        const { ser, des } = build(schema);

        const data = {
            id: 123,
            flags: {
                flag1: true,
                flag2: false,
                flag3: true,
                flag4: false,
                flag5: true,
                flag6: false,
                flag7: true,
                flag8: false,
                flag9: true,
            },
        };

        expect(des(ser(data))).toEqual(data);
    });
});

describe('validate', () => {
    test('bool', () => {
        const schema = boolean();
        const schemaSerDes = build(schema);

        expect(schemaSerDes.validate(true)).toBe(true);

        // @ts-expect-error expected failure
        expect(schemaSerDes.validate(123)).toBe(false);
    });

    test('string', () => {
        const schema = string();
        const schemaSerDes = build(schema);

        expect(schemaSerDes.validate('string')).toBe(true);

        // @ts-expect-error expected failure
        expect(schemaSerDes.validate(123)).toBe(false);
    });

    test('number', () => {
        const schema = number();
        const schemaSerDes = build(schema);

        expect(schemaSerDes.validate(123)).toBe(true);

        // @ts-expect-error expected failure
        expect(schemaSerDes.validate('string')).toBe(false);
    });

    test('list', () => {
        const schema = list(string());
        const schemaSerDes = build(schema);

        expect(schemaSerDes.validate(['string'])).toBe(true);

        // @ts-expect-error expected failure
        expect(schemaSerDes.validate('string')).toBe(false);
    });

    test('fixed size list', () => {
        const schema = list(string(), 3);
        const schemaSerDes = build(schema);

        expect(schemaSerDes.validate(['string', 'string', 'string'])).toBe(true);

        // @ts-expect-error expected failure
        expect(schemaSerDes.validate('string')).toBe(false);
    });

    test('list of lists', () => {
        const schema = list(list(string()));
        const schemaSerDes = build(schema);

        expect(schemaSerDes.validate([['string']])).toBe(true);

        // @ts-expect-error expected failure
        expect(schemaSerDes.validate('string')).toBe(false);
        // @ts-expect-error expected failure
        expect(schemaSerDes.validate(['string'])).toBe(false);
    });

    test('object', () => {
        const schema = object({
            key: string(),
            value: number(),
        });
        const schemaSerDes = build(schema);

        expect(schemaSerDes.validate({ key: 'hello', value: 123 })).toBe(true);

        // @ts-expect-error expected failure
        expect(schemaSerDes.validate('string')).toBe(false);
    });

    test('nested objects', () => {
        const schema = object({
            foo: object({
                key: string(),
                value: number(),
            }),
        });
        const schemaSerDes = build(schema);

        expect(schemaSerDes.validate({ foo: { key: 'hello', value: 123 } })).toBe(true);

        // @ts-expect-error expected failure
        expect(schemaSerDes.validate({ bar: { key: 'hello', value: 123 } })).toBe(false);
    });

    test('list of objects', () => {
        const schema = list(
            object({
                key: string(),
                value: number(),
            }),
        );
        const schemaSerDes = build(schema);

        expect(schemaSerDes.validate([{ key: 'hello', value: 123 }])).toBe(true);

        // @ts-expect-error expected failure
        expect(schemaSerDes.validate({ key: 'hello', value: 123 })).toBe(false);
    });

    test('record', () => {
        const schema = record(string());
        const schemaSerDes = build(schema);

        expect(schemaSerDes.validate({ foo: 'bar' })).toBe(true);

        // @ts-expect-error expected failure
        expect(schemaSerDes.validate({ foo: 123 })).toBe(false);
    });

    test('nested records', () => {
        const schema = record(record(string()));
        const schemaSerDes = build(schema);

        expect(schemaSerDes.validate({ foo: { bar: 'car' } })).toBe(true);

        // @ts-expect-error expected failure
        expect(schemaSerDes.validate({ foo: 123 })).toBe(false);
    });

    test('int8/uint8/int16/uint16/int32/uint32', () => {
        const i8 = build(int8());
        expect(i8.validate(0)).toBe(true);
        expect(i8.validate(-128)).toBe(true);
        expect(i8.validate(127)).toBe(true);
        // out of range
        expect(i8.validate(128)).toBe(false);

        const u8 = build(uint8());
        expect(u8.validate(0)).toBe(true);
        expect(u8.validate(255)).toBe(true);
        // negative
        expect(u8.validate(-1)).toBe(false);

        const i16 = build(int16());
        expect(i16.validate(-32768)).toBe(true);
        expect(i16.validate(32767)).toBe(true);
        // out of range
        expect(i16.validate(40000)).toBe(false);

        const u16 = build(uint16());
        expect(u16.validate(0)).toBe(true);
        expect(u16.validate(65535)).toBe(true);
        // out of range
        expect(u16.validate(70000)).toBe(false);

        const i32 = build(int32());
        expect(i32.validate(-2147483648)).toBe(true);
        expect(i32.validate(2147483647)).toBe(true);
        // out of range
        expect(i32.validate(2147483648)).toBe(false);

        const u32 = build(uint32());
        expect(u32.validate(0)).toBe(true);
        expect(u32.validate(4294967295)).toBe(true);
        // negative
        expect(u32.validate(-1)).toBe(false);
    });

    test('float32/float64 and ser/des roundtrip', () => {
        const f32 = build(float32());
        expect(f32.validate(0)).toBe(true);
        expect(f32.validate(1.5)).toBe(true);
        // @ts-expect-error expected failure
        expect(f32.validate('1.5')).toBe(false);

        // roundtrip for float32 should be approximate
        const { ser: serF32, des: desF32 } = f32;
        const buf = serF32(123.456);
        const out = desF32(buf);
        expect(out).toBeDefined();
        expect(out).toBeCloseTo(123.456, 5);

        const f64 = build(float64());
        expect(f64.validate(0)).toBe(true);
        expect(f64.validate(1.5)).toBe(true);
        // @ts-expect-error expected failure
        expect(f64.validate('1.5')).toBe(false);

        const { ser: serF64, des: desF64 } = f64;
        const buf64 = serF64(123.4567890123);
        const out64 = desF64(buf64);
        expect(out64).toBeDefined();
        expect(out64).toBeCloseTo(123.4567890123, 10);
    });

    test('mixed types tuple', () => {
        const schema = tuple([number(), string(), boolean()] as const);
        const s = build(schema);

        expect(s.validate([1.5, 'x', true])).toBe(true);

        // @ts-expect-error wrong types
        expect(s.validate([1.5, 2, true])).toBe(false);

        // @ts-expect-error wrong length
        expect(s.validate([1.5, 'x'])).toBe(false);
    });

    test('tuple of tuples', () => {
        const inner = tuple([number(), string()] as const);
        const schema = tuple([inner, inner] as const);
        const s = build(schema);

        expect(
            s.validate([
                [1.5, 'a'],
                [2.5, 'b'],
            ]),
        ).toBe(true);

        // wrong inner types
        expect(
            s.validate([
                // @ts-expect-error
                [1.5, 2],
                [2.5, 'b'],
            ]),
        ).toBe(false);

        // wrong outer length
        // @ts-expect-error
        expect(s.validate([[1.5, 'a']])).toBe(false);
    });

    test('bitset missing key / wrong type', () => {
        const s = build(bitset(['x', 'y'] as const));
        expect(s.validate({ x: true, y: false })).toBe(true);
        //  @ts-expect-error missing
        expect(s.validate({ x: true })).toBe(false);
        // @ts-expect-error non-boolean value
        expect(s.validate({ x: 1, y: false })).toBe(false);
    });

    test('nullable/optional/nullish edge cases', () => {
        const nullableSchema = build(nullable(number()));
        expect(nullableSchema.validate(null)).toBe(true);
        expect(nullableSchema.validate(42)).toBe(true);
        // @ts-expect-error wrong type
        expect(nullableSchema.validate(undefined)).toBe(false);
        // @ts-expect-error wrong type
        expect(nullableSchema.validate('42')).toBe(false);

        const optionalSchema = build(optional(number()));
        expect(optionalSchema.validate(undefined)).toBe(true);
        expect(optionalSchema.validate(42)).toBe(true);
        // @ts-expect-error wrong type
        expect(optionalSchema.validate(null)).toBe(false);
        // @ts-expect-error wrong type
        expect(optionalSchema.validate('42')).toBe(false);

        const nullishSchema = build(nullish(number()));
        expect(nullishSchema.validate(null)).toBe(true);
        expect(nullishSchema.validate(undefined)).toBe(true);
        expect(nullishSchema.validate(42)).toBe(true);
        // @ts-expect-error wrong type
        expect(nullishSchema.validate('42')).toBe(false);
    });

    test('union with invalid discriminant', () => {
        const pet = union('type', [
            object({ type: literal('dog'), name: string() }),
            object({ type: literal('cat'), name: string() }),
        ] as const);

        const { validate } = build(pet);

        expect(validate({ type: 'dog', name: 'Rex' })).toBe(true);
        expect(validate({ type: 'cat', name: 'Mittens' })).toBe(true);

        // @ts-expect-error invalid discriminant
        expect(validate({ type: 'bird', name: 'Tweety' })).toBe(false);
        // @ts-expect-error wrong type
        expect(validate({ type: 'dog', name: 123 })).toBe(false);
        // @ts-expect-error missing discriminant
        expect(validate({ name: 'Rex' })).toBe(false);
    });

    test('literal with wrong value', () => {
        const schema = build(literal('hello'));
        expect(schema.validate('hello')).toBe(true);
        // @ts-expect-error wrong value
        expect(schema.validate('goodbye')).toBe(false);
        // @ts-expect-error wrong type
        expect(schema.validate(123)).toBe(false);

        const numLiteral = build(literal(42));
        expect(numLiteral.validate(42)).toBe(true);
        // @ts-expect-error wrong value
        expect(numLiteral.validate(43)).toBe(false);
    });
});
