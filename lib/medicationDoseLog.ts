import AsyncStorage from '@react-native-async-storage/async-storage';

const DOSE_LOG_KEY = '@vitaweave_med_doses';

type DoseLog = Record<string, boolean>;

function doseKey(reminderId: string, timeSlot: string, date: string): string {
  return `${reminderId}:${timeSlot}:${date}`;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function readLog(): Promise<DoseLog> {
  try {
    const raw = await AsyncStorage.getItem(DOSE_LOG_KEY);
    return raw ? (JSON.parse(raw) as DoseLog) : {};
  } catch {
    return {};
  }
}

async function writeLog(log: DoseLog): Promise<void> {
  await AsyncStorage.setItem(DOSE_LOG_KEY, JSON.stringify(log));
}

export async function isDoseTakenToday(reminderId: string, timeSlot: string): Promise<boolean> {
  const log = await readLog();
  return Boolean(log[doseKey(reminderId, timeSlot, todayKey())]);
}

export async function markDoseTakenToday(reminderId: string, timeSlot: string): Promise<void> {
  const log = await readLog();
  log[doseKey(reminderId, timeSlot, todayKey())] = true;
  await writeLog(log);
}

export async function clearStaleDoseLogs(): Promise<void> {
  const log = await readLog();
  const today = todayKey();
  const next: DoseLog = {};
  for (const [key, value] of Object.entries(log)) {
    if (key.endsWith(`:${today}`)) next[key] = value;
  }
  await writeLog(next);
}
