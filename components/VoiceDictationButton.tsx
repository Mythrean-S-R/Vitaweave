import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Mic, MicOff } from 'lucide-react-native';
import {
  startVoiceInput,
  isVoiceRecognitionAvailable,
  voiceRecognitionService,
} from '../lib/voiceRecognition';
import { Fonts } from '../app/_constants/theme';

type Props = {
  onTranscript: (text: string) => void;
  label?: string;
};

export function VoiceDictationButton({ onTranscript, label = 'Voice' }: Props) {
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (listening) {
      voiceRecognitionService.stopListening();
      setListening(false);
      return;
    }
    if (!isVoiceRecognitionAvailable()) {
      Alert.alert('Voice unavailable', 'Speech recognition needs a native build or web browser support.');
      return;
    }
    setBusy(true);
    const ok = await startVoiceInput(
      (text) => {
        if (text) onTranscript(text);
        setListening(false);
        setBusy(false);
      },
      (error) => {
        Alert.alert('Voice error', error);
        setListening(false);
        setBusy(false);
      }
    );
    setBusy(false);
    if (ok) setListening(true);
  };

  return (
    <TouchableOpacity
      style={[styles.btn, listening && styles.btnActive]}
      onPress={toggle}
      disabled={busy}>
      {busy ? (
        <ActivityIndicator size="small" color="#0891b2" />
      ) : listening ? (
        <MicOff size={16} color="#fff" />
      ) : (
        <Mic size={16} color="#0891b2" />
      )}
      <Text style={[styles.text, listening && styles.textActive]}>
        {listening ? 'Stop' : label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0891b2',
    backgroundColor: '#ecfeff',
  },
  btnActive: { backgroundColor: '#0891b2', borderColor: '#0891b2' },
  text: { fontFamily: Fonts.medium, fontSize: 12, color: '#0891b2' },
  textActive: { color: '#fff' },
});
