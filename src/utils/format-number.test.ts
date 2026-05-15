import { describe, it, expect } from 'vitest';
import { formatNumber } from './format-number';

describe('formatNumber', () => {
  it('formats a number with Swiss thousand separators', () => {
    expect(formatNumber(12312)).toBe("12'312");
  });

  it('handles single-digit numbers', () => {
    expect(formatNumber(7)).toBe('7');
  });

  it('handles numbers without thousand separators', () => {
    expect(formatNumber(999)).toBe('999');
  });

  it('handles millions', () => {
    expect(formatNumber(1234567)).toBe("1'234'567");
  });

  it('returns null for null input', () => {
    expect(formatNumber(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(formatNumber(undefined)).toBeNull();
  });

  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('handles negative numbers', () => {
    expect(formatNumber(-12312)).toBe("-12'312");
  });

  it('formats decimals correctly', () => {
    expect(formatNumber(12312.45)).toBe("12'312.45");
  });
});
