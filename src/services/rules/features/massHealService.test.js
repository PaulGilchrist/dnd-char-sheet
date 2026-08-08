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
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../ui/logService.js';
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

describe('massHealService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(rangeToFeet).mockReturnValue(60);
        vi.mocked(isDistanceInRange).mockReturnValue(true);
        vi.mocked(applyHealingToTarget).mockReturnValue({ actualHeal: 0, oldHp: 0, newHp: 0 });
        vi.mocked(getRuntimeValue).mockImplementation((_char, key) => {
            if (key === 'activeConditions' || key === 'targetEffects') return [];
            return undefined;
        });
    });

    describe('triggerMassHeal', () => {
        describe('early returns and guard clauses', () => {
            it('returns null for non-Mass Heal spells', async () => {
                getCombatContext.mockResolvedValue({ players: [], creatures: [] });

                const result = await triggerMassHeal(
                    { name: 'Fire Bolt', level: 0 },
                    {},
                    makePlayerStats(),
                    CAMPAIGN,
                    null,
                );

                expect(result).toBeNull();
            });

            it('returns null when combat context is null', async () => {
                getCombatContext.mockResolvedValue(null);

                const result = await triggerMassHeal(
                    makeSpell(),
                    {},
                    makePlayerStats(),
                    CAMPAIGN,
                    null,
                );

                expect(result).toBeNull();
            });
        });

        describe('slot level validation', () => {
            it('returns noTargets when slot level is missing from both metaCtx and spell', async () => {
                getCombatContext.mockResolvedValue({ players: [], creatures: [] });
                const spell = { name: 'Mass Heal', level: null };

                const result = await triggerMassHeal(spell, {}, makePlayerStats(), CAMPAIGN, null);
                expect(result).toEqual({ noTargets: true });
            });

            it('uses spell.level when metaCtx has no slotLevel', async () => {
                getCombatContext.mockResolvedValue({
                    players: [{ name: 'Cleric', gridX: 0, gridY: 0 }],
                    creatures: [{ name: 'Cleric', maxHp: 100, currentHp: 50 }],
                });
                vi.mocked(getRuntimeValue).mockReturnValue(50);

                const spell = { name: 'Mass Heal', level: 9, heal_at_slot_level: { 9: '700' } };
                await triggerMassHeal(spell, {}, makePlayerStats(), CAMPAIGN, null);

                expect(rangeToFeet).toHaveBeenCalledWith('60 feet');
            });

            it('uses metaCtx.slotLevel when provided', async () => {
                getCombatContext.mockResolvedValue({
                    players: [{ name: 'Cleric', gridX: 0, gridY: 0 }],
                    creatures: [{ name: 'Cleric', maxHp: 100, currentHp: 50 }],
                });
                vi.mocked(getRuntimeValue).mockReturnValue(50);

                const spell = { name: 'Mass Heal', level: 9, heal_at_slot_level: { 9: '700' } };
                await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);
            });

            it('throws when heal_at_slot_level expression is not a valid number', async () => {
                vi.mocked(getDistanceFeet).mockReturnValue(30);
                vi.mocked(isDistanceInRange).mockReturnValue(true);
                getCombatContext.mockResolvedValue({
                    players: [{ name: 'Cleric', gridX: 0, gridY: 0 }],
                    creatures: [
                        { name: 'Cleric', maxHp: 100, currentHp: 50 },
                        { name: 'Ally1', maxHp: 50, currentHp: 25 },
                    ],
                });
                vi.mocked(getRuntimeValue).mockReturnValue(25);

                const spell = { name: 'Mass Heal', level: 9, heal_at_slot_level: { 9: 'invalid' } };

                await expect(
                    triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null),
                ).rejects.toThrow(/heal_at_slot_level expression must be a valid number/);
            });

            it('uses highest available slot level when exact level not found', async () => {
                getCombatContext.mockResolvedValue({
                    players: [{ name: 'Cleric', gridX: 0, gridY: 0 }],
                    creatures: [{ name: 'Cleric', maxHp: 100, currentHp: 50 }],
                });
                vi.mocked(getRuntimeValue).mockReturnValue(50);

                const spell = {
                    name: 'Mass Heal',
                    level: 9,
                    heal_at_slot_level: { 7: '400', 9: '700' },
                };

                const result = await triggerMassHeal(
                    spell,
                    { slotLevel: 8 },
                    makePlayerStats(),
                    CAMPAIGN,
                    null,
                );

                expect(result).not.toBeNull();
            });

            it('uses max when heal_at_slot_level expression is "max"', async () => {
                getCombatContext.mockResolvedValue({
                    players: [{ name: 'Cleric', gridX: 0, gridY: 0 }],
                    creatures: [{ name: 'Cleric', maxHp: 100, currentHp: 50 }],
                });
                vi.mocked(getRuntimeValue).mockReturnValue(50);

                const spell = {
                    name: 'Mass Heal',
                    level: 9,
                    heal_at_slot_level: { 9: 'max' },
                };

                const result = await triggerMassHeal(
                    spell,
                    { slotLevel: 9 },
                    makePlayerStats(),
                    CAMPAIGN,
                    null,
                );

                expect(result).not.toBeNull();
            });
        });

        describe('target selection with grid positions', () => {
            it('filters creatures by range when caster has grid position', async () => {
                vi.mocked(getDistanceFeet).mockReturnValue(30);
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
                expect(result.targets).toHaveLength(1);
                expect(result.targets[0].targetName).toBe('Ally1');
            });

            it('excludes the caster from targets', async () => {
                vi.mocked(getDistanceFeet).mockReturnValue(30);
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

                expect(result.targets.map(t => t.targetName)).not.toContain('Cleric');
            });

            it('sorts targets by distance (closest first)', async () => {
                vi.mocked(getDistanceFeet)
                    .mockReturnValueOnce(60)
                    .mockReturnValueOnce(30)
                    .mockReturnValueOnce(45);
                vi.mocked(isDistanceInRange).mockReturnValue(true);
                getCombatContext.mockResolvedValue({
                    players: [
                        { name: 'Cleric', gridX: 0, gridY: 0 },
                        { name: 'Far', gridX: 12, gridY: 0 },
                        { name: 'Mid', gridX: 9, gridY: 0 },
                        { name: 'Near', gridX: 6, gridY: 0 },
                    ],
                    creatures: [
                        { name: 'Cleric', maxHp: 100, currentHp: 50 },
                        { name: 'Far', maxHp: 30, currentHp: 15 },
                        { name: 'Mid', maxHp: 40, currentHp: 20 },
                        { name: 'Near', maxHp: 50, currentHp: 25 },
                    ],
                });
                vi.mocked(getRuntimeValue).mockReturnValue(15);

                const spell = makeSpell();
                const result = await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

                expect(result.targets.map(t => t.targetName)).toEqual(['Mid', 'Near', 'Far']);
            });

            it('limits targets to max 10', async () => {
                vi.mocked(getDistanceFeet).mockReturnValue(30);
                vi.mocked(isDistanceInRange).mockReturnValue(true);
                getCombatContext.mockResolvedValue({
                    players: [
                        { name: 'Cleric', gridX: 0, gridY: 0 },
                        ...Array.from({ length: 15 }, (_, i) => ({
                            name: `Ally${i}`,
                            gridX: i + 1,
                            gridY: 0,
                        })),
                    ],
                    creatures: Array.from({ length: 15 }, (_, i) => ({
                        name: `Ally${i}`,
                        maxHp: 50,
                        currentHp: 25,
                    })),
                });
                vi.mocked(getRuntimeValue).mockReturnValue(25);

                const spell = makeSpell();
                const result = await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

                expect(result.targets.length).toBe(10);
            });

            it('filters out creatures beyond range', async () => {
                vi.mocked(getDistanceFeet)
                    .mockReturnValueOnce(30)
                    .mockReturnValueOnce(90);
                vi.mocked(isDistanceInRange).mockReturnValueOnce(true).mockReturnValueOnce(false);
                getCombatContext.mockResolvedValue({
                    players: [
                        { name: 'Cleric', gridX: 0, gridY: 0 },
                        { name: 'Close', gridX: 6, gridY: 0 },
                        { name: 'Far', gridX: 18, gridY: 0 },
                    ],
                    creatures: [
                        { name: 'Cleric', maxHp: 100, currentHp: 50 },
                        { name: 'Close', maxHp: 50, currentHp: 25 },
                        { name: 'Far', maxHp: 50, currentHp: 25 },
                    ],
                });
                vi.mocked(getRuntimeValue).mockReturnValue(25);

                const spell = makeSpell();
                const result = await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

                expect(result.targets.map(t => t.targetName)).not.toContain('Far');
                expect(result.targets.map(t => t.targetName)).toContain('Close');
            });

            it('looks up grid position from placedItems when not in players', async () => {
                vi.mocked(getDistanceFeet).mockReturnValue(30);
                vi.mocked(isDistanceInRange).mockReturnValue(true);
                getCombatContext.mockResolvedValue({
                    players: [{ name: 'Cleric', gridX: 0, gridY: 0 }],
                    creatures: [
                        { name: 'Cleric', maxHp: 100, currentHp: 50 },
                        { name: 'NPC', maxHp: 50, currentHp: 25 },
                    ],
                    placedItems: [{ name: 'NPC', gridX: 6, gridY: 0 }],
                });
                vi.mocked(getRuntimeValue).mockReturnValue(25);

                const spell = makeSpell();
                const result = await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

                expect(result.targets.map(t => t.targetName)).toContain('NPC');
            });
        });

        describe('target selection without grid positions', () => {
            it('includes all creatures when caster has no grid position', async () => {
                getCombatContext.mockResolvedValue({
                    players: [],
                    creatures: [
                        { name: 'Ally1', maxHp: 50, currentHp: 25 },
                        { name: 'Ally2', maxHp: 60, currentHp: 30 },
                    ],
                });
                vi.mocked(getRuntimeValue).mockReturnValue(25);

                const spell = makeSpell();
                const result = await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

                expect(result.targets.map(t => t.targetName)).toEqual(['Ally1', 'Ally2']);
            });

            it('excludes caster when no grid position', async () => {
                getCombatContext.mockResolvedValue({
                    players: [],
                    creatures: [
                        { name: 'Cleric', maxHp: 100, currentHp: 50 },
                        { name: 'Ally1', maxHp: 50, currentHp: 25 },
                    ],
                });
                vi.mocked(getRuntimeValue).mockReturnValue(25);

                const spell = makeSpell();
                const result = await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

                expect(result.targets.map(t => t.targetName)).not.toContain('Cleric');
            });

            it('limits to max 10 when no grid position', async () => {
                getCombatContext.mockResolvedValue({
                    players: [],
                    creatures: Array.from({ length: 15 }, (_, i) => ({
                        name: `Ally${i}`,
                        maxHp: 50,
                        currentHp: 25,
                    })),
                });
                vi.mocked(getRuntimeValue).mockReturnValue(25);

                const spell = makeSpell();
                const result = await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

                expect(result.targets.length).toBe(10);
            });

            it('returns noTargets when no creatures exist', async () => {
                getCombatContext.mockResolvedValue({
                    players: [],
                    creatures: [],
                });

                const spell = makeSpell();
                const result = await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

                expect(result).toEqual({ noTargets: true });
            });
        });

        describe('healing application', () => {
            it('applies healing to each target up to pool', async () => {
                vi.mocked(getDistanceFeet).mockReturnValue(30);
                vi.mocked(isDistanceInRange).mockReturnValue(true);
                vi.mocked(applyHealingToTarget).mockReturnValue({ actualHeal: 700, oldHp: 1, newHp: 701 });
                getCombatContext.mockResolvedValue({
                    players: [
                        { name: 'Cleric', gridX: 0, gridY: 0 },
                        { name: 'Ally1', gridX: 6, gridY: 0 },
                    ],
                    creatures: [
                        { name: 'Cleric', maxHp: 100, currentHp: 50 },
                        { name: 'Ally1', maxHp: 50, currentHp: 1 },
                    ],
                });
                vi.mocked(getRuntimeValue).mockReturnValue(1);

                const spell = makeSpell();
                const result = await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

                expect(result).not.toBeNull();
                expect(result.totalHealed).toBeGreaterThan(0);
            });

            it('caps healing at target max HP', async () => {
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
                const result = await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

                const ally = result.targets.find(t => t.targetName === 'Ally1');
                expect(ally.healAmount).toBe(5);
            });

            it('does not apply healing when target is at full HP', async () => {
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

                const ally = result.targets.find(t => t.targetName === 'Ally1');
                expect(ally.healAmount).toBe(0);
            });

            it('uses stored runtime HP instead of creature maxHp for current HP', async () => {
                vi.mocked(getDistanceFeet).mockReturnValue(30);
                vi.mocked(isDistanceInRange).mockReturnValue(true);
                vi.mocked(applyHealingToTarget).mockReturnValue({ actualHeal: 49, oldHp: 1, newHp: 50 });
                getCombatContext.mockResolvedValue({
                    players: [
                        { name: 'Cleric', gridX: 0, gridY: 0 },
                        { name: 'Ally1', gridX: 6, gridY: 0 },
                    ],
                    creatures: [
                        { name: 'Cleric', maxHp: 100, currentHp: 50 },
                        { name: 'Ally1', maxHp: 50, currentHp: 50 },
                    ],
                });
                vi.mocked(getRuntimeValue).mockReturnValue(1);

                const spell = makeSpell();
                const result = await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

                const ally = result.targets.find(t => t.targetName === 'Ally1');
                expect(ally.healAmount).toBe(49);
            });

            it('defaults to playerStats.hitPoints when creature has no maxHp', async () => {
                vi.mocked(getDistanceFeet).mockReturnValue(30);
                vi.mocked(isDistanceInRange).mockReturnValue(true);
                vi.mocked(applyHealingToTarget).mockReturnValue({ actualHeal: 50, oldHp: 50, newHp: 100 });
                getCombatContext.mockResolvedValue({
                    players: [
                        { name: 'Cleric', gridX: 0, gridY: 0 },
                    ],
                    creatures: [
                        { name: 'Cleric', maxHp: 100, currentHp: 50 },
                        { name: 'Ally1', currentHp: 50 },
                    ],
                });
                vi.mocked(getRuntimeValue).mockReturnValue(50);

                const spell = makeSpell();
                const result = await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

                expect(result).not.toBeNull();
            });

            it('applies bonus healing from resolveHealingBonusesWithDetails', async () => {
                const { resolveHealingBonusesWithDetails } = await import('../../combat/automation/automationService.js');
                resolveHealingBonusesWithDetails.mockReturnValue({ totalBonus: 5, details: [{ name: 'Test Bonus', amount: 5 }] });
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
                const result = await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

                expect(result).not.toBeNull();
            });

            it('does not apply healing when remaining pool is exhausted', async () => {
                const { resolveHealingBonusesWithDetails } = await import('../../combat/automation/automationService.js');
                resolveHealingBonusesWithDetails.mockReturnValue({ totalBonus: 0, details: [] });
                vi.mocked(getDistanceFeet).mockReturnValue(30);
                vi.mocked(isDistanceInRange).mockReturnValue(true);
                vi.mocked(applyHealingToTarget).mockReturnValue({ actualHeal: 0, oldHp: 1, newHp: 1 });
                getCombatContext.mockResolvedValue({
                    players: [
                        { name: 'Cleric', gridX: 0, gridY: 0 },
                        { name: 'Ally1', gridX: 6, gridY: 0 },
                        { name: 'Ally2', gridX: 12, gridY: 0 },
                    ],
                    creatures: [
                        { name: 'Cleric', maxHp: 100, currentHp: 50 },
                        { name: 'Ally1', maxHp: 50, currentHp: 1 },
                        { name: 'Ally2', maxHp: 50, currentHp: 1 },
                    ],
                });
                vi.mocked(getRuntimeValue).mockImplementation((name) => {
                    if (name === 'Ally1') return 1;
                    if (name === 'Ally2') return 1;
                    return 50;
                });

                const spell = makeSpell({ heal_at_slot_level: { 9: '49' } });
                const result = await triggerMassHeal(spell, { slotLevel: 9 }, makePlayerStats(), CAMPAIGN, null);

                expect(result).not.toBeNull();
                const ally2 = result.targets.find(t => t.targetName === 'Ally2');
                expect(ally2.healAmount).toBe(0);
            });
        });

        describe('condition removal', () => {
            it('removes blinded, deafened, and poisoned conditions by default', async () => {
                vi.mocked(getDistanceFeet).mockReturnValue(30);
                vi.mocked(isDistanceInRange).mockReturnValue(true);
                vi.mocked(applyHealingToTarget).mockReturnValue({ actualHeal: 0, oldHp: 50, newHp: 50 });
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
                vi.mocked(applyHealingToTarget).mockReturnValue({ actualHeal: 0, oldHp: 50, newHp: 50 });
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
                vi.mocked(applyHealingToTarget).mockReturnValue({ actualHeal: 0, oldHp: 50, newHp: 50 });
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
                vi.mocked(applyHealingToTarget).mockReturnValue({ actualHeal: 0, oldHp: 50, newHp: 50 });
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
                vi.mocked(applyHealingToTarget).mockReturnValue({ actualHeal: 0, oldHp: 50, newHp: 50 });
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
                vi.mocked(applyHealingToTarget).mockReturnValue({ actualHeal: 0, oldHp: 50, newHp: 50 });
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
                vi.mocked(applyHealingToTarget).mockReturnValue({ actualHeal: 0, oldHp: 50, newHp: 50 });
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
});
