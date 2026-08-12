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

describe('CharSummary - Speed Calculations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it.each([
        [1, '20 ft', 'exhaustion level 1'],
        [2, '15 ft', 'exhaustion level 2'],
    ])('reduces speed by 5 per exhaustion level (%s)', (level, expectedSpeed, _desc) => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={level} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain(expectedSpeed);
    });

    it.each([
        [{ speedHalved: true }, '12 ft'],
        [{ speedReduction: 10 }, '15 ft'],
    ])('applies condition speed effect %j', (effects, expectedSpeed) => {
        render(<CharSummary
            playerStats={mockPlayerStats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            conditionEffects={effects}
        />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain(expectedSpeed);
    });

    it('shows climb speed from Aspect of the Wilds (Panther)', () => {
        getActiveBuffs.mockReturnValue([{ name: 'Aspect of the Wilds', effect: 'climb_speed_aspect', optionName: 'Panther' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/climb 25 ft/)).toBeInTheDocument();
    });

    it('shows swim speed from aquatic_adaptation buff', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'aquatic_adaptation' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/swim 50 ft/)).toBeInTheDocument();
    });

    it('shows both climb and swim speeds when present', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Aspect of the Wilds', effect: 'climb_speed_aspect', optionName: 'Panther' },
            { effect: 'aquatic_adaptation' }
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/climb 25 ft/)).toBeInTheDocument();
        expect(screen.getByText(/swim 50 ft/)).toBeInTheDocument();
    });
});
