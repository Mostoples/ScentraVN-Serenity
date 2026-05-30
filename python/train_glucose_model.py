"""
Train a PPG → blood-glucose regressor using the pre-cleaned features
from muhammadyasirsaleem/ppg-signal-with-blood-sugar-level-data.

Strategy:
  1. Load clean-dataset.csv (844k rows, features per PPG sample).
  2. Aggregate per (Patient_Id, index) → one row per pulse with stats.
  3. Train Random Forest regressor (scikit-learn).
  4. Export model as plain JSON tree dump readable by js/ml/ml-inference.js.

Output: js/ml/models/glucose-rf.json (compact, no TF.js converter needed)

Run: py python\train_glucose_model.py
"""

from __future__ import annotations
import json, sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split, GroupKFold
from sklearn.metrics import mean_absolute_error, r2_score

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "research_data" / "ppg_glucose"
OUT = ROOT / "js" / "ml" / "models"
OUT.mkdir(parents=True, exist_ok=True)


def find_clean_csv() -> Path:
    for p in DATA_DIR.rglob("clean-dataset.csv"):
        return p
    raise SystemExit("clean-dataset.csv not found. Run kaggle download first.")


FEATURE_ORDER = [
    "Heart_Rate", "Systolic_Peak", "Diastolic_Peak", "Pulse_Area",
    "Age", "Gender", "Height", "Weight"
]


def load_per_patient(csv: Path) -> pd.DataFrame:
    """Aggregate to one row per (Patient_Id, index) — each pulse → one sample."""
    df = pd.read_csv(csv)
    print(f"  raw rows: {len(df):,}")

    # Group by patient & pulse index to collapse the per-sample rows
    g = df.groupby(["Patient_Id", "index"]).agg(
        Heart_Rate=("Heart_Rate", "first"),
        Systolic_Peak=("Systolic_Peak", "first"),
        Diastolic_Peak=("Diastolic_Peak", "first"),
        Pulse_Area=("Pulse_Area", "first"),
        Age=("Age", "first"),
        Gender=("Gender", "first"),
        Height=("Height", "first"),
        Weight=("Weight", "first"),
        Glucose_level=("Glucose_level", "first"),
        Patient_Id_=("Patient_Id", "first"),
    ).reset_index(drop=True)
    print(f"  pulses (samples): {len(g):,}")
    print(f"  unique patients: {g['Patient_Id_'].nunique()}")
    return g


def export_random_forest_to_json(model: RandomForestRegressor, feat_names) -> dict:
    """Dump a sklearn RF as plain JSON (no TF.js, no pickle)."""
    trees = []
    for est in model.estimators_:
        t = est.tree_
        nodes = []
        for node_id in range(t.node_count):
            nodes.append({
                "f": int(t.feature[node_id]) if t.feature[node_id] >= 0 else -1,
                "th": float(t.threshold[node_id]),
                "l": int(t.children_left[node_id]),
                "r": int(t.children_right[node_id]),
                "v": float(t.value[node_id][0][0]),
            })
        trees.append(nodes)
    return {
        "type": "random-forest",
        "features": list(feat_names),
        "trees": trees,
        "n_estimators": len(trees),
    }


def main() -> None:
    csv = find_clean_csv()
    print(f"[1/4] Loading {csv.name} ...")
    df = load_per_patient(csv)
    df = df.dropna(subset=FEATURE_ORDER + ["Glucose_level"])

    # Encode Gender as int if present as text
    if df["Gender"].dtype == object:
        df["Gender"] = df["Gender"].map({"M": 1, "F": 0, "Male": 1, "Female": 0}).fillna(0)

    X = df[FEATURE_ORDER].to_numpy(dtype="float32")
    y = df["Glucose_level"].to_numpy(dtype="float32")
    groups = df["Patient_Id_"].to_numpy()

    # Group-aware split (no patient leakage between train/test)
    gkf = GroupKFold(n_splits=5)
    train_idx, test_idx = next(gkf.split(X, y, groups))
    Xtr, Xte = X[train_idx], X[test_idx]
    ytr, yte = y[train_idx], y[test_idx]

    print(f"[2/4] Train {len(Xtr):,} | Test {len(Xte):,}")
    print(f"  glucose range: {y.min():.0f}–{y.max():.0f} mg/dL  (mean {y.mean():.1f})")

    print("[3/4] Training Random Forest ...")
    model = RandomForestRegressor(
        n_estimators=40, max_depth=10, n_jobs=-1, random_state=42, min_samples_leaf=20
    )
    model.fit(Xtr, ytr)
    yp = model.predict(Xte)
    mae = mean_absolute_error(yte, yp)
    r2 = r2_score(yte, yp)
    print(f"  MAE = {mae:.2f} mg/dL")
    print(f"  R²  = {r2:.3f}")
    print(f"  baseline (predict mean): MAE = {np.mean(np.abs(yte - ytr.mean())):.2f}")

    print("[4/4] Exporting JSON model ...")
    bundle = export_random_forest_to_json(model, FEATURE_ORDER)
    bundle["metrics"] = {"mae": float(mae), "r2": float(r2),
                          "trainSamples": int(len(Xtr)), "testSamples": int(len(Xte))}
    bundle["targetMean"] = float(ytr.mean())
    bundle["targetStd"] = float(ytr.std())

    out_path = OUT / "glucose-rf.json"
    out_path.write_text(json.dumps(bundle))
    size_kb = out_path.stat().st_size / 1024
    print(f"  -> {out_path}  ({size_kb:.0f} KB)")
    print(f"\nLoad in browser via ScentraML.loadJsonRF('glucose', '/js/ml/models/glucose-rf.json')")


if __name__ == "__main__":
    main()
