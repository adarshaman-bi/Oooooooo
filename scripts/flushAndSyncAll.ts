import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Strict list of valid academic subjects/topics for JEE & NEET
const ALLOWED_ACADEMIC_KEYWORDS = [
  'physics', 'chemistry', 'math', 'mathematics', 'biology', 'botany', 'zoology',
  'neet', 'jee', 'iit', 'organic', 'inorganic', 'physical chem', 'calculus', 
  'mechanics', 'optics', 'thermodynamics', 'electrostatics', 'chemical bonding',
  'mole concept', 'cell', 'genetics', 'human physiology', 'plant', 'algebra'
];

function isStrictlyAcademic(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  return ALLOWED_ACADEMIC_KEYWORDS.some(keyword => lowerTitle.includes(keyword));
}

export async function flushAndReorganizeDatabase() {
  console.log('🧹 STAGE 1: Purging all absolute non-JEE/NEET trash...');
  
  // Clean playlists table where titles are completely unrelated
  const { data: currentPlaylists } = await supabase.from('playlists').select('id, title');
  
  if (currentPlaylists) {
    for (const playlist of currentPlaylists) {
      if (!isStrictlyAcademic(playlist.title)) {
        console.log(`🗑️ Deleting trash playlist: ${playlist.title}`);
        await supabase.from('playlists').delete().eq('id', playlist.id);
      }
    }
  }

  console.log('🔄 STAGE 2: Auto-categorizing valid content into structured sections...');

  // Pull remaining valid playlists to route them to the right UI features
  const { data: validPlaylists } = await supabase.from('playlists').select('*');

  if (validPlaylists) {
    for (const playlist of validPlaylists) {
      const lowerTitle = playlist.title.toLowerCase();
      let assignedTab = 'playlist'; // Default routing target

      // One-Shot content detection
      if (lowerTitle.includes('one shot') || lowerTitle.includes('oneshot') || lowerTitle.includes('complete revision')) {
        assignedTab = 'one_shot';
      } 
      // Institute or batch material tracking
      else if (lowerTitle.includes('allen') || lowerTitle.includes('pw') || lowerTitle.includes('unacademy') || lowerTitle.includes('competishun')) {
        assignedTab = 'institute';
      }

      // Update the structural flags in Supabase so your UI tabs sort natively
      const { error } = await supabase.from('playlists').update({
        content_type: assignedTab,
        show_on_home: true, 
        updated_at: new Date().toISOString()
      }).eq('id', playlist.id);

      if (error) {
        if (error.message?.includes('column') && error.message?.includes('does not exist')) {
          console.warn(`⚠️ Warning: Database column 'content_type' or 'show_on_home' does not exist on playlists table.`);
          console.warn(`👉 Please execute the migration SQL in 'supabase/migrations/002_add_playlist_routing_columns.sql' in your Supabase SQL Editor.`);
          break;
        } else {
          console.error(`❌ Error updating playlist "${playlist.title}":`, error.message);
        }
      } else {
        console.log(`📦 Routed "${playlist.title}" -> Section: ${assignedTab}`);
      }
    }
  }
  
  console.log('🔗 STAGE 3: Mapping ingested channels safely to teacher profiles...');
  const { data: teachers } = await supabase.from('teachers').select('id, name');
  if (teachers) {
    for (const teacher of teachers) {
      let channelId = '';
      if (teacher.name.includes('Alakh') || teacher.name.includes('Wallah')) {
        channelId = 'UCD16eo98AXl-9T61Xd711kQ';
      } else if (teacher.name.includes('Mohit') || teacher.name.includes('Tyagi')) {
        channelId = 'UCxypqdjw-S400n162TY5cgQ';
      } else if (teacher.name.includes('Seep') || teacher.name.includes('Pahuja')) {
        channelId = 'UCcxP3vMEVVFafLBasCHcjCg';
      } else if (teacher.name.includes('Sachin') || teacher.name.includes('Rana')) {
        channelId = 'UC8Q46TByEJhMsY9V3wqIOZw';
      } else if (teacher.name.includes('Ashish') || teacher.name.includes('Arora')) {
        channelId = 'UCgBmfNILAlXmGv3CsJ8oFJA';
      } else if (teacher.name.includes('Rohit') || teacher.name.includes('Aggarwal')) {
        channelId = 'UCkDb4531sPuHocFFSQE3qOQ';
      }

      if (channelId) {
        const { error: tErr } = await supabase.from('teachers').update({
          youtube_channel_id: channelId
        }).eq('id', teacher.id);
        
        if (tErr) {
          if (tErr.message?.includes('column') && tErr.message?.includes('does not exist')) {
            console.warn(`⚠️ Warning: Column 'youtube_channel_id' does not exist on teachers table. Linking via features JSONB instead.`);
            const { data: freshTeacher } = await supabase.from('teachers').select('features').eq('id', teacher.id).single();
            const features = freshTeacher?.features || {};
            await supabase.from('teachers').update({
              features: { ...features, youtubeChannelId: channelId }
            }).eq('id', teacher.id);
            console.log(`🔗 Mapped teacher "${teacher.name}" -> features.youtubeChannelId: ${channelId}`);
          } else {
            console.error(`❌ Error mapping teacher ${teacher.name}:`, tErr.message);
          }
        } else {
          console.log(`🔗 Mapped teacher "${teacher.name}" -> Channel ID: ${channelId}`);
        }
      }
    }
  }

  console.log('✨ Database normalization complete.');
}

flushAndReorganizeDatabase();
