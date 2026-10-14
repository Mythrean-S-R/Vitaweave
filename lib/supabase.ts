import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { EnvValidator } from './envValidator';
import { logger } from './logger';

// Environment variables - these MUST be set in .env file
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    const missing = [];
    if (!SUPABASE_URL) missing.push('EXPO_PUBLIC_SUPABASE_URL');
    if (!SUPABASE_ANON_KEY) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
    
    const errorMessage = `Missing Supabase environment variables: ${missing.join(', ')}. Please set these in your .env file`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
}

// Additional validation (required vars only)
const envValidation = EnvValidator.validateEnvironment();
if (!envValidation.isValid) {
    const details = [
        ...envValidation.missingVars.map((v) => `Missing: ${v}`),
        ...envValidation.invalidVars.map((v) => `Invalid: ${v}`),
    ].join('; ');
    logger.error('Environment validation failed:', envValidation);
    throw new Error(`Invalid environment configuration. ${details}`);
}

const recommendedWarnings = EnvValidator.getRecommendedWarnings();
for (const warning of recommendedWarnings) {
    logger.warn(warning);
}
for (const warning of EnvValidator.getResidencyWarnings()) {
    logger.warn(warning);
}

logger.info('Supabase client initialized successfully');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
