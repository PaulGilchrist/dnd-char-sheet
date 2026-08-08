import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { DiceRollContext } from '../../../hooks/combat/DiceRollContext.js';
import * as combatData from '../../../services/encounters/combatData.js';
import { addEntry } from '../../../services/ui/logService.js';
import useLoggedDiceRoll from '../../../hooks/combat/useLoggedDiceRoll.js';
import useTrackedResource from '../../../hooks/runtime/useTrackedResource.js';
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

// ---------------------------------------------------------------------------
// Inspiration toggle handler (lines 97-100)
// ---------------------------------------------------------------------------
describe('CharSummary - Inspiration Toggle Handler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
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
// XP save NaN path (lines 113-115)
// ---------------------------------------------------------------------------
describe('CharSummary - XP Save NaN Path', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('closes modal when xpDelta parses to NaN', () => {
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
        Object.defineProperty(input, 'value', { value: 'abc', writable: true });
        fireEvent.change(input);
        const applyBtn = screen.getByText('Apply');
        fireEvent.click(applyBtn);
        expect(screen.queryByText('Experience Points')).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Initiative handler with advantage (line 547)
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
});

// ---------------------------------------------------------------------------
// Ally modal confirm error handler (line 571)
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
// Majesty badge (line 778)
// ---------------------------------------------------------------------------
describe('CharSummary - Majesty Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
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
});

// ---------------------------------------------------------------------------
// Concentration badge (line 790)
// ---------------------------------------------------------------------------
describe('CharSummary - Concentration Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
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
});

// ---------------------------------------------------------------------------
// Hunter's Mark and Death Ward badges (lines 796-799)
// ---------------------------------------------------------------------------
describe('CharSummary - Hunters Mark And Death Ward Badges', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
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
});

// ---------------------------------------------------------------------------
// Wild Shape badge (line 760)
// ---------------------------------------------------------------------------
describe('CharSummary - Wild Shape Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
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
});

// ---------------------------------------------------------------------------
// Aura of Life and Circle of Power badges (lines 772-777)
// ---------------------------------------------------------------------------
describe('CharSummary - Aura Of Life And Circle Of Power Badges', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
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
});

// ---------------------------------------------------------------------------
// Barkskin badge (line 379, 793)
// ---------------------------------------------------------------------------
describe('CharSummary - Barkskin Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
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
});

// ---------------------------------------------------------------------------
// Defensive Duelist AC bonus (line 380)
// ---------------------------------------------------------------------------
describe('CharSummary - Defensive Duelist AC Bonus', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows defensive duelist AC bonus when buff is active with acBonus', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'defensive_duelist', acBonus: 3 }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/\+3 from Defensive Duelist/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Shield of Faith AC bonus (line 407-410)
// ---------------------------------------------------------------------------
describe('CharSummary - Shield of Faith AC Bonus', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows shield of faith AC bonus when buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'shield_of_faith' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/\+2 from Shield of Faith/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Rage conditional immunities (lines 312-316)
// ---------------------------------------------------------------------------
describe('CharSummary - Rage Conditional Immunities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
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
// Feign Death condition immunities (lines 323-326)
// ---------------------------------------------------------------------------
describe('CharSummary - Feign Death Condition Immunities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
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
});

// ---------------------------------------------------------------------------
// Mage Armor with baseAc (lines 374-377)
// ---------------------------------------------------------------------------
describe('CharSummary - Mage Armor With BaseAc', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows mage armor AC with custom baseAc', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'mage_armor', baseAc: 15 }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/\(15 \+ \d+ Dex\)/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Swim speed from playerStats.swimSpeed (lines 397-399)
// ---------------------------------------------------------------------------
describe('CharSummary - Swim Speed From PlayerStats', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('uses playerStats.swimSpeed when no aquatic_adaptation buff', () => {
        const stats = {
            ...mockPlayerStats,
            swimSpeed: 30,
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/swim 30 ft/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Dexterity ability bonus for AC (line 400)
// ---------------------------------------------------------------------------
describe('CharSummary - Dexterity Ability Bonus', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('uses dexterity bonus from abilities array in mage armor calculation', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'mage_armor', baseAc: 13 }]);
        const stats = {
            ...mockPlayerStats,
            abilities: [{ name: 'Dexterity', bonus: 4 }, { name: 'Wisdom', bonus: 3 }],
            inventory: { equipped: [] },
            equipment: [],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/\(13 \+ 4 Dex\)/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Smite of Protection cover with Aura of Protection (lines 419-428)
// ---------------------------------------------------------------------------
describe('CharSummary - Smite Of Protection Cover', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
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
// Bulwark of Force cover (lines 430-451)
// ---------------------------------------------------------------------------
describe('CharSummary - Bulwark Of Force Cover', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
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
});

// ---------------------------------------------------------------------------
// AC bonus from multiple sources combined (lines 377-416)
// ---------------------------------------------------------------------------
describe('CharSummary - Combined AC Bonuses', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows all AC bonuses when multiple buffs are active', () => {
        getActiveBuffs.mockReturnValue([
            { effect: 'mage_armor', baseAc: 14 },
            { effect: 'shield' },
            { effect: 'shield_of_faith' },
            { effect: 'defensive_duelist', acBonus: 2 },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/\+5 from Shield/)).toBeInTheDocument();
        expect(screen.getByText(/\+2 from Shield of Faith/)).toBeInTheDocument();
        expect(screen.getByText(/\+2 from Defensive Duelist/)).toBeInTheDocument();
    });
});
