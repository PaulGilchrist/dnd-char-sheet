// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../ui/dataLoader.js', () => ({
  loadWildMagicSurgeTable: vi.fn(async () => []),
  loadEquipment: vi.fn(async () => []),
  fetchBackgroundData: vi.fn(),
  fetchClassData: vi.fn(),
  loadFeatData: vi.fn(),
}));

import {
  parseToolChoiceString,
  parseFeatToolProficiency,
} from './toolValidation.js';

describe('toolValidation - parseToolChoiceString', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return default for null input', () => {
    expect(parseToolChoiceString(null)).toEqual({ count: 0, categories: [], isChoice: false });
  });

  it('should return default for non-string input', () => {
    expect(parseToolChoiceString(123)).toEqual({ count: 0, categories: [], isChoice: false });
    expect(parseToolChoiceString({})).toEqual({ count: 0, categories: [], isChoice: false });
    expect(parseToolChoiceString([])).toEqual({ count: 0, categories: [], isChoice: false });
  });

  it('should return default for empty string', () => {
    expect(parseToolChoiceString('')).toEqual({ count: 0, categories: [], isChoice: false });
  });

  it('should return default for strings not starting with "Choose"', () => {
    expect(parseToolChoiceString('Gaming Sets')).toEqual({ count: 0, categories: [], isChoice: false });
    expect(parseToolChoiceString("Artisan's Tools")).toEqual({ count: 0, categories: [], isChoice: false });
    expect(parseToolChoiceString('choose one type of Gaming Sets')).toEqual({ count: 0, categories: [], isChoice: false });
  });

  it('should parse "Choose one type of A or B" format', () => {
    const result = parseToolChoiceString('Choose one type of Gaming Sets or Musical Instruments');
    expect(result).toEqual({ count: 1, categories: ['Gaming Sets', 'Musical Instrument'], isChoice: true });
  });

  it('should parse "Choose one type of A or B" with singular normalization', () => {
    const result = parseToolChoiceString('Choose one type of Gaming Set or Musical Instrument');
    expect(result).toEqual({ count: 1, categories: ['Gaming Sets', 'Musical Instrument'], isChoice: true });
  });

  it('should parse "Choose X of category" format', () => {
    const result = parseToolChoiceString('Choose 2 Artisan\'s Tools of your choice');
    expect(result).toEqual({ count: 2, categories: ["Artisan's Tools"], isChoice: true });
  });

  it('should parse "Choose X of category" without parenthetical', () => {
    const result = parseToolChoiceString('Choose 3 Artisan\'s Tools');
    expect(result).toEqual({ count: 3, categories: ["Artisan's Tools"], isChoice: true });
  });

  it('should parse "Choose X of category (see ...)" format', () => {
    const result = parseToolChoiceString('Choose 1 Artisan\'s Tools (see Equipment)');
    expect(result).toEqual({ count: 1, categories: ["Artisan's Tools"], isChoice: true });
  });

  it('should parse "Choose one kind of category" format', () => {
    const result = parseToolChoiceString('Choose one kind of Gaming Sets');
    expect(result).toEqual({ count: 1, categories: ['Gaming Sets'], isChoice: true });
  });

  it('should parse "Choose kind of category" format', () => {
    const result = parseToolChoiceString('Choose kind of Musical Instruments');
    expect(result).toEqual({ count: 1, categories: ['Musical Instrument'], isChoice: true });
  });

  it('should return default for unrecognized Choose patterns', () => {
    expect(parseToolChoiceString('Choose something weird')).toEqual({ count: 0, categories: [], isChoice: false });
    expect(parseToolChoiceString('Choose')).toEqual({ count: 0, categories: [], isChoice: false });
    expect(parseToolChoiceString('Choose 1')).toEqual({ count: 0, categories: [], isChoice: false });
  });
});

describe('toolValidation - parseFeatToolProficiency', () => {
  it('should return null for null/undefined feat', () => {
    expect(parseFeatToolProficiency(null)).toBeNull();
    expect(parseFeatToolProficiency(undefined)).toBeNull();
  });

  it('should return null for feat without benefits', () => {
    expect(parseFeatToolProficiency({})).toBeNull();
  });

  it('should return null for feat with empty benefits array', () => {
    expect(parseFeatToolProficiency({ benefits: [] })).toBeNull();
  });

  it('should return null for feat with non-proficiency benefits', () => {
    expect(parseFeatToolProficiency({ benefits: [{ type: 'ability_score_increase', description: '+1 STR' }] })).toBeNull();
  });

  it('should return null for proficiency benefit without tool/instrument keywords', () => {
    expect(parseFeatToolProficiency({
      benefits: [{ type: 'proficiency', description: 'You gain proficiency in a skill' }]
    })).toBeNull();
  });

  it('should parse "three different Artisan\'s Tools of your choice" (Chef feat)', () => {
    const result = parseFeatToolProficiency({
      benefits: [{ type: 'proficiency', description: 'You gain proficiency with three different Artisan\'s Tools of your choice' }]
    });
    expect(result).toEqual({ count: 3, categories: ["Artisan's Tools"], isAny: false });
  });

  it('should parse "three skills or tools" (Skilled feat)', () => {
    const result = parseFeatToolProficiency({
      benefits: [{ type: 'proficiency', description: 'You gain proficiency in any combination of three skills or tools of your choice' }]
    });
    expect(result).toEqual({ count: 3, categories: [], isAny: true });
  });

  it('should parse "two Musical Instruments of your choice"', () => {
    const result = parseFeatToolProficiency({
      benefits: [{ type: 'proficiency', description: 'You gain proficiency with two Musical Instruments of your choice' }]
    });
    expect(result).toEqual({ count: 2, categories: ['Musical Instrument'], isAny: false });
  });

  it('should parse with word numbers (one, two, three, etc.) in artisan tools pattern', () => {
    const three = parseFeatToolProficiency({
      benefits: [{ type: 'proficiency', description: 'You gain proficiency with three different Artisan\'s Tools of your choice' }]
    });
    expect(three.count).toBe(3);

    const two = parseFeatToolProficiency({
      benefits: [{ type: 'proficiency', description: 'You gain proficiency with two different Artisan\'s Tools of your choice' }]
    });
    expect(two.count).toBe(2);
  });

  it('should parse with word numbers (one, two, three, etc.) in generic pattern', () => {
    const one = parseFeatToolProficiency({
      benefits: [{ type: 'proficiency', description: 'You gain proficiency with one Gaming Tool of your choice' }]
    });
    expect(one.count).toBe(1);

    const two = parseFeatToolProficiency({
      benefits: [{ type: 'proficiency', description: 'You gain proficiency with two Gaming Tools of your choice' }]
    });
    expect(two.count).toBe(2);

    const three = parseFeatToolProficiency({
      benefits: [{ type: 'proficiency', description: 'You gain proficiency with three Gaming Tools of your choice' }]
    });
    expect(three.count).toBe(3);
  });

  it('should handle "different" keyword in artisan tools pattern', () => {
    const result = parseFeatToolProficiency({
      benefits: [{ type: 'proficiency', description: 'You gain proficiency with two different Artisan\'s Tools of your choice' }]
    });
    expect(result).toEqual({ count: 2, categories: ["Artisan's Tools"], isAny: false });
  });

  it('should parse with numeric digits in artisan tools pattern (defaults to 1)', () => {
    const result = parseFeatToolProficiency({
      benefits: [{ type: 'proficiency', description: 'You gain proficiency with 2 different Artisan\'s Tools of your choice' }]
    });
    expect(result.count).toBe(1);
  });

  it('should parse with numeric digits in generic pattern (defaults to 1)', () => {
    const result = parseFeatToolProficiency({
      benefits: [{ type: 'proficiency', description: 'You gain proficiency with 2 Gaming Tools of your choice' }]
    });
    expect(result.count).toBe(1);
  });

  it('should handle multi-word categories in generic match (captures full phrase)', () => {
    const result = parseFeatToolProficiency({
      benefits: [{ type: 'proficiency', description: 'You gain proficiency with one Gaming Set and Musical Instrument of your choice' }]
    });
    expect(result).toEqual({ count: 1, categories: ['Gaming Set and Musical Instrument'], isAny: false });
  });

  it('should return null for unrecognized patterns', () => {
    const result = parseFeatToolProficiency({
      benefits: [{ type: 'proficiency', description: 'You gain proficiency with a sword' }]
    });
    expect(result).toBeNull();
  });

  it('should return null for benefit with no description', () => {
    expect(parseFeatToolProficiency({
      benefits: [{ type: 'proficiency' }]
    })).toBeNull();
  });

  it('should return null for benefit with empty description', () => {
    expect(parseFeatToolProficiency({
      benefits: [{ type: 'proficiency', description: '' }]
    })).toBeNull();
  });
});
