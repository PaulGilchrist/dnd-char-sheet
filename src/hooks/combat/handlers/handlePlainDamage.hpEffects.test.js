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

import { getRuntimeValue, setRuntimeValue } from '../../runtime/useRuntimeState.js';
import { loadCombatSummary } from '../../../services/encounters/combatData.js';
import { applyDamageToTarget } from '../../../services/rules/combat/applyDamage.js';
import { addEntry } from '../../../services/ui/logService.js';
import { rollExpression } from '../../../services/dice/diceRoller.js';
import { createLogDamageAndShow } from '../useLoggedDiceRollDamage.js';

describe('Plain damage HP/condition effects', () => {
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
        setRuntimeValue.mockClear();
        applyDamageToTarget.mockReset().mockReturnValue({ finalDamage: 8, newHp: 5, damageReduced: false });
        addEntry.mockClear();
        rollExpression.mockClear().mockReturnValue({ total: 8, rolls: [5, 3], modifier: 0 });
        loadCombatSummary.mockResolvedValue({
            creatures: [{ name: 'Goblin', type: 'npc', ac: 12, currentHp: 13, maxHp: 13 }],
        });
        deps.logEntry.mockClear();
        deps.setPopupHtml.mockClear();
    });

    function createFn() {
        return createLogDamageAndShow(deps);
    }

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
