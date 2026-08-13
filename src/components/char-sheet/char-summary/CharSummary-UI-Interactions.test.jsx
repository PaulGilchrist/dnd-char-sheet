import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { DiceRollContext } from '../../../hooks/combat/DiceRollContext.js';
import { showBackgroundPopup } from '../../../hooks/combat/useActionPopup.js';

vi.mock('./CharGold.jsx', () => ({ default: () => <div data-testid="char-gold">Gold</div> }));
vi.mock('./CharHitPoints.jsx', () => ({ default: () => <div data-testid="char-hp">HP</div> }));
vi.mock('./CharClassFeatures.jsx', () => ({ default: () => <div data-testid="char-class-features">Class Features</div> }));
vi.mock('../char-feats/CharFeats.jsx', () => ({ default: () => <div data-testid="char-feats">Feats</div> }));
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

vi.mock('../../../services/ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
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

describe('CharSummary - Avatar Modal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('shows avatar modal when avatar image is clicked and imagePath exists', () => {
        const stats = {
            ...mockPlayerStats,
            imagePath: '/images/thorin.png',
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const avatar = screen.getByTestId('avatar-image');
        fireEvent.click(avatar);
        expect(avatar).toBeInTheDocument();
    });
});

describe('CharSummary - AvatarImage Click', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('shows avatar modal when avatar image is clicked', () => {
        const stats = {
            ...mockPlayerStats,
            imagePath: '/images/thorin.png',
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const avatar = screen.getByTestId('avatar-image');
        fireEvent.click(avatar);
    });
});

describe('CharSummary - Short Rest Modal Trigger', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('renders short rest modal when short rest button is clicked', async () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const shortRestBtn = screen.getByTestId('short-rest-btn');
        fireEvent.click(shortRestBtn);
        expect(screen.getByTestId('short-rest-btn')).toBeInTheDocument();
    });
});

describe('CharSummary - Background Popup', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('shows background popup when background is clicked', () => {
        const stats = {
            ...mockPlayerStats,
            background: 'Soldier',
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const bgEl = screen.getByText('Soldier');
        fireEvent.click(bgEl);
        expect(showBackgroundPopup).toHaveBeenCalledWith('Soldier', expect.any(Function), '5e');
    });
});

describe('CharSummary - Feat Popup Array Desc', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('renders feat popup with array desc format', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        const stats = {
            ...mockPlayerStats,
            feats: [{ name: 'Tough', desc: ['Extra hit points', 'More durability'] }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />, { wrapper });
        const featsEl = screen.getByTestId('char-feats');
        expect(featsEl).toBeInTheDocument();
    });
});

describe('CharSummary - Feat Popup String Desc', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('renders feat popup with string description format', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        const stats = {
            ...mockPlayerStats,
            feats: [{ name: 'Tough', description: 'Extra hit points' }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />, { wrapper });
        const featsEl = screen.getByTestId('char-feats');
        expect(featsEl).toBeInTheDocument();
    });
});

describe('CharSummary - Feat Popup Prerequisites', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('renders feat popup with prerequisites', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        const stats = {
            ...mockPlayerStats,
            feats: [{
                name: 'Heavy Armor',
                desc: 'Can wear heavy armor',
                prerequisites: {
                    level: 1,
                    ability_scores: [{ name: 'STR', minimum: 16 }],
                    proficiency: 'Heavy Armor',
                },
            }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />, { wrapper });
        const featsEl = screen.getByTestId('char-feats');
        expect(featsEl).toBeInTheDocument();
    });
});

describe('CharSummary - Feat Popup Benefits', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('renders feat popup with benefits', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        const stats = {
            ...mockPlayerStats,
            feats: [{
                name: 'Tough',
                desc: 'Extra hit points',
                benefits: [{ description: '+2 HP per level' }],
            }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />, { wrapper });
        const featsEl = screen.getByTestId('char-feats');
        expect(featsEl).toBeInTheDocument();
    });
});
