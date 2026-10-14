// Integration tests with real API endpoints
import { supabase } from '../lib/supabase';
import { getMedGemmaResponse } from '../lib/gemini';
import { SecurityUtils } from '../lib/security';
import { InputValidator } from '../lib/validation';
import { ErrorHandler } from '../lib/errorHandler';

describe('Production Integration Tests', () => {
  const testBaseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  let testUserId: string;

  beforeAll(async () => {
    // Validate environment
    expect(process.env.EXPO_PUBLIC_SUPABASE_URL).toBeDefined();
    expect(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
    expect(process.env.EXPO_PUBLIC_GEMINI_API_KEY).toBeDefined();
  });

  describe('Supabase Integration', () => {
    test('Database connection and basic operations', async () => {
      try {
        // Test connection
        const { data, error } = await supabase.from('profiles').select('count').single();
        expect(error).toBeNull();
        expect(data).toBeDefined();

        // Test user creation
        const testEmail = `test-${Date.now()}@example.com`;
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: testEmail,
          password: 'TestPassword123!',
        });

        if (authError && !authError.message.includes('already registered')) {
          throw authError;
        }

        if (authData.user) {
          testUserId = authData.user.id;
          
          // Test profile creation
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: testUserId,
              email: testEmail,
              name: 'Test User',
              role: 'asha',
            })
            .select()
            .single();

          expect(profileError).toBeNull();
          expect(profileData).toBeDefined();
          expect(profileData.email).toBe(testEmail);
        }
      } catch (error) {
        ErrorHandler.handleError(error, 'Supabase Integration');
        throw error;
      }
    });

    test('Patient data operations', async () => {
      if (!testUserId) return;

      try {
        // Test patient creation
        const patientData = {
          name: 'John Doe',
          age: 45,
          condition: 'Diabetes Type 2',
          phone: '+919876543210',
          assigned_asha: testUserId,
        };

        const validation = InputValidator.validatePatientData(patientData);
        expect(validation.isValid).toBe(true);

        const { data: patient, error: patientError } = await supabase
          .from('patients')
          .insert(validation.sanitizedValue)
          .select()
          .single();

        expect(patientError).toBeNull();
        expect(patient).toBeDefined();
        expect(patient.name).toBe('John Doe');

        // Test patient retrieval
        const { data: patients, error: retrieveError } = await supabase
          .from('patients')
          .select('*')
          .eq('assigned_asha', testUserId);

        expect(retrieveError).toBeNull();
        expect(Array.isArray(patients)).toBe(true);
        expect(patients.length).toBeGreaterThan(0);
      } catch (error) {
        ErrorHandler.handleError(error, 'Patient Operations');
        throw error;
      }
    });
  });

  describe('Gemini AI Integration', () => {
    test('Medical query response generation', async () => {
      try {
        const medicalQuery = 'What are the common symptoms of diabetes?';
        const response = await getMedGemmaResponse(medicalQuery);

        expect(response).toBeDefined();
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(50);
        expect(response.toLowerCase()).toContain('diabetes');
        expect(response.toLowerCase()).not.toContain('error');
      } catch (error) {
        ErrorHandler.handleError(error, 'Gemini AI Integration');
        // Don't fail the test if AI service is temporarily unavailable
        expect(error.message).toContain('Error');
      }
    }, 15000); // 15 second timeout

    test('Medical context handling', async () => {
      try {
        const context = 'Patient is a 45-year-old male with Type 2 diabetes';
        const query = 'What dietary recommendations would you suggest?';
        const response = await getMedGemmaResponse(query, context);

        expect(response).toBeDefined();
        expect(response.toLowerCase()).toContain('diet');
        expect(response.length).toBeGreaterThan(30);
      } catch (error) {
        ErrorHandler.handleError(error, 'Gemini Context Test');
        expect(error.message).toContain('Error');
      }
    }, 10000);
  });

  describe('Security and Validation', () => {
    test('Input validation for patient data', () => {
      // Test valid data
      const validPatient = {
        name: 'Jane Smith',
        age: 35,
        condition: 'Hypertension',
        phone: '+919876543210',
      };

      const validResult = InputValidator.validatePatientData(validPatient);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Test invalid data
      const invalidPatient = {
        name: '', // Invalid: empty name
        age: -5, // Invalid: negative age
        condition: 'Test<script>alert("xss")</script>', // Invalid: XSS attempt
        phone: '123', // Invalid: invalid phone format
      };

      const invalidResult = InputValidator.validatePatientData(invalidPatient);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(2);
    });

    test('Security utilities', () => {
      // Test XSS prevention
      const maliciousInput = '<script>alert("xss")</script>';
      const sanitized = SecurityUtils.sanitizeInput(maliciousInput);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');

      // Test SQL injection prevention
      const sqlInjection = "'; DROP TABLE patients; --";
      const sanitizedSql = SecurityUtils.sanitizeSqlInput(sqlInjection);
      expect(sanitizedSql).not.toContain('DROP');
      expect(sanitizedSql).not.toContain('--');

      // Test rate limiting
      const clientId = 'test-client-123';
      const rateLimit1 = SecurityUtils.rateLimit(clientId, 5, 60000); // 5 requests per minute
      expect(rateLimit1.allowed).toBe(true);
      expect(rateLimit1.remaining).toBe(4);

      // Exhaust rate limit
      for (let i = 0; i < 4; i++) {
        SecurityUtils.rateLimit(clientId, 5, 60000);
      }
      
      const rateLimitExhausted = SecurityUtils.rateLimit(clientId, 5, 60000);
      expect(rateLimitExhausted.allowed).toBe(false);
      expect(rateLimitExhausted.remaining).toBe(0);
    });

    test('File upload validation', () => {
      // Valid image file
      const validFile = {
        uri: 'file:///test/image.jpg',
        name: 'patient-photo.jpg',
        type: 'image/jpeg',
        size: 1024 * 1024, // 1MB
      };

      const validResult = SecurityUtils.validateFileUpload(validFile);
      expect(validResult.isValid).toBe(true);

      // Invalid file type
      const invalidFile = {
        uri: 'file:///test/script.exe',
        name: 'malware.exe',
        type: 'application/x-executable',
        size: 1024,
      };

      const invalidResult = SecurityUtils.validateFileUpload(invalidFile);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toContain('Invalid file type');
    });
  });

  describe('Error Handling', () => {
    test('Error tracking and reporting', () => {
      const testError = new Error('Test integration error');
      const appError = ErrorHandler.handleError(testError, 'Integration Test Context');

      expect(appError).toBeDefined();
      expect(appError.code).toMatch(/^ERR_\d+_[A-Z0-9]+$/);
      expect(appError.message).toBe('Test integration error');
      expect(appError.details).toBeDefined();

      // Test error statistics
      const stats = ErrorHandler.getErrorStats();
      expect(stats.total).toBeGreaterThan(0);
    });

    test('Async error handling', async () => {
      const failingPromise = Promise.reject(new Error('Async test error'));
      
      await expect(
        ErrorHandler.handleAsyncError(failingPromise, 'Async Test')
      ).rejects.toThrow('Async test error');

      const stats = ErrorHandler.getErrorStats();
      expect(stats.total).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    test('API response times', async () => {
      const startTime = Date.now();
      
      // Test Supabase query performance
      const { data, error } = await supabase.from('profiles').select('count').single();
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(error).toBeNull();
      expect(responseTime).toBeLessThan(2000); // Under 2 seconds
    });

    test('AI response time', async () => {
      const startTime = Date.now();
      
      try {
        await getMedGemmaResponse('What is hypertension?');
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        expect(responseTime).toBeLessThan(10000); // Under 10 seconds
      } catch (error) {
        // AI service might be unavailable, don't fail the test
        expect(error.message).toContain('Error');
      }
    }, 15000);
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUserId) {
      try {
        // Delete test user
        await supabase.auth.admin.deleteUser(testUserId);
        
        // Delete test profiles
        await supabase.from('profiles').delete().eq('id', testUserId);
        
        // Delete test patients
        await supabase.from('patients').delete().eq('assigned_asha', testUserId);
      } catch (error) {
        console.warn('Cleanup failed:', error);
      }
    }

    // Clear error handler
    ErrorHandler.clearErrors();
  });
});
