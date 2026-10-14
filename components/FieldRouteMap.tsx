import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { MapPin, ChevronRight } from 'lucide-react-native';
import { Colors, Fonts } from '../app/_constants/theme';
import { buildGoogleMapsDirectionsUrl, getFieldRouteStops, type FieldRouteStop } from '../lib/fieldRoute';
import { getStoredUserId } from '../lib/authGuard';
import { t } from '../lib/i18n';

export function FieldRouteMap() {
  const [loading, setLoading] = useState(true);
  const [stops, setStops] = useState<FieldRouteStop[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ashaId = await getStoredUserId();
      if (!ashaId) {
        setStops([]);
        return;
      }
      const route = await getFieldRouteStops(ashaId);
      setStops(route);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const openMaps = () => {
    const url = buildGoogleMapsDirectionsUrl(stops);
    if (url) Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!stops.length) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{t('asha.fieldRoute')}</Text>
        <Text style={styles.empty}>No priority visits scheduled for today.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('asha.fieldRoute')}</Text>
          <Text style={styles.hint}>{t('asha.fieldRouteHint')} · {t('asha.stops', { count: stops.length })}</Text>
        </View>
        <TouchableOpacity style={styles.mapsBtn} onPress={openMaps}>
          <ChevronRight size={16} color={Colors.primary} />
          <Text style={styles.mapsBtnText}>{t('asha.openMaps')}</Text>
        </TouchableOpacity>
      </View>

      {stops.map((stop, index) => (
        <View key={stop.id} style={styles.stopRow}>
          <View style={styles.stopIndex}>
            <Text style={styles.stopIndexText}>{index + 1}</Text>
          </View>
          <View style={styles.stopBody}>
            <Text style={styles.stopName}>{stop.name}</Text>
            <View style={styles.stopMeta}>
              <MapPin size={12} color={Colors.textMuted} />
              <Text style={styles.stopMetaText}>{stop.ward} · score {stop.urgencyScore}</Text>
            </View>
            <Text style={styles.stopCondition}>{stop.condition}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 8 },
  title: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.textPrimary },
  hint: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  empty: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  mapsBtnText: { fontFamily: Fonts.medium, fontSize: 11, color: Colors.primary },
  stopRow: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  stopIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIndexText: { fontFamily: Fonts.semiBold, fontSize: 12, color: Colors.primary },
  stopBody: { flex: 1 },
  stopName: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.textPrimary },
  stopMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  stopMetaText: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted },
  stopCondition: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});
