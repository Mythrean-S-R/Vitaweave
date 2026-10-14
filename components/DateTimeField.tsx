import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
} from 'react-native';

type DateTimeFieldProps = {
  date: string;
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
};

function formatDateLabel(isoDate: string): string {
  if (!isoDate) return 'Pick date';
  const parsed = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimeLabel(time: string): string {
  if (!time) return 'Pick time';
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const QUICK_SLOTS = [
  { label: 'Today 9:00 AM', dateOffset: 0, time: '09:00' },
  { label: 'Today 2:00 PM', dateOffset: 0, time: '14:00' },
  { label: 'Tomorrow 10:00 AM', dateOffset: 1, time: '10:00' },
];

function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Cross-platform date/time picker with quick slots and manual ISO entry fallback.
 */
export function DateTimeField({ date, time, onDateChange, onTimeChange }: DateTimeFieldProps) {
  const [pickerOpen, setPickerOpen] = useState<'date' | 'time' | null>(null);

  let DateTimePicker: React.ComponentType<any> | null = null;
  if (Platform.OS !== 'web') {
    try {
      DateTimePicker = require('@react-native-community/datetimepicker').default;
    } catch {
      DateTimePicker = null;
    }
  }

  const pickerValue = (() => {
    if (pickerOpen === 'date') {
      const base = date ? new Date(`${date}T12:00:00`) : new Date();
      return Number.isNaN(base.getTime()) ? new Date() : base;
    }
    const [h, m] = (time || '09:00').split(':').map(Number);
    const base = new Date();
    base.setHours(h || 9, m || 0, 0, 0);
    return base;
  })();

  return (
    <View>
      <Text style={styles.label}>Appointment Date & Time</Text>

      <View style={styles.row}>
        <TouchableOpacity style={styles.field} onPress={() => setPickerOpen('date')}>
          <Text style={styles.fieldLabel}>Date</Text>
          <Text style={styles.fieldValue}>{formatDateLabel(date)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.field} onPress={() => setPickerOpen('time')}>
          <Text style={styles.fieldLabel}>Time</Text>
          <Text style={styles.fieldValue}>{formatTimeLabel(time)}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickRow}>
        {QUICK_SLOTS.map((slot) => (
          <TouchableOpacity
            key={slot.label}
            style={styles.quickChip}
            onPress={() => {
              onDateChange(offsetDate(slot.dateOffset));
              onTimeChange(slot.time);
            }}
          >
            <Text style={styles.quickText}>{slot.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!DateTimePicker ? (
        <View style={styles.manualRow}>
          <TextInput
            style={styles.manualInput}
            placeholder="YYYY-MM-DD"
            value={date}
            onChangeText={onDateChange}
          />
          <TextInput
            style={styles.manualInput}
            placeholder="HH:MM"
            value={time}
            onChangeText={onTimeChange}
          />
        </View>
      ) : null}

      {DateTimePicker && pickerOpen ? (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="fade" visible onRequestClose={() => setPickerOpen(null)}>
            <View style={styles.iosOverlay}>
              <View style={styles.iosSheet}>
                <DateTimePicker
                  value={pickerValue}
                  mode={pickerOpen}
                  display="spinner"
                  onChange={(_: unknown, selected?: Date) => {
                    if (!selected) return;
                    if (pickerOpen === 'date') {
                      onDateChange(selected.toISOString().slice(0, 10));
                    } else {
                      onTimeChange(
                        `${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`
                      );
                    }
                  }}
                />
                <TouchableOpacity style={styles.doneBtn} onPress={() => setPickerOpen(null)}>
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={pickerValue}
            mode={pickerOpen}
            onChange={(_: unknown, selected?: Date) => {
              setPickerOpen(null);
              if (!selected) return;
              if (pickerOpen === 'date') {
                onDateChange(selected.toISOString().slice(0, 10));
              } else {
                onTimeChange(
                  `${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`
                );
              }
            }}
          />
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#334155',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },
  fieldLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  fieldValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#0f172a',
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  quickChip: {
    backgroundColor: '#ecfeff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#0891b2',
  },
  manualRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  manualInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Inter-Regular',
    backgroundColor: '#fff',
  },
  iosOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  iosSheet: {
    backgroundColor: '#fff',
    paddingBottom: 24,
  },
  doneBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  doneText: {
    fontFamily: 'Inter-SemiBold',
    color: '#0891b2',
    fontSize: 16,
  },
});
