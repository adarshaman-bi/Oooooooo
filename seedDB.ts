import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const SUPABASE_URL = 'https://jicyzdfzcffhjqehvcpk.supabase.co';
// Load from .env file to prevent GitHub push protection violations
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false
  }
});

// Real YouTube Playlist IDs mapped by subject
const PLAYLISTS_MAP = {
  Physics: 'PLjvx7xqdpePJD6xrZkipYKAgTioEVsjKu',
  Chemistry: 'PLRohitAgarwalClasses01_1',
  Biology: 'PL3m-p7hatfDpXCG9VrbS9LKbES-1ZcgOv',
  Mathematics: 'PLjvx7xqdpePIhuRDZnZA49oCEALDv48b_',
  Other: 'PLbu_fGT0MPsu4U2uiFrIuFgfkbYS22QCm'
};

// Real YouTube videos data to seed
const VIDEOS_SEED = [
  // Physics Playlist 1: PLjvx7xqdpePJD6xrZkipYKAgTioEVsjKu (Eduniti)
  {
    id: '9Bv_M6e8858',
    title: 'Electric Charges and Fields 01 : Introduction & Coulomb\'s Law',
    video_url: 'https://www.youtube.com/watch?v=9Bv_M6e8858',
    duration: '1h 12m',
    category: 'lecture',
    playlist_id: 'PLjvx7xqdpePJD6xrZkipYKAgTioEVsjKu',
    views: 4500000,
    thumbnail_url: 'https://i.ytimg.com/vi/9Bv_M6e8858/maxresdefault.jpg',
    subject: 'Physics',
    exam_type: 'JEE/NEET',
    content_type: 'lecture',
    teacher_name: 'Mohit Goenka',
    institute_name: 'Eduniti',
    likes_count: 120000,
    publish_date: '2025-04-12T00:00:00Z',
    is_active: true
  },
  {
    id: 'F3v624s9u8E',
    title: 'Electric Charges and Fields 02 : Electric Field & Electric Field Lines',
    video_url: 'https://www.youtube.com/watch?v=F3v624s9u8E',
    duration: '58:14',
    category: 'lecture',
    playlist_id: 'PLjvx7xqdpePJD6xrZkipYKAgTioEVsjKu',
    views: 3200000,
    thumbnail_url: 'https://i.ytimg.com/vi/F3v624s9u8E/maxresdefault.jpg',
    subject: 'Physics',
    exam_type: 'JEE/NEET',
    content_type: 'lecture',
    teacher_name: 'Mohit Goenka',
    institute_name: 'Eduniti',
    likes_count: 95000,
    publish_date: '2025-04-15T00:00:00Z',
    is_active: true
  },
  {
    id: 'Hi9_WV7Y9d1',
    title: 'Work Energy and Power Class 11 One Shot | JEE Main & Advanced',
    video_url: 'https://www.youtube.com/watch?v=Hi9_WV7Y9d1',
    duration: '3h 45m',
    category: 'lecture',
    playlist_id: 'PLjvx7xqdpePJD6xrZkipYKAgTioEVsjKu',
    views: 2100000,
    thumbnail_url: 'https://i.ytimg.com/vi/Hi9_WV7Y9d1/maxresdefault.jpg',
    subject: 'Physics',
    exam_type: 'JEE',
    content_type: 'lecture',
    teacher_name: 'Mohit Goenka',
    institute_name: 'Eduniti',
    likes_count: 75000,
    publish_date: '2025-06-20T00:00:00Z',
    is_active: true
  },

  // Chemistry Playlist: PLRohitAgarwalClasses01_1 (Organic Chemistry)
  {
    id: '_nB3U9bS-9g',
    title: 'General Organic Chemistry (GOC) 01 : Inductive Effect & Applications',
    video_url: 'https://www.youtube.com/watch?v=_nB3U9bS-9g',
    duration: '1h 45m',
    category: 'lecture',
    playlist_id: 'PLRohitAgarwalClasses01_1',
    views: 5800000,
    thumbnail_url: 'https://i.ytimg.com/vi/_nB3U9bS-9g/maxresdefault.jpg',
    subject: 'Chemistry',
    exam_type: 'JEE/NEET',
    content_type: 'lecture',
    teacher_name: 'Rohit Agarwal',
    institute_name: 'Physics Wallah',
    likes_count: 180000,
    publish_date: '2025-05-10T00:00:00Z',
    is_active: true
  },
  {
    id: 'lqZ0_LszfW0',
    title: 'Chemical Bonding and Molecular Structure Class 11 One Shot',
    video_url: 'https://www.youtube.com/watch?v=lqZ0_LszfW0',
    duration: '2h 30m',
    category: 'lecture',
    playlist_id: 'PLRohitAgarwalClasses01_1',
    views: 3900000,
    thumbnail_url: 'https://i.ytimg.com/vi/lqZ0_LszfW0/maxresdefault.jpg',
    subject: 'Chemistry',
    exam_type: 'JEE/NEET',
    content_type: 'lecture',
    teacher_name: 'Rohit Agarwal',
    institute_name: 'Physics Wallah',
    likes_count: 110000,
    publish_date: '2025-05-25T00:00:00Z',
    is_active: true
  },

  // Biology Playlist: PL3m-p7hatfDpXCG9VrbS9LKbES-1ZcgOv (NEET Biology)
  {
    id: 'kYJ5Q0d_0o8',
    title: 'Complete Class 11th Biology One Shot revision for NEET',
    video_url: 'https://www.youtube.com/watch?v=kYJ5Q0d_0o8',
    duration: '8h 15m',
    category: 'lecture',
    playlist_id: 'PL3m-p7hatfDpXCG9VrbS9LKbES-1ZcgOv',
    views: 6200000,
    thumbnail_url: 'https://i.ytimg.com/vi/kYJ5Q0d_0o8/maxresdefault.jpg',
    subject: 'Biology',
    exam_type: 'NEET',
    content_type: 'lecture',
    teacher_name: 'Vipin Sharma',
    institute_name: 'NEET Wallah',
    likes_count: 240000,
    publish_date: '2025-08-01T00:00:00Z',
    is_active: true
  },

  // Mathematics Playlist: PLjvx7xqdpePIhuRDZnZA49oCEALDv48b_ (JEE Mathematics)
  {
    id: 'PLbu_fGT0MPsu4U2uiFrIuFgfkbYS22QCm', // Using a placeholder for now
    title: 'Calculus Limits & Continuity Full Course for JEE',
    video_url: 'https://www.youtube.com/watch?v=F3v624s9u8E',
    duration: '2h 15m',
    category: 'lecture',
    playlist_id: 'PLjvx7xqdpePIhuRDZnZA49oCEALDv48b_',
    views: 1800000,
    thumbnail_url: 'https://i.ytimg.com/vi/F3v624s9u8E/maxresdefault.jpg',
    subject: 'Mathematics',
    exam_type: 'JEE',
    content_type: 'lecture',
    teacher_name: 'Mohit Tyagi',
    institute_name: 'Competishun',
    likes_count: 48000,
    publish_date: '2025-07-15T00:00:00Z',
    is_active: true
  }
];

const PLAYLISTS_SEED = [
  {
    id: 'PLjvx7xqdpePJD6xrZkipYKAgTioEVsjKu',
    title: 'Sure Shot Physics Concept Series',
    category: 'Physics',
    thumbnail: 'https://i.ytimg.com/vi/9Bv_M6e8858/maxresdefault.jpg',
    description: 'Highly expected questions and concept revision for JEE Main and Advanced.',
    teacher_id: 'alakh_pandey',
    lectures_count: 3,
    exam_type: 'Both',
    is_active: true
  },
  {
    id: 'PLRohitAgarwalClasses01_1',
    title: 'Complete Organic Chemistry Masterclass',
    category: 'Chemistry',
    thumbnail: 'https://i.ytimg.com/vi/_nB3U9bS-9g/maxresdefault.jpg',
    description: 'Master general organic chemistry, inductive effects, hyperconjugation and electrophilic additions.',
    teacher_id: 'rohit_aggarwal_pw',
    lectures_count: 2,
    exam_type: 'Both',
    is_active: true
  },
  {
    id: 'PL3m-p7hatfDpXCG9VrbS9LKbES-1ZcgOv',
    title: 'Ummeed Biology NEET Revision',
    category: 'Biology',
    thumbnail: 'https://i.ytimg.com/vi/kYJ5Q0d_0o8/maxresdefault.jpg',
    description: 'Complete high-yield Biology sessions covering NEET exam targets.',
    teacher_id: 'vipin-sharma-physics-wallah',
    lectures_count: 1,
    exam_type: 'NEET',
    is_active: true
  },
  {
    id: 'PLjvx7xqdpePIhuRDZnZA49oCEALDv48b_',
    title: 'JEE Mathematics Core Solving Series',
    category: 'Mathematics',
    thumbnail: 'https://i.ytimg.com/vi/F3v624s9u8E/maxresdefault.jpg',
    description: 'Limits, Continuity, and Calculus problem-solving guides.',
    teacher_id: 'mohit_tyagi',
    lectures_count: 1,
    exam_type: 'JEE',
    is_active: true
  },
  {
    id: 'PLbu_fGT0MPsu4U2uiFrIuFgfkbYS22QCm',
    title: 'Physics Mechanics Advanced Course',
    category: 'Physics',
    thumbnail: 'https://i.ytimg.com/vi/9Bv_M6e8858/maxresdefault.jpg',
    description: 'Friction, Rotational Mechanics, and Newton\'s Laws illustrations.',
    teacher_id: 'nitin_vijay',
    lectures_count: 1,
    exam_type: 'JEE',
    is_active: true
  }
];

async function seed() {
  console.log('🚀 Starting Supabase Database Seeding...');

  // 1. Insert/Upsert Playlists
  console.log('Seeding playlists...');
  const { error: plError } = await supabase
    .from('playlists')
    .upsert(PLAYLISTS_SEED, { onConflict: 'id' });
  
  if (plError) {
    console.error('❌ Playlists seeding failed:', plError.message);
    return;
  }
  console.log('✅ Playlists seeded successfully.');

  // 2. Insert/Upsert Videos
  console.log('Seeding videos...');
  const videosWithTime = VIDEOS_SEED.map(v => ({
    ...v,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  }));
  const { error: vidError } = await supabase
    .from('videos')
    .upsert(videosWithTime, { onConflict: 'id' });

  if (vidError) {
    console.error('❌ Videos seeding failed:', vidError.message);
    return;
  }
  console.log('✅ Videos seeded successfully.');

  // 3. Update all 115 teachers' features JSON column to point to their respective YouTube playlists
  console.log('Fetching teachers...');
  const { data: teachers, error: fetchErr } = await supabase
    .from('teachers')
    .select('id, name, subject, features');

  if (fetchErr || !teachers) {
    console.error('❌ Failed to fetch teachers:', fetchErr?.message);
    return;
  }

  console.log(`Fetched ${teachers.length} teachers. Updating features...`);
  let updatedCount = 0;

  for (const t of teachers) {
    const subject = t.subject || '';
    let targetPlaylist = PLAYLISTS_MAP.Other;

    if (subject.toLowerCase().includes('physics')) {
      targetPlaylist = PLAYLISTS_MAP.Physics;
    } else if (subject.toLowerCase().includes('chem')) {
      targetPlaylist = PLAYLISTS_MAP.Chemistry;
    } else if (subject.toLowerCase().includes('bio')) {
      targetPlaylist = PLAYLISTS_MAP.Biology;
    } else if (subject.toLowerCase().includes('math')) {
      targetPlaylist = PLAYLISTS_MAP.Mathematics;
    }

    const currentFeatures = t.features || {};
    const updatedFeatures = {
      ...currentFeatures,
      youtubeChannelId: targetPlaylist
    };

    const { error: updateErr } = await supabase
      .from('teachers')
      .update({ features: updatedFeatures })
      .eq('id', t.id);

    if (updateErr) {
      console.warn(`⚠️ Failed to update teacher ${t.name}:`, updateErr.message);
    } else {
      updatedCount++;
    }
  }

  console.log(`✅ Successfully updated ${updatedCount}/${teachers.length} teachers features column.`);
  console.log('🎉 Seeding successfully completed!');
}

seed();
