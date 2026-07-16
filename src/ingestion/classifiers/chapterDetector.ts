import { CHAPTER_ALIASES } from '../config/taxonomy';
import { CANONICAL_CHAPTERS } from '../config/syllabus';

/**
 * Maps a title and description to one or more canonical chapter codes.
 * Supports multi-chapter matching (returning string array of codes).
 */
export function detectChapters(
  title: string,
  description = ''
): {
  chapterCodes: string[];
  matchedAliases: string[];
} {
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description.toLowerCase();
  const matchedCodes = new Set<string>();
  const matchedAliases: string[] = [];

  for (const chapterCode of Object.keys(CHAPTER_ALIASES)) {
    const aliases = CHAPTER_ALIASES[chapterCode];
    for (const alias of aliases) {
      // Use boundary match to prevent substrings like 'nlm' in 'unlimited'
      const regex = new RegExp(`\\b${alias.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lowerTitle) || regex.test(lowerDesc)) {
        matchedCodes.add(chapterCode);
        matchedAliases.push(alias);
      }
    }
  }

  // If it's a marathon, full syllabus, or general overview, do NOT force chapter matching
  if (lowerTitle.includes('full syllabus') || lowerTitle.includes('marathon') || lowerTitle.includes('mega revision')) {
    return { chapterCodes: [], matchedAliases: ['full_syllabus_revision'] };
  }

  return {
    chapterCodes: Array.from(matchedCodes),
    matchedAliases
  };
}
