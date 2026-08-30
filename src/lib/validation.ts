/**
 * SmartDine Production Validation Engine
 * Provides strict schemas, types, length, format, UUID, email, phone, restaurant ID, and enum validators.
 */

export interface ValidationRule<T = any> {
  (value: T, fieldName: string): string | null;
}

export const Validators = {
  string: (opts?: { min?: number; max?: number; pattern?: RegExp }): ValidationRule => {
    return (value: any, fieldName: string) => {
      if (typeof value !== 'string') {
        return `${fieldName} must be a string`;
      }
      const trimmed = value.trim();
      if (opts?.min !== undefined && trimmed.length < opts.min) {
        return `${fieldName} must be at least ${opts.min} characters`;
      }
      if (opts?.max !== undefined && trimmed.length > opts.max) {
        return `${fieldName} must not exceed ${opts.max} characters`;
      }
      if (opts?.pattern && !opts.pattern.test(trimmed)) {
        return `${fieldName} is in an invalid format`;
      }
      return null;
    };
  },

  email: (): ValidationRule => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return (value: any, fieldName: string) => {
      if (typeof value !== 'string') return `${fieldName} must be a valid email string`;
      const trimmed = value.trim().toLowerCase();
      if (trimmed.length > 255 || !emailRegex.test(trimmed)) {
        return `${fieldName} must be a valid email address`;
      }
      return null;
    };
  },

  phone: (): ValidationRule => {
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    return (value: any, fieldName: string) => {
      if (typeof value !== 'string') return `${fieldName} must be a valid phone number string`;
      const cleaned = value.replace(/[\s\-\(\)]/g, '');
      if (!phoneRegex.test(cleaned)) {
        return `${fieldName} must be a valid phone number (10 to 15 digits)`;
      }
      return null;
    };
  },

  uuid: (): ValidationRule => {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    return (value: any, fieldName: string) => {
      if (typeof value !== 'string') return `${fieldName} must be a valid UUID string`;
      if (!uuidRegex.test(value.trim())) {
        return `${fieldName} must be a valid UUID`;
      }
      return null;
    };
  },

  restaurantId: (): ValidationRule => {
    const restIdRegex = /^[a-zA-Z0-9_\-]{3,64}$/;
    return (value: any, fieldName: string) => {
      if (typeof value !== 'string') return `${fieldName} must be a valid restaurant ID string`;
      if (!restIdRegex.test(value.trim())) {
        return `${fieldName} must be a valid restaurant identifier (3-64 alphanumeric characters)`;
      }
      return null;
    };
  },

  enum: <T extends string>(allowedValues: readonly T[]): ValidationRule => {
    return (value: any, fieldName: string) => {
      if (!allowedValues.includes(value)) {
        return `${fieldName} must be one of: ${allowedValues.join(', ')}`;
      }
      return null;
    };
  },

  number: (opts?: { min?: number; max?: number; integer?: boolean }): ValidationRule => {
    return (value: any, fieldName: string) => {
      if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
        return `${fieldName} must be a valid number`;
      }
      if (opts?.integer && !Number.isInteger(value)) {
        return `${fieldName} must be an integer`;
      }
      if (opts?.min !== undefined && value < opts.min) {
        return `${fieldName} must be at least ${opts.min}`;
      }
      if (opts?.max !== undefined && value > opts.max) {
        return `${fieldName} must not exceed ${opts.max}`;
      }
      return null;
    };
  },

  boolean: (): ValidationRule => {
    return (value: any, fieldName: string) => {
      if (typeof value !== 'boolean') {
        return `${fieldName} must be a boolean`;
      }
      return null;
    };
  },

  array: (itemValidator?: ValidationRule, opts?: { minLength?: number; maxLength?: number }): ValidationRule => {
    return (value: any, fieldName: string) => {
      if (!Array.isArray(value)) {
        return `${fieldName} must be an array`;
      }
      if (opts?.minLength !== undefined && value.length < opts.minLength) {
        return `${fieldName} must contain at least ${opts.minLength} item(s)`;
      }
      if (opts?.maxLength !== undefined && value.length > opts.maxLength) {
        return `${fieldName} must not exceed ${opts.maxLength} item(s)`;
      }
      if (itemValidator) {
        for (let i = 0; i < value.length; i++) {
          const err = itemValidator(value[i], `${fieldName}[${i}]`);
          if (err) return err;
        }
      }
      return null;
    };
  }
};

export type SchemaDefinition = Record<string, {
  rules: ValidationRule[];
  required?: boolean;
}>;

export function validateSchema(data: any, schema: SchemaDefinition): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Request body must be a non-null object'] };
  }

  for (const [field, config] of Object.entries(schema)) {
    const value = data[field];

    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      if (config.required !== false) {
        errors.push(`${field} is required`);
      }
      continue;
    }

    for (const rule of config.rules) {
      const err = rule(value, field);
      if (err) {
        errors.push(err);
        break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
