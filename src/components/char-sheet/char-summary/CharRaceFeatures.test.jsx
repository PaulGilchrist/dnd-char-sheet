// @improved-by-ai
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharRaceFeatures from './CharRaceFeatures.jsx';

/*
 * TrackedResourceInput is mocked so CharRaceFeatures tests focus on:
 *  - Which component is selected per race/subrace
 *  - Which props (label, resourceKey, playerName, getMax, deps, campaignName, playerStats)
 *    are passed through
 *  - Null/early-return paths for unsupported races
 *
 * The mock captures all props via a shared registry object so tests can
 * assert exact prop passthrough without exercising the real TrackedResourceInput
 * (which depends on hooks and DOM APIs).
 */

// Shared capture object for the mock so each test can inspect what was rendered
const mockRenderData = {
    label: null,
    resourceKey: null,
    playerName: null,
    getMaxValue: null,
    deps: null,
    campaignName: null,
    playerStats: null,
    called: false,
};

vi.mock('./TrackedResourceInput.jsx', () => ({
    default: function MockTrackedResourceInput(props) {
        mockRenderData.called = true;
        mockRenderData.label = props.label;
        mockRenderData.resourceKey = props.resourceKey;
        mockRenderData.playerName = props.playerName;
        mockRenderData.getMaxValue = props.getMax();
        mockRenderData.deps = props.deps;
        mockRenderData.campaignName = props.campaignName;
        mockRenderData.playerStats = props.playerStats;
        return <div data-testid="tracked-resource" />;
    },
}));

const basePlayerStats = {
    name: 'Thorin',
    level: 5,
    proficiency: 3,
    race: { name: 'Mountain Dwarf' },
};

const mockCampaignName = 'test-campaign';

function makeStats(overrides = {}) {
    return { ...basePlayerStats, ...overrides };
}

function renderComponent(playerStats, campaign = mockCampaignName) {
    return render(<CharRaceFeatures playerStats={playerStats} campaignName={campaign} />);
}

beforeEach(() => {
    mockRenderData.called = false;
    mockRenderData.label = null;
    mockRenderData.resourceKey = null;
    mockRenderData.playerName = null;
    mockRenderData.getMaxValue = null;
    mockRenderData.deps = null;
    mockRenderData.campaignName = null;
    mockRenderData.playerStats = null;
});

function assertTrackedResourceRendered(expectedProps) {
    expect(mockRenderData.called).toBe(true);
    if (expectedProps.label !== undefined) expect(mockRenderData.label).toBe(expectedProps.label);
    if (expectedProps.resourceKey !== undefined) expect(mockRenderData.resourceKey).toBe(expectedProps.resourceKey);
    if (expectedProps.playerName !== undefined) expect(mockRenderData.playerName).toBe(expectedProps.playerName);
    if (expectedProps.getMaxValue !== undefined) expect(mockRenderData.getMaxValue).toBe(expectedProps.getMaxValue);
    if (expectedProps.campaignName !== undefined) expect(mockRenderData.campaignName).toBe(expectedProps.campaignName);
    if (expectedProps.playerStats !== undefined) expect(mockRenderData.playerStats).toBe(expectedProps.playerStats);
    if (expectedProps.deps !== undefined) expect(mockRenderData.deps).toEqual(expectedProps.deps);
}

function assertNoTrackedResourceRendered() {
    expect(mockRenderData.called).toBe(false);
}

describe('CharRaceFeatures', () => {
    describe('Dragonborn features', () => {
        it('renders Breath Weapon with max uses from automation.uses number', () => {
            const stats = makeStats({
                race: { name: 'Dragonborn', traits: [{ automation: { uses: 3 } }] },
            });
            renderComponent(stats);
            assertTrackedResourceRendered({
                label: 'Breath Weapon',
                resourceKey: 'breathweaponUses',
                getMaxValue: 3,
                playerName: 'Thorin',
                campaignName: mockCampaignName,
                playerStats: stats,
            });
        });

        it('uses proficiency bonus as max when automation.uses is "proficiency_bonus"', () => {
            const stats = makeStats({
                proficiency: 4,
                race: { name: 'Dragonborn', traits: [{ automation: { uses: 'proficiency_bonus' } }] },
            });
            renderComponent(stats);
            assertTrackedResourceRendered({
                label: 'Breath Weapon',
                resourceKey: 'breathweaponUses',
                getMaxValue: 4,
            });
        });

        it('falls back to 1 when automation.uses is undefined', () => {
            const stats = makeStats({
                race: { name: 'Dragonborn', traits: [{}] },
            });
            renderComponent(stats);
            assertTrackedResourceRendered({
                label: 'Breath Weapon',
                resourceKey: 'breathweaponUses',
                getMaxValue: 1,
            });
        });

        it('falls back to 1 when traits is undefined', () => {
            const stats = makeStats({
                race: { name: 'Dragonborn' },
            });
            renderComponent(stats);
            assertTrackedResourceRendered({
                label: 'Breath Weapon',
                resourceKey: 'breathweaponUses',
                getMaxValue: 1,
            });
        });

        it('falls back to 1 when traits is an empty array', () => {
            const stats = makeStats({
                race: { name: 'Dragonborn', traits: [] },
            });
            renderComponent(stats);
            assertTrackedResourceRendered({
                label: 'Breath Weapon',
                resourceKey: 'breathweaponUses',
                getMaxValue: 1,
            });
        });

        it('passes deps with playerStats.level array for Dragonborn', () => {
            const stats = makeStats({
                race: { name: 'Dragonborn', traits: [{ automation: { uses: 2 } }] },
            });
            renderComponent(stats);
            expect(mockRenderData.deps).toEqual([stats.level]);
        });

        it('passes playerName and campaignName to TrackedResourceInput', () => {
            const stats = makeStats({
                name: 'Garrok',
                race: { name: 'Dragonborn', traits: [{ automation: { uses: 2 } }] },
            });
            renderComponent(stats, 'test-campaign');
            assertTrackedResourceRendered({
                playerName: 'Garrok',
                campaignName: 'test-campaign',
            });
        });
    });

    describe('Goliath features', () => {
        const goliathBase = {
            name: 'Kara',
            level: 5,
            proficiency: 3,
            race: { name: 'Goliath' },
        };

        it('returns null when Goliath has no subrace', () => {
            const stats = makeStats({ ...goliathBase, race: { name: 'Goliath' } });
            renderComponent(stats);
            assertNoTrackedResourceRendered();
        });

        it('returns null when Goliath has an unknown subrace', () => {
            const stats = makeStats({
                ...goliathBase,
                race: { name: 'Goliath', subrace: { name: 'Iron Giant' } },
            });
            renderComponent(stats);
            assertNoTrackedResourceRendered();
        });

        it('passes proficiency as max uses for Goliath ancestry features', () => {
            const stats = makeStats({
                ...goliathBase,
                proficiency: 6,
                race: { name: 'Goliath', subrace: { name: 'Stone Giant' } },
            });
            renderComponent(stats);
            assertTrackedResourceRendered({
                getMaxValue: 6,
            });
        });

        it('falls back to 0 when proficiency is undefined for Goliath', () => {
            const stats = makeStats({
                ...goliathBase,
                proficiency: undefined,
                race: { name: 'Goliath', subrace: { name: 'Cloud Giant' } },
            });
            renderComponent(stats);
            assertTrackedResourceRendered({
                getMaxValue: 0,
            });
        });

        it('passes deps with full playerStats object for Goliath', () => {
            const stats = makeStats({
                ...goliathBase,
                race: { name: 'Goliath', subrace: { name: 'Stone Giant' } },
            });
            renderComponent(stats);
            expect(mockRenderData.deps).toEqual([stats]);
        });

        it('returns null when Goliath subrace is undefined', () => {
            const stats = makeStats({
                ...goliathBase,
                race: { name: 'Goliath', subrace: undefined },
            });
            renderComponent(stats);
            assertNoTrackedResourceRendered();
        });
    });

    describe('GIANT_ANCESTRY_MAP registry completeness', () => {
        const goliathBase = {
            name: 'Kara',
            level: 5,
            proficiency: 3,
            race: { name: 'Goliath' },
        };

        const expectedAncestries = [
            { name: 'Cloud Giant', label: "Cloud's Jaunt", resourceKey: 'cloudsJauntUses' },
            { name: 'Fire Giant', label: "Fire's Burn", resourceKey: 'firesBurnUses' },
            { name: 'Frost Giant', label: "Frost's Chill", resourceKey: 'frostsChillUses' },
            { name: 'Hill Giant', label: "Hill's Tumble", resourceKey: 'hillsTumbleUses' },
            { name: 'Stone Giant', label: "Stone's Endurance", resourceKey: 'stonesEnduranceUses' },
            { name: 'Storm Giant', label: "Storm's Thunder", resourceKey: 'stormsThunderUses' },
        ];

        for (const ancestry of expectedAncestries) {
            it(`renders ${ancestry.name} with correct label and resourceKey`, () => {
                const stats = makeStats({
                    ...goliathBase,
                    race: { name: 'Goliath', subrace: { name: ancestry.name } },
                });
                renderComponent(stats);
                assertTrackedResourceRendered({
                    label: ancestry.label,
                    resourceKey: ancestry.resourceKey,
                });
            });
        }
    });

    describe('Unsupported/missing races return null', () => {
        const unsupportedRaces = ['Human', 'Elf', 'Halfling'];

        for (const raceName of unsupportedRaces) {
            it(`returns null for ${raceName} race`, () => {
                const stats = makeStats({ race: { name: raceName } });
                renderComponent(stats);
                assertNoTrackedResourceRendered();
            });
        }

        it('returns null when race is undefined', () => {
            const stats = makeStats({ race: undefined });
            renderComponent(stats);
            assertNoTrackedResourceRendered();
        });

        it('returns null when playerStats is null', () => {
            render(<CharRaceFeatures playerStats={null} campaignName={mockCampaignName} />);
            assertNoTrackedResourceRendered();
        });

        it('returns null when playerStats is undefined', () => {
            render(<CharRaceFeatures playerStats={undefined} campaignName={mockCampaignName} />);
            assertNoTrackedResourceRendered();
        });
    });
});
