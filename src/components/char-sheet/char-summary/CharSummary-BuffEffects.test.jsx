// @improved-by-ai
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

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

vi.mock('../../../services/encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(() => ({ creatures: [] })),
}));

vi.mock('../../../services/ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
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

vi.mock('../../../services/automation/common/buffToggle.js', () => ({
    isBuffActive: vi.fn(() => false),
}));

vi.mock('../../../services/combat/auras/unbreakableMajesty.js', () => ({
    isUnbreakableMajestyActive: vi.fn(() => false),
    getUnbreakableMajestySaveDc: vi.fn(() => 0),
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
    abilities: [{ name: 'Wisdom', bonus: 3 }, { name: 'Strength', bonus: 2 }, { name: 'Dexterity', bonus: 2 }],
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
// AC bonus indicators from buffs
// ---------------------------------------------------------------------------
describe('CharSummary - AC Bonus Buff Indicators', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows +2 from Haste AC bonus', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'haste' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/\+2 from Haste/)).toBeInTheDocument();
    });

    it('shows mage armor AC formula when mage_armor buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'mage_armor', baseAc: 13 }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/\(13 \+ 2 Dex\)/)).toBeInTheDocument();
    });

    it('shows +5 from Shield AC bonus', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'shield' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/\+5 from Shield/)).toBeInTheDocument();
    });

    it('shows +2 from Shield of Faith when active', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'shieldOfFaithActive') return true;
            if (key === 'baitAndSwitchActive') return false;
            return null;
        });
        getActiveBuffs.mockReturnValue([{ effect: 'shield_of_faith' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/\+2 from Shield of Faith/)).toBeInTheDocument();
    });

    it('shows AC 17 from Barkskin when active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'barkskin' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/AC 17 from Barkskin/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Fly speed variations from different buff effects
// ---------------------------------------------------------------------------
describe('CharSummary - Fly Speed Buff Effects', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('sets fly speed from dragon_wings buff with custom speed', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'dragon_wings', flySpeed: 30 }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/fly 30 ft/)).toBeInTheDocument();
    });

    it('sets fly speed from avenging_angel_flight buff with custom speed', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'avenging_angel_flight', flySpeed: 40 }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/fly 40 ft/)).toBeInTheDocument();
    });

    it('sets fly speed from telekinetic_leap buff with custom speed', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'telekinetic_leap', flySpeed: 25 }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/fly 25 ft/)).toBeInTheDocument();
    });

    it('uses default fly speed 60 for dragon_wings when flySpeed not provided', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'dragon_wings' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/fly 60 ft/)).toBeInTheDocument();
    });

    it('uses default fly speed 60 for avenging_angel_flight when flySpeed not provided', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'avenging_angel_flight' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/fly 60 ft/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Hover indicator for specific fly buffs
// ---------------------------------------------------------------------------
describe('CharSummary - Fly Hover Indicator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows hover indicator for dragon_wings buff', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'dragon_wings', flySpeed: 30 }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/hover/)).toBeInTheDocument();
    });

    it('shows hover indicator for glistening_flight buff', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'glistening_flight' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/hover/)).toBeInTheDocument();
    });

    it('does not show hover for fly_speed_equals_walk_speed buff', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'fly_speed_equals_walk_speed' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/hover/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Swim speed from aquatic_adaptation buff
// ---------------------------------------------------------------------------
describe('CharSummary - Swim Speed Buff', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('sets swim speed from aquatic_adaptation buff', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'aquatic_adaptation' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/swim 50 ft/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Ice walk indicator
// ---------------------------------------------------------------------------
describe('CharSummary - Ice Walk Indicator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows ice walk indicator when ice_walk buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'ice_walk' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/ice walk/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Fly speed equals walk speed with name badge
// ---------------------------------------------------------------------------
describe('CharSummary - Fly Speed Buff Name Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows buff name badge when fly_speed_equals_walk_speed buff has a name', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'fly_speed_equals_walk_speed', name: 'Fly Speed Buff' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Fly Speed Buff Active/)).toBeInTheDocument();
    });

    it('shows badge with empty name when fly_speed_equals_walk_speed buff has no name', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'fly_speed_equals_walk_speed' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Active/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Speed bonus from speed_boost and large_form buffs
// ---------------------------------------------------------------------------
describe('CharSummary - Speed Bonus Buffs', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('applies speed bonus from speed_boost buff', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'speed_boost', speedBonus: 15 }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toMatch(/40 ft/);
    });

    it('applies speed bonus from large_form buff', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'large_form' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toMatch(/35 ft/);
    });

    it('shows Large Form badge when large_form buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'large_form' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Large Form/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// No active buffs — verify baseline rendering
// ---------------------------------------------------------------------------
describe('CharSummary - No Active Buffs', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders base speed without any buff modifications', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('25 ft');
    });

    it('does not show any fly speed when no fly buffs are active', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/fly/)).not.toBeInTheDocument();
    });

    it('does not show any swim speed when no swim buffs are active', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/swim/)).not.toBeInTheDocument();
    });

    it('does not show hover text when no hover buffs are active', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/hover/)).not.toBeInTheDocument();
    });

    it('does not show ice walk when no ice_walk buff is active', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/ice walk/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Multiple buffs active simultaneously
// ---------------------------------------------------------------------------
describe('CharSummary - Multiple Buffs Active', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows both fly speed and ice walk when both buffs are active', () => {
        getActiveBuffs.mockReturnValue([
            { effect: 'dragon_wings', flySpeed: 30 },
            { effect: 'ice_walk' },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/fly 30 ft/)).toBeInTheDocument();
        expect(screen.getByText(/ice walk/)).toBeInTheDocument();
    });

    it('shows both swim and climb speeds from different buffs', () => {
        getActiveBuffs.mockReturnValue([
            { effect: 'aquatic_adaptation' },
            { name: 'Aspect of the Wilds', effect: 'climb_speed_aspect', optionName: 'Panther' },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/swim 50 ft/)).toBeInTheDocument();
        expect(screen.getByText(/climb 25 ft/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Tremorsense buff
// ---------------------------------------------------------------------------
describe('CharSummary - Tremorsense Buff', () => {
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
// Hunters Mark buff
// ---------------------------------------------------------------------------
describe('CharSummary - Hunters Mark Buff', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows Hunters Mark badge when active', () => {
        getActiveBuffs.mockReturnValue([{ name: "Hunter's Mark" }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Hunter's Mark Active/)).toBeInTheDocument();
    });
});
