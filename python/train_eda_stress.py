"""
Train & validate an EDA-based stress classifier on WESAD.

Dataset: asmarufoglu/wesad-features (33107 windows, 15 subjects)
  Features per modality (mean/std/min/max/slope/peak_count): EDA, EMG, RESP, TEMP, ECG
  label: WESAD protocol → here 3 classes; we map to binary stress vs non-stress
  subject: for subject-wise split

ScentraVN smartwatch has EDA + skin temp (MLX) + IMU — so we train TWO models:
  A) EDA+TEMP only  → matches our custom smartwatch sensors (DEPLOYED)
  B) ALL modalities → reference ceiling

Output: js/ml/models/eda-stress-mlp.json  (NNRuntime format)

Run: py python\train_eda_stress.py
"""
from __future__ import annotations
import json
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
CSV = ROOT / "research_data" / "wesad" / "wesad_features.csv"
OUT = ROOT / "js" / "ml" / "models"

# WESAD label convention in this CSV: commonly 1=baseline, 2=stress, 3=amusement
# We binarize: stress (label==2) vs non-stress (others)
EDA_TEMP_FEATURES = ["EDA_mean", "EDA_std", "EDA_min", "EDA_max", "EDA_slope",
                     "EDA_peak_count", "TEMP_mean", "TEMP_std", "TEMP_slope"]
CLASSES = ["calm", "stress"]


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


def main():
    from sklearn.neural_network import MLPClassifier
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import GroupShuffleSplit
    from sklearn.metrics import accuracy_score, f1_score, classification_report

    print("[1/4] Loading WESAD ...")
    df = pd.read_csv(CSV)
    # binarize stress
    y = (df["label"].astype(int) == 2).astype(int).to_numpy()
    groups = df["subject"].to_numpy()
    print(f"    rows={len(df)} subjects={len(np.unique(groups))} stress%={y.mean()*100:.1f}")

    # ── A) ALL modalities reference ─────────────────────────────────
    all_feats = [c for c in df.columns if c not in ("label", "subject")]
    Xall = df[all_feats].fillna(0).to_numpy("float32")
    gss = GroupShuffleSplit(n_splits=1, test_size=0.3, random_state=42)
    tr, te = next(gss.split(Xall, y, groups))
    rf = RandomForestClassifier(n_estimators=150, n_jobs=-1, random_state=42)
    rf.fit(Xall[tr], y[tr])
    full_acc = accuracy_score(y[te], rf.predict(Xall[te]))
    full_f1 = f1_score(y[te], rf.predict(Xall[te]), average="macro")
    print(f"[2/4] FULL (all sensors, RF): acc={full_acc:.3f} f1={full_f1:.3f}")

    # ── B) EDA + TEMP only (our smartwatch) ─────────────────────────
    X = df[EDA_TEMP_FEATURES].fillna(0).to_numpy("float32")
    tr, te = next(gss.split(X, y, groups))
    Xtr, Xte, ytr, yte = X[tr], X[te], y[tr], y[te]
    scaler = StandardScaler().fit(Xtr)
    clf = MLPClassifier(hidden_layer_sizes=(32, 16), activation="relu",
                        alpha=1e-3, max_iter=600, random_state=42,
                        early_stopping=True, n_iter_no_change=15)
    print("[3/4] Training EDA+TEMP model (subject-wise) ...")
    clf.fit(scaler.transform(Xtr), ytr)
    yp = clf.predict(scaler.transform(Xte))
    acc = accuracy_score(yte, yp); f1 = f1_score(yte, yp, average="macro")
    print(f"    EDA+TEMP (MLP): acc={acc:.3f} f1={f1:.3f}")
    print(classification_report(yte, yp, target_names=CLASSES, zero_division=0))

    print("[4/4] Exporting ...")
    bundle = export_mlp(clf, scaler, EDA_TEMP_FEATURES, CLASSES, {
        "accuracy": float(acc), "macroF1": float(f1),
        "fullRefAccuracy": float(full_acc),
        "trainSamples": int(len(tr)), "testSamples": int(len(te)),
        "subjects": int(len(np.unique(groups))),
        "synthetic": False,
        "dataset": "WESAD (asmarufoglu/wesad-features)",
        "hardware": "EDA + skin-temp (matches ScentraVN smartwatch)",
        "note": "real EDA stress; subject-wise validation"
    })
    (OUT / "eda-stress-mlp.json").write_text(json.dumps(bundle))
    (OUT / "eda-stress-validation.json").write_text(json.dumps({
        "dataset": "WESAD",
        "classes": CLASSES,
        "edaTempAccuracy": float(acc), "edaTempMacroF1": float(f1),
        "allSensorsAccuracy": float(full_acc),
        "validation": "subject-wise holdout",
        "source": "https://github.com/WJMatthew/WESAD ; Schmidt et al. 2018",
        "note": "EDA+TEMP matches custom smartwatch; subject-wise honest"
    }, indent=2))
    print(f"  -> eda-stress-mlp.json ({(OUT/'eda-stress-mlp.json').stat().st_size/1024:.0f} KB)")


if __name__ == "__main__":
    main()
