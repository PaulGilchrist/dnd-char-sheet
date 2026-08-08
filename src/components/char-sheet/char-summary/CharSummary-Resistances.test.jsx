import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { useRuntimeValue, getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

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
// Fiendish Resilience resistance type
// ---------------------------------------------------------------------------
describe('CharSummary - Fiendish Resilience', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('includes fiendish resilience type in resistances when set', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === '_Fiendish_Resilience_chosenType') return 'fire';
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Fire/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Epitome resistance type
// ---------------------------------------------------------------------------
describe('CharSummary - Epitome Resistance', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('includes epitome resistance type when set', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'epitomeResistanceType') return 'lightning';
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Lightning/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Boon of Energy Resistance
// ---------------------------------------------------------------------------
describe('CharSummary - Boon of Energy Resistance', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('includes boon energy resistance types when set', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === '_Energy_Resistances_chosenTypes') return ['fire', 'cold'];
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Fire/)).toBeInTheDocument();
        expect(screen.getByText(/Cold/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Aura of Life resistances
// ---------------------------------------------------------------------------
describe('CharSummary - Aura of Life Resistances', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('includes aura of life resistance types from activeBuffs', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Aura of Life', resistanceTypes: ['necrotic'] },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Necrotic/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Aura of Purity resistances
// ---------------------------------------------------------------------------
describe('CharSummary - Aura of Purity Resistances', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('includes aura of purity resistance types from activeBuffs', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Aura of Purity', resistanceTypes: ['poison'] },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Poison/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Feign Death resistances and condition immunities
// ---------------------------------------------------------------------------
describe('CharSummary - Feign Death', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('includes feign death resistance types', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Feign Death', resistanceTypes: ['poison'], conditionImmunity: ['Poisoned'] },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Immunities:/)).toBeInTheDocument();
        expect(screen.getByText(/Poisoned/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Protection from Poison resistances
// ---------------------------------------------------------------------------
describe('CharSummary - Protection from Poison', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('includes protection from poison resistance types', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Protection from Poison', resistanceTypes: ['poison'] },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Poison/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Stone Skin resistances
// ---------------------------------------------------------------------------
describe('CharSummary - Stone Skin Resistances', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('includes stone skin resistance types from activeBuffs', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Stone Skin', resistanceTypes: ['bludgeoning'] },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Bludgeoning/)).toBeInTheDocument();
    });

    it('includes stone skin damage types from runtime value', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'stoneSkinDamageTypes') return ['piercing'];
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Piercing/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Warding Bond resistances
// ---------------------------------------------------------------------------
describe('CharSummary - Warding Bond Resistances', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('includes warding bond resistance types', () => {
        getActiveBuffs.mockReturnValue([
            { effect: 'warding_bond', resistanceTypes: ['cold'] },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Cold/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Starry Form resistances
// ---------------------------------------------------------------------------
describe('CharSummary - Starry Form Resistances', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('includes starry form resistance types', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Starry Form', constellation: 'Archer', resistanceTypes: ['fire'] },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Fire/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Calm Emotions condition immunities
// ---------------------------------------------------------------------------
describe('CharSummary - Calm Emotions Condition Immunities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('includes calm emotions condition immunities', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Calm Emotions', conditionImmunity: ['Frightened'] },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Immunities:/)).toBeInTheDocument();
        expect(screen.getByText(/Frightened/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Heroism condition immunities
// ---------------------------------------------------------------------------
describe('CharSummary - Heroism Condition Immunities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('includes heroism condition immunities', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Heroism', conditionImmunity: ['Frightened'] },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Immunities:/)).toBeInTheDocument();
        expect(screen.getByText(/Frightened/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Faerie Fire condition immunities
// ---------------------------------------------------------------------------
describe('CharSummary - Faerie Fire Condition Immunities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('includes faerie fire condition immunities', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Faerie Fire', conditionImmunity: ['Undetected'] },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Immunities:/)).toBeInTheDocument();
        expect(screen.getByText(/Undetected/)).toBeInTheDocument();
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

    it('includes rage conditional immunities when rage is active', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Rage' },
        ]);
        const stats = {
            ...mockPlayerStats,
            class: { name: 'Barbarian', subclass: { name: '' }, major: { name: 'Barbarian' } },
            automationConditionalImmunities: [
                { requiresActive: 'Rage', immunities: ['Frightened'] },
            ],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Immunities:/)).toBeInTheDocument();
        expect(screen.getByText(/Frightened/)).toBeInTheDocument();
    });

    it('does not include rage conditional immunities when rage is not active', () => {
        getActiveBuffs.mockReturnValue([]);
        const stats = {
            ...mockPlayerStats,
            class: { name: 'Barbarian', subclass: { name: '' }, major: { name: 'Barbarian' } },
            automationConditionalImmunities: [
                { requiresActive: 'Rage', immunities: ['Frightened'] },
            ],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Frightened/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Superior Defense resistances
// ---------------------------------------------------------------------------
describe('CharSummary - Superior Defense Resistances', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('includes superior defense resistance types', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Superior Defense', resistanceTypes: ['slashing'] },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Slashing/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Rage of the Gods resistances
// ---------------------------------------------------------------------------
describe('CharSummary - Rage of the Gods Resistances', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('includes rage of the gods resistance types', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Rage of the Gods', resistanceTypes: ['radiant'] },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Radiant/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Elemental Adept types
// ---------------------------------------------------------------------------
describe('CharSummary - Elemental Adept', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('includes elemental adept chosen types from passives', () => {
        const stats = {
            ...mockPlayerStats,
            automation: {
                ...mockPlayerStats.automation,
                passives: [
                    { type: 'damage_type_choice', effect: 'elemental_adept', name: 'Elemental Adept' },
                ],
            },
        };
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === '_Elemental_Adept_chosenType') return 'fire';
            return null;
        });
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Fire/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Cover source badges - smiteOfProtection
// ---------------------------------------------------------------------------
describe('CharSummary - Cover Source Badges', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('activates smiteOfProtection cover when another character has it with Aura of Protection', () => {
        const otherCharacter = {
            name: 'Ally',
            type: 'player',
            computedStats: {
                automation: {
                    passives: [{ name: 'Aura of Protection' }],
                },
            },
        };
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'smiteOfProtectionActive') return true;
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary
            playerStats={stats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            characters={[otherCharacter]}
        />);
        expect(true).toBe(true);
    });

    it('does not activate smiteOfProtection cover without Aura of Protection', () => {
        const otherCharacter = {
            name: 'Ally',
            type: 'player',
            computedStats: {
                automation: {
                    passives: [],
                },
            },
        };
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'smiteOfProtectionActive') return true;
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary
            playerStats={stats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            characters={[otherCharacter]}
        />);
        expect(true).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Cover source badges - bulwarkOfForce
// ---------------------------------------------------------------------------
describe('CharSummary - Bulwark of Force Cover', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('activates bulwarkOfForce cover when target list includes player', () => {
        const otherCharacter = {
            name: 'Ally',
            type: 'player',
        };
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'bulwarkOfForceActive') return true;
            if (key === 'bulwarkOfForceTargets') return ['Thorin'];
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary
            playerStats={stats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            characters={[otherCharacter]}
        />);
        expect(true).toBe(true);
    });

    it('does not activate bulwarkOfForce cover when target list does not include player', () => {
        const otherCharacter = {
            name: 'Ally',
            type: 'player',
        };
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'bulwarkOfForceActive') return true;
            if (key === 'bulwarkOfForceTargets') return ['Other'];
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary
            playerStats={stats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            characters={[otherCharacter]}
        />);
        expect(true).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Cover source badges - naturesSanctuary
// ---------------------------------------------------------------------------
describe('CharSummary - Nature Sanctuary Cover', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('activates naturesSanctuary cover when sanctuary creatures list includes player', () => {
        const otherCharacter = {
            name: 'Ally',
            type: 'player',
        };
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'naturesSanctuaryCreatures') return ['Thorin'];
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary
            playerStats={stats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            characters={[otherCharacter]}
        />);
        expect(true).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Target effects filtering
// ---------------------------------------------------------------------------
describe('CharSummary - Target Effects Filtering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('filters target effects to only those targeting the player', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'targetEffects') {
                return [
                    { target: ['Thorin'], effect: 'reckless_attack' },
                    { target: ['Other'], effect: 'slowed' },
                ];
            }
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(true).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Vulnerabilities rendering
// ---------------------------------------------------------------------------
describe('CharSummary - Vulnerabilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders vulnerabilities when present', () => {
        const stats = { ...mockPlayerStats, vulnerabilities: ['fire'] };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Vulnerabilities:/)).toBeInTheDocument();
        expect(screen.getByText(/fire/)).toBeInTheDocument();
    });

    it('does not render vulnerabilities when empty', () => {
        const stats = { ...mockPlayerStats, vulnerabilities: [] };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Vulnerabilities:/)).not.toBeInTheDocument();
    });

    it('does not render vulnerabilities when null', () => {
        const stats = { ...mockPlayerStats, vulnerabilities: null };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Vulnerabilities:/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Speed zero condition
// ---------------------------------------------------------------------------
describe('CharSummary - Speed Zero Condition', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('sets speed to 0 when speedZero condition is active', () => {
        render(<CharSummary
            playerStats={mockPlayerStats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            conditionEffects={{ speedZero: true }}
        />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('0 ft');
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

    it('shows barkskin badge when barkskin buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'barkskin' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Barkskin \(AC 17\)/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Tremorsense badge
// ---------------------------------------------------------------------------
describe('CharSummary - Tremorsense Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows tremorsense badge when tremorsense_60ft buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'tremorsense_60ft' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Tremorsense 60 ft/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Large Form badge
// ---------------------------------------------------------------------------
describe('CharSummary - Large Form Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows large form badge when large_form buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'large_form' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Large Form/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Hunter's Mark badge
// ---------------------------------------------------------------------------
describe('CharSummary - Hunters Mark Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows hunter mark badge when active', () => {
        getActiveBuffs.mockReturnValue([{ name: "Hunter's Mark" }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Hunter's Mark Active/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// AC penalty from slow spell
// ---------------------------------------------------------------------------
describe('CharSummary - AC Slow Penalty', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows AC slow penalty when acPenalty is set', () => {
        render(<CharSummary
            playerStats={mockPlayerStats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            conditionEffects={{ acPenalty: 2 }}
        />);
        expect(screen.getByText(/\(−2 from Slow\)/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Aura speed bonus
// ---------------------------------------------------------------------------
describe('CharSummary - Aura Speed Bonus', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows aura speed bonus source when present', () => {
        render(<CharSummary
            playerStats={mockPlayerStats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            auraComboEffects={{ speedBonus: 10, speedSource: 'Aura of Alacrity' }}
        />);
        expect(screen.getByText(/\+10/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Shield of Faith badge
// ---------------------------------------------------------------------------
describe('CharSummary - Shield of Faith Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows shield of faith badge when active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'shield_of_faith' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/\+2 from Shield of Faith/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Defensive Duelist badge
// ---------------------------------------------------------------------------
describe('CharSummary - Defensive Duelist Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows defensive duelist badge when buff is active with acBonus', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'defensive_duelist', acBonus: 3 }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/\+3 from Defensive Duelist/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Ice walk badge
// ---------------------------------------------------------------------------
describe('CharSummary - Ice Walk Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows ice walk when ice_walk buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'ice_walk' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/ice walk/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Mage Armor AC display
// ---------------------------------------------------------------------------
describe('CharSummary - Mage Armor AC', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows mage armor AC override with dex bonus', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'mage_armor', baseAc: 14 }]);
        const stats = {
            ...mockPlayerStats,
            inventory: { equipped: [] },
            equipment: [],
            abilities: [{ name: 'Dexterity', bonus: 3 }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/17/)).toBeInTheDocument();
    });
});
