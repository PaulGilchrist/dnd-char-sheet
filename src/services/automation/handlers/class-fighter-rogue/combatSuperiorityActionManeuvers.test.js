import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    executeBonusActionManeuver,
    executeGrantAttackManeuver,
    executeMovementManeuver,
    executeSkillCheckManeuver,
    executeReactionManeuver,
    executeCommandingPresenceReaction,
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

// ── executeBonusActionManeuver ─────────────────────────────────────────

describe('executeBonusActionManeuver', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns popup with description for ac_bonus_disengage', async () => {
        const result = await executeBonusActionManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Evasive Footwork'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Disengage action');
        expect(result.payload.description).toContain('+4 AC');
        expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', 'baitAndSwitchActive', true, 'test-campaign');
    });

    it('returns popup with description for advantage_and_damage', async () => {
        const result = await executeBonusActionManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Feinting Attack'
        );

        expect(result.payload.description).toContain('Advantage on your next attack roll');
        expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', 'feintingAttackDieValue', 4, 'test-campaign');
    });

    it('returns popup with description for dash_and_damage', async () => {
        const result = await executeBonusActionManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Lunging Attack'
        );

        expect(result.payload.description).toContain('Dash action');
        expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', 'lungingAttackDieValue', 4, 'test-campaign');
    });

    it('returns modal for temp_hp (Rally) when allies exist', async () => {
        const combatContext = {
            creatures: [
                { name: 'TestFighter' },
                { name: 'Ally1' },
                { name: 'Ally2' },
            ],
        };

        const damageUtils = await import('../../../../services/rules/combat/damageUtils.js');
        damageUtils.getCombatContext.mockResolvedValue(combatContext);

        const result = await executeBonusActionManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Rally'
        );

        expect(result.type).toBe('modal');
        expect(result.modalName).toBe('rallyChoice');
        expect(result.payload.allyOptions).toHaveLength(2);
        expect(result.payload.dieValue).toBe(4);
    });
});

// ── executeBonusActionManeuver - temp_hp no allies ─────────────────────

describe('executeBonusActionManeuver - temp_hp edge cases', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns error popup when temp_hp maneuver has no allies', async () => {
        const combatContext = {
            creatures: [{ name: 'TestFighter' }],
        };

        const damageUtils = await import('../../../../services/rules/combat/damageUtils.js');
        damageUtils.getCombatContext.mockResolvedValue(combatContext);

        const result = await executeBonusActionManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Rally'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('No allies available to receive Rally');
    });
});

// ── executeGrantAttackManeuver ─────────────────────────────────────────

describe('executeGrantAttackManeuver', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns modal with ally options when allies exist', async () => {
        const combatContext = {
            creatures: [
                { name: 'TestFighter' },
                { name: 'Ally1' },
            ],
        };

        const damageUtils = await import('../../../../services/rules/combat/damageUtils.js');
        damageUtils.getCombatContext.mockResolvedValue(combatContext);

        const result = await executeGrantAttackManeuver(
            { name: "Commander's Strike", automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            "Commander's Strike"
        );

        expect(result.type).toBe('modal');
        expect(result.modalName).toBe('commanderStrikeChoice');
        expect(result.payload.options).toHaveLength(1);
    });

    it('returns error popup when no allies available', async () => {
        const combatContext = {
            creatures: [{ name: 'TestFighter' }],
        };

        const damageUtils = await import('../../../../services/rules/combat/damageUtils.js');
        damageUtils.getCombatContext.mockResolvedValue(combatContext);

        const result = await executeGrantAttackManeuver(
            { name: "Commander's Strike", automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            "Commander's Strike"
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('No allies available');
    });
});

// ── executeGrantAttackManeuver - no allies ─────────────────────────────

describe('executeGrantAttackManeuver - no allies', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns error popup when no allies available', async () => {
        const combatContext = {
            creatures: [{ name: 'TestFighter' }],
        };

        const damageUtils = await import('../../../../services/rules/combat/damageUtils.js');
        damageUtils.getCombatContext.mockResolvedValue(combatContext);

        const result = await executeGrantAttackManeuver(
            { name: "Commander's Strike", automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            "Commander's Strike"
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('No allies available');
    });
});

// ── executeMovementManeuver ────────────────────────────────────────────

describe('executeMovementManeuver', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns popup with AC bonus description', async () => {
        const result = await executeMovementManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Bait and Switch'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('+4 AC');
        expect(result.logEntries).toHaveLength(1);
        expect(result.logEntries[0].type).toBe('ability_use');
    });
});

// ── executeMovementManeuver - relentless ───────────────────────────────

describe('executeMovementManeuver - relentless', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('uses Relentless when passive exists and not used this round', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 0;
            if (key === SELECTION_KEY) return ['Bait and Switch'];
            if (key === 'relentlessUsedRound') return undefined;
            return undefined;
        });

        const result = await executeMovementManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats({
                automation: { passives: [{ type: 'passive_rule', effect: 'relentless' }] },
            }),
            'test-campaign',
            'Bait and Switch'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Relentless');
        expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', 'relentlessUsedRound', 1, 'test-campaign');
    });
});

// ── executeSkillCheckManeuver ──────────────────────────────────────────

describe('executeSkillCheckManeuver', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('rolls die, stores pending bonus, and returns popup', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Ambush'];
            return undefined;
        });

        const result = await executeSkillCheckManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Ambush'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Add 4 to your next');
        expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', 'pendingSkillCheckBonus', 4, 'test-campaign');
        expect(result.logEntries).toHaveLength(1);
    });

    it('logs the ability use entry', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Tactical Assessment'];
            return undefined;
        });

        const result = await executeSkillCheckManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Tactical Assessment'
        );

        expect(result.logEntries[0].type).toBe('ability_use');
        expect(result.logEntries[0].characterName).toBe('TestFighter');
        expect(result.logEntries[0].abilityName).toBe('Tactical Assessment');
    });
});

// ── executeSkillCheckManeuver - initiativeBonus ────────────────────────

describe('executeSkillCheckManeuver - initiativeBonus', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('references initiative/stealth in description when initiativeBonus is true', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Ambush'];
            return undefined;
        });

        const result = await executeSkillCheckManeuver(
            { name: 'Test', automation: { type: 'combat_superiority' } },
            makePlayerStats(),
            'test-campaign',
            'Ambush'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Initiative roll or Dexterity (Stealth)');
        expect(setRuntimeValue).toHaveBeenCalledWith('TestFighter', 'pendingSkillCheckBonus', 4, 'test-campaign');
    });
});

// ── executeReactionManeuver - relentless ───────────────────────────────

describe('executeReactionManeuver - relentless', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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

// ── executeReactionManeuver - melee_attack_reaction no attacks ─────────

describe('executeReactionManeuver - melee_attack_reaction no attacks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns error popup when no attacks available', async () => {
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
});

// ── executeCommandingPresenceReaction ──────────────────────────────────

describe('executeCommandingPresenceReaction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns popup with disadvantage description', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Commanding Presence'];
            if (key === 'activeConditions') return [];
            return undefined;
        });

        const result = await executeCommandingPresenceReaction(
            {
                name: 'Test',
                automation: {
                    type: 'combat_superiority',
                    targetName: 'Goblin',
                    reactionEffect: 'disadvantage_next_attack',
                    reactionDuration: 'until_end_of_next_turn',
                },
            },
            makePlayerStats(),
            'test-campaign',
            'Commanding Presence'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Disadvantage on their next attack roll');
        expect(setRuntimeValue).toHaveBeenCalledWith('Goblin', 'activeConditions', expect.arrayContaining(['disadvantage']), 'test-campaign');
    });

    it('handles save_disadvantage reaction effect', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Commanding Presence'];
            return undefined;
        });

        const result = await executeCommandingPresenceReaction(
            {
                name: 'Test',
                automation: {
                    type: 'combat_superiority',
                    targetName: 'Goblin',
                    reactionEffect: 'save_disadvantage',
                },
            },
            makePlayerStats(),
            'test-campaign',
            'Commanding Presence'
        );

        expect(result.payload.description).toContain('Disadvantage on their next saving throw');
    });
});

// ── executeCommandingPresenceReaction - save_disadvantage ──────────────

describe('executeCommandingPresenceReaction - save_disadvantage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('handles save_disadvantage reaction effect', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Commanding Presence'];
            return undefined;
        });

        const result = await executeCommandingPresenceReaction(
            {
                name: 'Test',
                automation: {
                    type: 'combat_superiority',
                    targetName: 'Goblin',
                    reactionEffect: 'save_disadvantage',
                },
            },
            makePlayerStats(),
            'test-campaign',
            'Commanding Presence'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Disadvantage on their next saving throw');
    });
});

// ── executeCommandingPresenceReaction - attack_roll_disadvantage ───────

describe('executeCommandingPresenceReaction - attack_roll_disadvantage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('handles attack_roll_disadvantage reaction effect', async () => {
        getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
            if (key === 'superiorityDice') return 4;
            if (key === SELECTION_KEY) return ['Commanding Presence'];
            if (key === 'activeConditions') return [];
            return undefined;
        });

        const result = await executeCommandingPresenceReaction(
            {
                name: 'Test',
                automation: {
                    type: 'combat_superiority',
                    targetName: 'Goblin',
                    reactionEffect: 'attack_roll_disadvantage',
                },
            },
            makePlayerStats(),
            'test-campaign',
            'Commanding Presence'
        );

        expect(result.type).toBe('popup');
        expect(result.payload.description).toContain('Disadvantage on their next attack roll');
        expect(setRuntimeValue).toHaveBeenCalledWith('Goblin', 'activeConditions', expect.arrayContaining(['disadvantage']), 'test-campaign');
    });
});
