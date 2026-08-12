import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { mockPlayerStats, mockCampaignName } from './CharSummary.test-mocks.test.jsx';

vi.mock('./CharGold.jsx', () => ({ default: () => <div data-testid="char-gold">Gold</div> }));
vi.mock('./CharHitPoints.jsx', () => ({ default: () => <div data-testid="char-hp">HP</div> }));
vi.mock('./CharClassFeatures.jsx', () => ({ default: () => <div data-testid="char-class-features">Class Features</div> }));
vi.mock('../char-feats/CharFeats.jsx', () => ({ default: () => <div data-testid="char-feats">Feats</div> }));
vi.mock('../../common/Popup.jsx', () => ({ default: ({ children, onClick }) => <div data-testid="popup" onClick={onClick}>{children}</div> }));
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
    getRuntimeValue: vi.fn(),
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

describe('CharSummary - Avatar Modal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('renders AvatarModal when imagePath is present and showAvatarModal is true', () => {
        const stats = {
            ...mockPlayerStats,
            imagePath: '/images/character.png',
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByTestId('avatar-image')).toBeInTheDocument();
    });

    it('does not render AvatarModal when imagePath is missing', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByTestId('avatar-image')).toBeInTheDocument();
    });
});

describe('CharSummary - Avatar Image Click', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders avatar image that can be clicked', () => {
        const stats = {
            ...mockPlayerStats,
            imagePath: '/images/character.png',
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByTestId('avatar-image')).toBeInTheDocument();
    });
});

describe('CharSummary - Starry Form Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows Starry Form badge with Archer constellation', () => {
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (key === 'activeBuffs') {
                return [{ name: 'Starry Form', constellation: 'Archer' }];
            }
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Starry Form - Archer/)).toBeInTheDocument();
    });

    it('shows Starry Form badge with Chalice constellation', () => {
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (key === 'activeBuffs') {
                return [{ name: 'Starry Form', constellation: 'Chalice' }];
            }
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Starry Form - Chalice/)).toBeInTheDocument();
    });

    it('shows Starry Form badge with other constellation', () => {
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (key === 'activeBuffs') {
                return [{ name: 'Starry Form', constellation: 'Dragon' }];
            }
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Starry Form - Dragon/)).toBeInTheDocument();
    });

    it('does not show Starry Form badge when activeBuffs is empty', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'activeBuffs') {
                return [];
            }
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Starry Form/)).not.toBeInTheDocument();
    });

    it('does not show Starry Form badge when constellation is missing', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'activeBuffs') {
                return [{ name: 'Starry Form' }];
            }
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Starry Form/)).not.toBeInTheDocument();
    });
});

describe('CharSummary - Senses Proficiencies Languages', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders senses with see_invisibility buff', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'see_invisibility' }]);
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'activeBuffs') return [{ effect: 'see_invisibility' }];
            return null;
        });
        const stats = {
            ...mockPlayerStats,
            senses: [{ name: 'Blindsight', value: '60 ft' }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Senses:/)).toBeInTheDocument();
        expect(screen.getByText(/See Invisibility/)).toBeInTheDocument();
    });

    it('renders proficiencies with tool proficiencies', () => {
        const stats = {
            ...mockPlayerStats,
            proficiencies: ['Heavy Armor'],
            toolProficiencies: ['Blacksmith\'s Tools'],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Proficiencies:/)).toBeInTheDocument();
        expect(screen.getByText(/Heavy Armor/)).toBeInTheDocument();
        expect(screen.getByText(/Blacksmith/)).toBeInTheDocument();
    });

    it('renders languages', () => {
        const stats = {
            ...mockPlayerStats,
            languages: ['Common', 'Dwarvish'],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Languages:/)).toBeInTheDocument();
        expect(screen.getByText(/Common/)).toBeInTheDocument();
        expect(screen.getByText(/Dwarvish/)).toBeInTheDocument();
    });

    it('does not render senses when empty', () => {
        const stats = {
            ...mockPlayerStats,
            senses: [],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Senses:/)).not.toBeInTheDocument();
    });

    it('does not render proficiencies when empty', () => {
        const stats = {
            ...mockPlayerStats,
            proficiencies: [],
            toolProficiencies: [],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Proficiencies:/)).not.toBeInTheDocument();
    });

    it('does not render languages when empty', () => {
        const stats = {
            ...mockPlayerStats,
            languages: [],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Languages:/)).not.toBeInTheDocument();
    });
});

describe('CharSummary - Short Rest Modal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders ShortRestModal when short rest button is clicked', () => {
        const mockOnLongRest = vi.fn();
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} onLongRest={mockOnLongRest} />);
        expect(screen.getByTestId('short-rest-btn')).toBeInTheDocument();
    });
});
