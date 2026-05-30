import pandas as pd, re
df = pd.read_csv('research_data/eeg_mental/mental-state.csv')
print('shape', df.shape)
lab = df.columns[-1]
print('label col:', lab)
print('label counts:', df[lab].value_counts().to_dict())

cols = [c for c in df.columns[:-1]]
groups = {}
for c in cols:
    key = re.sub(r'\d+', 'N', c)
    groups[key] = groups.get(key, 0) + 1
print('\nTop feature groups:')
for k, v in sorted(groups.items(), key=lambda x: -x[1])[:18]:
    print(f'  {v:4d}  {k}')

# fft & mean & stddev groups (computable from Muse live)
fft = [c for c in cols if c.startswith('fft_')]
mean = [c for c in cols if 'mean_' in c]
std = [c for c in cols if 'stddev_' in c or 'std_' in c]
print('\nfft cols:', len(fft), '| mean cols:', len(mean), '| std cols:', len(std))
print('fft examples:', fft[:6])
