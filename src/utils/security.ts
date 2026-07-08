/// <reference types="vite/client" />

export function validateEnv(): { valid: boolean; missing: string[] } {
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const missing = required.filter(key => {
    const val = import.meta.env[key];
    return !val || val.trim() === '' || val === 'placeholder.supabase.co';
  });
  return { valid: missing.length === 0, missing };
}

export function sanitizeError(err: unknown): string {
  if (err instanceof Error) {
    if (err.message.includes('Invalid API key') || err.message.includes('placeholder')) {
      return 'Service temporarily unavailable. Please try again later.';
    }
    return err.message;
  }
  return 'An unexpected error occurred.';
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password: string): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (password.length < 8) reasons.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) reasons.push('One uppercase letter');
  if (!/[a-z]/.test(password)) reasons.push('One lowercase letter');
  if (!/[0-9]/.test(password)) reasons.push('One number');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) reasons.push('One special character');
  return { valid: reasons.length === 0, reasons };
}

export function getAuthRedirectUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin.replace(/\/+$/, '')}/auth/callback`;
  }
  const envUrl = import.meta.env.VITE_REDIRECT_URL;
  if (envUrl) {
    return `${envUrl.replace(/\/+$/, '')}/auth/callback`;
  }
  return '/auth/callback';
}

export function isAdminRole(role?: string): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'platform_admin';
}

export function isModeratorRole(role?: string): boolean {
  return role === 'moderator' || role === 'admin' || role === 'super_admin';
}
