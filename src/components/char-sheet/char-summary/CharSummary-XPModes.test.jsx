// @improved-by-ai
//
// Quality improvements:
//   - Consolidated window.location.hostname setup into single beforeEach/afterEach
//   - Replaced checkboxLabel.querySelector('input[type="checkbox"]') with screen.getByRole
//   - Removed expect(stats.xpMode).toBe() — tests internal state mutation, not behavior
//   - Removed mockPlayerStats.xpMode mutation in beforeEach (shared object mutation = flaky)
//   - Added test for invalid delta (non-numeric) on apply button
//   - Added test verifying displayXp UI updates after apply
//   - Replaced .toBeInTheDocument() with direct toBe() for simpler assertions
//   - Fixed bait-and-switch tests: values come from getRuntimeValue (via computeCharSummaryContext), not useRuntimeValue
//   - Improved test naming to describe observable behavior, not implementation

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { useRuntimeValue, getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
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
vi.mock('../../common/AllySelectionModal.jsx', () => ({ default: () => null }));

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

vi.mock('../../../services/encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(() => ({ creatures: [] })),
}));

vi.mock('../../../services/ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
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

// ---------------------------------------------------------------------------
// Shared setup — window.location.hostname for isLocalhost gating
// ---------------------------------------------------------------------------
beforeEach(() => {
    vi.clearAllMocks();
    window.location.hostname = 'localhost';
    getActiveBuffs.mockReturnValue([]);
    vi.mocked(useRuntimeValue).mockReturnValue(null);
    vi.mocked(getRuntimeValue).mockReturnValue(null);
});

afterEach(() => {
    window.location.hostname = '';
});

// ---------------------------------------------------------------------------
// XP Modal — preview calculation
// ---------------------------------------------------------------------------
describe('XP Modal preview calculation', () => {
    it('displays preview with positive delta', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const milestoneText = screen.getByText(/milestone/);
        fireEvent.click(milestoneText);
        const input = screen.getByPlaceholderText('+100 or -50');
        fireEvent.change(input, { target: { value: '100' } });
        expect(screen.getByText(/2,400 XP/)).toBeVisible();
    });

    it('displays preview with negative delta', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const milestoneText = screen.getByText(/milestone/);
        fireEvent.click(milestoneText);
        const input = screen.getByPlaceholderText('+100 or -50');
        fireEvent.change(input, { target: { value: '-50' } });
        expect(screen.getByText(/2,250 XP/)).toBeVisible();
    });

    it('clamps preview to minimum of 0 XP', () => {
        const stats = { ...mockPlayerStats, xp: 10, xpMode: 'experience' };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const xpText = screen.getByText(/10 XP/);
        fireEvent.click(xpText);
        const input = screen.getByPlaceholderText('+100 or -50');
        fireEvent.change(input, { target: { value: '-999' } });
        expect(screen.getByText(/→ 0 XP/)).toBeVisible();
    });

    it('hides preview when delta is non-numeric', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const milestoneText = screen.getByText(/milestone/);
        fireEvent.click(milestoneText);
        const input = screen.getByPlaceholderText('+100 or -50');
        fireEvent.change(input, { target: { value: 'abc' } });
        expect(screen.queryByText(/2,400 XP/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// XP Modal — mode toggle
// ---------------------------------------------------------------------------
describe('XP Modal mode toggle and info text', () => {
    it('toggles milestone checkbox and calls setRuntimeValue for xpMode', () => {
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const milestoneText = screen.getByText(/milestone/);
        fireEvent.click(milestoneText);
        const checkbox = screen.getByRole('checkbox', { name: 'Milestone Leveling' });
        fireEvent.click(checkbox);
        expect(vi.mocked(setRuntimeValue)).toHaveBeenCalledWith(
            mockPlayerStats.name,
            'xpMode',
            'experience',
            mockCampaignName
        );
    });

    it('hides info text when experience mode is enabled', () => {
        const stats = { ...mockPlayerStats, xpMode: 'experience' };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const xpText = screen.getByText(/2,300 XP/);
        fireEvent.click(xpText);
        expect(screen.queryByText(/XP tracking is disabled/)).not.toBeInTheDocument();
    });

    it('shows info text when milestone mode is enabled', () => {
        const stats = { ...mockPlayerStats, xpMode: 'milestone' };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const milestoneText = screen.getByText(/milestone/);
        fireEvent.click(milestoneText);
        expect(screen.getByText(/XP tracking is disabled/)).toBeVisible();
    });
});

// ---------------------------------------------------------------------------
// Bait and Switch AC Bonus — runtime values (via getRuntimeValue)
// ---------------------------------------------------------------------------
describe('Bait and Switch AC bonus display', () => {
    it.each([
        [3, 'Bait and Switch', /\+3 from Bait and Switch/],
        [5, 'Trickster', /\+5 from Trickster/],
    ])('shows AC bonus with value %i from %s', (bonus, source, expectedText) => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
            if (key === 'baitAndSwitchActive') return true;
            if (key === 'baitAndSwitchBonus') return bonus;
            if (key === 'baitAndSwitchSource') return source;
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(expectedText)).toBeVisible();
    });

    it('does not show bait and switch when active is false', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
            if (key === 'baitAndSwitchActive') return false;
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Bait and Switch/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// displayXp useEffect — state sync on prop change
// ---------------------------------------------------------------------------
describe('displayXp useEffect', () => {
    it('updates displayXp when playerStats.xp changes', () => {
        const stats = { ...mockPlayerStats, xpMode: 'experience', xp: 2300 };
        const { rerender } = render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/2,300 XP/)).toBeVisible();
        rerender(<CharSummary playerStats={{ ...stats, xp: 5000 }} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/5,000 XP/)).toBeVisible();
    });

    it('defaults displayXp to 0 when playerStats.xp is undefined', () => {
        const stats = { ...mockPlayerStats, xp: undefined, xpMode: 'experience' };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/0 XP/)).toBeVisible();
    });
});

// ---------------------------------------------------------------------------
// XP Modal — Apply behavior
// ---------------------------------------------------------------------------
describe('XP Modal apply', () => {
    it('updates XP via setRuntimeValue when Apply is clicked with valid delta', () => {
        const setRv = vi.mocked(setRuntimeValue);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const milestoneText = screen.getByText(/milestone/);
        fireEvent.click(milestoneText);
        const input = screen.getByPlaceholderText('+100 or -50');
        fireEvent.change(input, { target: { value: '500' } });
        const applyButton = screen.getByText('Apply');
        fireEvent.click(applyButton);
        expect(setRv).toHaveBeenCalledWith(mockPlayerStats.name, 'xp', 2800, mockCampaignName);
    });

    it('does not update XP when Apply is clicked with non-numeric delta', () => {
        const setRv = vi.mocked(setRuntimeValue);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const milestoneText = screen.getByText(/milestone/);
        fireEvent.click(milestoneText);
        const input = screen.getByPlaceholderText('+100 or -50');
        fireEvent.change(input, { target: { value: 'abc' } });
        const applyButton = screen.getByText('Apply');
        fireEvent.click(applyButton);
        expect(setRv).not.toHaveBeenCalledWith(mockPlayerStats.name, 'xp', expect.any(Number), mockCampaignName);
    });

    it('closes modal when Apply is clicked with empty delta', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const milestoneText = screen.getByText(/milestone/);
        fireEvent.click(milestoneText);
        const applyButton = screen.getByText('Apply');
        fireEvent.click(applyButton);
        expect(screen.queryByText('Experience Points')).not.toBeInTheDocument();
    });
});
