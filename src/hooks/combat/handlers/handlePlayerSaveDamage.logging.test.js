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

vi.mock('../../../services/automation/handlers/buffs/holyAuraHandler.js', () => ({
    getHolyAuraTargets: vi.fn(),
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

vi.mock('../../../services/combat/conditions/conditionEffects.js', () => ({
    computeConditionEffects: vi.fn(),
}));

vi.mock('../../../services/combat/conditions/savePromptService.js', () => ({
    sendSavePrompt: vi.fn(),
}));

vi.mock('../../../services/combat/auras/pendingSaveRegistry.js', () => ({
    registerPendingSavePrompt: vi.fn(),
}));

vi.mock('../../../services/combat/auras/pendingPopupRegistry.js', () => ({
    registerPendingPopupSetter: vi.fn(),
}));

vi.mock('../../useAllySelection.js', () => ({
    getAllyList: vi.fn(),
}));

import { getRuntimeValue } from '../../runtime/useRuntimeState.js';
import { createPlayerSaveDamageHandler } from './handlePlayerSaveDamage.js';
import { sendSavePrompt } from '../../../services/combat/conditions/savePromptService.js';
import { computeConditionEffects } from '../../../services/combat/conditions/conditionEffects.js';
import { getHolyAuraTargets } from '../../../services/automation/handlers/buffs/holyAuraHandler.js';
import { getCoronaSaveDisadvantage } from '../../../services/combat/auras/coronaAuraUtils.js';
import { getElderChampionSaveDisadvantage } from '../../../services/combat/auras/elderChampionAuraUtils.js';
import { isCircleOfPowerActive } from '../../../services/automation/handlers/buffs/circleOfPowerHandler.js';
import { evaluateAutoExpression } from '../../../services/combat/automation/automationService.js';

describe('handlePlayerSaveDamage - logging and popups', () => {
    const deps = {
        characterName: 'TestWizard',
        campaignName: 'test-campaign',
        characters: [{ name: 'TestWizard' }],
        charactersRef: { current: [] },
        setPopupHtml: vi.fn(),
        logEntry: vi.fn(),
        pendingSaves: {},
    };

    beforeEach(() => {
        vi.clearAllMocks();
        getRuntimeValue.mockReset().mockReturnValue(null);
        computeConditionEffects.mockReturnValue({
            restoreBalance: false,
            autoRerollForSaves: false,
            autoRerollBonus: null,
            saveAdvantageCount: 0,
            saveAdvantageAbilities: null,
        });
        getHolyAuraTargets.mockReturnValue([]);
        getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: false });
        getElderChampionSaveDisadvantage.mockResolvedValue({ disadvantage: false });
        isCircleOfPowerActive.mockReturnValue(false);
    });

    it('logs save-prompt with correct fields', async () => {
        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 15,
            saveType: 'CON',
            dcSuccess: 'half',
            damageType: 'Poison',
            targetName: 'TestWizard',
        };

        await handler(
            'Acid Arrow',
            '4d4',
            10,
            [3, 4, 2, 1],
            5,
            context,
            10,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [3, 4, 2, 1]
        );

        expect(deps.logEntry).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'roll',
                characterName: 'TestWizard',
                rollType: 'save-prompt',
                name: 'Acid Arrow',
                formula: '4d4',
                total: 10,
                modifier: 5,
                bonus: 5,
                damageType: 'Poison',
                targetName: 'TestWizard',
                saveType: 'CON',
                saveDc: 15,
                dcSuccess: 'half',
                gwfApplied: false,
                gwfOriginalRolls: null,
            })
        );
    });

    it('logs save-prompt with forcedMode when metamagicHeighten is true', async () => {
        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 15,
            saveType: 'CON',
            dcSuccess: 'half',
            damageType: 'Poison',
            targetName: 'TestWizard',
            metamagicHeighten: true,
        };

        await handler(
            'Acid Arrow',
            '4d4',
            10,
            [3, 4, 2, 1],
            5,
            context,
            10,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [3, 4, 2, 1]
        );

        expect(deps.logEntry).toHaveBeenCalledWith(
            expect.objectContaining({
                forcedMode: 'disadvantage',
            })
        );
    });

    it('sets popup with correct fields for save prompt', async () => {
        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 15,
            saveType: 'CON',
            dcSuccess: 'half',
            damageType: 'Poison',
            targetName: 'TestWizard',
        };

        await handler(
            'Acid Arrow',
            '4d4',
            10,
            [3, 4, 2, 1],
            5,
            context,
            10,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [3, 4, 2, 1]
        );

        expect(deps.setPopupHtml).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'save-damage',
                name: 'Acid Arrow',
                formula: '4d4',
                rolls: [3, 4, 2, 1],
                total: 10,
                bonus: 0,
                modifier: 5,
                damageType: 'Poison',
                targetName: 'TestWizard',
                saveDc: 15,
                saveType: 'CON',
                dcSuccess: 'half',
                waitingForPlayerSave: true,
                promptId: 'test-guid-1234',
                rawDamage: 10,
                attackerName: 'TestWizard',
                gwfApplied: false,
                gwfOriginalRolls: null,
                autoReroll: false,
                autoRerollBonus: null,
                autoRerollCondition: undefined,
            })
        );
    });

    it('disables autoRerollForSaves when fanaticalFocusUsed is true', async () => {
        getRuntimeValue.mockImplementation((key, subKey) => {
            if (key === 'TestWizard' && subKey === 'fanaticalFocusUsed') return true;
            if (key === 'campaign' && subKey === 'targetEffects') return [];
            if (key === 'TestWizard' && subKey === 'activeBuffs') return [];
            if (key === 'TestWizard' && subKey === 'indomitableUses') return 0;
            return null;
        });
        computeConditionEffects.mockReturnValue({
            restoreBalance: false,
            autoRerollForSaves: true,
            autoRerollBonus: null,
            saveAdvantageCount: 0,
            saveAdvantageAbilities: null,
        });

        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 15,
            saveType: 'CON',
            dcSuccess: 'half',
            damageType: 'Poison',
            targetName: 'TestWizard',
        };

        await handler(
            'Acid Arrow',
            '4d4',
            10,
            [3, 4, 2, 1],
            5,
            context,
            10,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [3, 4, 2, 1]
        );

        expect(deps.setPopupHtml).toHaveBeenCalledWith(
            expect.objectContaining({
                autoReroll: false,
            })
        );
    });

    it('disables autoRerollForSaves when indomitableUses >= indomitableMax', async () => {
        getRuntimeValue.mockImplementation((key, subKey) => {
            if (key === 'TestWizard' && subKey === 'fanaticalFocusUsed') return false;
            if (key === 'campaign' && subKey === 'targetEffects') return [];
            if (key === 'TestWizard' && subKey === 'activeBuffs') return [];
            if (key === 'TestWizard' && subKey === 'indomitableUses') return 3;
            return null;
        });
        computeConditionEffects.mockReturnValue({
            restoreBalance: false,
            autoRerollForSaves: true,
            autoRerollBonus: null,
            saveAdvantageCount: 0,
            saveAdvantageAbilities: null,
        });
        deps.characters = [{ name: 'TestWizard', computedStats: { level: 20 } }];
        deps.charactersRef = { current: [{ name: 'TestWizard', computedStats: { level: 20 } }] };

        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 15,
            saveType: 'CON',
            dcSuccess: 'half',
            damageType: 'Poison',
            targetName: 'TestWizard',
        };

        await handler(
            'Acid Arrow',
            '4d4',
            10,
            [3, 4, 2, 1],
            5,
            context,
            10,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [3, 4, 2, 1]
        );

        expect(deps.setPopupHtml).toHaveBeenCalledWith(
            expect.objectContaining({
                autoReroll: false,
            })
        );
    });

    it('evaluates autoRerollBonus when targetChar has computedStats', async () => {
        getRuntimeValue.mockImplementation((key, subKey) => {
            if (key === 'TestWizard' && subKey === 'fanaticalFocusUsed') return false;
            if (key === 'campaign' && subKey === 'targetEffects') return [];
            if (key === 'TestWizard' && subKey === 'activeBuffs') return [];
            if (key === 'TestWizard' && subKey === 'indomitableUses') return 0;
            return null;
        });
        computeConditionEffects.mockReturnValue({
            restoreBalance: false,
            autoRerollForSaves: false,
            autoRerollBonus: '1d4',
            saveAdvantageCount: 0,
            saveAdvantageAbilities: null,
        });
        evaluateAutoExpression.mockReturnValue(3);
        deps.characters = [{ name: 'TestWizard', computedStats: { level: 10 } }];
        deps.charactersRef = { current: [{ name: 'TestWizard', computedStats: { level: 10 } }] };

        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 15,
            saveType: 'CON',
            dcSuccess: 'half',
            damageType: 'Poison',
            targetName: 'TestWizard',
        };

        await handler(
            'Acid Arrow',
            '4d4',
            10,
            [3, 4, 2, 1],
            5,
            context,
            10,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [3, 4, 2, 1]
        );

        expect(evaluateAutoExpression).toHaveBeenCalledWith('1d4', { level: 10 });
        expect(deps.setPopupHtml).toHaveBeenCalledWith(
            expect.objectContaining({
                autoRerollBonus: 3,
            })
        );
    });

    it('handles restoreBalance with saveDisadvantage - single source cancels to false', async () => {
        getRuntimeValue.mockImplementation((key, subKey) => {
            if (key === 'TestWizard' && subKey === 'fanaticalFocusUsed') return false;
            if (key === 'campaign' && subKey === 'targetEffects') return [];
            if (key === 'TestWizard' && subKey === 'activeBuffs') return [];
            if (key === 'TestWizard' && subKey === 'indomitableUses') return 0;
            return null;
        });
        computeConditionEffects.mockReturnValue({
            restoreBalance: true,
            autoRerollForSaves: false,
            autoRerollBonus: null,
            saveAdvantageCount: 0,
            saveAdvantageAbilities: null,
        });
        getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: true });
        getElderChampionSaveDisadvantage.mockResolvedValue({ disadvantage: false });

        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 15,
            saveType: 'CON',
            dcSuccess: 'half',
            damageType: 'Poison',
            targetName: 'TestWizard',
        };

        await handler(
            'Acid Arrow',
            '4d4',
            10,
            [3, 4, 2, 1],
            5,
            context,
            10,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [3, 4, 2, 1]
        );

        expect(sendSavePrompt).toHaveBeenCalledWith('test-campaign',
            expect.objectContaining({
                disadvantage: false,
            })
        );
    });

    it('handles restoreBalance with saveDisadvantage - multiple sources', async () => {
        getRuntimeValue.mockImplementation((key, subKey) => {
            if (key === 'TestWizard' && subKey === 'fanaticalFocusUsed') return false;
            if (key === 'campaign' && subKey === 'targetEffects') return [];
            if (key === 'TestWizard' && subKey === 'activeBuffs') return [];
            if (key === 'TestWizard' && subKey === 'indomitableUses') return 0;
            return null;
        });
        computeConditionEffects.mockReturnValue({
            restoreBalance: true,
            autoRerollForSaves: false,
            autoRerollBonus: null,
            saveAdvantageCount: 0,
            saveAdvantageAbilities: null,
        });
        getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: true });
        getElderChampionSaveDisadvantage.mockResolvedValue({ disadvantage: true });

        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 15,
            saveType: 'CON',
            dcSuccess: 'half',
            damageType: 'Poison',
            targetName: 'TestWizard',
        };

        await handler(
            'Acid Arrow',
            '4d4',
            10,
            [3, 4, 2, 1],
            5,
            context,
            10,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [3, 4, 2, 1]
        );

        expect(sendSavePrompt).toHaveBeenCalledWith('test-campaign',
            expect.objectContaining({
                disadvantage: true,
            })
        );
    });
});
