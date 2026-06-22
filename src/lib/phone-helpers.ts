/**
 * Normalizes a phone number to a consistent format.
 * - Strips all non-digit characters.
 * - Extracts the last 10 digits (assuming standard Indian mobile numbers).
 */
export function normalizePhoneNumber(phone: string | undefined | null): string {
  if (!phone) return "";
  const digitsOnly = phone.replace(/\D/g, "");
  // If it's longer than 10 digits (e.g., has country code 91), take the last 10
  if (digitsOnly.length >= 10) {
    return digitsOnly.slice(-10);
  }
  return digitsOnly;
}
