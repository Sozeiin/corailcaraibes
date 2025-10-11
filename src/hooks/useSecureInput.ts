import { useState, useCallback } from 'react';
import { sanitizeInput, sanitizeDisplayText, sanitizeBarcode, sanitizeNumber, isValidEmail, isValidPhone } from '@/lib/security';

export type InputType = 'text' | 'email' | 'phone' | 'barcode' | 'number' | 'display';

interface UseSecureInputOptions {
  type?: InputType;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  required?: boolean;
}

interface UseSecureInputReturn {
  value: string;
  setValue: (value: string) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  isValid: boolean;
  error?: string;
  sanitizedValue: string;
}

export function useSecureInput(
  initialValue: string = '',
  options: UseSecureInputOptions = {}
): UseSecureInputReturn {
  const { type = 'text', maxLength, minValue, maxValue, required = false } = options;
  
  const [value, setValueInternal] = useState(initialValue);
  const [error, setError] = useState<string>();

  const sanitizeValue = useCallback((rawValue: string): string => {
    switch (type) {
      case 'barcode':
        return sanitizeBarcode(rawValue);
      case 'display':
        return sanitizeDisplayText(rawValue);
      case 'number':
        return rawValue; // Let sanitizeNumber handle this separately
      case 'text':
      case 'email':
      case 'phone':
        // Pour les champs texte normaux, on garde les espaces simples
        // et on sanitize seulement les caractères dangereux
        return rawValue
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
          .replace(/javascript:/gi, '') // Remove javascript: protocols
          .replace(/vbscript:/gi, ''); // Remove vbscript: protocols
      default:
        return sanitizeInput(rawValue);
    }
  }, [type]);

  const validateValue = useCallback((rawValue: string): { isValid: boolean; error?: string } => {
    if (required && !rawValue.trim()) {
      return { isValid: false, error: 'This field is required' };
    }

    if (maxLength && rawValue.length > maxLength) {
      return { isValid: false, error: `Maximum length is ${maxLength} characters` };
    }

    switch (type) {
      case 'email':
        if (rawValue && !isValidEmail(rawValue)) {
          return { isValid: false, error: 'Please enter a valid email address' };
        }
        break;
      case 'phone':
        if (rawValue && !isValidPhone(rawValue)) {
          return { isValid: false, error: 'Please enter a valid phone number' };
        }
        break;
      case 'number':
        const numValue = parseFloat(rawValue);
        if (rawValue && isNaN(numValue)) {
          return { isValid: false, error: 'Please enter a valid number' };
        }
        if (minValue !== undefined && numValue < minValue) {
          return { isValid: false, error: `Minimum value is ${minValue}` };
        }
        if (maxValue !== undefined && numValue > maxValue) {
          return { isValid: false, error: `Maximum value is ${maxValue}` };
        }
        break;
    }

    return { isValid: true };
  }, [type, maxLength, minValue, maxValue, required]);

  const setValue = useCallback((newValue: string) => {
    const sanitized = sanitizeValue(newValue);
    const validation = validateValue(sanitized);
    
    setValueInternal(sanitized);
    setError(validation.error);
  }, [sanitizeValue, validateValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValue(e.target.value);
  }, [setValue]);

  const sanitizedValue = sanitizeValue(value);
  const validation = validateValue(sanitizedValue);

  return {
    value,
    setValue,
    handleChange,
    isValid: validation.isValid,
    error: validation.error,
    sanitizedValue
  };
}

// Specialized hooks for common use cases
export function useSecureTextInput(initialValue = '', options?: Omit<UseSecureInputOptions, 'type'>) {
  return useSecureInput(initialValue, { ...options, type: 'text' });
}

export function useSecureEmailInput(initialValue = '', options?: Omit<UseSecureInputOptions, 'type'>) {
  return useSecureInput(initialValue, { ...options, type: 'email' });
}

export function useSecurePhoneInput(initialValue = '', options?: Omit<UseSecureInputOptions, 'type'>) {
  return useSecureInput(initialValue, { ...options, type: 'phone' });
}

export function useSecureBarcodeInput(initialValue = '', options?: Omit<UseSecureInputOptions, 'type'>) {
  return useSecureInput(initialValue, { ...options, type: 'barcode' });
}

export function useSecureNumberInput(initialValue = '', options?: Omit<UseSecureInputOptions, 'type'>) {
  return useSecureInput(initialValue, { ...options, type: 'number' });
}