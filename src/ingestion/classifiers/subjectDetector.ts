export type Subject = 'Physics' | 'Chemistry' | 'Mathematics' | 'Biology' | 'Mixed' | 'Unknown';

const SUBJECT_KEYWORDS: Record<Subject, RegExp[]> = {
  Physics: [/physics/i, /भौतिक/i, /motion/i, /kinematics/i, /gravitation/i, /electrostatics/i, /optics/i, /thermodynamics/i],
  Chemistry: [/chemistry/i, /रसायन/i, /organic/i, /inorganic/i, /chemical/i, /periodic/i, /gaseous/i, /atomic/i],
  Mathematics: [/math/i, /algebra/i, /calculus/i, /geometry/i, /trigonometry/i, /matrices/i, /probability/i, /limits/i],
  Biology: [/biology/i, /zoology/i, /botany/i, /living/i, /cell/i, /human/i, /plant/i, /anatomy/i, /genetics/i],
  Mixed: [/pcm/i, /pcb/i, /jee prep/i, /neet prep/i],
  Unknown: []
};

/**
 * Detects the subject from title and description text using conservative regular expression keywords
 */
export function detectSubject(title: string, description = ''): {
  subject: Subject;
  matchedKeywords: string[];
} {
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description.toLowerCase();
  const matchedKeywords: string[] = [];

  for (const subject of Object.keys(SUBJECT_KEYWORDS) as Subject[]) {
    if (subject === 'Unknown') continue;
    
    for (const pattern of SUBJECT_KEYWORDS[subject]) {
      if (pattern.test(lowerTitle) || pattern.test(lowerDesc)) {
        matchedKeywords.push(pattern.source);
      }
    }
  }

  // Determine subject based on matched keyword distribution
  if (matchedKeywords.length === 0) {
    return { subject: 'Unknown', matchedKeywords };
  }

  // Count matches per subject
  const matchCounts: Record<Subject, number> = {
    Physics: 0, Chemistry: 0, Mathematics: 0, Biology: 0, Mixed: 0, Unknown: 0
  };

  for (const match of matchedKeywords) {
    for (const subject of Object.keys(SUBJECT_KEYWORDS) as Subject[]) {
      if (SUBJECT_KEYWORDS[subject].some(p => p.source === match)) {
        matchCounts[subject]++;
      }
    }
  }

  // Find max match
  let detectedSubject: Subject = 'Unknown';
  let maxCount = 0;

  for (const subject of Object.keys(matchCounts) as Subject[]) {
    if (matchCounts[subject] > maxCount) {
      maxCount = matchCounts[subject];
      detectedSubject = subject;
    }
  }

  // If there's a strong split match (e.g. PCM / mixed prep), classify as Mixed
  if (matchCounts.Physics > 0 && matchCounts.Chemistry > 0) {
    detectedSubject = 'Mixed';
  }

  return { subject: detectedSubject, matchedKeywords };
}
