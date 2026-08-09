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

describe('Magic Missile immunity via Shield', () => {
    const deps = {
        characterName: 'Wizard1',
        campaignName: 'test-campaign',
        characters: [{ name: 'Goblin', computedStats: { armorClass: 12 } }],
        setPopupHtml: vi.fn(),
        logEntry: vi.fn(),
        pendingSaves: {},
    };

    beforeEach(() => {
        getRuntimeValue.mockReturnValue(null);
        isMagicMissileImmune.mockReturnValue(false);
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

    it('applies shield immunity when character is immune to magic missile', async () => {
        isMagicMissileImmune.mockReturnValue(true);

        const fn = createFn();
        await fn('Magic Missile', '3d4+2', 8, [2, 3, 3], 2, {
            targetName: 'Goblin',
            damageType: 'force',
        });

        expect(deps.logEntry).toHaveBeenCalledWith(expect.objectContaining({
            rollType: 'damage',
            name: 'Magic Missile',
            finalDamage: 0,
            note: 'Shield: Immune to Magic Missile',
        }));
        expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
            type: 'damage',
            finalDamage: 0,
            damageReduced: true,
            note: 'Shield: Immune to Magic Missile',
        }));
    });

    it('does not apply shield immunity for non-magic-missile spells', async () => {
        isMagicMissileImmune.mockReturnValue(true);

        const fn = createFn();
        await fn('Fire Bolt', '1d10', 5, [5], 0, {
            targetName: 'Goblin',
            damageType: 'fire',
        });

        expect(deps.logEntry).not.toHaveBeenCalledWith(expect.objectContaining({
            note: 'Shield: Immune to Magic Missile',
        }));
        expect(applyDamageToTarget).toHaveBeenCalled();
    });
});

describe('Sanctuary check on save-based spells', () => {
    const deps = {
        characterName: 'Wizard1',
        campaignName: 'test-campaign',
        characters: [{ name: 'Goblin', computedStats: { armorClass: 12 } }],
        setPopupHtml: vi.fn(),
        logEntry: vi.fn(),
        pendingSaves: {},
    };

    beforeEach(() => {
        getRuntimeValue.mockImplementation((_key) => null);
        setRuntimeValue.mockClear();
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

    it('returns early when sanctuary save fails', async () => {
        getRuntimeValue.mockImplementation((_key) => {
            if (_key === 'campaign') {
                return [
                    {
                        effect: 'sanctuary',
                        target: 'Goblin',
                        source: 'Cleric1',
                        saveDc: 13,
                    },
                ];
            }
            return null;
        });

        const fn = createFn();

        // Simulate save-result event with failure
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('save-result', {
                detail: { promptId: 'test-guid-1234', success: false, roll: 5, bonus: 0 },
            }));
        }, 10);

        await fn('Fireball', '8d6', 20, [3, 4, 5, 2, 3, 3], 0, {
            targetName: 'Goblin',
            damageType: 'fire',
            saveDc: 15,
            saveType: 'DEX',
            dcSuccess: 'half',
        });

        expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
            type: 'automation_info',
            name: 'Sanctuary',
        }));
    });
});

describe('Corona and Elder Champion save disadvantages', () => {
    const deps = {
        characterName: 'TestWizard',
        campaignName: 'test-campaign',
        characters: [
            { name: 'Goblin', computedStats: { saveBonuses: { DEX: 3 }, armorClass: 12 }, saveModifiers: [] },
        ],
        setPopupHtml: vi.fn(),
        logEntry: vi.fn(),
        pendingSaves: {},
    };

    beforeEach(() => {
        rollExpression.mockReturnValue({ total: 8, rolls: [5, 3], modifier: 0 });
        getRuntimeValue.mockReturnValue(null);
        applyMinDamageAdjustment.mockImplementation((d) => d);
        hasIgnoreResistance.mockReturnValue(false);
        hasSoulstitchProtection.mockReturnValue(false);
        playerIsImmuneToCondition.mockReturnValue(false);
        endInvisibilityOnHostileAction.mockReturnValue(undefined);
        computeDamageAfterSave.mockImplementation((total, success, _dcSuccess) => success ? Math.floor(total / 2) : total);
        rollSaveForCreature.mockReturnValue({ success: false, roll: 8, total: 11, bonus: 3, rawRolls: [8] });
        applyDamageToTarget.mockReturnValue({ finalDamage: 10, newHp: 3, damageReduced: false });
        loadCombatSummary.mockResolvedValue({
            creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 13, maxHp: 13 }],
        });
        deps.logEntry.mockClear();
        deps.setPopupHtml.mockClear();
    });

    function createFn() {
        return createLogDamageAndShow(deps);
    }

    it('applies corona save disadvantage on NPC save damage', async () => {
        getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: true });
        getElderChampionSaveDisadvantage.mockResolvedValue({ disadvantage: false });
        isCircleOfPowerActive.mockReturnValue(false);

        const fn = createFn();
        await fn('Fireball', '8d6', 20, [3, 4, 5, 2, 3, 3], 0, {
            targetName: 'Goblin',
            damageType: 'fire',
            saveDc: 15,
            saveType: 'DEX',
            dcSuccess: 'half',
            attackerName: 'TestWizard',
        });

        expect(getCoronaSaveDisadvantage).toHaveBeenCalledWith(expect.objectContaining({
            targetName: 'Goblin',
            damageType: 'fire',
            skipRangeCheck: true,
        }));
        expect(rollSaveForCreature).toHaveBeenCalledWith(
            expect.any(Object),
            'DEX',
            15,
            true, // disadvantage from corona
            false
        );
    });

    it('applies elder champion save disadvantage when corona does not', async () => {
        getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: false });
        getElderChampionSaveDisadvantage.mockResolvedValue({ disadvantage: true });
        isCircleOfPowerActive.mockReturnValue(false);

        const fn = createFn();
        await fn('Fireball', '8d6', 20, [3, 4, 5, 2, 3, 3], 0, {
            targetName: 'Goblin',
            damageType: 'fire',
            saveDc: 15,
            saveType: 'DEX',
            dcSuccess: 'half',
            attackerName: 'TestWizard',
            playerStats: { automation: { actions: [], passives: [] } },
        });

        expect(getElderChampionSaveDisadvantage).toHaveBeenCalledWith(expect.objectContaining({
            attackerName: 'TestWizard',
            targetName: 'Goblin',
        }));
        expect(rollSaveForCreature).toHaveBeenCalledWith(
            expect.any(Object),
            'DEX',
            15,
            true, // disadvantage from elder champion
            false
        );
    });

    it('checks corona first, then elder champion for disadvantage', async () => {
        getCoronaSaveDisadvantage.mockReturnValue({ disadvantage: false });
        getElderChampionSaveDisadvantage.mockResolvedValue({ disadvantage: false });
        isCircleOfPowerActive.mockReturnValue(false);

        const fn = createFn();
        await fn('Fireball', '8d6', 20, [3, 4, 5, 2, 3, 3], 0, {
            targetName: 'Goblin',
            damageType: 'fire',
            saveDc: 15,
            saveType: 'DEX',
            dcSuccess: 'half',
            attackerName: 'TestWizard',
            playerStats: { automation: { actions: [], passives: [] } },
        });

        expect(getCoronaSaveDisadvantage).toHaveBeenCalled();
        expect(getElderChampionSaveDisadvantage).toHaveBeenCalled();
        expect(rollSaveForCreature).toHaveBeenCalledWith(
            expect.any(Object),
            'DEX',
            15,
            false,
            false
        );
    });
});

describe('Circle of Power advantage on saves', () => {
    const deps = {
        characterName: 'TestWizard',
        campaignName: 'test-campaign',
        characters: [
            { name: 'Goblin', computedStats: { saveBonuses: { DEX: 3 }, armorClass: 12 }, saveModifiers: [] },
        ],
        setPopupHtml: vi.fn(),
        logEntry: vi.fn(),
        pendingSaves: {},
    };

    beforeEach(() => {
        rollExpression.mockReturnValue({ total: 8, rolls: [5, 3], modifier: 0 });
        getRuntimeValue.mockReturnValue(null);
        applyMinDamageAdjustment.mockImplementation((d) => d);
        hasIgnoreResistance.mockReturnValue(false);
        hasSoulstitchProtection.mockReturnValue(false);
        playerIsImmuneToCondition.mockReturnValue(false);
        endInvisibilityOnHostileAction.mockReturnValue(undefined);
        computeDamageAfterSave.mockImplementation((total, success, _dcSuccess) => success ? Math.floor(total / 2) : total);
        rollSaveForCreature.mockReturnValue({ success: false, roll: 8, total: 11, bonus: 3, rawRolls: [8] });
        applyDamageToTarget.mockReturnValue({ finalDamage: 10, newHp: 3, damageReduced: false });
        loadCombatSummary.mockResolvedValue({
            creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 13, maxHp: 13 }],
        });
        deps.logEntry.mockClear();
        deps.setPopupHtml.mockClear();
    });

    function createFn() {
        return createLogDamageAndShow(deps);
    }

    it('applies circle of power advantage on NPC save', async () => {
        isCircleOfPowerActive.mockReturnValue(true);
        getElderChampionSaveDisadvantage.mockResolvedValue({ disadvantage: false });

        const fn = createFn();
        await fn('Fireball', '8d6', 20, [3, 4, 5, 2, 3, 3], 0, {
            targetName: 'Goblin',
            damageType: 'fire',
            saveDc: 15,
            saveType: 'DEX',
            dcSuccess: 'half',
            attackerName: 'TestWizard',
        });

        expect(rollSaveForCreature).toHaveBeenCalledWith(
            expect.any(Object),
            'DEX',
            15,
            false,
            true // advantage from circle of power
        );
    });

    it('applies circle of power evasion on NPC save', async () => {
        isCircleOfPowerActive.mockReturnValue(true);
        getElderChampionSaveDisadvantage.mockResolvedValue({ disadvantage: false });
        computeDamageAfterEvasion.mockReturnValue(10);

        const fn = createFn();
        await fn('Fireball', '8d6', 20, [3, 4, 5, 2, 3, 3], 0, {
            targetName: 'Goblin',
            damageType: 'fire',
            saveDc: 15,
            saveType: 'DEX',
            dcSuccess: 'half',
            attackerName: 'TestWizard',
        });

        expect(computeDamageAfterEvasion).toHaveBeenCalledWith(
            20,
            false,
            'half',
            true // evasion from circle of power
        );
    });
});

describe('Evasion logging', () => {
    const deps = {
        characterName: 'TestWizard',
        campaignName: 'test-campaign',
        characters: [
            {
                name: 'Goblin',
                computedStats: { saveBonuses: { DEX: 3 }, armorClass: 12, evasionEffects: [{ saveType: 'DEX' }] },
                saveModifiers: [],
            },
        ],
        setPopupHtml: vi.fn(),
        logEntry: vi.fn(),
        pendingSaves: {},
    };

    beforeEach(() => {
        rollExpression.mockReturnValue({ total: 8, rolls: [5, 3], modifier: 0 });
        getRuntimeValue.mockReturnValue(null);
        applyMinDamageAdjustment.mockImplementation((d) => d);
        hasIgnoreResistance.mockReturnValue(false);
        hasSoulstitchProtection.mockReturnValue(false);
        playerIsImmuneToCondition.mockReturnValue(false);
        endInvisibilityOnHostileAction.mockReturnValue(undefined);
        computeDamageAfterSave.mockImplementation((total, success, _dcSuccess) => success ? Math.floor(total / 2) : total);
        computeDamageAfterEvasion.mockImplementation((total, success, _dcSuccess, evasion) => (evasion && success ? 0 : (success ? Math.floor(total / 2) : total)));
        rollSaveForCreature.mockReturnValue({ success: true, roll: 18, total: 21, bonus: 3, rawRolls: [18] });
        applyDamageToTarget.mockReturnValue({ finalDamage: 10, newHp: 3, damageReduced: false });
        loadCombatSummary.mockResolvedValue({
            creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 13, maxHp: 13 }],
        });
        deps.logEntry.mockClear();
        deps.setPopupHtml.mockClear();
    });

    function createFn() {
        return createLogDamageAndShow(deps);
    }

    it('logs evasion when target passes save with evasion', async () => {
        const fn = createFn();
        await fn('Fireball', '8d6', 20, [3, 4, 5, 2, 3, 3], 0, {
            targetName: 'Goblin',
            damageType: 'fire',
            saveDc: 15,
            saveType: 'DEX',
            dcSuccess: 'half',
            attackerName: 'TestWizard',
        });

        expect(deps.logEntry).toHaveBeenCalledWith(expect.objectContaining({
            type: 'roll',
            characterName: 'Goblin',
            rollType: 'evasion',
            name: 'Evasion',
            saveResult: 'success',
        }));
    });
});

describe('Blessed Strikes Potent Spellcasting', () => {
    const deps = {
        characterName: 'TestWizard',
        campaignName: 'test-campaign',
        characters: [
            { name: 'Goblin', computedStats: { saveBonuses: { DEX: 3 }, armorClass: 12 }, saveModifiers: [] },
        ],
        setPopupHtml: vi.fn(),
        logEntry: vi.fn(),
        pendingSaves: {},
    };

    beforeEach(() => {
        rollExpression.mockReturnValue({ total: 8, rolls: [5, 3], modifier: 0 });
        getRuntimeValue.mockReturnValue(null);
        applyMinDamageAdjustment.mockImplementation((d) => d);
        hasIgnoreResistance.mockReturnValue(false);
        hasPotentCantrip.mockReturnValue(false);
        hasSoulstitchProtection.mockReturnValue(false);
        playerIsImmuneToCondition.mockReturnValue(false);
        endInvisibilityOnHostileAction.mockReturnValue(undefined);
        computeDamageAfterSave.mockImplementation((total, success, _dcSuccess) => success ? Math.floor(total / 2) : total);
        rollSaveForCreature.mockReturnValue({ success: false, roll: 5, total: 8, bonus: 3, rawRolls: [5] });
        applyDamageToTarget.mockReturnValue({ finalDamage: 10, newHp: 3, damageReduced: false });
        loadCombatSummary.mockResolvedValue({
            creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 13, maxHp: 13 }],
        });
        deps.logEntry.mockClear();
        deps.setPopupHtml.mockClear();
    });

    function createFn() {
        return createLogDamageAndShow(deps);
    }

    it('dispatches potent-spellcasting-temp-hp event when blessed strikes cantrip misses', async () => {
        const playerStats = {
            automation: {
                actions: [
                    {
                        type: 'damage_bonus',
                        name: 'Blessed Strikes',
                        options: ['Potent Spellcasting'],
                        tempHpExpression: '1d4+2',
                    },
                ],
                passives: [],
            },
        };

        const fn = createFn();
        let dispatchedEvent = null;
        window.addEventListener('potent-spellcasting-temp-hp', (event) => {
            dispatchedEvent = event.detail;
        });

        await fn('Shocking Grasp', '1d8', 5, [5], 0, {
            targetName: 'Goblin',
            damageType: 'lightning',
            saveDc: 15,
            saveType: 'DEX',
            dcSuccess: 'none',
            isCantrip: true,
            attackerName: 'TestWizard',
            playerStats,
        });

        expect(dispatchedEvent).not.toBeNull();
        expect(dispatchedEvent.title).toBe('Improved Blessed Strikes — Potent Spellcasting');
        expect(dispatchedEvent.tempHp).toBeGreaterThan(0);
    });

    it('does not dispatch event when no blessed strikes with tempHpExpression', async () => {
        const playerStats = {
            automation: {
                actions: [
                    {
                        type: 'damage_bonus',
                        name: 'Other Feature',
                        options: ['Potent Spellcasting'],
                    },
                ],
                passives: [],
            },
        };

        const fn = createFn();
        let dispatchedEvent = null;
        window.addEventListener('potent-spellcasting-temp-hp', (event) => {
            dispatchedEvent = event.detail;
        });

        await fn('Shocking Grasp', '1d8', 5, [5], 0, {
            targetName: 'Goblin',
            damageType: 'lightning',
            saveDc: 15,
            saveType: 'DEX',
            dcSuccess: 'none',
            isCantrip: true,
            attackerName: 'TestWizard',
            playerStats,
        });

        expect(dispatchedEvent).toBeNull();
    });
});

describe('Contact Other Plane auto-save', () => {
    const deps = {
        characterName: 'Warlock1',
        campaignName: 'test-campaign',
        characters: [{ name: 'Warlock1', computedStats: { armorClass: 14 } }],
        charactersRef: { current: [{ name: 'Warlock1', computedStats: { armorClass: 14 } }] },
        setPopupHtml: vi.fn(),
        logEntry: vi.fn(),
        pendingSaves: {},
    };

    beforeEach(() => {
        getRuntimeValue.mockReturnValue(null);
        applyMinDamageAdjustment.mockImplementation((d) => d);
        hasIgnoreResistance.mockReturnValue(false);
        endInvisibilityOnHostileAction.mockReturnValue(undefined);
        computeDamageAfterSave.mockImplementation((total, success, _dcSuccess) => success ? Math.floor(total / 2) : total);
        applyDamageToTarget.mockReturnValue({ finalDamage: 10, newHp: 10, damageReduced: false });
        loadCombatSummary.mockResolvedValue({
            creatures: [{ name: 'Warlock1', type: 'player', ac: 14, currentHp: 20, maxHp: 20 }],
        });
        deps.logEntry.mockClear();
        deps.setPopupHtml.mockClear();
    });

    function createFn() {
        return createLogDamageAndShow(deps);
    }

    it('applies auto-save for Contact Other Plane when caster is the target', async () => {
        const playerStats = {
            automation: {
                passives: [
                    { type: 'passive_rule', effect: 'contact_patron_auto_save' },
                ],
            },
        };

        const fn = createFn();
        await fn('Contact Other Plane', '4d6', 14, [3, 4, 5, 2], 0, {
            targetName: 'Warlock1',
            damageType: 'psychic',
            saveDc: 15,
            saveType: 'WIS',
            dcSuccess: 'half',
            playerStats,
        });

        expect(deps.logEntry).toHaveBeenCalledWith(expect.objectContaining({
            saveResult: 'success',
            note: 'contact_patron_damage_roll_before_apply',
        }));
        expect(applyDamageToTarget).toHaveBeenCalledWith(
            expect.any(Object),
            'Warlock1',
            expect.any(Number),
            ['psychic'],
            'test-campaign',
            null,
            false,
            'Warlock1'
        );
    });

    it('does not apply auto-save for other spells', async () => {
        const playerStats = {
            automation: {
                passives: [
                    { type: 'passive_rule', effect: 'contact_patron_auto_save' },
                ],
            },
        };

        const fn = createFn();
        await fn('Fireball', '8d6', 20, [3, 4, 5, 2, 3, 3], 0, {
            targetName: 'Warlock1',
            damageType: 'fire',
            saveDc: 15,
            saveType: 'DEX',
            dcSuccess: 'half',
            playerStats,
        });

        expect(sendSavePrompt).toHaveBeenCalled();
    });
});

describe('Careful Spell for player save', () => {
    const deps = {
        characterName: 'Wizard1',
        campaignName: 'test-campaign',
        characters: [{ name: 'Ally1', computedStats: { armorClass: 14 } }],
        charactersRef: { current: [{ name: 'Ally1', computedStats: { armorClass: 14 } }] },
        setPopupHtml: vi.fn(),
        logEntry: vi.fn(),
        pendingSaves: {},
    };

    beforeEach(() => {
        getRuntimeValue.mockReturnValue(null);
        applyMinDamageAdjustment.mockImplementation((d) => d);
        hasIgnoreResistance.mockReturnValue(false);
        endInvisibilityOnHostileAction.mockReturnValue(undefined);
        computeDamageAfterSave.mockImplementation((total, success, _dcSuccess) => success ? Math.floor(total / 2) : total);
        applyDamageToTarget.mockReturnValue({ finalDamage: 10, newHp: 10, damageReduced: false });
        loadCombatSummary.mockResolvedValue({
            creatures: [{ name: 'Ally1', type: 'player', ac: 14, currentHp: 20, maxHp: 20 }],
        });
        deps.logEntry.mockClear();
        deps.setPopupHtml.mockClear();
    });

    function createFn() {
        return createLogDamageAndShow(deps);
    }

    it('applies half damage with careful spell when ally is protected', async () => {
        getAllyList.mockReturnValue(['Ally1']);

        const fn = createFn();
        await fn('Fireball', '8d6', 20, [3, 4, 5, 2, 3, 3], 0, {
            targetName: 'Ally1',
            damageType: 'fire',
            saveDc: 15,
            saveType: 'DEX',
            dcSuccess: 'half',
            metamagicCareful: true,
        });

        expect(deps.logEntry).toHaveBeenCalledWith(expect.objectContaining({
            saveResult: 'success',
            note: 'careful_spell_damage_roll_before_apply',
        }));
        expect(applyDamageToTarget).toHaveBeenCalled();
    });
});

describe('Status effects application on failed saves', () => {
    const deps = {
        characterName: 'TestWizard',
        campaignName: 'test-campaign',
        characters: [
            { name: 'Goblin', computedStats: {}, saveModifiers: [] },
        ],
        setPopupHtml: vi.fn(),
        logEntry: vi.fn(),
        pendingSaves: {},
    };

    beforeEach(() => {
        rollExpression.mockReturnValue({ total: 8, rolls: [5, 3], modifier: 0 });
        getRuntimeValue.mockReturnValue(null);
        applyMinDamageAdjustment.mockImplementation((d) => d);
        hasIgnoreResistance.mockReturnValue(false);
        hasSoulstitchProtection.mockReturnValue(false);
        playerIsImmuneToCondition.mockReturnValue(false);
        endInvisibilityOnHostileAction.mockReturnValue(undefined);
        computeDamageAfterSave.mockImplementation((total, success, _dcSuccess) => success ? Math.floor(total / 2) : total);
        rollSaveForCreature.mockReturnValue({ success: false, roll: 5, total: 8, bonus: 3, rawRolls: [5] });
        applyDamageToTarget.mockReturnValue({ finalDamage: 10, newHp: 3, damageReduced: false });
        loadCombatSummary.mockResolvedValue({
            creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 13, maxHp: 13 }],
        });
        deps.logEntry.mockClear();
        deps.setPopupHtml.mockClear();
    });

    function createFn() {
        return createLogDamageAndShow(deps);
    }

    it('applies status effects when save fails and target is npc', async () => {
        const fn = createFn();
        await fn('Fireball', '8d6', 20, [3, 4, 5, 2, 3, 3], 0, {
            targetName: 'Goblin',
            damageType: 'fire',
            saveDc: 15,
            saveType: 'DEX',
            dcSuccess: 'half',
            statusEffects: ['poisoned'],
            attackerName: 'TestWizard',
        });

        expect(setRuntimeValue).toHaveBeenCalledWith(
            'Goblin',
            'activeConditions',
            expect.arrayContaining(['poisoned']),
            'test-campaign'
        );
    });

    it('skips status effects when target is immune', async () => {
        playerIsImmuneToCondition.mockReturnValue(true);

        const fn = createFn();
        await fn('Fireball', '8d6', 20, [3, 4, 5, 2, 3, 3], 0, {
            targetName: 'Goblin',
            damageType: 'fire',
            saveDc: 15,
            saveType: 'DEX',
            dcSuccess: 'half',
            statusEffects: ['poisoned'],
            attackerName: 'TestWizard',
        });

        expect(playerIsImmuneToCondition).toHaveBeenCalled();
    });

    it('applies status effects to player targets too', async () => {
        loadCombatSummary.mockResolvedValue({
            creatures: [{ name: 'Goblin', type: 'player', ac: 12, currentHp: 13, maxHp: 13 }],
        });
        deps.charactersRef = { current: [{ name: 'Goblin', computedStats: {}, saveModifiers: [] }] };

        const fn = createFn();
        await fn('Fireball', '8d6', 20, [3, 4, 5, 2, 3, 3], 0, {
            targetName: 'Goblin',
            damageType: 'fire',
            saveDc: 15,
            saveType: 'DEX',
            dcSuccess: 'half',
            statusEffects: ['poisoned'],
        });

        expect(setRuntimeValue).toHaveBeenCalledWith(
            'Goblin',
            'activeConditions',
            expect.arrayContaining(['poisoned']),
            'test-campaign'
        );
    });
});

describe('Death Strike handling', () => {
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
        setRuntimeValue.mockClear();
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

    it('doubles damage when death strike save fails', async () => {
        getRuntimeValue.mockImplementation((key) => {
            if (key === 'campaign') {
                return [
                    {
                        effect: 'death_strike',
                        target: 'Goblin',
                        saveDc: 15,
                        saveType: 'CON',
                    },
                ];
            }
            return null;
        });

        const fn = createFn();

        // Simulate save-result event with failure
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('save-result', {
                detail: { promptId: 'test-guid-1234', success: false, roll: 5, bonus: 3 },
            }));
        }, 10);

        await fn('Greatsword', '2d6+3', 10, [4, 3], 3, {
            targetName: 'Goblin',
            damageType: 'slashing',
        });

        // The log entry should show doubled formula
        expect(deps.logEntry).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Death Strike',
            formula: '2× 2d6+3',
            total: 20,
        }));
    });
});

describe('Ram prone application', () => {
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

    it('applies prone condition on ram when target is large or smaller', async () => {
        applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false, intercepted: false });

        const fn = createFn();
        await fn('Longsword', '1d8+3', 8, [5, 3], 3, {
            targetName: 'Goblin',
            damageType: 'slashing',
            ramActive: true,
            isMelee: true,
        });

        expect(setRuntimeValue).toHaveBeenCalledWith(
            'Goblin',
            'activeConditions',
            expect.arrayContaining(['Prone']),
            'test-campaign'
        );
        expect(deps.logEntry).toHaveBeenCalledWith(expect.objectContaining({
            type: 'condition',
            condition: 'Prone',
        }));
    });

    it('does not apply prone when target is larger than large', async () => {
        loadCombatSummary.mockResolvedValue({
            creatures: [{ name: 'Titan', type: 'npc', ac: 12, currentHp: 100, maxHp: 100, size: 'Huge' }],
        });
        applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 92, damageReduced: false, intercepted: false });

        const fn = createFn();
        await fn('Longsword', '1d8+3', 8, [5, 3], 3, {
            targetName: 'Titan',
            damageType: 'slashing',
            ramActive: true,
            isMelee: true,
        });

        expect(setRuntimeValue).not.toHaveBeenCalledWith(
            'Titan',
            'activeConditions',
            expect.arrayContaining(['Prone']),
            'test-campaign'
        );
    });
});

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

describe('lastAttack merge', () => {
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
        getRuntimeValue.mockImplementation((_key) => null);
        setRuntimeValue.mockClear();
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

    it('merges lastAttack with existing data', async () => {
        const existingLastAttack = {
            attackerName: 'TestFighter',
            rollType: 'attack',
        };
        getRuntimeValue.mockImplementation((key, subKey) => {
            if (key === 'campaign' && subKey === 'lastAttack') return existingLastAttack;
            if (key === 'campaign') return [];
            return null;
        });

        const fn = createFn();
        await fn('Fire Bolt', '1d10', 5, [5], 0, {
            targetName: 'Goblin',
            damageType: 'fire',
            attackName: 'Fire Bolt',
        });

        expect(setRuntimeValue).toHaveBeenCalledWith(
            'campaign',
            'lastAttack',
            expect.objectContaining({
                attackerName: 'TestFighter',
                targetName: 'Goblin',
                attackName: 'Fire Bolt',
                rolls: [5],
                rawDamage: 5,
                primaryDamage: 5,
                primaryDamageType: 'fire',
                damageTypes: ['fire'],
                damageApplied: true,
            }),
            'test-campaign'
        );
    });
});

describe('AoE overlay path', () => {
    const deps = {
        characterName: 'TestWizard',
        campaignName: 'test-campaign',
        characters: [
            { name: 'Ally1', computedStats: { armorClass: 14, saveBonuses: { DEX: 2 } } },
        ],
        setPopupHtml: vi.fn(),
        logEntry: vi.fn(),
        pendingSaves: {},
    };

    beforeEach(() => {
        rollExpression.mockReturnValue({ total: 8, rolls: [5, 3], modifier: 0 });
        getRuntimeValue.mockReturnValue(null);
        applyMinDamageAdjustment.mockImplementation((d) => d);
        hasIgnoreResistance.mockReturnValue(false);
        hasPotentCantrip.mockReturnValue(false);
        hasSoulstitchProtection.mockReturnValue(false);
        endInvisibilityOnHostileAction.mockReturnValue(undefined);
        applyDamageToTarget.mockReturnValue({ finalDamage: 10, newHp: 5, damageReduced: false });
        loadCombatSummary.mockResolvedValue({
            creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 13, maxHp: 13 }],
        });
        deps.logEntry.mockClear();
        deps.setPopupHtml.mockClear();
    });

    function createFn() {
        return createLogDamageAndShow(deps);
    }

    it('routes to aoE handler when targetName starts with overlay-', async () => {
        readAoeContext.mockResolvedValue({
            overlay: { label: 'Fireball Zone', shape: 'circle', radius: 20 },
            players: [{ name: 'Ally1' }],
            npcs: [{ name: 'Goblin' }],
        });
        getAffectedCreatures.mockReturnValue([
            { creature: { name: 'Goblin', type: 'npc', ac: 12 } },
        ]);
        processAoeNpcs.mockReturnValue([]);
        sendAoePlayerSaves.mockReturnValue([]);

        const fn = createFn();
        await fn('Fireball', '8d6', 20, [3, 4, 5, 2, 3, 3], 0, {
            targetName: 'overlay-1',
            damageType: 'fire',
            saveDc: 15,
            saveType: 'DEX',
            dcSuccess: 'half',
        });

        expect(readAoeContext).toHaveBeenCalledWith('test-campaign', '1');
        expect(deps.logEntry).toHaveBeenCalledWith(expect.objectContaining({
            rollType: 'aoe-damage',
            targetName: 'Fireball Zone',
        }));
    });
});

describe('Player death saves on unconscious', () => {
    const deps = {
        characterName: 'TestWizard',
        campaignName: 'test-campaign',
        characters: [{ name: 'Ally1', computedStats: { armorClass: 14 } }],
        setPopupHtml: vi.fn(),
        logEntry: vi.fn(),
        pendingSaves: {},
    };

    beforeEach(() => {
        rollExpression.mockReturnValue({ total: 8, rolls: [5, 3], modifier: 0 });
        getRuntimeValue.mockReturnValue(null);
        setRuntimeValue.mockClear();
        applyMinDamageAdjustment.mockImplementation((d) => d);
        hasIgnoreResistance.mockReturnValue(false);
        endInvisibilityOnHostileAction.mockReturnValue(undefined);
        applyDamageToTarget.mockReturnValue({ finalDamage: 20, newHp: 0, damageReduced: false });
        loadCombatSummary.mockResolvedValue({
            creatures: [{ name: 'Ally1', type: 'player', ac: 14, currentHp: 20, maxHp: 20 }],
        });
        deps.logEntry.mockClear();
        deps.setPopupHtml.mockClear();
    });

    function createFn() {
        return createLogDamageAndShow(deps);
    }

    it('sets death saves when player dies from plain damage', async () => {
        const fn = createFn();
        await fn('Fireball', '8d6', 20, [3, 4, 5, 2, 3, 3], 0, {
            targetName: 'Ally1',
            damageType: 'fire',
        });

        expect(setRuntimeValue).toHaveBeenCalledWith(
            'Ally1',
            'deathSaves',
            [false, false, false],
            'test-campaign'
        );
        expect(setRuntimeValue).toHaveBeenCalledWith(
            'Ally1',
            'deathFailures',
            [false, false, false],
            'test-campaign'
        );
    });

    it('does not set death saves when player survives', async () => {
        applyDamageToTarget.mockReturnValue({ finalDamage: 10, newHp: 10, damageReduced: false });

        const fn = createFn();
        await fn('Fireball', '8d6', 20, [3, 4, 5, 2, 3, 3], 0, {
            targetName: 'Ally1',
            damageType: 'fire',
        });

        expect(setRuntimeValue).not.toHaveBeenCalledWith(
            'Ally1',
            'deathSaves',
            expect.any(Array),
            'test-campaign'
        );
    });
});

describe('Resistance damage reduction', () => {
    const deps = {
        characterName: 'TestWizard',
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

    it('applies resistance damage reduction when effect exists and matches damage type', async () => {
        getRuntimeValue.mockImplementation((key) => {
            if (key === 'campaign') {
                return [
                    {
                        effect: 'resistance_damage_reduction',
                        target: 'Goblin',
                        chosenType: 'fire',
                    },
                ];
            }
            return null;
        });
        rollExpression.mockReturnValueOnce({ total: 3, rolls: [3], modifier: 0 });
        applyDamageToTarget.mockReturnValue({ finalDamage: 5, newHp: 8, damageReduced: false });

        const fn = createFn();
        await fn('Fire Bolt', '1d10', 8, [8], 0, {
            targetName: 'Goblin',
            damageType: 'fire',
        });

        expect(rollExpression).toHaveBeenCalledWith('1d4');
        expect(setRuntimeValue).toHaveBeenCalledWith(
            'Goblin',
            'resistanceUsedThisTurn',
            true,
            'test-campaign'
        );
        expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
            type: 'ability_use',
            abilityName: 'Resistance',
        }));
        expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
            resistanceReduction: 3,
            resistanceRoll: 3,
        }));
    });
});
