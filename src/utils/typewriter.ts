export function getTypewriterText(
  text: string,
  enabled: boolean | undefined,
  elapsedMs: number | null,
  durationMs: number | undefined,
): string {
  if (!enabled || elapsedMs === null) {
    return text;
  }

  const safeDuration = Math.max(durationMs ?? 1000, 1);
  const progress = Math.min(Math.max(elapsedMs, 0) / safeDuration, 1);
  const visibleChars = progress >= 1 ? text.length : Math.ceil(text.length * progress);

  return text.slice(0, visibleChars);
}
