import { supabase } from './supabase';
import { getMedGemmaResponse } from './gemini';

export type SyntheticPatientRecord = {
  name: string;
  age: number;
  condition: string;
  status: 'Active' | 'Stable' | 'Critical';
  risk_level: 'Low' | 'Medium' | 'High';
  phone: string;
  image_url: string;
  last_visit: string;
  follow_up_due: string;
  follow_up_urgent: boolean;
  created_at: string;
  updated_at: string;
};

export type SyntheticAlertRecord = {
  title: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High';
  date: string;
  icon: string;
  created_at: string;
  updated_at: string;
};

export type SyntheticSymptomRecord = {
  symptom: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
  ward: string;
  created_at: string;
  updated_at: string;
};

const SIMULATOR_PROMPT = `You are a synthetic patient generator for a rural Indian health sandbox. Return only valid JSON with the requested fields. Do not include markdown, explanation, or extra text.`;

function normalizeJSON<T>(text: string): T {
  const cleaned = text.replace(/```/g, '').trim();
  return JSON.parse(cleaned) as T;
}

export async function generateSyntheticPatient(): Promise<SyntheticPatientRecord> {
  const prompt = `${SIMULATOR_PROMPT}\n\nGenerate one synthetic patient record with these fields:\n- name\n- age\n- condition\n- status\n- risk_level\n- phone\n- image_url\n- last_visit\n- follow_up_due\n- follow_up_urgent\n- created_at\n- updated_at\n`;
  const response = await getMedGemmaResponse(prompt);
  return normalizeJSON<SyntheticPatientRecord>(response);
}

export async function generateSyntheticAlert(): Promise<SyntheticAlertRecord> {
  const prompt = `${SIMULATOR_PROMPT}\n\nGenerate one synthetic community alert record with these fields:\n- title\n- description\n- severity\n- date\n- icon\n- created_at\n- updated_at\n`;
  const response = await getMedGemmaResponse(prompt);
  return normalizeJSON<SyntheticAlertRecord>(response);
}

export async function generateSyntheticSymptomReport(): Promise<SyntheticSymptomRecord> {
  const prompt = `${SIMULATOR_PROMPT}\n\nGenerate one synthetic symptom report with these fields:\n- symptom\n- count\n- trend\n- ward\n- created_at\n- updated_at\n`;
  const response = await getMedGemmaResponse(prompt);
  return normalizeJSON<SyntheticSymptomRecord>(response);
}

export async function seedSyntheticSandbox(options: { patients?: number; alerts?: number; symptoms?: number } = { patients: 3, alerts: 2, symptoms: 3 }) {
  const createdAt = new Date().toISOString();

  const patients: SyntheticPatientRecord[] = [];
  for (let i = 0; i < (options.patients ?? 3); i += 1) {
    const patient = await generateSyntheticPatient();
    patients.push({ ...patient, created_at: patient.created_at || createdAt, updated_at: patient.updated_at || createdAt });
  }

  const alerts: SyntheticAlertRecord[] = [];
  for (let i = 0; i < (options.alerts ?? 2); i += 1) {
    const alert = await generateSyntheticAlert();
    alerts.push({ ...alert, created_at: alert.created_at || createdAt, updated_at: alert.updated_at || createdAt });
  }

  const symptoms: SyntheticSymptomRecord[] = [];
  for (let i = 0; i < (options.symptoms ?? 3); i += 1) {
    const symptom = await generateSyntheticSymptomReport();
    symptoms.push({ ...symptom, created_at: symptom.created_at || createdAt, updated_at: symptom.updated_at || createdAt });
  }

  const [patientInsert, alertInsert, symptomInsert] = await Promise.all([
    supabase.from('patients').insert(patients),
    supabase.from('community_alerts').insert(alerts),
    supabase.from('symptom_reports').insert(symptoms),
  ]);

  return {
    patients: patientInsert,
    alerts: alertInsert,
    symptoms: symptomInsert,
  };
}
