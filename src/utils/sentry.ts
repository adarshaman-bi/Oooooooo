/// <reference types="vite/client" />

import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    if (import.meta.env.DEV) {
      console.log('[Sentry] DSN not configured — skipping initialization');
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: `biovised@${import.meta.env.VITE_APP_VERSION || '0.0.0'}`,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      if (event.exception) {
        const msg = event.exception.values?.[0]?.value || '';
        if (msg.includes('Invalid API key') || msg.includes('placeholder') || msg.includes('ResizeObserver')) {
          return null;
        }
      }
      return event;
    },
  });

  console.log('[Sentry] Initialized');
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}
