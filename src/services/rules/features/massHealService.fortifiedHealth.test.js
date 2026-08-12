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
import { getDistanceFeet, rangeToFeet } from '../combat/rangeValidation.js';
import { isDistanceInRange } from '../combat/rangeCheck.js';

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

describe('massHealService - fortified health', () => {
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

    describe('Fortified Health', () => {
        it('marks Fortified Health used when healing applied and bonus is from Fortified Health', async () => {
            const { resolveHealingBonusesWithDetails, markFortifiedHealthUsed } = await import('../../combat/automation/automationService.js');
            resolveHealingBonusesWithDetails.mockReturnValue({ totalBonus: 5, details: [{ name: 'Fortified Health', amount: 5 }] });
            vi.mocked(getDistanceFeet).mockReturnValue(30);
            vi.mocked(isDistanceInRange).mockReturnValue(true);
            vi.mocked(applyHealingToTarget).mockReturnValue({ actualHeal: 5, oldHp: 95, newHp: 100 });
            getCombatContext.mockResolvedValue({
                players: [
                    { name: 'Cleric', gridX: 0, gridY: 0 },
                    { name: 'Ally1', gridX: 6, gridY: 0 },
                ],
                creatures: [
                    { name: 'Cleric', maxHp: 100, currentHp: 50 },
                    { name: 'Ally1', maxHp: 100, currentHp: 95 },
                ],
            });
            vi.mocked(getRuntimeValue).mockReturnValue(95);

            const spell = makeSpell();
            await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

            expect(markFortifiedHealthUsed).toHaveBeenCalledWith(makePlayerStats(), CAMPAIGN);
        });

        it('does not mark Fortified Health when no healing applied', async () => {
            const { resolveHealingBonusesWithDetails, markFortifiedHealthUsed } = await import('../../combat/automation/automationService.js');
            resolveHealingBonusesWithDetails.mockReturnValue({ totalBonus: 5, details: [{ name: 'Fortified Health', amount: 5 }] });
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
            await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

            expect(markFortifiedHealthUsed).not.toHaveBeenCalled();
        });

        it('does not mark Fortified Health when bonus is from a different source', async () => {
            const { resolveHealingBonusesWithDetails, markFortifiedHealthUsed } = await import('../../combat/automation/automationService.js');
            resolveHealingBonusesWithDetails.mockReturnValue({ totalBonus: 5, details: [{ name: 'Other Bonus', amount: 5 }] });
            vi.mocked(getDistanceFeet).mockReturnValue(30);
            vi.mocked(isDistanceInRange).mockReturnValue(true);
            vi.mocked(applyHealingToTarget).mockReturnValue({ actualHeal: 5, oldHp: 95, newHp: 100 });
            getCombatContext.mockResolvedValue({
                players: [
                    { name: 'Cleric', gridX: 0, gridY: 0 },
                    { name: 'Ally1', gridX: 6, gridY: 0 },
                ],
                creatures: [
                    { name: 'Cleric', maxHp: 100, currentHp: 50 },
                    { name: 'Ally1', maxHp: 100, currentHp: 95 },
                ],
            });
            vi.mocked(getRuntimeValue).mockReturnValue(95);

            const spell = makeSpell();
            await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

            expect(markFortifiedHealthUsed).not.toHaveBeenCalled();
        });
    });
});
