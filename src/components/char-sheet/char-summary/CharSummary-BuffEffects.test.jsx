import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
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

describe('CharSummary - Buff Effects', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it.each([
        [{ effect: 'haste' }, /\+2 from Haste/],
        [{ effect: 'mage_armor' }, /\(13 \+ \d+ Dex\)/],
        [{ effect: 'shield' }, /\+5 from Shield/],
        [{ effect: 'ice_walk' }, /ice walk/],
    ])('shows indicator for %j buff effect', (buff, expectedText) => {
        getActiveBuffs.mockReturnValue([buff]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(expectedText)).toBeInTheDocument();
    });

    it.each([
        [{ effect: 'fly_speed_equals_walk_speed' }, /fly 25 ft/],
        [{ effect: 'dragon_wings', flySpeed: 30 }, /fly 30 ft/],
        [{ effect: 'avenging_angel_flight', flySpeed: 40 }, /fly 40 ft/],
        [{ effect: 'telekinetic_leap', flySpeed: 25 }, /fly 25 ft/],
        [{ effect: 'glistening_flight' }, /fly 25 ft/],
    ])('sets fly speed when %j buff is active', (buff, expectedText) => {
        getActiveBuffs.mockReturnValue([buff]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(expectedText)).toBeInTheDocument();
    });

    it('shows hover for dragon_wings and glistening_flight buffs', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'dragon_wings', flySpeed: 30 }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/hover/)).toBeInTheDocument();
    });

    it('sets swim speed when aquatic_adaptation buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'aquatic_adaptation' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/swim 50 ft/)).toBeInTheDocument();
    });

    it('shows fly buff name badge when fly_speed_equals_walk_speed buff has a name', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'fly_speed_equals_walk_speed', name: 'Fly Speed Buff' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Fly Speed Buff Active/)).toBeInTheDocument();
    });

    it.each([
        [{ effect: 'speed_boost', speedBonus: 15 }, /40 ft/],
        [{ effect: 'large_form' }, /35 ft/],
    ])('applies speed bonus for %j buff', (buff, expectedSpeed) => {
        getActiveBuffs.mockReturnValue([buff]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toMatch(expectedSpeed);
    });
});
