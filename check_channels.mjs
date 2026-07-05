import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const SUPABASE_URL = "https://jicyzdfzcffhjqehvcpk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppY3l6ZGZ6Y2ZmaGpxZWh2Y3BrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODYwNTUsImV4cCI6MjA5NjE2MjA1NX0.7u4dnBddm5WXk3ZDOobASOG5cjcoGy40fg7tcAqLFtk";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { realtime: { transport: ws } });

console.log("=== CHANNELS TABLE ===");
const { data: channels, error } = await supabase.from("channels").select("*");
if (error) {
  console.error("Error:", error);
} else {
  console.log(`Found ${channels.length} channels`);
  channels.forEach(ch => {
    console.log(`ID: ${ch.id}, Channel ID: ${ch.channel_id}, Name: ${ch.channel_title || ch.name}, Active: ${ch.is_active}`);
  });

  console.log("\n=== PHYSICS GALAXY CHANNELS ===");
  const physicsGalaxy = channels.filter(ch => (ch.channel_title || ch.name || '') && (ch.channel_title || ch.name || '').toLowerCase().includes('physics galaxy'));
  console.log(`Found ${physicsGalaxy.length} Physics Galaxy channels`);
  physicsGalaxy.forEach(ch => {
    console.log(`ID: ${ch.id}, Channel ID: ${ch.channel_id}, Name: ${ch.channel_title || ch.name}, Active: ${ch.is_active}`);
  });

  console.log("\n=== CHANNELS TO REMOVE ===");
  ["Competishun Mentorship", "Sachin Rana"].forEach(name => {
    const found = channels.filter(ch => (ch.channel_title || ch.name || '') && (ch.channel_title || ch.name || '').toLowerCase().includes(name.toLowerCase()));
    console.log(`${name}: Found ${found.length} matches`);
    found.forEach(ch => {
      console.log(`  FOUND - ID: ${ch.id}, Channel ID: ${ch.channel_id}, Name: ${ch.channel_title || ch.name}, Active: ${ch.is_active}`);
    });
  });
}
