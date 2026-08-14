// @improved-by-ai
import { describe, it, expect } from 'vitest';

import { clearAppliedFeatBuffs } from './featBuffService.js';

describe('clearAppliedFeatBuffs', () => {
  it('resets featIncrease to 0 on every ability in the array', () => {
    const formData = {
      abilities: [
        { name: 'Strength', featIncrease: 5 },
        { name: 'Dexterity', featIncrease: -2 },
        { name: 'Constitution', featIncrease: 3 },
      ],
    };

    clearAppliedFeatBuffs(formData);

    expect(formData.abilities.every(a => a.featIncrease === 0)).toBe(true);
  });

  it('handles missing abilities gracefully without crashing', () => {
    const formData = {};

    expect(() => clearAppliedFeatBuffs(formData)).not.toThrow();
  });

  it('handles an empty abilities array without crashing', () => {
    const formData = { abilities: [] };

    expect(() => clearAppliedFeatBuffs(formData)).not.toThrow();
  });

  it('leaves non-ability properties untouched', () => {
    const formData = {
      abilities: [{ name: 'Strength', featIncrease: 5 }],
      name: 'Test Character',
      level: 5,
      class: 'Wizard',
    };

    clearAppliedFeatBuffs(formData);

    expect(formData.abilities[0].featIncrease).toBe(0);
    expect(formData.name).toBe('Test Character');
    expect(formData.level).toBe(5);
    expect(formData.class).toBe('Wizard');
  });

  it('resets abilities that lack a featIncrease property', () => {
    const formData = {
      abilities: [{ name: 'Strength' }, { name: 'Dexterity', featIncrease: 7 }],
    };

    clearAppliedFeatBuffs(formData);

    expect(formData.abilities[0].featIncrease).toBe(0);
    expect(formData.abilities[1].featIncrease).toBe(0);
  });
});
