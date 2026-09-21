export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogContext = Record<string, unknown> | undefined

const isDev = import.meta.env.DEV === true
const isProd = import.meta.env.PROD === true

function serialize(ctx: LogContext): string | undefined {
  if (!ctx) return undefined
  try {
    return JSON.stringify(ctx)
  } catch {
    return '[unserializable context]'
  }
}

function scrub(parts: unknown[]): unknown[] {
  return parts.map((p) => {
    if (typeof p !== 'string') return p
    return p
      .replace(/(password|pwd|token|secret|apikey|api_key|private[_-]?key)\s*[:=]\s*["']?[^"'\s&,}]+["']?/gi, (_m, k: string) => `${k}=[REDACTED]`)
      .replace(/sk-[A-Za-z0-9-_]{10,}/g, 'sk-[REDACTED]')
      .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, 'jwt.[REDACTED]')
  })
}

export const logger = {
  debug: (message: string, context?: LogContext) => {
    if (!isDev) return
    // eslint-disable-next-line no-console
    console.debug(`[delta][debug] ${message}`, ...(context ? [serialize(context)] : []))
  },
  info: (message: string, context?: LogContext) => {
    // eslint-disable-next-line no-console
    console.info(`[delta][info] ${message}`, ...(context ? [serialize(context)] : []))
  },
  warn: (message: string, context?: LogContext) => {
    // eslint-disable-next-line no-console
    console.warn(`[delta][warn] ${message}`, ...(context ? [serialize(context)] : []))
  },
  error: (message: string, err?: unknown, context?: LogContext) => {
    const safeErr =
      err instanceof Error
        ? { name: err.name, message: err.message, stack: err.stack }
        : err
    // eslint-disable-next-line no-console
    console.error(`[delta][error] ${message}`, ...scrub([safeErr, serialize(context)]))

    if (typeof window !== 'undefined' && isProd) {
      try {
        const evt = new CustomEvent<{
          message: string
          error: unknown
          context: LogContext
          ts: number
        }>('delta:error', {
          detail: { message, error: safeErr, context, ts: Date.now() },
        })
        window.dispatchEvent(evt)
      } catch {
      }
    }
  },
}

export function attachGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return

  window.addEventListener('error', (ev: ErrorEvent) => {
    logger.error(
      'window.error',
      {
        name: 'Error',
        message: ev.message,
        stack: `at ${ev.filename}:${ev.lineno}:${ev.colno ?? 0}`,
      } as unknown as Error,
      { type: 'global-uncaught' }
    )
  })

  window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
    const reason = ev.reason
    const err = reason instanceof Error ? reason : new Error(String(reason ?? 'unknown promise rejection'))
    logger.error('window.unhandledrejection', err, { type: 'global-unhandled-promise' })
  })
}
