// Taxonomy mappings for mapping raw titles & details to structured metadata

export interface TeacherTaxonomy {
  id: string;
  name: string;
  aliases: string[];
  subjects: ('Physics' | 'Chemistry' | 'Mathematics' | 'Biology')[];
  instituteId: string;
}

export const TEACHER_TAXONOMY: TeacherTaxonomy[] = [
  {
    id: 'alakh_pandey',
    name: 'Alakh Pandey',
    aliases: ['alakh sir', 'alakh pandey', 'alakh', 'physics wallah'],
    subjects: ['Physics'],
    instituteId: 'physics_wallah',
  },
  {
    id: 'pankaj_sir',
    name: 'Pankaj Sir',
    aliases: ['pankaj sir', 'pankaj', 'pankaj chemistry'],
    subjects: ['Chemistry'],
    instituteId: 'physics_wallah',
  },
  {
    id: 'ritik_sir',
    name: 'Ritik Sir',
    aliases: ['ritik sir', 'ritik', 'ritik sharma', 'physics by ritik sir'],
    subjects: ['Physics'],
    instituteId: 'physics_wallah',
  },
  {
    id: 'satyam_sir',
    name: 'Satyam Sir',
    aliases: ['satyam sir', 'satyam', 'satyam physics'],
    subjects: ['Physics'],
    instituteId: 'magnet_brains',
  },
  {
    id: 'seep_pahuja',
    name: 'Seep Pahuja',
    aliases: ['seep pahuja', 'seep mam', 'seep'],
    subjects: ['Biology'],
    instituteId: 'unacademy',
  }
];

export const SERIES_KEYWORDS = [
  { canonicalId: 'SERIES_RAFTAAR', name: 'Raftaar Series', patterns: [/raftaar/i] },
  { canonicalId: 'SERIES_UMEED', name: 'Umeed Series', patterns: [/umeed/i] },
  { canonicalId: 'SERIES_PACE', name: 'Pace Series', patterns: [/pace/i] },
  { canonicalId: 'SERIES_MAHA_TANDAV', name: 'Maha Tandav', patterns: [/tanda+v/i] },
  { canonicalId: 'SERIES_MAHA_REVISION', name: 'Maha Revision', patterns: [/maha\s*revision|maha\s*marathon/i] },
  { canonicalId: 'SERIES_ENDGAME', name: 'Endgame', patterns: [/endgame/i] }
];

export const CHAPTER_ALIASES: Record<string, string[]> = {
  'CHAPTER_MOTION_STRAIGHT_LINE': ['motion in a straight line', 'motion in straight line', '1d motion', 'motion 1d', 'rectilinear motion'],
  'CHAPTER_LAWS_OF_MOTION': ['laws of motion', 'newtons laws of motion', 'nlm', 'laws of motion nlm'],
  'CHAPTER_WORK_ENERGY_POWER': ['work energy and power', 'work energy power', 'wep'],
  'CHAPTER_THERMODYNAMICS_PHYSICS': ['thermodynamics', 'physics thermodynamics'],
  'CHAPTER_THE_LIVING_WORLD': ['the living world', 'living world'],
  'CHAPTER_BIOLOGICAL_CLASSIFICATION': ['biological classification', 'biological class']
};

export const TOPIC_ALIASES: Record<string, string[]> = {
  'TOPIC_RELATIVE_MOTION': ['relative motion', 'relative velocity', 'rain man problem', 'river boat problem'],
  'TOPIC_NEWTONS_LAWS': ['newtons laws', 'first law', 'second law', 'third law', 'inertia'],
  'TOPIC_FRICTION': ['friction', 'kinetic friction', 'static friction', 'limiting friction']
};
