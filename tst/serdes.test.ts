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
});
