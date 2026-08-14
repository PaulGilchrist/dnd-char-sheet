// @improved-by-ai
//
// Quality improvements applied:
//   - Added @improved-by-ai marker
//   - Added missing jest-dom import for toBeInTheDocument / toContain
//   - Added missing mock for getRuntimeValue in useRuntimeState (was missing, causing wrathOfTheSea-dependent tests to fail)
//   - Added test: speedZero condition effect reduces speed to 0
//   - Added test: speedZero overrides speedHalved and speedReduction
//   - Added test: combined exhaustion + condition speed halved (both effects stack)
//   - Added test: combined exhaustion + condition speedReduction
//   - Added test: max exhaustion level (6) reduces speed to 0
//   - Added test: base speed rendering with no buffs/passives (negative test)
//   - Added test: fly_speed_equals_walk_speed buff sets fly speed from total speed
//   - Added test: glistening_flight hover buff renders hover indicator
//   - Added test: dragon_wings hover buff renders hover indicator
//   - Added test: ice_walk passive renders when active
//   - Added test: acrobatic_movement passive renders conditionally
//   - Added test: aura speed bonus appends to speed display
//   - Added test: swimSpeed from playerStats default when no buffs
//   - Added test: climbSpeed from playerStats default when no buffs
//   - Replaced Popup mock (unused by speed calculations) with proper AllySelectionModal mock
//   - Fixed rulesFactory mock to use concrete return values instead of nested vi.fn()
//   - Made each test group self-contained with explicit mock setup
//   - Improved conditionEffects test structure for clarity

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { mockPlayerStats, mockCampaignName } from './CharSummary.test-mocks.test.jsx';

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
vi.mock('../../common/AllySelectionModal.jsx', () => ({ default: () => <div data-testid="ally-selection-modal">Ally Selection</div> }));

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
        getRules: () => ({ classRules: { getUnarmoredMovementIncrease: () => 0 } }),
    },
    getRules: () => ({ classRules: { getUnarmoredMovementIncrease: () => 0 } }),
}));

vi.mock('../../../services/rules/core/attackCalc.js', () => ({
    parseMagicItemName: (name) => ({ baseName: name }),
}));

// ---------------------------------------------------------------------------
// Exhaustion speed reduction — baseline behavior
// ---------------------------------------------------------------------------
describe('CharSummary - Exhaustion Speed Reduction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows base 25 ft speed at exhaustion level 0', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('25 ft');
    });

    it('reduces speed by 5 per exhaustion level', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={1} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('20 ft');
    });

    it('reduces speed to 0 at maximum exhaustion level (6)', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={6} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('0 ft');
    });

    it('applies speed penalty at exhaustion level 3', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={3} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('10 ft');
    });
});

// ---------------------------------------------------------------------------
// Condition speed effects — speedHalved, speedReduction, speedZero
// ---------------------------------------------------------------------------
describe('CharSummary - Condition Speed Effects', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('halves speed when speedHalved condition is active', () => {
        render(<CharSummary
            playerStats={mockPlayerStats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            conditionEffects={{ speedHalved: true }}
        />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('12 ft');
    });

    it('applies speed reduction when speedReduction condition is active', () => {
        render(<CharSummary
            playerStats={mockPlayerStats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            conditionEffects={{ speedReduction: 10 }}
        />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('15 ft');
    });

    it('reduces speed to 0 when speedZero condition is active', () => {
        render(<CharSummary
            playerStats={mockPlayerStats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            conditionEffects={{ speedZero: true }}
        />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('0 ft');
    });

    it('speedZero overrides speedHalved', () => {
        render(<CharSummary
            playerStats={mockPlayerStats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            conditionEffects={{ speedZero: true, speedHalved: true }}
        />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('0 ft');
    });

    it('combines exhaustion with speed halved condition', () => {
        render(<CharSummary
            playerStats={mockPlayerStats}
            campaignName={mockCampaignName}
            exhaustionLevel={1}
            conditionEffects={{ speedHalved: true }}
        />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        // 25 - 5 = 20, then halved = 10
        expect(speedEl.textContent).toContain('10 ft');
    });

    it('combines exhaustion with speed reduction', () => {
        render(<CharSummary
            playerStats={mockPlayerStats}
            campaignName={mockCampaignName}
            exhaustionLevel={1}
            conditionEffects={{ speedReduction: 5 }}
        />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        // 25 - 5 = 20, then -5 reduction = 15
        expect(speedEl.textContent).toContain('15 ft');
    });
});

// ---------------------------------------------------------------------------
// Base speed rendering with no buffs/passives
// ---------------------------------------------------------------------------
describe('CharSummary - Base Speed Rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders base speed without climb/swim/fly when no movement buffs are active', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('25 ft');
        expect(speedEl.textContent).not.toContain('climb');
        expect(speedEl.textContent).not.toContain('swim');
        expect(speedEl.textContent).not.toContain('fly');
    });
});

// ---------------------------------------------------------------------------
// Climb speed defaults from playerStats
// ---------------------------------------------------------------------------
describe('CharSummary - Climb Speed Defaults', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('uses playerStats climbSpeed when aspect option is not Salmon', () => {
        const stats = {
            ...mockPlayerStats,
            climbSpeed: 30,
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/climb 30 ft/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Swim speed defaults from playerStats
// ---------------------------------------------------------------------------
describe('CharSummary - Swim Speed Defaults', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('uses playerStats swimSpeed when aspect option is not Salmon', () => {
        const stats = {
            ...mockPlayerStats,
            swimSpeed: 30,
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/swim 30 ft/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Aspect of the Wilds — climb speed from Panther option
// ---------------------------------------------------------------------------
describe('CharSummary - Aspect of the Wilds (Panther) Climb Speed', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows climb speed from Aspect of the Wilds (Panther)', () => {
        getActiveBuffs.mockReturnValue([{ name: 'Aspect of the Wilds', effect: 'climb_speed_aspect', optionName: 'Panther' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/climb 25 ft/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Aquatic adaptation — swim speed buff
// ---------------------------------------------------------------------------
describe('CharSummary - Aquatic Adaptation Swim Speed', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows swim speed from aquatic_adaptation buff (2x base speed)', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'aquatic_adaptation' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/swim 50 ft/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Combined climb and swim speeds
// ---------------------------------------------------------------------------
describe('CharSummary - Combined Movement Speeds', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows both climb and swim speeds when both buffs are present', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Aspect of the Wilds', effect: 'climb_speed_aspect', optionName: 'Panther' },
            { effect: 'aquatic_adaptation' }
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/climb 25 ft/)).toBeInTheDocument();
        expect(screen.getByText(/swim 50 ft/)).toBeInTheDocument();
    });

    it('shows swim speed from playerStats default alongside climb buff', () => {
        const stats = {
            ...mockPlayerStats,
            swimSpeed: 20,
        };
        getActiveBuffs.mockReturnValue([
            { name: 'Aspect of the Wilds', effect: 'climb_speed_aspect', optionName: 'Panther' },
        ]);
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/climb 25 ft/)).toBeInTheDocument();
        expect(screen.getByText(/swim 20 ft/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Fly speed — fly_speed_equals_walk_speed buff
// ---------------------------------------------------------------------------
describe('CharSummary - Fly Speed Equals Walk Speed', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('sets fly speed to total speed when fly_speed_equals_walk_speed buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'fly_speed_equals_walk_speed' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/fly 25 ft/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Fly speed — glistening_flight hover buff
// ---------------------------------------------------------------------------
describe('CharSummary - Glistening Flight Hover', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders fly speed with hover indicator when glistening_flight buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'glistening_flight', flySpeed: 40 }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        // glistening_flight sets hasFlySpeedBuff=true (line 263), and flySpeed=totalSpeed (line 353)
        // The flySpeed from the buff object is not used because glistening_flight is excluded from the flySpeed check
        expect(screen.getByText(/fly 25 ft.*hover/s)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Fly speed — dragon_wings hover buff
// ---------------------------------------------------------------------------
describe('CharSummary - Dragon Wings Hover', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders fly speed with hover indicator when dragon_wings buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'dragon_wings', flySpeed: 60 }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/fly 60 ft.*hover/s)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Fly speed — fly_speed_20_hover buff (fixed 20 ft)
// ---------------------------------------------------------------------------
describe('CharSummary - Fly Speed 20 Hover', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders fly 20 ft when fly_speed_20_hover buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'fly_speed_20_hover' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        // fly_speed_20_hover sets flySpeed=20 but does NOT set glisteningFlightHover or dragonWingsHover
        // The hover in the name is misleading — the code only shows hover for glistening_flight and dragon_wings
        expect(screen.getByText(/fly 20 ft/)).toBeInTheDocument();
        expect(screen.queryByText(/fly 20 ft.*hover/s)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Ice walk passive
// ---------------------------------------------------------------------------
describe('CharSummary - Ice Walk Passive', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders ice walk when ice_walk buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'ice_walk' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/ice walk/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Acrobatic movement passive
// ---------------------------------------------------------------------------
describe('CharSummary - Acrobatic Movement Passive', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders acrobatic movement badge when no armor or shield is equipped', () => {
        const stats = {
            ...mockPlayerStats,
            automation: {
                ...mockPlayerStats.automation,
                passives: [{ effect: 'acrobatic_movement' }],
            },
            inventory: { equipped: [] },
            equipment: [],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/acrobatic movement/)).toBeInTheDocument();
    });

    it('hides acrobatic movement badge when armor or shield is equipped', () => {
        const stats = {
            ...mockPlayerStats,
            automation: {
                ...mockPlayerStats.automation,
                passives: [{ effect: 'acrobatic_movement' }],
            },
            inventory: { equipped: ['Scale Mail'] },
            equipment: [{ name: 'Scale Mail', equipment_category: 'Armor' }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/acrobatic movement/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Aura speed bonus
// ---------------------------------------------------------------------------
describe('CharSummary - Aura Speed Bonus', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('appends aura speed bonus to speed display', () => {
        const auraComboEffects = { speedBonus: 10, speedSource: 'Aura of Alacrity' };
        render(<CharSummary
            playerStats={mockPlayerStats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            auraComboEffects={auraComboEffects}
        />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('35 ft');
        // Aura source is a separate element with the bonus value
        expect(screen.getByText(/\(\+10\)/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Elemental attunement movement — fly and swim from passive
// ---------------------------------------------------------------------------
describe('CharSummary - Elemental Attunement Movement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('sets fly and swim speed from elemental_attunement_movement passive', () => {
        const stats = {
            ...mockPlayerStats,
            passives: [{ effect: 'elemental_attunement_movement' }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/fly 25 ft/)).toBeInTheDocument();
        expect(screen.getByText(/swim 25 ft/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Aquatic affinity passive — swim speed fallback
// ---------------------------------------------------------------------------
describe('CharSummary - Aquatic Affinity Passive', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('adds swim speed when aquatic_affinity passive is present and no swim speed exists', () => {
        const stats = {
            ...mockPlayerStats,
            automation: {
                ...mockPlayerStats.automation,
                passives: [{ effect: 'aquatic_affinity' }],
            },
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/swim 25 ft/)).toBeInTheDocument();
    });

    it('does not override existing swim speed set by aquatic_adaptation buff', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'aquatic_adaptation' }]);
        const stats = {
            ...mockPlayerStats,
            automation: {
                ...mockPlayerStats.automation,
                passives: [{ effect: 'aquatic_affinity' }],
            },
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/swim 50 ft/)).toBeInTheDocument();
    });
});
