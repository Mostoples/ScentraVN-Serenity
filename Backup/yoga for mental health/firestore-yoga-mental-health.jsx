import { useState } from "react";

const tabs = [
  { id: "architecture", label: "Arsitektur" },
  { id: "collections", label: "Collections" },
  { id: "firestore", label: "Firestore JSON" },
  { id: "queries", label: "Query Patterns" },
  { id: "rules", label: "Security Rules" },
  { id: "indexes", label: "Indexes" },
];

// ─── Firestore Collections Detail ───
const collections = [
  {
    name: "users",
    path: "/users/{userId}",
    icon: "👤",
    color: "#E74C3C",
    desc: "Dokumen utama pengguna. Denormalisasi profil mental health langsung di sini agar satu read cukup untuk dashboard.",
    subcollections: [
      { name: "progress_logs", path: "/users/{userId}/progress_logs/{logId}", desc: "Log harian: mood, stres, tidur, diet, yoga session. Subcollection agar bisa query per tanggal tanpa load seluruh user." },
      { name: "assessments", path: "/users/{userId}/assessments/{assessmentId}", desc: "Riwayat asesmen mental health. Disimpan sebagai subcollection agar bisa paginate secara independen." },
      { name: "session_history", path: "/users/{userId}/session_history/{sessionId}", desc: "Riwayat sesi yoga yang sudah dilakukan. Reference ke protocol & practices." },
      { name: "counselling_notes", path: "/users/{userId}/counselling_notes/{noteId}", desc: "Catatan konseling privat. Dipisah untuk keamanan data sensitif." },
    ],
    fields: [
      { name: "uid", type: "string", note: "Firebase Auth UID" },
      { name: "name", type: "string", note: "" },
      { name: "age", type: "number", note: "" },
      { name: "gender", type: "string", note: "male | female | other" },
      { name: "demographic_group", type: "string", note: "child | adolescent | adult | geriatric" },
      { name: "mental_health_profile", type: "map", note: "Embedded — lihat detail di bawah" },
      { name: "current_protocol_id", type: "string | null", note: "Reference ke protokol aktif" },
      { name: "streak_days", type: "number", note: "Jumlah hari berturut-turut praktik" },
      { name: "created_at", type: "timestamp", note: "" },
      { name: "updated_at", type: "timestamp", note: "" },
    ],
  },
  {
    name: "yoga_practices",
    path: "/yoga_practices/{practiceId}",
    icon: "🧘",
    color: "#3498DB",
    desc: "Root collection untuk seluruh praktik yoga. Tidak pakai subcollection — semua data di-embed karena satu praktik relatif kecil dan jarang berubah.",
    subcollections: [],
    fields: [
      { name: "name", type: "string", note: "Nama praktik (Bahasa)" },
      { name: "sanskrit_name", type: "string", note: "Nama Sanskerta" },
      { name: "category", type: "string", note: "shatkarma | sukshma_vyayama | sthula_vyayama | surya_namaskar | asana | pranayama | kriya | mudra_bandha | dhyana | yoga_nidra" },
      { name: "posture_type", type: "string | null", note: "standing | sitting | prone | supine | dynamic" },
      { name: "ashtanga_limb", type: "string", note: "yama | niyama | asana | pranayama | pratyahara | dharana | dhyana | samadhi" },
      { name: "difficulty", type: "string", note: "beginner | intermediate | advanced" },
      { name: "technique", type: "map", note: "{ preparation: [], steps: [], rounds, hold_seconds, breathing }" },
      { name: "benefits", type: "array<string>", note: "Manfaat kesehatan" },
      { name: "contraindications", type: "array<string>", note: "Kontraindikasi" },
      { name: "target_disorders", type: "array<string>", note: "Array of disorder_id yang cocok" },
      { name: "body_systems", type: "array<string>", note: "nervous | endocrine | cardiovascular | ..." },
      { name: "kosha_impact", type: "array<string>", note: "Kosha yang terpengaruh" },
      { name: "neuro_effects", type: "map", note: "{ serotonin, dopamine, cortisol, oxytocin, gaba }" },
      { name: "references", type: "array<string>", note: "Sumber teks klasik" },
      { name: "media", type: "map", note: "{ image_url, video_url }" },
      { name: "search_tags", type: "array<string>", note: "Untuk full-text search workaround" },
    ],
  },
  {
    name: "mental_disorders",
    path: "/mental_disorders/{disorderId}",
    icon: "🧠",
    color: "#9B59B6",
    desc: "Referensi gangguan mental berdasarkan ICD-10. Read-only collection, diisi saat deploy. Denormalisasi yoga recommendations langsung di sini.",
    subcollections: [],
    fields: [
      { name: "name", type: "string", note: "" },
      { name: "icd10_code", type: "string", note: "e.g. F32.1" },
      { name: "icd10_range", type: "string", note: "e.g. F30-F39" },
      { name: "category", type: "string", note: "organic | substance_use | schizophrenia | mood | neurotic | behavioral | personality | developmental | childhood" },
      { name: "signs_symptoms", type: "array<string>", note: "" },
      { name: "neurotransmitters", type: "array<string>", note: "serotonin | dopamine | glutamate" },
      { name: "brain_regions", type: "array<string>", note: "hippocampus | amygdala | temporal_lobe | ..." },
      { name: "structural_changes", type: "array<string>", note: "Perubahan struktur otak" },
      { name: "functional_changes", type: "array<string>", note: "Perubahan fungsi otak" },
      { name: "recommended_practices", type: "array<map>", note: "Denormalisasi: [{ practice_id, name, category, efficacy }]" },
      { name: "recommended_diet", type: "string", note: "satvik | avoid_rajasik | avoid_tamasik" },
      { name: "recommended_protocol_id", type: "string | null", note: "Protokol default" },
    ],
  },
  {
    name: "yoga_protocols",
    path: "/yoga_protocols/{protocolId}",
    icon: "📋",
    color: "#2ECC71",
    desc: "Protokol yoga lengkap. Steps di-embed sebagai array of maps (bukan subcollection) karena selalu dibaca sekaligus dan ukurannya kecil (max ~15 steps).",
    subcollections: [],
    fields: [
      { name: "name", type: "string", note: "" },
      { name: "target_condition", type: "string", note: "general | depression | anxiety | stress | ocd | ptsd | ..." },
      { name: "total_duration_min", type: "number", note: "Total durasi dalam menit" },
      { name: "frequency", type: "string", note: "daily | twice_daily | weekly" },
      { name: "steps", type: "array<map>", note: "Embedded — lihat detail di bawah" },
      { name: "guidelines", type: "map", note: "{ before: [], during: [], after: [] }" },
      { name: "evidence_ids", type: "array<string>", note: "Reference ke research_evidence" },
      { name: "difficulty", type: "string", note: "beginner | intermediate | advanced" },
      { name: "created_by", type: "string", note: "system | user_id" },
    ],
  },
  {
    name: "food_items",
    path: "/food_items/{foodId}",
    icon: "🥗",
    color: "#F39C12",
    desc: "Katalog makanan dengan klasifikasi Guna dan dampak terhadap mental health. Read-heavy, jarang berubah — cocok untuk client-side caching.",
    subcollections: [],
    fields: [
      { name: "name", type: "string", note: "" },
      { name: "guna", type: "string", note: "satvik | rajasik | tamasik" },
      { name: "food_group", type: "string", note: "grains | vegetables | fruits | dairy | nuts_seeds | ..." },
      { name: "nutrients", type: "array<string>", note: "vitamin_b1 | omega3 | zinc | ..." },
      { name: "positive_effects", type: "array<string>", note: "Efek positif mental" },
      { name: "negative_effects", type: "array<string>", note: "Efek negatif mental" },
      { name: "deficiency_symptoms", type: "array<string>", note: "" },
      { name: "recommended_for", type: "array<string>", note: "disorder_ids" },
      { name: "avoid_for", type: "array<string>", note: "disorder_ids" },
    ],
  },
  {
    name: "research_evidence",
    path: "/research_evidence/{researchId}",
    icon: "📊",
    color: "#1ABC9C",
    desc: "Database riset berbasis bukti. Digunakan untuk memberikan confidence level pada setiap rekomendasi yoga.",
    subcollections: [],
    fields: [
      { name: "title", type: "string", note: "" },
      { name: "authors", type: "array<string>", note: "" },
      { name: "year", type: "number", note: "" },
      { name: "study_type", type: "string", note: "rct | review | feasibility | observational | meta_analysis" },
      { name: "population", type: "string", note: "Target populasi studi" },
      { name: "yoga_types", type: "array<string>", note: "asana | pranayama | meditation | iyengar | integrated" },
      { name: "outcomes", type: "array<string>", note: "Hasil mental health" },
      { name: "key_findings", type: "string", note: "" },
      { name: "linked_disorders", type: "array<string>", note: "disorder_ids" },
      { name: "linked_practices", type: "array<string>", note: "practice_ids" },
    ],
  },
  {
    name: "ashtanga_framework",
    path: "/ashtanga_framework/{limbId}",
    icon: "🕉️",
    color: "#E67E22",
    desc: "Framework 8 limbs Ashtanga Yoga. Referensi statis untuk edukasi pengguna. Komponen (Yama/Niyama items) di-embed sebagai array of maps.",
    subcollections: [],
    fields: [
      { name: "name", type: "string", note: "" },
      { name: "sanskrit_name", type: "string", note: "" },
      { name: "category", type: "string", note: "bahiranga | antaranga" },
      { name: "order", type: "number", note: "1–8" },
      { name: "description", type: "string", note: "" },
      { name: "components", type: "array<map>", note: "[{ name, sanskrit, description, mental_health_benefit }]" },
      { name: "related_practice_ids", type: "array<string>", note: "" },
    ],
  },
];

// ─── Firestore JSON Examples ───
const firestoreJson = {
  users: `// 📁 /users/{userId}
{
  "uid": "firebase_auth_uid_abc123",
  "name": "Anita Dewi",
  "age": 32,
  "gender": "female",
  "demographic_group": "adult",

  // ═══ EMBEDDED: Mental Health Profile ═══
  "mental_health_profile": {
    "primary_condition": "anxiety",
    "icd10_code": "F41.1",
    "severity": "moderate",

    "risk_factors": {
      "biological": ["poor_nutrition", "lack_of_sleep"],
      "psychological": ["low_self_esteem", "poor_coping"],
      "socio_environmental": ["work_stress", "loneliness"]
    },

    "triguna": {
      "sattva": 0.3,
      "rajas": 0.5,
      "tamas": 0.2
    },

    "pancha_kosha": {
      "annamaya": "balanced",
      "pranamaya": "disturbed",
      "manomaya": "disturbed",
      "vijnanamaya": "balanced",
      "anandamaya": "balanced"
    }
  },

  "current_protocol_id": "proto_anxiety_beginner",
  "streak_days": 12,
  "created_at": "Timestamp",
  "updated_at": "Timestamp"
}`,

  progress: `// 📁 /users/{userId}/progress_logs/{logId}
{
  "date": "2026-03-25",
  "timestamp": "Timestamp",

  // ═══ Yoga Session ═══
  "yoga_session": {
    "protocol_id": "proto_anxiety_beginner",
    "practices_completed": [
      "practice_tadasana",
      "practice_vrikshasana",
      "practice_bhramari",
      "practice_dhyana"
    ],
    "duration_minutes": 45,
    "quality_rating": 4
  },

  // ═══ Mental State ═══
  "mental_state": {
    "mood_score": 7,
    "stress_level": "moderate",
    "anxiety_level": "low",
    "sleep_quality": "good",
    "energy_level": "high",
    "concentration": "good"
  },

  // ═══ Diet Log ═══
  "diet_log": {
    "meals": [
      {
        "type": "breakfast",
        "guna": "satvik",
        "mindful_eating": true
      },
      {
        "type": "lunch",
        "guna": "mixed",
        "mindful_eating": false
      }
    ],
    "mitahara_compliance": true
  },

  // ═══ Yogic Lifestyle Scores (1-5) ═══
  "yogic_lifestyle": {
    "ahara": 4,
    "vihara": 3,
    "achara": 4,
    "vichara": 3,
    "vyavahara": 4
  }
}`,

  practice: `// 📁 /yoga_practices/{practiceId}
{
  "name": "Bhramari Pranayama",
  "sanskrit_name": "भ्रामरी प्राणायाम",
  "category": "pranayama",
  "posture_type": null,
  "ashtanga_limb": "pranayama",
  "difficulty": "beginner",

  "technique": {
    "preparation": [
      "Duduk dalam posisi Padmasana atau Siddhasana",
      "Tutup mata, jaga mulut tetap tertutup"
    ],
    "steps": [
      "Tarik napas dalam melalui kedua lubang hidung",
      "Saat menghembuskan napas, buat suara dengungan lembut",
      "Tutup kedua telinga dengan ibu jari",
      "Hembuskan napas dengan suara dengungan seperti lebah"
    ],
    "rounds": 3,
    "hold_seconds": null,
    "breathing": "deep_inhale_humming_exhale"
  },

  "benefits": [
    "Menenangkan pikiran dan mengurangi kecemasan",
    "Mengurangi ketegangan, kemarahan",
    "Memfasilitasi praktik meditasi"
  ],

  "contraindications": [
    "Infeksi telinga",
    "Penyakit jantung (tanpa Kumbhaka)"
  ],

  "target_disorders": [
    "disorder_anxiety",
    "disorder_stress",
    "disorder_depression",
    "disorder_insomnia"
  ],

  "body_systems": ["nervous", "endocrine"],
  "kosha_impact": ["pranamaya", "manomaya"],

  "neuro_effects": {
    "serotonin": "increase",
    "dopamine": "increase",
    "cortisol": "decrease",
    "oxytocin": "increase",
    "gaba": "increase"
  },

  "references": [
    "Hathapradipika",
    "Hatharatnavalli-ii.26",
    "Kumbhaka Paddhati-169"
  ],

  "media": {
    "image_url": "gs://bucket/bhramari.webp",
    "video_url": "gs://bucket/bhramari.mp4"
  },

  "search_tags": [
    "pranayama", "breathing", "bhramari",
    "anxiety", "stress", "calm", "meditation",
    "beginner", "humming", "bee breath"
  ]
}`,

  protocol: `// 📁 /yoga_protocols/{protocolId}
{
  "name": "Protokol Yoga untuk Kesehatan Mental",
  "target_condition": "general_mental_health",
  "total_duration_min": 60,
  "frequency": "daily",
  "difficulty": "beginner",
  "created_by": "system",

  "steps": [
    {
      "order": 1,
      "practice_id": "practice_prayer",
      "name": "Prayer",
      "category": "prayer",
      "duration_min": 1,
      "rounds": null,
      "notes": null
    },
    {
      "order": 2,
      "practice_id": "practice_jala_neti",
      "name": "Shat Kriyas (Jala Neti + Sutra Neti)",
      "category": "shatkarma",
      "duration_min": 10,
      "rounds": null,
      "notes": "Memerlukan supervisi"
    },
    {
      "order": 3,
      "practice_id": "practice_sukshma",
      "name": "Yogic Sukshma Vyayama",
      "category": "sukshma_vyayama",
      "duration_min": 12,
      "rounds": 3,
      "notes": "Neck, shoulder, trunk, knee, ankle"
    },
    // ... step 4-8 ...
    {
      "order": 9,
      "practice_id": "practice_dhyana",
      "name": "Dhyana (Meditation)",
      "category": "dhyana",
      "duration_min": 5,
      "rounds": null,
      "notes": "Fokus pada ruang antara alis mata"
    },
    {
      "order": 10,
      "practice_id": "practice_shanti",
      "name": "Shanti Patha",
      "category": "prayer",
      "duration_min": 1,
      "rounds": null,
      "notes": null
    }
  ],

  "guidelines": {
    "before": [
      "Praktik pagi hari sebelum matahari terbit",
      "Perut kosong (3-4 jam setelah makan berat)",
      "Pakaian longgar dan nyaman",
      "Tempat bersih, berventilasi baik"
    ],
    "during": [
      "Bernapas melalui hidung kecuali diarahkan lain",
      "Gerakan perlahan tanpa memaksakan",
      "Hentikan jika ada nyeri hebat"
    ],
    "after": [
      "Mandi setelah 15-30 menit",
      "Makan ringan setelah 15-30 menit",
      "Akhiri dengan Shanti Patha"
    ]
  },

  "evidence_ids": [
    "research_harner_2010",
    "research_gururaja_2011",
    "research_khalsa_2012"
  ]
}`,
};

// ─── Query Patterns ───
const queryPatterns = [
  {
    title: "Dashboard Pengguna",
    desc: "Load profil + 7 hari terakhir progress",
    code: `// 1. Get user profile (1 read)
const userDoc = await getDoc(doc(db, "users", userId));

// 2. Get last 7 days progress (max 7 reads)
const logsRef = collection(db, "users", userId, "progress_logs");
const q = query(logsRef,
  where("date", ">=", sevenDaysAgo),
  orderBy("date", "desc"),
  limit(7)
);
const logs = await getDocs(q);

// Total: 1 + 7 = 8 reads max ✅`,
  },
  {
    title: "Cari Yoga untuk Gangguan Tertentu",
    desc: "Ambil praktik yoga yang cocok untuk anxiety",
    code: `// Option A: Query dari yoga_practices (array-contains)
const q = query(
  collection(db, "yoga_practices"),
  where("target_disorders", "array-contains", "disorder_anxiety"),
  where("difficulty", "==", "beginner"),
  orderBy("category")
);

// Option B: Dari denormalisasi di mental_disorders
const disorder = await getDoc(
  doc(db, "mental_disorders", "disorder_anxiety")
);
const practices = disorder.data().recommended_practices;
// → Sudah ada nama + category, hemat reads! ✅`,
  },
  {
    title: "Load Protokol + Detail Praktik",
    desc: "Ambil protokol lengkap dan enrichment data",
    code: `// 1. Get protocol (1 read)
const protocol = await getDoc(
  doc(db, "yoga_protocols", protocolId)
);
// Steps sudah embedded, tidak perlu read tambahan!

// 2. Jika butuh detail gambar/video per praktik:
const practiceIds = protocol.data().steps
  .map(s => s.practice_id);
  
// Batch get (max 10 per batch)
const practiceRefs = practiceIds.map(id =>
  doc(db, "yoga_practices", id)
);
const practices = await Promise.all(
  chunk(practiceRefs, 10).map(batch => getDocs(batch))
);
// Total: 1 + ceil(N/10) reads ✅`,
  },
  {
    title: "Filter Makanan per Guna + Nutrisi",
    desc: "Tampilkan makanan Satvik yang mengandung Omega-3",
    code: `const q = query(
  collection(db, "food_items"),
  where("guna", "==", "satvik"),
  where("nutrients", "array-contains", "omega3")
);
const foods = await getDocs(q);
// ⚠️ Butuh composite index: guna + nutrients`,
  },
  {
    title: "Trend Mood Bulanan",
    desc: "Analisis tren mood score 30 hari terakhir",
    code: `const logsRef = collection(
  db, "users", userId, "progress_logs"
);
const q = query(logsRef,
  where("date", ">=", thirtyDaysAgo),
  orderBy("date", "asc"),
  limit(30)
);
const logs = await getDocs(q);

// Client-side aggregation
const trend = logs.docs.map(d => ({
  date: d.data().date,
  mood: d.data().mental_state.mood_score,
  stress: d.data().mental_state.stress_level,
  sleep: d.data().mental_state.sleep_quality,
}));`,
  },
  {
    title: "Rekomendasi Protokol Personal",
    desc: "Generate rekomendasi berdasarkan asesmen user",
    code: `// 1. Baca profil user
const user = await getDoc(doc(db, "users", userId));
const condition = user.data()
  .mental_health_profile.primary_condition;

// 2. Cari protokol cocok
const q = query(
  collection(db, "yoga_protocols"),
  where("target_condition", "==", condition),
  where("difficulty", "==", "beginner"),
  limit(3)
);

// 3. Cari gangguan untuk enrichment
const disorder = await getDoc(
  doc(db, "mental_disorders", \`disorder_\${condition}\`)
);
const diet = disorder.data().recommended_diet;

// 4. Ambil makanan yang direkomendasikan
const foodQ = query(
  collection(db, "food_items"),
  where("guna", "==", diet === "satvik" ? "satvik" : "satvik"),
  where("recommended_for", "array-contains",
    disorder.id),
  limit(10)
);`,
  },
];

// ─── Security Rules ───
const securityRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ══════════════════════════════════
    // 🔒 USER DATA — Private per user
    // ══════════════════════════════════
    match /users/{userId} {
      // User hanya bisa baca/tulis data sendiri
      allow read, update: if request.auth != null
        && request.auth.uid == userId;
      allow create: if request.auth != null
        && request.auth.uid == userId;
      allow delete: if false; // Soft delete only

      // Subcollections: progress, assessments, sessions
      match /progress_logs/{logId} {
        allow read, create: if request.auth.uid == userId;
        allow update: if request.auth.uid == userId
          && request.time < resource.data.timestamp
            + duration.value(24, 'h'); // Edit max 24 jam
        allow delete: if false;
      }

      match /assessments/{assessmentId} {
        allow read, create: if request.auth.uid == userId;
        allow update, delete: if false; // Immutable
      }

      match /session_history/{sessionId} {
        allow read, create: if request.auth.uid == userId;
        allow update, delete: if false;
      }

      match /counselling_notes/{noteId} {
        allow read, create: if request.auth.uid == userId;
        allow update: if request.auth.uid == userId;
        allow delete: if false;
      }
    }

    // ══════════════════════════════════
    // 📖 REFERENCE DATA — Read-only public
    // ══════════════════════════════════
    match /yoga_practices/{practiceId} {
      allow read: if request.auth != null;
      allow write: if false; // Admin SDK only
    }

    match /mental_disorders/{disorderId} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    match /yoga_protocols/{protocolId} {
      allow read: if request.auth != null;
      // User-created protocols
      allow create: if request.auth != null
        && request.resource.data.created_by
          == request.auth.uid;
      allow update, delete: if request.auth != null
        && resource.data.created_by
          == request.auth.uid;
    }

    match /food_items/{foodId} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    match /research_evidence/{researchId} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    match /ashtanga_framework/{limbId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}`;

// ─── Composite Indexes ───
const indexes = [
  { collection: "yoga_practices", fields: ["category ASC", "difficulty ASC"], purpose: "Filter praktik per kategori + level" },
  { collection: "yoga_practices", fields: ["target_disorders (array)", "difficulty ASC"], purpose: "Cari praktik per gangguan + level" },
  { collection: "yoga_practices", fields: ["ashtanga_limb ASC", "category ASC"], purpose: "Browse per limb Ashtanga" },
  { collection: "yoga_practices", fields: ["posture_type ASC", "difficulty ASC"], purpose: "Filter per tipe postur" },
  { collection: "food_items", fields: ["guna ASC", "nutrients (array)"], purpose: "Filter makanan per Guna + nutrisi" },
  { collection: "food_items", fields: ["guna ASC", "recommended_for (array)"], purpose: "Rekomendasi diet per gangguan" },
  { collection: "yoga_protocols", fields: ["target_condition ASC", "difficulty ASC"], purpose: "Cari protokol per kondisi" },
  { collection: "mental_disorders", fields: ["category ASC", "icd10_range ASC"], purpose: "Browse gangguan per kategori ICD-10" },
  { collection: "progress_logs (sub)", fields: ["date DESC"], purpose: "Ambil log terbaru" },
  { collection: "progress_logs (sub)", fields: ["date ASC", "mental_state.mood_score ASC"], purpose: "Analisis tren mood" },
  { collection: "research_evidence", fields: ["study_type ASC", "year DESC"], purpose: "Filter riset per tipe + tahun" },
  { collection: "session_history (sub)", fields: ["timestamp DESC"], purpose: "Riwayat sesi terbaru" },
];

export default function FirestoreArchitecture() {
  const [activeTab, setActiveTab] = useState("architecture");
  const [expandedCol, setExpandedCol] = useState(null);
  const [activeJson, setActiveJson] = useState("users");

  return (
    <div style={{
      fontFamily: "'Source Serif 4', 'Crimson Text', Georgia, serif",
      background: "#0c0f14",
      color: "#d4cfc4",
      minHeight: "100vh",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(160deg, #1a1207 0%, #0c0f14 50%, #0a1628 100%)",
        borderBottom: "1px solid #2a2520",
        padding: "28px 20px 18px",
        textAlign: "center",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(255,150,0,0.08)", border: "1px solid rgba(255,150,0,0.2)",
          borderRadius: 20, padding: "4px 14px", fontSize: 11,
          color: "#ff9600", fontFamily: "monospace", marginBottom: 10,
        }}>
          <span style={{ fontSize: 13 }}>🔥</span> Cloud Firestore — NoSQL Document Database
        </div>
        <h1 style={{
          fontSize: 26, fontWeight: 700, margin: "0 0 4px",
          background: "linear-gradient(135deg, #ff9600, #ffcc02, #ff9600)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Yoga Mental Health — Firestore Architecture
        </h1>
        <div style={{ fontSize: 12, color: "#5a5a5a" }}>
          7 root collections • 4 subcollections • optimized for mobile-first reads
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", overflowX: "auto",
        borderBottom: "1px solid #1a1a1a",
        background: "rgba(0,0,0,0.4)",
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: "1 0 auto", padding: "11px 14px", border: "none",
            borderBottom: activeTab === t.id ? "2px solid #ff9600" : "2px solid transparent",
            background: activeTab === t.id ? "rgba(255,150,0,0.06)" : "transparent",
            color: activeTab === t.id ? "#ff9600" : "#5a5a5a",
            fontFamily: "inherit", fontSize: 12, fontWeight: activeTab === t.id ? 700 : 400,
            cursor: "pointer", whiteSpace: "nowrap",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "20px 16px", maxWidth: 920, margin: "0 auto" }}>

        {/* ═══ ARCHITECTURE TAB ═══ */}
        {activeTab === "architecture" && (
          <div>
            <H2>Prinsip Desain Firestore</H2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {[
                { icon: "📄", title: "Denormalisasi > Normalisasi", detail: "Data yang sering dibaca bersama di-embed dalam satu dokumen. Contoh: mental_health_profile di-embed di users, steps di-embed di protocols." },
                { icon: "📂", title: "Subcollection untuk Data Tumbuh", detail: "progress_logs, assessments, session_history → subcollection karena akan terus bertambah dan perlu query independen (filter tanggal, pagination)." },
                { icon: "🔗", title: "Soft References via ID String", detail: "Tidak pakai Firestore reference type. Simpan ID sebagai string biasa untuk fleksibilitas cross-platform dan serialisasi JSON." },
                { icon: "🏷️", title: "search_tags Array untuk Pencarian", detail: "Firestore tidak support full-text search. Gunakan array of tags + array-contains untuk workaround pencarian sederhana." },
                { icon: "💰", title: "Minimize Reads = Minimize Cost", detail: "Setiap read = biaya. Embed data yang selalu dibaca bersama. Denormalisasi recommended_practices di mental_disorders agar tidak perlu join." },
                { icon: "📱", title: "Offline-First Friendly", detail: "Struktur dirancang agar Firestore SDK bisa cache dokumen secara efisien untuk penggunaan offline." },
              ].map((p, i) => (
                <div key={i} style={{
                  display: "flex", gap: 12, padding: "12px 14px",
                  background: "rgba(255,150,0,0.03)", border: "1px solid #1a1a1a",
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: 20, minWidth: 28 }}>{p.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#ffcc02", marginBottom: 3 }}>{p.title}</div>
                    <div style={{ fontSize: 12, color: "#7a7a6a", lineHeight: 1.6 }}>{p.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            <H2>Peta Collection & Subcollection</H2>
            <div style={{
              background: "#0a0d12", border: "1px solid #1a1a1a",
              borderRadius: 8, padding: 16, fontFamily: "monospace", fontSize: 12,
              lineHeight: 2, color: "#7a8a7a", overflowX: "auto",
            }}>
              <div><span style={{ color: "#ff9600" }}>🔥 Firestore Root</span></div>
              <div>├── <C c="#E74C3C">users</C>/<span style={{ color: "#555" }}>{"{userId}"}</span></div>
              <div>│   ├── <C c="#E74C3C">progress_logs</C>/<span style={{ color: "#555" }}>{"{logId}"}</span> <G>← mood, yoga, diet harian</G></div>
              <div>│   ├── <C c="#E74C3C">assessments</C>/<span style={{ color: "#555" }}>{"{assessmentId}"}</span> <G>← riwayat asesmen</G></div>
              <div>│   ├── <C c="#E74C3C">session_history</C>/<span style={{ color: "#555" }}>{"{sessionId}"}</span> <G>← riwayat sesi yoga</G></div>
              <div>│   └── <C c="#E74C3C">counselling_notes</C>/<span style={{ color: "#555" }}>{"{noteId}"}</span> <G>← catatan konseling</G></div>
              <div>├── <C c="#3498DB">yoga_practices</C>/<span style={{ color: "#555" }}>{"{practiceId}"}</span> <G>← 30+ asana, pranayama, dll</G></div>
              <div>├── <C c="#9B59B6">mental_disorders</C>/<span style={{ color: "#555" }}>{"{disorderId}"}</span> <G>← ICD-10 referensi</G></div>
              <div>├── <C c="#2ECC71">yoga_protocols</C>/<span style={{ color: "#555" }}>{"{protocolId}"}</span> <G>← protokol 60 menit</G></div>
              <div>├── <C c="#F39C12">food_items</C>/<span style={{ color: "#555" }}>{"{foodId}"}</span> <G>← katalog makanan Guna</G></div>
              <div>├── <C c="#1ABC9C">research_evidence</C>/<span style={{ color: "#555" }}>{"{researchId}"}</span> <G>← riset berbasis bukti</G></div>
              <div>└── <C c="#E67E22">ashtanga_framework</C>/<span style={{ color: "#555" }}>{"{limbId}"}</span> <G>← 8 limbs Ashtanga</G></div>
            </div>
          </div>
        )}

        {/* ═══ COLLECTIONS TAB ═══ */}
        {activeTab === "collections" && (
          <div>
            <H2>Detail Seluruh Collections</H2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {collections.map((col, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${col.color}22`,
                  borderLeft: `3px solid ${col.color}`,
                  borderRadius: 8, overflow: "hidden",
                }}>
                  <button onClick={() => setExpandedCol(expandedCol === i ? null : i)} style={{
                    width: "100%", padding: "14px 16px", border: "none",
                    background: "transparent", cursor: "pointer", textAlign: "left",
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <span style={{ fontSize: 20 }}>{col.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "monospace", fontSize: 14, color: col.color, fontWeight: 700 }}>
                        {col.name}
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: 10, color: "#4a4a4a" }}>{col.path}</div>
                    </div>
                    <span style={{ color: "#4a4a4a", fontSize: 18, transform: expandedCol === i ? "rotate(180deg)" : "rotate(0)", transition: "0.2s" }}>▾</span>
                  </button>

                  {expandedCol === i && (
                    <div style={{ padding: "0 16px 16px" }}>
                      <div style={{ fontSize: 12, color: "#7a7a6a", lineHeight: 1.6, marginBottom: 12 }}>{col.desc}</div>

                      {col.subcollections.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 10, color: "#ff9600", fontFamily: "monospace", marginBottom: 6, letterSpacing: 1 }}>SUBCOLLECTIONS</div>
                          {col.subcollections.map((sub, j) => (
                            <div key={j} style={{
                              padding: "8px 10px", marginBottom: 4,
                              background: "rgba(255,150,0,0.04)", borderRadius: 4,
                              border: "1px solid rgba(255,150,0,0.1)",
                            }}>
                              <div style={{ fontFamily: "monospace", fontSize: 11, color: "#ffcc02" }}>{sub.name}</div>
                              <div style={{ fontFamily: "monospace", fontSize: 9, color: "#3a3a3a" }}>{sub.path}</div>
                              <div style={{ fontSize: 11, color: "#5a5a5a", marginTop: 2 }}>{sub.desc}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ fontSize: 10, color: col.color, fontFamily: "monospace", marginBottom: 6, letterSpacing: 1 }}>FIELDS</div>
                      <div style={{
                        background: "#080a0e", borderRadius: 6, overflow: "hidden",
                        border: "1px solid #1a1a1a",
                      }}>
                        {col.fields.map((f, j) => (
                          <div key={j} style={{
                            display: "flex", gap: 8, padding: "6px 10px",
                            borderBottom: j < col.fields.length - 1 ? "1px solid #111" : "none",
                            fontSize: 11, fontFamily: "monospace",
                            alignItems: "flex-start",
                          }}>
                            <span style={{ color: "#d4cfc4", minWidth: 160, flexShrink: 0 }}>{f.name}</span>
                            <span style={{ color: "#5a8a5a", minWidth: 120, flexShrink: 0 }}>{f.type}</span>
                            <span style={{ color: "#4a4a4a", fontSize: 10 }}>{f.note}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ FIRESTORE JSON TAB ═══ */}
        {activeTab === "firestore" && (
          <div>
            <H2>Contoh Dokumen Firestore</H2>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {[
                { id: "users", label: "User Profile" },
                { id: "progress", label: "Progress Log" },
                { id: "practice", label: "Yoga Practice" },
                { id: "protocol", label: "Protocol" },
              ].map(b => (
                <button key={b.id} onClick={() => setActiveJson(b.id)} style={{
                  padding: "6px 14px", borderRadius: 20, border: "1px solid",
                  borderColor: activeJson === b.id ? "#ff9600" : "#2a2a2a",
                  background: activeJson === b.id ? "rgba(255,150,0,0.1)" : "transparent",
                  color: activeJson === b.id ? "#ff9600" : "#5a5a5a",
                  fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                }}>{b.label}</button>
              ))}
            </div>
            <pre style={{
              background: "#080a0e", border: "1px solid #1a1a1a",
              borderRadius: 8, padding: 16, overflowX: "auto",
              fontSize: 11, lineHeight: 1.6, color: "#8a9a8a",
              fontFamily: "'Fira Code', Consolas, monospace",
              maxHeight: 520,
            }}>
              {firestoreJson[activeJson]}
            </pre>
          </div>
        )}

        {/* ═══ QUERIES TAB ═══ */}
        {activeTab === "queries" && (
          <div>
            <H2>Query Patterns — Firestore SDK</H2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {queryPatterns.map((qp, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid #1a1a1a", borderRadius: 8,
                  overflow: "hidden",
                }}>
                  <div style={{ padding: "12px 14px", borderBottom: "1px solid #111" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#ffcc02", marginBottom: 2 }}>{qp.title}</div>
                    <div style={{ fontSize: 11, color: "#5a5a5a" }}>{qp.desc}</div>
                  </div>
                  <pre style={{
                    margin: 0, padding: 14, fontSize: 11,
                    lineHeight: 1.6, color: "#7a8a7a",
                    fontFamily: "'Fira Code', Consolas, monospace",
                    overflowX: "auto", background: "#060810",
                  }}>{qp.code}</pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ SECURITY RULES TAB ═══ */}
        {activeTab === "rules" && (
          <div>
            <H2>Firestore Security Rules</H2>
            <p style={{ fontSize: 12, color: "#5a5a5a", marginBottom: 14 }}>
              Rules dirancang dengan prinsip: user data private, reference data read-only, user-created protocols editable by owner.
            </p>
            <pre style={{
              background: "#080a0e", border: "1px solid #1a1a1a",
              borderRadius: 8, padding: 16, overflowX: "auto",
              fontSize: 11, lineHeight: 1.5, color: "#7a8a7a",
              fontFamily: "'Fira Code', Consolas, monospace",
              maxHeight: 520,
            }}>{securityRules}</pre>
          </div>
        )}

        {/* ═══ INDEXES TAB ═══ */}
        {activeTab === "indexes" && (
          <div>
            <H2>Composite Indexes</H2>
            <p style={{ fontSize: 12, color: "#5a5a5a", marginBottom: 14 }}>
              Firestore membutuhkan composite index untuk query dengan multiple where clause atau orderBy. Deploy via <code style={{ color: "#ff9600", fontSize: 11 }}>firestore.indexes.json</code>.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {indexes.map((idx, i) => (
                <div key={i} style={{
                  display: "flex", gap: 10, padding: "10px 12px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid #1a1a1a", borderRadius: 6,
                  alignItems: "flex-start", flexWrap: "wrap",
                }}>
                  <span style={{
                    fontFamily: "monospace", fontSize: 11, color: "#ff9600",
                    minWidth: 160, flexShrink: 0,
                  }}>{idx.collection}</span>
                  <span style={{
                    fontFamily: "monospace", fontSize: 10, color: "#5a8a5a",
                    flex: "1 1 200px", minWidth: 180,
                  }}>{idx.fields.join(" + ")}</span>
                  <span style={{ fontSize: 11, color: "#4a4a4a", flex: "1 1 200px" }}>{idx.purpose}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function H2({ children }) {
  return (
    <h2 style={{
      fontSize: 16, fontWeight: 700, color: "#ffcc02",
      borderBottom: "1px solid #1a1a1a",
      paddingBottom: 8, marginBottom: 14, marginTop: 20,
    }}>{children}</h2>
  );
}

function C({ c, children }) {
  return <span style={{ color: c, fontWeight: 700 }}>{children}</span>;
}

function G({ children }) {
  return <span style={{ color: "#3a3a3a", fontSize: 10 }}>{children}</span>;
}
