import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../services/dice/diceRoller.js', () => ({
    rollExpression: vi.fn(),
    rollExpressionDoubled: vi.fn(),
    formatDamageFormula: vi.fn((formula) => formula),
}));

vi.mock('../../../services/ui/utils.js', () => ({
    default: {
        getName: vi.fn((n) => n || 'Unknown'),
        guid: vi.fn(() => 'test-guid-1234'),
    },
}));

vi.mock('../../runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../services/combat/automation/automationService.js', () => ({
    hasIgnoreResistance: vi.fn(),
    playerIsImmuneToCondition: vi.fn(),
    hasGreatWeaponFighting: vi.fn(),
    applyGreatWeaponFightingToDamage: vi.fn((rolls) => rolls),
    evaluateAutoExpression: vi.fn(),
}));

vi.mock('../../../services/rules/features/invisibilityService.js', () => ({
    endInvisibilityOnHostileAction: vi.fn(),
}));

vi.mock('../loggedDiceRollUtils.js', () => ({
    hasPotentCantrip: vi.fn(),
    hasSoulstitchProtection: vi.fn(),
    applyMinDamageAdjustment: vi.fn((d) => d),
}));

vi.mock('../../../services/combat/auras/coronaAuraUtils.js', () => ({
    getCoronaSaveDisadvantage: vi.fn(),
}));

vi.mock('../../../services/combat/auras/elderChampionAuraUtils.js', () => ({
    getElderChampionSaveDisadvantage: vi.fn(),
}));

vi.mock('../../../services/automation/handlers/buffs/circleOfPowerHandler.js', () => ({
    isCircleOfPowerActive: vi.fn(),
}));

vi.mock('./handleOverchannelSelfDamage.js', () => ({
    handleOverchannelSelfDamage: vi.fn(),
}));

vi.mock('../../../services/ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../services/rules/combat/applyDamage.js', () => ({
    computeDamageAfterSave: vi.fn((total, success, _dcSuccess) => success ? 0 : total),
    computeDamageAfterEvasion: vi.fn((total, success, dcSuccess, evasion) => {
        if (evasion && dcSuccess === 'half') return success ? 0 : Math.floor(total / 2);
        return success ? 0 : total;
    }),
    rollSaveForCreature: vi.fn(),
    applyDamageToTarget: vi.fn(),
    normalizeSaveType: vi.fn((t) => t),
}));

import { rollExpression, rollExpressionDoubled } from '../../../services/dice/diceRoller.js';
import { getRuntimeValue, setRuntimeValue } from '../../runtime/useRuntimeState.js';
import { hasIgnoreResistance, evaluateAutoExpression } from '../../../services/combat/automation/automationService.js';
import { endInvisibilityOnHostileAction } from '../../../services/rules/features/invisibilityService.js';
import { hasPotentCantrip, hasSoulstitchProtection, applyMinDamageAdjustment } from '../loggedDiceRollUtils.js';
import { getCoronaSaveDisadvantage } from '../../../services/combat/auras/coronaAuraUtils.js';
import { getElderChampionSaveDisadvantage } from '../../../services/combat/auras/elderChampionAuraUtils.js';
import { isCircleOfPowerActive } from '../../../services/automation/handlers/buffs/circleOfPowerHandler.js';
import { applyDamageToTarget, rollSaveForCreature } from '../../../services/rules/combat/applyDamage.js';
import { addEntry } from '../../../services/ui/logService.js';
import { createNpcSaveDamageHandler } from './handleNpcSaveDamage.js';

describe('handleNpcSaveDamage - metamagic twin and multi-target', () => {
    const deps = {
        characterName: 'TestWizard',
        campaignName: 'test-campaign',
        characters: [
            { name: 'TestWizard' },
            { name: 'Goblin', computedStats: { saveBonuses: { con: 2 }, evasionEffects: [] } },
        ],
        setPopupHtml: vi.fn(),
        logEntry: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        rollExpression.mockReturnValue({ total: 10, rolls: [6, 4], modifier: 0 });
        rollExpressionDoubled.mockReturnValue({ total: 20, rolls: [6, 4, 6, 4], modifier: 0 });
        getRuntimeValue.mockReset().mockReturnValue(null);
        setRuntimeValue.mockClear();
        hasIgnoreResistance.mockReturnValue(false);
        hasPotentCantrip.mockReturnValue(false);
        hasSoulstitchProtection.mockReturnValue(false);
        applyMinDamageAdjustment.mockImplementation((d) => d);
        evaluateAutoExpression.mockReturnValue(0);
        getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: false });
        getElderChampionSaveDisadvantage.mockResolvedValue({ disadvantage: false });
        isCircleOfPowerActive.mockReturnValue(false);
        rollSaveForCreature.mockReturnValue({ roll: 12, total: 14, bonus: 2, success: false, rawRolls: [12] });
        applyDamageToTarget.mockResolvedValue({ finalDamage: 10, newHp: 3, damageReduced: false });
        endInvisibilityOnHostileAction.mockClear();
        addEntry.mockClear();
        deps.logEntry.mockClear();
        deps.setPopupHtml.mockClear();
    });

    function createFn() {
        return createNpcSaveDamageHandler(deps);
    }

    describe('metamagic twin target', () => {
        it('applies damage to twin target when metamagicTwinTarget is set', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            rollSaveForCreature.mockReturnValue({ roll: 12, total: 14, bonus: 2, success: false, rawRolls: [12] });
            applyDamageToTarget.mockResolvedValueOnce({ finalDamage: 10, newHp: 3, damageReduced: false })
                .mockResolvedValueOnce({ finalDamage: 10, newHp: 2, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
                metamagicTwinTarget: 'Orc',
                playerStats: { name: 'TestWizard' },
            }, 10, { creatures: [
                { name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 },
                { name: 'Orc', type: 'npc', currentHp: 15, maxHp: 15 },
            ] });

            expect(applyDamageToTarget).toHaveBeenCalledTimes(2);
            expect(deps.logEntry).toHaveBeenCalledWith(expect.objectContaining({
                name: expect.stringContaining('(Twinned)'),
                targetName: 'Orc',
            }));
        });

        it('does not apply twin damage when twin target same as primary', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            applyDamageToTarget.mockResolvedValueOnce({ finalDamage: 10, newHp: 3, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
                metamagicTwinTarget: 'Goblin',
            }, 10, { creatures: [{ name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 }] });

            expect(applyDamageToTarget).toHaveBeenCalledTimes(1);
        });

        it('does not apply twin damage when twin not found in combatSummary', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            applyDamageToTarget.mockResolvedValueOnce({ finalDamage: 10, newHp: 3, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
                metamagicTwinTarget: 'NonExistent',
            }, 10, { creatures: [{ name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 }] });

            expect(applyDamageToTarget).toHaveBeenCalledTimes(1);
        });

        it('applies twin disadvantage from corona aura', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: true });
            rollSaveForCreature.mockReturnValue({ roll: 12, total: 14, bonus: 2, success: false, rawRolls: [12] });
            applyDamageToTarget.mockResolvedValueOnce({ finalDamage: 10, newHp: 3, damageReduced: false })
                .mockResolvedValueOnce({ finalDamage: 5, newHp: 10, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
                metamagicTwinTarget: 'Orc',
            }, 10, { creatures: [
                { name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 },
                { name: 'Orc', type: 'npc', currentHp: 15, maxHp: 15 },
            ] });

            // Should check corona for twin target
            expect(getCoronaSaveDisadvantage).toHaveBeenCalledWith(expect.objectContaining({
                targetName: 'Orc',
            }));
        });

        it('applies twin advantage from saveModifiers', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            const characters = [
                { name: 'TestWizard' },
                { name: 'Goblin', computedStats: { saveBonuses: { con: 2 }, evasionEffects: [] } },
                {
                    name: 'Orc',
                    computedStats: { saveBonuses: { con: 0 }, evasionEffects: [] },
                    saveModifiers: [{ target: 'saving_throw', effect: 'advantage', condition: 'against_spell' }],
                },
            ];
            rollSaveForCreature.mockReturnValue({ roll: 12, total: 14, bonus: 2, success: false, rawRolls: [12] });
            applyDamageToTarget.mockResolvedValueOnce({ finalDamage: 10, newHp: 3, damageReduced: false })
                .mockResolvedValueOnce({ finalDamage: 10, newHp: 2, damageReduced: false });

            const fn = createNpcSaveDamageHandler({ ...deps, characters });
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
                metamagicTwinTarget: 'Orc',
            }, 10, { creatures: [
                { name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 },
                { name: 'Orc', type: 'npc', currentHp: 15, maxHp: 15 },
            ] });

            // Last rollSaveForCreature call should be for Orc with advantage
            const twinSaveCall = rollSaveForCreature.mock.calls[1];
            expect(twinSaveCall[4]).toBe(true); // advantage
        });

        it('applies potent cantrip to twin damage', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            hasPotentCantrip.mockReturnValue(true);
            rollSaveForCreature.mockReturnValue({ roll: 12, total: 14, bonus: 2, success: true, rawRolls: [12] });
            applyDamageToTarget.mockResolvedValueOnce({ finalDamage: 5, newHp: 8, damageReduced: false })
                .mockResolvedValueOnce({ finalDamage: 5, newHp: 10, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
                metamagicTwinTarget: 'Orc',
                isCantrip: true,
                playerStats: { automation: { passives: [{ type: 'potent_cantrip' }] } },
            }, 10, { creatures: [
                { name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 },
                { name: 'Orc', type: 'npc', currentHp: 15, maxHp: 15 },
            ] });

            // Twin damage should be halved for potent cantrip on success
            expect(applyDamageToTarget).toHaveBeenLastCalledWith(
                expect.anything(), 'Orc', 5, expect.any(Array), 'test-campaign',
                expect.any(Array), false, 'TestWizard'
            );
        });

        it('updates popup with twin target data', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            rollSaveForCreature.mockReturnValue({ roll: 12, total: 14, bonus: 2, success: false, rawRolls: [12] });
            applyDamageToTarget.mockResolvedValueOnce({ finalDamage: 10, newHp: 3, damageReduced: false })
                .mockResolvedValueOnce({ finalDamage: 10, newHp: 2, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
                metamagicTwinTarget: 'Orc',
            }, 10, { creatures: [
                { name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 },
                { name: 'Orc', type: 'npc', currentHp: 15, maxHp: 15 },
            ] });

            // First call is the main popup data, second call is the twin target updater function
            expect(deps.setPopupHtml).toHaveBeenCalledTimes(2);
            // The second call receives an updater function that spreads the previous state
            const secondCall = deps.setPopupHtml.mock.calls[1][0];
            // When called with undefined (no previous state), it should still produce the twin data
            const result = secondCall(undefined);
            expect(result).toEqual(expect.objectContaining({
                twinTargetName: 'Orc',
                twinFinalDamage: 10,
                twinTargetCurrentHp: 2,
            }));
        });
    });

    describe('multi target', () => {
        it('applies damage to multi target when multiTarget is set with saveDC/saveType', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            rollSaveForCreature.mockReturnValue({ roll: 12, total: 14, bonus: 2, success: false, rawRolls: [12] });
            applyDamageToTarget.mockResolvedValueOnce({ finalDamage: 10, newHp: 3, damageReduced: false })
                .mockResolvedValueOnce({ finalDamage: 10, newHp: 2, damageReduced: false });

            const fn = createFn();
            await fn('Words of Creation', '2d6', 7, [3, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'force',
                multiTarget: 'Orc',
            }, 7, { creatures: [
                { name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 },
                { name: 'Orc', type: 'npc', currentHp: 15, maxHp: 15 },
            ] });

            expect(applyDamageToTarget).toHaveBeenCalledTimes(2);
            expect(deps.logEntry).toHaveBeenCalledWith(expect.objectContaining({
                name: expect.stringContaining('(Words of Creation)'),
                targetName: 'Orc',
            }));
        });

        it('applies plain damage to multi target when no saveDC/saveType', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            hasIgnoreResistance.mockReturnValue(false);
            applyDamageToTarget.mockResolvedValueOnce({ finalDamage: 7, newHp: 6, damageReduced: false })
                .mockResolvedValueOnce({ finalDamage: 7, newHp: 8, damageReduced: false });

            const fn = createFn();
            await fn('Words of Creation', '2d6', 7, [3, 4], 0, {
                targetName: 'Goblin',
                damageType: 'force',
                multiTarget: 'Orc',
            }, 7, { creatures: [
                { name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 },
                { name: 'Orc', type: 'npc', currentHp: 15, maxHp: 15 },
            ] });

            expect(applyDamageToTarget).toHaveBeenCalledTimes(2);
        });

        it('does not apply multi target damage when same as primary', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            applyDamageToTarget.mockResolvedValueOnce({ finalDamage: 10, newHp: 3, damageReduced: false });

            const fn = createFn();
            await fn('Words of Creation', '2d6', 7, [3, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'force',
                multiTarget: 'Goblin',
            }, 7, { creatures: [{ name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 }] });

            expect(applyDamageToTarget).toHaveBeenCalledTimes(1);
        });

        it('does not apply multi target damage when not found in combatSummary', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            applyDamageToTarget.mockResolvedValueOnce({ finalDamage: 10, newHp: 3, damageReduced: false });

            const fn = createFn();
            await fn('Words of Creation', '2d6', 7, [3, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'force',
                multiTarget: 'NonExistent',
            }, 7, { creatures: [{ name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 }] });

            expect(applyDamageToTarget).toHaveBeenCalledTimes(1);
        });

        it('applies multi target advantage from saveModifiers', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            const characters = [
                { name: 'TestWizard' },
                { name: 'Goblin', computedStats: { saveBonuses: { con: 2 }, evasionEffects: [] } },
                {
                    name: 'Orc',
                    computedStats: { saveBonuses: { con: 0 }, evasionEffects: [] },
                    saveModifiers: [{ target: 'saving_throw', effect: 'advantage', condition: 'against_spell' }],
                },
            ];
            rollSaveForCreature.mockReturnValue({ roll: 12, total: 14, bonus: 2, success: false, rawRolls: [12] });
            applyDamageToTarget.mockResolvedValueOnce({ finalDamage: 10, newHp: 3, damageReduced: false })
                .mockResolvedValueOnce({ finalDamage: 10, newHp: 2, damageReduced: false });

            const fn = createNpcSaveDamageHandler({ ...deps, characters });
            await fn('Words of Creation', '2d6', 7, [3, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'force',
                multiTarget: 'Orc',
            }, 7, { creatures: [
                { name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 },
                { name: 'Orc', type: 'npc', currentHp: 15, maxHp: 15 },
            ] });

            const multiSaveCall = rollSaveForCreature.mock.calls[1];
            expect(multiSaveCall[4]).toBe(true); // advantage
        });

        it('applies potent cantrip to multi target damage', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            hasPotentCantrip.mockReturnValue(true);
            rollSaveForCreature.mockReturnValue({ roll: 12, total: 14, bonus: 2, success: true, rawRolls: [12] });
            applyDamageToTarget.mockResolvedValueOnce({ finalDamage: 3, newHp: 10, damageReduced: false })
                .mockResolvedValueOnce({ finalDamage: 3, newHp: 12, damageReduced: false });

            const fn = createFn();
            await fn('Words of Creation', '2d6', 7, [3, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'force',
                multiTarget: 'Orc',
                isCantrip: true,
                playerStats: { automation: { passives: [{ type: 'potent_cantrip' }] } },
            }, 7, { creatures: [
                { name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 },
                { name: 'Orc', type: 'npc', currentHp: 15, maxHp: 15 },
            ] });

            // Multi target damage should be halved for potent cantrip on success
            expect(applyDamageToTarget).toHaveBeenLastCalledWith(
                expect.anything(), 'Orc', 3, expect.any(Array), 'test-campaign',
                null // characters is null for multi target plain path
            );
        });

        it('updates popup with multi target data', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            rollSaveForCreature.mockReturnValue({ roll: 12, total: 14, bonus: 2, success: false, rawRolls: [12] });
            applyDamageToTarget.mockResolvedValueOnce({ finalDamage: 10, newHp: 3, damageReduced: false })
                .mockResolvedValueOnce({ finalDamage: 10, newHp: 2, damageReduced: false });

            const fn = createFn();
            await fn('Words of Creation', '2d6', 7, [3, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'force',
                multiTarget: 'Orc',
            }, 7, { creatures: [
                { name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 },
                { name: 'Orc', type: 'npc', currentHp: 15, maxHp: 15 },
            ] });

            // First call is the main popup data, second call is the multi target updater function
            expect(deps.setPopupHtml).toHaveBeenCalledTimes(2);
            const secondCall = deps.setPopupHtml.mock.calls[1][0];
            const result = secondCall(undefined);
            expect(result).toEqual(expect.objectContaining({
                twinTargetName: 'Orc',
                twinFinalDamage: 10,
                twinTargetCurrentHp: 2,
            }));
        });

        it('applies multi target ignoreResistance when no save', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            hasIgnoreResistance.mockReturnValue(true);
            applyDamageToTarget.mockResolvedValueOnce({ finalDamage: 7, newHp: 6, damageReduced: false })
                .mockResolvedValueOnce({ finalDamage: 7, newHp: 8, damageReduced: false });

            const fn = createFn();
            await fn('Words of Creation', '2d6', 7, [3, 4], 0, {
                targetName: 'Goblin',
                damageType: 'force',
                multiTarget: 'Orc',
                playerStats: { name: 'TestWizard' },
            }, 7, { creatures: [
                { name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 },
                { name: 'Orc', type: 'npc', currentHp: 15, maxHp: 15 },
            ] });

            // Second call should pass ignoreResistance=true
            expect(applyDamageToTarget).toHaveBeenNthCalledWith(
                2,
                expect.anything(), 'Orc', 7, expect.any(Array), 'test-campaign',
                null, true, 'TestWizard'
            );
        });
    });
});
