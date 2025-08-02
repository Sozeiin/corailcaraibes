/**
 * Secure storage utility for handling sensitive data in localStorage
 */

const STORAGE_KEYS = {
  REMEMBERED_EMAIL: 'fleetcat_remembered_email',
  REMEMBER_ME: 'fleetcat_remember_me',
} as const;

/**
 * Simple encryption/decryption for storing email securely
 * Note: This is basic obfuscation, not true encryption
 */
const encode = (str: string): string => {
  return btoa(encodeURIComponent(str));
};

const decode = (str: string): string => {
  try {
    return decodeURIComponent(atob(str));
  } catch {
    return '';
  }
};

export const secureStorage = {
  /**
   * Save email to localStorage if remember me is enabled
   */
  saveRememberedEmail: (email: string, remember: boolean): void => {
    if (remember) {
      localStorage.setItem(STORAGE_KEYS.REMEMBERED_EMAIL, encode(email));
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.REMEMBERED_EMAIL);
      localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
    }
  },

  /**
   * Get remembered email from localStorage
   */
  getRememberedEmail: (): string => {
    const isRemembered = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
    if (!isRemembered) return '';

    const encodedEmail = localStorage.getItem(STORAGE_KEYS.REMEMBERED_EMAIL);
    if (!encodedEmail) return '';

    return decode(encodedEmail);
  },

  /**
   * Check if remember me is enabled
   */
  isRememberMeEnabled: (): boolean => {
    return localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
  },

  /**
   * Clear all remembered data
   */
  clearRememberedData: (): void => {
    localStorage.removeItem(STORAGE_KEYS.REMEMBERED_EMAIL);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
  },
};