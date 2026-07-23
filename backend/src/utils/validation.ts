/**
 * Shared input validators for auth flows.
 *
 * Email length limits follow RFC 5321: an address may be at most 254 chars
 * overall, with a local part (before the @) of at most 64. Password limits
 * keep bcrypt happy — bcrypt only considers the first 72 bytes, so a hard
 * upper bound also prevents wasting CPU hashing an oversized string.
 */

export const MAX_EMAIL_LENGTH = 254; // RFC 5321 maximum address length
export const MAX_EMAIL_LOCAL_LENGTH = 64; // RFC 5321 maximum local-part length
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

// Pragmatic format check: exactly one @, no spaces, and a dotted domain.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateEmail(raw: unknown): ValidationResult {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { valid: false, error: 'Email is required' };
  }

  const email = raw.trim();

  if (email.length > MAX_EMAIL_LENGTH) {
    return { valid: false, error: `Email must be at most ${MAX_EMAIL_LENGTH} characters` };
  }

  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  const localPart = email.slice(0, email.lastIndexOf('@'));
  if (localPart.length > MAX_EMAIL_LOCAL_LENGTH) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  return { valid: true };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validatePassword(raw: unknown): ValidationResult {
  if (typeof raw !== 'string' || raw.length === 0) {
    return { valid: false, error: 'Password is required' };
  }
  if (raw.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  if (raw.length > MAX_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters` };
  }
  return { valid: true };
}
