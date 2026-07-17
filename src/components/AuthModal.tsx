import { useState, FormEvent, useEffect, MouseEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, GraduationCap, X, RotateCcw, Check, AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { getAuthRedirectUrl } from '../utils/security';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLandingPage?: boolean;
  onGuestBypass?: () => void;
}

export default function AuthModal({ isOpen, onClose, isLandingPage = false, onGuestBypass }: AuthModalProps) {
  const { signInEmail, signUpEmail, sendPasswordReset, enableGuestMode } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  
  // Prefill remembered email from localStorage
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [examType, setExamType] = useState<string>('Both');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Remembers previous state for smooth transitions
  const [emailTouched, setEmailTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [loginLockedUntil, setLoginLockedUntil] = useState(0);
  const LOCKOUT_THRESHOLD = 3;
  const LOCKOUT_DURATION_MS = 60_000;

  useEffect(() => {
    if (isOpen) {
      const savedEmail = localStorage.getItem('biovised_remember_email');
      if (savedEmail) {
        setEmail(savedEmail);
      } else {
        setEmail('');
      }
      setPassword('');
      setDisplayName('');
      setError('');
      setSuccess('');
      setEmailTouched(false);
      setNameTouched(false);
      setPasswordTouched(false);
      setShowPassword(false);
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  // Real-time password requirement analysis
  const hasEightChars = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const requirementsMetCount = [
    hasEightChars,
    hasUpperCase,
    hasLowerCase,
    hasNumber,
    hasSpecial
  ].filter(Boolean).length;

  const passwordStrengthLabel = () => {
    if (password.length === 0) return 'Enter Password';
    if (requirementsMetCount <= 2) return 'Weak Strength';
    if (requirementsMetCount <= 4) return 'Medium Strength';
    return 'Strong Security';
  };

  const passwordStrengthColor = () => {
    if (password.length === 0) return 'bg-slate-200';
    if (requirementsMetCount <= 2) return 'bg-red-500';
    if (requirementsMetCount <= 4) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const isEmailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const isNameValid = displayName.trim().length >= 3 && displayName.trim().length <= 50;
  const isPasswordValid = requirementsMetCount >= 4; // High standard for educational portals

  const canSubmit = mode === 'signin' 
    ? (isEmailValid && password.length >= 6)
    : mode === 'signup'
    ? (isNameValid && isEmailValid && isPasswordValid)
    : isEmailValid;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    // Check login lockout
    if (mode === 'signin' && Date.now() < loginLockedUntil) {
      const remaining = Math.ceil((loginLockedUntil - Date.now()) / 1000);
      setError(`Too many login attempts. Try again in ${remaining}s.`);
      setSubmitting(false);
      return;
    }

    try {
      if (mode === 'signin') {
        await signInEmail(email, password);
        setLoginAttempts(0);
        // Persist email mock prefill for standard usage
        localStorage.setItem('biovised_remember_email', email);
        onClose();
      } else if (mode === 'signup') {
        if (!isNameValid) throw new Error('Candidate Name must be between 3 and 50 characters');
        if (!isPasswordValid) throw new Error('Password does not meet high safety standards (Needs 4+ checks passed)');
        // Role is never client-chosen — always 'user' (students only at signup)
        await signUpEmail(email, password, displayName, 'user', examType);
        localStorage.setItem('biovised_remember_email', email);
        setSuccess('Profile configured! Security tokens issued successfully.');
        setTimeout(() => onClose(), 1200);
      } else {
        await sendPasswordReset(email);
        setSuccess('Security recovery dispatch sent! Please confirm email mailbox.');
      }
    } catch (err: any) {
      // Graceful mapping of Supabase and Firebase error states into beautifully written candidate tips
      let friendlyError = err?.message || 'Authentication operation failed.';
      const lowerError = friendlyError.toLowerCase();
      
      if (lowerError.includes('invalid-credential') || lowerError.includes('invalid login credentials') || lowerError.includes('invalid_grant')) {
        friendlyError = 'Incorrect credentials. Please verify your email and password.';
      } else if (lowerError.includes('email-already-in-use') || lowerError.includes('user already registered') || lowerError.includes('already exists')) {
        friendlyError = 'This email is already registered. Please sign in or use a different email address.';
      } else if (lowerError.includes('network-request-failed') || lowerError.includes('failed to fetch') || lowerError.includes('network')) {
        friendlyError = 'Network connection intermittent or offline. Please check your internet connection and retry.';
      } else if (lowerError.includes('rate limit') || lowerError.includes('too many requests')) {
        friendlyError = 'Request frequency rate limit reached. Please wait a minute and try again.';
      } else if (lowerError.includes('signup requires a valid email') || lowerError.includes('invalid email')) {
        friendlyError = 'Please provide a valid, properly formatted email address.';
      }
      setError(friendlyError);
      if (mode === 'signin') {
        const newCount = loginAttempts + 1;
        setLoginAttempts(newCount);
        if (newCount >= LOCKOUT_THRESHOLD) {
          setLoginLockedUntil(Date.now() + LOCKOUT_DURATION_MS);
          setError(`Too many failed login attempts. Locked out for 60s.`);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: getAuthRedirectUrl() },
      });
      if (error) throw error;
    } catch (err: any) {
      setError('Google Sign-In failed: ' + (err?.message || 'Check connection or Supabase settings.'));
    }
  };

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (isLandingPage) return;
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      onClick={handleBackdropClick}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 text-left overflow-y-auto ${
        isLandingPage 
          ? 'bg-main-bg' 
          : 'bg-black/80 backdrop-blur-sm animate-in fade-in duration-200'
      }`}
    >
      <div className="w-full max-w-md bg-main-bg rounded-2xl border border-zinc-850 shadow-2xl p-8 md:p-10 relative overflow-hidden text-white font-sans">
        
        {!isLandingPage && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-zinc-500 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Small Gray Square Badge */}
        <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center text-white mb-6 border border-zinc-800">
          <LogIn className="w-5 h-5" />
        </div>

        <h2 className="text-xl font-sans font-semibold text-white tracking-tight mb-1.5 uppercase">
          {mode === 'signin' && 'Sign in to Biovised'}
          {mode === 'signup' && 'Create your account'}
          {mode === 'forgot' && 'Reset your password'}
        </h2>
        <p className="text-xs text-zinc-400 mb-6 leading-relaxed font-mono">
          {mode === 'signin' && 'Unlock structured JEE & NEET educational channels.'}
          {mode === 'signup' && 'Join the premium platform for medical and engineering prep.'}
          {mode === 'forgot' && 'Provide your registered email address to secure your link.'}
        </p>

        {error && (
          <div className="p-3.5 mb-5 bg-rose-950/20 border border-rose-900/40 text-rose-400 text-xs rounded-lg flex items-start gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 mb-5 bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 text-xs rounded-lg flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {mode === 'signup' && (
            <>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Candidate Name</label>
                  <span className={`text-[9px] font-mono ${displayName.length > 50 ? 'text-red-500 font-bold' : 'text-zinc-500'}`}>
                    {displayName.length}/50 chars
                  </span>
                </div>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onBlur={() => setNameTouched(true)}
                    onChange={(e) => setDisplayName(e.target.value.slice(0, 50))}
                    placeholder="Enter Candidate Full Name"
                    className={`w-full bg-zinc-950 border ${
                      nameTouched && !isNameValid 
                        ? 'border-red-500 focus:border-red-500' 
                        : nameTouched && isNameValid
                        ? 'border-emerald-500 focus:border-emerald-500'
                        : 'border-zinc-800 focus:border-white'
                    } rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-600 outline-none transition-all`}
                  />
                </div>
                {nameTouched && !isNameValid && (
                  <p className="mt-1 text-[10px] font-mono text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Minimum 3 characters needed
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">Exam Goal</label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-white rounded-lg py-2 px-3 text-sm text-white outline-none transition-all"
                >
                  <option className="bg-zinc-950 text-white" value="JEE">JEE</option>
                  <option className="bg-zinc-950 text-white" value="NEET">NEET</option>
                  <option className="bg-zinc-950 text-white" value="Both">Both / All Goals</option>
                </select>
              </div>
            </>
          )}

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Email Address</label>
              {emailTouched && (
                <span className={`text-[9px] font-mono ${isEmailValid ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {isEmailValid ? 'Email Formatted' : 'Input Valid Email'}
                </span>
              )}
            </div>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onBlur={() => setEmailTouched(true)}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="candidate@domain.org"
                className={`w-full bg-zinc-950 border ${
                  emailTouched && !isEmailValid 
                    ? 'border-red-500 focus:border-red-500' 
                    : emailTouched && isEmailValid
                    ? 'border-emerald-500 focus:border-emerald-500'
                    : 'border-zinc-800 focus:border-white'
                } rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-600 outline-none transition-all`}
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Password</label>
                {password.length > 0 && (
                  <span className={`text-[9px] font-mono font-medium ${
                    requirementsMetCount <= 2 ? 'text-red-500' : requirementsMetCount <= 4 ? 'text-amber-500' : 'text-emerald-500'
                  }`}>
                    {passwordStrengthLabel()}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onBlur={() => setPasswordTouched(true)}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className={`w-full bg-zinc-950 border ${
                    passwordTouched && mode === 'signup' && !isPasswordValid
                      ? 'border-red-500 focus:border-red-500'
                      : passwordTouched && mode === 'signup' && isPasswordValid
                      ? 'border-emerald-500 focus:border-emerald-500'
                      : 'border-zinc-800 focus:border-white'
                  } rounded-lg py-2 pl-10 pr-10 text-sm text-white placeholder-zinc-600 outline-none transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-zinc-500 hover:text-white focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength checklist */}
              {mode === 'signup' && (password.length > 0 || passwordTouched) && (
                <div className="mt-3 p-3 bg-zinc-950 border border-zinc-900 rounded-lg space-y-2">
                  <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden transition-all duration-300">
                    <div 
                      className={`h-full transition-all duration-500 ${passwordStrengthColor()}`}
                      style={{ width: `${(requirementsMetCount / 5) * 100}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-zinc-500 font-mono">
                    <div className="flex items-center gap-1">
                      <Check className={`w-3 h-3 ${hasEightChars ? 'text-emerald-500 font-bold' : 'text-zinc-850'}`} />
                      <span className={hasEightChars ? 'text-zinc-355 font-medium' : ''}>8+ Chars</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Check className={`w-3 h-3 ${hasUpperCase ? 'text-emerald-500 font-bold' : 'text-zinc-850'}`} />
                      <span className={hasUpperCase ? 'text-zinc-355 font-medium' : ''}>Uppercase</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Check className={`w-3 h-3 ${hasLowerCase ? 'text-emerald-500 font-bold' : 'text-zinc-850'}`} />
                      <span className={hasLowerCase ? 'text-zinc-355 font-medium' : ''}>Lowercase</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Check className={`w-3 h-3 ${hasNumber ? 'text-emerald-500 font-bold' : 'text-zinc-850'}`} />
                      <span className={hasNumber ? 'text-zinc-355 font-medium' : ''}>Number</span>
                    </div>
                    <div className="flex items-center gap-1 col-span-2">
                      <Check className={`w-3 h-3 ${hasSpecial ? 'text-emerald-500 font-bold' : 'text-zinc-850'}`} />
                      <span className={hasSpecial ? 'text-zinc-355 font-medium' : ''}>Special Symbol</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || (password.length > 0 && !canSubmit)}
            className="w-full bg-white hover:bg-zinc-200 text-black font-semibold py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {submitting && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {submitting ? 'Authenticating...' : mode === 'signin' ? 'Get Started' : mode === 'signup' ? 'Create Account' : 'Send Instructions'}
          </button>
        </form>

        {mode === 'signin' && (
          <>
            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-zinc-900"></div>
              <span className="flex-shrink mx-4 text-zinc-500 font-mono text-[9px] uppercase tracking-wider">Or Authenticate With</span>
              <div className="flex-grow border-t border-zinc-900"></div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              type="button"
              className="w-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-white font-medium py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  dom-id="google-path-1"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  dom-id="google-path-2"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  dom-id="google-path-3"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                />
                <path
                  fill="currentColor"
                  dom-id="google-path-4"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google Account Secure Sign-In
            </button>

            <button
              onClick={() => {
                enableGuestMode();
                if (onGuestBypass) onGuestBypass();
                onClose();
              }}
              type="button"
              className="w-full bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-zinc-300 font-medium py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <LogIn className="w-4 h-4 text-zinc-400" />
              Continue as Guest
            </button>
          </>
        )}

        <div className="mt-6 flex flex-col gap-2 items-center text-xs text-zinc-500 font-mono uppercase">
          {mode === 'signin' ? (
            <>
              <button onClick={() => setMode('signup')} className="hover:text-white transition-colors underline cursor-pointer">
                Need an account? Sign Up instead
              </button>
              <button onClick={() => setMode('forgot')} className="hover:text-white transition-colors cursor-pointer">
                Forgot password? Recover account
              </button>
            </>
          ) : mode === 'signup' ? (
            <button onClick={() => setMode('signin')} className="hover:text-white transition-colors underline cursor-pointer">
              Already have an account? Sign In
            </button>
          ) : (
            <button onClick={() => setMode('signin')} className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5" /> Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
