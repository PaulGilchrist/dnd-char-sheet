// @improved-by-ai
// @cleaned-by-ai
// @cleaned-by-ai
// @improved-by-ai
// @cleaned-by-ai
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
import { addEntry } from '../../ui/logService.js';
import { consumeMaterial } from '../spells/materialComponents.js';

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

describe('triggerRevivify - logging', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
});
