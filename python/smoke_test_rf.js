/**
 * Verify the JSON Random Forest loads and predicts in plain Node (no fetch).
 */
const fs = require('fs');
global.window = {};
require('../js/ml/ml-inference.js');
const { ScentraML } = global.window;

/* Manually load JSON since fetch isn't available in Node */
const bundle = JSON.parse(fs.readFileSync('js/ml/models/glucose-rf.json', 'utf8'));
ScentraML.rfModels.glucose = bundle;
ScentraML.modelMeta.glucose = { kind: 'json-rf', metrics: bundle.metrics };

console.log('Loaded RF: trees=' + bundle.trees.length + ', features=' + bundle.features.length);
console.log('Training metrics:', bundle.metrics);

const samples = [
  { hr: 72, age: 30, height: 170, weight: 65, gender: 1 },
  { hr: 90, age: 55, height: 165, weight: 80, gender: 0 },
  { hr: 65, age: 25, height: 180, weight: 75, gender: 1 },
];

for (const f of samples) {
  const r = ScentraML.estimateGlucose(f);
  console.log(`HR=${f.hr} age=${f.age}: ${r.value} ${r.unit} (${r.band}, ${r.method}, conf=${r.confidence})`);
}
