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
import { addEntry } from '../../ui/logService.js';
import { setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

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

describe('massHealService - condition removal', () => {
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

    describe('condition removal', () => {
        it('removes blinded, deafened, and poisoned conditions by default', async () => {
            vi.mocked(getDistanceFeet).mockReturnValue(30);
            vi.mocked(isDistanceInRange).mockReturnValue(true);
            vi.mocked(getRuntimeValue).mockImplementation((char, key) => {
                if (key === 'activeConditions') return ['Blinded', 'Deafened', 'Poisoned', 'Prone'];
                return 50;
            });
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

            const spell = makeSpell();
            await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Ally1',
                'activeConditions',
                ['Prone'],
                CAMPAIGN,
            );
        });

        it('removes conditions listed in status_effects on the spell', async () => {
            vi.mocked(getDistanceFeet).mockReturnValue(30);
            vi.mocked(isDistanceInRange).mockReturnValue(true);
            vi.mocked(getRuntimeValue).mockImplementation((char, key) => {
                if (key === 'activeConditions') return ['Blinded', 'Charmed', 'Exhaustion'];
                return 50;
            });
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

            const spell2024 = makeSpell({ status_effects: ['Blinded', 'Charmed'] });
            await triggerMassHeal(spell2024, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Ally1',
                'activeConditions',
                ['Exhaustion'],
                CAMPAIGN,
            );
        });

        it('does not call setRuntimeValue when no conditions to remove', async () => {
            vi.mocked(getDistanceFeet).mockReturnValue(30);
            vi.mocked(isDistanceInRange).mockReturnValue(true);
            vi.mocked(getRuntimeValue).mockImplementation((char, key) => {
                if (key === 'activeConditions') return ['Prone', 'Restrained'];
                return 50;
            });
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

            const spell = makeSpell();
            await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

            expect(setRuntimeValue).not.toHaveBeenCalledWith(
                'Ally1',
                'activeConditions',
                expect.anything(),
                CAMPAIGN,
            );
        });

        it('logs condition removal entries for each removed condition', async () => {
            vi.mocked(getDistanceFeet).mockReturnValue(30);
            vi.mocked(isDistanceInRange).mockReturnValue(true);
            vi.mocked(getRuntimeValue).mockImplementation((char, key) => {
                if (key === 'activeConditions') return ['Blinded', 'Deafened', 'Poisoned'];
                return 50;
            });
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

            const spell = makeSpell();
            await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

            const conditionCalls = addEntry.mock.calls.filter(call => call[1]?.type === 'condition');
            expect(conditionCalls.length).toBe(3);
            const conditionsRemoved = conditionCalls.map(call => call[1].condition);
            expect(conditionsRemoved).toContain('Blinded');
            expect(conditionsRemoved).toContain('Deafened');
            expect(conditionsRemoved).toContain('Poisoned');
        });

        it('handles case-insensitive condition matching', async () => {
            vi.mocked(getDistanceFeet).mockReturnValue(30);
            vi.mocked(isDistanceInRange).mockReturnValue(true);
            vi.mocked(getRuntimeValue).mockImplementation((char, key) => {
                if (key === 'activeConditions') return ['blinded', 'DEAFENED', 'poisoned'];
                return 50;
            });
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

            const spell = makeSpell();
            await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Ally1',
                'activeConditions',
                [],
                CAMPAIGN,
            );
        });

        it('handles non-string condition values', async () => {
            vi.mocked(getDistanceFeet).mockReturnValue(30);
            vi.mocked(isDistanceInRange).mockReturnValue(true);
            vi.mocked(getRuntimeValue).mockImplementation((char, key) => {
                if (key === 'activeConditions') return [1, 'Blinded', 'Deafened'];
                return 50;
            });
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

            const spell = makeSpell();
            await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Ally1',
                'activeConditions',
                [1],
                CAMPAIGN,
            );
        });

        it('handles empty string conditions gracefully', async () => {
            vi.mocked(getDistanceFeet).mockReturnValue(30);
            vi.mocked(isDistanceInRange).mockReturnValue(true);
            vi.mocked(getRuntimeValue).mockImplementation((char, key) => {
                if (key === 'activeConditions') return ['', 'Blinded', ''];
                return 50;
            });
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

            const spell = makeSpell();
            await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'Ally1',
                'activeConditions',
                ['', ''],
                CAMPAIGN,
            );
        });
    });
});
