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

function HookFactory(deps) {
    return useAttackDamageResolution(deps);
}

describe('useAttackDamageResolution', () => {
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

    // ── Basic damage click ──────────────────────────────────────────────

    describe('basic damage click', () => {
        it('rolls damage and calls rollDamage with computed values', async () => {
            const { resolveAttackDamage } = useAttackDamageResolution(deps);
            const attack = { name: 'Longsword', damage: '1d8+3', damageType: 'slashing', properties: [] };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(rollExpression).toHaveBeenCalledWith(expect.stringContaining('1d8+3'));
            expect(deps.buildCtxSync).toHaveBeenCalledWith(attack);
            expect(deps.rollDamage).toHaveBeenCalledWith(
                'Longsword',
                expect.stringContaining('1d8+3'),
                5,
                [5],
                3,
                defaultCtx,
            );
        });

        it('double-rolls damage when popupHtml.isCrit is true', async () => {
            deps = createMockDeps({ popupHtml: { isCrit: true } });
            const { resolveAttackDamage } = useAttackDamageResolution(deps);
            const attack = { name: 'Longsword', damage: '1d8+3', damageType: 'slashing', properties: [] };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(rollExpressionDoubled).toHaveBeenCalledWith(expect.stringContaining('1d8+3'));
            expect(rollExpression).not.toHaveBeenCalled();
        });

        it('clears popupHtml when it had isCrit', async () => {
            deps = createMockDeps({ popupHtml: { isCrit: true, isNatural20: true } });
            const { resolveAttackDamage } = useAttackDamageResolution(deps);
            const attack = { name: 'Longsword', damage: '1d8+3', damageType: 'slashing', properties: [] };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(deps.setPopupHtml).toHaveBeenCalledWith(null);
        });

        it('returns early without calling rollDamage when dice roll returns null', async () => {
            rollExpression.mockReturnValue(null);
            const { resolveAttackDamage } = useAttackDamageResolution(deps);
            const attack = { name: 'Longsword', damage: '1d8+3', damageType: 'slashing', properties: [] };

            await resolveAttackDamage(attack);

            expect(deps.rollDamage).not.toHaveBeenCalled();
            expect(deps.buildCtxSync).not.toHaveBeenCalled();
        });

        it('uses buildCtx when mapName is truthy', async () => {
            const testDeps = createMockDeps({ mapName: 'test-map' });
            const { resolveAttackDamage } = useAttackDamageResolution(testDeps);
            const attack = { name: 'Fire Bolt', damage: '1d10', damageType: 'fire', properties: [] };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(testDeps.buildCtx).toHaveBeenCalledWith(attack);
            expect(testDeps.buildCtxSync).not.toHaveBeenCalled();
        });

        it('uses buildCtxSync when mapName is falsy', async () => {
            const { resolveAttackDamage } = useAttackDamageResolution(deps);
            const attack = { name: 'Longsword', damage: '1d8+3', damageType: 'slashing', properties: [] };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(deps.buildCtxSync).toHaveBeenCalledWith(attack);
            expect(deps.buildCtx).not.toHaveBeenCalled();
        });

        it('returns { resolveAttackDamage, proceedWithDamage }', async () => {
            const { resolveAttackDamage, proceedWithDamage } = HookFactory(deps);

            expect(typeof resolveAttackDamage).toBe('function');
            expect(typeof proceedWithDamage).toBe('function');
        });
    });

    // ── Two Weapon Fighting ─────────────────────────────────────────────

    describe('two weapon fighting', () => {
        it('appends ability modifier to formula for light bonus action weapons', async () => {
            hasTwoWeaponFighting.mockReturnValue(true);
            const { resolveAttackDamage } = useAttackDamageResolution(deps);
            const attack = {
                name: 'Handaxe',
                damage: '1d6',
                damageType: 'slashing',
                type: 'Bonus Action',
                properties: ['Light'],
                abilityName: 'Strength',
            };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(deps.rollDamage).toHaveBeenCalledWith(
                'Handaxe',
                expect.stringContaining('+ 3 [Strength]'),
                expect.any(Number),
                expect.any(Array),
                expect.any(Number),
                expect.any(Object),
            );
        });

        it('does not append ability modifier for non-light weapons', async () => {
            const { resolveAttackDamage } = useAttackDamageResolution(deps);
            const attack = {
                name: 'Warhammer',
                damage: '1d8',
                damageType: 'bludgeoning',
                type: 'Bonus Action',
                properties: [],
                abilityName: 'Strength',
            };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(deps.rollDamage).toHaveBeenCalledWith(
                'Warhammer',
                expect.stringContaining('1d8'),
                expect.any(Number),
                expect.any(Array),
                expect.any(Number),
                expect.any(Object),
            );
        });

        it('does not append when abilityMod is 0', async () => {
            hasTwoWeaponFighting.mockReturnValue(true);
            const stats = { ...deps.playerStats, abilities: [{ name: 'Strength', bonus: 0 }] };
            const testDeps = createMockDeps({ playerStats: stats });
            const { resolveAttackDamage } = useAttackDamageResolution(testDeps);
            const attack = {
                name: 'Handaxe',
                damage: '1d6',
                damageType: 'slashing',
                type: 'Bonus Action',
                properties: ['Light'],
                abilityName: 'Strength',
            };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(testDeps.rollDamage).toHaveBeenCalledWith(
                'Handaxe',
                expect.stringContaining('1d6'),
                expect.any(Number),
                expect.any(Array),
                expect.any(Number),
                expect.any(Object),
            );
        });

        it('does not append when abilityName is missing', async () => {
            hasTwoWeaponFighting.mockReturnValue(true);
            const { resolveAttackDamage } = useAttackDamageResolution(deps);
            const attack = {
                name: 'Handaxe',
                damage: '1d6',
                damageType: 'slashing',
                type: 'Bonus Action',
                properties: ['Light'],
            };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(deps.rollDamage).toHaveBeenCalledWith(
                'Handaxe',
                expect.stringContaining('1d6'),
                expect.any(Number),
                expect.any(Array),
                expect.any(Number),
                expect.any(Object),
            );
        });

        it('does not append when modifier is already in formula', async () => {
            hasTwoWeaponFighting.mockReturnValue(true);
            rollExpression.mockReturnValue({ total: 8, rolls: [5, 3], modifier: 3 });
            const { resolveAttackDamage } = useAttackDamageResolution(deps);
            const attack = {
                name: 'Handaxe',
                damage: '1d6+3',
                damageType: 'slashing',
                type: 'Bonus Action',
                properties: ['Light'],
                abilityName: 'Strength',
            };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            const formulaArg = deps.rollDamage.mock.calls[0][1];
            const matches = formulaArg.match(/\+ 3 \[Strength\]/g);
            expect(matches).toHaveLength(1);
        });
    });

    // ── Rider damage effects (targetEffects) ────────────────────────────

    describe('rider damage effects', () => {
        it('applies damage_bonus targetEffects to formula and total', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (prop === 'targetEffects') {
                    return [{ effect: 'damage_bonus', damageExpression: '1d4', damageType: 'fire' }];
                }
                return null;
            });
            const { resolveAttackDamage } = useAttackDamageResolution(deps);
            const attack = { name: 'Longsword', damage: '1d8', damageType: 'slashing', properties: [] };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(deps.rollDamage).toHaveBeenCalledWith(
                'Longsword',
                expect.stringContaining('1d4'),
                expect.any(Number),
                expect.any(Array),
                expect.any(Number),
                expect.any(Object),
            );
        });

        it('does not apply rider effects when targetEffects is absent', async () => {
            const { resolveAttackDamage } = useAttackDamageResolution(deps);
            const attack = { name: 'Longsword', damage: '1d8', damageType: 'slashing', properties: [] };

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
    });

    // ── Sudden Strike ───────────────────────────────────────────────────

    describe('sudden strike handling', () => {
        it('clears pendingSuddenStrike for bonus action attacks when flag is set', async () => {
            getRuntimeValue.mockReturnValueOnce(true);
            const { resolveAttackDamage } = useAttackDamageResolution(deps);
            const attack = {
                name: 'Sudden Strike',
                damage: '1d6',
                damageType: 'psychic',
                type: 'Bonus Action',
                properties: [],
            };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestFighter',
                'pendingSuddenStrike',
                null,
                'test-campaign',
            );
        });

        it('clears pendingSuddenStrike for all attacks', async () => {
            getRuntimeValue.mockReturnValue(false);
            const { resolveAttackDamage } = useAttackDamageResolution(deps);
            const attack = {
                name: 'Longsword',
                damage: '1d8',
                damageType: 'slashing',
                type: 'Bonus Action',
                properties: [],
            };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestFighter',
                'pendingSuddenStrike',
                null,
                'test-campaign',
            );
        });
    });

    // ── Horde Breaker ───────────────────────────────────────────────────

    describe('horde breaker handling', () => {
        it('marks horde breaker as used for the current round', async () => {
            getRuntimeValue.mockReturnValueOnce('Horde Breaker');
            const { resolveAttackDamage } = useAttackDamageResolution(deps);
            const attack = {
                name: 'Horde Breaker',
                damage: '1d6',
                damageType: 'force',
                type: 'Bonus Action',
                properties: [],
            };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'TestFighter',
                '_Hunters_Prey_HordeBreaker_UsedRound',
                1,
                'test-campaign',
            );
        });

        it('does not mark when hunter prey choice is different or attack is not a bonus action', async () => {
            getRuntimeValue.mockReturnValueOnce(null).mockReturnValueOnce('Colossus Slayer');
            const { resolveAttackDamage } = useAttackDamageResolution(deps);
            const attack = {
                name: 'Horde Breaker',
                damage: '1d6',
                damageType: 'force',
                type: 'Bonus Action',
                properties: [],
            };

            await resolveAttackDamage(attack);
            await new Promise(r => setTimeout(r, 0));

            expect(setRuntimeValue).not.toHaveBeenCalledWith(
                'TestFighter',
                '_Hunters_Prey_HordeBreaker_UsedRound',
                expect.any(Number),
                'test-campaign',
            );
        });
    });

    // ── Weapon mastery modal ────────────────────────────────────────────

    describe('weapon mastery modal', () => {
        it('does not open modal for ranged attacks or when no mastery is available', async () => {
            collectWeaponMastery.mockReturnValue({ baseMastery: null, extraMasteries: [] });
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

            expect(deps.setModalState).not.toHaveBeenCalledWith(expect.objectContaining({ weaponMasteryModal: expect.anything() }));
        });

        it('applies Vex mastery automatically when in extraMasteries', async () => {
            collectWeaponMastery.mockReturnValue({ baseMastery: null, extraMasteries: ['Vex'] });
            getRuntimeValue.mockReturnValue(null);
            getCombatContext.mockResolvedValue({
                name: 'test-campaign',
                creatures: [{ name: 'Goblin', type: 'npc' }],
            });
            getTargetFromAttacker.mockReturnValue({ name: 'Goblin', type: 'npc' });
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

            expect(deps.setModalState).not.toHaveBeenCalledWith(expect.objectContaining({ weaponMasteryModal: expect.anything() }));
        });
    });
});
