import { describe, it, expect } from 'vitest';

import { handle } from './naturalRecoveryHandler.js';

// ── Helpers ──────────────────────────────────────────────────────

function makeAction(overrides = {}) {
  return {
    name: 'Natural Recovery',
    description: 'Recover expended spell slots',
    automation: { type: 'natural_recovery' },
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe('naturalRecoveryHandler.handle', () => {
  describe('default modal structure', () => {
    it('should return a modal result with naturalRecovery modalName', async () => {
      const action = makeAction();
      const result = await handle(action, {}, 'campaign', 'map');

      expect(result).toEqual({
        type: 'modal',
        modalName: 'naturalRecovery',
        payload: {
          name: 'Natural Recovery',
          description: 'Recover expended spell slots',
          automation: { type: 'natural_recovery' },
        },
      });
    });

    it('should pass through action.name into payload.name', async () => {
      const action = makeAction({ name: 'Custom Name' });
      const result = await handle(action, {}, 'campaign', 'map');

      expect(result.payload.name).toBe('Custom Name');
    });

    it('should pass through action.description into payload.description', async () => {
      const action = makeAction({ description: 'Custom description text' });
      const result = await handle(action, {}, 'campaign', 'map');

      expect(result.payload.description).toBe('Custom description text');
    });

    it('should pass through the automation object into payload.automation', async () => {
      const automation = { type: 'natural_recovery', extra: 'data', count: 5 };
      const action = makeAction({ automation });
      const result = await handle(action, {}, 'campaign', 'map');

      expect(result.payload.automation).toEqual(automation);
    });

    it('should use playerStats.name and campaignName parameters without altering them in the result', async () => {
      const action = makeAction();
      const result = await handle(action, { name: 'Elder Druid' }, 'MyCampaign', 'map');

      expect(result.payload.name).toBe('Natural Recovery');
    });
  });

  describe('description defaults', () => {
    it('should default description to empty string when action.description is undefined', async () => {
      const action = { name: 'Natural Recovery', automation: { type: 'natural_recovery' } };
      const result = await handle(action, {}, 'campaign', 'map');

      expect(result.payload.description).toBe('');
    });

    it('should default description to empty string when action.description is null', async () => {
      const action = { name: 'Natural Recovery', description: null, automation: { type: 'natural_recovery' } };
      const result = await handle(action, {}, 'campaign', 'map');

      expect(result.payload.description).toBe('');
    });
  });

  describe('automation passthrough', () => {
    it('should pass through automation as null when provided', async () => {
      const action = { name: 'Natural Recovery', automation: null };
      const result = await handle(action, {}, 'campaign', 'map');

      expect(result.payload.automation).toBe(null);
    });

    it('should pass through automation as undefined when omitted', async () => {
      const action = { name: 'Natural Recovery' };
      const result = await handle(action, {}, 'campaign', 'map');

      expect(result.payload.automation).toBe(undefined);
    });

    it('should pass through complex automation objects unchanged', async () => {
      const automation = {
        type: 'natural_recovery',
        restore_expression: '1d4',
        max_slots: 3,
        classes: ['Druid'],
        subclasses: ['Circle of the Land'],
      };
      const action = makeAction({ automation });
      const result = await handle(action, {}, 'campaign', 'map');

      expect(result.payload.automation).toEqual(automation);
    });
  });

  describe('edge cases', () => {
    it('should return modal even with empty action object', async () => {
      const result = await handle({}, {}, 'campaign', 'map');

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('naturalRecovery');
      expect(result.payload.name).toBe(undefined);
      expect(result.payload.description).toBe('');
      expect(result.payload.automation).toBe(undefined);
    });

    it('should return modal with empty name when action.name is empty string', async () => {
      const action = makeAction({ name: '' });
      const result = await handle(action, {}, 'campaign', 'map');

      expect(result.payload.name).toBe('');
    });

    it('should handle playerStats with extra fields without error', async () => {
      const playerStats = {
        name: 'Druid',
        level: 10,
        automation: { passives: [{ type: 'natural_recovery' }] },
      };
      const action = makeAction();
      const result = await handle(action, playerStats, 'campaign', 'map');

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('naturalRecovery');
    });

    it('should handle campaignName being null', async () => {
      const action = makeAction();
      const result = await handle(action, {}, null, 'map');

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('naturalRecovery');
    });

    it('should handle map parameter being undefined', async () => {
      const action = makeAction();
      const result = await handle(action, {}, 'campaign', undefined);

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('naturalRecovery');
    });
  });
});
