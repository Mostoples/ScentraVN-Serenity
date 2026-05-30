"""
Train sleep-stager on REAL Sleep-EDF data and export to NNRuntime JSON.

This replaces the synthetic-trained model after external validation showed
the synthetic prior didn't transfer (30% real accuracy). Here we train and
validate on real recordings with a SUBJECT-WISE split (no leakage).

Dataset: brl028/sleep-edf-30s-epochs
Features: 9 band-power-ratio features (same as deployed model contract)

Output: js/ml/models/sleep-stager-mlp.json  (overwrites synthetic version)
        js/ml/models/sleep-stager-validation.json

Run: py python\train_sleep_real.py
"""
from __future__ import annotations
import json
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
H5 = ROOT / "research_data" / "sleep_edf" / "sleep_edf_30s_epochs.h5"
OUT = ROOT / "js" / "ml" / "models"
FEATURES_NPZ = ROOT / "research_data" / "sleep_edf" / "features_cache.npz"

FS = 100
BANDS = {
    "delta": (0.5, 4), "theta": (4, 8), "alpha": (8, 13),
    "sigma": (12, 15), "beta": (13, 30), "gamma": (30, 45),
}
CLASSES = ["wake", "n1", "n2", "n3", "rem"]
FEATURE_ORDER = ["delta", "theta", "alpha", "sigma", "beta", "gamma",
                 "thetaBeta", "deltaTheta", "alphaDelta"]

_trapz = getattr(np, "trapezoid", getattr(np, "trapz", None))


def band_props(sig):
    from scipy.signal import welch
    sig = np.asarray(sig, float).ravel()
    if sig.std() == 0:
        return None
    f, p = welch(sig, fs=FS, nperseg=min(len(sig), FS * 2))
    pw = {}
    for b, (lo, hi) in BANDS.items():
        m = (f >= lo) & (f < hi)
        pw[b] = float(_trapz(p[m], f[m])) if m.any() else 0.0
    tot = sum(pw.values()) or 1.0
    return {k: v / tot for k, v in pw.items()}


def featurize(p):
    return [
        p["delta"], p["theta"], p["alpha"], p["sigma"], p["beta"], p["gamma"],
        p["theta"] / (p["beta"] + 1e-6),
        p["delta"] / (p["theta"] + 1e-6),
        p["alpha"] / (p["delta"] + 1e-6),
    ]


def build_features():
    if FEATURES_NPZ.exists():
        print("[1/4] Loading cached features ...")
        d = np.load(FEATURES_NPZ)
        return d["X"], d["y"], d["subj"]

    import h5py
    print("[1/4] Extracting band-power features from real EEG ...")
    with h5py.File(H5, "r") as f:
        X_raw = f["X"]; y = f["y"][:]; subj = f["subject"][:]
        N = X_raw.shape[0]
        feats, ys, ss = [], [], []
        for i in range(N):
            p = band_props(X_raw[i])
            if p is None:
                continue
            sv = subj[i]
            if isinstance(sv, (bytes, bytearray)):
                sv = sv.decode("utf-8", "ignore")
            feats.append(featurize(p)); ys.append(int(y[i])); ss.append(str(sv))
            if (i + 1) % 5000 == 0:
                print(f"    {i+1}/{N}")
    X = np.array(feats, "float32"); y = np.array(ys); subj = np.array(ss)
    np.savez_compressed(FEATURES_NPZ, X=X, y=y, subj=subj)
    print(f"    cached -> {FEATURES_NPZ}")
    return X, y, subj


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
        "featureOrder": FEATURE_ORDER,
        "scaler": {"mean": scaler.mean_.tolist(), "scale": scaler.scale_.tolist()},
        "layers": layers, "classes": CLASSES, "metrics": metrics,
    }


def main():
    from sklearn.neural_network import MLPClassifier
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import GroupShuffleSplit
    from sklearn.metrics import accuracy_score, f1_score, classification_report, confusion_matrix
    from sklearn.utils.class_weight import compute_sample_weight

    X, y, subj = build_features()
    print(f"[2/4] Dataset: {X.shape[0]} epochs, {len(np.unique(subj))} subjects")

    # Subject-wise split — no subject in both train & test
    gss = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)
    tr, te = next(gss.split(X, y, subj))
    Xtr, Xte, ytr, yte = X[tr], X[te], y[tr], y[te]
    print(f"    train {len(tr)} ({len(np.unique(subj[tr]))} subj) | "
          f"test {len(te)} ({len(np.unique(subj[te]))} subj)")

    scaler = StandardScaler().fit(Xtr)
    clf = MLPClassifier(hidden_layer_sizes=(64, 32), activation="relu",
                        alpha=1e-4, max_iter=300, random_state=42,
                        early_stopping=True, n_iter_no_change=12)
    print("[3/4] Training MLP on real EEG ...")
    clf.fit(scaler.transform(Xtr), ytr)

    yp = clf.predict(scaler.transform(Xte))
    acc = accuracy_score(yte, yp)
    f1 = f1_score(yte, yp, average="macro")
    print(f"\n=== REAL subject-wise validation ===")
    print(f"Accuracy: {acc:.3f}  Macro-F1: {f1:.3f}")
    print(classification_report(yte, yp, target_names=CLASSES,
                                labels=list(range(5)), zero_division=0))
    cm = confusion_matrix(yte, yp, labels=list(range(5)))
    print("Confusion (rows=true):")
    print("        " + "  ".join(f"{c:>5}" for c in CLASSES))
    for i, row in enumerate(cm):
        print(f"{CLASSES[i]:>6}  " + "  ".join(f"{v:>5}" for v in row))

    print("\n[4/4] Exporting model ...")
    bundle = export_mlp(clf, scaler, {
        "accuracy": float(acc), "macroF1": float(f1),
        "trainSamples": int(len(tr)), "testSamples": int(len(te)),
        "subjects": int(len(np.unique(subj))),
        "synthetic": False,
        "dataset": "brl028/sleep-edf-30s-epochs",
        "validation": "subject-wise holdout",
        "note": "trained & validated on REAL Sleep-EDF"
    })
    (OUT / "sleep-stager-mlp.json").write_text(json.dumps(bundle))
    (OUT / "sleep-stager-validation.json").write_text(json.dumps({
        "dataset": "brl028/sleep-edf-30s-epochs",
        "epochsEvaluated": int(len(te)),
        "accuracy": float(acc), "macroF1": float(f1),
        "trainedOn": "real Sleep-EDF (subject-wise split)",
        "note": "honest external validation"
    }, indent=2))
    sz = (OUT / "sleep-stager-mlp.json").stat().st_size / 1024
    print(f"  → sleep-stager-mlp.json ({sz:.0f} KB)")


if __name__ == "__main__":
    main()
