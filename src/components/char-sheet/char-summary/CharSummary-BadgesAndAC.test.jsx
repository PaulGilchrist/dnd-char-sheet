import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';

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

const mockPlayerStats = {
    name: 'Thorin',
    xp: 2300,
    xpMode: 'milestone',
    race: { name: 'Dwarf', type: 'Hill Dwarf', subrace: { name: 'Hill Dwarf', speed: 25 } },
    class: { name: 'Cleric', subclass: { name: 'War', type: 'Choice' }, major: { name: 'Cleric' } },
    level: 5,
    alignment: 'Lawful Good',
    proficiency: 3,
    initiative: 2,
    initiativeAdvantage: false,
    abilities: [{ name: 'Wisdom', bonus: 3 }, { name: 'Strength', bonus: 2 }],
    armorClass: 18,
    armorClassFormula: '16 + 2 (shield)',
    hitPoints: 45,
    inventory: { equipped: ['Scale Mail', 'Shield'] },
    equipment: [{ name: 'Scale Mail', equipment_category: 'Armor' }, { name: 'Shield', type: 'Shield' }],
    background: 'Soldier',
    immunities: [],
    resistances: [],
    vulnerabilities: [],
    senses: [],
    proficiencies: [],
    languages: [],
    automation: { passives: [], actions: [] },
    passives: [],
    exhaustionLevel: 0,
};

const mockCampaignName = 'test-campaign';

// ---------------------------------------------------------------------------
// Barkskin badge
// ---------------------------------------------------------------------------
describe('CharSummary - Barkskin Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows barkskin badge when barkskin buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'barkskin' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Barkskin \(AC 17\)/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Tremorsense badge
// ---------------------------------------------------------------------------
describe('CharSummary - Tremorsense Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows tremorsense badge when tremorsense_60ft buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'tremorsense_60ft' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Tremorsense 60 ft/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Large Form badge
// ---------------------------------------------------------------------------
describe('CharSummary - Large Form Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows large form badge when large_form buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'large_form' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Large Form/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Hunter's Mark badge
// ---------------------------------------------------------------------------
describe('CharSummary - Hunters Mark Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows hunter mark badge when active', () => {
        getActiveBuffs.mockReturnValue([{ name: "Hunter's Mark" }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Hunter's Mark Active/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// AC penalty from slow spell
// ---------------------------------------------------------------------------
describe('CharSummary - AC Slow Penalty', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows AC slow penalty when acPenalty is set', () => {
        render(<CharSummary
            playerStats={mockPlayerStats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            conditionEffects={{ acPenalty: 2 }}
        />);
        expect(screen.getByText(/\(−2 from Slow\)/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Shield of Faith badge
// ---------------------------------------------------------------------------
describe('CharSummary - Shield of Faith Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows shield of faith badge when active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'shield_of_faith' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/\+2 from Shield of Faith/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Defensive Duelist badge
// ---------------------------------------------------------------------------
describe('CharSummary - Defensive Duelist Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows defensive duelist badge when buff is active with acBonus', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'defensive_duelist', acBonus: 3 }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/\+3 from Defensive Duelist/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Ice walk badge
// ---------------------------------------------------------------------------
describe('CharSummary - Ice Walk Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows ice walk when ice_walk buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'ice_walk' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/ice walk/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Mage Armor AC display
// ---------------------------------------------------------------------------
describe('CharSummary - Mage Armor AC', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows mage armor AC override with dex bonus', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'mage_armor', baseAc: 14 }]);
        const stats = {
            ...mockPlayerStats,
            inventory: { equipped: [] },
            equipment: [],
            abilities: [{ name: 'Dexterity', bonus: 3 }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/17/)).toBeInTheDocument();
    });
});
