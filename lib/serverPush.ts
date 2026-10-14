import { supabase } from './supabase';
import { logger } from './logger';

export async function sendServerPush(input: {
  profileId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: {
        profileIds: [input.profileId],
        title: input.title,
        body: input.body,
        data: input.data ?? {},
      },
    });

    if (error) {
      logger.warn('send-push failed:', error.message);
      return false;
    }
    if (data?.error) {
      logger.warn('send-push error:', data.error);
      return false;
    }
    return true;
  } catch (error) {
    logger.warn('send-push unavailable:', error);
    return false;
  }
}
