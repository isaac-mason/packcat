import { describe, expect, it } from 'vitest';
import { boolean, serDes, list, number, object, string } from '../src';

describe('serDes', () => {
    it('should serialize/deserialize fixed-length list (vec3)', () => {
        const { ser, des } = serDes({
            type: 'list',
            of: { type: 'float32' },
            length: 3,
        });
        const vec = [1.1, 2.2, 3.3];
        const buffer = ser(vec);
        const result = des(buffer);
        // Use approximate equality for float32
        expect(result.length).toBe(vec.length);
        for (let i = 0; i < vec.length; i++) {
            expect(result[i]).toBeCloseTo(vec[i], 5);
        }
    });

    it('should serialize/deserialize boolean', () => {
        const { ser, des } = serDes(boolean());
        const bufferTrue = ser(true);
        const result = des(bufferTrue);
        expect(result).toBe(true);
        const bufferFalse = ser(false);
        const result2 = des(bufferFalse);
        expect(result2).toBe(false);
    });

    it('should serialize/deserialize number', () => {
        const { ser, des } = serDes(number());
        const buffer = ser(42.5);
        const result = des(buffer);
        expect(result).toBeCloseTo(42.5);
    });

    it('should serialize/deserialize string', () => {
        const { ser, des } = serDes(string());
        const testStr = 'hello world';
        const buffer = ser(testStr);
        const result = des(buffer);
        expect(result).toBe(testStr);
    });

    it('should serialize/deserialize list of numbers', () => {
        const { ser, des } = serDes(list(number()));
        const arr = [1.1, 2.2, 3.3];
        const buffer = ser(arr);
        const result = des(buffer);
        expect(result).toEqual(arr);
    });

    it('should serialize/deserialize object', () => {
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
});
