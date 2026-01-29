/** biome-ignore-all lint/suspicious/noApproximativeNumericConstant: test data */

import { describe, expect, test } from 'vitest';
import type { SchemaType } from '../src';
import {
    boolean,
    build,
    enumeration,
    float16,
    float32,
    float64,
    int8,
    int16,
    int32,
    int64,
    list,
    literal,
    nullable,
    nullish,
    number,
    object,
    optional,
    quantized,
    quat,
    record,
    string,
    tuple,
    uint8,
    uint8Array,
    uint16,
    uint32,
    uint64,
    union,
    uv2,
    uv3,
    varint,
    varuint,
} from '../src';

describe('serDes', () => {
    test('boolean', () => {
        const { pack, unpack } = build(boolean());
        const serializedTrue = pack(true);
        const result = unpack(serializedTrue);
        expect(result).toBe(true);
        const serializedFalse = pack(false);
        const result2 = unpack(serializedFalse);
        expect(result2).toBe(false);
    });

    test('numbers', () => {
        // number (float64)
        const { pack: packNum, unpack: unpackNum } = build(number());
        const serializedNumber = packNum(12345.6789);
        expect(serializedNumber.byteLength).toBe(8);
        const outNum = unpackNum(serializedNumber);
        expect(outNum).toBeCloseTo(12345.6789);

        // int8
        const { pack: packI8, unpack: unpackI8 } = build(int8());
        const serializedI8 = packI8(-12);
        expect(serializedI8.byteLength).toBe(1);
        expect(unpackI8(serializedI8)).toBe(-12);

        // uint8
        const { pack: packU8, unpack: unpackU8 } = build(uint8());
        const serializedU8 = packU8(250);
        expect(serializedU8.byteLength).toBe(1);
        expect(unpackU8(serializedU8)).toBe(250);

        // int16
        const { pack: packI16, unpack: unpackI16 } = build(int16());
        const serializedI16 = packI16(-1234);
        expect(serializedI16.byteLength).toBe(2);
        expect(unpackI16(serializedI16)).toBe(-1234);

        // uint16
        const { pack: packU16, unpack: unpackU16 } = build(uint16());
        const serializedU16 = packU16(60000);
        expect(serializedU16.byteLength).toBe(2);
        expect(unpackU16(serializedU16)).toBe(60000);

        // int32
        const { pack: packI32, unpack: unpackI32 } = build(int32());
        const serializedI32 = packI32(-123456789);
        expect(serializedI32.byteLength).toBe(4);
        expect(unpackI32(serializedI32)).toBe(-123456789);

        // uint32
        const { pack: packU32, unpack: unpackU32 } = build(uint32());
        const serializedU32 = packU32(4000000000);
        expect(serializedU32.byteLength).toBe(4);
        expect(unpackU32(serializedU32)).toBe(4000000000);

        // float16
        const { pack: packF16, unpack: unpackF16 } = build(float16());
        const serializedF16 = packF16(3.14159);
        expect(serializedF16.byteLength).toBe(2);
        const outF16 = unpackF16(serializedF16);
        // Float16 has lower precision than float32
        expect(outF16).toBeCloseTo(3.14159, 2);

        // float32
        const { pack: packF32, unpack: unpackF32 } = build(float32());
        const serializedF32 = packF32(3.14159);
        expect(serializedF32.byteLength).toBe(4);
        const outF32 = unpackF32(serializedF32);
        expect(outF32).toBeCloseTo(3.14159, 5);

        // float64
        const { pack: packF64, unpack: unpackF64 } = build(float64());
        const serializedF64 = packF64(2.718281828459045);
        expect(serializedF64.byteLength).toBe(8);
        const outF64 = unpackF64(serializedF64);
        expect(outF64).toBeCloseTo(2.718281828459045, 12);
    });

    test('int64 and uint64', () => {
        // int64 - signed 64-bit integer
        const { pack: packI64, unpack: unpackI64, validate: validateI64 } = build(int64());

        // Basic positive value
        const serializedI64_1 = packI64(123456789012345n);
        expect(serializedI64_1.byteLength).toBe(8);
        expect(unpackI64(serializedI64_1)).toBe(123456789012345n);

        // Basic negative value
        const serializedI64_2 = packI64(-987654321098765n);
        expect(serializedI64_2.byteLength).toBe(8);
        expect(unpackI64(serializedI64_2)).toBe(-987654321098765n);

        // Zero
        const serializedI64_3 = packI64(0n);
        expect(serializedI64_3.byteLength).toBe(8);
        expect(unpackI64(serializedI64_3)).toBe(0n);

        // Minimum value: -2^63
        const minI64 = -9223372036854775808n;
        const serializedI64_min = packI64(minI64);
        expect(serializedI64_min.byteLength).toBe(8);
        expect(unpackI64(serializedI64_min)).toBe(minI64);

        // Maximum value: 2^63 - 1
        const maxI64 = 9223372036854775807n;
        const serializedI64_max = packI64(maxI64);
        expect(serializedI64_max.byteLength).toBe(8);
        expect(unpackI64(serializedI64_max)).toBe(maxI64);

        // Validation tests
        expect(validateI64(123n)).toBe(true);
        expect(validateI64(-456n)).toBe(true);
        expect(validateI64(maxI64)).toBe(true);
        expect(validateI64(minI64)).toBe(true);
        expect(validateI64(123 as any)).toBe(false); // not a bigint
        expect(validateI64('123' as any)).toBe(false); // not a bigint

        // uint64 - unsigned 64-bit integer
        const { pack: packU64, unpack: unpackU64, validate: validateU64 } = build(uint64());

        // Basic value
        const serializedU64_1 = packU64(123456789012345n);
        expect(serializedU64_1.byteLength).toBe(8);
        expect(unpackU64(serializedU64_1)).toBe(123456789012345n);

        // Zero
        const serializedU64_2 = packU64(0n);
        expect(serializedU64_2.byteLength).toBe(8);
        expect(unpackU64(serializedU64_2)).toBe(0n);

        // Maximum value: 2^64 - 1
        const maxU64 = 18446744073709551615n;
        const serializedU64_max = packU64(maxU64);
        expect(serializedU64_max.byteLength).toBe(8);
        expect(unpackU64(serializedU64_max)).toBe(maxU64);

        // Large value near max
        const largeU64 = 18446744073709551000n;
        const serializedU64_large = packU64(largeU64);
        expect(serializedU64_large.byteLength).toBe(8);
        expect(unpackU64(serializedU64_large)).toBe(largeU64);

        // Validation tests
        expect(validateU64(123n)).toBe(true);
        expect(validateU64(0n)).toBe(true);
        expect(validateU64(maxU64)).toBe(true);
        expect(validateU64(-1n as any)).toBe(false); // negative not allowed
        expect(validateU64(123 as any)).toBe(false); // not a bigint
        expect(validateU64('123' as any)).toBe(false); // not a bigint

        // Test endianness consistency - serialize and deserialize should be inverse operations
        const testValue = 0x0102030405060708n;
        const serialized = packI64(testValue);
        expect(unpackI64(serialized)).toBe(testValue);

        // Verify little-endian byte order
        expect(serialized[0]).toBe(0x08);
        expect(serialized[1]).toBe(0x07);
        expect(serialized[2]).toBe(0x06);
        expect(serialized[3]).toBe(0x05);
        expect(serialized[4]).toBe(0x04);
        expect(serialized[5]).toBe(0x03);
        expect(serialized[6]).toBe(0x02);
        expect(serialized[7]).toBe(0x01);
    });

    test('varint/varuint with expected byte lengths', () => {
        // varint tests
        const { pack: packVarInt, unpack: unpackVarInt, validate: validateVarInt } = build(varint());

        // Test small positive values (1 byte)
        const small1 = packVarInt(0);
        expect(small1.byteLength).toBe(1);
        expect(unpackVarInt(small1)).toBe(0);

        const small2 = packVarInt(63);
        expect(small2.byteLength).toBe(1);
        expect(unpackVarInt(small2)).toBe(63);

        // Test small negative values (1 byte due to zigzag encoding)
        const smallNeg1 = packVarInt(-1);
        expect(smallNeg1.byteLength).toBe(1);
        expect(unpackVarInt(smallNeg1)).toBe(-1);

        const smallNeg2 = packVarInt(-64);
        expect(smallNeg2.byteLength).toBe(1);
        expect(unpackVarInt(smallNeg2)).toBe(-64);

        // Test medium values (2 bytes)
        const medium1 = packVarInt(127);
        expect(medium1.byteLength).toBe(2);
        expect(unpackVarInt(medium1)).toBe(127);

        const medium2 = packVarInt(-128);
        expect(medium2.byteLength).toBe(2);
        expect(unpackVarInt(medium2)).toBe(-128);

        const medium3 = packVarInt(8191);
        expect(medium3.byteLength).toBe(2);
        expect(unpackVarInt(medium3)).toBe(8191);

        // Test larger values (3+ bytes)
        const large1 = packVarInt(16383);
        expect(large1.byteLength).toBe(3);
        expect(unpackVarInt(large1)).toBe(16383);

        const large2 = packVarInt(-100000);
        expect(large2.byteLength).toBe(3);
        expect(unpackVarInt(large2)).toBe(-100000);

        // Test very large values
        const veryLarge = packVarInt(67108863);
        expect(veryLarge.byteLength).toBe(4);
        expect(unpackVarInt(veryLarge)).toBe(67108863);

        // Validation tests
        expect(validateVarInt(0)).toBe(true);
        expect(validateVarInt(-1)).toBe(true);
        expect(validateVarInt(12345)).toBe(true);
        expect(validateVarInt(-67890)).toBe(true);
        expect(validateVarInt(1.5)).toBe(false);
        // @ts-expect-error testing invalid input
        expect(validateVarInt('123')).toBe(false);

        // varuint tests
        const { pack: packVarUInt, unpack: unpackVarUInt, validate: validateVarUInt } = build(varuint());

        // Test small values (1 byte)
        const usmall1 = packVarUInt(0);
        expect(usmall1.byteLength).toBe(1);
        expect(unpackVarUInt(usmall1)).toBe(0);

        const usmall2 = packVarUInt(127);
        expect(usmall2.byteLength).toBe(1);
        expect(unpackVarUInt(usmall2)).toBe(127);

        // Test medium values (2 bytes)
        const umedium1 = packVarUInt(128);
        expect(umedium1.byteLength).toBe(2);
        expect(unpackVarUInt(umedium1)).toBe(128);

        const umedium2 = packVarUInt(16383);
        expect(umedium2.byteLength).toBe(2);
        expect(unpackVarUInt(umedium2)).toBe(16383);

        // Test larger values (3 bytes)
        const ularge1 = packVarUInt(16384);
        expect(ularge1.byteLength).toBe(3);
        expect(unpackVarUInt(ularge1)).toBe(16384);

        const ularge2 = packVarUInt(2097151);
        expect(ularge2.byteLength).toBe(3);
        expect(unpackVarUInt(ularge2)).toBe(2097151);

        // Test very large values (4 bytes)
        const uveryLarge = packVarUInt(268435455);
        expect(uveryLarge.byteLength).toBe(4);
        expect(unpackVarUInt(uveryLarge)).toBe(268435455);

        // Validation tests
        expect(validateVarUInt(0)).toBe(true);
        expect(validateVarUInt(12345)).toBe(true);
        expect(validateVarUInt(4294967295)).toBe(true);
        expect(validateVarUInt(-1)).toBe(false);
        expect(validateVarUInt(1.5)).toBe(false);
        // @ts-expect-error testing invalid input
        expect(validateVarUInt('123')).toBe(false);
    });

    test('float16 precision and special values', () => {
        const { pack, unpack } = build(float16());

        // Test basic values
        expect(unpack(pack(0))).toBe(0);
        expect(unpack(pack(1))).toBeCloseTo(1, 3);
        expect(unpack(pack(-1))).toBeCloseTo(-1, 3);
        expect(unpack(pack(3.14159))).toBeCloseTo(3.14159, 2);

        // Test max representable value (~65504)
        const maxVal = 65504;
        expect(unpack(pack(maxVal))).toBeCloseTo(maxVal, -3);

        // Test small values
        expect(unpack(pack(0.0001))).toBeCloseTo(0.0001, 4);
        expect(unpack(pack(0.5))).toBeCloseTo(0.5, 3);

        // Test special values
        expect(unpack(pack(Infinity))).toBe(Infinity);
        expect(unpack(pack(-Infinity))).toBe(-Infinity);
        expect(unpack(pack(NaN))).toBe(NaN);

        // Test values beyond range become infinity
        expect(unpack(pack(100000))).toBe(Infinity);
        expect(unpack(pack(-100000))).toBe(-Infinity);

        // Verify byte size
        expect(pack(123.45).byteLength).toBe(2);
    });

    test('quantized basic ranges', () => {
        // Angle: 0-360° with 0.5° step
        const { pack: packAngle, unpack: unpackAngle } = build(quantized(0, 360, { step: 0.5 }));
        const angle = 123.4;
        const serializedAngle = packAngle(angle);
        expect(serializedAngle.byteLength).toBe(2); // 720 steps → 10 bits → 2 bytes
        const outAngle = unpackAngle(serializedAngle);
        expect(Math.abs(outAngle - angle)).toBeLessThanOrEqual(0.5); // Within step precision

        // Health: 0-100 with 1 step (whole numbers)
        const { pack: packHealth, unpack: unpackHealth } = build(quantized(0, 100, { step: 1 }));
        const health = 75;
        const serializedHealth = packHealth(health);
        expect(serializedHealth.byteLength).toBe(1); // 101 steps → 7 bits → 1 byte
        const outHealth = unpackHealth(serializedHealth);
        expect(Math.abs(outHealth - health)).toBeLessThanOrEqual(1); // Within step precision

        // Position: -1000 to 1000 with 0.1 step
        const { pack: packPos, unpack: unpackPos } = build(quantized(-1000, 1000, { step: 0.1 }));
        const pos = 456.789;
        const serializedPos = packPos(pos);
        expect(serializedPos.byteLength).toBe(2); // 20000 steps → 15 bits → 2 bytes
        const outPos = unpackPos(serializedPos);
        expect(Math.abs(outPos - pos)).toBeLessThanOrEqual(0.1); // Within step precision

        // Normalized: 0-1 with 0.01 step
        const { pack: packNorm, unpack: unpackNorm } = build(quantized(0, 1, { step: 0.01 }));
        const norm = 0.567;
        const serializedNorm = packNorm(norm);
        expect(serializedNorm.byteLength).toBe(1); // 100 steps → 7 bits → 1 byte
        const outNorm = unpackNorm(serializedNorm);
        expect(Math.abs(outNorm - norm)).toBeLessThanOrEqual(0.01); // Within step precision
    });

    test('quantized edge values', () => {
        const { pack, unpack } = build(quantized(0, 100, { step: 1 }));

        // Min value - should be exact
        expect(unpack(pack(0))).toBe(0);

        // Max value - should be exact
        expect(unpack(pack(100))).toBe(100);

        // Mid value - should be exact
        expect(unpack(pack(50))).toBe(50);

        // Fractional values get quantized to nearest step
        expect(unpack(pack(50.7))).toBe(51); // Rounds to nearest step (51)
    });

    test('quantized negative ranges', () => {
        const { pack, unpack } = build(quantized(-50, 50, { step: 0.5 }));

        // Negative value
        const neg = -25.3;
        const serialized = pack(neg);
        expect(serialized.byteLength).toBe(1); // 200 steps → 8 bits → 1 byte
        const out = unpack(serialized);
        expect(Math.abs(out - neg)).toBeLessThanOrEqual(0.5);

        // Positive value
        const pos = 30.7;
        expect(Math.abs(unpack(pack(pos)) - pos)).toBeLessThanOrEqual(0.5);

        // Zero should be exact
        expect(unpack(pack(0))).toBe(0);
    });

    test('quantized small step sizes', () => {
        // Very fine precision
        const { pack, unpack } = build(quantized(0, 10, { step: 0.01 }));
        const value = 5.678;
        const serialized = pack(value);
        expect(serialized.byteLength).toBe(2); // 1000 steps → 10 bits → 2 bytes
        const out = unpack(serialized);
        expect(out).toBeCloseTo(value, 2);
    });

    test('quantized large ranges', () => {
        // Large range with coarse precision
        const { pack, unpack } = build(quantized(-10000, 10000, { step: 10 }));
        const value = 5432.1;
        const serialized = pack(value);
        expect(serialized.byteLength).toBe(2); // 2000 steps → 11 bits → 2 bytes
        const out = unpack(serialized);
        expect(Math.abs(out - value)).toBeLessThanOrEqual(10); // Within step precision
        // Should quantize to nearest multiple of 10
        expect(out).toBe(5430); // 543.21 rounds to 543 steps * 10 = 5430
    });

    test('quantized in object', () => {
        const schema = object({
            rotation: quantized(0, 360, { step: 0.5 }),
            health: quantized(0, 100, { step: 1 }),
            position: tuple([quantized(-1000, 1000, { step: 0.1 }), quantized(-1000, 1000, { step: 0.1 })]),
        });

        const { pack, unpack } = build(schema);

        const data: SchemaType<typeof schema> = {
            rotation: 45.6,
            health: 87,
            position: [123.4, -567.8],
        };

        const serialized = pack(data);
        const out = unpack(serialized);

        expect(Math.abs(out.rotation - data.rotation)).toBeLessThanOrEqual(0.5);
        expect(out.health).toBe(87); // Exact
        expect(Math.abs(out.position[0] - data.position[0])).toBeLessThanOrEqual(0.1);
        expect(Math.abs(out.position[1] - data.position[1])).toBeLessThanOrEqual(0.1);
    });

    test('quantized in list', () => {
        const { pack, unpack } = build(list(quantized(0, 100, { step: 0.5 })));

        const data = [10.2, 50.7, 99.1];
        const serialized = pack(data);
        const out = unpack(serialized);

        expect(out.length).toBe(data.length);
        for (let i = 0; i < data.length; i++) {
            expect(Math.abs(out[i] - data[i])).toBeLessThanOrEqual(0.5);
        }
    });

    test('quantized validation', () => {
        const { validate } = build(quantized(0, 100, { step: 1 }));

        // Valid values
        expect(validate(0)).toBe(true);
        expect(validate(50)).toBe(true);
        expect(validate(100)).toBe(true);
        expect(validate(50.5)).toBe(true); // Within range

        // Invalid: out of range
        expect(validate(-1)).toBe(false);
        expect(validate(101)).toBe(false);
        expect(validate(1000)).toBe(false);

        // Invalid: wrong type
        // @ts-expect-error testing invalid input
        expect(validate('50')).toBe(false);
        // @ts-expect-error testing invalid input
        expect(validate(null)).toBe(false);
        // @ts-expect-error testing invalid input
        expect(validate(undefined)).toBe(false);
    });

    test('quantized constructor validation', () => {
        // Invalid: min >= max
        expect(() => quantized(100, 0, { step: 1 })).toThrow('min must be less than max');
        expect(() => quantized(50, 50, { step: 1 })).toThrow('min must be less than max');

        // Invalid: step <= 0
        expect(() => quantized(0, 100, { step: 0 })).toThrow('step must be positive');
        expect(() => quantized(0, 100, { step: -1 })).toThrow('step must be positive');

        // Invalid: step > range
        expect(() => quantized(0, 100, { step: 150 })).toThrow('step must be <= (max - min)');
        expect(() => quantized(0, 10, { step: 20 })).toThrow('step must be <= (max - min)');
    });

    test('quantized clamping behavior', () => {
        const { pack, unpack } = build(quantized(0, 100, { step: 1 }));

        // Values below min should clamp to min
        const belowMin = -10;
        expect(unpack(pack(belowMin))).toBe(0);

        // Values above max should clamp to max
        const aboveMax = 150;
        expect(unpack(pack(aboveMax))).toBe(100);

        // Way out of range
        expect(unpack(pack(-1000))).toBe(0);
        expect(unpack(pack(1000))).toBe(100);
    });

    test('quantized very small step sizes', () => {
        // High precision, small range
        const { pack, unpack } = build(quantized(0, 1, { step: 0.001 }));
        const value = 0.5555;
        const serialized = pack(value);
        expect(serialized.byteLength).toBe(2); // 1000 steps → 10 bits → 2 bytes
        const out = unpack(serialized);
        expect(Math.abs(out - value)).toBeLessThanOrEqual(0.001);
    });

    test('quantized fractional ranges', () => {
        // Range that doesn't start at 0
        const { pack, unpack } = build(quantized(0.5, 1.5, { step: 0.01 }));
        const value = 1.234;
        const serialized = pack(value);
        const out = unpack(serialized);
        expect(Math.abs(out - value)).toBeLessThanOrEqual(0.01);
        expect(out).toBeGreaterThanOrEqual(0.5);
        expect(out).toBeLessThanOrEqual(1.5);
    });

    test('quantized with powers of 2 steps', () => {
        // Step sizes that are powers of 2
        const { pack: pack1, unpack: unpack1 } = build(quantized(0, 256, { step: 1 }));
        expect(unpack1(pack1(127))).toBe(127);
        expect(unpack1(pack1(128))).toBe(128);

        const { pack: pack2, unpack: unpack2 } = build(quantized(0, 512, { step: 2 }));
        expect(unpack2(pack2(254))).toBe(254); // Exact multiple of 2
        expect(unpack2(pack2(255))).toBe(256); // 255 rounds to nearest multiple: 256
    });

    test('quantized byte size progression', () => {
        // 1 byte: up to 256 steps (8 bits)
        const schema1 = quantized(0, 100, { step: 0.5 }); // 200 steps
        const { pack: pack1 } = build(schema1);
        expect(pack1(50).byteLength).toBe(1);

        // 2 bytes: 257-65536 steps (9-16 bits)
        const schema2 = quantized(0, 1000, { step: 0.1 }); // 10000 steps
        const { pack: pack2 } = build(schema2);
        expect(pack2(500).byteLength).toBe(2);

        // 3 bytes: 65537+ steps (17-24 bits)
        const schema3 = quantized(0, 100000, { step: 0.1 }); // 1000000 steps
        const { pack: pack3 } = build(schema3);
        expect(pack3(50000).byteLength).toBe(3);
    });

    test('quantized roundtrip with special values', () => {
        const { pack, unpack } = build(quantized(-100, 100, { step: 0.1 }));

        // Test precise values that should roundtrip exactly
        expect(unpack(pack(0))).toBe(0);
        expect(unpack(pack(10))).toBe(10);
        expect(unpack(pack(-10))).toBe(-10);
        expect(unpack(pack(50.5))).toBe(50.5);
        expect(unpack(pack(-50.5))).toBe(-50.5);

        // Test values that get quantized
        expect(unpack(pack(10.12))).toBeCloseTo(10.1, 10);
        expect(unpack(pack(10.18))).toBeCloseTo(10.2, 10);
        expect(unpack(pack(-10.12))).toBeCloseTo(-10.1, 10);
    });

    test('quantized asymmetric ranges', () => {
        // Range where min and max are not symmetric around 0
        const { pack, unpack } = build(quantized(10, 90, { step: 2 }));

        expect(unpack(pack(10))).toBe(10); // Min
        expect(unpack(pack(90))).toBe(90); // Max
        expect(unpack(pack(50))).toBe(50); // Mid (exact multiple)
        expect(unpack(pack(51))).toBe(52); // 51 rounds to 52 (20.5 steps rounds to 21)
        expect(unpack(pack(52))).toBe(52); // Exact multiple
    });

    test('quantized with nullable and optional', () => {
        const { pack: packNull, unpack: unpackNull } = build(nullable(quantized(0, 100, { step: 1 })));

        // Null value
        const nullSer = packNull(null);
        expect(unpackNull(nullSer)).toBeNull();

        // Normal value
        const normalSer = packNull(50.7);
        expect(unpackNull(normalSer)).toBe(51);

        const { pack: packOpt, unpack: unpackOpt } = build(optional(quantized(0, 100, { step: 1 })));

        // Undefined value
        const undefinedSer = packOpt(undefined);
        expect(unpackOpt(undefinedSer)).toBeUndefined();

        // Normal value
        const normalOptSer = packOpt(25.3);
        expect(unpackOpt(normalOptSer)).toBe(25);
    });

    test('string', () => {
        const { pack, unpack } = build(string());
        const testStr = 'hello world';
        const serialized = pack(testStr);
        expect(serialized.byteLength).toBe(1 + testStr.length); // 1 byte varuint length prefix for short strings
        const result = unpack(serialized);
        expect(result).toBe(testStr);
    });

    test('string (long - 2 byte varuint)', () => {
        const { pack, unpack } = build(string());
        // String with 150 chars requires 2 bytes for varuint (128-16383 range)
        const testStr = 'a'.repeat(150);
        const serialized = pack(testStr);
        expect(serialized.byteLength).toBe(2 + testStr.length); // 2 byte varuint length prefix
        const result = unpack(serialized);
        expect(result).toBe(testStr);
    });

    test('arraybuffer empty and non-empty', () => {
        const { pack, unpack, validate } = build(uint8Array());

        // Empty array - varuint(0) = 1 byte
        const empty = new Uint8Array(0);
        const serializedEmpty = pack(empty);
        expect(serializedEmpty.byteLength).toBe(1); // varuint(0) = 1 byte
        const outEmpty = unpack(serializedEmpty);
        expect(outEmpty.byteLength).toBe(0);
        expect(outEmpty.buffer).toBe(serializedEmpty.buffer); // should be a view

        // Small array (length < 128) - varuint = 1 byte
        const src = new Uint8Array([1, 2, 3]);
        const serialized = pack(src);
        expect(serialized.byteLength).toBe(1 + src.length); // varuint(3) = 1 byte + 3 bytes data
        const out = unpack(serialized);
        expect(out).toEqual(src);
        expect(out.buffer).toBe(serialized.buffer); // should be a view

        // Length = 127 (edge case, still 1 byte varuint)
        const len127 = new Uint8Array(127).fill(42);
        const ser127 = pack(len127);
        expect(ser127.byteLength).toBe(1 + 127); // varuint(127) = 1 byte
        const out127 = unpack(ser127);
        expect(out127).toEqual(len127);

        // Length = 128 (crosses threshold, 2 byte varuint)
        const len128 = new Uint8Array(128).fill(43);
        const ser128 = pack(len128);
        expect(ser128.byteLength).toBe(2 + 128); // varuint(128) = 2 bytes
        const out128 = unpack(ser128);
        expect(out128).toEqual(len128);

        // Length = 255 (2 byte varuint)
        const len255 = new Uint8Array(255).fill(44);
        const ser255 = pack(len255);
        expect(ser255.byteLength).toBe(2 + 255); // varuint(255) = 2 bytes
        const out255 = unpack(ser255);
        expect(out255).toEqual(len255);

        // Length = 16383 (edge case, still 2 byte varuint)
        const len16383 = new Uint8Array(16383).fill(45);
        const ser16383 = pack(len16383);
        expect(ser16383.byteLength).toBe(2 + 16383); // varuint(16383) = 2 bytes
        const out16383 = unpack(ser16383);
        expect(out16383.byteLength).toBe(16383);

        // Length = 16384 (crosses threshold, 3 byte varuint)
        const len16384 = new Uint8Array(16384).fill(46);
        const ser16384 = pack(len16384);
        expect(ser16384.byteLength).toBe(3 + 16384); // varuint(16384) = 3 bytes
        const out16384 = unpack(ser16384);
        expect(out16384.byteLength).toBe(16384);

        expect(validate(src)).toBe(true);
        // @ts-expect-error wrong type
        expect(validate(123)).toBe(false);
    });

    test('uint8array nested in object and list', () => {
        const nestedSchema = object({ id: uint8(), data: uint8Array() });
        const { pack: s1, unpack: d1 } = build(nestedSchema);

        const payload = new Uint8Array([9, 8, 7]);
        const obj = { id: 5, data: payload };
        const serialized = s1(obj as any);
        const out = d1(serialized);
        expect(out.id).toBe(5);
        expect(new Uint8Array(out.data)).toEqual(payload);

        const listSchema = list(uint8Array());
        const { pack: s2, unpack: d2 } = build(listSchema);
        const arr = [new Uint8Array([1]), new Uint8Array([2, 3])];
        const serialized2 = s2(arr as any);
        const outArr = d2(serialized2);
        expect(new Uint8Array(outArr[0])).toEqual(new Uint8Array([1]));
        expect(new Uint8Array(outArr[1])).toEqual(new Uint8Array([2, 3]));
    });

    test('list of numbers', () => {
        const { pack, unpack } = build(list(number()));
        const arr = [1.1, 2.2, 3.3];
        const serialized = pack(arr);
        expect(serialized.byteLength).toBe(1 + arr.length * 8); // 1 byte varuint for length prefix + 8 bytes per number
        const result = unpack(serialized);
        expect(result).toEqual(arr);
    });

    test('list of fixed-length lists (vec3)', () => {
        const vec3Schema = list(float32(), 3);
        const { pack, unpack } = build(list(vec3Schema));

        const data: [number, number, number][] = [
            [1.1, 2.2, 3.3],
            [4.4, 5.5, 6.6],
        ];

        const serialized = pack(data);
        expect(serialized.byteLength).toBe(1 + data.length * 12); // 1 byte varuint for length prefix + 12 bytes per vec3 (3 * 4 bytes per float32)

        const result = unpack(serialized);
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
        const { pack, unpack } = build(list(list(number())));
        const arr = [
            [1, 2, 3],
            [4, 5, 6],
            [6, 7, 8],
        ];

        const serialized = pack(arr);
        expect(serialized.byteLength).toBe(1 + arr.length * 1 + arr.reduce((sum, item) => sum + item.length * 8, 0)); // outer varuint + inner varuints

        const result = unpack(serialized);
        expect(result).toEqual(arr);
    });

    test('large list (>127 elements, 2-byte varuint)', () => {
        const { pack, unpack } = build(list(uint8()));
        const arr = new Array(200).fill(0).map((_, i) => i % 256);
        const serialized = pack(arr);
        expect(serialized.byteLength).toBe(2 + arr.length * 1); // 2-byte varuint for length prefix + 1 byte per uint8
        const result = unpack(serialized);
        expect(result).toEqual(arr);
    });

    test('object', () => {
        const { pack, unpack } = build(
            object({
                a: number(),
                b: string(),
                c: boolean(),
            }),
        );

        const obj = { a: 123.45, b: 'test', c: true };

        const serialized = pack(obj);
        expect(serialized.byteLength).toBe(8 + 1 + obj.b.length + 1); // number (8) + string varuint prefix (1) + string bytes + boolean (1)

        const result = unpack(serialized);
        expect(result).toEqual(obj);
    });

    test('object (long string - 2 byte varuint)', () => {
        const { pack, unpack } = build(object({ a: number(), b: string(), c: boolean() }));
        const obj = { a: 123.45, b: 'x'.repeat(200), c: true };

        const serialized = pack(obj);
        expect(serialized.byteLength).toBe(8 + 2 + obj.b.length + 1); // number (8) + string 2-byte varuint prefix + string bytes + boolean (1)

        const result = unpack(serialized);
        expect(result).toEqual(obj);
    });

    test('object in object', () => {
        const { pack, unpack } = build(
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

        const serialized = pack(obj);
        expect(serialized.byteLength).toBe(4 + 1 + obj.name.length + 1 + 8 + 4); // id (4) + name varuint prefix (1) + name bytes + active (1) + score (8) + level (4)

        const result = unpack(serialized);
        expect(result).toEqual(obj);
    });

    test('object in object (long string - 2 byte varuint)', () => {
        const { pack, unpack } = build(
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

        const serialized = pack(obj);
        expect(serialized.byteLength).toBe(4 + 2 + obj.name.length + 1 + 8 + 4); // id (4) + name 2-byte varuint prefix + name bytes + active (1) + score (8) + level (4)

        const result = unpack(serialized);
        expect(result).toEqual(obj);
    });

    test('tuple', () => {
        const { pack, unpack } = build(tuple([number(), string(), boolean()]));

        const data: [number, string, boolean] = [42.5, 'hello', true];
        const serialized = pack(data);
        expect(serialized.byteLength).toBe(8 + 1 + data[1].length + 1); // number (8) + string varuint prefix (1) + string bytes + boolean (1)

        const out = unpack(serialized);
        expect(out[0]).toBeCloseTo(data[0]);
        expect(out[1]).toBe(data[1]);
        expect(out[2]).toBe(data[2]);
    });

    test('tuple (long string - 2 byte varuint)', () => {
        const { pack, unpack } = build(tuple([number(), string(), boolean()]));

        const data: [number, string, boolean] = [42.5, 'z'.repeat(250), true];
        const serialized = pack(data);
        expect(serialized.byteLength).toBe(8 + 2 + data[1].length + 1); // number (8) + string 2-byte varuint prefix + string bytes + boolean (1)

        const out = unpack(serialized) as [number, string, boolean];
        expect(out[0]).toBeCloseTo(data[0]);
        expect(out[1]).toBe(data[1]);
        expect(out[2]).toBe(data[2]);
    });

    test('tuple of tuples', () => {
        const inner = tuple([number(), string()]);
        const schema = tuple([inner, inner]);
        const { pack, unpack } = build(schema);

        const data: [[number, string], [number, string]] = [
            [1.5, 'a'],
            [2.5, 'b'],
        ];

        const buf = pack(data);

        const out = unpack(buf);

        expect(out.length).toBe(2);
        expect(out[0][0]).toBeCloseTo(data[0][0]);
        expect(out[0][1]).toBe(data[0][1]);
        expect(out[1][0]).toBeCloseTo(data[1][0]);
        expect(out[1][1]).toBe(data[1][1]);
    });

    test('list of objects', () => {
        const { pack, unpack } = build(
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
        const serialized = pack(arr);
        const result = unpack(serialized);
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

        const { pack, unpack } = build(schema);

        const data: SchemaType<typeof schema> = [
            { id: 0, pos: [12, 24, 48] },
            { id: 1, pos: [120, 240, 480] },
            { id: 2, pos: [1200, 2400, 4800] },
            { id: 3, pos: [1.2, 2.4, 4.8] },
            { id: 4, pos: [1, 2, 4] },
        ];

        const buf = pack(data);
        const out = unpack(buf) as Array<{ id: number; pos: number[] }>;

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
        const { pack, unpack } = build(record(uint32()));

        // empty
        const empty = {};
        expect(unpack(pack(empty))).toEqual(empty);

        const simple = { a: 1, b: 42, hello: 12345 };
        expect(unpack(pack(simple))).toEqual(simple);

        const unicode = { ключ: 7, '😊': 999 };
        expect(unpack(pack(unicode))).toEqual(unicode);
    });

    test('object keys with quotes/newlines/emoji', () => {
        const { pack, unpack, validate } = build(record(uint32()));

        // keys with tricky characters
        const data: Record<string, number> = {
            simple: 1,
            'with"quote': 2,
            'with\nnewline': 3,
            'emoji-😊': 4,
        };

        expect(validate(data)).toBe(true);

        const buf = pack(data);
        const out = unpack(buf);
        expect(out).toEqual(data);
    });

    test('record of records', () => {
        const { pack, unpack } = build(record(record(uint32())));
        const data = {
            group1: { a: 1, b: 2 },
            group2: { x: 42, y: 99 },
        };
        const serialized = pack(data);
        const result = unpack(serialized);
        expect(result).toEqual(data);
    });

    test('auto-bitpack booleans in record', () => {
        const { pack, unpack } = build(record(boolean()));

        const data = { a: true, b: false, c: true, d: false, e: true };
        const buf = pack(data);
        // Record stores: varuint(count) + key1_len + key1_bytes + ... + bitpacked_values
        // count=5 (1 byte), keys a,b,c,d,e (each 1 byte length + 1 byte char = 2 bytes × 5 = 10 bytes), values (1 byte bitpacked) = 12 bytes
        expect(buf.byteLength).toBe(12);
        const out = unpack(buf);
        expect(out).toEqual(data);
    });

    test('auto-bitpack booleans in object', () => {
        const { pack, unpack, validate } = build(object({ a: boolean(), b: boolean(), c: boolean() }));

        const v = { a: true, b: false, c: true };
        expect(validate(v)).toBe(true);

        const buf = pack(v);
        // 3 booleans should pack into 1 byte (instead of 3 bytes)
        expect(buf.byteLength).toBe(1);
        const out = unpack(buf);
        expect(out).toEqual(v);
    });

    test('literal', () => {
        const schema = literal('hello');
        const { pack, unpack, validate } = build(schema);

        const v = 'hello';
        expect(validate(v)).toBe(true);

        const buf = pack(v);
        expect(buf.byteLength).toBe(0);

        const out = unpack(buf);
        expect(out).toEqual(v);
    });

    test('enumeration with string values', () => {
        const status = build(object({ value: enumeration(['pending', 'active', 'completed'] as const) }));
        const { pack, unpack } = status;

        const buf = pack({ value: 'active' });
        expect(buf.byteLength).toBe(1); // 1 byte for varuint index 1
        expect(unpack(buf)).toEqual({ value: 'active' });
    });

    test('enumeration with numeric values', () => {
        const priority = build(object({ level: enumeration([1, 5, 10] as const) }));
        const { pack, unpack } = priority;

        const buf = pack({ level: 10 });
        expect(buf.byteLength).toBe(1); // 1 byte for varuint index 2
        expect(unpack(buf)).toEqual({ level: 10 });
    });

    test('enumeration with mixed values', () => {
        const mixed = build(object({ val: enumeration([0, 'auto', 1, 'manual'] as const) }));
        const { pack, unpack } = mixed;

        expect(unpack(pack({ val: 0 }))).toEqual({ val: 0 });
        expect(unpack(pack({ val: 'auto' }))).toEqual({ val: 'auto' });
        expect(unpack(pack({ val: 1 }))).toEqual({ val: 1 });
        expect(unpack(pack({ val: 'manual' }))).toEqual({ val: 'manual' });
    });

    test('optional', () => {
        const schema = optional(string());
        const { pack, unpack } = build(schema);

        const present = 'hi';
        const bufPresent = pack(present);
        expect(unpack(bufPresent)).toBe(present);

        const bufAbsent = pack(undefined);
        expect(unpack(bufAbsent)).toBeUndefined();
    });

    test('nullable', () => {
        const schema = nullable(string());
        const { pack, unpack } = build(schema);

        const bufNull = pack(null);
        expect(unpack(bufNull)).toBeNull();

        const bufVal = pack('hi');
        expect(unpack(bufVal)).toBe('hi');
    });

    test('nullish', () => {
        const schema = nullish(string());
        const { pack, unpack } = build(schema);

        const bufNull = pack(null);
        expect(unpack(bufNull)).toBeNull();

        const bufUndef = pack(undefined);
        expect(unpack(bufUndef)).toBeUndefined();

        const bufVal = pack('val');
        expect(unpack(bufVal)).toBe('val');
    });

    test('complex structure', () => {
        const complexSchema = object({
            id: uint32(),
            name: string(),
            active: boolean(),
            flags: object({
                a: boolean(),
                b: boolean(),
                c: boolean(),
                d: boolean(),
                e: boolean(),
                f: boolean(),
                g: boolean(),
                h: boolean(),
                i: boolean(),
                j: boolean(),
            }),
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
            nestedTuple: tuple([number(), object({ x: float64(), y: float64() }), list(boolean())]),
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

        const buf = s.pack(data);
        const out = s.unpack(buf);

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
        ]);

        const { pack, unpack, validate } = build(pet);

        const dog = { type: 'dog', name: 'Rex', bark: 5 } as const;
        const cat = { type: 'cat', name: 'Mittens', lives: 9 } as const;

        expect(validate(dog)).toBe(true);
        expect(validate(cat)).toBe(true);

        const bufDog = pack(dog);
        const outDog = unpack(bufDog);
        expect(outDog).toEqual(dog);

        const bufCat = pack(cat);
        const outCat = unpack(bufCat);
        expect(outCat).toEqual(cat);
    });

    test('union with many variants (>255)', () => {
        // Create 300 variants to test varuint encoding
        const variants = Array.from({ length: 300 }, (_, i) => object({ type: literal(`type${i}`), value: uint8() }));
        const schema = union('type', variants as any);
        const { pack, unpack, validate } = build(schema);

        // Test first variant (1-byte varuint: 0)
        const first = { type: 'type0', value: 42 };
        expect(validate(first)).toBe(true);
        const bufFirst = pack(first);
        expect(bufFirst.byteLength).toBe(2); // 1 byte varuint tag + 1 byte value
        expect(unpack(bufFirst)).toEqual(first);

        // Test variant at 127 (1-byte varuint boundary)
        const at127 = { type: 'type127', value: 100 };
        expect(validate(at127)).toBe(true);
        const buf127 = pack(at127);
        expect(buf127.byteLength).toBe(2); // 1 byte varuint tag + 1 byte value
        expect(unpack(buf127)).toEqual(at127);

        // Test variant at 128 (2-byte varuint)
        const at128 = { type: 'type128', value: 50 };
        expect(validate(at128)).toBe(true);
        const buf128 = pack(at128);
        expect(buf128.byteLength).toBe(3); // 2 byte varuint tag + 1 byte value
        expect(unpack(buf128)).toEqual(at128);

        // Test variant at 200 (2-byte varuint)
        const at200 = { type: 'type200', value: 75 };
        expect(validate(at200)).toBe(true);
        const buf200 = pack(at200);
        expect(buf200.byteLength).toBe(3); // 2 byte varuint tag + 1 byte value
        expect(unpack(buf200)).toEqual(at200);

        // Test last variant
        const last = { type: 'type299', value: 99 };
        expect(validate(last)).toBe(true);
        const bufLast = pack(last);
        expect(bufLast.byteLength).toBe(3); // 2 byte varuint tag + 1 byte value
        expect(unpack(bufLast)).toEqual(last);
    });

    test('empty string', () => {
        const { pack, unpack } = build(string());
        const empty = '';
        const serialized = pack(empty);
        expect(serialized.byteLength).toBe(1); // just the varuint length prefix (0)
        expect(unpack(serialized)).toBe(empty);
    });

    test('string with emoji', () => {
        const { pack, unpack } = build(string());

        // Simple emoji (4 bytes in UTF-8)
        const simple = '😊';
        expect(unpack(pack(simple))).toBe(simple);

        // Emoji with zero-width joiner (family emoji)
        const family = '👨‍👩‍👧‍👦';
        expect(unpack(pack(family))).toBe(family);

        // Various emoji
        const multi = '🌍🔥💧🌊⚡';
        expect(unpack(pack(multi))).toBe(multi);
    });

    test('string with CJK characters', () => {
        const { pack, unpack } = build(string());

        const japanese = 'こんにちは世界';
        expect(unpack(pack(japanese))).toBe(japanese);

        const chinese = '你好世界';
        expect(unpack(pack(chinese))).toBe(chinese);

        const korean = '안녕하세요';
        expect(unpack(pack(korean))).toBe(korean);
    });

    test('string with mixed unicode', () => {
        const { pack, unpack } = build(string());

        const mixed = 'Hello 世界 🌍!';
        expect(unpack(pack(mixed))).toBe(mixed);

        const complex = 'Test: 测试 🧪 тест';
        expect(unpack(pack(complex))).toBe(complex);
    });

    test('string with surrogate pairs', () => {
        const { pack, unpack } = build(string());

        // Mathematical alphanumeric symbols (surrogate pairs)
        const math = '𝕳𝖊𝖑𝖑𝖔';
        expect(unpack(pack(math))).toBe(math);

        // Musical symbols
        const music = '𝄞𝄢𝄫';
        expect(unpack(pack(music))).toBe(music);
    });

    test('string with combining characters', () => {
        const { pack, unpack } = build(string());

        // Combining diacritical marks
        const accents = 'café'; // é is one codepoint
        expect(unpack(pack(accents))).toBe(accents);

        const combining = 'cafe\u0301'; // e + combining acute accent
        expect(unpack(pack(combining))).toBe(combining);
    });

    test('string with special whitespace', () => {
        const { pack, unpack } = build(string());

        const withNewline = 'hello\nworld';
        expect(unpack(pack(withNewline))).toBe(withNewline);

        const withTab = 'hello\tworld';
        expect(unpack(pack(withTab))).toBe(withTab);

        const withCarriageReturn = 'hello\r\nworld';
        expect(unpack(pack(withCarriageReturn))).toBe(withCarriageReturn);
    });

    test('empty list', () => {
        const { pack, unpack } = build(list(number()));
        const empty: number[] = [];
        const serialized = pack(empty);
        expect(serialized.byteLength).toBe(1); // just varuint length prefix (0)
        expect(unpack(serialized)).toEqual(empty);
    });

    test('empty nested list', () => {
        const { pack, unpack } = build(list(list(string())));
        const empty: string[][] = [];
        expect(unpack(pack(empty))).toEqual(empty);

        const withEmptyInner: string[][] = [[], []];
        expect(unpack(pack(withEmptyInner))).toEqual(withEmptyInner);
    });

    test('empty record', () => {
        const { pack, unpack } = build(record(number()));
        const empty: Record<string, number> = {};
        const serialized = pack(empty);
        expect(serialized.byteLength).toBe(1); // just varuint length prefix (0)
        expect(unpack(serialized)).toEqual(empty);
    });

    test('object with empty nested collections', () => {
        const schema = object({
            items: list(string()),
            metadata: record(number()),
        });
        const { pack, unpack } = build(schema);

        const data = {
            items: [],
            metadata: {},
        };

        expect(unpack(pack(data))).toEqual(data);
    });

    test('record with empty string key', () => {
        const { pack, unpack } = build(record(number()));

        const emptyKey = { '': 42 };
        expect(unpack(pack(emptyKey))).toEqual(emptyKey);

        const mixed = { '': 1, normal: 2, another: 3 };
        expect(unpack(pack(mixed))).toEqual(mixed);
    });

    test('record with very long keys', () => {
        const { pack, unpack } = build(record(number()));

        const longKey = 'x'.repeat(1000);
        const data = { [longKey]: 99 };
        expect(unpack(pack(data))).toEqual(data);

        // Multiple long keys
        const multiLong = {
            ['a'.repeat(500)]: 1,
            ['b'.repeat(500)]: 2,
        };
        expect(unpack(pack(multiLong))).toEqual(multiLong);
    });

    test('record with unicode keys', () => {
        const { pack, unpack } = build(record(string()));

        const unicodeKeys = {
            ключ: 'Russian',
            '😊': 'emoji',
            你好: 'Chinese',
            '🌍': 'Earth',
        };
        expect(unpack(pack(unicodeKeys))).toEqual(unicodeKeys);
    });

    test('record with special character keys', () => {
        const { pack, unpack } = build(record(number()));

        const specialKeys = {
            'with"quote': 1,
            "with'apostrophe": 2,
            'with\nnewline': 3,
            'with\ttab': 4,
            'with\\backslash': 5,
        };
        expect(unpack(pack(specialKeys))).toEqual(specialKeys);
    });

    test('nested record with special keys', () => {
        const { pack, unpack } = build(record(record(number())));

        const longKey = 'x'.repeat(100);
        const data = {
            '': { inner: 1 },
            '😊': { '': 2, [longKey]: 3 },
        };
        expect(unpack(pack(data))).toEqual(data);
    });

    test('auto-bitpack booleans in fixed-size list', () => {
        const { pack, unpack } = build(list(boolean(), 8));

        const allTrue: [boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean] = [
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
        ];
        const serialized = pack(allTrue);
        expect(serialized.byteLength).toBe(1);
        expect(unpack(serialized)).toEqual(allTrue);

        const allFalse: [boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean] = [
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
        ];
        expect(unpack(pack(allFalse))).toEqual(allFalse);

        const alternating: [boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean] = [
            true,
            false,
            true,
            false,
            true,
            false,
            true,
            false,
        ];
        expect(unpack(pack(alternating))).toEqual(alternating);
    });

    test('auto-bitpack booleans in variable-size list', () => {
        const { pack, unpack } = build(list(boolean()));

        const mixed = [true, false, true, false, true, false, true, false, true];
        const serialized = pack(mixed);
        // varuint(9) + 2 bytes of bitpacked booleans
        expect(serialized.byteLength).toBe(3);
        expect(unpack(serialized)).toEqual(mixed);
    });

    test('auto-bitpack booleans in tuple', () => {
        const { pack, unpack } = build(tuple([boolean(), string(), boolean(), boolean()]));

        const data: [boolean, string, boolean, boolean] = [true, 'hello', false, true];
        const serialized = pack(data);
        expect(unpack(serialized)).toEqual(data);
    });

    test('auto-bitpack mixed fields in object', () => {
        const schema = object({
            id: uint32(),
            flag1: boolean(),
            name: string(),
            flag2: boolean(),
            flag3: boolean(),
            flag4: boolean(),
            flag5: boolean(),
            flag6: boolean(),
            flag7: boolean(),
            flag8: boolean(),
            flag9: boolean(),
        });
        const { pack, unpack } = build(schema);

        const data = {
            id: 123,
            flag1: true,
            name: 'test',
            flag2: false,
            flag3: true,
            flag4: false,
            flag5: true,
            flag6: false,
            flag7: true,
            flag8: false,
            flag9: true,
        };

        // 9 booleans should bitpack into ceil(9/8) = 2 bytes
        const serialized = pack(data);
        expect(unpack(serialized)).toEqual(data);
    });

    test('auto-bitpack large boolean groups (>8 bools for multi-byte)', () => {
        const { pack, unpack } = build(list(boolean()));

        // 17 booleans should require 3 bytes (ceil(17/8) = 3)
        const data = [
            true,
            false,
            true,
            false,
            true,
            false,
            true,
            false,
            true,
            false,
            true,
            false,
            true,
            false,
            true,
            false,
            true,
        ];
        const buf = pack(data);
        // varuint(17) = 1 byte + 3 bytes for bitpacked values = 4 bytes
        expect(buf.byteLength).toBe(4);
        const out = unpack(buf);
        expect(out).toEqual(data);
        expect(out.length).toBe(17);
    });

    test('auto-bitpack record(boolean()) with validation', () => {
        const { pack, unpack, validate } = build(record(boolean()));

        const validData = { x: true, y: false, z: true };
        expect(validate(validData)).toBe(true);

        const serialized = pack(validData);
        const out = unpack(serialized);
        expect(out).toEqual(validData);

        // Invalid data should not validate
        const invalidData = { x: 'not a bool' };
        expect(validate(invalidData as any)).toBe(false);
    });

    test('nullable/optional booleans do not bitpack', () => {
        // nullable(boolean()) creates separate flag + value, not bitpacking
        const { pack: packNullBool, unpack: unpackNullBool } = build(
            object({
                flag: nullable(boolean()),
            }),
        );

        const data1 = { flag: true };
        const buf1 = packNullBool(data1);
        // Should be: 1 byte for null flag + 1 byte for boolean value = 2 bytes
        expect(buf1.byteLength).toBe(2);
        expect(unpackNullBool(buf1)).toEqual(data1);

        const data2 = { flag: null };
        const buf2 = packNullBool(data2);
        // Should be: 1 byte for null flag only = 1 byte
        expect(buf2.byteLength).toBe(1);
        expect(unpackNullBool(buf2)).toEqual(data2);

        // optional(boolean()) similarly uses flag wrapper
        const { pack: packOptBool, unpack: unpackOptBool } = build(
            object({
                flag: optional(boolean()),
            }),
        );

        const data3 = { flag: true };
        const buf3 = packOptBool(data3);
        // Should be: 1 byte for optional flag + 1 byte for boolean value = 2 bytes
        expect(buf3.byteLength).toBe(2);
        expect(unpackOptBool(buf3)).toEqual(data3);

        const data4 = { flag: undefined };
        const buf4 = packOptBool(data4);
        // Should be: 1 byte for optional flag only = 1 byte
        expect(buf4.byteLength).toBe(1);
        expect(unpackOptBool(buf4)).toEqual(data4);
    });

    test('quaternion basic encoding', () => {
        const { pack, unpack } = build(quat());

        // Identity quaternion (no rotation) [x, y, z, w]
        const identity: [number, number, number, number] = [0, 0, 0, 1];
        expect(pack(identity).byteLength).toBe(7); // 1 metadata byte + 6 component bytes (10 bits needs 2 bytes per component)
        const outIdentity = unpack(pack(identity));
        expect(outIdentity[0]).toBeCloseTo(identity[0], 2);
        expect(outIdentity[1]).toBeCloseTo(identity[1], 2);
        expect(outIdentity[2]).toBeCloseTo(identity[2], 2);
        expect(outIdentity[3]).toBeCloseTo(identity[3], 2);

        // 90° rotation around Y axis [x, y, z, w]
        const rot90Y: [number, number, number, number] = [0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4)];
        const outRot90Y = unpack(pack(rot90Y));
        expect(outRot90Y[0]).toBeCloseTo(rot90Y[0], 2);
        expect(outRot90Y[1]).toBeCloseTo(rot90Y[1], 2);
        expect(outRot90Y[2]).toBeCloseTo(rot90Y[2], 2);
        expect(outRot90Y[3]).toBeCloseTo(rot90Y[3], 2);

        // Verify quaternion properties
        const lengthSq = outRot90Y[0] ** 2 + outRot90Y[1] ** 2 + outRot90Y[2] ** 2 + outRot90Y[3] ** 2;
        expect(lengthSq).toBeCloseTo(1, 1); // Should be unit length
    });

    test('quaternion precision levels', () => {
        const q: [number, number, number, number] = [0.1, 0.2, 0.3, Math.sqrt(1 - 0.1 ** 2 - 0.2 ** 2 - 0.3 ** 2)];

        // 0.002 step (lower precision, smaller size)
        const { pack: pack002, unpack: unpack002 } = build(quat({ step: 0.002 }));
        expect(pack002(q).byteLength).toBe(7); // ~10 bits per component, 1 metadata + 6 component bytes
        const out002 = unpack002(pack002(q));
        expect(out002[0]).toBeCloseTo(q[0], 2);

        // 0.0002 step (higher precision, larger size)
        const { pack: pack0002, unpack: unpack0002 } = build(quat({ step: 0.0002 }));
        expect(pack0002(q).byteLength).toBe(7); // 1 metadata + 6 component bytes
        const out0002 = unpack0002(pack0002(q));
        expect(out0002[0]).toBeCloseTo(q[0], 3);
    });

    test('quaternion edge cases', () => {
        const { pack, unpack } = build(quat());

        // Test all four components as largest [x, y, z, w]
        const testCases: [number, number, number, number][] = [
            [1, 0, 0, 0], // x largest
            [0, 1, 0, 0], // y largest
            [0, 0, 1, 0], // z largest
            [0, 0, 0, 1], // w largest
        ];

        for (const q of testCases) {
            const out = unpack(pack(q));
            expect(out[0]).toBeCloseTo(q[0], 2);
            expect(out[1]).toBeCloseTo(q[1], 2);
            expect(out[2]).toBeCloseTo(q[2], 2);
            expect(out[3]).toBeCloseTo(q[3], 2);
        }

        // Negative components
        const negQ: [number, number, number, number] = [-0.5, -0.5, 0.5, 0.5];
        const outNeg = unpack(pack(negQ));
        expect(outNeg[0]).toBeCloseTo(negQ[0], 1);
        expect(outNeg[1]).toBeCloseTo(negQ[1], 1);
    });

    test('uv2 basic encoding', () => {
        const { pack, unpack } = build(uv2());

        // Right [x, y] = [1, 0]
        const right: [number, number] = [1, 0];
        expect(pack(right).byteLength).toBe(2); // 12 bits → 2 bytes
        const outRight = unpack(pack(right));
        expect(outRight[0]).toBeCloseTo(right[0], 2);
        expect(outRight[1]).toBeCloseTo(right[1], 2);

        // Up [x, y] = [0, 1]
        const up: [number, number] = [0, 1];
        const outUp = unpack(pack(up));
        expect(outUp[0]).toBeCloseTo(up[0], 2);
        expect(outUp[1]).toBeCloseTo(up[1], 2);

        // 45° angle
        const angle45: [number, number] = [Math.cos(Math.PI / 4), Math.sin(Math.PI / 4)];
        const out45 = unpack(pack(angle45));
        expect(out45[0]).toBeCloseTo(angle45[0], 2);
        expect(out45[1]).toBeCloseTo(angle45[1], 2);

        // Verify unit length
        const lengthSq = out45[0] ** 2 + out45[1] ** 2;
        expect(lengthSq).toBeCloseTo(1, 2);
    });

    test('uv2 precision levels', () => {
        const v: [number, number] = [Math.cos(0.5), Math.sin(0.5)];

        // 0.006 step (lower precision, ~0.35°)
        const { pack: pack006, unpack: unpack006 } = build(uv2({ step: 0.006 }));
        expect(pack006(v).byteLength).toBe(2);
        const out006 = unpack006(pack006(v));
        expect(out006[0]).toBeCloseTo(v[0], 2);

        // 0.0001 step (higher precision, ~0.006°)
        const { pack: pack0001, unpack: unpack0001 } = build(uv2({ step: 0.0001 }));
        expect(pack0001(v).byteLength).toBe(2);
        const out0001 = unpack0001(pack0001(v));
        expect(out0001[0]).toBeCloseTo(v[0], 3);
    });

    test('uv2 all quadrants', () => {
        const { pack, unpack } = build(uv2());

        // Test vectors in all four quadrants
        const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2, 2 * Math.PI - 0.1];

        for (const angle of angles) {
            const v: [number, number] = [Math.cos(angle), Math.sin(angle)];
            const out = unpack(pack(v));
            expect(out[0]).toBeCloseTo(v[0], 2);
            expect(out[1]).toBeCloseTo(v[1], 2);
        }
    });

    test('uv3 basic encoding', () => {
        const { pack, unpack } = build(uv3());

        // Unit X [x, y, z]
        const unitX: [number, number, number] = [1, 0, 0];
        expect(pack(unitX).byteLength).toBe(4); // 11*2 + 3 = 25 bits → 4 bytes
        const outX = unpack(pack(unitX));
        expect(outX[0]).toBeCloseTo(unitX[0], 2);
        expect(outX[1]).toBeCloseTo(unitX[1], 2);
        expect(outX[2]).toBeCloseTo(unitX[2], 2);

        // Unit Y
        const unitY: [number, number, number] = [0, 1, 0];
        const outY = unpack(pack(unitY));
        expect(outY[1]).toBeCloseTo(unitY[1], 2);

        // Unit Z
        const unitZ: [number, number, number] = [0, 0, 1];
        const outZ = unpack(pack(unitZ));
        expect(outZ[2]).toBeCloseTo(unitZ[2], 2);

        // Arbitrary direction
        const dir: [number, number, number] = [1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)];
        const outDir = unpack(pack(dir));
        expect(outDir[0]).toBeCloseTo(dir[0], 2);
        expect(outDir[1]).toBeCloseTo(dir[1], 2);
        expect(outDir[2]).toBeCloseTo(dir[2], 2);

        // Verify unit length
        const lengthSq = outDir[0] ** 2 + outDir[1] ** 2 + outDir[2] ** 2;
        expect(lengthSq).toBeCloseTo(1, 1);
    });

    test('uv3 precision levels', () => {
        const v: [number, number, number] = [0.267, 0.535, 0.802];

        // 0.002 step (lower precision)
        const { pack: pack002_uv3, unpack: unpack002_uv3 } = build(uv3({ step: 0.002 }));
        expect(pack002_uv3(v).byteLength).toBe(3);
        const out002 = unpack002_uv3(pack002_uv3(v));
        expect(out002[0]).toBeCloseTo(v[0], 1);

        // 0.0002 step (higher precision)
        const { pack: pack0002_uv3, unpack: unpack0002_uv3 } = build(uv3({ step: 0.0002 }));
        expect(pack0002_uv3(v).byteLength).toBe(4);
        const out0002 = unpack0002_uv3(pack0002_uv3(v));
        expect(out0002[0]).toBeCloseTo(v[0], 2);
    });

    test('uv3 negative components', () => {
        const { pack, unpack } = build(uv3());

        const testVecs: [number, number, number][] = [
            [-1, 0, 0],
            [0, -1, 0],
            [0, 0, -1],
            [-1 / Math.sqrt(3), -1 / Math.sqrt(3), 1 / Math.sqrt(3)],
        ];

        for (const v of testVecs) {
            const out = unpack(pack(v));
            expect(out[0]).toBeCloseTo(v[0], 2);
            expect(out[1]).toBeCloseTo(v[1], 2);
            expect(out[2]).toBeCloseTo(v[2], 2);
        }
    });

    test('uint8Array variable length', () => {
        const { pack, unpack } = build(uint8Array());

        // Basic array
        const data1 = new Uint8Array([1, 2, 3, 4, 5]);
        expect(pack(data1).byteLength).toBe(6); // 1 byte varuint + 5 bytes
        expect(unpack(pack(data1))).toEqual(data1);

        // Empty array
        const data2 = new Uint8Array([]);
        expect(pack(data2).byteLength).toBe(1); // 1 byte varuint (length=0)
        expect(unpack(pack(data2))).toEqual(data2);

        // Large array (>127 = 2-byte varuint)
        const data3 = new Uint8Array(300).map((_, i) => i % 256);
        expect(pack(data3).byteLength).toBe(302); // 2 bytes varuint + 300 bytes
        expect(unpack(pack(data3))).toEqual(data3);
    });

    test('uint8Array fixed length', () => {
        // 5 bytes - no varuint prefix
        const { pack: pack5, unpack: unpack5 } = build(uint8Array(5));
        const data5 = new Uint8Array([10, 20, 30, 40, 50]);
        expect(pack5(data5).byteLength).toBe(5);
        expect(unpack5(pack5(data5))).toEqual(data5);

        // 0 bytes
        const { pack: pack0, unpack: unpack0 } = build(uint8Array(0));
        const data0 = new Uint8Array([]);
        expect(pack0(data0).byteLength).toBe(0);
        expect(unpack0(pack0(data0))).toEqual(data0);

        // 1 byte
        const { pack: pack1_u8a, unpack: unpack1_u8a } = build(uint8Array(1));
        const data1 = new Uint8Array([255]);
        expect(pack1_u8a(data1).byteLength).toBe(1);
        expect(unpack1_u8a(pack1_u8a(data1))).toEqual(data1);
    });
});

describe('packInto', () => {
    test('writes into provided buffer and returns ok with bytesWritten', () => {
        const schema = uint32();
        const { pack, packInto } = build(schema);

        const packed = pack(42);
        const buf = new Uint8Array(16);
        const result = packInto(42, buf, 0);

        expect(result).toEqual({ ok: true, bytesWritten: 4 });
        expect(buf.subarray(0, 4)).toEqual(packed);
    });

    test('writes at a given offset', () => {
        const schema = uint32();
        const { pack, packInto } = build(schema);

        const buf = new Uint8Array(16);
        buf[0] = 0xff; // sentinel
        const result = packInto(42, buf, 4);

        expect(result).toEqual({ ok: true, bytesWritten: 4 });
        expect(buf[0]).toBe(0xff); // sentinel untouched

        const packed = pack(42);
        expect(buf.subarray(4, 8)).toEqual(packed);
    });

    test('returns ok: false when buffer is too small', () => {
        const schema = uint32();
        const { packInto } = build(schema);

        const buf = new Uint8Array(2); // need 4 bytes
        const result = packInto(42, buf, 0);

        expect(result).toEqual({ ok: false, bytesWritten: 0 });
    });

    test('returns ok: false when offset leaves insufficient room', () => {
        const schema = uint32();
        const { packInto } = build(schema);

        const buf = new Uint8Array(8);
        const result = packInto(42, buf, 6); // only 2 bytes left

        expect(result).toEqual({ ok: false, bytesWritten: 0 });
    });

    test('does not mutate buffer on failure', () => {
        const schema = uint32();
        const { packInto } = build(schema);

        const buf = new Uint8Array(2);
        buf.fill(0xaa);
        packInto(42, buf, 0);

        // buffer should be untouched since check happens before writing
        expect(buf[0]).toBe(0xaa);
        expect(buf[1]).toBe(0xaa);
    });

    test('works with variable-length types (string)', () => {
        const schema = string();
        const { pack, packInto } = build(schema);

        const packed = pack('hello');
        const buf = new Uint8Array(64);
        const result = packInto('hello', buf, 0);

        expect(result).toEqual({ ok: true, bytesWritten: packed.length });
        expect(buf.subarray(0, packed.length)).toEqual(packed);
    });

    test('returns ok: false for string when buffer too small', () => {
        const schema = string();
        const { packInto } = build(schema);

        const buf = new Uint8Array(2); // 'hello' needs 6 bytes (1 varuint + 5 chars)
        const result = packInto('hello', buf, 0);

        expect(result).toEqual({ ok: false, bytesWritten: 0 });
    });

    test('works with object schema', () => {
        const schema = object({
            x: float32(),
            y: float32(),
            active: boolean(),
        });
        const { pack, packInto, unpack } = build(schema);

        const value = { x: 1.5, y: 2.5, active: true };
        const packed = pack(value);
        const buf = new Uint8Array(64);
        const result = packInto(value, buf, 0);

        expect(result).toEqual({ ok: true, bytesWritten: packed.length });

        // verify round-trip through unpack
        const unpacked = unpack(buf.subarray(0, result.bytesWritten as number));
        expect(unpacked).toEqual(value);
    });

    test('works with list schema', () => {
        const schema = list(uint16());
        const { pack, packInto } = build(schema);

        const value = [1, 2, 3, 4, 5];
        const packed = pack(value);
        const buf = new Uint8Array(64);
        const result = packInto(value, buf, 0);

        expect(result).toEqual({ ok: true, bytesWritten: packed.length });
        expect(buf.subarray(0, packed.length)).toEqual(packed);
    });

    test('works with tuple schema', () => {
        const schema = tuple([uint8(), float32(), boolean()]);
        const { pack, packInto } = build(schema);

        const value: [number, number, boolean] = [42, 3.14, true];
        const packed = pack(value);
        const buf = new Uint8Array(64);
        const result = packInto(value, buf, 0);

        expect(result).toEqual({ ok: true, bytesWritten: packed.length });
        expect(buf.subarray(0, packed.length)).toEqual(packed);
    });

    test('works with varuint (variable size)', () => {
        const schema = varuint();
        const { pack, packInto } = build(schema);

        // small value (1 byte)
        const packed1 = pack(5);
        const buf1 = new Uint8Array(8);
        const result1 = packInto(5, buf1, 0);
        expect(result1).toEqual({ ok: true, bytesWritten: packed1.length });

        // larger value (2 bytes)
        const packed2 = pack(300);
        const buf2 = new Uint8Array(8);
        const result2 = packInto(300, buf2, 0);
        expect(result2).toEqual({ ok: true, bytesWritten: packed2.length });
    });

    test('offset defaults to 0', () => {
        const schema = uint8();
        const { pack, packInto } = build(schema);

        const packed = pack(77);
        const buf = new Uint8Array(4);
        const result = packInto(77, buf, 0);

        expect(result).toEqual({ ok: true, bytesWritten: 1 });
        expect(buf[0]).toBe(packed[0]);
    });

    test('multiple packInto calls at successive offsets', () => {
        const schema = uint32();
        const { packInto, unpack } = build(schema);

        const buf = new Uint8Array(12);
        const r1 = packInto(100, buf, 0);
        const r2 = packInto(200, buf, 4);
        const r3 = packInto(300, buf, 8);

        expect(r1).toEqual({ ok: true, bytesWritten: 4 });
        expect(r2).toEqual({ ok: true, bytesWritten: 4 });
        expect(r3).toEqual({ ok: true, bytesWritten: 4 });

        expect(unpack(buf.subarray(0, 4))).toBe(100);
        expect(unpack(buf.subarray(4, 8))).toBe(200);
        expect(unpack(buf.subarray(8, 12))).toBe(300);
    });

    test('exact fit succeeds', () => {
        const schema = uint32();
        const { packInto } = build(schema);

        const buf = new Uint8Array(4); // exactly 4 bytes needed
        const result = packInto(42, buf, 0);

        expect(result).toEqual({ ok: true, bytesWritten: 4 });
    });

    test('one byte short fails', () => {
        const schema = uint32();
        const { packInto } = build(schema);

        const buf = new Uint8Array(3); // 1 byte short
        const result = packInto(42, buf, 0);

        expect(result).toEqual({ ok: false, bytesWritten: 0 });
    });
});

describe('nested nullable/optional/nullish', () => {
    test('nullable(optional(uint8)) round-trips with value present', () => {
        const schema = nullable(optional(uint8()));
        const { pack, unpack } = build(schema);

        const value = 42;
        expect(unpack(pack(value))).toBe(value);
    });

    test('nullable(optional(uint8)) round-trips with null', () => {
        const schema = nullable(optional(uint8()));
        const { pack, unpack } = build(schema);

        expect(unpack(pack(null))).toBe(null);
    });

    test('nullable(optional(uint8)) round-trips with undefined', () => {
        const schema = nullable(optional(uint8()));
        const { pack, unpack } = build(schema);

        expect(unpack(pack(undefined))).toBe(undefined);
    });

    test('optional(nullable(string)) round-trips all cases', () => {
        const schema = optional(nullable(string()));
        const { pack, unpack } = build(schema);

        expect(unpack(pack('hello'))).toBe('hello');
        expect(unpack(pack(null))).toBe(null);
        expect(unpack(pack(undefined))).toBe(undefined);
    });

    test('nullish(nullable(uint32)) round-trips all cases', () => {
        const schema = nullish(nullable(uint32()));
        const { pack, unpack } = build(schema);

        expect(unpack(pack(99))).toBe(99);
        expect(unpack(pack(null))).toBe(null);
        expect(unpack(pack(undefined))).toBe(undefined);
    });

    test('object with nullable and optional fields round-trips', () => {
        const schema = object({
            a: nullable(optional(uint8())),
            b: optional(nullable(uint8())),
        });
        const { pack, unpack } = build(schema);

        expect(unpack(pack({ a: 1, b: 2 }))).toEqual({ a: 1, b: 2 });
        expect(unpack(pack({ a: null, b: undefined }))).toEqual({ a: null, b: undefined });
        expect(unpack(pack({ a: undefined, b: null }))).toEqual({ a: undefined, b: null });
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

    test('object field order independence - cross-schema pack/unpack', () => {
        // Create two schemas with the same fields but different definition order
        const schema1 = object({
            name: string(),
            id: uint32(),
            active: boolean(),
            score: float32(),
        });

        const schema2 = object({
            score: float32(),
            active: boolean(),
            name: string(),
            id: uint32(),
        });

        const { pack: pack1, unpack: unpack1 } = build(schema1);
        const { pack: pack2, unpack: unpack2 } = build(schema2);

        const data = {
            name: 'Player1',
            id: 42,
            active: true,
            score: 123.45,
        };

        // Serialize with schema1, deserialize with schema2
        const buf1 = pack1(data);
        const out2 = unpack2(buf1);

        expect(out2.name).toBe(data.name);
        expect(out2.id).toBe(data.id);
        expect(out2.active).toBe(data.active);
        expect(out2.score).toBeCloseTo(data.score, 5);

        // Serialize with schema2, deserialize with schema1
        const buf2 = pack2(data);
        const out1 = unpack1(buf2);

        expect(out1.name).toBe(data.name);
        expect(out1.id).toBe(data.id);
        expect(out1.active).toBe(data.active);
        expect(out1.score).toBeCloseTo(data.score, 5);

        // Both serialized buffers should be identical
        expect(buf1).toEqual(buf2);

        // Roundtrip through both schemas (with float precision tolerance)
        const roundtrip1 = unpack1(pack1(data));
        expect(roundtrip1.name).toBe(data.name);
        expect(roundtrip1.id).toBe(data.id);
        expect(roundtrip1.active).toBe(data.active);
        expect(roundtrip1.score).toBeCloseTo(data.score, 5);

        const roundtrip2 = unpack2(pack2(data));
        expect(roundtrip2.name).toBe(data.name);
        expect(roundtrip2.id).toBe(data.id);
        expect(roundtrip2.active).toBe(data.active);
        expect(roundtrip2.score).toBeCloseTo(data.score, 5);
    });

    test('nested object field order independence', () => {
        // Test with nested objects to ensure deep field ordering is consistent
        const schema1 = object({
            outer1: string(),
            nested: object({
                z: uint8(),
                y: uint8(),
                x: uint8(),
            }),
            outer2: uint32(),
        });

        const schema2 = object({
            nested: object({
                x: uint8(),
                y: uint8(),
                z: uint8(),
            }),
            outer2: uint32(),
            outer1: string(),
        });

        const { pack: pack1, unpack: unpack1 } = build(schema1);
        const { pack: pack2, unpack: unpack2 } = build(schema2);

        const data = {
            outer1: 'test',
            nested: {
                z: 3,
                y: 2,
                x: 1,
            },
            outer2: 999,
        };

        // Cross-schema pack/unpack
        const buf1 = pack1(data);
        const out2 = unpack2(buf1);

        expect(out2).toEqual(data);

        const buf2 = pack2(data);
        const out1 = unpack1(buf2);

        expect(out1).toEqual(data);

        // Both buffers should be identical
        expect(buf1).toEqual(buf2);
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

    test('float16/float32/float64', () => {
        const f16 = build(float16());
        expect(f16.validate(0)).toBe(true);
        expect(f16.validate(1.5)).toBe(true);
        // @ts-expect-error expected failure
        expect(f16.validate('1.5')).toBe(false);

        const f32 = build(float32());
        expect(f32.validate(0)).toBe(true);
        expect(f32.validate(1.5)).toBe(true);
        // @ts-expect-error expected failure
        expect(f32.validate('1.5')).toBe(false);
    });

    test('mixed types tuple', () => {
        const schema = tuple([number(), string(), boolean()]);
        const s = build(schema);

        expect(s.validate([1.5, 'x', true])).toBe(true);

        // @ts-expect-error wrong types
        expect(s.validate([1.5, 2, true])).toBe(false);

        // @ts-expect-error wrong length
        expect(s.validate([1.5, 'x'])).toBe(false);
    });

    test('tuple of tuples', () => {
        const inner = tuple([number(), string()]);
        const schema = tuple([inner, inner]);
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

    test('boolean fields validation in object', () => {
        const s = build(object({ x: boolean(), y: boolean() }));
        expect(s.validate({ x: true, y: false })).toBe(true);
        // @ts-expect-error missing
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

    test('union', () => {
        const pet = union('type', [
            object({ type: literal('dog'), name: string() }),
            object({ type: literal('cat'), name: string() }),
        ]);

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

    test('literal', () => {
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

    test('enumeration', () => {
        const stringEnum = build(object({ value: enumeration(['pending', 'active', 'completed'] as const) }));
        const { validate } = stringEnum;

        expect(validate({ value: 'pending' })).toBe(true);
        expect(validate({ value: 'active' })).toBe(true);
        expect(validate({ value: 'completed' })).toBe(true);

        // @ts-expect-error invalid value
        expect(validate({ value: 'archived' })).toBe(false);
        // @ts-expect-error wrong type
        expect(validate({ value: 1 })).toBe(false);

        const numberEnum = build(object({ value: enumeration([0, 1, 2] as const) }));
        const { validate: validateNum } = numberEnum;

        expect(validateNum({ value: 0 })).toBe(true);
        expect(validateNum({ value: 1 })).toBe(true);
        expect(validateNum({ value: 2 })).toBe(true);

        // @ts-expect-error invalid value
        expect(validateNum({ value: 3 })).toBe(false);
        // @ts-expect-error wrong type
        expect(validateNum({ value: '1' })).toBe(false);

        const mixedEnum = build(object({ value: enumeration(['yes', 1, 'no', 0] as const) }));
        const { validate: validateMixed } = mixedEnum;

        expect(validateMixed({ value: 'yes' })).toBe(true);
        expect(validateMixed({ value: 1 })).toBe(true);
        expect(validateMixed({ value: 'no' })).toBe(true);
        expect(validateMixed({ value: 0 })).toBe(true);

        // @ts-expect-error invalid value
        expect(validateMixed({ value: true })).toBe(false);
        // @ts-expect-error wrong type
        expect(validateMixed({ value: '1' })).toBe(false);
    });

    test('uint8Array', () => {
        // Variable length - type checking
        const { validate: validateVar } = build(uint8Array());
        expect(validateVar(new Uint8Array([1, 2, 3]))).toBe(true);
        expect(validateVar([1, 2, 3] as any)).toBe(false);
        expect(validateVar(null as any)).toBe(false);

        // Fixed length - length checking
        const { validate: validateFixed } = build(uint8Array(3));
        expect(validateFixed(new Uint8Array([1, 2, 3]))).toBe(true);
        expect(validateFixed(new Uint8Array([1, 2]))).toBe(false); // wrong length
        expect(validateFixed(new Uint8Array([1, 2, 3, 4]))).toBe(false);
    });

    test('quaternion', () => {
        const { validate } = build(quat());

        expect(validate([0, 0, 0, 1])).toBe(true);
        expect(validate([0.5, 0.5, 0.5, 0.5])).toBe(true);

        // @ts-expect-error wrong length
        expect(validate([0, 0])).toBe(false);
        // @ts-expect-error wrong type
        expect(validate('quaternion')).toBe(false);
        // @ts-expect-error null
        expect(validate(null)).toBe(false);
    });
});
