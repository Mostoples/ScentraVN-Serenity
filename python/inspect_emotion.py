import pandas as pd, re
df = pd.read_csv('research_data/eeg_emotion/emotions.csv')
cols = [c.replace('# ', '').strip() for c in df.columns[:-1]]
groups = {}
for c in cols:
    key = re.sub(r'\d+', 'N', c)
    groups[key] = groups.get(key, 0) + 1
for k, v in sorted(groups.items(), key=lambda x: -x[1])[:30]:
    print(f'{v:4d}  {k}')
print('\nTotal feature groups:', len(groups))
# Look specifically for frequency-band related features
band_cols = [c for c in cols if any(b in c.lower() for b in ['fft','freq','_d_','theta','alpha','beta','delta','gamma'])]
print('FFT/band-ish features:', len(band_cols))
print('examples:', band_cols[:10])
