/* SNIPPET_START: schema */
import type { SchemaType } from 'packcat';
import { boolean, float32, list, literal, object, uint32, union } from 'packcat';

const playerInputSchema = object({
    frame: uint32(),
    nipple: list(float32(), 2),
    buttons: object({
        jump: boolean(),
        sprint: boolean(),
        crouch: boolean(),
    }),
    cmd: list(
        union('type', [
            // literals are not included in the serialised data, only used for discrimination
            object({ type: literal('interact') }),
            object({ type: literal('use'), primary: boolean(), secondary: boolean() }),
        ] as const),
    ),
});

type PlayerInputType = SchemaType<typeof playerInputSchema>;

/* SNIPPET_END: schema */

/* SNIPPET_START: serdes */
import { build } from 'packcat';

const { pack, packInto, size, unpack, validate } = build(playerInputSchema);

const playerInput: PlayerInputType = {
    frame: 1,
    nipple: [0, 1],
    buttons: { jump: true, sprint: false, crouch: true },
    cmd: [{ type: 'interact' }, { type: 'use', primary: true, secondary: false }],
};

const u8 = pack(playerInput);

console.log(u8); // Uint8Array

const value = unpack(u8);

console.log(value); // { frame: 1, nipple: [ 0, 1 ], buttons: { jump: true, sprint: false, crouch: true }, cmd: [ { type: 'interact' }, { type: 'use', primary: true, secondary: false } ] }
/* SNIPPET_END: serdes */

/* SNIPPET_START: validate */
console.log(validate(playerInput)); // true

// @ts-expect-error this doesn't conform to the schema type!
console.log(validate({ foo: 'bar' })); // false
/* SNIPPET_END: validate */

/* SNIPPET_START: packInto */
let buf = new Uint8Array(128);
let end = packInto(playerInput, buf, 0);

if (end > buf.length) {
    // didn't fit: `end` is the length the buffer needs, so grow it and pack again
    buf = new Uint8Array(end);
    end = packInto(playerInput, buf, 0);
}

console.log(buf.subarray(0, end)); // the packed bytes

// packInto returns where the value ended, so several values can be packed back to back
const frame = new Uint8Array(256);
let offset = 0;
offset = packInto(playerInput, frame, offset);
offset = packInto(playerInput, frame, offset);
/* SNIPPET_END: packInto */

/* SNIPPET_START: size */
// use `size` to find out how many bytes a value needs before you have a buffer to pack into
const byteLength = size(playerInput);

const preAllocated = new Uint8Array(byteLength);
packInto(playerInput, preAllocated, 0); // guaranteed to fit
/* SNIPPET_END: size */
