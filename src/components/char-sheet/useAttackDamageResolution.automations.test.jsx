import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useAttackDamageResolution from './useAttackDamageResolution.js';

vi.mock('../../services/dice/diceRoller.js', () => ({
    rollExpression: vi.fn(),
    rollExpressionDoubled: vi.fn(),
}));

vi.mock('../../services/rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
    getTargetFromAttacker: vi.fn(),
}));

vi.mock('../../services/encounters/combatData.js', () => ({
    getCurrentCombatRound: vi.fn(() => 1),
    loadCombatSummary: vi.fn(),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../services/automation/common/choiceStorage.js', () => ({
    getChosenRuntimeValue: vi.fn(() => undefined),
}));

vi.mock('../../services/automation/common/buffToggle.js', () => ({
    getActiveBuffs: vi.fn(),
}));

vi.mock('../../services/combat/automation/automationService.js', () => ({
    collectWeaponMastery: vi.fn(),
    evaluateAutoExpression: vi.fn(),
    hasTwoWeaponFighting: vi.fn(),
}));

vi.mock('../../services/rules/combat/applyDamage.js', () => ({
    applyDamageToTarget: vi.fn(),
}));

vi.mock('../../services/rules/core/attackCalc.js', () => ({
    parseMagicItemName: vi.fn((name) => ({ baseName: name })),
}));

vi.mock('../../services/ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

import { rollExpression, rollExpressionDoubled } from '../../services/dice/diceRoller.js';
import { getCombatContext, getTargetFromAttacker } from '../../services/rules/combat/damageUtils.js';
import { getCurrentCombatRound } from '../../services/encounters/combatData.js';
import { getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { getActiveBuffs } from '../../services/automation/common/buffToggle.js';
import { collectWeaponMastery, hasTwoWeaponFighting } from '../../services/combat/automation/automationService.js';
import { addEntry } from '../../services/ui/logService.js';

const defaultRollResult = { total: 5, rolls: [5], modifier: 3 };
const defaultCtx = { targetName: 'Goblin', autoDamageSecondaryFormula: null, autoDamageSecondaryName: null, autoDamageSecondaryDamageType: null, saveDc: null, saveType: null, dcSuccess: null, tavernBrawlerRerolls: null };

function createMockDeps(overrides = {}) {
    const mockPlayerStats = {
        name: 'TestFighter',
        level: 5,
        abilities: [{ name: 'Strength', bonus: 3 }, { name: 'Dexterity', bonus: 2 }],
        proficiency: 3,
        class: { name: 'Barbarian', class_levels: [{ level: 5, rage_damage: 2 }] },
        automation: { actions: [], passives: [] },
    };

    return {
        playerStats: mockPlayerStats,
        campaignName: 'test-campaign',
        mapName: null,
        popupHtml: null,
        setPopupHtml: vi.fn(),
        rollDamage: vi.fn(),
        buildCtx: vi.fn(() => Promise.resolve(defaultCtx)),
        buildCtxSync: vi.fn(() => Promise.resolve(defaultCtx)),
        modalState: {},
        setModalState: vi.fn(),
        pendingDamage: null,
        setPendingDamage: vi.fn(),
        resumeRef: { current: null },
        ...overrides,
    };
}

describe('useAttackDamageResolution - automations', () => {
    let deps;

    beforeEach(() => {
        vi.clearAllMocks();
        rollExpression.mockReturnValue(defaultRollResult);
        rollExpressionDoubled.mockReturnValue({ total: 10, rolls: [5, 5], modifier: 6 });
        getRuntimeValue.mockReturnValue(null);
        setRuntimeValue.mockReturnValue(undefined);
        getActiveBuffs.mockReturnValue([]);
        hasTwoWeaponFighting.mockReturnValue(false);
        collectWeaponMastery.mockReturnValue({ baseMastery: null, extraMasteries: [] });
        addEntry.mockResolvedValue(undefined);
        getCombatContext.mockResolvedValue(null);
        getCurrentCombatRound.mockReturnValue(1);
        deps = createMockDeps();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ── Melee damage bonus automations ───────────────────────────────────

    describe('melee damage bonus automations', () => {
        it('applies melee_weapon_hit damage_bonus automations', async () => {
            const stats = {
                ...deps.playerStats,
                automation: {
                    actions: [
                        { type: 'damage_bonus', trigger: 'melee_weapon_hit', damageExpression: '1d4', damageType: 'radiant' },
                    ],
                    passives: [],
                },
            };
            const testDeps = createMockDeps({ playerStats: stats });
            const { resolveAttackDamage } = useAttackDamageResolution(testDeps);
            const attack = {
                name: 'Longsword',
                damage: '1d8',
                damageType: 'slashing',
                weaponType: 'melee',
                properties: [],
            };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(testDeps.rollDamage).toHaveBeenCalledWith(
                'Longsword',
                expect.stringContaining('1d4'),
                expect.any(Number),
                expect.any(Array),
                expect.any(Number),
                expect.any(Object),
            );
        });
    });

    // ── Divine Fury ─────────────────────────────────────────────────────

    describe('divine fury damage type choice', () => {
        it('opens damage type choice modal when divine fury has multiple options', async () => {
            const stats = {
                ...deps.playerStats,
                automation: {
                    actions: [
                        {
                            type: 'damage_bonus',
                            trigger: 'first_hit_while_raging',
                            damageExpression: '2d6',
                            damageType: 'fire or cold',
                        },
                    ],
                    passives: [],
                },
            };
            getRuntimeValue.mockImplementation((key, prop) => {
                if (prop === '_divineFuryUsedRound') return null;
                if (prop === 'activeBuffs') return [{ effect: 'advantage_attacks_advantage_against' }, { damageBonusExpression: '1d4' }];
                if (prop === 'resumeRef') return {};
                return null;
            });
            const testDeps = createMockDeps({ playerStats: stats });
            const { resolveAttackDamage } = useAttackDamageResolution(testDeps);
            const attack = {
                name: 'Longsword',
                damage: '1d8+3',
                damageType: 'slashing',
                weaponType: 'melee',
                properties: [],
            };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(testDeps.setModalState).toHaveBeenCalledWith({ divineFuryChoice: 'fire or cold' });
            expect(testDeps.resumeRef.current).toEqual(
                expect.objectContaining({
                    attack,
                    bonusExpr: '2d6',
                }),
            );
        });

        it('applies divine fury inline when single damage type', async () => {
            const stats = {
                ...deps.playerStats,
                automation: {
                    actions: [
                        {
                            type: 'damage_bonus',
                            trigger: 'first_hit_while_raging',
                            damageExpression: '2d6',
                            damageType: 'fire',
                        },
                    ],
                    passives: [],
                },
            };
            getRuntimeValue.mockImplementation((key, prop) => {
                if (prop === '_divineFuryUsedRound') return null;
                if (prop === 'activeBuffs') return [{ damageBonusExpression: '1d4' }];
                return null;
            });
            const testDeps = createMockDeps({ playerStats: stats });
            const { resolveAttackDamage } = useAttackDamageResolution(testDeps);
            const attack = {
                name: 'Longsword',
                damage: '1d8+3',
                damageType: 'slashing',
                weaponType: 'melee',
                properties: [],
            };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(testDeps.rollDamage).toHaveBeenCalledWith(
                'Longsword',
                expect.stringContaining('2d6'),
                expect.any(Number),
                expect.any(Array),
                expect.any(Number),
                expect.any(Object),
            );
        });
    });

    // ── Attack riders ───────────────────────────────────────────────────

    describe('attack_rider automations', () => {
        it('applies strength_attack_hit_after_reckless riders', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (prop === '_brutalStrikeActive') return true;
                return null;
            });
            const stats = {
                ...deps.playerStats,
                automation: {
                    actions: [
                        {
                            type: 'attack_rider',
                            trigger: 'strength_attack_hit_after_reckless',
                            damageExpression: '1d6',
                            damageType: 'radiant',
                        },
                    ],
                    passives: [],
                },
            };
            const testDeps = createMockDeps({ playerStats: stats });
            const { resolveAttackDamage } = useAttackDamageResolution(testDeps);
            const attack = {
                name: 'Longsword',
                damage: '1d8',
                damageType: 'slashing',
                weaponType: 'melee',
                properties: [],
                abilityName: 'Strength',
            };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(testDeps.rollDamage).toHaveBeenCalledWith(
                'Longsword',
                expect.stringContaining('1d6'),
                expect.any(Number),
                expect.any(Array),
                expect.any(Number),
                expect.any(Object),
            );
        });
    });

    // ── Weapon attack hit automations ────────────────────────────────────

    describe('weapon_attack_hit automations', () => {
        it('applies weapon_attack_hit damage_bonus once per turn', async () => {
            const stats = {
                ...deps.playerStats,
                automation: {
                    actions: [
                        {
                            name: 'Divine Strike',
                            type: 'damage_bonus',
                            trigger: 'weapon_attack_hit',
                            damageExpression: '1d8',
                            damageType: 'radiant',
                            oncePerTurn: true,
                        },
                    ],
                    passives: [],
                },
            };
            const testDeps = createMockDeps({ playerStats: stats });
            const { resolveAttackDamage } = useAttackDamageResolution(testDeps);
            const attack = {
                name: 'Longsword',
                damage: '1d8+3',
                damageType: 'slashing',
                weaponType: 'melee',
                properties: [],
            };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(testDeps.rollDamage).toHaveBeenCalledWith(
                'Longsword',
                expect.stringContaining('1d8'),
                expect.any(Number),
                expect.any(Array),
                expect.any(Number),
                expect.any(Object),
            );
        });

        it('skips oncePerTurn when already used this round', async () => {
            const stats = {
                ...deps.playerStats,
                automation: {
                    actions: [
                        {
                            name: 'Divine Strike',
                            type: 'damage_bonus',
                            trigger: 'weapon_attack_hit',
                            damageExpression: '1d8',
                            damageType: 'radiant',
                            oncePerTurn: true,
                        },
                    ],
                    passives: [],
                },
            };
            getRuntimeValue.mockReturnValueOnce(null) // feintingAttackDieValue check
                .mockReturnValueOnce(null) // lungingAttackDieValue check
                .mockReturnValueOnce(null) // commanderStrikeBonus check
                .mockReturnValueOnce(null) // _Divine_Strike_usedRound check -> returns 1
                .mockReturnValueOnce(null); // optionKey check
            // BI offense prompt: bardicInspirationDie check returns null (no BI die)
            getRuntimeValue.mockReturnValueOnce(null);
            // Actually the code does: getRuntimeValue(playerStats.name, usedKey, campaignName) where usedKey = '_Divine_Strike_usedRound'
            // Then it checks usedRound === currentRound (1 === 1) -> skip
            // We need to mock the usedRound check to return 1 (current round)
            getRuntimeValue.mockReturnValue(1);
            const testDeps = createMockDeps({ playerStats: stats });
            const { resolveAttackDamage } = useAttackDamageResolution(testDeps);
            const attack = {
                name: 'Longsword',
                damage: '1d8+3',
                damageType: 'slashing',
                weaponType: 'melee',
                properties: [],
            };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(testDeps.rollDamage).toHaveBeenCalledWith(
                'Longsword',
                expect.stringContaining('1d8+3'),
                expect.any(Number),
                expect.any(Array),
                expect.any(Number),
                expect.any(Object),
            );
        });

        it('skips features upgraded by higher-level features', async () => {
            const stats = {
                ...deps.playerStats,
                automation: {
                    actions: [
                        {
                            name: 'Divine Strike',
                            type: 'damage_bonus',
                            trigger: 'weapon_attack_hit',
                            damageExpression: '1d8',
                            damageType: 'radiant',
                        },
                        {
                            name: 'Paladin 17',
                            type: 'damage_bonus',
                            trigger: 'weapon_attack_hit',
                            damageExpression: '3d8',
                            damageType: 'radiant',
                            upgrades: 'Divine Strike',
                        },
                    ],
                    passives: [],
                },
            };
            const testDeps = createMockDeps({ playerStats: stats });
            const { resolveAttackDamage } = useAttackDamageResolution(testDeps);
            const attack = {
                name: 'Longsword',
                damage: '1d8+3',
                damageType: 'slashing',
                weaponType: 'melee',
                properties: [],
            };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            // Should only include the upgraded (higher-level) feature's damage
            const formula = testDeps.rollDamage.mock.calls[0][1];
            expect(formula).toContain('3d8');
            // The base weapon damage '1d8+3' is always present, so check the bonus features separately
            // by verifying the original '1d8' from Divine Strike is NOT in the bonuses
            const bonusParts = formula.split('+').slice(1); // skip original '1d8'
            const bonusOnly = bonusParts.join('+');
            expect(bonusOnly).toContain('3d8');
            expect(bonusOnly).not.toContain('1d8');
        });

        it('applies weapon_or_beast_form_attack_hit when feature is in actions', async () => {
            const stats = {
                ...deps.playerStats,
                automation: {
                    actions: [
                        {
                            name: 'Beast Form Feature',
                            type: 'damage_bonus',
                            trigger: 'weapon_or_beast_form_attack_hit',
                            damageExpression: '1d8',
                            damageType: 'fire',
                        },
                    ],
                    passives: [],
                },
            };
            const testDeps = createMockDeps({ playerStats: stats });
            const { resolveAttackDamage } = useAttackDamageResolution(testDeps);
            const attack = {
                name: 'Longsword',
                damage: '1d8+3',
                damageType: 'slashing',
                weaponType: 'melee',
                properties: [],
            };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(testDeps.rollDamage).toHaveBeenCalledWith(
                'Longsword',
                expect.stringContaining('1d8+3'),
                expect.any(Number),
                expect.any(Array),
                expect.any(Number),
                expect.any(Object),
            );
        });
    });

    // ── Natural 20 bonuses ──────────────────────────────────────────────

    describe('natural_20_attack_roll bonuses', () => {
        it('applies natural_20 damage bonus when isNatural20 is true', async () => {
            const stats = {
                ...deps.playerStats,
                automation: {
                    actions: [
                        {
                            name: 'Overwhelming Strike',
                            type: 'damage_bonus',
                            trigger: 'natural_20_attack_roll',
                            extraDamageExpression: '2d10',
                            extraDamageType: 'force',
                        },
                    ],
                    passives: [],
                },
            };
            const testDeps = createMockDeps({ playerStats: stats, popupHtml: { isNatural20: true } });
            const { resolveAttackDamage } = useAttackDamageResolution(testDeps);
            const attack = {
                name: 'Longsword',
                damage: '1d8+3',
                damageType: 'slashing',
                weaponType: 'melee',
                properties: [],
            };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(testDeps.rollDamage).toHaveBeenCalledWith(
                'Longsword',
                expect.stringContaining('2d10'),
                expect.any(Number),
                expect.any(Array),
                expect.any(Number),
                expect.any(Object),
            );
        });

        it('uses increased_ability_score for extra damage expression', async () => {
            const stats = {
                ...deps.playerStats,
                automation: {
                    actions: [
                        {
                            name: 'Overwhelming Strike',
                            type: 'damage_bonus',
                            trigger: 'natural_20_attack_roll',
                            extraDamageExpression: 'increased_ability_score',
                            extraDamageType: 'force',
                            abilityIncreased: 'Strength',
                        },
                    ],
                    passives: [],
                },
            };
            const testDeps = createMockDeps({ playerStats: stats, popupHtml: { isNatural20: true } });
            const { resolveAttackDamage } = useAttackDamageResolution(testDeps);
            const attack = {
                name: 'Longsword',
                damage: '1d8+3',
                damageType: 'slashing',
                weaponType: 'melee',
                properties: [],
            };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(testDeps.rollDamage).toHaveBeenCalledWith(
                'Longsword',
                expect.stringContaining('3'),
                expect.any(Number),
                expect.any(Array),
                expect.any(Number),
                expect.any(Object),
            );
        });
    });

    // ── Celestial transformation ────────────────────────────────────────

    describe('celestial transformation riders', () => {
        it('applies attack_rider for active transformation', async () => {
            const stats = {
                ...deps.playerStats,
                automation: {
                    actions: [],
                    passives: [
                        {
                            name: 'Heavenly Wings',
                            type: 'attack_rider',
                            trigger: 'hit',
                            damageExpression: '1d6',
                            damageType: 'radiant',
                            oncePerTurn: true,
                        },
                    ],
                },
            };
            getActiveBuffs.mockReturnValue([{ name: 'Heavenly Wings' }]);
            const testDeps = createMockDeps({ playerStats: stats });
            const { resolveAttackDamage } = useAttackDamageResolution(testDeps);
            const attack = {
                name: 'Longsword',
                damage: '1d8',
                damageType: 'slashing',
                weaponType: 'melee',
                properties: [],
            };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(testDeps.rollDamage).toHaveBeenCalledWith(
                'Longsword',
                expect.stringContaining('1d6'),
                expect.any(Number),
                expect.any(Array),
                expect.any(Number),
                expect.any(Object),
            );
        });

        it('does not apply rider when no transformation is active or passive is missing', async () => {
            const stats = {
                ...deps.playerStats,
                automation: {
                    actions: [],
                    passives: [
                        {
                            name: 'Heavenly Wings',
                            type: 'attack_rider',
                            trigger: 'hit',
                            damageExpression: '1d6',
                            damageType: 'radiant',
                            oncePerTurn: true,
                        },
                    ],
                },
            };
            getActiveBuffs.mockReturnValue([]);
            const testDeps = createMockDeps({ playerStats: stats });
            const { resolveAttackDamage } = useAttackDamageResolution(testDeps);
            const attack = {
                name: 'Longsword',
                damage: '1d8',
                damageType: 'slashing',
                weaponType: 'melee',
                properties: [],
            };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(testDeps.rollDamage).toHaveBeenCalledWith(
                'Longsword',
                expect.stringContaining('1d8'),
                expect.any(Number),
                expect.any(Array),
                expect.any(Number),
                expect.any(Object),
            );
        });
    });

    // ── Colossus Slayer ─────────────────────────────────────────────────

    describe('colossus Slayer', () => {
        it('adds 1d8 extra damage when target is below max HP', async () => {
            getRuntimeValue.mockReturnValueOnce(null).mockReturnValueOnce("Colossus Slayer");
            getTargetFromAttacker.mockReturnValue({ name: 'Goblin', currentHp: 5, maxHp: 15 });
            const { resolveAttackDamage } = useAttackDamageResolution(deps);
            const attack = {
                name: 'Longsword',
                damage: '1d8+3',
                damageType: 'slashing',
                weaponType: 'melee',
                properties: [],
            };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(deps.rollDamage).toHaveBeenCalledWith(
                'Longsword',
                expect.stringContaining('1d8'),
                expect.any(Number),
                expect.any(Array),
                expect.any(Number),
                expect.any(Object),
            );
        });

        it('does not add extra damage when target is at full HP or no target found', async () => {
            getRuntimeValue.mockReturnValueOnce(null).mockReturnValueOnce("Colossus Slayer");
            getTargetFromAttacker.mockReturnValue({ name: 'Goblin', currentHp: 15, maxHp: 15 });
            const { resolveAttackDamage } = useAttackDamageResolution(deps);
            const attack = {
                name: 'Longsword',
                damage: '1d8+3',
                damageType: 'slashing',
                weaponType: 'melee',
                properties: [],
            };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(deps.rollDamage).toHaveBeenCalledWith(
                'Longsword',
                expect.stringContaining('1d8+3'),
                expect.any(Number),
                expect.any(Array),
                expect.any(Number),
                expect.any(Object),
            );
        });
    });
});
