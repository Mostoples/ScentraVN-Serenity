"""
Train a small CNN on Sleep-EDF style band-power features for sleep
staging. This is a *reference* pipeline — adapt to your preferred
dataset (Sleep-EDF, jocelyndumlao/eeg-based-real-time-sleep-stage-classifier,
or aidenmerker/eeg-sleep-and-awake-datasets).
"""

from __future__ import annotations
import sys, os, subprocess, json
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "research_data" / "sleep_eeg"
OUT = ROOT / "js" / "ml" / "models" / "sleep-stager"
DATA_DIR.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)

DATASET_SLUG = "umerellous/eeg-sleep-vs-awake-physionet"


def ensure_dataset() -> None:
    if any(DATA_DIR.iterdir()):
        return
    print("Downloading PhysioNet sleep dataset …")
    subprocess.check_call([
        sys.executable, "-m", "kaggle", "datasets", "download",
        "-d", DATASET_SLUG, "-p", str(DATA_DIR), "--unzip",
    ])


def main() -> None:
    ensure_dataset()
    print("This stub demonstrates the training scaffold; please adapt the")
    print("CSV/EDF parser below to the dataset you choose.")
    # 1. Load EEG signal + sleep stage labels (e.g., 30s epochs)
    # 2. Bandpass-filter into delta/theta/alpha/sigma/beta
    # 3. Compute band powers per epoch -> X (N, 5)
    # 4. y = stage label (W, N1, N2, N3, REM)
    # 5. Train tf.keras Sequential([Dense32, Dense16, Dense5 softmax])
    # 6. Save and tfjs-convert.

    print("Adapt and rerun this script when you've selected an EEG corpus.")


if __name__ == "__main__":
    main()
