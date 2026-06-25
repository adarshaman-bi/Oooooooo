import { Lecture, Playlist, TeacherProfile, UserProfile } from '../types';

export interface PersonalizedLecture extends Lecture {
  recommendationReason?: string;
  personalizationScore?: number;
}

export interface PersonalizedPlaylist extends Playlist {
  recommendationReason?: string;
  personalizationScore?: number;
}

/**
 * Determine if a specific subject is relevant for the selected exam goal
 */
export function isSubjectRelevantForExam(subject: string, examType: string): boolean {
  if (!subject) return true;
  const sLower = subject.toLowerCase();
  const eLower = examType.toLowerCase();
  
  if (eLower === 'jee') {
    // Biology is strictly irrelevant for JEE unless overridden
    if (sLower.includes('bio') || sLower === 'biology') {
      return false;
    }
  }
  if (eLower === 'neet') {
    // Mathematics is strictly irrelevant for NEET unless overridden
    if (sLower.includes('math') || sLower === 'mathematics' || sLower === 'maths') {
      return false;
    }
  }
  return true;
}

/**
 * Personalize and filter a list of lectures/videos
 */
export function personalizeLectures(
  lectures: Lecture[],
  user: UserProfile | null,
  activeExamFilter: string,
  activeSubjectFilter: string,
  searchQuery: string = ''
): PersonalizedLecture[] {
  if (!lectures) return [];

  // 1. Get current preference values
  const userExam = user?.examType || 'NEET';
  const userYear = user?.appearingYear || '2026';
  const userSubjects = user?.preferredSubjects || [];
  const hiddenIds = user?.hiddenContent || [];
  const watchedIds = user?.watchedContent || [];
  const savedIds = user?.savedContent || [];
  const likedIds = user?.likedContent || [];

  // Determine active exam context: preferred user selection or explicit toggle
  const currentExam = activeExamFilter && activeExamFilter !== 'All' ? activeExamFilter : userExam;
  const sQuery = searchQuery.trim().toLowerCase();

  return lectures
    .filter(l => {
      const id = l.id;
      
      // Strict Hide Rule: if item listed in hiddenContent, hide completely
      if (hiddenIds.includes(id)) {
        return false;
      }

      // Hide if doesn't match active search query
      if (sQuery) {
        const matchesTitleOrTeacher = 
          l.title.toLowerCase().includes(sQuery) || 
          l.teacherName.toLowerCase().includes(sQuery) ||
          (l.subject && l.subject.toLowerCase().includes(sQuery));
        if (!matchesTitleOrTeacher) return false;
      }

      // Hide if there's an active manual subject filter that doesn't match
      if (activeSubjectFilter !== 'All' && l.subject !== activeSubjectFilter) {
        return false;
      }

      // Core filter: Filter irrelevant exam focus. 
      // i.e., JEE student should not see Biology, NEET student should not see Mathematics
      if (currentExam !== 'Both' && currentExam !== 'All') {
        if (!isSubjectRelevantForExam(l.subject, currentExam)) {
          return false;
        }

        // If lecture is explicitly for NEET and active exam is JEE, hide it (and vice versa)
        if (l.examType && l.examType !== 'Both' && l.examType !== 'All') {
          if (l.examType !== currentExam) {
            return false;
          }
        }
      }

      return true;
    })
    .map(l => {
      let score = 0;
      let reasons: string[] = [];

      // A. Stream Match
      const matchesMainStream = l.examType === userExam || l.examType === 'Both';
      if (matchesMainStream) {
        score += 150;
      }

      // B. Subject Match
      const isPreferredSubject = userSubjects.some(
        sub => sub.toLowerCase() === l.subject.toLowerCase()
      );
      if (isPreferredSubject) {
        score += 120;
        reasons.push(`matches your preferred subject: ${l.subject}`);
      }

      // C. Target Year Match
      const tLower = l.title.toLowerCase();
      const descLower = (l.description || '').toLowerCase();
      const yearString = String(userYear);
      
      const containsYear = tLower.includes(yearString) || descLower.includes(yearString);
      if (containsYear) {
        score += 200;
        reasons.push(`perfectly tailored for exam year ${userYear}`);
      } else {
        // Class mapping heuristic:
        // A user appearing in 2026 wants exam level fast-track elements (mock, PYQ, full length, rapid)
        // A user appearing in 2027/2028 wants foundation or basic concepts
        if (userYear === '2026') {
          const isRevision = tLower.includes('one shot') || tLower.includes('oneshot') || tLower.includes('pyq') || tLower.includes('mock') || tLower.includes('revision');
          if (isRevision) {
            score += 100;
            reasons.push(`highly recommended revision for ${userYear}`);
          }
        } else {
          const isFoundation = tLower.includes('concept') || tLower.includes('foundation') || tLower.includes('basic') || tLower.includes('detailed');
          if (isFoundation) {
            score += 80;
            reasons.push(`ideal foundation topic for ${userYear}`);
          }
        }
      }

      // D. User Behavior Updates (Feedback Loop)
      // Saved content indicates extreme interest
      if (savedIds.includes(l.id)) {
        score += 80;
        reasons.push(`saved in your list`);
      }

      // Liked content
      if (likedIds.includes(l.id)) {
        score += 90;
        reasons.push(`voted/liked by you`);
      }

      // Similar watched pattern: user watched this teacher or subject before
      const hasWatchedSameTeacher = watchedIds.some(wId => {
        // Simulating teacher/subject alignment
        return l.teacherName.toLowerCase() === 'alakh' || l.teacherName.toLowerCase() === 'hc verma';
      });
      if (hasWatchedSameTeacher) {
        score += 30;
      }

      // Watched before decay: if completely watched, reduce score slightly to boost fresh content,
      // but if partially watched, increase score to resume learning
      if (watchedIds.includes(l.id)) {
        // assume 50% watched / resume
        score += 20;
        reasons.push(`resume where you left off`);
      }

      // Build readable personalization reason label
      let finalReason = '';
      if (reasons.length > 0) {
        // capital head
        const first = reasons[0];
        finalReason = `Shown because it ${first}`;
      } else {
        finalReason = `Shown because you selected ${userExam} ${userYear}`;
      }

      // Fallback
      if (!finalReason) {
        finalReason = `Matches your selected ${userExam} profile`;
      }

      return {
        ...l,
        personalizationScore: score,
        recommendationReason: finalReason
      };
    })
    .sort((a, b) => (b.personalizationScore || 0) - (a.personalizationScore || 0));
}

/**
 * Filter playlists according to exam specialization preferences
 */
export function personalizePlaylists(
  playlists: Playlist[],
  user: UserProfile | null,
  activeExamFilter: string,
  activeSubjectFilter: string,
  searchQuery: string = ''
): PersonalizedPlaylist[] {
  if (!playlists) return [];

  const userExam = user?.examType || 'NEET';
  const userYear = user?.appearingYear || '2026';
  const userSubjects = user?.preferredSubjects || [];
  const hiddenIds = user?.hiddenContent || [];
  const savedIds = user?.savedContent || [];

  const currentExam = activeExamFilter && activeExamFilter !== 'All' ? activeExamFilter : userExam;
  const sQuery = searchQuery.trim().toLowerCase();

  return playlists
    .filter(p => {
      if (hiddenIds.includes(p.id)) return false;

      if (sQuery) {
        const matchesQuery = 
          p.title.toLowerCase().includes(sQuery) || 
          p.teacherName.toLowerCase().includes(sQuery) ||
          p.subject.toLowerCase().includes(sQuery);
        if (!matchesQuery) return false;
      }

      if (activeSubjectFilter !== 'All' && p.subject !== activeSubjectFilter) {
        return false;
      }

      if (currentExam !== 'Both' && currentExam !== 'All') {
        if (!isSubjectRelevantForExam(p.subject, currentExam)) {
          return false;
        }

        if (p.examType && p.examType !== 'Both' && p.examType !== 'All') {
          if (p.examType !== currentExam) return false;
        }
      }

      return true;
    })
    .map(p => {
      let score = 0;
      if (p.examType === userExam) score += 100;
      if (userSubjects.includes(p.subject)) score += 80;
      if (savedIds.includes(p.id)) score += 50;

      const titleLower = p.title.toLowerCase();
      if (titleLower.includes(String(userYear))) {
        score += 150;
      }

      return {
        ...p,
        personalizationScore: score,
        recommendationReason: `Curated Series for your ${userExam} ${userYear} schedule`
      };
    })
    .sort((a, b) => (b.personalizationScore || 0) - (a.personalizationScore || 0));
}

/**
 * Filter teachers to align with stream selection
 */
export function personalizeTeachers(
  teachers: TeacherProfile[],
  user: UserProfile | null,
  activeExamFilter: string,
  activeSubjectFilter: string
): TeacherProfile[] {
  if (!teachers) return [];

  const userExam = user?.examType || 'NEET';
  const userSubjects = user?.preferredSubjects || [];
  const currentExam = activeExamFilter && activeExamFilter !== 'All' ? activeExamFilter : userExam;

  return teachers.filter(t => {
    // Subject align
    if (activeSubjectFilter !== 'All') {
      const matchPrimary = t.subject === activeSubjectFilter;
      const matchSubjects = t.subjects?.includes(activeSubjectFilter);
      if (!matchPrimary && !matchSubjects) return false;
    }

    if (currentExam !== 'Both' && currentExam !== 'All') {
      const isBio = t.subject.toLowerCase().includes('bio') || t.subject.toLowerCase() === 'biology';
      const isMath = t.subject.toLowerCase().includes('math') || t.subject.toLowerCase() === 'mathematics';
      
      if (currentExam === 'JEE' && isBio) {
        return false;
      }
      if (currentExam === 'NEET' && isMath) {
        return false;
      }

      // Also filter by teacher's certified exams if specified:
      if (t.exams && t.exams.length > 0) {
        const matchesExam = t.exams.includes(currentExam) || t.exams.includes('Both') || t.exams.includes('All');
        if (!matchesExam) return false;
      }
    }

    return true;
  });
}
