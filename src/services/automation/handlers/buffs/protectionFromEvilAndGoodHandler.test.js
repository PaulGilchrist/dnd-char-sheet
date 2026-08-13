import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks BEFORE imports ───────────────────────────────────────

vi.mock('../../common/buffToggle.js', () => ({
  toggleBuff: vi.fn(),
}));

vi.mock('../../../rules/effects/expirations.js', () => ({
  addExpiration: vi.fn(),
}));

vi.mock('../../../combat/concentration/concentrationService.js', () => ({
  addConcentration: vi.fn(),
}));

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(),
}));

vi.mock('../../../../services/rules/combat/rangeValidation.js', () => ({
  rangeToFeet: vi.fn(() => 30),
}));

vi.mock('../../../../services/common/targetResolver.js', () => ({
  resolveMapPositions: vi.fn(),
}));

// ── Imports ────────────────────────────────────────────────────

import {
  handle,
  applyProtectionFromEvilAndGood,
  isProtectionFromEvilAndGoodActive,
  isCreatureWarded,
} from './protectionFromEvilAndGoodHandler.js';
import * as buffToggle from '../../common/buffToggle.js';
import * as expirations from '../../../rules/effects/expirations.js';
import * as concentrationService from '../../../combat/concentration/concentrationService.js';
import * as runtimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as logService from '../../../../services/ui/logService.js';
import * as combatData from '../../../../services/encounters/combatData.js';
import * as rangeValidation from '../../../../services/rules/combat/rangeValidation.js';

// ── Helpers ────────────────────────────────────────────────────

const CAMPAIGN_NAME = 'TestCampaign';
const PLAYER_NAME = 'TestHero';
const TARGET_NAME = 'Ally1';

function makePlayerStats(overrides = {}) {
  return { name: PLAYER_NAME, ...overrides };
}

function makeAction(automation = {}) {
  return {
    name: 'Protection from Evil and Good',
    automation: { type: 'protection_from_evil_and_good', ...automation },
  };
}

// ── Tests ──────────────────────────────────────────────────────

describe('protectionFromEvilAndGoodHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handle', () => {
    it('returns target selection popup with all creatures including caster', async () => {
      const ps = makePlayerStats();
      const action = makeAction();

      rangeValidation.rangeToFeet.mockReturnValue(60);
      combatData.getCombatSummary.mockReturnValue({
        creatures: [
          { name: PLAYER_NAME, type: 'player' },
          { name: TARGET_NAME, type: 'creature' },
        ],
      });

      const result = await handle(action, ps, CAMPAIGN_NAME, 'test-map');

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('protectionFromEvilAndGood_target_selection');
      expect(result.payload.name).toBe('Protection from Evil and Good');
      expect(result.payload.creatureTargets).toEqual([PLAYER_NAME, TARGET_NAME]);
      expect(result.payload.range).toBe('Touch');
    });

    it('includes caster at the beginning of the target list', async () => {
      const ps = makePlayerStats();
      const action = makeAction();

      combatData.getCombatSummary.mockReturnValue({
        creatures: [
          { name: TARGET_NAME, type: 'creature' },
          { name: 'OtherCreature', type: 'creature' },
        ],
      });

      const result = await handle(action, ps, CAMPAIGN_NAME, null);

      expect(result.payload.creatureTargets[0]).toBe(PLAYER_NAME);
    });
  });

  describe('applyProtectionFromEvilAndGood', () => {
    it('activates the spell on a new target', async () => {
      const ps = makePlayerStats();
      const action = makeAction();

      runtimeState.getRuntimeValue.mockReturnValue([]);
      combatData.getCombatSummary.mockReturnValue({
        creatures: [{ name: PLAYER_NAME, type: 'player' }],
      });
      rangeValidation.rangeToFeet.mockReturnValue(60);

      buffToggle.toggleBuff.mockReturnValue({ wasActive: false });

      const result = await applyProtectionFromEvilAndGood(action, ps, CAMPAIGN_NAME, null, TARGET_NAME);

      expect(buffToggle.toggleBuff).toHaveBeenCalledWith(
        TARGET_NAME,
        'Protection from Evil and Good',
        expect.objectContaining({
          effect: 'protection_from_evil_and_good',
          wardedCreatureTypes: ['Aberration', 'Celestial', 'Elemental', 'Fey', 'Fiend', 'Undead'],
        }),
        CAMPAIGN_NAME
      );

      expect(concentrationService.addConcentration).toHaveBeenCalled();
      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
        'campaign',
        'targetEffects',
        expect.arrayContaining([
          expect.objectContaining({
            target: TARGET_NAME,
            effect: 'protection_from_evil_and_good',
            source: PLAYER_NAME,
            duration: 'concentration',
          }),
        ]),
        CAMPAIGN_NAME
      );

      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
        TARGET_NAME,
        'protectionFromEvilAndGoodWardedTypes',
        ['Aberration', 'Celestial', 'Elemental', 'Fey', 'Fiend', 'Undead'],
        CAMPAIGN_NAME
      );

      expect(expirations.addExpiration).toHaveBeenCalledWith(
        PLAYER_NAME,
        TARGET_NAME,
        expect.arrayContaining([
          expect.objectContaining({ type: 'remove_active_buff' }),
          expect.objectContaining({ type: 'remove_target_effect' }),
        ]),
        CAMPAIGN_NAME,
        Infinity,
        TARGET_NAME
      );

      expect(logService.addEntry).toHaveBeenCalledWith(
        CAMPAIGN_NAME,
        expect.objectContaining({
          type: 'ability_use',
          characterName: PLAYER_NAME,
          abilityName: 'Protection from Evil and Good',
          description: expect.stringContaining('protected against'),
        })
      );

      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain(`cast on ${TARGET_NAME}`);
    });

    it('deactivates the spell when already active', async () => {
      const ps = makePlayerStats();
      const action = makeAction();

      runtimeState.getRuntimeValue.mockReturnValue([
        { name: 'Protection from Evil and Good', effect: 'protection_from_evil_and_good' },
      ]);
      combatData.getCombatSummary.mockReturnValue({
        creatures: [{ name: PLAYER_NAME, type: 'player', concentration: { spell: 'Protection from Evil and Good' } }],
      });

      buffToggle.toggleBuff.mockReturnValue({ wasActive: true });

      const result = await applyProtectionFromEvilAndGood(action, ps, CAMPAIGN_NAME, null, TARGET_NAME);

      expect(buffToggle.toggleBuff).toHaveBeenCalledWith(
        TARGET_NAME,
        'Protection from Evil and Good',
        expect.objectContaining({
          wardedCreatureTypes: [],
        }),
        CAMPAIGN_NAME
      );

      expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
        TARGET_NAME,
        'protectionFromEvilAndGoodWardedTypes',
        [],
        CAMPAIGN_NAME
      );

      expect(result.payload.description).toContain('deactivated');
    });

    it('returns null when no target is provided', async () => {
      const ps = makePlayerStats();
      const action = makeAction();

      const result = await applyProtectionFromEvilAndGood(action, ps, CAMPAIGN_NAME, null, null);

      expect(result).toBeNull();
    });
  });

  describe('isProtectionFromEvilAndGoodActive', () => {
    it('returns true when buff with correct name and effect exists', () => {
      runtimeState.getRuntimeValue.mockReturnValue([
        { name: 'Protection from Evil and Good', effect: 'protection_from_evil_and_good' },
      ]);

      expect(isProtectionFromEvilAndGoodActive(PLAYER_NAME, CAMPAIGN_NAME)).toBe(true);
    });

    it('returns false when activeBuffs is empty or name/effect mismatch', () => {
      runtimeState.getRuntimeValue.mockReturnValue([]);
      expect(isProtectionFromEvilAndGoodActive(PLAYER_NAME, CAMPAIGN_NAME)).toBe(false);

      runtimeState.getRuntimeValue.mockReturnValue([
        { name: 'Protection from Evil and Good', effect: 'some_other_effect' },
      ]);
      expect(isProtectionFromEvilAndGoodActive(PLAYER_NAME, CAMPAIGN_NAME)).toBe(false);

      runtimeState.getRuntimeValue.mockReturnValue([
        { name: 'Other Spell', effect: 'protection_from_evil_and_good' },
      ]);
      expect(isProtectionFromEvilAndGoodActive(PLAYER_NAME, CAMPAIGN_NAME)).toBe(false);
    });
  });

  describe('isCreatureWarded', () => {
    const WARDED_TYPES = ['Aberration', 'Celestial', 'Elemental', 'Fey', 'Fiend', 'Undead'];

    it('returns true for warded types and false for non-warded, null, or undefined', () => {
      runtimeState.getRuntimeValue.mockReturnValue(WARDED_TYPES);

      expect(isCreatureWarded('Aberration', PLAYER_NAME, CAMPAIGN_NAME)).toBe(true);
      expect(isCreatureWarded('aberration', PLAYER_NAME, CAMPAIGN_NAME)).toBe(true);
      expect(isCreatureWarded('ABERRATION', PLAYER_NAME, CAMPAIGN_NAME)).toBe(true);
      expect(isCreatureWarded('Celestial', PLAYER_NAME, CAMPAIGN_NAME)).toBe(true);
      expect(isCreatureWarded('Humanoid', PLAYER_NAME, CAMPAIGN_NAME)).toBe(false);
      expect(isCreatureWarded('Dragon', PLAYER_NAME, CAMPAIGN_NAME)).toBe(false);

      runtimeState.getRuntimeValue.mockReturnValue([]);
      expect(isCreatureWarded('Aberration', PLAYER_NAME, CAMPAIGN_NAME)).toBe(false);

      expect(isCreatureWarded(null, PLAYER_NAME, CAMPAIGN_NAME)).toBe(false);
      expect(isCreatureWarded(undefined, PLAYER_NAME, CAMPAIGN_NAME)).toBe(false);
      expect(isCreatureWarded('Aberration', null, CAMPAIGN_NAME)).toBe(false);
      expect(isCreatureWarded('Aberration', undefined, CAMPAIGN_NAME)).toBe(false);
    });
  });
});
