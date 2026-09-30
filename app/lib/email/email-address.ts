const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailAddress(value: string): boolean {
  return value.length >= 3 && value.length <= 200 && EMAIL.test(value);
}
