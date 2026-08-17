// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handle } from './combatSuperiorityHandler.js';
import { getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import * as dataLoader from '../../../../services/ui/dataLoader.js';
import * as queries from './combatSuperiorityQueries.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(async () => {}),
}));

vi.mock('../../../../services/ui/dataLoader.js', () => ({
    loadManeuvers: vi.fn(),
    loadWildMagicSurgeTable: vi.fn(async () => []),
}));

vi.mock('../../../../services/encounters/combatData.js', () => ({
    getCurrentCombatRound: vi.fn(() => 1),
}));

vi.mock('../../../../services/ui/logService.js', () => ({
    addEntry: vi.fn(async () => {}),
}));

const SELECTION_KEY = 'BattleMasterManeuvers_selection';

const makeAction = (auto = {}) => ({
    name: 'Combat Superiority',
    automation: {
        type: 'combat_superiority',
        saveType: 'WIS',
        saveDc: 'ability',
        dieExpression: 'superiority_die',
        ...auto,
    },
});

const makePlayerStats = (overrides = {}) => ({
    name: 'TestFighter',
    proficiency: 3,
    abilities: [
        { name: 'STR', bonus: 4 },
        { name: 'DEX', bonus: 2 },
        { name: 'CON', bonus: 1 },
        { name: 'INT', bonus: 0 },
        { name: 'WIS', bonus: 0 },
        { name: 'CHA', bonus: 0 },
    ],
    level: 5,
    rules: '2024',
    automation: { passives: [], actions: [], bonusActions: [], reactions: [], specialActions: [] },
    ...overrides,
});

const defaultGetRuntimeValue = (_playerName, key, _campaignName) => {
    if (key === 'superiorityDice') return 4;
    if (key === SELECTION_KEY) return [];
    return undefined;
};

describe('combatSuperiorityHandler.handle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(queries, 'handleAttackRiderPrompt').mockResolvedValue(null);
        vi.spyOn(queries, 'handleSkillCheckPrompt').mockResolvedValue(null);

        getRuntimeValue.mockImplementation(defaultGetRuntimeValue);
    });

    // ── No maneuver data ────────────────────────────────────────────────

    describe('no maneuver data', () => {
        it('returns popup when loadManeuvers resolves to empty array', async () => {
            dataLoader.loadManeuvers.mockResolvedValue([]);

            const result = await handle(
                makeAction(),
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toBe('No maneuver data available.');
            expect(result.payload.name).toBe('Combat Superiority');
            expect(dataLoader.loadManeuvers).toHaveBeenCalledWith('2024');
        });
    });

    // ── No superiority dice ─────────────────────────────────────────────

    describe('no superiority dice', () => {
        it('returns popup when superiority dice is zero and no relentless', async () => {
            dataLoader.loadManeuvers.mockResolvedValue([
                { name: 'Trip Attack', effect: 'knock_prone' },
            ]);
            getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
                if (key === 'superiorityDice') return 0;
                if (key === SELECTION_KEY) return ['Trip Attack'];
                return undefined;
            });

            const result = await handle(
                makeAction(),
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toBe('No Superiority Dice remaining. Recharges on a Short or Long Rest.');
        });

        it('returns popup when superiority dice is negative', async () => {
            dataLoader.loadManeuvers.mockResolvedValue([
                { name: 'Trip Attack', effect: 'knock_prone' },
            ]);
            getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
                if (key === 'superiorityDice') return -1;
                if (key === SELECTION_KEY) return ['Trip Attack'];
                return undefined;
            });

            const result = await handle(
                makeAction(),
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toBe('No Superiority Dice remaining. Recharges on a Short or Long Rest.');
        });
    });

    // ── Relentless interaction ──────────────────────────────────────────

    describe('relentless interaction', () => {
        it('returns modal when relentless passive exists and dice are zero but not used this round', async () => {
            dataLoader.loadManeuvers.mockResolvedValue([
                { name: 'Trip Attack', effect: 'knock_prone' },
            ]);
            getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
                if (key === 'superiorityDice') return 0;
                if (key === SELECTION_KEY) return [];
                if (key === 'relentlessUsedRound') return undefined;
                return undefined;
            });

            const result = await handle(
                makeAction(),
                makePlayerStats({
                    automation: {
                        passives: [{ type: 'passive_rule', effect: 'relentless', name: 'Relentless' }],
                    },
                }),
                'test-campaign',
                null
            );

            expect(result.type).toBe('modal');
        });

        it('returns popup when relentless passive exists but already used this round', async () => {
            dataLoader.loadManeuvers.mockResolvedValue([
                { name: 'Trip Attack', effect: 'knock_prone' },
            ]);
            getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
                if (key === 'superiorityDice') return 0;
                if (key === SELECTION_KEY) return [];
                if (key === 'relentlessUsedRound') return 1;
                return undefined;
            });

            const result = await handle(
                makeAction(),
                makePlayerStats({
                    automation: {
                        passives: [{ type: 'passive_rule', effect: 'relentless', name: 'Relentless' }],
                    },
                }),
                'test-campaign',
                null
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toBe('No Superiority Dice remaining. Recharges on a Short or Long Rest.');
        });

        it('returns modal when has dice regardless of relentless state', async () => {
            dataLoader.loadManeuvers.mockResolvedValue([
                { name: 'Trip Attack', effect: 'knock_prone' },
            ]);
            getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
                if (key === 'superiorityDice') return 1;
                if (key === SELECTION_KEY) return [];
                if (key === 'relentlessUsedRound') return 1;
                return undefined;
            });

            const result = await handle(
                makeAction(),
                makePlayerStats({
                    automation: {
                        passives: [{ type: 'passive_rule', effect: 'relentless', name: 'Relentless' }],
                    },
                }),
                'test-campaign',
                null
            );

            expect(result.type).toBe('modal');
        });
    });

    // ── Modal with maneuver selection ───────────────────────────────────

    describe('modal with maneuver selection', () => {
        it('returns modal with all maneuvers when none known', async () => {
            dataLoader.loadManeuvers.mockResolvedValue([
                { name: 'Trip Attack', effect: 'knock_prone', saveType: 'STR' },
                { name: 'Pushing Attack', effect: 'push', saveType: 'STR', value: 15 },
            ]);

            const result = await handle(
                makeAction(),
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('combatSuperiority');
            expect(result.payload.allManeuvers).toHaveLength(2);
            expect(result.payload.knownManeuvers).toEqual([]);
            expect(result.payload.maxOptions).toBe(3);
            expect(result.payload.selectionMode).toBe(true);
            expect(result.payload.saveDc).toBe('ability');
            expect(result.payload.saveType).toBe('WIS');
            expect(result.payload.dieExpression).toBe('superiority_die');
        });

        it('returns modal without selectionMode when all maneuvers are known', async () => {
            dataLoader.loadManeuvers.mockResolvedValue([
                { name: 'Trip Attack', effect: 'knock_prone', saveType: 'STR' },
                { name: 'Pushing Attack', effect: 'push', saveType: 'STR', value: 15 },
            ]);
            getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
                if (key === 'superiorityDice') return 4;
                if (key === SELECTION_KEY) return ['Trip Attack', 'Pushing Attack'];
                return undefined;
            });

            const result = await handle(
                makeAction(),
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.type).toBe('modal');
            expect(result.payload.selectionMode).toBe(false);
            expect(result.payload.knownManeuvers).toEqual(['Trip Attack', 'Pushing Attack']);
        });

        it('enables selectionMode when some but not all maneuvers are known', async () => {
            dataLoader.loadManeuvers.mockResolvedValue([
                { name: 'Trip Attack', effect: 'knock_prone', saveType: 'STR' },
                { name: 'Pushing Attack', effect: 'push', saveType: 'STR', value: 15 },
                { name: 'Rally', effect: 'temp_hp' },
            ]);
            getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
                if (key === 'superiorityDice') return 4;
                if (key === SELECTION_KEY) return ['Trip Attack'];
                return undefined;
            });

            const result = await handle(
                makeAction(),
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.type).toBe('modal');
            expect(result.payload.selectionMode).toBe(true);
            expect(result.payload.knownManeuvers).toEqual(['Trip Attack']);
        });

        it('enables selectionMode when forceSelectionMode is true even if all known', async () => {
            dataLoader.loadManeuvers.mockResolvedValue([
                { name: 'Trip Attack', effect: 'knock_prone' },
                { name: 'Pushing Attack', effect: 'push' },
            ]);
            getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
                if (key === 'superiorityDice') return 4;
                if (key === SELECTION_KEY) return ['Trip Attack', 'Pushing Attack'];
                return undefined;
            });

            const result = await handle(
                makeAction({ forceSelectionMode: true }),
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.type).toBe('modal');
            expect(result.payload.selectionMode).toBe(true);
        });

        it('respects maxOptions from automation config', async () => {
            dataLoader.loadManeuvers.mockResolvedValue([
                { name: 'Trip Attack', effect: 'knock_prone' },
                { name: 'Pushing Attack', effect: 'push' },
                { name: 'Rally', effect: 'temp_hp' },
                { name: 'Riposte', effect: 'melee_attack_reaction' },
            ]);
            getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
                if (key === 'superiorityDice') return 4;
                if (key === SELECTION_KEY) return ['Trip Attack'];
                return undefined;
            });

            const result = await handle(
                makeAction({ maxOptions: 2 }),
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.payload.maxOptions).toBe(2);
            expect(result.payload.selectionMode).toBe(true);
        });

        it('applies level-based scaling to maxOptions', async () => {
            dataLoader.loadManeuvers.mockResolvedValue([
                { name: 'Trip Attack', effect: 'knock_prone' },
                { name: 'Pushing Attack', effect: 'push' },
            ]);
            getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
                if (key === 'superiorityDice') return 4;
                if (key === SELECTION_KEY) return [];
                return undefined;
            });

            const result = await handle(
                makeAction({ maxOptions: 2, maxOptionsScaling: { 10: 1, 15: 1 } }),
                makePlayerStats({ level: 12 }),
                'test-campaign',
                null
            );

            expect(result.payload.maxOptions).toBe(3);
        });

        it('uses base maxOptions when below first scaling threshold', async () => {
            dataLoader.loadManeuvers.mockResolvedValue([
                { name: 'Trip Attack', effect: 'knock_prone' },
            ]);
            getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
                if (key === 'superiorityDice') return 4;
                if (key === SELECTION_KEY) return [];
                return undefined;
            });

            const result = await handle(
                makeAction({ maxOptions: 2, maxOptionsScaling: { 10: 1, 15: 1 } }),
                makePlayerStats({ level: 5 }),
                'test-campaign',
                null
            );

            expect(result.payload.maxOptions).toBe(2);
        });

        it('passes saveDc and saveType from automation into payload', async () => {
            dataLoader.loadManeuvers.mockResolvedValue([
                { name: 'Trip Attack', effect: 'knock_prone' },
            ]);

            const result = await handle(
                makeAction({ saveDc: 16, saveType: 'DEX' }),
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.payload.saveDc).toBe(16);
            expect(result.payload.saveType).toBe('DEX');
        });

        it('passes dieExpression from automation into payload', async () => {
            dataLoader.loadManeuvers.mockResolvedValue([
                { name: 'Trip Attack', effect: 'knock_prone' },
            ]);

            const result = await handle(
                makeAction({ dieExpression: '2d6' }),
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.payload.dieExpression).toBe('2d6');
        });
    });

    // ── Ruleset handling ────────────────────────────────────────────────

    describe('ruleset handling', () => {
        it('loads maneuvers for 5e ruleset', async () => {
            dataLoader.loadManeuvers.mockResolvedValue([]);

            await handle(
                makeAction(),
                makePlayerStats({ rules: '5e' }),
                'test-campaign',
                null
            );

            expect(dataLoader.loadManeuvers).toHaveBeenCalledWith('5e');
        });

        it('defaults to 2024 ruleset when playerStats.rules is null', async () => {
            dataLoader.loadManeuvers.mockResolvedValue([]);

            await handle(
                makeAction(),
                makePlayerStats({ rules: null }),
                'test-campaign',
                null
            );

            expect(dataLoader.loadManeuvers).toHaveBeenCalledWith('2024');
        });

        it('defaults to 2024 ruleset when playerStats.rules is undefined', async () => {
            dataLoader.loadManeuvers.mockResolvedValue([]);

            await handle(
                makeAction(),
                makePlayerStats({ rules: undefined }),
                'test-campaign',
                null
            );

            expect(dataLoader.loadManeuvers).toHaveBeenCalledWith('2024');
        });

        it('defaults to 2024 ruleset when playerStats.rules is missing', async () => {
            dataLoader.loadManeuvers.mockResolvedValue([]);

            const stats = makePlayerStats();
            delete stats.rules;

            await handle(
                makeAction(),
                stats,
                'test-campaign',
                null
            );

            expect(dataLoader.loadManeuvers).toHaveBeenCalledWith('2024');
        });
    });

    // ── Known maneuvers tracking ────────────────────────────────────────

    describe('known maneuvers tracking', () => {
        it('returns known maneuver names from runtime storage', async () => {
            dataLoader.loadManeuvers.mockResolvedValue([
                { name: 'Trip Attack', effect: 'knock_prone' },
                { name: 'Pushing Attack', effect: 'push' },
            ]);
            getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
                if (key === 'superiorityDice') return 4;
                if (key === SELECTION_KEY) return ['Trip Attack'];
                return undefined;
            });

            const result = await handle(
                makeAction(),
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.payload.knownManeuvers).toEqual(['Trip Attack']);
        });

        it('filters known maneuvers to only those available in the maneuver list', async () => {
            dataLoader.loadManeuvers.mockResolvedValue([
                { name: 'Trip Attack', effect: 'knock_prone' },
                { name: 'Pushing Attack', effect: 'push' },
            ]);
            getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
                if (key === 'superiorityDice') return 4;
                if (key === SELECTION_KEY) return ['Trip Attack', 'Unknown Maneuver'];
                return undefined;
            });

            const result = await handle(
                makeAction(),
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.payload.knownManeuvers).toEqual(['Trip Attack']);
        });
    });

    // ── Early return paths via automation routing ───────────────────────

    describe('early return paths via automation routing', () => {
        it('delegates to bonus_action dispatcher when actionType is bonus_action', async () => {
            const result = await handle(
                { name: 'Test', automation: { actionType: 'bonus_action' } },
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
        });

        it('delegates to reaction dispatcher when actionType is reaction without reactionType', async () => {
            const result = await handle(
                { name: 'Test', automation: { actionType: 'reaction' } },
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
        });

        it('delegates to grant_attack dispatcher when reactionType is grant_attack', async () => {
            const result = await handle(
                { name: 'Test', automation: { actionType: 'reaction', reactionType: 'grant_attack' } },
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
        });

        it('delegates to commanding_presence dispatcher when reactionType is commanding_presence', async () => {
            const result = await handle(
                { name: 'Test', automation: { actionType: 'reaction', reactionType: 'commanding_presence' } },
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
        });

        it('falls through to reaction dispatcher for other reaction types', async () => {
            const result = await handle(
                { name: 'Test', automation: { actionType: 'reaction', reactionType: 'parry' } },
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
        });

        it('delegates to sweeping_attack dispatcher when actionType is sweeping_attack', async () => {
            const result = await handle(
                { name: 'Test', automation: { actionType: 'sweeping_attack' } },
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No secondary target selected');
        });

        it('delegates to movement dispatcher when actionType is movement', async () => {
            const result = await handle(
                { name: 'Test', automation: { actionType: 'movement' } },
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
        });

        it('delegates to skill_check dispatcher when actionType is skill_check', async () => {
            const result = await handle(
                { name: 'Test', automation: { actionType: 'skill_check' } },
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
        });

        it('delegates to handleAttackRiderPrompt when trigger is attack_rider', async () => {
            const result = await handle(
                { name: 'Test', automation: { trigger: 'attack_rider' } },
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(queries.handleAttackRiderPrompt).toHaveBeenCalledTimes(1);
            expect(result).toBeNull();
        });

        it('delegates to handleSkillCheckPrompt when trigger is skill_check', async () => {
            const result = await handle(
                { name: 'Test', automation: { trigger: 'skill_check' } },
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(queries.handleSkillCheckPrompt).toHaveBeenCalledTimes(1);
            expect(result).toBeNull();
        });

        it('prefers maneuverName over all routing logic', async () => {
            dataLoader.loadManeuvers.mockResolvedValue([
                { name: 'Trip Attack', effect: 'knock_prone', saveType: 'STR' },
            ]);
            getRuntimeValue.mockImplementation((_playerName, key, _campaignName) => {
                if (key === 'superiorityDice') return 4;
                if (key === SELECTION_KEY) return ['Trip Attack'];
                if (key === 'activeConditions') return [];
                return undefined;
            });

            const result = await handle(
                { name: 'Test', automation: { maneuverName: 'Trip Attack', type: 'combat_superiority', actionType: 'bonus_action' } },
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Trip Attack');
        });

        it('does not load maneuvers when delegating via actionType', async () => {
            await handle(
                { name: 'Test', automation: { actionType: 'bonus_action' } },
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(dataLoader.loadManeuvers).not.toHaveBeenCalled();
        });

        it('does not load maneuvers when delegating via trigger', async () => {
            await handle(
                { name: 'Test', automation: { trigger: 'attack_rider' } },
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(dataLoader.loadManeuvers).not.toHaveBeenCalled();
        });
    });
});
