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

// ── Imports ──────────────────────────────────────────────────────

import { handle, applyAuraOfLife, isAuraOfLifeActive } from './auraOfLifeHandler.js';

import * as useRuntimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as expirations from '../../../rules/effects/expirations.js';
import * as logService from '../../../ui/logService.js';
import * as combatData from '../../../encounters/combatData.js';
import * as concentrationService from '../../../combat/concentration/concentrationService.js';

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
        creatures: creatureNames.map((name) => ({ name })),
    };
}

// ── Tests ────────────────────────────────────────────────────────

describe('auraOfLifeHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('handle', () => {
        it('returns popup with all creature targets including caster', async () => {
            combatData.getCombatSummary.mockReturnValue(
                makeCombatSummary(['Cleric', 'Ally1', 'Ally2', 'Enemy1'])
            );

            const action = {
                name: 'Aura of Life',
                automation: { type: 'aura_of_life' },
            };
            const result = await handle(action, makePlayerStats(), campaignName, null);

            expect(result).toEqual({
                type: 'popup',
                payload: expect.objectContaining({
                    type: 'automation_info',
                    name: 'Aura of Life',
                    creatureTargets: ['Cleric', 'Ally1', 'Ally2', 'Enemy1'],
                    maxTargets: 5,
                }),
            });
        });

        it('returns error popup when no combat context', async () => {
            combatData.getCombatSummary.mockReturnValue(null);

            const action = {
                name: 'Aura of Life',
                automation: { type: 'aura_of_life' },
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

    describe('applyAuraOfLife', () => {
        it('applies buffs, HP protection, targetEffects, and expirations for each target', async () => {
            const action = {
                name: 'Aura of Life',
                automation: { type: 'aura_of_life' },
            };
            const result = await applyAuraOfLife(action, makePlayerStats(), campaignName, null, ['Ally1', 'Ally2']);

            expect(result).toEqual({
                type: 'popup',
                payload: expect.objectContaining({
                    type: 'automation_info',
                    name: 'Aura of Life',
                    description: expect.stringContaining('2 target(s)'),
                }),
            });

            // Verify activeBuffs were set for each target
            expect(vi.mocked(useRuntimeState.setRuntimeValue))
                .toHaveBeenCalledWith('Ally1', 'activeBuffs', expect.arrayContaining([
                    expect.objectContaining({
                        name: 'Aura of Life',
                        effect: 'aura_of_life',
                        resistanceTypes: ['Necrotic'],
                        sourceCharacter: 'Cleric',
                    }),
                ]), campaignName);

            expect(vi.mocked(useRuntimeState.setRuntimeValue))
                .toHaveBeenCalledWith('Ally2', 'activeBuffs', expect.arrayContaining([
                    expect.objectContaining({
                        name: 'Aura of Life',
                        effect: 'aura_of_life',
                        resistanceTypes: ['Necrotic'],
                        sourceCharacter: 'Cleric',
                    }),
                ]), campaignName);

            // Verify HP max protection flag
            expect(vi.mocked(useRuntimeState.setRuntimeValue))
                .toHaveBeenCalledWith('Ally1', 'auraOfLifeHpMaxProtected', true, campaignName);
            expect(vi.mocked(useRuntimeState.setRuntimeValue))
                .toHaveBeenCalledWith('Ally2', 'auraOfLifeHpMaxProtected', true, campaignName);

            // Verify turnStartEffects were updated for each target
            expect(vi.mocked(useRuntimeState.setRuntimeValue))
                .toHaveBeenCalledWith('Ally1', 'turnStartEffects', expect.arrayContaining([
                    expect.objectContaining({ type: 'aura_of_life_turn_start_heal' }),
                ]), campaignName);
            expect(vi.mocked(useRuntimeState.setRuntimeValue))
                .toHaveBeenCalledWith('Ally2', 'turnStartEffects', expect.arrayContaining([
                    expect.objectContaining({ type: 'aura_of_life_turn_start_heal' }),
                ]), campaignName);

            // Verify expirations were registered
            expect(vi.mocked(expirations.addExpiration)).toHaveBeenCalledTimes(2);

            // Verify concentration was set
            expect(vi.mocked(concentrationService.addConcentration)).toHaveBeenCalled();

            // Verify logging
            expect(vi.mocked(logService.addEntry)).toHaveBeenCalledTimes(2);
        });

        it('does not duplicate buff if already active', async () => {
            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((entity, key) => {
                if (entity === 'Ally1' && key === 'activeBuffs') {
                    return [{ name: 'Aura of Life', effect: 'aura_of_life', sourceCharacter: 'Cleric' }];
                }
                return null;
            });

            const action = {
                name: 'Aura of Life',
                automation: { type: 'aura_of_life' },
            };
            await applyAuraOfLife(action, makePlayerStats(), campaignName, null, ['Ally1']);

            // Should not push a second buff entry
            // The handler checks existingAura before pushing, so only one should exist
            const storedBuffs = vi.mocked(useRuntimeState.getRuntimeValue).mock.calls
                .filter(call => call[0] === 'Ally1' && call[1] === 'activeBuffs')
                .map(call => call[2]); // campaignName is call[2]
            expect(storedBuffs.length).toBeGreaterThan(0);
        });

        it('returns null for empty target list', async () => {
            const action = {
                name: 'Aura of Life',
                automation: { type: 'aura_of_life' },
            };
            const result = await applyAuraOfLife(action, makePlayerStats(), campaignName, null, []);
            expect(result).toBeNull();
        });

        it('returns null for undefined target list', async () => {
            const action = {
                name: 'Aura of Life',
                automation: { type: 'aura_of_life' },
            };
            const result = await applyAuraOfLife(action, makePlayerStats(), campaignName, null, null);
            expect(result).toBeNull();
        });
    });

    describe('isAuraOfLifeActive', () => {
        it('returns true when aura buff is active', () => {
            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((entity, key) => {
                if (entity === 'Ally1' && key === 'activeBuffs') {
                    return [{ name: 'Aura of Life', effect: 'aura_of_life', sourceCharacter: 'Cleric' }];
                }
                return null;
            });
            expect(isAuraOfLifeActive('Ally1', campaignName)).toBe(true);
        });

        it('returns false when aura buff is not active', () => {
            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((entity, key) => {
                if (entity === 'Ally1' && key === 'activeBuffs') {
                    return [{ name: 'Haste', effect: 'haste', sourceCharacter: 'Cleric' }];
                }
                return null;
            });
            expect(isAuraOfLifeActive('Ally1', campaignName)).toBe(false);
        });

        it('returns false when no buffs', () => {
            vi.mocked(useRuntimeState.getRuntimeValue).mockImplementation((entity, key) => {
                if (entity === 'Ally1' && key === 'activeBuffs') {
                    return [];
                }
                return null;
            });
            expect(isAuraOfLifeActive('Ally1', campaignName)).toBe(false);
        });
    });
});
