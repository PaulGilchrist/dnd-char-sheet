import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../combat/automation/automationExpressions.js', () => ({
    evaluateAutoExpression: vi.fn(),
}));

vi.mock('../../../rules/combat/applyHealing.js', () => ({
    applyHealingToTarget: vi.fn(),
}));

vi.mock('../../../encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(),
}));

import { applyRegenerateEffect } from './regenerateHandler.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { getCombatSummary } from '../../../encounters/combatData.js';
import { evaluateAutoExpression } from '../../../combat/automation/automationExpressions.js';
import { applyHealingToTarget } from '../../../rules/combat/applyHealing.js';
import { addEntry } from '../../../ui/logService.js';
const campaignName = 'TestCampaign';
const casterName = 'Cleric1';
function makePlayerStats(overrides = {}) {
    return {
        name: casterName,
        level: 7,
        proficiency: 4,
        abilities: [{ name: 'Wisdom', bonus: 3 }],
        hitPoints: 50,
        ...overrides,
    };
}

function makeAction(overrides = {}) {
    return {
        name: 'Regenerate',
        automation: { ...overrides.automation },
        spell: {
            name: 'Regenerate',
            range: 'Touch',
            level: 7,
            ...overrides.spell,
        },
        ...Object.fromEntries(
            Object.entries(overrides).filter(([k]) => !['spell', 'automation'].includes(k)),
        ),
    };
}

const baseCombatSummary = {
    creatures: [
        { name: 'Goblin', type: 'monster', maxHp: 7, currentHp: 3 },
        { name: 'Orc', type: 'monster', maxHp: 15, currentHp: 10 },
        { name: casterName, type: 'player', maxHp: 50, currentHp: 25 },
    ],
};

describe('applyRegenerateEffect', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        evaluateAutoExpression.mockReturnValue(18);
    });

    describe('input validation', () => {
        it('should return null when targetName is missing', async () => {
            const result = await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                null,
            );
            expect(result).toBeNull();
        });

        it('should return null when targetName is undefined', async () => {
            const result = await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                undefined,
            );
            expect(result).toBeNull();
        });

        it('should return null when targetName is empty string', async () => {
            const result = await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                '',
            );
            expect(result).toBeNull();
        });
    });

    describe('healing calculation', () => {
        it('should use default expression 4d8+15 when no heal_at_slot_level', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue(5);

            await applyRegenerateEffect(
                makeAction({ spell: { name: 'Regenerate' } }),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            expect(evaluateAutoExpression).toHaveBeenCalledWith('4d8 + 15', expect.any(Object));
        });

        it('should use heal_at_slot_level expression when available at current slot', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue(5);

            await applyRegenerateEffect(
                makeAction({ spell: { level: 7, heal_at_slot_level: { '7': '6d8 + 20' } } }),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            expect(evaluateAutoExpression).toHaveBeenCalledWith('6d8 + 20', expect.any(Object));
        });

        it('should fall back to highest slot level when current slot not in heal_at_slot_level', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue(5);

            // slot 7 not in heal_at_slot_level, should fall back to 5 (highest available)
            await applyRegenerateEffect(
                makeAction({ spell: { level: 7, heal_at_slot_level: { '5': '3d8 + 10' } } }),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            expect(evaluateAutoExpression).toHaveBeenCalledWith('3d8 + 10', expect.any(Object));
        });

        it('should default to 33 when expression evaluation returns non-positive number', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue(5);
            evaluateAutoExpression.mockReturnValue(-5);

            await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            // actualHeal = min(33, 7 - 5) = 2
            expect(applyHealingToTarget).toHaveBeenCalled();
        });

        it('should default to 33 when expression evaluation returns zero', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue(5);
            evaluateAutoExpression.mockReturnValue(0);

            await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            expect(applyHealingToTarget).toHaveBeenCalled();
        });

        it('should use evaluated expression result as heal amount', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue(5);
            evaluateAutoExpression.mockReturnValue(25);

            await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            // actualHeal = min(25, 7 - 5) = 2 (capped at maxHp - currentHp)
            expect(applyHealingToTarget).toHaveBeenCalledWith(
                baseCombatSummary,
                'Goblin',
                2,
                campaignName,
            );
        });
    });

    describe('healing cap at max HP', () => {
        it('should cap healing so target does not exceed maxHp', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue(6); // Goblin has maxHp=7, currentHp=6

            await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            // actualHeal = min(25, 7 - 6) = 1
            expect(applyHealingToTarget).toHaveBeenCalledWith(
                baseCombatSummary,
                'Goblin',
                1,
                campaignName,
            );
        });

        it('should not heal if target is already at max HP', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue(7); // Goblin at maxHp=7
            evaluateAutoExpression.mockReturnValue(25);

            await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            expect(applyHealingToTarget).not.toHaveBeenCalled();
        });

        it('should cap healing for targets with no runtime HP stored', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue(null);
            evaluateAutoExpression.mockReturnValue(100);

            await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Orc',
            );

            // Orc: maxHp=15, creature.currentHp=10, actualHeal = min(100, 15-10) = 5
            expect(applyHealingToTarget).toHaveBeenCalledWith(
                baseCombatSummary,
                'Orc',
                5,
                campaignName,
            );
        });
    });

    describe('HP source resolution', () => {
        it('should use runtime currentHitPoints when stored', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockImplementation((target, key) => {
                if (key === 'currentHitPoints') return 2;
                if (key === 'targetEffects') return [];
                return null;
            });
            evaluateAutoExpression.mockReturnValue(50);

            await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            // Goblin: maxHp=7, runtime currentHp=2, actualHeal = min(50, 7-2) = 5
            expect(applyHealingToTarget).toHaveBeenCalledWith(
                baseCombatSummary,
                'Goblin',
                5,
                campaignName,
            );
        });

        it('should fall back to creature.currentHp when runtime is null', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue(null);
            evaluateAutoExpression.mockReturnValue(50);

            await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            // Goblin: maxHp=7, creature.currentHp=3, actualHeal = min(50, 7-3) = 4
            expect(applyHealingToTarget).toHaveBeenCalledWith(
                baseCombatSummary,
                'Goblin',
                4,
                campaignName,
            );
        });

        it('should fall back to creature.currentHp when runtime is empty string', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue('');
            evaluateAutoExpression.mockReturnValue(50);

            await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            expect(applyHealingToTarget).toHaveBeenCalledWith(
                baseCombatSummary,
                'Goblin',
                4,
                campaignName,
            );
        });

        it('should fall back to playerStats.hitPoints when creature has no currentHp', async () => {
            const cs = {
                creatures: [
                    { name: 'Goblin', type: 'monster', maxHp: 7, currentHp: undefined },
                ],
            };
            getCombatSummary.mockReturnValue(cs);
            getRuntimeValue.mockReturnValue(null);
            evaluateAutoExpression.mockReturnValue(50);

            await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            // maxHp=7, fallback to playerStats.hitPoints=50, actualHeal = min(50, 7-50) = negative, no heal
            expect(applyHealingToTarget).not.toHaveBeenCalled();
        });
    });

    describe('regenerateActive flag', () => {
        it('should set regenerateActive=true on target', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue([]);
            evaluateAutoExpression.mockReturnValue(10);

            await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Goblin',
                'regenerateActive',
                true,
                campaignName,
            );
        });
    });

    describe('targetEffects badge registration', () => {
        it('should add a target effect entry for the target', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue([]);
            evaluateAutoExpression.mockReturnValue(10);

            await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([
                    expect.objectContaining({
                        target: 'Goblin',
                        effect: 'regenerate',
                        source: casterName,
                    }),
                ]),
                campaignName,
            );
        });

        it('should preserve existing targetEffects entries', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue([
                { target: 'Goblin', effect: 'faerie_fire', source: 'Wizard' },
            ]);
            evaluateAutoExpression.mockReturnValue(10);

            await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([
                    expect.objectContaining({ effect: 'faerie_fire' }),
                    expect.objectContaining({ effect: 'regenerate' }),
                ]),
                campaignName,
            );
        });

        it('should remove existing regenerate effect before adding new one', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue([
                { target: 'Goblin', effect: 'regenerate', source: 'OldCaster' },
                { target: 'Orc', effect: 'faerie_fire', source: 'Wizard' },
            ]);
            evaluateAutoExpression.mockReturnValue(10);

            await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            // Should only have one regenerate effect for Goblin
            const call = setRuntimeValue.mock.calls.find(
                ([, key]) => key === 'targetEffects',
            );
            const newEffects = call[2];
            const regenerateEffects = newEffects.filter(
                (te) => te.target === 'Goblin' && te.effect === 'regenerate',
            );
            expect(regenerateEffects.length).toBe(1);
            expect(regenerateEffects[0].source).toBe(casterName);
        });

        it('should not remove regenerate effects from other targets', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue([
                { target: 'Orc', effect: 'regenerate', source: 'OtherCleric' },
            ]);
            evaluateAutoExpression.mockReturnValue(10);

            await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            const call = setRuntimeValue.mock.calls.find(
                ([, key]) => key === 'targetEffects',
            );
            const newEffects = call[2];
            const orcRegen = newEffects.filter(
                (te) => te.target === 'Orc' && te.effect === 'regenerate',
            );
            expect(orcRegen.length).toBe(1);
            expect(orcRegen[0].source).toBe('OtherCleric');
        });

        it('should handle null targetEffects gracefully', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue(null);
            evaluateAutoExpression.mockReturnValue(10);

            await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([
                    expect.objectContaining({ effect: 'regenerate' }),
                ]),
                campaignName,
            );
        });

        it('should handle non-array targetEffects gracefully', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue('not-an-array');
            evaluateAutoExpression.mockReturnValue(10);

            await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([
                    expect.objectContaining({ effect: 'regenerate' }),
                ]),
                campaignName,
            );
        });
    });

    describe('logging', () => {
        it('should log an hp_change entry for the initial heal', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue([]);
            evaluateAutoExpression.mockReturnValue(10);

            await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            const hpCalls = addEntry.mock.calls.filter(
                ([, entry]) => entry.type === 'hp_change',
            );
            expect(hpCalls.length).toBeGreaterThan(0);
            const hpEntry = hpCalls[0][1];
            expect(hpEntry.targetName).toBe('Goblin');
            expect(hpEntry.delta).toBeGreaterThan(0);
            expect(hpEntry.isHealing).toBe(true);
            expect(hpEntry.sourceName).toBe(casterName);
            expect(hpEntry.note).toBe('Regenerate');
            expect(hpEntry.formula).toBe('4d8 + 15');
        });

        it('should log an ability_use entry', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue([]);
            evaluateAutoExpression.mockReturnValue(10);

            await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            const abilityCalls = addEntry.mock.calls.filter(
                ([, entry]) => entry.type === 'ability_use',
            );
            expect(abilityCalls.length).toBeGreaterThan(0);
            const abilityEntry = abilityCalls[0][1];
            expect(abilityEntry.characterName).toBe(casterName);
            expect(abilityEntry.abilityName).toBe('Regenerate');
            expect(abilityEntry.targetName).toBe('Goblin');
            expect(abilityEntry.description).toContain('Regained');
            expect(abilityEntry.description).toContain('HP');
        });

        it('should log a spell_effect entry', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue([]);
            evaluateAutoExpression.mockReturnValue(10);

            await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            const spellCalls = addEntry.mock.calls.filter(
                ([, entry]) => entry.type === 'spell_effect',
            );
            expect(spellCalls.length).toBeGreaterThan(0);
            const spellEntry = spellCalls[0][1];
            expect(spellEntry.characterName).toBe(casterName);
            expect(spellEntry.spellName).toBe('Regenerate');
            expect(spellEntry.targetName).toBe('Goblin');
            expect(spellEntry.effects).toContainEqual(expect.stringContaining('Initial heal'));
            expect(spellEntry.effects).toContainEqual(expect.stringContaining('1 HP/turn'));
        });

        it('should use the resolved expression as formula in hp_change log', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue([]);

            await applyRegenerateEffect(
                makeAction({ spell: { level: 7, heal_at_slot_level: { '7': '6d8 + 20' } } }),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            const hpCalls = addEntry.mock.calls.filter(
                ([, entry]) => entry.type === 'hp_change',
            );
            expect(hpCalls[0][1].formula).toBe('6d8 + 20');
        });

        it('should log healing for the caster as source when healing self', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue([]);
            evaluateAutoExpression.mockReturnValue(10);

            await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                casterName,
            );

            const abilityCalls = addEntry.mock.calls.filter(
                ([, entry]) => entry.type === 'ability_use',
            );
            expect(abilityCalls[0][1].sourceName || abilityCalls[0][1].characterName).toBe(casterName);
        });
    });

    describe('return value', () => {
        it('should return popup with automation_info type', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue([]);
            evaluateAutoExpression.mockReturnValue(10);

            const result = await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Regenerate');
        });

        it('should include description with target name and heal amount', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue(null);
            evaluateAutoExpression.mockReturnValue(20);

            const result = await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            // Goblin: maxHp=7, creature.currentHp=3, actualHeal = min(20, 7-3) = 4
            expect(result.payload.description).toContain('Goblin');
            expect(result.payload.description).toContain('4 HP');
            expect(result.payload.description).toContain('1 HP per turn');
        });

        it('should describe ongoing effect in popup', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue([]);
            evaluateAutoExpression.mockReturnValue(20);

            const result = await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            expect(result.payload.description).toContain('restored to full HP');
        });

        it('should not call applyHealingToTarget when actualHeal is 0', async () => {
            getCombatSummary.mockReturnValue(baseCombatSummary);
            getRuntimeValue.mockReturnValue(7); // Goblin at maxHp=7
            evaluateAutoExpression.mockReturnValue(20);

            const result = await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            expect(applyHealingToTarget).not.toHaveBeenCalled();
            expect(result.type).toBe('popup');
        });

        it('should not call applyHealingToTarget when combatSummary is null', async () => {
            getCombatSummary.mockReturnValue(null);
            getRuntimeValue.mockReturnValue([]);
            evaluateAutoExpression.mockReturnValue(10);

            const result = await applyRegenerateEffect(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
                'Goblin',
            );

            expect(applyHealingToTarget).not.toHaveBeenCalled();
            expect(result.type).toBe('popup');
        });
    });
});
