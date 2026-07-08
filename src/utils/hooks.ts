import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback((...args: Parameters<T>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);
}

export function useSearchLoading(isFetching: boolean): { showSkeleton: boolean } {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchStartRef = useRef(0);

  useEffect(() => {
    if (isFetching) {
      fetchStartRef.current = Date.now();
      timerRef.current = setTimeout(() => setShowSkeleton(true), 200);
    } else {
      const elapsed = Date.now() - fetchStartRef.current;
      const remaining = Math.max(0, 800 - elapsed);
      const hideTimer = setTimeout(() => setShowSkeleton(false), remaining);
      if (timerRef.current) clearTimeout(timerRef.current);
      return () => clearTimeout(hideTimer);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isFetching]);

  return { showSkeleton };
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validators: Partial<Record<keyof T, (value: any) => string | null>>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string | null>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const validateField = useCallback((name: keyof T, value: any) => {
    const validator = validators[name];
    if (validator) {
      const error = validator(value);
      setErrors(prev => ({ ...prev, [name]: error }));
      return error;
    }
    return null;
  }, [validators]);

  const handleChange = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      validateField(name, value);
    }
  }, [touched, validateField]);

  const handleBlur = useCallback((name: keyof T) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, values[name]);
  }, [values, validateField]);

  const isValid = useMemo(() => {
    for (const key of Object.keys(validators)) {
      const validator = validators[key as keyof T];
      if (validator) {
        const error = validator(values[key as keyof T]);
        if (error) return false;
      }
    }
    return true;
  }, [values, validators]);

  const reset = useCallback((newValues?: T) => {
    setValues(newValues || initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return { values, errors, touched, handleChange, handleBlur, isValid, reset, setValues, setErrors };
}

export function usePasswordValidation(password: string) {
  return useMemo(() => ({
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    score: [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /[0-9]/.test(password),
      /[!@#$%^&*(),.?":{}|<>]/.test(password),
    ].filter(Boolean).length,
  }), [password]);
}

export function useCharacterCount(text: string, max: number) {
  return useMemo(() => ({
    remaining: max - text.length,
    isOverLimit: text.length > max,
    percentage: Math.min(100, (text.length / max) * 100),
  }), [text, max]);
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  return online;
}

export function useRetry(fn: () => Promise<void>, maxRetries = 3) {
  const [retrying, setRetrying] = useState(false);
  const [failed, setFailed] = useState(false);

  const execute = useCallback(async () => {
    setRetrying(true);
    setFailed(false);
    for (let i = 0; i < maxRetries; i++) {
      try {
        await fn();
        setRetrying(false);
        return;
      } catch {
        if (i < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        }
      }
    }
    setRetrying(false);
    setFailed(true);
  }, [fn, maxRetries]);

  return { retrying, failed, execute };
}

export function useAbortController() {
  const controllerRef = useRef<AbortController | null>(null);

  const getSignal = useCallback(() => {
    if (controllerRef.current) controllerRef.current.abort();
    controllerRef.current = new AbortController();
    return controllerRef.current.signal;
  }, []);

  const abort = useCallback(() => {
    if (controllerRef.current) controllerRef.current.abort();
  }, []);

  useEffect(() => {
    return () => abort();
  }, [abort]);

  return { getSignal, abort };
}
