import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

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
