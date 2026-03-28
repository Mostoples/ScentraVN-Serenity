/**
 * SynaWatch Research Foundation
 * Systematic Literature Review (PRISMA) for all features
 * 50 peer-reviewed papers organized by 10 research domains
 */

const ResearchFoundation = {
  domains: {
    1: { id: 1, label: 'Wearable Biosensors & Mental Health', icon: 'fa-microchip', color: '#8B5CF6', features: ['BLE Sensor', 'Dashboard', 'Health Page'] },
    2: { id: 2, label: 'PHQ-9 Digital Screening', icon: 'fa-brain', color: '#6366f1', features: ['Assessment Module'] },
    3: { id: 3, label: 'Loneliness & Social Isolation', icon: 'fa-people-arrows', color: '#ec4899', features: ['UCLA Assessment', 'Support Hub'] },
    4: { id: 4, label: 'Closed-Loop Interventions', icon: 'fa-rotate', color: '#14b8a6', features: ['Intervention Engine'] },
    5: { id: 5, label: 'Sleep Monitoring & Treatment', icon: 'fa-moon', color: '#6366f1', features: ['Sleep Lab'] },
    6: { id: 6, label: 'Music Therapy & Mood', icon: 'fa-music', color: '#f59e0b', features: ['Mood Booster'] },
    7: { id: 7, label: 'Digital Mindfulness', icon: 'fa-spa', color: '#10b981', features: ['Mindful Moment'] },
    8: { id: 8, label: 'Digital Journaling', icon: 'fa-book-open', color: '#f97316', features: ['Refleksi Harian'] },
    9: { id: 9, label: 'AI Chatbots & Conversation', icon: 'fa-robot', color: '#3b82f6', features: ['SynaCHAT AI'] },
    10: { id: 10, label: 'Crisis Support & Safety Planning', icon: 'fa-shield-heart', color: '#ef4444', features: ['Support Hub'] }
  },

  papers: [
    // Domain 1: Wearable Biosensors (1-6)
    { id: 1, domain: 1, title: 'Smart Devices and Wearable Technologies to Detect and Monitor Mental Health Conditions and Stress: A Systematic Review', authors: 'Hickey et al.', year: 2021, journal: 'Sensors', citations: 201, url: 'https://consensus.app/papers/details/5d72277604235cf48d72e26b0d2ebb77/', relevanceNote: 'Comprehensive SLR establishing wearable efficacy for mental health monitoring' },
    { id: 2, domain: 1, title: 'Fusing Wearable Biosensors with AI for Mental Health Monitoring: A Systematic Review', authors: 'Quisel et al.', year: 2025, journal: 'Biosensors', citations: 14, url: 'https://consensus.app/papers/details/9f07775f73aa5fb2a402de42afb06e4e/', relevanceNote: 'Latest methods for integrating multiple biosensor streams with AI' },
    { id: 3, domain: 1, title: 'Deep learning with wearable based HRV for prediction of mental and general health', authors: 'Salekin et al.', year: 2020, journal: 'J Biomedical Informatics', citations: 94, url: 'https://consensus.app/papers/details/d38da5e199d352b1b2e1c19deae5f1e9/', relevanceNote: 'HRV deep learning models for mental health prediction' },
    { id: 4, domain: 1, title: 'A Review on Mental Stress Detection Using Wearable Sensors and ML', authors: 'Can et al.', year: 2021, journal: 'IEEE Access', citations: 294, url: 'https://consensus.app/papers/details/41a29b5399235e11af9d48a798e0e60f/', relevanceNote: 'Machine learning approaches for real-time stress detection from wearables' },
    { id: 5, domain: 1, title: 'A Survey on Wearable Sensors for Mental Health Monitoring', authors: 'Samson & Koh', year: 2023, journal: 'Sensors', citations: 83, url: 'https://consensus.app/papers/details/2852a29a54355c7988b9c6f016efb98a/', relevanceNote: 'Recent survey of sensor types and mental health applications' },
    { id: 6, domain: 1, title: 'Generalizable ML for stress monitoring from wearable devices: SLR', authors: 'Galli et al.', year: 2022, journal: 'Int J Medical Informatics', citations: 83, url: 'https://consensus.app/papers/details/954580624bd759cd949692f1a0b44868/', relevanceNote: 'Cross-device generalization for stress detection algorithms' },

    // Domain 2: PHQ-9 Digital Screening (7-11)
    { id: 7, domain: 2, title: 'Screening for depression in primary care with PHQ-9: A systematic review', authors: 'Levis et al.', year: 2020, journal: 'J Affective Disorders', citations: 503, url: 'https://consensus.app/papers/details/487cffa920e451a097391ae0ad070134/', relevanceNote: 'Gold-standard validation of PHQ-9 as digital screening instrument' },
    { id: 8, domain: 2, title: '14-day smartphone ambulatory assessment vs PHQ-9 depression screening', authors: 'Moshe et al.', year: 2021, journal: 'PLoS ONE', citations: 28, url: 'https://consensus.app/papers/details/234237c03cfa58ed96240de422077468/', relevanceNote: 'Real-time mobile PHQ-9 assessment validation' },
    { id: 9, domain: 2, title: 'ML Approach for Detecting Digital Behavioral Patterns of Depression Using Smartphone Data', authors: 'Morgiève et al.', year: 2022, journal: 'JMIR Formative Research', citations: 19, url: 'https://consensus.app/papers/details/76ff7e542cd858ffad4149c9b5fc1f7f/', relevanceNote: 'Behavioral signals complement traditional PHQ-9 assessment' },
    { id: 10, domain: 2, title: 'Youth screening depression: Validation of PHQ-9 in adolescents', authors: 'Garabiles et al.', year: 2023, journal: 'Psychiatry Research', citations: 57, url: 'https://consensus.app/papers/details/0b4cc22f8faf51b4bdae14d163814032/', relevanceNote: 'PHQ-9 validation in younger demographics' },
    { id: 11, domain: 2, title: 'Screening for Depression in Mobile Devices Using PHQ-9: Diagnostic Meta-Analysis via ML', authors: 'Kim et al.', year: 2021, journal: 'Neuropsychiatric Disease and Treatment', citations: 11, url: 'https://consensus.app/papers/details/25ff613a89055ad6b0e4febcab476555/', relevanceNote: 'Mobile-optimized PHQ-9 with ML interpretation' },

    // Domain 3: Loneliness & Social Isolation (12-16)
    { id: 12, domain: 3, title: 'Digital bridges to social connection: SR and meta-analysis of digital interventions for loneliness', authors: 'Biernesser et al.', year: 2025, journal: 'Internet Interventions', citations: 3, url: 'https://consensus.app/papers/details/65d465c9164c5de0ac79151a00c97748/', relevanceNote: 'Latest evidence on digital loneliness interventions' },
    { id: 13, domain: 3, title: 'A Pilot Digital Intervention Targeting Loneliness in Youth Mental Health', authors: 'Lim et al.', year: 2019, journal: 'Frontiers in Psychiatry', citations: 81, url: 'https://consensus.app/papers/details/7749311f9c085b5b935c64c44b2e3833/', relevanceNote: 'Youth-focused digital loneliness intervention pilot' },
    { id: 14, domain: 3, title: 'Digitally Enabled Peer Support to Address Loneliness: Prospective Cohort', authors: 'Shah et al.', year: 2023, journal: 'JMIR Formative Research', citations: 7, url: 'https://consensus.app/papers/details/986d545b99ed54588072d7b2b31822a8/', relevanceNote: 'Peer support mechanisms reduce loneliness in digital platforms' },
    { id: 15, domain: 3, title: 'Digital technology for social wellbeing reduces social isolation in older adults: SR', authors: 'Choi et al.', year: 2022, journal: 'SSM Population Health', citations: 228, url: 'https://consensus.app/papers/details/2f13740e528c519ba0b35cc9b5763a27/', relevanceNote: 'Evidence for digital social connection across age groups' },
    { id: 16, domain: 3, title: 'Interventions to address loneliness and social isolation in young people: SR', authors: 'Eccles & Qualter', year: 2021, journal: 'J Adolescence', citations: 41, url: 'https://consensus.app/papers/details/97eaa28fc50c5d1bb1adf8668eade2a2/', relevanceNote: 'Intervention framework for youth isolation mitigation' },

    // Domain 4: Closed-Loop / JITAI (17-21)
    { id: 17, domain: 4, title: 'JITAI: A Meta-Analytical Review', authors: 'Nahum-Shani et al.', year: 2019, journal: 'Health Communication', citations: 170, url: 'https://consensus.app/papers/details/15cb424863b459f9bcdfa703bc41a6db/', relevanceNote: 'Foundational JITAI framework for adaptive mental health interventions' },
    { id: 18, domain: 4, title: 'Ecological momentary interventions for mental health: A scoping review', authors: 'Balaskas et al.', year: 2021, journal: 'PLoS ONE', citations: 128, url: 'https://consensus.app/papers/details/a5e50fd473c1591b862275eab697fa55/', relevanceNote: 'EMI design patterns for just-in-time mental health support' },
    { id: 19, domain: 4, title: 'Effectiveness of JITAIs for improving mental health: SR and meta-analysis', authors: 'Bischoff et al.', year: 2025, journal: 'BMJ Mental Health', citations: 0, url: 'https://consensus.app/papers/details/d843ec8190ba58909387850f1ad3915c/', relevanceNote: 'Recent evidence on JITAI effectiveness for depression and anxiety' },
    { id: 20, domain: 4, title: 'Beyond the current state of JITAIs in mental health: qualitative SR', authors: 'Brüning et al.', year: 2025, journal: 'Frontiers in Digital Health', citations: 9, url: 'https://consensus.app/papers/details/5ba663d630375ac0a4c56e5a0d62b6a4/', relevanceNote: 'Implementation and personalization challenges in JITAI design' },
    { id: 21, domain: 4, title: 'Smartphone-Delivered EMIs Based on EMA to Promote Health Behaviors: SR', authors: 'Colombo et al.', year: 2020, journal: 'JMIR mHealth and uHealth', citations: 83, url: 'https://consensus.app/papers/details/acfdc9bb878954b2afffdf2af84a519f/', relevanceNote: 'EMA-triggered intervention design and delivery mechanisms' },

    // Domain 5: Sleep Monitoring & Interventions (22-26)
    { id: 22, domain: 5, title: 'Clinical Applications of Mobile Health Wearable-Based Sleep Monitoring: SR', authors: 'Lujan et al.', year: 2020, journal: 'JMIR mHealth and uHealth', citations: 117, url: 'https://consensus.app/papers/details/b4621719bd775d3aa268c5f7dd91f38d/', relevanceNote: 'Clinical validation of wearable sleep tracking in mHealth' },
    { id: 23, domain: 5, title: 'Performance of seven consumer sleep-tracking devices vs polysomnography', authors: 'de Zambotti et al.', year: 2020, journal: 'Sleep', citations: 317, url: 'https://consensus.app/papers/details/d3ac6a3384875309b4b375d6c42aa980/', relevanceNote: 'Accuracy benchmarking of consumer wearables against gold standard' },
    { id: 24, domain: 5, title: 'Monitoring Daily Sleep, Mood, and Affect Using Digital Technologies and Wearables: SR', authors: 'Chow et al.', year: 2024, journal: 'Sensors', citations: 11, url: 'https://consensus.app/papers/details/297f1e4641875db096410c5a534bef8a/', relevanceNote: 'Integrated sleep-mood monitoring in digital health' },
    { id: 25, domain: 5, title: 'Investigating dCBT efficacy vs sleep-monitoring app via actigraphy: RCT', authors: 'Riemann et al.', year: 2024, journal: 'J Sleep Research', citations: 9, url: 'https://consensus.app/papers/details/8f8c6074d54e5b8d87edaf62fa3f155c/', relevanceNote: 'Digital CBT combined with sleep tracking effectiveness' },
    { id: 26, domain: 5, title: 'Does providing feedback using sleep wearables improve insomnia? RCT', authors: 'Baron et al.', year: 2023, journal: 'Sleep', citations: 15, url: 'https://consensus.app/papers/details/fcd26ef4af875342aaa5629992084b99/', relevanceNote: 'Feedback mechanisms in wearable-driven sleep interventions' },

    // Domain 6: Music Therapy & Mood (27-31)
    { id: 27, domain: 6, title: 'Effects of music therapy on depression: A meta-analysis of RCTs', authors: 'Leubner & Hinterberger', year: 2020, journal: 'PLoS ONE', citations: 100, url: 'https://consensus.app/papers/details/9ca1fc36e3e85daca0a5c2f72c1a4793/', relevanceNote: 'Meta-analytic evidence for music in depression treatment' },
    { id: 28, domain: 6, title: 'Advancing personalized digital therapeutics: integrating music therapy, brainwave entrainment and AI-driven biofeedback', authors: 'Nayak et al.', year: 2025, journal: 'Frontiers in Digital Health', citations: 4, url: 'https://consensus.app/papers/details/4307590e0e0254e9809ac70c8387e4b0/', relevanceNote: 'Personalized music selection via biofeedback integration' },
    { id: 29, domain: 6, title: 'Effectiveness of music therapy for ASD, dementia, depression, insomnia, schizophrenia: update of SRs', authors: 'Kamioka et al.', year: 2021, journal: 'European J Public Health', citations: 64, url: 'https://consensus.app/papers/details/daa26d74541c5abaa2e54319c908859f/', relevanceNote: 'Broad evidence base for music therapy across mental health conditions' },
    { id: 30, domain: 6, title: 'Music therapy for anxiety: SR with multilevel meta-analyses', authors: 'de Witte et al.', year: 2025, journal: 'eClinicalMedicine', citations: 5, url: 'https://consensus.app/papers/details/203530d0484d548586d350c3973f0e61/', relevanceNote: 'Music-based anxiety reduction mechanisms in digital context' },
    { id: 31, domain: 6, title: 'Music-based therapeutic interventions for medical students with emotional regulation', authors: 'Peng et al.', year: 2024, journal: 'Frontiers in Psychology', citations: 4, url: 'https://consensus.app/papers/details/53f9563f35195eb48c0ee427f3adaf31/', relevanceNote: 'Music for emotion regulation in high-stress populations' },

    // Domain 7: Digital Mindfulness & Meditation (32-36)
    { id: 32, domain: 7, title: 'Efficacy of Calm App to Reduce Stress Among College Students: RCT', authors: 'Huberty et al.', year: 2019, journal: 'JMIR mHealth and uHealth', citations: 380, url: 'https://consensus.app/papers/details/a5d328a0b7175b1481f379974240eee1/', relevanceNote: 'Efficacy of guided meditation apps in stress reduction' },
    { id: 33, domain: 7, title: 'Efficacy of mindfulness meditation apps in enhancing well-being: meta-analysis of RCTs', authors: 'Lau et al.', year: 2020, journal: 'J Affective Disorders', citations: 200, url: 'https://consensus.app/papers/details/b68289f19048570d8767628fdfac2b46/', relevanceNote: 'Meta-analysis confirming digital mindfulness app efficacy' },
    { id: 34, domain: 7, title: 'Efficacy of mindfulness apps on depression and anxiety: Updated meta-analysis of RCTs', authors: 'Sun et al.', year: 2023, journal: 'Clinical Psychology Review', citations: 28, url: 'https://consensus.app/papers/details/9bd9b5675e5a5d208e0b2360ce5306be/', relevanceNote: 'Recent evidence on mindfulness app impact on mood disorders' },
    { id: 35, domain: 7, title: 'A mindfulness meditation mobile app improves depression and anxiety in adults with sleep disturbance', authors: 'Huberty et al.', year: 2021, journal: 'General Hospital Psychiatry', citations: 44, url: 'https://consensus.app/papers/details/1836ea663e8d53f592247abcc16c2308/', relevanceNote: 'Mindfulness-sleep-mood integration benefits' },
    { id: 36, domain: 7, title: 'Guided Self-Help: RCT of Pacifica App Integrating CBT and Mindfulness', authors: 'Economides et al.', year: 2019, journal: 'JMIR', citations: 114, url: 'https://consensus.app/papers/details/631ff084ad9d52b88cf49f6dcab578ca/', relevanceNote: 'Hybrid CBT-mindfulness app effectiveness for mood' },

    // Domain 8: Digital Journaling & Expressive Writing (37-40)
    { id: 37, domain: 8, title: 'MindScape Study: Integrating LLM and Behavioral Sensing for Personalized AI-Driven Journaling', authors: 'Gao et al.', year: 2024, journal: 'Proc. ACM IMWUT', citations: 22, url: 'https://consensus.app/papers/details/cb7ee950de875b609fcc9b934807d12b/', relevanceNote: 'AI journaling with integrated behavioral sensing (directly applicable)' },
    { id: 38, domain: 8, title: 'Barriers to and Facilitators of User Engagement With Digital Mental Health Interventions: SR', authors: 'Lattie et al.', year: 2021, journal: 'JMIR', citations: 665, url: 'https://consensus.app/papers/details/4b5efdbc34f350199867000cfad3ac70/', relevanceNote: 'Engagement factors for digital mental health tools including journaling' },
    { id: 39, domain: 8, title: 'Positive expressive writing interventions, subjective health and wellbeing: SR', authors: 'Eisenbarth et al.', year: 2025, journal: 'PLOS One', citations: 1, url: 'https://consensus.app/papers/details/3c5c6913f1c1538aabfa49a8bdfe6df2/', relevanceNote: 'Recent evidence on expressive writing for mental health' },
    { id: 40, domain: 8, title: 'Mobile Apps That Promote Emotion Regulation, Positive Mental Health: SR and Meta-analysis', authors: 'Linardon et al.', year: 2021, journal: 'JMIR Mental Health', citations: 117, url: 'https://consensus.app/papers/details/1ccecaa908c051f980dd21288620ec12/', relevanceNote: 'Journaling as emotion regulation tool in mobile apps' },

    // Domain 9: AI Chatbots & Conversational Agents (41-45)
    { id: 41, domain: 9, title: 'Effectiveness and Safety of Using Chatbots to Improve Mental Health: SR and Meta-Analysis', authors: 'Abd-Alrazaq et al.', year: 2019, journal: 'JMIR', citations: 274, url: 'https://consensus.app/papers/details/e2f40987e905586b86f19c5353d0aea1/', relevanceNote: 'Foundational evidence for chatbot efficacy in mental health' },
    { id: 42, domain: 9, title: 'SR and meta-analysis of AI-based conversational agents for promoting mental health', authors: 'He et al.', year: 2023, journal: 'NPJ Digital Medicine', citations: 200, url: 'https://consensus.app/papers/details/89d794f015135dfcad47e74237b1cd1f/', relevanceNote: 'Recent meta-analysis on AI conversational agents' },
    { id: 43, domain: 9, title: 'Therapeutic effectiveness of AI-based chatbots in alleviation of depressive and anxiety symptoms: SR and meta-analysis', authors: 'Huang et al.', year: 2024, journal: 'J Affective Disorders', citations: 54, url: 'https://consensus.app/papers/details/0b075ad9b11b59a4a66174439189d2fc/', relevanceNote: 'Chatbot efficacy for depression and anxiety treatment' },
    { id: 44, domain: 9, title: 'Using AI chatbots to provide self-help depression interventions for university students: RCT', authors: 'Daley et al.', year: 2022, journal: 'Internet Interventions', citations: 172, url: 'https://consensus.app/papers/details/e2e253dc999c58acbdbdcfd8fed8fe50/', relevanceNote: 'RCT evidence for chatbot-delivered depression intervention' },
    { id: 45, domain: 9, title: 'Conversational Agents in Treatment of Mental Health Problems: Mixed-Method SR', authors: 'Vaidyam et al.', year: 2019, journal: 'JMIR Mental Health', citations: 193, url: 'https://consensus.app/papers/details/251c409c02d2504dad199dae784f6684/', relevanceNote: 'Implementation and user experience factors in mental health chatbots' },

    // Domain 10: Crisis Support & Safety Planning (46-50)
    { id: 46, domain: 10, title: 'Digital safety plan effectiveness and use: 3-month longitudinal study', authors: 'Melvin et al.', year: 2024, journal: 'Psychiatry Research', citations: 13, url: 'https://consensus.app/papers/details/fafaaa99226a54a9985bbd64e64cad9f/', relevanceNote: 'Digital safety plan adherence and effectiveness in practice' },
    { id: 47, domain: 10, title: 'SafePlan: A Mobile Health Approach for Improving Outcomes in Suicide Prevention', authors: 'Nuij et al.', year: 2020, journal: 'JMIR', citations: 42, url: 'https://consensus.app/papers/details/bb17f4e8ba285ccbbfad09371f01e8f6/', relevanceNote: 'Validated mobile safety planning intervention' },
    { id: 48, domain: 10, title: 'Translating Suicide Safety Planning Components Into mHealth App Features: SR', authors: 'McManama et al.', year: 2023, journal: 'JMIR Mental Health', citations: 12, url: 'https://consensus.app/papers/details/f83e3d4ef1875786b9665339c7e3f5d7/', relevanceNote: 'Safety planning feature design patterns for mobile apps' },
    { id: 49, domain: 10, title: 'SmartCrisis 2.0: Smartphone-based safety plan for suicidal crisis pilot study', authors: 'Berrouiguet et al.', year: 2023, journal: 'J Psychiatric Research', citations: 6, url: 'https://consensus.app/papers/details/9c1976f988465425bc24dfd60f0546b1/', relevanceNote: 'Smartphone-integrated safety planning in crisis intervention' },
    { id: 50, domain: 10, title: 'The Effect of Digital Mental Health Literacy Interventions on Mental Health: SR and Meta-Analysis', authors: 'Goel et al.', year: 2023, journal: 'JMIR', citations: 35, url: 'https://consensus.app/papers/details/7c8f40b7406a5b9da0f9a54142879475/', relevanceNote: 'Health literacy components in digital mental health crisis support' }
  ],

  gaps: [
    { id: 1, title: 'Integrated Multimodal Bio-Psycho Assessment', currentState: 'Studi yang ada menggunakan biosensor (GSR/HRV/SpO2) ATAU kuesioner (PHQ-9, UCLA) secara terpisah, belum terintegrasi.', description: 'SynaWatch secara unik menggabungkan GSR, HRV, SpO2 DENGAN PHQ-9 + UCLA dalam satu framework penilaian terpadu.', upgrade: 'Implementasi algoritma fusion scoring real-time yang menimbang anomali sensor terhadap profil psikologis baseline - mendeteksi ketidaksesuaian antara mood yang dilaporkan dan kondisi fisiologis.', priority: 'CRITICAL', domain: 1, status: 'implemented' },
    { id: 2, title: 'Closed-Loop with Personalized Thresholds', currentState: 'Sebagian besar JITAI berbasis waktu atau dipicu EMA; sedikit yang dipicu ambang fisiologis.', description: 'Literatur JITAI saat ini menunjukkan protokol intervensi yang terbatas berbasis sinyal bio.', upgrade: 'Implementasi kalibrasi threshold berbasis ML per-pengguna - threshold stres menurun untuk pengguna PHQ-9 tinggi, meningkat untuk yang dalam remisi.', priority: 'HIGH', domain: 4, status: 'implemented' },
    { id: 3, title: 'Music Therapy Selection via Biofeedback', currentState: 'Belum ada studi yang menggabungkan GSR/HRV real-time untuk memilih tempo/genre musik secara dinamis.', description: 'Literatur terapi musik kaya namun statis; integrasi biofeedback belum dieksplorasi.', upgrade: 'Seleksi playlist berbasis biofeedback - musik tenang (60-80 BPM) saat GSR tinggi, upbeat (120+ BPM) saat mood rendah terdeteksi.', priority: 'HIGH', domain: 6, status: 'implemented' },
    { id: 4, title: 'Journaling + Sensor Context Auto-Tagging', currentState: 'MindScape (2024) satu-satunya studi yang mengintegrasikan behavioral sensing dengan journaling.', description: 'Entri jurnal tidak memiliki konteks fisiologis meskipun relevan untuk rekonstruksi mood.', upgrade: 'Auto-tag entri jurnal dengan status sensor saat penulisan - menampilkan tingkat stres, detak jantung, status aktivitas.', priority: 'MEDIUM', domain: 8, status: 'implemented' },
    { id: 5, title: 'Longitudinal Psychometric Tracking', currentState: 'Sedikit aplikasi digital melacak PHQ-9/UCLA selama berbulan-bulan dengan analitik tren visual.', description: 'Pelacakan penilaian longitudinal kurang dimanfaatkan meskipun terbukti untuk pemantauan penyakit kronis.', upgrade: 'Grafik riwayat assessment menampilkan tren skor PHQ-9 dan UCLA 3, 6, 12 bulan dengan marker korelasi intervensi.', priority: 'MEDIUM', domain: 2, status: 'implemented' },
    { id: 6, title: 'AI Chatbot + Wearable Data Fusion', currentState: 'Studi chatbot tidak menunjukkan integrasi dengan data fisiologis real-time.', description: 'Sebagian besar chatbot AI beroperasi tanpa konteks wearable; SynaWatch memiliki kesempatan unik.', upgrade: 'SynaCHAT proaktif memulai percakapan saat anomali sensor terdeteksi (GSR tinggi + HR tinggi + PHQ-9 elevasi).', priority: 'HIGH', domain: 9, status: 'implemented' },
    { id: 7, title: 'Safety Planning with Bio-Signal Triggers', currentState: 'Rencana keselamatan digital memerlukan aktivasi manual; belum ada aplikasi yang auto-trigger protokol krisis.', description: 'Timing intervensi krisis bersifat reaktif; peringatan dini fisiologis belum dieksploitasi.', upgrade: 'Auto-aktivasi protokol krisis saat stres tinggi berkelanjutan (GSR + HR) DAN PHQ-9 elevasi DAN kesepian UCLA terdeteksi.', priority: 'CRITICAL', domain: 10, status: 'implemented' }
  ],

  activeDomain: null,
  methodologyOpen: false,

  /**
   * Initialize Research page
   */
  initResearch() {
    const container = document.getElementById('researchContent');
    if (!container) return;

    const totalCitations = this.papers.reduce((sum, p) => sum + p.citations, 0);

    container.innerHTML = `
      <!-- Hero -->
      <div style="background:linear-gradient(135deg,#7C3AED 0%,#4F46E5 50%,#2563EB 100%);padding:28px 20px;border-radius:20px;margin-bottom:20px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;background:rgba(255,255,255,0.08);border-radius:50%;"></div>
        <div style="position:absolute;bottom:-20px;left:40px;width:80px;height:80px;background:rgba(255,255,255,0.05);border-radius:50%;"></div>
        <div style="position:relative;z-index:1;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <i class="fas fa-flask" style="color:rgba(255,255,255,0.9);font-size:1.1rem;"></i>
            <span style="color:rgba(255,255,255,0.7);font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;">Research Foundation</span>
          </div>
          <h1 style="color:white;margin:0 0 6px;font-size:1.5rem;font-weight:800;line-height:1.2;">Dasar Penelitian SynaWatch</h1>
          <p style="color:rgba(255,255,255,0.8);margin:0 0 20px;font-size:0.88rem;line-height:1.5;">Systematic Literature Review mengikuti PRISMA Guidelines</p>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
            <div style="background:rgba(255,255,255,0.15);backdrop-filter:blur(8px);padding:14px 12px;border-radius:14px;text-align:center;">
              <div style="font-size:1.6rem;font-weight:800;color:white;">50</div>
              <div style="font-size:0.72rem;color:rgba(255,255,255,0.75);font-weight:500;">Paper Ilmiah</div>
            </div>
            <div style="background:rgba(255,255,255,0.15);backdrop-filter:blur(8px);padding:14px 12px;border-radius:14px;text-align:center;">
              <div style="font-size:1.6rem;font-weight:800;color:white;">10</div>
              <div style="font-size:0.72rem;color:rgba(255,255,255,0.75);font-weight:500;">Domain Riset</div>
            </div>
            <div style="background:rgba(255,255,255,0.15);backdrop-filter:blur(8px);padding:14px 12px;border-radius:14px;text-align:center;">
              <div style="font-size:1.6rem;font-weight:800;color:white;">${totalCitations.toLocaleString()}</div>
              <div style="font-size:0.72rem;color:rgba(255,255,255,0.75);font-weight:500;">Total Sitasi</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Methodology Toggle -->
      <div id="methodologyCard" style="background:white;border-radius:16px;margin-bottom:16px;border:1px solid var(--border-color);overflow:hidden;">
        <button onclick="ResearchFoundation.toggleMethodology()" style="width:100%;padding:16px 18px;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;background:linear-gradient(135deg,#EDE9FE,#DDD6FE);border-radius:10px;display:flex;align-items:center;justify-content:center;">
              <i class="fas fa-microscope" style="color:#7C3AED;font-size:0.9rem;"></i>
            </div>
            <div style="text-align:left;">
              <div style="font-weight:700;color:var(--text-primary);font-size:0.92rem;">Metodologi PRISMA</div>
              <div style="font-size:0.78rem;color:var(--text-tertiary);">Sumber data, kriteria seleksi & tipe studi</div>
            </div>
          </div>
          <i id="methodologyChevron" class="fas fa-chevron-down" style="color:var(--text-tertiary);transition:transform 0.3s;"></i>
        </button>
        <div id="methodologyBody" style="max-height:0;overflow:hidden;transition:max-height 0.3s ease;"></div>
      </div>

      <!-- Domain Filters -->
      <div style="margin-bottom:16px;">
        <h3 style="font-size:0.88rem;font-weight:700;color:var(--text-primary);margin-bottom:10px;"><i class="fas fa-filter" style="color:var(--primary-400);margin-right:6px;"></i>Filter Domain</h3>
        <div id="domainFilters" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
      </div>

      <!-- Papers -->
      <div id="papersSection" style="margin-bottom:24px;"></div>

      <!-- Research Gaps -->
      <div id="gapSection" style="margin-bottom:16px;"></div>
    `;

    this.renderMethodologyContent();
    this.renderDomainFilters();
    this.renderPapers(null);
    this.renderGaps();
  },

  toggleMethodology() {
    this.methodologyOpen = !this.methodologyOpen;
    const body = document.getElementById('methodologyBody');
    const chevron = document.getElementById('methodologyChevron');
    if (!body) return;

    if (this.methodologyOpen) {
      body.style.maxHeight = body.scrollHeight + 'px';
      chevron.style.transform = 'rotate(180deg)';
    } else {
      body.style.maxHeight = '0';
      chevron.style.transform = 'rotate(0)';
    }
  },

  renderMethodologyContent() {
    const body = document.getElementById('methodologyBody');
    if (!body) return;

    body.innerHTML = `
      <div style="padding:0 18px 18px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
          <div style="padding:12px;background:var(--bg-secondary);border-radius:12px;">
            <div style="font-weight:700;color:var(--primary-600);font-size:0.8rem;margin-bottom:4px;"><i class="fas fa-database"></i> Sumber</div>
            <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5;">Consensus, PubMed, Semantic Scholar, ArXiv</div>
          </div>
          <div style="padding:12px;background:var(--bg-secondary);border-radius:12px;">
            <div style="font-weight:700;color:var(--primary-600);font-size:0.8rem;margin-bottom:4px;"><i class="fas fa-calendar"></i> Periode</div>
            <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5;">2019 - 2025 (peer-reviewed)</div>
          </div>
          <div style="padding:12px;background:var(--bg-secondary);border-radius:12px;">
            <div style="font-weight:700;color:var(--primary-600);font-size:0.8rem;margin-bottom:4px;"><i class="fas fa-layer-group"></i> Tipe Studi</div>
            <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5;">RCT, SR, Meta-analysis, Cohort</div>
          </div>
          <div style="padding:12px;background:var(--bg-secondary);border-radius:12px;">
            <div style="font-weight:700;color:var(--primary-600);font-size:0.8rem;margin-bottom:4px;"><i class="fas fa-check-double"></i> Seleksi</div>
            <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5;">Relevansi fitur, impact factor, sitasi</div>
          </div>
        </div>
        <div style="padding:12px;background:#FFFBEB;border-left:3px solid #F59E0B;border-radius:0 10px 10px 0;font-size:0.82rem;color:#92400E;line-height:1.5;">
          <strong>Catatan:</strong> Klik judul paper untuk membaca abstrak lengkap. Gunakan filter domain untuk melihat penelitian per fitur SynaWatch.
        </div>
      </div>
    `;
  },

  renderDomainFilters() {
    const container = document.getElementById('domainFilters');
    if (!container) return;

    let html = `<button onclick="ResearchFoundation.filterDomain(null)" class="rf-chip rf-chip-active" id="rfChipAll" style="padding:8px 14px;border-radius:10px;border:1.5px solid var(--primary-500);background:var(--primary-500);color:white;font-size:0.78rem;font-weight:600;cursor:pointer;white-space:nowrap;transition:all 0.2s;">Semua (50)</button>`;

    for (const [id, d] of Object.entries(this.domains)) {
      const count = this.papers.filter(p => p.domain == id).length;
      html += `<button onclick="ResearchFoundation.filterDomain(${id})" class="rf-chip" id="rfChip${id}" style="padding:8px 14px;border-radius:10px;border:1.5px solid var(--border-color);background:white;color:var(--text-secondary);font-size:0.78rem;font-weight:600;cursor:pointer;white-space:nowrap;transition:all 0.2s;display:flex;align-items:center;gap:5px;"><i class="fas ${d.icon}" style="color:${d.color};font-size:0.72rem;"></i>${d.label.split(' ')[0]} (${count})</button>`;
    }

    container.innerHTML = html;
  },

  filterDomain(domainId) {
    this.activeDomain = domainId;

    // Update chip styles
    document.querySelectorAll('.rf-chip').forEach(chip => {
      chip.style.background = 'white';
      chip.style.color = 'var(--text-secondary)';
      chip.style.borderColor = 'var(--border-color)';
    });

    const activeChip = domainId ? document.getElementById(`rfChip${domainId}`) : document.getElementById('rfChipAll');
    if (activeChip) {
      activeChip.style.background = 'var(--primary-500)';
      activeChip.style.color = 'white';
      activeChip.style.borderColor = 'var(--primary-500)';
    }

    this.renderPapers(domainId);

    const section = document.getElementById('papersSection');
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  renderPapers(domainFilter) {
    const section = document.getElementById('papersSection');
    if (!section) return;

    const filtered = domainFilter ? this.papers.filter(p => p.domain === domainFilter) : this.papers;
    const label = domainFilter ? this.domains[domainFilter].label : 'Semua Domain';

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3 style="font-size:0.95rem;font-weight:700;color:var(--text-primary);margin:0;"><i class="fas fa-scroll" style="color:var(--primary-400);margin-right:6px;"></i>${label}</h3>
        <span style="font-size:0.78rem;color:var(--text-tertiary);font-weight:600;">${filtered.length} paper</span>
      </div>
    `;

    filtered.forEach(paper => {
      const domain = this.domains[paper.domain];
      const citColor = paper.citations >= 200 ? '#DC2626' : paper.citations >= 100 ? '#F59E0B' : paper.citations >= 50 ? '#3B82F6' : '#6B7280';

      html += `
      <div style="background:white;border-radius:14px;padding:16px;margin-bottom:10px;border:1px solid var(--border-color);transition:box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 4px 16px rgba(124,58,237,0.1)'" onmouseout="this.style.boxShadow='none'">
        <a href="${paper.url}" target="_blank" rel="noopener" style="text-decoration:none;color:var(--text-primary);font-weight:600;font-size:0.88rem;line-height:1.45;display:block;margin-bottom:8px;">
          ${paper.title} <i class="fas fa-external-link-alt" style="font-size:0.65rem;color:var(--primary-400);margin-left:4px;"></i>
        </a>

        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:10px;font-size:0.78rem;color:var(--text-tertiary);">
          <span style="font-weight:600;color:var(--text-secondary);">${paper.authors}</span>
          <span style="color:var(--border-color);">|</span>
          <span>${paper.year}</span>
          <span style="color:var(--border-color);">|</span>
          <span style="font-style:italic;">${paper.journal}</span>
        </div>

        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
          <span style="display:inline-flex;align-items:center;gap:4px;background:${citColor}12;color:${citColor};padding:4px 10px;border-radius:8px;font-size:0.72rem;font-weight:700;">
            <i class="fas fa-quote-left" style="font-size:0.6rem;"></i> ${paper.citations} sitasi
          </span>
          <span style="display:inline-flex;align-items:center;gap:4px;background:${domain.color}12;color:${domain.color};padding:4px 10px;border-radius:8px;font-size:0.72rem;font-weight:600;">
            <i class="fas ${domain.icon}" style="font-size:0.6rem;"></i> ${domain.label.split('&')[0].trim()}
          </span>
        </div>

        <div style="padding:10px 12px;background:var(--bg-secondary);border-radius:10px;font-size:0.82rem;color:var(--text-secondary);line-height:1.5;">
          <i class="fas fa-link" style="color:var(--primary-400);margin-right:4px;font-size:0.7rem;"></i>
          <strong style="color:var(--text-primary);">Relevansi:</strong> ${paper.relevanceNote}
        </div>
      </div>
      `;
    });

    section.innerHTML = html;
  },

  renderGaps() {
    const section = document.getElementById('gapSection');
    if (!section) return;

    const priorityMap = {
      'CRITICAL': { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B', badge: '#EF4444', label: 'KRITIS', icon: 'fa-circle-exclamation' },
      'HIGH': { bg: '#FFF7ED', border: '#F97316', text: '#9A3412', badge: '#F97316', label: 'TINGGI', icon: 'fa-triangle-exclamation' },
      'MEDIUM': { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E', badge: '#F59E0B', label: 'SEDANG', icon: 'fa-circle-info' }
    };

    let html = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
        <h3 style="font-size:0.95rem;font-weight:700;color:var(--text-primary);margin:0;"><i class="fas fa-lightbulb" style="color:#F59E0B;margin-right:6px;"></i>Analisis Gap & Inovasi</h3>
        <span style="background:#10B981;color:white;padding:2px 10px;border-radius:8px;font-size:0.7rem;font-weight:700;">7/7 Implemented</span>
      </div>
    `;

    this.gaps.forEach(gap => {
      const p = priorityMap[gap.priority];
      const domain = this.domains[gap.domain];

      html += `
      <div style="background:white;border-radius:14px;padding:16px;margin-bottom:10px;border:1px solid var(--border-color);border-left:4px solid ${p.border};">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
              <span style="font-weight:700;color:var(--text-primary);font-size:0.9rem;">Gap ${gap.id}: ${gap.title}</span>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <span style="background:${p.badge};color:white;padding:3px 10px;border-radius:6px;font-size:0.7rem;font-weight:700;display:inline-flex;align-items:center;gap:4px;">
                <i class="fas ${p.icon}" style="font-size:0.6rem;"></i> ${p.label}
              </span>
              <span style="background:${domain.color}12;color:${domain.color};padding:3px 10px;border-radius:6px;font-size:0.7rem;font-weight:600;display:inline-flex;align-items:center;gap:4px;">
                <i class="fas ${domain.icon}" style="font-size:0.6rem;"></i> ${domain.label.split('&')[0].trim()}
              </span>
              <span style="background:#ECFDF5;color:#059669;padding:3px 10px;border-radius:6px;font-size:0.7rem;font-weight:700;display:inline-flex;align-items:center;gap:4px;">
                <i class="fas fa-check-circle" style="font-size:0.6rem;"></i> Implemented
              </span>
            </div>
          </div>
        </div>

        <div style="margin-bottom:10px;">
          <div style="font-size:0.78rem;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Status Literatur</div>
          <p style="margin:0;color:var(--text-secondary);font-size:0.84rem;line-height:1.55;">${gap.currentState}</p>
        </div>

        <div style="padding:12px;background:${p.bg};border-radius:10px;">
          <div style="font-size:0.78rem;font-weight:700;color:${p.text};margin-bottom:4px;"><i class="fas fa-wand-magic-sparkles" style="margin-right:4px;"></i>Solusi SynaWatch</div>
          <p style="margin:0;color:${p.text};font-size:0.84rem;line-height:1.55;">${gap.upgrade}</p>
        </div>
      </div>
      `;
    });

    section.innerHTML = html;
  }
};

window.ResearchFoundation = ResearchFoundation;
