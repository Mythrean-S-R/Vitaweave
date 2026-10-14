import { supabase } from '../lib/supabase';

async function verifyDatabase() {
  console.log('🔍 Starting database verification...');
  
  const tables = [
    'profiles',
    'patients',
    'medical_records',
    'appointments',
    'ai_chat_history',
    'community_alerts',
    'weekly_alerts',
    'dashboard_tasks',
    'pharmacy_trends',
    'symptom_reports',
    'weekly_trends',
    'ai_insights',
    'video_calls',
    'patient_vitals',
    'patient_medications',
    'campaigns',
    'vaccinations',
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(1).single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned", which is fine
        console.error(`❌ Table "${table}" check failed:`, error.message);
      } else {
        console.log(`✅ Table "${table}" is ready.`);
      }
    } catch (err) {
      console.error(`❌ Unexpected error checking table "${table}":`, err);
    }
  }

  // Check Storage
  try {
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
    if (storageError) {
      console.error('❌ Storage bucket check failed:', storageError.message);
    } else {
      const hasPatientImages = buckets.some(b => b.name === 'patient-images');
      if (hasPatientImages) {
        console.log('✅ Storage bucket "patient-images" is ready.');
      } else {
        console.error('❌ Storage bucket "patient-images" is missing.');
      }
    }
  } catch (err) {
    console.error('❌ Unexpected error checking storage:', err);
  }

  console.log('🏁 Verification complete.');
}

// In a real project, you'd run this with a tool like ts-node
// For this environment, we provide it as a utility function.
export { verifyDatabase };
