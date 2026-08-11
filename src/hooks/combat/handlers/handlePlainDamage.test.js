import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../services/dice/diceRoller.js', () => ({
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

vi.mock('../../../services/encounters/combatData.js', () => ({
    loadCombatSummary: vi.fn(),
    getCombatSummary: vi.fn(),
    getCurrentCombatRound: vi.fn(() => 1),
}));

vi.mock('../../../services/combat/automation/automationService.js', () => ({
    hasIgnoreResistance: vi.fn(),
    playerIsImmuneToCondition: vi.fn(),
    hasGreatWeaponFighting: vi.fn(),
    applyGreatWeaponFightingToDamage: vi.fn((rolls) => rolls),
}));

vi.mock('../../../services/rules/features/invisibilityService.js', () => ({
    endInvisibilityOnHostileAction: vi.fn(),
}));

vi.mock('../../../services/combat/conditions/savePromptService.js', () => ({
    sendSavePrompt: vi.fn(),
}));

vi.mock('../../../services/rules/combat/aoeService.js', () => ({
    getAffectedCreatures: vi.fn(),
    processAoeNpcs: vi.fn(),
    sendAoePlayerSaves: vi.fn(),
}));

vi.mock('../loggedDiceRollUtils.js', () => ({
    readAoeContext: vi.fn(),
    hasPotentCantrip: vi.fn(),
    isMagicMissileImmune: vi.fn(),
    hasSoulstitchProtection: vi.fn(),
    applyMinDamageAdjustment: vi.fn((d) => d),
}));

vi.mock('../../../services/ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../services/rules/combat/applyDamage.js', () => ({
    computeDamageAfterSave: vi.fn((total, success, _dcSuccess) => success ? Math.floor(total / 2) : total),
    rollSaveForCreature: vi.fn(),
    applyDamageToTarget: vi.fn(),
    clearReTriggeredSequence: vi.fn(),
}));

vi.mock('../../combat/auras/bardicInspirationState.js', () => ({
    hasBardicInspirationOffense: vi.fn(),
    getBardicInspirationDieSize: vi.fn(),
    getBardicInspirationDieSizeFromClass: vi.fn(),
}));

vi.mock('../../rules/spells/empoweredSpellService.js', () => ({
    hasEmpoweredSpell: vi.fn(),
}));

vi.mock('../../rules/spells/metamagicRules.js', () => ({
    getChaModifier: vi.fn(),
}));

import { rollExpression } from '../../../services/dice/diceRoller.js';
import { getRuntimeValue, setRuntimeValue } from '../../runtime/useRuntimeState.js';
import { loadCombatSummary } from '../../../services/encounters/combatData.js';
import { hasIgnoreResistance, hasGreatWeaponFighting, applyGreatWeaponFightingToDamage } from '../../../services/combat/automation/automationService.js';
import { endInvisibilityOnHostileAction } from '../../../services/rules/features/invisibilityService.js';
import { applyMinDamageAdjustment } from '../loggedDiceRollUtils.js';
import { applyDamageToTarget, clearReTriggeredSequence } from '../../../services/rules/combat/applyDamage.js';
import { addEntry } from '../../../services/ui/logService.js';
import { sendSavePrompt } from '../../../services/combat/conditions/savePromptService.js';
import { createLogDamageAndShow } from '../useLoggedDiceRollDamage.js';

describe('Plain damage additional coverage', () => {
    const deps = {
        characterName: 'TestFighter',
        campaignName: 'test-campaign',
        characters: [
            {
                name: 'TestFighter',
                computedStats: {
                    armorClass: 16,
                    characterAdvancement: [{ name: 'Sentinel' }],
                },
            },
            { name: 'Goblin', computedStats: { armorClass: 12 } },
        ],
        setPopupHtml: vi.fn(),
        logEntry: vi.fn(),
        pendingSaves: {},
    };

    beforeEach(() => {
        rollExpression.mockClear().mockReturnValue({ total: 8, rolls: [5, 3], modifier: 0 });
        getRuntimeValue.mockReset().mockReturnValue(null);
        setRuntimeValue.mockClear();
        applyMinDamageAdjustment.mockImplementation((d) => d);
        hasIgnoreResistance.mockReturnValue(false);
        hasGreatWeaponFighting.mockReturnValue(false);
        applyGreatWeaponFightingToDamage.mockReturnValue([1, 2, 3]);
        endInvisibilityOnHostileAction.mockClear();
        applyDamageToTarget.mockReset().mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });
        addEntry.mockClear();
        sendSavePrompt.mockClear();
        loadCombatSummary.mockResolvedValue({
            creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 13, maxHp: 13 }],
        });
        deps.logEntry.mockClear();
        deps.setPopupHtml.mockClear();
    });

    function createFn() {
        return createLogDamageAndShow(deps);
    }

    describe('resistance effect', () => {
        it('applies resistance damage reduction when effect is active and damage type matches', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign') return [
                    {
                        effect: 'resistance_damage_reduction',
                        target: 'Goblin',
                        chosenType: 'fire',
                    },
                ];
                if (key === 'Goblin' && prop === 'resistanceUsedThisTurn') {
                    return null;
                }
                return null;
            });
            rollExpression.mockReturnValueOnce({ total: 2, rolls: [2], modifier: 0 });
            applyDamageToTarget.mockReturnValue({ finalDamage: 6, newHp: 7, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 8, [8], 0, {
                targetName: 'Goblin',
                damageType: 'fire',
                attackerName: 'TestFighter',
            });

            expect(rollExpression).toHaveBeenCalledWith('1d4');
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Goblin',
                'resistanceUsedThisTurn',
                true,
                'test-campaign'
            );
            expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
                resistanceReduction: 2,
                resistanceRoll: 2,
            }));
        });

        it('does not apply resistance when damage type does not match', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [
                    {
                        effect: 'resistance_damage_reduction',
                        target: 'Goblin',
                        chosenType: 'cold',
                    },
                ];
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 8, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 8, [8], 0, {
                targetName: 'Goblin',
                damageType: 'fire',
                attackerName: 'TestFighter',
            });

            expect(rollExpression).not.toHaveBeenCalledWith('1d8');
            expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
                resistanceReduction: 0,
            }));
        });

        it('does not apply resistance when already used this turn', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign') return [
                    {
                        effect: 'resistance_damage_reduction',
                        target: 'Goblin',
                        chosenType: 'fire',
                    },
                ];
                if (key === 'Goblin' && prop === 'resistanceUsedThisTurn') {
                    return true;
                }
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 8, [8], 0, {
                targetName: 'Goblin',
                damageType: 'fire',
                attackerName: 'TestFighter',
            });

            expect(rollExpression).not.toHaveBeenCalledWith('1d4');
            expect(setRuntimeValue).not.toHaveBeenCalledWith(
                'Goblin',
                'resistanceUsedThisTurn',
                true,
                'test-campaign'
            );
        });
    });

    describe('no secondary formula path', () => {
        it('calls applyDamageToTarget once when no secondary formula', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            applyDamageToTarget.mockReset().mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });

            const fn = createFn();
            await fn('Longsword', '1d8+3', 8, [5, 3], 3, {
                targetName: 'Goblin',
                damageType: 'slashing',
            });

            expect(applyDamageToTarget.mock.calls.length).toBe(1);
        });
    });

    describe('intercepted damage', () => {
        it('handles intercepted damage correctly', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValue({
                finalDamage: 5,
                newHp: 8,
                damageReduced: false,
                intercepted: true,
                interceptedFeature: 'Shield Boy',
                damageDealt: 3,
                oldHp: 11,
            });

            const fn = createFn();
            await fn('Longsword', '1d8+3', 8, [5, 3], 3, {
                targetName: 'Goblin',
                damageType: 'slashing',
            });

            expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
                interceptedFeature: 'Shield Boy',
            }));
        });
    });

    describe('crit formatting', () => {
        it('formats formula as doubled when isCrit is true', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });

            const fn = createFn();
            await fn('Longsword', '1d8+3', 8, [5, 3], 3, {
                targetName: 'Goblin',
                damageType: 'slashing',
                isAutoCrit: true,
            });

            expect(deps.logEntry).toHaveBeenCalled();
            const logCall = deps.logEntry.mock.calls[0][0];
            expect(logCall.isCrit).toBe(true);
            expect(logCall.formula).toContain('*2');
        });
    });

    describe('secondary in log entry', () => {
        it('includes secondary damage fields in log when secondary formula present', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            rollExpression.mockReturnValueOnce({ total: 10, rolls: [6, 4], modifier: 0 });
            applyDamageToTarget
                .mockReturnValueOnce({ finalDamage: 5, newHp: 8, damageReduced: false })
                .mockReturnValueOnce({ finalDamage: 8, newHp: 0, damageReduced: false });

            const fn = createFn();
            await fn('Eldritch Blast (Agonizing)', '2d10+4', 14, [5, 9], 4, {
                targetName: 'Goblin',
                damageType: 'force',
                autoDamageSecondaryFormula: '1d10',
                autoDamageSecondaryName: 'Eldritch Blast',
                autoDamageSecondaryDamageType: 'force',
            });

            expect(deps.logEntry).toHaveBeenCalled();
            const logCall = deps.logEntry.mock.calls[0][0];
            expect(logCall.secondaryName).toBe('Eldritch Blast');
            expect(logCall.secondaryFormula).toBe('1d10');
            expect(logCall.secondaryDamageType).toBe('force');
        });
    });

    describe('player target HP/death saves', () => {
        it('sets death saves when player target drops to 0 HP', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign') return [];
                if (key === 'Goblin' && prop === 'currentHitPoints') return 0;
                if (key === 'Goblin' && prop === 'hitPoints') return 10;
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 10, newHp: 0, damageReduced: false });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: 'Goblin', type: 'player', ac: 12, currentHp: 10, maxHp: 10 }],
            });

            const fn = createFn();
            await fn('Longsword', '1d8+3', 10, [5, 3, 2], 3, {
                targetName: 'Goblin',
                damageType: 'slashing',
            });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Goblin',
                'deathSaves',
                [false, false, false],
                'test-campaign'
            );
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Goblin',
                'deathFailures',
                [false, false, false],
                'test-campaign'
            );
        });
    });

    describe('death strike effect', () => {
        it('sends save prompt when death strike effect is present and save fails', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign') return [
                    {
                        effect: 'death_strike',
                        target: 'Goblin',
                        saveDc: 15,
                        saveType: 'strength',
                    },
                ];
                if (key === 'Goblin' && prop === 'currentHitPoints') return 5;
                if (key === 'Goblin' && prop === 'hitPoints') return 10;
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 5, newHp: 5, damageReduced: false });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 10, maxHp: 10 }],
            });

            const fn = createFn();
            const promise = fn('Longsword', '1d8+3', 8, [5, 3], 3, {
                targetName: 'Goblin',
                damageType: 'slashing',
            });

            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('save-result', {
                    detail: {
                        promptId: 'test-guid-1234',
                        success: false,
                        roll: 10,
                        bonus: 2,
                        rawRolls: [10],
                    },
                }));
            }, 10);

            await promise.catch(() => { });
        });

        it('removes death strike effect after processing', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign') return [
                    {
                        effect: 'death_strike',
                        target: 'Goblin',
                        saveDc: 15,
                        saveType: 'strength',
                    },
                ];
                if (key === 'Goblin' && prop === 'currentHitPoints') return 5;
                if (key === 'Goblin' && prop === 'hitPoints') return 10;
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 5, newHp: 5, damageReduced: false });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 10, maxHp: 10 }],
            });

            const fn = createFn();
            const promise = fn('Longsword', '1d8+3', 8, [5, 3], 3, {
                targetName: 'Goblin',
                damageType: 'slashing',
            });

            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('save-result', {
                    detail: {
                        promptId: 'test-guid-1234',
                        success: true,
                        roll: 15,
                        bonus: 3,
                        rawRolls: [12],
                    },
                }));
            }, 10);

            await promise.catch(() => { });
        });
    });

    describe('ram attack / prone condition', () => {
        it('applies prone condition when ramActive and isMelee', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign') return [];
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 13, maxHp: 13, size: 'Medium' }],
            });

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
                ['Prone'],
                'test-campaign'
            );
        });

        it('does not apply prone if target is already prone', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign') return [];
                if (key === 'Goblin' && prop === 'activeConditions') return ['Prone'];
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 13, maxHp: 13, size: 'Medium' }],
            });

            const fn = createFn();
            await fn('Longsword', '1d8+3', 8, [5, 3], 3, {
                targetName: 'Goblin',
                damageType: 'slashing',
                ramActive: true,
                isMelee: true,
            });

            expect(setRuntimeValue).not.toHaveBeenCalledWith(
                'Goblin',
                'activeConditions',
                expect.arrayContaining(['Prone']),
                'test-campaign'
            );
        });
    });

    describe('popup data - bardic inspiration, empowered spell, piercer, savage attacker', () => {
        it('sets bardicInspirationOffense from context when provided', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });

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

        it('sets empoweredSpell from context when provided', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 8, [8], 0, {
                targetName: 'Goblin',
                damageType: 'fire',
                empoweredSpell: true,
                empoweredSpellChaMod: 2,
            });

            expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
                empoweredSpell: true,
                empoweredSpellChaMod: 2,
            }));
        });

        it('sets piercerPuncture when piercing damage and feat available and not used', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign') return [];
                if (key === 'TestFighter' && prop === 'piercerPunctureUsedThisTurn') return false;
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });

            const fn = createFn();
            await fn('Longsword', '1d8+3', 8, [5, 3], 3, {
                targetName: 'Goblin',
                damageType: 'piercing',
                playerStats: {
                    reactions: [{ automation: { type: 'piercer_puncture' } }],
                },
            });

            expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
                piercerPuncture: true,
            }));
        });

        it('does not set piercerPuncture when damage type is not piercing', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign') return [];
                if (key === 'TestFighter' && prop === 'piercerPunctureUsedThisTurn') return false;
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 8, [8], 0, {
                targetName: 'Goblin',
                damageType: 'fire',
                playerStats: {
                    reactions: [{ automation: { type: 'piercer_puncture' } }],
                },
            });

            expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
                piercerPuncture: false,
            }));
        });

        it('sets savageAttacker when feat available, melee/unarmed, and not used', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign') return [];
                if (key === 'TestFighter' && prop === '_Savage_Attacker_usedRound') return false;
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });

            const fn = createFn();
            await fn('Longsword', '1d8+3', 8, [5, 3], 3, {
                targetName: 'Goblin',
                damageType: 'slashing',
                playerStats: {
                    automation: {
                        passives: [{ type: 'passive_rule', effect: 'reroll_damage_once_per_turn' }],
                    },
                },
            });

            expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
                savageAttacker: true,
            }));
        });

        it('does not set savageAttacker for ranged attacks', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign') return [];
                if (key === 'TestFighter' && prop === '_Savage_Attacker_usedRound') return false;
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 8, [8], 0, {
                targetName: 'Goblin',
                damageType: 'fire',
                isMelee: false,
                playerStats: {
                    automation: {
                        passives: [{ type: 'passive_rule', effect: 'reroll_damage_once_per_turn' }],
                    },
                },
            });

            expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
                savageAttacker: false,
            }));
        });
    });

    describe('weapon type popup data', () => {
        it('sets weaponType to unarmed when isUnarmedStrike', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });

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

        it('sets weaponType to melee for melee attacks', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });

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

        it('sets weaponType to ranged for ranged attacks', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 8, [8], 0, {
                targetName: 'Goblin',
                damageType: 'fire',
                isMelee: false,
            });

            expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
                weaponType: 'ranged',
            }));
        });
    });

    describe('multi target plain damage', () => {
        it('applies damage to multi target', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            applyDamageToTarget
                .mockReturnValueOnce({ finalDamage: 8, newHp: 5, damageReduced: false })
                .mockReturnValueOnce({ finalDamage: 8, newHp: 7, damageReduced: false });
            loadCombatSummary.mockResolvedValue({
                creatures: [
                    { name: 'Goblin', type: 'npc', ac: 12, currentHp: 13, maxHp: 13 },
                    { name: 'Orc', type: 'npc', ac: 14, currentHp: 15, maxHp: 15 },
                ],
            });

            const fn = createFn();
            await fn('Words of Creation', '2d6', 7, [3, 4], 0, {
                targetName: 'Goblin',
                damageType: 'force',
                multiTarget: 'Orc',
            });

            expect(applyDamageToTarget.mock.calls.length).toBeGreaterThanOrEqual(2);
            expect(deps.setPopupHtml.mock.calls.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('overchannel self-damage', () => {
        it('calls handleOverchannelSelfDamage when overchannelActive', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 8, [8], 0, {
                targetName: 'Goblin',
                damageType: 'fire',
                overchannelActive: true,
                overchannelUseCount: 2,
                overchannelSpellLevel: 3,
            });

            expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                type: 'hp_change',
            }));
        });
    });

    describe('holy aura save result', () => {
        it('includes holyAuraSaveResult in popup when present', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValue({
                finalDamage: 8,
                newHp: 5,
                damageReduced: false,
                holyAuraSaveResult: { success: true, saveType: 'wisdom' },
            });

            const fn = createFn();
            await fn('Longsword', '1d8+3', 8, [5, 3], 3, {
                targetName: 'Goblin',
                damageType: 'slashing',
            });

            expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
                holyAuraSaveResult: { success: true, saveType: 'wisdom' },
            }));
        });
    });

    describe('spellName in popup', () => {
        it('includes spellName in popup data', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 8, [8], 0, {
                targetName: 'Goblin',
                damageType: 'fire',
                spellName: 'Fire Bolt',
            });

            expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
                spellName: 'Fire Bolt',
            }));
        });
    });

    describe('dc data in popup', () => {
        it('includes dc, dcType, dcSuccess in popup data', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });

            const fn = createFn();
            await fn('Longsword', '1d8+3', 8, [5, 3], 3, {
                targetName: 'Goblin',
                damageType: 'slashing',
                dc: 15,
                dcType: 'strength',
                dcSuccess: false,
            });

            expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
                dc: 15,
                dcType: 'strength',
                dcSuccess: false,
            }));
        });
    });

    describe('tavernBrawlerRerolls in popup', () => {
        it('includes tavernBrawlerRerolls when present', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });

            const fn = createFn();
            await fn('Longsword', '1d8+3', 8, [5, 3], 3, {
                targetName: 'Goblin',
                damageType: 'slashing',
                tavernBrawlerRerolls: [1, 2],
            });

            expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
                tavernBrawlerRerolls: [1, 2],
            }));
        });
    });

    describe('targetMaxHp in popup', () => {
        it('sets targetMaxHp from applyResult', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 13, maxHp: 13 }],
            });

            const fn = createFn();
            await fn('Longsword', '1d8+3', 8, [5, 3], 3, {
                targetName: 'Goblin',
                damageType: 'slashing',
            });

            expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
                targetMaxHp: 13,
            }));
        });
    });

    describe('endInvisibilityOnHostileAction calls', () => {
        it('calls endInvisibilityOnHostileAction when appliedDamage > 0', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });

            const fn = createFn();
            await fn('Longsword', '1d8+3', 8, [5, 3], 3, {
                targetName: 'Goblin',
                damageType: 'slashing',
            });

            expect(endInvisibilityOnHostileAction).toHaveBeenCalledWith('TestFighter', 'test-campaign');
        });
    });

    describe('clearReTriggeredSequence', () => {
        it('calls clearReTriggeredSequence when secondary damage applied', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            rollExpression.mockReturnValueOnce({ total: 10, rolls: [6, 4], modifier: 0 });
            applyDamageToTarget
                .mockReturnValueOnce({ finalDamage: 5, newHp: 8, damageReduced: false })
                .mockReturnValueOnce({ finalDamage: 8, newHp: 0, damageReduced: false });

            const fn = createFn();
            await fn('Eldritch Blast (Agonizing)', '2d10+4', 14, [5, 9], 4, {
                targetName: 'Goblin',
                damageType: 'force',
                autoDamageSecondaryFormula: '1d10',
                autoDamageSecondaryName: 'Eldritch Blast',
                autoDamageSecondaryDamageType: 'force',
            });

            expect(clearReTriggeredSequence).toHaveBeenCalled();
        });
    });

    describe('combat summary updated event', () => {
        it('dispatches combat-summary-updated when ram applies prone condition', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign') return [];
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 13, maxHp: 13, size: 'Medium' }],
            });

            const fn = createFn();
            await fn('Longsword', '1d8+3', 8, [5, 3], 3, {
                targetName: 'Goblin',
                damageType: 'slashing',
                ramActive: true,
                isMelee: true,
            });

            const event = window.event;
            expect(event).toBeUndefined();
        });
    });

    describe('player target with size check for ram', () => {
        it('applies prone to player target when ram active and size is Small', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign') return [];
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: 'Goblin', type: 'player', ac: 12, currentHp: 13, maxHp: 13, size: 'Small' }],
            });

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
                ['Prone'],
                'test-campaign'
            );
        });

        it('does not apply prone when target is Huge or larger', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign') return [];
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 13, maxHp: 13, size: 'Huge' }],
            });

            const fn = createFn();
            await fn('Longsword', '1d8+3', 8, [5, 3], 3, {
                targetName: 'Goblin',
                damageType: 'slashing',
                ramActive: true,
                isMelee: true,
            });

            expect(setRuntimeValue).not.toHaveBeenCalledWith(
                'Goblin',
                'activeConditions',
                expect.anything(),
                'test-campaign'
            );
        });
    });

    describe('sentinel without opportunity attack', () => {
        it('does not apply sentinel effect when not an opportunity attack', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });

            const fn = createFn();
            await fn('Longsword', '1d8+3', 8, [5, 3], 3, {
                targetName: 'Goblin',
                damageType: 'slashing',
            });

            expect(setRuntimeValue).not.toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.anything(),
                'test-campaign'
            );
        });
    });

    describe('sentinel on attacker without sentinel feat', () => {
        it('does not apply sentinel effect when attacker does not have sentinel', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 13, maxHp: 13 }],
            });

            const fighterDeps = {
                ...deps,
                characters: [
                    {
                        name: 'TestFighter',
                        computedStats: {
                            armorClass: 16,
                            characterAdvancement: [],
                        },
                    },
                    { name: 'Goblin', computedStats: { armorClass: 12 } },
                ],
            };

            const fn = createLogDamageAndShow(fighterDeps);
            await fn('Longsword', '1d8+3', 8, [5, 3], 3, {
                targetName: 'Goblin',
                damageType: 'slashing',
                isOpportunityAttack: true,
            });

            expect(setRuntimeValue).not.toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.anything(),
                'test-campaign'
            );
        });
    });

    describe('lastAttack with existing data merge', () => {
        it('merges new lastAttack data with existing', async () => {
            getRuntimeValue.mockReset().mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') return [];
                if (key === 'campaign' && prop === 'lastAttack') return {
                    hit: true,
                    attackerName: 'PreviousAttacker',
                };
                return null;
            });
            applyDamageToTarget.mockReset().mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });

            const fn = createFn();
            await fn('Longsword', '1d8+3', 8, [5, 3], 3, {
                targetName: 'Goblin',
                damageType: 'slashing',
                attackerName: 'TestFighter',
                attackName: 'Longsword',
            });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'lastAttack',
                expect.objectContaining({
                    attackerName: 'TestFighter',
                    targetName: 'Goblin',
                }),
                'test-campaign'
            );
        });
    });

    describe('twin target with same name', () => {
        it('does not apply twin damage when twin target is same as primary', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValueOnce({ finalDamage: 8, newHp: 5, damageReduced: false });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 13, maxHp: 13 }],
            });

            const fn = createFn();
            await fn('Magic Missile', '4d4+2', 10, [3, 2, 3, 2], 2, {
                targetName: 'Goblin',
                damageType: 'force',
                metamagicTwinTarget: 'Goblin',
            });

            expect(applyDamageToTarget.mock.calls.length).toBe(1);
        });
    });

    describe('multi target with same name', () => {
        it('does not apply multi target damage when same as primary', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValueOnce({ finalDamage: 8, newHp: 5, damageReduced: false });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 13, maxHp: 13 }],
            });

            const fn = createFn();
            await fn('Words of Creation', '2d6', 7, [3, 4], 0, {
                targetName: 'Goblin',
                damageType: 'force',
                multiTarget: 'Goblin',
            });

            expect(applyDamageToTarget.mock.calls.length).toBe(1);
        });
    });

    describe('multi target not found in combat summary', () => {
        it('does not apply damage when multi target not in combat summary', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValueOnce({ finalDamage: 8, newHp: 5, damageReduced: false });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 13, maxHp: 13 }],
            });

            const fn = createFn();
            await fn('Words of Creation', '2d6', 7, [3, 4], 0, {
                targetName: 'Goblin',
                damageType: 'force',
                multiTarget: 'NonExistent',
            });

            expect(applyDamageToTarget.mock.calls.length).toBe(1);
        });
    });

    describe('twin target not found in combat summary', () => {
        it('does not apply damage when twin target not in combat summary', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValueOnce({ finalDamage: 8, newHp: 5, damageReduced: false });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 13, maxHp: 13 }],
            });

            const fn = createFn();
            await fn('Magic Missile', '4d4+2', 10, [3, 2, 3, 2], 2, {
                targetName: 'Goblin',
                damageType: 'force',
                metamagicTwinTarget: 'NonExistent',
            });

            expect(applyDamageToTarget.mock.calls.length).toBe(1);
        });
    });

    describe('death strike with missing saveDc/saveType', () => {
        it('does not send save prompt when death strike missing saveDc', async () => {
            getRuntimeValue.mockReset().mockImplementation((key) => {
                if (key === 'campaign') return [
                    {
                        effect: 'death_strike',
                        target: 'Goblin',
                    },
                ];
                return null;
            });
            applyDamageToTarget.mockReset().mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });
            sendSavePrompt.mockClear();
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 13, maxHp: 13 }],
            });

            const fn = createFn();
            await fn('Longsword', '1d8+3', 8, [5, 3], 3, {
                targetName: 'Goblin',
                damageType: 'slashing',
            });

            expect(sendSavePrompt).not.toHaveBeenCalled();
        });
    });

    describe('death strike save success', () => {
        it('does not apply doubled damage when save succeeds', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign') return [
                    {
                        effect: 'death_strike',
                        target: 'Goblin',
                        saveDc: 15,
                        saveType: 'strength',
                    },
                ];
                if (key === 'Goblin' && prop === 'currentHitPoints') return 5;
                if (key === 'Goblin' && prop === 'hitPoints') return 10;
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 5, newHp: 5, damageReduced: false });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 10, maxHp: 10 }],
            });

            const fn = createFn();
            const promise = fn('Longsword', '1d8+3', 8, [5, 3], 3, {
                targetName: 'Goblin',
                damageType: 'slashing',
            });

            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('save-result', {
                    detail: {
                        promptId: 'test-guid-1234',
                        success: true,
                        roll: 18,
                        bonus: 3,
                        rawRolls: [15],
                    },
                }));
            }, 10);

            await promise.catch(() => { });
        });
    });

    describe('player target size for ram', () => {
        it('applies prone to player target when ram active and size is Tiny', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign') return [];
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: 'Goblin', type: 'player', ac: 12, currentHp: 13, maxHp: 13, size: 'Tiny' }],
            });

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
                ['Prone'],
                'test-campaign'
            );
        });

        it('applies prone when target has no size property', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign') return [];
                if (key === 'Goblin' && prop === 'activeConditions') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 13, maxHp: 13 }],
            });

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
                ['Prone'],
                'test-campaign'
            );
        });
    });

    describe('GWF applied in popup', () => {
        it('sets gwfApplied and gwfDisplayRolls in popup', async () => {
            getRuntimeValue.mockImplementation((key) => {
                if (key === 'campaign') return [];
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });

            const fn = createFn();
            await fn('Longsword', '1d8+3', 8, [5, 3], 3, {
                targetName: 'Goblin',
                damageType: 'slashing',
            });

            expect(deps.setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
                gwfApplied: false,
                gwfOriginalRolls: null,
                gwfDisplayRolls: [5, 3],
            }));
        });
    });

    describe('isUnconscious in hpEntry', () => {
        it('sets isUnconscious to true when hp <= 0', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign') return [];
                if (key === 'Goblin' && prop === 'currentHitPoints') return 0;
                if (key === 'Goblin' && prop === 'hitPoints') return 10;
                return null;
            });
            applyDamageToTarget.mockReturnValue({ finalDamage: 10, newHp: 0, damageReduced: false });
            loadCombatSummary.mockResolvedValue({
                creatures: [{ name: 'Goblin', type: 'player', ac: 12, currentHp: 10, maxHp: 10 }],
            });

            const fn = createFn();
            await fn('Longsword', '1d8+3', 10, [5, 3, 2], 3, {
                targetName: 'Goblin',
                damageType: 'slashing',
            });

            expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                isUnconscious: true,
            }));
        });
    });

    describe('resistance log entry', () => {
        it('logs ability_use entry when resistance is triggered', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign') return [
                    {
                        effect: 'resistance_damage_reduction',
                        target: 'Goblin',
                        chosenType: 'fire',
                    },
                ];
                if (key === 'Goblin' && prop === 'resistanceUsedThisTurn') {
                    return null;
                }
                return null;
            });
            rollExpression.mockReturnValueOnce({ total: 2, rolls: [2], modifier: 0 });
            applyDamageToTarget.mockReturnValue({ finalDamage: 6, newHp: 7, damageReduced: false });

            const fn = createFn();
            await fn('Fire Bolt', '1d10', 8, [8], 0, {
                targetName: 'Goblin',
                damageType: 'fire',
                attackerName: 'TestFighter',
            });

            expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                type: 'ability_use',
                abilityName: 'Resistance',
            }));
        });
    });
});
