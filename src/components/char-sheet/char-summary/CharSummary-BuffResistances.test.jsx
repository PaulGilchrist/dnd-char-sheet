// @improved-by-ai
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';

// ---------------------------------------------------------------------------
// Mocks — co-located component imports that must not render real DOM
// ---------------------------------------------------------------------------
vi.mock('./CharGold.jsx', () => ({ default: () => <div data-testid="char-gold">Gold</div> }));
vi.mock('./CharHitPoints.jsx', () => ({ default: () => <div data-testid="char-hp">HP</div> }));
vi.mock('./CharClassFeatures.jsx', () => ({ default: () => <div data-testid="char-class-features">Class Features</div> }));
vi.mock('./CharRaceFeatures.jsx', () => ({ default: () => <div data-testid="char-race-features">Race Features</div> }));
vi.mock('./CharFeatFeatures.jsx', () => ({ default: () => <div data-testid="char-feat-features">Feat Features</div> }));
vi.mock('./TrackedResourceInput.jsx', () => ({ default: () => <div data-testid="tracked-resource-input">TrackedResource</div> }));
vi.mock('../char-feats/CharFeats.jsx', () => ({ default: () => <div data-testid="char-feats">Feats</div> }));
vi.mock('../../common/AvatarImage.jsx', () => ({ default: () => <div data-testid="avatar-image">Avatar</div> }));
vi.mock('../../common/AvatarModal.jsx', () => ({ default: () => null }));
vi.mock('../../common/CreatureBadge.jsx', () => ({ default: ({ label }) => <span data-testid="creature-badge">{label}</span> }));
vi.mock('../../common/AllySelectionModal.jsx', () => ({ default: () => null }));
vi.mock('../../initiative/ConditionEffectBadges.jsx', () => ({ default: () => <div data-testid="condition-effect-badges">Badges</div> }));
vi.mock('../LongRestButton.jsx', () => ({ default: () => <div data-testid="long-rest-btn">Long Rest</div> }));
vi.mock('../ShortRestButton.jsx', () => ({ default: () => <div data-testid="short-rest-btn">Short Rest</div> }));
vi.mock('../ShortRestModal.jsx', () => ({ default: () => <div data-testid="short-rest-modal">Short Rest Modal</div> }));
vi.mock('./CharConditions.jsx', () => ({ default: () => <div data-testid="char-conditions">Conditions</div> }));
vi.mock('../../../services/ui/logService.js', () => ({ addEntry: vi.fn(() => Promise.resolve()) }));

// ---------------------------------------------------------------------------
// Runtime / state mocks
// ---------------------------------------------------------------------------
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

vi.mock('../../../hooks/combat/DiceRollContext.js', () => ({
    useDiceRollPopup: vi.fn(() => ({ setPopupHtml: vi.fn() })),
}));

vi.mock('../../../hooks/combat/useActionPopup.js', () => ({
    showBackgroundPopup: vi.fn(),
}));

vi.mock('../../../hooks/combat/useLoggedDiceRoll.js', () => ({
    default: vi.fn(() => ({ popupHtml: null, setPopupHtml: vi.fn(), rollInitiative: vi.fn() })),
}));

// ---------------------------------------------------------------------------
// Service mocks
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------
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

function renderSummary(buffsOverride) {
    if (buffsOverride !== undefined) {
        vi.mocked(getActiveBuffs).mockReturnValue(buffsOverride);
    }
    render(
        <CharSummary
            playerStats={mockPlayerStats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
        />
    );
}

// ---------------------------------------------------------------------------
// Single-buff resistance rendering
// ---------------------------------------------------------------------------
describe('CharSummary — single buff resistance rendering', () => {
    beforeEach(() => vi.resetAllMocks());

    it('renders necrotic resistance from Aura of Life', () => {
        renderSummary([{ name: 'Aura of Life', resistanceTypes: ['necrotic'] }]);
        expect(screen.getByText(/Necrotic/)).toBeInTheDocument();
    });

    it('renders poison resistance from Aura of Purity', () => {
        renderSummary([{ name: 'Aura of Purity', resistanceTypes: ['poison'] }]);
        expect(screen.getByText(/Poison/)).toBeInTheDocument();
    });

    it('renders poison resistance from Protection from Poison', () => {
        renderSummary([{ name: 'Protection from Poison', resistanceTypes: ['poison'] }]);
        expect(screen.getByText(/Poison/)).toBeInTheDocument();
    });

    it('renders bludgeoning resistance from Stone Skin', () => {
        renderSummary([{ name: 'Stone Skin', resistanceTypes: ['bludgeoning'] }]);
        expect(screen.getByText(/Bludgeoning/)).toBeInTheDocument();
    });

    it('renders cold resistance from Warding Bond effect', () => {
        renderSummary([{ effect: 'warding_bond', resistanceTypes: ['cold'] }]);
        expect(screen.getByText(/Cold/)).toBeInTheDocument();
    });

    it('renders fire resistance from Starry Form (Archer constellation)', () => {
        renderSummary([{ name: 'Starry Form', constellation: 'Archer', resistanceTypes: ['fire'] }]);
        expect(screen.getByText(/Fire/)).toBeInTheDocument();
    });

    it('renders slashing resistance from Superior Defense', () => {
        renderSummary([{ name: 'Superior Defense', resistanceTypes: ['slashing'] }]);
        expect(screen.getByText(/Slashing/)).toBeInTheDocument();
    });

    it('renders radiant resistance from Rage of the Gods', () => {
        renderSummary([{ name: 'Rage of the Gods', resistanceTypes: ['radiant'] }]);
        expect(screen.getByText(/Radiant/)).toBeInTheDocument();
    });

    it('renders resistance from a buff with empty resistanceTypes as absent', () => {
        renderSummary([{ name: 'Empty Buff', resistanceTypes: [] }]);
        expect(screen.queryByText(/Bludgeoning/)).not.toBeInTheDocument();
    });

    it('renders resistance from a buff missing resistanceTypes property', () => {
        renderSummary([{ name: 'NoTypes Buff' }]);
        expect(screen.queryByText(/Bludgeoning/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Feign Death — resistance + condition immunity
// ---------------------------------------------------------------------------
describe('CharSummary — Feign Death (resistance + condition immunity)', () => {
    beforeEach(() => vi.resetAllMocks());

    it('renders poison condition immunity and poison resistance from Feign Death', () => {
        renderSummary([
            {
                name: 'Feign Death',
                resistanceTypes: ['poison'],
                conditionImmunity: ['Poisoned'],
            },
        ]);
        expect(screen.getByText(/Immunities:/)).toBeInTheDocument();
        expect(screen.getByText(/Poisoned/)).toBeInTheDocument();
        expect(screen.getByText('Poison')).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Stone Skin — buff resistance + runtime value damage types
// ---------------------------------------------------------------------------
describe('CharSummary — Stone Skin (buff + runtime value)', () => {
    beforeEach(() => vi.resetAllMocks());

    it('renders bludgeoning resistance from Stone Skin buff', () => {
        renderSummary([{ name: 'Stone Skin', resistanceTypes: ['bludgeoning'] }]);
        expect(screen.getByText(/Bludgeoning/)).toBeInTheDocument();
    });

    it('renders piercing resistance from stoneSkinDamageTypes runtime value', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'stoneSkinDamageTypes') return ['piercing'];
            return null;
        });
        renderSummary([{ name: 'Stone Skin', resistanceTypes: ['bludgeoning'] }]);
        expect(screen.getByText(/Piercing/)).toBeInTheDocument();
        expect(screen.getByText(/Bludgeoning/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Multiple buffs — combined resistance types
// ---------------------------------------------------------------------------
describe('CharSummary — multiple buffs combined', () => {
    beforeEach(() => vi.resetAllMocks());

    it('renders distinct resistance types from three different buffs', () => {
        renderSummary([
            { name: 'Aura of Life', resistanceTypes: ['necrotic'] },
            { name: 'Aura of Purity', resistanceTypes: ['poison'] },
            { name: 'Stone Skin', resistanceTypes: ['bludgeoning'] },
        ]);
        expect(screen.getByText(/Necrotic/)).toBeInTheDocument();
        expect(screen.getByText(/Poison/)).toBeInTheDocument();
        expect(screen.getByText(/Bludgeoning/)).toBeInTheDocument();
    });

    it('deduplicates a resistance type that appears in two buffs', () => {
        renderSummary([
            { name: 'Aura of Purity', resistanceTypes: ['poison'] },
            { name: 'Feign Death', resistanceTypes: ['poison'] },
        ]);
        const poisonElements = screen.queryAllByText('Poison');
        expect(poisonElements.length).toBe(1);
    });

    it('deduplicates a resistance type that appears in buff and runtime value', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'stoneSkinDamageTypes') return ['bludgeoning'];
            return null;
        });
        renderSummary([
            { name: 'Stone Skin', resistanceTypes: ['bludgeoning'] },
        ]);
        const bludgeoningElements = screen.queryAllByText('Bludgeoning');
        expect(bludgeoningElements.length).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// No active buffs
// ---------------------------------------------------------------------------
describe('CharSummary — no active buffs', () => {
    beforeEach(() => vi.resetAllMocks());

    it('renders no buff-derived resistances when getActiveBuffs returns empty array', () => {
        renderSummary([]);
        expect(screen.queryByText(/Necrotic/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Poison/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Bludgeoning/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Cold/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Fire/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Slashing/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Radiant/)).not.toBeInTheDocument();
    });
});
