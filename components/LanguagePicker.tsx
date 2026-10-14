import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Colors, Fonts } from '../app/_constants/theme';
import { LANGUAGE_OPTIONS, t, type AppLocale } from '../lib/i18n';

type Props = {
  visible: boolean;
  currentLanguage?: string | null;
  onClose: () => void;
  onSelect: (language: string, locale: AppLocale) => void;
};

export function LanguagePicker({ visible, currentLanguage, onClose, onSelect }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('profile.chooseLanguage')}</Text>
          {LANGUAGE_OPTIONS.map((opt) => {
            const selected = currentLanguage === opt.value || currentLanguage === opt.locale;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => {
                  onSelect(opt.value, opt.locale);
                  onClose();
                }}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {t(opt.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: '#fff', borderRadius: 14, padding: 20 },
  title: { fontFamily: Fonts.semiBold, fontSize: 17, color: Colors.textPrimary, marginBottom: 14 },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  optionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  optionText: { fontFamily: Fonts.medium, fontSize: 15, color: Colors.textPrimary },
  optionTextSelected: { color: Colors.primaryDark },
  cancelBtn: { marginTop: 8, alignItems: 'center', paddingVertical: 10 },
  cancelText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textSecondary },
});
