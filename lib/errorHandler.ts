// Error handling and monitoring infrastructure
import { SentryManager } from './sentry';

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  stack?: string;
}

export class ErrorHandler {
  private static errors: AppError[] = [];
  private static maxErrors = 100; // Keep last 100 errors

  static handleError(error: Error | AppError, context?: string): AppError {
    const appError: AppError = {
      code: this.generateErrorCode(),
      message: error.message,
      details: context ? { context, originalError: error } : { originalError: error },
      timestamp: new Date(),
      stack: error.stack,
    };

    // Store error
    this.errors.push(appError);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log error
    console.error(`[${appError.code}] ${appError.message}`, appError.details);

    // Send to Sentry if available
    if (SentryManager.isReady()) {
      const errorToSend = error instanceof Error ? error : new Error(error.message);
      SentryManager.captureException(errorToSend, { 
        errorCode: appError.code,
        context,
        timestamp: appError.timestamp.toISOString(),
      });
    }

    return appError;
  }

  static handleAsyncError(promise: Promise<any>, context?: string): Promise<any> {
    return promise.catch(error => {
      this.handleError(error, context);
      throw error;
    });
  }

  private static generateErrorCode(): string {
    return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  static getErrors(limit?: number): AppError[] {
    return limit ? this.errors.slice(-limit) : [...this.errors];
  }

  static clearErrors(): void {
    this.errors = [];
  }

  static getErrorStats(): { total: number; lastHour: number; lastDay: number } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return {
      total: this.errors.length,
      lastHour: this.errors.filter(e => e.timestamp > oneHourAgo).length,
      lastDay: this.errors.filter(e => e.timestamp > oneDayAgo).length,
    };
  }
}

// Common error types
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public query?: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Error boundary component helper
export const createErrorFallback = (error: AppError) => {
  return {
    title: 'Something went wrong',
    message: error.message,
    errorId: error.code,
    timestamp: error.timestamp.toISOString(),
  };
};
