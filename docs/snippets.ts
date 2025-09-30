/* SNIPPET_START: schema */
import type { SchemaType } from 'packcat';
import { boolean, bools, float32, list, literal, object, uint32, union } from 'packcat';

const playerInputSchema = object({
    frame: uint32(),
    nipple: list(float32(), 2),
    // will be serialised as a bitset
    buttons: bools(['jump', 'sprint', 'crouch'] as const),
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
import { serDes } from 'packcat';

const playerInputSerdes = serDes(playerInputSchema);

const playerInput: PlayerInputType = {
    frame: 1,
    nipple: [0, 1],
    buttons: { jump: true, sprint: false, crouch: true },
    cmd: [{ type: 'interact' }, { type: 'use', primary: true, secondary: false }],
};

const buffer = playerInputSerdes.ser(playerInput);

console.log(buffer); // ArrayBuffer

const deserialized = playerInputSerdes.des(buffer);

console.log(deserialized); // { frame: 1, nipple: [ 0, 1 ], buttons: { jump: true, sprint: false, crouch: true }, cmd: [ { type: 'interact' }, { type: 'use', primary: true, secondary: false } ] }
/* SNIPPET_END: serdes */

/* SNIPPET_START: validate */
console.log(playerInputSerdes.validate(playerInput)); // true

// @ts-expect-error this doesn't conform to the schema type!
console.log(playerInputSerdes.validate({ foo: 'bar' })); // false
/* SNIPPET_END: validate */
