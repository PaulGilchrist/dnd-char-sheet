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

describe('CharSummary - Class Movement Bonuses', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it.each([
        [
            { equipped: [], equipment: [] },
            '35 ft',
            'no armor or shield',
        ],
        [
            { equipped: ['Scale Mail'], equipment: [{ name: 'Scale Mail', equipment_category: 'Armor' }] },
            '25 ft',
            'armor equipped',
        ],
    ])('adds barbarian unarmored movement when %s', (_equipment, expectedSpeed, _desc) => {
        const stats = {
            ...mockPlayerStats,
            level: 1,
            class: { name: 'Barbarian', major: { name: 'Barbarian' }, class_levels: [{ class_specific: { unarmored_movement: 10 } }] },
            inventory: { equipped: _equipment.equipped },
            equipment: _equipment.equipment,
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain(expectedSpeed);
    });

    it('handles missing class_specific gracefully', () => {
        const stats = {
            ...mockPlayerStats,
            level: 1,
            class: { name: 'Barbarian', major: { name: 'Barbarian' }, class_levels: [{}] },
            inventory: { equipped: [] },
            equipment: [],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('25 ft');
    });
});

describe('CharSummary - Circle Forms AC Override', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('overrides AC for Moon Druid with shape shift buff', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'shape_shift' }]);
        const stats = {
            ...mockPlayerStats,
            class: { name: 'Druid', subclass: { name: 'Moon' }, major: { name: 'Moon' } },
            abilities: [{ name: 'Wisdom', bonus: 3 }],
            inventory: { equipped: [] },
            equipment: [],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText((content, element) => element?.tagName === 'DIV' && element.className?.includes('clickable') && content.includes('16'))).toBeInTheDocument();
    });

    it('does not override AC for non-Moon Druid or when shape shift is inactive', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'shape_shift' }]);
        const stats = {
            ...mockPlayerStats,
            class: { name: 'Druid', subclass: { name: 'Land' }, major: { name: 'Druid' } },
            abilities: [{ name: 'Wisdom', bonus: 3 }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText((content, element) => element?.tagName === 'DIV' && element.className?.includes('clickable') && content.includes('18'))).toBeInTheDocument();
    });

    it('handles missing wisdom ability gracefully', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'shape_shift' }]);
        const stats = {
            ...mockPlayerStats,
            class: { name: 'Druid', subclass: { name: 'Moon' }, major: { name: 'Moon' } },
            abilities: [],
            inventory: { equipped: [] },
            equipment: [],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText((content, element) => element?.tagName === 'DIV' && element.className?.includes('clickable') && content.includes('13'))).toBeInTheDocument();
    });
});
