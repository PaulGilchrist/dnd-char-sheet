import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { DiceRollContext } from '../../../hooks/combat/DiceRollContext.js';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';

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

describe('CharSummary - Shield of Faith AC Bonus', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('adds shield of faith AC bonus when buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'shield_of_faith' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/\+2 from Shield of Faith/)).toBeInTheDocument();
    });
});

describe('CharSummary - Inspiration Toggle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('renders inspiration checkbox', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeInTheDocument();
        expect(checkbox).not.toBeChecked();
    });
});

describe('CharSummary - XP Save NaN Path', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('does not save XP when delta is NaN after parseInt', () => {
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
        const levelSuffix = screen.getByText(/milestone/);
        fireEvent.click(levelSuffix);
        const input = screen.getByPlaceholderText('+100 or -50');
        fireEvent.change(input, { target: { value: 'abc' } });
        const applyBtn = screen.getByText('Apply');
        fireEvent.click(applyBtn);
        expect(setRuntimeValue).not.toHaveBeenCalled();
    });

    it('does not save XP when delta is empty string', () => {
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
        const levelSuffix = screen.getByText(/milestone/);
        fireEvent.click(levelSuffix);
        const applyBtn = screen.getByText('Apply');
        fireEvent.click(applyBtn);
        expect(setRuntimeValue).not.toHaveBeenCalled();
    });
});

describe('CharSummary - XP Modal Cancel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('closes XP modal when cancel is clicked', () => {
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
        const levelSuffix = screen.getByText(/milestone/);
        fireEvent.click(levelSuffix);
        const cancelBtn = screen.getByText('Cancel');
        fireEvent.click(cancelBtn);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});

describe('CharSummary - XP Modal Overlay Close', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('closes XP modal when overlay is clicked', () => {
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
        const levelSuffix = screen.getByText(/milestone/);
        fireEvent.click(levelSuffix);
        const overlay = screen.getByText('Experience Points').closest('.xp-modal-overlay');
        fireEvent.click(overlay);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});

describe('CharSummary - Race Type False Branch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('does not show race type when race.type is falsy (line 602 false branch)', () => {
        const stats = {
            ...mockPlayerStats,
            race: { name: 'Human', type: null, subrace: null },
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const summaryText = screen.getByTestId('char-summary-text');
        expect(summaryText.textContent).toContain('Human');
        expect(summaryText.textContent).not.toMatch(/Human \(/);
    });

    it('does not show race type when race.type is empty string', () => {
        const stats = {
            ...mockPlayerStats,
            race: { name: 'Elf', type: '', subrace: null },
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const summaryText = screen.getByTestId('char-summary-text');
        expect(summaryText.textContent).toContain('Elf');
        expect(summaryText.textContent).not.toMatch(/Elf \(/);
    });
});

describe('CharSummary - AC Default Path No Overrides', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows base armorClass when no circle forms override, barkskin, or mage armor (line 611 ?? false path)', () => {
        const stats = {
            ...mockPlayerStats,
            class: { name: 'Cleric', subclass: { name: 'War', type: 'Choice' }, major: { name: 'Cleric' } },
            armorClass: 18,
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Armor Class:/)).toBeInTheDocument();
        const acText = screen.getByText(/18/);
        expect(acText.closest('.clickable')).toBeInTheDocument();
    });
});
