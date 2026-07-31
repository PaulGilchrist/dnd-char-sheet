// @improved-by-ai
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

const campaignName = 'TestCampaign';

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
    });

    describe('handle', () => {
        it('returns popup with all creature targets including caster', async () => {
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
    });

    describe('applyAuraOfVitality', () => {
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

            // Verify healing was applied
            expect(vi.mocked(applyHealing.applyHealingToTarget)).toHaveBeenCalled();

            // Verify targetEffects were set
            expect(vi.mocked(useRuntimeState.setRuntimeValue))
                .toHaveBeenCalledWith('campaign', 'targetEffects', expect.arrayContaining([
                    expect.objectContaining({
                        target: 'Ally1',
                        effect: 'aura_of_vitality',
                        source: 'Cleric',
                        duration: 'concentration',
                    }),
                ]), campaignName, true);

            // Verify concentration was set
            expect(vi.mocked(concentrationService.addConcentration)).toHaveBeenCalled();

            // Verify expiration was registered
            expect(vi.mocked(expirations.addExpiration)).toHaveBeenCalled();

            // Verify logging
            expect(vi.mocked(logService.addEntry)).toHaveBeenCalledTimes(2);
        });

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

        it('uses heal_at_slot_level when spell has it', async () => {
            combatData.getCombatSummary.mockReturnValue(
                makeCombatSummary(['Cleric', 'Ally1'])
            );

            vi.mocked(diceRoller.rollExpression).mockReturnValue({ total: 5, rolls: [3, 2], modifier: 0, formula: '2d6' });

            const action = {
                name: 'Aura of Vitality',
                spell: { heal_at_slot_level: { '3': '2d6', '4': '3d6' } },
                automation: { type: 'aura_of_vitality', healExpression: '2d6' },
                spellSlotLevel: 4,
            };
            await applyAuraOfVitality(action, makePlayerStats(), campaignName, null, ['Ally1']);

            expect(vi.mocked(diceRoller.rollExpression)).toHaveBeenCalledWith('3d6');
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
    });
});
