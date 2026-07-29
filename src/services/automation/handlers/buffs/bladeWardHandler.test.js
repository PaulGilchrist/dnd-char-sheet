import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks BEFORE imports ───────────────────────────────────────

vi.mock('../../common/buffToggle.js', () => ({
  toggleBuff: vi.fn(),
}));

vi.mock('../../../rules/effects/expirations.js', () => ({
  addExpiration: vi.fn(),
}));

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

// ── Imports ────────────────────────────────────────────────────

import { handle } from './bladeWardHandler.js';
import * as buffToggle from '../../common/buffToggle.js';
import * as expirations from '../../../rules/effects/expirations.js';
import * as runtimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as logService from '../../../ui/logService.js';

// ── Constants & Helpers ────────────────────────────────────────

const CAMPAIGN_NAME = 'TestCampaign';
const PLAYER_NAME = 'TestHero';

function makePlayerStats(overrides = {}) {
  return { name: PLAYER_NAME, ...overrides };
}

function makeAction(automation = {}) {
  return {
    name: 'Blade Ward',
    automation: { type: 'buff', ...automation },
  };
}

// ── Tests ──────────────────────────────────────────────────────

describe('bladeWardHandler.handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('activation (wasActive false)', () => {
    it('toggles the buff, registers expiration, creates targetEffect, and returns activation popup', async () => {
      runtimeState.getRuntimeValue.mockReturnValue([]);
      buffToggle.toggleBuff.mockReturnValue({ wasActive: false });

      const ps = makePlayerStats();
      const action = makeAction({ duration: '1 minute' });

      const result = await handle(action, ps, CAMPAIGN_NAME, null);

      expect(buffToggle.toggleBuff).toHaveBeenCalledWith(
        ps.name,
        action.name,
        { type: 'buff', duration: '1 minute', effect: 'blade_ward' },
        CAMPAIGN_NAME
      );
      expect(expirations.addExpiration).toHaveBeenCalledWith(
        ps.name,
        ps.name,
        [{ type: 'remove_active_buff', buffName: action.name }],
        CAMPAIGN_NAME
      );
      expect(runtimeState.getRuntimeValue).toHaveBeenCalledWith('campaign', 'targetEffects');
      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
        'campaign',
        'targetEffects',
        expect.arrayContaining([
          expect.objectContaining({
            target: PLAYER_NAME,
            effect: 'bane_penalty',
            source: PLAYER_NAME,
            displayLabel: 'Blade Ward',
            duration: 'concentration',
          }),
        ]),
        CAMPAIGN_NAME,
        true
      );
      expect(logService.addEntry).toHaveBeenCalledWith(
        CAMPAIGN_NAME,
        expect.objectContaining({
          type: 'automation',
          characterName: PLAYER_NAME,
          abilityName: 'Blade Ward',
          description: 'Blade Ward activated — attackers subtract 1d4 from attack rolls against you',
        })
      );
      expect(result).toEqual({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Blade Ward',
          automationType: 'buff',
          description: 'Blade Ward activated — attackers subtract 1d4 from attack rolls against you',
          automation: action.automation,
        },
      });
    });

    it('replaces existing bane_penalty effect from same source', async () => {
      const existingEffects = [
        { target: PLAYER_NAME, effect: 'bane_penalty', source: PLAYER_NAME, displayLabel: 'Blade Ward' },
        { target: 'Other', effect: 'bless_bonus', source: PLAYER_NAME },
      ];
      runtimeState.getRuntimeValue.mockReturnValue(existingEffects);
      buffToggle.toggleBuff.mockReturnValue({ wasActive: false });

      const ps = makePlayerStats();
      const action = makeAction();

      await handle(action, ps, CAMPAIGN_NAME, null);

      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
        'campaign',
        'targetEffects',
        expect.arrayContaining([
          expect.objectContaining({
            target: PLAYER_NAME,
            effect: 'bane_penalty',
            source: PLAYER_NAME,
            displayLabel: 'Blade Ward',
            duration: 'concentration',
          }),
          expect.objectContaining({
            target: 'Other',
            effect: 'bless_bonus',
            source: PLAYER_NAME,
          }),
        ]),
        CAMPAIGN_NAME,
        true
      );
    });
  });

  describe('deactivation (wasActive true)', () => {
    it('toggles the buff, skips expiration, removes targetEffect, and returns expired popup', async () => {
      runtimeState.getRuntimeValue.mockReturnValue([
        { target: PLAYER_NAME, effect: 'bane_penalty', source: PLAYER_NAME, displayLabel: 'Blade Ward' },
      ]);
      buffToggle.toggleBuff.mockReturnValue({ wasActive: true });

      const ps = makePlayerStats();
      const action = makeAction();

      const result = await handle(action, ps, CAMPAIGN_NAME, null);

      expect(buffToggle.toggleBuff).toHaveBeenCalledWith(
        ps.name,
        action.name,
        { type: 'buff', effect: 'blade_ward' },
        CAMPAIGN_NAME
      );
      expect(expirations.addExpiration).not.toHaveBeenCalled();
      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
        'campaign',
        'targetEffects',
        [],
        CAMPAIGN_NAME,
        true
      );
      expect(result).toEqual({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Blade Ward',
          automationType: 'buff',
          description: 'Blade Ward expired',
          automation: action.automation,
        },
      });
    });

    it('does not call setRuntimeValue if no matching targetEffect exists', async () => {
      runtimeState.getRuntimeValue.mockReturnValue([]);
      buffToggle.toggleBuff.mockReturnValue({ wasActive: true });

      const ps = makePlayerStats();
      const action = makeAction();

      await handle(action, ps, CAMPAIGN_NAME, null);

      expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles empty automation object', async () => {
      runtimeState.getRuntimeValue.mockReturnValue([]);
      buffToggle.toggleBuff.mockReturnValue({ wasActive: false });

      const ps = makePlayerStats();
      const action = { name: 'Blade Ward', automation: {} };

      const result = await handle(action, ps, CAMPAIGN_NAME, null);

      expect(buffToggle.toggleBuff).toHaveBeenCalledWith(
        ps.name,
        action.name,
        { effect: 'blade_ward' },
        CAMPAIGN_NAME
      );
      expect(result.payload.description).toContain('activated');
    });

    it('uses the action name in the activation description', async () => {
      runtimeState.getRuntimeValue.mockReturnValue([]);
      buffToggle.toggleBuff.mockReturnValue({ wasActive: false });

      const ps = makePlayerStats();
      const action = { ...makeAction(), name: 'Custom Blade Ward' };

      const result = await handle(action, ps, CAMPAIGN_NAME, null);

      expect(result.payload.description).toBe(
        'Custom Blade Ward activated — attackers subtract 1d4 from attack rolls against you'
      );
    });
  });
});
