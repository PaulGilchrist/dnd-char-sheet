import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    executeManeuver,
    executeReactionManeuver,
    handleCombatSuperioritySkillCheck,
    handleCombatSuperiorityCommandingPresenceReaction,
    onCombatSuperioritySelected,
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

vi.mock('../../../../services/automation/handlers/buffs/tempHpService.js', () => ({
    setTempHp: vi.fn(async () => {}),
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

// ── executeManeuver ────────────────────────────────────────────────────

describe('executeManeuver', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns error popup when maneuver not found', async () => {
        const result = await executeManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Nonexistent Maneuver'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.description).toContain('not found');
    });

    it('returns error popup when no dice and no relentless', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 0;
            if (key === SELECTION_KEY) return ['Trip Attack'];
            return undefined;
        });

        const result = await executeManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Trip Attack'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('No Superiority Dice remaining');
    });

    it('handles prone effect with save failure', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Trip Attack'];
            if (key === 'activeConditions') return [];
            return undefined;
        });

        const result = await executeManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Trip Attack'
        );

        expect(result.payload.description).toContain('Target made STR save DC 15: Failure');
        expect(result.payload.description).toContain('fell Prone');
    });

    it('handles goad effect with save failure', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Goading Attack'];
            if (key === 'targetEffects') return [];
            return undefined;
        });

        const result = await executeManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Goading Attack'
        );

        expect(result.payload.description).toContain('Disadvantage on attacks against targets other than you');
    });

    it('handles frightened effect with save failure and expiration', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Menacing Attack'];
            if (key === 'activeConditions') return [];
            return undefined;
        });

        const result = await executeManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Menacing Attack'
        );

        expect(result.payload.description).toContain('Frightened');
        expect(vi.mocked(setRuntimeValue).mock.calls.some(
            (call) => call[0] === 'TestFighter' && call[1] === 'superiorityDice'
        )).toBe(true);
    });

    it('handles distracting_strike_advantage effect', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Distracting Strike'];
            if (key === 'targetEffects') return [];
            return undefined;
        });

        const result = await executeManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Distracting Strike'
        );

        expect(result.payload.description).toContain('next attack against');
        expect(result.payload.description).toContain('Advantage');
    });

    it('handles ally_movement effect', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Maneuvering Attack'];
            return undefined;
        });

        const result = await executeManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Maneuvering Attack'
        );

        expect(result.payload.description).toContain('Reaction to move');
    });

    it('handles push effect with save failure', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Pushing Attack'];
            return undefined;
        });

        const result = await executeManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Pushing Attack'
        );

        expect(result.payload.description).toContain('was pushed 15 feet');
    });

    it('handles disarm effect with save failure', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Disarming Attack'];
            return undefined;
        });

        const result = await executeManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Disarming Attack'
        );

        expect(result.payload.description).toContain('dropped the object');
    });

    it('handles attack_roll_bonus effect', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Precision Attack'];
            return undefined;
        });

        const result = await executeManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Precision Attack'
        );

        expect(result.payload.description).toContain('Add 4 to the attack roll');
    });

    it('handles secondary_damage effect', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Sweeping Attack'];
            return undefined;
        });

        const result = await executeManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Sweeping Attack'
        );

        expect(result.payload.description).toContain('second creature within 5 feet');
    });

    it('handles ac_bonus_disengage effect', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Evasive Footwork'];
            return undefined;
        });

        const result = await executeManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Evasive Footwork'
        );

        expect(result.payload.description).toContain('Disengage action');
        expect(result.payload.description).toContain('+4 AC');
        expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', 'baitAndSwitchActive', true, 'test-campaign');
    });

    it('handles advantage_and_damage effect', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Feinting Attack'];
            return undefined;
        });

        const result = await executeManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Feinting Attack'
        );

        expect(result.payload.description).toContain('Advantage on your next attack roll');
        expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', 'feintingAttackDieValue', 4, 'test-campaign');
    });

    it('handles dash_and_damage effect', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Lunging Attack'];
            return undefined;
        });

        const result = await executeManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Lunging Attack'
        );

        expect(result.payload.description).toContain('Dash action');
        expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', 'lungingAttackDieValue', 4, 'test-campaign');
    });

    it('handles grant_attack by showing ally selection modal', async () => {
        const combatContext = {
            creatures: [
                { name: 'TestFighter' },
                { name: 'Ally1' },
            ],
        };

        const damageUtils = await import('../../../../services/rules/combat/damageUtils.js');
        damageUtils.getCombatContext.mockResolvedValue(combatContext);

        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ["Commander's Strike"];
            return undefined;
        });

        const result = await executeManeuver(
            { name: "Commander's Strike", automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            "Commander's Strike"
        );

        expect(result.type).toBe('modal');
        expect(result.modalName).toBe('commanderStrikeChoice');
        expect(result.payload.options).toHaveLength(1);
    });

    it('handles ac_bonus_and_swap by showing bait and switch modal', async () => {
        const combatContext = {
            creatures: [
                { name: 'TestFighter' },
                { name: 'Ally1' },
            ],
        };

        const damageUtils = await import('../../../../services/rules/combat/damageUtils.js');
        damageUtils.getCombatContext.mockResolvedValue(combatContext);

        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Bait and Switch'];
            return undefined;
        });

        const result = await executeManeuver(
            { name: 'Bait and Switch', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Bait and Switch'
        );

        expect(result.type).toBe('modal');
        expect(result.modalName).toBe('baitAndSwitchChoice');
        expect(result.payload.options).toHaveLength(2);
    });

    it('handles temp_hp (Rally) by showing ally selection modal', async () => {
        const combatContext = {
            creatures: [
                { name: 'TestFighter' },
                { name: 'Ally1' },
            ],
        };

        const damageUtils = await import('../../../../services/rules/combat/damageUtils.js');
        damageUtils.getCombatContext.mockResolvedValue(combatContext);

        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Rally'];
            return undefined;
        });

        const result = await executeManeuver(
            { name: 'Rally', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Rally'
        );

        expect(result.type).toBe('modal');
        expect(result.modalName).toBe('rallyChoice');
        expect(result.payload.allyOptions).toHaveLength(1);
    });

    it('handles temp_hp when no allies available', async () => {
        const combatContext = {
            creatures: [{ name: 'TestFighter' }],
        };

        const damageUtils = await import('../../../../services/rules/combat/damageUtils.js');
        damageUtils.getCombatContext.mockResolvedValue(combatContext);

        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Rally'];
            return undefined;
        });

        const result = await executeManeuver(
            { name: 'Rally', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Rally'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('No allies available to receive Rally');
    });

    it('handles damage_reduction effect with Parry', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Parry'];
            return undefined;
        });

        const result = await executeManeuver(
            { name: 'Parry', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Parry'
        );

        expect(result.payload.description).toContain('Damage reduced by');
        expect(result.payload.description).toContain('HP restored');
    });

    it('handles melee_attack_reaction (Riposte) with attack_roll return', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Riposte'];
            return undefined;
        });

        const result = await executeManeuver(
            { name: 'Riposte', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Riposte'
        );

        expect(result.type).toBe('attack_roll');
        expect(result.payload.attack).toBeDefined();
        expect(result.context).toBeDefined();
        expect(result.context.superiorityDieValue).toBe(4);
    });

    it('handles melee_attack_reaction when no attacks available', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Riposte'];
            return undefined;
        });

        const result = await executeManeuver(
            { name: 'Riposte', automation: { type: 'combat_superiority' } },
            makePlayerStats({ attacks: [] }),
            'test-campaign',
            'Riposte'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('No melee attack available');
    });

    it('handles skill_check actionType', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Tactical Assessment'];
            return undefined;
        });

        const result = await executeManeuver(
            { name: 'Tactical Assessment', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Tactical Assessment'
        );

        expect(result.payload.description).toContain('Add 4 to the ability check');
    });

    it('returns popup with logEntries for basic maneuver', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Trip Attack'];
            return undefined;
        });

        const result = await executeManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Trip Attack'
        );

        expect(result.type).toBe('popup');
        expect(result.logEntries).toHaveLength(1);
        expect(result.logEntries[0].type).toBe('ability_use');
        expect(result.logEntries[0].characterName).toBe('TestFighter');
    });

    it('uses custom uses_max from automation config', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 3;
            if (key === SELECTION_KEY) return ['Trip Attack'];
            return undefined;
        });

        const result = await executeManeuver(
            { name: 'Test', automation: { type: 'combat_superiority', uses_max: 5 } },
            makePlayerStats(),
            'test-campaign',
            'Trip Attack'
        );

        expect(result.type).toBe('popup');
        expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', 'superiorityDice', 2, 'test-campaign');
    });
});

// ── executeReactionManeuver ────────────────────────────────────────────

describe('executeReactionManeuver', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns error popup when maneuver not found', async () => {
        const result = await executeReactionManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Nonexistent Reaction'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('not found');
    });

    it('returns error popup when no dice and no relentless', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 0;
            if (key === SELECTION_KEY) return ['Parry'];
            return undefined;
        });

        const result = await executeReactionManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Parry'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('No Superiority Dice remaining');
    });

    it('handles damage_reduction effect (Parry) with HP restoration', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Parry'];
            if (key === 'hitPoints') return 20;
            if (key === 'currentHitPoints') return 5;
            return undefined;
        });

        const result = await executeReactionManeuver(
            { name: 'Parry', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Parry'
        );

        expect(result.payload.description).toContain('Damage reduced by');
        expect(result.payload.description).toContain('HP restored');
        expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', 'currentHitPoints', expect.any(Number), 'test-campaign');
    });

    it('handles damage_reduction when HP already at max', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Parry'];
            if (key === 'hitPoints') return 20;
            if (key === 'currentHitPoints') return 20;
            return undefined;
        });

        const result = await executeReactionManeuver(
            { name: 'Parry', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Parry'
        );

        expect(result.payload.description).toContain('Damage reduced by');
        expect(result.payload.description).toContain('HP restored');
    });

    it('handles melee_attack_reaction (Riposte) with attack_roll return', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Riposte'];
            return undefined;
        });

        const result = await executeReactionManeuver(
            { name: 'Riposte', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Riposte'
        );

        expect(result.type).toBe('attack_roll');
        expect(result.payload.targetName).toBe('Goblin');
        expect(result.logEntries).toHaveLength(1);
    });

    it('handles melee_attack_reaction when no attacks available', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Riposte'];
            return undefined;
        });

        const result = await executeReactionManeuver(
            { name: 'Riposte', automation: { type: 'combat_superiority' } },
            makePlayerStats({ attacks: [] }),
            'test-campaign',
            'Riposte'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('No melee attack available');
        expect(result.logEntries).toHaveLength(1);
    });

    it('returns popup with logEntries for basic reaction', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Parry'];
            return undefined;
        });

        const result = await executeReactionManeuver(
            { name: 'Parry', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Parry'
        );

        expect(result.type).toBe('popup');
        expect(result.logEntries).toHaveLength(1);
        expect(result.logEntries[0].type).toBe('ability_use');
    });

    it('uses Relentless when passive exists and not used this round', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 0;
            if (key === SELECTION_KEY) return ['Parry'];
            if (key === 'relentlessUsedRound') return undefined;
            return undefined;
        });

        const result = await executeReactionManeuver(
            { name: 'Parry', automation: { type: 'combat_superiority' } },
            makePlayerStats({
                automation: { passives: [{ type: 'passive_rule', effect: 'relentless' }] },
            }),
            'test-campaign',
            'Parry'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Relentless');
        expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', 'relentlessUsedRound', 1, 'test-campaign');
    });
});

// ── handleCombatSuperioritySkillCheck ──────────────────────────────────

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

// ── handleCombatSuperiorityCommandingPresenceReaction ──────────────────

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

// ── onCombatSuperioritySelected ────────────────────────────────────────

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

        expect(result.payload.description).toContain('Bait and Switch');
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
