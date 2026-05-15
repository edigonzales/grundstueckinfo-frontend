/**
 * Formats a number with Swiss thousand separators (apostrophe).
 * Example: 12312 -> "12'312"
 * Returns null for null/undefined inputs so callers can choose fallback display.
 */
export function formatNumber(value: number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  // Force straight apostrophe (') instead of typographic right single quotation mark (')
  return value.toLocaleString('de-CH').replace(/\u2019/g, "'");
}
