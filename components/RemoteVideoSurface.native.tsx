import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function RemoteVideoSurface({ users }: { users: { uid: number }[] }) {
  if (users.length === 0) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Waiting for remote video…</Text>
      </View>
    );
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { RtcSurfaceView, VideoSourceType } = require('react-native-agora');
    return (
      <View style={styles.surface}>
        {users.map((u) => (
          <RtcSurfaceView
            key={u.uid}
            style={styles.canvas}
            canvas={{ uid: u.uid, sourceType: VideoSourceType?.VideoSourceRemote ?? 1 }}
          />
        ))}
      </View>
    );
  } catch {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          {`${users.length} remote - install EAS build for video surface`}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
    minHeight: 200,
    backgroundColor: '#1e293b',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    minHeight: 200,
  },
  placeholderText: {
    color: '#94a3b8',
    fontSize: 14,
  },
});
