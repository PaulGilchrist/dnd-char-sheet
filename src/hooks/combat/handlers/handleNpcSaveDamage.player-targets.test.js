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

describe('handleNpcSaveDamage - player targets, secondary features', () => {
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

    describe('player target HP/death saves', () => {
        it('sets death saves when player target drops to 0 HP', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                if (key === 'Goblin' && prop === 'hitPoints') return 10;
                return null;
            });
            applyDamageToTarget.mockResolvedValue({ finalDamage: 10, newHp: 0, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
            }, 10, { creatures: [{ name: 'Goblin', type: 'player', currentHp: 10, maxHp: 10 }] });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Goblin', 'deathSaves', [false, false, false], 'test-campaign'
            );
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Goblin', 'deathFailures', [false, false, false], 'test-campaign'
            );
        });

        it('updates currentHitPoints for player target', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                if (key === 'Goblin' && prop === 'hitPoints') return 10;
                return null;
            });
            applyDamageToTarget.mockResolvedValue({ finalDamage: 5, newHp: 5, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
            }, 10, { creatures: [{ name: 'Goblin', type: 'player', currentHp: 10, maxHp: 10 }] });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Goblin', 'currentHitPoints', 5, 'test-campaign'
            );
        });
    });

    describe('secondary ignoreResistance', () => {
        it('passes ignoreResistance to secondary damage', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            hasIgnoreResistance.mockReturnValue(true);
            rollExpression.mockReturnValueOnce({ total: 4, rolls: [3, 2], modifier: 0 });
            applyDamageToTarget.mockResolvedValueOnce({ finalDamage: 4, newHp: 9, damageReduced: false })
                .mockResolvedValueOnce({ finalDamage: 10, newHp: 3, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
                autoDamageSecondaryFormula: '1d6',
                autoDamageSecondaryDamageType: 'fire',
                playerStats: { name: 'TestWizard' },
            }, 10, { creatures: [{ name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 }] });

            // First call is secondary damage (line 197) - should pass ignoreResistance=true
            const secondaryCall = applyDamageToTarget.mock.calls[0];
            expect(secondaryCall[6]).toBe(true); // ignoreResistance
            expect(hasIgnoreResistance).toHaveBeenCalledWith(
                expect.any(Object), 'fire'
            );
        });
    });

    describe('secondary potent cantrip', () => {
        it('halves secondary damage on success when potent cantrip', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            hasPotentCantrip.mockReturnValue(true);
            const primarySave = { roll: 12, total: 14, bonus: 2, success: false, rawRolls: [12] };
            const secondarySave = { roll: 15, total: 17, bonus: 2, success: true, rawRolls: [15] };
            rollSaveForCreature.mockReturnValueOnce(primarySave)
                .mockReturnValueOnce(secondarySave);
            rollExpression.mockReturnValueOnce({ total: 8, rolls: [5, 3], modifier: 0 });
            applyDamageToTarget.mockResolvedValueOnce({ finalDamage: 4, newHp: 9, damageReduced: false })
                .mockResolvedValueOnce({ finalDamage: 10, newHp: 3, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 14,
                saveType: 'con',
                dcSuccess: 'none',
                damageType: 'fire',
                autoDamageSecondaryFormula: '1d6',
                autoDamageSecondaryDamageType: 'fire',
                isCantrip: true,
                playerStats: { automation: { passives: [{ type: 'potent_cantrip' }] } },
            }, 10, { creatures: [{ name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 }] });

            // First call is secondary damage (line 197) - should have halved damage (8/2 = 4)
            const secondaryCall = applyDamageToTarget.mock.calls[0];
            expect(secondaryCall[2]).toBe(4); // secondaryRawDamage after potent cantrip halving
            expect(secondaryCall[9]).toEqual(expect.objectContaining({ skipConcentration: true }));
        });
    });

    describe('ignoreResistance', () => {
        it('passes ignoreResistance=true when player has ignoreResistance feat', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            hasIgnoreResistance.mockReturnValue(true);
            applyDamageToTarget.mockResolvedValue({ finalDamage: 10, newHp: 3, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
                playerStats: { name: 'TestWizard' },
            }, 10, { creatures: [{ name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 }] });

            expect(applyDamageToTarget).toHaveBeenCalledWith(
                expect.anything(), 'Goblin', 10, expect.any(Array), 'test-campaign',
                expect.any(Array), true, 'TestWizard', true
            );
        });
    });

    describe('concentrationTotalDamage option', () => {
        it('passes concentrationTotalDamage when secondary damage exists', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            rollExpression.mockReturnValueOnce({ total: 10, rolls: [6, 4], modifier: 0 })
                .mockReturnValueOnce({ total: 5, rolls: [3, 2], modifier: 0 });
            applyDamageToTarget.mockResolvedValueOnce({ finalDamage: 5, newHp: 8, damageReduced: false })
                .mockResolvedValueOnce({ finalDamage: 10, newHp: 3, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 10, [6, 4], 0, {
                targetName: 'Goblin',
                saveDc: 12,
                saveType: 'dex',
                dcSuccess: 'none',
                damageType: 'fire',
                autoDamageSecondaryFormula: '1d6',
                autoDamageSecondaryDamageType: 'fire',
            }, 10, { creatures: [{ name: 'Goblin', type: 'npc', currentHp: 13, maxHp: 13 }] });

            // Second call should include concentrationTotalDamage
            expect(applyDamageToTarget).toHaveBeenNthCalledWith(
                2,
                expect.anything(), 'Goblin', 10, expect.any(Array), 'test-campaign',
                expect.any(Array), false, 'TestWizard', true,
                expect.objectContaining({ concentrationTotalDamage: 15 })
            );
        });
    });
});
