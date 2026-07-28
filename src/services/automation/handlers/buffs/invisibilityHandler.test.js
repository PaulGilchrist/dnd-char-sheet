// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { handle, applyInvisibility, isInvisibilityActive } from './invisibilityHandler.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addExpiration } from '../../../rules/effects/expirations.js';
import { resolveMapPositions } from '../../common/targetResolver.js';
import { addEntry } from '../../../ui/logService.js';
import { getCombatSummary } from '../../../encounters/combatData.js';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../rules/effects/expirations.js', () => ({
    addExpiration: vi.fn(),
}));

vi.mock('../../../rules/combat/rangeValidation.js', () => ({
    rangeToFeet: vi.fn((r) => (r === 'Touch' ? 5 : 30)),
}));

vi.mock('../../common/targetResolver.js', () => ({
    resolveMapPositions: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(),
}));

const campaignName = 'test-campaign';
const mapName = 'test-map';

function makePlayerStats(overrides = {}) {
    return {
        name: 'TestWizard',
        level: 5,
        ...overrides,
    };
}

function makeAction(overrides = {}) {
    return {
        name: 'Invisibility',
        spell: { range: 'Touch', duration: 'Up to 1 hour', ...overrides.spell },
        automation: { type: 'invisibility', ...overrides.automation },
    };
}

// ─── handle ───

describe('invisibilityHandler.handle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns target selection popup with creature list when combat context exists', async () => {
        getCombatSummary.mockReturnValue({
            creatures: [
                { name: 'Ally1', type: 'player' },
                { name: 'TestWizard', type: 'player' },
                { name: 'Enemy1', type: 'npc' },
            ],
        });

        const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('invisibility_target_selection');
        expect(result.payload.name).toBe('Invisibility');
        expect(result.payload.creatureTargets).toEqual(['Ally1', 'TestWizard', 'Enemy1']);
        expect(result.payload.duration).toBe('Up to 1 hour');
        expect(result.payload.range).toBe('Touch');
        expect(result.payload).toHaveProperty('rangeFt');
        expect(result.payload).toHaveProperty('attackerPos');
    });

    it('uses default range and duration when spell object is empty', async () => {
        getCombatSummary.mockReturnValue({
            creatures: [{ name: 'Ally1' }],
        });

        const result = await handle(
            { name: 'Invisibility', spell: {}, automation: {} },
            makePlayerStats(),
            campaignName,
            null
        );

        expect(result.payload.range).toBe('Touch');
        expect(result.payload.duration).toBe('Concentration, up to 1 hour');
    });

    it('returns empty creature list when no combat summary', async () => {
        getCombatSummary.mockReturnValue(null);

        const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

        expect(result.payload.creatureTargets).toEqual([]);
    });

    it('includes attacker position when mapName is provided', async () => {
        getCombatSummary.mockReturnValue({ creatures: [{ name: 'Ally1' }] });
        resolveMapPositions.mockResolvedValue({ attackerPos: { x: 1, y: 2 } });

        const result = await handle(
            makeAction(),
            makePlayerStats(),
            campaignName,
            mapName
        );

        expect(result.payload.attackerPos).toEqual({ x: 1, y: 2 });
    });
});

// ─── applyInvisibility ───

describe('invisibilityHandler.applyInvisibility', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getRuntimeValue.mockReset();
        setRuntimeValue.mockReset();
        addExpiration.mockReset();
        addEntry.mockReset();
    });

    it('returns null when targetNames is empty', async () => {
        const result = await applyInvisibility(
            makeAction(),
            makePlayerStats(),
            campaignName,
            null,
            []
        );
        expect(result).toBeNull();
    });

    it('returns null when targetNames is not an array', async () => {
        const result = await applyInvisibility(
            makeAction(),
            makePlayerStats(),
            campaignName,
            null,
            'not-an-array'
        );
        expect(result).toBeNull();
    });

    it('returns null when targetNames is null', async () => {
        const result = await applyInvisibility(
            makeAction(),
            makePlayerStats(),
            campaignName,
            null,
            null
        );
        expect(result).toBeNull();
    });

    it('applies invisibility to a single target', async () => {
        getRuntimeValue
            .mockReturnValueOnce([]) // activeBuffs for target
            .mockReturnValueOnce([]); // activeConditions for target

        const result = await applyInvisibility(
            makeAction(),
            makePlayerStats(),
            campaignName,
            null,
            ['Ally1']
        );

        expect(result).not.toBeNull();
        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');

        // Check buff was added
        expect(setRuntimeValue).toHaveBeenCalledWith(
            'Ally1',
            'activeBuffs',
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'Invisibility',
                    effect: 'invisible',
                    sourceCharacter: 'TestWizard',
                }),
            ]),
            campaignName
        );

        // Check condition was added
        expect(setRuntimeValue).toHaveBeenCalledWith(
            'Ally1',
            'activeConditions',
            expect.arrayContaining(['invisible']),
            campaignName
        );

        // Check tracking key was set
        expect(setRuntimeValue).toHaveBeenCalledWith(
            'campaign',
            '_activeInvisibility_Ally1',
            'TestWizard',
            campaignName
        );

        // Check expiration was added
        expect(addExpiration).toHaveBeenCalledWith(
            'TestWizard',
            'Ally1',
            expect.arrayContaining([
                expect.objectContaining({
                    type: 'remove_active_buff',
                    buffName: 'Invisibility',
                }),
            ]),
            campaignName
        );

        // Check log entry
        expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
            type: 'ability_use',
            characterName: 'TestWizard',
            abilityName: 'Invisibility',
        }));
    });

    it('applies invisibility to self', async () => {
        getRuntimeValue
            .mockReturnValueOnce([]) // activeBuffs
            .mockReturnValueOnce([]); // activeConditions

        const result = await applyInvisibility(
            makeAction(),
            makePlayerStats(),
            campaignName,
            null,
            ['TestWizard']
        );

        expect(result).not.toBeNull();
        expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
            description: expect.stringContaining('themself'),
        }));
    });

    it('does not add duplicate buff if already active', async () => {
        getRuntimeValue
            .mockReturnValueOnce([{ name: 'Invisibility', effect: 'invisible' }]) // already has buff
            .mockReturnValueOnce([]); // conditions

        await applyInvisibility(
            makeAction(),
            makePlayerStats(),
            campaignName,
            null,
            ['Ally1']
        );

        // Should not add a second buff
        const buffCalls = setRuntimeValue.mock.calls.filter(
            call => call[1] === 'activeBuffs' && call[0] === 'Ally1'
        );
        expect(buffCalls).toHaveLength(0);
    });

    it('does not add duplicate condition if already present', async () => {
        getRuntimeValue
            .mockReturnValueOnce([]) // buffs
            .mockReturnValueOnce(['invisible']); // already has condition

        await applyInvisibility(
            makeAction(),
            makePlayerStats(),
            campaignName,
            null,
            ['Ally1']
        );

        const condCalls = setRuntimeValue.mock.calls.filter(
            call => call[1] === 'activeConditions' && call[0] === 'Ally1'
        );
        expect(condCalls).toHaveLength(0);
    });

    it('applies invisibility to multiple targets', async () => {
        getRuntimeValue
            .mockReturnValueOnce([]) // Ally1 buffs
            .mockReturnValueOnce([]) // Ally1 conditions
            .mockReturnValueOnce([]) // Enemy1 buffs
            .mockReturnValueOnce([]); // Enemy1 conditions

        const result = await applyInvisibility(
            makeAction(),
            makePlayerStats(),
            campaignName,
            null,
            ['Ally1', 'Enemy1']
        );

        expect(result).not.toBeNull();
        expect(result.payload.description).toContain('2 targets');
        expect(result.payload.description).toContain('Ally1');
        expect(result.payload.description).toContain('Enemy1');
    });

    it('respects custom duration from spell object', async () => {
        getRuntimeValue
            .mockReturnValueOnce([])
            .mockReturnValueOnce([]);

        await applyInvisibility(
            {
                name: 'Invisibility',
                spell: { duration: 'Custom duration' },
                automation: { type: 'invisibility' },
            },
            makePlayerStats(),
            campaignName,
            null,
            ['Ally1']
        );

        expect(setRuntimeValue).toHaveBeenCalledWith(
            'Ally1',
            'activeBuffs',
            expect.arrayContaining([
                expect.objectContaining({ duration: 'Custom duration' }),
            ]),
            campaignName
        );
    });
});

// ─── isInvisibilityActive ───

describe('invisibilityHandler.isInvisibilityActive', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns true when Invisibility buff is active', () => {
        getRuntimeValue.mockReturnValue([
            { name: 'Invisibility', effect: 'invisible', duration: '1_hour' },
        ]);

        expect(isInvisibilityActive('Ally1', campaignName)).toBe(true);
    });

    it('returns false when no Invisibility buff', () => {
        getRuntimeValue.mockReturnValue([
            { name: 'Shield', effect: 'shield' },
        ]);

        expect(isInvisibilityActive('Ally1', campaignName)).toBe(false);
    });

    it('returns false when activeBuffs is empty', () => {
        getRuntimeValue.mockReturnValue([]);

        expect(isInvisibilityActive('Ally1', campaignName)).toBe(false);
    });

    it('returns false when activeBuffs is null', () => {
        getRuntimeValue.mockReturnValue(null);

        expect(isInvisibilityActive('Ally1', campaignName)).toBe(false);
    });
});
