// MN-015 regression: validateSizeLimit must resolve monster SIZE from
// monsters.json via getMonsterData (suffix-strip 'Hill Giant 1' -> 'Hill Giant')
// because EB combatSummary creatures historically carried no size field.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateSizeLimit } from './executeManeuver.js';
import * as damageUtils from '../../../../services/rules/combat/damageUtils.js';
import { getMonsterData } from '../../../../services/npcs/monsterUtils.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(async () => {}),
}));

vi.mock('../../../../services/ui/dataLoader.js', () => ({
    loadManeuvers: vi.fn(async () => []),
    loadMonsters: vi.fn(async () => []),
}));

vi.mock('../../../../services/encounters/combatData.js', () => ({
    getCurrentCombatRound: vi.fn(() => 1),
}));

vi.mock('../../../../services/rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn().mockResolvedValue({ creatures: [] }),
}));

vi.mock('../../../../services/automation/common/targetResolver.js', () => ({
    resolveTarget: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../../../services/dice/diceRoller.js', () => ({
    rollExpression: vi.fn(() => ({ total: 4 })),
}));

vi.mock('../../../../services/combat/automation/automationService.js', () => ({
    evaluateAutoExpression: vi.fn(() => 8),
}));

vi.mock('../../../../services/rules/effects/expirations.js', () => ({
    addExpiration: vi.fn(async () => {}),
}));

vi.mock('../../../../services/rules/combat/applyDamage.js', () => ({
    applyDamageToTarget: vi.fn(() => ({ finalDamage: 4 })),
}));

vi.mock('../../../../services/npcs/monsterUtils.js', () => ({
    getMonsterData: vi.fn(async () => null),
    getMonsterImageUrl: vi.fn(async () => null),
}));

const PUSHING = { name: 'Pushing Attack', sizeLimit: 'large_or_smaller' };
const makePlayerStats = (overrides = {}) => ({
    name: 'TestFighter',
    size: 'Medium',
    proficiency: 6,
    abilities: [],
    ...overrides,
});

describe('MN-015 validateSizeLimit — monster-data size resolution', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getMonsterData.mockResolvedValue(null);
        damageUtils.getCombatContext.mockResolvedValue({ creatures: [] });
    });

    it('refuses a Huge monster resolved from monster data when combatSummary has no size', async () => {
        damageUtils.getCombatContext.mockResolvedValue({
            creatures: [{ name: 'Hill Giant 1', type: 'npc' }],
        });
        getMonsterData.mockResolvedValue({ name: 'Hill Giant', size: 'Huge' });

        const result = await validateSizeLimit(PUSHING, 'Hill Giant 1', 'test-campaign', makePlayerStats());

        expect(result.valid).toBe(false);
        expect(result.description).toContain('Huge');
        expect(result.description).toContain('too large');
        expect(result.description).toContain('Large or smaller');
        expect(getMonsterData).toHaveBeenCalledWith('Hill Giant 1', null);
    });

    it('accepts a Medium monster resolved from monster data', async () => {
        damageUtils.getCombatContext.mockResolvedValue({
            creatures: [{ name: 'Gibbering Mouther 1', type: 'npc' }],
        });
        getMonsterData.mockResolvedValue({ name: 'Gibbering Mouther', size: 'Medium' });

        const result = await validateSizeLimit(PUSHING, 'Gibbering Mouther 1', 'test-campaign', makePlayerStats());

        expect(result.valid).toBe(true);
    });

    it('falls back to combatSummary target.size when monster data misses (renamed NPC)', async () => {
        damageUtils.getCombatContext.mockResolvedValue({
            creatures: [{ name: 'Bob', type: 'npc', size: 'Huge' }],
        });
        getMonsterData.mockResolvedValue(null);

        const result = await validateSizeLimit(PUSHING, 'Bob', 'test-campaign', makePlayerStats());

        expect(result.valid).toBe(false);
        expect(result.description).toContain('Huge');
        expect(result.description).toContain('Large or smaller');
    });

    it('accepts combatSummary target.size within the limit', async () => {
        damageUtils.getCombatContext.mockResolvedValue({
            creatures: [{ name: 'Ogre 1', type: 'npc', size: 'Large' }],
        });
        getMonsterData.mockResolvedValue({ name: 'Ogre', size: 'Large' });

        const result = await validateSizeLimit(PUSHING, 'Ogre 1', 'test-campaign', makePlayerStats());

        expect(result.valid).toBe(true);
    });

    it('skips monster lookup entirely when the maneuver has no sizeLimit', async () => {
        const result = await validateSizeLimit({ name: 'Precision Attack' }, 'Hill Giant 1', 'test-campaign', makePlayerStats());

        expect(result).toEqual({ valid: true });
        expect(getMonsterData).not.toHaveBeenCalled();
    });
});
