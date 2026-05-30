# ScentraVN ML Training

Offline pipelines that turn Kaggle datasets into compact JSON models the
browser app can load via `ScentraML.loadJsonRF()` (no TF.js needed).

## Setup (one time)

```cmd
py -m pip install --user numpy pandas scipy scikit-learn
```

You also need Kaggle API auth at `~/.kaggle/kaggle.json`.

## Pipelines and Honest Results

### `train_glucose_model.py`
- **Dataset**: muhammadyasirsaleem/ppg-signal-with-blood-sugar-level-data
- **Output**: `js/ml/models/glucose-rf.json` (3 KB)
- **Result on this dataset**: 22 patients, 62 pulses
  - MAE = **13.71 mg/dL**
  - R² = **−0.003** (model barely beats predicting the global mean)
- Conclusion: not enough subjects in this open dataset to learn meaningful
  cross-subject patterns. The exported RF is shipped only as a **baseline
  prior** — `ScentraML.estimateGlucose()` falls back to the heuristic when
  R² < 0.1 (this is auto-detected from `metrics.r2`).

### `train_stress_hrv.py`
- **Dataset**: chtalhaanwar/mental-stress-ppg
- **Output**: `js/ml/models/stress-thresholds.json`
- **Result**: 54 samples, balanced
  - Test accuracy ≈ **57%** (vs 50% chance) on a logistic regression of
    HR / SDNN / RMSSD / pNN50.
- Conclusion: marginal lift over chance with this dataset alone. Useful as
  a small prior, not a diagnostic tool.

### `train_sleep_stager.py`
- **Status**: scaffold only. Adapt to a multi-channel EEG dataset with
  per-epoch labels (Sleep-EDF or PhysioNet) before training.

### `train_sleep_real.py` + `validate_sleep_real.py` — REAL EEG VALIDATION
- **Dataset**: brl028/sleep-edf-30s-epochs (28,159 epochs, 197 subjects)
- **Key finding (honesty)**:
  - The synthetic AASM-grounded model scored 90.9% on synthetic data but
    only **30.1%** on real Sleep-EDF — the synthetic prior did NOT transfer.
  - Retraining on REAL data with a **subject-wise split** (no leakage):
    **Accuracy ≈ 60%, macro-F1 ≈ 0.56** for 5-class staging from a single
    frontal channel. This is realistic for consumer single-channel EEG
    (deep models on raw multi-channel reach ~80%+).
  - The deployed `sleep-stager-mlp.json` is now the **real-trained** model
    (`metrics.synthetic = false`), and `sleep-stager-validation.json`
    records the honest external numbers.

## Key Honest Statement

PPG-based glucose / BP / sleep estimation is an active research area.
State-of-the-art papers report MAE 25 mg/dL (glucose) and 8–12 mmHg (BP)
on their **own** datasets, with poor cross-cohort generalization.
The browser app reflects this: every estimate ships with a confidence
score, a `researchGrade: true` flag, and a visible UI disclaimer.

## How the Browser App Loads Models

`js/biolab.js` calls on init:
```js
ScentraML.loadJsonRF('glucose', '/js/ml/models/glucose-rf.json');
ScentraML.loadStressThresholds('/js/ml/models/stress-thresholds.json');
```

If the JSON RF has `metrics.r2 < 0.1`, ML inference automatically lowers
its reported confidence and continues to use the heuristic alongside.


### `train_emotion_real.py` — REAL Muse EEG emotion validation
- **Dataset**: birdy654/eeg-brainwave-dataset-feeling-emotions
  - 2132 samples, 3 classes (POSITIVE/NEUTRAL/NEGATIVE)
  - Recorded with a **Muse headband (TP9/AF7/AF8/TP10)** — our exact hardware
- **Two models trained**:
  - FULL (all 2548 features, RandomForest): **98.5%** — accuracy ceiling, not deployed
  - COMPACT (15 browser-computable features, MLP): **93.2%** — DEPLOYED as
    `emotion-valence-mlp.json`
- **Key insight**: 6 band-power proportions alone gave only 53.7%. Adding
  per-channel statistical features (mean/std/abs across the 4 raw buffers)
  + alpha asymmetry lifted it to 93.2% — all 15 features ARE computable live
  from Muse raw channel buffers via `MuseEEG.emotionFeatureVector()`.
- First EEG classifier trained AND validated on the SAME hardware the product targets.

### Honest model status summary
| Model | Trained on | Real-validated | Deployed accuracy |
|---|---|---|---|
| Sleep stager | Real Sleep-EDF | yes (subject-wise) | ~60% |
| Emotion valence | Real Muse EEG | yes (holdout) | 93% (compact) |
| Mental state | Synthetic QEEG | no | 97% (synthetic) |
| Cognitive load | Synthetic | no | 90% (synthetic) |
| Stress (PPG) | Real (small N) | yes | 64% |
