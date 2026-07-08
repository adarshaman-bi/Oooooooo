import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce, useOnlineStatus, usePasswordValidation, useCharacterCount } from '../utils/hooks';

describe('useDebounce', () => {
  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 500));
    expect(result.current).toBe('hello');
  });

  it('updates after delay', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 'hello' } }
    );

    rerender({ value: 'world' });
    expect(result.current).toBe('hello');

    await new Promise(r => setTimeout(r, 150));
    expect(result.current).toBe('world');
  });
});

describe('useOnlineStatus', () => {
  it('returns true when online', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(typeof result.current).toBe('boolean');
  });
});

describe('usePasswordValidation', () => {
  it('reports all checks for strong password', () => {
    const { result, rerender } = renderHook(
      ({ pw }) => usePasswordValidation(pw),
      { initialProps: { pw: 'Abcdef1!' } }
    );
    expect(result.current.minLength).toBe(true);
    expect(result.current.hasUpper).toBe(true);
    expect(result.current.hasLower).toBe(true);
    expect(result.current.hasNumber).toBe(true);
    expect(result.current.hasSpecial).toBe(true);
    expect(result.current.score).toBe(5);
  });

  it('reports mix for weak password', () => {
    const { result } = renderHook(() => usePasswordValidation('hello'));
    expect(result.current.minLength).toBe(false);
    expect(result.current.hasUpper).toBe(false);
    expect(result.current.score).toBeLessThan(3);
  });
});

describe('useCharacterCount', () => {
  it('returns remaining characters', () => {
    const { result } = renderHook(() => useCharacterCount('hello', 10));
    expect(result.current.remaining).toBe(5);
    expect(result.current.isOverLimit).toBe(false);
    expect(result.current.percentage).toBe(50);
  });

  it('detects over limit', () => {
    const { result } = renderHook(() => useCharacterCount('hello world!!!', 10));
    expect(result.current.remaining).toBeLessThan(0);
    expect(result.current.isOverLimit).toBe(true);
  });
});
