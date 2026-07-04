import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { type User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';
import { fetchUserProfile, createUserProfile, updateUserExamPreference, updateUserPreferences } from '../services/dbService';
import { UserProfile, UserRole } from '../types';
import { LS_KEYS, DATA_DEFAULTS } from '../config/constants';

// ─── Guest localStorage helpers ──────────────────────────────────────────────
/** Safely read and parse a JSON value from localStorage. Returns `fallback` on any error. */
function safeLS<T>(key: string, parse: true, fallback: T): T;
function safeLS(key: string, parse?: false, fallback?: string): string;
function safeLS<T>(key: string, parse?: boolean, fallback?: T | string): T | string {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback as T | string;
    return parse ? JSON.parse(raw) : raw;
  } catch {
    return fallback as T | string;
  }
}

const getGuestProfile = (): UserProfile => ({
  uid: 'guest',
  email: 'guest@biovised.org',
  displayName: 'Guest Candidate',
  role: 'user',
  examType: safeLS(LS_KEYS.GUEST_EXAM, false, 'NEET'),
  appearingYear: safeLS(LS_KEYS.GUEST_YEAR, false, DATA_DEFAULTS.APPEARING_YEAR),
  preferredSubjects: safeLS(LS_KEYS.GUEST_SUBJECTS, true, []),
  watchedContent: [],
  savedContent: [],
  hiddenContent: [],
  likedContent: [],
  onboardingCompleted: localStorage.getItem(LS_KEYS.GUEST_UID) !== null,
  loginType: 'guest',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const isGuestSession = (supabaseUser: User | null, isGuest: boolean, uid?: string) =>
  isGuest || !supabaseUser || uid === 'guest';

// ─── Context ──────────────────────────────────────────────────────────────────
interface AuthContextType {
  user: UserProfile | null;
  /** The raw Supabase auth User object. Null for guests. */
  supabaseUser: User | null;
  /** @deprecated Use supabaseUser. Kept for backwards-compatibility. */
  firebaseUser: User | null;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const handleAuthUser = async (sUser: User | null) => {
    if (sUser) {
      setSupabaseUser(sUser);
      setIsGuest(false);
      localStorage.removeItem('biovised_is_guest');

      let profile = await fetchUserProfile(sUser.id);
      // NOTE: Admin role is determined by the 'role' column in the profiles table.
      // Do not hardcode email addresses here. Set role='admin' directly in Supabase.
      const isAdminByRole = profile?.role === 'admin';

      if (!profile) {
        const now = new Date().toISOString();
        const displayName = sUser.user_metadata?.displayName || sUser.user_metadata?.full_name || 'Pupil';
        await createUserProfile({
          uid: sUser.id,
          email: sUser.email || '',
          displayName,
          role: 'user',
          examType: 'NEET',
          createdAt: now,
          updatedAt: now,
        });
        profile = await fetchUserProfile(sUser.id);
      }

      if (isAdminByRole && profile) {
        profile = { ...profile, role: 'admin' };
      }
      setUser(profile);
    } else {
      setSupabaseUser(null);
      setIsGuest(true);
      localStorage.setItem('biovised_is_guest', 'true');
      setUser(getGuestProfile());
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthUser(session?.user ?? null);
    }).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('Invalid API key')) {
        console.warn('Failed to retrieve initial session from Supabase:', err);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      handleAuthUser(session?.user ?? null);
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  const getURL = () => {
    const origin = typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : import.meta.env.VITE_REDIRECT_URL ?? 'https://ooooooooooo-pi.vercel.app';
    const base = origin.endsWith('/') ? origin : `${origin}/`;
    return `${base}auth/callback`;
  };

  const signInGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: getURL() },
      });
      if (error) throw error;
    } catch (err) {
      console.error('Google Auth helper failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInEmail = async (email: string, pw: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
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
        options: { data: { displayName: name, role, examType: exam } },
      });
      if (error) throw error;

      const userId = data.user?.id;
      if (userId) {
        await createUserProfile({
          uid: userId,
          email,
          displayName: name,
          role,
          examType: exam,
          appearingYear: DATA_DEFAULTS.APPEARING_YEAR,
          preferredSubjects: [],
          watchedContent: [],
          savedContent: [],
          hiddenContent: [],
          likedContent: [],
          onboardingCompleted: false,
          loginType: 'email',
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
    try { sessionStorage.removeItem(LS_KEYS.GUEST_BYPASSED); } catch {}
    // Clear all guest preference keys
    const guestPrefKeys = [
      LS_KEYS.GUEST_EXAM, LS_KEYS.GUEST_YEAR, LS_KEYS.GUEST_SUBJECTS,
      'biovised_pref_watchedContent', 'biovised_pref_savedContent',
      'biovised_pref_hiddenContent', 'biovised_pref_likedContent',
      'biovised_pref_onboardingCompleted',
    ];
    guestPrefKeys.forEach(k => { try { localStorage.removeItem(k); } catch {} });
    localStorage.setItem('biovised_is_guest', 'true');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase signOut exception bypassed:', err);
    }
    setSupabaseUser(null);
    setUser(getGuestProfile());
    setLoading(false);
  };

  const setExamPreference = async (exam: 'JEE' | 'NEET' | 'Both' | string) => {
    if (user) {
      await updateUserExamPreference(user.uid, exam);
      setUser(prev => prev ? { ...prev, examType: exam } : null);
    }
  };

  const enableGuestMode = () => {
    setIsGuest(true);
    localStorage.setItem('biovised_is_guest', 'true');
    setUser(getGuestProfile());
    setSupabaseUser(null);
  };

  const updatePreferences = async (newPrefs: Partial<UserProfile>) => {
    if (isGuestSession(supabaseUser, isGuest, user?.uid)) {
      // Persist guest prefs to localStorage
      const prefMap: Record<string, unknown> = {
        'biovised_pref_examType': newPrefs.examType,
        'biovised_pref_appearingYear': newPrefs.appearingYear,
        'biovised_pref_preferredSubjects': newPrefs.preferredSubjects !== undefined ? JSON.stringify(newPrefs.preferredSubjects) : undefined,
        'biovised_pref_watchedContent': newPrefs.watchedContent !== undefined ? JSON.stringify(newPrefs.watchedContent) : undefined,
        'biovised_pref_savedContent': newPrefs.savedContent !== undefined ? JSON.stringify(newPrefs.savedContent) : undefined,
        'biovised_pref_hiddenContent': newPrefs.hiddenContent !== undefined ? JSON.stringify(newPrefs.hiddenContent) : undefined,
        'biovised_pref_likedContent': newPrefs.likedContent !== undefined ? JSON.stringify(newPrefs.likedContent) : undefined,
        'biovised_pref_onboardingCompleted': newPrefs.onboardingCompleted !== undefined ? String(newPrefs.onboardingCompleted) : undefined,
      };
      Object.entries(prefMap).forEach(([k, v]) => {
        if (v !== undefined) try { localStorage.setItem(k, v as string); } catch {}
      });
      setUser(getGuestProfile());
    } else if (supabaseUser) {
      const sanitizedPrefs = { ...newPrefs };
      delete sanitizedPrefs.uid;
      delete sanitizedPrefs.email;
      delete sanitizedPrefs.role;
      delete sanitizedPrefs.createdAt;
      await updateUserPreferences(supabaseUser.id, sanitizedPrefs);
      setUser(prev => prev ? { ...prev, ...sanitizedPrefs, updatedAt: new Date().toISOString() } : null);
    }
  };

  const resetPreferences = async () => {
    const emptyPrefs: Partial<UserProfile> = {
      examType: 'NEET',
      appearingYear: DATA_DEFAULTS.APPEARING_YEAR,
      preferredSubjects: [],
      watchedContent: [],
      savedContent: [],
      hiddenContent: [],
      likedContent: [],
      onboardingCompleted: false,
    };
    if (isGuestSession(supabaseUser, isGuest, user?.uid)) {
      const keys = [
        'biovised_pref_examType', 'biovised_pref_appearingYear',
        'biovised_pref_preferredSubjects', 'biovised_pref_watchedContent',
        'biovised_pref_savedContent', 'biovised_pref_hiddenContent',
        'biovised_pref_likedContent', 'biovised_pref_onboardingCompleted',
        'biovised_is_guest',
      ];
      keys.forEach(k => { try { localStorage.removeItem(k); } catch {} });
      setIsGuest(false);
      setUser(null);
    } else if (supabaseUser) {
      await updateUserPreferences(supabaseUser.id, emptyPrefs);
      setUser(prev => prev ? { ...prev, ...emptyPrefs, updatedAt: new Date().toISOString() } : null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      supabaseUser,
      // Backwards-compat alias — prefer supabaseUser in new code
      firebaseUser: supabaseUser,
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
      resetPreferences,
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
