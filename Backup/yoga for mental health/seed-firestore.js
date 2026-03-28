/**
 * ═══════════════════════════════════════════════════════════════
 *  YOGA FOR MENTAL HEALTH — Firestore Seed Data Script
 *  Based on WHO CC-TM (Yoga) Document (ISBN: 978-81-947026-6-5)
 * ═══════════════════════════════════════════════════════════════
 *
 *  SETUP:
 *  1. npm install firebase-admin
 *  2. Download service account key from Firebase Console
 *  3. Set env: export GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"
 *  4. Run: node seed-firestore.js
 *
 *  This script seeds all reference/static collections:
 *  - yoga_practices (30 documents)
 *  - mental_disorders (9 documents)
 *  - yoga_protocols (4 documents)
 *  - food_items (30 documents)
 *  - research_evidence (8 documents)
 *  - ashtanga_framework (8 documents)
 */

const admin = require("firebase-admin");

// ─── Initialize Firebase Admin ───
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();
const { Timestamp } = admin.firestore;
const now = Timestamp.now();

// ═══════════════════════════════════════════
//  HELPER: Batch writer with auto-commit
// ═══════════════════════════════════════════
class BatchWriter {
  constructor(db) {
    this.db = db;
    this.batch = db.batch();
    this.count = 0;
    this.totalWritten = 0;
  }

  set(ref, data) {
    this.batch.set(ref, data);
    this.count++;
    if (this.count >= 450) {
      return this.commit();
    }
    return Promise.resolve();
  }

  async commit() {
    if (this.count > 0) {
      await this.batch.commit();
      this.totalWritten += this.count;
      console.log(`  ✓ Committed ${this.count} docs (total: ${this.totalWritten})`);
      this.batch = this.db.batch();
      this.count = 0;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  1. YOGA PRACTICES — 30+ practices from the document
// ═══════════════════════════════════════════════════════════════
const yogaPractices = [
  // ── SHATKARMA ──
  {
    id: "practice_jala_neti",
    name: "Jala Neti",
    sanskrit_name: "जल नेति",
    category: "shatkarma",
    posture_type: null,
    ashtanga_limb: "niyama",
    difficulty: "beginner",
    technique: {
      preparation: [
        "Siapkan neti pot dengan air garam hangat (1 sdt garam dalam setengah liter air hangat)",
      ],
      steps: [
        "Duduk dalam posisi Kagasana, jarak kaki 1.5-2 kaki",
        "Condongkan tubuh ke depan dari pinggang bawah",
        "Miringkan kepala ke sisi berlawanan dari lubang hidung yang lebih aktif",
        "Masukkan ujung pot ke lubang hidung yang aktif",
        "Buka mulut sedikit dan bernapas melalui mulut",
        "Biarkan air mengalir masuk melalui satu lubang hidung dan keluar dari lubang lainnya",
        "Setelah setengah air habis, ganti ke lubang hidung lainnya",
        "Bersihkan hidung setelah selesai",
      ],
      rounds: 1,
      hold_seconds: null,
      breathing: "mouth_breathing",
    },
    benefits: [
      "Melarutkan dan membersihkan lendir berlebih dari saluran hidung",
      "Menjaga sinus tetap sehat",
      "Melancarkan sistem pernapasan",
      "Memperbaiki sistem drainase mata",
    ],
    contraindications: [
      "Hipertensi (dengan pengawasan ahli)",
      "Migrain (dengan pengawasan ahli)",
      "Pendarahan hidung",
      "Riwayat operasi hidung",
    ],
    target_disorders: ["disorder_stress", "disorder_anxiety"],
    body_systems: ["respiratory", "nervous"],
    kosha_impact: ["annamaya", "pranamaya"],
    neuro_effects: { serotonin: "neutral", dopamine: "neutral", cortisol: "decrease", oxytocin: "neutral", gaba: "neutral" },
    references: ["Gheranda Samhita i.50, i.51"],
    media: { image_url: null, video_url: null },
    search_tags: ["shatkarma", "neti", "nasal", "cleansing", "sinus", "breathing", "beginner"],
  },
  {
    id: "practice_sutra_neti",
    name: "Sutra Neti",
    sanskrit_name: "सूत्र नेति",
    category: "shatkarma",
    posture_type: null,
    ashtanga_limb: "niyama",
    difficulty: "intermediate",
    technique: {
      preparation: ["Siapkan benang katun berlapis lilin lebah atau kateter karet tipis"],
      steps: [
        "Duduk dalam posisi Kagasana",
        "Masukkan sutra ke lubang hidung yang lebih aktif, dorong perlahan",
        "Ketika benang mencapai belakang tenggorokan, gunakan jari telunjuk dan tengah untuk menangkap dari mulut",
        "Tarik keluar perlahan melalui mulut",
        "Tarik benang maju-mundur beberapa kali perlahan",
        "Keluarkan benang dan ulangi dengan lubang hidung lainnya",
      ],
      rounds: 1,
      hold_seconds: null,
      breathing: "normal",
    },
    benefits: [
      "Membersihkan saluran hidung secara mendalam",
      "Membantu melancarkan aliran udara untuk pranayama",
    ],
    contraindications: [
      "Pendarahan hidung",
      "Ulkus nasal, polip",
      "Kelainan berat septum hidung",
    ],
    target_disorders: ["disorder_stress"],
    body_systems: ["respiratory"],
    kosha_impact: ["annamaya", "pranamaya"],
    neuro_effects: { serotonin: "neutral", dopamine: "neutral", cortisol: "neutral", oxytocin: "neutral", gaba: "neutral" },
    references: ["Gheranda Samhita i.50, i.51"],
    media: { image_url: null, video_url: null },
    search_tags: ["shatkarma", "sutra", "neti", "nasal", "cleansing", "intermediate"],
  },

  // ── STANDING ASANA ──
  {
    id: "practice_tadasana",
    name: "Tadasana (Palm Tree Pose)",
    sanskrit_name: "ताड़ासन",
    category: "asana",
    posture_type: "standing",
    ashtanga_limb: "asana",
    difficulty: "beginner",
    technique: {
      preparation: ["Berdiri tegak di atas tanah dengan kedua kaki rapat"],
      steps: [
        "Saat menarik napas, angkat kedua lengan dengan telapak tangan terbuka",
        "Angkat tumit, berdiri di atas jari kaki",
        "Regangkan seluruh tubuh dari ujung kaki hingga ujung jari tangan",
        "Pertahankan posisi dengan napas normal",
        "Saat menghembuskan napas, turunkan lengan perlahan ke samping tubuh",
        "Rilekskan diri dalam posisi berdiri",
      ],
      rounds: 3,
      hold_seconds: 15,
      breathing: "inhale_up_exhale_down",
    },
    benefits: [
      "Meregangkan otot dan saraf seluruh tubuh",
      "Mengembangkan keseimbangan fisik dan mental",
      "Membantu meningkatkan tinggi badan anak yang sedang tumbuh",
      "Bermanfaat untuk pasien sciatica",
      "Meredakan kongesti saraf tulang belakang",
    ],
    contraindications: [
      "Masalah jantung (hindari mengangkat jari kaki)",
      "Arthritis lutut (hindari mengangkat jari kaki)",
      "Tekanan darah rendah (hati-hati)",
    ],
    target_disorders: ["disorder_stress", "disorder_anxiety", "disorder_depression"],
    body_systems: ["nervous", "musculoskeletal"],
    kosha_impact: ["annamaya", "pranamaya"],
    neuro_effects: { serotonin: "increase", dopamine: "neutral", cortisol: "decrease", oxytocin: "neutral", gaba: "neutral" },
    references: ["Yogarahasya of Nathamuni", "Kiran Tika commentary on Yoga Sutras", "Shree Yoga Kaustubha-25"],
    media: { image_url: null, video_url: null },
    search_tags: ["asana", "standing", "tadasana", "palm tree", "balance", "beginner", "stress", "anxiety"],
  },
  {
    id: "practice_vrikshasana",
    name: "Vrikshasana (Tree Pose)",
    sanskrit_name: "वृक्षासन",
    category: "asana",
    posture_type: "standing",
    ashtanga_limb: "asana",
    difficulty: "beginner",
    technique: {
      preparation: ["Berdiri tegak, kaki rapat, lengan lurus di samping tubuh"],
      steps: [
        "Angkat kaki kanan dan pegang pergelangan kaki dengan tangan kanan",
        "Tekuk kaki kanan dan seimbangkan diri",
        "Letakkan tumit kanan di pangkal paha kiri",
        "Tekan paha dengan telapak kaki kanan, jari kaki menunjuk ke bawah",
        "Satukan kedua telapak tangan di depan dada, lalu angkat perlahan ke atas kepala",
        "Pertahankan keseimbangan",
        "Turunkan tangan dan kembali ke posisi awal",
        "Ulangi dengan kaki sebaliknya",
      ],
      rounds: 3,
      hold_seconds: 20,
      breathing: "normal_steady",
    },
    benefits: [
      "Meningkatkan koordinasi neuro-muskular, keseimbangan, dan kewaspadaan",
      "Meningkatkan fleksibilitas sendi lutut dan pergelangan kaki",
      "Menguatkan otot dan ligamen kaki",
    ],
    contraindications: ["Obesitas", "Arthritis", "Vertigo"],
    target_disorders: ["disorder_anxiety", "disorder_adhd"],
    body_systems: ["nervous", "musculoskeletal"],
    kosha_impact: ["annamaya", "manomaya"],
    neuro_effects: { serotonin: "increase", dopamine: "increase", cortisol: "decrease", oxytocin: "neutral", gaba: "neutral" },
    references: ["Gheranda Samhita-ii.36", "Brihad Yoga Sopana", "Hatha Yoga Samhita-43"],
    media: { image_url: null, video_url: null },
    search_tags: ["asana", "standing", "vrikshasana", "tree", "balance", "concentration", "beginner"],
  },
  {
    id: "practice_katichakrasana",
    name: "Katichakrasana (Lumbar Wheel Pose)",
    sanskrit_name: "कटिचक्रासन",
    category: "asana",
    posture_type: "standing",
    ashtanga_limb: "asana",
    difficulty: "beginner",
    technique: {
      preparation: ["Berdiri tegak, kaki 1-2 inci terpisah"],
      steps: [
        "Rentangkan kedua lengan ke depan dada, telapak tangan saling berhadapan",
        "Ayunkan lengan perlahan ke sisi kanan tubuh",
        "Putar tubuh dari pinggang dan coba bawa lengan ke belakang sejauh mungkin",
        "Saat mengayun ke kanan, lengan kanan tetap lurus, lengan kiri ditekuk",
        "Ulangi ke sisi kiri",
      ],
      rounds: 3,
      hold_seconds: 10,
      breathing: "exhale_twist_inhale_center",
    },
    benefits: [
      "Pinggang menjadi ramping dan lentur",
      "Dada mengembang",
      "Meredakan sembelit",
      "Memperkuat daerah lumbar",
      "Menguatkan bahu, leher, lengan, perut, punggung, dan paha",
    ],
    contraindications: ["Nyeri punggung berat", "Gangguan vertebra dan diskus", "Setelah operasi perut", "Saat menstruasi"],
    target_disorders: ["disorder_stress"],
    body_systems: ["digestive", "musculoskeletal"],
    kosha_impact: ["annamaya"],
    neuro_effects: { serotonin: "neutral", dopamine: "neutral", cortisol: "decrease", oxytocin: "neutral", gaba: "neutral" },
    references: ["A Monograph on Yogasana, MDNIY"],
    media: { image_url: null, video_url: null },
    search_tags: ["asana", "standing", "katichakrasana", "waist", "twist", "beginner"],
  },

  // ── SITTING ASANA ──
  {
    id: "practice_paschimottanasana",
    name: "Paschimottanasana (Seated Forward Bend)",
    sanskrit_name: "पश्चिमोत्तानासन",
    category: "asana",
    posture_type: "sitting",
    ashtanga_limb: "asana",
    difficulty: "intermediate",
    technique: {
      preparation: ["Duduk di tanah, kedua kaki diluruskan ke depan, tangan di samping"],
      steps: [
        "Lemaskan otot punggung dan tekuk tubuh ke depan sejauh mungkin",
        "Pertahankan posisi selama nyaman",
        "Secara bertahap coba pegang ibu jari kaki dengan jari telunjuk tangan masing-masing",
        "Dekatkan dada dan kepala ke kaki semaksimal mungkin",
        "Letakkan siku di samping kaki di tanah",
        "Kembali dengan mengangkat dada dan kepala perlahan",
      ],
      rounds: 3,
      hold_seconds: 30,
      breathing: "exhale_forward_inhale_up",
    },
    benefits: [
      "Meningkatkan api pencernaan, membantu membuat perut rata",
      "Berguna untuk gangguan pencernaan terutama sembelit dan kembung",
      "Menghilangkan kemungkinan sciatica",
    ],
    contraindications: ["Sciatica", "Herniasi diskus (slipped disc)"],
    target_disorders: ["disorder_stress", "disorder_anxiety", "disorder_depression"],
    body_systems: ["digestive", "nervous", "endocrine"],
    kosha_impact: ["annamaya", "pranamaya", "manomaya"],
    neuro_effects: { serotonin: "increase", dopamine: "neutral", cortisol: "decrease", oxytocin: "neutral", gaba: "increase" },
    references: ["Gheranda Samhita-ii.24", "Hatha Yoga Pradipika-i.28"],
    media: { image_url: null, video_url: null },
    search_tags: ["asana", "sitting", "paschimottanasana", "forward bend", "digestion", "stress", "intermediate"],
  },
  {
    id: "practice_ushtrasana",
    name: "Ushtrasana (Camel Pose)",
    sanskrit_name: "उष्ट्रासन",
    category: "asana",
    posture_type: "sitting",
    ashtanga_limb: "asana",
    difficulty: "intermediate",
    technique: {
      preparation: ["Duduk dalam Vajrasana"],
      steps: [
        "Berdiri di atas lutut, buat sedikit jarak antara lutut dan kaki",
        "Saat menarik napas, tekuk ke belakang dengan telapak tangan kanan di tumit kanan dan kiri di tumit kiri",
        "Dalam posisi akhir, paha tegak lurus lantai dan kepala miring ke belakang",
        "Berat badan terdistribusi merata pada lengan dan kaki",
        "Pertahankan posisi 10-30 detik dengan napas normal",
        "Kembali dengan menarik napas, duduk dalam Vajrasana",
      ],
      rounds: 2,
      hold_seconds: 20,
      breathing: "inhale_back_normal_hold",
    },
    benefits: [
      "Meredakan sembelit dan masalah pencernaan",
      "Meregangkan bagian depan leher",
      "Mengatur fungsi kelenjar tiroid",
      "Berguna untuk nyeri punggung, bahu bungkuk, dan leher membulat",
    ],
    contraindications: ["Tekanan darah tinggi", "Penyakit jantung", "Hernia", "Nyeri punggung bawah berat"],
    target_disorders: ["disorder_depression", "disorder_stress"],
    body_systems: ["endocrine", "digestive", "musculoskeletal"],
    kosha_impact: ["annamaya", "pranamaya"],
    neuro_effects: { serotonin: "increase", dopamine: "increase", cortisol: "decrease", oxytocin: "neutral", gaba: "neutral" },
    references: ["Shree Yoga Kaustibha", "Gheranda Samhita-ii.41"],
    media: { image_url: null, video_url: null },
    search_tags: ["asana", "sitting", "ushtrasana", "camel", "backbend", "thyroid", "intermediate"],
  },
  {
    id: "practice_shashankasana",
    name: "Shashankasana (Hare Pose)",
    sanskrit_name: "शशांकासन",
    category: "asana",
    posture_type: "sitting",
    ashtanga_limb: "asana",
    difficulty: "beginner",
    technique: {
      preparation: ["Duduk dalam Vajrasana, tulang belakang tegak"],
      steps: [
        "Lebarkan kedua lutut, ibu jari kaki tetap rapat",
        "Angkat kedua lengan di atas kepala, jarak selebar bahu",
        "Hembuskan napas, tekuk ke depan dari pinggang dengan lengan lurus",
        "Dagu dan lengan menyentuh lantai",
        "Tatap titik di depan dan pertahankan posisi",
        "Kembali ke posisi awal perlahan",
      ],
      rounds: 3,
      hold_seconds: 30,
      breathing: "exhale_forward_normal_hold",
    },
    benefits: [
      "Meningkatkan fungsi kelenjar adrenal",
      "Membantu meredakan gangguan organ reproduksi",
      "Meredakan sembelit",
      "Meredakan nyeri punggung",
    ],
    contraindications: ["Tekanan darah sangat tinggi", "Vertigo", "Herniasi diskus (slipped disc)"],
    target_disorders: ["disorder_stress", "disorder_anxiety"],
    body_systems: ["endocrine", "digestive", "reproductive"],
    kosha_impact: ["annamaya", "pranamaya", "manomaya"],
    neuro_effects: { serotonin: "increase", dopamine: "neutral", cortisol: "decrease", oxytocin: "neutral", gaba: "increase" },
    references: ["Gheranda Samhita-ii.12"],
    media: { image_url: null, video_url: null },
    search_tags: ["asana", "sitting", "shashankasana", "hare", "child", "relaxation", "beginner"],
  },
  {
    id: "practice_vakrasana",
    name: "Vakrasana (Twisted Pose)",
    sanskrit_name: "वक्रासन",
    category: "asana",
    posture_type: "sitting",
    ashtanga_limb: "asana",
    difficulty: "beginner",
    technique: {
      preparation: ["Duduk di tanah dengan kaki diluruskan"],
      steps: [
        "Tekuk kaki kiri dari lutut dan letakkan di samping lutut kanan",
        "Jaga tulang belakang tetap tegak, putar pinggang ke kiri saat menghembuskan napas",
        "Bawa lengan kanan ke sisi kaki kiri",
        "Bawa lengan kiri ke belakang, letakkan telapak tangan di tanah",
        "Pertahankan posisi",
        "Ulangi dari sisi sebaliknya",
      ],
      rounds: 2,
      hold_seconds: 20,
      breathing: "exhale_twist",
    },
    benefits: [
      "Membuat tulang belakang fleksibel dan menguatkan saraf spinal",
      "Merangsang pankreas, berguna untuk diabetes",
      "Meningkatkan kapasitas paru-paru",
    ],
    contraindications: ["Kekakuan tulang belakang (hati-hati)", "Masalah jantung", "Kehamilan"],
    target_disorders: ["disorder_stress", "disorder_depression"],
    body_systems: ["digestive", "endocrine", "respiratory"],
    kosha_impact: ["annamaya", "pranamaya"],
    neuro_effects: { serotonin: "neutral", dopamine: "neutral", cortisol: "decrease", oxytocin: "neutral", gaba: "neutral" },
    references: ["Hathapradipika (versi sederhana Matsyendrasana)"],
    media: { image_url: null, video_url: null },
    search_tags: ["asana", "sitting", "vakrasana", "twist", "spine", "diabetes", "beginner"],
  },
  {
    id: "practice_gomukhasana",
    name: "Gomukhasana (Cow Face Pose)",
    sanskrit_name: "गोमुखासन",
    category: "asana",
    posture_type: "sitting",
    ashtanga_limb: "asana",
    difficulty: "intermediate",
    technique: {
      preparation: ["Duduk tegak, kedua kaki diluruskan ke depan"],
      steps: [
        "Tekuk kaki kiri, letakkan di samping pantat kanan",
        "Tekuk kaki kanan di atas kaki kiri, tumit kanan di samping pantat kiri",
        "Angkat lengan kiri, tekuk di siku, bawa ke belakang bahu",
        "Angkat lengan kanan, tekuk di siku, bawa ke atas dan ke belakang punggung",
        "Kaitkan jari-jari kedua tangan di belakang punggung",
        "Coba tekan kepala ke belakang melawan siku",
        "Tatap ke depan dan pertahankan posisi",
        "Ulangi dengan posisi kaki dan tangan terbalik",
      ],
      rounds: 2,
      hold_seconds: 30,
      breathing: "normal_steady",
    },
    benefits: [
      "Membantu menyembuhkan kram di kaki dan membuat kaki fleksibel",
      "Berguna untuk frozen shoulder, nyeri leher, dan cervical spondylosis",
      "Memperkuat otot punggung dan biceps",
      "Memberi latihan baik untuk paru-paru, membantu penyakit pernapasan",
    ],
    contraindications: ["Wasir berdarah", "Masalah pinggul atau cedera lutut", "Sciatica", "Cedera leher dan bahu"],
    target_disorders: ["disorder_anxiety", "disorder_stress"],
    body_systems: ["respiratory", "musculoskeletal"],
    kosha_impact: ["annamaya", "pranamaya"],
    neuro_effects: { serotonin: "neutral", dopamine: "neutral", cortisol: "decrease", oxytocin: "neutral", gaba: "neutral" },
    references: ["Gheranda Samhita-ii.39", "Hatha Yoga Pradipika-I-20"],
    media: { image_url: null, video_url: null },
    search_tags: ["asana", "sitting", "gomukhasana", "cow face", "shoulder", "flexibility", "intermediate"],
  },

  // ── PRONE ASANA ──
  {
    id: "practice_makarasana",
    name: "Makarasana (Crocodile Pose)",
    sanskrit_name: "मकरासन",
    category: "asana",
    posture_type: "prone",
    ashtanga_limb: "asana",
    difficulty: "beginner",
    technique: {
      preparation: ["Berbaring tengkurap, dagu, dada, dan perut menyentuh tanah"],
      steps: [
        "Lebarkan sedikit kedua kaki, tumit saling berhadapan, jari kaki mengarah ke luar",
        "Letakkan tangan satu per satu di bawah kepala, saling genggam membentuk segitiga",
        "Letakkan dahi di atas tangan dan celupkan wajah ke ruang kosong",
        "Perlahan tutup mata dan rilekskan",
        "Bernapas normal dan pertahankan posisi selama nyaman",
      ],
      rounds: 1,
      hold_seconds: 120,
      breathing: "normal_relaxed",
    },
    benefits: [
      "Baik untuk mengatasi stres dan kecemasan",
      "Membantu masalah nyeri punggung",
      "Bermanfaat untuk slipped disc, sciatica, nyeri punggung bawah",
    ],
    contraindications: ["Cedera punggung, bahu, atau leher", "Tekanan darah tinggi", "Penyakit jantung", "Asma"],
    target_disorders: ["disorder_stress", "disorder_anxiety", "disorder_depression"],
    body_systems: ["nervous", "musculoskeletal"],
    kosha_impact: ["annamaya", "pranamaya", "manomaya"],
    neuro_effects: { serotonin: "increase", dopamine: "neutral", cortisol: "decrease", oxytocin: "neutral", gaba: "increase" },
    references: ["Jaipur Central Museum"],
    media: { image_url: null, video_url: null },
    search_tags: ["asana", "prone", "makarasana", "crocodile", "relaxation", "backpain", "beginner"],
  },
  {
    id: "practice_bhujangasana",
    name: "Bhujangasana (Cobra Pose)",
    sanskrit_name: "भुजंगासन",
    category: "asana",
    posture_type: "prone",
    ashtanga_limb: "asana",
    difficulty: "beginner",
    technique: {
      preparation: ["Berbaring tengkurap, kaki rapat, jari kaki mengarah ke luar, tangan di samping paha"],
      steps: [
        "Tekuk tangan di siku, letakkan telapak tangan di tanah di samping bahu",
        "Bawa dagu ke depan dan letakkan di tanah, tatap ke depan",
        "Perlahan angkat kepala, leher, dan bahu",
        "Angkat badan sampai pusar, angkat dagu setinggi mungkin",
        "Pertahankan posisi selama nyaman",
        "Turunkan badan perlahan, mulai dari bagian atas pusar, dada, bahu, dan dahi ke tanah",
      ],
      rounds: 3,
      hold_seconds: 20,
      breathing: "inhale_up_normal_hold_exhale_down",
    },
    benefits: [
      "Efektif untuk merelokasi slipped disc",
      "Merangsang nafsu makan dan meredakan sembelit",
      "Bermanfaat untuk organ perut terutama hati dan ginjal",
      "Merangsang kelenjar adrenal",
      "Menguatkan ovarium dan uterus, membantu gangguan ginekologi dan menstruasi",
    ],
    contraindications: ["Hernia", "Tukak lambung", "TB usus", "Hipertiroidisme", "Cedera perut"],
    target_disorders: ["disorder_depression", "disorder_stress", "disorder_anxiety"],
    body_systems: ["endocrine", "digestive", "reproductive", "musculoskeletal"],
    kosha_impact: ["annamaya", "pranamaya", "manomaya"],
    neuro_effects: { serotonin: "increase", dopamine: "increase", cortisol: "decrease", oxytocin: "neutral", gaba: "neutral" },
    references: ["Gheranda Samhita. ii.42", "Yoga Rahasya of Nathamuni-ii.14"],
    media: { image_url: null, video_url: null },
    search_tags: ["asana", "prone", "bhujangasana", "cobra", "backbend", "depression", "beginner"],
  },

  // ── SUPINE ASANA ──
  {
    id: "practice_ardha_halasana",
    name: "Ardha Halasana (Half Plough Pose)",
    sanskrit_name: "अर्ध हलासन",
    category: "asana",
    posture_type: "supine",
    ashtanga_limb: "asana",
    difficulty: "beginner",
    technique: {
      preparation: ["Berbaring terlentang, tangan di samping paha, telapak tangan di tanah"],
      steps: [
        "Perlahan angkat kedua kaki bersamaan tanpa menekuk lutut",
        "Berhenti di sudut 30°",
        "Setelah beberapa detik, angkat lebih lanjut ke sudut 60°",
        "Angkat kaki ke sudut 90° — ini posisi akhir Ardha Halasana",
        "Pertahankan posisi selama nyaman",
        "Turunkan kaki perlahan ke 60°, lalu 30°, lalu ke lantai",
      ],
      rounds: 3,
      hold_seconds: 20,
      breathing: "inhale_up_normal_hold",
    },
    benefits: [
      "Bermanfaat untuk dispepsia dan sembelit",
      "Berguna untuk diabetes, wasir, dan gangguan tenggorokan",
    ],
    contraindications: ["Cervical spondylitis", "Kekakuan tulang belakang", "Hipertensi"],
    target_disorders: ["disorder_stress", "disorder_depression"],
    body_systems: ["digestive", "endocrine"],
    kosha_impact: ["annamaya", "pranamaya"],
    neuro_effects: { serotonin: "increase", dopamine: "neutral", cortisol: "decrease", oxytocin: "neutral", gaba: "neutral" },
    references: ["Yoga-rahasya II-7"],
    media: { image_url: null, video_url: null },
    search_tags: ["asana", "supine", "ardha halasana", "half plough", "core", "beginner"],
  },
  {
    id: "practice_sarvangasana",
    name: "Sarvangasana (Shoulder Stand)",
    sanskrit_name: "सर्वांगासन",
    category: "asana",
    posture_type: "supine",
    ashtanga_limb: "asana",
    difficulty: "advanced",
    technique: {
      preparation: ["Berbaring terlentang, tangan lurus di samping paha"],
      steps: [
        "Perlahan angkat kaki tanpa menekuk lutut, berhenti di 30°",
        "Angkat ke 60°, lalu 90°",
        "Tekan tangan, angkat pantat, bawa kaki ke arah kepala",
        "Angkat kaki, perut, dan dada membentuk garis lurus",
        "Letakkan telapak tangan di punggung sebagai penyangga",
        "Letakkan dagu ke dada (jugular notch)",
        "Pertahankan posisi selama nyaman",
        "Kembali perlahan: turunkan pantat, lalu kaki ke 90°, lalu ke lantai",
      ],
      rounds: 1,
      hold_seconds: 60,
      breathing: "normal_steady",
    },
    benefits: [
      "Menghilangkan gejala penuaan dini dan uban",
      "Membantu pengobatan dispepsia, sembelit, hernia, wasir",
      "Berguna untuk masalah kelenjar endokrin",
    ],
    contraindications: ["Tekanan darah tinggi", "Epilepsi", "Nyeri leher", "Sciatica", "Nyeri lumbar"],
    target_disorders: ["disorder_depression", "disorder_stress"],
    body_systems: ["endocrine", "cardiovascular", "nervous"],
    kosha_impact: ["annamaya", "pranamaya", "vijnanamaya"],
    neuro_effects: { serotonin: "increase", dopamine: "increase", cortisol: "decrease", oxytocin: "increase", gaba: "increase" },
    references: ["Asana Pranayama Mudra Bandha, Swami Satyananda Saraswati, p.259"],
    media: { image_url: null, video_url: null },
    search_tags: ["asana", "supine", "sarvangasana", "shoulder stand", "inversion", "endocrine", "advanced"],
  },
  {
    id: "practice_matsyasana",
    name: "Matsyasana (Fish Pose)",
    sanskrit_name: "मत्स्यासन",
    category: "asana",
    posture_type: "supine",
    ashtanga_limb: "asana",
    difficulty: "intermediate",
    technique: {
      preparation: ["Duduk dalam Padmasana/Sukhasana/Dandasana"],
      steps: [
        "Perlahan tekuk ke belakang dan berbaring",
        "Angkat punggung atas dengan bantuan siku dan telapak tangan",
        "Letakkan puncak kepala di tanah",
        "Pegang kaki kiri dengan tangan kanan dan kaki kanan dengan tangan kiri (jika Padmasana)",
        "Lutut harus menyentuh tanah, punggung melengkung",
        "Pertahankan posisi akhir",
        "Kembali: lepas jari kaki, luruskan kepala dengan bantuan tangan, naik perlahan",
        "Rilekskan dalam shavasana",
      ],
      rounds: 1,
      hold_seconds: 30,
      breathing: "deep_chest_breathing",
    },
    benefits: [
      "Memberikan regangan pada usus dan organ perut, efektif meredakan gangguan perut",
      "Memberikan kelegaan untuk asma dan bronkitis",
      "Meredakan nyeri punggung dan cervical spondylitis",
      "Regangan pada leher membantu mengatur fungsi kelenjar tiroid",
    ],
    contraindications: ["Masalah jantung", "Tukak lambung", "Hernia", "Penyakit tulang belakang berat", "Kehamilan"],
    target_disorders: ["disorder_depression", "disorder_stress"],
    body_systems: ["endocrine", "respiratory", "digestive"],
    kosha_impact: ["annamaya", "pranamaya"],
    neuro_effects: { serotonin: "increase", dopamine: "neutral", cortisol: "decrease", oxytocin: "neutral", gaba: "neutral" },
    references: ["Asana Pranayama Mudra Bandha, Swami Satyananda Saraswati, p.187"],
    media: { image_url: null, video_url: null },
    search_tags: ["asana", "supine", "matsyasana", "fish", "thyroid", "chest opening", "intermediate"],
  },
  {
    id: "practice_setubandhasana",
    name: "Setubandhasana (Bridge Pose)",
    sanskrit_name: "सेतुबंधासन",
    category: "asana",
    posture_type: "supine",
    ashtanga_limb: "asana",
    difficulty: "beginner",
    technique: {
      preparation: ["Berbaring terlentang"],
      steps: [
        "Tekuk kedua kaki di lutut, dekatkan tumit ke pantat",
        "Pegang kedua pergelangan kaki dengan kuat, lutut dan kaki dalam satu garis lurus",
        "Tarik napas, perlahan angkat pantat dan badan ke atas membentuk jembatan",
        "Pertahankan posisi 10-30 detik dengan napas normal",
        "Hembuskan napas, perlahan kembali ke posisi awal",
        "Rilekskan dalam Shavasana",
      ],
      rounds: 3,
      hold_seconds: 20,
      breathing: "inhale_up_exhale_down",
    },
    benefits: ["Merilekskan leher", "Menguatkan daerah lumbar dan membuat tulang belakang fleksibel"],
    contraindications: ["Tekanan darah tinggi", "Penyakit jantung", "Tukak lambung"],
    target_disorders: ["disorder_stress", "disorder_anxiety", "disorder_depression"],
    body_systems: ["nervous", "musculoskeletal", "endocrine"],
    kosha_impact: ["annamaya", "pranamaya"],
    neuro_effects: { serotonin: "increase", dopamine: "neutral", cortisol: "decrease", oxytocin: "neutral", gaba: "neutral" },
    references: ["Yogarahasya of Nathamuni"],
    media: { image_url: null, video_url: null },
    search_tags: ["asana", "supine", "setubandhasana", "bridge", "back strength", "beginner"],
  },
  {
    id: "practice_pawanmuktasana",
    name: "Pawanmuktasana (Wind Releasing Pose)",
    sanskrit_name: "पवनमुक्तासन",
    category: "asana",
    posture_type: "supine",
    ashtanga_limb: "asana",
    difficulty: "beginner",
    technique: {
      preparation: ["Berbaring terlentang, kedua kaki diluruskan"],
      steps: [
        "Angkat kaki kanan dan tekuk di lutut",
        "Pegang lutut dengan mengunci kedua lengan",
        "Hembuskan napas dan tahan; perlahan tekan lutut ke dada",
        "Angkat kepala dan tarik lutut lebih dekat sehingga hidung menyentuh lutut",
        "Pertahankan posisi",
        "Kembali: turunkan kepala lalu kaki ke lantai",
        "Ulangi dengan kaki kiri (Ekapada Pawanmuktasana)",
        "Lalu lakukan dengan kedua kaki bersamaan",
      ],
      rounds: 3,
      hold_seconds: 15,
      breathing: "exhale_press_inhale_release",
    },
    benefits: [
      "Meredakan kembung dengan menghilangkan gas beracun dari perut",
      "Mengurangi rasa kembung dan sembelit",
      "Berguna untuk pengobatan impotensi, kesuburan, dan masalah menstruasi",
    ],
    contraindications: ["Tekanan darah tinggi", "Sciatica", "Herniasi diskus (slipped disc)"],
    target_disorders: ["disorder_stress", "disorder_anxiety"],
    body_systems: ["digestive", "reproductive"],
    kosha_impact: ["annamaya"],
    neuro_effects: { serotonin: "neutral", dopamine: "neutral", cortisol: "decrease", oxytocin: "neutral", gaba: "neutral" },
    references: ["Shree Yoga Kaustubha"],
    media: { image_url: null, video_url: null },
    search_tags: ["asana", "supine", "pawanmuktasana", "wind", "digestion", "gas", "beginner"],
  },
  {
    id: "practice_shavasana",
    name: "Shavasana (Corpse Pose)",
    sanskrit_name: "शवासन",
    category: "asana",
    posture_type: "supine",
    ashtanga_limb: "asana",
    difficulty: "beginner",
    technique: {
      preparation: ["Berbaring terlentang, tangan nyaman jauh dari tubuh"],
      steps: [
        "Buat jarak 1-2 kaki antara kedua kaki, jari kaki mengarah ke luar",
        "Letakkan kedua tangan 10 inci dari tubuh, jari dalam posisi semi-tekuk, telapak ke atas",
        "Jaga kepala dalam posisi paling nyaman",
        "Tutup mata perlahan, bernapas normal atau napas perut yang cukup dalam",
        "Perhatikan aliran napas tanpa menggerakkan tubuh",
        "Coba rilekskan semua bagian tubuh",
      ],
      rounds: 1,
      hold_seconds: 300,
      breathing: "normal_or_deep_abdominal",
    },
    benefits: [
      "Merilekskan seluruh sistem psiko-fisiologis",
      "Menghilangkan kelelahan akibat asana lain, menginduksi ketenangan pikiran",
      "Membantu mengembangkan kesadaran tubuh",
      "Sangat bermanfaat untuk mengelola tekanan darah tinggi dan gangguan kecemasan",
    ],
    contraindications: ["Cedera punggung berat (gunakan penyangga kepala)", "Acid reflux (angkat sedikit kepala)"],
    target_disorders: ["disorder_anxiety", "disorder_stress", "disorder_depression", "disorder_ptsd", "disorder_insomnia"],
    body_systems: ["nervous", "cardiovascular", "endocrine"],
    kosha_impact: ["annamaya", "pranamaya", "manomaya", "vijnanamaya", "anandamaya"],
    neuro_effects: { serotonin: "increase", dopamine: "increase", cortisol: "decrease", oxytocin: "increase", gaba: "increase" },
    references: ["Gheranda Samhita-ii.19", "Hathapradipika-i.32", "Hatharatnavali-iii.20,76"],
    media: { image_url: null, video_url: null },
    search_tags: ["asana", "supine", "shavasana", "corpse", "relaxation", "anxiety", "stress", "sleep", "beginner"],
  },

  // ── PRANAYAMA ──
  {
    id: "practice_nadishodhana",
    name: "Nadi Shodhana Pranayama (Alternate Nostril Breathing)",
    sanskrit_name: "नाड़ी शोधन प्राणायाम",
    category: "pranayama",
    posture_type: null,
    ashtanga_limb: "pranayama",
    difficulty: "beginner",
    technique: {
      preparation: [
        "Duduk dalam posisi meditasi yang nyaman (Siddhasana atau Padmasana)",
        "Jaga kepala dan tulang belakang tegak, tutup mata",
      ],
      steps: [
        "Adopsi Jnana Mudra, letakkan tangan kanan di lutut kanan",
        "Tutup lubang hidung kanan dengan ibu jari, tarik napas melalui lubang kiri hitung sampai 5",
        "Setelah hitungan ke-5, lepas tekanan ibu jari dari lubang kanan",
        "Tekan lubang hidung kiri dengan jari manis, blokir aliran udara",
        "Hembuskan napas melalui lubang kanan hitung sampai 5, perlahan dan dalam",
        "Tarik napas melalui lubang kanan hitung sampai 5",
        "Hembuskan napas melalui lubang kiri hitung sampai 5",
      ],
      rounds: 3,
      hold_seconds: null,
      breathing: "alternate_nostril_5_count",
    },
    benefits: [
      "Menyeimbangkan hemisfer kiri dan kanan otak",
      "Meningkatkan pemikiran jernih, fokus, dan konsentrasi",
      "Memperkuat sistem kekebalan tubuh",
      "Menenangkan dan menstabilkan pikiran, mengurangi kecemasan dan stres",
      "Bermanfaat untuk manajemen asma, alergi, hipertensi/hipotensi, insomnia, nyeri kronis, dan kondisi psikologis",
    ],
    contraindications: [
      "Masalah jantung (tanpa Kumbhaka)",
      "Kecemasan tinggi (tanpa retensi napas)",
      "Pilek, demam, flu, sinus tersumbat",
    ],
    target_disorders: ["disorder_anxiety", "disorder_stress", "disorder_depression", "disorder_insomnia", "disorder_ocd", "disorder_ptsd"],
    body_systems: ["nervous", "respiratory", "cardiovascular", "immune", "endocrine"],
    kosha_impact: ["pranamaya", "manomaya", "vijnanamaya"],
    neuro_effects: { serotonin: "increase", dopamine: "increase", cortisol: "decrease", oxytocin: "increase", gaba: "increase" },
    references: ["Hathapradipika", "Gheranda Samhita-v.38-45"],
    media: { image_url: null, video_url: null },
    search_tags: ["pranayama", "nadi shodhana", "anuloma viloma", "alternate nostril", "balance", "anxiety", "stress", "beginner"],
  },
  {
    id: "practice_bhramari",
    name: "Bhramari Pranayama (Humming Bee Breath)",
    sanskrit_name: "भ्रामरी प्राणायाम",
    category: "pranayama",
    posture_type: null,
    ashtanga_limb: "pranayama",
    difficulty: "beginner",
    technique: {
      preparation: ["Duduk dalam Padmasana atau Siddhasana atau posisi duduk nyaman"],
      steps: [
        "Tutup mata, jaga mulut tetap tertutup",
        "Tarik napas dalam melalui kedua lubang hidung",
        "Saat menghembuskan napas, buat suara dengungan lembut",
        "Tutup kedua telinga dengan ibu jari",
        "Hembuskan napas dengan suara dengungan seperti lebah",
      ],
      rounds: 3,
      hold_seconds: null,
      breathing: "inhale_deep_exhale_humming",
    },
    benefits: [
      "Menggembirakan pikiran",
      "Meredakan ketegangan, kecemasan, dan kemarahan, menenangkan pikiran",
      "Membawa kesadaran ke dalam dan memfasilitasi praktik meditasi",
    ],
    contraindications: ["Infeksi telinga", "Penyakit jantung (tanpa Kumbhaka)"],
    target_disorders: ["disorder_anxiety", "disorder_stress", "disorder_depression", "disorder_insomnia"],
    body_systems: ["nervous", "endocrine"],
    kosha_impact: ["pranamaya", "manomaya", "anandamaya"],
    neuro_effects: { serotonin: "increase", dopamine: "increase", cortisol: "decrease", oxytocin: "increase", gaba: "increase" },
    references: ["Hathapradipika", "Hatharatnavalli-ii.26", "Kumbhaka Paddhati-169"],
    media: { image_url: null, video_url: null },
    search_tags: ["pranayama", "bhramari", "humming bee", "calming", "anxiety", "stress", "meditation", "beginner"],
  },
  {
    id: "practice_ujjayi",
    name: "Ujjayi Pranayama (Victorious Breath)",
    sanskrit_name: "उज्जायी प्राणायाम",
    category: "pranayama",
    posture_type: null,
    ashtanga_limb: "pranayama",
    difficulty: "intermediate",
    technique: {
      preparation: ["Duduk dalam Padmasana atau Siddhasana"],
      steps: [
        "Tutup mulut, kontraksi daerah belakang tenggorokan",
        "Tarik napas perlahan melalui kedua lubang hidung secara halus dan seragam",
        "Selama inhalasi, suara khas dihasilkan dari penutupan parsial glottis",
        "Perluas dada saat menarik napas",
        "Tahan napas selama nyaman",
        "Hembuskan napas perlahan melalui lubang hidung kiri dengan menutup lubang kanan",
      ],
      rounds: 3,
      hold_seconds: null,
      breathing: "ocean_sound_breathing",
    },
    benefits: [
      "Meningkatkan api pencernaan",
      "Mencegah Jalodara (busung perut)",
      "Menghilangkan dahak di tenggorokan dan mengatur kelenjar tiroid",
      "Membantu manajemen penyakit jantung dan paru",
    ],
    contraindications: ["Tekanan darah rendah", "Hipertensi dan gangguan jantung (tanpa Kumbhaka)"],
    target_disorders: ["disorder_stress", "disorder_anxiety"],
    body_systems: ["respiratory", "endocrine", "cardiovascular", "digestive"],
    kosha_impact: ["pranamaya", "manomaya"],
    neuro_effects: { serotonin: "increase", dopamine: "neutral", cortisol: "decrease", oxytocin: "neutral", gaba: "increase" },
    references: ["Hatha Yoga Pradipika-ii.51-53", "Gheranda Samhita-v.69-72"],
    media: { image_url: null, video_url: null },
    search_tags: ["pranayama", "ujjayi", "victorious", "ocean", "thyroid", "calming", "intermediate"],
  },

  // ── KRIYA ──
  {
    id: "practice_kapalabhati",
    name: "Kapalabhati (Skull Shining Breath)",
    sanskrit_name: "कपालभाति",
    category: "kriya",
    posture_type: null,
    ashtanga_limb: "pranayama",
    difficulty: "beginner",
    technique: {
      preparation: ["Duduk dalam posisi meditasi, mata tertutup, tubuh rileks"],
      steps: [
        "Tarik napas dalam melalui kedua lubang hidung, perluas perut",
        "Hembuskan napas dengan kontraksi paksa otot perut",
        "Inhalasi berikutnya terjadi secara pasif, otot perut mengembang otomatis",
        "Pernapasan harus seperti tipe embusan (bellows)",
        "Ulangi gerakan ini secara cepat beberapa kali",
        "Perut harus mengembang dan mengempis selama latihan",
      ],
      rounds: 30,
      hold_seconds: null,
      breathing: "forceful_exhale_passive_inhale",
    },
    benefits: [
      "Membersihkan saluran pernapasan dari kotoran dan lendir berlebih",
      "Berguna untuk pilek, rinitis, sinusitis, dan infeksi bronkial",
      "Merangsang saraf di daerah perut, memijat organ perut",
      "Meningkatkan kapasitas paru-paru dan merangsang otak",
    ],
    contraindications: ["Kondisi jantung", "Pusing", "Tekanan darah tinggi", "Vertigo", "Epilepsi", "Stroke", "Hernia", "Tukak lambung"],
    target_disorders: ["disorder_stress", "disorder_depression"],
    body_systems: ["respiratory", "nervous", "digestive"],
    kosha_impact: ["annamaya", "pranamaya", "manomaya"],
    neuro_effects: { serotonin: "increase", dopamine: "increase", cortisol: "decrease", oxytocin: "neutral", gaba: "neutral" },
    references: ["Gheranda Samhita-v.70-72", "Hathapradipika"],
    media: { image_url: null, video_url: null },
    search_tags: ["kriya", "kapalabhati", "skull shining", "cleansing", "abdominal", "energy", "beginner"],
  },

  // ── DHYANA ──
  {
    id: "practice_dhyana",
    name: "Dhyana (Meditation)",
    sanskrit_name: "ध्यान",
    category: "dhyana",
    posture_type: null,
    ashtanga_limb: "dhyana",
    difficulty: "beginner",
    technique: {
      preparation: ["Duduk dalam posisi meditasi yang nyaman, tulang belakang tegak, tangan di paha dalam Jnana Mudra"],
      steps: [
        "Tutup mata perlahan dan sedikit angkat wajah",
        "Bernapas normal",
        "Fokuskan perhatian pada napas sambil bernapas normal",
        "Fokuskan perhatian pada ruang antara kedua alis mata",
        "Tetap dalam keadaan ini selama 5 menit atau selama mungkin",
        "Untuk kembali, bawa perhatian kembali ke napas lalu ke lingkungan luar",
      ],
      rounds: 1,
      hold_seconds: 300,
      breathing: "natural_awareness",
    },
    benefits: [
      "Meremajakan tubuh dan pikiran",
      "Meningkatkan ketenangan, fokus, dan kesadaran diri",
      "Mengurangi kecemasan, stres, dan depresi",
      "Meningkatkan volume otak, grey matter, ketebalan kortikal",
      "Mengganti gelombang beta berlebih dengan gelombang alpha dan theta",
      "Meningkatkan fungsi kognitif: berpikir, belajar, memori, penalaran",
      "Efek pada depresi setara dengan antidepresan",
    ],
    contraindications: [],
    target_disorders: ["disorder_anxiety", "disorder_stress", "disorder_depression", "disorder_ocd", "disorder_ptsd", "disorder_adhd", "disorder_insomnia", "disorder_bipolar"],
    body_systems: ["nervous", "endocrine", "cardiovascular", "immune"],
    kosha_impact: ["manomaya", "vijnanamaya", "anandamaya"],
    neuro_effects: { serotonin: "increase", dopamine: "increase", cortisol: "decrease", oxytocin: "increase", gaba: "increase" },
    references: ["Yoga Sutra of Patanjali III.2"],
    media: { image_url: null, video_url: null },
    search_tags: ["dhyana", "meditation", "mindfulness", "awareness", "calm", "focus", "depression", "anxiety", "beginner"],
  },

  // ── YOGA NIDRA ──
  {
    id: "practice_yoga_nidra",
    name: "Yoga Nidra (Yogic Sleep)",
    sanskrit_name: "योग निद्रा",
    category: "yoga_nidra",
    posture_type: "supine",
    ashtanga_limb: "pratyahara",
    difficulty: "beginner",
    technique: {
      preparation: ["Berbaring dalam Shavasana"],
      steps: [
        "Secara sadar gunakan kesadaran untuk merilekskan setiap bagian tubuh",
        "Praktikkan pernapasan dalam dan kesadaran napas",
        "Libatkan perasaan dan sensasi tubuh",
        "Lakukan visualisasi positif",
        "Buat resolusi positif (Sankalpa)",
        "Ini mengarah pada keadaan relaksasi mendalam",
      ],
      rounds: 1,
      hold_seconds: 1200,
      breathing: "guided_deep_relaxation",
    },
    benefits: [
      "Menghilangkan kelelahan fisik dan mental",
      "Meningkatkan positivitas, kejelasan, dan ketenangan",
      "Menghasilkan gelombang alpha di otak yang bertanggung jawab untuk relaksasi",
      "Meningkatkan sekresi dopamin sebesar 65% (studi neurosains Copenhagen, 2002)",
      "Efektif untuk gangguan tidur, kecemasan, stres, penyakit psikosomatis, fobia, dan OCD",
    ],
    contraindications: [],
    target_disorders: ["disorder_insomnia", "disorder_anxiety", "disorder_stress", "disorder_ocd", "disorder_ptsd", "disorder_depression"],
    body_systems: ["nervous", "endocrine", "immune"],
    kosha_impact: ["annamaya", "pranamaya", "manomaya", "vijnanamaya", "anandamaya"],
    neuro_effects: { serotonin: "increase", dopamine: "increase", cortisol: "decrease", oxytocin: "increase", gaba: "increase" },
    references: ["Copenhagen Neuroscience Research, 2002"],
    media: { image_url: null, video_url: null },
    search_tags: ["yoga nidra", "yogic sleep", "relaxation", "deep rest", "insomnia", "anxiety", "stress", "dopamine", "beginner"],
  },

  // ── SURYA NAMASKAR ──
  {
    id: "practice_surya_namaskar",
    name: "Surya Namaskar (Sun Salutation)",
    sanskrit_name: "सूर्य नमस्कार",
    category: "surya_namaskar",
    posture_type: "dynamic",
    ashtanga_limb: "asana",
    difficulty: "intermediate",
    technique: {
      preparation: ["Waktu ideal: saat matahari terbit, di tempat terbuka menghadap matahari terbit"],
      steps: [
        "Posisi 1: Pranamasana (pose doa)",
        "Posisi 2: Hastottanasana (lengan terangkat)",
        "Posisi 3: Padahastasana (tangan ke kaki)",
        "Posisi 4: Ashwasanchalanasana (pose berkuda)",
        "Posisi 5: Parvatasana (pose gunung)",
        "Posisi 6: Ashtanga Namaskarasana (sujud 8 titik)",
        "Posisi 7: Bhujangasana (pose kobra)",
        "Posisi 8: Parvatasana (pose gunung)",
        "Posisi 9: Ashwasanchalanasana (pose berkuda)",
        "Posisi 10: Padahastasana (tangan ke kaki)",
        "Posisi 11: Hastottanasana (lengan terangkat)",
        "Posisi 12: Pranamasana (pose doa)",
      ],
      rounds: 3,
      hold_seconds: null,
      breathing: "synchronized_with_12_positions",
    },
    benefits: [
      "Sadhana spiritual lengkap: mencakup asana, pranayama, mantra, dan meditasi",
      "Membuat praktisi bugar secara fisik, waspada secara mental, dan seimbang secara emosional",
      "Merangsang semua sistem tubuh: endokrin, reproduksi, sirkulasi, pernapasan, pencernaan",
      "Membuat tulang belakang dan pinggang fleksibel",
      "Meningkatkan pencernaan, mengurangi lemak perut",
    ],
    contraindications: ["Demam", "Tekanan darah tinggi", "Penyakit arteri koroner", "Stroke", "Hernia", "TB usus", "Saat menstruasi"],
    target_disorders: ["disorder_stress", "disorder_depression", "disorder_anxiety"],
    body_systems: ["endocrine", "cardiovascular", "digestive", "respiratory", "musculoskeletal", "nervous"],
    kosha_impact: ["annamaya", "pranamaya", "manomaya"],
    neuro_effects: { serotonin: "increase", dopamine: "increase", cortisol: "decrease", oxytocin: "increase", gaba: "neutral" },
    references: ["Asana Pranayama Mudra Bandha, Swami Satyananda Saraswati", "Surya Namaskara, Swami Satyananda"],
    media: { image_url: null, video_url: null },
    search_tags: ["surya namaskar", "sun salutation", "dynamic", "full body", "energy", "intermediate"],
  },
];

// ═══════════════════════════════════════════════════════════════
//  2. MENTAL DISORDERS — ICD-10 based
// ═══════════════════════════════════════════════════════════════
const mentalDisorders = [
  {
    id: "disorder_organic",
    name: "Organic Mental Disorders",
    icd10_code: "F00-F09",
    icd10_range: "F00-F09",
    category: "organic",
    signs_symptoms: ["Gangguan fungsi kognitif", "Gangguan penilaian", "Gangguan fungsi logis", "Agitasi"],
    neurotransmitters: ["dopamine", "glutamate"],
    brain_regions: ["hippocampus", "prefrontal_cortex"],
    structural_changes: ["Atrofi di area hippocampus", "Degenerasi sel otak"],
    functional_changes: ["Penurunan fungsi kognitif", "Demensia", "Alzheimer"],
    recommended_practices: [
      { practice_id: "practice_dhyana", name: "Dhyana", category: "dhyana", efficacy: "moderate" },
      { practice_id: "practice_nadishodhana", name: "Nadi Shodhana", category: "pranayama", efficacy: "moderate" },
      { practice_id: "practice_bhramari", name: "Bhramari", category: "pranayama", efficacy: "moderate" },
    ],
    recommended_diet: "satvik",
    recommended_protocol_id: "proto_general_mental_health",
  },
  {
    id: "disorder_substance_use",
    name: "Substance Use Disorders",
    icd10_code: "F10-F19",
    icd10_range: "F10-F19",
    category: "substance_use",
    signs_symptoms: ["Ketergantungan zat", "Penggunaan berbahaya", "Gangguan tidur dan nafsu makan", "Perubahan mood, perilaku, dan fungsi kognitif"],
    neurotransmitters: ["dopamine", "serotonin", "gaba"],
    brain_regions: ["prefrontal_cortex", "amygdala"],
    structural_changes: ["Perubahan struktur prefrontal cortex"],
    functional_changes: ["Gangguan kontrol impuls", "Gangguan fungsi sosial"],
    recommended_practices: [
      { practice_id: "practice_dhyana", name: "Dhyana", category: "dhyana", efficacy: "high" },
      { practice_id: "practice_yoga_nidra", name: "Yoga Nidra", category: "yoga_nidra", efficacy: "high" },
      { practice_id: "practice_nadishodhana", name: "Nadi Shodhana", category: "pranayama", efficacy: "moderate" },
    ],
    recommended_diet: "satvik",
    recommended_protocol_id: "proto_stress",
  },
  {
    id: "disorder_depression",
    name: "Depression (Major Depressive Disorder)",
    icd10_code: "F32",
    icd10_range: "F30-F39",
    category: "mood",
    signs_symptoms: ["Kehilangan minat dan keterlibatan", "Tidak menikmati aktivitas sehari-hari", "Selalu sedih", "Keputusasaan", "Rasa bersalah", "Malu", "Gangguan tidur dan nafsu makan", "Nyeri otot", "Kelelahan"],
    neurotransmitters: ["serotonin", "dopamine"],
    brain_regions: ["hippocampus", "amygdala", "prefrontal_cortex"],
    structural_changes: ["Atrofi di area hippocampus (kiri dan kanan)", "Pembesaran ventrikel", "Peningkatan volume amygdala"],
    functional_changes: ["Penurunan fungsi kognitif", "Gangguan mood dan perilaku", "Masalah hippocampus, amygdala (memori, fungsi eksekutif)"],
    recommended_practices: [
      { practice_id: "practice_surya_namaskar", name: "Surya Namaskar", category: "surya_namaskar", efficacy: "high" },
      { practice_id: "practice_bhujangasana", name: "Bhujangasana", category: "asana", efficacy: "high" },
      { practice_id: "practice_setubandhasana", name: "Setubandhasana", category: "asana", efficacy: "high" },
      { practice_id: "practice_sarvangasana", name: "Sarvangasana", category: "asana", efficacy: "moderate" },
      { practice_id: "practice_dhyana", name: "Dhyana", category: "dhyana", efficacy: "high" },
      { practice_id: "practice_nadishodhana", name: "Nadi Shodhana", category: "pranayama", efficacy: "high" },
      { practice_id: "practice_bhramari", name: "Bhramari", category: "pranayama", efficacy: "high" },
      { practice_id: "practice_yoga_nidra", name: "Yoga Nidra", category: "yoga_nidra", efficacy: "high" },
    ],
    recommended_diet: "satvik",
    recommended_protocol_id: "proto_depression",
  },
  {
    id: "disorder_anxiety",
    name: "Generalized Anxiety Disorder (GAD)",
    icd10_code: "F41.1",
    icd10_range: "F39-F49",
    category: "neurotic",
    signs_symptoms: ["Kelelahan", "Kegelisahan", "Gelisah", "Ketegangan otot", "Mudah tersinggung", "Gangguan tidur", "Gemetar", "Berkeringat", "Sesak napas", "Merasa tidak terkendali", "Perasaan malapetaka"],
    neurotransmitters: ["serotonin", "gaba", "glutamate"],
    brain_regions: ["amygdala", "hippocampus", "prefrontal_cortex"],
    structural_changes: ["Peningkatan volume amygdala", "Perubahan di hippocampus"],
    functional_changes: ["Reaksi stres berlebihan", "Gangguan regulasi emosi", "Hiperaktivitas amygdala"],
    recommended_practices: [
      { practice_id: "practice_shavasana", name: "Shavasana", category: "asana", efficacy: "high" },
      { practice_id: "practice_yoga_nidra", name: "Yoga Nidra", category: "yoga_nidra", efficacy: "high" },
      { practice_id: "practice_nadishodhana", name: "Nadi Shodhana", category: "pranayama", efficacy: "high" },
      { practice_id: "practice_bhramari", name: "Bhramari", category: "pranayama", efficacy: "high" },
      { practice_id: "practice_dhyana", name: "Dhyana", category: "dhyana", efficacy: "high" },
      { practice_id: "practice_makarasana", name: "Makarasana", category: "asana", efficacy: "moderate" },
    ],
    recommended_diet: "satvik",
    recommended_protocol_id: "proto_anxiety",
  },
  {
    id: "disorder_stress",
    name: "Stress-Related Disorders",
    icd10_code: "F43",
    icd10_range: "F39-F49",
    category: "neurotic",
    signs_symptoms: ["Kegelisahan", "Mood rendah", "Pikiran pesimistis", "Kecemasan", "Sesak napas", "Kekeruhan pikiran", "Pengambilan keputusan buruk", "Distres"],
    neurotransmitters: ["serotonin", "dopamine", "cortisol"],
    brain_regions: ["hippocampus", "amygdala", "prefrontal_cortex"],
    structural_changes: ["Atrofi dan gangguan neurogenesis", "Pemendekan cabang dendritik", "Perubahan signifikan pada volume hippocampus"],
    functional_changes: ["Penurunan fungsi kognitif", "Gangguan memori verbal dan visuo-spasial", "Gangguan pemuatan data yang bergantung pada hippocampus"],
    recommended_practices: [
      { practice_id: "practice_shavasana", name: "Shavasana", category: "asana", efficacy: "high" },
      { practice_id: "practice_yoga_nidra", name: "Yoga Nidra", category: "yoga_nidra", efficacy: "high" },
      { practice_id: "practice_nadishodhana", name: "Nadi Shodhana", category: "pranayama", efficacy: "high" },
      { practice_id: "practice_bhramari", name: "Bhramari", category: "pranayama", efficacy: "high" },
      { practice_id: "practice_dhyana", name: "Dhyana", category: "dhyana", efficacy: "high" },
      { practice_id: "practice_surya_namaskar", name: "Surya Namaskar", category: "surya_namaskar", efficacy: "moderate" },
    ],
    recommended_diet: "satvik",
    recommended_protocol_id: "proto_stress",
  },
  {
    id: "disorder_bipolar",
    name: "Bipolar Disorder",
    icd10_code: "F31",
    icd10_range: "F30-F39",
    category: "mood",
    signs_symptoms: ["Perubahan mood ekstrem", "Kemarahan atau iritabilitas tiba-tiba", "Peralihan antara perasaan sangat tinggi dan sangat rendah", "Sering terlibat pertengkaran", "Gangguan pola tidur"],
    neurotransmitters: ["serotonin", "dopamine", "glutamate"],
    brain_regions: ["prefrontal_cortex", "amygdala", "hippocampus"],
    structural_changes: ["Perubahan volume prefrontal cortex dan amygdala"],
    functional_changes: ["Gangguan regulasi mood", "Gangguan fungsi eksekutif"],
    recommended_practices: [
      { practice_id: "practice_dhyana", name: "Dhyana", category: "dhyana", efficacy: "moderate" },
      { practice_id: "practice_nadishodhana", name: "Nadi Shodhana", category: "pranayama", efficacy: "moderate" },
      { practice_id: "practice_shavasana", name: "Shavasana", category: "asana", efficacy: "moderate" },
      { practice_id: "practice_yoga_nidra", name: "Yoga Nidra", category: "yoga_nidra", efficacy: "moderate" },
    ],
    recommended_diet: "satvik",
    recommended_protocol_id: "proto_general_mental_health",
  },
  {
    id: "disorder_ocd",
    name: "Obsessive Compulsive Disorder (OCD)",
    icd10_code: "F42",
    icd10_range: "F39-F49",
    category: "neurotic",
    signs_symptoms: ["Pikiran mengganggu yang konstan", "Perilaku kompulsif/berulang", "Tindakan di luar kehendak", "Kekhawatiran berlebihan tentang keamanan, kebersihan, kerapian"],
    neurotransmitters: ["serotonin", "glutamate"],
    brain_regions: ["prefrontal_cortex", "striatum"],
    structural_changes: ["Perubahan di sirkuit cortico-striato-thalamo-cortical"],
    functional_changes: ["Hiperaktivitas di sirkuit OCD", "Gangguan kontrol impuls"],
    recommended_practices: [
      { practice_id: "practice_dhyana", name: "Dhyana", category: "dhyana", efficacy: "high" },
      { practice_id: "practice_yoga_nidra", name: "Yoga Nidra", category: "yoga_nidra", efficacy: "high" },
      { practice_id: "practice_nadishodhana", name: "Nadi Shodhana", category: "pranayama", efficacy: "moderate" },
      { practice_id: "practice_bhramari", name: "Bhramari", category: "pranayama", efficacy: "moderate" },
    ],
    recommended_diet: "satvik",
    recommended_protocol_id: "proto_anxiety",
  },
  {
    id: "disorder_ptsd",
    name: "Post-Traumatic Stress Disorder (PTSD)",
    icd10_code: "F43.1",
    icd10_range: "F39-F49",
    category: "neurotic",
    signs_symptoms: ["Kilas balik traumatis", "Mimpi buruk", "Kecemasan berat", "Pikiran tidak terkontrol tentang peristiwa", "Penghindaran", "Kewaspadaan berlebihan"],
    neurotransmitters: ["serotonin", "dopamine", "cortisol"],
    brain_regions: ["amygdala", "hippocampus", "prefrontal_cortex"],
    structural_changes: ["Penurunan volume hippocampus", "Hiperaktivitas amygdala"],
    functional_changes: ["Respons stres berlebihan", "Gangguan konsolidasi memori", "Gangguan regulasi emosi"],
    recommended_practices: [
      { practice_id: "practice_yoga_nidra", name: "Yoga Nidra", category: "yoga_nidra", efficacy: "high" },
      { practice_id: "practice_dhyana", name: "Dhyana", category: "dhyana", efficacy: "high" },
      { practice_id: "practice_shavasana", name: "Shavasana", category: "asana", efficacy: "high" },
      { practice_id: "practice_nadishodhana", name: "Nadi Shodhana", category: "pranayama", efficacy: "high" },
      { practice_id: "practice_bhramari", name: "Bhramari", category: "pranayama", efficacy: "moderate" },
    ],
    recommended_diet: "satvik",
    recommended_protocol_id: "proto_stress",
  },
  {
    id: "disorder_adhd",
    name: "Attention Deficit Hyperactive Disorder (ADHD)",
    icd10_code: "F90",
    icd10_range: "F90-F98",
    category: "developmental",
    signs_symptoms: ["Kurang perhatian", "Hiperaktivitas", "Impulsivitas", "Kesulitan konsentrasi", "Kesulitan mengikuti instruksi"],
    neurotransmitters: ["dopamine", "glutamate"],
    brain_regions: ["prefrontal_cortex", "striatum"],
    structural_changes: ["Penurunan volume prefrontal cortex"],
    functional_changes: ["Defisit perhatian", "Gangguan kontrol impuls", "Gangguan fungsi eksekutif"],
    recommended_practices: [
      { practice_id: "practice_vrikshasana", name: "Vrikshasana", category: "asana", efficacy: "moderate" },
      { practice_id: "practice_dhyana", name: "Dhyana", category: "dhyana", efficacy: "high" },
      { practice_id: "practice_nadishodhana", name: "Nadi Shodhana", category: "pranayama", efficacy: "moderate" },
      { practice_id: "practice_bhramari", name: "Bhramari", category: "pranayama", efficacy: "moderate" },
    ],
    recommended_diet: "satvik",
    recommended_protocol_id: "proto_general_mental_health",
  },
];

// ═══════════════════════════════════════════════════════════════
//  3. YOGA PROTOCOLS
// ═══════════════════════════════════════════════════════════════
const yogaProtocols = [
  {
    id: "proto_general_mental_health",
    name: "Protokol Yoga untuk Kesehatan Mental Umum",
    target_condition: "general_mental_health",
    total_duration_min: 60,
    frequency: "daily",
    difficulty: "beginner",
    created_by: "system",
    steps: [
      { order: 1, practice_id: "practice_prayer", name: "Prayer (Doa Pembuka)", category: "prayer", duration_min: 1, rounds: null, notes: "Rig Veda 10.191.2" },
      { order: 2, practice_id: "practice_jala_neti", name: "Shat Kriyas (Jala Neti + Sutra Neti)", category: "shatkarma", duration_min: 10, rounds: null, notes: "Memerlukan supervisi dan panduan yang tepat" },
      { order: 3, practice_id: "practice_sukshma_vyayama", name: "Yogic Sukshma Vyayama", category: "sukshma_vyayama", duration_min: 12, rounds: 3, notes: "Gerakan leher, bahu, badan, lutut, pergelangan kaki" },
      { order: 4, practice_id: "practice_sthula_vyayama", name: "Yogic Sthula Vyayama (Rekhagati, Urdhva Gati, Sarvangpusti)", category: "sthula_vyayama", duration_min: 4, rounds: 3, notes: null },
      { order: 5, practice_id: "practice_surya_namaskar", name: "Surya Namaskar (dengan fokus napas)", category: "surya_namaskar", duration_min: 5, rounds: 3, notes: null },
      { order: 6, practice_id: "practice_yogasanas", name: "Yogasanas (Berdiri + Duduk + Tengkurap + Terlentang)", category: "asana", duration_min: 20, rounds: null, notes: "Tadasana, Vrikshasana, Kati Chakrasana, Paschimottanasana, Ushtrasana, Shashankasana, Vakrasana, Gomukhasana, Makarasana, Bhujangasana, Ardha Halasana, Sarvangasana, Matsyasana, Setubandhasana, Pawanmuktasana, Shavasana" },
      { order: 7, practice_id: "practice_kapalabhati", name: "Kapalabhati", category: "kriya", duration_min: 1, rounds: 30, notes: "Mulai 30 hembusan, bertahap naik ke 60" },
      { order: 8, practice_id: "practice_pranayama_set", name: "Pranayama (Nadi Shodhana + Bhramari + Ujjayi)", category: "pranayama", duration_min: 9, rounds: 3, notes: "Masing-masing 3 putaran" },
      { order: 9, practice_id: "practice_dhyana", name: "Dhyana (Meditasi)", category: "dhyana", duration_min: 5, rounds: null, notes: "Fokus pada ruang antara kedua alis mata" },
      { order: 10, practice_id: "practice_shanti_patha", name: "Shanti Patha (Doa Penutup)", category: "prayer", duration_min: 1, rounds: null, notes: "Om Sarve Bhavantu Sukhinah" },
    ],
    guidelines: {
      before: [
        "Praktik pagi hari sebelum matahari terbit atau dalam 2 jam setelah terbit",
        "Perut kosong (3-4 jam setelah makan berat, 2 jam setelah makanan ringan)",
        "Buang air besar dan kecil sebelum praktik",
        "Tempat berventilasi baik, bebas debu, asap, dan bau tidak sedap",
        "Gunakan karpet atau selimut lipat di atas permukaan rata",
        "Pakaian longgar, ringan, dan nyaman (sebaiknya katun)",
        "Lepas kacamata dan jam tangan",
        "Makan moderat (Mitahara), hindari makanan berminyak dan pedas",
      ],
      during: [
        "Selalu bernapas melalui hidung kecuali diarahkan sebaliknya",
        "Koordinasikan napas dengan gerakan tubuh",
        "Lakukan asana perlahan dan bertahap, masuk posisi akhir langkah demi langkah",
        "Gerakan tubuh harus halus, hindari sentakan, paksaan, atau tekanan",
        "Praktikkan dengan kesadaran penuh untuk harmoni fisik, pranik, mental, dan spiritual",
        "Shavasana setelah sesi praktik untuk menghilangkan kelelahan",
        "Hentikan segera jika ada nyeri hebat",
      ],
      after: [
        "Mandi boleh dilakukan setelah 15-30 menit sesi yoga",
        "Makanan ringan boleh dikonsumsi setelah 15-30 menit",
        "Akhiri sesi dengan doa dan Shanti Patha",
      ],
    },
    evidence_ids: ["research_harner_2010", "research_gururaja_2011", "research_bussing_2012", "research_khalsa_2012"],
  },
  {
    id: "proto_anxiety",
    name: "Protokol Yoga untuk Gangguan Kecemasan",
    target_condition: "anxiety",
    total_duration_min: 45,
    frequency: "daily",
    difficulty: "beginner",
    created_by: "system",
    steps: [
      { order: 1, practice_id: "practice_prayer", name: "Doa Pembuka", category: "prayer", duration_min: 1, rounds: null, notes: null },
      { order: 2, practice_id: "practice_sukshma_vyayama", name: "Sukshma Vyayama (Leher & Bahu)", category: "sukshma_vyayama", duration_min: 8, rounds: 3, notes: "Fokus pada relaksasi otot leher dan bahu" },
      { order: 3, practice_id: "practice_tadasana", name: "Tadasana", category: "asana", duration_min: 3, rounds: 3, notes: null },
      { order: 4, practice_id: "practice_shashankasana", name: "Shashankasana", category: "asana", duration_min: 3, rounds: 3, notes: "Posisi menenangkan" },
      { order: 5, practice_id: "practice_makarasana", name: "Makarasana", category: "asana", duration_min: 3, rounds: 1, notes: "Relaksasi mendalam" },
      { order: 6, practice_id: "practice_setubandhasana", name: "Setubandhasana", category: "asana", duration_min: 3, rounds: 3, notes: null },
      { order: 7, practice_id: "practice_shavasana", name: "Shavasana", category: "asana", duration_min: 5, rounds: 1, notes: "Relaksasi total" },
      { order: 8, practice_id: "practice_nadishodhana", name: "Nadi Shodhana (tanpa Kumbhaka)", category: "pranayama", duration_min: 5, rounds: 5, notes: "Tanpa retensi napas untuk kecemasan" },
      { order: 9, practice_id: "practice_bhramari", name: "Bhramari Pranayama", category: "pranayama", duration_min: 4, rounds: 5, notes: "Fokus pada getaran suara" },
      { order: 10, practice_id: "practice_yoga_nidra", name: "Yoga Nidra (singkat)", category: "yoga_nidra", duration_min: 8, rounds: 1, notes: "Relaksasi sadar dengan Sankalpa positif" },
      { order: 11, practice_id: "practice_shanti_patha", name: "Shanti Patha", category: "prayer", duration_min: 2, rounds: null, notes: null },
    ],
    guidelines: {
      before: ["Tempat tenang dan nyaman", "Perut kosong", "Pakaian longgar"],
      during: ["Gerakan sangat perlahan", "Fokus pada napas panjang dan dalam", "Tidak memaksakan posisi"],
      after: ["Jangan terburu-buru bangun", "Minum air hangat", "Catat perasaan di jurnal"],
    },
    evidence_ids: ["research_harner_2010", "research_clark_2014", "research_lin_2015"],
  },
  {
    id: "proto_depression",
    name: "Protokol Yoga untuk Depresi",
    target_condition: "depression",
    total_duration_min: 50,
    frequency: "daily",
    difficulty: "beginner",
    created_by: "system",
    steps: [
      { order: 1, practice_id: "practice_prayer", name: "Doa Pembuka", category: "prayer", duration_min: 1, rounds: null, notes: null },
      { order: 2, practice_id: "practice_surya_namaskar", name: "Surya Namaskar", category: "surya_namaskar", duration_min: 8, rounds: 3, notes: "Meningkatkan energi dan mood" },
      { order: 3, practice_id: "practice_tadasana", name: "Tadasana", category: "asana", duration_min: 2, rounds: 3, notes: null },
      { order: 4, practice_id: "practice_vrikshasana", name: "Vrikshasana", category: "asana", duration_min: 3, rounds: 2, notes: "Meningkatkan fokus dan percaya diri" },
      { order: 5, practice_id: "practice_bhujangasana", name: "Bhujangasana", category: "asana", duration_min: 3, rounds: 3, notes: "Membuka dada, meningkatkan mood" },
      { order: 6, practice_id: "practice_setubandhasana", name: "Setubandhasana", category: "asana", duration_min: 3, rounds: 3, notes: null },
      { order: 7, practice_id: "practice_sarvangasana", name: "Sarvangasana", category: "asana", duration_min: 3, rounds: 1, notes: "Merangsang kelenjar tiroid" },
      { order: 8, practice_id: "practice_matsyasana", name: "Matsyasana", category: "asana", duration_min: 2, rounds: 1, notes: "Counter-pose setelah Sarvangasana" },
      { order: 9, practice_id: "practice_shavasana", name: "Shavasana", category: "asana", duration_min: 3, rounds: 1, notes: null },
      { order: 10, practice_id: "practice_kapalabhati", name: "Kapalabhati", category: "kriya", duration_min: 2, rounds: 30, notes: "Meningkatkan energi" },
      { order: 11, practice_id: "practice_nadishodhana", name: "Nadi Shodhana", category: "pranayama", duration_min: 4, rounds: 5, notes: null },
      { order: 12, practice_id: "practice_bhramari", name: "Bhramari", category: "pranayama", duration_min: 3, rounds: 5, notes: null },
      { order: 13, practice_id: "practice_dhyana", name: "Dhyana", category: "dhyana", duration_min: 7, rounds: 1, notes: "Fokus pada pikiran positif dan penerimaan diri" },
      { order: 14, practice_id: "practice_shanti_patha", name: "Shanti Patha", category: "prayer", duration_min: 1, rounds: null, notes: null },
    ],
    guidelines: {
      before: ["Mulai dengan niat positif", "Tempat terang dan berventilasi", "Hindari isolasi — ajak teman jika memungkinkan"],
      during: ["Fokus pada gerakan aktif dan energik (Surya Namaskar, backbend)", "Napas dalam dan ritmis", "Apresiasi setiap kemajuan kecil"],
      after: ["Jangan langsung berbaring lama", "Lakukan aktivitas ringan yang menyenangkan", "Catat 3 hal yang disyukuri"],
    },
    evidence_ids: ["research_fan_chen_2011", "research_sathyanarayanan_2019", "research_telles_2012"],
  },
  {
    id: "proto_stress",
    name: "Protokol Yoga untuk Manajemen Stres",
    target_condition: "stress",
    total_duration_min: 40,
    frequency: "daily",
    difficulty: "beginner",
    created_by: "system",
    steps: [
      { order: 1, practice_id: "practice_prayer", name: "Doa Pembuka", category: "prayer", duration_min: 1, rounds: null, notes: null },
      { order: 2, practice_id: "practice_sukshma_vyayama", name: "Sukshma Vyayama", category: "sukshma_vyayama", duration_min: 5, rounds: 3, notes: "Gerakan leher dan bahu untuk melepas ketegangan" },
      { order: 3, practice_id: "practice_tadasana", name: "Tadasana", category: "asana", duration_min: 2, rounds: 3, notes: null },
      { order: 4, practice_id: "practice_paschimottanasana", name: "Paschimottanasana", category: "asana", duration_min: 3, rounds: 2, notes: "Menenangkan sistem saraf" },
      { order: 5, practice_id: "practice_makarasana", name: "Makarasana", category: "asana", duration_min: 3, rounds: 1, notes: "Relaksasi mendalam" },
      { order: 6, practice_id: "practice_bhujangasana", name: "Bhujangasana", category: "asana", duration_min: 2, rounds: 2, notes: null },
      { order: 7, practice_id: "practice_shavasana", name: "Shavasana", category: "asana", duration_min: 5, rounds: 1, notes: null },
      { order: 8, practice_id: "practice_nadishodhana", name: "Nadi Shodhana", category: "pranayama", duration_min: 5, rounds: 5, notes: null },
      { order: 9, practice_id: "practice_bhramari", name: "Bhramari", category: "pranayama", duration_min: 3, rounds: 5, notes: null },
      { order: 10, practice_id: "practice_yoga_nidra", name: "Yoga Nidra", category: "yoga_nidra", duration_min: 10, rounds: 1, notes: "Relaksasi sadar mendalam" },
      { order: 11, practice_id: "practice_shanti_patha", name: "Shanti Patha", category: "prayer", duration_min: 1, rounds: null, notes: null },
    ],
    guidelines: {
      before: ["Matikan notifikasi perangkat", "Tempat tenang, pencahayaan lembut", "Niat: melepaskan ketegangan"],
      during: ["Bernapas dalam dan panjang di setiap posisi", "Tidak mengejar kesempurnaan postur", "Fokus pada sensasi relaksasi"],
      after: ["Minum air hangat atau teh herbal", "5 menit journaling tentang perasaan", "Hindari langsung kembali ke aktivitas berat"],
    },
    evidence_ids: ["research_lin_2015", "research_bussing_2012"],
  },
];

// ═══════════════════════════════════════════════════════════════
//  4. FOOD ITEMS — Satvik, Rajasik, Tamasik
// ═══════════════════════════════════════════════════════════════
const foodItems = [
  // SATVIK
  { id: "food_fresh_vegetables", name: "Sayuran Segar", guna: "satvik", food_group: "vegetables", nutrients: ["vitamin_c", "folic_acid", "magnesium"], positive_effects: ["Kegembiraan", "Kekuatan kehendak", "Kejelasan pikiran"], negative_effects: [], deficiency_symptoms: [], recommended_for: ["disorder_depression", "disorder_anxiety", "disorder_stress"], avoid_for: [] },
  { id: "food_whole_grains", name: "Biji-bijian Utuh", guna: "satvik", food_group: "grains", nutrients: ["vitamin_b1", "vitamin_b3", "vitamin_b5", "vitamin_b6", "magnesium", "selenium"], positive_effects: ["Kedamaian", "Optimisme", "Positivitas", "Imunitas baik"], negative_effects: [], deficiency_symptoms: [], recommended_for: ["disorder_depression", "disorder_anxiety", "disorder_stress", "disorder_adhd"], avoid_for: [] },
  { id: "food_milk", name: "Susu", guna: "satvik", food_group: "dairy", nutrients: ["vitamin_b12", "calcium"], positive_effects: ["Ketenangan", "Kegembiraan"], negative_effects: [], deficiency_symptoms: [], recommended_for: ["disorder_depression", "disorder_stress"], avoid_for: [] },
  { id: "food_nuts_seeds", name: "Kacang-kacangan dan Biji-bijian", guna: "satvik", food_group: "nuts_seeds", nutrients: ["omega3", "omega6", "magnesium", "zinc", "selenium", "vitamin_b5"], positive_effects: ["Kejelasan pikiran", "Kebahagiaan"], negative_effects: [], deficiency_symptoms: [], recommended_for: ["disorder_depression", "disorder_anxiety", "disorder_adhd"], avoid_for: [] },
  { id: "food_fresh_fruits", name: "Buah-buahan Segar", guna: "satvik", food_group: "fruits", nutrients: ["vitamin_c", "vitamin_b6", "folic_acid"], positive_effects: ["Positivitas", "Imunitas baik", "Kejelasan pikiran"], negative_effects: [], deficiency_symptoms: [], recommended_for: ["disorder_depression", "disorder_anxiety", "disorder_stress"], avoid_for: [] },
  { id: "food_herbal_items", name: "Bahan-bahan Herbal", guna: "satvik", food_group: "spices", nutrients: ["selenium", "zinc"], positive_effects: ["Kedamaian", "Imunitas baik"], negative_effects: [], deficiency_symptoms: [], recommended_for: ["disorder_stress"], avoid_for: [] },
  { id: "food_dairy_products", name: "Produk Olahan Susu (Yoghurt, Keju)", guna: "satvik", food_group: "dairy", nutrients: ["vitamin_b12", "calcium", "zinc"], positive_effects: ["Ketenangan", "Pencernaan baik"], negative_effects: [], deficiency_symptoms: [], recommended_for: ["disorder_stress", "disorder_depression"], avoid_for: [] },
  { id: "food_green_leafy", name: "Sayuran Hijau Berdaun", guna: "satvik", food_group: "vegetables", nutrients: ["folic_acid", "magnesium", "vitamin_c"], positive_effects: ["Mengurangi depresi dan kecemasan", "Meningkatkan mood"], negative_effects: [], deficiency_symptoms: ["Depresi", "Psikosis", "Kecemasan"], recommended_for: ["disorder_depression", "disorder_anxiety"], avoid_for: [] },
  { id: "food_banana", name: "Pisang", guna: "satvik", food_group: "fruits", nutrients: ["vitamin_b6", "magnesium"], positive_effects: ["Mengurangi kecemasan dan stres", "Meningkatkan mood"], negative_effects: [], deficiency_symptoms: [], recommended_for: ["disorder_anxiety", "disorder_stress"], avoid_for: [] },
  { id: "food_soybean", name: "Kedelai", guna: "satvik", food_group: "grains", nutrients: ["vitamin_b6", "omega3"], positive_effects: ["Mengurangi kecemasan", "Meningkatkan mood"], negative_effects: [], deficiency_symptoms: [], recommended_for: ["disorder_anxiety", "disorder_depression"], avoid_for: [] },
  // RAJASIK
  { id: "food_spicy", name: "Makanan Pedas", guna: "rajasik", food_group: "spices", nutrients: [], positive_effects: [], negative_effects: ["Kegelisahan", "Kecemasan", "Mudah marah", "Impulsivitas"], deficiency_symptoms: [], recommended_for: [], avoid_for: ["disorder_anxiety", "disorder_stress", "disorder_bipolar"] },
  { id: "food_coffee", name: "Kopi", guna: "rajasik", food_group: "beverages", nutrients: [], positive_effects: ["Peningkatan energi sementara"], negative_effects: ["Kegelisahan", "Kecemasan", "Gangguan tidur", "Iritabilitas"], deficiency_symptoms: [], recommended_for: [], avoid_for: ["disorder_anxiety", "disorder_insomnia", "disorder_stress"] },
  { id: "food_oily_foods", name: "Makanan Berminyak & Berlemak Tinggi", guna: "rajasik", food_group: "processed", nutrients: [], positive_effects: [], negative_effects: ["Kegelisahan", "Perilaku kompetitif berlebihan", "Energi berlebih"], deficiency_symptoms: [], recommended_for: [], avoid_for: ["disorder_anxiety", "disorder_bipolar", "disorder_stress"] },
  { id: "food_excessive_salt", name: "Makanan Sangat Asin/Manis", guna: "rajasik", food_group: "processed", nutrients: [], positive_effects: [], negative_effects: ["Iritabilitas", "Impulsivitas", "Pengambilan risiko tinggi"], deficiency_symptoms: [], recommended_for: [], avoid_for: ["disorder_anxiety", "disorder_adhd"] },
  { id: "food_meat", name: "Daging", guna: "rajasik", food_group: "meat_fish", nutrients: ["vitamin_b12", "zinc"], positive_effects: ["Sumber protein"], negative_effects: ["Kegelisahan", "Agresivitas"], deficiency_symptoms: [], recommended_for: [], avoid_for: ["disorder_anxiety", "disorder_stress"] },
  { id: "food_fish", name: "Ikan", guna: "rajasik", food_group: "meat_fish", nutrients: ["omega3", "vitamin_b12", "selenium", "zinc"], positive_effects: ["Sumber omega-3 baik"], negative_effects: ["Kegelisahan ringan"], deficiency_symptoms: [], recommended_for: [], avoid_for: [] },
  // TAMASIK
  { id: "food_preserved", name: "Makanan Olahan/Pengawet", guna: "tamasik", food_group: "processed", nutrients: [], positive_effects: [], negative_effects: ["Negativitas", "Kelesuan", "Pikiran pesimistis", "Mood tertekan", "Imunitas buruk"], deficiency_symptoms: [], recommended_for: [], avoid_for: ["disorder_depression", "disorder_anxiety", "disorder_stress", "disorder_adhd"] },
  { id: "food_alcohol", name: "Alkohol / Minuman Keras", guna: "tamasik", food_group: "beverages", nutrients: [], positive_effects: [], negative_effects: ["Negativitas", "Kelesuan", "Depresi", "Percaya diri rendah", "Mudah dipengaruhi"], deficiency_symptoms: [], recommended_for: [], avoid_for: ["disorder_depression", "disorder_anxiety", "disorder_substance_use", "disorder_bipolar"] },
  { id: "food_bakery", name: "Roti & Kue Olahan", guna: "tamasik", food_group: "processed", nutrients: [], positive_effects: [], negative_effects: ["Kelesuan", "Mood tertekan", "Imunitas buruk"], deficiency_symptoms: [], recommended_for: [], avoid_for: ["disorder_depression", "disorder_adhd"] },
  { id: "food_ice_cream", name: "Es Krim, Permen, Cokelat", guna: "tamasik", food_group: "processed", nutrients: [], positive_effects: ["Perubahan mood sementara"], negative_effects: ["Iritabilitas setelah efek hilang", "Percaya diri rendah"], deficiency_symptoms: [], recommended_for: [], avoid_for: ["disorder_depression", "disorder_adhd"] },
  { id: "food_pickle_jam", name: "Acar, Selai", guna: "tamasik", food_group: "processed", nutrients: [], positive_effects: [], negative_effects: ["Kelesuan", "Pesimisme"], deficiency_symptoms: [], recommended_for: [], avoid_for: ["disorder_depression"] },
];

// ═══════════════════════════════════════════════════════════════
//  5. RESEARCH EVIDENCE
// ═══════════════════════════════════════════════════════════════
const researchEvidence = [
  { id: "research_harner_2010", title: "Effect of Iyengar Yoga on Mental Health of Incarcerated Women", authors: ["Harner H", "Hanlon AL", "Garfinkel M"], year: 2010, study_type: "feasibility", population: "Wanita di penjara", yoga_types: ["iyengar"], outcomes: ["Penurunan signifikan gejala depresi", "Penurunan gejala kecemasan", "Penurunan persepsi stres"], key_findings: "Program Iyengar Yoga 2 sesi/minggu selama 12 minggu menunjukkan perbaikan signifikan pada depresi, kecemasan, dan stres yang dirasakan.", linked_disorders: ["disorder_depression", "disorder_anxiety", "disorder_stress"], linked_practices: [] },
  { id: "research_gururaja_2011", title: "Effect of Yoga on Mental Health Status of Younger and Older People in Japan", authors: ["Gururaja D", "Harano K", "Toyotake I", "Kobayashi H"], year: 2011, study_type: "observational", population: "Kelompok muda dan senior di Jepang", yoga_types: ["integrated"], outcomes: ["Penurunan aktivitas amilase saliva", "Penurunan skor kecemasan state"], key_findings: "Kelas yoga 90 menit 1-2x/minggu selama sebulan. Aktivitas amilase saliva menurun pada kedua kelompok, skor kecemasan state menurun signifikan (P<0.05).", linked_disorders: ["disorder_anxiety", "disorder_stress"], linked_practices: [] },
  { id: "research_fan_chen_2011", title: "Effect of Silver Yoga on Mental Health of Elderly with Dementia", authors: ["Fan JT", "Chen KM"], year: 2011, study_type: "rct", population: "Lansia dengan demensia di fasilitas perawatan jangka panjang", yoga_types: ["integrated"], outcomes: ["Peningkatan kesehatan fisik dan mental", "Penurunan tingkat depresi", "Penurunan masalah perilaku"], key_findings: "Kelompok terapi yoga menunjukkan kesehatan fisik dan mental lebih baik dibanding kelompok non-yoga. Tingkat depresi dan masalah perilaku juga menurun signifikan.", linked_disorders: ["disorder_depression", "disorder_organic"], linked_practices: [] },
  { id: "research_telles_2012", title: "Managing Mental Health Disorders Resulting from Trauma through Yoga", authors: ["Telles S", "Singh N", "Balkrishna A"], year: 2012, study_type: "review", population: "Korban trauma (bencana alam, perang, kekerasan, penjara)", yoga_types: ["integrated", "meditation"], outcomes: ["Yoga berguna untuk mengurangi gangguan mental pasca trauma"], key_findings: "Review 11 studi PubMed. Yoga dan intervensi mind-body tampak berguna untuk mengurangi gangguan mental pasca trauma, namun perlu studi lebih lanjut dengan sampel lebih besar.", linked_disorders: ["disorder_ptsd", "disorder_depression", "disorder_anxiety"], linked_practices: [] },
  { id: "research_bussing_2012", title: "Effects of Yoga on Mental and Physical Health: A Short Summary of Reviews", authors: ["Büssing A", "Michalsen A", "Khalsa SBS", "Telles S", "Sherman KJ"], year: 2012, study_type: "meta_analysis", population: "Berbagai populasi (multiple RCTs)", yoga_types: ["integrated"], outcomes: ["Efek menguntungkan tinggi untuk disabilitas terkait nyeri", "Efek menguntungkan tinggi untuk kesehatan mental"], key_findings: "Meta-analisis beberapa RCT menunjukkan efek menguntungkan yang cukup tinggi dari yoga untuk disabilitas terkait nyeri dan kesehatan mental. Yoga efektif sebagai adjunct suportif.", linked_disorders: ["disorder_stress", "disorder_anxiety", "disorder_depression"], linked_practices: [] },
  { id: "research_khalsa_2012", title: "Evaluation of Mental Health Benefits of Yoga in Secondary School", authors: ["Khalsa SBS", "Hickey-Schultz L", "Cohen D", "Steiner N", "Cope S"], year: 2012, study_type: "rct", population: "Remaja di sekolah menengah", yoga_types: ["integrated"], outcomes: ["Perbedaan signifikan pada kontrol amarah dan kelelahan/inersia", "Kelompok kontrol memburuk, kelompok yoga stabil/membaik"], key_findings: "Implementasi yoga layak dan diterima di tingkat sekolah. Yoga berpotensi untuk pencegahan dan pemeliharaan kesehatan mental remaja.", linked_disorders: ["disorder_stress", "disorder_anxiety"], linked_practices: [] },
  { id: "research_clark_2014", title: "Trauma-Sensitive Yoga as Adjunct Treatment for Domestic Violence Survivors", authors: ["Clark CJ", "Lewis-Dmello A", "Anders D", "Parsons A", "Nguyen-Feng V"], year: 2014, study_type: "feasibility", population: "Korban kekerasan pasangan (wanita)", yoga_types: ["integrated"], outcomes: ["Perubahan signifikan pada kecemasan", "Perubahan signifikan pada depresi", "Perubahan signifikan pada gejala PTSD"], key_findings: "Intervensi yoga trauma-sensitif 12 minggu dikombinasi psikoterapi menunjukkan tanda-tanda menjanjikan sebagai pengobatan adjunctive untuk berbagai kondisi mental.", linked_disorders: ["disorder_anxiety", "disorder_depression", "disorder_ptsd"], linked_practices: [] },
  { id: "research_lin_2015", title: "Effects of Yoga on Stress and Heart Rate Variability in Mental Health Professionals", authors: ["Lin SL", "Huang CY", "Shiu SP", "Yeh SH"], year: 2015, study_type: "rct", population: "Profesional kesehatan mental", yoga_types: ["integrated"], outcomes: ["Penurunan signifikan stres kerja", "Peningkatan signifikan adaptasi stres"], key_findings: "Yoga selama 12 minggu mengurangi stres kerja secara signifikan dan meningkatkan adaptasi stres pada profesional kesehatan mental dibanding kelompok kontrol.", linked_disorders: ["disorder_stress"], linked_practices: [] },
  { id: "research_sathyanarayanan_2019", title: "Role of Yoga and Mindfulness in Severe Mental Illnesses", authors: ["Sathyanarayanan G", "Vengadavaradan A", "Bharadwaj B"], year: 2019, study_type: "review", population: "Pasien skizofrenia, MDD, bipolar", yoga_types: ["asana", "pranayama", "meditation"], outcomes: ["Perbaikan psikopatologi, kecemasan, kognisi untuk skizofrenia", "Penurunan signifikan gejala depresif untuk MDD", "Data terbatas untuk bipolar"], key_findings: "Yoga dan mindfulness berguna sebagai adjunct dalam pengobatan penyakit mental berat. Asana dan pranayama paling banyak dipelajari untuk skizofrenia.", linked_disorders: ["disorder_depression", "disorder_bipolar", "disorder_schizophrenia"], linked_practices: ["practice_nadishodhana", "practice_bhramari", "practice_dhyana"] },
];

// ═══════════════════════════════════════════════════════════════
//  6. ASHTANGA YOGA FRAMEWORK
// ═══════════════════════════════════════════════════════════════
const ashtangaFramework = [
  { id: "limb_yama", name: "Yama", sanskrit_name: "यम", category: "bahiranga", order: 1, description: "Kode perilaku sosial dan etika. Perilaku sosial yang tepat berdasarkan moral.", components: [ { name: "Ahimsa", sanskrit_name: "अहिंसा", description: "Non-kekerasan dalam tindakan, pikiran, dan kata-kata", mental_health_benefit: "Mengurangi konflik internal dan kecemasan sosial" }, { name: "Satya", sanskrit_name: "सत्य", description: "Kejujuran dan kebenaran dalam pikiran, ucapan, dan tindakan", mental_health_benefit: "Meningkatkan integritas diri dan mengurangi rasa bersalah" }, { name: "Asteya", sanskrit_name: "अस्तेय", description: "Tidak mencuri atau mengambil yang bukan milik sendiri", mental_health_benefit: "Mengurangi kecemburuan dan ketidakpuasan" }, { name: "Brahmacharya", sanskrit_name: "ब्रह्मचर्य", description: "Pengendalian diri dalam perilaku seksual", mental_health_benefit: "Meningkatkan disiplin diri dan fokus mental" }, { name: "Aparigraha", sanskrit_name: "अपरिग्रह", description: "Tidak menimbun atau menghoard barang yang tidak dibutuhkan", mental_health_benefit: "Mengurangi kecemasan dari ketidakamanan dan ketakutan akan ketidakpastian" }, ], related_practice_ids: [] },
  { id: "limb_niyama", name: "Niyama", sanskrit_name: "नियम", category: "bahiranga", order: 2, description: "Aturan dan disiplin kehidupan pribadi. Observansi untuk kebersihan dan pengembangan diri.", components: [ { name: "Shauch", sanskrit_name: "शौच", description: "Kebersihan dan kemurnian pikiran dan tubuh", mental_health_benefit: "Menghilangkan pikiran dan emosi negatif (ketakutan, kemarahan, nafsu)" }, { name: "Santosh", sanskrit_name: "संतोष", description: "Kepuasan dengan apa yang dimiliki", mental_health_benefit: "Mengurangi rasa sakit dan penderitaan dari sifat serakah atau ketidakpuasan" }, { name: "Tapas", sanskrit_name: "तपस्", description: "Toleransi terhadap rasa sakit dengan niat baik, usaha terus-menerus", mental_health_benefit: "Menghilangkan kotoran fisik, emosional, dan pikiran; mengembangkan disiplin diri" }, { name: "Svadhyaya", sanskrit_name: "स्वाध्याय", description: "Studi dan analisis diri, memahami keberadaan sendiri", mental_health_benefit: "Mengembangkan insight sejati tentang diri, menjalani kehidupan bebas stres" }, { name: "Ishvara Pranidhana", sanskrit_name: "ईश्वर प्रणिधान", description: "Penyerahan kepada Tuhan/kekuatan tertinggi", mental_health_benefit: "Memberikan kekuatan menghadapi masalah apapun, keyakinan tanpa syarat" }, ], related_practice_ids: ["practice_jala_neti", "practice_sutra_neti"] },
  { id: "limb_asana", name: "Asana", sanskrit_name: "आसन", category: "bahiranga", order: 3, description: "Postur yang nyaman, stabil, dan menyenangkan (Sthirsukhasanam). Mengatur aliran pranik dan mengoptimalkan fungsi organ tubuh.", components: [ { name: "Standing Postures", sanskrit_name: "स्थानासन", description: "Postur berdiri: Tadasana, Vrikshasana, Katichakrasana", mental_health_benefit: "Keseimbangan, kepercayaan diri, grounding" }, { name: "Sitting Postures", sanskrit_name: "उपविष्ठासन", description: "Postur duduk: Paschimottanasana, Vakrasana, Gomukhasana", mental_health_benefit: "Ketenangan, fleksibilitas tulang belakang" }, { name: "Prone Postures", sanskrit_name: "अधोमुखासन", description: "Postur tengkurap: Makarasana, Bhujangasana", mental_health_benefit: "Relaksasi mendalam, penguatan punggung" }, { name: "Supine Postures", sanskrit_name: "उत्तानासन", description: "Postur terlentang: Shavasana, Sarvangasana, Setubandhasana", mental_health_benefit: "Relaksasi total, stimulasi endokrin" }, ], related_practice_ids: ["practice_tadasana", "practice_vrikshasana", "practice_shavasana", "practice_bhujangasana"] },
  { id: "limb_pranayama", name: "Pranayama", sanskrit_name: "प्राणायाम", category: "bahiranga", order: 4, description: "Regulasi amplitudo prana (napas dan energi vital). Menyeimbangkan sistem saraf otonom (parasimpatik dan simpatik).", components: [ { name: "Nadi Shodhana", sanskrit_name: "नाड़ी शोधन", description: "Pernapasan lubang hidung bergantian", mental_health_benefit: "Menyeimbangkan hemisfer otak, mengurangi kecemasan dan stres" }, { name: "Bhramari", sanskrit_name: "भ्रामरी", description: "Napas dengungan lebah", mental_health_benefit: "Menenangkan pikiran, meredakan kemarahan dan ketegangan" }, { name: "Ujjayi", sanskrit_name: "उज्जायी", description: "Napas kemenangan dengan suara laut", mental_health_benefit: "Mengatur kelenjar tiroid, menenangkan pikiran" }, ], related_practice_ids: ["practice_nadishodhana", "practice_bhramari", "practice_ujjayi"] },
  { id: "limb_pratyahara", name: "Pratyahara", sanskrit_name: "प्रत्याहार", category: "bahiranga", order: 5, description: "Penarikan indera dari objek eksternal. Kunci menjaga ketenangan dengan mengontrol indera yang menentukan keadaan mental.", components: [ { name: "Sense Withdrawal", sanskrit_name: "इन्द्रिय प्रत्याहार", description: "Penarikan indera dari hal-hal duniawi", mental_health_benefit: "Melindungi dari gejolak emosional, mengendalikan pikiran" }, ], related_practice_ids: ["practice_yoga_nidra", "practice_dhyana"] },
  { id: "limb_dharana", name: "Dharana", sanskrit_name: "धारणा", category: "antaranga", order: 6, description: "Mengendalikan atau memfokuskan pikiran pada satu titik. Alat penting untuk pemurnian pikiran dan mencapai Chittashuddhi.", components: [ { name: "Single-pointed Focus", sanskrit_name: "एकाग्रता", description: "Konsentrasi pada satu objek atau titik", mental_health_benefit: "Mengarah pada perkembangan emosional, intelektual, dan spiritual" }, ], related_practice_ids: ["practice_dhyana"] },
  { id: "limb_dhyana", name: "Dhyana", sanskrit_name: "ध्यान", category: "antaranga", order: 7, description: "Aliran kesadaran yang tidak terputus menuju objek kontemplasi. Dharana yang diperpanjang mengarah pada Dhyana.", components: [ { name: "Meditation", sanskrit_name: "ध्यान", description: "Meditasi: aliran kesadaran yang tidak terputus", mental_health_benefit: "Pikiran stabil, Chittashuddhi tercapai, perkembangan spiritual" }, ], related_practice_ids: ["practice_dhyana"] },
  { id: "limb_samadhi", name: "Samadhi", sanskrit_name: "समाधि", category: "antaranga", order: 8, description: "Ketika perbedaan antara subjek dan objek telah dihilangkan. Individu mencapai tahap kebahagiaan dan kedamaian batin.", components: [ { name: "Self-Realization", sanskrit_name: "आत्मसाक्षात्कार", description: "Realisasi diri dan penyatuan dengan kesadaran tertinggi", mental_health_benefit: "Kebahagiaan sempurna (Ananda), kedamaian batin total" }, ], related_practice_ids: [] },
];

// ═══════════════════════════════════════════════════════════════
//  MAIN SEED FUNCTION
// ═══════════════════════════════════════════════════════════════
async function seedAll() {
  const writer = new BatchWriter(db);

  console.log("\n🔥 YOGA MENTAL HEALTH — Firestore Seed Script");
  console.log("══════════════════════════════════════════════\n");

  // 1. Yoga Practices
  console.log(`🧘 Seeding yoga_practices (${yogaPractices.length} docs)...`);
  for (const p of yogaPractices) {
    const { id, ...data } = p;
    await writer.set(db.collection("yoga_practices").doc(id), { ...data, created_at: now });
  }
  await writer.commit();

  // 2. Mental Disorders
  console.log(`🧠 Seeding mental_disorders (${mentalDisorders.length} docs)...`);
  for (const d of mentalDisorders) {
    const { id, ...data } = d;
    await writer.set(db.collection("mental_disorders").doc(id), { ...data, created_at: now });
  }
  await writer.commit();

  // 3. Yoga Protocols
  console.log(`📋 Seeding yoga_protocols (${yogaProtocols.length} docs)...`);
  for (const p of yogaProtocols) {
    const { id, ...data } = p;
    await writer.set(db.collection("yoga_protocols").doc(id), { ...data, created_at: now });
  }
  await writer.commit();

  // 4. Food Items
  console.log(`🥗 Seeding food_items (${foodItems.length} docs)...`);
  for (const f of foodItems) {
    const { id, ...data } = f;
    await writer.set(db.collection("food_items").doc(id), { ...data, created_at: now });
  }
  await writer.commit();

  // 5. Research Evidence
  console.log(`📊 Seeding research_evidence (${researchEvidence.length} docs)...`);
  for (const r of researchEvidence) {
    const { id, ...data } = r;
    await writer.set(db.collection("research_evidence").doc(id), { ...data, created_at: now });
  }
  await writer.commit();

  // 6. Ashtanga Framework
  console.log(`🕉️  Seeding ashtanga_framework (${ashtangaFramework.length} docs)...`);
  for (const a of ashtangaFramework) {
    const { id, ...data } = a;
    await writer.set(db.collection("ashtanga_framework").doc(id), { ...data, created_at: now });
  }
  await writer.commit();

  // Summary
  const total = yogaPractices.length + mentalDisorders.length + yogaProtocols.length + foodItems.length + researchEvidence.length + ashtangaFramework.length;
  console.log(`\n══════════════════════════════════════════════`);
  console.log(`✅ Seeding complete! Total: ${total} documents written.`);
  console.log(`\n   yoga_practices:     ${yogaPractices.length}`);
  console.log(`   mental_disorders:   ${mentalDisorders.length}`);
  console.log(`   yoga_protocols:     ${yogaProtocols.length}`);
  console.log(`   food_items:         ${foodItems.length}`);
  console.log(`   research_evidence:  ${researchEvidence.length}`);
  console.log(`   ashtanga_framework: ${ashtangaFramework.length}`);
  console.log(`══════════════════════════════════════════════\n`);
}

// Run
seedAll().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
