import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../logger';

const KEY_STORAGE = 'vitaweave_field_enc_key_v1';

async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return AsyncStorage.getItem(key);
  }
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    await AsyncStorage.setItem(key, value);
  }
}

async function storageDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    await AsyncStorage.removeItem(key);
  }
}

function generateKey(): string {
  const bytes = new Uint8Array(32);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Simple XOR + base64 field encryption for local SQLite PHI columns. */
function xorEncode(plain: string, keyHex: string): string {
  const key = keyHex;
  let out = '';
  for (let i = 0; i < plain.length; i++) {
    out += String.fromCharCode(plain.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(unescape(encodeURIComponent(out)));
  }
  // RN fallback
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = unescape(encodeURIComponent(out));
  let result = '';
  for (let i = 0; i < str.length; i += 3) {
    const a = str.charCodeAt(i);
    const b = i + 1 < str.length ? str.charCodeAt(i + 1) : NaN;
    const c = i + 2 < str.length ? str.charCodeAt(i + 2) : NaN;
    const bitmap = (a << 16) | ((Number.isNaN(b) ? 0 : b) << 8) | (Number.isNaN(c) ? 0 : c);
    result +=
      chars.charAt((bitmap >> 18) & 63) +
      chars.charAt((bitmap >> 12) & 63) +
      (Number.isNaN(b) ? '=' : chars.charAt((bitmap >> 6) & 63)) +
      (Number.isNaN(c) ? '=' : chars.charAt(bitmap & 63));
  }
  return result;
}

function xorDecode(encoded: string, keyHex: string): string {
  let decoded = '';
  try {
    if (typeof globalThis.atob === 'function') {
      decoded = decodeURIComponent(escape(globalThis.atob(encoded)));
    } else {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      let str = encoded.replace(/=+$/, '');
      let output = '';
      for (let i = 0; i < str.length; i += 4) {
        const enc1 = chars.indexOf(str.charAt(i));
        const enc2 = chars.indexOf(str.charAt(i + 1));
        const enc3 = chars.indexOf(str.charAt(i + 2));
        const enc4 = chars.indexOf(str.charAt(i + 3));
        const bitmap = (enc1 << 18) | (enc2 << 12) | ((enc3 & 63) << 6) | (enc4 & 63);
        output += String.fromCharCode((bitmap >> 16) & 255);
        if (enc3 !== 64 && str.charAt(i + 2) !== '=') output += String.fromCharCode((bitmap >> 8) & 255);
        if (enc4 !== 64 && str.charAt(i + 3) !== '=') output += String.fromCharCode(bitmap & 255);
      }
      decoded = decodeURIComponent(escape(output));
    }
  } catch {
    return encoded;
  }
  const key = keyHex;
  let out = '';
  for (let i = 0; i < decoded.length; i++) {
    out += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return out;
}

let cachedKey: string | null = null;

export async function getOrCreateFieldKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  let key = await storageGet(KEY_STORAGE);
  if (!key) {
    key = generateKey();
    await storageSet(KEY_STORAGE, key);
    logger.info('Created local field encryption key');
  }
  cachedKey = key;
  return key;
}

export async function encryptField(value: string | null | undefined): Promise<string | null> {
  if (value == null || value === '') return null;
  const key = await getOrCreateFieldKey();
  return `enc:${xorEncode(value, key)}`;
}

export async function decryptField(value: string | null | undefined): Promise<string | null> {
  if (value == null || value === '') return null;
  if (!value.startsWith('enc:')) return value;
  const key = await getOrCreateFieldKey();
  try {
    return xorDecode(value.slice(4), key);
  } catch {
    return null;
  }
}

export async function clearFieldKey(): Promise<void> {
  cachedKey = null;
  await storageDelete(KEY_STORAGE);
}
