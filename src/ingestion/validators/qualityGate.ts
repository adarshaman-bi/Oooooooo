import { isAcademicContent } from '../../utils/youtubeUtils';

export interface DecisionEvidence {
  ruleId: string;
  sourceField: string;
  matchedValue: string;
  confidenceContribution: number;
}

export interface QualityValidationResult {
  isApproved: boolean;
  rejectReason?: string;
  confidenceScore: number;
  evidenceList: DecisionEvidence[];
}

/**
 * Validates crawled videos and playlists against strict academic quality rules.
 * Assigns an evidence-backed confidence score.
 */
export function validateAcademicQuality(
  title: string,
  description = '',
  durationSeconds?: number
): QualityValidationResult {
  const evidenceList: DecisionEvidence[] = [];
  
  // 1. Strict duration gate (lectures must be >= 20 minutes)
  if (durationSeconds !== undefined && durationSeconds < 1200) {
    return {
      isApproved: false,
      rejectReason: `Video is too short (${durationSeconds}s). Minimum academic lecture limit is 20m (1200s).`,
      confidenceScore: 0,
      evidenceList
    };
  }

  // 2. Academic filter check (anti-hype, non-entertainment)
  if (!isAcademicContent(title, description)) {
    return {
      isApproved: false,
      rejectReason: 'Video matches clickbait, strategy, motivational, or non-academic pattern rules.',
      confidenceScore: 0,
      evidenceList
    };
  }

  let totalConfidence = 0;

  // Rule 1: Subject markers in title
  const subjectWords = ['physics', 'chemistry', 'mathematics', 'math', 'biology', 'botany', 'zoology'];
  const lowerTitle = title.toLowerCase();
  const matchedSubject = subjectWords.find(word => lowerTitle.includes(word));
  if (matchedSubject) {
    evidenceList.push({
      ruleId: 'RULE_SUBJECT_KEYWORDS_01',
      sourceField: 'title',
      matchedValue: matchedSubject,
      confidenceContribution: 40
    });
    totalConfidence += 40;
  }

  // Rule 2: Chapter or Lecture syllabus tags in title
  if (lowerTitle.includes('lecture') || lowerTitle.includes('class') || lowerTitle.includes('chapter')) {
    evidenceList.push({
      ruleId: 'RULE_ACADEMIC_TAGS_02',
      sourceField: 'title',
      matchedValue: 'syllabus indicators',
      confidenceContribution: 30
    });
    totalConfidence += 30;
  }

  // Rule 3: Exam preparation hints (JEE, NEET)
  if (lowerTitle.includes('jee') || lowerTitle.includes('neet') || lowerTitle.includes('boards')) {
    evidenceList.push({
      ruleId: 'RULE_EXAM_PREP_03',
      sourceField: 'title',
      matchedValue: 'exam indicator',
      confidenceContribution: 20
    });
    totalConfidence += 20;
  }

  // Rule 4: Structured video descriptions
  if (description && description.length > 50) {
    evidenceList.push({
      ruleId: 'RULE_DESCRIPTION_DEPTH_04',
      sourceField: 'description',
      matchedValue: 'length check',
      confidenceContribution: 10
    });
    totalConfidence += 10;
  }

  const finalConfidence = Math.min(totalConfidence, 100);

  const isApproved = finalConfidence >= 50;

  return {
    isApproved,
    rejectReason: isApproved ? undefined : `Low confidence score (${finalConfidence}/100) based on insufficient syllabus keywords.`,
    confidenceScore: finalConfidence,
    evidenceList
  };
}
