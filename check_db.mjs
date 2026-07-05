import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabaseUrl = 'https://jicyzdfzcffhjqehvcpk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppY3l6ZGZ6Y2ZmaGpxZWh2Y3BrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDU4NjA1NSwiZXhwIjoyMDk2MTYyMDU1fQ.-Bs6NT_xU1MAPRXXACuf22KMhzH1xqdCx-Oq3RHp67g';

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: { transport: ws }
});

async function main() {
  console.log('=== CHECKING CHANNELS TABLE SCHEMA ===');
  
  // Check actual columns in channels table
  let { data: channelsCols, error: colError } = await supabase
    .from('channels')
    .select('*')
    .limit(1);
  
  if (colError) console.log('Channels query error:', colError);
  else {
    console.log('Channels table columns found:', Object.keys(channelsCols[0] || {}));
    console.log('Sample channel:', JSON.stringify(channelsCols[0], null, 2));
  }
  
  // Check for Physics Galaxy by name
  console.log('\n=== CHECKING PHYSICS GALAXY CHANNELS ===');
  let { data: pgChannels, error: pgError } = await supabase
    .from('channels')
    .select('*')
    .ilike('name', '%physics galaxy%');
  
  if (pgError) console.log('Physics Galaxy query error:', pgError);
  else {
    console.log('Physics Galaxy channels found:', pgChannels?.length || 0);
    console.log(JSON.stringify(pgChannels, null, 2));
  }
  
  // Check for channels to remove
  console.log('\n=== CHECKING CHANNELS TO REMOVE ===');
  let { data: removeChannels, error: rmError } = await supabase
    .from('channels')
    .select('*')
    .or('name.ilike.%competishun mentorship%,name.ilike.%sachin rana%');
    
  if (rmError) console.log('Remove channels query error:', rmError);
  else {
    console.log('Channels to remove found:', removeChannels?.length || 0);
    console.log(JSON.stringify(removeChannels, null, 2));
  }
}

main().catch(console.error);
