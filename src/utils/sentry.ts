import * as Sentry from '@sentry/react'

// @ts-ignore - BrowserTracing may not exist in all versions
const { BrowserTracing, Replay } = Sentry

/**
 * Initialize Sentry error tracking
 * @param dsn - Sentry DSN (Data Source Name)
 */
export function initReactSentry(dsn: string) {
  Sentry.init({
    dsn,
    integrations: [
      // @ts-ignore - BrowserTracing may not exist in all versions
      new BrowserTracing(),
      // @ts-ignore - Replay may not exist in all versions
      new Replay(),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  })
}

/**
 * Log a message to Sentry
 * @param message - The message to log
 * @param level - Log level (debug, info, warning, error, fatal)
 * @param extras - Additional data to include
 */
export function logToSentry(
  message: string,
  level: 'debug' | 'info' | 'warning' | 'error' | 'fatal' = 'info',
  extras?: Record<string, unknown>
) {
  Sentry.withScope((scope) => {
    if (extras) {
      Object.entries(extras).forEach(([key, value]) => {
        scope.setExtra(key, value)
      })
    }
    Sentry.captureMessage(message, level)
  })
}

/**
 * Log an error to Sentry
 * @param error - The error to log
 * @param context - Additional context about where the error occurred
 */
export function logErrorToSentry(error: Error | unknown, context?: string) {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('context', { message: context })
    }
    Sentry.captureException(error)
  })
}

/**
 * Set user context for Sentry
 * @param userId - User ID
 * @param userEmail - User email (optional)
 * @param userDisplayName - User display name (optional)
 */
export function setSentryUser(
  userId: string,
  userEmail?: string,
  userDisplayName?: string
) {
  Sentry.setUser({
    id: userId,
    email: userEmail,
    username: userDisplayName,
  })
}

/**
 * Clear Sentry user context
 */
export function clearSentryUser() {
  Sentry.setUser(null)
}
