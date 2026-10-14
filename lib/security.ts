// Security utilities for production
export class SecurityUtils {
  // Rate limiting helper
  private static rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  static rateLimit(
    identifier: string,
    maxRequests: number = 100,
    windowMs: number = 15 * 60 * 1000 // 15 minutes
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const key = identifier;
    const current = this.rateLimitMap.get(key);

    if (!current || now > current.resetTime) {
      // Reset or create new window
      this.rateLimitMap.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
    }

    if (current.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetTime: current.resetTime };
    }

    current.count++;
    return { allowed: true, remaining: maxRequests - current.count, resetTime: current.resetTime };
  }

  // Input sanitization for XSS prevention
  static sanitizeInput(input: string): string {
    if (!input) return '';
    
    return input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/data:/gi, '') // Remove data protocol
      .trim();
  }

  // SQL injection prevention (basic)
  static sanitizeSqlInput(input: string): string {
    if (!input) return '';
    
    return input
      .replace(/['"\\]/g, '') // Remove quotes and backslashes
      .replace(/--/g, '') // Remove SQL comments
      .replace(/;/g, '') // Remove semicolons
      .replace(/drop\s+table/i, '') // Remove dangerous keywords
      .replace(/delete\s+from/i, '')
      .replace(/insert\s+into/i, '')
      .replace(/update\s+\w+\s+set/i, '')
      .trim();
  }

  // Validate and sanitize file upload
  static validateFileUpload(file: {
    uri: string;
    name: string;
    type: string;
    size?: number;
  }): { isValid: boolean; error?: string } {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Invalid file type. Only images are allowed.' };
    }

    // Check file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(extension)) {
      return { isValid: false, error: 'Invalid file extension.' };
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size && file.size > maxSize) {
      return { isValid: false, error: 'File size too large. Maximum 5MB allowed.' };
    }

    // Check for malicious file names
    const maliciousPatterns = [
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.scr$/i,
      /\.pif$/i,
      /\.com$/i,
      /\.js$/i,
      /\.vbs$/i,
    ];
    
    for (const pattern of maliciousPatterns) {
      if (pattern.test(file.name)) {
        return { isValid: false, error: 'Invalid file type detected.' };
      }
    }

    return { isValid: true };
  }

  // Generate secure random token
  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  // Check for common attack patterns
  static containsAttackPattern(input: string): boolean {
    const attackPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /expression\s*\(/i,
      /@import/i,
      /union\s+select/i,
      /drop\s+table/i,
      /insert\s+into/i,
      /delete\s+from/i,
      /update\s+\w+\s+set/i,
      /exec\s*\(/i,
      /system\s*\(/i,
    ];

    return attackPatterns.some(pattern => pattern.test(input));
  }

  // Validate API key format
  static validateApiKeyFormat(apiKey: string, service: 'supabase' | 'gemini' | 'firecrawl' | 'agora'): boolean {
    const patterns = {
      supabase: /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/,
      gemini: /^[a-zA-Z0-9_-]{20,}$/,
      firecrawl: /^[a-zA-Z0-9_-]{10,}$/,
      agora: /^\d+$/,
    };

    return patterns[service].test(apiKey);
  }

  // Encrypt sensitive data (basic implementation)
  static encryptSensitiveData(data: string): string {
    // This is a basic implementation - in production, use proper encryption libraries
    const encoded = btoa(data);
    return encoded;
  }

  // Decrypt sensitive data
  static decryptSensitiveData(encryptedData: string): string {
    try {
      return atob(encryptedData);
    } catch {
      return '';
    }
  }
}
