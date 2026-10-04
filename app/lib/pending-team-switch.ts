type Listener = () => void;

let pendingTeamId: string | null = null;
const listeners = new Set<Listener>();

export function queueTeamSwitch(teamId: string) {
  pendingTeamId = teamId;
  for (const listener of listeners) listener();
}

export function peekTeamSwitch(): string | null {
  return pendingTeamId;
}

export function clearTeamSwitch(teamId: string) {
  if (pendingTeamId === teamId) pendingTeamId = null;
}

export function subscribeTeamSwitch(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
