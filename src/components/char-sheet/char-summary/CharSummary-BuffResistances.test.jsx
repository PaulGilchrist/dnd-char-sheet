// @cleaned-by-ai
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

vi.mock('./CharGold.jsx', () => ({
    default: () => <div data-testid="char-gold">Gold</div>,
}));
vi.mock('./CharHitPoints.jsx', () => ({
    default: () => <div data-testid="char-hp">HP</div>,
}));
vi.mock('./CharClassFeatures.jsx', () => ({
    default: () => <div data-testid="char-class-features">Class Features</div>,
}));
vi.mock('../char-feats/CharFeats.jsx', () => ({
    default: () => <div data-testid="char-feats">Feats</div>,
}));
vi.mock('../../common/Popup.jsx', () => ({
    default: ({ children, onClick }) => (
        <div data-testid="popup" onClick={onClick}>
            {children}
        </div>
    ),
}));
vi.mock('../../common/AvatarImage.jsx', () => ({
    default: () => <div data-testid="avatar-image">Avatar</div>,
}));
vi.mock('../../common/AvatarModal.jsx', () => ({ default: () => null }));
vi.mock('../LongRestButton.jsx', () => ({
    default: () => <div data-testid="long-rest-btn">Long Rest</div>,
}));
vi.mock('../ShortRestButton.jsx', () => ({
    default: () => <div data-testid="short-rest-btn">Short Rest</div>,
}));
vi.mock('../ShortRestModal.jsx', () => ({
    default: () => <div data-testid="short-rest-modal">Short Rest Modal</div>,
}));
vi.mock('./CharConditions.jsx', () => ({
    default: () => <div data-testid="char-conditions">Conditions</div>,
}));

vi.mock('../../../hooks/runtime/useTrackedResource.js', () => ({
    default: vi.fn((key, name, init, _deps, _campaign) => ({
        current: init(),
        update: vi.fn(),
    })),
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
    default: vi.fn(() => ({
        popupHtml: null,
        setPopupHtml: vi.fn(),
        rollInitiative: vi.fn(),
    })),
}));

vi.mock('../../../services/combat/buffs/buffService.js', () => ({
    getActiveBuffs: vi.fn(() => []),
}));

vi.mock('../../../services/rules/rulesFactory.js', () => ({
    default: {
        getRules: vi.fn(() => ({
            classRules: { getUnarmoredMovementIncrease: vi.fn(() => 0) },
        })),
    },
    getRules: vi.fn(() => ({
        classRules: { getUnarmoredMovementIncrease: vi.fn(() => 0) },
    })),
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

const mockPlayerStats = {
    name: 'Thorin',
    xp: 2300,
    xpMode: 'milestone',
    race: { name: 'Dwarf', type: 'Hill Dwarf', subrace: { name: 'Hill Dwarf', speed: 25 } },
    class: {
        name: 'Cleric',
        subclass: { name: 'War', type: 'Choice' },
        major: { name: 'Cleric' },
    },
    level: 5,
    alignment: 'Lawful Good',
    proficiency: 3,
    initiative: 2,
    initiativeAdvantage: false,
    abilities: [
        { name: 'Wisdom', bonus: 3 },
        { name: 'Strength', bonus: 2 },
    ],
    armorClass: 18,
    armorClassFormula: '16 + 2 (shield)',
    hitPoints: 45,
    inventory: { equipped: ['Scale Mail', 'Shield'] },
    equipment: [
        { name: 'Scale Mail', equipment_category: 'Armor' },
        { name: 'Shield', type: 'Shield' },
    ],
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
// Aura of Life resistances
// ---------------------------------------------------------------------------
describe('CharSummary - Aura of Life Resistances', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('renders necrotic resistance when Aura of Life buff is active', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Aura of Life', resistanceTypes: ['necrotic'] },
        ]);
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />
        );
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
    });

    it('renders poison resistance when Aura of Purity buff is active', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Aura of Purity', resistanceTypes: ['poison'] },
        ]);
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />
        );
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
    });

    it('renders poison resistance from Feign Death buff', () => {
        getActiveBuffs.mockReturnValue([
            {
                name: 'Feign Death',
                resistanceTypes: ['poison'],
                conditionImmunity: ['Poisoned'],
            },
        ]);
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />
        );
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
    });

    it('renders poison resistance when Protection from Poison buff is active', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Protection from Poison', resistanceTypes: ['poison'] },
        ]);
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />
        );
        expect(screen.getByText(/Poison/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Stone Skin resistances
// ---------------------------------------------------------------------------
describe('CharSummary - Stone Skin', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('renders bludgeoning resistance from Stone Skin buff', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Stone Skin', resistanceTypes: ['bludgeoning'] },
        ]);
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />
        );
        expect(screen.getByText(/Bludgeoning/)).toBeInTheDocument();
    });

    it('renders piercing resistance from stoneSkinDamageTypes runtime value', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'stoneSkinDamageTypes') return ['piercing'];
            return null;
        });
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />
        );
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
    });

    it('renders cold resistance when Warding Bond effect is active', () => {
        getActiveBuffs.mockReturnValue([
            { effect: 'warding_bond', resistanceTypes: ['cold'] },
        ]);
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />
        );
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
    });

    it('renders fire resistance when Starry Form buff is active', () => {
        getActiveBuffs.mockReturnValue([
            {
                name: 'Starry Form',
                constellation: 'Archer',
                resistanceTypes: ['fire'],
            },
        ]);
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />
        );
        expect(screen.getByText(/Fire/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Superior Defense resistances
// ---------------------------------------------------------------------------
describe('CharSummary - Superior Defense Resistances', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('renders slashing resistance when Superior Defense buff is active', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Superior Defense', resistanceTypes: ['slashing'] },
        ]);
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />
        );
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
    });

    it('renders radiant resistance when Rage of the Gods buff is active', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Rage of the Gods', resistanceTypes: ['radiant'] },
        ]);
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />
        );
        expect(screen.getByText(/Radiant/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Multiple buffs combining resistance types
// ---------------------------------------------------------------------------
describe('CharSummary - Multiple Buff Resistances Combined', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('renders multiple resistance types from different active buffs', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Aura of Life', resistanceTypes: ['necrotic'] },
            { name: 'Aura of Purity', resistanceTypes: ['poison'] },
            { name: 'Stone Skin', resistanceTypes: ['bludgeoning'] },
        ]);
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />
        );
        expect(screen.getByText(/Necrotic/)).toBeInTheDocument();
        expect(screen.getByText(/Poison/)).toBeInTheDocument();
        expect(screen.getByText(/Bludgeoning/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Resistance deduplication: same type from multiple sources
// ---------------------------------------------------------------------------
describe('CharSummary - Resistance Deduplication', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('does not duplicate resistance types that appear from multiple sources', () => {
        // Both Aura of Purity and Feign Death provide poison resistance
        getActiveBuffs.mockReturnValue([
            { name: 'Aura of Purity', resistanceTypes: ['poison'] },
            { name: 'Feign Death', resistanceTypes: ['poison'] },
        ]);
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />
        );
        // The component uses Set to deduplicate, so "Poison" should appear only once
        // Use exact text match to avoid matching "Poisoned" from condition immunity
        const poisonElements = screen.queryAllByText('Poison');
        expect(poisonElements.length).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// Empty buff array produces no buff-derived resistances
// ---------------------------------------------------------------------------
describe('CharSummary - No Active Buffs', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
    });

    it('renders no buff-derived resistances when no buffs are active', () => {
        getActiveBuffs.mockReturnValue([]);
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />
        );
        expect(screen.queryByText(/Necrotic/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Poison/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Bludgeoning/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Cold/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Fire/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Slashing/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Radiant/)).not.toBeInTheDocument();
    });
});
