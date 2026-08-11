import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { useRuntimeValue, getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

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
