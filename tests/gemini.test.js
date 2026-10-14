import { getMedGemmaResponse } from '../lib/gemini';

describe('Gemini AI Integration', () => {
  test('AI response generation', async () => {
    const response = await getMedGemmaResponse('What are the symptoms of dengue?');
    expect(response).toBeDefined();
    expect(response.length).toBeGreaterThan(50);
  });

  test('Medical context handling', async () => {
    const response = await getMedGemmaResponse('Patient has fever and rash');
    expect(response.toLowerCase()).toContain('fever');
    expect(response.toLowerCase()).toContain('rash');
  });
});