import { describe, expect, it } from 'vitest';
import { boolean, createSerDes, list, number, object, string } from '../src';

describe('createSerDes basic round-trip', () => {
    it('should serialize/deserialize boolean', () => {
        const { serialize, deserialize } = createSerDes(boolean());
        const bufferTrue = serialize(true);
        const result = deserialize(bufferTrue);
        expect(result.value).toBe(true);
        const bufferFalse = serialize(false);
        const result2 = deserialize(bufferFalse);
        expect(result2.value).toBe(false);
    });

    it('should serialize/deserialize number', () => {
        const { serialize, deserialize } = createSerDes(number());
        const buffer = serialize(42.5);
        const result = deserialize(buffer);
        expect(result.value).toBeCloseTo(42.5);
    });

    it('should serialize/deserialize string', () => {
        const { serialize, deserialize } = createSerDes(string());
        const testStr = 'hello world';
        const buffer = serialize(testStr);
        const result = deserialize(buffer);
        expect(result.value).toBe(testStr);
    });

    it('should serialize/deserialize list of numbers', () => {
        const { serialize, deserialize } = createSerDes(list(number()));
        const arr = [1.1, 2.2, 3.3];
        const buffer = serialize(arr);
        const result = deserialize(buffer);
        expect(result.value).toEqual(arr);
    });

    it('should serialize/deserialize object', () => {
        const { serialize, deserialize } = createSerDes(
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
