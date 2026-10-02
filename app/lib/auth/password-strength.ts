export type PasswordStrengthLevel = "very_weak" | "weak" | "fair" | "good" | "strong";

export type PasswordStrength = {
  score: number;
  level: PasswordStrengthLevel;
  percent: number;
  color: string;
};

export function getPasswordStrength(password: string): PasswordStrength | null {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score, level: "very_weak", percent: score * 20, color: "#ef4444" };
  if (score === 2) return { score, level: "weak", percent: 40, color: "#f97316" };
  if (score === 3) return { score, level: "fair", percent: 60, color: "#eab308" };
  if (score === 4) return { score, level: "good", percent: 80, color: "#22c55e" };
  return { score, level: "strong", percent: 100, color: "#10b981" };
}
