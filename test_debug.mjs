import { build, record, boolean } from './dist/index.js';

const s = build(record(boolean()));
console.log("Pack source:");
console.log(s.source.pack);
