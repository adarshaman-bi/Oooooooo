const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jicyzdfzcffhjqehvcpk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppY3l6ZGZ6Y2ZmaGpxZWh2Y3BrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDU4NjA1NSwiZXhwIjoyMDk2MTYyMDU1fQ.-Bs6NT_xU1MAPRXXACuf22KMhzH1xqdCx-Oq3RHp67g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('=== CHECKING CHANNELS TABLE ===');
  
  // Check Physics Galaxy channels
  let { data: pgChannels, error: pgError } = await supabase
    .from('channels')
    .select('id, channel_id, channel_title, subscriber_count, is_active, channel_thumbnail_url')
    .ilike('channel_title', '%physics galaxy%');
  
  if (pgError) console.log('Physics Galaxy query error:', pgError);
  else {
    console.log('Physics Galaxy channels found:', pgChannels?.length || 0);
    console.log(JSON.stringify(pgChannels, null, 2));
  }
  
  // Check channels to remove
  console.log('\n=== CHECKING CHANNELS TO REMOVE ===');
  let { data: removeChannels, error: rmError } = await supabase
    .from('channels')
    .select('id, channel_id, channel_title, subscriber_count, is_active')
    .or('channel_title.ilike.%competishun mentorship%,channel_title.ilike.%sachin rana%');
    
  if (rmError) console.log('Remove channels query error:', rmError);
  else {
    console.log('Channels to remove found:', removeChannels?.length || 0);
    console.log(JSON.stringify(removeChannels, null, 2));
  }
  
  // Check monitored_channels
  console.log('\n=== CHECKING MONITORED_CHANNELS ===');
  let { data: monitored, error: monError } = await supabase
    .from('monitored_channels')
    .select('id, channel_id, custom_name, is_active')
    .or('custom_name.ilike.%physics galaxy%,custom_name.ilike.%competishun mentorship%,custom_name.ilike.%sachin rana%');
    
  if (monError) console.log('Monitored channels query error:', monError);
  else {
    console.log('Monitored channels found:', monitored?.length || 0);
    console.log(JSON.stringify(monitored, null, 2));
  }
}

main().catch(console.error);
