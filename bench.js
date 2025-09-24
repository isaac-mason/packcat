import { boolean, list, number, object, record, serDes, string, uint8, uint16, uint32 } from './dist/index.js';

function now() {
    return performance.now();
}

function bench(name, fn, iterations = 100_000) {
    // warm up
    for (let i = 0; i < 1000; i++) fn();
    const start = now();
    for (let i = 0; i < iterations; i++) fn();
    const end = now();
    const totalMs = end - start;
    console.log(`${name}: ${iterations} ops in ${totalMs.toFixed(2)}ms — ${(iterations / totalMs).toFixed(2)} ops/ms`);
}

// Schemas
const simpleNum = number();
const simpleStr = string();
const objSchema = object({ a: number(), b: string(), c: boolean() });
const listNum = list(number());
const recSchema = record(uint32());
const playerSchema = object({
    id: uint32(),
    name: string(),
    score: number(),
    isActive: boolean(),
    inventory: record(object({ item: uint8(), quantity: uint16() })),
    friends: list(uint32()),
});

// Data
const numVal = 42.5;
const strVal = 'hello world';
const objVal = { a: 123.45, b: 'test', c: true };
const listVal = [1, 2, 3, 4, 5];
const recVal = { a: 1, b: 42, ключ: 7, '😊': 999 };
const playerVal = {
    id: 1,
    name: 'PlayerOne',
    score: 1000,
    isActive: true,
    inventory: {
        potion: { item: 1, quantity: 10 },
        sword: { item: 2, quantity: 1 },
    },
    friends: [2, 3, 4],
};

// SerDes factories
const numberSerDes = serDes(simpleNum);
const stringSerDes = serDes(simpleStr);
const objSerDes = serDes(objSchema);
const listSerDes = serDes(listNum);
const recordSerDes = serDes(recSchema);
const playerSerDes = serDes(playerSchema);

console.log(playerSerDes.source)

console.log('Running benches...');

console.log('---');

bench('ser number', () => numberSerDes.ser(numVal), 100000);
const serNumber = numberSerDes.ser(numVal);
bench('des number', () => numberSerDes.des(serNumber), 100000);

console.log('---');

bench('ser string', () => stringSerDes.ser(strVal), 50000);
const serString = stringSerDes.ser(strVal);
bench('des string', () => stringSerDes.des(serString), 50000);

console.log('---');

bench('ser object', () => objSerDes.ser(objVal), 20000);
const serObject = objSerDes.ser(objVal);
bench('des object', () => objSerDes.des(serObject), 20000);

console.log('---');

bench('ser list', () => listSerDes.ser(listVal), 20000);
const serList = listSerDes.ser(listVal);
bench('des list', () => listSerDes.des(serList), 20000);

console.log('---');

bench('ser record', () => recordSerDes.ser(recVal), 20000);
const serRecord = recordSerDes.ser(recVal);
bench('des record', () => recordSerDes.des(serRecord), 20000);

console.log('---');

bench('ser player', () => playerSerDes.ser(playerVal), 10000);
const serPlayer = playerSerDes.ser(playerVal);
bench('des player', () => playerSerDes.des(serPlayer), 10000);

console.log('---');

// JSON comparison
bench('JSON.stringify object', () => JSON.stringify(objVal), 20000);
const serJsonObject = JSON.stringify(objVal);
bench('JSON.parse object', () => JSON.parse(serJsonObject), 20000);

bench('JSON.stringify list', () => JSON.stringify(listVal), 20000);
const serJsonList = JSON.stringify(listVal);
bench('JSON.parse list', () => JSON.parse(serJsonList), 20000);

bench('JSON.stringify record', () => JSON.stringify(recVal), 20000);
const serJsonRecord = JSON.stringify(recVal);
bench('JSON.parse record', () => JSON.parse(serJsonRecord), 20000);

console.log('---');

console.log('done');
