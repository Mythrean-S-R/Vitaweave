// Production logger utility - replaces console.log statements
import { sanitizeForLogging } from './phiSecurity';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

class Logger {
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  private log(level: LogLevel, message: string, ...args: any[]) {
    if (this.isProduction && level === LogLevel.DEBUG) {
      return;
    }

    const safeArgs = args.map((arg) => sanitizeForLogging(arg));
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        if (!this.isProduction) console.log(logMessage, ...safeArgs);
        break;
      case LogLevel.INFO:
        console.info(logMessage, ...safeArgs);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, ...safeArgs);
        break;
      case LogLevel.ERROR:
        console.error(logMessage, ...safeArgs);
        if (this.isProduction) {
          void import('./sentry').then(({ SentryManager }) => {
            if (SentryManager.isReady()) {
              SentryManager.captureMessage(message, 'error', { args: safeArgs });
            }
          });
        }
        break;
    }
  }

  debug(message: string, ...args: any[]) {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log(LogLevel.WARN, message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log(LogLevel.ERROR, message, ...args);
  }
}

export const logger = new Logger();
