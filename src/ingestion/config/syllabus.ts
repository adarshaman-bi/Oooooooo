// Canonical Syllabus, Chapters, and Topics definition for JEE and NEET

export interface CanonicalChapter {
  code: string;
  name: string;
  subject: 'Physics' | 'Chemistry' | 'Mathematics' | 'Biology';
  classTag: '11' | '12' | 'Dropper';
  examType: 'JEE' | 'NEET' | 'Both';
  sortOrder: number;
}

export interface CanonicalTopic {
  code: string;
  chapterCode: string;
  name: string;
  sortOrder: number;
}

export const CANONICAL_CHAPTERS: Record<string, CanonicalChapter> = {
  // PHYSICS Class 11
  'CHAPTER_MOTION_STRAIGHT_LINE': {
    code: 'CHAPTER_MOTION_STRAIGHT_LINE',
    name: 'Motion in a Straight Line',
    subject: 'Physics',
    classTag: '11',
    examType: 'Both',
    sortOrder: 1,
  },
  'CHAPTER_LAWS_OF_MOTION': {
    code: 'CHAPTER_LAWS_OF_MOTION',
    name: 'Laws of Motion',
    subject: 'Physics',
    classTag: '11',
    examType: 'Both',
    sortOrder: 2,
  },
  'CHAPTER_WORK_ENERGY_POWER': {
    code: 'CHAPTER_WORK_ENERGY_POWER',
    name: 'Work, Energy and Power',
    subject: 'Physics',
    classTag: '11',
    examType: 'Both',
    sortOrder: 3,
  },
  'CHAPTER_THERMODYNAMICS_PHYSICS': {
    code: 'CHAPTER_THERMODYNAMICS_PHYSICS',
    name: 'Thermodynamics (Physics)',
    subject: 'Physics',
    classTag: '11',
    examType: 'Both',
    sortOrder: 4,
  },

  // CHEMISTRY Class 11
  'CHAPTER_SOME_BASIC_CONCEPTS_CHEM': {
    code: 'CHAPTER_SOME_BASIC_CONCEPTS_CHEM',
    name: 'Some Basic Concepts of Chemistry',
    subject: 'Chemistry',
    classTag: '11',
    examType: 'Both',
    sortOrder: 101,
  },
  'CHAPTER_STRUCTURE_OF_ATOM': {
    code: 'CHAPTER_STRUCTURE_OF_ATOM',
    name: 'Structure of Atom',
    subject: 'Chemistry',
    classTag: '11',
    examType: 'Both',
    sortOrder: 102,
  },

  // MATHEMATICS Class 11
  'CHAPTER_TRIGONOMETRIC_FUNCTIONS': {
    code: 'CHAPTER_TRIGONOMETRIC_FUNCTIONS',
    name: 'Trigonometric Functions',
    subject: 'Mathematics',
    classTag: '11',
    examType: 'Both',
    sortOrder: 201,
  },
  'CHAPTER_SETS': {
    code: 'CHAPTER_SETS',
    name: 'Sets',
    subject: 'Mathematics',
    classTag: '11',
    examType: 'Both',
    sortOrder: 202,
  },

  // BIOLOGY Class 11
  'CHAPTER_THE_LIVING_WORLD': {
    code: 'CHAPTER_THE_LIVING_WORLD',
    name: 'The Living World',
    subject: 'Biology',
    classTag: '11',
    examType: 'NEET',
    sortOrder: 301,
  },
  'CHAPTER_BIOLOGICAL_CLASSIFICATION': {
    code: 'CHAPTER_BIOLOGICAL_CLASSIFICATION',
    name: 'Biological Classification',
    subject: 'Biology',
    classTag: '11',
    examType: 'NEET',
    sortOrder: 302,
  }
};

export const CANONICAL_TOPICS: Record<string, CanonicalTopic> = {
  'TOPIC_RELATIVE_MOTION': {
    code: 'TOPIC_RELATIVE_MOTION',
    chapterCode: 'CHAPTER_MOTION_STRAIGHT_LINE',
    name: 'Relative Motion',
    sortOrder: 1,
  },
  'TOPIC_NEWTONS_LAWS': {
    code: 'TOPIC_NEWTONS_LAWS',
    chapterCode: 'CHAPTER_LAWS_OF_MOTION',
    name: 'Newtons Laws of Motion',
    sortOrder: 1,
  },
  'TOPIC_FRICTION': {
    code: 'TOPIC_FRICTION',
    chapterCode: 'CHAPTER_LAWS_OF_MOTION',
    name: 'Friction',
    sortOrder: 2,
  }
};
