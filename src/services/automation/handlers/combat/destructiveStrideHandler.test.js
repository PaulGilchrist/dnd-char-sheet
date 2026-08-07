import { describe, it, expect, vi, beforeEach } from 'vitest';

import { handle, applyDamageTypeChoice, applyTargetChoice, skipTargetChoice } from './destructiveStrideHandler.js';
import * as runtimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as logService from '../../../ui/logService.js';
import * as combatData from '../../../encounters/combatData.js';
import * as diceRoller from '../../../dice/diceRoller.js';
import * as applyDamage from '../../../rules/combat/applyDamage.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(),
}));

vi.mock('../../../dice/diceRoller.js', () => ({
    rollExpression: vi.fn(),
}));

vi.mock('../../../rules/combat/applyDamage.js', () => ({
    applyDamageToTarget: vi.fn(),
}));

// ── Helpers ──────────────────────────────────────────────────────

const campaignName = 'TestCampaign';

function makePlayerStats(overrides = {}) {
    return {
        name: 'TestMonk',
        level: 5,
        class: {
            class_levels: [
                { level: 1, martial_arts_die: 4 },
                { level: 5, martial_arts_die: 6 },
            ],
        },
        ...overrides,
    };
}

function makeAction(overrides = {}) {
    return {
        name: 'Destructive Stride',
        automation: {
            type: 'destructive_stride',
            ...overrides.automation,
        },
        ...overrides,
    };
}

function setupRuntimeMocks(mocks) {
    runtimeState.getRuntimeValue.mockImplementation((player, prop, camp) => {
        const key = `${player}:${prop}:${camp}`;
        if (key in mocks) {
            return mocks[key];
        }
        return undefined;
    });
}

const combatSummaryWithTargets = {
    creatures: [
        { name: 'TestMonk', type: 'player', currentHp: 50, maxHp: 50, size: 'Medium' },
        { name: 'Goblin', type: 'monster', currentHp: 7, maxHp: 7, size: 'Small' },
        { name: 'Orc', type: 'monster', currentHp: 15, maxHp: 15, size: 'Medium' },
    ],
};

// ── Tests: handle ─────────────────────────────────────────────────

describe('destructiveStrideHandler — handle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('when Elemental Epitome is not active', () => {
        it('returns a popup with info message when epitomeActive is false', async () => {
            setupRuntimeMocks({
                'TestMonk:elementalEpitomeActive:TestCampaign': false,
            });

            const action = makeAction();
            const result = await handle(action, makePlayerStats(), campaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Destructive Stride');
            expect(result.payload.description).toBe('Elemental Epitome must be active to use Destructive Stride.');
            expect(result.payload.automation).toEqual(action.automation);
            expect(runtimeState.setRuntimeValue).not.toHaveBeenCalled();
            expect(logService.addEntry).not.toHaveBeenCalled();
        });

        it('returns a popup when epitomeActive is undefined', async () => {
            setupRuntimeMocks({});

            const action = makeAction();
            const result = await handle(action, makePlayerStats(), campaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toBe('Elemental Epitome must be active to use Destructive Stride.');
        });

        it('returns a popup when epitomeActive is null', async () => {
            setupRuntimeMocks({
                'TestMonk:elementalEpitomeActive:TestCampaign': null,
            });

            const action = makeAction();
            const result = await handle(action, makePlayerStats(), campaignName);

            expect(result.type).toBe('popup');
            expect(result.payload.description).toBe('Elemental Epitome must be active to use Destructive Stride.');
        });

        it('passes through action properties in payload', async () => {
            setupRuntimeMocks({
                'TestMonk:elementalEpitomeActive:TestCampaign': false,
            });

            const action = makeAction({
                name: 'Custom Destructive Stride',
                automation: { type: 'destructive_stride', variant: 'fire' },
            });
            const result = await handle(action, makePlayerStats(), campaignName);

            expect(result.payload.name).toBe('Custom Destructive Stride');
            expect(result.payload.automation).toEqual({ type: 'destructive_stride', variant: 'fire' });
            expect(result.payload.automationType).toBe('destructive_stride');
        });
    });

    describe('when Elemental Epitome is active', () => {
        it('returns a modal for destructiveStride when epitomeActive is true', async () => {
            setupRuntimeMocks({
                'TestMonk:elementalEpitomeActive:TestCampaign': true,
            });

            const action = makeAction();
            const result = await handle(action, makePlayerStats(), campaignName);

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('destructiveStride');
            expect(result.payload.action).toBe(action);
            expect(result.payload.playerStats).toBeDefined();
            expect(result.payload.campaignName).toBe(campaignName);
        });

        it('works with epitomeActive set to true even with minimal playerStats', async () => {
            setupRuntimeMocks({
                'TestMonk:elementalEpitomeActive:TestCampaign': true,
            });

            const minimalStats = { name: 'TestMonk' };
            const action = makeAction();
            const result = await handle(action, minimalStats, campaignName);

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('destructiveStride');
        });
    });
});

// ── Tests: applyDamageTypeChoice ──────────────────────────────────

describe('destructiveStrideHandler — applyDamageTypeChoice', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('damage type validation', () => {
        it('returns null for undefined chosenType', async () => {
            const result = await applyDamageTypeChoice(makeAction(), makePlayerStats(), campaignName, undefined);
            expect(result).toBeNull();
        });

        it('returns null for null chosenType', async () => {
            const result = await applyDamageTypeChoice(makeAction(), makePlayerStats(), campaignName, null);
            expect(result).toBeNull();
        });

        it('returns null for empty string chosenType', async () => {
            const result = await applyDamageTypeChoice(makeAction(), makePlayerStats(), campaignName, '');
            expect(result).toBeNull();
        });

        it('returns null for invalid damage type', async () => {
            const result = await applyDamageTypeChoice(makeAction(), makePlayerStats(), campaignName, 'Poison');
            expect(result).toBeNull();
        });

        it('returns null for case-insensitive mismatch', async () => {
            const result = await applyDamageTypeChoice(makeAction(), makePlayerStats(), campaignName, 'fire');
            expect(result).toBeNull();
        });

        it('returns null for completely unrelated string', async () => {
            const result = await applyDamageTypeChoice(makeAction(), makePlayerStats(), campaignName, 'bludgeoning');
            expect(result).toBeNull();
        });
    });

    describe('valid damage types', () => {
        const validTypes = ['Acid', 'Cold', 'Fire', 'Lightning', 'Thunder'];

        for (const type of validTypes) {
            it(`returns modal for valid type: ${type}`, async () => {
                setupRuntimeMocks({});
                combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

                const result = await applyDamageTypeChoice(makeAction(), makePlayerStats(), campaignName, type);

                expect(result.type).toBe('modal');
                expect(result.modalName).toBe('destructiveStrideTarget');
            });
        }
    });

    describe('runtime state changes', () => {
        it('sets destructiveStrideDamageType to the chosen type', async () => {
            setupRuntimeMocks({});
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

            await applyDamageTypeChoice(makeAction(), makePlayerStats(), campaignName, 'Fire');

            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk',
                'destructiveStrideDamageType',
                'Fire',
                campaignName,
            );
        });

        it('sets destructiveStrideActive to true', async () => {
            setupRuntimeMocks({});
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

            await applyDamageTypeChoice(makeAction(), makePlayerStats(), campaignName, 'Cold');

            expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
                'TestMonk',
                'destructiveStrideActive',
                true,
                campaignName,
            );
        });

        it('calls setRuntimeValue twice (damage type + active flag)', async () => {
            setupRuntimeMocks({});
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

            await applyDamageTypeChoice(makeAction(), makePlayerStats(), campaignName, 'Lightning');

            expect(runtimeState.setRuntimeValue).toHaveBeenCalledTimes(2);
        });
    });

    describe('martial arts die calculation', () => {
        it('uses martial arts die from matching class level', async () => {
            setupRuntimeMocks({});
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

            const action = makeAction();
            const result = await applyDamageTypeChoice(action, makePlayerStats(), campaignName, 'Fire');

            expect(result.payload.martialArtsDie).toBe(6);
        });

        it('uses martial arts die from level 1 when player is level 1', async () => {
            setupRuntimeMocks({});
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

            const stats = makePlayerStats({ level: 1 });
            const action = makeAction();
            const result = await applyDamageTypeChoice(action, stats, campaignName, 'Fire');

            expect(result.payload.martialArtsDie).toBe(4);
        });

        it('falls back to 4 when no matching class level found', async () => {
            setupRuntimeMocks({});
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

            const stats = makePlayerStats({
                level: 10,
                class: {
                    class_levels: [
                        { level: 1, martial_arts_die: 4 },
                    ],
                },
            });
            const action = makeAction();
            const result = await applyDamageTypeChoice(action, stats, campaignName, 'Fire');

            expect(result.payload.martialArtsDie).toBe(4);
        });

        it('falls back to 4 when class_levels is empty', async () => {
            setupRuntimeMocks({});
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

            const stats = makePlayerStats({
                class: { class_levels: [] },
            });
            const action = makeAction();
            const result = await applyDamageTypeChoice(action, stats, campaignName, 'Fire');

            expect(result.payload.martialArtsDie).toBe(4);
        });
    });

    describe('targets extraction', () => {
        it('excludes the player character from targets', async () => {
            setupRuntimeMocks({});
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

            const action = makeAction();
            const result = await applyDamageTypeChoice(action, makePlayerStats(), campaignName, 'Acid');

            const targets = result.payload.targets;
            expect(targets.length).toBe(2);
            expect(targets.every(t => t.name !== 'TestMonk')).toBe(true);
        });

        it('includes monsters as targets', async () => {
            setupRuntimeMocks({});
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

            const action = makeAction();
            const result = await applyDamageTypeChoice(action, makePlayerStats(), campaignName, 'Thunder');

            const targets = result.payload.targets;
            const targetNames = targets.map(t => t.name);
            expect(targetNames).toContain('Goblin');
            expect(targetNames).toContain('Orc');
        });

        it('includes target properties: name, type, currentHp, maxHp, size', async () => {
            setupRuntimeMocks({});
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

            const action = makeAction();
            const result = await applyDamageTypeChoice(action, makePlayerStats(), campaignName, 'Fire');

            const targets = result.payload.targets;
            expect(targets[0]).toHaveProperty('name');
            expect(targets[0]).toHaveProperty('type');
            expect(targets[0]).toHaveProperty('currentHp');
            expect(targets[0]).toHaveProperty('maxHp');
            expect(targets[0]).toHaveProperty('size');
        });

        it('handles combatSummary with no creatures', async () => {
            setupRuntimeMocks({});
            combatData.getCombatSummary.mockReturnValue({ creatures: [] });

            const action = makeAction();
            const result = await applyDamageTypeChoice(action, makePlayerStats(), campaignName, 'Fire');

            expect(result.payload.targets).toEqual([]);
        });
    });

    describe('combatSummary null/missing', () => {
        it('returns modal with empty targets when combatSummary is null', async () => {
            setupRuntimeMocks({});
            combatData.getCombatSummary.mockReturnValue(null);

            const action = makeAction();
            const result = await applyDamageTypeChoice(action, makePlayerStats(), campaignName, 'Fire');

            expect(result.type).toBe('modal');
            expect(result.modalName).toBe('destructiveStrideTarget');
            expect(result.payload.targets).toEqual([]);
        });
    });

    describe('logging', () => {
        it('logs the ability use to campaign log', async () => {
            setupRuntimeMocks({});
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

            const action = makeAction();
            await applyDamageTypeChoice(action, makePlayerStats(), campaignName, 'Fire');

            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                characterName: 'TestMonk',
                abilityName: 'Destructive Stride',
                description: expect.stringContaining('Destructive Stride activated — Speed +20 ft, damage type set to Fire (d6).'),
            }));
        });

        it('logs the correct martial arts die in description', async () => {
            setupRuntimeMocks({});
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

            const action = makeAction();
            await applyDamageTypeChoice(action, makePlayerStats(), campaignName, 'Cold');

            const callArgs = logService.addEntry.mock.calls[0][1];
            expect(callArgs.description).toContain('d6');
        });

        it('catches and logs errors from addEntry without throwing', async () => {
            setupRuntimeMocks({});
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            logService.addEntry.mockRejectedValue(new Error('log failure'));

            const action = makeAction();
            const result = await applyDamageTypeChoice(action, makePlayerStats(), campaignName, 'Fire');

            expect(result).toBeDefined();
            expect(consoleErrorSpy).toHaveBeenCalled();
            consoleErrorSpy.mockRestore();
        });
    });

    describe('modal payload structure', () => {
        it('includes action, playerStats, campaignName, chosenType, martialArtsDie, targets in payload', async () => {
            setupRuntimeMocks({});
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

            const action = makeAction();
            const result = await applyDamageTypeChoice(action, makePlayerStats(), campaignName, 'Lightning');

            expect(result.payload.action).toBe(action);
            expect(result.payload.playerStats).toBeDefined();
            expect(result.payload.campaignName).toBe(campaignName);
            expect(result.payload.chosenType).toBe('Lightning');
            expect(typeof result.payload.martialArtsDie).toBe('number');
            expect(Array.isArray(result.payload.targets)).toBe(true);
        });
    });
});

// ── Tests: applyDamageTypeChoice — restructured for payload access ─

describe('destructiveStrideHandler — applyDamageTypeChoice payload', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns modal with chosenType set correctly for Acid', async () => {
        setupRuntimeMocks({});
        combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

        const result = await applyDamageTypeChoice(makeAction(), makePlayerStats(), campaignName, 'Acid');
        expect(result.payload.chosenType).toBe('Acid');
    });

    it('returns modal with chosenType set correctly for Cold', async () => {
        setupRuntimeMocks({});
        combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

        const result = await applyDamageTypeChoice(makeAction(), makePlayerStats(), campaignName, 'Cold');
        expect(result.payload.chosenType).toBe('Cold');
    });

    it('returns modal with chosenType set correctly for Fire', async () => {
        setupRuntimeMocks({});
        combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

        const result = await applyDamageTypeChoice(makeAction(), makePlayerStats(), campaignName, 'Fire');
        expect(result.payload.chosenType).toBe('Fire');
    });

    it('returns modal with chosenType set correctly for Lightning', async () => {
        setupRuntimeMocks({});
        combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

        const result = await applyDamageTypeChoice(makeAction(), makePlayerStats(), campaignName, 'Lightning');
        expect(result.payload.chosenType).toBe('Lightning');
    });

    it('returns modal with chosenType set correctly for Thunder', async () => {
        setupRuntimeMocks({});
        combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

        const result = await applyDamageTypeChoice(makeAction(), makePlayerStats(), campaignName, 'Thunder');
        expect(result.payload.chosenType).toBe('Thunder');
    });

    it('computes martialArtsDie from class level matching player level', async () => {
        setupRuntimeMocks({});
        combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

        const stats = makePlayerStats({ level: 5 });
        const result = await applyDamageTypeChoice(makeAction(), stats, campaignName, 'Fire');
        expect(result.payload.martialArtsDie).toBe(6);
    });

    it('computes martialArtsDie from level 1 class level', async () => {
        setupRuntimeMocks({});
        combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

        const stats = makePlayerStats({ level: 1 });
        const result = await applyDamageTypeChoice(makeAction(), stats, campaignName, 'Fire');
        expect(result.payload.martialArtsDie).toBe(4);
    });

    it('uses martialArtsDie 4 as fallback when no class level matches', async () => {
        setupRuntimeMocks({});
        combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

        const stats = makePlayerStats({
            level: 20,
            class: { class_levels: [{ level: 2, martial_arts_die: 8 }] },
        });
        const result = await applyDamageTypeChoice(makeAction(), stats, campaignName, 'Fire');
        expect(result.payload.martialArtsDie).toBe(4);
    });

    it('uses martialArtsDie 4 as fallback when class_levels is undefined', async () => {
        setupRuntimeMocks({});
        combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

        const stats = makePlayerStats({ class: {} });
        const result = await applyDamageTypeChoice(makeAction(), stats, campaignName, 'Fire');
        expect(result.payload.martialArtsDie).toBe(4);
    });

    it('excludes the player from targets list', async () => {
        setupRuntimeMocks({});
        combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

        const result = await applyDamageTypeChoice(makeAction(), makePlayerStats(), campaignName, 'Fire');
        const targetNames = result.payload.targets.map(t => t.name);
        expect(targetNames).not.toContain('TestMonk');
    });

    it('includes all non-player creatures as targets', async () => {
        setupRuntimeMocks({});
        combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

        const result = await applyDamageTypeChoice(makeAction(), makePlayerStats(), campaignName, 'Fire');
        const targetNames = result.payload.targets.map(t => t.name);
        expect(targetNames).toContain('Goblin');
        expect(targetNames).toContain('Orc');
    });

    it('returns empty targets when combatSummary has no creatures', async () => {
        setupRuntimeMocks({});
        combatData.getCombatSummary.mockReturnValue({ creatures: [] });

        const result = await applyDamageTypeChoice(makeAction(), makePlayerStats(), campaignName, 'Fire');
        expect(result.payload.targets).toEqual([]);
    });

    it('returns empty targets when combatSummary is null', async () => {
        setupRuntimeMocks({});
        combatData.getCombatSummary.mockReturnValue(null);

        const result = await applyDamageTypeChoice(makeAction(), makePlayerStats(), campaignName, 'Fire');
        expect(result.payload.targets).toEqual([]);
    });

    it('sets runtime values before returning modal', async () => {
        setupRuntimeMocks({});
        combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

        await applyDamageTypeChoice(makeAction(), makePlayerStats(), campaignName, 'Thunder');

        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
            'TestMonk',
            'destructiveStrideDamageType',
            'Thunder',
            campaignName,
        );
        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
            'TestMonk',
            'destructiveStrideActive',
            true,
            campaignName,
        );
    });

    it('logs ability use with correct description format', async () => {
        setupRuntimeMocks({});
        combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

        await applyDamageTypeChoice(makeAction(), makePlayerStats(), campaignName, 'Acid');

        expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
            type: 'ability_use',
            characterName: 'TestMonk',
            abilityName: 'Destructive Stride',
            description: expect.stringContaining('Acid'),
        }));
    });

    it('does not throw when addEntry rejects', async () => {
        setupRuntimeMocks({});
        combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

        logService.addEntry.mockRejectedValue(new Error('log error'));

        const result = await applyDamageTypeChoice(makeAction(), makePlayerStats(), campaignName, 'Fire');
        expect(result.type).toBe('modal');
    });
});

// ── Tests: applyTargetChoice ──────────────────────────────────────

describe('destructiveStrideHandler — applyTargetChoice', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('target validation', () => {
        it('returns null when combatSummary is null', async () => {
            combatData.getCombatSummary.mockReturnValue(null);

            const result = await applyTargetChoice(
                makeAction(),
                makePlayerStats(),
                campaignName,
                'Goblin',
                'Fire',
                6,
            );

            expect(result).toBeNull();
        });

        it('returns null when target is not found in combatSummary', async () => {
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

            const result = await applyTargetChoice(
                makeAction(),
                makePlayerStats(),
                campaignName,
                'NonexistentCreature',
                'Fire',
                6,
            );

            expect(result).toBeNull();
        });

        it('returns null for empty string targetName', async () => {
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);

            const result = await applyTargetChoice(
                makeAction(),
                makePlayerStats(),
                campaignName,
                '',
                'Fire',
                6,
            );

            expect(result).toBeNull();
        });
    });

    describe('successful target choice', () => {
        it('rolls dice and returns popup with damage', async () => {
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);
            diceRoller.rollExpression.mockReturnValue({ total: 4, rolls: [4] });

            const result = await applyTargetChoice(
                makeAction(),
                makePlayerStats(),
                campaignName,
                'Goblin',
                'Fire',
                6,
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.description).toBe('Goblin takes 4 Fire damage.');
        });

        it('uses martialArtsDie as damage when roll total is missing', async () => {
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);
            diceRoller.rollExpression.mockReturnValue(null);

            const result = await applyTargetChoice(
                makeAction(),
                makePlayerStats(),
                campaignName,
                'Orc',
                'Cold',
                6,
            );

            expect(result.payload.description).toBe('Orc takes 6 Cold damage.');
        });

        it('uses martialArtsDie when rollResult has no total', async () => {
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);
            diceRoller.rollExpression.mockReturnValue({ rolls: [3] });

            const result = await applyTargetChoice(
                makeAction(),
                makePlayerStats(),
                campaignName,
                'Orc',
                'Cold',
                6,
            );

            expect(result.payload.description).toBe('Orc takes 6 Cold damage.');
        });

        it('calls rollExpression with correct dice formula', async () => {
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);
            diceRoller.rollExpression.mockReturnValue({ total: 5, rolls: [5] });

            await applyTargetChoice(
                makeAction(),
                makePlayerStats(),
                campaignName,
                'Goblin',
                'Fire',
                6,
            );

            expect(diceRoller.rollExpression).toHaveBeenCalledWith('1d6');
        });

        it('calls applyDamageToTarget with correct parameters', async () => {
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);
            diceRoller.rollExpression.mockReturnValue({ total: 3, rolls: [3] });

            await applyTargetChoice(
                makeAction(),
                makePlayerStats(),
                campaignName,
                'Goblin',
                'Thunder',
                6,
            );

            expect(applyDamage.applyDamageToTarget).toHaveBeenCalledWith(
                combatSummaryWithTargets,
                'Goblin',
                3,
                ['thunder'],
                campaignName,
                expect.any(Array),
                false,
                'TestMonk',
                false,
            );
        });

        it('passes damage type as lowercase array to applyDamageToTarget', async () => {
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);
            diceRoller.rollExpression.mockReturnValue({ total: 3, rolls: [3] });

            await applyTargetChoice(
                makeAction(),
                makePlayerStats(),
                campaignName,
                'Goblin',
                'Lightning',
                6,
            );

            const args = applyDamage.applyDamageToTarget.mock.calls[0];
            expect(args[3]).toEqual(['lightning']);
        });

        it('passes player characters as characters array to applyDamageToTarget', async () => {
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);
            diceRoller.rollExpression.mockReturnValue({ total: 3, rolls: [3] });

            await applyTargetChoice(
                makeAction(),
                makePlayerStats(),
                campaignName,
                'Goblin',
                'Fire',
                6,
            );

            const charactersArg = applyDamage.applyDamageToTarget.mock.calls[0][5];
            expect(charactersArg.length).toBe(1);
            expect(charactersArg[0].name).toBe('TestMonk');
        });
    });

    describe('popup payload structure', () => {
        it('includes automation in popup payload', async () => {
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);
            diceRoller.rollExpression.mockReturnValue({ total: 5, rolls: [5] });

            const action = makeAction();
            const result = await applyTargetChoice(
                action,
                makePlayerStats(),
                campaignName,
                'Goblin',
                'Fire',
                6,
            );

            expect(result.payload.automation).toEqual(action.automation);
        });

        it('includes automationType in popup payload', async () => {
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);
            diceRoller.rollExpression.mockReturnValue({ total: 5, rolls: [5] });

            const result = await applyTargetChoice(
                makeAction(),
                makePlayerStats(),
                campaignName,
                'Goblin',
                'Fire',
                6,
            );

            expect(result.payload.automationType).toBe('destructive_stride');
        });

        it('includes correct name in popup payload', async () => {
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);
            diceRoller.rollExpression.mockReturnValue({ total: 5, rolls: [5] });

            const result = await applyTargetChoice(
                makeAction(),
                makePlayerStats(),
                campaignName,
                'Goblin',
                'Fire',
                6,
            );

            expect(result.payload.name).toBe('Destructive Stride');
        });
    });

    describe('logging', () => {
        it('logs the ability use with target damage details', async () => {
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);
            diceRoller.rollExpression.mockReturnValue({ total: 4, rolls: [4] });

            await applyTargetChoice(
                makeAction(),
                makePlayerStats(),
                campaignName,
                'Goblin',
                'Fire',
                6,
            );

            expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                characterName: 'TestMonk',
                abilityName: 'Destructive Stride',
                targetName: 'Goblin',
                description: expect.stringContaining('Goblin takes 4 Fire damage (d6 roll: 4).'),
            }));
        });

        it('logs the roll result in description', async () => {
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);
            diceRoller.rollExpression.mockReturnValue({ total: 2, rolls: [2] });

            await applyTargetChoice(
                makeAction(),
                makePlayerStats(),
                campaignName,
                'Orc',
                'Acid',
                6,
            );

            const callArgs = logService.addEntry.mock.calls[0][1];
            expect(callArgs.description).toContain('roll: 2');
        });

        it('uses martialArtsDie as roll value when rollResult is null', async () => {
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);
            diceRoller.rollExpression.mockReturnValue(null);

            await applyTargetChoice(
                makeAction(),
                makePlayerStats(),
                campaignName,
                'Orc',
                'Cold',
                6,
            );

            const callArgs = logService.addEntry.mock.calls[0][1];
            expect(callArgs.description).toContain('roll: 6');
        });

        it('catches and logs errors from addEntry without throwing', async () => {
            combatData.getCombatSummary.mockReturnValue(combatSummaryWithTargets);
            diceRoller.rollExpression.mockReturnValue({ total: 5, rolls: [5] });

            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            logService.addEntry.mockRejectedValue(new Error('log failure'));

            const result = await applyTargetChoice(
                makeAction(),
                makePlayerStats(),
                campaignName,
                'Goblin',
                'Fire',
                6,
            );

            expect(result.type).toBe('popup');
            expect(consoleErrorSpy).toHaveBeenCalled();
            consoleErrorSpy.mockRestore();
        });
    });

    describe('players filter in combatSummary', () => {
        it('filters player characters from combatSummary creatures', async () => {
            combatData.getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'TestMonk', type: 'player', currentHp: 50, maxHp: 50, size: 'Medium' },
                    { name: 'AllySorcerer', type: 'player', currentHp: 30, maxHp: 30, size: 'Medium' },
                    { name: 'Goblin', type: 'monster', currentHp: 7, maxHp: 7, size: 'Small' },
                ],
            });
            diceRoller.rollExpression.mockReturnValue({ total: 3, rolls: [3] });

            await applyTargetChoice(
                makeAction(),
                makePlayerStats(),
                campaignName,
                'Goblin',
                'Fire',
                6,
            );

            const charactersArg = applyDamage.applyDamageToTarget.mock.calls[0][5];
            expect(charactersArg.length).toBe(2);
            expect(charactersArg[0].name).toBe('TestMonk');
            expect(charactersArg[1].name).toBe('AllySorcerer');
        });

        it('passes empty array when no player creatures exist', async () => {
            combatData.getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Goblin', type: 'monster', currentHp: 7, maxHp: 7, size: 'Small' },
                ],
            });
            diceRoller.rollExpression.mockReturnValue({ total: 3, rolls: [3] });

            await applyTargetChoice(
                makeAction(),
                makePlayerStats(),
                campaignName,
                'Goblin',
                'Fire',
                6,
            );

            const charactersArg = applyDamage.applyDamageToTarget.mock.calls[0][5];
            expect(charactersArg).toEqual([]);
        });
    });
});

// ── Tests: skipTargetChoice ───────────────────────────────────────

describe('destructiveStrideHandler — skipTargetChoice', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns a popup with skip description', async () => {
        const result = await skipTargetChoice(makeAction(), makePlayerStats(), campaignName);

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.name).toBe('Destructive Stride');
        expect(result.payload.description).toBe('Destructive Stride activated — Speed +20 ft, no damage dealt.');
    });

    it('sets destructiveStrideActive to true', async () => {
        await skipTargetChoice(makeAction(), makePlayerStats(), campaignName);

        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
            'TestMonk',
            'destructiveStrideActive',
            true,
            campaignName,
        );
    });

    it('does not call setRuntimeValue for damage type (only active flag)', async () => {
        await skipTargetChoice(makeAction(), makePlayerStats(), campaignName);

        const calledArgs = runtimeState.setRuntimeValue.mock.calls;
        expect(calledArgs.length).toBe(1);
        expect(calledArgs[0][1]).toBe('destructiveStrideActive');
    });

    it('logs the ability use to campaign log', async () => {
        await skipTargetChoice(makeAction(), makePlayerStats(), campaignName);

        expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
            type: 'ability_use',
            characterName: 'TestMonk',
            abilityName: 'Destructive Stride',
            description: 'Destructive Stride activated — Speed +20 ft, no target chosen.',
            timestamp: expect.any(Number),
        }));
    });

    it('includes automation in popup payload', async () => {
        const result = await skipTargetChoice(makeAction(), makePlayerStats(), campaignName);

        expect(result.payload.automation).toEqual(makeAction().automation);
    });

    it('includes automationType in popup payload', async () => {
        const result = await skipTargetChoice(makeAction(), makePlayerStats(), campaignName);

        expect(result.payload.automationType).toBe('destructive_stride');
    });

    it('catches and logs errors from addEntry without throwing', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        logService.addEntry.mockRejectedValue(new Error('log failure'));

        const result = await skipTargetChoice(makeAction(), makePlayerStats(), campaignName);

        expect(result.type).toBe('popup');
        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });

    it('works with custom action name', async () => {
        const action = { name: 'Custom Stride', automation: { type: 'destructive_stride' } };
        const result = await skipTargetChoice(action, makePlayerStats(), campaignName);

        expect(result.payload.name).toBe('Custom Stride');
        expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
            abilityName: 'Custom Stride',
        }));
    });

    it('works with different player name', async () => {
        const stats = { name: 'OtherMonk', level: 5, class: { class_levels: [] } };
        await skipTargetChoice(makeAction(), stats, campaignName);

        expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith(
            'OtherMonk',
            'destructiveStrideActive',
            true,
            campaignName,
        );
        expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
            characterName: 'OtherMonk',
        }));
    });
});
