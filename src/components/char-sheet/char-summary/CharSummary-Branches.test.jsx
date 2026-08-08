import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { getCombatSummary } from '../../../services/encounters/combatData.js';
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

vi.mock('../../../services/rules/rulesFactory.js', () => ({
    default: {
        getRules: vi.fn(() => ({ classRules: { getUnarmoredMovementIncrease: vi.fn(() => 5) } })),
    },
    getRules: vi.fn(() => ({ classRules: { getUnarmoredMovementIncrease: vi.fn(() => 5) } })),
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

vi.mock('../../../services/automation/handlers/buffs/stoneSkinHandler.js', () => ({
    getStoneSkinDamageTypes: vi.fn(() => []),
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
// te.target as array vs string (line 474)
// ---------------------------------------------------------------------------
describe('CharSummary - TargetEffects target property types', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('handles te.target as string (line 474 false branch)', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') {
                return [
                    { target: 'Thorin', effect: 'reckless_attack' },
                    { target: 'Other', effect: 'some_effect' },
                ];
            }
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText('Armor Class:')).toBeInTheDocument();
    });

    it('handles te.target as array (line 474 true branch)', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') {
                return [
                    { target: ['Thorin'], effect: 'some_array_target' },
                    { target: ['Other'], effect: 'other_effect' },
                ];
            }
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText('Armor Class:')).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// conditionMeta with metadata (line 486 false branch)
// ---------------------------------------------------------------------------
describe('CharSummary - ConditionMeta with metadata', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('handles conditionMeta with dc and ability metadata (line 486 false branch)', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return ['Exhaustion', 'Blinded'];
            if (_name === 'Thorin' && key === 'activeConditionMeta') {
                return {
                    exhaustion: { dc: 12, ability: 'con' },
                    blinded: { dc: 15, ability: 'dex' },
                };
            }
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText('Armor Class:')).toBeInTheDocument();
    });

    it('handles conditionMeta with empty metadata object (line 486 true branch)', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return ['Exhaustion'];
            if (_name === 'Thorin' && key === 'activeConditionMeta') {
                return { exhaustion: {} };
            }
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText('Armor Class:')).toBeInTheDocument();
    });

    it('handles conditionMeta with no metadata for a condition (line 486 true branch fallback)', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return ['Exhaustion'];
            // No entry for 'exhaustion' in conditionMeta, so {} fallback is used
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText('Armor Class:')).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// activeBuffs.forEach iteration with various buff effects
// ---------------------------------------------------------------------------
describe('CharSummary - activeBuffs forEach iteration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('processes defensive_duelist buff with acBonus in forEach', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'defensive_duelist', acBonus: 2 }]);
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/\+2 from Defensive Duelist/)).toBeInTheDocument();
    });

    it('processes speed_boost buff in forEach', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'speed_boost', speedBonus: 10 }]);
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('35 ft');
    });

    it('processes large_form buff in forEach (speed bonus)', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'large_form' }]);
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('35 ft');
    });

    it('processes aquatic_adaptation buff in forEach', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'aquatic_adaptation' }]);
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/swim 50 ft/)).toBeInTheDocument();
    });

    it('processes tremorsense_60ft buff in forEach', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'tremorsense_60ft' }]);
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Tremorsense 60 ft/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Aspect of the Wilds false branches
// ---------------------------------------------------------------------------
describe('CharSummary - Aspect of the Wilds False Branches', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('handles aspectOption not equal to Salmon (line 394 false branch)', () => {
        getActiveBuffs.mockReturnValue([{ name: 'Aspect of the Wilds', optionName: 'Panther' }]);
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/climb 25 ft/)).toBeInTheDocument();
        expect(screen.queryByText(/swim 25 ft/)).not.toBeInTheDocument();
    });

    it('handles aspectOption equal to Salmon with swimSpeed already set (line 394 false branch)', () => {
        getActiveBuffs.mockReturnValue([
            { effect: 'aquatic_adaptation' },
            { name: 'Aspect of the Wilds', optionName: 'Salmon' },
        ]);
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/swim 50 ft/)).toBeInTheDocument();
    });

    it('applies salmon swim speed when swimSpeed is null (line 395 true branch)', () => {
        getActiveBuffs.mockReturnValue([{ name: 'Aspect of the Wilds', optionName: 'Salmon' }]);
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        // totalSpeed=25, buffSpeedBonus=0, so swimSpeed = 25
        expect(screen.getByText(/swim 25 ft/)).toBeInTheDocument();
    });

    it('handles aspectOption not matching any known option (line 388 false branch)', () => {
        getActiveBuffs.mockReturnValue([{ name: 'Aspect of the Wilds', optionName: 'Eagle' }]);
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText('Armor Class:')).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Monk unarmored movement (line 167-175)
// ---------------------------------------------------------------------------
describe('CharSummary - Monk Unarmored Movement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('adds monk unarmored movement when no armor or shield', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'baitAndSwitchActive') return false;
            return null;
        });
        const stats = {
            ...mockPlayerStats,
            class: { name: 'Monk', subclass: { name: 'Way of the Open Hand' }, major: { name: 'Monk' } },
            inventory: { equipped: [] },
            equipment: [],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('30 ft');
    });

    it('does not add monk unarmored movement when wearing armor', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'baitAndSwitchActive') return false;
            return null;
        });
        const stats = {
            ...mockPlayerStats,
            class: { name: 'Monk', subclass: { name: 'Way of the Open Hand' }, major: { name: 'Monk' } },
            inventory: { equipped: ['Scale Mail'] },
            equipment: [{ name: 'Scale Mail', equipment_category: 'Armor' }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('25 ft');
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
            ],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Immunities:/)).toBeInTheDocument();
        expect(screen.getByText(/Frightened/)).toBeInTheDocument();
    });

    it('excludes non-rage conditional immunities when rage is not active', () => {
        getActiveBuffs.mockReturnValue([]);
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
// Calm Emotions, Feign Death, Heroism, Faerie Fire condition immunities
// ---------------------------------------------------------------------------
describe('CharSummary - Additional Condition Immunities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('includes calm emotions condition immunities', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Calm Emotions', conditionImmunity: ['Frightened'] },
        ]);
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Immunities:/)).toBeInTheDocument();
        expect(screen.getByText(/Frightened/)).toBeInTheDocument();
    });

    it('includes feign death condition immunities', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Feign Death', conditionImmunity: ['Poisoned'] },
        ]);
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Immunities:/)).toBeInTheDocument();
        expect(screen.getByText(/Poisoned/)).toBeInTheDocument();
    });

    it('includes heroism condition immunities', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Heroism', conditionImmunity: ['Frightened'] },
        ]);
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Immunities:/)).toBeInTheDocument();
        expect(screen.getByText(/Frightened/)).toBeInTheDocument();
    });

    it('includes faerie fire condition immunities', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Faerie Fire', conditionImmunity: ['Blinded'] },
        ]);
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Immunities:/)).toBeInTheDocument();
        expect(screen.getByText(/Blinded/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Warding Bond resistance (lines 288-291)
// ---------------------------------------------------------------------------
describe('CharSummary - Warding Bond Resistances', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('adds warding bond resistance types', () => {
        getActiveBuffs.mockReturnValue([
            { effect: 'warding_bond', resistanceTypes: ['cold'] },
        ]);
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Resistances:/)).toBeInTheDocument();
        expect(screen.getByText(/Cold/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Starry Form resistances (lines 293-296)
// ---------------------------------------------------------------------------
describe('CharSummary - Starry Form Resistances', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('adds starry form resistance types', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Starry Form', resistanceTypes: ['fire'] },
        ]);
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Resistances:/)).toBeInTheDocument();
        expect(screen.getByText(/Fire/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Aura of Purity resistances (lines 263-266)
// ---------------------------------------------------------------------------
describe('CharSummary - Aura Of Purity Resistances', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('adds aura of purity resistance types', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Aura of Purity', resistanceTypes: ['poison'] },
        ]);
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Resistances:/)).toBeInTheDocument();
        expect(screen.getByText(/Poison/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Protection from Poison resistances (lines 278-281)
// ---------------------------------------------------------------------------
describe('CharSummary - Protection From Poison Resistances', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('adds protection from poison resistance types', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Protection from Poison', resistanceTypes: ['poison'] },
        ]);
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Resistances:/)).toBeInTheDocument();
        expect(screen.getByText(/Poison/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Heroes' Feast resistances (lines 273-276)
// ---------------------------------------------------------------------------
describe('CharSummary - Heroes Feast Resistances', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('adds heroes feast resistance types', () => {
        getActiveBuffs.mockReturnValue([
            { name: "Heroes' Feast", resistanceTypes: ['cold', 'fire'] },
        ]);
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Resistances:/)).toBeInTheDocument();
        expect(screen.getByText(/Cold/)).toBeInTheDocument();
        expect(screen.getByText(/Fire/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Aura of Life resistances (lines 258-261)
// ---------------------------------------------------------------------------
describe('CharSummary - Aura Of Life Resistances', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('adds aura of life resistance types', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Aura of Life', resistanceTypes: ['necrotic'] },
        ]);
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Resistances:/)).toBeInTheDocument();
        expect(screen.getByText(/Necrotic/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Epitome and Fiendish Resilience resistance types
// ---------------------------------------------------------------------------
describe('CharSummary - Epitome And Fiendish Resilience', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('adds epitome resistance type from runtime value', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'epitomeResistanceType') return 'lightning';
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Resistances:/)).toBeInTheDocument();
        expect(screen.getByText(/Lightning/)).toBeInTheDocument();
    });

    it('adds fiendish resilience type from runtime value', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === '_Fiendish_Resilience_chosenType') return 'fire';
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Resistances:/)).toBeInTheDocument();
        expect(screen.getByText(/Fire/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Boon Energy Resistance types
// ---------------------------------------------------------------------------
describe('CharSummary - Boon Energy Resistances', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('adds boon energy resistance types from runtime value', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === '_Energy_Resistances_chosenTypes') return ['acid', 'cold'];
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Resistances:/)).toBeInTheDocument();
        expect(screen.getByText(/Acid/)).toBeInTheDocument();
        expect(screen.getByText(/Cold/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Vulnerabilities display
// ---------------------------------------------------------------------------
describe('CharSummary - Vulnerabilities Display', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders vulnerabilities when present', () => {
        const stats = {
            ...mockPlayerStats,
            vulnerabilities: ['fire'],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Vulnerabilities:/)).toBeInTheDocument();
        expect(screen.getByText(/Fire/)).toBeInTheDocument();
    });

    it('renders multiple vulnerabilities', () => {
        const stats = {
            ...mockPlayerStats,
            vulnerabilities: ['fire', 'psychic'],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Fire/)).toBeInTheDocument();
        expect(screen.getByText(/psychic/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Languages display
// ---------------------------------------------------------------------------
describe('CharSummary - Languages Display', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders languages when present', () => {
        const stats = {
            ...mockPlayerStats,
            languages: ['Common', 'Dwarvish'],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Languages:/)).toBeInTheDocument();
        expect(screen.getByText(/Common/)).toBeInTheDocument();
        expect(screen.getByText(/Dwarvish/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Senses display without see invisibility
// ---------------------------------------------------------------------------
describe('CharSummary - Senses Display', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders senses without see invisibility', () => {
        const stats = {
            ...mockPlayerStats,
            senses: [{ name: 'Darkvision', value: 60 }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Senses:/)).toBeInTheDocument();
        expect(screen.getByText(/Darkvision 60/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Wrath of the Sea badge
// ---------------------------------------------------------------------------
describe('CharSummary - Wrath Of The Sea Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('shows wrath of the sea badge when active', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (key === 'wrathOfTheSeaActive') return true;
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Wrath of the Sea/)).toBeInTheDocument();
    });

    it('does not show wrath of the sea badge when inactive', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (key === 'wrathOfTheSeaActive') return false;
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Wrath of the Sea/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Reckless Attack badge
// ---------------------------------------------------------------------------
describe('CharSummary - Reckless Attack Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('shows reckless attack badge when targetEffect has reckless_attack', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') {
                return [{ target: 'Thorin', effect: 'reckless_attack' }];
            }
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Reckless Attack/)).toBeInTheDocument();
    });

    it('does not show reckless attack badge when no matching targetEffect', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Reckless Attack/)).not.toBeInTheDocument();
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

    it('shows barkskin badge when active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'barkskin' }]);
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Barkskin \(AC 17\)/)).toBeInTheDocument();
    });

    it('does not show barkskin badge when inactive', () => {
        getActiveBuffs.mockReturnValue([]);
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Barkskin/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Hunters Mark on creature badge (lines 796-798)
// ---------------------------------------------------------------------------
describe('CharSummary - Hunters Mark On Creature Badge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('shows hunters mark badge when another creature has it concentrated on player', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        getCombatSummary.mockReturnValue({
            creatures: [{ name: 'Ranger1', concentration: { spell: "Hunter's Mark", target: 'Thorin' } }],
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Hunter's Mark/)).toBeInTheDocument();
    });

    it('does not show hunters mark badge when no creature has it on player', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return [];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        getCombatSummary.mockReturnValue({ creatures: [] });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Hunter's Mark/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Speed with haste and aura speed bonus combined
// ---------------------------------------------------------------------------
describe('CharSummary - Speed With Haste And Aura', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('doubles speed with haste and adds aura speed bonus', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'haste' }]);
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                auraComboEffects={{ speedBonus: 5, speedSource: 'Aura of Alacrity' }}
            />
        );
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('55 ft');
    });
});

// ---------------------------------------------------------------------------
// Smite of Protection cover (lines 419-429)
// ---------------------------------------------------------------------------
describe('CharSummary - Smite Of Protection Cover', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('sets smiteOfProtectionCoverActive when other character has smite + aura of protection', () => {
        const characters = [
            { name: 'Ally1', computedStats: { automation: { passives: [{ name: 'Aura of Protection' }] } } },
        ];
        getRuntimeValue.mockImplementation((name, key, _campaign) => {
            if (name === 'Ally1' && key === 'smiteOfProtectionActive') return true;
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
        expect(screen.getByText(/Smite of Protection/)).toBeInTheDocument();
    });

    it('does not set smiteOfProtectionCoverActive when character lacks aura of protection passive', () => {
        const characters = [
            { name: 'Ally1', computedStats: { automation: { passives: [] } } },
        ];
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (name === 'Ally1' && key === 'smiteOfProtectionActive') return true;
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
// Nature's Sanctuary cover (lines 431-451)
// ---------------------------------------------------------------------------
describe('CharSummary - Natures Sanctuary Cover', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('sets naturesSanctuaryCoverActive when other druid has player in sanctuary list', () => {
        const characters = [
            { name: 'Ally1' },
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

    it('does not set naturesSanctuaryCoverActive when player not in sanctuary list', () => {
        const characters = [
            { name: 'Ally1' },
        ];
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (name === 'Ally1' && key === 'naturesSanctuaryCreatures') return ['Other'];
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
// Speed zero condition
// ---------------------------------------------------------------------------
describe('CharSummary - Speed Zero Condition', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('sets speed to 0 when conditionEffects.speedZero is true', () => {
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                conditionEffects={{ speedZero: true }}
            />
        );
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('0 ft');
    });

    it('applies speed zero after exhaustion penalty (speed already 0)', () => {
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={5}
                conditionEffects={{ speedZero: true }}
            />
        );
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('0 ft');
    });
});

// ---------------------------------------------------------------------------
// Speed reduction condition
// ---------------------------------------------------------------------------
describe('CharSummary - Speed Reduction Condition', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('applies speedReduction from conditionEffects', () => {
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                conditionEffects={{ speedReduction: 15 }}
            />
        );
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('10 ft');
    });

    it('clamps speed to 0 when speedReduction exceeds speed', () => {
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                conditionEffects={{ speedReduction: 30 }}
            />
        );
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('0 ft');
    });
});

// ---------------------------------------------------------------------------
// Base immunities display
// ---------------------------------------------------------------------------
describe('CharSummary - Base Immunities Display', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders immunities when present', () => {
        const stats = {
            ...mockPlayerStats,
            immunities: ['poison', 'frightened'],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Immunities:/)).toBeInTheDocument();
        expect(screen.getByText(/Poison/)).toBeInTheDocument();
        expect(screen.getByText(/Frightened/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Base resistances display
// ---------------------------------------------------------------------------
describe('CharSummary - Base Resistances Display', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders resistances when present', () => {
        const stats = {
            ...mockPlayerStats,
            resistances: ['fire', 'cold'],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Resistances:/)).toBeInTheDocument();
        expect(screen.getByText(/Fire/)).toBeInTheDocument();
        expect(screen.getByText(/Cold/)).toBeInTheDocument();
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
    });

    it('adds stormborn resistances when wrathOfTheSeaActive is true', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (key === 'wrathOfTheSeaActive') return true;
            return null;
        });
        const stats = {
            ...mockPlayerStats,
            automation: {
                passives: [
                    { type: 'resistance', name: 'Stormborn', damageTypes: ['lightning', 'cold'] },
                ],
            },
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Resistances:/)).toBeInTheDocument();
        expect(screen.getByText(/Lightning/)).toBeInTheDocument();
        expect(screen.getByText(/Cold/)).toBeInTheDocument();
    });

    it('does not add stormborn resistances when wrathOfTheSeaActive is false', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (key === 'wrathOfTheSeaActive') return false;
            return null;
        });
        const stats = {
            ...mockPlayerStats,
            automation: {
                passives: [
                    { type: 'resistance', name: 'Stormborn', damageTypes: ['lightning', 'cold'] },
                ],
            },
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Lightning/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Speed with exhaustion only (no condition effects)
// ---------------------------------------------------------------------------
describe('CharSummary - Speed With Exhaustion Only', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('applies exhaustion penalty to speed correctly at level 3', () => {
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={3}
            />
        );
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('10 ft');
    });

    it('applies exhaustion penalty to speed correctly at level 6', () => {
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={6}
            />
        );
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('0 ft');
    });
});

// ---------------------------------------------------------------------------
// AC formula with barkskin override
// ---------------------------------------------------------------------------
describe('CharSummary - AC Formula Barkskin Override', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('uses barkskin AC 17 when barkskin is active and no mage armor', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'barkskin' }]);
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/AC 17 from Barkskin/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Fly speed from generic flySpeed buff (line 384)
// ---------------------------------------------------------------------------
describe('CharSummary - Fly Speed Generic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('sets hasFlySpeedBuff for custom flySpeed buff not in special cases', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'custom_fly', flySpeed: 40 }]);
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/fly 25 ft/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Climb speed from playerStats when aspect option not set
// ---------------------------------------------------------------------------
describe('CharSummary - Climb Speed From PlayerStats', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('uses playerStats climbSpeed when aspect option is not panther', () => {
        const stats = {
            ...mockPlayerStats,
            climbSpeed: 20,
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/climb 20 ft/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Swim speed from playerStats when aspect option not salmon
// ---------------------------------------------------------------------------
describe('CharSummary - Swim Speed From PlayerStats', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('uses playerStats swimSpeed when aspect option is not salmon', () => {
        const stats = {
            ...mockPlayerStats,
            swimSpeed: 30,
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/swim 30 ft/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Speed halved with exhaustion combined
// ---------------------------------------------------------------------------
describe('CharSummary - Speed Halved With Exhaustion', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('applies speedHalved after exhaustion penalty', () => {
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={1}
                conditionEffects={{ speedHalved: true }}
            />
        );
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('10 ft');
    });
});

// ---------------------------------------------------------------------------
// Wild surge effects - empty array
// ---------------------------------------------------------------------------
describe('CharSummary - Wild Surge Effects Empty', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('does not show surge effects when surgeEffects is null', () => {
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

    it('does not show surge effects when surgeEffects is empty array', () => {
        vi.mocked(useSyncedState).mockImplementation((_name, key, defaultValue) => {
            if (key === 'wildMagicSurgeEffects') return [[], vi.fn()];
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

// ---------------------------------------------------------------------------
// Current allies fallback to [playerStats.name]
// ---------------------------------------------------------------------------
describe('CharSummary - Current Allies Fallback', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('uses [playerStats.name] when storedAllies is null', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (key === 'selectedAllies') return null;
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Allies \(1\)/)).toBeInTheDocument();
    });

    it('uses [playerStats.name] when storedAllies is empty array', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (key === 'selectedAllies') return [];
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Allies \(1\)/)).toBeInTheDocument();
    });

    it('uses storedAllies when non-empty array', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (key === 'selectedAllies') return ['Ally1', 'Ally2'];
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Allies \(2\)/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Race subrace display
// ---------------------------------------------------------------------------
describe('CharSummary - Race Subrace Display', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows subrace name when present', () => {
        const stats = {
            ...mockPlayerStats,
            race: { name: 'Elf', type: 'High Elf', subrace: { name: 'High Elf', speed: 30 } },
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/High Elf/)).toBeInTheDocument();
    });

    it('shows race name when no subrace', () => {
        const stats = {
            ...mockPlayerStats,
            race: { name: 'Human', type: null, subrace: null },
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Human/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Class subclass display
// ---------------------------------------------------------------------------
describe('CharSummary - Class Subclass Display', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows subclass name and type when present', () => {
        const stats = {
            ...mockPlayerStats,
            class: { name: 'Wizard', subclass: { name: 'School of Magic', type: 'Evocation' }, major: { name: 'Wizard' } },
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/school of magic/)).toBeInTheDocument();
        expect(screen.getByText(/evocation/)).toBeInTheDocument();
    });

    it('shows subclass name without type when type is missing', () => {
        const stats = {
            ...mockPlayerStats,
            class: { name: 'Rogue', subclass: { name: 'Thief' }, major: { name: 'Rogue' } },
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/thief/)).toBeInTheDocument();
    });

    it('shows class without subclass when subclass is missing', () => {
        const stats = {
            ...mockPlayerStats,
            class: { name: 'Fighter', major: { name: 'Fighter' } },
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Fighter/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Heavy armor check via equipment list (line 191-193)
// ---------------------------------------------------------------------------
describe('CharSummary - Heavy Armor Check Via Equipment', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('detects heavy armor in equipment list for speed_bonus no_heavy_armor', () => {
        const stats = {
            ...mockPlayerStats,
            automation: {
                passives: [{ type: 'passive_buff', effect: 'speed_bonus', bonusExpression: '10', condition: 'no_heavy_armor' }],
            },
            equipment: [{ name: 'Plate', armor_category: 'Heavy' }],
            inventory: { equipped: ['Plate'] },
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('25 ft');
    });
});

// ---------------------------------------------------------------------------
// Speed halved display text
// ---------------------------------------------------------------------------
describe('CharSummary - Speed Halved Display Text', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows speed halved text when speedHalved is true', () => {
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                conditionEffects={{ speedHalved: true }}
            />
        );
        expect(screen.getByText(/Speed halved from Slow/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// AC with warding bond acPenalty combined
// ---------------------------------------------------------------------------
describe('CharSummary - AC Warding Bond And AcPenalty', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('applies both warding bond bonus and acPenalty', () => {
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                conditionEffects={{ wardingBondAcBonus: 2, acPenalty: 2 }}
            />
        );
        expect(screen.getByText(/18/)).toBeInTheDocument();
        expect(screen.getByText(/\+2 from Warding Bond/)).toBeInTheDocument();
        expect(screen.getByText(/\(−2 from Slow\)/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Speed with aura bonus display
// ---------------------------------------------------------------------------
describe('CharSummary - Speed Aura Bonus Display', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('shows aura speed bonus source badge', () => {
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                auraComboEffects={{ speedBonus: 10, speedSource: 'Aura of Alacrity' }}
            />
        );
        expect(screen.getByText(/\+10/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Bait and Switch not active (line 414 false branch)
// ---------------------------------------------------------------------------
describe('CharSummary - Bait And Switch Not Active', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('does not add bait and switch bonus when inactive', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (key === 'baitAndSwitchActive') return false;
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Bait and Switch/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Non-array activeBuffs for conditions (lines 479-495)
// These test the conditionObjects useMemo which doesn't depend on activeBuffs
// ---------------------------------------------------------------------------
describe('CharSummary - Conditions With Runtime Values', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders conditions with runtime values properly', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key) => {
            if (_name === 'campaign' && key === 'targetEffects') return [];
            if (_name === 'Thorin' && key === 'activeConditions') return ['Exhaustion'];
            if (_name === 'Thorin' && key === 'activeConditionMeta') return {};
            return null;
        });
        const stats = { ...mockPlayerStats };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText('Armor Class:')).toBeInTheDocument();
    });
});
