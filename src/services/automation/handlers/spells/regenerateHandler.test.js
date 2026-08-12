import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../combat/automation/automationExpressions.js', () => ({
    evaluateAutoExpression: vi.fn(),
}));

vi.mock('../../../rules/combat/applyHealing.js', () => ({
    applyHealingToTarget: vi.fn(),
}));

vi.mock('../../../encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(),
}));

import { handle } from './regenerateHandler.js';
import { getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';

const campaignName = 'TestCampaign';
const casterName = 'Cleric1';

function makePlayerStats(overrides = {}) {
    return {
        name: casterName,
        level: 7,
        proficiency: 4,
        abilities: [{ name: 'Wisdom', bonus: 3 }],
        hitPoints: 50,
        ...overrides,
    };
}

function makeAction(overrides = {}) {
    return {
        name: 'Regenerate',
        automation: { ...overrides.automation },
        spell: {
            name: 'Regenerate',
            range: 'Touch',
            level: 7,
            ...overrides.spell,
        },
        ...Object.fromEntries(
            Object.entries(overrides).filter(([k]) => !['spell', 'automation'].includes(k)),
        ),
    };
}

const baseCombatContext = {
    creatures: [
        { name: 'Goblin', type: 'monster', maxHp: 7, currentHp: 3 },
        { name: 'Orc', type: 'monster', maxHp: 15, currentHp: 10 },
        { name: casterName, type: 'player', maxHp: 50, currentHp: 25 },
    ],
    players: [{ name: casterName }],
    placedItems: [],
};

describe('handle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('spell identification', () => {
        it('should return null when spell name does not match', async () => {
            const result = await handle(
                makeAction({ spell: { name: 'Cure Wounds' } }),
                makePlayerStats(),
                campaignName,
                null,
            );
            expect(result).toBeNull();
        });

        it('should return null when spell is missing', async () => {
            const result = await handle(
                { name: 'Regenerate' },
                makePlayerStats(),
                campaignName,
                null,
            );
            expect(result).toBeNull();
        });

        it('should match spell name case-sensitively', async () => {
            const result = await handle(
                makeAction({ spell: { name: 'regenerate' } }),
                makePlayerStats(),
                campaignName,
                null,
            );
            expect(result).toBeNull();
        });

        it('should match when spell name is exactly "Regenerate"', async () => {
            getCombatContext.mockResolvedValue(baseCombatContext);

            const result = await handle(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
            );
            expect(result).not.toBeNull();
            expect(result.type).toBe('popup');
        });
    });

    describe('combat context validation', () => {
        it('should return popup when no combat context exists', async () => {
            getCombatContext.mockResolvedValue(null);

            const result = await handle(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('No combat context found');
            expect(result.payload.description).toContain('Cannot apply Regenerate');
        });

        it('should include action name in the no-combat popup', async () => {
            getCombatContext.mockResolvedValue(null);

            const result = await handle(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
            );

            expect(result.payload.name).toBe('Regenerate');
        });
    });

    describe('target selection popup', () => {
        it('should include all creature names as targets', async () => {
            getCombatContext.mockResolvedValue(baseCombatContext);

            const result = await handle(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('regenerate_target_selection');
            expect(result.payload.creatureTargets).toEqual(['Goblin', 'Orc', casterName]);
        });

        it('should include caster in creature targets', async () => {
            getCombatContext.mockResolvedValue(baseCombatContext);

            const result = await handle(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
            );

            expect(result.payload.creatureTargets).toContain(casterName);
        });

        it('should use spell.range when provided', async () => {
            getCombatContext.mockResolvedValue(baseCombatContext);
            getRuntimeValue.mockReturnValue(null);

            const result = await handle(
                makeAction({ spell: { range: '30 feet' } }),
                makePlayerStats(),
                campaignName,
                null,
            );

            expect(result.payload.range).toBe('30 feet');
        });

        it('should default range to "Touch" when not provided', async () => {
            getCombatContext.mockResolvedValue(baseCombatContext);
            getRuntimeValue.mockReturnValue(null);

            const result = await handle(
                makeAction({ spell: {} }),
                makePlayerStats(),
                campaignName,
                null,
            );

            expect(result.payload.range).toBe('Touch');
        });

        it('should pass automation object in payload', async () => {
            getCombatContext.mockResolvedValue(baseCombatContext);

            const result = await handle(
                makeAction({ automation: { customField: 'value' } }),
                makePlayerStats(),
                campaignName,
                null,
            );

            expect(result.payload.automation).toEqual({ customField: 'value' });
        });

        it('should pass empty automation when action has no automation', async () => {
            getCombatContext.mockResolvedValue(baseCombatContext);

            const result = await handle(
                makeAction({ spell: { name: 'Regenerate' } }),
                makePlayerStats(),
                campaignName,
                null,
            );

            expect(result.payload.automation).toEqual({});
        });

        it('should work with empty creature list', async () => {
            getCombatContext.mockResolvedValue({ creatures: [] });

            const result = await handle(
                makeAction(),
                makePlayerStats(),
                campaignName,
                null,
            );

            expect(result.payload.creatureTargets).toEqual([]);
        });
    });
});
