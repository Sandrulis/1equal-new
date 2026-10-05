const TRAINING_PATH = /^\/training\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const JOIN_PATH = /^\/join\/[A-Z0-9]{4,16}$/i;

export function safeTrainingPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (TRAINING_PATH.test(value)) return value;
  if (JOIN_PATH.test(value)) return value;
  return null;
}
