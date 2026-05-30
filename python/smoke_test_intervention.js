/**
 * Verify EEG closed-loop intervention buffer logic.
 * Mocks DOM/Router/MuseEEG and feeds sustained "stressed" metrics.
 */
global.window = {};

// Minimal mocks
let alertShown = null;
global.document = {
  querySelector: () => null,
  createElement: () => ({ style: {}, innerHTML: '', appendChild(){}, querySelector(){return{onclick:null}} }),
  body: { appendChild() {} },
  getElementById: () => ({ onclick: null })
};
global.Router = { navigate: (r) => { console.log('  → navigate:', r); } };
global.Utils = { showToast: () => {} };
global.MuseEEG = { onMetrics: () => {} };
global.auth = null;
global.firebase = null;

require('../js/intervention-engine.js');
const IE = global.window.InterventionEngine;

// Stub showAlert to capture triggers instead of rendering DOM
IE.showAlert = (msg, cb) => { alertShown = msg; console.log('  ALERT:', msg.slice(0, 60) + '...'); };
IE.logInterventionToDB = () => {};

// Init with a baseline
IE.init({ initialPhq9Score: 8 });

console.log('\n=== Test 1: sustained STRESSED (should trigger after buffer fills) ===');
for (let i = 0; i < 6; i++) {
  alertShown = null;
  IE.processEEG({ mentalState: { label: 'stressed', prob: 0.9 }, cognitiveLoad: { label: 'focused', prob: 0.8 } });
  console.log(`  tick ${i+1}: buffer=${IE.eegBuffer.length} triggered=${!!alertShown}`);
}

console.log('\n=== Test 2: sustained OVERLOAD ===');
IE.cooldowns.eeg_overload = 0;
IE.eegBuffer = [];
for (let i = 0; i < 6; i++) {
  alertShown = null;
  IE.processEEG({ mentalState: { label: 'focused', prob: 0.9 }, cognitiveLoad: { label: 'overload', prob: 0.85 } });
}
console.log('  overload triggered:', !!alertShown);

console.log('\n=== Test 3: mixed states (should NOT trigger) ===');
IE.cooldowns.eeg_stress = 0;
IE.eegBuffer = [];
const mix = ['stressed','relaxed','focused','relaxed','focused','relaxed'];
let triggered = false;
mix.forEach(s => {
  alertShown = null;
  IE.processEEG({ mentalState: { label: s, prob: 0.9 }, cognitiveLoad: { label: 'focused', prob: 0.8 } });
  if (alertShown) triggered = true;
});
console.log('  mixed states triggered:', triggered, '(expected: false)');

console.log('\n=== Test 4: low confidence ignored ===');
IE.eegBuffer = [];
IE.processEEG({ mentalState: { label: 'stressed', prob: 0.3 }, cognitiveLoad: { label: 'overload', prob: 0.3 } });
console.log('  buffer after low-conf tick:', IE.eegBuffer.length, '(expected: 0)');
