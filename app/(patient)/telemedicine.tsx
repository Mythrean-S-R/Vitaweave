import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react-native';
import {
  videoService,
  generateChannelName,
  validateVideoCallConfig,
  getVideoCallPermissions,
  isVideoCallSupported,
  type VideoCallUser,
} from '../../lib/agora';
import { getStoredUserId } from '../../lib/authGuard';
import { logAuditEvent } from '../../lib/auditLog';

import { RemoteVideoSurface as RemoteVideoViews } from '../../components/RemoteVideoSurface';

export default function PatientTelemedicineScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ appointmentId?: string; channelName?: string }>();
  const [connecting, setConnecting] = useState(true);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<VideoCallUser[]>([]);

  useEffect(() => {
    const unsubRemote = videoService.onRemoteUsersChanged(setRemoteUsers);

    (async () => {
      if (!isVideoCallSupported()) {
        Alert.alert('Not supported', 'Video calling requires a native build.');
        setConnecting(false);
        return;
      }
      const ok = await getVideoCallPermissions();
      if (!ok) {
        Alert.alert('Permissions required', 'Camera and microphone needed.');
        setConnecting(false);
        return;
      }
      const userId = (await getStoredUserId()) ?? 'patient';
      await videoService.initialize();
      const channelName =
        params.channelName ?? generateChannelName(userId, params.appointmentId ?? `pt_${Date.now()}`);
      const uid = Math.floor(Math.random() * 100000) + 1;
      const appointmentId = params.appointmentId;
      const token = await videoService.generateToken(channelName, uid, { appointmentId });
      const config = { channelName, uid, token, appointmentId };
      if (validateVideoCallConfig(config)) {
        const joined = await videoService.joinChannel(config);
        setConnected(joined);
        setRemoteUsers(videoService.getRemoteUsers());
        await logAuditEvent({
          action: 'create',
          resourceType: 'telemedicine_patient_join',
          resourceId: params.appointmentId,
          metadata: { channelName },
        });
      }
      setConnecting(false);
    })();

    return () => {
      unsubRemote();
      void videoService.leaveChannel();
      videoService.cleanup();
    };
  }, []);

  const end = async () => {
    await videoService.leaveChannel();
    videoService.cleanup();
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.videoArea}>
        {connecting ? (
          <ActivityIndicator size="large" color="#059669" />
        ) : (
          <RemoteVideoViews users={remoteUsers} />
        )}
        <Text style={styles.status}>
          {connecting ? 'Connecting…' : connected ? 'Connected to doctor' : 'Waiting…'}
        </Text>
      </View>
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.btn}
          onPress={async () => {
            const next = !muted;
            setMuted(next);
            await videoService.toggleAudio(!next);
          }}>
          {muted ? <MicOff color="#fff" size={22} /> : <Mic color="#fff" size={22} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btn}
          onPress={async () => {
            const next = !videoOff;
            setVideoOff(next);
            await videoService.toggleVideo(!next);
          }}>
          {videoOff ? <VideoOff color="#fff" size={22} /> : <Video color="#fff" size={22} />}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.end]} onPress={end}>
          <PhoneOff color="#fff" size={22} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  videoArea: { flex: 1, padding: 12, paddingBottom: 100 },
  status: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  remotePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    minHeight: 240,
  },
  remotePlaceholderText: { color: '#94a3b8', fontFamily: 'Inter-Regular' },
  remoteSurface: { flex: 1, borderRadius: 12, overflow: 'hidden', minHeight: 240 },
  remoteCanvas: { flex: 1, minHeight: 240, backgroundColor: '#1e293b' },
  controls: {
    flexDirection: 'row',
    gap: 16,
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
  },
  btn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  end: { backgroundColor: '#dc2626' },
});
