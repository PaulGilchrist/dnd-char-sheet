// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { handle } from './concentrationBonusAttackHandler.js';
import { getCombatSummary } from '../../../encounters/combatData.js';
import { addConcentration } from '../../../combat/concentration/concentrationService.js';
import storage from '../../../ui/storage.js';
import { addEntry } from '../../../ui/logService.js';

// ── Mocks ──────────────────────────────────────────────────────

vi.mock('../../../encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(),
}));

vi.mock('../../../combat/concentration/concentrationService.js', () => ({
    addConcentration: vi.fn(),
}));

vi.mock('../../../ui/storage.js', () => ({
    default: {
        set: vi.fn(),
    },
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

// ── Helpers ────────────────────────────────────────────────────

const campaignName = 'test-campaign';

function makePlayerStats(overrides = {}) {
    return {
        name: 'TestCharacter',
        ...overrides,
    };
}

function makeAction(overrides = {}) {
    return {
        name: 'Telekinetic Master',
        description: 'Always have Telekinesis spell prepared. Cast without spell slot. On each turn while maintaining Concentration, make one weapon attack as Bonus Action.',
        automation: {
            type: 'concentration_bonus_attack',
            concentrationSpell: 'Telekinesis',
            action: 'bonus_action',
            ...overrides.automation,
        },
        ...overrides,
    };
}

// ── Tests ──────────────────────────────────────────────────────

describe('concentrationBonusAttackHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('handle', () => {
        // ── Concentration state transitions ──────────────────────

        describe('concentration state transitions', () => {
            it('sets concentration when creature has no active concentration', async () => {
                getCombatSummary.mockReturnValue({
                    creatures: [{ name: 'TestCharacter', concentration: null }],
                });

                const result = await handle(makeAction(), makePlayerStats(), campaignName);

                expect(addConcentration).toHaveBeenCalledWith(
                    expect.objectContaining({ creatures: expect.any(Array) }),
                    'TestCharacter',
                    'Telekinesis',
                    10,
                );
                expect(storage.set).toHaveBeenCalledWith(
                    'combatSummary',
                    expect.any(Object),
                    campaignName,
                );
                expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                    type: 'ability_use',
                    characterName: 'TestCharacter',
                    abilityName: 'Telekinetic Master',
                }));
                expect(result).toEqual({
                    type: 'popup',
                    payload: {
                        type: 'automation_info',
                        name: 'Telekinetic Master',
                        automationType: 'concentration_bonus_attack',
                        description: expect.stringContaining('Concentrating on'),
                        automation: expect.objectContaining({ type: 'concentration_bonus_attack' }),
                    },
                });
            });

            it('overwrites existing concentration on a different spell', async () => {
                getCombatSummary.mockReturnValue({
                    creatures: [{ name: 'TestCharacter', concentration: { spell: 'Bless', dc: 10 } }],
                });

                const result = await handle(makeAction(), makePlayerStats(), campaignName);

                expect(addConcentration).toHaveBeenCalledWith(
                    expect.any(Object),
                    'TestCharacter',
                    'Telekinesis',
                    10,
                );
                expect(storage.set).toHaveBeenCalled();
                expect(addEntry).toHaveBeenCalled();
                expect(result.payload.description).toContain('Concentrating on');
            });

            it('does nothing when already concentrating on the target spell', async () => {
                getCombatSummary.mockReturnValue({
                    creatures: [{ name: 'TestCharacter', concentration: { spell: 'Telekinesis', dc: 12 } }],
                });

                const result = await handle(makeAction(), makePlayerStats(), campaignName);

                expect(addConcentration).not.toHaveBeenCalled();
                expect(storage.set).not.toHaveBeenCalled();
                expect(addEntry).not.toHaveBeenCalled();
                expect(result.payload.description).toContain('Concentrating on');
            });
        });

        // ── Missing / null combat summary ────────────────────────

        describe('missing or null combat summary', () => {
            it('skips concentration set but still logs when combatSummary is null', async () => {
                getCombatSummary.mockReturnValue(null);

                const result = await handle(makeAction(), makePlayerStats(), campaignName);

                expect(addConcentration).not.toHaveBeenCalled();
                expect(storage.set).not.toHaveBeenCalled();
                expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                    type: 'ability_use',
                    characterName: 'TestCharacter',
                    abilityName: 'Telekinetic Master',
                }));
                expect(result.payload.description).toContain('Concentrating on');
            });

            it('attempts concentration set when combatSummary exists but creatures is undefined', async () => {
                getCombatSummary.mockReturnValue({});

                const result = await handle(makeAction(), makePlayerStats(), campaignName);

                // Handler calls addConcentration when combatSummary is truthy,
                // even if creatures array is missing (addConcentration handles it internally)
                expect(addConcentration).toHaveBeenCalled();
                expect(storage.set).toHaveBeenCalled();
                expect(addEntry).toHaveBeenCalled();
                expect(result.type).toBe('popup');
            });
        });

        // ── Creature not found in combat summary ─────────────────

        describe('creature not found in combat summary', () => {
            it('attempts concentration set when creature name does not match in combat summary', async () => {
                getCombatSummary.mockReturnValue({
                    creatures: [{ name: 'OtherCharacter', concentration: null }],
                });

                const result = await handle(makeAction(), makePlayerStats(), campaignName);

                // Handler calls addConcentration when creature is not found (wasConcentrating is falsy),
                // but addConcentration returns early since creature lookup fails
                expect(addConcentration).toHaveBeenCalled();
                expect(storage.set).toHaveBeenCalled();
                expect(addEntry).toHaveBeenCalled();
                expect(result.payload.name).toBe('Telekinetic Master');
            });
        });

        // ── Default values ───────────────────────────────────────

        describe('default values', () => {
            it('defaults concentrationSpell to Telekinesis when automation.concentrationSpell is undefined', async () => {
                getCombatSummary.mockReturnValue({
                    creatures: [{ name: 'TestCharacter', concentration: null }],
                });

                const action = makeAction({ automation: { concentrationSpell: undefined } });
                await handle(action, makePlayerStats(), campaignName);

                expect(addConcentration).toHaveBeenCalledWith(
                    expect.any(Object),
                    'TestCharacter',
                    'Telekinesis',
                    10,
                );
            });

            it('defaults dc to 10 when automation.dc is undefined', async () => {
                getCombatSummary.mockReturnValue({
                    creatures: [{ name: 'TestCharacter', concentration: null }],
                });

                const action = makeAction({ automation: { dc: undefined } });
                await handle(action, makePlayerStats(), campaignName);

                expect(addConcentration).toHaveBeenCalledWith(
                    expect.any(Object),
                    'TestCharacter',
                    'Telekinesis',
                    10,
                );
            });

            it('uses custom concentrationSpell when provided', async () => {
                getCombatSummary.mockReturnValue({
                    creatures: [{ name: 'TestCharacter', concentration: null }],
                });

                const action = makeAction({ automation: { concentrationSpell: 'Focus' } });
                await handle(action, makePlayerStats(), campaignName);

                expect(addConcentration).toHaveBeenCalledWith(
                    expect.any(Object),
                    'TestCharacter',
                    'Focus',
                    10,
                );
            });

            it('uses custom dc when provided', async () => {
                getCombatSummary.mockReturnValue({
                    creatures: [{ name: 'TestCharacter', concentration: null }],
                });

                const action = makeAction({ automation: { dc: 15 } });
                await handle(action, makePlayerStats(), campaignName);

                expect(addConcentration).toHaveBeenCalledWith(
                    expect.any(Object),
                    'TestCharacter',
                    'Telekinesis',
                    15,
                );
            });
        });

        // ── Popup payload ────────────────────────────────────────

        describe('popup payload', () => {
            it('returns correct popup structure with automation details', async () => {
                getCombatSummary.mockReturnValue({
                    creatures: [{ name: 'TestCharacter', concentration: null }],
                });

                const result = await handle(makeAction(), makePlayerStats(), campaignName);

                expect(result.type).toBe('popup');
                expect(result.payload.type).toBe('automation_info');
                expect(result.payload.name).toBe('Telekinetic Master');
                expect(result.payload.automationType).toBe('concentration_bonus_attack');
                expect(result.payload.automation).toEqual(makeAction().automation);
            });

            it('reflects custom action name in popup and log entry', async () => {
                getCombatSummary.mockReturnValue({
                    creatures: [{ name: 'TestCharacter', concentration: null }],
                });

                const action = makeAction({ name: 'Custom Feature' });
                const result = await handle(action, makePlayerStats(), campaignName);

                expect(result.payload.name).toBe('Custom Feature');
                expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                    abilityName: 'Custom Feature',
                }));
            });
        });
    });
});
