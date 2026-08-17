// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handle } from './bewitchingMagicHandler.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
}));

vi.mock('../../../combat/automation/automationExpressions.js', () => ({
    evaluateAutoExpression: vi.fn(),
}));

const { getRuntimeValue } = await import('../../../../hooks/runtime/useRuntimeState.js');
const { getCombatContext } = await import('../../../rules/combat/damageUtils.js');
const { evaluateAutoExpression } = await import('../../../combat/automation/automationExpressions.js');

const campaignName = 'test-campaign';
const playerName = 'TestWarlock';

const goblinCreature = { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 10 };
const warlockCreature = { name: playerName, type: 'player', currentHp: 20, maxHp: 20 };

function makePlayerStats(overrides = {}) {
    return {
        name: playerName,
        proficiency: 3,
        abilities: [{ name: 'Charisma', bonus: 2 }],
        ...overrides,
    };
}

function makeAction(overrides = {}) {
    return {
        name: 'Bewitching Magic',
        automation: { type: 'bewitching_magic', ...overrides },
    };
}

function makeEnchantmentAttack(attackerName = playerName) {
    return { attackerName, damageSchool: 'enchantment' };
}

function makeIllusionAttack(attackerName = playerName) {
    return { attackerName, damageSchool: 'illusion' };
}

function setupQualifyingAttack(lastAttack, freeCastCount = 1) {
    getRuntimeValue.mockImplementation((_name, key, _campaign) => {
        if (key === 'lastAttack') return lastAttack;
        if (key === '_Steps_of_the_Fey_freeCastCount') return freeCastCount;
        return null;
    });
    evaluateAutoExpression.mockReturnValue(1);
    getCombatContext.mockResolvedValue({
        creatures: [goblinCreature, warlockCreature],
    });
}

describe('bewitchingMagicHandler', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('guard: lastAttack checks', () => {
        it('returns popup when no lastAttack exists', async () => {
            getRuntimeValue.mockImplementation((_name, key, _campaign) => {
                if (key === 'lastAttack') return null;
                if (key === '_Steps_of_the_Fey_freeCastCount') return 1;
                return null;
            });
            evaluateAutoExpression.mockReturnValue(1);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('enchantment or illusion');
        });

        it('returns popup when attacker is not the warlock', async () => {
            setupQualifyingAttack(makeEnchantmentAttack('Goblin'), 1);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('enchantment or illusion');
        });

        it('returns popup when spell school is evocation', async () => {
            setupQualifyingAttack({ attackerName: playerName, damageSchool: 'evocation' }, 1);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('enchantment or illusion');
        });

        it('returns popup when damageSchool is null', async () => {
            setupQualifyingAttack({ attackerName: playerName, damageSchool: null }, 1);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('enchantment or illusion');
        });

        it('returns popup when damageSchool is undefined', async () => {
            setupQualifyingAttack({ attackerName: playerName }, 1);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('enchantment or illusion');
        });

        it('returns popup when spellSchool is not enchantment or illusion', async () => {
            getRuntimeValue.mockImplementation((_name, key, _campaign) => {
                if (key === 'lastAttack') return { attackerName: playerName, spellSchool: 'evocation' };
                if (key === '_Steps_of_the_Fey_freeCastCount') return 1;
                return null;
            });
            evaluateAutoExpression.mockReturnValue(1);
            getCombatContext.mockResolvedValue({ creatures: [goblinCreature, warlockCreature] });

            const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toContain('enchantment or illusion');
        });
    });

    describe('school field resolution', () => {
        it('uses lastAttack.spellSchool as primary source', async () => {
            getRuntimeValue.mockImplementation((_name, key, _campaign) => {
                if (key === 'lastAttack') return { attackerName: playerName, spellSchool: 'enchantment', damageSchool: 'evocation' };
                if (key === '_Steps_of_the_Fey_freeCastCount') return 1;
                return null;
            });
            evaluateAutoExpression.mockReturnValue(1);
            getCombatContext.mockResolvedValue({ creatures: [goblinCreature, warlockCreature] });

            const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

            expect(result.type).toBe('modal');
        });

        it('falls back to action.school when lastAttack has no school fields', async () => {
            getRuntimeValue.mockImplementation((_name, key, _campaign) => {
                if (key === 'lastAttack') return { attackerName: playerName };
                if (key === '_Steps_of_the_Fey_freeCastCount') return 1;
                return null;
            });
            evaluateAutoExpression.mockReturnValue(1);
            getCombatContext.mockResolvedValue({ creatures: [goblinCreature, warlockCreature] });

            const result = await handle({ name: 'Bewitching Magic', automation: { type: 'bewitching_magic' }, school: 'illusion' }, makePlayerStats(), campaignName, 'map');

            expect(result.type).toBe('modal');
        });

        it('falls back to lastAttack.damageSchool when spellSchool and action.school are absent', async () => {
            setupQualifyingAttack({ attackerName: playerName, damageSchool: 'enchantment' }, 1);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

            expect(result.type).toBe('modal');
        });

        it('is case-insensitive for school comparison', async () => {
            getRuntimeValue.mockImplementation((_name, key, _campaign) => {
                if (key === 'lastAttack') return { attackerName: playerName, spellSchool: 'ENCHANTMENT' };
                if (key === '_Steps_of_the_Fey_freeCastCount') return 1;
                return null;
            });
            evaluateAutoExpression.mockReturnValue(1);
            getCombatContext.mockResolvedValue({ creatures: [goblinCreature, warlockCreature] });

            const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

            expect(result.type).toBe('modal');
        });
    });

    describe('modal return for qualifying spells', () => {
        it('returns modal with enchantment school spell', async () => {
            setupQualifyingAttack(makeEnchantmentAttack(), 1);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('stepsOfTheFeyTaunt');
            expect(result.payload.mode).toBe('stepsOfTheFey');
            expect(result.payload.title).toBe('Bewitching Magic');
            expect(result.payload.featureName).toBe('Bewitching Magic');
            expect(result.payload.newCount).toBe(1);
            expect(result.payload.freeCastCountKey).toBe('_Steps_of_the_Fey_freeCastCount');
            expect(result.payload.saveDc).toBe(13); // 8 + 2 (CHA) + 3 (prof)
        });

        it('returns modal with illusion school spell', async () => {
            setupQualifyingAttack(makeIllusionAttack(), 1);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('stepsOfTheFeyTaunt');
            expect(result.payload.mode).toBe('stepsOfTheFey');
        });

        it('filters out the warlock from eligible targets', async () => {
            setupQualifyingAttack(makeEnchantmentAttack(), 1);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

            expect(result.payload.targets.length).toBe(1);
            expect(result.payload.targets[0].name).toBe('Goblin');
        });

        it('returns empty targets when only warlock is in combat', async () => {
            setupQualifyingAttack(makeEnchantmentAttack(), 1);
            getCombatContext.mockResolvedValue({ creatures: [warlockCreature] });

            const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

            expect(result.type).toBe('modal');
            expect(result.payload.targets.length).toBe(0);
        });

        it('returns modal with zero count when no uses remaining', async () => {
            setupQualifyingAttack(makeEnchantmentAttack(), 0);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

            expect(result.type).toBe('modal');
            expect(result.payload.mode).toBe('stepsOfTheFey');
            expect(result.payload.newCount).toBe(0);
            expect(result.payload.freeCastCountKey).toBe('_Steps_of_the_Fey_freeCastCount');
        });

        it('uses fallback count when runtime value is null', async () => {
            getRuntimeValue.mockImplementation((_name, key, _campaign) => {
                if (key === 'lastAttack') return makeEnchantmentAttack();
                return null;
            });
            evaluateAutoExpression.mockReturnValue(1);
            getCombatContext.mockResolvedValue({ creatures: [goblinCreature, warlockCreature] });

            const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

            expect(result.type).toBe('modal');
            expect(result.payload.newCount).toBe(1);
        });

        it('includes action, playerStats, and campaignName in modal payload', async () => {
            setupQualifyingAttack(makeEnchantmentAttack(), 1);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

            expect(result.payload.action).toBeDefined();
            expect(result.payload.action.automation.type).toBe('bewitching_magic');
            expect(result.payload.playerStats).toBeInstanceOf(Object);
            expect(result.payload.campaignName).toBe(campaignName);
        });

        it('handles getCombatContext returning null gracefully', async () => {
            setupQualifyingAttack(makeEnchantmentAttack(), 1);
            getCombatContext.mockResolvedValue(null);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

            expect(result.type).toBe('modal');
            expect(result.payload.targets).toEqual([]);
        });
    });

    describe('save DC calculation', () => {
        it('calculates save DC with proficiency and CHA bonus', async () => {
            setupQualifyingAttack(makeEnchantmentAttack(), 1);

            const result = await handle(makeAction(), makePlayerStats(), campaignName, 'map');

            expect(result.payload.saveDc).toBe(13); // 8 + 2 (CHA) + 3 (prof)
        });

        it('defaults to 8 when proficiency is missing', async () => {
            setupQualifyingAttack(makeEnchantmentAttack(), 1);

            const result = await handle(makeAction(), makePlayerStats({ proficiency: undefined }), campaignName, 'map');

            expect(result.payload.saveDc).toBe(10); // 8 + 2 (CHA) + 0 (no prof)
        });

        it('defaults to 8 when Charisma bonus is missing', async () => {
            setupQualifyingAttack(makeEnchantmentAttack(), 1);

            const result = await handle(makeAction(), makePlayerStats({ abilities: [] }), campaignName, 'map');

            expect(result.payload.saveDc).toBe(11); // 8 + 0 (no CHA) + 3 (prof)
        });

        it('defaults to 8 when both proficiency and CHA bonus are missing', async () => {
            setupQualifyingAttack(makeEnchantmentAttack(), 1);

            const result = await handle(makeAction(), makePlayerStats({ proficiency: undefined, abilities: [] }), campaignName, 'map');

            expect(result.payload.saveDc).toBe(8);
        });
    });
});
