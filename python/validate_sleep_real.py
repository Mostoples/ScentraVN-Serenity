"""
Validate the deployed sleep-stager MLP against REAL Sleep-EDF data.

Dataset: brl028/sleep-edf-30s-epochs (h5: X[N,1,2901] raw EEG, y[N] stage, subject[N])
Sleep-EDF label convention assumed: 0=W, 1=N1, 2=N2, 3=N3, 4=REM

Pipeline:
  1. For each 30s epoch, compute band-power PROPORTIONS via Welch PSD:
       delta .5-4, theta 4-8, alpha 8-13, sigma 12-15, beta 13-30, gamma 30-45
  2. Build the SAME 9-feature vector the model uses
     (delta..gamma, thetaBeta, deltaTheta, alphaDelta)
  3. Run inference with the exported MLP (replicating js/ml/nn-runtime.js math)
  4. Report accuracy, macro-F1, confusion matrix.

This is HONEST external validation: the model was trained on AASM-grounded
SYNTHETIC distributions, so this tells us how well that prior transfers to
real recordings.

Run: py python\validate_sleep_real.py
"""
from __future__ import annotations
import json
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
H5 = ROOT / "research_data" / "sleep_edf" / "sleep_edf_30s_epochs.h5"
MODEL = ROOT / "js" / "ml" / "models" / "sleep-stager-mlp.json"

FS = 100  # Sleep-EDF Fpz-Cz sampling rate
BANDS = {
    "delta": (0.5, 4), "theta": (4, 8), "alpha": (8, 13),
    "sigma": (12, 15), "beta": (13, 30), "gamma": (30, 45),
}
# model class order
CLASSES = ["wake", "n1", "n2", "n3", "rem"]
# Sleep-EDF y → model class index
EDF_TO_MODEL = {0: 0, 1: 1, 2: 2, 3: 3, 4: 4}


def band_proportions(sig, fs=FS):
    from scipy.signal import welch
    sig = np.asarray(sig, dtype=float).ravel()
    if sig.std() == 0:
        return None
    f, p = welch(sig, fs=fs, nperseg=min(len(sig), fs * 2))
    powers = {}
    _trapz = getattr(np, "trapezoid", getattr(np, "trapz", None))
    for b, (lo, hi) in BANDS.items():
        m = (f >= lo) & (f < hi)
        powers[b] = float(_trapz(p[m], f[m])) if m.any() else 0.0
    total = sum(powers.values()) or 1.0
    return {k: v / total for k, v in powers.items()}


def features_from_props(p):
    return [
        p["delta"], p["theta"], p["alpha"], p["sigma"], p["beta"], p["gamma"],
        p["theta"] / (p["beta"] + 1e-6),
        p["delta"] / (p["theta"] + 1e-6),
        p["alpha"] / (p["delta"] + 1e-6),
    ]


# ── Minimal MLP forward pass (mirrors js/ml/nn-runtime.js) ──────────
def relu(v): return np.maximum(0, v)
def softmax(v):
    e = np.exp(v - v.max()); return e / e.sum()
ACT = {"relu": relu, "tanh": np.tanh, "sigmoid": lambda v: 1/(1+np.exp(-v)),
       "linear": lambda v: v, "softmax": softmax}


def predict(model, x):
    if model.get("scaler"):
        mean = np.array(model["scaler"]["mean"]); scale = np.array(model["scaler"]["scale"])
        x = (np.array(x) - mean) / np.where(scale == 0, 1, scale)
    h = np.array(x, dtype=float)
    for layer in model["layers"]:
        W = np.array(layer["W"]); b = np.array(layer["b"])
        h = ACT[layer["act"]](h @ W + b)
    if len(h) == 1:
        h = np.array([1 - h[0], h[0]])
    return int(np.argmax(h)), h


def main():
    import h5py
    model = json.loads(MODEL.read_text())
    print(f"Model: {model.get('task')} · classes {model.get('classes')}")
    print(f"Trained metrics: {model.get('metrics')}\n")

    with h5py.File(H5, "r") as f:
        X = f["X"]; y = f["y"][:]; subj = f["subject"][:]
        N = X.shape[0]

        # Sample a manageable subset for speed (stratified ~6000 epochs)
        rng = np.random.default_rng(0)
        idx = rng.choice(N, size=min(6000, N), replace=False)
        idx.sort()

        y_true, y_pred = [], []
        skipped = 0
        for n, i in enumerate(idx):
            props = band_proportions(X[i])
            if props is None:
                skipped += 1; continue
            feat = features_from_props(props)
            pi, _ = predict(model, feat)
            y_pred.append(pi)
            y_true.append(EDF_TO_MODEL.get(int(y[i]), 0))
            if (n + 1) % 1000 == 0:
                print(f"  processed {n+1}/{len(idx)} ...")

    y_true = np.array(y_true); y_pred = np.array(y_pred)
    from sklearn.metrics import accuracy_score, f1_score, confusion_matrix, classification_report
    acc = accuracy_score(y_true, y_pred)
    f1 = f1_score(y_true, y_pred, average="macro")

    print(f"\n=== REAL Sleep-EDF validation ({len(y_true)} epochs, {skipped} skipped) ===")
    print(f"Accuracy:  {acc:.3f}")
    print(f"Macro-F1:  {f1:.3f}")
    print("\nPer-class report:")
    print(classification_report(y_true, y_pred, target_names=CLASSES,
                                labels=list(range(5)), zero_division=0))
    print("Confusion matrix (rows=true, cols=pred):")
    cm = confusion_matrix(y_true, y_pred, labels=list(range(5)))
    print("        " + "  ".join(f"{c:>5}" for c in CLASSES))
    for i, row in enumerate(cm):
        print(f"{CLASSES[i]:>6}  " + "  ".join(f"{v:>5}" for v in row))

    # Save a validation report next to the model
    report = {
        "dataset": "brl028/sleep-edf-30s-epochs",
        "epochsEvaluated": int(len(y_true)),
        "accuracy": float(acc),
        "macroF1": float(f1),
        "trainedOn": "AASM-grounded synthetic",
        "note": "external real-world validation"
    }
    (MODEL.parent / "sleep-stager-validation.json").write_text(json.dumps(report, indent=2))
    print(f"\nSaved report → {MODEL.parent / 'sleep-stager-validation.json'}")


if __name__ == "__main__":
    main()
