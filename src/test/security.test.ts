import { describe, it, expect } from 'vitest';
import { sanitizeHtml, isValidEmail, isValidPassword, isAdminRole, isModeratorRole } from '../utils/security';
import {
  isAllowedOrigin,
  isValidYoutubeVideoId,
  isValidYoutubeChannelId,
  isValidYoutubePlaylistId,
  sanitizeError,
} from '../middleware/security';

describe('sanitizeHtml', () => {
  it('escapes HTML tags', () => {
    expect(sanitizeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes quotes', () => {
    expect(sanitizeHtml('"test"')).toBe('&quot;test&quot;');
  });

  it('returns safe strings unchanged', () => {
    expect(sanitizeHtml('hello world')).toBe('hello world');
  });
});

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('user+tag@domain.co')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('returns valid for strong passwords', () => {
    const result = isValidPassword('Abcdef1!');
    expect(result.valid).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it('returns reasons for weak passwords', () => {
    const result = isValidPassword('weak');
    expect(result.valid).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('detects missing uppercase', () => {
    const result = isValidPassword('abcdef1!');
    expect(result.reasons).toContain('One uppercase letter');
  });

  it('detects missing special char', () => {
    const result = isValidPassword('Abcdefg1');
    expect(result.reasons).toContain('One special character');
  });
});

describe('isAdminRole', () => {
  it('identifies admin roles', () => {
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('super_admin')).toBe(true);
    expect(isAdminRole('platform_admin')).toBe(true);
  });

  it('rejects non-admin roles', () => {
    expect(isAdminRole('user')).toBe(false);
    expect(isAdminRole('moderator')).toBe(false);
    expect(isAdminRole('teacher')).toBe(false);
  });
});

describe('isModeratorRole', () => {
  it('identifies moderator+ roles', () => {
    expect(isModeratorRole('moderator')).toBe(true);
    expect(isModeratorRole('admin')).toBe(true);
    expect(isModeratorRole('super_admin')).toBe(true);
  });

  it('rejects non-moderator roles', () => {
    expect(isModeratorRole('user')).toBe(false);
    expect(isModeratorRole('teacher')).toBe(false);
  });
});

describe('isAllowedOrigin', () => {
  it('allows localhost and biovise production', () => {
    expect(isAllowedOrigin(undefined)).toBe(true);
    expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
    expect(isAllowedOrigin('https://biovise.vercel.app')).toBe(true);
  });

  it('rejects arbitrary third-party / generic vercel / run.app', () => {
    expect(isAllowedOrigin('https://evil.com')).toBe(false);
    expect(isAllowedOrigin('https://attacker.vercel.app')).toBe(false);
    expect(isAllowedOrigin('https://malicious.run.app')).toBe(false);
  });
});

describe('YouTube ID validators', () => {
  it('accepts well-formed IDs', () => {
    expect(isValidYoutubeVideoId('dQw4w9WgXcQ')).toBe(true);
    expect(isValidYoutubeChannelId('UC63V9iYI_vL-P_i36-1WlY9A')).toBe(true);
    expect(isValidYoutubePlaylistId('PLabcdefghijklmnopqrstuv')).toBe(true);
  });

  it('rejects SSRF-style or path payloads', () => {
    expect(isValidYoutubeVideoId('http://evil')).toBe(false);
    expect(isValidYoutubeChannelId('../etc/passwd')).toBe(false);
    expect(isValidYoutubePlaylistId('PL/../../admin')).toBe(false);
    expect(isValidYoutubeVideoId('short')).toBe(false);
  });
});

describe('sanitizeError', () => {
  it('hides secret-related messages', () => {
    expect(sanitizeError(new Error('Invalid API key'))).toBe('Internal server error');
    expect(sanitizeError(new Error('password dump'))).toBe('Internal server error');
  });

  it('passes through generic safe messages', () => {
    expect(sanitizeError(new Error('Playlist not found'))).toBe('Playlist not found');
  });
});
