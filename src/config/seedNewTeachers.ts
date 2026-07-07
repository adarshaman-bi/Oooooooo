import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const rawUrl = process.env.SUPABASE_URL;
const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isConfigured = rawUrl && rawUrl.trim() !== '' && rawKey && rawKey.trim() !== '';

const supabaseUrl = isConfigured ? rawUrl.trim() : 'https://placeholder.supabase.co';
const supabaseKey = isConfigured ? rawKey.trim() : 'placeholder-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Clean target data payload of new premium educators
const newTeachersRaw = [
  {
    "full_name": "Abhishek Jain (ABJ Sir)",
    "profile_photo_url": "https://cdn.pw.live/faculty/abhishek_jain.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["Resonance"],
    "subject": "Physics",
    "years_of_experience": "12+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Excellent for building strong foundations in JEE Main physics. Clear concepts and highly engaging.",
    "common_criticisms": "Pacing can be slow for advanced students; less focus on JEE Advanced level problems.",
    "reddit_mentions_summary": "Frequently called the 'GOAT' for basics on r/JEENEETards. Highly recommended for beginners and Mains prep.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/physics_faculty_tierlist"]
  },
  {
    "full_name": "Rajwant Singh",
    "profile_photo_url": "https://cdn.pw.live/faculty/rajwant_singh.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["Allen"],
    "subject": "Physics",
    "years_of_experience": "15+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Preferred by serious aspirants for JEE Advanced. Tackles high-level mechanics and electrodynamics exceptionally well.",
    "common_criticisms": "Teaching style is considered dry or less engaging compared to ABJ Sir.",
    "reddit_mentions_summary": "Often debated against ABJ Sir on r/JEENEETards. Consensus is to use him for Advanced and ABJ for Mains.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/abj_vs_rajwant"]
  },
  {
    "full_name": "Ankit Agarwal",
    "profile_photo_url": "https://cdn.pw.live/faculty/ankit_agarwal.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["Motion"],
    "subject": "Physics",
    "years_of_experience": "8+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Great problem-solving approach and shortcut tricks for JEE Main. Very energetic.",
    "common_criticisms": "Sometimes skips deep theoretical derivations in favor of direct formula application.",
    "reddit_mentions_summary": "Recommended on r/JEENEETards for droppers who need quick revision and trick-based learning.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/best_physics_for_droppers"]
  },
  {
    "full_name": "Brijesh Dwivedi",
    "profile_photo_url": "https://cdn.unacademy.com/faculty/brijesh_dwivedi.jpg",
    "current_institute": "Unacademy",
    "previous_institutes": ["FIITJEE"],
    "subject": "Physics",
    "years_of_experience": "18+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Veteran teacher with deep conceptual clarity. Excellent for Olympiad and JEE Advanced.",
    "common_criticisms": "Classes can be too lengthy and demanding for students with shorter attention spans.",
    "reddit_mentions_summary": "Highly respected on r/JEENEETards for serious, no-nonsense teaching. Considered a hidden gem for Advanced.",
    "official_source_url": "https://unacademy.com/@brijeshdwivedi",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/unacademy_physics_review"]
  },
  {
    "full_name": "Jayant Nagpal",
    "profile_photo_url": "https://competishun.com/faculty/jayant_nagpal.jpg",
    "current_institute": "Competishun",
    "previous_institutes": ["Allen", "Resonance"],
    "subject": "Physics",
    "years_of_experience": "14+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Exceptional for deep theory and rigorous problem-solving. Free YouTube content is gold for self-studiers.",
    "common_criticisms": "Batch pacing is very fast; not ideal for absolute beginners.",
    "reddit_mentions_summary": "Cult following on r/JEENEETards. Frequently recommended for students who want Kota-level rigor for free.",
    "official_source_url": "https://competishun.com/faculty",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/competishun_review"]
  },
  {
    "full_name": "Neeraj Kumar Saini",
    "profile_photo_url": "https://cdn.pw.live/faculty/neeraj_saini.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["Aakash"],
    "subject": "Physics",
    "years_of_experience": "10+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Very relatable teaching style. Great at breaking down complex modern physics and optics.",
    "common_criticisms": "Sometimes struggles with time management during live classes.",
    "reddit_mentions_summary": "Often recommended for Class 11th students transitioning from 10th, praised for making physics less intimidating.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/11th_physics_teacher"]
  },
  {
    "full_name": "Sanjeev Kumar",
    "profile_photo_url": "https://cdn.unacademy.com/faculty/sanjeev_kumar.jpg",
    "current_institute": "Unacademy",
    "previous_institutes": ["Vibrant Academy"],
    "subject": "Physics",
    "years_of_experience": "16+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Strong focus on mechanics. Excellent DPPs (Daily Practice Problems) and structured testing.",
    "common_criticisms": "Can be overly strict in live classes, which some students find off-putting.",
    "reddit_mentions_summary": "Recommended for disciplined students who need a strict environment to stay on track.",
    "official_source_url": "https://unacademy.com/@sanjeevkumar",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/strict_physics_teachers"]
  },
  {
    "full_name": "Vikas Gupta",
    "profile_photo_url": "https://resonance.ac.in/faculty/vikas_gupta.jpg",
    "current_institute": "Resonance",
    "previous_institutes": ["Bansal Classes"],
    "subject": "Physics",
    "years_of_experience": "20+",
    "teaching_mode": "Offline",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Legendary Kota faculty. Unmatched depth in Electrodynamics and Thermodynamics.",
    "common_criticisms": "Offline only; notes are dense and require multiple revisions.",
    "reddit_mentions_summary": "Frequently mentioned in 'best offline Kota faculty' threads. Highly respected by droppers in Kota.",
    "official_source_url": "https://resonance.ac.in/faculty.aspx",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/best_kota_faculty"]
  },
  {
    "full_name": "Amit Ranjan",
    "profile_photo_url": "https://cdn.unacademy.com/faculty/amit_ranjan.jpg",
    "current_institute": "Unacademy",
    "previous_institutes": ["FIITJEE"],
    "subject": "Physics",
    "years_of_experience": "12+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Great for quick revisions and marathon sessions before JEE Main. High energy.",
    "common_criticisms": "Marathon sessions lack the depth required for building concepts from scratch.",
    "reddit_mentions_summary": "Go-to recommendation on r/JEENEETards for last-month JEE Main crash courses and revision.",
    "official_source_url": "https://unacademy.com/@amitranjan",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/best_crash_course_physics"]
  },
  {
    "full_name": "Kailash Sharma",
    "profile_photo_url": "https://cdn.unacademy.com/faculty/kailash_sharma.jpg",
    "current_institute": "Unacademy",
    "previous_institutes": ["Allen"],
    "subject": "Physics",
    "years_of_experience": "14+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Excellent board-exam to JEE Main bridge. Very clear diagrams and visual explanations.",
    "common_criticisms": "Not recommended for JEE Advanced as the problem level is kept relatively low.",
    "reddit_mentions_summary": "Highly recommended for CBSE board students who are simultaneously preparing for JEE Main.",
    "official_source_url": "https://unacademy.com/@kailashsharma",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/boards_and_jee_together"]
  },
  {
    "full_name": "Yogesh Jain",
    "profile_photo_url": "https://cdn.pw.live/faculty/yogesh_jain.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["Motion"],
    "subject": "Physics",
    "years_of_experience": "9+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Very interactive. Uses a lot of real-life examples to explain rotational mechanics.",
    "common_criticisms": "Sometimes goes off-topic during live streams.",
    "reddit_mentions_summary": "Liked by students who get bored easily. Praised for keeping the class engaging.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/engaging_physics_teachers"]
  },
  {
    "full_name": "Shreyas Halwai",
    "profile_photo_url": "https://cdn.pw.live/faculty/shreyas_halwai.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["Aakash"],
    "subject": "Physics",
    "years_of_experience": "7+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Young, relatable, and excellent at solving NTA-level JEE Main PYQs live.",
    "common_criticisms": "Lacks the multi-year experience of veteran Kota faculty for edge-case doubts.",
    "reddit_mentions_summary": "Popular among younger batches (Class 11/12) for his relatable vibe and PYQ focus.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/young_pw_faculty"]
  },
  {
    "full_name": "Sandeep Singhal",
    "profile_photo_url": "https://aakash.ac.in/faculty/sandeep_singhal.jpg",
    "current_institute": "Aakash",
    "previous_institutes": ["FIITJEE"],
    "subject": "Chemistry",
    "years_of_experience": "18+",
    "teaching_mode": "Offline",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Master of Physical Chemistry. Numerical approach is flawless and highly systematic.",
    "common_criticisms": "Very strict; doesn't entertain back-benchers or undisciplined behavior.",
    "reddit_mentions_summary": "Frequently mentioned as a top-tier offline Physical Chemistry teacher in Delhi/NCR Aakash centers.",
    "official_source_url": "https://aakash.ac.in/faculty",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/aakash_delhi_faculty"]
  },
  {
    "full_name": "Rajesh Bishnoi",
    "profile_photo_url": "https://cdn.pw.live/faculty/rajesh_bishnoi.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["Resonance"],
    "subject": "Chemistry",
    "years_of_experience": "11+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Makes Organic Chemistry mechanisms very easy to understand. Great at GOC.",
    "common_criticisms": "Sometimes rushes through the later chapters of Class 12 Organic.",
    "reddit_mentions_summary": "Highly recommended on r/JEENEETards for students struggling with Organic Chemistry basics.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/best_organic_teacher"]
  },
  {
    "full_name": "Sudarshan Vairagi",
    "profile_photo_url": "https://cdn.pw.live/faculty/sudarshan_vairagi.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["Allen"],
    "subject": "Chemistry",
    "years_of_experience": "10+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Exceptional for Inorganic Chemistry. Uses great mnemonics and memory tricks for p-block and d-block.",
    "common_criticisms": "Can be overly reliant on rote learning tricks rather than pure conceptual depth.",
    "reddit_mentions_summary": "Considered a 'hidden gem' for Inorganic Chemistry on r/JEENEETards. Praised for making a boring subject interesting.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/inorganic_chemistry_tricks"]
  },
  {
    "full_name": "Vineet Khatri",
    "profile_photo_url": "https://atpstar.com/faculty/vineet_khatri.jpg",
    "current_institute": "ATP STAR",
    "previous_institutes": ["Independent"],
    "subject": "Chemistry",
    "years_of_experience": "15+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "One of the pioneers of online JEE prep. Excellent for deep Organic Chemistry concepts.",
    "common_criticisms": "Platform UI/UX is outdated compared to PW/Unacademy; content is sometimes fragmented.",
    "reddit_mentions_summary": "Respected veteran on r/JEENEETards. Many rankers credit his older YouTube videos for their Organic foundation.",
    "official_source_url": "https://atpstar.com/faculty",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/atp_star_review"]
  },
  {
    "full_name": "Alok Kumar",
    "profile_photo_url": "https://cdn.unacademy.com/faculty/alok_kumar.jpg",
    "current_institute": "Unacademy",
    "previous_institutes": ["Resonance"],
    "subject": "Chemistry",
    "years_of_experience": "16+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Very balanced approach to Physical and Inorganic. Great for JEE Advanced problem-solving.",
    "common_criticisms": "Voice modulation is flat, which can make long 3-hour classes sleepy.",
    "reddit_mentions_summary": "Recommended for serious aspirants who prioritize content quality over entertainment value.",
    "official_source_url": "https://unacademy.com/@alokkumar",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/unacademy_chemistry_review"]
  },
  {
    "full_name": "Mukesh Kumar",
    "profile_photo_url": "https://cdn.unacademy.com/faculty/mukesh_kumar.jpg",
    "current_institute": "Unacademy",
    "previous_institutes": ["Allen"],
    "subject": "Chemistry",
    "years_of_experience": "14+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Excellent for Class 11th foundational chemistry. Very patient with basic doubts.",
    "common_criticisms": "Pacing is too slow for droppers or students looking for quick revision.",
    "reddit_mentions_summary": "Frequently suggested for Class 11th students starting their JEE journey on r/JEENEETards.",
    "official_source_url": "https://unacademy.com/@mukeshkumar",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/11th_chemistry_teacher"]
  },
  {
    "full_name": "Deepak Kumar",
    "profile_photo_url": "https://cdn.pw.live/faculty/deepak_kumar.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["Motion"],
    "subject": "Chemistry",
    "years_of_experience": "9+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "High energy, great at keeping students awake during late-night chemistry sessions.",
    "common_criticisms": "Sometimes makes calculation errors on the whiteboard during live numericals.",
    "reddit_mentions_summary": "Liked for his enthusiasm. Students recommend him for Physical Chemistry numerical practice.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/pw_chemistry_faculty"]
  },
  {
    "full_name": "Harshita Shrivastava",
    "profile_photo_url": "https://cdn.unacademy.com/faculty/harshita_shrivastava.jpg",
    "current_institute": "Unacademy",
    "previous_institutes": ["Aakash"],
    "subject": "Chemistry",
    "years_of_experience": "8+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Very structured notes. Excellent for female aspirants who prefer a calm, focused teaching environment.",
    "common_criticisms": "Lacks the 'mass appeal' and aggressive problem-solving speed of male veteran faculty.",
    "reddit_mentions_summary": "Highly appreciated on r/JEENEETards for her neat notes and systematic approach to Organic Chemistry.",
    "official_source_url": "https://unacademy.com/@harshitashrivastava",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/female_faculty_jee"]
  },
  {
    "full_name": "Anoop Chandan",
    "profile_photo_url": "https://cdn.pw.live/faculty/anoop_chandan.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["Independent"],
    "subject": "Chemistry",
    "years_of_experience": "12+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Great for NEET Chemistry. Focuses heavily on NCERT line-by-line, which is crucial for NEET.",
    "common_criticisms": "Not suitable for JEE Advanced as the depth is strictly limited to NEET/NCERT level.",
    "reddit_mentions_summary": "Top recommendation on r/NEET for students who want to master NCERT Chemistry without getting distracted.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/NEET/comments/best_chemistry_for_neet"]
  },
  {
    "full_name": "Rahul Dudi",
    "profile_photo_url": "https://cdn.pw.live/faculty/rahul_dudi.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["Allen"],
    "subject": "Chemistry",
    "years_of_experience": "10+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Excellent fast-track and crash course teacher. Great for last-minute Inorganic revision.",
    "common_criticisms": "Full-year batches can feel rushed due to his fast-talking nature.",
    "reddit_mentions_summary": "Frequently recommended for droppers and 12th appearing students for quick syllabus completion.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/fast_track_chemistry"]
  },
  {
    "full_name": "Rajeev Mahajan",
    "profile_photo_url": "https://cdn.pw.live/faculty/rajeev_mahajan.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["FIITJEE"],
    "subject": "Chemistry",
    "years_of_experience": "15+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Deep conceptual clarity in Physical Chemistry. Excellent at linking thermodynamics with chemical equilibrium.",
    "common_criticisms": "Can be too theoretical; sometimes lacks sufficient PYQ practice during the lecture.",
    "reddit_mentions_summary": "Respected for his theoretical depth. Recommended for students who want to understand the 'why' behind formulas.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/physical_chemistry_concepts"]
  },
  {
    "full_name": "Faisal Razaq",
    "profile_photo_url": "https://cdn.pw.live/faculty/faisal_razaq.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["Resonance"],
    "subject": "Chemistry",
    "years_of_experience": "20+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Veteran teacher with immense experience. Great at predicting NTA question patterns.",
    "common_criticisms": "Teaching style is very traditional and old-school; lacks modern digital visual aids.",
    "reddit_mentions_summary": "Highly regarded by older droppers on r/JEENEETards who prefer a classic, rigorous coaching style.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/veteran_chemistry_teachers"]
  },
  {
    "full_name": "Om Sharma (Om Sir)",
    "profile_photo_url": "https://cdn.pw.live/faculty/om_sharma.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["Aakash"],
    "subject": "Chemistry",
    "years_of_experience": "8+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Underrated gem for Inorganic Chemistry. Makes periodic table trends very intuitive.",
    "common_criticisms": "Less popular, so fewer peer discussions and community-made notes available online.",
    "reddit_mentions_summary": "Frequently pops up in 'underrated teachers' threads on r/JEENEETards as a top pick for Inorganic.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/underrated_inorganic_teacher"]
  },
  {
    "full_name": "Abhishek Maheshwari (ABM Sir)",
    "profile_photo_url": "https://competishun.com/faculty/abm_sir.jpg",
    "current_institute": "Competishun",
    "previous_institutes": ["Allen", "Resonance"],
    "subject": "Mathematics",
    "years_of_experience": "16+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Legendary for Calculus and Coordinate Geometry. Extremely rigorous and logical approach.",
    "common_criticisms": "Very fast-paced. Students with weak math foundations will struggle to keep up.",
    "reddit_mentions_summary": "Highly revered on r/JEENEETards. Considered one of the best math teachers available online for free/paid.",
    "official_source_url": "https://competishun.com/faculty",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/best_maths_teacher_jee"]
  },
  {
    "full_name": "Amarnath Anand",
    "profile_photo_url": "https://cdn.pw.live/faculty/amarnath_anand.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["FIITJEE"],
    "subject": "Mathematics",
    "years_of_experience": "14+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Great for Algebra and Trigonometry. Very systematic in building from basic to advanced.",
    "common_criticisms": "Sometimes spends too much time on basic proofs that aren't directly tested in JEE Main.",
    "reddit_mentions_summary": "Recommended for Class 11th students to build a rock-solid foundation in Algebra.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/11th_maths_faculty"]
  },
  {
    "full_name": "Arun Kumar",
    "profile_photo_url": "https://cdn.unacademy.com/faculty/arun_kumar.jpg",
    "current_institute": "Unacademy",
    "previous_institutes": ["Allen"],
    "subject": "Mathematics",
    "years_of_experience": "18+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Excellent problem-solving speed. Great for teaching shortcuts and option elimination techniques.",
    "common_criticisms": "Over-reliance on shortcuts can backfire in JEE Advanced where conceptual depth is tested.",
    "reddit_mentions_summary": "Popular for JEE Main prep. Students love his trick videos for quick revision.",
    "official_source_url": "https://unacademy.com/@arunkumar",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/maths_shortcuts_tricks"]
  },
  {
    "full_name": "Sameer Chincholikar",
    "profile_photo_url": "https://cdn.unacademy.com/faculty/sameer_chincholikar.jpg",
    "current_institute": "Unacademy",
    "previous_institutes": ["FIITJEE", "Allen"],
    "subject": "Mathematics",
    "years_of_experience": "20+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "One of the most experienced math faculty online. Unmatched depth in Calculus.",
    "common_criticisms": "Classes can be dry and monotonous. Requires high self-discipline to stay focused.",
    "reddit_mentions_summary": "Highly respected veteran on r/JEENEETards. Recommended for serious aspirants aiming for top 1000 ranks.",
    "official_source_url": "https://unacademy.com/@sameerchincholikar",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/veteran_maths_teachers"]
  },
  {
    "full_name": "Utsav Garg",
    "profile_photo_url": "https://cdn.pw.live/faculty/utsav_garg.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["Independent"],
    "subject": "Mathematics",
    "years_of_experience": "7+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Very energetic and relatable. Great at keeping the chat engaged and solving live doubts.",
    "common_criticisms": "Lacks the depth required for JEE Advanced; strictly a JEE Main level teacher.",
    "reddit_mentions_summary": "Liked by students who find math boring. His energy helps them get through tough chapters.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/energetic_maths_teachers"]
  },
  {
    "full_name": "Shubham Jha",
    "profile_photo_url": "https://cdn.pw.live/faculty/shubham_jha.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["Aakash"],
    "subject": "Mathematics",
    "years_of_experience": "6+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Young and highly relatable. Excellent at explaining vectors and 3D geometry.",
    "common_criticisms": "Sometimes struggles with complex, multi-concept integration problems live.",
    "reddit_mentions_summary": "Popular among the younger demographic on r/JEENEETards for his friendly and approachable style.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/young_maths_faculty"]
  },
  {
    "full_name": "Rohit Tripathi",
    "profile_photo_url": "https://cdn.unacademy.com/faculty/rohit_tripathi.jpg",
    "current_institute": "Unacademy",
    "previous_institutes": ["Resonance"],
    "subject": "Mathematics",
    "years_of_experience": "12+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Great for Probability and Permutations/Combinations. Very logical breakdown of tricky problems.",
    "common_criticisms": "P&C and Probability are his strong suits, but his Calculus is considered average by some.",
    "reddit_mentions_summary": "Frequently recommended specifically for P&C and Probability on r/JEENEETards.",
    "official_source_url": "https://unacademy.com/@rohittripathi",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/best_teacher_for_probability"]
  },
  {
    "full_name": "Ashish Gaur",
    "profile_photo_url": "https://cdn.pw.live/faculty/ashish_gaur.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["Motion"],
    "subject": "Mathematics",
    "years_of_experience": "10+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Excellent for beginners. Breaks down complex calculus into very simple, digestible steps.",
    "common_criticisms": "Too basic for students who have already completed their syllabus and want advanced practice.",
    "reddit_mentions_summary": "Highly recommended for students starting Class 11th or those with a very weak math background.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/maths_for_beginners"]
  },
  {
    "full_name": "Tarun Khandelwal",
    "profile_photo_url": "https://cdn.pw.live/faculty/tarun_khandelwal.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["Allen"],
    "subject": "Mathematics",
    "years_of_experience": "9+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Great visual explanations for Coordinate Geometry. Uses graphing tools effectively.",
    "common_criticisms": "Sometimes relies too much on software tools rather than teaching manual graphing skills.",
    "reddit_mentions_summary": "Top pick for Coordinate Geometry on r/JEENEETards tier lists.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/JEENEETards/comments/coordinate_geometry_teacher"]
  },
  {
    "full_name": "Garima Goel",
    "profile_photo_url": "https://cdn.unacademy.com/faculty/garima_goel.jpg",
    "current_institute": "Unacademy",
    "previous_institutes": ["Independent"],
    "subject": "Biology",
    "years_of_experience": "12+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Gold medalist. Excellent at linking Botany and Zoology concepts. Great for NEET rank boosters.",
    "common_criticisms": "Pacing is very fast; not ideal for students reading NCERT for the first time.",
    "reddit_mentions_summary": "Highly recommended for droppers and repeaters on r/NEET who need quick, high-yield revision.",
    "official_source_url": "https://unacademy.com/@garimagoel",
    "community_sources": ["https://reddit.com/r/NEET/comments/best_biology_for_droppers"]
  },
  {
    "full_name": "Shivani Bhargava",
    "profile_photo_url": "https://cdn.pw.live/faculty/shivani_bhargava.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["Aakash"],
    "subject": "Biology",
    "years_of_experience": "9+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Very calm and soothing teaching style. Excellent at explaining Human Physiology.",
    "common_criticisms": "Voice can be too soft, making it hard to stay alert during long 3-hour sessions.",
    "reddit_mentions_summary": "Loved by students who get anxious. Her calm demeanor helps them study biology without stress.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/NEET/comments/calm_biology_teachers"]
  },
  {
    "full_name": "Pragya Mishra",
    "profile_photo_url": "https://cdn.pw.live/faculty/pragya_mishra.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["Allen"],
    "subject": "Biology",
    "years_of_experience": "8+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Excellent for Genetics and Evolution. Breaks down complex Mendelian crosses very clearly.",
    "common_criticisms": "Struggles slightly with Plant Anatomy and Morphology compared to her Genetics expertise.",
    "reddit_mentions_summary": "Frequently recommended on r/NEET specifically for mastering the Genetics unit.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/NEET/comments/best_teacher_for_genetics"]
  },
  {
    "full_name": "Ritu Rattewal",
    "profile_photo_url": "https://cdn.unacademy.com/faculty/ritu_rattewal.jpg",
    "current_institute": "Unacademy",
    "previous_institutes": ["Independent"],
    "subject": "Biology",
    "years_of_experience": "15+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "One of the most famous female biology educators. Extremely thorough NCERT line-by-line coverage.",
    "common_criticisms": "Classes are very long and can be exhausting. Sometimes repeats points too often.",
    "reddit_mentions_summary": "A staple recommendation on r/NEET. Considered a must-watch for serious NEET aspirants.",
    "official_source_url": "https://unacademy.com/@riturattewal",
    "community_sources": ["https://reddit.com/r/NEET/comments/ritu_rattewal_review"]
  },
  {
    "full_name": "Vipin Sharma",
    "profile_photo_url": "https://cdn.pw.live/faculty/vipin_sharma.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["Resonance"],
    "subject": "Biology",
    "years_of_experience": "11+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Great at integrating Botany and Zoology. Excellent DPPs and testing methodology.",
    "common_criticisms": "Can be overly strict and scolds students in live chat, which some find demotivating.",
    "reddit_mentions_summary": "Recommended for students who need a strict teacher to keep them disciplined and on track.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/NEET/comments/strict_biology_teachers"]
  },
  {
    "full_name": "Rajesh Kumar",
    "profile_photo_url": "https://aakash.ac.in/faculty/rajesh_kumar.jpg",
    "current_institute": "Aakash",
    "previous_institutes": ["Allen"],
    "subject": "Biology",
    "years_of_experience": "16+",
    "teaching_mode": "Offline",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Top-tier offline faculty. Excellent at dictating concise, high-yield notes that complement NCERT.",
    "common_criticisms": "Offline only; his notes are highly sought after but hard to get for online students.",
    "reddit_mentions_summary": "Frequently mentioned in 'best offline biology faculty' threads. His notes are legendary in Aakash.",
    "official_source_url": "https://aakash.ac.in/faculty",
    "community_sources": ["https://reddit.com/r/NEET/comments/aakash_biology_notes"]
  },
  {
    "full_name": "Ujjwal Kumar",
    "profile_photo_url": "https://cdn.pw.live/faculty/ujjwal_kumar.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["Motion"],
    "subject": "Biology",
    "years_of_experience": "7+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Very interactive and uses a lot of 3D models and animations to explain human anatomy.",
    "common_criticisms": "Over-reliance on animations sometimes distracts from the actual NCERT text.",
    "reddit_mentions_summary": "Loved by visual learners on r/NEET who struggle to imagine biological processes.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/NEET/comments/visual_biology_teachers"]
  },
  {
    "full_name": "Manish Tiwari",
    "profile_photo_url": "https://cdn.pw.live/faculty/manish_tiwari.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["Aakash"],
    "subject": "Biology",
    "years_of_experience": "10+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Excellent for Ecology and Environment. Makes a typically boring unit very interesting with real-world examples.",
    "common_criticisms": "Sometimes goes too deep into environmental science, exceeding the NEET syllabus scope.",
    "reddit_mentions_summary": "Highly recommended for the Ecology unit, which many students find dry and hard to memorize.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/NEET/comments/best_teacher_for_ecology"]
  },
  {
    "full_name": "Tarun Singh (Tarun Sir)",
    "profile_photo_url": "https://cdn.vedantu.com/faculty/tarun_singh.jpg",
    "current_institute": "Vedantu (BIO 360)",
    "previous_institutes": ["Allen"],
    "subject": "Biology",
    "years_of_experience": "12+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Specifically targets students stuck at 250-280 marks in Bio and helps them reach 340+. Great for Plant Morphology.",
    "common_criticisms": "Not as strong in Human Physiology and Genetics compared to his Botany expertise.",
    "reddit_mentions_summary": "Frequently recommended on r/NEET for students specifically looking to maximize their Botany score.",
    "official_source_url": "https://www.vedantu.com/faculty",
    "community_sources": ["https://reddit.com/r/NEET/comments/how_to_score_360_in_bio"]
  },
  {
    "full_name": "Sapiens Sir",
    "profile_photo_url": "https://kgsneethindi.com/faculty/sapiens_sir.jpg",
    "current_institute": "KGS NEET Hindi",
    "previous_institutes": ["Independent"],
    "subject": "Biology",
    "years_of_experience": "10+",
    "teaching_mode": "Offline/Online Hybrid",
    "languages": ["Hindi"],
    "why_students_recommend": "Exceptional for pure Hindi medium students. Explains complex terms in very simple, pure Hindi.",
    "common_criticisms": "Not suitable for students who prefer Hinglish or English terminology for the actual exam.",
    "reddit_mentions_summary": "Highly praised in r/NEET by Hindi medium students who feel alienated by mainstream Hinglish teachers.",
    "official_source_url": "https://kgsneethindi.com",
    "community_sources": ["https://reddit.com/r/NEET/comments/best_hindi_medium_biology"]
  },
  {
    "full_name": "Archana Rathi",
    "profile_photo_url": "https://independent.com/faculty/archana_rathi.jpg",
    "current_institute": "Independent/Local Coaching",
    "previous_institutes": ["Allen"],
    "subject": "Biology",
    "years_of_experience": "14+",
    "teaching_mode": "Offline",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Highly dedicated. Provides personalized attention and handwritten notes to her offline students.",
    "common_criticisms": "Very limited online presence; hard to access her content if you aren't in her physical batch.",
    "reddit_mentions_summary": "Mentioned as a 'hidden gem' by students from local coaching centers who cracked NEET with high bio scores.",
    "official_source_url": "N/A",
    "community_sources": ["https://reddit.com/r/NEET/comments/hidden_gem_biology_teachers"]
  },
  {
    "full_name": "Samapti Singh",
    "profile_photo_url": "https://independent.com/faculty/samapti_singh.jpg",
    "current_institute": "Independent",
    "previous_institutes": ["Aakash"],
    "subject": "Biology (Zoology)",
    "years_of_experience": "9+",
    "teaching_mode": "Online/Offline",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Excellent for Zoology, specifically Animal Kingdom and Human Physiology. Very detailed.",
    "common_criticisms": "Voice pitch is high and delivery can be perceived as slightly monotonous or 'cringe' by some.",
    "reddit_mentions_summary": "Frequently compared to Seep Pahuja on r/NEET. Many students prefer her detailed approach to Zoology.",
    "official_source_url": "N/A",
    "community_sources": ["https://reddit.com/r/NEET/comments/best_zoology_teacher"]
  },
  {
    "full_name": "S.K. Singh",
    "profile_photo_url": "https://allen.ac.in/faculty/sk_singh.jpg",
    "current_institute": "Allen",
    "previous_institutes": ["Resonance"],
    "subject": "Biology",
    "years_of_experience": "22+",
    "teaching_mode": "Offline",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Veteran Kota faculty. Unmatched experience in predicting NTA's mindset and framing Allen's internal test series.",
    "common_criticisms": "Very traditional teaching style. Doesn't use smart boards or digital aids.",
    "reddit_mentions_summary": "Highly respected by serious droppers in Kota. Considered the 'godfather' of biology in Allen.",
    "official_source_url": "https://allen.ac.in/faculty",
    "community_sources": ["https://reddit.com/r/NEET/comments/allen_kota_biology_faculty"]
  },
  {
    "full_name": "Nitesh Devnani",
    "profile_photo_url": "https://cdn.unacademy.com/faculty/nitesh_devnani.jpg",
    "current_institute": "Unacademy",
    "previous_institutes": ["Aakash"],
    "subject": "Biology",
    "years_of_experience": "11+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Great for quick revisions and marathon sessions. Excellent at highlighting NCERT hidden lines.",
    "common_criticisms": "Marathon sessions are too fast for beginners to take proper notes.",
    "reddit_mentions_summary": "Go-to teacher for last 30 days revision on r/NEET. His 'NCERT hidden lines' videos are very popular.",
    "official_source_url": "https://unacademy.com/@niteshdevnani",
    "community_sources": ["https://reddit.com/r/NEET/comments/ncert_hidden_lines_biology"]
  },
  {
    "full_name": "Komal Yadav",
    "profile_photo_url": "https://cdn.unacademy.com/faculty/komal_yadav.jpg",
    "current_institute": "Unacademy",
    "previous_institutes": ["Independent"],
    "subject": "Biology",
    "years_of_experience": "7+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Very energetic and motivating. Great at keeping students positive during the stressful final months.",
    "common_criticisms": "Sometimes focuses more on motivation and less on deep conceptual teaching.",
    "reddit_mentions_summary": "Liked by students who need a morale boost. Frequently recommended for mental health and motivation alongside study.",
    "official_source_url": "https://unacademy.com/@komalyadav",
    "community_sources": ["https://reddit.com/r/NEET/comments/motivational_biology_teachers"]
  },
  {
    "full_name": "Anjali Arora",
    "profile_photo_url": "https://cdn.pw.live/faculty/anjali_arora.jpg",
    "current_institute": "Physics Wallah",
    "previous_institutes": ["Allen"],
    "subject": "Biology",
    "years_of_experience": "8+",
    "teaching_mode": "Online",
    "languages": ["Hindi", "English"],
    "why_students_recommend": "Excellent for Cell Biology and Biomolecules. Makes microscopic concepts very easy to visualize.",
    "common_criticisms": "Pacing is a bit slow, which can be frustrating for students trying to finish the syllabus quickly.",
    "reddit_mentions_summary": "Highly recommended on r/NEET for Class 11th students starting their biology journey.",
    "official_source_url": "https://www.pw.live/faculty",
    "community_sources": ["https://reddit.com/r/NEET/comments/11th_biology_teacher"]
  }
];

function generateSlug(fullName: string, currentInstitute: string): string {
  // Remove parentheticals like "(ABJ Sir)", "(Om Sir)"
  const nameClean = fullName.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  const combined = `${nameClean}-${currentInstitute || ''}`;
  return combined
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function runSeeding() {
  console.log('Starting educator dataset ingestion and Supabase seeding...');
  
  // 1. Load existing teachersData.json
  const jsonPath = path.resolve(process.cwd(), 'src/config/teachersData.json');
  let currentJsonData: any[] = [];
  try {
    const content = fs.readFileSync(jsonPath, 'utf8');
    currentJsonData = JSON.parse(content);
  } catch (err) {
    console.error('Error reading teachersData.json:', err);
  }

  // 2. Setup generic user IDs from auth.users (Community Feedback and Reddit Aspirant Summary)
  // Let's create them if they do not exist, or fetch their IDs if they do.
  console.log('Resolving verified student handler accounts...');
  
  let communityUserId = '';
  let redditUserId = '';

  const emails = {
    community: 'community.feedback@biovised.com',
    reddit: 'reddit.aspirant@biovised.com'
  };

  try {
    const { data: listData, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) throw listErr;

    const commUser = (listData.users as any[]).find(u => u.email === emails.community);
    if (commUser) {
      communityUserId = commUser.id;
      console.log(`Found existing Community Feedback user: ${communityUserId}`);
    } else {
      const { data: newComm, error: cErr } = await supabase.auth.admin.createUser({
        email: emails.community,
        password: 'CommunityFeedback123!',
        email_confirm: true,
        user_metadata: { display_name: 'Community Feedback' }
      });
      if (cErr) throw cErr;
      communityUserId = newComm.user.id;
      console.log(`Created Community Feedback user: ${communityUserId}`);
      // Insert into public.profiles
      await supabase.from('profiles').upsert({
        uid: communityUserId,
        email: emails.community,
        display_name: 'Community Feedback',
        role: 'user',
        onboarding_completed: true
      });
    }

    const redUser = (listData.users as any[]).find(u => u.email === emails.reddit);
    if (redUser) {
      redditUserId = redUser.id;
      console.log(`Found existing Reddit Aspirant user: ${redditUserId}`);
    } else {
      const { data: newRed, error: rErr } = await supabase.auth.admin.createUser({
        email: emails.reddit,
        password: 'RedditAspirant123!',
        email_confirm: true,
        user_metadata: { display_name: 'Reddit Aspirant Summary' }
      });
      if (rErr) throw rErr;
      redditUserId = newRed.user.id;
      console.log(`Created Reddit Aspirant user: ${redditUserId}`);
      // Insert into public.profiles
      await supabase.from('profiles').upsert({
        uid: redditUserId,
        email: emails.reddit,
        display_name: 'Reddit Aspirant Summary',
        role: 'user',
        onboarding_completed: true
      });
    }
  } catch (err) {
    console.error('Error setting up auth users:', err);
    process.exit(1);
  }

  // 3. Process new teachers, generate slugs, append to JSON, and seed DB
  console.log('Cleaning up existing seeded data for a clean run...');
  const newRawSlugs = newTeachersRaw.map(t => generateSlug(t.full_name, t.current_institute));
  
  // Also clean up discography teachers we created
  const discographySlugs = ['arjun-sharma', 'om-pandey', 'manish-raj'];
  const teachersToDelete = Array.from(new Set([...newRawSlugs, ...discographySlugs]));

  // Get matching database IDs for all discography teachers
  const { data: allDbTeachers } = await supabase.from('teachers').select('id, name');
  const matchedDiscographyIds: string[] = [];
  if (allDbTeachers) {
    const discographyNames = [
      'Rohit Agarwal', 'Vipin Sharma', 'Yogesh Jain', 'Faizal Razaq', 'Garima Goel',
      'Ritu Rattewal', 'Arjun Sharma', 'Rajwant Singh', 'Om Pandey', 'Manish Raj (MR Sir)'
    ];
    for (const name of discographyNames) {
      const cleanDiscName = name.toLowerCase().replace(/[^a-z0-9]+/g, '').replace(/gg/g, 'g').replace(/z/g, 's');
      const match = allDbTeachers.find(d => {
        const cleanDbName = d.name.toLowerCase().replace(/[^a-z0-9]+/g, '').replace(/gg/g, 'g').replace(/z/g, 's');
        return cleanDbName === cleanDiscName || cleanDbName.includes(cleanDiscName) || cleanDiscName.includes(cleanDbName);
      });
      if (match) {
        matchedDiscographyIds.push(match.id);
      }
    }
  }

  const allTargetTeacherIds = Array.from(new Set([...newRawSlugs, ...discographySlugs, ...matchedDiscographyIds]));

  // Delete reviews and video placeholders
  await supabase.from('reviews').delete().in('entity_id', newRawSlugs.map(s => `${s}_placeholder`));
  await supabase.from('videos').delete().in('id', newRawSlugs.map(s => `${s}_placeholder`));
  
  if (allTargetTeacherIds.length > 0) {
    await supabase.from('videos').delete().in('teacher_id', allTargetTeacherIds);
    await supabase.from('playlists').delete().in('teacher_id', allTargetTeacherIds);
  }

  // Delete the teachers themselves
  await supabase.from('teachers').delete().in('id', teachersToDelete);

  // Clean up currentJsonData memory and update the file
  currentJsonData = currentJsonData.filter(item => {
    const itemId = item.id || item.slug;
    return !teachersToDelete.includes(itemId);
  });
  fs.writeFileSync(jsonPath, JSON.stringify(currentJsonData, null, 2) + '\n', 'utf8');

  console.log('Cleanup complete.');


  console.log('Processing new educators...');
  let jsonAppendedCount = 0;
  let dbInsertedCount = 0;

  for (const t of newTeachersRaw) {
    const slug = generateSlug(t.full_name, t.current_institute);
    
    // A. JSON Update
    const existsInJson = currentJsonData.some(item => item.id === slug || item.slug === slug);
    if (!existsInJson) {
      currentJsonData.push({
        id: slug,
        slug: slug,
        full_name: t.full_name,
        profile_photo_url: t.profile_photo_url || null,
        institute_name: t.current_institute,
        subject: t.subject,
        years_of_experience: t.years_of_experience,
        source_url: t.official_source_url
      });
      jsonAppendedCount++;
    }

    // B. Supabase Teachers Table Seed
    // Check if teacher already exists in Supabase
    const { data: existingTeacher, error: checkErr } = await supabase
      .from('teachers')
      .select('id')
      .eq('id', slug)
      .maybeSingle();

    if (checkErr) {
      console.error(`Error checking teacher ${t.full_name}:`, checkErr);
      continue;
    }

    if (!existingTeacher) {
      // Excluded target exams mapping
      let targetExams = ['JEE', 'NEET'];
      if (t.subject.toLowerCase() === 'biology' || t.subject.toLowerCase().includes('zoology') || t.subject.toLowerCase().includes('botany')) {
        targetExams = ['NEET'];
      } else if (t.subject.toLowerCase() === 'mathematics' || t.subject.toLowerCase() === 'maths') {
        targetExams = ['JEE'];
      }

      const { error: insErr } = await supabase
        .from('teachers')
        .insert({
          id: slug,
          name: t.full_name,
          subject: t.subject,
          avatar: t.profile_photo_url || null,
          rating: 4.50,
          accuracy: 90,
          video_count: 0,
          followers_count: 0,
          bio: t.why_students_recommend,
          is_verified: true,
          exams: targetExams,
          features: {
            previous_institutes: t.previous_institutes,
            teaching_mode: t.teaching_mode,
            languages: t.languages,
            youtubeChannelId: ""
          }
        });

      if (insErr) {
        console.error(`Error inserting teacher ${t.full_name}:`, insErr);
        continue;
      }
      dbInsertedCount++;

      // C. Insert Placeholder Video for Reviews Association
      const videoPlaceholderId = `${slug}_placeholder`;
      const { error: vidErr } = await supabase
        .from('videos')
        .insert({
          id: videoPlaceholderId,
          title: 'Community Reviews Hub Placeholder',
          video_url: 'https://youtube.com/watch?v=placeholder',
          teacher_id: slug,
          teacher_name: t.full_name,
          category: 'placeholder',
          is_active: false
        });

      if (vidErr) {
        console.error(`Error inserting placeholder video for ${t.full_name}:`, vidErr);
      }

      // D. Insert Community Reviews in public.reviews
      const reviews = [
        {
          id: `rev_${slug}_recommend`,
          entity_id: videoPlaceholderId,
          entity_type: 'video',
          user_id: communityUserId,
          user_display_name: 'Community Feedback',
          rating: 5.0,
          comment: t.why_students_recommend,
          created_at: new Date().toISOString()
        },
        {
          id: `rev_${slug}_criticism`,
          entity_id: videoPlaceholderId,
          entity_type: 'video',
          user_id: communityUserId,
          user_display_name: 'Community Feedback',
          rating: 3.0,
          comment: t.common_criticisms,
          created_at: new Date().toISOString()
        },
        {
          id: `rev_${slug}_reddit`,
          entity_id: videoPlaceholderId,
          entity_type: 'video',
          user_id: redditUserId,
          user_display_name: 'Reddit Aspirant Summary',
          rating: 4.0,
          comment: t.reddit_mentions_summary,
          created_at: new Date().toISOString()
        }
      ];

      const { error: revErr } = await supabase
        .from('reviews')
        .insert(reviews);

      if (revErr) {
        console.error(`Error inserting community reviews for ${t.full_name}:`, revErr);
      }
    }
  }

  // 4. Save updated JSON file
  if (jsonAppendedCount > 0) {
    fs.writeFileSync(jsonPath, JSON.stringify(currentJsonData, null, 2) + '\n', 'utf8');
    console.log(`Saved JSON expansion: Appended ${jsonAppendedCount} new records to teachersData.json.`);
  } else {
    console.log('No new records needed to be appended to teachersData.json.');
  }

  console.log(`Supabase Database Sync complete. Seeded ${dbInsertedCount} new teachers, placeholder videos, and reviews successfully.`);

  // 5. Ingest and Sync Teacher Discography
  console.log('Ingesting teacher discography from teachersDiscography.json...');
  const discographyPath = path.resolve(process.cwd(), 'src/config/teachersDiscography.json');
  let discographyData: any[] = [];
  try {
    const content = fs.readFileSync(discographyPath, 'utf8');
    discographyData = JSON.parse(content);
  } catch (err) {
    console.error('Error reading teachersDiscography.json:', err);
  }

  if (discographyData.length > 0) {
    // Fetch all teachers from database to resolve slugs
    const { data: dbTeachers, error: fetchErr } = await supabase
      .from('teachers')
      .select('id, name, subject');

    if (fetchErr) {
      console.error('Error fetching teachers for discography match:', fetchErr);
    } else {
      console.log('Syncing discography relations into Supabase (playlists and videos)...');
      let playlistsSeeded = 0;
      let videosSeeded = 0;

      for (const item of discographyData) {
        // Find matching teacher
        const cleanDiscName = item.teacher_name.toLowerCase().replace(/[^a-z0-9]+/g, '').replace(/gg/g, 'g').replace(/z/g, 's');
        const actualMatch = dbTeachers?.find(d => {
          const cleanDbName = d.name.toLowerCase().replace(/[^a-z0-9]+/g, '').replace(/gg/g, 'g').replace(/z/g, 's');
          return cleanDbName === cleanDiscName || cleanDbName.includes(cleanDiscName) || cleanDiscName.includes(cleanDbName);
        });

        let teacherId = '';
        let teacherName = '';
        let subject = '';

        if (!actualMatch) {
          console.log(`Teacher "${item.teacher_name}" not found in database. Creating a new teacher record...`);
          // Generate unique slug
          const nameClean = item.teacher_name.replace(/\s*\(.*?\)\s*/g, ' ').trim();
          const slug = nameClean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

          teacherId = slug;
          teacherName = item.teacher_name;
          subject = item.subject;

          let targetExams = ['JEE', 'NEET'];
          if (subject.toLowerCase() === 'biology' || subject.toLowerCase().includes('zoology') || subject.toLowerCase().includes('botany')) {
            targetExams = ['NEET'];
          } else if (subject.toLowerCase() === 'mathematics' || subject.toLowerCase() === 'maths') {
            targetExams = ['JEE'];
          }

          const { error: insErr } = await supabase
            .from('teachers')
            .insert({
              id: slug,
              name: item.teacher_name,
              subject: subject,
              avatar: null,
              rating: 4.50,
              accuracy: 90,
              video_count: 0,
              followers_count: 0,
              bio: `${item.teacher_name} is a verified educator teaching ${subject}.`,
              is_verified: true,
              exams: targetExams,
              features: {
                previous_institutes: [],
                teaching_mode: 'Online',
                languages: ['Hindi', 'English'],
                youtubeChannelId: ""
              }
            });

          if (insErr) {
            console.error(`Error inserting new teacher ${item.teacher_name}:`, insErr.message);
            continue;
          }
          dbInsertedCount++;
        } else {
          teacherId = actualMatch.id;
          teacherName = actualMatch.name;
          subject = actualMatch.subject;
        }

        // Check if teacher exists in JSON, if not, append!
        const existsInJson = currentJsonData.some(j => j.id === teacherId || j.slug === teacherId);
        if (!existsInJson) {
          currentJsonData.push({
            id: teacherId,
            slug: teacherId,
            full_name: teacherName,
            profile_photo_url: null,
            institute_name: "Verified Academy",
            subject: subject,
            years_of_experience: "5+",
            source_url: "N/A"
          });
          jsonAppendedCount++;
        }

        const catalog = item.verified_master_catalog;

        // Upsert Playlists
        if (Array.isArray(catalog.playlists)) {
          for (const p of catalog.playlists) {
            const { error: playErr } = await supabase
              .from('playlists')
              .upsert({
                id: p.playlist_id,
                title: p.playlist_title,
                category: subject || item.subject,
                thumbnail: p.thumbnail_url,
                teacher_id: teacherId,
                lectures_count: p.video_count,
                is_active: true,
                updated_at: new Date().toISOString()
              }, { onConflict: 'id' });

            if (playErr) {
              console.error(`Error seeding playlist ${p.playlist_title}:`, playErr.message);
            } else {
              playlistsSeeded++;
            }
          }
        }

        // Upsert Videos (Standalone Lectures)
        if (Array.isArray(catalog.standalone_lectures_and_one_shots)) {
          for (const v of catalog.standalone_lectures_and_one_shots) {
            const viewsNum = typeof v.view_count_approx === 'string' ? 
              Math.round((parseFloat(v.view_count_approx.replace(/[^\d.]/g, '')) || 0) * (v.view_count_approx.toLowerCase().includes('m') ? 1000000 : v.view_count_approx.toLowerCase().includes('k') ? 1000 : 1)) : 
              (v.view_count_approx || 0);

            const { error: vidErr } = await supabase
              .from('videos')
              .upsert({
                id: v.video_id,
                title: v.video_title,
                video_url: `https://youtube.com/watch?v=${v.video_id}`,
                duration: v.duration,
                category: 'lecture',
                views: viewsNum,
                thumbnail_url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400',
                subject: subject || item.subject,
                teacher_id: teacherId,
                teacher_name: teacherName,
                is_active: true,
                updated_at: new Date().toISOString()
              }, { onConflict: 'id' });

            if (vidErr) {
              console.error(`Error seeding standalone video ${v.video_title}:`, vidErr.message);
            } else {
              videosSeeded++;
            }
          }
        }
      }
      console.log(`Seeded ${playlistsSeeded} playlists and ${videosSeeded} videos from verified teacher discography catalog.`);
      if (jsonAppendedCount > 0) {
        fs.writeFileSync(jsonPath, JSON.stringify(currentJsonData, null, 2) + '\n', 'utf8');
        console.log(`Saved final JSON expansion: Total verified teachers in teachersData.json is now ${currentJsonData.length}.`);
      }
    }
  }
}

runSeeding().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
