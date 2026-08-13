// @improved-by-ai
import { describe, it, expect } from 'vitest';
import { findFeat } from './featFinder.js';

describe('findFeat', () => {
  it('returns the feat when search name matches exactly', () => {
    const feats = [{ name: 'Great Weapon Master', desc: '...' }];
    expect(findFeat('Great Weapon Master', feats)).toEqual({ name: 'Great Weapon Master', desc: '...' });
  });

  it('prefers exact match over parenthetical-stripped match when both exist', () => {
    const feats = [
      { name: 'Actor', desc: 'base' },
      { name: 'Actor (Extra)', desc: 'extra' },
    ];
    expect(findFeat('Actor (Extra)', feats)).toEqual({ name: 'Actor (Extra)', desc: 'extra' });
  });

  it('strips parenthetical suffix to find a match when no exact match exists', () => {
    const feats = [
      { name: 'Actor', desc: 'base' },
      { name: 'Great Weapon Master', desc: '...' },
    ];
    expect(findFeat('Actor (Extra)', feats)).toEqual({ name: 'Actor', desc: 'base' });
  });

  it('strips parentheses with no space before the opening paren', () => {
    const feats = [{ name: 'Actor', desc: 'base' }];
    expect(findFeat('Actor(Extra)', feats)).toEqual({ name: 'Actor', desc: 'base' });
  });

  it('returns falsy when stripped name does not match any feat', () => {
    const feats = [{ name: 'Actor', desc: 'base' }];
    expect(findFeat('Nonexistent (Extra)', feats)).toBeFalsy();
  });

  it('returns falsy when feat name has no parentheses and no exact match', () => {
    const feats = [{ name: 'Actor', desc: 'base' }];
    expect(findFeat('Nonexistent', feats)).toBeFalsy();
  });

  it('returns falsy when allFeats is an empty array', () => {
    expect(findFeat('Actor', [])).toBeFalsy();
  });
});
