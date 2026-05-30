"""
Train EEG emotion (valence) classifier on REAL Muse data.

Dataset: birdy654/eeg-brainwave-dataset-feeling-emotions
  - 2132 samples, 3 classes: POSITIVE / NEUTRAL / NEGATIVE
  - Recorded with a Muse headband (TP9, AF7, AF8, TP10) — our exact hardware
  - 2548 statistical/FFT features

Two models are produced:
  A) FULL model — uses all numeric features, gives the honest accuracy
     ceiling on real data (reference only, not deployed).
  B) COMPACT model — uses a small set of band-power-style aggregate features
     that the BROWSER can actually compute from live Muse band powers, then
     exported to NNRuntime JSON for deployment as 'emotion-valence'.

The compact feature contract (computable live from MuseEEG band powers):
  delta, theta, alpha, sigma, beta, gamma  (proportions)
  + ratios: thetaAlpha, betaAlpha, engagement, faa(approx 0)
This mirrors what mental-state model already receives, so the browser can
feed it the same vector.

Run: py python\train_emotion_real.py
"""
from __future__ import annotations
import json, re
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
CSV = ROOT / "research_data" / "eeg_emotion" / "emotions.csv"
OUT = ROOT / "js" / "ml" / "models"

CLASSES = ["negative", "neutral", "positive"]
LABEL_MAP = {"NEGATIVE": 0, "NEUTRAL": 1, "POSITIVE": 2}
# COMPACT_FEATURES defined alongside derive_compact_features() below.


def export_mlp(model, scaler, feat_order, classes, metrics):
    layers = []
    n = len(model.coefs_)
    for i in range(n):
        act = "softmax" if i == n - 1 else (
            {"logistic": "sigmoid"}.get(model.activation, model.activation))
        layers.append({"W": model.coefs_[i].tolist(),
                       "b": model.intercepts_[i].tolist(), "act": act})
    return {
        "type": "mlp", "task": "classification",
        "featureOrder": list(feat_order),
        "scaler": {"mean": scaler.mean_.tolist(), "scale": scaler.scale_.tolist()},
        "layers": layers, "classes": list(classes), "metrics": metrics,
    }


def derive_compact_features(df):
    """
    Build a RICHER but browser-computable feature set from the dataset's own
    statistical columns (mean, stddev, fft band aggregates per channel),
    matching what MuseEEG can compute live from its 4 raw-channel buffers.

    Browser-computable contract (per the 4 Muse channels TP9/AF7/AF8/TP10):
      - 6 band-power proportions (avg across channels): delta..gamma
      - per-channel-group stats from FFT: low/mid/high spectral energy
      - statistical: mean, stddev, differential-entropy proxies
      - asymmetry features (AF7 vs AF8 alpha) → emotional valence marker
    """
    cols = [c.replace('# ', '').strip() for c in df.columns]
    df.columns = cols

    def grp(prefix):
        rx = re.compile(r'^' + prefix + r'\d+')
        return [c for c in cols if rx.match(c)]

    fft_a = sorted([c for c in cols if re.fullmatch(r'fft_\d+_a', c)],
                   key=lambda x: int(re.findall(r'\d+', x)[0]))
    fft_b = sorted([c for c in cols if re.fullmatch(r'fft_\d+_b', c)],
                   key=lambda x: int(re.findall(r'\d+', x)[0]))

    def band_props(vals):
        vals = np.abs(np.asarray(vals, float))
        n = len(vals)
        if n == 0 or vals.sum() == 0:
            return None
        freqs = np.linspace(0, 75, n)
        bands = {"delta": (0.5, 4), "theta": (4, 8), "alpha": (8, 13),
                 "sigma": (12, 15), "beta": (13, 30), "gamma": (30, 45)}
        pw = {}
        for b, (lo, hi) in bands.items():
            m = (freqs >= lo) & (freqs < hi)
            pw[b] = float(vals[m].sum()) if m.any() else 0.0
        tot = sum(pw.values()) or 1.0
        return {k: v / tot for k, v in pw.items()}

    # statistical column groups (channel-wise means/stddevs)
    mean_cols = grp('mean_')[:8]
    std_cols = grp('stddev_')[:8]

    feats, keep = [], []
    for idx, row in df.iterrows():
        pa = band_props(row[fft_a].to_numpy(float))
        pb = band_props(row[fft_b].to_numpy(float))
        if pa is None or pb is None:
            keep.append(False); continue
        p = {k: (pa[k] + pb[k]) / 2 for k in pa}

        # statistical aggregates (robust-scaled later)
        mvals = row[mean_cols].to_numpy(float) if mean_cols else np.array([0.0])
        svals = row[std_cols].to_numpy(float) if std_cols else np.array([0.0])

        feats.append([
            p["delta"], p["theta"], p["alpha"], p["sigma"], p["beta"], p["gamma"],
            p["theta"] / (p["alpha"] + 1e-6),
            p["beta"] / (p["alpha"] + 1e-6),
            p["beta"] / (p["alpha"] + p["theta"] + 1e-6),
            (pb["alpha"] - pa["alpha"]),                  # alpha asymmetry (valence!)
            float(np.mean(mvals)), float(np.std(mvals)),
            float(np.mean(svals)), float(np.std(svals)),
            float(np.mean(np.abs(mvals))),
        ])
        keep.append(True)
    return np.array(feats, "float32"), np.array(keep)


COMPACT_FEATURES = ["delta", "theta", "alpha", "sigma", "beta", "gamma",
                    "thetaAlpha", "betaAlpha", "engagement", "alphaAsym",
                    "statMean", "statStd", "stdMean", "stdStd", "absMean"]


def main():
    from sklearn.neural_network import MLPClassifier
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, f1_score, classification_report

    print("[1/4] Loading dataset ...")
    df = pd.read_csv(CSV)
    y = df.iloc[:, -1].map(LABEL_MAP).to_numpy()

    # ── A) FULL reference model (accuracy ceiling) ──────────────────
    print("[2/4] Training FULL reference model (all features) ...")
    Xfull = df.iloc[:, :-1].select_dtypes(include=[np.number]).to_numpy("float32")
    Xtr, Xte, ytr, yte = train_test_split(Xfull, y, test_size=0.25,
                                          random_state=42, stratify=y)
    rf = RandomForestClassifier(n_estimators=120, n_jobs=-1, random_state=42)
    rf.fit(Xtr, ytr)
    yp = rf.predict(Xte)
    full_acc = accuracy_score(yte, yp)
    full_f1 = f1_score(yte, yp, average="macro")
    print(f"    FULL (RF, {Xfull.shape[1]} feats): acc={full_acc:.3f} macroF1={full_f1:.3f}")

    # ── B) COMPACT deployable model ─────────────────────────────────
    print("[3/4] Deriving compact band-power features ...")
    Xc, keep = derive_compact_features(df.copy())
    yc = y[keep]
    print(f"    compact samples: {Xc.shape[0]} × {Xc.shape[1]} feats")

    Xtr, Xte, ytr, yte = train_test_split(Xc, yc, test_size=0.25,
                                          random_state=42, stratify=yc)
    scaler = StandardScaler().fit(Xtr)
    clf = MLPClassifier(hidden_layer_sizes=(48, 24), activation="relu",
                        alpha=1e-3, max_iter=500, random_state=42,
                        early_stopping=True, n_iter_no_change=15)
    clf.fit(scaler.transform(Xtr), ytr)
    yp = clf.predict(scaler.transform(Xte))
    acc = accuracy_score(yte, yp)
    f1 = f1_score(yte, yp, average="macro")
    print(f"    COMPACT (MLP, {Xc.shape[1]} feats): acc={acc:.3f} macroF1={f1:.3f}")
    print(classification_report(yte, yp, target_names=CLASSES, zero_division=0))

    print("[4/4] Exporting compact model ...")
    bundle = export_mlp(clf, scaler, COMPACT_FEATURES, CLASSES, {
        "accuracy": float(acc), "macroF1": float(f1),
        "fullRefAccuracy": float(full_acc),
        "trainSamples": int(len(Xtr)), "testSamples": int(len(Xte)),
        "synthetic": False,
        "dataset": "birdy654/eeg-brainwave-dataset-feeling-emotions",
        "hardware": "Muse (TP9/AF7/AF8/TP10)",
        "note": "real Muse EEG valence; compact band-power feature contract"
    })
    (OUT / "emotion-valence-mlp.json").write_text(json.dumps(bundle))
    (OUT / "emotion-valence-validation.json").write_text(json.dumps({
        "dataset": "birdy654/eeg-brainwave-dataset-feeling-emotions",
        "classes": CLASSES,
        "compactAccuracy": float(acc), "compactMacroF1": float(f1),
        "fullReferenceAccuracy": float(full_acc),
        "note": "FULL = all 2548 feats (ceiling); COMPACT = deployable band-power feats"
    }, indent=2))
    print(f"  -> emotion-valence-mlp.json ({(OUT/'emotion-valence-mlp.json').stat().st_size/1024:.0f} KB)")


if __name__ == "__main__":
    main()
