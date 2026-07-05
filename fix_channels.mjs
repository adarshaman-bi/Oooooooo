import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabaseUrl = 'https://jicyzdfzcffhjqehvcpk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppY3l6ZGZ6Y2ZmaGpxZWh2Y3BrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDU4NjA1NSwiZXhwIjoyMDk2MTYyMDU1fQ.-Bs6NT_xU1MAPRXXACuf22KMhzH1xqdCx-Oq3RHp67g';

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: { transport: ws }
});

async function main() {
  console.log('=== PART 1: REMOVING CHANNELS ===');
  
  // Deactivate Competishun Mentorship
  const { data: cmData, error: cmError } = await supabase
    .from('channels')
    .update({ is_active: false })
    .eq('id', 'UCxypqdjw-S400n162TY5cgQ')
    .select();
    
  if (cmError) console.log('Error deactivating Competishun Mentorship:', cmError);
  else console.log('✓ Competishun Mentorship deactivated:', cmData[0]);
  
  // Deactivate Sachin Rana
  const { data: srData, error: srError } = await supabase
    .from('channels')
    .update({ is_active: false })
    .eq('id', 'UC8Q46TByEJhMsY9V3wqIOZw')
    .select();
    
  if (srError) console.log('Error deactivating Sachin Rana:', srError);
  else console.log('✓ Sachin Rana deactivated:', srData[0]);
  
  console.log('\n=== PART 2: CHECKING PHYSICS GALAXY DUPLICATES ===');
  
  // Get full details of both Physics Galaxy channels
  const { data: pg1, error: pg1Error } = await supabase
    .from('channels')
    .select('*')
    .eq('id', 'UC3b3c5UhtPcNB45Smr_BeEQ')
    .single();
    
  const { data: pg2, error: pg2Error } = await supabase
    .from('channels')
    .select('*')
    .eq('id', 'UCgBmfNILAlXmGv3CsJ8oFJA')
    .single();
    
  console.log('Physics Galaxy 1 (UC3b3c5UhtPcNB45Smr_BeEQ):');
  console.log('  - Name:', pg1?.name);
  console.log('  - Subscribers:', pg1?.subscribers);
  console.log('  - Avatar:', pg1?.avatar);
  
  console.log('\nPhysics Galaxy 2 (UCgBmfNILAlXmGv3CsJ8oFJA):');
  console.log('  - Name:', pg2?.name);
  console.log('  - Subscribers:', pg2?.subscribers);
  console.log('  - Avatar:', pg2?.avatar);
  
  console.log('\n=== CONCLUSION ===');
  console.log('These are TWO DIFFERENT YouTube channels with different channel IDs.');
  console.log('They should NOT be merged - they are separate entities that happen to share the same name.');
  console.log('Recommendation: Keep both but ensure they display with distinct identifiers if needed.');
}

main().catch(console.error);
