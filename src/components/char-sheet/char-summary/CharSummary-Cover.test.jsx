// @cleaned-by-ai
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

vi.mock('./CharGold.jsx', () => ({ default: () => <div data-testid="char-gold">Gold</div> }));
vi.mock('./CharHitPoints.jsx', () => ({ default: () => <div data-testid="char-hp">HP</div> }));
vi.mock('./CharClassFeatures.jsx', () => ({ default: () => <div data-testid="char-class-features">Class Features</div> }));
vi.mock('./CharRaceFeatures.jsx', () => ({ default: () => <div data-testid="char-race-features">Race Features</div> }));
vi.mock('./CharFeatFeatures.jsx', () => ({ default: () => <div data-testid="char-feat-features">Feat Features</div> }));
vi.mock('../char-feats/CharFeats.jsx', () => ({ default: () => <div data-testid="char-feats">Feats</div> }));
vi.mock('../../common/AvatarImage.jsx', () => ({ default: () => <div data-testid="avatar-image">Avatar</div> }));
vi.mock('../../common/AvatarModal.jsx', () => ({ default: () => null }));
vi.mock('../../common/AllySelectionModal.jsx', () => ({ default: () => <div data-testid="ally-selection-modal">Ally Selection</div> }));
vi.mock('./TrackedResourceInput.jsx', () => ({ default: () => <div data-testid="tracked-resource-input">Tracked Resource</div> }));
vi.mock('../LongRestButton.jsx', () => ({ default: () => <div data-testid="long-rest-btn">Long Rest</div> }));
vi.mock('../ShortRestButton.jsx', () => ({ default: () => <div data-testid="short-rest-btn">Short Rest</div> }));
vi.mock('../ShortRestModal.jsx', () => ({ default: () => <div data-testid="short-rest-modal">Short Rest Modal</div> }));
vi.mock('./CharConditions.jsx', () => ({ default: () => <div data-testid="char-conditions">Conditions</div> }));
vi.mock('../../initiative/ConditionEffectBadges.jsx', () => ({ default: () => <div data-testid="condition-effect-badges">Badges</div> }));

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
    handle: vi.fn(),
    isAuraOfLifeActive: vi.fn(() => false),
}));

vi.mock('../../../services/automation/handlers/buffs/circleOfPowerHandler.js', () => ({
    handle: vi.fn(),
    isCircleOfPowerActive: vi.fn(() => false),
}));

vi.mock('../../../services/automation/handlers/buffs/deathWardHandler.js', () => ({
    handle: vi.fn(),
    isDeathWardActive: vi.fn(() => false),
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
// Cover source badges - smiteOfProtection DOM rendering
// Cover badges render inline in the AC line as "(+2 Cover: Smite of Protection)"
// ---------------------------------------------------------------------------
describe('CharSummary - smiteOfProtection cover badge rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders smiteOfProtection cover badge when another character has smite active with Aura of Protection', () => {
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
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={[otherCharacter]}
            />
        );
        expect(screen.getByText(/Cover: Smite of Protection/)).toBeInTheDocument();
    });

    it('does not render smiteOfProtection cover badge when Aura of Protection is missing', () => {
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
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={[otherCharacter]}
            />
        );
        expect(screen.queryByText(/Cover: Smite of Protection/)).not.toBeInTheDocument();
    });

    it('does not render smiteOfProtection cover badge when smite is not active', () => {
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
            if (key === 'smiteOfProtectionActive') return false;
            return null;
        });
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={[otherCharacter]}
            />
        );
        expect(screen.queryByText(/Cover: Smite of Protection/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Cover source badges - bulwarkOfForce DOM rendering
// ---------------------------------------------------------------------------
describe('CharSummary - bulwarkOfForce cover badge rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders bulwarkOfForce cover badge when target list includes player', () => {
        const otherCharacter = {
            name: 'Ally',
            type: 'player',
        };
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'bulwarkOfForceActive') return true;
            if (key === 'bulwarkOfForceTargets') return ['Thorin'];
            return null;
        });
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={[otherCharacter]}
            />
        );
        expect(screen.getByText(/Cover: Bulwark of Force/)).toBeInTheDocument();
    });

    it('does not render bulwarkOfForce cover badge when target list does not include player', () => {
        const otherCharacter = {
            name: 'Ally',
            type: 'player',
        };
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'bulwarkOfForceActive') return true;
            if (key === 'bulwarkOfForceTargets') return ['Other'];
            return null;
        });
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={[otherCharacter]}
            />
        );
        expect(screen.queryByText(/Cover: Bulwark of Force/)).not.toBeInTheDocument();
    });

    it('does not render bulwarkOfForce cover badge when bulwark is not active', () => {
        const otherCharacter = {
            name: 'Ally',
            type: 'player',
        };
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'bulwarkOfForceActive') return false;
            if (key === 'bulwarkOfForceTargets') return ['Thorin'];
            return null;
        });
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={[otherCharacter]}
            />
        );
        expect(screen.queryByText(/Cover: Bulwark of Force/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Cover source badges - naturesSanctuary DOM rendering
// ---------------------------------------------------------------------------
describe('CharSummary - naturesSanctuary cover badge rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders naturesSanctuary cover badge when sanctuary creatures list includes player', () => {
        const otherCharacter = {
            name: 'Ally',
            type: 'player',
        };
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'naturesSanctuaryCreatures') return ['Thorin'];
            return null;
        });
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={[otherCharacter]}
            />
        );
        expect(screen.getByText(/Cover: Nature's Sanctuary/)).toBeInTheDocument();
    });

    it('does not render naturesSanctuary cover badge when player is not in sanctuary list', () => {
        const otherCharacter = {
            name: 'Ally',
            type: 'player',
        };
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'naturesSanctuaryCreatures') return ['Other'];
            return null;
        });
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={[otherCharacter]}
            />
        );
        expect(screen.queryByText(/Cover: Nature's Sanctuary/)).not.toBeInTheDocument();
    });

    it('does not render naturesSanctuary cover badge when creatures list is empty', () => {
        const otherCharacter = {
            name: 'Ally',
            type: 'player',
        };
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'naturesSanctuaryCreatures') return [];
            return null;
        });
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={[otherCharacter]}
            />
        );
        expect(screen.queryByText(/Cover: Nature's Sanctuary/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Cover badges - null/undefined/characters handling
// Consolidated from 3 redundant tests (null, undefined, empty) → 1 parameterized test.
// All three states assert the same behavior: cover badges absent when characters
// is falsy or empty. Testing all three adds no unique confidence.
// ---------------------------------------------------------------------------
describe('CharSummary - cover badges with no characters', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it.each([
        [null, 'null'],
        [undefined, 'undefined'],
        [[], 'empty array'],
    ])('renders without cover badges when characters is %s', (characters) => {
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={characters}
            />
        );
        expect(screen.queryByText(/Cover: Smite of Protection/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Cover: Bulwark of Force/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Cover: Nature's Sanctuary/)).not.toBeInTheDocument();
    });
});
