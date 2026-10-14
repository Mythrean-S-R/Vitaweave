import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../app/_constants/theme';

type Props = {
  rows?: number;
  rowHeight?: number;
};

export function ListSkeleton({ rows = 5, rowHeight = 52 }: Props) {
  return (
    <View style={styles.wrap}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.row, { height: rowHeight }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 8 },
  row: {
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
    marginBottom: 8,
    opacity: 0.7,
  },
});
