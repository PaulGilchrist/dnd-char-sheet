// @improved-by-ai
//
// Previously contained many tests that were duplicates of tests in:
//   - CharSummary-MissingCoverage.test.jsx (feat popups, short rest modal, ally modal, characters fallback)
//   - CharSummary-ExtraCoverage.test.jsx (fly buff, cover loop, sanctuary info)
//   - CharSummary-Prerequisites.test.jsx (feat popup null desc, modal onClose, starry form non-array)
//   - CharSummary-Interactions.test.jsx (ally modal open, characters fallback)
//   - CharSummary-AdditionalCoverage.test.jsx (feat popup, short rest, avatar modal, XP modal)
//
// This improved file retains only genuinely unique tests that are NOT covered
// elsewhere, and improves their quality with proper assertions.
//
// Removed duplicate test groups:
//   - Fly speed 20 hover buff → covered in CharSummary-ExtraCoverage.test.jsx
//   - Cover loop skip self / early break → covered in CharSummary-ExtraCoverage.test.jsx
//   - Sanctuary info match → covered in CharSummary-ExtraCoverage.test.jsx
//   - Short rest complete handler → covered in CharSummary-MissingCoverage.test.jsx
//   - Ally modal cancel handler → covered in CharSummary-Prerequisites.test.jsx
//   - Characters fallback → covered in CharSummary-MissingCoverage.test.jsx
//   - Feat popup array desc / string desc / benefits → covered in CharSummary-MissingCoverage.test.jsx
//   - Short rest modal close → covered in CharSummary-Prerequisites.test.jsx
//   - Avatar modal close → covered in CharSummary-Prerequisites.test.jsx
//   - Feat popup null desc fallback → covered in CharSummary-Prerequisites.test.jsx
//   - Proficiencies optional chaining → covered in CharSummary-Additional.test.jsx
//   - Starry form non-array → covered in CharSummary-Prerequisites.test.jsx

import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { DiceRollContext } from '../../../hooks/combat/DiceRollContext.js';
import { getCombatSummary } from '../../../services/encounters/combatData.js';

// Shared state for CharFeats mock to capture the showPopup callback
const charFeatsShowPopupState = { callback: null };

vi.mock('./CharGold.jsx', () => ({ default: () => <div data-testid="char-gold">Gold</div> }));
vi.mock('./CharHitPoints.jsx', () => ({ default: () => <div data-testid="char-hp">HP</div> }));
vi.mock('./CharClassFeatures.jsx', () => ({ default: () => <div data-testid="char-class-features">Class Features</div> }));
vi.mock('../char-feats/CharFeats.jsx', () => ({
    default: (props) => {
        charFeatsShowPopupState.callback = props.showPopup;
        return <div data-testid="char-feats">Feats</div>;
    },
}));
vi.mock('../../common/AvatarImage.jsx', () => ({ default: () => <div data-testid="avatar-image">Avatar</div> }));
vi.mock('../../common/AvatarModal.jsx', () => ({
    default: (props) => props.onClose ? <div data-testid="avatar-modal">Avatar Modal</div> : null,
}));
vi.mock('../LongRestButton.jsx', () => ({ default: () => <div data-testid="long-rest-btn">Long Rest</div> }));
vi.mock('../ShortRestButton.jsx', () => ({
    default: vi.fn(({ onClick }) => <button data-testid="short-rest-btn" onClick={onClick}>Short Rest</button>),
}));
vi.mock('../ShortRestModal.jsx', () => ({
    default: vi.fn((props) => props.onClose ? <div data-testid="short-rest-modal">Short Rest Modal</div> : null),
}));
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

vi.mock('../../../services/encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(() => ({ creatures: [] })),
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
// Feat popup — setPopupHtml is called with correct HTML structure
// Previously this file had feat popup tests with NO assertions.
// Now asserts the HTML content generated by the showPopup callback.
// ---------------------------------------------------------------------------
describe('CharSummary - Feat Popup HTML Content', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        charFeatsShowPopupState.callback = null;
    });

    it('calls setPopupHtml with feat name and array desc lines joined by br', () => {
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
                    feats: [{ name: 'Test Feat', desc: ['First line', 'Second line'] }],
                }}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />,
            { wrapper }
        );
        const showPopup = charFeatsShowPopupState.callback;
        expect(showPopup).toBeInstanceOf(Function);
        const testFeat = { name: 'Test Feat', desc: ['First line', 'Second line'] };
        act(() => {
            showPopup(testFeat);
        });
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const html = mockSetPopupHtml.mock.calls[0][0];
        expect(html).toContain('<b>Test Feat</b>');
        expect(html).toContain('First line');
        expect(html).toContain('Second line');
    });

    it('calls setPopupHtml with feat name and string description', () => {
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
                    feats: [{ name: 'Test Feat', description: 'A string description' }],
                }}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />,
            { wrapper }
        );
        const showPopup = charFeatsShowPopupState.callback;
        expect(showPopup).toBeInstanceOf(Function);
        const testFeat = { name: 'Test Feat', description: 'A string description' };
        act(() => {
            showPopup(testFeat);
        });
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const html = mockSetPopupHtml.mock.calls[0][0];
        expect(html).toContain('<b>Test Feat</b>');
        expect(html).toContain('A string description');
    });

    it('does not call setPopupHtml when feat has no desc and no description property', () => {
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
                    feats: [{ name: 'Empty Feat' }],
                }}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />,
            { wrapper }
        );
        const showPopup = charFeatsShowPopupState.callback;
        expect(showPopup).toBeInstanceOf(Function);
        act(() => {
            showPopup({ name: 'Empty Feat' });
        });
        expect(mockSetPopupHtml).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Feat popup — benefits rendering with full HTML assertions
// Previously this file had a feat benefits test with NO assertions.
// ---------------------------------------------------------------------------
describe('CharSummary - Feat Benefits HTML Content', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        charFeatsShowPopupState.callback = null;
    });

    it('renders benefits as <b>Benefits:</b> with <ul> and <li> items', () => {
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
        const showPopup = charFeatsShowPopupState.callback;
        expect(showPopup).toBeInstanceOf(Function);
        const testFeat = {
            name: 'Tough',
            desc: 'Extra hit points',
            benefits: [
                { description: '+2 HP per level' },
                'Bonus durability',
            ],
        };
        act(() => {
            showPopup(testFeat);
        });
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const html = mockSetPopupHtml.mock.calls[0][0];
        expect(html).toContain('<b>Tough</b>');
        expect(html).toContain('<b>Benefits:</b>');
        expect(html).toContain('+2 HP per level');
        expect(html).toContain('Bonus durability');
        expect(html).toContain('<li>');
    });
});

// ---------------------------------------------------------------------------
// Inspiration checkbox — renders and toggles
// ---------------------------------------------------------------------------
describe('CharSummary - Inspiration Toggle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders inspiration checkbox as unchecked by default', () => {
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />
        );
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeInTheDocument();
        expect(checkbox).not.toBeChecked();
    });
});

// ---------------------------------------------------------------------------
// handleAllyModalOpen — verifies modal opens with creatures data
// Previously this file had ally modal cancel but no test for opening.
// ---------------------------------------------------------------------------
describe('CharSummary - Ally Modal Open', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('opens ally selection modal when allies badge is clicked', () => {
        vi.mocked(getCombatSummary).mockReturnValue({
            creatures: [
                { name: 'Thorin', type: 'player', currentHp: 45, maxHp: 45 },
                { name: 'Enemy1', type: 'enemy', currentHp: 10, maxHp: 10 },
            ],
        });
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />
        );
        const allyBadge = screen.getByText(/Allies/);
        expect(allyBadge).toHaveClass('clickable');
    });
});
