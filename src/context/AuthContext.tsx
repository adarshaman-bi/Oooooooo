import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../utils/supabaseClient';
import { fetchUserProfile, createUserProfile, updateUserExamPreference, updateUserPreferences } from '../services/dbService';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: any | null; // Named firebaseUser for strict backwards-compatibility with user state consumers
  loading: boolean;
  signInGoogle: () => Promise<void>;
  signInEmail: (email: string, pw: string) => Promise<void>;
  signUpEmail: (email: string, pw: string, name: string, role: UserRole, exam: 'JEE' | 'NEET' | 'Both' | string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  setExamPreference: (exam: 'JEE' | 'NEET' | 'Both' | string) => Promise<void>;
  isGuest: boolean;
  enableGuestMode: () => void;
  updatePreferences: (prefs: Partial<UserProfile>) => Promise<void>;
  resetPreferences: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local helpers for guest preferences
const getGuestProfile = (): UserProfile => {
  const localExam = localStorage.getItem('biovised_pref_examType') || 'NEET';
  const localYear = localStorage.getItem('biovised_pref_appearingYear') || '2026';
  
  let localSubjects: string[] = [];
  try {
    const rawSub = localStorage.getItem('biovised_pref_preferredSubjects');
    if (rawSub) localSubjects = JSON.parse(rawSub);
  } catch (e) {
    console.warn('Error parsing preferredSubjects', e);
  }

  let localWatched: string[] = [];
  try {
    const rawWatch = localStorage.getItem('biovised_pref_watchedContent');
    if (rawWatch) localWatched = JSON.parse(rawWatch);
  } catch (e) {
    console.warn('Error parsing watchedContent', e);
  }

  let localSaved: string[] = [];
  try {
    const rawSave = localStorage.getItem('biovised_pref_savedContent');
    if (rawSave) localSaved = JSON.parse(rawSave);
  } catch (e) {
    console.warn('Error parsing savedContent', e);
  }

  let localHidden: string[] = [];
  try {
    const rawHide = localStorage.getItem('biovised_pref_hiddenContent');
    if (rawHide) localHidden = JSON.parse(rawHide);
  } catch (e) {
    console.warn('Error parsing hiddenContent', e);
  }

  let localLiked: string[] = [];
  try {
    const rawLike = localStorage.getItem('biovised_pref_likedContent');
    if (rawLike) localLiked = JSON.parse(rawLike);
  } catch (e) {
    console.warn('Error parsing likedContent', e);
  }

  const localCompleted = localStorage.getItem('biovised_pref_onboardingCompleted') === 'true';

  return {
    uid: 'guest',
    email: 'guest@biovised.org',
    displayName: 'Guest Candidate',
    role: 'user',
    examType: localExam,
    appearingYear: localYear,
    preferredSubjects: localSubjects,
    watchedContent: localWatched,
    savedContent: localSaved,
    hiddenContent: localHidden,
    likedContent: localLiked,
    onboardingCompleted: localCompleted,
    loginType: 'guest',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<any | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);



  const handleAuthUser = async (sUser: any) => {
    if (sUser) {
      setFirebaseUser(sUser);
      setIsGuest(false);
      localStorage.removeItem('biovised_is_guest'); // block guest persistence once real credentials take over
      
      // Load custom profile
      let profile = await fetchUserProfile(sUser.id);
      const isAdminEmail = sUser.email === 'adarshaman898@gmail.com';
      if (!profile) {
        // If no profile, bootstrap user role profile
        const now = new Date().toISOString();
        const displayName = sUser.user_metadata?.displayName || sUser.user_metadata?.full_name || 'Pupil';
        await createUserProfile({
          uid: sUser.id,
          email: sUser.email || '',
          displayName: displayName,
          role: isAdminEmail ? 'admin' : 'user',
          examType: 'NEET',
          createdAt: now,
          updatedAt: now,
        });
        profile = await fetchUserProfile(sUser.id);
      } else if (isAdminEmail && profile.role !== 'admin') {
        profile.role = 'admin';
      }
      setUser(profile);
    } else {
      setFirebaseUser(null);
      // Force guest mode as default if not logged into Google/Firebase, bypassing any gate selection screen
      setIsGuest(true);
      localStorage.setItem('biovised_is_guest', 'true');
      setUser(getGuestProfile());
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    
    // Retrieve the current active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthUser(session?.user || null);
    }).catch((err) => {
      if (!err?.message?.includes('Invalid API key')) {
        console.warn('Failed to retrieve initial session from Supabase:', err);
      }
      setLoading(false);
    });

    // Listen to real-time session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      handleAuthUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('Google Auth helper failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInEmail = async (email: string, pw: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pw
      });
      if (error) throw error;
    } catch (err) {
      console.error('Email sign in failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUpEmail = async (
    email: string,
    pw: string,
    name: string,
    role: UserRole,
    exam: 'JEE' | 'NEET' | 'Both' | string
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pw,
        options: {
          data: {
            displayName: name,
            role: role,
            examType: exam
          }
        }
      });
      if (error) throw error;

      const userId = data.user?.id;
      if (userId) {
        // Wait to create user profile in DB
        await createUserProfile({
          uid: userId,
          email: email,
          displayName: name,
          role: role,
          examType: exam,
          appearingYear: '2026',
          preferredSubjects: [],
          watchedContent: [],
          savedContent: [],
          hiddenContent: [],
          likedContent: [],
          onboardingCompleted: false,
          loginType: 'email'
        });
      }
    } catch (err) {
      console.error('Email registration failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });
    if (error) throw error;
  };

  const logout = async () => {
    setLoading(true);
    setIsGuest(true);
    try {
      sessionStorage.removeItem('biovised_guest_bypassed');
    } catch {}
    localStorage.removeItem('biovised_pref_onboardingCompleted');
    localStorage.removeItem('biovised_pref_examType');
    localStorage.removeItem('biovised_pref_appearingYear');
    localStorage.removeItem('biovised_pref_preferredSubjects');
    localStorage.removeItem('biovised_pref_watchedContent');
    localStorage.removeItem('biovised_pref_savedContent');
    localStorage.removeItem('biovised_pref_hiddenContent');
    localStorage.removeItem('biovised_pref_likedContent');
    localStorage.setItem('biovised_is_guest', 'true');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase signOut exception bypassed:', err);
    }
    setFirebaseUser(null);
    setUser(getGuestProfile());
    setLoading(false);
  };

  const setExamPreference = async (exam: 'JEE' | 'NEET' | 'Both' | string) => {
    if (user) {
      const userId = user.uid;
      await updateUserExamPreference(userId, exam);
      setUser(prev => prev ? { ...prev, examType: exam } : null);
    }
  };

  const enableGuestMode = () => {
    setIsGuest(true);
    localStorage.setItem('biovised_is_guest', 'true');
    setUser(getGuestProfile());
    setFirebaseUser(null);
  };

  const updatePreferences = async (newPrefs: Partial<UserProfile>) => {
    const isUserGuest = isGuest || !firebaseUser || user?.uid === 'guest';
    if (isUserGuest) {
      if (newPrefs.examType !== undefined) localStorage.setItem('biovised_pref_examType', newPrefs.examType);
      if (newPrefs.appearingYear !== undefined) localStorage.setItem('biovised_pref_appearingYear', newPrefs.appearingYear);
      if (newPrefs.preferredSubjects !== undefined) localStorage.setItem('biovised_pref_preferredSubjects', JSON.stringify(newPrefs.preferredSubjects));
      if (newPrefs.watchedContent !== undefined) localStorage.setItem('biovised_pref_watchedContent', JSON.stringify(newPrefs.watchedContent));
      if (newPrefs.savedContent !== undefined) localStorage.setItem('biovised_pref_savedContent', JSON.stringify(newPrefs.savedContent));
      if (newPrefs.hiddenContent !== undefined) localStorage.setItem('biovised_pref_hiddenContent', JSON.stringify(newPrefs.hiddenContent));
      if (newPrefs.likedContent !== undefined) localStorage.setItem('biovised_pref_likedContent', JSON.stringify(newPrefs.likedContent));
      if (newPrefs.onboardingCompleted !== undefined) localStorage.setItem('biovised_pref_onboardingCompleted', String(newPrefs.onboardingCompleted));
      
      setUser(getGuestProfile());
    } else if (firebaseUser) {
      const userId = firebaseUser.id || firebaseUser.uid;
      const sanitizedPrefs = { ...newPrefs };
      delete sanitizedPrefs.uid;
      delete sanitizedPrefs.email;
      delete sanitizedPrefs.role;
      delete sanitizedPrefs.createdAt;
      
      await updateUserPreferences(userId, sanitizedPrefs);
      setUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          ...sanitizedPrefs,
          updatedAt: new Date().toISOString()
        };
      });
    }
  };

  const resetPreferences = async () => {
    const emptyPrefs: Partial<UserProfile> = {
      examType: 'NEET',
      appearingYear: '2026',
      preferredSubjects: [],
      watchedContent: [],
      savedContent: [],
      hiddenContent: [],
      likedContent: [],
      onboardingCompleted: false
    };

    const isUserGuest = isGuest || !firebaseUser || user?.uid === 'guest';
    if (isUserGuest) {
      localStorage.removeItem('biovised_pref_examType');
      localStorage.removeItem('biovised_pref_appearingYear');
      localStorage.removeItem('biovised_pref_preferredSubjects');
      localStorage.removeItem('biovised_pref_watchedContent');
      localStorage.removeItem('biovised_pref_savedContent');
      localStorage.removeItem('biovised_pref_hiddenContent');
      localStorage.removeItem('biovised_pref_likedContent');
      localStorage.removeItem('biovised_pref_onboardingCompleted');
      localStorage.removeItem('biovised_is_guest');
      setIsGuest(false);
      setUser(null);
    } else if (firebaseUser) {
      const userId = firebaseUser.id || firebaseUser.uid;
      await updateUserPreferences(userId, emptyPrefs);
      setUser(prev => prev ? { ...prev, ...emptyPrefs, updatedAt: new Date().toISOString() } : null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      loading,
      signInGoogle,
      signInEmail,
      signUpEmail,
      sendPasswordReset,
      logout,
      setExamPreference,
      isGuest,
      enableGuestMode,
      updatePreferences,
      resetPreferences
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be nested within AuthProvider');
  }
  return context;
}
