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
import { endInvisibilityOnHostileAction } from '../../../services/rules/features/invisibilityService.js';
import { createPlayerSaveDamageHandler } from './handlePlayerSaveDamage.js';
import { applyDamageToTarget } from '../../../services/rules/combat/applyDamage.js';
import { getAllyList } from '../../useAllySelection.js';
import { hasIgnoreResistance } from '../../../services/combat/automation/automationService.js';
import { computeConditionEffects } from '../../../services/combat/conditions/conditionEffects.js';

describe('handlePlayerSaveDamage - endInvisibilityOnHostileAction', () => {
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
        hasIgnoreResistance.mockReturnValue(false);
        endInvisibilityOnHostileAction.mockClear();
        applyDamageToTarget.mockResolvedValue({ newHp: 15, finalDamage: 2 });
        getAllyList.mockReturnValue(['Ally1']);
    });

    it('calls endInvisibilityOnHostileAction when careful spell damage > 0', async () => {
        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 11,
            saveType: 'DEX',
            dcSuccess: 'half',
            damageType: 'Fire',
            targetName: 'Ally1',
            metamagicCareful: true,
        };

        await handler(
            'Fire Bolt',
            '1d10',
            5,
            [6],
            0,
            context,
            5,
            { creatures: [{ name: 'Ally1', type: 'player' }] },
            [6]
        );

        expect(endInvisibilityOnHostileAction).toHaveBeenCalledWith('TestWizard', 'test-campaign');
    });

    it('does not call endInvisibilityOnHostileAction when damage is 0', async () => {
        applyDamageToTarget.mockResolvedValue({ newHp: 20, finalDamage: 0 });

        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 11,
            saveType: 'DEX',
            dcSuccess: 'half',
            damageType: 'Fire',
            targetName: 'Ally1',
            metamagicCareful: true,
        };

        await handler(
            'Fire Bolt',
            '1d10',
            5,
            [6],
            0,
            context,
            5,
            { creatures: [{ name: 'Ally1', type: 'player' }] },
            [6]
        );

        expect(endInvisibilityOnHostileAction).not.toHaveBeenCalled();
    });

    it('calls endInvisibilityOnHostileAction for contact patron when damage > 0', async () => {
        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 13,
            saveType: 'INT',
            dcSuccess: 'half',
            damageType: 'Psychic',
            targetName: 'TestWizard',
            playerStats: {
                automation: {
                    passives: [{ type: 'passive_rule', effect: 'contact_patron_auto_save' }],
                },
            },
        };

        await handler(
            'Contact Other Plane',
            '4d6',
            14,
            [3, 5, 2, 4],
            0,
            context,
            14,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [3, 5, 2, 4]
        );

        expect(endInvisibilityOnHostileAction).toHaveBeenCalledWith('TestWizard', 'test-campaign');
    });
});
