/* Verify NNRuntime loads and predicts the trained MLP models. */
const fs = require('fs');
global.window = {};
require('../js/ml/nn-runtime.js');
const { NNRuntime } = global.window;

const sleep = JSON.parse(fs.readFileSync('js/ml/models/sleep-stager-mlp.json', 'utf8'));
NNRuntime.register('sleep', sleep);
console.log('Sleep model:', sleep.task, sleep.classes, 'metrics', sleep.metrics.accuracy);

/* Deep sleep profile: delta-dominant */
const deep = { delta: 0.68, theta: 0.16, alpha: 0.05, sigma: 0.05, beta: 0.04, gamma: 0.02,
               thetaBeta: 0.16/0.04, deltaTheta: 0.68/0.16, alphaDelta: 0.05/0.68 };
console.log('Deep-sleep input →', NNRuntime.predict('sleep', deep));

/* Wake profile: alpha+beta */
const wake = { delta: 0.20, theta: 0.12, alpha: 0.28, sigma: 0.08, beta: 0.24, gamma: 0.08,
               thetaBeta: 0.12/0.24, deltaTheta: 0.20/0.12, alphaDelta: 0.28/0.20 };
console.log('Wake input →', NNRuntime.predict('sleep', wake));

/* REM profile */
const rem = { delta: 0.22, theta: 0.30, alpha: 0.16, sigma: 0.07, beta: 0.18, gamma: 0.07,
              thetaBeta: 0.30/0.18, deltaTheta: 0.22/0.30, alphaDelta: 0.16/0.22 };
console.log('REM input →', NNRuntime.predict('sleep', rem));

const stress = JSON.parse(fs.readFileSync('js/ml/models/stress-ppg-mlp.json', 'utf8'));
NNRuntime.register('stress', stress);
console.log('\nStress model:', stress.classes, 'acc', stress.metrics.accuracy);
console.log('Low HRV (stressed) →', NNRuntime.predict('stress', { hr: 95, sdnn: 25, rmssd: 18, pnn50: 3 }));
console.log('High HRV (calm) →',   NNRuntime.predict('stress', { hr: 62, sdnn: 65, rmssd: 55, pnn50: 30 }));
