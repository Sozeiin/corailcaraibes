// Security utilities for input sanitization and validation

/**
 * Sanitizes user input to prevent XSS attacks
 * Removes potentially dangerous HTML/JavaScript patterns
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove JavaScript event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: protocols
    .replace(/javascript:/gi, '')
    // Remove data: protocols (except safe image types)
    .replace(/data:(?!image\/(png|jpe?g|gif|webp|svg\+xml))[^;]*;/gi, '')
    // Remove vbscript: protocols
    .replace(/vbscript:/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitizes text that will be displayed as HTML content
 * More strict than sanitizeInput - removes all HTML
 */
export function sanitizeDisplayText(text: string): string {
  if (typeof text !== 'string') return '';
  
  return text
    // Remove all HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode HTML entities to prevent double encoding
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&amp;/g, '&')
    // Re-encode for safe display
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Validates and sanitizes barcode/reference input
 * Only allows alphanumeric characters, dashes, dots, and underscores
 */
export function sanitizeBarcode(barcode: string): string {
  if (typeof barcode !== 'string') return '';
  
  return barcode
    .trim()
    .replace(/[^A-Za-z0-9\-_.]/g, '')
    .substring(0, 50); // Limit length
}

/**
 * Validates and sanitizes numeric input
 */
export function sanitizeNumber(value: string | number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num) || !isFinite(num)) {
    return min;
  }
  
  return Math.max(min, Math.min(max, num));
}

/**
 * Validates email format (basic validation)
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validates phone number format (basic validation)
 */
export function isValidPhone(phone: string): boolean {
  if (typeof phone !== 'string') return false;
  
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Should have between 10-15 digits
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}

/**
 * Sanitizes URL input to prevent dangerous protocols
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') return '';
  
  const trimmed = url.trim();
  
  // Allow only safe protocols
  const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
  
  try {
    const urlObj = new URL(trimmed);
    if (!safeProtocols.includes(urlObj.protocol)) {
      return '';
    }
    return urlObj.toString();
  } catch {
    // If not a valid URL, check if it's a relative path
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
      return trimmed;
    }
    return '';
  }
}

/**
 * Creates secure DOM elements instead of using innerHTML
 */
export function createSecureElement(
  tagName: string, 
  textContent: string, 
  className?: string,
  attributes?: Record<string, string>
): HTMLElement {
  const element = document.createElement(tagName);
  
  // Use textContent to prevent XSS
  element.textContent = sanitizeDisplayText(textContent);
  
  if (className) {
    element.className = className;
  }
  
  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      // Only allow safe attributes
      const safeAttributes = ['id', 'class', 'title', 'alt', 'role', 'aria-label'];
      if (safeAttributes.includes(key)) {
        element.setAttribute(key, sanitizeInput(value));
      }
    });
  }
  
  return element;
}

/**
 * Rate limiting utility for preventing abuse
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private maxRequests: number = 10,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }
    
    const requests = this.requests.get(identifier)!;
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => time > windowStart);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }
  
  reset(identifier?: string): void {
    if (identifier) {
      this.requests.delete(identifier);
    } else {
      this.requests.clear();
    }
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter();