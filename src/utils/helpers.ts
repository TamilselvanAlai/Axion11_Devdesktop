export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isExpired(timestampMs: number): boolean {
  return Date.now() >= timestampMs;
}
