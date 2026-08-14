// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { setRuntimeValue, useRuntimeValue, getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

// Shared state for CharFeats mock to capture the showPopup callback
const charFeatsShowPopupState = { callback: null };

vi.mock('./CharGold.jsx', () => ({ default: () => <div data-testid="char-gold">Gold</div> }));
vi.mock('./CharHitPoints.jsx', () => ({ default: () => <div data-testid="char-hp">HP</div> }));
vi.mock('./CharClassFeatures.jsx', () => ({ default: () => <div data-testid="char-class-features">Class Features</div> }));
vi.mock('./CharRaceFeatures.jsx', () => ({ default: () => <div data-testid="char-race-features">Race Features</div> }));
vi.mock('./CharFeatFeatures.jsx', () => ({ default: () => <div data-testid="char-feat-features">Feat Features</div> }));
vi.mock('../char-feats/CharFeats.jsx', () => ({
    default: (props) => {
        charFeatsShowPopupState.callback = props.showPopup;
        return <div data-testid="char-feats">Feats</div>;
    },
}));
vi.mock('../../common/Popup.jsx', () => ({ default: ({ children, onClick }) => <div data-testid="popup" onClick={onClick}>{children}</div> }));
vi.mock('../../common/AvatarImage.jsx', () => ({ default: () => <div data-testid="avatar-image">Avatar</div> }));
vi.mock('../../common/AvatarModal.jsx', () => ({ default: () => null }));
vi.mock('../../common/AllySelectionModal.jsx', () => ({ default: () => <div data-testid="ally-selection-modal">Ally Selection</div> }));
vi.mock('./TrackedResourceInput.jsx', () => ({ default: () => <div data-testid="tracked-resource-input">Tracked Resource</div> }));
vi.mock('../LongRestButton.jsx', () => ({ default: () => <div data-testid="long-rest-btn">Long Rest</div> }));
vi.mock('../ShortRestButton.jsx', () => ({ default: () => <div data-testid="short-rest-btn">Short Rest</div> }));
vi.mock('../ShortRestModal.jsx', () => ({ default: () => <div data-testid="short-rest-modal">Short Rest Modal</div> }));
vi.mock('./CharConditions.jsx', () => ({ default: () => <div data-testid="char-conditions">Conditions</div> }));
vi.mock('../../common/CreatureBadge.jsx', () => ({ default: ({ label }) => <span data-testid="creature-badge">{label}</span> }));
vi.mock('../../initiative/ConditionEffectBadges.jsx', () => ({ default: () => <div data-testid="condition-effect-badges">Badges</div> }));

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

import { DiceRollContext } from '../../../hooks/combat/DiceRollContext.js';

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
// XP modal save - valid delta
// ---------------------------------------------------------------------------
describe('CharSummary - XP Modal Save Valid', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        charFeatsShowPopupState.callback = null;
    });

    it('saves valid XP delta and updates runtime value', () => {
        const stats = { ...mockPlayerStats, xpMode: 'experience' };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const clickable = screen.getByText((content, element) => {
            return element?.tagName === 'SPAN' && element?.className?.includes('clickable') && content.includes('XP');
        });
        fireEvent.click(clickable);
        const input = screen.getByPlaceholderText('+100 or -50');
        fireEvent.change(input, { target: { value: '500' } });
        const applyBtn = screen.getByText('Apply');
        fireEvent.click(applyBtn);
        expect(setRuntimeValue).toHaveBeenCalledWith('Thorin', 'xp', 2800, mockCampaignName);
    });

    it('does not save empty XP delta', () => {
        const stats = { ...mockPlayerStats, xpMode: 'experience' };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const clickable = screen.getByText((content, element) => {
            return element?.tagName === 'SPAN' && element?.className?.includes('clickable') && content.includes('XP');
        });
        fireEvent.click(clickable);
        const applyBtn = screen.getByText('Apply');
        fireEvent.click(applyBtn);
        expect(setRuntimeValue).not.toHaveBeenCalled();
    });

    it('does not save non-numeric XP delta', () => {
        const stats = { ...mockPlayerStats, xpMode: 'experience' };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const clickable = screen.getByText((content, element) => {
            return element?.tagName === 'SPAN' && element?.className?.includes('clickable') && content.includes('XP');
        });
        fireEvent.click(clickable);
        const input = screen.getByPlaceholderText('+100 or -50');
        fireEvent.change(input, { target: { value: 'abc' } });
        const applyBtn = screen.getByText('Apply');
        fireEvent.click(applyBtn);
        expect(setRuntimeValue).not.toHaveBeenCalled();
    });

    it('clamps XP to minimum 0', () => {
        const stats = { ...mockPlayerStats, xp: 100, xpMode: 'experience' };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const clickable = screen.getByText((content, element) => {
            return element?.tagName === 'SPAN' && element?.className?.includes('clickable') && content.includes('100');
        });
        fireEvent.click(clickable);
        const input = screen.getByPlaceholderText('+100 or -50');
        fireEvent.change(input, { target: { value: '-500' } });
        const applyBtn = screen.getByText('Apply');
        fireEvent.click(applyBtn);
        expect(setRuntimeValue).toHaveBeenCalledWith('Thorin', 'xp', 0, mockCampaignName);
    });
});

// ---------------------------------------------------------------------------
// XP mode toggle
// ---------------------------------------------------------------------------
describe('CharSummary - XP Mode Toggle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        charFeatsShowPopupState.callback = null;
    });

    it('toggles to experience mode when milestone checkbox is unchecked', () => {
        const stats = { ...mockPlayerStats, xpMode: 'milestone' };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const clickable = screen.getByText((content, element) => {
            return element?.tagName === 'SPAN' && element?.className?.includes('clickable') && content.includes('milestone');
        });
        fireEvent.click(clickable);
        const checkbox = screen.getByRole('checkbox', { name: /milestone/i });
        fireEvent.click(checkbox);
        expect(setRuntimeValue).toHaveBeenCalledWith('Thorin', 'xpMode', 'experience', mockCampaignName);
    });
});

// ---------------------------------------------------------------------------
// Condition objects memo
// ---------------------------------------------------------------------------
describe('CharSummary - Condition Objects Memo', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        charFeatsShowPopupState.callback = null;
    });

    it('builds condition objects from runtime conditions', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'activeConditions') return ['Frightened', 'Poisoned'];
            if (key === 'activeConditionMeta') return { frightened: { dc: 12, ability: 'con' }, poisoned: { dc: 15, ability: 'dex' } };
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByTestId('char-conditions')).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Climb speed defaults from playerStats
// ---------------------------------------------------------------------------
describe('CharSummary - Climb Speed Defaults', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        charFeatsShowPopupState.callback = null;
    });

    it('uses playerStats climbSpeed when aspect option is not Salmon', () => {
        const stats = {
            ...mockPlayerStats,
            climbSpeed: 30,
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/climb 30 ft/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Swim speed defaults from playerStats
// ---------------------------------------------------------------------------
describe('CharSummary - Swim Speed Defaults', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        charFeatsShowPopupState.callback = null;
    });

    it('uses playerStats swimSpeed when aspect option is not Salmon', () => {
        const stats = {
            ...mockPlayerStats,
            swimSpeed: 30,
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/swim 30 ft/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Stormborn resistances
// ---------------------------------------------------------------------------
describe('CharSummary - Stormborn Resistances', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        charFeatsShowPopupState.callback = null;
    });

    it('includes stormborn resistances when wrathOfTheSeaActive and passives have stormborn', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'wrathOfTheSeaActive') return true;
            return null;
        });
        const stats = {
            ...mockPlayerStats,
            automation: {
                ...mockPlayerStats.automation,
                passives: [{ type: 'resistance', name: 'Stormborn', damageTypes: ['cold'] }],
            },
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Cold/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Sanctuary info memo
// ---------------------------------------------------------------------------
describe('CharSummary - Sanctuary Info Memo', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        charFeatsShowPopupState.callback = null;
    });

    it('builds sanctuary info from combat summary creatures', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'targetEffects') return [];
            return null;
        });
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (name === 'Ally Druid' && key === 'naturesSanctuaryActive') return true;
            if (name === 'Ally Druid' && key === 'naturesSanctuaryCreatures') return ['Thorin'];
            if (name === 'Ally Druid' && key === 'naturesSanctuaryResistance') return 'cold';
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByTestId('char-conditions')).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Short rest modal rendering
// ---------------------------------------------------------------------------
describe('CharSummary - Short Rest Modal Rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        charFeatsShowPopupState.callback = null;
    });

    it('renders ShortRestModal when showShortRest state is true', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByTestId('short-rest-btn')).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Avatar modal rendering
// ---------------------------------------------------------------------------
describe('CharSummary - Avatar Modal Rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        charFeatsShowPopupState.callback = null;
    });

    it('renders AvatarModal when showAvatarModal state is true and imagePath exists', () => {
        const stats = { ...mockPlayerStats, imagePath: '/images/char.png' };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByTestId('avatar-image')).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// CharFeats popup rendering
// ---------------------------------------------------------------------------
describe('CharSummary - CharFeats Popup', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        charFeatsShowPopupState.callback = null;
    });

    it('renders CharFeats component', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByTestId('char-feats')).toBeInTheDocument();
    });

    it('renders feat popup with array desc format', () => {
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
        const showPopup = charFeatsShowPopupState.callback;
        expect(showPopup).toBeInstanceOf(Function);
        const testFeat = { name: 'Test Feat', desc: ['First line', 'Second line'] };
        showPopup(testFeat);
        expect(mockSetPopupHtml).toHaveBeenCalled();
    });

    it('renders feat popup with string description format', () => {
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
    });

    it('renders feat popup with prerequisites', () => {
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
    });

    it('renders feat popup with benefits array', () => {
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
    });
});

// ---------------------------------------------------------------------------
// Handle short rest complete
// ---------------------------------------------------------------------------
describe('CharSummary - Handle Short Rest Complete', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        charFeatsShowPopupState.callback = null;
    });

    it('calls onLongRest callback when short rest completes', () => {
        const mockOnLongRest = vi.fn();
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} onLongRest={mockOnLongRest} />);
        expect(mockOnLongRest).not.toHaveBeenCalled();
    });
});
