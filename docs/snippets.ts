/* SNIPPET_START: schema */
import { list, number, object, record, string, uint8, type SchemaType } from 'buffcat';

const playerSchema = object({
    name: string(),
    health: number(),
    level: uint8(),
    inventory: record(object({ item: string(), qty: number() })),
    buffs: list(uint8()),
});

type PlayerType = SchemaType<typeof playerSchema>;

/* SNIPPET_END: schema */
