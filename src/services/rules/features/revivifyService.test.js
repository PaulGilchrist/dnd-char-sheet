import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../services/ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../spells/materialComponents.js', () => ({
    consumeMaterial: vi.fn(),
}));

// ── Imports ────────────────────────────────────────────────────

import { triggerRevivify } from './revivifyService.js';
import { consumeMaterial } from '../spells/materialComponents.js';
import { setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../ui/logService.js';

// ── Globals ────────────────────────────────────────────────────

global.fetch = vi.fn(() => new Promise(() => {}));

const CAMPAIGN = 'TestCampaign';

function makeSpell(name) {
    return { name };
}

function makePlayerStats(casterName) {
    return { name: casterName || 'Cleric' };
}

function mockCombatSummary(creatures) {
    return { round: 1, creatures };
}

// ── Tests ──────────────────────────────────────────────────────

describe('triggerRevivify', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('material component check', () => {
        it('returns popup when diamond material is not available', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(false);

            const result = await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'Target',
            );

            expect(result).toEqual({
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Revivify',
                    automationType: 'revivify',
                    description: 'Revivify requires a diamond worth 300+ GP, which the spell consumes.',
                },
            });
            expect(setRuntimeValue).not.toHaveBeenCalled();
            expect(addEntry).not.toHaveBeenCalled();
        });

        it('calls consumeMaterial with correct diamond item name', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(mockCombatSummary([])),
            });

            await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats('Cleric'),
                CAMPAIGN,
                'Target',
            );

            expect(consumeMaterial).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'Cleric' }),
                'Diamond (300 gp)',
                CAMPAIGN,
            );
        });
    });

    describe('target resolution', () => {
        it('fetches combat summary from correct campaign endpoint', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(mockCombatSummary([])),
            });

            await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'Target',
            );

            expect(global.fetch).toHaveBeenCalledWith(
                `/api/campaigns/${encodeURIComponent(CAMPAIGN)}/combat-summary`,
            );
        });

        it('propagates fetch rejection since .catch is on .json() not fetch', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockImplementationOnce(() =>
                Promise.reject(new Error('Network error')),
            );

            await expect(
                triggerRevivify(
                    makeSpell('Revivify'),
                    {},
                    makePlayerStats(),
                    CAMPAIGN,
                    'Target',
                ),
            ).rejects.toThrow('Network error');
        });

        it('handles missing combat summary gracefully', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(null),
            });

            const result = await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'Target',
            );

            expect(result).toEqual({
                type: 'popup',
                payload: {
                    type: 'heal',
                    name: 'Revivify',
                    targetName: 'Target',
                    finalHeal: 1,
                    total: 1,
                    formula: '1 HP (revived)',
                    rolls: [],
                    rawTotal: 1,
                },
            });
        });

        it('handles empty creatures list', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(mockCombatSummary([])),
            });

            const result = await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'Target',
            );

            expect(result).toEqual({
                type: 'popup',
                payload: {
                    type: 'heal',
                    name: 'Revivify',
                    targetName: 'Target',
                    finalHeal: 1,
                    total: 1,
                    formula: '1 HP (revived)',
                    rolls: [],
                    rawTotal: 1,
                },
            });
        });

        it('finds target by name in creatures array', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(
                    mockCombatSummary([
                        { name: 'Goblin', maxHp: 7, currentHp: 0, type: 'monster' },
                        { name: 'Ally', maxHp: 30, currentHp: 0, type: 'player' },
                        { name: 'Orc', maxHp: 15, currentHp: 0, type: 'monster' },
                    ]),
                ),
            });

            await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'Ally',
            );

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Ally',
                'currentHitPoints',
                1,
                CAMPAIGN,
            );
        });
    });

    describe('player vs monster target handling', () => {
        it('sets oldHp to 0 for player targets', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(
                    mockCombatSummary([
                        { name: 'Ally', maxHp: 30, currentHp: 5, type: 'player' },
                    ]),
                ),
            });

            await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'Ally',
            );

            expect(addEntry).toHaveBeenCalledWith(
                CAMPAIGN,
                expect.objectContaining({
                    targetName: 'Ally',
                    delta: 1,
                    currentHp: 1,
                    maxHp: 30,
                    isHealing: true,
                    note: 'Revivify',
                }),
            );
        });

        it('sets oldHp from currentHp for monster targets', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(
                    mockCombatSummary([
                        { name: 'Goblin', maxHp: 7, currentHp: 3, type: 'monster' },
                    ]),
                ),
            });

            await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'Goblin',
            );

            expect(addEntry).toHaveBeenCalledWith(
                CAMPAIGN,
                expect.objectContaining({
                    targetName: 'Goblin',
                    delta: -2,
                    currentHp: 1,
                    maxHp: 7,
                    isHealing: true,
                }),
            );
        });

        it('handles target with no type field as monster', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(
                    mockCombatSummary([
                        { name: 'Unknown', maxHp: 20, currentHp: 5 },
                    ]),
                ),
            });

            await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'Unknown',
            );

            expect(addEntry).toHaveBeenCalledWith(
                CAMPAIGN,
                expect.objectContaining({
                    targetName: 'Unknown',
                    delta: -4,
                    currentHp: 1,
                    maxHp: 20,
                    isHealing: true,
                }),
            );
        });
    });

    describe('runtime store updates', () => {
        it('sets currentHitPoints to 1 for the target', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(
                    mockCombatSummary([
                        { name: 'Ally', maxHp: 30, currentHp: 0, type: 'player' },
                    ]),
                ),
            });

            await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'Ally',
            );

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Ally',
                'currentHitPoints',
                1,
                CAMPAIGN,
            );
        });

        it('resets deathSaves to all false', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(
                    mockCombatSummary([
                        { name: 'Ally', maxHp: 30, currentHp: 0, type: 'player' },
                    ]),
                ),
            });

            await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'Ally',
            );

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Ally',
                'deathSaves',
                [false, false, false],
                CAMPAIGN,
            );
        });

        it('resets deathFailures to all false', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(
                    mockCombatSummary([
                        { name: 'Ally', maxHp: 30, currentHp: 0, type: 'player' },
                    ]),
                ),
            });

            await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'Ally',
            );

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Ally',
                'deathFailures',
                [false, false, false],
                CAMPAIGN,
            );
        });

        it('sets isDead to 0', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(
                    mockCombatSummary([
                        { name: 'Ally', maxHp: 30, currentHp: 0, type: 'player' },
                    ]),
                ),
            });

            await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'Ally',
            );

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Ally',
                'isDead',
                0,
                CAMPAIGN,
            );
        });

        it('sets all four runtime values in correct order', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(
                    mockCombatSummary([
                        { name: 'Ally', maxHp: 30, currentHp: 0, type: 'player' },
                    ]),
                ),
            });

            await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'Ally',
            );

            expect(setRuntimeValue).toHaveBeenNthCalledWith(
                1, 'Ally', 'currentHitPoints', 1, CAMPAIGN,
            );
            expect(setRuntimeValue).toHaveBeenNthCalledWith(
                2, 'Ally', 'deathSaves', [false, false, false], CAMPAIGN,
            );
            expect(setRuntimeValue).toHaveBeenNthCalledWith(
                3, 'Ally', 'deathFailures', [false, false, false], CAMPAIGN,
            );
            expect(setRuntimeValue).toHaveBeenNthCalledWith(
                4, 'Ally', 'isDead', 0, CAMPAIGN,
            );
        });
    });

    describe('log entry', () => {
        it('posts an hp_change log entry for successful revival', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(
                    mockCombatSummary([
                        { name: 'Ally', maxHp: 30, currentHp: 0, type: 'player' },
                    ]),
                ),
            });

            await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats('Cleric'),
                CAMPAIGN,
                'Ally',
            );

            expect(addEntry).toHaveBeenCalledWith(
                CAMPAIGN,
                expect.objectContaining({
                    type: 'hp_change',
                    targetName: 'Ally',
                    delta: 1,
                    currentHp: 1,
                    maxHp: 30,
                    isHealing: true,
                    sourceName: 'Cleric',
                    note: 'Revivify',
                    timestamp: expect.any(Number),
                }),
            );
        });

        it('includes sourceName from playerStats', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(
                    mockCombatSummary([
                        { name: 'Ally', maxHp: 30, currentHp: 0, type: 'player' },
                    ]),
                ),
            });

            await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats('Paladin'),
                CAMPAIGN,
                'Ally',
            );

            expect(addEntry).toHaveBeenCalledWith(
                CAMPAIGN,
                expect.objectContaining({ sourceName: 'Paladin' }),
            );
        });

        it('uses spell name in the note field', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(
                    mockCombatSummary([
                        { name: 'Ally', maxHp: 30, currentHp: 0, type: 'player' },
                    ]),
                ),
            });

            await triggerRevivify(
                makeSpell('Raise Dead'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'Ally',
            );

            expect(addEntry).toHaveBeenCalledWith(
                CAMPAIGN,
                expect.objectContaining({ note: 'Raise Dead' }),
            );
        });

        it('logs with correct delta when target had HP above 0 (monster)', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(
                    mockCombatSummary([
                        { name: 'Goblin', maxHp: 7, currentHp: 2, type: 'monster' },
                    ]),
                ),
            });

            await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'Goblin',
            );

            expect(addEntry).toHaveBeenCalledWith(
                CAMPAIGN,
                expect.objectContaining({ delta: -1 }),
            );
        });
    });

    describe('event dispatch', () => {
        it('dispatches combat-summary-updated event on success', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(
                    mockCombatSummary([
                        { name: 'Ally', maxHp: 30, currentHp: 0, type: 'player' },
                    ]),
                ),
            });

            const eventHandler = vi.fn();
            window.addEventListener('combat-summary-updated', eventHandler);

            await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'Ally',
            );

            expect(eventHandler).toHaveBeenCalled();

            window.removeEventListener('combat-summary-updated', eventHandler);
        });
    });

    describe('result structure', () => {
        it('returns correct result structure for player target', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(
                    mockCombatSummary([
                        { name: 'Ally', maxHp: 30, currentHp: 0, type: 'player' },
                    ]),
                ),
            });

            const result = await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'Ally',
            );

            expect(result).toEqual({
                type: 'popup',
                payload: {
                    type: 'heal',
                    name: 'Revivify',
                    targetName: 'Ally',
                    finalHeal: 1,
                    total: 1,
                    formula: '1 HP (revived)',
                    rolls: [],
                    rawTotal: 1,
                },
            });
        });

        it('returns correct result structure for monster target with old HP', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(
                    mockCombatSummary([
                        { name: 'Goblin', maxHp: 7, currentHp: 3, type: 'monster' },
                    ]),
                ),
            });

            const result = await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'Goblin',
            );

            expect(result).toEqual({
                type: 'popup',
                payload: {
                    type: 'heal',
                    name: 'Revivify',
                    targetName: 'Goblin',
                    finalHeal: -2,
                    total: 1,
                    formula: '1 HP (revived)',
                    rolls: [],
                    rawTotal: 1,
                },
            });
        });

        it('includes targetName in result', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(
                    mockCombatSummary([
                        { name: 'TargetName', maxHp: 50, currentHp: 0, type: 'player' },
                    ]),
                ),
            });

            const result = await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'TargetName',
            );

            expect(result.payload.targetName).toBe('TargetName');
        });

        it('includes spell name in result', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(
                    mockCombatSummary([
                        { name: 'Target', maxHp: 50, currentHp: 0, type: 'player' },
                    ]),
                ),
            });

            const result = await triggerRevivify(
                makeSpell('CustomSpell'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'Target',
            );

            expect(result.payload.name).toBe('CustomSpell');
        });

        it('always sets total and rawTotal to 1', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(
                    mockCombatSummary([
                        { name: 'Target', maxHp: 50, currentHp: 0, type: 'player' },
                    ]),
                ),
            });

            const result = await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'Target',
            );

            expect(result.payload.total).toBe(1);
            expect(result.payload.rawTotal).toBe(1);
        });

        it('always sets formula to "1 HP (revived)"', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(
                    mockCombatSummary([
                        { name: 'Target', maxHp: 50, currentHp: 0, type: 'player' },
                    ]),
                ),
            });

            const result = await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'Target',
            );

            expect(result.payload.formula).toBe('1 HP (revived)');
        });
    });

    describe('error handling', () => {
        it('logs console.error when addEntry rejects but still returns success', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(
                    mockCombatSummary([
                        { name: 'Ally', maxHp: 30, currentHp: 0, type: 'player' },
                    ]),
                ),
            });
            vi.mocked(addEntry).mockReturnValue(Promise.reject(new Error('DB error')));

            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const result = await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats('Cleric'),
                'test-campaign',
                'Ally',
            );

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '[revivify] Error logging heal:',
                expect.any(Error),
            );
            expect(result).toEqual({
                type: 'popup',
                payload: {
                    type: 'heal',
                    name: 'Revivify',
                    targetName: 'Ally',
                    finalHeal: 1,
                    total: 1,
                    formula: '1 HP (revived)',
                    rolls: [],
                    rawTotal: 1,
                },
            });

            consoleErrorSpy.mockRestore();
        });
    });

    describe('edge cases', () => {
        it('handles target creature with no maxHp field', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(
                    mockCombatSummary([
                        { name: 'Unknown', currentHp: 0, type: 'player' },
                    ]),
                ),
            });

            const result = await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'Unknown',
            );

            expect(result).toEqual({
                type: 'popup',
                payload: {
                    type: 'heal',
                    name: 'Revivify',
                    targetName: 'Unknown',
                    finalHeal: 1,
                    total: 1,
                    formula: '1 HP (revived)',
                    rolls: [],
                    rawTotal: 1,
                },
            });
        });

        it('handles target creature with no currentHp field', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(
                    mockCombatSummary([
                        { name: 'Unknown', maxHp: 50, type: 'monster' },
                    ]),
                ),
            });

            await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'Unknown',
            );

            expect(addEntry).toHaveBeenCalledWith(
                CAMPAIGN,
                expect.objectContaining({
                    delta: 1,
                    currentHp: 1,
                    maxHp: 50,
                }),
            );
        });

        it('handles target not found in combat summary', async () => {
            vi.mocked(consumeMaterial).mockResolvedValue(true);
            global.fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(
                    mockCombatSummary([
                        { name: 'Other', maxHp: 30, currentHp: 0, type: 'player' },
                    ]),
                ),
            });

            const result = await triggerRevivify(
                makeSpell('Revivify'),
                {},
                makePlayerStats(),
                CAMPAIGN,
                'Target',
            );

            expect(result).toEqual({
                type: 'popup',
                payload: {
                    type: 'heal',
                    name: 'Revivify',
                    targetName: 'Target',
                    finalHeal: 1,
                    total: 1,
                    formula: '1 HP (revived)',
                    rolls: [],
                    rawTotal: 1,
                },
            });
        });
    });
});
