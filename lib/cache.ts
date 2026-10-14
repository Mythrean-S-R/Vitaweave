import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@vitaweave_cache_';

export async function setCached(key: string, data: any) {
    try {
        const jsonValue = JSON.stringify({
            data,
            timestamp: Date.now(),
        });
        await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, jsonValue);
    } catch (e) {
        console.error('Error caching data:', e);
    }
}

export async function getCached<T>(key: string, maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<T | null> {
    try {
        const jsonValue = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
        if (!jsonValue) return null;

        const parsed = JSON.parse(jsonValue);
        const age = Date.now() - parsed.timestamp;

        if (age > maxAgeMs) {
            // Data too old, but better than nothing in rural areas? 
            // For now, let's keep it but returning null optionally.
            console.warn(`Cache for ${key} is old (${Math.round(age / 3600000)}h)`);
        }

        return parsed.data as T;
    } catch (e) {
        console.error('Error reading cache:', e);
        return null;
    }
}

export async function clearCache() {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
        await AsyncStorage.multiRemove(cacheKeys);
    } catch (e) {
        console.error('Error clearing cache:', e);
    }
}
