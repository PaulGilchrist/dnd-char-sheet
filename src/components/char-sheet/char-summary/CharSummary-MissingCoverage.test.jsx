import { render, screen, fireEvent } from '@testing-library/react';
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
// handleShortRestComplete - calls onLongRest (lines 541-543)
// ---------------------------------------------------------------------------
describe('CharSummary - Short Rest Complete Handler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        charFeatsShowPopupState.callback = null;
    });

    it('renders ShortRestModal when short rest button is clicked', () => {
        const mockOnLongRest = vi.fn();
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                onLongRest={mockOnLongRest}
            />,
            { wrapper }
        );
        // Click the short rest button to trigger showShortRest = true
        const shortRestBtn = screen.getByTestId('short-rest-btn');
        fireEvent.click(shortRestBtn);
        // ShortRestModal should now be rendered
        expect(screen.getByTestId('short-rest-modal')).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// handleAllyModalCancel (line 575)
// ---------------------------------------------------------------------------
describe('CharSummary - Ally Modal Cancel Handler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        charFeatsShowPopupState.callback = null;
    });

    it('renders ally badge that triggers ally modal open on click', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const allyBadge = screen.getByText(/Allies \(1\)/);
        expect(allyBadge).toHaveClass('clickable');
    });
});

// ---------------------------------------------------------------------------
// Feat popup - array desc format (line 626)
// ---------------------------------------------------------------------------
describe('CharSummary - Feat Popup Array Desc Format', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        charFeatsShowPopupState.callback = null;
    });

    it('calls showPopup callback with feat having array desc', () => {
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
                    feats: [
                        {
                            name: 'Test Feat',
                            desc: ['First line', 'Second line'],
                        },
                    ],
                }}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />,
            { wrapper }
        );
        // Get the captured showPopup callback from the shared state
        const showPopup = charFeatsShowPopupState.callback;
        expect(showPopup).toBeInstanceOf(Function);
        const testFeat = { name: 'Test Feat', desc: ['First line', 'Second line'] };
        showPopup(testFeat);
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const calledHtml = mockSetPopupHtml.mock.calls[0][0];
        expect(calledHtml).toContain('<b>Test Feat</b>');
        expect(calledHtml).toContain('First line');
        expect(calledHtml).toContain('Second line');
    });
});

// ---------------------------------------------------------------------------
// Feat popup - string description format (line 628)
// ---------------------------------------------------------------------------
describe('CharSummary - Feat Popup String Description Format', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        charFeatsShowPopupState.callback = null;
    });

    it('calls showPopup callback with feat having string description', () => {
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
                    feats: [
                        {
                            name: 'Test Feat',
                            description: 'A string description',
                        },
                    ],
                }}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />,
            { wrapper }
        );
        const showPopup = charFeatsShowPopupState.callback;
        expect(showPopup).toBeInstanceOf(Function);
        const testFeat = { name: 'Test Feat', description: 'A string description' };
        showPopup(testFeat);
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const calledHtml = mockSetPopupHtml.mock.calls[0][0];
        expect(calledHtml).toContain('<b>Test Feat</b>');
        expect(calledHtml).toContain('A string description');
    });
});

// ---------------------------------------------------------------------------
// Feat popup - prerequisites rendering (lines 633-645)
// ---------------------------------------------------------------------------
describe('CharSummary - Feat Popup Prerequisites Rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        charFeatsShowPopupState.callback = null;
    });

    it('calls showPopup callback with feat having prerequisites', () => {
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
                    feats: [
                        {
                            name: 'Heavy Armor',
                            desc: 'Can wear heavy armor',
                            prerequisites: {
                                level: 1,
                                ability_scores: [{ name: 'STR', minimum: 16 }],
                                proficiency: 'Heavy Armor',
                            },
                        },
                    ],
                }}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />,
            { wrapper }
        );
        const showPopup = charFeatsShowPopupState.callback;
        expect(showPopup).toBeInstanceOf(Function);
        const testFeat = {
            name: 'Heavy Armor',
            desc: 'Can wear heavy armor',
            prerequisites: {
                level: 1,
                ability_scores: [{ name: 'STR', minimum: 16 }],
                proficiency: 'Heavy Armor',
            },
        };
        showPopup(testFeat);
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const calledHtml = mockSetPopupHtml.mock.calls[0][0];
        expect(calledHtml).toContain('Level 1');
        expect(calledHtml).toContain('STR 16 or higher');
        expect(calledHtml).toContain('Proficiency with Heavy Armor');
    });
});

// ---------------------------------------------------------------------------
// Feat popup - benefits rendering (lines 647-653)
// ---------------------------------------------------------------------------
describe('CharSummary - Feat Popup Benefits Rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        charFeatsShowPopupState.callback = null;
    });

    it('calls showPopup callback with feat having benefits array', () => {
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
                    feats: [
                        {
                            name: 'Tough',
                            desc: 'Extra hit points',
                            benefits: [
                                { description: '+2 HP per level' },
                                'Bonus durability',
                            ],
                        },
                    ],
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
        showPopup(testFeat);
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const calledHtml = mockSetPopupHtml.mock.calls[0][0];
        expect(calledHtml).toContain('<b>Tough</b>');
        expect(calledHtml).toContain('+2 HP per level');
        expect(calledHtml).toContain('Bonus durability');
        expect(calledHtml).toContain('<b>Benefits:</b>');
    });
});

// ---------------------------------------------------------------------------
// handleAllyModalOpen - characters fallback (line 557)
// ---------------------------------------------------------------------------
describe('CharSummary - Ally Modal Open Characters Fallback', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        charFeatsShowPopupState.callback = null;
    });

    it('uses characters.map when combatSummary.creatures is null', () => {
        getCombatSummary.mockReturnValue({ creatures: null });
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        const characters = [
            { name: 'Ally1', type: 'player' },
            { name: 'Ally2', type: 'enemy' },
        ];
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={characters}
            />,
            { wrapper }
        );
        expect(screen.getByText(/Thorin/)).toBeInTheDocument();
    });
});
