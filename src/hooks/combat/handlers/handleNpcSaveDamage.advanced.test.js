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

import { rollExpression } from '../../../services/dice/diceRoller.js';
import { getRuntimeValue, setRuntimeValue } from '../../runtime/useRuntimeState.js';
import { hasIgnoreResistance, playerIsImmuneToCondition } from '../../../services/combat/automation/automationService.js';
import { endInvisibilityOnHostileAction } from '../../../services/rules/features/invisibilityService.js';
import { hasPotentCantrip, hasSoulstitchProtection, applyMinDamageAdjustment } from '../loggedDiceRollUtils.js';
import { getCoronaSaveDisadvantage } from '../../../services/combat/auras/coronaAuraUtils.js';
import { getElderChampionSaveDisadvantage } from '../../../services/combat/auras/elderChampionAuraUtils.js';
import { isCircleOfPowerActive } from '../../../services/automation/handlers/buffs/circleOfPowerHandler.js';
import { handleOverchannelSelfDamage } from './handleOverchannelSelfDamage.js';
import { applyDamageToTarget, rollSaveForCreature } from '../../../services/rules/combat/applyDamage.js';
import { addEntry } from '../../../services/ui/logService.js';
import { createNpcSaveDamageHandler } from './handleNpcSaveDamage.js';

describe('handleNpcSaveDamage - advanced scenarios', () => {
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
        getRuntimeValue.mockReset().mockReturnValue(null);
        setRuntimeValue.mockClear();
        hasIgnoreResistance.mockReturnValue(false);
        hasPotentCantrip.mockReturnValue(false);
        hasSoulstitchProtection.mockReturnValue(false);
        applyMinDamageAdjustment.mockImplementation((d) => d);
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

    describe('popup data', () => {
        it('sets popup data with save result details', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            applyDamageToTarget.mockResolvedValue({ finalDamage: 10, newHp: 3, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
            }, 10, { creatures: [{ name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 }] });

            expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
                type: 'save-damage',
                name: 'Fire Bolt',
                formula: '1d10',
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                saveResult: expect.objectContaining({
                    roll: 12,
                    total: 14,
                    bonus: 2,
                    success: false,
                }),
                finalDamage: 10,
                forcedMode: 'normal',
            }));
        });

        it('sets forcedMode to disadvantage when disadvantage is applied', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: true });
            rollSaveForCreature.mockReturnValue({ roll: 12, total: 14, bonus: 2, success: false, rawRolls: [12] });
            applyDamageToTarget.mockResolvedValue({ finalDamage: 10, newHp: 3, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
            }, 10, { creatures: [{ name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 }] });

            expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
                forcedMode: 'disadvantage',
            }));
        });

        it('sets forcedMode to advantage when advantage is from saveModifiers', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            const characters = [
                { name: 'TestWizard' },
                {
                    name: 'Goblin',
                    computedStats: { saveBonuses: { con: 2 }, evasionEffects: [] },
                    saveModifiers: [{ target: 'saving_throw', effect: 'advantage', condition: 'against_spell' }],
                },
            ];
            rollSaveForCreature.mockReturnValue({ roll: 12, total: 14, bonus: 2, success: false, rawRolls: [12] });
            applyDamageToTarget.mockResolvedValue({ finalDamage: 10, newHp: 3, damageReduced: false });

            const fn = createNpcSaveDamageHandler({ ...deps, characters });
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
            }, 10, { creatures: [{ name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 }] });

            expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
                forcedMode: 'advantage',
            }));
        });
    });

    describe('log entry', () => {
        it('includes save damage log entry with all required fields', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            applyDamageToTarget.mockResolvedValue({ finalDamage: 10, newHp: 3, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
            }, 10, { creatures: [{ name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 }] });

            expect(deps.logEntry).toHaveBeenCalledWith(expect.objectContaining({
                type: 'roll',
                characterName: 'TestWizard',
                rollType: 'save-damage',
                name: 'Fire Bolt',
                formula: '1d10',
                total: 10,
                damageType: 'fire',
                targetName: 'Goblin',
                saveType: 'dex',
                saveDc: 12,
                saveResult: 'failure',
                finalDamage: 10,
                note: 'combined_save_damage_roll',
                isCrit: false,
            }));
        });

        it('includes isCrit in log when isAutoCrit is true', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            applyDamageToTarget.mockResolvedValue({ finalDamage: 10, newHp: 3, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
                isAutoCrit: true,
            }, 10, { creatures: [{ name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 }] });

            const logCall = deps.logEntry.mock.calls[0][0];
            expect(logCall.isCrit).toBe(true);
        });
    });

    describe('threshold tracking', () => {
        it('tracks bloodied threshold', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            applyDamageToTarget.mockResolvedValue({ finalDamage: 8, newHp: 5, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
            }, 10, { creatures: [{ name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 }] });

            expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                type: 'hp_change',
                targetName: 'Goblin',
                delta: -8,
                currentHp: 5,
                isUnconscious: false,
            }));
        });
    });

    describe('status effects on failed save', () => {
        it('applies status effects when save fails and target is not immune', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            playerIsImmuneToCondition.mockReturnValue(false);
            applyDamageToTarget.mockResolvedValue({ finalDamage: 10, newHp: 3, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
                statusEffects: ['poisoned'],
            }, 10, { creatures: [{ name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 }] });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Goblin',
                'activeConditions',
                expect.arrayContaining(['poisoned']),
                'test-campaign'
            );
        });

        it('skips status effect when target is immune', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            playerIsImmuneToCondition.mockReturnValue(true);
            applyDamageToTarget.mockResolvedValue({ finalDamage: 10, newHp: 3, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
                statusEffects: ['poisoned'],
            }, 10, { creatures: [{ name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 }] });

            expect(setRuntimeValue).not.toHaveBeenCalledWith(
                'Goblin',
                'activeConditions',
                expect.arrayContaining(['poisoned']),
                'test-campaign'
            );
        });

        it('does not apply status effects when save succeeds', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            rollSaveForCreature.mockReturnValue({ roll: 18, total: 20, bonus: 2, success: true, rawRolls: [18] });
            applyDamageToTarget.mockResolvedValue({ finalDamage: 0, newHp: 13, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
                statusEffects: ['poisoned'],
            }, 10, { creatures: [{ name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 }] });

            expect(setRuntimeValue).not.toHaveBeenCalledWith(
                'Goblin',
                'activeConditions',
                expect.arrayContaining(['poisoned']),
                'test-campaign'
            );
        });
    });

    describe('lastAttack data', () => {
        it('sets lastAttack in campaign state', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            applyDamageToTarget.mockResolvedValue({ finalDamage: 10, newHp: 3, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
                attackerName: 'TestWizard',
            }, 10, { creatures: [{ name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 }] });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'lastAttack',
                expect.objectContaining({
                    attackerName: 'TestWizard',
                    targetName: 'Goblin',
                    rollType: 'attack',
                }),
                'test-campaign'
            );
        });
    });

    describe('endInvisibilityOnHostileAction', () => {
        it('calls endInvisibilityOnHostileAction when damage applied', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            applyDamageToTarget.mockResolvedValue({ finalDamage: 10, newHp: 3, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
            }, 10, { creatures: [{ name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 }] });

            expect(endInvisibilityOnHostileAction).toHaveBeenCalledWith('TestWizard', 'test-campaign');
        });

        it('does not call endInvisibilityOnHostileAction when no damage applied', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            rollSaveForCreature.mockReturnValue({ roll: 18, total: 20, bonus: 2, success: true, rawRolls: [18] });
            applyDamageToTarget.mockResolvedValue({ finalDamage: 0, newHp: 13, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
            }, 10, { creatures: [{ name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 }] });

            expect(endInvisibilityOnHostileAction).not.toHaveBeenCalled();
        });
    });

    describe('handleOverchannelSelfDamage', () => {
        it('calls handleOverchannelSelfDamage at end of handler', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            applyDamageToTarget.mockResolvedValue({ finalDamage: 10, newHp: 3, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
            }, 10, { creatures: [{ name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 }] });

            expect(handleOverchannelSelfDamage).toHaveBeenCalled();
        });
    });
});
