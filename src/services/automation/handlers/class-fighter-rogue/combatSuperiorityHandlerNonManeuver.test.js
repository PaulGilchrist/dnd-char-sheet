import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    handleCombatSuperioritySkillCheck,
    handleCombatSuperiorityCommandingPresenceReaction,
    onCombatSuperioritySelected,
} from './combatSuperiorityHandler.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(async () => {}),
}));

vi.mock('../../../../services/ui/dataLoader.js', () => ({
    loadManeuvers: vi.fn(async (_rules) => [
        { name: 'Trip Attack', effect: 'prone', trigger: 'weapon_attack_hit', saveType: 'STR', damageBonus: true, actionType: 'attack_rider' },
        { name: 'Pushing Attack', effect: 'push', trigger: 'weapon_attack_hit', saveType: 'STR', value: 15, damageBonus: true, actionType: 'attack_rider' },
        { name: 'Goading Attack', effect: 'goad', trigger: 'weapon_attack_hit', saveType: 'WIS', damageBonus: true, actionType: 'attack_rider' },
        { name: 'Disarming Attack', effect: 'disarm', trigger: 'weapon_attack_hit', saveType: 'STR', damageBonus: true, actionType: 'attack_rider' },
        { name: 'Menacing Attack', effect: 'frightened', trigger: 'weapon_attack_hit', saveType: 'WIS', damageBonus: true, actionType: 'attack_rider' },
        { name: 'Distracting Strike', effect: 'distracting_strike_advantage', trigger: 'weapon_attack_hit', damageBonus: true, actionType: 'attack_rider' },
        { name: 'Maneuvering Attack', effect: 'ally_movement', trigger: 'weapon_attack_hit', damageBonus: true, actionType: 'attack_rider' },
        { name: 'Precision Attack', effect: 'attack_roll_bonus', trigger: 'attack_roll_miss', actionType: 'attack_rider' },
        { name: 'Sweeping Attack', effect: 'secondary_damage', trigger: 'melee_weapon_attack_hit', damageBonus: false, actionType: 'attack_rider' },
        { name: 'Evasive Footwork', effect: 'ac_bonus_disengage', actionType: 'bonus_action' },
        { name: 'Feinting Attack', effect: 'advantage_and_damage', actionType: 'bonus_action' },
        { name: 'Lunging Attack', effect: 'dash_and_damage', actionType: 'bonus_action' },
        { name: 'Rally', effect: 'temp_hp', actionType: 'bonus_action', extraHpExpression: '1d4' },
        { name: "Commander's Strike", effect: null, actionType: 'grant_attack' },
        { name: 'Bait and Switch', effect: 'ac_bonus_and_swap', actionType: 'movement' },
        { name: 'Ambush', actionType: 'skill_check', skills: ['Stealth'], initiativeBonus: true, dieExpression: 'superiority_die' },
        { name: 'Tactical Assessment', actionType: 'skill_check', skills: ['Insight'], ability: 'Wisdom', dieExpression: 'superiority_die' },
        { name: 'Commanding Presence', actionType: 'skill_check', reactionSaveType: 'WIS', reactionEffect: 'disadvantage_next_attack', reactionDuration: 'until_end_of_next_turn' },
        { name: 'Parry', effect: 'damage_reduction', actionType: 'reaction' },
        { name: 'Riposte', effect: 'melee_attack_reaction', actionType: 'reaction' },
    ]),
    loadWildMagicSurgeTable: vi.fn(async () => []),
}));

vi.mock('../../../../services/encounters/combatData.js', () => ({
    getCurrentCombatRound: vi.fn(() => 1),
}));

vi.mock('../../../../services/rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn().mockResolvedValue({ creatures: [{ name: 'Goblin' }] }),
}));

vi.mock('../../../../services/automation/common/targetResolver.js', () => ({
    resolveTarget: vi.fn().mockResolvedValue({ target: { name: 'Goblin' } }),
}));

vi.mock('../../../../services/dice/diceRoller.js', () => ({
    rollExpression: vi.fn(() => ({ total: 4 })),
}));

vi.mock('../../../../services/combat/automation/automationService.js', () => ({
    evaluateAutoExpression: vi.fn((expr) => {
        if (expr === 'superiority_die') return 8;
        if (expr === '1d6') return 6;
        return expr;
    }),
    playerIsImmuneToCondition: vi.fn(() => false),
}));

vi.mock('../../../../services/automation/common/savePrompt.js', () => ({
    buildSaveDc: vi.fn(() => 15),
    createSaveListener: vi.fn(() => ({
        promise: Promise.resolve({ success: false }),
    })),
}));

vi.mock('../../../../services/rules/effects/expirations.js', () => ({
    addExpiration: vi.fn(async () => {}),
}));

vi.mock('../../../../services/rules/combat/applyDamage.js', () => ({
    applyDamageToTarget: vi.fn(() => ({ finalDamage: 4 })),
}));

vi.mock('../../../../services/rules/combat/rangeValidation.js', () => ({
    getDistanceFeet: vi.fn(() => 5),
    rangeToFeet: vi.fn((range) => {
        if (range === '5_ft') return 5;
        if (range === '8_ft') return 8;
        return 5;
    }),
}));

vi.mock('../../../../services/rules/combat/rangeCheck.js', () => ({
    isWithinRange: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../../services/ui/logService.js', () => ({
    addEntry: vi.fn(async () => {}),
}));

const SELECTION_KEY = 'BattleMasterManeuvers_selection';

const makePlayerStats = (overrides = {}) => ({
    name: 'TestFighter',
    proficiency: 3,
    abilities: [
        { name: 'STR', bonus: 4 },
        { name: 'DEX', bonus: 2 },
        { name: 'CON', bonus: 1 },
        { name: 'INT', bonus: 0 },
        { name: 'WIS', bonus: 0 },
        { name: 'CHA', bonus: 0 },
    ],
    level: 5,
    rules: '2024',
    attacks: [{ name: 'Longsword', weaponType: 'melee', damage: '1d8+4', damageType: 'slashing' }],
    automation: { passives: [], actions: [], bonusActions: [], reactions: [], specialActions: [] },
    ...overrides,
});

/* ------------------------------------------------------------------ */
/*  handleCombatSuperioritySkillCheck                                  */
/* ------------------------------------------------------------------ */

describe('handleCombatSuperioritySkillCheck', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns error when no maneuver specified', async () => {
        const result = await handleCombatSuperioritySkillCheck(
            { name: 'Test', automation: {} },
            makePlayerStats(),
            'test-campaign',
            null
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toBe('No maneuver specified.');
    });

    it('delegates to executeSkillCheckManeuver when maneuver specified', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Tactical Assessment'];
            return undefined;
        });

        const result = await handleCombatSuperioritySkillCheck(
            { name: 'Test', automation: { maneuverName: 'Tactical Assessment' } },
            makePlayerStats(),
            'test-campaign',
            null
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Tactical Assessment');
    });
});

/* ------------------------------------------------------------------ */
/*  handleCombatSuperiorityCommandingPresenceReaction                  */
/* ------------------------------------------------------------------ */

describe('handleCombatSuperiorityCommandingPresenceReaction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns error when no maneuver specified', async () => {
        const result = await handleCombatSuperiorityCommandingPresenceReaction(
            { name: 'Test', automation: {} },
            makePlayerStats(),
            'test-campaign',
            null
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toBe('No maneuver specified.');
    });

    it('delegates to executeCommandingPresenceReaction when maneuver specified', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Commanding Presence'];
            return undefined;
        });

        const result = await handleCombatSuperiorityCommandingPresenceReaction(
            { name: 'Test', automation: { maneuverName: 'Commanding Presence' } },
            makePlayerStats(),
            'test-campaign',
            null
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Commanding Presence');
    });
});

/* ------------------------------------------------------------------ */
/*  onCombatSuperioritySelected                                        */
/* ------------------------------------------------------------------ */

describe('onCombatSuperioritySelected', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('clears selection when empty array passed', async () => {
        const result = await onCombatSuperioritySelected(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            []
        );

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.description).toContain('selection cleared');
        expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', SELECTION_KEY, [], 'test-campaign');
    });

    it('validates maneuvers against known list and stores valid ones', async () => {
        const result = await onCombatSuperioritySelected(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            ['Trip Attack', 'Nonexistent Maneuver']
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Maneuvers selected');
        expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', SELECTION_KEY, ['Trip Attack'], 'test-campaign');
    });

    it('executes single use maneuver when singleUseManeuverName provided', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Trip Attack'];
            return undefined;
        });

        const result = await onCombatSuperioritySelected(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            null,
            'Trip Attack'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Rolled');
    });

    it('returns no maneuver selected when neither array nor singleUse provided', async () => {
        const result = await onCombatSuperioritySelected(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            null,
            null
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toBe('No maneuver selected.');
    });
});
