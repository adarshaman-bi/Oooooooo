export type ContentType = 'playlist' | 'lecture' | 'live' | 'short';

export type AcademicType =
  | 'full_course'
  | 'oneshot'
  | 'marathon'
  | 'revision'
  | 'pyq'
  | 'practice'
  | 'dpp'
  | 'crash_course'
  | 'bridge_course'
  | 'unknown';

/**
 * Heuristic classifier to separate Video/Playlist Content Type from its Academic Dimension
 */
export function classifyDimensions(title: string, description = ''): {
  contentType: ContentType;
  academicType: AcademicType;
} {
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description.toLowerCase();

  // 1. Determine Content Type
  let contentType: ContentType = 'lecture';
  if (lowerTitle.includes('live') || lowerDesc.includes('streamed live')) {
    contentType = 'live';
  } else if (lowerTitle.includes('#short') || lowerTitle.includes('shorts')) {
    contentType = 'short';
  }

  // 2. Determine Academic Type
  let academicType: AcademicType = 'unknown';

  if (lowerTitle.includes('one shot') || lowerTitle.includes('oneshot') || lowerTitle.includes('complete chapter')) {
    academicType = 'oneshot';
  } else if (lowerTitle.includes('marathon') || lowerTitle.includes('complete syllabus')) {
    academicType = 'marathon';
  } else if (lowerTitle.includes('revision') || lowerTitle.includes('maha revision') || lowerTitle.includes('mind map')) {
    academicType = 'revision';
  } else if (lowerTitle.includes('pyq') || lowerTitle.includes('previous year') || lowerTitle.includes('question discussion')) {
    academicType = 'pyq';
  } else if (lowerTitle.includes('practice') || lowerTitle.includes('question practice') || lowerTitle.includes('top mcq')) {
    academicType = 'practice';
  } else if (lowerTitle.includes('dpp') || lowerTitle.includes('daily practice problem')) {
    academicType = 'dpp';
  } else if (lowerTitle.includes('crash course') || lowerTitle.includes('crash') || lowerTitle.includes('sprint')) {
    academicType = 'crash_course';
  } else if (lowerTitle.includes('bridge') || lowerTitle.includes('prerequisite')) {
    academicType = 'bridge_course';
  } else if (lowerTitle.includes('complete batch') || lowerTitle.includes('batch') || lowerTitle.includes('full course') || lowerTitle.includes('lecture')) {
    academicType = 'full_course';
  }

  return { contentType, academicType };
}
