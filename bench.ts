import { serDes, boolean, number, string, list, object, record, uint32 } from './src';

function now() {
    const [s, ns] = process.hrtime();
    return s * 1e3 + ns / 1e6;
}

function bench(name: string, fn: () => void, iterations = 100_000) {
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

// Data
const numVal = 42.5;
const strVal = 'hello world';
const objVal = { a: 123.45, b: 'test', c: true };
const listVal = [1, 2, 3, 4, 5];
const recVal = { a: 1, b: 42, ключ: 7, '😊': 999 };

// SerDes factories
const sn = serDes(simpleNum);
const ss = serDes(simpleStr);
const so = serDes(objSchema);
const sl = serDes(listNum);
const sr = serDes(recSchema);

console.log('Running benches...');

bench('serialize number', () => sn.ser(numVal), 100000);
bench('deserialize number', () => sn.des(sn.ser(numVal)), 100000);

bench('serialize string', () => ss.ser(strVal), 50000);
bench('deserialize string', () => ss.des(ss.ser(strVal)), 50000);

bench('serialize object', () => so.ser(objVal), 20000);
bench('deserialize object', () => so.des(so.ser(objVal)), 20000);

bench('serialize list', () => sl.ser(listVal), 20000);
bench('deserialize list', () => sl.des(sl.ser(listVal)), 20000);

bench('serialize record', () => sr.ser(recVal), 20000);
bench('deserialize record', () => sr.des(sr.ser(recVal)), 20000);

// JSON comparison
bench('JSON.stringify object', () => JSON.stringify(objVal), 20000);
bench('JSON.parse object', () => JSON.parse(JSON.stringify(objVal)), 20000);

bench('JSON.stringify list', () => JSON.stringify(listVal), 20000);
bench('JSON.parse list', () => JSON.parse(JSON.stringify(listVal)), 20000);

bench('JSON.stringify record', () => JSON.stringify(recVal), 20000);
bench('JSON.parse record', () => JSON.parse(JSON.stringify(recVal)), 20000);

console.log('done');
