import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { getCombatSummary } from '../../../services/encounters/combatData.js';
import { isAuraOfLifeActive } from '../../../services/automation/handlers/buffs/auraOfLifeHandler.js';
import { isCircleOfPowerActive } from '../../../services/automation/handlers/buffs/circleOfPowerHandler.js';
import { isDeathWardActive } from '../../../services/automation/handlers/buffs/deathWardHandler.js';
import { isUnbreakableMajestyActive, getUnbreakableMajestySaveDc } from '../../../services/combat/auras/unbreakableMajesty.js';
import { isBuffActive } from '../../../services/automation/common/buffToggle.js';
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

vi.mock('../../../services/encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(() => ({ creatures: [] })),
}));

vi.mock('../../../services/automation/handlers/buffs/auraOfLifeHandler.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        isAuraOfLifeActive: vi.fn(() => false),
    };
});

vi.mock('../../../services/automation/handlers/buffs/circleOfPowerHandler.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        isCircleOfPowerActive: vi.fn(() => false),
    };
});

vi.mock('../../../services/automation/handlers/buffs/deathWardHandler.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        isDeathWardActive: vi.fn(() => false),
    };
});

vi.mock('../../../services/combat/auras/unbreakableMajesty.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        isUnbreakableMajestyActive: vi.fn(() => false),
        getUnbreakableMajestySaveDc: vi.fn(() => 0),
    };
});

vi.mock('../../../services/automation/common/buffToggle.js', () => ({
    isBuffActive: vi.fn(() => false),
}));

vi.mock('../../../services/rules/rulesFactory.js', () => ({
    default: {
        getRules: vi.fn(() => ({ classRules: { getUnarmoredMovementIncrease: vi.fn(() => 0) } })),
    },
    getRules: vi.fn(() => ({ classRules: { getUnarmedMovementIncrease: vi.fn(() => 0) } })),
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
// CharSummary - Badge Rendering (char-summary-badges section)
// ---------------------------------------------------------------------------
describe('CharSummary - Badge Rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
        vi.mocked(useRuntimeValue).mockReturnValue(null);
        vi.mocked(getRuntimeValue).mockReturnValue(null);
    });

    it('renders Wild Shape badge when wild shape is active', () => {
        isBuffActive.mockImplementation((name, buff, _campaign) => {
            if (buff === 'Wild Shape') return true;
            return false;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText('Wild Shape')).toBeInTheDocument();
    });

    it('does not render Wild Shape badge when wild shape is inactive', () => {
        isBuffActive.mockReturnValue(false);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText('Wild Shape')).not.toBeInTheDocument();
    });

    it('renders Aura of Life badge when active', () => {
        isAuraOfLifeActive.mockReturnValue(true);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText('Aura of Life')).toBeInTheDocument();
    });

    it('does not render Aura of Life badge when inactive', () => {
        isAuraOfLifeActive.mockReturnValue(false);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText('Aura of Life')).not.toBeInTheDocument();
    });

    it('renders Circle of Power badge when active', () => {
        isCircleOfPowerActive.mockReturnValue(true);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText('Circle of Power')).toBeInTheDocument();
    });

    it('does not render Circle of Power badge when inactive', () => {
        isCircleOfPowerActive.mockReturnValue(false);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText('Circle of Power')).not.toBeInTheDocument();
    });

    it('renders Majesty badge with DC when active', () => {
        isUnbreakableMajestyActive.mockReturnValue(true);
        getUnbreakableMajestySaveDc.mockReturnValue(15);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Majesty DC 15/)).toBeInTheDocument();
    });

    it('does not render Majesty badge when inactive', () => {
        isUnbreakableMajestyActive.mockReturnValue(false);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Majesty DC/)).not.toBeInTheDocument();
    });

    it('renders Wrath of the Sea badge when active', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'wrathOfTheSeaActive') return true;
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText('Wrath of the Sea')).toBeInTheDocument();
    });

    it('does not render Wrath of the Sea badge when inactive', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'wrathOfTheSeaActive') return false;
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText('Wrath of the Sea')).not.toBeInTheDocument();
    });

    it('renders Sanctuary badge when sanctuary info exists', () => {
        const mockCombatSummary = {
            creatures: [
                {
                    name: 'DruidFriend',
                    type: 'player',
                    computedStats: {
                        automation: { passives: [] }
                    }
                }
            ]
        };
        vi.mocked(getCombatSummary).mockReturnValue(mockCombatSummary);
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (name === 'DruidFriend' && key === 'naturesSanctuaryActive') return true;
            if (name === 'DruidFriend' && key === 'naturesSanctuaryCreatures') return ['Thorin'];
            if (name === 'DruidFriend' && key === 'naturesSanctuaryResistance') return 'fire';
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} characters={[{ name: 'DruidFriend', type: 'player' }]} />);
        expect(screen.getByText('Sanctuary')).toBeInTheDocument();
    });

    it('does not render Sanctuary badge when no sanctuary info', () => {
        vi.mocked(getRuntimeValue).mockReturnValue(null);
        vi.mocked(getCombatSummary).mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText('Sanctuary')).not.toBeInTheDocument();
    });

    it('renders Reckless Attack badge when target effect exists', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'targetEffects') return [{ target: ['Thorin'], effect: 'reckless_attack' }];
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText('Reckless Attack')).toBeInTheDocument();
    });

    it('does not render Reckless Attack badge when no target effect', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'targetEffects') return [];
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText('Reckless Attack')).not.toBeInTheDocument();
    });

    it('renders Barkskin badge when barkskin is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'barkskin' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText('Barkskin (AC 17)')).toBeInTheDocument();
    });

    it('does not render Barkskin badge when inactive', () => {
        getActiveBuffs.mockReturnValue([]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText('Barkskin (AC 17)')).not.toBeInTheDocument();
    });

    it('renders Death Ward badge when active', () => {
        isDeathWardActive.mockReturnValue(true);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText('Death Ward')).toBeInTheDocument();
    });

    it('does not render Death Ward badge when inactive', () => {
        isDeathWardActive.mockReturnValue(false);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText('Death Ward')).not.toBeInTheDocument();
    });

    it('renders Hunters Mark badge when marked by another creature', () => {
        const mockCombatSummary = {
            creatures: [
                {
                    name: 'RangerFriend',
                    type: 'player',
                    concentration: { spell: "Hunter's Mark", target: 'Thorin' }
                }
            ]
        };
        vi.mocked(getCombatSummary).mockReturnValue(mockCombatSummary);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText("Hunter's Mark")).toBeInTheDocument();
    });

    it('does not render Hunters Mark badge when not marked', () => {
        vi.mocked(getCombatSummary).mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText("Hunter's Mark")).not.toBeInTheDocument();
    });

    it('renders Heroes Feast badge when resistances exist', () => {
        getActiveBuffs.mockReturnValue([
            { name: "Heroes' Feast", resistanceTypes: ['poison'], conditionImmunity: ['Frightened'] }
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText("Heroes' Feast")).toBeInTheDocument();
    });

    it('does not render Heroes Feast badge when no resistances', () => {
        getActiveBuffs.mockReturnValue([]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText("Heroes' Feast")).not.toBeInTheDocument();
    });

    it('renders concentration badge when concentration exists on creature', () => {
        const mockCombatSummary = {
            creatures: [
                {
                    name: 'Thorin',
                    type: 'player',
                    concentration: { spell: 'Fireball', dc: 15 }
                }
            ]
        };
        vi.mocked(getCombatSummary).mockReturnValue(mockCombatSummary);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Fireball DC 15/)).toBeInTheDocument();
    });

    it('does not render concentration badge when no concentration', () => {
        const mockCombatSummary = {
            creatures: [
                {
                    name: 'Thorin',
                    type: 'player'
                }
            ]
        };
        vi.mocked(getCombatSummary).mockReturnValue(mockCombatSummary);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/DC/)).not.toBeInTheDocument();
    });
});
