"""
Train & validate a REAL mental-state classifier on Muse EEG.

Dataset: birdy654/eeg-brainwave-dataset-mental-state
  - 2479 samples, 3 classes (0=concentrating, 1=neutral, 2=relaxed)
  - Muse headband (TP9/AF7/AF8/TP10) — our exact hardware
  - 988 statistical/frequency features

Two models:
  A) FULL  — all numeric features (RandomForest), accuracy ceiling (not deployed)
  B) COMPACT — browser-computable features matching MuseEEG.emotionFeatureVector()
     contract style (band proportions + per-channel stats + asymmetry),
     exported to NNRuntime JSON, DEPLOYED as the real mental-state model.

Class mapping to app vocabulary:
  concentrating → focused
  neutral       → neutral
  relaxed       → relaxed

Run: py python\train_mentalstate_real.py
"""
from __future__ import annotations
import json, re
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
CSV = ROOT / "research_data" / "eeg_mental" / "mental-state.csv"
OUT = ROOT / "js" / "ml" / "models"

# dataset label int → app class
CLASSES = ["focused", "neutral", "relaxed"]
LABEL_MAP = {0: 0, 1: 1, 2: 2}  # 0 concentrating→focused, 1 neutral, 2 relaxed

COMPACT_FEATURES = ["delta", "theta", "alpha", "sigma", "beta", "gamma",
                    "thetaAlpha", "betaAlpha", "engagement", "alphaAsym",
                    "statMean", "statStd", "stdMean", "stdStd", "absMean"]


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


def derive_compact(df):
    """Build the 15-feature browser-computable vector from freq_ + stat columns."""
    cols = [c.strip() for c in df.columns]
    df.columns = cols

    # frequency columns grouped by channel suffix: freq_<bin>_<chan>
    freq_cols = [c for c in cols if re.fullmatch(r'freq_\d+_\d+', c)]
    # group by channel index (last number)
    chan_groups = {}
    for c in freq_cols:
        ch = int(c.split('_')[-1])
        chan_groups.setdefault(ch, []).append(c)
    for ch in chan_groups:
        chan_groups[ch].sort(key=lambda x: int(x.split('_')[1]))

    mean_cols = [c for c in cols if re.match(r'mean_\d+', c)][:8]
    std_cols = [c for c in cols if re.match(r'stddev_\d+', c)][:8]

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

    feats, keep = [], []
    chan_ids = sorted(chan_groups.keys())
    for _, row in df.iterrows():
        per_chan = []
        for ch in chan_ids:
            bp = band_props(row[chan_groups[ch]].to_numpy(float))
            if bp is not None:
                per_chan.append(bp)
        if len(per_chan) < 2:
            keep.append(False); continue
        # average band props across channels
        p = {k: float(np.mean([pc[k] for pc in per_chan])) for k in per_chan[0]}
        # alpha asymmetry: last channel vs first channel alpha
        alphaAsym = per_chan[-1]["alpha"] - per_chan[0]["alpha"]

        mvals = row[mean_cols].to_numpy(float) if mean_cols else np.array([0.0])
        svals = row[std_cols].to_numpy(float) if std_cols else np.array([0.0])

        feats.append([
            p["delta"], p["theta"], p["alpha"], p["sigma"], p["beta"], p["gamma"],
            p["theta"] / (p["alpha"] + 1e-6),
            p["beta"] / (p["alpha"] + 1e-6),
            p["beta"] / (p["alpha"] + p["theta"] + 1e-6),
            alphaAsym,
            float(np.mean(mvals)), float(np.std(mvals)),
            float(np.mean(svals)), float(np.std(svals)),
            float(np.mean(np.abs(mvals))),
        ])
        keep.append(True)
    return np.array(feats, "float32"), np.array(keep)


def main():
    from sklearn.neural_network import MLPClassifier
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, f1_score, classification_report

    print("[1/4] Loading mental-state dataset ...")
    df = pd.read_csv(CSV)
    y = df.iloc[:, -1].astype(int).map(LABEL_MAP).to_numpy()

    print("[2/4] FULL reference model ...")
    Xfull = df.iloc[:, :-1].select_dtypes(include=[np.number]).to_numpy("float32")
    Xtr, Xte, ytr, yte = train_test_split(Xfull, y, test_size=0.25, random_state=42, stratify=y)
    rf = RandomForestClassifier(n_estimators=120, n_jobs=-1, random_state=42)
    rf.fit(Xtr, ytr); yp = rf.predict(Xte)
    full_acc = accuracy_score(yte, yp); full_f1 = f1_score(yte, yp, average="macro")
    print(f"    FULL (RF, {Xfull.shape[1]} feats): acc={full_acc:.3f} f1={full_f1:.3f}")

    print("[3/4] COMPACT browser-computable model ...")
    Xc, keep = derive_compact(df.copy())
    yc = y[keep]
    print(f"    compact samples: {Xc.shape[0]} x {Xc.shape[1]}")
    Xtr, Xte, ytr, yte = train_test_split(Xc, yc, test_size=0.25, random_state=42, stratify=yc)
    scaler = StandardScaler().fit(Xtr)
    clf = MLPClassifier(hidden_layer_sizes=(48, 24), activation="relu",
                        alpha=1e-3, max_iter=500, random_state=42,
                        early_stopping=True, n_iter_no_change=15)
    clf.fit(scaler.transform(Xtr), ytr)
    yp = clf.predict(scaler.transform(Xte))
    acc = accuracy_score(yte, yp); f1 = f1_score(yte, yp, average="macro")
    print(f"    COMPACT (MLP, {Xc.shape[1]} feats): acc={acc:.3f} f1={f1:.3f}")
    print(classification_report(yte, yp, target_names=CLASSES, zero_division=0))

    print("[4/4] Exporting ...")
    bundle = export_mlp(clf, scaler, COMPACT_FEATURES, CLASSES, {
        "accuracy": float(acc), "macroF1": float(f1),
        "fullRefAccuracy": float(full_acc),
        "trainSamples": int(len(Xtr)), "testSamples": int(len(Xte)),
        "synthetic": False,
        "dataset": "birdy654/eeg-brainwave-dataset-mental-state",
        "hardware": "Muse (TP9/AF7/AF8/TP10)",
        "note": "real Muse EEG mental state; concentrating/neutral/relaxed"
    })
    (OUT / "mental-state-mlp.json").write_text(json.dumps(bundle))
    (OUT / "mental-state-validation.json").write_text(json.dumps({
        "dataset": "birdy654/eeg-brainwave-dataset-mental-state",
        "classes": CLASSES,
        "compactAccuracy": float(acc), "compactMacroF1": float(f1),
        "fullReferenceAccuracy": float(full_acc),
        "note": "replaced synthetic model with real Muse-trained model"
    }, indent=2))
    print(f"  -> mental-state-mlp.json ({(OUT/'mental-state-mlp.json').stat().st_size/1024:.0f} KB)")


if __name__ == "__main__":
    main()
