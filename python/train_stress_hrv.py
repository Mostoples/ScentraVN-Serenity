"""
Train an HRV-based stress classifier from chtalhaanwar/mental-stress-ppg
and dump optimal thresholds for the rule-based fallback in ScentraML.

Output: js/ml/models/stress-thresholds.json
"""

from __future__ import annotations
import os, sys, json, subprocess
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "research_data"
OUT = ROOT / "js" / "ml" / "models" / "stress-thresholds.json"
OUT.parent.mkdir(parents=True, exist_ok=True)


def ensure() -> None:
    csv = DATA_DIR / "data.csv"
    if csv.exists():
        return
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    subprocess.check_call([
        sys.executable, "-m", "kaggle", "datasets", "download",
        "-d", "chtalhaanwar/mental-stress-ppg",
        "-p", str(DATA_DIR), "--unzip",
    ])


def features_per_row(row, fs: int = 64):
    sig = pd.to_numeric(row.iloc[2:], errors="coerce").dropna().to_numpy()
    if len(sig) < fs * 4:
        return None
    from scipy.signal import find_peaks
    sig = sig - np.mean(sig)
    pk, _ = find_peaks(sig, distance=fs * 0.4, prominence=np.std(sig) * 0.4)
    rr = np.diff(pk) * (1000.0 / fs)
    rr = rr[(rr > 300) & (rr < 2000)]
    if len(rr) < 6:
        return None
    return {
        "hr": 60000.0 / np.mean(rr),
        "sdnn": float(np.std(rr)),
        "rmssd": float(np.sqrt(np.mean(np.diff(rr) ** 2))),
        "pnn50": float(np.mean(np.abs(np.diff(rr)) > 50) * 100),
        "label": str(row["labels"]).strip().lower(),
    }


def main() -> None:
    ensure()
    df = pd.read_csv(DATA_DIR / "data.csv")
    rows = [r for r in (features_per_row(row) for _, row in df.iterrows()) if r]
    feat = pd.DataFrame(rows)
    if feat.empty:
        raise SystemExit("No features extracted.")

    print(f"Samples: {len(feat)}; class balance:")
    print(feat["label"].value_counts())

    from sklearn.model_selection import train_test_split
    from sklearn.linear_model import LogisticRegression
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import classification_report

    feat["target"] = (feat["label"] == "stress").astype(int)
    X = feat[["hr", "sdnn", "rmssd", "pnn50"]].to_numpy()
    y = feat["target"].to_numpy()
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, stratify=y, random_state=0)

    scaler = StandardScaler().fit(Xtr)
    clf = LogisticRegression(max_iter=200, class_weight="balanced").fit(scaler.transform(Xtr), ytr)

    yp = clf.predict(scaler.transform(Xte))
    print(classification_report(yte, yp, target_names=["normal", "stress"]))

    # Suggest a sensible RMSSD threshold from data
    median_rmssd_normal = float(feat[feat.target == 0].rmssd.median())
    median_rmssd_stress = float(feat[feat.target == 1].rmssd.median())
    rmssd_cutoff = (median_rmssd_normal + median_rmssd_stress) / 2

    OUT.write_text(json.dumps({
        "rmssdCutoff": rmssd_cutoff,
        "medianRmssdNormal": median_rmssd_normal,
        "medianRmssdStress": median_rmssd_stress,
        "logisticCoef": clf.coef_.tolist(),
        "logisticIntercept": clf.intercept_.tolist(),
        "scalerMean": scaler.mean_.tolist(),
        "scalerScale": scaler.scale_.tolist(),
    }, indent=2))
    print(f"Thresholds written to {OUT}")


if __name__ == "__main__":
    main()
