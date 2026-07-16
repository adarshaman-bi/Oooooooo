import { TEACHER_TAXONOMY, TeacherTaxonomy } from '../config/taxonomy';

/**
 * Resolves a teacher from raw video/playlist metadata using alias matching.
 */
export function detectTeacher(
  title: string,
  description = '',
  channelTitle = ''
): {
  teacherId: string | null;
  teacherName: string | null;
  confidenceScore: number;
  matchedAlias: string | null;
} {
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description.toLowerCase();
  const lowerChan = channelTitle.toLowerCase();

  let bestMatch: TeacherTaxonomy | null = null;
  let matchedAlias: string | null = null;
  let bestScore = 0;

  for (const teacher of TEACHER_TAXONOMY) {
    for (const alias of teacher.aliases) {
      const regex = new RegExp(`\\b${alias.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      
      let matchScore = 0;
      if (regex.test(lowerTitle)) {
        matchScore += 80; // High confidence match in video title
      }
      if (regex.test(lowerDesc)) {
        matchScore += 30; // Medium confidence in description
      }
      if (regex.test(lowerChan)) {
        matchScore += 20; // Support evidence in channel name
      }

      if (matchScore > bestScore) {
        bestScore = matchScore;
        bestMatch = teacher;
        matchedAlias = alias;
      }
    }
  }

  if (!bestMatch || bestScore < 30) {
    return {
      teacherId: null,
      teacherName: null,
      confidenceScore: 0,
      matchedAlias: null
    };
  }

  // Cap confidence score between 0 and 100
  const finalConfidence = Math.min(bestScore, 100);

  return {
    teacherId: bestMatch.id,
    teacherName: bestMatch.name,
    confidenceScore: finalConfidence,
    matchedAlias
  };
}
