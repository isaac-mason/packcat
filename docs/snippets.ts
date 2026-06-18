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

const { pack, packInto, unpack, validate } = build(playerInputSchema);

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
const buf = new Uint8Array(128);
const result = packInto(playerInput, buf, 0);

if (result.ok) {
    console.log(`Packed ${result.size} bytes into existing buffer`);
} else {
    console.log(`Buffer too small: needed ${result.size} bytes`);
}
/* SNIPPET_END: packInto */
