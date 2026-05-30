"""
Train & validate a REAL cognitive-load classifier on the STEW dataset.

Dataset: mitulahirwal/...-stew-dataset
  - dataset.mat: (14 channels, 19200 samples, 45 trials) Emotiv EPOC @128Hz, 150s
  - class_012.mat: (45,) workload labels 0=low, 1=mid, 2=high
  - STEW = Simultaneous Task EEG Workload (multitasking SIMKAP)

CHALLENGE: STEW is 14-channel Emotiv, NOT Muse 4-channel. We adapt by:
  1. Selecting the FRONTAL channels closest to Muse's AF7/AF8/TP9/TP10
     (Emotiv EPOC montage: AF3, F7, F8, AF4, T7, T8 ≈ frontal/temporal)
  2. Splitting each 150s trial into 30 non-overlapping 5s windows → more samples
  3. Computing the SAME 15-feature browser contract used by mental-state/emotion
  4. Subject-wise split (trial = subject proxy; 45 trials)

Classes map to app vocabulary: 0→relaxed, 1→focused, 2→overload
(low workload = relaxed, moderate = optimal/focused, high = overload)

Run: py python\train_cogload_real.py
"""
from __future__ import annotations
import json
from pathlib import Path
import numpy as np
import scipy.io as sio
from scipy.signal import welch

ROOT = Path(__file__).resolve().parent.parent
STEW = ROOT / "research_data" / "stew"
OUT = ROOT / "js" / "ml" / "models"

FS = 128                       # Emotiv EPOC sample rate
WIN_SEC = 5
CLASSES = ["relaxed", "focused", "overload"]   # 0=low,1=mid,2=high workload
COMPACT_FEATURES = ["delta", "theta", "alpha", "sigma", "beta", "gamma",
                    "thetaAlpha", "betaAlpha", "engagement", "alphaAsym",
                    "statMean", "statStd", "stdMean", "stdStd", "absMean"]

# Emotiv EPOC 14-ch order: AF3 F7 F3 FC5 T7 P7 O1 O2 P8 T8 FC6 F4 F8 AF4
# Frontal channels approximating Muse AF7/AF8 → indices for AF3(0),AF4(13),F7(1),F8(12)
FRONTAL = [0, 1, 12, 13]
LEFT_FRONTAL = [0, 1]    # AF3, F7  ≈ AF7
RIGHT_FRONTAL = [12, 13] # F8, AF4  ≈ AF8

_trapz = getattr(np, "trapezoid", getattr(np, "trapz", None))


def band_props(sig):
    sig = np.asarray(sig, float).ravel()
    if sig.std() == 0:
        return None
    f, p = welch(sig, fs=FS, nperseg=min(len(sig), FS * 2))
    bands = {"delta": (0.5, 4), "theta": (4, 8), "alpha": (8, 13),
             "sigma": (12, 15), "beta": (13, 30), "gamma": (30, 45)}
    pw = {}
    for b, (lo, hi) in bands.items():
        m = (f >= lo) & (f < hi)
        pw[b] = float(_trapz(p[m], f[m])) if m.any() else 0.0
    tot = sum(pw.values()) or 1.0
    return {k: v / tot for k, v in pw.items()}


def window_features(win):
    """win: (14, WIN_SEC*FS) → 15-feature vector matching browser contract."""
    # Average band props across frontal channels
    props = []
    for ch in FRONTAL:
        bp = band_props(win[ch])
        if bp is not None:
            props.append(bp)
    if len(props) < 2:
        return None
    p = {k: float(np.mean([pc[k] for pc in props])) for k in props[0]}

    # Alpha asymmetry: right-frontal alpha − left-frontal alpha
    la = [band_props(win[c]) for c in LEFT_FRONTAL]
    ra = [band_props(win[c]) for c in RIGHT_FRONTAL]
    la = [x["alpha"] for x in la if x]; ra = [x["alpha"] for x in ra if x]
    alphaAsym = (np.mean(ra) - np.mean(la)) if (la and ra) else 0.0

    # Statistical aggregates across frontal channels (raw amplitude)
    means = [float(np.mean(win[c])) for c in FRONTAL]
    stds = [float(np.std(win[c])) for c in FRONTAL]
    absm = [float(np.mean(np.abs(win[c]))) for c in FRONTAL]

    return [
        p["delta"], p["theta"], p["alpha"], p["sigma"], p["beta"], p["gamma"],
        p["theta"] / (p["alpha"] + 1e-6),
        p["beta"] / (p["alpha"] + 1e-6),
        p["beta"] / (p["alpha"] + p["theta"] + 1e-6),
        float(alphaAsym),
        float(np.mean(means)), float(np.std(means)),
        float(np.mean(stds)), float(np.std(stds)),
        float(np.mean(absm)),
    ]


def build_dataset():
    ds = sio.loadmat(STEW / "dataset.mat")["dataset"]      # (14, 19200, 45)
    labels = sio.loadmat(STEW / "class_012.mat")["class_012"].ravel()  # (45,)
    n_ch, n_samp, n_trials = ds.shape
    win_len = WIN_SEC * FS
    n_win = n_samp // win_len

    X, y, groups = [], [], []
    for t in range(n_trials):
        trial = ds[:, :, t]            # (14, 19200)
        lab = int(labels[t])
        for w in range(n_win):
            seg = trial[:, w * win_len:(w + 1) * win_len]
            fv = window_features(seg)
            if fv is None:
                continue
            X.append(fv); y.append(lab); groups.append(t)
    return np.array(X, "float32"), np.array(y), np.array(groups)


def export_mlp(model, scaler, metrics):
    layers = []
    n = len(model.coefs_)
    for i in range(n):
        act = "softmax" if i == n - 1 else (
            {"logistic": "sigmoid"}.get(model.activation, model.activation))
        layers.append({"W": model.coefs_[i].tolist(),
                       "b": model.intercepts_[i].tolist(), "act": act})
    return {
        "type": "mlp", "task": "classification",
        "featureOrder": COMPACT_FEATURES,
        "scaler": {"mean": scaler.mean_.tolist(), "scale": scaler.scale_.tolist()},
        "layers": layers, "classes": CLASSES, "metrics": metrics,
    }


def main():
    from sklearn.neural_network import MLPClassifier
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import GroupShuffleSplit
    from sklearn.metrics import accuracy_score, f1_score, classification_report

    print("[1/3] Extracting features from STEW (14ch → frontal → 15 feats) ...")
    X, y, groups = build_dataset()
    print(f"    windows: {X.shape[0]} × {X.shape[1]} | trials: {len(np.unique(groups))}")
    print(f"    class balance: {dict(zip(*np.unique(y, return_counts=True)))}")

    # Subject(trial)-wise split — no trial in both train & test
    gss = GroupShuffleSplit(n_splits=1, test_size=0.3, random_state=42)
    tr, te = next(gss.split(X, y, groups))
    Xtr, Xte, ytr, yte = X[tr], X[te], y[tr], y[te]
    print(f"    train {len(tr)} ({len(np.unique(groups[tr]))} trials) | "
          f"test {len(te)} ({len(np.unique(groups[te]))} trials)")

    # Diagnostic: also evaluate a random (non-subject-wise) split to see if
    # features carry ANY signal at all (window-level leakage upper bound).
    from sklearn.model_selection import train_test_split as tts
    Xa, Xb, ya, yb = tts(X, y, test_size=0.3, random_state=42, stratify=y)
    diag_scaler = StandardScaler().fit(Xa)
    diag = MLPClassifier(hidden_layer_sizes=(48, 24), activation="relu",
                         alpha=1e-3, max_iter=600, random_state=42,
                         early_stopping=True).fit(diag_scaler.transform(Xa), ya)
    from sklearn.metrics import accuracy_score as _acc
    diag_acc = _acc(yb, diag.predict(diag_scaler.transform(Xb)))
    print(f"    [diagnostic] random-split accuracy (leaky upper bound): {diag_acc:.3f}")

    scaler = StandardScaler().fit(Xtr)
    clf = MLPClassifier(hidden_layer_sizes=(48, 24), activation="relu",
                        alpha=1e-3, max_iter=600, random_state=42,
                        early_stopping=True, n_iter_no_change=15)
    print("[2/3] Training ...")
    clf.fit(scaler.transform(Xtr), ytr)
    yp = clf.predict(scaler.transform(Xte))
    acc = accuracy_score(yte, yp); f1 = f1_score(yte, yp, average="macro")
    print(f"\n=== REAL STEW trial-wise validation ===")
    print(f"Accuracy: {acc:.3f}  Macro-F1: {f1:.3f}")
    print(classification_report(yte, yp, target_names=CLASSES,
                                labels=[0, 1, 2], zero_division=0))

    print("[3/3] Exporting ...")
    bundle = export_mlp(clf, scaler, {
        "accuracy": float(acc), "macroF1": float(f1),
        "accuracyRandomSplit": float(diag_acc),
        "trainSamples": int(len(tr)), "testSamples": int(len(te)),
        "synthetic": False,
        "dataset": "STEW (mitulahirwal)",
        "hardware": "Emotiv EPOC 14ch → frontal-mapped to Muse contract",
        "note": "real workload EEG; subject-independent ~29%, subject-dependent ~61%"
    })
    (OUT / "cognitive-load-mlp.json").write_text(json.dumps(bundle))
    (OUT / "cognitive-load-validation.json").write_text(json.dumps({
        "dataset": "STEW (Simultaneous Task EEG Workload)",
        "classes": CLASSES,
        "accuracySubjectIndependent": float(acc),
        "accuracySubjectDependent": float(diag_acc),
        "macroF1": float(f1),
        "caveat": "Cross-subject workload from frontal EEG is hard: ~29% "
                  "subject-independent (near chance) vs ~61% subject-dependent. "
                  "Also cross-hardware (Emotiv 14ch → Muse frontal). Treat as "
                  "low-confidence advisory only.",
        "note": "real workload EEG validation — honest negative on generalization"
    }, indent=2))
    print(f"  -> cognitive-load-mlp.json ({(OUT/'cognitive-load-mlp.json').stat().st_size/1024:.0f} KB)")


if __name__ == "__main__":
    main()
