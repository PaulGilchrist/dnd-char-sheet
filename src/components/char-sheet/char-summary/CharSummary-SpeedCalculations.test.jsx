// @cleaned-by-ai
//
// Redundant/brittle tests removed:
//   - "Base Speed Rendering" → redundant with exhaustion level 0 test (same render, same assertion)
//   - "Acrobatic Movement Passive" → exact duplicate in CharSummary-PassiveEffects.test.jsx
//   - "Aura Speed Bonus" → overlapping with CharSummary-AuraAndInitiative.test.jsx
//   - "Aquatic Affinity Passive" → exact duplicate in CharSummary-PassiveEffects.test.jsx
//
// Consolidations:
//   - 4 exhaustion tests → 1 parameterized test (it.each)
//   - 6 condition speed tests → 3 parameterized + 1 priority test (speedZero overrides)
//   - 4 fly speed describe blocks → 1 parameterized test (it.each)
//   - Climb + swim individual describe blocks → 1 combined describe block
//
// Tests kept (unique behavioral coverage):
//   - Combined movement speeds (buff interaction: climb + swim together)
//   - Ice walk buff rendering (unique buff, not covered elsewhere)

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
// Exhaustion speed reduction — parameterized across all levels
// ---------------------------------------------------------------------------
describe('CharSummary - Exhaustion Speed Reduction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it.each([
        [0, '25 ft'],
        [1, '20 ft'],
        [2, '15 ft'],
        [3, '10 ft'],
        [4, '5 ft'],
        [5, '0 ft'],
        [6, '0 ft'],
    ])('reduces speed by 5 per level (level %d → %s)', (level, expected) => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={level} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain(expected);
    });
});

// ---------------------------------------------------------------------------
// Condition speed effects — parameterized + priority test
// ---------------------------------------------------------------------------
describe('CharSummary - Condition Speed Effects', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it.each([
        [{ speedHalved: true }, '12 ft'],
        [{ speedReduction: 10 }, '15 ft'],
        [{ speedZero: true }, '0 ft'],
    ])('applies %j condition effect correctly', (conditionEffects, expected) => {
        render(<CharSummary
            playerStats={mockPlayerStats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            conditionEffects={conditionEffects}
        />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain(expected);
    });

    it('combines exhaustion with speed halved condition', () => {
        render(<CharSummary
            playerStats={mockPlayerStats}
            campaignName={mockCampaignName}
            exhaustionLevel={1}
            conditionEffects={{ speedHalved: true }}
        />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
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
        expect(speedEl.textContent).toContain('15 ft');
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
});

// ---------------------------------------------------------------------------
// Climb and swim speed — defaults and buffs
// ---------------------------------------------------------------------------
describe('CharSummary - Climb and Swim Speed', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('uses playerStats climbSpeed when no aspect buff', () => {
        const stats = { ...mockPlayerStats, climbSpeed: 30 };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/climb 30 ft/)).toBeInTheDocument();
    });

    it('uses playerStats swimSpeed when no aquatic buff', () => {
        const stats = { ...mockPlayerStats, swimSpeed: 30 };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/swim 30 ft/)).toBeInTheDocument();
    });

    it('shows climb speed from Aspect of the Wilds (Panther)', () => {
        getActiveBuffs.mockReturnValue([{ name: 'Aspect of the Wilds', effect: 'climb_speed_aspect', optionName: 'Panther' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/climb 25 ft/)).toBeInTheDocument();
    });

    it('shows swim speed from aquatic_adaptation buff (2x base speed)', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'aquatic_adaptation' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/swim 50 ft/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Combined movement speeds — buff interaction
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
        const stats = { ...mockPlayerStats, swimSpeed: 20 };
        getActiveBuffs.mockReturnValue([{ name: 'Aspect of the Wilds', effect: 'climb_speed_aspect', optionName: 'Panther' }]);
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/climb 25 ft/)).toBeInTheDocument();
        expect(screen.getByText(/swim 20 ft/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Fly speed — parameterized across buff types
// ---------------------------------------------------------------------------
describe('CharSummary - Fly Speed', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it.each([
        [{ effect: 'fly_speed_equals_walk_speed' }, /fly 25 ft/],
        [{ effect: 'fly_speed_20_hover' }, /fly 20 ft/],
        [{ effect: 'glistening_flight', flySpeed: 40 }, /fly 25 ft.*hover/s],
        [{ effect: 'dragon_wings', flySpeed: 60 }, /fly 60 ft.*hover/s],
    ])('renders fly speed correctly for %j buff', (buff, expectedText) => {
        getActiveBuffs.mockReturnValue([buff]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(expectedText)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Ice walk buff rendering
// ---------------------------------------------------------------------------
describe('CharSummary - Ice Walk Buff', () => {
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
