import { getPatients, getCommunityAlerts } from './api';
import { getMedGemmaResponse } from './gemini';
import { geminiLanguageInstruction, getLocale } from './i18n';
import type { DashboardTask } from '../app/_constants/data';

export async function generateAITaskSuggestions(): Promise<Omit<DashboardTask, 'id'>[]> {
    try {
        const [patients, alerts] = await Promise.all([
            getPatients(),
            getCommunityAlerts()
        ]);

        const context = `
            PATIENTS:
            ${JSON.stringify(patients.map(p => ({ name: p.name, age: p.age, condition: p.condition, risk: p.riskLevel })))}
            
            COMMUNITY ALERTS:
            ${JSON.stringify(alerts.map(a => ({ title: a.title, severity: a.severity, date: a.date, description: a.description })))}
        `;

        const prompt = `
            ${geminiLanguageInstruction(getLocale())}

            Based on the provided PATIENTS and COMMUNITY ALERTS context, generate 2-3 specific action items (tasks) for a Community Health Worker (ASHA).
            
            Return ONLY a valid JSON array of objects with the following keys. Do not include markdown codeblocks or any other text.
            - title (string): Short action phrase (e.g., "Check on Sunita Devi")
            - subtitle (string): Brief reason (e.g., "High-risk pregnancy followup")
            - priority (string): exactly one of "routine", "today", "urgent"
            - icon (string): exactly one of "calendar", "activity", "heart"
        `;

        const responseText = await getMedGemmaResponse(prompt, context);

        // Clean markdown backticks if Gemini includes them
        const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const tasks: Omit<DashboardTask, 'id'>[] = JSON.parse(cleanedText);

        return tasks;
    } catch (e) {
        console.error("AI Task Generation failed:", e);
        throw e;
    }
}
