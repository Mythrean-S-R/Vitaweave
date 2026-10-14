import { fetchCommunityHealthSignals } from '../lib/firecrawl';

describe('Firecrawl Integration', () => {
  test('Health signals fetching', async () => {
    const signals = await fetchCommunityHealthSignals('Karnataka');
    expect(Array.isArray(signals)).toBe(true);
    expect(signals.length).toBeGreaterThan(0);
  });

  test('Fallback data when API unavailable', async () => {
    // Mock no API key
    process.env.EXPO_PUBLIC_FIRECRAWL_API_KEY = '';
    const signals = await fetchCommunityHealthSignals();
    expect(signals).toBeDefined();
    expect(signals.length).toBe(3); // Fallback has 3 alerts
  });
});