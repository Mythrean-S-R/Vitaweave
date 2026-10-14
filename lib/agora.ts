import { Platform } from 'react-native';
import { fetchAgoraToken } from './edgeClient';
import { logger } from './logger';

export interface VideoCallConfig {
  channelName: string;
  uid?: number;
  token?: string;
  appId?: string;
  appointmentId?: string;
  videoCallId?: string;
}

export interface VideoCallUser {
  uid: number;
  hasVideo: boolean;
  hasAudio: boolean;
}

export type RemoteUsersListener = (users: VideoCallUser[]) => void;

type RtcEngineType = {
  create: (appId: string) => Promise<any>;
  destroy: () => void;
};

import { loadNativeRtcModule } from './agoraModule';

let nativeEngine: any = null;
let rtcModule: { default: RtcEngineType } | null = null;

function allowFakeRemoteUsers(): boolean {
  // Never inject fake remotes in production builds
  return process.env.NODE_ENV !== 'production';
}

export class AgoraVideoService {
  private engine: any = null;
  private appId = '';
  private isInitialized = false;
  private videoEnabled = true;
  private audioEnabled = true;
  private remoteUsers: VideoCallUser[] = [];
  private remoteListeners = new Set<RemoteUsersListener>();

  private notifyRemoteListeners() {
    const snapshot = [...this.remoteUsers];
    this.remoteListeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        logger.warn('Remote users listener error:', error);
      }
    });
  }

  private setRemoteUsers(users: VideoCallUser[]) {
    this.remoteUsers = users;
    this.notifyRemoteListeners();
  }

  /** Subscribe to UserJoined / UserOffline updates. Returns unsubscribe. */
  onRemoteUsersChanged(listener: RemoteUsersListener): () => void {
    this.remoteListeners.add(listener);
    listener([...this.remoteUsers]);
    return () => {
      this.remoteListeners.delete(listener);
    };
  }

  async initialize(appId?: string): Promise<boolean> {
    try {
      this.appId = appId || process.env.EXPO_PUBLIC_AGORA_APP_ID || '';
      if (!this.appId) {
        throw new Error('Agora App ID not configured.');
      }

      const module = loadNativeRtcModule();
      if (module) {
        this.engine = await module.default.create(this.appId);
        await this.engine.enableVideo();
        await this.engine.enableAudio();
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      logger.error('Failed to initialize Agora:', error);
      return false;
    }
  }

  async joinChannel(config: VideoCallConfig): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize(config.appId);
      if (!initialized) return false;
    }

    try {
      let token = config.token;
      let appId = config.appId || this.appId;
      const uid = config.uid ?? Math.floor(Math.random() * 100000) + 1;

      if (!token) {
        const tokenResponse = await fetchAgoraToken({
          channelName: config.channelName,
          uid,
          role: 'publisher',
          appointmentId: config.appointmentId,
          videoCallId: config.videoCallId,
        });
        token = tokenResponse.token;
        appId = tokenResponse.appId;
        this.appId = appId;
      }

      if (this.engine) {
        await this.engine.joinChannel(token, config.channelName, null, uid);
        this.engine.addListener('UserJoined', (remoteUid: number) => {
          this.setRemoteUsers([
            ...this.remoteUsers.filter((u) => u.uid !== remoteUid),
            { uid: remoteUid, hasVideo: true, hasAudio: true },
          ]);
        });
        this.engine.addListener('UserOffline', (remoteUid: number) => {
          this.setRemoteUsers(this.remoteUsers.filter((u) => u.uid !== remoteUid));
        });
      } else if (allowFakeRemoteUsers()) {
        // Dev-only graceful fallback when native SDK is unavailable (Expo Go)
        await new Promise((resolve) => setTimeout(resolve, 800));
        this.setRemoteUsers([{ uid: uid + 1, hasVideo: true, hasAudio: true }]);
      } else {
        this.setRemoteUsers([]);
        logger.warn('Agora native SDK unavailable in production - remote video disabled');
      }

      return true;
    } catch (error) {
      logger.error('Failed to join channel:', error);
      return false;
    }
  }

  async leaveChannel(): Promise<void> {
    try {
      if (this.engine) {
        await this.engine.leaveChannel();
      }
      this.setRemoteUsers([]);
    } catch (error) {
      logger.error('Failed to leave channel:', error);
    }
  }

  async toggleVideo(enabled: boolean): Promise<void> {
    this.videoEnabled = enabled;
    if (this.engine) {
      await this.engine.enableLocalVideo(enabled);
    }
  }

  async toggleAudio(enabled: boolean): Promise<void> {
    this.audioEnabled = enabled;
    if (this.engine) {
      await this.engine.muteLocalAudioStream(!enabled);
    }
  }

  async switchCamera(): Promise<void> {
    if (this.engine) {
      await this.engine.switchCamera();
    }
  }

  getRemoteUsers(): VideoCallUser[] {
    return this.remoteUsers;
  }

  isVideoEnabled(): boolean {
    return this.videoEnabled;
  }

  isAudioEnabled(): boolean {
    return this.audioEnabled;
  }

  getEngine(): any {
    return this.engine;
  }

  async generateToken(
    channelName: string,
    uid: number,
    opts?: { appointmentId?: string; videoCallId?: string }
  ): Promise<string> {
    const response = await fetchAgoraToken({
      channelName,
      uid,
      role: 'publisher',
      appointmentId: opts?.appointmentId,
      videoCallId: opts?.videoCallId,
    });
    return response.token;
  }

  cleanup(): void {
    try {
      if (this.engine) {
        this.engine.leaveChannel();
        const module = loadNativeRtcModule();
        module?.default.destroy();
        this.engine = null;
      }
      this.isInitialized = false;
      this.setRemoteUsers([]);
      this.remoteListeners.clear();
    } catch (error) {
      logger.error('Failed to cleanup:', error);
    }
  }
}

export const videoService = new AgoraVideoService();

export const generateChannelName = (doctorId: string, patientId: string): string => {
  return `consult_${doctorId}_${patientId}_${Date.now()}`;
};

export const validateVideoCallConfig = (config: VideoCallConfig): boolean => {
  return Boolean(config.channelName);
};

export const isVideoCallSupported = (): boolean => {
  return Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web';
};

export const getVideoCallPermissions = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') return true;

    const { Camera } = await import('expo-camera');
    const camera = await Camera.requestCameraPermissionsAsync();
    const mic = await Camera.requestMicrophonePermissionsAsync();
    return camera.status === 'granted' && mic.status === 'granted';
  } catch (error) {
    logger.error('Failed to get permissions:', error);
    return false;
  }
};
