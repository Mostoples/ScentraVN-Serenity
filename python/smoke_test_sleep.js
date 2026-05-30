global.window = {};
const lsStore = {};
global.localStorage = {
  getItem: k => (k in lsStore) ? lsStore[k] : null,
  setItem: (k, v) => { lsStore[k] = String(v); },
  removeItem: k => { delete lsStore[k]; }
};
global.firebase = { firestore: { FieldValue: { serverTimestamp: () => 'TS' } } };

process.on('uncaughtException', e => { console.error('UNCAUGHT', e); });
process.on('unhandledRejection', e => { console.error('UNHANDLED', e); });

require('../js/signal/eeg-features.js');
require('../js/eeg-muse.js');
require('../js/sleep-session.js');

const { MuseEEG, SleepSession } = global.window;
/* In browsers `window.X` is also a global identifier; in Node it isn't.
   Mirror to globals so the IIFE's `typeof MuseEEG` checks succeed. */
global.MuseEEG = MuseEEG;
global.EEGFeatures = global.window.EEGFeatures;

(async () => {
  console.log('--- Sleep session smoke test ---');
  MuseEEG.metrics.powers = { delta: 35, theta: 8, alpha: 4, smr: 2, beta: 2, gamma: 0.5 };

  await SleepSession.start({ source: 'smoke-test' });
  console.log('Started:', SleepSession.sessionId, 'isRunning:', SleepSession.isRunning);

  console.log('Manually capturing 6 epochs:');
  for (let i = 0; i < 6; i++) {
    if (i === 1) MuseEEG.metrics.powers = { delta: 8, theta: 9, alpha: 5, smr: 5, beta: 4, gamma: 1.5 };
    if (i === 2) MuseEEG.metrics.powers = { delta: 5, theta: 9, alpha: 6, smr: 2, beta: 6, gamma: 1 };
    if (i === 3) MuseEEG.metrics.powers = { delta: 6, theta: 5, alpha: 8, smr: 2, beta: 8, gamma: 2 };
    try {
      SleepSession._captureEpoch();
      console.log(`  epoch ${i}: ok, total=${SleepSession.epochs.length}`);
    } catch (e) {
      console.error(`  epoch ${i} threw`, e.message);
    }
  }

  const summary = await SleepSession.stop();
  console.log('Final epochs:', SleepSession.epochs.length);
  console.log('Stages:', SleepSession.epochs.map(e => e.stage).join(','));
  console.log('Summary:', JSON.stringify(summary, null, 2));

  process.exit(0);
})();
