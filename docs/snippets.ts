/* SNIPPET_START: schema */
import type { SchemaType } from 'buffcat';
import { list, number, object, record, string, uint8 } from 'buffcat';

const playerSchema = object({
    name: string(),
    health: number(),
    level: uint8(),
    inventory: record(object({ item: string(), qty: number() })),
    buffs: list(uint8()),
});

type PlayerType = SchemaType<typeof playerSchema>;

/* SNIPPET_END: schema */

/* SNIPPET_START: serdes */
import { serDes } from 'buffcat';

const playerSerdes = serDes(playerSchema);

const player: PlayerType = {
    name: 'Hero',
    health: 100,
    level: 5,
    inventory: {
        sword: { item: 'Sword', qty: 1 },
        potion: { item: 'Health Potion', qty: 3 },
    },
    buffs: [1, 2, 3],
};

const buffer = playerSerdes.ser(player);

console.log(buffer); // ArrayBuffer

const deserialized = playerSerdes.des(buffer);

console.log(deserialized); // { name: 'Hero', health: 100, level: 5, inventory: { sword: [Object], potion: [Object] }, buffs: [ 1, 2, 3 ] }