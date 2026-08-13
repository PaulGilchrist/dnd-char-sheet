// @cleaned-by-ai
// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks BEFORE imports ───────────────────────────────────────

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../services/encounters/combatData.js', () => ({
  getCurrentCombatRound: vi.fn(),
  loadCombatSummary: vi.fn(),
}));

// ── Imports ────────────────────────────────────────────────────

import { handle } from './extraActionHandler.js';
import * as useRuntimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as combatData from '../../../../services/encounters/combatData.js';

// ── Helpers ────────────────────────────────────────────────────

const campaignName = 'TestCampaign';
const defaultAction = {
  name: 'Action Surge',
  description: 'Instantly take another action',
  automation: {},
};

function makePlayerStats(overrides = {}) {
  return { name: 'TestHero', ...overrides };
}

function makeAction(automation = {}) {
  return { ...defaultAction, automation: { ...automation } };
}

function expectSuccess(result) {
  expect(result.type).toBe('popup');
  expect(result.payload.type).toBe('automation_info');
}

function expectUsesSet(key, value, name = 'TestHero') {
  expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
    name, key, value, campaignName, true,
  );
}

// ── Tests ──────────────────────────────────────────────────────

describe('extraActionHandler.handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRuntimeState.getRuntimeValue.mockReset();
    useRuntimeState.setRuntimeValue.mockReset().mockResolvedValue(undefined);
  });

  describe('oncePerCombat check', () => {
    it('returns popup when combat round > 1', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerCombat: true });
      combatData.loadCombatSummary.mockResolvedValue({ round: 2, creatures: [] });

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toBe('Action Surge can only be used once per combat.');
      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
    });

    it('sets uses to 0 after first successful use in combat', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerCombat: true, uses: 1 });
      combatData.loadCombatSummary.mockResolvedValue({ round: 1, creatures: [] });

      await handle(action, ps, campaignName);

      expectUsesSet('actionSurgeUses', 0);
    });
  });

  describe('firstRoundOnly check', () => {
    it('returns popup when current round > 1', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ firstRoundOnly: true });
      combatData.getCurrentCombatRound.mockReturnValue(2);

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toBe(
        'Action Surge can only be used in the first round of combat.',
      );
      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
    });
  });

  describe('uses limit (usesMax > 0)', () => {
    it('returns popup when no uses remaining (usesUsed is 0)', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ uses: 2 });
      useRuntimeState.getRuntimeValue.mockReturnValue(0);

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toBe(
        'Action Surge has no uses remaining. Recharges on a Short Rest.',
      );
      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
    });

    it('uses custom recharge message from auto.recharge', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ uses: 2, recharge: 'Long Rest' });
      useRuntimeState.getRuntimeValue.mockReturnValue(0);

      const result = await handle(action, ps, campaignName);

      expect(result.payload.description).toBe(
        'Action Surge has no uses remaining. Recharges on a Long Rest.',
      );
    });

    it('decrements uses and returns success when usesUsed > 0', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ uses: 2 });
      useRuntimeState.getRuntimeValue.mockReturnValue(2);

      const result = await handle(action, ps, campaignName);

      expectSuccess(result);
      expectUsesSet('actionSurgeUses', 1);
    });

    it('uses custom resourceKey from automation', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ uses: 3, resourceKey: 'customUses' });
      useRuntimeState.getRuntimeValue.mockReturnValue(3);

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expectUsesSet('customUses', 2);
    });

    it('uses default uses of 1 when auto.uses is missing', async () => {
      const ps = makePlayerStats();
      const action = makeAction({});
      useRuntimeState.getRuntimeValue.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expectUsesSet('actionSurgeUses', 0);
    });
  });

  describe('oncePerTurn check', () => {
    it('returns popup when already used this turn', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerTurn: true, uses: 2 });
      useRuntimeState.getRuntimeValue
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(1);
      combatData.getCurrentCombatRound.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toBe('Action Surge can only be used once per turn.');
      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
    });

    it('marks as used this turn and decrements when not yet used', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerTurn: true, uses: 2 });
      useRuntimeState.getRuntimeValue
        .mockReturnValueOnce(2)
        .mockReturnValue(undefined);
      combatData.getCurrentCombatRound.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expectUsesSet('actionSurgeUsedThisRound', 1);
      expectUsesSet('actionSurgeUses', 1);
    });

    it('allows use in a new round when usedThisRound !== currentRound', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerTurn: true, uses: 2 });
      useRuntimeState.getRuntimeValue
        .mockReturnValueOnce(2)
        .mockReturnValueOnce(1);
      combatData.getCurrentCombatRound.mockReturnValue(2);

      const result = await handle(action, ps, campaignName);

      expectSuccess(result);
    });
  });

  describe('interaction: oncePerCombat + oncePerTurn', () => {
    it('blocks when oncePerCombat already used (round > 1) regardless of oncePerTurn', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerCombat: true, oncePerTurn: true, uses: 1 });
      combatData.loadCombatSummary.mockResolvedValue({ round: 3, creatures: [] });

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toBe('Action Surge can only be used once per combat.');
      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
    });

    it('passes oncePerCombat but blocks oncePerTurn on second use in same combat', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerCombat: true, oncePerTurn: true, uses: 1 });
      combatData.loadCombatSummary.mockResolvedValue({ round: 1, creatures: [] });
      useRuntimeState.getRuntimeValue
        .mockReturnValueOnce(1)
        .mockReturnValueOnce(1);
      combatData.getCurrentCombatRound.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toBe('Action Surge can only be used once per turn.');
    });
  });

  describe('interaction: firstRoundOnly + uses', () => {
    it('blocks on firstRoundOnly check before checking uses', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ firstRoundOnly: true, uses: 5 });
      combatData.getCurrentCombatRound.mockReturnValue(3);

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toBe(
        'Action Surge can only be used in the first round of combat.',
      );
      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
    });
  });

  describe('success popup payload', () => {
    it('returns automation_info popup with action name and description', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ uses: 1 });
      useRuntimeState.getRuntimeValue.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.name).toBe('Action Surge');
      expect(result.payload.description).toBe('Instantly take another action');
    });

    it('includes automationType in payload when set', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ type: 'action_surge', uses: 1 });
      useRuntimeState.getRuntimeValue.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expect(result.payload.automationType).toBe('action_surge');
    });
  });

  describe('edge cases: oncePerCombat with round === 1', () => {
    it('passes through oncePerCombat when round is exactly 1', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerCombat: true, uses: 1 });
      combatData.loadCombatSummary.mockResolvedValue({ round: 1, creatures: [] });
      useRuntimeState.getRuntimeValue.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expectSuccess(result);
      expectUsesSet('actionSurgeUses', 0);
    });

    it('passes through oncePerCombat when loadCombatSummary returns null', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerCombat: true, uses: 1 });
      combatData.loadCombatSummary.mockResolvedValue(null);
      useRuntimeState.getRuntimeValue.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expectSuccess(result);
      expectUsesSet('actionSurgeUses', 0);
    });
  });

  describe('edge cases: firstRoundOnly with edge round values', () => {
    it('passes through firstRoundOnly when getCurrentCombatRound returns undefined', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ firstRoundOnly: true, uses: 1 });
      combatData.getCurrentCombatRound.mockReturnValue(undefined);
      useRuntimeState.getRuntimeValue.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expectSuccess(result);
    });

    it('passes through firstRoundOnly when getCurrentCombatRound returns null', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ firstRoundOnly: true, uses: 1 });
      combatData.getCurrentCombatRound.mockReturnValue(null);
      useRuntimeState.getRuntimeValue.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expectSuccess(result);
    });

    it('passes through firstRoundOnly when getCurrentCombatRound returns 1', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ firstRoundOnly: true, uses: 1 });
      combatData.getCurrentCombatRound.mockReturnValue(1);
      useRuntimeState.getRuntimeValue.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expectSuccess(result);
    });
  });

  describe('edge cases: uses with usesMax === 0', () => {
    it('treats uses: 0 as uses: 1 due to || 1 default in handler', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ uses: 0, oncePerTurn: true });
      combatData.getCurrentCombatRound.mockReturnValue(1);
      useRuntimeState.getRuntimeValue
        .mockReturnValue(undefined)
        .mockReturnValue(undefined);

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expectUsesSet('actionSurgeUsedThisRound', 1);
      expectUsesSet('actionSurgeUses', 0);
    });

    it('skips uses check entirely when uses is undefined (defaults to 1, not 0)', async () => {
      const ps = makePlayerStats();
      const action = makeAction({});
      useRuntimeState.getRuntimeValue.mockReturnValue(undefined);

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expectUsesSet('actionSurgeUses', 0);
    });
  });

  describe('edge cases: usesUsed null/undefined defaults', () => {
    it('defaults usesUsed to usesMax when getRuntimeValue returns null', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ uses: 3 });
      useRuntimeState.getRuntimeValue.mockReturnValue(null);

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expectUsesSet('actionSurgeUses', 2);
    });

    it('defaults usesUsed to usesMax when getRuntimeValue returns undefined', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ uses: 5, resourceKey: 'spellSlotUses' });
      useRuntimeState.getRuntimeValue.mockReturnValue(undefined);

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expectUsesSet('spellSlotUses', 4);
    });
  });

  describe('edge cases: oncePerTurn without combat round info', () => {
    it('blocks when getCurrentCombatRound returns undefined (usedThisRound also undefined, equal)', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerTurn: true, uses: 2 });
      useRuntimeState.getRuntimeValue
        .mockReturnValueOnce(2)
        .mockReturnValue(undefined);
      combatData.getCurrentCombatRound.mockReturnValue(undefined);

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toBe('Action Surge can only be used once per turn.');
    });

    it('allows oncePerTurn when usedThisRound is falsy but currentRound is 1', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerTurn: true, uses: 2 });
      useRuntimeState.getRuntimeValue
        .mockReturnValueOnce(2)
        .mockReturnValue(undefined);
      combatData.getCurrentCombatRound.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expectSuccess(result);
      expectUsesSet('actionSurgeUsedThisRound', 1);
    });
  });

  describe('edge cases: automationInfoPopup with missing fields', () => {
    it('returns empty string for description when action.description is missing', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ uses: 1 });
      delete action.description;
      useRuntimeState.getRuntimeValue.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toBe('');
    });

    it('returns undefined for automationType when action.automation.type is missing', async () => {
      const ps = makePlayerStats();
      const action = { name: 'Test Action', automation: { uses: 1 } };
      useRuntimeState.getRuntimeValue.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expect(result.payload.automationType).toBeUndefined();
    });

    it('includes full automation object in payload', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ uses: 2, oncePerCombat: true, oncePerTurn: true, type: 'action_surge' });
      combatData.loadCombatSummary.mockResolvedValue({ round: 1, creatures: [] });
      useRuntimeState.getRuntimeValue.mockReturnValue(2);

      const result = await handle(action, ps, campaignName);

      expect(result.payload.automation).toEqual({
        uses: 2,
        oncePerCombat: true,
        oncePerTurn: true,
        type: 'action_surge',
      });
    });
  });

  describe('edge cases: resourceKey defaults', () => {
    it('uses actionSurgeUses as default resourceKey', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ uses: 1 });
      useRuntimeState.getRuntimeValue.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expectUsesSet('actionSurgeUses', 0);
    });

    it('does not set uses to 0 for oncePerCombat when resourceKey is not actionSurgeUses', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerCombat: true, uses: 1, resourceKey: 'myCustomResource' });
      combatData.loadCombatSummary.mockResolvedValue({ round: 1, creatures: [] });
      useRuntimeState.getRuntimeValue.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expectUsesSet('myCustomResource', 0);
    });
  });

  describe('edge cases: oncePerCombat + firstRoundOnly together', () => {
    it('blocks on oncePerCombat first (round > 1), never reaches firstRoundOnly check', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerCombat: true, firstRoundOnly: true, uses: 1 });
      combatData.loadCombatSummary.mockResolvedValue({ round: 3, creatures: [] });

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toBe('Action Surge can only be used once per combat.');
      expect(combatData.getCurrentCombatRound).not.toHaveBeenCalled();
    });

    it('passes oncePerCombat (round 1) but blocks on firstRoundOnly (round > 1)', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerCombat: true, firstRoundOnly: true, uses: 1 });
      combatData.loadCombatSummary.mockResolvedValue({ round: 1, creatures: [] });
      combatData.getCurrentCombatRound.mockReturnValue(3);

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toBe('Action Surge can only be used in the first round of combat.');
    });

    it('passes both checks and succeeds when round 1 for both', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerCombat: true, firstRoundOnly: true, uses: 1 });
      combatData.loadCombatSummary.mockResolvedValue({ round: 1, creatures: [] });
      combatData.getCurrentCombatRound.mockReturnValue(1);
      useRuntimeState.getRuntimeValue.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expectSuccess(result);
      expectUsesSet('actionSurgeUses', 0);
    });
  });

  describe('edge cases: usesUsed exactly 1', () => {
    it('decrements to 0 and sets to 0 for oncePerCombat', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerCombat: true, uses: 1 });
      combatData.loadCombatSummary.mockResolvedValue({ round: 1, creatures: [] });
      useRuntimeState.getRuntimeValue.mockReturnValue(1);

      await handle(action, ps, campaignName);

      expectUsesSet('actionSurgeUses', 0);
    });

    it('does not decrement when usesUsed is already 0 (but this case should have been blocked)', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ uses: 1 });
      useRuntimeState.getRuntimeValue.mockReturnValue(0);

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('no uses remaining');
      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
    });
  });

  describe('edge cases: oncePerTurn with same round value', () => {
    it('blocks when usedThisRound equals currentRound (both 5)', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerTurn: true, uses: 2 });
      useRuntimeState.getRuntimeValue
        .mockReturnValueOnce(2)
        .mockReturnValueOnce(5);
      combatData.getCurrentCombatRound.mockReturnValue(5);

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toBe('Action Surge can only be used once per turn.');
      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
    });

    it('allows when usedThisRound is 0 and currentRound is 1', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerTurn: true, uses: 2 });
      useRuntimeState.getRuntimeValue
        .mockReturnValueOnce(2)
        .mockReturnValueOnce(0);
      combatData.getCurrentCombatRound.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expectSuccess(result);
      expectUsesSet('actionSurgeUsedThisRound', 1);
    });
  });

  describe('edge cases: no oncePerTurn, no oncePerCombat, no firstRoundOnly', () => {
    it('succeeds with no special flags and uses > 0', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ uses: 3 });
      useRuntimeState.getRuntimeValue.mockReturnValue(3);

      const result = await handle(action, ps, campaignName);

      expectSuccess(result);
      expectUsesSet('actionSurgeUses', 2);
    });

    it('succeeds with no flags and no uses limit', async () => {
      const ps = makePlayerStats();
      const action = makeAction({});
      useRuntimeState.getRuntimeValue.mockReturnValue(undefined);

      const result = await handle(action, ps, campaignName);

      expectSuccess(result);
      expectUsesSet('actionSurgeUses', 0);
    });
  });
});
