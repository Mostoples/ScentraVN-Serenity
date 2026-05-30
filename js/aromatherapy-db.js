/**
 * ScentraVN Serenity — Aromatherapy Database
 *
 * Kemiri (candlenut) oil is the PRIMARY implemented product (base/carrier).
 * Essential oils are recommendable additives/blends mapped to emotional &
 * physiological states.
 *
 * ⚠️  Wellness / complementary use only. Aromatherapy evidence is limited
 *     and mixed; this is NOT a medical treatment. Patch-test before skin use,
 *     avoid in pregnancy / asthma / epilepsy without professional advice,
 *     never ingest essential oils.
 *
 * `targets` = therapeutic directions the oil supports, scored 0..1:
 *    calm        — reduces anxiety/stress/tension
 *    uplift      — improves low mood / sadness / low cheerfulness
 *    ground      — eases anger / frustration / restlessness
 *    energize    — counters drowsiness / fatigue / low energy
 *    focus       — supports concentration / reduces overload
 *    sleep       — promotes relaxation toward sleep
 *    appetite    — helps regulate stress-eating / appetite balance
 */

(() => {
  'use strict';

  const AROMA_DB = [
    {
      id: 'kemiri',
      name: 'Minyak Kemiri',
      scientificName: 'Aleurites moluccanus',
      kind: 'carrier',                 /* base / carrier oil */
      primary: true,                   /* the implemented product */
      origin: 'Indonesia (tradisional)',
      aromaProfile: 'Hangat, ringan, sedikit pekat (nutty, earthy)',
      targets: { calm: 0.4, ground: 0.6, uplift: 0.2, energize: 0.1, focus: 0.2, sleep: 0.3, appetite: 0.2 },
      evidence: 'traditional',
      notes: 'Dipakai turun-temurun di Indonesia untuk pijat, nutrisi kulit & rambut. Sebagai carrier, kemiri ideal untuk mengencerkan minyak esensial pada pijat relaksasi.',
      usage: 'Pakai sebagai base pijat (2-3 sdm) lalu tambahkan 3-5 tetes minyak esensial sesuai rekomendasi. Hangatkan di telapak tangan, pijat lembut bahu/leher/pelipis.',
      caution: 'Hentikan bila iritasi. Hindari area mata.'
    },
    {
      id: 'lavender',
      name: 'Lavender',
      scientificName: 'Lavandula angustifolia',
      kind: 'essential',
      aromaProfile: 'Floral, herbal, menenangkan',
      targets: { calm: 0.95, sleep: 0.85, ground: 0.5, uplift: 0.3, focus: 0.3, energize: 0.05, appetite: 0.3 },
      evidence: 'moderate',
      notes: 'Salah satu minyak esensial paling diteliti untuk relaksasi & kualitas tidur (Silexan studies untuk ansietas).',
      usage: 'Diffuser 3-5 tetes, atau blend dengan kemiri untuk pijat malam hari.',
      caution: 'Umumnya aman; encerkan untuk kulit sensitif.'
    },
    {
      id: 'sweet-orange',
      name: 'Sweet Orange',
      scientificName: 'Citrus sinensis',
      kind: 'essential',
      aromaProfile: 'Manis, segar, cerah (citrus)',
      targets: { uplift: 0.9, calm: 0.55, energize: 0.5, ground: 0.2, focus: 0.3, sleep: 0.2, appetite: 0.5 },
      evidence: 'limited',
      notes: 'Aroma citrus dikaitkan dengan peningkatan suasana hati & penurunan kecemasan ringan.',
      usage: 'Diffuser pagi/siang untuk mood, atau blend kemiri untuk pijat menyegarkan.',
      caution: 'Fototoksik ringan — hindari paparan matahari langsung pasca pemakaian kulit.'
    },
    {
      id: 'bergamot',
      name: 'Bergamot',
      scientificName: 'Citrus bergamia',
      kind: 'essential',
      aromaProfile: 'Citrus floral, kompleks',
      targets: { uplift: 0.85, calm: 0.7, ground: 0.4, focus: 0.4, energize: 0.4, sleep: 0.3, appetite: 0.4 },
      evidence: 'moderate',
      notes: 'Dikaji untuk perbaikan mood & penurunan stres (kortisol). Cocok untuk kombinasi cemas + mood rendah.',
      usage: 'Diffuser, inhalasi, atau blend kemiri.',
      caution: 'Fototoksik — gunakan bergamot FCF bila untuk kulit.'
    },
    {
      id: 'peppermint',
      name: 'Peppermint',
      scientificName: 'Mentha piperita',
      kind: 'essential',
      aromaProfile: 'Mentol, tajam, menyegarkan',
      targets: { energize: 0.9, focus: 0.85, appetite: 0.7, uplift: 0.4, calm: 0.2, ground: 0.1, sleep: 0.0 },
      evidence: 'moderate',
      notes: 'Inhalasi peppermint dikaitkan dengan kewaspadaan, fokus, dan penurunan keinginan ngemil (appetite suppression ringan).',
      usage: 'Inhalasi saat kantuk/overload. Blend kemiri untuk pijat pelipis (hati-hati area mata).',
      caution: 'Hindari pada anak kecil & dekat wajah bayi. Bisa terlalu kuat menjelang tidur.'
    },
    {
      id: 'chamomile',
      name: 'Roman Chamomile',
      scientificName: 'Chamaemelum nobile',
      kind: 'essential',
      aromaProfile: 'Apel, herbal, lembut',
      targets: { calm: 0.85, sleep: 0.8, ground: 0.7, uplift: 0.3, focus: 0.2, energize: 0.05, appetite: 0.3 },
      evidence: 'limited',
      notes: 'Tradisional untuk menenangkan & meredakan iritabilitas/kemarahan.',
      usage: 'Diffuser malam, blend kemiri untuk pijat relaksasi.',
      caution: 'Hindari bila alergi tanaman keluarga Asteraceae (ragweed).'
    },
    {
      id: 'frankincense',
      name: 'Frankincense',
      scientificName: 'Boswellia carterii',
      kind: 'essential',
      aromaProfile: 'Resin, hangat, meditatif',
      targets: { ground: 0.9, calm: 0.75, focus: 0.6, sleep: 0.5, uplift: 0.4, energize: 0.1, appetite: 0.2 },
      evidence: 'limited',
      notes: 'Sering dipakai dalam meditasi; membantu memperlambat napas & menenangkan pikiran yang berlebih.',
      usage: 'Diffuser saat meditasi/overload, blend kemiri untuk grounding.',
      caution: 'Umumnya aman; encerkan untuk kulit.'
    },
    {
      id: 'ylang-ylang',
      name: 'Ylang-Ylang',
      scientificName: 'Cananga odorata',
      kind: 'essential',
      aromaProfile: 'Floral pekat, manis',
      targets: { uplift: 0.8, calm: 0.7, ground: 0.5, sleep: 0.4, focus: 0.2, energize: 0.2, appetite: 0.2 },
      evidence: 'limited',
      notes: 'Dikaitkan dengan penurunan tekanan darah & ketegangan, peningkatan suasana hati.',
      usage: 'Diffuser sore/malam, blend kemiri (sedikit saja — aromanya kuat).',
      caution: 'Aroma kuat bisa memicu sakit kepala bila berlebih.'
    },
    {
      id: 'vetiver',
      name: 'Vetiver',
      scientificName: 'Chrysopogon zizanioides',
      kind: 'essential',
      aromaProfile: 'Earthy, smoky, dalam',
      targets: { ground: 0.95, sleep: 0.7, calm: 0.7, focus: 0.5, uplift: 0.2, energize: 0.05, appetite: 0.2 },
      evidence: 'limited',
      notes: 'Sangat grounding; baik untuk kemarahan/frustrasi & gelisah menjelang tidur.',
      usage: 'Diffuser malam, blend kemiri untuk pijat kaki.',
      caution: 'Aroma sangat kuat & pekat — pakai sedikit.'
    },
    {
      id: 'rosemary',
      name: 'Rosemary',
      scientificName: 'Salvia rosmarinus',
      kind: 'essential',
      aromaProfile: 'Herbal, kamper, segar',
      targets: { focus: 0.9, energize: 0.8, uplift: 0.4, calm: 0.2, ground: 0.3, sleep: 0.0, appetite: 0.3 },
      evidence: 'moderate',
      notes: 'Inhalasi rosemary dikaitkan dengan peningkatan memori & kewaspadaan.',
      usage: 'Diffuser saat belajar/kerja, inhalasi saat beban kognitif tinggi.',
      caution: 'Hindari pada epilepsi & hipertensi tidak terkontrol; hindari kehamilan.'
    },
    {
      id: 'grapefruit',
      name: 'Grapefruit',
      scientificName: 'Citrus paradisi',
      kind: 'essential',
      aromaProfile: 'Citrus segar, sedikit pahit',
      targets: { appetite: 0.85, uplift: 0.7, energize: 0.6, focus: 0.4, calm: 0.3, ground: 0.2, sleep: 0.1 },
      evidence: 'limited',
      notes: 'Populer untuk membantu mengelola keinginan ngemil emosional (emotional eating) & menyegarkan mood.',
      usage: 'Inhalasi saat dorongan ngemil stres muncul; diffuser siang.',
      caution: 'Fototoksik ringan.'
    },
    {
      id: 'sandalwood',
      name: 'Sandalwood',
      scientificName: 'Santalum album',
      kind: 'essential',
      aromaProfile: 'Woody, lembut, hangat',
      targets: { ground: 0.85, calm: 0.8, sleep: 0.6, focus: 0.5, uplift: 0.3, energize: 0.1, appetite: 0.2 },
      evidence: 'limited',
      notes: 'Menenangkan & grounding; baik untuk meditasi dan menurunkan kegelisahan.',
      usage: 'Diffuser saat meditasi/tidur, blend kemiri untuk pijat.',
      caution: 'Umumnya aman; encerkan untuk kulit.'
    }
  ];

  /* Quick lookup */
  const byId = {};
  AROMA_DB.forEach(o => { byId[o.id] = o; });

  const AromaDB = {
    all: AROMA_DB,
    get: (id) => byId[id] || null,
    essentials: () => AROMA_DB.filter(o => o.kind === 'essential'),
    carriers:  () => AROMA_DB.filter(o => o.kind === 'carrier'),
    primary:   () => AROMA_DB.find(o => o.primary) || null,
    /* The 7 therapeutic dimensions */
    DIMENSIONS: ['calm', 'uplift', 'ground', 'energize', 'focus', 'sleep', 'appetite']
  };

  if (typeof window !== 'undefined') window.AromaDB = AromaDB;
  if (typeof module !== 'undefined') module.exports = AromaDB;
})();
