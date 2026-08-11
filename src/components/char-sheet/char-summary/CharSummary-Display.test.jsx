import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { useRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
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
