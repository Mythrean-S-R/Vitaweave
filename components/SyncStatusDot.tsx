import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Colors, Fonts } from '../app/_constants/theme';
import { useSyncStatus } from '../hooks/useSyncStatus';

type Props = {
  accentColor?: string;
};

export function SyncStatusDot({ accentColor = Colors.primary }: Props) {
  const { status, pendingCount } = useSyncStatus();
  const color = status === 'synced' ? Colors.success : Colors.warning;

  const onPress = () => {
    if (pendingCount === 0) {
      Alert.alert('Sync', 'All changes synced.');
      return;
    }
    Alert.alert('Sync pending', `${pendingCount} change(s) waiting to upload.`);
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.wrap} hitSlop={8}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      {pendingCount > 0 && (
        <Text style={[styles.count, { color: accentColor }]}>{pendingCount}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  count: { fontFamily: Fonts.medium, fontSize: 11 },
});
