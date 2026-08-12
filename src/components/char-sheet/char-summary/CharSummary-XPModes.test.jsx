import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { useRuntimeValue, getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
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

describe('CharSummary - XP Modal Display', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('displays XP preview when delta is entered', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const levelSuffix = screen.getByText(/milestone/);
        fireEvent.click(levelSuffix);
        const input = screen.getByPlaceholderText('+100 or -50');
        fireEvent.change(input, { target: { value: '100' } });
        expect(screen.getByText(/2,400 XP/)).toBeInTheDocument();
    });

    it('does not display XP preview when delta is empty or non-numeric', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const levelSuffix = screen.getByText(/milestone/);
        fireEvent.click(levelSuffix);
        expect(screen.queryByText(/2,400 XP/)).not.toBeInTheDocument();
        const input = screen.getByPlaceholderText('+100 or -50');
        fireEvent.change(input, { target: { value: 'abc' } });
        expect(screen.queryByText(/2,400 XP/)).not.toBeInTheDocument();
    });

    it('toggles milestone checkbox when unchecked switches to experience mode', () => {
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const levelSuffix = screen.getByText(/milestone/);
        fireEvent.click(levelSuffix);
        const xpModal = screen.getByText('Experience Points').closest('.xp-modal');
        const checkbox = xpModal.querySelector('input[type="checkbox"]');
        fireEvent.click(checkbox);
        expect(stats.xpMode).toBe('experience');
    });

    it('hides info text when experience mode is enabled', () => {
        const stats = { ...mockPlayerStats, xpMode: 'experience' };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const levelSuffix = screen.getByText(/2,300 XP/);
        fireEvent.click(levelSuffix);
        expect(screen.queryByText(/XP tracking is disabled/)).not.toBeInTheDocument();
    });
});

describe('CharSummary - Bait and Switch AC Bonus', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        vi.mocked(useRuntimeValue).mockReturnValue(null);
    });

    it.each([
        [3, 'Bait and Switch', /\+3 from Bait and Switch/],
        [5, 'Trickster', /\+5 from Trickster/],
    ])('shows bait and switch AC bonus with value %i from %s', (bonus, source, expectedText) => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'baitAndSwitchActive') return true;
            if (key === 'baitAndSwitchBonus') return bonus;
            if (key === 'baitAndSwitchSource') return source;
            return null;
        });
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'baitAndSwitchActive') return true;
            if (key === 'baitAndSwitchBonus') return bonus;
            if (key === 'baitAndSwitchSource') return source;
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(new RegExp(expectedText))).toBeInTheDocument();
    });
});

describe('CharSummary - Warding Bond and Slow Spell AC Modifiers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it.each([
        [{ wardingBondAcBonus: 2 }, /\+2 from Warding Bond/],
        [{ acPenalty: 2 }, /\(−2 from Slow\)/],
    ])('shows AC modifier when conditionEffects %j is present', (effects, expectedRegex) => {
        render(<CharSummary
            playerStats={mockPlayerStats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            conditionEffects={effects}
        />);
        expect(screen.getByText(expectedRegex)).toBeInTheDocument();
    });

    it('shows both warding bond bonus and slow penalty combined', () => {
        render(<CharSummary
            playerStats={mockPlayerStats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            conditionEffects={{ wardingBondAcBonus: 2, acPenalty: 2 }}
        />);
        expect(screen.getByText(/\+2 from Warding Bond/)).toBeInTheDocument();
        expect(screen.getByText(/\(−2 from Slow\)/)).toBeInTheDocument();
    });
});

describe('CharSummary - useEffect behaviors', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        mockPlayerStats.xpMode = 'milestone';
    });

    it('updates displayXp when playerStats.xp changes', () => {
        const stats = { ...mockPlayerStats, xpMode: 'experience', xp: 2300 };
        const { rerender } = render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/2,300 XP/)).toBeInTheDocument();
        const newStats = { ...stats, xp: 5000 };
        rerender(<CharSummary playerStats={newStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/5,000 XP/)).toBeInTheDocument();
    });
});

describe('CharSummary - XP Modal Cancel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('closes XP modal when Cancel button is clicked', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const clickable = screen.getByText((content, element) => {
            return element?.tagName === 'SPAN' && element?.className?.includes('clickable') && content.includes('milestone');
        });
        fireEvent.click(clickable);
        expect(screen.getByText('Experience Points')).toBeInTheDocument();
        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);
        expect(screen.queryByText('Experience Points')).not.toBeInTheDocument();
    });
});
