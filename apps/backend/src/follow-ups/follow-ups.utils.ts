const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Whole days elapsed since `since` (never negative). Null → 0. */
export function daysSince(since: Date | null, now: Date = new Date()): number {
  if (!since) return 0;
  return Math.max(0, Math.floor((now.getTime() - since.getTime()) / MS_PER_DAY));
}

/** Replace `{{var}}` placeholders. Unknown variables render as empty string. */
export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : "",
  );
}
