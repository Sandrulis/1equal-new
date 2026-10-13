/** One player, one spot. The earlier slot number stays. */
export function keepFirstSlotPerMember(entries: [number, string][]): [number, string][] {
  const seen = new Set<string>();
  const next: [number, string][] = [];
  const ordered = [...entries].sort((left, right) => left[0] - right[0]);
  for (const [slot, memberId] of ordered) {
    if (!memberId || seen.has(memberId)) continue;
    seen.add(memberId);
    next.push([slot, memberId]);
  }
  return next;
}
