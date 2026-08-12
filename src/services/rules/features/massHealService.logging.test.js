import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

vi.mock('../combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
}));

vi.mock('../combat/applyHealing.js', () => ({
    applyHealingToTarget: vi.fn(),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../combat/rangeValidation.js', () => ({
    getDistanceFeet: vi.fn(),
    rangeToFeet: vi.fn(),
}));

vi.mock('../combat/rangeCheck.js', () => ({
    isDistanceInRange: vi.fn(),
}));

vi.mock('../../combat/automation/automationService.js', () => ({
    resolveHealingBonusesWithDetails: vi.fn(() => ({ totalBonus: 0, details: [] })),
    markFortifiedHealthUsed: vi.fn(),
}));

// ── Imports ────────────────────────────────────────────────────

import { triggerMassHeal } from './massHealService.js';
import { getCombatContext } from '../combat/damageUtils.js';
import { applyHealingToTarget } from '../combat/applyHealing.js';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { getDistanceFeet } from '../combat/rangeValidation.js';
import { rangeToFeet } from '../combat/rangeValidation.js';
import { isDistanceInRange } from '../combat/rangeCheck.js';
import { addEntry } from '../../ui/logService.js';

// ── Globals ────────────────────────────────────────────────────

global.fetch = vi.fn(() => new Promise(() => {}));

const CAMPAIGN = 'test-campaign';

function makeSpell(overrides = {}) {
    return {
        name: 'Mass Heal',
        level: 9,
        range: '60 feet',
        heal_at_slot_level: { 9: '700' },
        ...overrides,
    };
}

function makePlayerStats(overrides = {}) {
    return {
        name: 'Cleric',
        abilities: [{ name: 'Wisdom', bonus: 5 }],
        proficiency: 5,
        spellAbilities: { spellCastingAbility: 'Wisdom', toHit: 14, saveDc: 19, modifier: 5 },
        automation: { passives: [] },
        level: 17,
        hitPoints: 100,
        ...overrides,
    };
}

// ── Tests ──────────────────────────────────────────────────────

describe('massHealService - logging and results', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(rangeToFeet).mockReturnValue(60);
        vi.mocked(isDistanceInRange).mockReturnValue(true);
        vi.mocked(applyHealingToTarget).mockReturnValue({ actualHeal: 0, oldHp: 50, newHp: 50 });
        vi.mocked(getRuntimeValue).mockImplementation((_char, key) => {
            if (key === 'activeConditions' || key === 'targetEffects') return [];
            return undefined;
        });
    });

    describe('logging and events', () => {
        it('posts log entries for each target that receives healing', async () => {
            vi.mocked(getDistanceFeet).mockReturnValue(30);
            vi.mocked(isDistanceInRange).mockReturnValue(true);
            vi.mocked(applyHealingToTarget).mockReturnValue({ actualHeal: 2, oldHp: 5, newHp: 7 });
            getCombatContext.mockResolvedValue({
                players: [
                    { name: 'Cleric', gridX: 0, gridY: 0 },
                    { name: 'Ally1', gridX: 6, gridY: 0 },
                ],
                creatures: [
                    { name: 'Cleric', maxHp: 100, currentHp: 50 },
                    { name: 'Ally1', maxHp: 7, currentHp: 5 },
                ],
            });
            vi.mocked(getRuntimeValue).mockReturnValue(5);

            const spell = makeSpell();
            await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

            const hpCall = addEntry.mock.calls.find(call => call[1]?.targetName === 'Ally1');
            expect(hpCall).toBeDefined();
            expect(hpCall[1]).toEqual(expect.objectContaining({
                type: 'hp_change',
                targetName: 'Ally1',
                delta: 2,
                currentHp: 7,
                maxHp: 7,
                isHealing: true,
                sourceName: 'Cleric',
                note: 'Mass Heal',
            }));
        });

        it('includes formula in log entry', async () => {
            const { resolveHealingBonusesWithDetails } = await import('../../combat/automation/automationService.js');
            resolveHealingBonusesWithDetails.mockReturnValue({ totalBonus: 0, details: [] });
            vi.mocked(getDistanceFeet).mockReturnValue(30);
            vi.mocked(isDistanceInRange).mockReturnValue(true);
            vi.mocked(applyHealingToTarget).mockReturnValue({ actualHeal: 2, oldHp: 5, newHp: 7 });
            getCombatContext.mockResolvedValue({
                players: [
                    { name: 'Cleric', gridX: 0, gridY: 0 },
                    { name: 'Ally1', gridX: 6, gridY: 0 },
                ],
                creatures: [
                    { name: 'Cleric', maxHp: 100, currentHp: 50 },
                    { name: 'Ally1', maxHp: 7, currentHp: 5 },
                ],
            });
            vi.mocked(getRuntimeValue).mockReturnValue(5);

            const spell = makeSpell();
            await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

            const hpCall = addEntry.mock.calls.find(call => call[1]?.targetName === 'Ally1');
            expect(hpCall[1].formula).toBe('700');
        });

        it('includes bonus details in formula when present', async () => {
            const { resolveHealingBonusesWithDetails } = await import('../../combat/automation/automationService.js');
            resolveHealingBonusesWithDetails.mockReturnValue({ totalBonus: 5, details: [{ name: 'Test Bonus', amount: 5 }] });
            vi.mocked(getDistanceFeet).mockReturnValue(30);
            vi.mocked(isDistanceInRange).mockReturnValue(true);
            vi.mocked(applyHealingToTarget).mockReturnValue({ actualHeal: 2, oldHp: 5, newHp: 7 });
            getCombatContext.mockResolvedValue({
                players: [
                    { name: 'Cleric', gridX: 0, gridY: 0 },
                    { name: 'Ally1', gridX: 6, gridY: 0 },
                ],
                creatures: [
                    { name: 'Cleric', maxHp: 100, currentHp: 50 },
                    { name: 'Ally1', maxHp: 7, currentHp: 5 },
                ],
            });
            vi.mocked(getRuntimeValue).mockReturnValue(5);

            const spell = makeSpell();
            await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

            const hpCall = addEntry.mock.calls.find(call => call[1]?.targetName === 'Ally1');
            expect(hpCall[1].formula).toContain('700');
            expect(hpCall[1].formula).toContain('Test Bonus');
        });

        it('dispatches combat-summary-updated event', async () => {
            vi.mocked(getDistanceFeet).mockReturnValue(30);
            vi.mocked(isDistanceInRange).mockReturnValue(true);
            vi.mocked(applyHealingToTarget).mockReturnValue({ actualHeal: 0, oldHp: 50, newHp: 50 });
            getCombatContext.mockResolvedValue({
                players: [
                    { name: 'Cleric', gridX: 0, gridY: 0 },
                    { name: 'Ally1', gridX: 6, gridY: 0 },
                ],
                creatures: [
                    { name: 'Cleric', maxHp: 100, currentHp: 50 },
                    { name: 'Ally1', maxHp: 100, currentHp: 50 },
                ],
            });
            vi.mocked(getRuntimeValue).mockReturnValue(50);

            const eventHandler = vi.fn();
            window.addEventListener('combat-summary-updated', eventHandler);

            const spell = makeSpell();
            await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

            expect(eventHandler).toHaveBeenCalled();

            window.removeEventListener('combat-summary-updated', eventHandler);
        });
    });

    describe('result structure', () => {
        it('returns correct result structure with targets, totalHealed, rolls, and rawTotal', async () => {
            vi.mocked(getDistanceFeet).mockReturnValue(30);
            vi.mocked(isDistanceInRange).mockReturnValue(true);
            vi.mocked(applyHealingToTarget).mockReturnValue({ actualHeal: 2, oldHp: 5, newHp: 7 });
            getCombatContext.mockResolvedValue({
                players: [
                    { name: 'Cleric', gridX: 0, gridY: 0 },
                    { name: 'Ally1', gridX: 6, gridY: 0 },
                    { name: 'Ally2', gridX: 12, gridY: 0 },
                ],
                creatures: [
                    { name: 'Cleric', maxHp: 100, currentHp: 50 },
                    { name: 'Ally1', maxHp: 7, currentHp: 5 },
                    { name: 'Ally2', maxHp: 15, currentHp: 10 },
                ],
            });
            vi.mocked(getRuntimeValue).mockImplementation((name) => {
                if (name === 'Ally1') return 5;
                if (name === 'Ally2') return 10;
                return 50;
            });

            const spell = makeSpell();
            const result = await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

            expect(result).toEqual(expect.objectContaining({
                targets: expect.arrayContaining([
                    expect.objectContaining({ targetName: 'Ally1', healAmount: 2 }),
                    expect.objectContaining({ targetName: 'Ally2', healAmount: 5 }),
                ]),
                totalHealed: expect.any(Number),
                rolls: [],
                rawTotal: 700,
            }));
        });

        it('calculates totalHealed as sum of all individual heal amounts', async () => {
            vi.mocked(getDistanceFeet).mockReturnValue(30);
            vi.mocked(isDistanceInRange).mockReturnValue(true);
            vi.mocked(applyHealingToTarget).mockImplementation((_cs, name) => {
                if (name === 'Ally1') return { actualHeal: 2, oldHp: 5, newHp: 7 };
                if (name === 'Ally2') return { actualHeal: 5, oldHp: 10, newHp: 15 };
                return { actualHeal: 0, oldHp: 0, newHp: 0 };
            });
            getCombatContext.mockResolvedValue({
                players: [
                    { name: 'Cleric', gridX: 0, gridY: 0 },
                    { name: 'Ally1', gridX: 6, gridY: 0 },
                    { name: 'Ally2', gridX: 12, gridY: 0 },
                ],
                creatures: [
                    { name: 'Cleric', maxHp: 100, currentHp: 50 },
                    { name: 'Ally1', maxHp: 7, currentHp: 5 },
                    { name: 'Ally2', maxHp: 15, currentHp: 10 },
                ],
            });
            vi.mocked(getRuntimeValue).mockImplementation((name) => {
                if (name === 'Ally1') return 5;
                if (name === 'Ally2') return 10;
                return 50;
            });

            const spell = makeSpell();
            const result = await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

            expect(result.totalHealed).toBe(
                result.targets.reduce((sum, t) => sum + t.healAmount, 0),
            );
        });

        it('returns zero totalHealed when no targets receive healing', async () => {
            vi.mocked(getDistanceFeet).mockReturnValue(30);
            vi.mocked(isDistanceInRange).mockReturnValue(true);
            vi.mocked(applyHealingToTarget).mockReturnValue({ actualHeal: 0, oldHp: 100, newHp: 100 });
            getCombatContext.mockResolvedValue({
                players: [
                    { name: 'Cleric', gridX: 0, gridY: 0 },
                    { name: 'Ally1', gridX: 6, gridY: 0 },
                ],
                creatures: [
                    { name: 'Cleric', maxHp: 100, currentHp: 50 },
                    { name: 'Ally1', maxHp: 100, currentHp: 100 },
                ],
            });
            vi.mocked(getRuntimeValue).mockReturnValue(100);

            const spell = makeSpell();
            const result = await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

            expect(result.totalHealed).toBe(0);
        });
    });

    describe('rangeToFeet behavior', () => {
        it('handles 60 feet range correctly', async () => {
            vi.mocked(rangeToFeet).mockReturnValue(60);
            vi.mocked(getDistanceFeet).mockReturnValue(30);
            vi.mocked(isDistanceInRange).mockReturnValue(true);
            getCombatContext.mockResolvedValue({
                players: [
                    { name: 'Cleric', gridX: 0, gridY: 0 },
                    { name: 'Ally1', gridX: 6, gridY: 0 },
                ],
                creatures: [
                    { name: 'Cleric', maxHp: 100, currentHp: 50 },
                    { name: 'Ally1', maxHp: 50, currentHp: 25 },
                ],
            });
            vi.mocked(getRuntimeValue).mockReturnValue(25);

            const spell = makeSpell();
            const result = await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

            expect(result).not.toBeNull();
        });

        it('allows all creatures when range resolves to null (self range)', async () => {
            vi.mocked(rangeToFeet).mockReturnValue(null);
            vi.mocked(isDistanceInRange).mockReturnValue(true);
            getCombatContext.mockResolvedValue({
                players: [],
                creatures: [
                    { name: 'Ally1', maxHp: 50, currentHp: 25 },
                    { name: 'Ally2', maxHp: 60, currentHp: 30 },
                ],
            });
            vi.mocked(getRuntimeValue).mockReturnValue(25);

            const spell = makeSpell({ range: 'Self' });
            const result = await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

            expect(result.targets).toHaveLength(2);
        });
    });

    describe('error handling', () => {
        it('throws when combatSummary.creatures is null', async () => {
            getCombatContext.mockResolvedValue({
                players: [{ name: 'Cleric', gridX: 0, gridY: 0 }],
                creatures: null,
            });

            const spell = makeSpell();
            await expect(
                triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null),
            ).rejects.toThrow('Expected array, got');
        });
    });
});
