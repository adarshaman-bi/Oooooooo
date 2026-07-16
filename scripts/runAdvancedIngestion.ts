import 'dotenv/config';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { runIngestionEngine } from '../src/ingestion/jobs/engineRunner';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || !args.includes('--prod');
  
  console.log('🏁 Starting Advanced YouTube Education Ingestion...');
  console.log(`- Running mode: ${dryRun ? 'DRY RUN (No DB Writes)' : 'PRODUCTION (Sync to Supabase)'}`);
  
  try {
    await runIngestionEngine({ dryRun });
    console.log('✅ Ingestion process finished.');
  } catch (error) {
    console.error('❌ Ingestion run failed:', error);
    process.exit(1);
  }
}

main();
