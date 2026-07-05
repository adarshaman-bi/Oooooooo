import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const SUPABASE_URL = "https://jicyzdfzcffhjqehvcpk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppY3l6ZGZ6Y2ZmaGpxZWh2Y3BrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODYwNTUsImV4cCI6MjA5NjE2MjA1NX0.7u4dnBddm5WXk3ZDOobASOG5cjcoGy40fg7tcAqLFtk";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { realtime: { transport: ws } });

// Check if source_type column exists
const { data: sample, error } = await supabase.from("videos").select("source_type").limit(1);
if (error) {
  console.log("source_type column does not exist or error:", error.message);
} else {
  console.log("source_type column exists, sample:", sample);
}

// Count all active videos
const { count, error: countError } = await supabase.from("videos").select("*", { count: 'exact', head: true }).eq("is_active", true);
if (countError) {
  console.error("Count error:", countError);
} else {
  console.log(`Total active videos: ${count}`);
}
