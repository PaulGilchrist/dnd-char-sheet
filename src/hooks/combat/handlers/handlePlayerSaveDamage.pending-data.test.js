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
import { getHolyAuraTargets } from '../../../services/automation/handlers/buffs/holyAuraHandler.js';
import { getCoronaSaveDisadvantage } from '../../../services/combat/auras/coronaAuraUtils.js';
import { getElderChampionSaveDisadvantage } from '../../../services/combat/auras/elderChampionAuraUtils.js';
import { isCircleOfPowerActive } from '../../../services/automation/handlers/buffs/circleOfPowerHandler.js';
import { createPlayerSaveDamageHandler } from './handlePlayerSaveDamage.js';
import { computeConditionEffects } from '../../../services/combat/conditions/conditionEffects.js';

describe('handlePlayerSaveDamage - main save prompt path', () => {
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

    it('sends a save prompt when no special paths apply', async () => {
        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 13,
            saveType: 'DEX',
            dcSuccess: 'half',
            damageType: 'Fire',
            targetName: 'TestWizard',
        };

        const result = await handler(
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

        expect(result).toBe(true);
        expect(deps.pendingSaves).toHaveProperty('test-guid-1234');
        expect(deps.setPopupHtml).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'save-damage',
                waitingForPlayerSave: true,
                promptId: 'test-guid-1234',
                rawDamage: 5,
                gwfApplied: false,
                gwfOriginalRolls: null,
            })
        );
        expect(deps.logEntry).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'roll',
                rollType: 'save-prompt',
            })
        );
    });

    it('sets metamagicHeighten disadvantage in pending data', async () => {
        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 13,
            saveType: 'DEX',
            dcSuccess: 'half',
            damageType: 'Fire',
            targetName: 'TestWizard',
            metamagicHeighten: true,
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

        expect(deps.pendingSaves['test-guid-1234']).toHaveProperty('metamagicHeighten', true);
    });

    it('sets isCantrip in pending data', async () => {
        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 13,
            saveType: 'DEX',
            dcSuccess: 'half',
            damageType: 'Fire',
            targetName: 'TestWizard',
            isCantrip: true,
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

        expect(deps.pendingSaves['test-guid-1234']).toHaveProperty('isCantrip', true);
    });

    it('sets overchannel fields in pending data', async () => {
        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 13,
            saveType: 'DEX',
            dcSuccess: 'half',
            damageType: 'Fire',
            targetName: 'TestWizard',
            overchannelActive: true,
            overchannelUseCount: 2,
            overchannelSpellLevel: 3,
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

        expect(deps.pendingSaves['test-guid-1234']).toHaveProperty('overchannelActive', true);
        expect(deps.pendingSaves['test-guid-1234']).toHaveProperty('overchannelUseCount', 2);
        expect(deps.pendingSaves['test-guid-1234']).toHaveProperty('overchannelSpellLevel', 3);
    });

    it('sets autoDamage fields in pending data', async () => {
        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 13,
            saveType: 'DEX',
            dcSuccess: 'half',
            damageType: 'Fire',
            targetName: 'TestWizard',
            autoDamageSecondaryFormula: '2d6',
            autoDamageSecondaryName: 'Radiant',
            autoDamageSecondaryDamageType: 'Radiant',
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

        expect(deps.pendingSaves['test-guid-1234']).toHaveProperty('autoDamageSecondaryFormula', '2d6');
        expect(deps.pendingSaves['test-guid-1234']).toHaveProperty('autoDamageSecondaryName', 'Radiant');
        expect(deps.pendingSaves['test-guid-1234']).toHaveProperty('autoDamageSecondaryDamageType', 'Radiant');
    });

    it('uses attackerName when provided in pending data', async () => {
        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 13,
            saveType: 'DEX',
            dcSuccess: 'half',
            damageType: 'Fire',
            targetName: 'TestWizard',
            attackerName: 'EnemyMage',
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

        expect(deps.pendingSaves['test-guid-1234']).toHaveProperty('attackerName', 'EnemyMage');
    });
});

describe('handlePlayerSaveDamage - gwf (Great Weapon Fighting) tracking', () => {
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

    it('tracks gwfApplied when displayRolls differ from baseRolls', async () => {
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
            [6],
            undefined,
            [3] // gwfDisplayRolls differs from gwfBaseRolls (default undefined)
        );

        expect(deps.setPopupHtml).toHaveBeenCalledWith(
            expect.objectContaining({
                gwfApplied: true,
                gwfOriginalRolls: undefined,
            })
        );
    });

    it('tracks gwfApplied when gwfDisplayRolls equals gwfBaseRolls', async () => {
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
            [6],
            [6, 6], // gwfBaseRolls
            [6, 6]  // gwfDisplayRolls same content but different object reference
        );

        // Arrays are compared by reference, not value, so [6,6] !== [6,6] is true
        expect(deps.setPopupHtml).toHaveBeenCalledWith(
            expect.objectContaining({
                gwfApplied: true,
                gwfOriginalRolls: [6, 6],
            })
        );
    });
});

describe('handlePlayerSaveDamage - status effects and player stats', () => {
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

    it('stores statusEffects and playerStats in pending data', async () => {
        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 15,
            saveType: 'CON',
            dcSuccess: 'half',
            damageType: 'Poison',
            targetName: 'TestWizard',
            statusEffects: ['exhaustion', 'poisoned'],
            playerStats: { level: 10, class: { name: 'Wizard' } },
        };

        await handler(
            'Acid Arrow',
            '4d4',
            10,
            [3, 4, 2, 1],
            0,
            context,
            10,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [3, 4, 2, 1]
        );

        expect(deps.pendingSaves['test-guid-1234']).toHaveProperty('statusEffects', ['exhaustion', 'poisoned']);
        expect(deps.pendingSaves['test-guid-1234']).toHaveProperty('playerStats', {
            level: 10,
            class: { name: 'Wizard' },
        });
    });
});
