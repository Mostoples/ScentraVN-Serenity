/**
 * Quick smoke test for PPG + EEG processors with synthetic data.
 * Run: node python/smoke_test_signal.js
 */
global.window = {};
require('../js/signal/ppg-processor.js');
require('../js/signal/ppg-features.js');
require('../js/signal/eeg-features.js');
require('../js/ml/ml-inference.js');

const { PPGProcessor, PPGFeatures, EEGFeatures, ScentraML } = global.window;

console.log('=== PPG smoke test ===');
PPGProcessor.setSampleRate(100);

/* Generate 8 seconds of synthetic PPG: HR 75 bpm + small noise */
const fs = 100;
const duration = 8;
const N = fs * duration;
const red = [], ir = [];
const beatInterval = 60 / 75;          // s
for (let i = 0; i < N; i++) {
  const t = i / fs;
  /* Gaussian-shaped pulse every beatInterval */
  const phase = (t % beatInterval) / beatInterval;
  const pulse = Math.exp(-Math.pow((phase - 0.15) / 0.06, 2)) * 1000
              + Math.exp(-Math.pow((phase - 0.40) / 0.10, 2)) * 350;
  red.push(8000 + pulse + (Math.random() - 0.5) * 50);
  ir.push(12000 + pulse * 1.1 + (Math.random() - 0.5) * 60);
}
PPGProcessor.pushSamples(red, ir, Date.now() - duration * 1000);
console.log('PPG metrics:', PPGProcessor.getMetrics());

console.log('\n=== EEG smoke test ===');
const fakePowers = { delta: 18, theta: 8, alpha: 12, smr: 4, beta: 6, gamma: 1.5 };
console.log('Sleep stage:', EEGFeatures.classifySleepStage(fakePowers),
            '(', EEGFeatures.sleepStageLabel(EEGFeatures.classifySleepStage(fakePowers)), ')');
console.log('Engagement:', EEGFeatures.engagementIndex(fakePowers));
console.log('Meditation:', EEGFeatures.meditationIndex(fakePowers));
console.log('FAA (left=10, right=14):', EEGFeatures.frontalAlphaAsymmetry(10, 14));

const sleepEpochs = [
  { stage: 'wake', durationSec: 600 },
  { stage: 'n1',   durationSec: 1200 },
  { stage: 'n2',   durationSec: 8400 },
  { stage: 'n3',   durationSec: 5400 },
  { stage: 'rem',  durationSec: 6000 },
  { stage: 'wake', durationSec: 300 }
];
console.log('Sleep summary:', EEGFeatures.summariseSleep(sleepEpochs));

console.log('\n=== ML smoke test (heuristic fallback) ===');
const features = {
  hr: 78, sdnn: 38, rmssd: 28, pnn50: 8,
  augmentationIdx: 0.18, ppgRiseTime: 175, ppgWidth50: 220,
  spectralEntropy: 4.2, age: 28, bmi: 23
};
console.log('Glucose estimate:', ScentraML.estimateGlucose(features));
console.log('BP estimate:', ScentraML.estimateBP(features));
console.log('Vascular age:', ScentraML.estimateVascularAge(features));
console.log('Stress:', ScentraML.estimateStress({ rmssd: 28, sdnn: 38, lfhf: 2.4, thetaBetaRatio: 7.5, gsr: 45 }));
