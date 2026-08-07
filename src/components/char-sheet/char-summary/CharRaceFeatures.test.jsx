import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CharRaceFeatures from './CharRaceFeatures.jsx';

vi.mock('./TrackedResourceInput.jsx', () => ({
    default: function MockTrackedResourceInput({ label, resourceKey, playerName, getMax, campaignName }) {
        return (
            <div data-testid={`tracked-resource-${resourceKey}`}>
                <span data-testid="label">{label}</span>
                <span data-testid="max">{getMax()}</span>
                <span data-testid="resource-key">{resourceKey}</span>
                <span data-testid="player-name">{playerName}</span>
                <span data-testid="campaign-name">{campaignName}</span>
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
        it('renders Dragonborn Breath Weapon tracked resource', () => {
            const stats = makeStats({
                race: { name: 'Dragonborn', traits: [{ automation: { uses: 1 } }] },
            });
            renderComponent(stats);
            expect(screen.getByTestId('label')).toHaveTextContent('Breath Weapon');
            expect(screen.getByTestId('tracked-resource-breathweaponUses')).toBeInTheDocument();
            expect(screen.getByTestId('resource-key')).toHaveTextContent('breathweaponUses');
        });

        it('uses proficiency bonus as max uses when automation.uses is "proficiency_bonus"', () => {
            const stats = makeStats({
                proficiency: 4,
                race: { name: 'Dragonborn', traits: [{ automation: { uses: 'proficiency_bonus' } }] },
                level: 5,
            });
            renderComponent(stats);
            expect(screen.getByTestId('max')).toHaveTextContent('4');
        });

        it('uses raw uses value as max when automation.uses is a number', () => {
            const stats = makeStats({
                race: { name: 'Dragonborn', traits: [{ automation: { uses: 3 } }] },
                level: 10,
            });
            renderComponent(stats);
            expect(screen.getByTestId('max')).toHaveTextContent('3');
        });

        it('falls back to 1 when automation.uses is undefined', () => {
            const stats = makeStats({
                race: { name: 'Dragonborn', traits: [{}] },
                level: 5,
            });
            renderComponent(stats);
            expect(screen.getByTestId('max')).toHaveTextContent('1');
        });

        it('falls back to 1 when traits is undefined', () => {
            const stats = makeStats({
                race: { name: 'Dragonborn' },
                level: 5,
            });
            renderComponent(stats);
            expect(screen.getByTestId('max')).toHaveTextContent('1');
        });

        it('passes playerName and campaignName to TrackedResourceInput', () => {
            const stats = makeStats({
                name: 'Garrok',
                race: { name: 'Dragonborn', traits: [{ automation: { uses: 2 } }] },
            });
            renderComponent(stats, 'my-campaign');
            expect(screen.getByTestId('player-name')).toHaveTextContent('Garrok');
            expect(screen.getByTestId('campaign-name')).toHaveTextContent('my-campaign');
        });

        it('passes playerStats and level as deps to TrackedResourceInput', () => {
            const stats = makeStats({
                level: 7,
                race: { name: 'Dragonborn', traits: [{ automation: { uses: 1 } }] },
            });
            const { container } = renderComponent(stats);
            const component = container.querySelector('[data-testid="tracked-resource-breathweaponUses"]');
            expect(component).toBeInTheDocument();
        });
    });

    describe('Goliath features', () => {
        const goliathBase = {
            name: 'Kara',
            level: 5,
            proficiency: 3,
            race: { name: 'Goliath' },
        };

        it('returns null when subrace is undefined', () => {
            const stats = makeStats({
                ...goliathBase,
                race: { name: 'Goliath' },
            });
            const { container } = renderComponent(stats);
            expect(container.innerHTML).toBe('');
        });

        it('renders Cloud Giant ancestry feature', () => {
            const stats = makeStats({
                ...goliathBase,
                race: { name: 'Goliath', subrace: { name: 'Cloud Giant' } },
            });
            renderComponent(stats);
            expect(screen.getByTestId('label')).toHaveTextContent("Cloud's Jaunt");
            expect(screen.getByTestId('tracked-resource-cloudsJauntUses')).toBeInTheDocument();
        });

        it('renders Fire Giant ancestry feature', () => {
            const stats = makeStats({
                ...goliathBase,
                race: { name: 'Goliath', subrace: { name: 'Fire Giant' } },
            });
            renderComponent(stats);
            expect(screen.getByTestId('label')).toHaveTextContent("Fire's Burn");
            expect(screen.getByTestId('tracked-resource-firesBurnUses')).toBeInTheDocument();
        });

        it('renders Frost Giant ancestry feature', () => {
            const stats = makeStats({
                ...goliathBase,
                race: { name: 'Goliath', subrace: { name: 'Frost Giant' } },
            });
            renderComponent(stats);
            expect(screen.getByTestId('label')).toHaveTextContent("Frost's Chill");
            expect(screen.getByTestId('tracked-resource-frostsChillUses')).toBeInTheDocument();
        });

        it('renders Hill Giant ancestry feature', () => {
            const stats = makeStats({
                ...goliathBase,
                race: { name: 'Goliath', subrace: { name: 'Hill Giant' } },
            });
            renderComponent(stats);
            expect(screen.getByTestId('label')).toHaveTextContent("Hill's Tumble");
            expect(screen.getByTestId('tracked-resource-hillsTumbleUses')).toBeInTheDocument();
        });

        it('renders Stone Giant ancestry feature', () => {
            const stats = makeStats({
                ...goliathBase,
                race: { name: 'Goliath', subrace: { name: 'Stone Giant' } },
            });
            renderComponent(stats);
            expect(screen.getByTestId('label')).toHaveTextContent("Stone's Endurance");
            expect(screen.getByTestId('tracked-resource-stonesEnduranceUses')).toBeInTheDocument();
        });

        it('renders Storm Giant ancestry feature', () => {
            const stats = makeStats({
                ...goliathBase,
                race: { name: 'Goliath', subrace: { name: 'Storm Giant' } },
            });
            renderComponent(stats);
            expect(screen.getByTestId('label')).toHaveTextContent("Storm's Thunder");
            expect(screen.getByTestId('tracked-resource-stormsThunderUses')).toBeInTheDocument();
        });

        it('uses proficiency as max uses for Goliath features', () => {
            const stats = makeStats({
                ...goliathBase,
                proficiency: 6,
                race: { name: 'Goliath', subrace: { name: 'Stone Giant' } },
            });
            renderComponent(stats);
            expect(screen.getByTestId('max')).toHaveTextContent('6');
        });

        it('falls back to 0 when proficiency is undefined', () => {
            const stats = makeStats({
                ...goliathBase,
                proficiency: undefined,
                race: { name: 'Goliath', subrace: { name: 'Cloud Giant' } },
            });
            renderComponent(stats);
            expect(screen.getByTestId('max')).toHaveTextContent('0');
        });

        it('passes playerStats to TrackedResourceInput for Goliath', () => {
            const stats = makeStats({
                ...goliathBase,
                name: 'Therkla',
                race: { name: 'Goliath', subrace: { name: 'Fire Giant' } },
            });
            renderComponent(stats, 'goliath-campaign');
            expect(screen.getByTestId('player-name')).toHaveTextContent('Therkla');
            expect(screen.getByTestId('campaign-name')).toHaveTextContent('goliath-campaign');
        });
    });

    describe('Unknown/unsupported races', () => {
        it('returns null for Human race', () => {
            const stats = makeStats({ race: { name: 'Human' } });
            const { container } = renderComponent(stats);
            expect(container.innerHTML).toBe('');
        });

        it('returns null for Elf race', () => {
            const stats = makeStats({ race: { name: 'Elf' } });
            const { container } = renderComponent(stats);
            expect(container.innerHTML).toBe('');
        });

        it('returns null for Halfling race', () => {
            const stats = makeStats({ race: { name: 'Halfling' } });
            const { container } = renderComponent(stats);
            expect(container.innerHTML).toBe('');
        });

        it('returns null when race is undefined', () => {
            const stats = makeStats({ race: undefined });
            const { container } = renderComponent(stats);
            expect(container.innerHTML).toBe('');
        });

        it('returns null when playerStats is null', () => {
            const { container } = render(<CharRaceFeatures playerStats={null} campaignName={mockCampaignName} />);
            expect(container.innerHTML).toBe('');
        });

        it('returns null when playerStats is undefined', () => {
            const { container } = render(<CharRaceFeatures playerStats={undefined} campaignName={mockCampaignName} />);
            expect(container.innerHTML).toBe('');
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
                expect(screen.getByTestId('label')).toHaveTextContent(ancestry.label);
                expect(screen.getByTestId('resource-key')).toHaveTextContent(ancestry.resourceKey);
            });
        }
    });
});
