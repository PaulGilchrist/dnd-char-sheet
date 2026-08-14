// @improved-by-ai
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { mockPlayerStats, mockCampaignName } from './CharSummary.test-mocks.test.jsx';

// ---------------------------------------------------------------------------
// Shared mocks — kept minimal. Each test file should mock everything it needs
// to avoid brittle cross-file mock state dependency.
// ---------------------------------------------------------------------------
vi.mock('./CharGold.jsx', () => ({ default: () => <div data-testid="char-gold">Gold</div> }));
vi.mock('./CharHitPoints.jsx', () => ({ default: () => <div data-testid="char-hp">HP</div> }));
vi.mock('./CharClassFeatures.jsx', () => ({ default: () => <div data-testid="char-class-features">Class Features</div> }));
vi.mock('../char-feats/CharFeats.jsx', () => ({ default: () => <div data-testid="char-feats">Feats</div> }));
vi.mock('../../common/AvatarImage.jsx', () => ({ default: () => <div data-testid="avatar-image">Avatar</div> }));
vi.mock('../../common/AvatarModal.jsx', () => ({ default: () => null }));
vi.mock('../LongRestButton.jsx', () => ({ default: () => <div data-testid="long-rest-btn">Long Rest</div> }));
vi.mock('../ShortRestButton.jsx', () => ({ default: () => <div data-testid="short-rest-btn">Short Rest</div> }));
vi.mock('../ShortRestModal.jsx', () => ({ default: () => <div data-testid="short-rest-modal">Short Rest Modal</div> }));
vi.mock('./CharConditions.jsx', () => ({ default: () => <div data-testid="char-conditions">Conditions</div> }));

vi.mock('../../../hooks/runtime/useTrackedResource.js', () => ({
    default: vi.fn((key, name, init, _deps, _campaign) => ({ current: init(), update: vi.fn() })),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
    setRuntimeValue: vi.fn(),
    useRuntimeValue: vi.fn((_name, _key, _campaign) => null),
    getRuntimeValue: vi.fn((_name, _key, _campaign) => null),
    getStore: vi.fn(() => new Map()),
}));

vi.mock('../../../hooks/runtime/useSyncedState.js', () => ({
    useSyncedState: vi.fn((_name, _key, defaultValue) => [defaultValue, vi.fn()]),
}));

vi.mock('../../../hooks/combat/useActionPopup.js', () => ({
    showBackgroundPopup: vi.fn(),
}));

vi.mock('../../../hooks/combat/useLoggedDiceRoll.js', () => ({
    default: vi.fn(() => ({ popupHtml: null, setPopupHtml: vi.fn(), rollInitiative: vi.fn() })),
}));

vi.mock('../../../services/ui/sanitize.js', () => ({
    sanitizeHtml: (html) => html,
}));

vi.mock('../../../services/combat/buffs/buffService.js', () => ({
    getActiveBuffs: vi.fn(() => []),
}));

vi.mock('../../../services/rules/rulesFactory.js', () => ({
    default: {
        getRules: vi.fn(() => ({ classRules: { getUnarmoredMovementIncrease: vi.fn(() => 0) } })),
    },
    getRules: vi.fn(() => ({ classRules: { getUnarmoredMovementIncrease: vi.fn(() => 0) } })),
}));

vi.mock('../../../services/rules/core/attackCalc.js', () => ({
    parseMagicItemName: (name) => ({ baseName: name }),
}));

vi.mock('../../../services/encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(() => ({ creatures: [] })),
}));

vi.mock('../../../services/automation/common/buffToggle.js', () => ({
    isBuffActive: vi.fn(() => false),
}));

vi.mock('../../../services/combat/auras/unbreakableMajesty.js', () => ({
    isUnbreakableMajestyActive: vi.fn(() => false),
    getUnbreakableMajestySaveDc: vi.fn(() => 0),
}));

vi.mock('../../../services/automation/handlers/buffs/auraOfLifeHandler.js', () => ({
    isAuraOfLifeActive: vi.fn(() => false),
    handle: vi.fn(),
}));

vi.mock('../../../services/automation/handlers/buffs/circleOfPowerHandler.js', () => ({
    isCircleOfPowerActive: vi.fn(() => false),
    handle: vi.fn(),
}));

vi.mock('../../../services/automation/handlers/buffs/deathWardHandler.js', () => ({
    isDeathWardActive: vi.fn(() => false),
    handle: vi.fn(),
}));

describe('CharSummary - Display', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        window.location.hostname = 'localhost';
    });

    // -------------------------------------------------------------------
    // Basic rendering — avatar image always renders (imagePath optional)
    // -------------------------------------------------------------------
    describe('Avatar Image', () => {
        it('renders avatar image when imagePath is present', () => {
            const stats = { ...mockPlayerStats, imagePath: '/images/character.png' };
            render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
            expect(screen.getByTestId('avatar-image')).toBeInTheDocument();
        });

        it('renders avatar image when imagePath is null', () => {
            const stats = { ...mockPlayerStats, imagePath: null };
            render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
            expect(screen.getByTestId('avatar-image')).toBeInTheDocument();
        });
    });

    // -------------------------------------------------------------------
    // Senses rendering
    // -------------------------------------------------------------------
    describe('Senses', () => {
        it('renders senses with see_invisibility buff', () => {
            vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
                if (key === 'activeBuffs') return [{ effect: 'see_invisibility' }];
                return null;
            });
            const stats = { ...mockPlayerStats, senses: [{ name: 'Blindsight', value: '60 ft' }] };
            render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
            expect(screen.getByText(/Senses:/)).toBeInTheDocument();
            expect(screen.getByText(/Blindsight 60 ft/)).toBeInTheDocument();
            expect(screen.getByText(/See Invisibility/)).toBeInTheDocument();
        });

        it('renders senses without see_invisibility when buff is absent', () => {
            vi.mocked(getRuntimeValue).mockReset();
            const stats = { ...mockPlayerStats, senses: [{ name: 'Darkvision', value: '120 ft' }] };
            render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
            expect(screen.getByText(/Senses:/)).toBeInTheDocument();
            expect(screen.getByText(/Darkvision 120 ft/)).toBeInTheDocument();
            expect(screen.queryByText(/See Invisibility/)).not.toBeInTheDocument();
        });

        it('does not render senses section when senses array is empty', () => {
            const stats = { ...mockPlayerStats, senses: [] };
            render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
            expect(screen.queryByText(/Senses:/)).not.toBeInTheDocument();
        });
    });

    // -------------------------------------------------------------------
    // Proficiencies rendering
    // -------------------------------------------------------------------
    describe('Proficiencies', () => {
        it('renders proficiency items and tool proficiencies', () => {
            const stats = {
                ...mockPlayerStats,
                proficiencies: ['Heavy Armor'],
                toolProficiencies: ["Blacksmith's Tools"],
            };
            render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
            expect(screen.getByText(/Proficiencies:/)).toBeInTheDocument();
            expect(screen.getByText(/Heavy Armor/)).toBeInTheDocument();
            expect(screen.getByText(/Blacksmith/)).toBeInTheDocument();
        });

        it('filters out regex-matched proficiency patterns', () => {
            const stats = {
                ...mockPlayerStats,
                proficiencies: ['10 from: Druid', 'Heavy Armor'],
                toolProficiencies: [],
            };
            render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
            expect(screen.getByText(/Proficiencies:/)).toBeInTheDocument();
            expect(screen.getByText(/Heavy Armor/)).toBeInTheDocument();
            expect(screen.queryByText(/10 from:/)).not.toBeInTheDocument();
        });

        it('does not render proficiencies section when both arrays are empty', () => {
            const stats = { ...mockPlayerStats, proficiencies: [], toolProficiencies: [] };
            render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
            expect(screen.queryByText(/Proficiencies:/)).not.toBeInTheDocument();
        });
    });

    // -------------------------------------------------------------------
    // Languages rendering
    // -------------------------------------------------------------------
    describe('Languages', () => {
        it('renders multiple languages joined by comma', () => {
            const stats = { ...mockPlayerStats, languages: ['Common', 'Dwarvish', 'Celestial'] };
            render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
            expect(screen.getByText(/Languages:/)).toBeInTheDocument();
            expect(screen.getByText(/Common/)).toBeInTheDocument();
            expect(screen.getByText(/Dwarvish/)).toBeInTheDocument();
            expect(screen.getByText(/Celestial/)).toBeInTheDocument();
        });

        it('does not render languages section when array is empty', () => {
            const stats = { ...mockPlayerStats, languages: [] };
            render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
            expect(screen.queryByText(/Languages:/)).not.toBeInTheDocument();
        });
    });

    // -------------------------------------------------------------------
    // Starry Form constellation badge
    // Tests the conditional rendering of the Starry Form badge based on
    // activeBuffs runtime value — verifies all constellation variants and
    // the absence case.
    // -------------------------------------------------------------------
    describe('Starry Form Constellation Badge', () => {
        it('renders badge with Archer constellation', () => {
            vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
                if (key === 'activeBuffs') return [{ name: 'Starry Form', constellation: 'Archer' }];
                return null;
            });
            render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
            expect(screen.getByText(/Starry Form - Archer/)).toBeInTheDocument();
        });

        it('renders badge with Chalice constellation', () => {
            vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
                if (key === 'activeBuffs') return [{ name: 'Starry Form', constellation: 'Chalice' }];
                return null;
            });
            render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
            expect(screen.getByText(/Starry Form - Chalice/)).toBeInTheDocument();
        });

        it('renders badge with any other constellation value', () => {
            vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
                if (key === 'activeBuffs') return [{ name: 'Starry Form', constellation: 'Dragon' }];
                return null;
            });
            render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
            expect(screen.getByText(/Starry Form - Dragon/)).toBeInTheDocument();
        });

        it('does not render badge when activeBuffs is empty array', () => {
            vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
                if (key === 'activeBuffs') return [];
                return null;
            });
            render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
            expect(screen.queryByText(/Starry Form/)).not.toBeInTheDocument();
        });

        it('does not render badge when constellation property is missing', () => {
            vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
                if (key === 'activeBuffs') return [{ name: 'Starry Form' }];
                return null;
            });
            render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
            expect(screen.queryByText(/Starry Form/)).not.toBeInTheDocument();
        });

        it('does not render badge when activeBuffs is null', () => {
            vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
                if (key === 'activeBuffs') return null;
                return null;
            });
            render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
            expect(screen.queryByText(/Starry Form/)).not.toBeInTheDocument();
        });
    });

    // -------------------------------------------------------------------
    // Short rest button rendering
    // -------------------------------------------------------------------
    describe('Short Rest Button', () => {
        it('renders the short rest button on localhost', () => {
            render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
            expect(screen.getByTestId('short-rest-btn')).toBeInTheDocument();
        });
    });
});
