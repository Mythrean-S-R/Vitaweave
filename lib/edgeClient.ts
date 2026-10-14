import { supabase } from './supabase';
import { logger } from './logger';

export type GeminiProxyRequest = {
  prompt: string;
  context?: string;
  language?: string;
  image?: { base64: string; mimeType: string };
};

export type GeminiProxyResponse = {
  text: string;
};

export type AgoraTokenRequest = {
  channelName: string;
  uid?: number;
  role?: 'publisher' | 'subscriber';
  appointmentId?: string;
  videoCallId?: string;
};

export type AgoraTokenResponse = {
  token: string;
  appId: string;
  channelName: string;
  uid: number;
  expiresAt: number;
};

async function invokeFunction<TResponse>(
  name: string,
  body: Record<string, unknown>
): Promise<TResponse> {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    logger.error(`Edge function ${name} failed:`, error);
    throw new Error(error.message || `Failed to call ${name}`);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as TResponse;
}

export async function proxyGeminiRequest(
  request: GeminiProxyRequest
): Promise<string> {
  const result = await invokeFunction<GeminiProxyResponse>('gemini-proxy', {
    prompt: request.prompt,
    context: request.context,
    language: request.language,
    image: request.image,
  });
  return result.text;
}

export async function fetchAgoraToken(
  request: AgoraTokenRequest
): Promise<AgoraTokenResponse> {
  return invokeFunction<AgoraTokenResponse>('agora-token', {
    channelName: request.channelName,
    uid: request.uid ?? 0,
    role: request.role ?? 'publisher',
    appointmentId: request.appointmentId,
    videoCallId: request.videoCallId,
  });
}

export function isEdgeFunctionsConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL);
}
