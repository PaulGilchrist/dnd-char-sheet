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
const { addEntry } = await import('../../../ui/logService.js');
const { getCombatContext } = await import('../../../rules/combat/damageUtils.js');

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

function makeAttackResult(overrides = {}) {
    return {
        attackEvent: { hit: true },
        attackerName: 'Goblin',
        targetName: playerName,
        hit: true,
        primaryDamage: 10,
        secondaryDamage: 0,
        totalDamage: 10,
        damageTypes: [],
        ...overrides,
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
    });

    describe('no recent save found popup', () => {
        it('should return popup with no save message and correct range', async () => {
            let result = await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);
            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('No recent successful save found');
            expect(result.payload.description).toContain('120 ft');

            result = await handle(makeAction({ target: 'different_creature', range: '60_ft' }), makePlayerStats(), campaignName, null);
            expect(result.payload.description).toContain('60_ft');
        });

        it('should include feature name from action or default to Beguiling Twist', async () => {
            let result = await handle(
                { name: 'My Custom Twist', automation: { type: 'reaction_save', target: 'self' } },
                makePlayerStats(),
                campaignName,
                null
            );
            expect(result.payload.description).toContain('My Custom Twist');

            result = await handle(
                { automation: { type: 'reaction_save', target: 'self' } },
                makePlayerStats(),
                campaignName,
                null
            );
            expect(result.payload.description).toContain('Beguiling Twist');
        });
    });

    describe('valid self-target popup', () => {
        beforeEach(() => {
            findLastAttack.mockResolvedValue(makeAttackResult({
                targetName: playerName,
            }));
        });

        it('should return popup with correct payload structure for self-target', async () => {
            const result = await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.targetName).toBe(playerName);
            expect(result.payload.description).toContain('Charmed or Frightened');
            expect(result.payload.description).toContain('DC 15');
        });

        it('should reflect custom condition in popup description', async () => {
            const result = await handle(makeAction({ target: 'self', condition: 'charmed' }), makePlayerStats(), campaignName, null);

            expect(result.payload.description).toContain('Charmed');
            expect(result.payload.description).not.toContain('Frightened');
        });

        it('should log ability_use entry with feature name and promptId', async () => {
            await handle(makeAction({ target: 'self' }), makePlayerStats(), campaignName, null);

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                abilityName: 'Beguiling Twist',
                promptId: 'test-prompt-id',
            }));
        });

        it('should log ability_use entry with custom feature name', async () => {
            await handle(
                { name: 'Custom Twist', automation: { type: 'reaction_save', target: 'self' } },
                makePlayerStats(),
                campaignName,
                null
            );

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                abilityName: 'Custom Twist',
            }));
        });
    });

    describe('different-creature popup messages', () => {
        beforeEach(() => {
            findLastAttack.mockResolvedValue(makeAttackResult({
                attackerName: 'Goblin',
                targetName: 'Ally1',
            }));
            getCombatContext.mockResolvedValue({
                creatures: [
                    { name: 'Ally1', type: 'player' },
                    { name: playerName, type: 'player' },
                    { name: 'Goblin', type: 'monster' },
                ],
            });
        });

        it('should return popup with first non-attacker creature as targetName', async () => {
            const result = await handle(makeAction({ target: 'different_creature' }), makePlayerStats(), campaignName, null);

            expect(result.type).toBe('popup');
            expect(result.payload.targetName).toBe('Ally1');
        });

        it('should show "cannot determine targets" when combat context is null or has no creatures', async () => {
            getCombatContext.mockResolvedValue(null);
            let result = await handle(makeAction({ target: 'different_creature' }), makePlayerStats(), campaignName, null);
            expect(result.payload.description).toContain('Cannot determine targets');

            getCombatContext.mockResolvedValue({ creatures: null });
            result = await handle(makeAction({ target: 'different_creature' }), makePlayerStats(), campaignName, null);
            expect(result.payload.description).toContain('Cannot determine targets');
        });

        it('should show "no other creatures available" when only the saved creature exists in combat', async () => {
            getCombatContext.mockResolvedValue({ creatures: [{ name: 'Goblin' }] });

            const result = await handle(makeAction({ target: 'different_creature' }), makePlayerStats(), campaignName, null);

            expect(result.payload.description).toContain('Goblin succeeded on a save');
            expect(result.payload.description).toContain('no other creatures are available to target');
        });
    });
});
