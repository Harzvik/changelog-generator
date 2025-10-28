import { extractVersionAndKey } from '../src/parse.js';
const names = [
  'appliedenergistics2-19.2.17.jar',
  'AppliedEnergistics2-19.2.17.jar',
  'appliedenergistics-2-19.2.17.jar'
];
for (const n of names) {
  console.log(n, '->', extractVersionAndKey(n));
}
