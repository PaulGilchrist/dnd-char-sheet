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

function expectBlocked(result, actionName = 'Action Surge') {
  expect(result.type).toBe('popup');
  expect(result.payload.type).toBe('automation_info');
  expect(result.payload.name).toBe(actionName);
  expect(result.payload.automation).toBeDefined();
}

// ── Tests ──────────────────────────────────────────────────────

describe('extraActionHandler.handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRuntimeState.getRuntimeValue.mockReset();
    useRuntimeState.setRuntimeValue.mockReset().mockResolvedValue(undefined);
  });

  describe('oncePerCombat check', () => {
    it('blocks when combat round > 1', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerCombat: true });
      combatData.loadCombatSummary.mockResolvedValue({ round: 2, creatures: [] });

      const result = await handle(action, ps, campaignName);

      expectBlocked(result);
      expect(result.payload.description).toBe('Action Surge can only be used once per combat.');
      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
    });

    it('blocks on boundary when round is exactly 2', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerCombat: true });
      combatData.loadCombatSummary.mockResolvedValue({ round: 2, creatures: [] });

      const result = await handle(action, ps, campaignName);

      expect(result.payload.description).toBe('Action Surge can only be used once per combat.');
    });

    it('allows use on round 1', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerCombat: true, uses: 1 });
      combatData.loadCombatSummary.mockResolvedValue({ round: 1, creatures: [] });

      await handle(action, ps, campaignName);

      expectUsesSet('actionSurgeUses', 0);
    });

    it('allows use when loadCombatSummary returns null', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerCombat: true, uses: 1 });
      combatData.loadCombatSummary.mockResolvedValue(null);
      useRuntimeState.getRuntimeValue.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expectSuccess(result);
      expectUsesSet('actionSurgeUses', 0);
    });
  });

  describe('firstRoundOnly check', () => {
    it('blocks when current round > 1', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ firstRoundOnly: true });
      combatData.getCurrentCombatRound.mockReturnValue(2);

      const result = await handle(action, ps, campaignName);

      expectBlocked(result);
      expect(result.payload.description).toBe(
        'Action Surge can only be used in the first round of combat.',
      );
      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
    });

    it('allows when getCurrentCombatRound returns undefined', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ firstRoundOnly: true, uses: 1 });
      combatData.getCurrentCombatRound.mockReturnValue(undefined);
      useRuntimeState.getRuntimeValue.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expectSuccess(result);
    });

    it('allows when getCurrentCombatRound returns null', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ firstRoundOnly: true, uses: 1 });
      combatData.getCurrentCombatRound.mockReturnValue(null);
      useRuntimeState.getRuntimeValue.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expectSuccess(result);
    });

    it('allows when getCurrentCombatRound returns 1', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ firstRoundOnly: true, uses: 1 });
      combatData.getCurrentCombatRound.mockReturnValue(1);
      useRuntimeState.getRuntimeValue.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expectSuccess(result);
    });
  });

  describe('uses limit (usesMax > 0)', () => {
    it('blocks when no uses remaining (usesUsed is 0)', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ uses: 2 });
      useRuntimeState.getRuntimeValue.mockReturnValue(0);

      const result = await handle(action, ps, campaignName);

      expectBlocked(result);
      expect(result.payload.description).toBe(
        'Action Surge has no uses remaining. Recharges on a Short Rest.',
      );
      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
    });

    it('blocks when usesUsed is negative', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ uses: 2 });
      useRuntimeState.getRuntimeValue.mockReturnValue(-1);

      const result = await handle(action, ps, campaignName);

      expect(result.payload.description).toBe(
        'Action Surge has no uses remaining. Recharges on a Short Rest.',
      );
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

      expect(result.payload.type).toBe('automation_info');
      expectUsesSet('customUses', 2);
    });

    it('defaults uses to 1 when auto.uses is missing', async () => {
      const ps = makePlayerStats();
      const action = makeAction({});
      useRuntimeState.getRuntimeValue.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expect(result.payload.type).toBe('automation_info');
      expectUsesSet('actionSurgeUses', 0);
    });

    it('uses=0 defaults to usesMax of 1', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ uses: 0, oncePerTurn: true });
      combatData.getCurrentCombatRound.mockReturnValue(1);
      useRuntimeState.getRuntimeValue
        .mockReturnValue(undefined)
        .mockReturnValue(undefined);

      const result = await handle(action, ps, campaignName);

      expect(result.payload.type).toBe('automation_info');
      expectUsesSet('actionSurgeUsedThisRound', 1);
      expectUsesSet('actionSurgeUses', 0);
    });
  });

  describe('oncePerTurn check', () => {
    it('blocks when already used this turn', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerTurn: true, uses: 2 });
      useRuntimeState.getRuntimeValue
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(1);
      combatData.getCurrentCombatRound.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expectBlocked(result);
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

      expectSuccess(result);
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
      expectUsesSet('actionSurgeUsedThisRound', 2);
      expectUsesSet('actionSurgeUses', 1);
    });

    it('blocks when both usedThisRound and currentRound are undefined', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerTurn: true, uses: 2 });
      useRuntimeState.getRuntimeValue
        .mockReturnValueOnce(2)
        .mockReturnValue(undefined);
      combatData.getCurrentCombatRound.mockReturnValue(undefined);

      const result = await handle(action, ps, campaignName);

      expect(result.payload.description).toBe('Action Surge can only be used once per turn.');
    });

    it('allows when usedThisRound is falsy but currentRound is 1', async () => {
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

    it('blocks when usedThisRound equals currentRound (both 5)', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerTurn: true, uses: 2 });
      useRuntimeState.getRuntimeValue
        .mockReturnValueOnce(2)
        .mockReturnValueOnce(5);
      combatData.getCurrentCombatRound.mockReturnValue(5);

      const result = await handle(action, ps, campaignName);

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

  describe('oncePerCombat and oncePerTurn interaction', () => {
    it('blocks on oncePerCombat first when round > 1', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerCombat: true, oncePerTurn: true, uses: 1 });
      combatData.loadCombatSummary.mockResolvedValue({ round: 3, creatures: [] });

      const result = await handle(action, ps, campaignName);

      expect(result.payload.description).toBe('Action Surge can only be used once per combat.');
      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
    });

    it('passes oncePerCombat but blocks oncePerTurn on second use', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerCombat: true, oncePerTurn: true, uses: 1 });
      combatData.loadCombatSummary.mockResolvedValue({ round: 1, creatures: [] });
      useRuntimeState.getRuntimeValue
        .mockReturnValueOnce(1)
        .mockReturnValueOnce(1);
      combatData.getCurrentCombatRound.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expect(result.payload.description).toBe('Action Surge can only be used once per turn.');
    });
  });

  describe('oncePerCombat and firstRoundOnly interaction', () => {
    it('blocks on oncePerCombat first when round > 1', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerCombat: true, firstRoundOnly: true, uses: 1 });
      combatData.loadCombatSummary.mockResolvedValue({ round: 3, creatures: [] });

      const result = await handle(action, ps, campaignName);

      expect(result.payload.description).toBe('Action Surge can only be used once per combat.');
      expect(combatData.getCurrentCombatRound).not.toHaveBeenCalled();
    });

    it('passes oncePerCombat but blocks on firstRoundOnly', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerCombat: true, firstRoundOnly: true, uses: 1 });
      combatData.loadCombatSummary.mockResolvedValue({ round: 1, creatures: [] });
      combatData.getCurrentCombatRound.mockReturnValue(3);

      const result = await handle(action, ps, campaignName);

      expect(result.payload.description).toBe(
        'Action Surge can only be used in the first round of combat.',
      );
    });

    it('passes both checks and succeeds on round 1', async () => {
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

  describe('firstRoundOnly and uses interaction', () => {
    it('blocks on firstRoundOnly before checking uses', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ firstRoundOnly: true, uses: 5 });
      combatData.getCurrentCombatRound.mockReturnValue(3);

      const result = await handle(action, ps, campaignName);

      expect(result.payload.description).toBe(
        'Action Surge can only be used in the first round of combat.',
      );
      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
    });
  });

  describe('success popup payload', () => {
    it('includes action name and description', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ uses: 1 });
      useRuntimeState.getRuntimeValue.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expect(result.payload.name).toBe('Action Surge');
      expect(result.payload.description).toBe('Instantly take another action');
    });

    it('includes automationType when set', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ type: 'action_surge', uses: 1 });
      useRuntimeState.getRuntimeValue.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expect(result.payload.automationType).toBe('action_surge');
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

    it('uses empty string for description when missing', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ uses: 1 });
      delete action.description;
      useRuntimeState.getRuntimeValue.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expect(result.payload.description).toBe('');
    });

    it('includes automation in error popups', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ uses: 2 });
      useRuntimeState.getRuntimeValue.mockReturnValue(0);

      const result = await handle(action, ps, campaignName);

      expect(result.payload.automation).toEqual({ uses: 2 });
    });
  });

  describe('resourceKey defaults', () => {
    it('oncePerCombat sets custom resourceKey to 0', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerCombat: true, uses: 1, resourceKey: 'myCustomResource' });
      combatData.loadCombatSummary.mockResolvedValue({ round: 1, creatures: [] });
      useRuntimeState.getRuntimeValue.mockReturnValue(1);

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expectUsesSet('myCustomResource', 0);
    });
  });

  describe('usesUsed exactly 1', () => {
    it('decrements to 0 for oncePerCombat', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ oncePerCombat: true, uses: 1 });
      combatData.loadCombatSummary.mockResolvedValue({ round: 1, creatures: [] });
      useRuntimeState.getRuntimeValue.mockReturnValue(1);

      await handle(action, ps, campaignName);

      expectUsesSet('actionSurgeUses', 0);
    });

    it('blocks when usesUsed is already 0', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ uses: 1 });
      useRuntimeState.getRuntimeValue.mockReturnValue(0);

      const result = await handle(action, ps, campaignName);

      expect(result.payload.description).toContain('no uses remaining');
      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
    });
  });

  describe('usesUsed null/undefined defaults to usesMax', () => {
    it('when getRuntimeValue returns null', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ uses: 3 });
      useRuntimeState.getRuntimeValue.mockReturnValue(null);

      const result = await handle(action, ps, campaignName);

      expect(result.type).toBe('popup');
      expectUsesSet('actionSurgeUses', 2);
    });

    it('when getRuntimeValue returns undefined with custom resourceKey', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ uses: 5, resourceKey: 'spellSlotUses' });
      useRuntimeState.getRuntimeValue.mockReturnValue(undefined);

      await handle(action, ps, campaignName);

      expectUsesSet('spellSlotUses', 4);
    });
  });

  describe('no restriction flags', () => {
    it('succeeds with uses > 0', async () => {
      const ps = makePlayerStats();
      const action = makeAction({ uses: 3 });
      useRuntimeState.getRuntimeValue.mockReturnValue(3);

      const result = await handle(action, ps, campaignName);

      expectSuccess(result);
      expectUsesSet('actionSurgeUses', 2);
    });

    it('succeeds with missing uses (defaults to 1)', async () => {
      const ps = makePlayerStats();
      const action = makeAction({});
      useRuntimeState.getRuntimeValue.mockReturnValue(undefined);

      const result = await handle(action, ps, campaignName);

      expectSuccess(result);
      expectUsesSet('actionSurgeUses', 0);
    });
  });
});
