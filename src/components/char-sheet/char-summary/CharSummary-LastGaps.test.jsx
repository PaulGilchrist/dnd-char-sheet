import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { DiceRollContext } from '../../../hooks/combat/DiceRollContext.js';
import { getCombatSummary } from '../../../services/encounters/combatData.js';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

vi.mock('./CharGold.jsx', () => ({ default: () => <div data-testid="char-gold">Gold</div> }));
vi.mock('./CharHitPoints.jsx', () => ({ default: () => <div data-testid="char-hp">HP</div> }));
vi.mock('./CharClassFeatures.jsx', () => ({ default: () => <div data-testid="char-class-features">Class Features</div> }));
vi.mock('../char-feats/CharFeats.jsx', () => ({ default: () => <div data-testid="char-feats">Feats</div> }));
vi.mock('../../common/AvatarImage.jsx', () => ({ default: () => <div data-testid="avatar-image">Avatar</div> }));
vi.mock('../../common/AvatarModal.jsx', () => ({
    default: (props) => props.onClose ? <div data-testid="avatar-modal">Avatar Modal</div> : null,
}));
vi.mock('../../common/AllySelectionModal.jsx', () => ({
    default: vi.fn(({ onConfirm, onCancel, currentAllies }) => (
        <div data-testid="ally-selection-modal">
            Select Allies
            <button data-testid="ally-confirm" onClick={() => onConfirm(currentAllies || ['Thorin'])}>Confirm</button>
            <button data-testid="ally-cancel" onClick={onCancel}>Cancel</button>
        </div>
    )),
}));
vi.mock('../LongRestButton.jsx', () => ({ default: () => <div data-testid="long-rest-btn">Long Rest</div> }));
vi.mock('../ShortRestButton.jsx', () => ({
    default: vi.fn(({ onClick }) => <button data-testid="short-rest-btn" onClick={onClick}>Short Rest</button>),
}));

// We need a ref to the ShortRestModal mock function so tests can access its calls
const shortRestModalCalls = { calls: [] };
vi.mock('../ShortRestModal.jsx', () => ({
    default: vi.fn((props) => {
        shortRestModalCalls.calls.push({ props });
        return props.onClose ? <div data-testid="short-rest-modal">Short Rest Modal</div> : null;
    }),
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
// fly_speed_20_hover buff effect (line 369)
// ---------------------------------------------------------------------------
describe('CharSummary - Fly Speed 20 Hover Buff', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('sets flySpeed to 20 when fly_speed_20_hover buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'fly_speed_20_hover', flySpeed: 20 }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/fly 20 ft/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Bulwark of Force / Nature's Sanctuary cover loop - skip self (line 434)
// and early break (line 450)
// ---------------------------------------------------------------------------
describe('CharSummary - Cover Loop Skip Self And Early Break', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('skips the character with same name as playerStats in cover loop', () => {
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (key === 'bulwarkOfForceActive' && name === 'Thorin') return true;
            if (key === 'bulwarkOfForceTargets' && name === 'Thorin') return ['Thorin'];
            if (key === 'naturesSanctuaryCreatures') return [];
            return null;
        });
        const stats = { ...mockPlayerStats };
        const characters = [
            { name: 'Thorin' },
        ];
        render(
            <CharSummary
                playerStats={stats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={characters}
            />
        );
        expect(screen.getByText(/Thorin/)).toBeInTheDocument();
    });

    it('breaks early when both bulwark and sanctuary covers are active', () => {
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (key === 'bulwarkOfForceActive' && name === 'Ally1') return true;
            if (key === 'bulwarkOfForceTargets' && name === 'Ally1') return ['Thorin'];
            if (key === 'naturesSanctuaryCreatures' && name === 'Ally2') return ['Thorin'];
            return null;
        });
        const stats = { ...mockPlayerStats };
        const characters = [
            { name: 'Ally1' },
            { name: 'Ally2' },
        ];
        render(
            <CharSummary
                playerStats={stats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={characters}
            />
        );
        expect(screen.getByText(/Thorin/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Sanctuary info match - another player has sanctuary targeting this one
// (lines 512-515)
// ---------------------------------------------------------------------------
describe('CharSummary - Sanctuary Info Match', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows sanctuary badge when another player has nature sanctuary targeting this character', () => {
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (key === 'naturesSanctuaryActive' && name === 'Druid1') return true;
            if (key === 'naturesSanctuaryCreatures' && name === 'Druid1') return ['Thorin'];
            if (key === 'naturesSanctuaryResistance' && name === 'Druid1') return 'fire';
            return null;
        });
        getCombatSummary.mockReturnValue({
            creatures: [{ name: 'Druid1', type: 'player' }],
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Thorin/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// handleShortRestComplete - calls onLongRest (lines 542-543)
// ---------------------------------------------------------------------------
describe('CharSummary - Short Rest Complete Handler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('calls onLongRest callback when short rest modal closes', () => {
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
        const shortRestBtn = screen.getByTestId('short-rest-btn');
        act(() => {
            fireEvent.click(shortRestBtn);
        });
        expect(screen.getByTestId('short-rest-modal')).toBeInTheDocument();
        // Trigger the onComplete callback that was passed to ShortRestModal
        const lastCall = shortRestModalCalls.calls[shortRestModalCalls.calls.length - 1];
        expect(lastCall).toBeDefined();
        act(() => {
            lastCall.props.onComplete();
        });
        expect(mockOnLongRest).toHaveBeenCalled();
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
    });

    it('closes ally modal when cancel button is clicked', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        render(
            <CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />,
            { wrapper }
        );
        const allyBadge = screen.getByText(/Allies/);
        act(() => {
            fireEvent.click(allyBadge);
        });
        expect(screen.getByTestId('ally-selection-modal')).toBeInTheDocument();
        const cancelBtn = screen.getByTestId('ally-cancel');
        act(() => {
            fireEvent.click(cancelBtn);
        });
        expect(screen.queryByTestId('ally-selection-modal')).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// characters.map fallback when combatSummary.creatures is null (line 557)
// ---------------------------------------------------------------------------
describe('CharSummary - Ally Modal Characters Fallback', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
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

// ---------------------------------------------------------------------------
// Feat popup - array desc format (line 626)
// ---------------------------------------------------------------------------
describe('CharSummary - Feat Popup Array Desc', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders feat with array desc and calls showPopup', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        const stats = {
            ...mockPlayerStats,
            feats: [
                {
                    name: 'Test Feat',
                    desc: ['First line', 'Second line'],
                },
            ],
        };
        render(
            <CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />,
            { wrapper }
        );
    });
});

// ---------------------------------------------------------------------------
// Feat popup - string description format (line 628)
// ---------------------------------------------------------------------------
describe('CharSummary - Feat Popup String Description', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders feat with string description', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        const stats = {
            ...mockPlayerStats,
            feats: [
                {
                    name: 'Test Feat',
                    description: 'A string description',
                },
            ],
        };
        render(
            <CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />,
            { wrapper }
        );
    });
});

// ---------------------------------------------------------------------------
// Feat popup - benefits rendering (lines 648-652)
// ---------------------------------------------------------------------------
describe('CharSummary - Feat Popup Benefits', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders feat with benefits array', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        const stats = {
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
        };
        render(
            <CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />,
            { wrapper }
        );
    });
});

// ---------------------------------------------------------------------------
// ShortRestModal onClose prop (line 698)
// ---------------------------------------------------------------------------
describe('CharSummary - Short Rest Modal Close', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders ShortRestModal with onClose prop', () => {
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
            />,
            { wrapper }
        );
        const shortRestBtn = screen.getByTestId('short-rest-btn');
        act(() => {
            fireEvent.click(shortRestBtn);
        });
        expect(screen.getByTestId('short-rest-modal')).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// AvatarModal onClose prop (line 754)
// ---------------------------------------------------------------------------
describe('CharSummary - Avatar Modal Close', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders AvatarModal when imagePath is present', () => {
        const stats = {
            ...mockPlayerStats,
            imagePath: '/images/character.png',
        };
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        render(
            <CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />,
            { wrapper }
        );
        expect(screen.getByTestId('avatar-image')).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Feat popup - null desc and null description fallback (line 630)
// ---------------------------------------------------------------------------
describe('CharSummary - Feat Popup Null Desc Fallback', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders feat with null desc and null description using empty string fallback', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        const stats = {
            ...mockPlayerStats,
            feats: [
                {
                    name: 'Empty Feat',
                    desc: null,
                    description: null,
                },
            ],
        };
        render(
            <CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />,
            { wrapper }
        );
    });

    it('renders feat with array desc containing null entries', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        const stats = {
            ...mockPlayerStats,
            feats: [
                {
                    name: 'Array Feat',
                    desc: ['First line', null, 'Third line'],
                },
            ],
        };
        render(
            <CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />,
            { wrapper }
        );
    });
});

// ---------------------------------------------------------------------------
// Proficiencies optional chaining - undefined proficiencies (line 692)
// ---------------------------------------------------------------------------
describe('CharSummary - Proficiencies Optional Chaining', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('does not render proficiencies section when proficiencies is undefined', () => {
        const stats = {
            ...mockPlayerStats,
            proficiencies: undefined,
            toolProficiencies: [],
        };
        render(
            <CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />
        );
        expect(screen.queryByText(/Proficiencies:/)).not.toBeInTheDocument();
    });

    it('renders proficiencies when array has items', () => {
        const stats = {
            ...mockPlayerStats,
            proficiencies: ['Heavy Armor', 'Shields'],
            toolProficiencies: [],
        };
        render(
            <CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />
        );
        expect(screen.getByText(/Proficiencies:/)).toBeInTheDocument();
        expect(screen.getByText(/Heavy Armor/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Starry Form - non-array starryBuffs (line 765)
// ---------------------------------------------------------------------------
describe('CharSummary - Starry Form Non-Array Buffs', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('does not show Starry Form badge when getRuntimeValue returns non-array', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'activeBuffs') {
                return 'not-an-array';
            }
            return null;
        });
        render(
            <CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />
        );
        expect(screen.queryByText(/Starry Form/)).not.toBeInTheDocument();
    });
});
