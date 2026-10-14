import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function RemoteVideoSurface({ users }: { users: { uid: number }[] }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>
        {users.length > 0 ? `${users.length} remote participant(s)` : 'Waiting for remote video…'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
