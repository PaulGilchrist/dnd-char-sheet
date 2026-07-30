import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks BEFORE imports ─────────────────────────────────────────

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../rules/effects/expirations.js', () => ({
  addExpiration: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(),
}));

vi.mock('../../../combat/concentration/concentrationService.js', () => ({
  addConcentration: vi.fn(),
}));

// ── Imports ──────────────────────────────────────────────────────

import {
  handle,
  applyResistance,
  getResistanceDamageType,
  isResistanceUsedThisTurn,
  setResistanceUsedThisTurn,
} from './resistanceHandler.js';

import * as useRuntimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as expirations from '../../../rules/effects/expirations.js';
import * as logService from '../../../ui/logService.js';
import * as combatData from '../../../encounters/combatData.js';
import * as concentrationService from '../../../combat/concentration/concentrationService.js';

// ── Helpers ──────────────────────────────────────────────────────

const campaignName = 'TestCampaign';

function makePlayerStats(overrides = {}) {
  return {
    name: 'Cleric',
    level: 5,
    ...overrides,
  };
}

function makeAction(automation = {}) {
  return {
    name: 'Resistance',
    automation: {
      type: 'damage_reduction',
      reductionExpression: '1d4',
      damageTypes: [],
      trigger: 'damage_taken_of_chosen_resistance_type',
      casting_time: '1 action',
      ...automation,
    },
  };
}

function makeCombatSummary(creatureNames = []) {
  return {
    creatures: creatureNames.map((name, i) => ({
      name,
      initiative: 20 - i,
    })),
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe('resistanceHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handle', () => {
    it('returns target selection popup when combat context exists', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      combatData.getCombatSummary.mockReturnValue(
        makeCombatSummary(['Goblin', 'Orc'])
      );

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('resistance_target_selection');
      expect(result.payload.name).toBe('Resistance');
      expect(result.payload.creatureTargets).toEqual(['Goblin', 'Orc']);
      expect(result.payload.damageTypes).toEqual([
        'Acid', 'Bludgeoning', 'Cold', 'Fire', 'Lightning',
        'Necrotic', 'Piercing', 'Poison', 'Radiant', 'Slashing', 'Thunder',
      ]);
    });

    it('includes the caster in creature targets', async () => {
      const ps = makePlayerStats({ name: 'Cleric' });
      const action = makeAction();
      combatData.getCombatSummary.mockReturnValue(
        makeCombatSummary(['Cleric', 'Goblin'])
      );

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.creatureTargets).toEqual(['Cleric', 'Goblin']);
    });

    it('returns creatureTargets with only the caster when caster is the only creature', async () => {
      const ps = makePlayerStats({ name: 'Cleric' });
      const action = makeAction();
      combatData.getCombatSummary.mockReturnValue(
        makeCombatSummary(['Cleric'])
      );

      const result = await handle(action, ps, campaignName, null);

      expect(result.payload.creatureTargets).toEqual(['Cleric']);
    });

    it('returns error popup when no combat context', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      combatData.getCombatSummary.mockReturnValue(null);

      const result = await handle(action, ps, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.name).toBe('Resistance');
      expect(result.payload.description).toContain('No combat context found');
      expect(result.payload.description).toContain('Resistance');
    });
  });

  describe('applyResistance', () => {
    it('applies damage reduction effect to target with chosen damage type', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      useRuntimeState.getRuntimeValue.mockReturnValue(null);
      combatData.getCombatSummary.mockReturnValue(
        makeCombatSummary(['Cleric', 'Goblin'])
      );

      const result = await applyResistance(
        action,
        ps,
        campaignName,
        'Goblin',
        'fire'
      );

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('Fire');
      expect(result.payload.description).toContain('1d4');

      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
        'campaign',
        'targetEffects',
        expect.arrayContaining([
          expect.objectContaining({
            target: 'Goblin',
            effect: 'resistance_damage_reduction',
            source: 'Cleric',
            chosenType: 'Fire',
            duration: 'concentration',
          }),
        ]),
        campaignName,
        true
      );

      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
        'Goblin',
        'resistanceChosenDamageType',
        'Fire',
        campaignName
      );

      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
        'Goblin',
        'resistanceUsedThisTurn',
        false,
        campaignName
      );

      expect(expirations.addExpiration).toHaveBeenCalledWith(
        'Cleric',
        'Goblin',
        expect.arrayContaining([
          expect.objectContaining({
            type: 'remove_target_effect',
            effectKey: 'resistance_damage_reduction',
            source: 'Cleric',
          }),
        ]),
        campaignName
      );

      expect(concentrationService.addConcentration).toHaveBeenCalledWith(
        expect.objectContaining({ creatures: expect.any(Array) }),
        'Cleric',
        'Resistance',
        10
      );
    });

    it('returns null when targetName is missing', async () => {
      const ps = makePlayerStats();
      const action = makeAction();

      const result = await applyResistance(
        action,
        ps,
        campaignName,
        null,
        'fire'
      );

      expect(result).toBeNull();
    });

    it('returns null when chosenDamageType is missing', async () => {
      const ps = makePlayerStats();
      const action = makeAction();

      const result = await applyResistance(
        action,
        ps,
        campaignName,
        'Goblin',
        null
      );

      expect(result).toBeNull();
    });

    it('replaces existing Resistance effect instead of appending', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      useRuntimeState.getRuntimeValue.mockReturnValue([
        { target: 'Goblin', effect: 'resistance_damage_reduction', source: 'Cleric', chosenType: 'Acid', duration: 'concentration' },
        { target: 'Goblin', effect: 'shield_of_faith', source: 'Cleric', chosenType: null, duration: 'concentration' },
      ]);
      combatData.getCombatSummary.mockReturnValue(
        makeCombatSummary(['Cleric', 'Goblin'])
      );

      await applyResistance(
        action,
        ps,
        campaignName,
        'Goblin',
        'cold'
      );

      const callArgs = useRuntimeState.setRuntimeValue.mock.calls.find(
        (c) => c[1] === 'targetEffects'
      );
      const effects = callArgs[2];

      expect(effects.filter((e) => e.effect === 'resistance_damage_reduction')).toHaveLength(1);
      expect(effects.find((e) => e.effect === 'resistance_damage_reduction').chosenType).toBe('Cold');
      expect(effects.find((e) => e.effect === 'shield_of_faith')).toBeTruthy();
    });

    it('calls addEntry with the correct log payload', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      useRuntimeState.getRuntimeValue.mockReturnValue(null);
      combatData.getCombatSummary.mockReturnValue(
        makeCombatSummary(['Cleric', 'Goblin'])
      );

      await applyResistance(
        action,
        ps,
        campaignName,
        'Goblin',
        'fire'
      );

      expect(logService.addEntry).toHaveBeenCalledWith(campaignName, {
        type: 'spell_effect',
        characterName: 'Cleric',
        spellName: 'Resistance',
        targetName: 'Goblin',
        effects: ['Resistance (Fire): reduces damage of chosen type by 1d4, once per turn'],
        timestamp: expect.any(Number),
      });
    });

    it('appends Resistance when no existing effects array', async () => {
      const ps = makePlayerStats();
      const action = makeAction();
      useRuntimeState.getRuntimeValue.mockReturnValue(undefined);
      combatData.getCombatSummary.mockReturnValue(
        makeCombatSummary(['Cleric', 'Goblin'])
      );

      await applyResistance(
        action,
        ps,
        campaignName,
        'Goblin',
        'fire'
      );

      const callArgs = useRuntimeState.setRuntimeValue.mock.calls.find(
        (c) => c[1] === 'targetEffects'
      );
      const effects = callArgs[2];

      expect(effects).toHaveLength(1);
      expect(effects[0].effect).toBe('resistance_damage_reduction');
    });

    it('uses playerStats.name as source in effect', async () => {
      const ps = makePlayerStats({ name: 'Paladin' });
      const action = makeAction();
      useRuntimeState.getRuntimeValue.mockReturnValue(null);
      combatData.getCombatSummary.mockReturnValue(
        makeCombatSummary(['Paladin', 'Goblin'])
      );

      await applyResistance(
        action,
        ps,
        campaignName,
        'Goblin',
        'fire'
      );

      const callArgs = useRuntimeState.setRuntimeValue.mock.calls.find(
        (c) => c[1] === 'targetEffects'
      );
      const effects = callArgs[2];

      expect(effects[0].source).toBe('Paladin');
    });
  });

  describe('getResistanceDamageType', () => {
    it('returns stored damage type', () => {
      useRuntimeState.getRuntimeValue.mockReturnValue('Fire');

      expect(getResistanceDamageType('Goblin', campaignName)).toBe('Fire');
    });
  });

  describe('isResistanceUsedThisTurn', () => {
    it('returns true when flag is true, false otherwise', () => {
      useRuntimeState.getRuntimeValue.mockReturnValue(true);
      expect(isResistanceUsedThisTurn('Goblin', campaignName)).toBe(true);

      useRuntimeState.getRuntimeValue.mockReturnValue(false);
      expect(isResistanceUsedThisTurn('Goblin', campaignName)).toBe(false);
    });
  });

  describe('setResistanceUsedThisTurn', () => {
    it('sets the flag', () => {
      setResistanceUsedThisTurn('Goblin', true, campaignName);

      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
        'Goblin',
        'resistanceUsedThisTurn',
        true,
        campaignName
      );
    });
  });
});
