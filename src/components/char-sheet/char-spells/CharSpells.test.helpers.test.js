// @cleaned-by-ai
import { describe, it, expect } from 'vitest';
import * as helpers from './CharSpells.test.helpers.js';

describe('CharSpells.test.helpers', () => {
  describe('all exports', () => {
    it('exports exactly the 7 expected helpers', () => {
      const exportedNames = Object.keys(helpers).sort();
      expect(exportedNames).toEqual([
        'mockGateMetamagic',
        'mockGateUpcast',
        'mockGetCantripAutoLevel',
        'mockHandleTogglePreparedSpells',
        'mockPlayerStats',
        'mockPlayerStats2024',
        'mockPlayerStats2024Wizard',
      ]);
    });
  });
});
