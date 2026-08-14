// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { DiceRollContext } from '../../../hooks/combat/DiceRollContext.js';

// Shared state to capture the showPopup callback from the CharFeats mock
const charFeatsShowPopupState = { callback: null };

vi.mock('./CharGold.jsx', () => ({ default: () => <div data-testid="char-gold">Gold</div> }));
vi.mock('./CharHitPoints.jsx', () => ({ default: () => <div data-testid="char-hp">HP</div> }));
vi.mock('./CharClassFeatures.jsx', () => ({ default: () => <div data-testid="char-class-features">Class Features</div> }));
vi.mock('../char-feats/CharFeats.jsx', () => ({
    default: (props) => {
        charFeatsShowPopupState.callback = props.showPopup;
        return <button data-testid="char-feats" onClick={() => props.showPopup(props.playerStats?.feats?.[0] || { name: 'Heavy Armor', desc: 'Can wear heavy armor' })}>Feats</button>;
    },
}));
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
// AC nullish coalescing — null branch (circleFormsACOverride ?? fallback)
// When circleFormsACOverride is null (non-Moon-Druid), the ?? operator
// evaluates the right-hand side which includes barkskin/mageArmor/etc.
// The base armorClass (18) should render since no buffs modify it.
// ---------------------------------------------------------------------------
describe('CharSummary - AC Nullish Coalescing Null Branch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        charFeatsShowPopupState.callback = null;
    });

    it('renders base armorClass when circleFormsACOverride is null (non-Moon-Druid)', () => {
        const stats = {
            ...mockPlayerStats,
            class: { name: 'Cleric', subclass: { name: 'War', type: 'Choice' }, major: { name: 'Cleric' } },
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        // Verify the base AC value (18) renders as part of the AC line
        // Text is split across <b> and non-<b> elements, so use a query that matches either part
        expect(screen.getByText(/Armor Class:/)).toBeInTheDocument();
        expect(screen.getByText(/^18$/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Feat popup — desc is a non-array string, description is falsy
// Branch: line 622 true → line 626 false (not array) → line 628 false (no description)
// Falls through to line 630: descriptionHtml = feat.desc || ''
// ---------------------------------------------------------------------------
describe('CharSummary - Feat Popup Desc String Else Branch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        charFeatsShowPopupState.callback = null;
    });

    it('renders feat with string desc when desc is a string and description is falsy', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        render(
            <CharSummary
                playerStats={{
                    ...mockPlayerStats,
                    feats: [{
                        name: 'Heavy Armor',
                        desc: 'Can wear heavy armor',
                    }],
                }}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />,
            { wrapper }
        );
        const featsBtn = screen.getByTestId('char-feats');
        fireEvent.click(featsBtn);
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const html = mockSetPopupHtml.mock.calls[0][0];
        expect(html).toContain('<b>Heavy Armor</b>');
        expect(html).toContain('Can wear heavy armor');
    });
});

// ---------------------------------------------------------------------------
// Feat popup — benefits array with items (line 647 true branch)
// Verifies that when feat.benefits exists and has items, they render in the popup
// ---------------------------------------------------------------------------
describe('CharSummary - Feat Popup Benefits True Branch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        charFeatsShowPopupState.callback = null;
    });

    it('renders benefits when feat has a non-empty benefits array', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        render(
            <CharSummary
                playerStats={{
                    ...mockPlayerStats,
                    feats: [{
                        name: 'Tough',
                        desc: 'Extra hit points',
                        benefits: [
                            { description: '+2 HP per level' },
                            'Bonus durability',
                        ],
                    }],
                }}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />,
            { wrapper }
        );
        const featsBtn = screen.getByTestId('char-feats');
        fireEvent.click(featsBtn);
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const html = mockSetPopupHtml.mock.calls[0][0];
        expect(html).toContain('<b>Tough</b>');
        expect(html).toContain('<b>Benefits:</b>');
        expect(html).toContain('+2 HP per level');
        expect(html).toContain('Bonus durability');
    });
});

// ---------------------------------------------------------------------------
// Feat popup — desc is null, description is falsy (line 622 false branch)
// When both desc and description are falsy, showPopup never calls setPopupHtml
// ---------------------------------------------------------------------------
describe('CharSummary - Feat Popup Null Desc', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        charFeatsShowPopupState.callback = null;
    });

    it('does not call setPopupHtml when feat has no desc and no description', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        render(
            <CharSummary
                playerStats={{
                    ...mockPlayerStats,
                    feats: [{
                        name: 'Mystery Feat',
                        desc: null,
                    }],
                }}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />,
            { wrapper }
        );
        const featsBtn = screen.getByTestId('char-feats');
        fireEvent.click(featsBtn);
        expect(mockSetPopupHtml).not.toHaveBeenCalled();
    });
});
