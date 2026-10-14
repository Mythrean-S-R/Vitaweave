// Input validation and sanitization utilities
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: any;
}

export class InputValidator {
  // Email validation
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || email.trim().length === 0) {
      errors.push('Email is required');
    } else if (!emailRegex.test(email.trim())) {
      errors.push('Invalid email format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: email?.trim().toLowerCase(),
    };
  }

  // Name validation (for patient names, etc.)
  static validateName(name: string, fieldName: string = 'Name'): ValidationResult {
    const errors: string[] = [];
    
    if (!name || name.trim().length === 0) {
      errors.push(`${fieldName} is required`);
    } else {
      const trimmedName = name.trim();
      if (trimmedName.length < 2) {
        errors.push(`${fieldName} must be at least 2 characters`);
      }
      if (trimmedName.length > 100) {
        errors.push(`${fieldName} must be less than 100 characters`);
      }
      if (!/^[a-zA-Z\s\-'.]+$/.test(trimmedName)) {
        errors.push(`${fieldName} can only contain letters, spaces, hyphens, and apostrophes`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: name?.trim(),
    };
  }

  // Age validation
  static validateAge(age: string | number): ValidationResult {
    const errors: string[] = [];
    let ageNum: number;

    if (typeof age === 'string') {
      ageNum = parseInt(age, 10);
      if (isNaN(ageNum)) {
        errors.push('Age must be a valid number');
        return { isValid: false, errors };
      }
    } else {
      ageNum = age;
    }

    if (ageNum < 0) {
      errors.push('Age cannot be negative');
    } else if (ageNum > 150) {
      errors.push('Age must be realistic (0-150)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: ageNum,
    };
  }

  // Medical text validation (symptoms, conditions, etc.)
  static validateMedicalText(text: string, fieldName: string = 'Medical text'): ValidationResult {
    const errors: string[] = [];
    
    if (!text || text.trim().length === 0) {
      errors.push(`${fieldName} is required`);
    } else {
      const trimmedText = text.trim();
      if (trimmedText.length < 3) {
        errors.push(`${fieldName} must be at least 3 characters`);
      }
      if (trimmedText.length > 1000) {
        errors.push(`${fieldName} must be less than 1000 characters`);
      }
      
      // Basic XSS prevention
      if (/<script|javascript:|on\w+=/i.test(trimmedText)) {
        errors.push(`${fieldName} contains invalid characters`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: text?.trim(),
    };
  }

  // Phone number validation (Indian format)
  static validatePhone(phone: string): ValidationResult {
    const errors: string[] = [];
    
    if (!phone || phone.trim().length === 0) {
      errors.push('Phone number is required');
    } else {
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        errors.push('Invalid Indian phone number format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: phone?.replace(/[\s\-\(\)]/g, ''),
    };
  }

  // Generic text sanitization
  static sanitizeText(text: string): string {
    if (!text) return '';
    
    return text
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript protocol
      .replace(/on\w+=/gi, ''); // Remove event handlers
  }

  // Validate patient data object
  static validatePatientData(data: any): ValidationResult {
    const errors: string[] = [];
    
    // Validate required fields
    const nameValidation = this.validateName(data.name, 'Patient name');
    if (!nameValidation.isValid) {
      errors.push(...nameValidation.errors);
    }

    const ageValidation = this.validateAge(data.age);
    if (!ageValidation.isValid) {
      errors.push(...ageValidation.errors);
    }

    if (data.phone) {
      const phoneValidation = this.validatePhone(data.phone);
      if (!phoneValidation.isValid) {
        errors.push(...phoneValidation.errors);
      }
    }

    if (data.condition) {
      const conditionValidation = this.validateMedicalText(data.condition, 'Medical condition');
      if (!conditionValidation.isValid) {
        errors.push(...conditionValidation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: {
        ...data,
        name: nameValidation.sanitizedValue,
        age: ageValidation.sanitizedValue,
        phone: data.phone ? this.validatePhone(data.phone).sanitizedValue : undefined,
        condition: data.condition ? this.validateMedicalText(data.condition).sanitizedValue : undefined,
      },
    };
  }
}
