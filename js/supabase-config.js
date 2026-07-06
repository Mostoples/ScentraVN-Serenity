/**
 * ScentraVN Serenity — Supabase client (Storage only)
 *
 * Used exclusively to hold the RAW recording blob (EEG/PPG), which is too big
 * for Firestore's 1MB document limit and would burn through the Spark-plan
 * write/storage quota if chunked there. Auth, Firestore and every other
 * feature stay on Firebase untouched — this client only talks to Supabase
 * Storage's `recordings` bucket.
 */
const supabaseClient = (typeof supabase !== 'undefined' && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY)
    ? supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)
    : null;

if (!supabaseClient) {
    console.warn('[Supabase] Client tidak dibuat — cek SUPABASE_URL/SUPABASE_ANON_KEY di config.keys.js atau SDK belum dimuat.');
}

window.supabaseClient = supabaseClient;
