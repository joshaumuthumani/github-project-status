export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  // Clamp rather than let a future timestamp (client clock skew) produce a
  // negative/nonsensical duration; "just now" is the least-wrong fallback
  // for a single-user tool with no need to diagnose skew from the UI.
  const diffMs = Math.max(0, now.getTime() - then);

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
