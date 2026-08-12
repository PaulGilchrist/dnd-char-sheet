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
import { getCoronaSaveDisadvantage } from '../../../services/combat/auras/coronaAuraUtils.js';
import { getElderChampionSaveDisadvantage } from '../../../services/combat/auras/elderChampionAuraUtils.js';
import { isCircleOfPowerActive } from '../../../services/automation/handlers/buffs/circleOfPowerHandler.js';
import { getHolyAuraTargets } from '../../../services/automation/handlers/buffs/holyAuraHandler.js';
import { createPlayerSaveDamageHandler } from './handlePlayerSaveDamage.js';
import { applyDamageToTarget } from '../../../services/rules/combat/applyDamage.js';
import { computeConditionEffects } from '../../../services/combat/conditions/conditionEffects.js';
import { sendSavePrompt } from '../../../services/combat/conditions/savePromptService.js';
import { handleOverchannelSelfDamage } from './handleOverchannelSelfDamage.js';
import { getAllyList } from '../../useAllySelection.js';
import { hasIgnoreResistance } from '../../../services/combat/automation/automationService.js';

describe('handlePlayerSaveDamage - save prompt data structure', () => {
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

    it('sends correct save prompt data via sendSavePrompt', async () => {
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
            0,
            context,
            10,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [3, 4, 2, 1]
        );

        expect(sendSavePrompt).toHaveBeenCalledWith('test-campaign', {
            promptId: 'test-guid-1234',
            targetName: 'TestWizard',
            saveType: 'CON',
            saveDc: 15,
            dcSuccess: 'half',
            damageFormula: '4d4',
            damageType: 'Poison',
            sourceName: 'Acid Arrow',
            sourceAttackerName: 'TestWizard',
            rawDamage: 10,
            disadvantage: false,
            advantage: false,
        });
    });

    it('uses attackerName in save prompt when provided', async () => {
        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 15,
            saveType: 'CON',
            dcSuccess: 'half',
            damageType: 'Poison',
            targetName: 'TestWizard',
            attackerName: 'Goblin',
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

        expect(sendSavePrompt).toHaveBeenCalledWith('test-campaign',
            expect.objectContaining({
                sourceAttackerName: 'Goblin',
            })
        );
    });

    it('calls handleOverchannelSelfDamage at the end', async () => {
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
            0,
            context,
            10,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [3, 4, 2, 1]
        );

        expect(handleOverchannelSelfDamage).toHaveBeenCalledWith(
            'TestWizard',
            'test-campaign',
            context,
            deps.logEntry,
            deps.characters
        );
    });
});

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

describe('handlePlayerSaveDamage - targetEffects and buffs', () => {
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

    it('checks shapeShiftActive from targetBuffs', async () => {
        getRuntimeValue.mockImplementation((key, subKey) => {
            if (key === 'campaign' && subKey === 'targetEffects') return [];
            if (key === 'TestWizard' && subKey === 'activeBuffs') return [{ effect: 'shape_shift' }];
            return null;
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
            0,
            context,
            10,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [3, 4, 2, 1]
        );

        expect(computeConditionEffects).toHaveBeenCalled();
        const callArgs = computeConditionEffects.mock.calls[0];
        expect(callArgs[4]).toBe(true); // shapeShiftActive
    });

    it('checks seeInvisibilityActive from targetBuffs', async () => {
        getRuntimeValue.mockImplementation((key, subKey) => {
            if (key === 'campaign' && subKey === 'targetEffects') return [];
            if (key === 'TestWizard' && subKey === 'activeBuffs') return [{ effect: 'see_invisibility' }];
            return null;
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
            0,
            context,
            10,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [3, 4, 2, 1]
        );

        expect(computeConditionEffects).toHaveBeenCalled();
        const callArgs = computeConditionEffects.mock.calls[0];
        expect(callArgs[8]).toBe(true); // seeInvisibilityActive
    });

    it('checks isLivingLegendActive', async () => {
        getRuntimeValue.mockImplementation((key, subKey) => {
            if (key === 'campaign' && subKey === 'targetEffects') return [];
            if (key === 'TestWizard' && subKey === 'livingLegendActive') return true;
            if (key === 'TestWizard' && subKey === 'activeBuffs') return [];
            return null;
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
            0,
            context,
            10,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [3, 4, 2, 1]
        );

        expect(computeConditionEffects).toHaveBeenCalled();
        const callArgs = computeConditionEffects.mock.calls[0];
        expect(callArgs[10]).toBe(true); // isLivingLegendActive
    });

    it('checks isElderChampionActive', async () => {
        getRuntimeValue.mockImplementation((key, subKey) => {
            if (key === 'campaign' && subKey === 'targetEffects') return [];
            if (key === 'TestWizard' && subKey === 'elderChampionActive') return true;
            if (key === 'TestWizard' && subKey === 'activeBuffs') return [];
            return null;
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
            0,
            context,
            10,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [3, 4, 2, 1]
        );

        expect(computeConditionEffects).toHaveBeenCalled();
        const callArgs = computeConditionEffects.mock.calls[0];
        expect(callArgs[11]).toBe(true); // isElderChampionActive
    });

    it('checks isElderChampionAttackerActive for different attacker', async () => {
        getRuntimeValue.mockImplementation((key, subKey) => {
            if (key === 'campaign' && subKey === 'targetEffects') return [];
            if (key === 'Goblin' && subKey === 'elderChampionActive') return true;
            if (key === 'TestWizard' && subKey === 'elderChampionActive') return false;
            if (key === 'TestWizard' && subKey === 'activeBuffs') return [];
            return null;
        });

        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 15,
            saveType: 'CON',
            dcSuccess: 'half',
            damageType: 'Poison',
            targetName: 'TestWizard',
            attackerName: 'Goblin',
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

        expect(computeConditionEffects).toHaveBeenCalled();
        const callArgs = computeConditionEffects.mock.calls[0];
        expect(callArgs[12]).toBe(true); // isElderChampionAttackerActive
    });

    it('checks isProtectionFromPoisonActive from targetBuffs', async () => {
        getRuntimeValue.mockImplementation((key, subKey) => {
            if (key === 'campaign' && subKey === 'targetEffects') return [];
            if (key === 'TestWizard' && subKey === 'activeBuffs') return [{ name: 'Protection from Poison', effect: 'protection_from_poison' }];
            return null;
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
            0,
            context,
            10,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [3, 4, 2, 1]
        );

        expect(computeConditionEffects).toHaveBeenCalled();
        const callArgs = computeConditionEffects.mock.calls[0];
        expect(callArgs[14]).toBe(true); // isProtectionFromPoisonActive
    });

    it('detects isRaging from damageBonusExpression in buffs', async () => {
        getRuntimeValue.mockImplementation((key, subKey) => {
            if (key === 'campaign' && subKey === 'targetEffects') return [];
            if (key === 'TestWizard' && subKey === 'activeBuffs') return [{ damageBonusExpression: '2d6' }];
            return null;
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
            0,
            context,
            10,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [3, 4, 2, 1]
        );

        expect(computeConditionEffects).toHaveBeenCalled();
        const callArgs = computeConditionEffects.mock.calls[0];
        expect(callArgs[3]).toBe(true); // isRaging
    });

    it('handles empty targetEffects array', async () => {
        getRuntimeValue.mockImplementation((key, subKey) => {
            if (key === 'campaign' && subKey === 'targetEffects') return [];
            if (key === 'TestWizard' && subKey === 'activeBuffs') return [];
            return null;
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
            0,
            context,
            10,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [3, 4, 2, 1]
        );

        expect(computeConditionEffects).toHaveBeenCalled();
        const callArgs = computeConditionEffects.mock.calls[0];
        expect(callArgs[2]).toEqual([]); // empty targetEffects
    });
});

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
});
