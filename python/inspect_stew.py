import scipy.io as sio
import numpy as np
from pathlib import Path

d = Path('research_data/stew')
for f in sorted(d.glob('*.mat')):
    try:
        m = sio.loadmat(f)
        keys = [k for k in m.keys() if not k.startswith('__')]
        print(f'\n{f.name}: keys={keys}')
        for k in keys:
            v = m[k]
            print(f'  {k}: shape={getattr(v,"shape",None)} dtype={getattr(v,"dtype",None)}')
            if hasattr(v, 'shape') and v.size < 30:
                print('    values:', np.array(v).ravel()[:20])
    except Exception as e:
        print(f'{f.name}: ERROR {e}')
