/**
 * Email Identity Validation, Sanitization & PII Masking Utilities
 * Protects mail user identities across UI views, shared packhouse kiosks, and cloud writes.
 */

export type SessionSecurityMode = 'personal_persistent' | 'shared_session_only';

const STRICT_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const FORBIDDEN_INPUT_CHARS = /[<>'"`;\\\s]/;

export interface ValidatedEmailResult {
  valid: boolean;
  normalizedEmail: string;
  error?: string;
}

/**
 * Normalizes and validates any email ID (Gmail, Outlook, Yahoo, iCloud, institutional, or custom FPO domains)
 * while blocking injection characters and enforcing Firestore schema bounds (3..160 chars).
 */
export function normalizeAndValidateEmail(raw: string): ValidatedEmailResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      valid: false,
      normalizedEmail: '',
      error: 'Enter your email address to continue.',
    };
  }

  if (trimmed.length < 3 || trimmed.length > 160) {
    return {
      valid: false,
      normalizedEmail: '',
      error: 'Email address must be between 3 and 160 characters.',
    };
  }

  if (FORBIDDEN_INPUT_CHARS.test(trimmed)) {
    return {
      valid: false,
      normalizedEmail: '',
      error: 'Email address contains unsupported characters or spaces.',
    };
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return {
      valid: false,
      normalizedEmail: '',
      error: 'Enter a valid email address (for example, name@example.com).',
    };
  }

  const normalized = `${parts[0]}@${parts[1].toLowerCase()}`;
  if (!STRICT_EMAIL_REGEX.test(normalized)) {
    return {
      valid: false,
      normalizedEmail: '',
      error: 'Enter a valid email address with a complete domain.',
    };
  }

  return {
    valid: true,
    normalizedEmail: normalized,
  };
}

/**
 * Masks an email address for shoulder-surfing & shared-screen privacy
 * (e.g. "nagireddyrekkala999@gmail.com" -> "na••••99@gmail.com").
 */
export function maskEmailAddress(email?: string | null): string {
  if (!email) return 'Protected Account';
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0) return 'Protected Account';

  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);

  let maskedLocal: string;
  if (local.length <= 2) {
    maskedLocal = `${local[0] || '*'}•••`;
  } else if (local.length <= 5) {
    maskedLocal = `${local.slice(0, 1)}•••${local.slice(-1)}`;
  } else {
    maskedLocal = `${local.slice(0, 2)}••••${local.slice(-2)}`;
  }

  return `${maskedLocal}@${domain}`;
}

/**
 * Masks either a phone number or an email contact string for subscription privacy.
 */
export function maskContactString(contact?: string | null): string {
  if (!contact) return 'Protected';
  const trimmed = contact.trim();
  if (trimmed.includes('@')) {
    return maskEmailAddress(trimmed);
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 6) {
    return `${trimmed.slice(0, 2)}••••••${digits.slice(-2)}`;
  }
  return '••••••';
}

/**
 * Evaluates password strength for Email/Password account registration without ever storing raw credentials.
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  label: 'Weak' | 'Moderate' | 'Strong';
  error?: string;
} {
  if (password.length < 8) {
    return {
      valid: false,
      label: 'Weak',
      error: 'Use at least 8 characters to protect your email account.',
    };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigitOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  if (password.length >= 10 && hasLetter && hasDigitOrSymbol) {
    return { valid: true, label: 'Strong' };
  }
  if (hasLetter && hasDigitOrSymbol) {
    return { valid: true, label: 'Moderate' };
  }
  return {
    valid: true,
    label: 'Moderate',
  };
}

/**
 * Derives a clean, non-PII display name fallback from an email local part if no name is supplied.
 */
export function deriveSafeDisplayName(
  preferredName?: string | null,
  authDisplayName?: string | null,
  email?: string | null
): string {
  const raw =
    preferredName?.trim() ||
    authDisplayName?.trim() ||
    (email ? email.split('@')[0].replace(/[._-]+/g, ' ').trim() : '') ||
    'MandILens Member';

  const cleaned = raw.replace(/[<>'"`;\\]/g, '').trim();
  if (cleaned.length < 1) {
    return 'MandILens Member';
  }
  return cleaned.slice(0, 80);
}
