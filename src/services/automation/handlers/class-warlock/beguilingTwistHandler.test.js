// @improved-by-ai
// @cleaned-by-ai
// @cleaned-by-ai
// @improved-by-ai
// @cleaned-by-ai
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
await import('../../../ui/logService.js');
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

    describe('range parsing', () => {
        it('should default to 120 when no range in automation', async () => {
            const result = await handle(makeAction(), makePlayerStats(), campaignName, null);
            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('120 ft');
        });

        it('should parse range from automation string', async () => {
            const result = await handle(makeAction({ range: '60_ft' }), makePlayerStats(), campaignName, null);
            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('60_ft');
        });

        it('should parse numeric range from automation string', async () => {
            const result = await handle(makeAction({ range: '30ft' }), makePlayerStats(), campaignName, null);
            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('30ft');
        });
    });

    describe('self-target mode (isSelf=true)', () => {
        it('should find triggering save when last attack targets self and hit', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true, rollType: 'attack' },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: ['slashing'],
            });

            const result = await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.targetName).toBe(playerName);
            expect(createSaveListener).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                targetName: playerName,
                saveType: 'WIS',
                saveDc: 15,
            }));
        });

        it('should return popup when last attack targets self but did not hit', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: false, rollType: 'attack' },
                attackerName: 'Goblin',
                targetName: playerName,
                hit: false,
                primaryDamage: 0,
                secondaryDamage: 0,
                totalDamage: 0,
                damageTypes: [],
            });

            const result = await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No recent successful save found');
        });

        it('should return popup when last attack targets different creature', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: 'OtherPlayer',
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            const result = await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No recent successful save found');
        });

        it('should return popup when no attack event exists', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: null,
                attackerName: null,
                targetName: null,
                primaryDamage: 0,
                secondaryDamage: 0,
                totalDamage: 0,
                damageTypes: [],
            });

            const result = await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No recent successful save found');
        });
    });

    describe('different-creature mode (isSelf=false)', () => {
        it('should find ally attack within range', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: 'Ally1',
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });
            isWithinRange.mockResolvedValue(true);

            const result = await handle(makeAction({ target: 'different_creature' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.targetName).toBe('Ally1');
            expect(createSaveListener).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                targetName: 'Ally1',
            }));
        });

        it('should return popup when ally is out of range', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: 'Ally1',
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });
            isWithinRange.mockResolvedValue(false);

            const result = await handle(makeAction({ target: 'different_creature' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No recent successful save found');
        });

        it('should default to 120ft range when range is null', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: 'Goblin',
                targetName: 'Ally1',
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            const result = await handle(makeAction({ target: 'different_creature', range: null }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.targetName).toBe('Ally1');
        });

        it('should return popup when attacker is the player themselves', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: { hit: true },
                attackerName: playerName,
                targetName: 'Ally1',
                hit: true,
                primaryDamage: 10,
                secondaryDamage: 0,
                totalDamage: 10,
                damageTypes: [],
            });

            const result = await handle(makeAction({ target: 'different_creature' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No recent successful save found');
        });

        it('should return popup when no attack event exists', async () => {
            findLastAttack.mockResolvedValue({
                attackEvent: null,
                attackerName: null,
                targetName: null,
                primaryDamage: 0,
                secondaryDamage: 0,
                totalDamage: 0,
                damageTypes: [],
            });

            const result = await handle(makeAction({ target: 'different_creature' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toContain('No recent successful save found');
        });
    });
});
