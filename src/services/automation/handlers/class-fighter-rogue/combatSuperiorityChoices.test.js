import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    executeSweepingAttack,
    executeBaitAndSwitchChoice,
    executeCommanderStrikeChoice,
    executeRallyChoice,
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
    getCombatContext: vi.fn().mockResolvedValue({ creatures: [{ name: 'Goblin' }] }),
}));

vi.mock('../../../../services/rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn().mockResolvedValue({ creatures: [{ name: 'Goblin' }] }),
}));

vi.mock('../../../../services/automation/common/targetResolver.js', () => ({
    resolveTarget: vi.fn().mockResolvedValue(null),
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

vi.mock('../../../../services/automation/handlers/buffs/tempHpService.js', () => ({
    setTempHp: vi.fn(async () => {}),
}));

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

// ── executeSweepingAttack ──────────────────────────────────────────────

describe('executeSweepingAttack', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns error when no pending data', async () => {
        getRuntimeValue.mockReturnValue(null);

        const result = await executeSweepingAttack(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Goblin'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('No pending data');
    });

    it('returns error when secondary target not in pending list', async () => {
        getRuntimeValue.mockReturnValue({
            dieValue: 4,
            damageType: 'slashing',
            targetName: 'Goblin',
            secondaryTargets: [{ name: 'Skeleton' }],
        });

        const result = await executeSweepingAttack(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Goblin'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('not a valid secondary target');
    });

    it('applies damage to secondary target when valid', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'pendingSweepingAttack') return {
                dieValue: 4,
                damageType: 'slashing',
                targetName: 'Goblin',
                secondaryTargets: [{ name: 'Skeleton' }],
            };
            if (key === 'targetEffects') return [];
            return undefined;
        });

        const combatContext = {
            creatures: [{ name: 'Skeleton' }],
        };

        const damageUtils = await import('../../../../services/rules/combat/damageUtils.js');
        damageUtils.getCombatContext.mockResolvedValue(combatContext);

        const result = await executeSweepingAttack(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Skeleton'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Skeleton takes');
        expect(result.payload.description).toContain('slashing damage');
        expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', 'pendingSweepingAttack', null, 'test-campaign');
    });
});

// ── executeBaitAndSwitchChoice ─────────────────────────────────────────

describe('executeBaitAndSwitchChoice', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns error when chosenName is null', async () => {
        const result = await executeBaitAndSwitchChoice(
            { dieValue: 4, maneuverName: 'Bait and Switch' },
            makePlayerStats(),
            'test-campaign',
            null
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('No target selected');
    });

    it('returns error when playerStats is null', async () => {
        const result = await executeBaitAndSwitchChoice(
            { dieValue: 4, maneuverName: 'Bait and Switch' },
            null,
            'test-campaign',
            'Ally1'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('No target selected');
    });

    it('returns error when campaignName is null', async () => {
        const result = await executeBaitAndSwitchChoice(
            { dieValue: 4, maneuverName: 'Bait and Switch' },
            makePlayerStats(),
            null,
            'Ally1'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('No target selected');
    });

    it('sets bait and switch state on chosen target', async () => {
        const result = await executeBaitAndSwitchChoice(
            { dieValue: 4, maneuverName: 'Bait and Switch' },
            makePlayerStats(),
            'test-campaign',
            'Ally1'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Ally1 gains +4 AC');
        expect(setRuntimeValue).toHaveBeenCalledWith('Ally1', 'baitAndSwitchActive', true, 'test-campaign');
        expect(setRuntimeValue).toHaveBeenCalledWith('Ally1', 'baitAndSwitchBonus', 4, 'test-campaign');
        expect(setRuntimeValue).toHaveBeenCalledWith('Ally1', 'baitAndSwitchSource', 'Bait and Switch', 'test-campaign');
        expect(result.logEntries).toHaveLength(1);
        expect(result.logEntries[0].type).toBe('ability_use');
    });

    it('uses default maneuver name when not provided', async () => {
        const result = await executeBaitAndSwitchChoice(
            { dieValue: 6 },
            makePlayerStats(),
            'test-campaign',
            'Ally1'
        );

        expect(result.logEntries[0].description).toContain('Bait and Switch');
    });
});

// ── executeCommanderStrikeChoice ───────────────────────────────────────

describe('executeCommanderStrikeChoice', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns error when chosenName is null', async () => {
        const result = await executeCommanderStrikeChoice(
            { dieValue: 4, maneuverName: "Commander's Strike" },
            makePlayerStats(),
            'test-campaign',
            null
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('No target selected');
    });

    it('returns error when playerStats is null', async () => {
        const result = await executeCommanderStrikeChoice(
            { dieValue: 4, maneuverName: "Commander's Strike" },
            null,
            'test-campaign',
            'Ally1'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('No target selected');
    });

    it('returns error when campaignName is null', async () => {
        const result = await executeCommanderStrikeChoice(
            { dieValue: 4, maneuverName: "Commander's Strike" },
            makePlayerStats(),
            null,
            'Ally1'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('No target selected');
    });

    it('sets commander strike state on chosen ally', async () => {
        const result = await executeCommanderStrikeChoice(
            { dieValue: 4, maneuverName: "Commander's Strike" },
            makePlayerStats(),
            'test-campaign',
            'Ally1'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Ally1 will add 4 to their next attack');
        expect(setRuntimeValue).toHaveBeenCalledWith('Ally1', 'commanderStrikeActive', true, 'test-campaign');
        expect(setRuntimeValue).toHaveBeenCalledWith('Ally1', 'commanderStrikeBonus', 4, 'test-campaign');
        expect(setRuntimeValue).toHaveBeenCalledWith('Ally1', 'commanderStrikeSource', "Commander's Strike", 'test-campaign');
        expect(result.logEntries).toHaveLength(1);
        expect(result.logEntries[0].type).toBe('ability_use');
    });

    it('uses default maneuver name when not provided', async () => {
        const result = await executeCommanderStrikeChoice(
            { dieValue: 6 },
            makePlayerStats(),
            'test-campaign',
            'Ally1'
        );

        expect(result.payload.description).toContain("Commander's Strike");
    });
});

// ── executeRallyChoice ─────────────────────────────────────────────────

describe('executeRallyChoice', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns error when chosenName is null', async () => {
        const result = await executeRallyChoice(
            { dieValue: 4, maneuverName: 'Rally' },
            makePlayerStats(),
            'test-campaign',
            null,
            8,
            4,
            'Rally description'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('No target selected');
    });

    it('returns error when playerStats is null', async () => {
        const result = await executeRallyChoice(
            { dieValue: 4, maneuverName: 'Rally' },
            null,
            'test-campaign',
            'Ally1',
            8,
            4,
            'Rally description'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('No target selected');
    });

    it('returns error when campaignName is null', async () => {
        const result = await executeRallyChoice(
            { dieValue: 4, maneuverName: 'Rally' },
            makePlayerStats(),
            null,
            'Ally1',
            8,
            4,
            'Rally description'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('No target selected');
    });

    it('sets temp HP on chosen ally', async () => {
        const { setTempHp } = await import('../../../../services/automation/handlers/buffs/tempHpService.js');

        const result = await executeRallyChoice(
            { dieValue: 4, maneuverName: 'Rally' },
            makePlayerStats(),
            'test-campaign',
            'Ally1',
            8,
            4,
            'Rally description'
        );

        expect(result.type).toBe('popup');
        expect(result.logEntries).toHaveLength(1);
        expect(result.logEntries[0].type).toBe('ability_use');
        expect(result.logEntries[0].description).toContain('gains 8 temporary hit points');
        expect(setTempHp).toHaveBeenCalledWith('Ally1', 8, 'test-campaign');
    });

    it('uses default maneuver name when not provided', async () => {
        const result = await executeRallyChoice(
            { dieValue: 6 },
            makePlayerStats(),
            'test-campaign',
            'Ally1',
            10,
            4,
            'Rally description'
        );

        expect(result.logEntries[0].description).toContain('Rally');
    });
});

// ── validateSizeLimit ──────────────────────────────────────────────────

describe('validateSizeLimit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns valid when maneuver has no sizeLimit', async () => {
        const { validateSizeLimit } = await import('./combatSuperiorityHandler.js');

        const result = await validateSizeLimit(
            {},
            'Goblin',
            'test-campaign',
            makePlayerStats()
        );

        expect(result).toEqual({ valid: true });
    });

    it('returns valid when targetName is null', async () => {
        const { validateSizeLimit } = await import('./combatSuperiorityHandler.js');

        const result = await validateSizeLimit(
            { sizeLimit: 'large_or_smaller' },
            null,
            'test-campaign',
            makePlayerStats()
        );

        expect(result).toEqual({ valid: true });
    });

    it('returns valid when combat context is null', async () => {
        const { validateSizeLimit } = await import('./combatSuperiorityHandler.js');
        const damageUtils = await import('../../../../services/rules/combat/damageUtils.js');
        damageUtils.getCombatContext.mockResolvedValue(null);

        const result = await validateSizeLimit(
            { sizeLimit: 'large_or_smaller' },
            'Goblin',
            'test-campaign',
            makePlayerStats()
        );

        expect(result).toEqual({ valid: true });
    });

    it('returns valid when target not found in combat context', async () => {
        const { validateSizeLimit } = await import('./combatSuperiorityHandler.js');
        const damageUtils = await import('../../../../services/rules/combat/damageUtils.js');
        damageUtils.getCombatContext.mockResolvedValue({ creatures: [{ name: 'Other' }] });

        const result = await validateSizeLimit(
            { sizeLimit: 'large_or_smaller' },
            'Goblin',
            'test-campaign',
            makePlayerStats()
        );

        expect(result).toEqual({ valid: true });
    });

    it('returns valid when target size is within limit (large_or_smaller)', async () => {
        const { validateSizeLimit } = await import('./combatSuperiorityHandler.js');
        const damageUtils = await import('../../../../services/rules/combat/damageUtils.js');
        damageUtils.getCombatContext.mockResolvedValue({
            creatures: [{ name: 'Goblin', size: 'Small' }]
        });

        const result = await validateSizeLimit(
            { sizeLimit: 'large_or_smaller', name: 'Trip Attack' },
            'Goblin',
            'test-campaign',
            makePlayerStats()
        );

        expect(result).toEqual({ valid: true });
    });

    it('returns valid when target size is within limit (medium_or_smaller)', async () => {
        const { validateSizeLimit } = await import('./combatSuperiorityHandler.js');
        const damageUtils = await import('../../../../services/rules/combat/damageUtils.js');
        damageUtils.getCombatContext.mockResolvedValue({
            creatures: [{ name: 'Goblin', size: 'Small' }]
        });

        const result = await validateSizeLimit(
            { sizeLimit: 'medium_or_smaller', name: 'Trip Attack' },
            'Goblin',
            'test-campaign',
            makePlayerStats({ size: 'Medium' })
        );

        expect(result).toEqual({ valid: true });
    });

    it('returns valid when target size is within limit (one_size_larger)', async () => {
        const { validateSizeLimit } = await import('./combatSuperiorityHandler.js');
        const damageUtils = await import('../../../../services/rules/combat/damageUtils.js');
        damageUtils.getCombatContext.mockResolvedValue({
            creatures: [{ name: 'Hobgoblin', size: 'Large' }]
        });

        const result = await validateSizeLimit(
            { sizeLimit: 'one_size_larger', name: 'Trip Attack' },
            'Hobgoblin',
            'test-campaign',
            makePlayerStats({ size: 'Medium' })
        );

        expect(result).toEqual({ valid: true });
    });

    it('returns invalid when target is too large for large_or_smaller', async () => {
        const { validateSizeLimit } = await import('./combatSuperiorityHandler.js');
        const damageUtils = await import('../../../../services/rules/combat/damageUtils.js');
        damageUtils.getCombatContext.mockResolvedValue({
            creatures: [{ name: 'Ogre', size: 'Large' }]
        });

        const result = await validateSizeLimit(
            { sizeLimit: 'medium_or_smaller', name: 'Trip Attack' },
            'Ogre',
            'test-campaign',
            makePlayerStats({ size: 'Medium' })
        );

        expect(result.valid).toBe(false);
        expect(result.description).toContain('Target is Large');
        expect(result.description).toContain('Medium or smaller');
    });

    it('returns invalid when target is too large for one_size_larger', async () => {
        const { validateSizeLimit } = await import('./combatSuperiorityHandler.js');
        const damageUtils = await import('../../../../services/rules/combat/damageUtils.js');
        damageUtils.getCombatContext.mockResolvedValue({
            creatures: [{ name: 'Huge Beast', size: 'Huge' }]
        });

        const result = await validateSizeLimit(
            { sizeLimit: 'one_size_larger', name: 'Trip Attack' },
            'Huge Beast',
            'test-campaign',
            makePlayerStats({ size: 'Medium' })
        );

        expect(result.valid).toBe(false);
        expect(result.description).toContain('Target is Huge');
        expect(result.description).toContain('up to one size larger than you');
    });
});
