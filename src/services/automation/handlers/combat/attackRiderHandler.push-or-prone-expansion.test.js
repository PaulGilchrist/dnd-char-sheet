// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { handle } from './attackRiderHandler.js';

// ── Mocks ──────────────────────────────────────────────────────

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(() => null),
    setRuntimeValue: vi.fn(async () => {}),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(async () => {}),
}));

vi.mock('../../../automation/common/savePrompt.js', () => ({
    buildSaveDc: vi.fn(() => 14),
    createSaveListener: vi.fn(() => ({
        promptId: 'test-prompt',
        promise: Promise.resolve({ success: false, roll: 5, total: 5, saveBonus: 0 }),
    })),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(async () => ({
        creatures: [{ name: 'Goblin', size: 'Medium', position: { x: 1, y: 1 } }],
    })),
    getTargetFromAttacker: vi.fn(() => ({ name: 'Goblin' })),
}));

vi.mock('../../../rules/combat/rangeCheck.js', () => ({
    isWithinRange: vi.fn().mockResolvedValue(true),
}));

// ── Re-import after mocking ────────────────────────────────────

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';

// ── Helpers ────────────────────────────────────────────────────

function makePlayerStats(overrides = {}) {
    return {
        name: 'TestHero',
        proficiency: 3,
        abilities: [
            { name: 'Strength', bonus: 2 },
        ],
        ...overrides,
    };
}

// ── Tests ──────────────────────────────────────────────────────

describe('attackRiderHandler - push_or_prone expansion', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('empty options expansion', () => {
        it('should expand push_or_prone into Prone option with save fields and return null (save flow)', async () => {
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'targetEffects') return [];
                return null;
            });

            const action = {
                name: 'Charger',
                automation: {
                    type: 'attack_rider',
                    effect: 'push_or_prone',
                    options: [],
                    saveType: 'STR',
                    saveDc: 'ability',
                    saveAbility: 'STR',
                },
            };
            const result = await handle(action, makePlayerStats(), 'test-campaign', 'map');

            expect(result).toBeNull();

            // Verify targetEffects was set with the expanded option's fields
            const targetEffectsCall = setRuntimeValue.mock.calls.find(
                call => call[1] === 'targetEffects'
            );
            expect(targetEffectsCall).toBeDefined();
            const effects = targetEffectsCall[2];
            expect(effects).toHaveLength(1);
            expect(effects[0]).toEqual(
                expect.objectContaining({
                    effect: 'prone',
                    saveType: 'STR',
                    saveDc: 'ability',
                    saveAbility: 'STR',
                })
            );
        });

        it('should use custom saveType, saveDc, and saveAbility when provided', async () => {
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'targetEffects') return [];
                return null;
            });

            const action = {
                name: 'Trip Attack',
                automation: {
                    type: 'attack_rider',
                    effect: 'push_or_prone',
                    options: [],
                    saveType: 'DEX',
                    saveDc: 13,
                    saveAbility: 'DEX',
                },
            };
            await handle(action, makePlayerStats(), 'test-campaign', 'map');

            const targetEffectsCall = setRuntimeValue.mock.calls.find(
                call => call[1] === 'targetEffects'
            );
            expect(targetEffectsCall).toBeDefined();
            expect(targetEffectsCall[2][0]).toEqual(
                expect.objectContaining({
                    effect: 'prone',
                    saveType: 'DEX',
                    saveDc: 13,
                    saveAbility: 'DEX',
                })
            );
        });

        it('should use defaults when saveType/saveDc/saveAbility are omitted', async () => {
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'targetEffects') return [];
                return null;
            });

            const action = {
                name: 'Trip Attack',
                automation: {
                    type: 'attack_rider',
                    effect: 'push_or_prone',
                    options: [],
                },
            };
            await handle(action, makePlayerStats(), 'test-campaign', 'map');

            const targetEffectsCall = setRuntimeValue.mock.calls.find(
                call => call[1] === 'targetEffects'
            );
            expect(targetEffectsCall).toBeDefined();
            expect(targetEffectsCall[2][0]).toEqual(
                expect.objectContaining({
                    effect: 'prone',
                    saveType: 'STR',
                    saveDc: 'ability',
                    saveAbility: 'STR',
                })
            );
        });
    });

    describe('no expansion when options exist', () => {
        it('should NOT expand push_or_prone when options already have items', async () => {
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'targetEffects') return [];
                return null;
            });

            const action = {
                name: 'Charger',
                automation: {
                    type: 'attack_rider',
                    effect: 'push_or_prone',
                    options: [{ name: 'Push', effect: 'push', value: 10 }],
                },
            };
            const result = await handle(action, makePlayerStats(), 'test-campaign', 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('pushed 10 feet away');
        });

        it('should show modal when expanded options trigger chooseOne', async () => {
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'targetEffects') return [];
                return null;
            });

            const action = {
                name: 'Charger',
                automation: {
                    type: 'attack_rider',
                    effect: 'push_or_prone',
                    options: [],
                    chooseOne: true,
                },
            };
            const result = await handle(action, makePlayerStats(), 'test-campaign', 'map');

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('attackRider');
        });

        it('should show modal when expanded options trigger maxEffects > 1', async () => {
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'targetEffects') return [];
                return null;
            });

            const action = {
                name: 'Charger',
                automation: {
                    type: 'attack_rider',
                    effect: 'push_or_prone',
                    options: [],
                    maxEffects: 2,
                },
            };
            const result = await handle(action, makePlayerStats(), 'test-campaign', 'map');

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('attackRider');
        });

        it('should go through normal single-option path when oncePerTurn without trigger', async () => {
            getRuntimeValue.mockImplementation((_scope, key, _camp) => {
                if (key === 'targetEffects') return [];
                return null;
            });

            const action = {
                name: 'Charger',
                automation: {
                    type: 'attack_rider',
                    effect: 'push_or_prone',
                    oncePerTurn: true,
                    options: [],
                    saveType: 'STR',
                    saveDc: 'ability',
                    saveAbility: 'STR',
                },
            };
            const result = await handle(action, makePlayerStats(), 'test-campaign', 'map');

            // Without trigger field, should NOT go through Shield Bash path
            // Should go through normal single-option path with save flow
            expect(result).toBeNull();
        });
    });
});
