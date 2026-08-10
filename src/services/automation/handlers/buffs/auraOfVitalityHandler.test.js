// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks BEFORE imports ─────────────────────────────────────────

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../rules/effects/expirations.js', () => ({
    addExpiration: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(),
}));

vi.mock('../../../combat/concentration/concentrationService.js', () => ({
    addConcentration: vi.fn(),
}));

vi.mock('../../../rules/combat/applyHealing.js', () => ({
    applyHealingToTarget: vi.fn().mockReturnValue({ actualHeal: 7, oldHp: 10, newHp: 17 }),
}));

vi.mock('../../../dice/diceRoller.js', () => ({
    rollExpression: vi.fn().mockReturnValue({ total: 7, rolls: [4, 3], modifier: 0, formula: '2d6' }),
}));

// ── Imports ──────────────────────────────────────────────────────

import { handle, applyAuraOfVitality, isAuraOfVitalityActive } from './auraOfVitalityHandler.js';

import * as useRuntimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as expirations from '../../../rules/effects/expirations.js';
import * as logService from '../../../ui/logService.js';
import * as combatData from '../../../encounters/combatData.js';
import * as concentrationService from '../../../combat/concentration/concentrationService.js';
import * as applyHealing from '../../../rules/combat/applyHealing.js';
import * as diceRoller from '../../../dice/diceRoller.js';

// ── Helpers ──────────────────────────────────────────────────────

const campaignName = 'test-campaign';

function makePlayerStats(overrides = {}) {
    return {
        name: 'Cleric',
        concentrationBonus: 2,
        ...overrides,
    };
}

function makeCombatSummary(creatureNames = []) {
    return {
        creatures: creatureNames.map((name) => ({ name, maxHp: 50, currentHp: name === 'Cleric' ? 25 : 40 })),
    };
}

// ── Tests ────────────────────────────────────────────────────────

describe('auraOfVitalityHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(diceRoller.rollExpression).mockReturnValue({ total: 7, rolls: [4, 3], modifier: 0, formula: '2d6' });
    });

    describe('handle', () => {
        it('returns popup with all creature targets', async () => {
            combatData.getCombatSummary.mockReturnValue(
                makeCombatSummary(['Cleric', 'Ally1', 'Ally2', 'Enemy1'])
            );

            const action = {
                name: 'Aura of Vitality',
                automation: { type: 'aura_of_vitality' },
            };
            const result = await handle(action, makePlayerStats(), campaignName, null);

            expect(result).toEqual({
                type: 'popup',
                payload: expect.objectContaining({
                    type: 'automation_info',
                    name: 'Aura of Vitality',
                    creatureTargets: ['Cleric', 'Ally1', 'Ally2', 'Enemy1'],
                    maxTargets: 1,
                }),
            });
        });

        it('returns error popup when no combat context', async () => {
            combatData.getCombatSummary.mockReturnValue(null);

            const action = {
                name: 'Aura of Vitality',
                automation: { type: 'aura_of_vitality' },
            };
            const result = await handle(action, makePlayerStats(), campaignName, null);

            expect(result).toEqual({
                type: 'popup',
                payload: expect.objectContaining({
                    type: 'automation_info',
                    description: expect.stringContaining('No combat context found'),
                }),
            });
        });

        it('passes empty automation object when action.automation is falsy', async () => {
            combatData.getCombatSummary.mockReturnValue(
                makeCombatSummary(['Cleric', 'Ally1'])
            );

            const action = {
                name: 'Aura of Vitality',
            };
            const result = await handle(action, makePlayerStats(), campaignName, null);

            expect(result).toEqual({
                type: 'popup',
                payload: expect.objectContaining({
                    type: 'automation_info',
                    name: 'Aura of Vitality',
                    automation: {},
                }),
            });
        });
    });

    describe('applyAuraOfVitality', () => {
        it('returns null for empty target list', async () => {
            const action = {
                name: 'Aura of Vitality',
                automation: { type: 'aura_of_vitality' },
            };
            const result = await applyAuraOfVitality(action, makePlayerStats(), campaignName, null, []);
            expect(result).toBeNull();
        });

        it('returns null for undefined target list', async () => {
            const action = {
                name: 'Aura of Vitality',
                automation: { type: 'aura_of_vitality' },
            };
            const result = await applyAuraOfVitality(action, makePlayerStats(), campaignName, null, null);
            expect(result).toBeNull();
        });

        it('returns error popup when no combat context', async () => {
            combatData.getCombatSummary.mockReturnValue(null);

            const action = {
                name: 'Aura of Vitality',
                automation: { type: 'aura_of_vitality' },
            };
            const result = await applyAuraOfVitality(action, makePlayerStats(), campaignName, null, ['Ally1']);

            expect(result).toEqual({
                type: 'popup',
                payload: expect.objectContaining({
                    type: 'automation_info',
                    description: expect.stringContaining('No combat context found'),
                }),
            });
        });

        it('returns error popup when target not found in combat', async () => {
            combatData.getCombatSummary.mockReturnValue(
                makeCombatSummary(['Cleric', 'Ally1'])
            );

            const action = {
                name: 'Aura of Vitality',
                automation: { type: 'aura_of_vitality' },
            };
            const result = await applyAuraOfVitality(action, makePlayerStats(), campaignName, null, ['Unknown']);

            expect(result).toEqual({
                type: 'popup',
                payload: expect.objectContaining({
                    type: 'automation_info',
                    description: expect.stringContaining('Target Unknown not found in combat'),
                }),
            });
        });

        it('returns error popup when rollExpression fails', async () => {
            combatData.getCombatSummary.mockReturnValue(
                makeCombatSummary(['Cleric', 'Ally1'])
            );

            vi.mocked(diceRoller.rollExpression).mockReturnValue(null);

            const action = {
                name: 'Aura of Vitality',
                automation: { type: 'aura_of_vitality', healExpression: '2d6' },
            };
            const result = await applyAuraOfVitality(action, makePlayerStats(), campaignName, null, ['Ally1']);

            expect(result).toEqual({
                type: 'popup',
                payload: expect.objectContaining({
                    type: 'automation_info',
                    description: expect.stringContaining('Failed to roll healing'),
                }),
            });
        });

        it('returns error popup when maxHp is null for non-player creature', async () => {
            combatData.getCombatSummary.mockReturnValue({
                creatures: [{ name: 'Ally1', type: 'npc', maxHp: null, currentHp: 30 }],
            });

            const action = {
                name: 'Aura of Vitality',
                automation: { type: 'aura_of_vitality', healExpression: '2d6' },
            };
            const result = await applyAuraOfVitality(action, makePlayerStats(), campaignName, null, ['Ally1']);

            expect(result).toEqual({
                type: 'popup',
                payload: expect.objectContaining({
                    type: 'automation_info',
                    description: expect.stringContaining('Could not determine max HP'),
                }),
            });
        });

        it('returns error popup when maxHp is null for player creature', async () => {
            combatData.getCombatSummary.mockReturnValue({
                creatures: [{ name: 'Ally1', type: 'player', maxHp: 50, currentHp: 30 }],
            });

            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((entity, key) => {
                if (entity === 'Ally1' && key === 'hitPoints') {
                    return null;
                }
                if (entity === 'Ally1' && key === 'currentHitPoints') {
                    return 30;
                }
                return null;
            });

            const action = {
                name: 'Aura of Vitality',
                automation: { type: 'aura_of_vitality', healExpression: '2d6' },
            };
            const result = await applyAuraOfVitality(action, makePlayerStats(), campaignName, null, ['Ally1']);

            expect(result).toEqual({
                type: 'popup',
                payload: expect.objectContaining({
                    type: 'automation_info',
                    description: expect.stringContaining('Could not determine max HP'),
                }),
            });
        });

        it('returns error popup when currentHp is null for non-player creature', async () => {
            combatData.getCombatSummary.mockReturnValue({
                creatures: [{ name: 'Ally1', type: 'npc', maxHp: 50, currentHp: null }],
            });

            const action = {
                name: 'Aura of Vitality',
                automation: { type: 'aura_of_vitality', healExpression: '2d6' },
            };
            const result = await applyAuraOfVitality(action, makePlayerStats(), campaignName, null, ['Ally1']);

            expect(result).toEqual({
                type: 'popup',
                payload: expect.objectContaining({
                    type: 'automation_info',
                    description: expect.stringContaining('Could not determine current HP'),
                }),
            });
        });

        it('returns error popup when currentHp is null for player creature', async () => {
            combatData.getCombatSummary.mockReturnValue({
                creatures: [{ name: 'Ally1', type: 'player', maxHp: 50, currentHp: 30 }],
            });

            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((entity, key) => {
                if (entity === 'Ally1' && key === 'hitPoints') {
                    return 50;
                }
                if (entity === 'Ally1' && key === 'currentHitPoints') {
                    return null;
                }
                return null;
            });

            const action = {
                name: 'Aura of Vitality',
                automation: { type: 'aura_of_vitality', healExpression: '2d6' },
            };
            const result = await applyAuraOfVitality(action, makePlayerStats(), campaignName, null, ['Ally1']);

            expect(result).toEqual({
                type: 'popup',
                payload: expect.objectContaining({
                    type: 'automation_info',
                    description: expect.stringContaining('Could not determine current HP'),
                }),
            });
        });

        it('uses default healExpression when not provided', async () => {
            combatData.getCombatSummary.mockReturnValue(
                makeCombatSummary(['Cleric', 'Ally1'])
            );

            vi.mocked(diceRoller.rollExpression).mockReturnValue({ total: 5, rolls: [3, 2], modifier: 0, formula: '2d6' });

            const action = {
                name: 'Aura of Vitality',
                automation: { type: 'aura_of_vitality' },
            };
            await applyAuraOfVitality(action, makePlayerStats(), campaignName, null, ['Ally1']);

            expect(vi.mocked(diceRoller.rollExpression)).toHaveBeenCalledWith('2d6');
        });

        it('uses default slotLevel when not provided', async () => {
            combatData.getCombatSummary.mockReturnValue(
                makeCombatSummary(['Cleric', 'Ally1'])
            );

            vi.mocked(diceRoller.rollExpression).mockReturnValue({ total: 7, rolls: [4, 3], modifier: 0, formula: '2d6' });

            const action = {
                name: 'Aura of Vitality',
                automation: { type: 'aura_of_vitality', healExpression: '2d6' },
            };
            await applyAuraOfVitality(action, makePlayerStats(), campaignName, null, ['Ally1']);

            expect(vi.mocked(diceRoller.rollExpression)).toHaveBeenCalledWith('2d6');
        });

        it('uses heal_at_slot_level exact match when spell has it', async () => {
            combatData.getCombatSummary.mockReturnValue(
                makeCombatSummary(['Cleric', 'Ally1'])
            );

            vi.mocked(diceRoller.rollExpression).mockReturnValue({ total: 10, rolls: [5, 5], modifier: 0, formula: '3d6' });

            const action = {
                name: 'Aura of Vitality',
                spell: { heal_at_slot_level: { '3': '2d6', '4': '3d6' } },
                automation: { type: 'aura_of_vitality', healExpression: '2d6' },
                spellSlotLevel: 3,
            };
            await applyAuraOfVitality(action, makePlayerStats(), campaignName, null, ['Ally1']);

            expect(vi.mocked(diceRoller.rollExpression)).toHaveBeenCalledWith('2d6');
        });

        it('uses heal_at_slot_level highestBelow when no exact match', async () => {
            combatData.getCombatSummary.mockReturnValue(
                makeCombatSummary(['Cleric', 'Ally1'])
            );

            vi.mocked(diceRoller.rollExpression).mockReturnValue({ total: 15, rolls: [7, 8], modifier: 0, formula: '4d6' });

            const action = {
                name: 'Aura of Vitality',
                spell: { heal_at_slot_level: { '2': '2d6', '4': '4d6' } },
                automation: { type: 'aura_of_vitality', healExpression: '2d6' },
                spellSlotLevel: 3,
            };
            await applyAuraOfVitality(action, makePlayerStats(), campaignName, null, ['Ally1']);

            expect(vi.mocked(diceRoller.rollExpression)).toHaveBeenCalledWith('2d6');
        });

        it('falls back to default healExpression when highestBelow is undefined', async () => {
            combatData.getCombatSummary.mockReturnValue(
                makeCombatSummary(['Cleric', 'Ally1'])
            );

            vi.mocked(diceRoller.rollExpression).mockReturnValue({ total: 7, rolls: [4, 3], modifier: 0, formula: '2d6' });

            const action = {
                name: 'Aura of Vitality',
                spell: { heal_at_slot_level: { '5': '6d6' } },
                automation: { type: 'aura_of_vitality', healExpression: '2d6' },
                spellSlotLevel: 3,
            };
            await applyAuraOfVitality(action, makePlayerStats(), campaignName, null, ['Ally1']);

            // No level <= 3 in heal_at_slot_level, so highestBelow is undefined, falls through to default healExpression
            expect(vi.mocked(diceRoller.rollExpression)).toHaveBeenCalledWith('2d6');
        });

        it('uses default automation object when action.automation is falsy', async () => {
            combatData.getCombatSummary.mockReturnValue(
                makeCombatSummary(['Cleric', 'Ally1'])
            );

            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((entity, key) => {
                if (entity === 'Ally1' && key === 'currentHitPoints') {
                    return 30;
                }
                return null;
            });

            vi.mocked(diceRoller.rollExpression).mockReturnValue({ total: 8, rolls: [5, 3], modifier: 0, formula: '2d6' });

            const action = {
                name: 'Aura of Vitality',
            };
            const result = await applyAuraOfVitality(action, makePlayerStats(), campaignName, null, ['Ally1']);

            expect(result).toEqual({
                type: 'popup',
                payload: expect.objectContaining({
                    type: 'automation_info',
                    automation: {},
                }),
            });

            expect(vi.mocked(diceRoller.rollExpression)).toHaveBeenCalledWith('2d6');
        });

        it('clamps healAmount to maxHp when target is at full health', async () => {
            combatData.getCombatSummary.mockReturnValue({
                creatures: [{ name: 'Ally1', type: 'npc', maxHp: 50, currentHp: 50 }],
            });

            vi.mocked(diceRoller.rollExpression).mockReturnValue({ total: 10, rolls: [6, 4], modifier: 0, formula: '2d6' });

            const action = {
                name: 'Aura of Vitality',
                automation: { type: 'aura_of_vitality', healExpression: '2d6' },
            };
            const result = await applyAuraOfVitality(action, makePlayerStats(), campaignName, null, ['Ally1']);

            expect(result).toEqual({
                type: 'popup',
                payload: expect.objectContaining({
                    type: 'automation_info',
                    description: expect.stringContaining('Ally1'),
                }),
            });

            // Healing should be 0 since target is at full health
            expect(vi.mocked(applyHealing.applyHealingToTarget)).not.toHaveBeenCalled();
            expect(vi.mocked(logService.addEntry)).toHaveBeenCalledTimes(2);
        });

        it('does not call applyHealingToTarget when healAmount is 0', async () => {
            combatData.getCombatSummary.mockReturnValue({
                creatures: [{ name: 'Ally1', type: 'npc', maxHp: 50, currentHp: 50 }],
            });

            vi.mocked(diceRoller.rollExpression).mockReturnValue({ total: 10, rolls: [6, 4], modifier: 0, formula: '2d6' });

            const action = {
                name: 'Aura of Vitality',
                automation: { type: 'aura_of_vitality', healExpression: '2d6' },
            };
            await applyAuraOfVitality(action, makePlayerStats(), campaignName, null, ['Ally1']);

            expect(vi.mocked(applyHealing.applyHealingToTarget)).not.toHaveBeenCalled();
            expect(vi.mocked(logService.addEntry)).toHaveBeenCalledTimes(2);
        });

        it('applies healing, targetEffects, concentration, and expirations for target', async () => {
            combatData.getCombatSummary.mockReturnValue(
                makeCombatSummary(['Cleric', 'Ally1'])
            );

            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((entity, key) => {
                if (entity === 'Ally1' && key === 'currentHitPoints') {
                    return 30;
                }
                return null;
            });

            vi.mocked(diceRoller.rollExpression).mockReturnValue({ total: 8, rolls: [5, 3], modifier: 0, formula: '2d6' });

            const action = {
                name: 'Aura of Vitality',
                spell: { heal_at_slot_level: { '3': '2d6' } },
                automation: { type: 'aura_of_vitality', healExpression: '2d6' },
                spellSlotLevel: 3,
            };
            const result = await applyAuraOfVitality(action, makePlayerStats(), campaignName, null, ['Ally1']);

            expect(result).toEqual({
                type: 'popup',
                payload: expect.objectContaining({
                    type: 'automation_info',
                    name: 'Aura of Vitality',
                    description: expect.stringContaining('Ally1'),
                }),
            });

            expect(vi.mocked(applyHealing.applyHealingToTarget)).toHaveBeenCalled();

            expect(vi.mocked(useRuntimeState.setRuntimeValue))
                .toHaveBeenCalledWith('campaign', 'targetEffects', expect.arrayContaining([
                    expect.objectContaining({
                        target: 'Ally1',
                        effect: 'aura_of_vitality',
                        source: 'Cleric',
                        duration: 'concentration',
                    }),
                ]), campaignName, true);

            expect(vi.mocked(concentrationService.addConcentration)).toHaveBeenCalled();

            expect(vi.mocked(expirations.addExpiration)).toHaveBeenCalled();

            expect(vi.mocked(logService.addEntry)).toHaveBeenCalledTimes(2);
        });

        it('updates existing target effect when aura_of_vitality already exists', async () => {
            combatData.getCombatSummary.mockReturnValue(
                makeCombatSummary(['Cleric', 'Ally1'])
            );

            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((entity, key) => {
                if (entity === 'campaign' && key === 'targetEffects') {
                    return [
                        { target: 'Ally1', effect: 'aura_of_vitality', source: 'Cleric', duration: 'concentration' },
                    ];
                }
                if (entity === 'Ally1' && key === 'currentHitPoints') {
                    return 30;
                }
                return null;
            });

            vi.mocked(diceRoller.rollExpression).mockReturnValue({ total: 8, rolls: [5, 3], modifier: 0, formula: '2d6' });

            const action = {
                name: 'Aura of Vitality',
                automation: { type: 'aura_of_vitality', healExpression: '2d6' },
            };
            await applyAuraOfVitality(action, makePlayerStats(), campaignName, null, ['Ally1']);

            // Should have called setRuntimeValue with updated array (not a new entry appended)
            expect(vi.mocked(useRuntimeState.setRuntimeValue)).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([
                    expect.objectContaining({
                        target: 'Ally1',
                        effect: 'aura_of_vitality',
                        source: 'Cleric',
                        duration: 'concentration',
                    }),
                ]),
                campaignName,
                true
            );
        });

        it('updates existing caster effect when aura_of_vitality already exists on caster', async () => {
            combatData.getCombatSummary.mockReturnValue(
                makeCombatSummary(['Cleric', 'Ally1'])
            );

            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((entity, key) => {
                if (entity === 'campaign' && key === 'targetEffects') {
                    return [
                        { target: 'Cleric', effect: 'aura_of_vitality', source: 'Cleric', duration: 'concentration' },
                    ];
                }
                if (entity === 'Ally1' && key === 'currentHitPoints') {
                    return 30;
                }
                return null;
            });

            vi.mocked(diceRoller.rollExpression).mockReturnValue({ total: 8, rolls: [5, 3], modifier: 0, formula: '2d6' });

            const action = {
                name: 'Aura of Vitality',
                automation: { type: 'aura_of_vitality', healExpression: '2d6' },
            };
            await applyAuraOfVitality(action, makePlayerStats(), campaignName, null, ['Ally1']);

            expect(vi.mocked(useRuntimeState.setRuntimeValue)).toHaveBeenCalledWith(
                'campaign',
                'targetEffects',
                expect.arrayContaining([
                    expect.objectContaining({
                        target: 'Cleric',
                        effect: 'aura_of_vitality',
                        source: 'Cleric',
                        duration: 'concentration',
                    }),
                ]),
                campaignName,
                true
            );
        });

        it('uses player runtime values for player-type creatures', async () => {
            combatData.getCombatSummary.mockReturnValue({
                creatures: [{ name: 'Ally1', type: 'player', maxHp: 50, currentHp: 30 }],
            });

            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((entity, key) => {
                if (entity === 'Ally1' && key === 'hitPoints') {
                    return 50;
                }
                if (entity === 'Ally1' && key === 'currentHitPoints') {
                    return 30;
                }
                return null;
            });

            vi.mocked(diceRoller.rollExpression).mockReturnValue({ total: 8, rolls: [5, 3], modifier: 0, formula: '2d6' });

            const action = {
                name: 'Aura of Vitality',
                automation: { type: 'aura_of_vitality', healExpression: '2d6' },
            };
            await applyAuraOfVitality(action, makePlayerStats(), campaignName, null, ['Ally1']);

            expect(vi.mocked(useRuntimeState.getRuntimeValue)).toHaveBeenCalledWith('Ally1', 'hitPoints');
            expect(vi.mocked(useRuntimeState.getRuntimeValue)).toHaveBeenCalledWith('Ally1', 'currentHitPoints', campaignName);
        });

        it('uses creature properties for non-player creatures', async () => {
            combatData.getCombatSummary.mockReturnValue({
                creatures: [{ name: 'Ally1', type: 'npc', maxHp: 50, currentHp: 30 }],
            });

            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((_, __) => {
                return null;
            });

            vi.mocked(diceRoller.rollExpression).mockReturnValue({ total: 8, rolls: [5, 3], modifier: 0, formula: '2d6' });

            const action = {
                name: 'Aura of Vitality',
                automation: { type: 'aura_of_vitality', healExpression: '2d6' },
            };
            await applyAuraOfVitality(action, makePlayerStats(), campaignName, null, ['Ally1']);

            // Should NOT call getRuntimeValue for HP for non-player creatures
            expect(vi.mocked(useRuntimeState.getRuntimeValue)).not.toHaveBeenCalledWith('Ally1', 'hitPoints');
            expect(vi.mocked(useRuntimeState.getRuntimeValue)).not.toHaveBeenCalledWith('Ally1', 'currentHitPoints', campaignName);
        });

        it('handles logEntry catch error', async () => {
            combatData.getCombatSummary.mockReturnValue(
                makeCombatSummary(['Cleric', 'Ally1'])
            );

            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((entity, key) => {
                if (entity === 'Ally1' && key === 'currentHitPoints') {
                    return 30;
                }
                return null;
            });

            vi.mocked(diceRoller.rollExpression).mockReturnValue({ total: 8, rolls: [5, 3], modifier: 0, formula: '2d6' });

            const logError = new Error('log failed');
            vi.mocked(logService.addEntry).mockRejectedValue(logError);

            const consoleSpy = vi.spyOn(console, 'error').mockReturnValue();

            const action = {
                name: 'Aura of Vitality',
                automation: { type: 'aura_of_vitality', healExpression: '2d6' },
            };
            await applyAuraOfVitality(action, makePlayerStats(), campaignName, null, ['Ally1']);

            expect(vi.mocked(console.error)).toHaveBeenCalledWith('[auraOfVitality] Error:', logError);

            consoleSpy.mockRestore();
        });

        it('handles concentrationBonus falsy defaulting to 0', async () => {
            combatData.getCombatSummary.mockReturnValue(
                makeCombatSummary(['Cleric', 'Ally1'])
            );

            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((entity, key) => {
                if (entity === 'Ally1' && key === 'currentHitPoints') {
                    return 30;
                }
                return null;
            });

            vi.mocked(diceRoller.rollExpression).mockReturnValue({ total: 8, rolls: [5, 3], modifier: 0, formula: '2d6' });

            const action = {
                name: 'Aura of Vitality',
                automation: { type: 'aura_of_vitality', healExpression: '2d6' },
            };
            await applyAuraOfVitality(action, makePlayerStats({ concentrationBonus: null }), campaignName, null, ['Ally1']);

            expect(vi.mocked(concentrationService.addConcentration)).toHaveBeenCalled();
        });
    });

    describe('isAuraOfVitalityActive', () => {
        it('returns true when aura effect is active on target', () => {
            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((entity, key) => {
                if (entity === 'campaign' && key === 'targetEffects') {
                    return [
                        { target: 'Ally1', effect: 'aura_of_vitality', source: 'Cleric', duration: 'concentration' },
                        { target: 'Ally2', effect: 'haste', source: 'Cleric' },
                    ];
                }
                return null;
            });
            expect(isAuraOfVitalityActive('Ally1', campaignName)).toBe(true);
        });

        it('returns false when aura effect is not on target', () => {
            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((entity, key) => {
                if (entity === 'campaign' && key === 'targetEffects') {
                    return [
                        { target: 'Ally2', effect: 'aura_of_vitality', source: 'Cleric' },
                    ];
                }
                return null;
            });
            expect(isAuraOfVitalityActive('Ally1', campaignName)).toBe(false);
        });

        it('returns false when no target effects', () => {
            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((entity, key) => {
                if (entity === 'campaign' && key === 'targetEffects') {
                    return [];
                }
                return null;
            });
            expect(isAuraOfVitalityActive('Ally1', campaignName)).toBe(false);
        });

        it('returns false when targetEffects is falsy', () => {
            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((entity, key) => {
                if (entity === 'campaign' && key === 'targetEffects') {
                    return null;
                }
                return null;
            });
            expect(isAuraOfVitalityActive('Ally1', campaignName)).toBe(false);
        });
    });
});
