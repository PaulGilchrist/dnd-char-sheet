import { render, screen } from '@testing-library/react';
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

describe('CharSummary - Passive Buff Effects', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it.each([
        [
            { passives: [{ type: 'passive_buff', effect: 'speed_bonus', bonusExpression: '10', condition: 'no_heavy_armor' }] },
            { equipped: [], equipment: [] },
            '35 ft',
            'no heavy armor',
        ],
        [
            { passives: [{ type: 'passive_buff', effect: 'speed_bonus', bonusExpression: '10', condition: 'no_heavy_armor' }] },
            { equipped: ['Plate'], equipment: [{ name: 'Plate', armor_category: 'Heavy' }] },
            '25 ft',
            'heavy armor worn',
        ],
    ])('applies speed_bonus no_heavy_armor condition: %s', (_passives, equipment, expectedSpeed, _desc) => {
        const stats = {
            ...mockPlayerStats,
            automation: { ...mockPlayerStats.automation, passives: _passives.passives },
            inventory: { equipped: equipment.equipped },
            equipment: equipment.equipment,
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain(expectedSpeed);
    });

    it.each([
        [
            { passives: [{ type: 'passive_buff', effect: 'speed_bonus', bonusExpression: '10', condition: 'no_armor_no_shield' }] },
            { equipped: [], equipment: [] },
            '35 ft',
        ],
        [
            { passives: [{ type: 'passive_buff', effect: 'speed_bonus', bonusExpression: '10', condition: 'no_armor_no_shield' }] },
            { equipped: ['Scale Mail'], equipment: [{ name: 'Scale Mail', equipment_category: 'Armor' }] },
            '25 ft',
        ],
    ])('applies speed_bonus no_armor_no_shield condition', (_passives, equipment, expectedSpeed) => {
        const stats = {
            ...mockPlayerStats,
            automation: { ...mockPlayerStats.automation, passives: _passives.passives },
            inventory: { equipped: equipment.equipped },
            equipment: equipment.equipment,
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain(expectedSpeed);
    });

    it('adds flat speed bonus from speed_increase passive', () => {
        const stats = {
            ...mockPlayerStats,
            automation: {
                ...mockPlayerStats.automation,
                passives: [{ type: 'passive_buff', effect: 'speed_increase', bonusExpression: '15' }],
            },
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('40 ft');
    });

    it.each([
        [false, /acrobatic movement/],
        [true, null],
    ])('shows acrobatic movement badge when %s and no armor/shield', (hasArmorOrShield, expectedText) => {
        const stats = {
            ...mockPlayerStats,
            automation: {
                ...mockPlayerStats.automation,
                passives: [{ effect: 'acrobatic_movement' }],
            },
            inventory: { equipped: hasArmorOrShield ? ['Scale Mail'] : [] },
            equipment: hasArmorOrShield ? [{ name: 'Scale Mail', equipment_category: 'Armor' }] : [],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        if (expectedText) {
            expect(screen.getByText(expectedText)).toBeInTheDocument();
        } else {
            expect(screen.queryByText(/acrobatic movement/)).not.toBeInTheDocument();
        }
    });

    it('sets fly and swim speed when elemental attunement movement passive is present', () => {
        const stats = {
            ...mockPlayerStats,
            passives: [{ effect: 'elemental_attunement_movement' }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/fly 25 ft/)).toBeInTheDocument();
        expect(screen.getByText(/swim 25 ft/)).toBeInTheDocument();
    });

    it('applies aquatic_affinity when swimSpeed is not set', () => {
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

    it('does not override existing swim speed with aquatic_affinity', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'aquatic_adaptation' }]);
        const stats = {
            ...mockPlayerStats,
            automation: {
                ...mockPlayerStats.automation,
                passives: [{ effect: 'aquatic_affinity' }],
            },
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        // aquatic_adaptation sets swimSpeed = 50 (speed * 2), aquatic_affinity should not override
        expect(screen.getByText(/swim 50 ft/)).toBeInTheDocument();
    });

    it('sets fly speed when stormborn passive is present and no fly speed exists', () => {
        useRuntimeValue.mockImplementation((name, key, _campaign) => {
            if (key === 'wrathOfTheSeaActive') return true;
            return null;
        });
        getRuntimeValue.mockImplementation((name, key, _campaign) => {
            if (key === 'wrathOfTheSeaActive') return true;
            return null;
        });
        const stats = {
            ...mockPlayerStats,
            automation: {
                ...mockPlayerStats.automation,
                passives: [{ effect: 'fly_speed_equals_walk_speed' }],
            },
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/fly 25 ft/)).toBeInTheDocument();
    });
});
