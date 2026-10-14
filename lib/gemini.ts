import { GoogleGenerativeAI } from '@google/generative-ai';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';
import { proxyGeminiRequest } from './edgeClient';
import { geminiLanguageInstruction, getLocale } from './i18n';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const API_KEY_STORAGE_KEY = 'gemini_api_key';

function getCandidateModels(): string[] {
    const configured = process.env.EXPO_PUBLIC_GEMINI_MODEL;
    const candidates = [
        configured,
        DEFAULT_MODEL,
        'gemini-2.5-flash-lite',
        'gemini-flash-latest',
    ].filter(Boolean) as string[];

    // Filter out retired/deprecated model names that return 404 on v1beta
    const valid = candidates.filter(
        (m) => m !== 'gemini-1.5-flash' && m !== 'gemini-1.5-pro' && m !== 'gemini-1.0-pro'
    );
    return valid.length > 0 ? [...new Set(valid)] : [DEFAULT_MODEL, 'gemini-2.5-flash-lite'];
}

const MEDGEMMA_SYSTEM_PROMPT = `
You are MedGemma, a specialized AI medical assistant for the VitaWeave community health app.
Your users are Community Health Workers (CHWs) and Doctors in rural India.

tone: Professional, empathetic, concise, and clinically accurate.
role: Assist with triage, suggest differential diagnoses, explain medical concepts, and provide public health guidance.
safety: Always include a disclaimer for critical cases: "Please verify with a specialist."
context: You have access to patient data provided in the prompt. Use it to tailor your advice.
`;

let genAI: GoogleGenerativeAI | null = null;

export const initializeGemini = async (apiKey: string) => {
    genAI = new GoogleGenerativeAI(apiKey);
    await AsyncStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
};

export const getStoredApiKey = async () => {
    return await AsyncStorage.getItem(API_KEY_STORAGE_KEY);
};

async function ensureGenAI(): Promise<GoogleGenerativeAI> {
    const envKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    const apiKey = (await getStoredApiKey()) || envKey;

    if (!apiKey) {
        throw new Error('API Key not found. Configure EXPO_PUBLIC_GEMINI_API_KEY or set a key in the app.');
    }

    if (!genAI) {
        genAI = new GoogleGenerativeAI(apiKey);
    }

    return genAI;
}

async function ensureLocalModel(modelName = getCandidateModels()[0]) {
    const ai = await ensureGenAI();
    return ai.getGenerativeModel({ model: modelName });
}

async function getMedGemmaResponseLocal(prompt: string, context?: string): Promise<string> {
    const ai = await ensureGenAI();

    let fullPrompt = `${MEDGEMMA_SYSTEM_PROMPT}\n\n`;
    if (context) fullPrompt += `CONTEXT:\n${context}\n\n`;
    fullPrompt += `USER QUERY: ${prompt}`;

    const modelsToTry = getCandidateModels();
    let lastError: any = null;

    for (const modelName of modelsToTry) {
        try {
            const model = ai.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            return response.text();
        } catch (err: any) {
            lastError = err;
            logger.warn(`Gemini model ${modelName} call failed, trying fallback:`, err?.message || err);
        }
    }

    throw lastError || new Error('All Gemini model candidates failed.');
}

async function getMedGemmaVisionLocal(
    prompt: string,
    base64: string,
    mimeType: string,
    context?: string
): Promise<string> {
    const ai = await ensureGenAI();
    let fullPrompt = `${MEDGEMMA_SYSTEM_PROMPT}\n\n`;
    if (context) fullPrompt += `CONTEXT:\n${context}\n\n`;
    fullPrompt += `USER QUERY: ${prompt}`;

    const clean = base64.replace(/^data:[^;]+;base64,/, '');
    const parts = [
        { text: fullPrompt },
        { inlineData: { data: clean, mimeType } },
    ];

    const modelsToTry = getCandidateModels();
    let lastError: any = null;

    for (const modelName of modelsToTry) {
        try {
            const model = ai.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(parts);
            const response = await result.response;
            return response.text();
        } catch (err: any) {
            lastError = err;
            logger.warn(`Gemini vision model ${modelName} call failed, trying fallback:`, err?.message || err);
        }
    }

    throw lastError || new Error('All Gemini vision model candidates failed.');
}

/**
 * Prefer secure Supabase Edge Function proxy; fall back to direct client call in dev.
 */
export async function getMedGemmaResponse(prompt: string, context?: string, locale = getLocale()): Promise<string> {
    const languageLine = geminiLanguageInstruction(locale);
    const useProxy = process.env.EXPO_PUBLIC_USE_EDGE_PROXY !== 'false';

    if (useProxy) {
        try {
            return await proxyGeminiRequest({ prompt, context, language: languageLine });
        } catch (error) {
            logger.warn('Gemini edge proxy unavailable, falling back to client key:', error);
        }
    }

    try {
        return await getMedGemmaResponseLocal(`${languageLine}\n\n${prompt}`, context);
    } catch (error: any) {
        logger.error('Gemini API Error:', error);
        return `⚠️ MedGemma Error: ${error.message || 'Unable to connect to AI service.'}`;
    }
}

/**
 * Multimodal OCR / report extract via Gemini vision (edge proxy preferred).
 * Assistive only - clinician must verify extracted text.
 */
export async function getMedGemmaVisionResponse(
    prompt: string,
    base64: string,
    mimeType: string,
    context?: string,
    locale = getLocale()
): Promise<string> {
    const languageLine = geminiLanguageInstruction(locale);
    const useProxy = process.env.EXPO_PUBLIC_USE_EDGE_PROXY !== 'false';

    if (useProxy) {
        try {
            return await proxyGeminiRequest({
                prompt,
                context,
                language: languageLine,
                image: { base64, mimeType },
            });
        } catch (error) {
            logger.warn('Gemini vision proxy unavailable, falling back to client key:', error);
        }
    }

    try {
        return await getMedGemmaVisionLocal(
            `${languageLine}\n\n${prompt}`,
            base64,
            mimeType,
            context
        );
    } catch (error: any) {
        logger.error('Gemini vision API Error:', error);
        throw new Error(error.message || 'Unable to extract text from image.');
    }
}
