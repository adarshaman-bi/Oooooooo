export interface VideoLink {
  sourceVideoId: string;
  targetVideoId: string;
  relationshipType: 'prerequisite_of' | 'revision_of' | 'practice_after' | 'same_topic' | 'duplicate_of' | 'continued_in' | 'recommended_after';
  justification: string;
}

/**
 * Detects relationships between lectures based on titles, descriptions, and duration similarity.
 */
export function detectVideoRelationships(
  videoA: { id: string; title: string; durationSeconds: number; description?: string },
  videoB: { id: string; title: string; durationSeconds: number; description?: string }
): VideoLink | null {
  if (videoA.id === videoB.id) return null;

  const titleA = videoA.title.toLowerCase();
  const titleB = videoB.title.toLowerCase();
  
  // 1. Exact Duplicate / Reupload Check
  const durationDiff = Math.abs(videoA.durationSeconds - videoB.durationSeconds);
  const isSimilarDuration = durationDiff < 5; // within 5 seconds difference
  
  // Calculate title similarity (word overlap)
  const wordsA = new Set(titleA.split(/\s+/));
  const wordsB = new Set(titleB.split(/\s+/));
  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const similarity = intersection.size / Math.max(wordsA.size, wordsB.size);

  if (isSimilarDuration && similarity > 0.85) {
    return {
      sourceVideoId: videoA.id,
      targetVideoId: videoB.id,
      relationshipType: 'duplicate_of',
      justification: `Exact duplicate detected: similarity ${Math.round(similarity * 100)}%, duration diff ${durationDiff}s`
    };
  }

  // 2. Prerequisite Check (e.g. Part 1 vs Part 2)
  if (titleA.includes('part 1') && titleB.includes('part 2')) {
    return {
      sourceVideoId: videoA.id,
      targetVideoId: videoB.id,
      relationshipType: 'prerequisite_of',
      justification: 'Part 1 is a prerequisite for Part 2'
    };
  }

  // 3. Continuation Check
  if (titleA.includes('lecture 01') && titleB.includes('lecture 02')) {
    return {
      sourceVideoId: videoA.id,
      targetVideoId: videoB.id,
      relationshipType: 'continued_in',
      justification: 'Lecture 1 continues into Lecture 2'
    };
  }

  return null;
}
