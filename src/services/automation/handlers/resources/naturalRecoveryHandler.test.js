// @improved-by-ai
import { describe, it, expect } from 'vitest';

import { handle } from './naturalRecoveryHandler.js';

// ── Tests ────────────────────────────────────────────────────────

describe('naturalRecoveryHandler.handle', () => {
  describe('modal structure', () => {
    it('should return a modal result with naturalRecovery modalName and payload containing action fields', async () => {
      const action = {
        name: 'Natural Recovery',
        description: 'Recover expended spell slots',
        automation: { type: 'natural_recovery' },
      };
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

    it('should pass through custom action fields into payload', async () => {
      const action = {
        name: 'Custom Name',
        description: 'Custom description',
        automation: { type: 'natural_recovery', extra: 'data', count: 5 },
      };
      const result = await handle(action, {}, 'campaign', 'map');

      expect(result.payload.name).toBe('Custom Name');
      expect(result.payload.description).toBe('Custom description');
      expect(result.payload.automation).toEqual({ type: 'natural_recovery', extra: 'data', count: 5 });
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
      const action = { name: '', automation: { type: 'natural_recovery' } };
      const result = await handle(action, {}, 'campaign', 'map');

      expect(result.payload.name).toBe('');
    });

    it('should ignore playerStats, campaignName, and map parameters', async () => {
      const action = { name: 'Natural Recovery', automation: { type: 'natural_recovery' } };
      const playerStats = {
        name: 'Druid',
        level: 10,
        automation: { passives: [{ type: 'natural_recovery' }] },
      };

      const result = await handle(action, playerStats, 'MyCampaign', 'combat-map');

      expect(result.payload.name).toBe('Natural Recovery');
      expect(result.payload.automation).toEqual({ type: 'natural_recovery' });
    });

    it('should handle campaignName being null', async () => {
      const action = { name: 'Natural Recovery', automation: { type: 'natural_recovery' } };
      const result = await handle(action, {}, null, 'map');

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('naturalRecovery');
    });

    it('should handle map parameter being undefined', async () => {
      const action = { name: 'Natural Recovery', automation: { type: 'natural_recovery' } };
      const result = await handle(action, {}, 'campaign', undefined);

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('naturalRecovery');
    });
  });
});
