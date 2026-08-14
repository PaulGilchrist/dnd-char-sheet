// @improved-by-ai
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { getRuntimeValue, useRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

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

vi.mock('../../../services/automation/handlers/buffs/auraOfLifeHandler.js', () => ({
    isAuraOfLifeActive: vi.fn(() => false),
}));

vi.mock('../../../services/automation/handlers/buffs/circleOfPowerHandler.js', () => ({
    isCircleOfPowerActive: vi.fn(() => false),
}));

vi.mock('../../../services/automation/handlers/buffs/deathWardHandler.js', () => ({
    isDeathWardActive: vi.fn(() => false),
}));

vi.mock('../../../services/automation/handlers/buffs/protectionFromEnergyHandler.js', () => ({
    getProtectionFromEnergyDamageType: vi.fn(() => null),
}));

vi.mock('../../../services/automation/handlers/buffs/resistanceHandler.js', () => ({
    getResistanceDamageType: vi.fn(() => null),
}));

vi.mock('../../../services/automation/handlers/buffs/stoneSkinHandler.js', () => ({
    getStoneSkinDamageTypes: vi.fn(() => []),
}));

vi.mock('../../../services/automation/common/buffToggle.js', () => ({
    isBuffActive: vi.fn(() => false),
}));

vi.mock('../../../services/combat/auras/unbreakableMajesty.js', () => ({
    isUnbreakableMajestyActive: vi.fn(() => false),
    getUnbreakableMajestySaveDc: vi.fn(() => 0),
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

    it('renders fiendish resilience type when chosenType is set', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === '_Fiendish_Resilience_chosenType') return 'fire';
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Fire/)).toBeInTheDocument();
    });

    it('does not render fiendish resilience when chosenType is not set', () => {
        vi.mocked(getRuntimeValue).mockReturnValue(null);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Fire/)).not.toBeInTheDocument();
    });

    it('renders different damage types for fiendish resilience', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === '_Fiendish_Resilience_chosenType') return 'poison';
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Poison/)).toBeInTheDocument();
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

    it('renders epitome resistance type when set', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'epitomeResistanceType') return 'lightning';
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Lightning/)).toBeInTheDocument();
    });

    it('does not render epitome resistance when not set', () => {
        vi.mocked(getRuntimeValue).mockReturnValue(null);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Lightning/)).not.toBeInTheDocument();
    });

    it('renders different damage types for epitome resistance', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'epitomeResistanceType') return 'acid';
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Acid/)).toBeInTheDocument();
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

    it('renders all boon energy resistance types when set', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === '_Energy_Resistances_chosenTypes') return ['fire', 'cold'];
            return null;
        });
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === '_Energy_Resistances_chosenTypes') return ['fire', 'cold'];
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Fire/)).toBeInTheDocument();
        expect(screen.getByText(/Cold/)).toBeInTheDocument();
    });

    it('renders single boon energy resistance type when only one is set', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === '_Energy_Resistances_chosenTypes') return ['radiant'];
            return null;
        });
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === '_Energy_Resistances_chosenTypes') return ['radiant'];
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Radiant/)).toBeInTheDocument();
    });

    it('does not render boon energy resistances when empty array', () => {
        vi.mocked(useRuntimeValue).mockReturnValue([]);
        vi.mocked(getRuntimeValue).mockReturnValue([]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Fire/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Cold/)).not.toBeInTheDocument();
    });

    it('does not render boon energy resistances when null', () => {
        vi.mocked(useRuntimeValue).mockReturnValue(null);
        vi.mocked(getRuntimeValue).mockReturnValue(null);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Fire/)).not.toBeInTheDocument();
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

    it('renders elemental adept chosen type from passives', () => {
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

    it('does not render elemental adept when passive is not present', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === '_Elemental_Adept_chosenType') return 'fire';
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Fire/)).not.toBeInTheDocument();
    });

    it('does not render elemental adept when chosenType is not set', () => {
        const stats = {
            ...mockPlayerStats,
            automation: {
                ...mockPlayerStats.automation,
                passives: [
                    { type: 'damage_type_choice', effect: 'elemental_adept', name: 'Elemental Adept' },
                ],
            },
        };
        vi.mocked(getRuntimeValue).mockReturnValue(null);
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Fire/)).not.toBeInTheDocument();
    });

    it('renders different damage types for elemental adept', () => {
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
            if (key === '_Elemental_Adept_chosenType') return 'cold';
            return null;
        });
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Cold/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Resistance deduplication: runtime value types matching base resistances
// ---------------------------------------------------------------------------
describe('CharSummary - Resistance Deduplication', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('does not duplicate fiendish resilience type when already in base resistances', () => {
        const stats = { ...mockPlayerStats, resistances: ['fire'] };
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === '_Fiendish_Resilience_chosenType') return 'fire';
            return null;
        });
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const fireElements = screen.queryAllByText(/Fire/);
        expect(fireElements.length).toBe(1);
    });

    it('does not duplicate epitome type when already in base resistances', () => {
        const stats = { ...mockPlayerStats, resistances: ['lightning'] };
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'epitomeResistanceType') return 'lightning';
            return null;
        });
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const lightningElements = screen.queryAllByText(/Lightning/);
        expect(lightningElements.length).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// Multiple runtime-set resistance types active simultaneously
// ---------------------------------------------------------------------------
describe('CharSummary - Multiple Runtime Resistance Types', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders fiendish resilience and epitome resistance together', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === '_Fiendish_Resilience_chosenType') return 'fire';
            if (key === 'epitomeResistanceType') return 'cold';
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Fire/)).toBeInTheDocument();
        expect(screen.getByText(/Cold/)).toBeInTheDocument();
    });

    it('renders fiendish resilience, epitome, and boon energy types together', () => {
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === '_Fiendish_Resilience_chosenType') return 'fire';
            if (key === 'epitomeResistanceType') return 'lightning';
            if (key === '_Energy_Resistances_chosenTypes') return ['poison', 'radiant'];
            return null;
        });
        vi.mocked(useRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === '_Energy_Resistances_chosenTypes') return ['poison', 'radiant'];
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Fire/)).toBeInTheDocument();
        expect(screen.getByText(/Lightning/)).toBeInTheDocument();
        expect(screen.getByText(/Poison/)).toBeInTheDocument();
        expect(screen.getByText(/Radiant/)).toBeInTheDocument();
    });
});
