import type { Schema, SchemaType } from './schema';
export declare function build<S extends Schema>(schema: S): {
    pack: (value: SchemaType<S>) => Uint8Array;
    /**
     * Packs `value` into `u8` starting at `offset`, and returns the offset just past the packed value.
     * If that is greater than `u8.length` the value didn't fit: nothing past the end was written, and
     * the return value is the length the buffer needs. Bytes before the end may already be written.
     */
    packInto: (value: SchemaType<S>, u8: Uint8Array, offset: number) => number;
    size: (value: SchemaType<S>) => number;
    unpack: (u8: Uint8Array) => SchemaType<S>;
    validate: (value: SchemaType<S>) => boolean;
    source: {
        pack: string;
        unpack: string;
        validate: string;
        packInto: string;
        size: string;
    };
};
