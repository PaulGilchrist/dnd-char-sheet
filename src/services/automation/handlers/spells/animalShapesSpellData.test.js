import { describe, it, expect } from 'vitest';
import spells5e from '../../../../../public/data/spells.json' with { type: 'json' };
import spells2024 from '../../../../../public/data/2024/spells.json' with { type: 'json' };

describe('animalShapesSpellData', () => {
  it('should have automation.type in 5e spells.json', () => {
    const entry = spells5e.find(s => s.index === 'animal-shapes');
    expect(entry).toBeDefined();
    expect(entry.automation).toBeDefined();
    expect(entry.automation.type).toBe('animal_shapes');
  });

  it('should have automation.type in 2024 spells.json', () => {
    const entry = spells2024.find(s => s.index === 'animal-shapes');
    expect(entry).toBeDefined();
    expect(entry.automation).toBeDefined();
    expect(entry.automation.type).toBe('animal_shapes');
  });
});
