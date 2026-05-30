import scipy.io as sio
import numpy as np
from pathlib import Path

d = Path('research_data/stew')
for fn in ['dataset.mat', 'class_012.mat', 'rating.mat', 'three_class_one_hot.mat']:
    p = d / fn
    if not p.exists():
        continue
    try:
        m = sio.loadmat(p)
        keys = [k for k in m.keys() if not k.startswith('__')]
        print(f"\n{fn}: keys={keys}")
        for k in keys:
            arr = m[k]
            print(f"  {k}: shape={getattr(arr,'shape',None)} dtype={getattr(arr,'dtype',None)}")
            if hasattr(arr, 'shape') and arr.size < 30:
                print(f"     values: {np.array(arr).ravel()[:20]}")
    except Exception as e:
        print(f"{fn}: error {e}")
