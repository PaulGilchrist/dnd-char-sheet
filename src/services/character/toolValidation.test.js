// @improved-by-ai
import { describe, it, expect } from 'vitest';
import { normalizeCategory } from './toolValidation.js';

describe('toolValidation - normalizeCategory', () => {
  it('should normalize singular "Gaming Set" to "Gaming Sets"', () => {
    expect(normalizeCategory('Gaming Set')).toBe('Gaming Sets');
  });

  it('should keep "Gaming Sets" as-is', () => {
    expect(normalizeCategory('Gaming Sets')).toBe('Gaming Sets');
  });

  it('should normalize "Musical Instrument" to "Musical Instrument"', () => {
    expect(normalizeCategory('Musical Instrument')).toBe('Musical Instrument');
  });

  it('should normalize "Musical Instruments" to "Musical Instrument"', () => {
    expect(normalizeCategory('Musical Instruments')).toBe('Musical Instrument');
  });

  it('should normalize "Artisan\'s Tools" to "Artisan\'s Tools"', () => {
    expect(normalizeCategory("Artisan's Tools")).toBe("Artisan's Tools");
  });

  it('should normalize "Other Tools" to "Other Tools"', () => {
    expect(normalizeCategory('Other Tools')).toBe('Other Tools');
  });

  it('should trim whitespace before normalization', () => {
    expect(normalizeCategory('  Gaming Set  ')).toBe('Gaming Sets');
  });

  it('should return unknown categories unchanged after trim', () => {
    expect(normalizeCategory('Painting Supplies')).toBe('Painting Supplies');
  });

  it('should return null/undefined unchanged', () => {
    expect(normalizeCategory(null)).toBeNull();
    expect(normalizeCategory(undefined)).toBeUndefined();
  });

  it('should handle empty string', () => {
    expect(normalizeCategory('')).toBe('');
  });

  it('should handle whitespace-only string', () => {
    expect(normalizeCategory('   ')).toBe('');
  });
});
