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
import { evaluateAutoExpression } from '../../../services/combat/automation/automationService.js';
import { getCoronaSaveDisadvantage } from '../../../services/combat/auras/coronaAuraUtils.js';
import { getElderChampionSaveDisadvantage } from '../../../services/combat/auras/elderChampionAuraUtils.js';
import { isCircleOfPowerActive } from '../../../services/automation/handlers/buffs/circleOfPowerHandler.js';
import { getHolyAuraTargets } from '../../../services/automation/handlers/buffs/holyAuraHandler.js';
import { createPlayerSaveDamageHandler } from './handlePlayerSaveDamage.js';
import { computeConditionEffects } from '../../../services/combat/conditions/conditionEffects.js';

describe('handlePlayerSaveDamage - indomitable and fanatical focus', () => {
    const deps = {
        characterName: 'TestWizard',
        campaignName: 'test-campaign',
        characters: [
            {
                name: 'TestWizard',
                computedStats: { level: 17, saveModifiers: [] },
            },
        ],
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
            autoRerollForSaves: true,
            autoRerollBonus: null,
            saveAdvantageCount: 0,
            saveAdvantageAbilities: null,
        });
        getHolyAuraTargets.mockReturnValue([]);
        getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: false });
        getElderChampionSaveDisadvantage.mockResolvedValue({ disadvantage: false });
        isCircleOfPowerActive.mockReturnValue(false);
    });

    it('disables autoRerollForSaves when fanaticalFocusUsed is true', async () => {
        getRuntimeValue.mockImplementation((key, subKey) => {
            if (key === 'TestWizard' && subKey === 'fanaticalFocusUsed') return true;
            if (key === 'campaign' && subKey === 'targetEffects') return [];
            return null;
        });

        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 13,
            saveType: 'DEX',
            dcSuccess: 'half',
            damageType: 'Fire',
            targetName: 'TestWizard',
        };

        await handler(
            'Fire Bolt',
            '1d10',
            5,
            [6],
            0,
            context,
            5,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [6]
        );

        expect(deps.setPopupHtml).toHaveBeenCalledWith(
            expect.objectContaining({ autoReroll: false })
        );
    });

    it('disables autoRerollForSaves when indomitableUses >= indomitableMax', async () => {
        getRuntimeValue.mockImplementation((key, subKey) => {
            if (key === 'TestWizard' && subKey === 'fanaticalFocusUsed') return false;
            if (key === 'TestWizard' && subKey === 'indomitableUses') return '3';
            if (key === 'campaign' && subKey === 'targetEffects') return [];
            return null;
        });

        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 13,
            saveType: 'DEX',
            dcSuccess: 'half',
            damageType: 'Fire',
            targetName: 'TestWizard',
        };

        await handler(
            'Fire Bolt',
            '1d10',
            5,
            [6],
            0,
            context,
            5,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [6]
        );

        // Level 17 -> indomitableMax = 3, uses = 3 >= 3, so disabled
        expect(deps.setPopupHtml).toHaveBeenCalledWith(
            expect.objectContaining({ autoReroll: false })
        );
    });

    it('sets indomitableMax based on character level', async () => {
        getRuntimeValue.mockImplementation((key, subKey) => {
            if (key === 'TestWizard' && subKey === 'fanaticalFocusUsed') return false;
            if (key === 'TestWizard' && subKey === 'indomitableUses') return '0';
            if (key === 'campaign' && subKey === 'targetEffects') return [];
            return null;
        });

        // Level 13 -> indomitableMax = 2
        deps.characters[0].computedStats.level = 13;

        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 13,
            saveType: 'DEX',
            dcSuccess: 'half',
            damageType: 'Fire',
            targetName: 'TestWizard',
        };

        await handler(
            'Fire Bolt',
            '1d10',
            5,
            [6],
            0,
            context,
            5,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [6]
        );

        expect(deps.setPopupHtml).toHaveBeenCalledWith(
            expect.objectContaining({ autoReroll: true })
        );
    });

    it('handles level < 13 for indomitable', async () => {
        getRuntimeValue.mockImplementation((key, subKey) => {
            if (key === 'TestWizard' && subKey === 'fanaticalFocusUsed') return false;
            if (key === 'TestWizard' && subKey === 'indomitableUses') return '0';
            if (key === 'campaign' && subKey === 'targetEffects') return [];
            return null;
        });

        // Level 10 -> indomitableMax = 1
        deps.characters[0].computedStats.level = 10;

        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 13,
            saveType: 'DEX',
            dcSuccess: 'half',
            damageType: 'Fire',
            targetName: 'TestWizard',
        };

        await handler(
            'Fire Bolt',
            '1d10',
            5,
            [6],
            0,
            context,
            5,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [6]
        );

        expect(deps.setPopupHtml).toHaveBeenCalledWith(
            expect.objectContaining({ autoReroll: true })
        );
    });
});

describe('handlePlayerSaveDamage - autoRerollBonus evaluation', () => {
    const deps = {
        characterName: 'TestWizard',
        campaignName: 'test-campaign',
        characters: [
            {
                name: 'TestWizard',
                computedStats: { level: 10, saveModifiers: [] },
            },
        ],
        charactersRef: { current: [] },
        setPopupHtml: vi.fn(),
        logEntry: vi.fn(),
        pendingSaves: {},
    };

    beforeEach(() => {
        vi.clearAllMocks();
        getRuntimeValue.mockReset().mockReturnValue(null);
        evaluateAutoExpression.mockReturnValue(5);
        computeConditionEffects.mockReturnValue({
            restoreBalance: false,
            autoRerollForSaves: true,
            autoRerollBonus: '1d4 + 2',
            saveAdvantageCount: 0,
            saveAdvantageAbilities: null,
        });
    });

    it('evaluates autoRerollBonus when present and targetChar has computedStats', async () => {
        deps.charactersRef.current = [{ name: 'TestWizard', computedStats: { level: 10, saveModifiers: [] } }];
        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 13,
            saveType: 'DEX',
            dcSuccess: 'half',
            damageType: 'Fire',
            targetName: 'TestWizard',
        };

        await handler(
            'Fire Bolt',
            '1d10',
            5,
            [6],
            0,
            context,
            5,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [6]
        );

        expect(evaluateAutoExpression).toHaveBeenCalledWith('1d4 + 2', deps.characters[0].computedStats);
        expect(deps.setPopupHtml).toHaveBeenCalledWith(
            expect.objectContaining({
                autoRerollBonus: 5,
            })
        );
    });

    it('does not evaluate autoRerollBonus when targetChar has no computedStats', async () => {
        deps.charactersRef.current = [{ name: 'TestWizard', computedStats: undefined }];
        deps.characters[0].computedStats = undefined;

        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 13,
            saveType: 'DEX',
            dcSuccess: 'half',
            damageType: 'Fire',
            targetName: 'TestWizard',
        };

        await handler(
            'Fire Bolt',
            '1d10',
            5,
            [6],
            0,
            context,
            5,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [6]
        );

        expect(evaluateAutoExpression).not.toHaveBeenCalled();
    });
});
