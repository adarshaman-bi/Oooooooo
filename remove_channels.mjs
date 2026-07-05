import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const SUPABASE_URL = "https://jicyzdfzcffhjqehvcpk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppY3l6ZGZ6Y2ZmaGpxZWh2Y3BrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODYwNTUsImV4cCI6MjA5NjE2MjA1NX0.7u4dnBddm5WXk3ZDOobASOG5cjcoGy40fg7tcAqLFtk";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { realtime: { transport: ws } });

// Remove Competishun Mentorship and Sachin Rana by setting is_active = false
const channelsToRemove = [
  "UCxypqdjw-S400n162TY5cgQ", // Competishun Mentorship
  "UC8Q46TByEJhMsY9V3wqIOZw"  // Sachin Rana
];

console.log("=== DEACTIVATING CHANNELS ===");
for (const channelId of channelsToRemove) {
  const { data, error } = await supabase
    .from("channels")
    .update({ is_active: false })
    .eq("id", channelId);
  
  if (error) {
    console.error(`Error updating ${channelId}:`, error);
  } else {
    console.log(`Successfully deactivated channel: ${channelId}`);
  }
}

// Verify the update
const { data: updatedChannels } = await supabase
  .from("channels")
  .select("id, name, is_active")
  .in("id", channelsToRemove);

console.log("\n=== VERIFICATION ===");
updatedChannels.forEach(ch => {
  console.log(`Channel: ${ch.name}, ID: ${ch.id}, Active: ${ch.is_active}`);
});
