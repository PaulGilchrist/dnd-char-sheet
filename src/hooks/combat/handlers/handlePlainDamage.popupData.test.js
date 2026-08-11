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

import { getRuntimeValue } from '../../runtime/useRuntimeState.js';
import { loadCombatSummary } from '../../../services/encounters/combatData.js';
import { applyDamageToTarget } from '../../../services/rules/combat/applyDamage.js';
import { createLogDamageAndShow } from '../useLoggedDiceRollDamage.js';

describe('Plain damage popup data', () => {
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
        getRuntimeValue.mockReset().mockReturnValue(null);
        applyDamageToTarget.mockReset().mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });
        loadCombatSummary.mockResolvedValue({
            creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 13, maxHp: 13 }],
        });
        deps.logEntry.mockClear();
        deps.setPopupHtml.mockClear();
    });

    function createFn() {
        return createLogDamageAndShow(deps);
    }

    describe('bardic inspiration, empowered spell, piercer, savage attacker', () => {
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
});
