import { describe, it, expect } from 'vitest';
import { injectSpecialActions } from './injectSpecialActions.js';

describe('injectSpecialActions', () => {
  it('returns an empty array when features array is empty', () => {
    const existingActions = new Set();
    const result = injectSpecialActions(existingActions, []);
    expect(result).toEqual([]);
    expect(existingActions.size).toBe(0);
  });

  it('returns an empty array when all features are already in existingActions', () => {
    const existingActions = new Set(['Known Feature']);
    const features = [{ name: 'Known Feature', description: 'Already tracked' }];
    const result = injectSpecialActions(existingActions, features);
    expect(result).toEqual([]);
  });

  it('skips features whose names already exist in existingActions', () => {
    const existingActions = new Set(['Existing Feature']);
    const features = [
      { name: 'Existing Feature', description: 'Duplicate' },
      { name: 'New Feature', description: 'Added' },
    ];
    const result = injectSpecialActions(existingActions, features);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('New Feature');
  });

  it('includes automation by default when feature has automation', () => {
    const features = [
      { name: 'Feature', description: 'Desc', automation: { type: 'damage', amount: 10 } },
    ];
    const result = injectSpecialActions(new Set(), features);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'Feature',
      description: 'Desc',
      type: 'passive',
      source: 'feat',
      automation: { type: 'damage', amount: 10 },
    });
  });

  it('excludes automation when includeAutomation is false', () => {
    const features = [
      { name: 'Feature', description: 'Desc', automation: { type: 'damage', amount: 10 } },
    ];
    const result = injectSpecialActions(new Set(), features, { includeAutomation: false });
    expect(result[0]).not.toHaveProperty('automation');
    expect(result[0]).toEqual({
      name: 'Feature',
      description: 'Desc',
      type: 'passive',
      source: 'feat',
    });
  });

  it('defaults type to passive when feature type is undefined', () => {
    const features = [{ name: 'Feature', description: 'Desc' }];
    const result = injectSpecialActions(new Set(), features);
    expect(result[0].type).toBe('passive');
  });

  it('preserves feature type when provided', () => {
    const features = [{ name: 'Feature', description: 'Desc', type: 'active' }];
    const result = injectSpecialActions(new Set(), features);
    expect(result[0].type).toBe('active');
  });

  it('does not add automation when feature has no automation regardless of includeAutomation', () => {
    const features = [{ name: 'Feature', description: 'No automation here' }];
    const result = injectSpecialActions(new Set(), features, { includeAutomation: true });
    expect(result[0]).not.toHaveProperty('automation');
  });

  it('adds feature names to existingActions Set', () => {
    const existingActions = new Set();
    const features = [
      { name: 'Feature A', description: 'A' },
      { name: 'Feature B', description: 'B' },
    ];
    injectSpecialActions(existingActions, features);
    expect(existingActions).toContain('Feature A');
    expect(existingActions).toContain('Feature B');
    expect(existingActions.size).toBe(2);
  });

  it('sets source to feat for all entries', () => {
    const features = [{ name: 'Feature', description: 'Desc' }];
    const result = injectSpecialActions(new Set(), features);
    expect(result[0].source).toBe('feat');
  });

  it('handles multiple features with mixed automation presence', () => {
    const features = [
      { name: 'With Auto', description: 'A', automation: { type: 'heal' } },
      { name: 'No Auto', description: 'B' },
      { name: 'With Type', description: 'C', type: 'reaction', automation: { type: 'buff' } },
    ];
    const result = injectSpecialActions(new Set(), features);
    expect(result).toHaveLength(3);
    expect(result[0]).toHaveProperty('automation');
    expect(result[1]).not.toHaveProperty('automation');
    expect(result[2].type).toBe('reaction');
    expect(result[2]).toHaveProperty('automation');
  });
});
