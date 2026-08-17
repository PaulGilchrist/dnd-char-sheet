// @improved-by-ai
import { describe, it, expect } from 'vitest';

// ── Imports ────────────────────────────────────────────────────

import { handle } from './resourcePoolHandler.js';

// ── Helpers ────────────────────────────────────────────────────

function makeAction(overrides = {}) {
  return {
    name: 'Resource Pool',
    description: 'A pool of resources',
    automation: { type: 'resource_pool' },
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────

describe('resourcePoolHandler.handle', () => {
  describe('default resourcePool modal', () => {
    it('should return a modal with resourcePool name and action fields in payload', async () => {
      const action = makeAction();
      const result = await handle(action, {}, 'campaign', 'map');

      expect(result).toEqual({
        type: 'modal',
        modalName: 'resourcePool',
        payload: {
          name: 'Resource Pool',
          description: 'A pool of resources',
          automation: { type: 'resource_pool' },
        },
      });
    });

    it('should default description to empty string when action.description is undefined or null', async () => {
      const result = await handle({ name: 'Pool', automation: { type: 'resource_pool' } }, {}, 'campaign', 'map');
      expect(result.payload.description).toBe('');
    });

    it('should pass through automation as-is when it is null or missing', async () => {
      const resultNull = await handle({ name: 'Pool', automation: null }, {}, 'campaign', 'map');
      expect(resultNull.payload.automation).toBe(null);

      const resultUndefined = await handle({ name: 'Pool' }, {}, 'campaign', 'map');
      expect(resultUndefined.payload.automation).toBe(undefined);
    });

    it('should forward all action fields into the payload', async () => {
      const action = {
        name: 'Unique Pool',
        description: 'Custom description',
        automation: { type: 'resource_pool', max: 10, current: 5 },
      };
      const result = await handle(action, {}, 'campaign', 'map');

      expect(result.payload.name).toBe(action.name);
      expect(result.payload.description).toBe(action.description);
      expect(result.payload.automation).toEqual(action.automation);
    });

    it('should ignore playerStats, campaignName, and mapName parameters', async () => {
      const action = makeAction();
      const playerStats = { name: 'Hero', level: 5 };

      const result = await handle(action, playerStats, 'TestCampaign', 'TestMap');

      expect(result.payload.name).toBe(action.name);
      expect(result.payload.automation).toEqual(action.automation);
    });
  });

  describe('moonlightStepResource modal for spell_slot_to_moonlight_step conversion', () => {
    it('should return moonlightStepResource modal when conversion is spell_slot_to_moonlight_step', async () => {
      const action = {
        name: 'Moonlight Conversion',
        description: 'Convert spell slots to moonlight steps',
        automation: { type: 'resource_pool', conversion: 'spell_slot_to_moonlight_step', max: 20 },
      };
      const result = await handle(action, {}, 'campaign', 'map');

      expect(result).toEqual({
        type: 'modal',
        modalName: 'moonlightStepResource',
        payload: {
          name: 'Moonlight Conversion',
          description: 'Convert spell slots to moonlight steps',
          automation: { type: 'resource_pool', conversion: 'spell_slot_to_moonlight_step', max: 20 },
        },
      });
    });

    it('should return resourcePool modal when conversion is an empty string', async () => {
      const action = {
        name: 'Pool',
        automation: { type: 'resource_pool', conversion: '' },
      };
      const result = await handle(action, {}, 'campaign', 'map');

      expect(result.modalName).toBe('resourcePool');
      expect(result.payload.automation.conversion).toBe('');
    });

    it('should return resourcePool modal when conversion is undefined', async () => {
      const action = {
        name: 'Pool',
        automation: { type: 'resource_pool' },
      };
      const result = await handle(action, {}, 'campaign', 'map');

      expect(result.modalName).toBe('resourcePool');
    });
  });

  describe('giantAncestry delegation', () => {
    it('should delegate to giantAncestryHandler when action.name is Giant Ancestry', async () => {
      const action = { name: 'Giant Ancestry', automation: { type: 'resource_pool' } };
      const result = await handle(action, { name: 'Hero' }, 'testCampaign', 'map');

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('giantAncestry');
      expect(result.payload).toBeDefined();
    });

    it('should delegate to giantAncestryHandler when automation.type is giant_ancestry', async () => {
      const action = { name: 'Ancestry', automation: { type: 'giant_ancestry' } };
      const result = await handle(action, { name: 'Hero' }, 'testCampaign', 'map');

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('giantAncestry');
      expect(result.payload).toBeDefined();
    });

    it('should delegate when action.name is Giant Ancestry but automation.type is giant_ancestry', async () => {
      const action = { name: 'Giant Ancestry', automation: { type: 'giant_ancestry' } };
      const result = await handle(action, {}, 'testCampaign', 'map');

      expect(result.modalName).toBe('giantAncestry');
    });

    it('should return resourcePool modal when automation.type is null (not giant_ancestry)', async () => {
      const action = { name: 'Pool', automation: { type: null } };
      const result = await handle(action, {}, 'campaign', 'map');

      expect(result.modalName).toBe('resourcePool');
      expect(result.payload.automation.type).toBe(null);
    });

    it('should return resourcePool modal when automation.type is undefined', async () => {
      const action = { name: 'Pool', automation: {} };
      const result = await handle(action, {}, 'campaign', 'map');

      expect(result.modalName).toBe('resourcePool');
    });
  });

  describe('non-giant_ancestry automation types', () => {
    it('should return resourcePool modal when automation.type is not giant_ancestry', async () => {
      const action = { name: 'Spell Slot Pool', automation: { type: 'spell_slot' } };
      const result = await handle(action, {}, 'campaign', 'map');

      expect(result.modalName).toBe('resourcePool');
      expect(result.payload.automation.type).toBe('spell_slot');
    });

    it('should return resourcePool modal when automation.type is a different resource type', async () => {
      const action = { name: 'Ritual Pool', automation: { type: 'ritual_resource' } };
      const result = await handle(action, {}, 'campaign', 'map');

      expect(result.modalName).toBe('resourcePool');
      expect(result.payload.name).toBe('Ritual Pool');
    });
  });

  describe('minimal and edge-case actions', () => {
    it('should return resourcePool modal when action has no automation and no giant ancestry indicators', async () => {
      const action = { name: 'Simple Pool' };
      const result = await handle(action, {}, 'campaign', 'map');

      expect(result).toEqual({
        type: 'modal',
        modalName: 'resourcePool',
        payload: {
          name: 'Simple Pool',
          description: '',
          automation: undefined,
        },
      });
    });

    it('should return resourcePool modal with empty string name when action.name is missing', async () => {
      const result = await handle({}, {}, 'campaign', 'map');

      expect(result.modalName).toBe('resourcePool');
      expect(result.payload.name).toBe(undefined);
      expect(result.payload.description).toBe('');
    });
  });
});
