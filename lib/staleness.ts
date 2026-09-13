// The PRD and architecture docs define "stale" qualitatively ("no recent
// activity") but never pin a day count. 30 days is an implementation-time
// default, not a settled decision — revisit with Josh if it doesn't match
// how he actually judges a repo dormant.
export const STALE_THRESHOLD_DAYS = 30;

export function isStale(pushedAt: string, now: Date = new Date()): boolean {
  const pushedDate = new Date(pushedAt);
  const ageMs = now.getTime() - pushedDate.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays >= STALE_THRESHOLD_DAYS;
}
