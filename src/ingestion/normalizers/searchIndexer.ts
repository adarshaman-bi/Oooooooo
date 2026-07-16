import { canonicalizeText } from './textNormalizer';

/**
 * Precomputes search index tokens for a given title.
 * Splits keywords, filters out short connectors, and generates abbreviations/initials.
 */
export function generateSearchTokens(title: string | undefined | null): string[] {
  if (!title) return [];
  const cleanTitle = canonicalizeText(title).toLowerCase();
  
  // Split words by space and punctuation
  const words = cleanTitle.split(/[\s\-_,.:;]+/);
  
  const tokenSet = new Set<string>();
  const abbreviationWords: string[] = [];

  for (const word of words) {
    const trimmed = word.trim();
    if (trimmed.length === 0) continue;
    
    // Add individual words
    tokenSet.add(trimmed);
    
    // Add letters for abbreviation if word is significant
    if (trimmed.length > 2) {
      abbreviationWords.push(trimmed[0]);
    }
  }

  // Generate abbreviation token (e.g. "Laws of Motion" -> "lom")
  if (abbreviationWords.length >= 2) {
    tokenSet.add(abbreviationWords.join(''));
  }

  // Pre-seed common physics abbreviation overrides
  if (cleanTitle.includes('laws of motion')) tokenSet.add('nlm');
  if (cleanTitle.includes('work energy')) tokenSet.add('wep');
  if (cleanTitle.includes('centre of mass')) tokenSet.add('com');
  if (cleanTitle.includes('motion in straight line')) tokenSet.add('mstl');
  if (cleanTitle.includes('kinetic theory')) tokenSet.add('ktg');

  return Array.from(tokenSet);
}
