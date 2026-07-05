import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const SUPABASE_URL = "https://jicyzdfzcffhjqehvcpk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppY3l6ZGZ6Y2ZmaGpxZWh2Y3BrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDU4NjA1NSwiZXhwIjoyMDk2MTYyMDU1fQ.-Bs6NT_xU1MAPRXXACuf22KMhzH1xqdCx-Oq3RHp67g";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { realtime: { transport: ws } });

console.log("=== FINDING AND DELETING PROMOTIONAL VIDEOS ===\n");

// Find videos with promotional titles that should not be there
const promoPatterns = [
  'launching', 'what next', 'press conference', 'ask me anything'
];

for (const pattern of promoPatterns) {
  const { data: videos } = await supabase
    .from('videos')
    .select('id, title, teacher_name')
    .ilike('title', `%${pattern}%`)
    .eq('is_active', true);
  
  if (videos && videos.length > 0) {
    console.log(`Found ${videos.length} videos containing "${pattern}":`);
    for (const v of videos) {
      console.log(`  - [${v.id}] ${v.title} (${v.teacher_name})`);
      
      // Delete this video
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', v.id);
      
      if (error) {
        console.log(`    ERROR deleting: ${error.message}`);
      } else {
        console.log(`    ✓ Deleted`);
      }
    }
  }
}

// Also check for roadmap videos without academic content
const { data: roadmapVideos } = await supabase
  .from('videos')
  .select('id, title, teacher_name')
  .ilike('title', '%roadmap%')
  .eq('is_active', true);

if (roadmapVideos && roadmapVideos.length > 0) {
  console.log(`\nChecking ${roadmapVideos.length} videos containing "roadmap":`);
  for (const v of roadmapVideos) {
    const hasAcademic = /(chapter|lecture|class|topic|one shot|full|orientation|masterplan)/i.test(v.title);
    if (!hasAcademic) {
      console.log(`  - [${v.id}] ${v.title} (NO ACADEMIC CONTENT)`);
      const { error } = await supabase.from('videos').delete().eq('id', v.id);
      if (error) {
        console.log(`    ERROR deleting: ${error.message}`);
      } else {
        console.log(`    ✓ Deleted`);
      }
    } else {
      console.log(`  - [${v.id}] ${v.title} (HAS ACADEMIC CONTENT - keeping)`);
    }
  }
}

console.log("\n=== FINAL COUNT ===");
const { count } = await supabase
  .from('videos')
  .select('*', { count: 'exact', head: true })
  .eq('is_active', true)
  .eq('content_type', 'lecture');

console.log(`Total active lectures remaining: ${count}`);

// Final spot check
console.log("\n=== FINAL SPOT CHECK ===");
for (const pattern of ['launching', 'what next', 'press conference', 'ask me anything']) {
  const { data: blocked } = await supabase
    .from('videos')
    .select('id, title')
    .ilike('title', `%${pattern}%`)
    .eq('is_active', true)
    .limit(5);
  
  if (blocked && blocked.length > 0) {
    console.log(`WARNING: Still found ${blocked.length} videos containing "${pattern}"`);
  } else {
    console.log(`✓ Clean: No videos containing "${pattern}"`);
  }
}
