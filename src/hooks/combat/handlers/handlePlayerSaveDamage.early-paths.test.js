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
import { hasIgnoreResistance } from '../../../services/combat/automation/automationService.js';
import { endInvisibilityOnHostileAction } from '../../../services/rules/features/invisibilityService.js';
import { getCoronaSaveDisadvantage } from '../../../services/combat/auras/coronaAuraUtils.js';
import { getElderChampionSaveDisadvantage } from '../../../services/combat/auras/elderChampionAuraUtils.js';
import { isCircleOfPowerActive } from '../../../services/automation/handlers/buffs/circleOfPowerHandler.js';
import { getHolyAuraTargets } from '../../../services/automation/handlers/buffs/holyAuraHandler.js';
import { createPlayerSaveDamageHandler } from './handlePlayerSaveDamage.js';
import { applyDamageToTarget } from '../../../services/rules/combat/applyDamage.js';
import { computeConditionEffects } from '../../../services/combat/conditions/conditionEffects.js';
import { getAllyList } from '../../useAllySelection.js';

describe('handlePlayerSaveDamage - early returns', () => {
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
    });

    it('returns undefined when target is not found in combatSummary', async () => {
        const handler = createPlayerSaveDamageHandler(deps);
        const result = await handler(
            'Fire Bolt',
            '1d10',
            5,
            [6],
            0,
            { saveDc: 11, saveType: 'DEX', dcSuccess: 'half', damageType: 'Fire', targetName: 'Goblin' }
        );
        expect(result).toBeUndefined();
    });

    it('returns undefined when target type is not player', async () => {
        const handler = createPlayerSaveDamageHandler(deps);
        const result = await handler(
            'Fire Bolt',
            '1d10',
            5,
            [6],
            0,
            { saveDc: 11, saveType: 'DEX', dcSuccess: 'half', damageType: 'Fire', targetName: 'Goblin' },
            5,
            { creatures: [{ name: 'Goblin', type: 'npc' }] },
            [6]
        );
        expect(result).toBeUndefined();
    });

    it('returns undefined when combatSummary is null', async () => {
        const handler = createPlayerSaveDamageHandler(deps);
        const result = await handler(
            'Fire Bolt',
            '1d10',
            5,
            [6],
            0,
            { saveDc: 11, saveType: 'DEX', dcSuccess: 'half', damageType: 'Fire', targetName: 'TestWizard' }
        );
        expect(result).toBeUndefined();
    });
});

describe('handlePlayerSaveDamage - careful ally path', () => {
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

    it('applies careful spell damage when target is in ally list', async () => {
        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 11,
            saveType: 'DEX',
            dcSuccess: 'half',
            damageType: 'Fire',
            targetName: 'Ally1',
            metamagicCareful: true,
        };

        const result = await handler(
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

        expect(result).toBe(true);
        expect(deps.logEntry).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'roll',
                rollType: 'save-damage',
                note: 'careful_spell_damage_roll_before_apply',
            })
        );
        expect(deps.setPopupHtml).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'save-damage',
                carefulSpell: true,
                saveResult: { success: true, roll: 20, total: 11, bonus: 0 },
            })
        );
    });

    it('returns early when careful ally target is NOT in ally list', async () => {
        getAllyList.mockReturnValue(['OtherAlly']);

        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 11,
            saveType: 'DEX',
            dcSuccess: 'half',
            damageType: 'Fire',
            targetName: 'Ally1',
            metamagicCareful: true,
        };

        const result = await handler(
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

        expect(result).toBeUndefined();
        expect(deps.logEntry).not.toHaveBeenCalled();
        expect(deps.setPopupHtml).not.toHaveBeenCalled();
    });

    it('applies ignoreResistance when context.playerStats has it', async () => {
        hasIgnoreResistance.mockReturnValue(true);

        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 11,
            saveType: 'DEX',
            dcSuccess: 'half',
            damageType: 'Fire',
            targetName: 'Ally1',
            metamagicCareful: true,
            playerStats: { automation: { passives: [] } },
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

        expect(hasIgnoreResistance).toHaveBeenCalledWith(context.playerStats, 'Fire');
    });
});

describe('handlePlayerSaveDamage - contact patron path', () => {
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
        applyDamageToTarget.mockResolvedValue({ newHp: 15, finalDamage: 3 });
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

    it('applies contact patron auto save when conditions match', async () => {
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

        const result = await handler(
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

        expect(result).toBe(true);
        expect(deps.logEntry).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'roll',
                rollType: 'save-damage',
                note: 'contact_patron_damage_roll_before_apply',
            })
        );
        expect(deps.setPopupHtml).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'save-damage',
                contactPatron: true,
                saveResult: { success: true, roll: 20, total: 13, bonus: 0 },
            })
        );
    });

    it('does not apply contact patron when spell name does not match', async () => {
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

        const result = await handler(
            'Mind Sliver',
            '1d6',
            3,
            [3],
            0,
            context,
            3,
            { creatures: [{ name: 'TestWizard', type: 'player' }] },
            [3]
        );

        // Contact patron path doesn't apply (wrong spell name), but main save prompt path still runs
        expect(result).toBe(true);
        expect(deps.pendingSaves).toHaveProperty('test-guid-1234');
    });

    it('does not apply contact patron when target is not the caster', async () => {
        const handler = createPlayerSaveDamageHandler(deps);
        const context = {
            saveDc: 13,
            saveType: 'INT',
            dcSuccess: 'half',
            damageType: 'Psychic',
            targetName: 'Ally1',
            playerStats: {
                automation: {
                    passives: [{ type: 'passive_rule', effect: 'contact_patron_auto_save' }],
                },
            },
        };

        const result = await handler(
            'Contact Other Plane',
            '4d6',
            14,
            [3, 5, 2, 4],
            0,
            context,
            14,
            { creatures: [{ name: 'Ally1', type: 'player' }] },
            [3, 5, 2, 4]
        );

        // Contact patron path doesn't apply, but main save prompt path still runs
        expect(result).toBe(true);
        expect(deps.pendingSaves).toHaveProperty('test-guid-1234');
    });
});
