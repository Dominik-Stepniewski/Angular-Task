export interface Summarizable {
  toActionSummary(): Record<string, unknown>;
}

export function isSummarizable(value: unknown): value is Summarizable {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Summarizable).toActionSummary === 'function'
  );
}
