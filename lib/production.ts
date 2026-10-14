// Production initialization script
import { SentryManager } from './sentry';
import { logger } from './logger';
import { initializeNotifications } from './notifications';
import { EnvValidator } from './envValidator';

export interface ProductionConfig {
  sentryDsn?: string;
  environment?: string;
  release?: string;
}

export class ProductionInitializer {
  static initialize(config: ProductionConfig = {}): void {
    const envValidation = EnvValidator.validateEnvironment();
    if (!envValidation.isValid) {
      logger.error('Environment validation failed:', envValidation);
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Invalid environment configuration');
      }
      logger.warn('Continuing in non-production with incomplete environment');
    } else {
      logger.info('Environment validation passed');
    }

    for (const warning of EnvValidator.getRecommendedWarnings()) {
      logger.warn(warning);
    }

    if (config.sentryDsn) {
      void SentryManager.initialize({
        dsn: config.sentryDsn,
        environment: config.environment || process.env.NODE_ENV || 'development',
        release: config.release,
        tracesSampleRate: config.environment === 'production' ? 0.1 : 0.5,
      });
    }

    logger.info('Production initialization completed');

    initializeNotifications().catch((error) => {
      logger.warn('Notification setup skipped:', error);
    });
  }

  static initializeFromEnv(): void {
    this.initialize({
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      release: `vitaweave@${process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0'}`,
    });
  }
}
