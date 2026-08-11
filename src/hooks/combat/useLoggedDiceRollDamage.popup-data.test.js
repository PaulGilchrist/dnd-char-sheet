import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/dice/diceRoller.js', () => ({
    rollExpression: vi.fn(),
    rollExpressionDoubled: vi.fn(),
    formatDamageFormula: vi.fn((formula, rolls, isCrit) => {
        if (!isCrit) return formula;
        const parsed = formula.match(/^(\d+)?d(\d+)((?:[+-]\d+)+)?$/i);
        if (!parsed) return formula;
        const count = parsed[1] || 1;
        const sides = parsed[2];
        const modifierStr = parsed[3];
        let modifier = 0;
        if (modifierStr) {
            const segments = modifierStr.match(/([+-]\d+)/g);
            for (const seg of segments) { modifier += parseInt(seg, 10); }
        }
        const dicePart = count === 1 ? `d${sides}` : `${count}d${sides}`;
        const rollStr = rolls && rolls.length > 0 ? ` (${rolls.join(', ')})` : '';
        let result = `${dicePart}*2${rollStr}`;
        if (modifier > 0) result += `+${modifier}`;
        else if (modifier < 0) result += `${modifier}`;
        return result;
    }),
}));

vi.mock('../../services/ui/utils.js', () => ({
    default: {
        getName: vi.fn((n) => n || 'Unknown'),
        guid: vi.fn(() => 'test-guid-1234'),
    },
}));

vi.mock('../runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/encounters/combatData.js', () => ({
    loadCombatSummary: vi.fn(),
    getCombatSummary: vi.fn(),
}));

vi.mock('../../services/combat/automation/automationService.js', () => ({
    hasIgnoreResistance: vi.fn(),
    playerIsImmuneToCondition: vi.fn(),
    hasGreatWeaponFighting: vi.fn(),
    applyGreatWeaponFightingToDamage: vi.fn((rolls) => rolls),
    evaluateAutoExpression: vi.fn((expr) => {
        const match = expr.match(/^(\d+)d(\d+)\+(\d+)/);
        if (match) return parseInt(match[1]) + parseInt(match[3]);
        return 0;
    }),
}));

vi.mock('../../services/rules/features/invisibilityService.js', () => ({
    endInvisibilityOnHostileAction: vi.fn(),
}));

vi.mock('../../services/combat/conditions/savePromptService.js', () => ({
    sendSavePrompt: vi.fn(),
}));

vi.mock('../../services/rules/combat/aoeService.js', () => ({
    getAffectedCreatures: vi.fn(),
    processAoeNpcs: vi.fn(),
    sendAoePlayerSaves: vi.fn(),
}));

vi.mock('./loggedDiceRollUtils.js', () => ({
    readAoeContext: vi.fn(),
    hasPotentCantrip: vi.fn(),
    isMagicMissileImmune: vi.fn(),
    hasSoulstitchProtection: vi.fn(),
    applyMinDamageAdjustment: vi.fn((d) => d),
}));

vi.mock('../../services/ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/rules/combat/applyDamage.js', () => ({
    computeDamageAfterSave: vi.fn((total, success, _dcSuccess) => success ? Math.floor(total / 2) : total),
    computeDamageAfterEvasion: vi.fn((total, success, _dcSuccess, evasion) => (evasion && success ? 0 : (success ? Math.floor(total / 2) : total))),
    rollSaveForCreature: vi.fn(),
    applyDamageToTarget: vi.fn(),
    clearReTriggeredSequence: vi.fn(),
    normalizeSaveType: (type) => type,
}));

vi.mock('../../services/combat/auras/coronaAuraUtils.js', () => ({
    getCoronaSaveDisadvantage: vi.fn(),
}));

vi.mock('../../services/combat/auras/elderChampionAuraUtils.js', () => ({
    getElderChampionSaveDisadvantage: vi.fn(),
}));

vi.mock('../../services/automation/handlers/buffs/circleOfPowerHandler.js', () => ({
    isCircleOfPowerActive: vi.fn(),
}));

vi.mock('../../services/combat/auras/bardicInspirationState.js', () => ({
    hasBardicInspirationOffense: vi.fn(),
    getBardicInspirationDieSize: vi.fn(),
    getBardicInspirationDieSizeFromClass: vi.fn(),
}));

vi.mock('../../services/rules/spells/empoweredSpellService.js', () => ({
    hasEmpoweredSpell: vi.fn(),
}));

vi.mock('../../services/rules/spells/metamagicRules.js', () => ({
    getChaModifier: vi.fn(),
}));

vi.mock('../../services/automation/handlers/buffs/holyAuraHandler.js', () => ({
    getHolyAuraTargets: vi.fn(),
}));

vi.mock('../../services/combat/conditions/conditionEffects.js', () => ({
    computeConditionEffects: vi.fn(() => ({
        restoreBalance: false,
        autoRerollForSaves: false,
        autoRerollBonus: null,
        autoRerollCondition: null,
        saveAdvantageCount: 0,
        saveAdvantageAbilities: [],
    })),
}));

vi.mock('../../services/combat/auras/pendingSaveRegistry.js', () => ({
    registerPendingSavePrompt: vi.fn(),
}));

vi.mock('../../hooks/useAllySelection.js', () => ({
    getAllyList: vi.fn(),
}));

import { getRuntimeValue, setRuntimeValue } from '../runtime/useRuntimeState.js';
import { loadCombatSummary } from '../../services/encounters/combatData.js';
import { hasIgnoreResistance, playerIsImmuneToCondition } from '../../services/combat/automation/automationService.js';
import { endInvisibilityOnHostileAction } from '../../services/rules/features/invisibilityService.js';
import { addEntry } from '../../services/ui/logService.js';
import { hasPotentCantrip, isMagicMissileImmune, hasSoulstitchProtection, applyMinDamageAdjustment, readAoeContext } from './loggedDiceRollUtils.js';
import { computeDamageAfterSave, rollSaveForCreature, applyDamageToTarget, computeDamageAfterEvasion } from '../../services/rules/combat/applyDamage.js';
import { createLogDamageAndShow } from './useLoggedDiceRollDamage.js';
import { getCoronaSaveDisadvantage } from '../../services/combat/auras/coronaAuraUtils.js';
import { getElderChampionSaveDisadvantage } from '../../services/combat/auras/elderChampionAuraUtils.js';
import { isCircleOfPowerActive } from '../../services/automation/handlers/buffs/circleOfPowerHandler.js';
import { hasBardicInspirationOffense, getBardicInspirationDieSize, getBardicInspirationDieSizeFromClass } from '../../services/combat/auras/bardicInspirationState.js';
import { hasEmpoweredSpell } from '../../services/rules/spells/empoweredSpellService.js';
import { getChaModifier } from '../../services/rules/spells/metamagicRules.js';
import { getAllyList } from '../../hooks/useAllySelection.js';
import { sendSavePrompt } from '../../services/combat/conditions/savePromptService.js';
import { rollExpression } from '../../services/dice/diceRoller.js';
import { getAffectedCreatures, processAoeNpcs, sendAoePlayerSaves } from '../../services/rules/combat/aoeService.js';
describe('Popup data with bardic inspiration, empowered spell, piercer, savage attacker', () => {
    const deps = {
        characterName: 'TestFighter',
        campaignName: 'test-campaign',
        characters: [{ name: 'Goblin', computedStats: { armorClass: 12 } }],
        setPopupHtml: vi.fn(),
        logEntry: vi.fn(),
        pendingSaves: {},
    };

    beforeEach(() => {
        rollExpression.mockReturnValue({ total: 8, rolls: [5, 3], modifier: 0 });
        getRuntimeValue.mockReturnValue(null);
        applyMinDamageAdjustment.mockImplementation((d) => d);
        hasIgnoreResistance.mockReturnValue(false);
        endInvisibilityOnHostileAction.mockReturnValue(undefined);
        applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });
        loadCombatSummary.mockResolvedValue({
            creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 13, maxHp: 13 }],
        });
        deps.logEntry.mockClear();
        deps.setPopupHtml.mockClear();
    });

    function createFn() {
        return createLogDamageAndShow(deps);
    }

    it('includes bardic inspiration offense data in popup', async () => {
        hasBardicInspirationOffense.mockReturnValue(true);
        getBardicInspirationDieSize.mockReturnValue(6);
        getBardicInspirationDieSizeFromClass.mockReturnValue(6);

        const fn = createFn();
        await fn('Longsword', '1d8+3', 8, [5, 3], 3, {
            targetName: 'Goblin',
            damageType: 'slashing',
            bardicInspirationOffense: true,
            bardicInspirationOffenseDieSize: 6,
        });

        expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
            bardicInspirationOffense: true,
            bardicInspirationOffenseDieSize: 6,
        }));
    });

    it('includes empowered spell data in popup', async () => {
        hasEmpoweredSpell.mockReturnValue(true);
        getChaModifier.mockReturnValue(3);

        const fn = createFn();
        await fn('Fireball', '8d6', 20, [3, 4, 5, 2, 3, 3], 0, {
            targetName: 'Goblin',
            damageType: 'fire',
            empoweredSpell: true,
            empoweredSpellChaMod: 3,
        });

        expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
            empoweredSpell: true,
            empoweredSpellChaMod: 3,
        }));
    });

    it('includes spell name in popup', async () => {
        const fn = createFn();
        await fn('Fireball', '8d6', 20, [3, 4, 5, 2, 3, 3], 0, {
            targetName: 'Goblin',
            damageType: 'fire',
            spellName: 'Fireball',
        });

        expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
            spellName: 'Fireball',
        }));
    });

    it('sets piercer puncture availability for piercing damage', async () => {
        const playerStats = {
            reactions: [
                {
                    automation: {
                        type: 'piercer_puncture',
                    },
                },
            ],
        };

        const fn = createFn();
        await fn('Rapier', '1d8+3', 8, [5, 3], 3, {
            targetName: 'Goblin',
            damageType: 'piercing',
            playerStats,
        });

        expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
            piercerPuncture: true,
        }));
    });

    it('sets savage attacker availability for melee attacks', async () => {
        const playerStats = {
            automation: {
                passives: [
                    { type: 'passive_rule', effect: 'reroll_damage_once_per_turn' },
                ],
            },
        };

        const fn = createFn();
        await fn('Longsword', '1d8+3', 8, [5, 3], 3, {
            targetName: 'Goblin',
            damageType: 'slashing',
            playerStats,
        });

        expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
            savageAttacker: true,
        }));
    });

    it('sets weapon type based on context', async () => {
        const fn = createFn();
        await fn('Longsword', '1d8+3', 8, [5, 3], 3, {
            targetName: 'Goblin',
            damageType: 'slashing',
            isMelee: true,
        });

        expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
            weaponType: 'melee',
        }));
    });

    it('sets weapon type to unarmed for unarmed strikes', async () => {
        const fn = createFn();
        await fn('Unarmed Strike', '1d4', 4, [4], 0, {
            targetName: 'Goblin',
            damageType: 'bludgeoning',
            isUnarmedStrike: true,
        });

        expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
            weaponType: 'unarmed',
        }));
    });

    it('sets weapon type to ranged for ranged attacks', async () => {
        const fn = createFn();
        await fn('Longbow', '1d8', 8, [8], 0, {
            targetName: 'Goblin',
            damageType: 'piercing',
            isMelee: false,
        });

        expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
            weaponType: 'ranged',
        }));
    });
});

