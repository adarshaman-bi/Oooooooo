import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const SUPABASE_URL = "https://jicyzdfzcffhjqehvcpk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppY3l6ZGZ6Y2ZmaGpxZWh2Y3BrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODYwNTUsImV4cCI6MjA5NjE2MjA1NX0.7u4dnBddm5WXk3ZDOobASOG5cjcoGy40fg7tcAqLFtk";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { realtime: { transport: ws } });

// Get one channel record to see all fields
const { data: channel, error } = await supabase.from("channels").select("*").limit(1).single();
if (error) {
  console.error("Error:", error);
} else {
  console.log("=== CHANNELS TABLE SCHEMA (from actual record) ===");
  console.log(JSON.stringify(channel, null, 2));
}

// Check videos table schema
const { data: video, error: videoError } = await supabase.from("videos").select("*").limit(1).single();
if (videoError) {
  console.error("Videos error:", videoError);
} else {
  console.log("\n=== VIDEOS TABLE SCHEMA (from actual record) ===");
  console.log(JSON.stringify(video, null, 2));
}
