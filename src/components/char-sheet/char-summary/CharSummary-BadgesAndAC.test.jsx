// @improved-by-ai
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';


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
    handle: vi.fn(),
    isAuraOfLifeActive: vi.fn(() => false),
}));

vi.mock('../../../services/automation/handlers/buffs/circleOfPowerHandler.js', () => ({
    handle: vi.fn(),
    isCircleOfPowerActive: vi.fn(() => false),
}));

vi.mock('../../../services/automation/handlers/buffs/deathWardHandler.js', () => ({
    handle: vi.fn(),
    isDeathWardActive: vi.fn(() => false),
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

    afterEach(() => {
        window.location.hostname = '';
    });

    it('renders barkskin badge when barkskin buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'barkskin' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Barkskin \(AC 17\)/)).toBeInTheDocument();
    });

    it('does not render barkskin badge when no barkskin buff is present', () => {
        getActiveBuffs.mockReturnValue([]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Barkskin/)).not.toBeInTheDocument();
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

    afterEach(() => {
        window.location.hostname = '';
    });

    it('renders tremorsense badge when tremorsense_60ft buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'tremorsense_60ft' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Tremorsense 60 ft/)).toBeInTheDocument();
    });

    it('does not render tremorsense badge when no tremorsense buff is present', () => {
        getActiveBuffs.mockReturnValue([]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Tremorsense/)).not.toBeInTheDocument();
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

    afterEach(() => {
        window.location.hostname = '';
    });

    it('renders large form badge when large_form buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'large_form' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Large Form/)).toBeInTheDocument();
    });

    it('does not render large form badge when no large_form buff is present', () => {
        getActiveBuffs.mockReturnValue([]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Large Form/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Hunter's Mark badge
// ---------------------------------------------------------------------------
describe('CharSummary - Hunter\'s Mark Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    afterEach(() => {
        window.location.hostname = '';
    });

    it('renders hunter mark badge when active', () => {
        getActiveBuffs.mockReturnValue([{ name: "Hunter's Mark" }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Hunter's Mark Active/)).toBeInTheDocument();
    });

    it('does not render hunter mark badge when not active', () => {
        getActiveBuffs.mockReturnValue([]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Hunter's Mark/)).not.toBeInTheDocument();
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

    afterEach(() => {
        window.location.hostname = '';
    });

    it('renders AC slow penalty when acPenalty condition is set', () => {
        render(<CharSummary
            playerStats={mockPlayerStats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            conditionEffects={{ acPenalty: 2 }}
        />);
        expect(screen.getByText(/\(−2 from Slow\)/)).toBeInTheDocument();
    });

    it('does not render AC slow penalty when acPenalty is zero', () => {
        render(<CharSummary
            playerStats={mockPlayerStats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            conditionEffects={{ acPenalty: 0 }}
        />);
        expect(screen.queryByText(/from Slow/)).not.toBeInTheDocument();
    });

    it('renders correct penalty value for different acPenalty amounts', () => {
        render(<CharSummary
            playerStats={mockPlayerStats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            conditionEffects={{ acPenalty: 5 }}
        />);
        expect(screen.getByText(/\(−5 from Slow\)/)).toBeInTheDocument();
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

    afterEach(() => {
        window.location.hostname = '';
    });

    it('renders shield of faith badge when active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'shield_of_faith' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/\+2 from Shield of Faith/)).toBeInTheDocument();
    });

    it('does not render shield of faith badge when inactive', () => {
        getActiveBuffs.mockReturnValue([]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Shield of Faith/)).not.toBeInTheDocument();
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

    afterEach(() => {
        window.location.hostname = '';
    });

    it('renders defensive duelist badge with correct acBonus value', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'defensive_duelist', acBonus: 3 }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/\+3 from Defensive Duelist/)).toBeInTheDocument();
    });

    it('renders defensive duelist badge with different acBonus value', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'defensive_duelist', acBonus: 5 }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/\+5 from Defensive Duelist/)).toBeInTheDocument();
    });

    it('does not render defensive duelist badge when inactive', () => {
        getActiveBuffs.mockReturnValue([]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Defensive Duelist/)).not.toBeInTheDocument();
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

    afterEach(() => {
        window.location.hostname = '';
    });

    it('renders ice walk when ice_walk buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'ice_walk' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/ice walk/)).toBeInTheDocument();
    });

    it('does not render ice walk when no ice_walk buff is present', () => {
        getActiveBuffs.mockReturnValue([]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/ice walk/)).not.toBeInTheDocument();
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

    afterEach(() => {
        window.location.hostname = '';
    });

    it('renders mage armor AC override with dex bonus', () => {
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

    it('renders mage armor AC override with different baseAc', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'mage_armor', baseAc: 13 }]);
        const stats = {
            ...mockPlayerStats,
            inventory: { equipped: [] },
            equipment: [],
            abilities: [{ name: 'Dexterity', bonus: 2 }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/15/)).toBeInTheDocument();
    });

    it('does not render mage armor when inactive', () => {
        getActiveBuffs.mockReturnValue([]);
        const stats = {
            ...mockPlayerStats,
            inventory: { equipped: [] },
            equipment: [],
            abilities: [{ name: 'Dexterity', bonus: 3 }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Mage Armor/)).not.toBeInTheDocument();
    });
});
