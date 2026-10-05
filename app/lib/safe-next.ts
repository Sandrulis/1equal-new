const TRAINING_PATH = /^\/training\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function safeTrainingPath(value: string | null | undefined): string | null {
  if (!value) return null;
  return TRAINING_PATH.test(value) ? value : null;
}
