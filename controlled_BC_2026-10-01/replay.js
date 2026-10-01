"use strict";
// Offline execution of the saved, reviewed modules. No model or API is called.
const fs = require('fs');
const zlib = require('zlib');
const readline = require('readline');
const vm = require('vm');
const [input, moduleFile, output] = process.argv.slice(2);
if (!input || !moduleFile || !output) throw new Error('Usage: node replay.js input.jsonl.gz generated.js output.jsonl');
const code = fs.readFileSync(moduleFile, 'utf8');
const ctx = vm.createContext({module: {exports: {}}, rows: []}, {codeGeneration:{strings:false,wasm:false}});
new vm.Script(code, {filename:'saved_generated_module.js'}).runInContext(ctx,{timeout:1000});
if (typeof ctx.module.exports.transform !== 'function') throw new Error('Missing transform(rows)');
const call = new vm.Script('module.exports.transform(rows)');
const writer = fs.createWriteStream(output, {encoding:'utf8'});
const reader = readline.createInterface({input:fs.createReadStream(input).pipe(zlib.createGunzip()),crlfDelay:Infinity});
let count=0;
async function flush() {
  if (!ctx.rows.length) return;
  const value = call.runInContext(ctx,{timeout:5000});
  const records = Array.isArray(value) ? value : value.records;
  if (!Array.isArray(records) || records.length !== ctx.rows.length) throw new Error('Incorrect row count');
  for (const r of records) {
    if (!writer.write(JSON.stringify(r)+'\n')) await new Promise(resolve=>writer.once('drain',resolve));
    count++;
  }
  ctx.rows=[];
}
(async()=>{
  for await (const line of reader) {
    if (line.trim()) ctx.rows.push(JSON.parse(line));
    if (ctx.rows.length===1000) await flush();
  }
  await flush();
  await new Promise(resolve=>writer.end(resolve));
  process.stdout.write(JSON.stringify({rows:count})+'\n');
})().catch(e=>{console.error(e.message);process.exitCode=1;writer.end();});
