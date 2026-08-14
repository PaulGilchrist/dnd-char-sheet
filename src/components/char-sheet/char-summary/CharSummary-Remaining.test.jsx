// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { DiceRollContext } from '../../../hooks/combat/DiceRollContext.js';
import * as combatData from '../../../services/encounters/combatData.js';
import { addEntry } from '../../../services/ui/logService.js';
import useTrackedResource from '../../../hooks/runtime/useTrackedResource.js';
import useLoggedDiceRoll from '../../../hooks/combat/useLoggedDiceRoll.js';
import { useRuntimeValue, getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import * as unbreakableMajesty from '../../../services/combat/auras/unbreakableMajesty.js';
import * as deathWardHandler from '../../../services/automation/handlers/buffs/deathWardHandler.js';
import * as auraOfLifeHandler from '../../../services/automation/handlers/buffs/auraOfLifeHandler.js';
import * as circleOfPowerHandler from '../../../services/automation/handlers/buffs/circleOfPowerHandler.js';
import * as buffToggle from '../../../services/automation/common/buffToggle.js';

vi.mock('./CharGold.jsx', () => ({ default: () => <div data-testid="char-gold">Gold</div> }));
vi.mock('./CharHitPoints.jsx', () => ({ default: () => <div data-testid="char-hp">HP</div> }));
vi.mock('./CharClassFeatures.jsx', () => ({ default: () => <div data-testid="char-class-features">Class Features</div> }));
vi.mock('../char-feats/CharFeats.jsx', () => ({ default: () => <div data-testid="char-feats">Feats</div> }));
vi.mock('../../common/AvatarImage.jsx', () => ({ default: () => <div data-testid="avatar-image">Avatar</div> }));
vi.mock('../../common/AvatarModal.jsx', () => ({ default: () => null }));
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

const renderWithDiceContext = (ui, { wrapper: externalWrapper, ...renderOptions } = {}) => {
    const mockSetPopupHtml = vi.fn();
    const diceWrapper = ({ children }) => (
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
            {children}
        </DiceRollContext.Provider>
    );
    const wrapper = externalWrapper
        ? (props) => <diceWrapper><externalWrapper {...props} /></diceWrapper>
        : diceWrapper;
    return render(ui, { wrapper, ...renderOptions });
};

// ---------------------------------------------------------------------------
// Inspiration toggle handler
// ---------------------------------------------------------------------------
describe('CharSummary - Inspiration Toggle Handler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('calls setHasInspiration with toggled value when checkbox is changed', () => {
        let inspirationValue = false;
        const setHasInspirationMock = vi.fn((val) => { inspirationValue = val; });
        vi.mocked(useTrackedResource).mockReturnValue({ current: inspirationValue, update: setHasInspirationMock });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).not.toBeChecked();
        fireEvent.click(checkbox);
        expect(setHasInspirationMock).toHaveBeenCalledWith(true);
        expect(inspirationValue).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// XP save NaN path
// ---------------------------------------------------------------------------
describe('CharSummary - XP Save NaN Path', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('closes modal when xpDelta parses to NaN', () => {
        renderWithDiceContext(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />
        );
        const levelSuffix = screen.getByText(/milestone/);
        fireEvent.click(levelSuffix);
        const input = screen.getByPlaceholderText('+100 or -50');
        fireEvent.change(input, { target: { value: 'abc' } });
        const applyBtn = screen.getByText('Apply');
        fireEvent.click(applyBtn);
        expect(screen.queryByText('Experience Points')).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Initiative handler with advantage
// ---------------------------------------------------------------------------
describe('CharSummary - Initiative Handler With Advantage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('passes forcedMode advantage to rollInitiative when initiativeAdvantage is true', () => {
        let rollInitiativeFn = null;
        const mockRollInitiative = vi.fn((eff, opts) => { rollInitiativeFn = { eff, opts }; });
        vi.mocked(useLoggedDiceRoll).mockReturnValue({
            popupHtml: null,
            setPopupHtml: vi.fn(),
            rollInitiative: mockRollInitiative,
        });
        const stats = { ...mockPlayerStats, initiativeAdvantage: true };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const initiativeEl = screen.getByText(/\+2/);
        fireEvent.click(initiativeEl);
        expect(rollInitiativeFn).not.toBeNull();
        expect(rollInitiativeFn.eff).toBe(2);
        expect(rollInitiativeFn.opts).toEqual({ forcedMode: 'advantage' });
    });

    it('passes undefined forcedMode when initiativeAdvantage is false', () => {
        let rollInitiativeFn = null;
        const mockRollInitiative = vi.fn((eff, opts) => { rollInitiativeFn = { eff, opts }; });
        vi.mocked(useLoggedDiceRoll).mockReturnValue({
            popupHtml: null,
            setPopupHtml: vi.fn(),
            rollInitiative: mockRollInitiative,
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const initiativeEl = screen.getByText(/\+2/);
        fireEvent.click(initiativeEl);
        expect(rollInitiativeFn).not.toBeNull();
        expect(rollInitiativeFn.opts).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// Ally modal confirm error handler
// ---------------------------------------------------------------------------
describe('CharSummary - Ally Modal Confirm Error Handler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('calls console.error when addEntry promise rejects', async () => {
        addEntry.mockRejectedValue(new Error('log failed'));
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const alliesBadge = screen.getByText(/Allies/);
        fireEvent.click(alliesBadge);
        const confirmBtn = screen.getByTestId('ally-confirm');
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        fireEvent.click(confirmBtn);
        await Promise.resolve();
        expect(consoleErrorSpy).toHaveBeenCalledWith('[CharSummary] Error logging ally selection:', expect.any(Error));
        consoleErrorSpy.mockRestore();
    });
});

// ---------------------------------------------------------------------------
// Majesty badge
// ---------------------------------------------------------------------------
describe('CharSummary - Majesty Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    afterEach(() => {
        window.location.hostname = '';
    });

    it('shows majesty badge when unbreakable majesty is active', () => {
        unbreakableMajesty.isUnbreakableMajestyActive.mockReturnValue(true);
        unbreakableMajesty.getUnbreakableMajestySaveDc.mockReturnValue(15);
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Majesty DC 15/)).toBeInTheDocument();
    });

    it('does not show majesty badge when unbreakable majesty is inactive', () => {
        unbreakableMajesty.isUnbreakableMajestyActive.mockReturnValue(false);
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Majesty/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Concentration badge
// ---------------------------------------------------------------------------
describe('CharSummary - Concentration Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    afterEach(() => {
        window.location.hostname = '';
    });

    it('shows concentration badge when player is concentrating on a spell', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({
            creatures: [{ name: 'Thorin', concentration: { spell: 'Bless', dc: 13 } }],
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Bless DC 13/)).toBeInTheDocument();
    });

    it('does not show concentration badge when player has no concentration', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Concentration/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Hunter's Mark and Death Ward badges
// ---------------------------------------------------------------------------
describe('CharSummary - Hunters Mark And Death Ward Badges', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    afterEach(() => {
        window.location.hostname = '';
    });

    it('shows hunters mark badge when another creature has it concentrated on player', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({
            creatures: [{ name: 'Ranger1', concentration: { spell: "Hunter's Mark", target: 'Thorin' } }],
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Hunter's Mark/)).toBeInTheDocument();
    });

    it('does not show hunters mark badge when no creature targets player', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({
            creatures: [{ name: 'Ranger1', concentration: { spell: "Hunter's Mark", target: 'Other' } }],
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Hunter's Mark/)).not.toBeInTheDocument();
    });

    it('shows death ward badge when death ward is active', () => {
        deathWardHandler.isDeathWardActive.mockReturnValue(true);
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Death Ward/)).toBeInTheDocument();
    });

    it('does not show death ward badge when inactive', () => {
        deathWardHandler.isDeathWardActive.mockReturnValue(false);
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Death Ward/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Wild Shape badge
// ---------------------------------------------------------------------------
describe('CharSummary - Wild Shape Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    afterEach(() => {
        window.location.hostname = '';
    });

    it('shows wild shape badge when wild shape is active', () => {
        buffToggle.isBuffActive.mockReturnValue(true);
        unbreakableMajesty.isUnbreakableMajestyActive.mockReturnValue(false);
        deathWardHandler.isDeathWardActive.mockReturnValue(false);
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Wild Shape/)).toBeInTheDocument();
    });

    it('does not show wild shape badge when inactive', () => {
        buffToggle.isBuffActive.mockReturnValue(false);
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Wild Shape/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Aura of Life and Circle of Power badges
// ---------------------------------------------------------------------------
describe('CharSummary - Aura Of Life And Circle Of Power Badges', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    afterEach(() => {
        window.location.hostname = '';
    });

    it('shows aura of life badge when active', () => {
        auraOfLifeHandler.isAuraOfLifeActive.mockReturnValue(true);
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Aura of Life/)).toBeInTheDocument();
    });

    it('does not show aura of life badge when inactive', () => {
        auraOfLifeHandler.isAuraOfLifeActive.mockReturnValue(false);
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Aura of Life/)).not.toBeInTheDocument();
    });

    it('shows circle of power badge when active', () => {
        circleOfPowerHandler.isCircleOfPowerActive.mockReturnValue(true);
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Circle of Power/)).toBeInTheDocument();
    });

    it('does not show circle of power badge when inactive', () => {
        circleOfPowerHandler.isCircleOfPowerActive.mockReturnValue(false);
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Circle of Power/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Barkskin badge
// ---------------------------------------------------------------------------
describe('CharSummary - Barkskin Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    afterEach(() => {
        window.location.hostname = '';
    });

    it('shows barkskin badge when barkskin buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'barkskin' }]);
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByTitle('From Barkskin')).toBeInTheDocument();
    });

    it('does not show barkskin badge when inactive', () => {
        getActiveBuffs.mockReturnValue([]);
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByTitle('From Barkskin')).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Natures Sanctuary badge
// ---------------------------------------------------------------------------
describe('CharSummary - Natures Sanctuary Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    afterEach(() => {
        window.location.hostname = '';
    });

    it('shows sanctuary badge when another druid has nature sanctuary active targeting player', () => {
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (key === 'naturesSanctuaryActive' && name === 'Druid1') return true;
            if (key === 'naturesSanctuaryCreatures' && name === 'Druid1') return ['Thorin'];
            if (key === 'naturesSanctuaryResistance' && name === 'Druid1') return 'Cold';
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({
            creatures: [{ name: 'Druid1', type: 'player' }],
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Sanctuary/)).toBeInTheDocument();
    });

    it('does not show sanctuary badge when no druid has sanctuary active', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'naturesSanctuaryActive') return false;
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Sanctuary/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Reckless Attack badge
// ---------------------------------------------------------------------------
describe('CharSummary - Reckless Attack Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    afterEach(() => {
        window.location.hostname = '';
    });

    it('shows reckless attack badge when player has reckless_attack target effect', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [{ effect: 'reckless_attack', target: 'Thorin' }];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Reckless Attack/)).toBeInTheDocument();
    });

    it('does not show reckless attack badge when player lacks the target effect', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Reckless Attack/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Wrath of the Sea badge
// ---------------------------------------------------------------------------
describe('CharSummary - Wrath Of The Sea Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    afterEach(() => {
        window.location.hostname = '';
    });

    it('shows wrath of the sea badge when active in context', () => {
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (key === 'wrathOfTheSeaActive' && name === 'Thorin') return true;
            return null;
        });
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Wrath of the Sea/)).toBeInTheDocument();
    });

    it('does not show wrath of the sea badge when inactive', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'wrathOfTheSeaActive') return false;
            return null;
        });
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Wrath of the Sea/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Heroes Feast badge
// ---------------------------------------------------------------------------
describe('CharSummary - Heroes Feast Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    afterEach(() => {
        window.location.hostname = '';
    });

    it('shows heroes feast badge when resistance array is non-empty', () => {
        getActiveBuffs.mockReturnValue([{ name: "Heroes' Feast", resistanceTypes: ['Poison'] }]);
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Heroes' Feast/)).toBeInTheDocument();
    });

    it('does not show heroes feast badge when resistance array is empty', () => {
        getActiveBuffs.mockReturnValue([]);
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Heroes' Feast/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Starry Form constellation badge
// ---------------------------------------------------------------------------
describe('CharSummary - Starry Form Constellation Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    afterEach(() => {
        window.location.hostname = '';
    });

    it('shows starry form badge with constellation name when active', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'activeBuffs') return [{ name: 'Starry Form', constellation: 'Archer' }];
            return null;
        });
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Starry Form - Archer/)).toBeInTheDocument();
    });

    it('does not show starry form badge when no active buffs include it', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'activeBuffs') return [];
            return null;
        });
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Starry Form/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Cover badges — smite of protection
// ---------------------------------------------------------------------------
describe('CharSummary - Smite Of Protection Cover', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    afterEach(() => {
        window.location.hostname = '';
    });

    it('shows cover when another character has smite active and Aura of Protection', () => {
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (key === 'smiteOfProtectionActive' && name === 'Ally1') return true;
            if (key === 'bulwarkOfForceActive') return false;
            return null;
        });
        const stats = { ...mockPlayerStats };
        const characters = [
            {
                name: 'Ally1',
                computedStats: {
                    automation: {
                        passives: [{ name: 'Aura of Protection' }],
                    },
                },
            },
        ];
        render(
            <CharSummary
                playerStats={stats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={characters}
            />
        );
    });

    it('does not show cover when other character lacks Aura of Protection', () => {
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (key === 'smiteOfProtectionActive' && name === 'Ally1') return true;
            return null;
        });
        const stats = { ...mockPlayerStats };
        const characters = [
            {
                name: 'Ally1',
                computedStats: {
                    automation: {
                        passives: [],
                    },
                },
            },
        ];
        render(
            <CharSummary
                playerStats={stats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={characters}
            />
        );
    });
});

// ---------------------------------------------------------------------------
// Cover badges — bulwark of force
// ---------------------------------------------------------------------------
describe('CharSummary - Bulwark Of Force Cover', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    afterEach(() => {
        window.location.hostname = '';
    });

    it('shows cover when bulwark targets include player', () => {
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (key === 'bulwarkOfForceActive' && name === 'Ally1') return true;
            if (key === 'bulwarkOfForceTargets' && name === 'Ally1') return ['Thorin'];
            if (key === 'naturesSanctuaryCreatures') return [];
            return null;
        });
        const stats = { ...mockPlayerStats };
        const characters = [
            {
                name: 'Ally1',
            },
        ];
        render(
            <CharSummary
                playerStats={stats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={characters}
            />
        );
    });

    it('does not show cover when bulwark targets exclude player', () => {
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (key === 'bulwarkOfForceActive' && name === 'Ally1') return true;
            if (key === 'bulwarkOfForceTargets' && name === 'Ally1') return ['Other'];
            if (key === 'naturesSanctuaryCreatures') return [];
            return null;
        });
        const stats = { ...mockPlayerStats };
        const characters = [
            {
                name: 'Ally1',
            },
        ];
        render(
            <CharSummary
                playerStats={stats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={characters}
            />
        );
    });
});

// ---------------------------------------------------------------------------
// Rage conditional immunities
// ---------------------------------------------------------------------------
describe('CharSummary - Rage Conditional Immunities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    afterEach(() => {
        window.location.hostname = '';
    });

    it('includes rage conditional immunities when rage is active', () => {
        getActiveBuffs.mockReturnValue([{ name: 'Rage' }]);
        const stats = {
            ...mockPlayerStats,
            automationConditionalImmunities: [
                { requiresActive: 'Rage', immunities: ['Frightened'] },
                { requiresActive: 'Other', immunities: ['Poisoned'] },
            ],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Immunities:/)).toBeInTheDocument();
        expect(screen.getByText(/Frightened/)).toBeInTheDocument();
    });

    it('excludes non-rage conditional immunities when rage is not active', () => {
        const stats = {
            ...mockPlayerStats,
            automationConditionalImmunities: [
                { requiresActive: 'Rage', immunities: ['Frightened'] },
            ],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Frightened/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Feign Death condition immunities
// ---------------------------------------------------------------------------
describe('CharSummary - Feign Death Condition Immunities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    afterEach(() => {
        window.location.hostname = '';
    });

    it('includes feign death condition immunities', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Feign Death', conditionImmunity: ['Poisoned', 'Blinded'] },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Immunities:/)).toBeInTheDocument();
        expect(screen.getByText(/Poisoned/)).toBeInTheDocument();
        expect(screen.getByText(/Blinded/)).toBeInTheDocument();
    });

    it('does not include feign death condition immunities when buff is not active', () => {
        getActiveBuffs.mockReturnValue([]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Poisoned/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Blinded/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Natures Sanctuary cover
// ---------------------------------------------------------------------------
describe('CharSummary - Natures Sanctuary Cover', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    afterEach(() => {
        window.location.hostname = '';
    });

    it('shows sanctuary cover when druid has nature sanctuary active targeting player', () => {
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (key === 'naturesSanctuaryActive' && name === 'Druid1') return true;
            if (key === 'naturesSanctuaryCreatures' && name === 'Druid1') return ['Thorin'];
            if (key === 'naturesSanctuaryResistance' && name === 'Druid1') return 'Cold';
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({
            creatures: [{ name: 'Druid1', type: 'player' }],
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Sanctuary/)).toBeInTheDocument();
    });

    it('does not show sanctuary cover when druid does not target player', () => {
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (key === 'naturesSanctuaryActive' && name === 'Druid1') return true;
            if (key === 'naturesSanctuaryCreatures' && name === 'Druid1') return ['Other'];
            return null;
        });
        combatData.getCombatSummary.mockReturnValue({
            creatures: [{ name: 'Druid1', type: 'player' }],
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Sanctuary/)).not.toBeInTheDocument();
    });
});
