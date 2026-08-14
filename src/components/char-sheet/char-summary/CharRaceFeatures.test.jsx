import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CharRaceFeatures from './CharRaceFeatures.jsx';

/*
 * TrackedResourceInput is mocked so CharRaceFeatures tests focus on:
 *  - Which component is selected per race/subrace
 *  - Which props (label, resourceKey, getMax) are passed through
 *  - Null/early-return paths for unsupported races
 *
 * The mock returns a container with data attributes matching the props
 * so we can assert prop passthrough without exercising the real
 * TrackedResourceInput (which depends on hooks and DOM APIs).
 */
vi.mock('./TrackedResourceInput.jsx', () => ({
    default: function MockTrackedResourceInput(props) {
        return (
            <div
                data-testid="tracked-resource"
                data-label={props.label}
                data-resource-key={props.resourceKey}
                data-player-name={props.playerName}
                data-get-max={String(props.getMax())}
                data-campaign-name={props.campaignName}
            >
                {props.label}: {props.getMax()}/?
            </div>
        );
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

describe('CharRaceFeatures', () => {
    describe('Dragonborn features', () => {
        it('renders Breath Weapon with max uses from automation.uses number', () => {
            const stats = makeStats({
                race: { name: 'Dragonborn', traits: [{ automation: { uses: 3 } }] },
            });
            renderComponent(stats);
            expect(screen.getByTestId('tracked-resource')).toHaveAttribute('data-label', 'Breath Weapon');
            expect(screen.getByTestId('tracked-resource')).toHaveAttribute('data-resource-key', 'breathweaponUses');
            expect(screen.getByTestId('tracked-resource')).toHaveAttribute('data-get-max', '3');
        });

        it('uses proficiency bonus as max when automation.uses is "proficiency_bonus"', () => {
            const stats = makeStats({
                proficiency: 4,
                race: { name: 'Dragonborn', traits: [{ automation: { uses: 'proficiency_bonus' } }] },
            });
            renderComponent(stats);
            expect(screen.getByTestId('tracked-resource')).toHaveAttribute('data-get-max', '4');
        });

        it('falls back to 1 when automation.uses is undefined', () => {
            const stats = makeStats({
                race: { name: 'Dragonborn', traits: [{}] },
            });
            renderComponent(stats);
            expect(screen.getByTestId('tracked-resource')).toHaveAttribute('data-get-max', '1');
        });

        it('falls back to 1 when traits is undefined', () => {
            const stats = makeStats({
                race: { name: 'Dragonborn' },
            });
            renderComponent(stats);
            expect(screen.getByTestId('tracked-resource')).toHaveAttribute('data-get-max', '1');
        });

        it('falls back to 1 when traits is an empty array', () => {
            const stats = makeStats({
                race: { name: 'Dragonborn', traits: [] },
            });
            renderComponent(stats);
            expect(screen.getByTestId('tracked-resource')).toHaveAttribute('data-get-max', '1');
        });

        it('passes playerName and campaignName to TrackedResourceInput', () => {
            const stats = makeStats({
                name: 'Garrok',
                race: { name: 'Dragonborn', traits: [{ automation: { uses: 2 } }] },
            });
            renderComponent(stats, 'test-campaign');
            expect(screen.getByTestId('tracked-resource')).toHaveAttribute('data-player-name', 'Garrok');
            expect(screen.getByTestId('tracked-resource')).toHaveAttribute('data-campaign-name', 'test-campaign');
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
            expect(screen.queryByTestId('tracked-resource')).not.toBeInTheDocument();
        });

        it('returns null when Goliath has an unknown subrace', () => {
            const stats = makeStats({
                ...goliathBase,
                race: { name: 'Goliath', subrace: { name: 'Iron Giant' } },
            });
            renderComponent(stats);
            expect(screen.queryByTestId('tracked-resource')).not.toBeInTheDocument();
        });

        it('passes proficiency as max uses for Goliath ancestry features', () => {
            const stats = makeStats({
                ...goliathBase,
                proficiency: 6,
                race: { name: 'Goliath', subrace: { name: 'Stone Giant' } },
            });
            renderComponent(stats);
            expect(screen.getByTestId('tracked-resource')).toHaveAttribute('data-get-max', '6');
        });

        it('falls back to 0 when proficiency is undefined for Goliath', () => {
            const stats = makeStats({
                ...goliathBase,
                proficiency: undefined,
                race: { name: 'Goliath', subrace: { name: 'Cloud Giant' } },
            });
            renderComponent(stats);
            expect(screen.getByTestId('tracked-resource')).toHaveAttribute('data-get-max', '0');
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
                expect(screen.getByTestId('tracked-resource')).toHaveAttribute('data-label', ancestry.label);
                expect(screen.getByTestId('tracked-resource')).toHaveAttribute('data-resource-key', ancestry.resourceKey);
            });
        }
    });

    describe('Unsupported/missing races return null', () => {
        const unsupportedRaces = ['Human', 'Elf', 'Halfling'];

        for (const raceName of unsupportedRaces) {
            it(`returns null for ${raceName} race`, () => {
                const stats = makeStats({ race: { name: raceName } });
                renderComponent(stats);
                expect(screen.queryByTestId('tracked-resource')).not.toBeInTheDocument();
            });
        }

        it('returns null when race is undefined', () => {
            const stats = makeStats({ race: undefined });
            renderComponent(stats);
            expect(screen.queryByTestId('tracked-resource')).not.toBeInTheDocument();
        });

        it('returns null when playerStats is null', () => {
            render(<CharRaceFeatures playerStats={null} campaignName={mockCampaignName} />);
            expect(screen.queryByTestId('tracked-resource')).not.toBeInTheDocument();
        });

        it('returns null when playerStats is undefined', () => {
            render(<CharRaceFeatures playerStats={undefined} campaignName={mockCampaignName} />);
            expect(screen.queryByTestId('tracked-resource')).not.toBeInTheDocument();
        });
    });
});
