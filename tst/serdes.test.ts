/** biome-ignore-all lint/suspicious/noApproximativeNumericConstant: test data */

import { describe, expect, test } from 'vitest';
import type { SchemaType } from '../src';
import {
    serDes,
    boolean,
    bools,
    float32,
    float64,
    int8,
    int16,
    int32,
    list,
    number,
    object,
    union,
    record,
    nullable,
    optional,
    nullish,
    string,
    tuple,
    uint8,
    uint16,
    uint32,
    literal,
} from '../src';

describe('serDes', () => {
    test('ser/des boolean', () => {
        const { ser, des } = serDes(boolean());
        const bufferTrue = ser(true);
        const result = des(bufferTrue);
        expect(result).toBe(true);
        const bufferFalse = ser(false);
        const result2 = des(bufferFalse);
        expect(result2).toBe(false);
    });

    test('ser/des numbers', () => {
        // number (float64)
        const { ser: serNum, des: desNum } = serDes(number());
        const bufNum = serNum(12345.6789);
        const outNum = desNum(bufNum);
        expect(outNum).toBeCloseTo(12345.6789);

        // int8
        const { ser: serI8, des: desI8 } = serDes(int8());
        const bufI8 = serI8(-12);
        expect(desI8(bufI8)).toBe(-12);

        // uint8
        const { ser: serU8, des: desU8 } = serDes(uint8());
        const bufU8 = serU8(250);
        expect(desU8(bufU8)).toBe(250);

        // int16
        const { ser: serI16, des: desI16 } = serDes(int16());
        const bufI16 = serI16(-1234);
        expect(desI16(bufI16)).toBe(-1234);

        // uint16
        const { ser: serU16, des: desU16 } = serDes(uint16());
        const bufU16 = serU16(60000);
        expect(desU16(bufU16)).toBe(60000);

        // int32
        const { ser: serI32, des: desI32 } = serDes(int32());
        const bufI32 = serI32(-123456789);
        expect(desI32(bufI32)).toBe(-123456789);

        // uint32
        const { ser: serU32, des: desU32 } = serDes(uint32());
        const bufU32 = serU32(4000000000);
        expect(desU32(bufU32)).toBe(4000000000);

        // float32
        const { ser: serF32, des: desF32 } = serDes(float32());
        const bufF32 = serF32(3.14159);
        const outF32 = desF32(bufF32);
        expect(outF32).toBeCloseTo(3.14159, 5);

        // float64
        const { ser: serF64, des: desF64 } = serDes(float64());
        const bufF64 = serF64(2.718281828459045);
        const outF64 = desF64(bufF64);
        expect(outF64).toBeCloseTo(2.718281828459045, 12);
    });

    test('ser/des string', () => {
        const { ser, des } = serDes(string());
        const testStr = 'hello world';
        const buffer = ser(testStr);
        const result = des(buffer);
        expect(result).toBe(testStr);
    });

    test('ser/des list of numbers', () => {
        const { ser, des } = serDes(list(number()));
        const arr = [1.1, 2.2, 3.3];
        const buffer = ser(arr);
        const result = des(buffer);
        expect(result).toEqual(arr);
    });

    test('ser/des list of fixed-length lists (vec3)', () => {
        const vec3Schema = list(float32(), 3);
        const { ser, des } = serDes(list(vec3Schema));

        const data: [number, number, number][] = [
            [1.1, 2.2, 3.3],
            [4.4, 5.5, 6.6],
        ];

        const buffer = ser(data);
        const result = des(buffer);

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

    test('ser/des nested list of numbers', () => {
        const { ser, des } = serDes(list(list(number())));
        const arr = [
            [1, 2, 3],
            [4, 5, 6],
            [6, 7, 8],
        ];
        const buffer = ser(arr);
        const result = des(buffer);
        expect(result).toEqual(arr);
    });

    test('ser/des object', () => {
        const { ser, des } = serDes(
            object({
                a: number(),
                b: string(),
                c: boolean(),
            }),
        );
        const obj = { a: 123.45, b: 'test', c: true };
        const buffer = ser(obj);
        const result = des(buffer);
        expect(result).toEqual(obj);
    });

    test('ser/des object in object', () => {
        const { ser, des } = serDes(
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
        const buffer = ser(obj);
        const result = des(buffer);
        expect(result).toEqual(obj);
    });

    test('ser/des tuple', () => {
        const { ser, des } = serDes(tuple([number(), string(), boolean()] as const));

        const data: [number, string, boolean] = [42.5, 'hello', true];
        const buffer = ser(data);
        const out = des(buffer) as [number, string, boolean];

        // approximate for number
        expect(out[0]).toBeCloseTo(data[0]);
        expect(out[1]).toBe(data[1]);
        expect(out[2]).toBe(data[2]);
    });

    test('ser/des tuple of tuples', () => {
        const inner = tuple([number(), string()] as const);
        const schema = tuple([inner, inner] as const);
        const { ser, des } = serDes(schema);

        const data: [[number, string], [number, string]] = [
            [1.5, 'a'],
            [2.5, 'b'],
        ];
        const buf = ser(data as any);
        const out = des(buf) as [[number, string], [number, string]];

        expect(out.length).toBe(2);
        expect(out[0][0]).toBeCloseTo(data[0][0]);
        expect(out[0][1]).toBe(data[0][1]);
        expect(out[1][0]).toBeCloseTo(data[1][0]);
        expect(out[1][1]).toBe(data[1][1]);
    });

    test('ser/des list of objects', () => {
        const { ser, des } = serDes(
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
        const buffer = ser(arr);
        const result = des(buffer);
        expect(result).toEqual(arr);
    });

    test('ser/des record (empty, simple, unicode keys)', () => {
        const { ser, des } = serDes(record(uint32()));

        // empty
        const empty = {};
        expect(des(ser(empty))).toEqual(empty);

        const simple = { a: 1, b: 42, hello: 12345 };
        expect(des(ser(simple))).toEqual(simple);

        const unicode = { ключ: 7, '😊': 999 };
        expect(des(ser(unicode))).toEqual(unicode);
    });

    test('ser/des object keys with quotes/newlines/emoji', () => {
        const { ser, des, validate } = serDes(record(uint32()));

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

    test('ser/des record of records', () => {
        const { ser, des } = serDes(record(record(uint32())));
        const data = {
            group1: { a: 1, b: 2 },
            group2: { x: 42, y: 99 },
        };
        const buffer = ser(data);
        const result = des(buffer);
        expect(result).toEqual(data);
    });

    test('ser/des bools simple', () => {
        const { ser, des, validate } = serDes(bools(['a', 'b', 'c'] as const));

        const v = { a: true, b: false, c: true };
        expect(validate(v)).toBe(true);

        const buf = ser(v);
        const out = des(buf);
        expect(out).toEqual(v);
    });

    test('ser/des bools many keys (multi-byte)', () => {
        const keys: string[] = [];
        for (let i = 0; i < 10; i++) keys.push(`k${i}`);
        const s = serDes(bools(keys) as any);

        const obj: Record<string, boolean> = {};
        for (let i = 0; i < keys.length; i++) obj[keys[i]] = i % 2 === 0;

        const buf = s.ser(obj as any);
        const out = s.des(buf as ArrayBuffer) as Record<string, boolean>;
        expect(out).toEqual(obj);
    });

    test('ser/des literal', () => {
        const schema = literal('hello', string());
        const { ser, des, validate } = serDes(schema);

        const v = 'hello';
        expect(validate(v)).toBe(true);

        const buf = ser(v);
        const out = des(buf);
        expect(out).toEqual(v);
    });

    test('ser/des optional', () => {
        const schema = optional(string());
        const { ser, des } = serDes(schema as any);

        const present = 'hi';
        const bufPresent = ser(present as any);
        expect(des(bufPresent)).toBe(present);

        const bufAbsent = ser(undefined as any);
        expect(des(bufAbsent)).toBeUndefined();
    });

    test('ser/des nullable', () => {
        const schema = nullable(string());
        const { ser, des } = serDes(schema as any);

        const bufNull = ser(null as any);
        expect(des(bufNull)).toBeNull();

        const bufVal = ser('hi' as any);
        expect(des(bufVal)).toBe('hi');
    });

    test('ser/des nullish', () => {
        const schema = nullish(string());
        const { ser, des } = serDes(schema as any);

        const bufNull = ser(null as any);
        expect(des(bufNull)).toBeNull();

        const bufUndef = ser(undefined as any);
        expect(des(bufUndef)).toBeUndefined();

        const bufVal = ser('val' as any);
        expect(des(bufVal)).toBe('val');
    });

    test('ser/des complex structure', () => {
        const complexSchema = object({
            id: uint32(),
            name: string(),
            active: boolean(),
            flags: bools(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']),
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

        const s = serDes(complexSchema);
        expect(s.validate(data)).toBe(true);

        const buf = s.ser(data);
        const out = s.des(buf as ArrayBuffer) as any;

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

        expect(out.nestedTuple[0]).toBeCloseTo((data.nestedTuple as any)[0], 5);
        expect(out.nestedTuple[1].x).toBeCloseTo((data.nestedTuple as any)[1].x, 10);
        expect(out.nestedTuple[1].y).toBeCloseTo((data.nestedTuple as any)[1].y, 10);
        expect(out.nestedTuple[2]).toEqual((data.nestedTuple as any)[2]);

        // map of maps
        expect(out.mapOfMaps).toEqual(data.mapOfMaps);
    });

    test('ser/des union', () => {
        const pet = union('type', [
            object({ type: literal('dog', string()), name: string(), bark: uint8() }),
            object({ type: literal('cat', string()), name: string(), lives: uint8() }),
        ] as const);

        const { ser, des, validate } = serDes(pet as any);

        const dog = { type: 'dog', name: 'Rex', bark: 5 };
        const cat = { type: 'cat', name: 'Mittens', lives: 9 };

        expect(validate(dog)).toBe(true);
        expect(validate(cat)).toBe(true);

        const bufDog = ser(dog as any);
        const outDog = des(bufDog as ArrayBuffer) as any;
        expect(outDog).toEqual(dog);

        const bufCat = ser(cat as any);
        const outCat = des(bufCat as ArrayBuffer) as any;
        expect(outCat).toEqual(cat);
    });
});

describe('validate', () => {
    test('validate bool', () => {
        const schema = boolean();
        const schemaSerDes = serDes(schema);

        expect(schemaSerDes.validate(true)).toBe(true);

        // @ts-expect-error expected failure
        expect(schemaSerDes.validate(123)).toBe(false);
    });

    test('validate string', () => {
        const schema = string();
        const schemaSerDes = serDes(schema);

        expect(schemaSerDes.validate('string')).toBe(true);

        // @ts-expect-error expected failure
        expect(schemaSerDes.validate(123)).toBe(false);
    });

    test('validate number', () => {
        const schema = number();
        const schemaSerDes = serDes(schema);

        expect(schemaSerDes.validate(123)).toBe(true);

        // @ts-expect-error expected failure
        expect(schemaSerDes.validate('string')).toBe(false);
    });

    test('validate list', () => {
        const schema = list(string());
        const schemaSerDes = serDes(schema);

        expect(schemaSerDes.validate(['string'])).toBe(true);

        // @ts-expect-error expected failure
        expect(schemaSerDes.validate('string')).toBe(false);
    });

    test('validate fixed size list', () => {
        const schema = list(string(), 3);
        const schemaSerDes = serDes(schema);

        expect(schemaSerDes.validate(['string', 'string', 'string'])).toBe(true);

        // @ts-expect-error expected failure
        expect(schemaSerDes.validate('string')).toBe(false);
    });

    test('validate list of lists', () => {
        const schema = list(list(string()));
        const schemaSerDes = serDes(schema);

        expect(schemaSerDes.validate([['string']])).toBe(true);

        // @ts-expect-error expected failure
        expect(schemaSerDes.validate('string')).toBe(false);
        // @ts-expect-error expected failure
        expect(schemaSerDes.validate(['string'])).toBe(false);
    });

    test('validate object', () => {
        const schema = object({
            key: string(),
            value: number(),
        });
        const schemaSerDes = serDes(schema);

        expect(schemaSerDes.validate({ key: 'hello', value: 123 })).toBe(true);

        // @ts-expect-error expected failure
        expect(schemaSerDes.validate('string')).toBe(false);
    });

    test('validate nested objects', () => {
        const schema = object({
            foo: object({
                key: string(),
                value: number(),
            }),
        });
        const schemaSerDes = serDes(schema);

        expect(schemaSerDes.validate({ foo: { key: 'hello', value: 123 } })).toBe(true);

        // @ts-expect-error expected failure
        expect(schemaSerDes.validate({ bar: { key: 'hello', value: 123 } })).toBe(false);
    });

    test('validate list of objects', () => {
        const schema = list(
            object({
                key: string(),
                value: number(),
            }),
        );
        const schemaSerDes = serDes(schema);

        expect(schemaSerDes.validate([{ key: 'hello', value: 123 }])).toBe(true);

        // @ts-expect-error expected failure
        expect(schemaSerDes.validate({ key: 'hello', value: 123 })).toBe(false);
    });

    test('validate record', () => {
        const schema = record(string());
        const schemaSerDes = serDes(schema);

        expect(schemaSerDes.validate({ foo: 'bar' })).toBe(true);

        // @ts-expect-error expected failure
        expect(schemaSerDes.validate({ foo: 123 })).toBe(false);
    });

    test('validate nested records', () => {
        const schema = record(record(string()));
        const schemaSerDes = serDes(schema);

        expect(schemaSerDes.validate({ foo: { bar: 'car' } })).toBe(true);

        // @ts-expect-error expected failure
        expect(schemaSerDes.validate({ foo: 123 })).toBe(false);
    });

    test('validate int8/uint8/int16/uint16/int32/uint32', () => {
        const i8 = serDes(int8());
        expect(i8.validate(0)).toBe(true);
        expect(i8.validate(-128)).toBe(true);
        expect(i8.validate(127)).toBe(true);
        // out of range
        expect(i8.validate(128)).toBe(false);

        const u8 = serDes(uint8());
        expect(u8.validate(0)).toBe(true);
        expect(u8.validate(255)).toBe(true);
        // negative
        expect(u8.validate(-1)).toBe(false);

        const i16 = serDes(int16());
        expect(i16.validate(-32768)).toBe(true);
        expect(i16.validate(32767)).toBe(true);
        // out of range
        expect(i16.validate(40000)).toBe(false);

        const u16 = serDes(uint16());
        expect(u16.validate(0)).toBe(true);
        expect(u16.validate(65535)).toBe(true);
        // out of range
        expect(u16.validate(70000)).toBe(false);

        const i32 = serDes(int32());
        expect(i32.validate(-2147483648)).toBe(true);
        expect(i32.validate(2147483647)).toBe(true);
        // out of range
        expect(i32.validate(2147483648)).toBe(false);

        const u32 = serDes(uint32());
        expect(u32.validate(0)).toBe(true);
        expect(u32.validate(4294967295)).toBe(true);
        // negative
        expect(u32.validate(-1)).toBe(false);
    });

    test('validate float32/float64 and ser/des roundtrip', () => {
        const f32 = serDes(float32());
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

        const f64 = serDes(float64());
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

    test('validate mixed types tuple', () => {
        const schema = tuple([number(), string(), boolean()] as const);
        const s = serDes(schema);

        expect(s.validate([1.5, 'x', true])).toBe(true);

        // @ts-expect-error wrong types
        expect(s.validate([1.5, 2, true])).toBe(false);

        // @ts-expect-error wrong length
        expect(s.validate([1.5, 'x'])).toBe(false);
    });

    test('validate tuple of tuples', () => {
        const inner = tuple([number(), string()] as const);
        const schema = tuple([inner, inner] as const);
        const s = serDes(schema);

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

    test('validate bools missing key / wrong type', () => {
        const s = serDes(bools(['x', 'y'] as const));
        expect(s.validate({ x: true, y: false })).toBe(true);
        //  @ts-expect-error missing
        expect(s.validate({ x: true })).toBe(false);
        // @ts-expect-error non-boolean value
        expect(s.validate({ x: 1, y: false })).toBe(false);
    });
});
