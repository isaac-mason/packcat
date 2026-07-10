import type { Schema, SchemaType } from './schema';
export type PackIntoResult = {
    ok: boolean;
    size: number;
};
export declare function build<S extends Schema>(schema: S): {
    pack: (value: SchemaType<S>) => Uint8Array;
    packInto: (value: SchemaType<S>, u8: Uint8Array, offset: number) => PackIntoResult;
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
