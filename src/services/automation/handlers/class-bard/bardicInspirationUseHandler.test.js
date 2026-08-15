// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

vi.mock('../../../dice/diceRoller.js', () => ({
  rollExpression: vi.fn(),
}));

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

// ── Imports ────────────────────────────────────────────────────

import { handle } from './bardicInspirationUseHandler.js';
import * as diceRoller from '../../../dice/diceRoller.js';
import * as runtimeState from '../../../../hooks/runtime/useRuntimeState.js';

// ── Helpers ────────────────────────────────────────────────────

const campaignName = 'TestCampaign';
const playerName = 'TestHero';

function makePlayerStats(overrides = {}) {
  return {
    name: playerName,
    ...overrides,
  };
}

function makeAction(overrides = {}) {
  return {
    name: 'Use Bardic Inspiration',
    automation: {
      type: 'bardic_inspiration_use',
      ...overrides.automation,
    },
    ...overrides,
  };
}

function mockNoDie() {
  runtimeState.getRuntimeValue.mockReturnValue(null);
}

function mockWithDie(dieSize, grantedBy) {
  runtimeState.getRuntimeValue.mockImplementation((_name, key) => {
    if (key === 'bardicInspirationDie') return dieSize;
    if (key === 'bardicInspirationGrantedBy') return grantedBy;
    return null;
  });
}

// ── Tests ──────────────────────────────────────────────────────

describe('bardicInspirationUseHandler.handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeState.getRuntimeValue.mockReset();
    diceRoller.rollExpression.mockReset();
  });

  // ── No bardic inspiration die ────────────────────────────────

  describe('no bardic inspiration die', () => {
    it('returns info popup when bardicInspirationDie is null', async () => {
      mockNoDie();
      const action = makeAction();

      const result = await handle(action, makePlayerStats(), campaignName);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.name).toBe(action.name);
      expect(result.payload.description).toBe('You do not have a Bardic Inspiration die.');
    });

    it('returns info popup when bardicInspirationDie is 0', async () => {
      runtimeState.getRuntimeValue.mockReturnValue(0);

      const result = await handle(makeAction(), makePlayerStats(), campaignName);

      expect(result.payload.description).toBe('You do not have a Bardic Inspiration die.');
    });

    it('returns info popup when bardicInspirationDie is undefined', async () => {
      runtimeState.getRuntimeValue.mockReturnValue(undefined);

      const result = await handle(makeAction(), makePlayerStats(), campaignName);

      expect(result.payload.description).toBe('You do not have a Bardic Inspiration die.');
    });

    it('does not roll dice or set runtime state when there is no die', async () => {
      mockNoDie();

      await handle(makeAction(), makePlayerStats(), campaignName);

      expect(diceRoller.rollExpression).not.toHaveBeenCalled();
      expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
    });

    it('reads bardicInspirationDie from runtime state', async () => {
      mockNoDie();

      await handle(makeAction(), makePlayerStats(), campaignName);

      expect(runtimeState.getRuntimeValue).toHaveBeenCalledWith(
        playerName,
        'bardicInspirationDie',
        campaignName,
      );
    });
  });

  // ── Roll expression fails ────────────────────────────────────

  describe('roll expression fails', () => {
    it('returns info popup when rollExpression returns null', async () => {
      mockWithDie(8, null);
      diceRoller.rollExpression.mockReturnValue(null);

      const result = await handle(makeAction(), makePlayerStats(), campaignName);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.name).toBe('Use Bardic Inspiration');
      expect(result.payload.description).toBe('Roll failed.');
    });

    it('does not clear runtime state when roll fails', async () => {
      mockWithDie(8, 'Ally Bard');
      diceRoller.rollExpression.mockReturnValue(null);

      await handle(makeAction(), makePlayerStats(), campaignName);

      expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
    });

    it('rolls the correct die expression for the die size', async () => {
      mockWithDie(10, null);
      diceRoller.rollExpression.mockReturnValue(null);

      await handle(makeAction(), makePlayerStats(), campaignName);

      expect(diceRoller.rollExpression).toHaveBeenCalledWith('1d10');
    });
  });

  // ── Successful roll ──────────────────────────────────────────

  describe('successful roll', () => {
    function mockSuccess(dieSize, grantedBy, rollResult) {
      mockWithDie(dieSize, grantedBy);
      diceRoller.rollExpression.mockReturnValue(rollResult);
    }

    it('reads both bardicInspirationDie and bardicInspirationGrantedBy from runtime state', async () => {
      mockSuccess(8, 'Bard NPC', { total: 5, rolls: [5] });

      await handle(makeAction(), makePlayerStats(), campaignName);

      expect(runtimeState.getRuntimeValue).toHaveBeenCalledWith(
        playerName,
        'bardicInspirationDie',
        campaignName,
      );
      expect(runtimeState.getRuntimeValue).toHaveBeenCalledWith(
        playerName,
        'bardicInspirationGrantedBy',
        campaignName,
      );
    });

    it('rolls the correct die expression for the die size', async () => {
      mockSuccess(8, null, { total: 5, rolls: [5] });

      await handle(makeAction(), makePlayerStats(), campaignName);

      expect(diceRoller.rollExpression).toHaveBeenCalledWith('1d8');
    });

    it('clears bardicInspirationDie runtime state', async () => {
      mockSuccess(8, null, { total: 5, rolls: [5] });

      await handle(makeAction(), makePlayerStats(), campaignName);

      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
        playerName,
        'bardicInspirationDie',
        null,
        campaignName,
      );
    });

    it('clears bardicInspirationGrantedBy runtime state', async () => {
      mockSuccess(8, 'Bard NPC', { total: 5, rolls: [5] });

      await handle(makeAction(), makePlayerStats(), campaignName);

      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
        playerName,
        'bardicInspirationGrantedBy',
        null,
        campaignName,
      );
    });

    it('includes action.automation in the returned payload', async () => {
      mockSuccess(8, null, { total: 5, rolls: [5] });

      const result = await handle(makeAction(), makePlayerStats(), campaignName);

      expect(result.payload.automation).toEqual({ type: 'bardic_inspiration_use' });
    });

    it('includes roll total and individual rolls in the description', async () => {
      mockSuccess(8, null, { total: 5, rolls: [5] });

      const result = await handle(makeAction(), makePlayerStats(), campaignName);

      expect(result.payload.description).toContain('1d8');
      expect(result.payload.description).toContain('**5**');
      expect(result.payload.description).toContain('5');
    });

    it('includes individual roll components in the description', async () => {
      mockSuccess(8, null, { total: 5, rolls: [3, 2] });

      const result = await handle(makeAction(), makePlayerStats(), campaignName);

      expect(result.payload.description).toContain('**5**');
      expect(result.payload.description).toContain('3, 2');
    });

    it('includes grantedBy in the description when set', async () => {
      mockSuccess(8, 'Bard College Member', { total: 5, rolls: [5] });

      const result = await handle(makeAction(), makePlayerStats(), campaignName);

      expect(result.payload.description).toContain('Die granted by Bard College Member');
    });

    it('falls back to "unknown" when grantedBy is null', async () => {
      mockSuccess(8, null, { total: 4, rolls: [4] });

      const result = await handle(makeAction(), makePlayerStats(), campaignName);

      expect(result.payload.description).toContain('Die granted by unknown');
    });

    it('falls back to "unknown" when grantedBy is undefined', async () => {
      mockSuccess(8, undefined, { total: 4, rolls: [4] });

      const result = await handle(makeAction(), makePlayerStats(), campaignName);

      expect(result.payload.description).toContain('Die granted by unknown');
    });

    it('works with different die sizes', async () => {
      mockSuccess(10, null, { total: 7, rolls: [7] });

      const result = await handle(makeAction(), makePlayerStats(), campaignName);

      expect(diceRoller.rollExpression).toHaveBeenCalledWith('1d10');
      expect(result.payload.description).toContain('1d10');
      expect(result.payload.description).toContain('**7**');
    });

    it('works with the smallest bardic inspiration die (d6)', async () => {
      mockSuccess(6, null, { total: 3, rolls: [3] });

      const result = await handle(makeAction(), makePlayerStats(), campaignName);

      expect(diceRoller.rollExpression).toHaveBeenCalledWith('1d6');
      expect(result.payload.description).toContain('1d6');
      expect(result.payload.description).toContain('**3**');
    });

    it('works with the largest bardic inspiration die (d12)', async () => {
      mockSuccess(12, null, { total: 10, rolls: [10] });

      const result = await handle(makeAction(), makePlayerStats(), campaignName);

      expect(diceRoller.rollExpression).toHaveBeenCalledWith('1d12');
      expect(result.payload.description).toContain('1d12');
      expect(result.payload.description).toContain('**10**');
    });

    it('includes "Add this to an ability check" instruction in the description', async () => {
      mockSuccess(8, null, { total: 5, rolls: [5] });

      const result = await handle(makeAction(), makePlayerStats(), campaignName);

      expect(result.payload.description).toContain('Add this to an ability check');
    });
  });
});
