import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { useRuntimeValue, getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { useSyncedState } from '../../../hooks/runtime/useSyncedState.js';

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

const mockGetRules = vi.fn(() => ({ classRules: { getUnarmoredMovementIncrease: vi.fn(() => 0) } }));
vi.mock('../../../services/rules/rulesFactory.js', () => ({
    default: {
        getRules: () => mockGetRules(),
    },
    getRules: () => mockGetRules(),
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
// Monk unarmored movement
// ---------------------------------------------------------------------------
describe('CharSummary - Monk Unarmored Movement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('adds monk unarmored movement when no armor or shield', () => {
        mockGetRules.mockReturnValue({ classRules: { getUnarmoredMovementIncrease: vi.fn(() => 10) } });
        const stats = {
            ...mockPlayerStats,
            class: { name: 'Monk', subclass: { name: 'Way of the Open Hand', type: 'Monk' }, major: { name: 'Monk' } },
            inventory: { equipped: [] },
            equipment: [],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('35 ft');
    });

    it('does not add monk unarmored movement when armor or shield equipped', () => {
        mockGetRules.mockReturnValue({ classRules: { getUnarmoredMovementIncrease: vi.fn(() => 10) } });
        const stats = {
            ...mockPlayerStats,
            class: { name: 'Monk', subclass: { name: 'Way of the Open Hand', type: 'Monk' }, major: { name: 'Monk' } },
            inventory: { equipped: ['Scale Mail'] },
            equipment: [{ name: 'Scale Mail', equipment_category: 'Armor' }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('25 ft');
    });
});

// ---------------------------------------------------------------------------
// Additional resistance calculations
// ---------------------------------------------------------------------------
describe('CharSummary - Additional Resistance Calculations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('adds stormborn resistances when wrathOfTheSeaActive is true', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'wrathOfTheSeaActive') return true;
            return null;
        });
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

    it('adds rage resistance types from active rage buffs', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Rage', resistanceTypes: ['fire', 'cold'] },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Fire/)).toBeInTheDocument();
        expect(screen.getByText(/Cold/)).toBeInTheDocument();
    });

    it('adds rage conditional immunities when rage is active', () => {
        getActiveBuffs.mockReturnValue([{ name: 'Rage' }]);
        const stats = {
            ...mockPlayerStats,
            automationConditionalImmunities: [
                { requiresActive: 'Rage', immunities: ['charmed'] },
            ],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Immunities:/)).toBeInTheDocument();
        expect(screen.getByText(/Charmed/)).toBeInTheDocument();
    });

    it('adds calm emotions condition immunities', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Calm Emotions', conditionImmunity: ['Frightened'] },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Immunities:/)).toBeInTheDocument();
        expect(screen.getByText(/Frightened/)).toBeInTheDocument();
    });

    it('adds feign death condition immunities', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Feign Death', conditionImmunity: ['Poisoned'] },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Immunities:/)).toBeInTheDocument();
        expect(screen.getByText(/Poisoned/)).toBeInTheDocument();
    });

    it('adds heroism condition immunities', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Heroism', conditionImmunity: ['Frightened'] },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Immunities:/)).toBeInTheDocument();
        expect(screen.getByText(/Frightened/)).toBeInTheDocument();
    });

    it('adds faerie fire condition immunities', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Faerie Fire', conditionImmunity: ['Undetected'] },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Immunities:/)).toBeInTheDocument();
        expect(screen.getByText(/Undetected/)).toBeInTheDocument();
    });

    it('adds auraOfLife resistances', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Aura of Life', resistanceTypes: ['necrotic'] },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Resistances:/)).toBeInTheDocument();
        expect(screen.getByText(/Necrotic/)).toBeInTheDocument();
    });

    it('adds auraOfPurity resistances', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Aura of Purity', resistanceTypes: ['poison'] },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Resistances:/)).toBeInTheDocument();
        expect(screen.getByText(/Poison/)).toBeInTheDocument();
    });

    it('adds protectionFromPoison resistances', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Protection from Poison', resistanceTypes: ['poison'] },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Resistances:/)).toBeInTheDocument();
        expect(screen.getByText(/Poison/)).toBeInTheDocument();
    });

    it('adds wardingBond resistances', () => {
        getActiveBuffs.mockReturnValue([
            { effect: 'warding_bond', resistanceTypes: ['cold'] },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Resistances:/)).toBeInTheDocument();
        expect(screen.getByText(/Cold/)).toBeInTheDocument();
    });

    it('adds starryForm resistances', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Starry Form', resistanceTypes: ['bludgeoning', 'piercing', 'slashing'] },
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Resistances:/)).toBeInTheDocument();
        expect(screen.getByText(/Bludgeoning/)).toBeInTheDocument();
        expect(screen.getByText(/Piercing/)).toBeInTheDocument();
        expect(screen.getByText(/Slashing/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Climb and swim speed fallbacks
// ---------------------------------------------------------------------------
describe('CharSummary - Climb/Swim Speed Fallbacks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('uses playerStats climbSpeed when no aspect buff', () => {
        const stats = {
            ...mockPlayerStats,
            climbSpeed: 30,
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/climb 30 ft/)).toBeInTheDocument();
    });

    it('uses playerStats swimSpeed when no aquatic buff', () => {
        const stats = {
            ...mockPlayerStats,
            swimSpeed: 40,
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/swim 40 ft/)).toBeInTheDocument();
    });

    it('Aspect Salmon swim speed overrides base swimSpeed', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Aspect of the Wilds', optionName: 'Salmon' },
        ]);
        const stats = {
            ...mockPlayerStats,
            swimSpeed: 40,
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        // salmon sets swimSpeed = totalSpeed + buffSpeedBonus = 25 + 0 = 25
        expect(screen.getByText(/swim 25 ft/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Cover source badges
// ---------------------------------------------------------------------------
describe('CharSummary - Cover Source Badges', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows smiteOfProtection cover when another character has it with Aura of Protection', () => {
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
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'smiteOfProtectionActive') return true;
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(
            <CharSummary
                playerStats={stats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={characters}
            />
        );
        expect(screen.getByText('Armor Class:')).toBeInTheDocument();
    });

    it('does not show smiteOfProtection cover without Aura of Protection', () => {
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
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'smiteOfProtectionActive') return true;
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(
            <CharSummary
                playerStats={stats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={characters}
            />
        );
        expect(screen.getByText('Armor Class:')).toBeInTheDocument();
    });

    it('shows bulwarkOfForce cover when player is in targets list', () => {
        const characters = [
            {
                name: 'Ally1',
            },
        ];
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (name === 'Ally1' && key === 'bulwarkOfForceActive') return true;
            if (name === 'Ally1' && key === 'bulwarkOfForceTargets') return ['Thorin'];
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(
            <CharSummary
                playerStats={stats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={characters}
            />
        );
        expect(screen.getByText('Armor Class:')).toBeInTheDocument();
    });

    it('does not show bulwarkOfForce cover when player is not in targets list', () => {
        const characters = [
            {
                name: 'Ally1',
            },
        ];
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (name === 'Ally1' && key === 'bulwarkOfForceActive') return true;
            if (name === 'Ally1' && key === 'bulwarkOfForceTargets') return ['OtherPlayer'];
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(
            <CharSummary
                playerStats={stats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={characters}
            />
        );
        expect(screen.getByText('Armor Class:')).toBeInTheDocument();
    });

    it('shows naturesSanctuary cover when player is in sanctuary creatures list', () => {
        const characters = [
            {
                name: 'Ally1',
            },
        ];
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (name === 'Ally1' && key === 'naturesSanctuaryCreatures') return ['Thorin'];
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(
            <CharSummary
                playerStats={stats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={characters}
            />
        );
        expect(screen.getByText('Armor Class:')).toBeInTheDocument();
    });

    it('does not show naturesSanctuary cover when player not in list', () => {
        const characters = [
            {
                name: 'Ally1',
            },
        ];
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (name === 'Ally1' && key === 'naturesSanctuaryCreatures') return ['OtherPlayer'];
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(
            <CharSummary
                playerStats={stats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={characters}
            />
        );
        expect(screen.getByText('Armor Class:')).toBeInTheDocument();
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

    it('filters target effects for current player only', () => {
        vi.mocked(useRuntimeValue).mockImplementation((name, key) => {
            if (name === 'campaign' && key === 'targetEffects') {
                return [
                    { target: ['Thorin'], effect: 'reckless_attack' },
                    { target: ['Enemy1'], effect: 'poisoned' },
                ];
            }
            if (name === 'Thorin' && key === 'activeConditions') return [];
            if (name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText('Conditions')).toBeInTheDocument();
    });

    it('handles target effects with single target string', () => {
        vi.mocked(useRuntimeValue).mockImplementation((name, key) => {
            if (name === 'campaign' && key === 'targetEffects') {
                return [
                    { target: 'Thorin', effect: 'burning' },
                ];
            }
            if (name === 'Thorin' && key === 'activeConditions') return [];
            if (name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText('Conditions')).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Condition objects memo
// ---------------------------------------------------------------------------
describe('CharSummary - Condition Objects', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('builds condition objects from runtime values with metadata', () => {
        vi.mocked(useRuntimeValue).mockImplementation((name, key) => {
            if (name === 'campaign' && key === 'targetEffects') return [];
            if (name === 'Thorin' && key === 'activeConditions') return ['blinded', 'deafened'];
            if (name === 'Thorin' && key === 'activeConditionMeta') return { blinded: { dc: 15, ability: 'con' } };
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText('Conditions')).toBeInTheDocument();
    });

    it('handles empty conditions gracefully', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (key === 'activeConditions') return [];
            if (key === 'activeConditionMeta') return {};
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText('Conditions')).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Sanctuary info badge
// ---------------------------------------------------------------------------
describe('CharSummary - Sanctuary Info Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows sanctuary badge when another druid has the player in their sanctuary', () => {
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (name === 'Ally1' && key === 'naturesSanctuaryActive') return true;
            if (name === 'Ally1' && key === 'naturesSanctuaryCreatures') return ['Thorin'];
            if (name === 'Ally1' && key === 'naturesSanctuaryResistance') return 'cold';
            return null;
        });
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        const characters = [
            {
                name: 'Ally1',
                type: 'player',
                computedStats: {
                    automation: {},
                },
            },
        ];
        const stats = { ...mockPlayerStats };
        render(
            <CharSummary
                playerStats={stats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={characters}
            />
        );
        expect(screen.getByText(/Conditions/)).toBeInTheDocument();
    });

    it('returns null sanctuary info when no druid has the player', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'naturesSanctuaryActive') return false;
            return null;
        });
        const characters = [
            {
                name: 'Ally1',
                type: 'player',
                computedStats: { automation: {} },
            },
        ];
        const stats = { ...mockPlayerStats };
        render(
            <CharSummary
                playerStats={stats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={characters}
            />
        );
        expect(screen.getByText(/Conditions/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Haste doubling
// ---------------------------------------------------------------------------
describe('CharSummary - Haste Speed Doubling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('doubles speed when haste buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'haste' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        // speed=25, doubled to 50
        expect(screen.getByText(/Speed:/)).toBeInTheDocument();
    });

    it('shows haste AC bonus in AC display', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'haste' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/\+2 from Haste/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Senses, Proficiencies, Languages rendering
// ---------------------------------------------------------------------------
describe('CharSummary - Senses/Proficiencies/Languages', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders senses when present', () => {
        const stats = {
            ...mockPlayerStats,
            senses: [{ name: 'Darkvision', value: 60 }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Senses:/)).toBeInTheDocument();
        expect(screen.getByText(/Darkvision 60/)).toBeInTheDocument();
    });

    it('renders proficiencies when present', () => {
        const stats = {
            ...mockPlayerStats,
            proficiencies: ['Longsword', 'Shield'],
            toolProficiencies: ['Thieves\' Tools'],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Proficiencies:/)).toBeInTheDocument();
        expect(screen.getByText(/Longsword/)).toBeInTheDocument();
        expect(screen.getByText(/Thieves' Tools/)).toBeInTheDocument();
    });

    it('renders languages when present', () => {
        const stats = {
            ...mockPlayerStats,
            languages: ['Common', 'Elvish'],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Languages:/)).toBeInTheDocument();
        expect(screen.getByText(/Common/)).toBeInTheDocument();
        expect(screen.getByText(/Elvish/)).toBeInTheDocument();
    });

    it('renders vulnerabilities when present', () => {
        const stats = {
            ...mockPlayerStats,
            vulnerabilities: ['fire'],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Vulnerabilities:/)).toBeInTheDocument();
        expect(screen.getByText(/fire/)).toBeInTheDocument();
    });

    it('adds see invisibility to senses when buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'see_invisibility' }]);
        const stats = {
            ...mockPlayerStats,
            senses: [{ name: 'Darkvision', value: 60 }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/See Invisibility/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Wild Magic Surge Effects
// ---------------------------------------------------------------------------
describe('CharSummary - Wild Magic Surge Effects', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders surge effects when present', () => {
        vi.mocked(useSyncedState).mockImplementation((_name, key, defaultValue) => {
            if (key === 'wildMagicSurgeEffects') return [[{ roll: 1, effect: 'Fireball', timestamp: 1000 }], vi.fn()];
            return [defaultValue, vi.fn()];
        });
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Surge Effects:/)).toBeInTheDocument();
        expect(screen.getByText(/Fireball/)).toBeInTheDocument();
    });

    it('does not render surge effects when null', () => {
        vi.mocked(useSyncedState).mockImplementation((_name, key, defaultValue) => {
            if (key === 'wildMagicSurgeEffects') return [null, vi.fn()];
            return [defaultValue, vi.fn()];
        });
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Surge Effects:/)).not.toBeInTheDocument();
    });
});
