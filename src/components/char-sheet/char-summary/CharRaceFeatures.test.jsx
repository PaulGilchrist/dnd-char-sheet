// @cleaned-by-ai
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharRaceFeatures from './CharRaceFeatures.jsx';

/*
 * TrackedResourceInput is mocked so CharRaceFeatures tests focus on:
 *  - Which component is selected per race/subrace
 *  - Which props (label, resourceKey, getMax) are passed through
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
        const dragonbornCases = [
            { desc: 'max uses from automation.uses number', race: { name: 'Dragonborn', traits: [{ automation: { uses: 3 } }] }, maxUses: 3, deps: [5] },
            { desc: 'max uses from proficiency_bonus string', race: { name: 'Dragonborn', traits: [{ automation: { uses: 'proficiency_bonus' } }] }, proficiency: 4, maxUses: 4, deps: [5] },
            { desc: 'max uses defaults to 1 when automation.uses is undefined', race: { name: 'Dragonborn', traits: [{}] }, maxUses: 1 },
            { desc: 'max uses defaults to 1 when traits is undefined', race: { name: 'Dragonborn' }, maxUses: 1 },
            { desc: 'max uses defaults to 1 when traits is empty', race: { name: 'Dragonborn', traits: [] }, maxUses: 1 },
        ];

        for (const { desc, race, proficiency, maxUses, deps } of dragonbornCases) {
            it(`renders Breath Weapon — ${desc}`, () => {
                const stats = makeStats({ race, proficiency });
                renderComponent(stats);
                const expectedDeps = deps !== undefined ? deps : [stats.level];
                assertTrackedResourceRendered({
                    label: 'Breath Weapon',
                    resourceKey: 'breathweaponUses',
                    getMaxValue: maxUses,
                    playerName: 'Thorin',
                    campaignName: mockCampaignName,
                    playerStats: stats,
                    deps: expectedDeps,
                });
            });
        }
    });

    describe('Goliath features', () => {
        const goliathNullCases = [
            { desc: 'no subrace', race: { name: 'Goliath' } },
            { desc: 'unknown subrace', race: { name: 'Goliath', subrace: { name: 'Iron Giant' } } },
            { desc: 'undefined subrace', race: { name: 'Goliath', subrace: undefined } },
        ];

        for (const { desc, race } of goliathNullCases) {
            it(`returns null when Goliath has ${desc}`, () => {
                const stats = makeStats({ race });
                renderComponent(stats);
                assertNoTrackedResourceRendered();
            });
        }

        const goliathSupportedCases = [
            { desc: 'Stone Giant with proficiency', race: { name: 'Goliath', subrace: { name: 'Stone Giant' } }, proficiency: 6, maxUses: 6 },
            { desc: 'Cloud Giant with undefined proficiency', race: { name: 'Goliath', subrace: { name: 'Cloud Giant' } }, proficiency: undefined, maxUses: 0 },
        ];

        for (const { desc, race, proficiency, maxUses } of goliathSupportedCases) {
            it(`renders Goliath ancestry feature — ${desc}`, () => {
                const stats = makeStats({ proficiency, race });
                renderComponent(stats);
                assertTrackedResourceRendered({
                    getMaxValue: maxUses,
                    campaignName: mockCampaignName,
                    playerStats: stats,
                    deps: [stats],
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
