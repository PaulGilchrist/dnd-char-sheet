import { describe, it, expect } from 'vitest';

import { handle } from './fontOfMagicHandler.js';

// ── Helpers ──────────────────────────────────────────────────────

function makeAction(overrides = {}) {
  return {
    name: 'Font of Magic',
    automation: { type: 'font_of_magic' },
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe('fontOfMagicHandler.handle', () => {
  describe('basic return structure', () => {
    it('should return a modal result with the expected structure', async () => {
      const result = await handle();

      expect(result).toEqual({
        type: 'modal',
        modalName: 'fontOfMagic',
        payload: {},
      });
    });

    it('should always return type "modal"', async () => {
      const result = await handle(
        makeAction(),
        { name: 'Sorcerer', level: 5 },
        'TestCampaign',
        'map1',
      );

      expect(result.type).toBe('modal');
    });

    it('should always return modalName "fontOfMagic"', async () => {
      const result = await handle(
        makeAction(),
        { name: 'Sorcerer', level: 5 },
        'TestCampaign',
        'map1',
      );

      expect(result.modalName).toBe('fontOfMagic');
    });

    it('should always return an empty payload object', async () => {
      const result = await handle(
        makeAction(),
        { name: 'Sorcerer', level: 5 },
        'TestCampaign',
        'map1',
      );

      expect(result.payload).toEqual({});
    });
  });

  describe('parameter handling', () => {
    it('should ignore action parameter and still return the same modal', async () => {
      const action = makeAction({
        name: 'Custom Font of Magic',
        automation: { type: 'font_of_magic', custom: 'data' },
      });
      const result = await handle(action, {}, 'campaign', 'map');

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('fontOfMagic');
      expect(result.payload).toEqual({});
    });

    it('should ignore playerStats parameter and still return the same modal', async () => {
      const playerStats = {
        name: 'Archmage Sorcerer',
        level: 17,
        class: { class_levels: [{ level: 17, class_specific: {} }] },
        spellAbilities: {
          spell_slots_level_1: 4,
          spell_slots_level_2: 3,
          spell_slots_level_3: 3,
          spell_slots_level_4: 3,
          spell_slots_level_5: 2,
        },
      };
      const result = await handle(makeAction(), playerStats, 'campaign', 'map');

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('fontOfMagic');
      expect(result.payload).toEqual({});
    });

    it('should ignore campaignName parameter and still return the same modal', async () => {
      const result = await handle(
        makeAction(),
        {},
        'MyAwesomeCampaign2024',
        'map1',
      );

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('fontOfMagic');
      expect(result.payload).toEqual({});
    });

    it('should ignore mapName parameter and still return the same modal', async () => {
      const result = await handle(
        makeAction(),
        {},
        'campaign',
        'combat-map-123',
      );

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('fontOfMagic');
      expect(result.payload).toEqual({});
    });
  });

  describe('edge cases', () => {
    it('should return modal with no arguments at all', async () => {
      const result = await handle();

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('fontOfMagic');
      expect(result.payload).toEqual({});
    });

    it('should return modal with null action', async () => {
      const result = await handle(null, {}, 'campaign', 'map');

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('fontOfMagic');
      expect(result.payload).toEqual({});
    });

    it('should return modal with null playerStats', async () => {
      const result = await handle(makeAction(), null, 'campaign', 'map');

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('fontOfMagic');
      expect(result.payload).toEqual({});
    });

    it('should return modal with null campaignName', async () => {
      const result = await handle(makeAction(), {}, null, 'map');

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('fontOfMagic');
      expect(result.payload).toEqual({});
    });

    it('should return modal with null mapName', async () => {
      const result = await handle(makeAction(), {}, 'campaign', null);

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('fontOfMagic');
      expect(result.payload).toEqual({});
    });

    it('should return modal with undefined action', async () => {
      const result = await handle(undefined, {}, 'campaign', 'map');

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('fontOfMagic');
      expect(result.payload).toEqual({});
    });

    it('should return modal with undefined playerStats', async () => {
      const result = await handle(makeAction(), undefined, 'campaign', 'map');

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('fontOfMagic');
      expect(result.payload).toEqual({});
    });

    it('should return modal with undefined campaignName', async () => {
      const result = await handle(makeAction(), {}, undefined, 'map');

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('fontOfMagic');
      expect(result.payload).toEqual({});
    });

    it('should return modal with undefined mapName', async () => {
      const result = await handle(makeAction(), {}, 'campaign', undefined);

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('fontOfMagic');
      expect(result.payload).toEqual({});
    });

    it('should return modal with empty string parameters', async () => {
      const result = await handle(
        makeAction({ name: '' }),
        { name: '' },
        '',
        '',
      );

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('fontOfMagic');
      expect(result.payload).toEqual({});
    });

    it('should return modal with 2024 ruleset playerStats', async () => {
      const playerStats = {
        name: 'Sorcerer',
        level: 5,
        rules: '2024',
        spellAbilities: {
          spell_slots_level_1: 4,
          spell_slots_level_2: 3,
          spell_slots_level_3: 3,
          spell_slots_level_4: 3,
          spell_slots_level_5: 2,
        },
      };
      const result = await handle(makeAction(), playerStats, 'campaign', 'map');

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('fontOfMagic');
      expect(result.payload).toEqual({});
    });

    it('should return modal with 5e ruleset playerStats', async () => {
      const playerStats = {
        name: 'Sorcerer',
        level: 5,
        rules: '5e',
        class: { class_levels: [{ level: 5, class_specific: {} }] },
        spellAbilities: {
          spell_slots_level_1: 4,
          spell_slots_level_2: 3,
          spell_slots_level_3: 3,
          spell_slots_level_4: 3,
          spell_slots_level_5: 2,
        },
      };
      const result = await handle(makeAction(), playerStats, 'campaign', 'map');

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('fontOfMagic');
      expect(result.payload).toEqual({});
    });

    it('should return modal even when playerStats has no spellAbilities', async () => {
      const playerStats = { name: 'Non-spellcaster', level: 1 };
      const result = await handle(makeAction(), playerStats, 'campaign', 'map');

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('fontOfMagic');
      expect(result.payload).toEqual({});
    });
  });

  describe('async behavior', () => {
    it('should return a promise that resolves to the modal object', async () => {
      const promise = handle();

      await expect(promise).resolves.toBeDefined();
    });

    it('should be callable multiple times returning identical results', async () => {
      const result1 = await handle();
      const result2 = await handle();
      const result3 = await handle();

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });
});
