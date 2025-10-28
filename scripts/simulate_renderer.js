import { extractVersionAndKey, parseEntries } from '../src/parse.js';
import { diffEntries } from '../src/diff.js';
import { toText } from '../src/format.js';

function makeFiles(list, prefix = '') {
  return list.map((b) => ({ path: prefix + b, basename: b }));
}

const oldList = makeFiles([
  'Almanac-1.21.1-2-neoforge-1.5.0.jar',
  'clientsort-beta-14.jar',
  'mcw-paths-1.1.0neoforge-mc1.21.1.jar',
  'BadOptimizations-2.3.0-1.21.1.jar',
]);

const newList = makeFiles([
  'almanac-1.21.x-neoforge-1.0.2.jar',
  'clientsort-2.1.2.jar',
  'mcw-mcwpaths-1.1.1-mc1.21.1neoforge.jar',
  'badoptimizations-1.21.1.jar',
]);

console.log('=== Old parsed entries ===');
for (const f of oldList) {
  const p = extractVersionAndKey(f.basename);
  console.log(f.basename, '->', p);
}

console.log('\n=== New parsed entries ===');
for (const f of newList) {
  const p = extractVersionAndKey(f.basename);
  console.log(f.basename, '->', p);
}

const oldParsed = parseEntries(oldList);
const newParsed = parseEntries(newList);

const diff = diffEntries(oldParsed, newParsed);

console.log('\n=== Diff (text) ===');
console.log(toText(diff));

console.log('\n=== Structured diff ===');
console.dir(diff, { depth: null });
