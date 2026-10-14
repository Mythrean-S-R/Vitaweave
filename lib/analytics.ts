import { SentryManager } from './sentry';
import { logger } from './logger';
import { sanitizeForLogging } from './phiSecurity';

export type AnalyticsEvent = {
  name: string;
  properties?: Record<string, unknown>;
};

export class Analytics {
  static track(event: AnalyticsEvent): void {
    const safeProps = event.properties
      ? (sanitizeForLogging(event.properties) as Record<string, unknown>)
      : undefined;

    logger.info(`[analytics] ${event.name}`, safeProps);

    if (SentryManager.isReady()) {
      SentryManager.addBreadcrumb({
        message: event.name,
        category: 'analytics',
        level: 'info',
        data: safeProps,
      });
    }
  }

  static trackScreen(screenName: string): void {
    this.track({ name: 'screen_view', properties: { screen: screenName } });
  }

  static trackAuth(action: 'login' | 'logout' | 'signup', role?: string): void {
    this.track({ name: `auth_${action}`, properties: { role } });
  }

  static trackAppointment(action: 'book' | 'view' | 'complete'): void {
    this.track({ name: `appointment_${action}` });
  }

  static trackAiChat(chatType: string): void {
    this.track({ name: 'ai_chat_message', properties: { chatType } });
  }
}
