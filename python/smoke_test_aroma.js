/* Verify aromatherapy recommender logic. */
global.window = {};
require('../js/aromatherapy-db.js');
require('../js/aroma-recommender.js');
const { AromaDB, AromaRecommender } = global.window;

console.log('DB oils:', AromaDB.all.length, '| carrier:', AromaDB.primary().name);

function show(title, input) {
  const r = AromaRecommender.recommend(input);
  console.log(`\n=== ${title} ===`);
  console.log('  need:', JSON.stringify(r.need));
  console.log('  dominant:', r.dominant, '(' + r.dominantLabel + ')');
  console.log('  blend:', r.blend.map(b => `${b.name} ${b.drops}d (${b.score})`).join(' + '));
  console.log('  →', r.summary);
}

/* High anxiety + stress */
show('Cemas tinggi + stress EEG', {
  psp5: { cheerfulness: 2, happiness: 2, anger: 3, anxiety: 6, sadness: 4 },
  eeg: { mentalState: { label: 'stressed' } },
  ppg: { stressScore: 80 }, gsr: 75
});

/* Sad / low mood */
show('Mood rendah / sedih', {
  psp5: { cheerfulness: 1, happiness: 1, anger: 2, anxiety: 3, sadness: 6 },
  eeg: { mentalState: { label: 'relaxed' } }
});

/* Drowsy + overload (work) */
show('Ngantuk + beban kognitif', {
  psp5: { cheerfulness: 3, happiness: 3, anger: 2, anxiety: 3, sadness: 2 },
  eeg: { mentalState: { label: 'drowsy' }, cognitiveLoad: { label: 'overload' } }
});

/* Emotional eating */
show('Emotional eating (SEES tinggi)', {
  psp5: { cheerfulness: 3, happiness: 3, anger: 4, anxiety: 5, sadness: 3 },
  sees10: [5,5,4,5,4,5,5,4,5,5], hunger: 9
});

/* Angry */
show('Marah/frustrasi', {
  psp5: { cheerfulness: 3, happiness: 3, anger: 6, anxiety: 3, sadness: 2 }
});
