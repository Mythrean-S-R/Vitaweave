import { Platform } from 'react-native';
import { isDevModeEnabled } from './devMode';
import { logger } from './logger';
import { getLocale } from './i18n';

export interface VoiceRecognitionResult {
  transcript: string;
  confidence?: number;
  error?: string;
}

type ExpoSpeechModule = {
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (options: { lang: string; interimResults: boolean; continuous: boolean }) => void;
  stop: () => void;
  abort: () => void;
  addListener: (
    event: 'result' | 'error' | 'end',
    handler: (event: Record<string, unknown>) => void
  ) => { remove: () => void };
};

const LOCALE_TO_BCP47: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
};

import { isRunningInExpoGo } from 'expo';

let ExpoSpeechRecognitionModule: ExpoSpeechModule | null = null;

function loadExpoSpeechModule(): ExpoSpeechModule | null {
  if (Platform.OS === 'web') return null;
  try {
    if (isRunningInExpoGo()) return null;
  } catch {}
  if (ExpoSpeechRecognitionModule) return ExpoSpeechRecognitionModule;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ExpoSpeechRecognitionModule = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
    return ExpoSpeechRecognitionModule;
  } catch {
    logger.warn('expo-speech-recognition not available - use an EAS dev build for native voice');
    return null;
  }
}

export class VoiceRecognitionService {
  private static instance: VoiceRecognitionService;
  private recognition: any = null;
  private isListening = false;
  private activeLang = 'en-IN';
  private listeners: { remove: () => void }[] = [];

  static getInstance(): VoiceRecognitionService {
    if (!VoiceRecognitionService.instance) {
      VoiceRecognitionService.instance = new VoiceRecognitionService();
    }
    return VoiceRecognitionService.instance;
  }

  isSupported(): boolean {
    if (Platform.OS === 'web') {
      return 'webkitSpeechRecognition' in globalThis || 'SpeechRecognition' in globalThis;
    }
    const mod = loadExpoSpeechModule();
    return Boolean(mod?.isRecognitionAvailable()) || isDevModeEnabled();
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return true;

    const mod = loadExpoSpeechModule();
    if (!mod) return isDevModeEnabled();

    try {
      const result = await mod.requestPermissionsAsync();
      return result.granted;
    } catch {
      return false;
    }
  }

  async startListening(
    onResult: (result: VoiceRecognitionResult) => void,
    onError?: (error: string) => void
  ): Promise<boolean> {
    if (this.isListening) return false;

    if (!this.isSupported()) {
      onError?.('Voice recognition is not supported on this device');
      return false;
    }

    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      onError?.('Microphone permission denied');
      return false;
    }

    this.activeLang = LOCALE_TO_BCP47[getLocale()] ?? 'en-IN';

    if (Platform.OS === 'web') {
      return this.startWebListening(onResult, onError);
    }

    const mod = loadExpoSpeechModule();
    if (mod) {
      return this.startExpoListening(mod, onResult, onError);
    }

    return this.startSimulatedListening(onResult, onError);
  }

  stopListening(): void {
    if (Platform.OS === 'web' && this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        logger.error('Error stopping web recognition:', error);
      }
      this.recognition = null;
    }

    const mod = loadExpoSpeechModule();
    if (mod && this.isListening) {
      mod.stop();
      this.clearListeners();
    }

    this.isListening = false;
  }

  private clearListeners(): void {
    this.listeners.forEach((l) => l.remove());
    this.listeners = [];
  }

  private startWebListening(
    onResult: (result: VoiceRecognitionResult) => void,
    onError?: (error: string) => void
  ): boolean {
    try {
      const SpeechRecognitionCtor =
        (globalThis as any).webkitSpeechRecognition || (globalThis as any).SpeechRecognition;

      if (!SpeechRecognitionCtor) {
        onError?.('Speech recognition not supported in this browser');
        return false;
      }

      this.recognition = new SpeechRecognitionCtor();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = this.activeLang;

      this.recognition.onstart = () => {
        this.isListening = true;
      };

      this.recognition.onresult = (event: any) => {
        const result = event.results[0]?.[0];
        if (result) {
          onResult({ transcript: result.transcript, confidence: result.confidence });
        }
      };

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        onError?.(event.error || 'Speech recognition error');
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.recognition = null;
      };

      this.recognition.start();
      return true;
    } catch {
      onError?.('Failed to initialize speech recognition');
      return false;
    }
  }

  private startExpoListening(
    mod: ExpoSpeechModule,
    onResult: (result: VoiceRecognitionResult) => void,
    onError?: (error: string) => void
  ): boolean {
    try {
      this.clearListeners();

      this.listeners.push(
        mod.addListener('result', (event) => {
          const results = event.results as { transcript?: string; confidence?: number }[] | undefined;
          const transcript = results?.[0]?.transcript;
          if (transcript) {
            onResult({ transcript, confidence: results?.[0]?.confidence ?? 0.9 });
          }
          this.isListening = false;
        })
      );

      this.listeners.push(
        mod.addListener('error', (event) => {
          this.isListening = false;
          const message = (event.error as string | undefined) || (event.message as string | undefined);
          onError?.(message || 'Voice recognition failed');
        })
      );

      this.listeners.push(
        mod.addListener('end', () => {
          this.isListening = false;
        })
      );

      this.isListening = true;
      mod.start({
        lang: this.activeLang,
        interimResults: false,
        continuous: false,
      });
      return true;
    } catch {
      onError?.('Failed to start speech recognition');
      return false;
    }
  }

  private startSimulatedListening(
    onResult: (result: VoiceRecognitionResult) => void,
    onError?: (error: string) => void
  ): boolean {
    if (!isDevModeEnabled()) {
      onError?.('Speech recognition unavailable. Build with EAS dev client.');
      return false;
    }

    this.isListening = true;
    setTimeout(() => {
      if (this.isListening) {
        onResult({ transcript: 'patient needs follow up visit', confidence: 0.88 });
        this.isListening = false;
      }
    }, 2000);
    return true;
  }

  isActive(): boolean {
    return this.isListening;
  }

  getSupportedLanguages(): string[] {
    return ['en-IN', 'hi-IN', 'ta-IN', 'bn-IN', 'te-IN', 'mr-IN', 'gu-IN', 'kn-IN', 'ml-IN'];
  }

  setLanguage(language: string): void {
    this.activeLang = language;
    if (this.recognition && Platform.OS === 'web') {
      this.recognition.lang = language;
    }
  }

  cleanup(): void {
    this.stopListening();
    loadExpoSpeechModule()?.abort();
  }
}

export const voiceRecognitionService = VoiceRecognitionService.getInstance();

export const startVoiceInput = async (
  onResult: (text: string) => void,
  onError?: (error: string) => void
): Promise<boolean> => {
  return voiceRecognitionService.startListening(
    (result) => {
      if (result.transcript) onResult(result.transcript);
    },
    onError
  );
};

export const isVoiceRecognitionAvailable = (): boolean => {
  return voiceRecognitionService.isSupported();
};

export const MEDICAL_VOICE_COMMANDS = {
  EMERGENCY: ['emergency', 'help', 'urgent', 'critical', '911'],
  VITALS: ['blood pressure', 'heart rate', 'temperature', 'oxygen', 'vitals'],
  MEDICATION: ['medicine', 'medication', 'drug', 'dose', 'prescription'],
  APPOINTMENT: ['appointment', 'schedule', 'visit', 'follow up'],
  SYMPTOMS: ['pain', 'fever', 'cough', 'headache', 'nausea', 'symptom'],
};

export const detectMedicalIntent = (transcript: string): string | null => {
  const lowerTranscript = transcript.toLowerCase();
  for (const [intent, keywords] of Object.entries(MEDICAL_VOICE_COMMANDS)) {
    if (keywords.some((keyword) => lowerTranscript.includes(keyword))) {
      return intent;
    }
  }
  return null;
};

export type VoicePayload = {
  transcript: string;
  intent: string | null;
  confidence?: number;
  summary: string;
};

export async function transcribeLocalAudio(uri: string): Promise<VoicePayload> {
  const transcript = `Audio recorded at ${uri}. Use voice input for live transcription.`;
  const intent = detectMedicalIntent(transcript);
  return {
    transcript,
    intent,
    confidence: 0.9,
    summary: compactVoiceTranscript(transcript),
  };
}

export function compactVoiceTranscript(transcript: string): string {
  const reduced = transcript
    .replace(/\b(please|kindly|just|actually|really)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return reduced.length > 280 ? reduced.slice(0, 280) : reduced;
}

export function buildVoicePayload(transcript: string, confidence?: number): VoicePayload {
  const intent = detectMedicalIntent(transcript);
  return {
    transcript,
    intent,
    confidence,
    summary: compactVoiceTranscript(transcript),
  };
}
