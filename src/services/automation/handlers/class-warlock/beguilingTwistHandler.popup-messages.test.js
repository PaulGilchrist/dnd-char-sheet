import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handle } from './beguilingTwistHandler.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(async () => {}),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../rules/combat/rangeCheck.js', () => ({
    isWithinRange: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
}));

vi.mock('../../common/savePrompt.js', () => ({
    createSaveListener: vi.fn().mockReturnValue({ promptId: 'test-prompt-id' }),
    buildSaveDc: vi.fn().mockReturnValue(15),
}));

vi.mock('../../common/damageRollback.js', () => ({
    findLastAttack: vi.fn(),
}));

vi.mock('../../../rules/effects/expirations.js', () => ({
    addExpiration: vi.fn(),
}));

await import('../../../../hooks/runtime/useRuntimeState.js');
const { findLastAttack } = await import('../../common/damageRollback.js');
const { addEntry } = await import('../../../ui/logService.js');
const { isWithinRange } = await import('../../../rules/combat/rangeCheck.js');
const { getCombatContext } = await import('../../../rules/combat/damageUtils.js');
const { createSaveListener } = await import('../../common/savePrompt.js');
await import('../../../rules/effects/expirations.js');

const campaignName = 'test-campaign';
const playerName = 'WarlockPlayer';

function makePlayerStats(overrides = {}) {
    return {
        name: playerName,
        level: 10,
        proficiency: 4,
        abilities: [{ name: 'Charisma', bonus: 3 }],
        ...overrides,
    };
}

function makeAction(automation = {}) {
    return {
        name: 'Beguiling Twist',
        automation: { type: 'reaction_save', ...automation },
    };
}

describe('beguilingTwistHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        findLastAttack.mockResolvedValue({
            attackEvent: null,
            attackerName: null,
            targetName: null,
            primaryDamage: 0,
            secondaryDamage: 0,
            totalDamage: 0,
            damageTypes: [],
        });
        getCombatContext.mockResolvedValue({
            creatures: [
                { name: 'Ally1', type: 'player' },
                { name: playerName, type: 'player' },
                { name: 'Goblin', type: 'monster' },
            ],
        });
        isWithinRange.mockResolvedValue(true);
    });

    describe('different-creature popup messages', () => {
        beforeEach(() => {
            findLastAttack.mockReset().mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: 'Ally1',
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });
        });

        it('should show "cannot determine targets" when combat context is null', async () => {
            getCombatContext.mockReset().mockResolvedValue(null);

            const result = await handle(makeAction({ target: 'different_creature' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Cannot determine targets');
        });

        it('should show "cannot determine targets" when combat context has no creatures', async () => {
            getCombatContext.mockReset().mockResolvedValue({ creatures: null });

            const result = await handle(makeAction({ target: 'different_creature' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('Cannot determine targets');
        });

        it('should show "no other creatures available" when only the attacker exists in combat', async () => {
            getCombatContext.mockReset().mockResolvedValue({ creatures: [{ name: 'Goblin' }] });

            const result = await handle(makeAction({ target: 'different_creature' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('no other creatures are available to target');
        });
    });

    describe('save prompt and logging', () => {
        it('should create save listener with correct parameters', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            expect(createSaveListener).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                targetName: playerName,
                saveType: 'WIS',
                saveDc: 15,
            }));
        });

        it('should log ability_use entry on activation', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                characterName: playerName,
                abilityName: 'Beguiling Twist',
                promptId: 'test-prompt-id',
            }));
        });

        it('should use custom feature name from action', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            await handle({ name: 'My Custom Twist', automation: { type: 'reaction_save', target: 'self' } }, makePlayerStats(), campaignName, null);

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                abilityName: 'My Custom Twist',
            }));
        });

        it('should default feature name to Beguiling Twist when not provided', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            await handle({ automation: { type: 'reaction_save', target: 'self' } }, makePlayerStats(), campaignName, null);

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                abilityName: 'Beguiling Twist',
            }));
        });

        it('should return popup with targetName in payload', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            const result = await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.targetName).toBe(playerName);
        });

        it('should add event listener for save-result', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
            await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            expect(addEventListenerSpy).toHaveBeenCalledWith('save-result', expect.any(Function));
            addEventListenerSpy.mockRestore();
        });
    });

    describe('condition type handling', () => {
        it('should default to charmed_frightened condition type', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                description: expect.stringContaining('Charmed or Frightened'),
            }));
        });

        it('should use charmed condition type when specified', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            await handle(makeAction({ target: 'self', condition: 'charmed' }), makePlayerStats(), campaignName, null);

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                description: expect.stringContaining('Charmed'),
            }));
        });

        it('should use frightened condition type when specified', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            await handle(makeAction({ target: 'self', condition: 'frightened' }), makePlayerStats(), campaignName, null);

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                description: expect.stringContaining('Frightened'),
            }));
        });
    });
});
