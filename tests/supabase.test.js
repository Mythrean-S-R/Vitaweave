import { supabase } from '../lib/supabase';

describe('Supabase Integration', () => {
  test('Database connection', async () => {
    const { data, error } = await supabase.from('profiles').select('count').single();
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  test('Authentication flow', async () => {
    // Test user registration
    const { data, error } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'testpassword123'
    });
    expect(error).toBeNull();
    expect(data.user).toBeDefined();
  });
});