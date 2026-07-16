/**
 * Utility functions to canonicalize and normalize metadata texts
 */

const ROMAN_NUMERALS_MAP: Record<string, string> = {
  'ix': '9', 'viii': '8', 'vii': '7', 'vi': '6', 'iv': '4', 'v': '5', 'iii': '3', 'ii': '2', 'i': '1', 'x': '10'
};

/**
 * Clean whitespace, punctuation, spaces, and strip decorative emojis
 */
export function canonicalizeText(text: string | undefined | null): string {
  if (!text) return '';

  // 1. Strip emojis (matches typical emoji ranges)
  let clean = text.replace(/[\u1F600-\u1F64F\u1F300-\u1F5FF\u1F680-\u1F6FF\u1F1E0-\u1F1FF\u2600-\u26FF\u2700-\u27BF]/gu, '');

  // 2. Collapse double/repeated spaces and trim
  clean = clean.replace(/\s+/g, ' ').trim();

  // 3. Remove punctuation markers that interfere with canonical keys
  clean = clean.replace(/[|⭐🌟🔥💥✨🎈📍📢❗❓[\]()]/g, '').trim();

  return clean;
}

/**
 * Standardizes Roman numerals to standard numbers (e.g., 'Class XII' -> 'Class 12')
 */
export function normalizeNumerals(text: string): string {
  let lower = text.toLowerCase();
  
  // Replace Roman Numerals
  for (const roman of Object.keys(ROMAN_NUMERALS_MAP)) {
    const regex = new RegExp(`\\b${roman}\\b`, 'g');
    lower = lower.replace(regex, ROMAN_NUMERALS_MAP[roman]);
  }

  // Capitalize back to standard words
  return lower
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generates an immutable, URL-friendly canonical slug/key (e.g. 'laws-of-motion')
 */
export function canonicalSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
