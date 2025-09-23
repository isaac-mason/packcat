import { describe, expect, it } from 'vitest';
import { boolean, serDes, list, number, object, string } from '../src';

describe('serDes', () => {
    it('should serialize/deserialize fixed-length list (vec3)', () => {
        const { serialize, deserialize } = serDes({
            type: 'list',
            of: { type: 'float32' },
            length: 3,
        });
        const vec = [1.1, 2.2, 3.3];
        const buffer = serialize(vec);
        const result = deserialize(buffer);
        // Use approximate equality for float32
        expect(result.value.length).toBe(vec.length);
        for (let i = 0; i < vec.length; i++) {
            expect(result.value[i]).toBeCloseTo(vec[i], 5);
        }
    });

    it('should serialize/deserialize boolean', () => {
        const { serialize, deserialize } = serDes(boolean());
        const bufferTrue = serialize(true);
        const result = deserialize(bufferTrue);
        expect(result.value).toBe(true);
        const bufferFalse = serialize(false);
        const result2 = deserialize(bufferFalse);
        expect(result2.value).toBe(false);
    });

    it('should serialize/deserialize number', () => {
        const { serialize, deserialize } = serDes(number());
        const buffer = serialize(42.5);
        const result = deserialize(buffer);
        expect(result.value).toBeCloseTo(42.5);
    });

    it('should serialize/deserialize string', () => {
        const { serialize, deserialize } = serDes(string());
        const testStr = 'hello world';
        const buffer = serialize(testStr);
        const result = deserialize(buffer);
        expect(result.value).toBe(testStr);
    });

    it('should serialize/deserialize list of numbers', () => {
        const { serialize, deserialize } = serDes(list(number()));
        const arr = [1.1, 2.2, 3.3];
        const buffer = serialize(arr);
        const result = deserialize(buffer);
        expect(result.value).toEqual(arr);
    });

    it('should serialize/deserialize object', () => {
        const { serialize, deserialize } = serDes(
            object({
                a: number(),
                b: string(),
                c: boolean(),
            }),
        );
        const obj = { a: 123.45, b: 'test', c: true };
        const buffer = serialize(obj);
        const result = deserialize(buffer);
        expect(result.value).toEqual(obj);
    });
});
