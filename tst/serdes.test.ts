import { describe, expect, test } from 'vitest';
import { boolean, float32, list, number, object, record, serDes, string, uint32 } from '../src';

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

    test('ser/des number', () => {
        const { ser, des } = serDes(number());
        const buffer = ser(42.5);
        const result = des(buffer);
        expect(result).toBeCloseTo(42.5);
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
        const { ser, des } = serDes(list(float32(), { length: 3 }));
        const vec = [1.1, 2.2, 3.3];
        const buffer = ser(vec);
        const result = des(buffer);

        // use approximate equality for float32
        expect(result.length).toBe(vec.length);

        for (let i = 0; i < vec.length; i++) {
            expect(result[i]).toBeCloseTo(vec[i], 5);
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

    test('ser/des complex structure', () => {});
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
        const schema = list(string(), { length: 3 });
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
});
