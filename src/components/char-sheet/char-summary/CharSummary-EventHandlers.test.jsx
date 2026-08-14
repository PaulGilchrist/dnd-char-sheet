// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { useRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { useSyncedState } from '../../../hooks/runtime/useSyncedState.js';
import useTrackedResource from '../../../hooks/runtime/useTrackedResource.js';

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
    default: vi.fn((_key, _name, _init, _deps, _campaign) => ({ current: false, update: vi.fn() })),
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
        getRules: vi.fn(() => ({ classRules: { getUnarmoredMovementIncrease: vi.fn(() => 10) } })),
    },
    getRules: vi.fn(() => ({ classRules: { getUnarmoredMovementIncrease: vi.fn(() => 10) } })),
}));

vi.mock('../../../services/rules/core/attackCalc.js', () => ({
    parseMagicItemName: (name) => ({ baseName: name }),
}));

vi.mock('../../../services/encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(() => ({ creatures: [] })),
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
// Inspiration toggle — uses useTrackedResource
// ---------------------------------------------------------------------------
describe('CharSummary - Inspiration Toggle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders inspiration checkbox as unchecked by default', () => {
        const { container } = render(
            <CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />
        );
        const checkbox = container.querySelector('input[type="checkbox"]');
        expect(checkbox).not.toBeChecked();
    });

    it('toggles inspiration checkbox when clicked', () => {
        const { container } = render(
            <CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />
        );
        const checkbox = container.querySelector('input[type="checkbox"]');
        expect(checkbox.checked).toBe(false);
        fireEvent.change(checkbox, { target: { checked: true } });
        expect(checkbox.checked).toBe(true);
    });

    it('renders checked when useTrackedResource returns true', () => {
        vi.mocked(useTrackedResource).mockImplementation((_key, _name, _init, _deps, _campaign) => ({
            current: true,
            update: vi.fn(),
        }));

        const { container } = render(
            <CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />
        );
        const checkbox = container.querySelector('input[type="checkbox"]');
        expect(checkbox).toBeChecked();

        vi.mocked(useTrackedResource).mockRestore();
    });
});

// ---------------------------------------------------------------------------
// Delete character — handleDeleteCharacter
// ---------------------------------------------------------------------------
describe('CharSummary - Delete Character', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('calls onDeleteCharacter when confirm is accepted', () => {
        const onDelete = vi.fn();
        vi.stubGlobal('confirm', () => true);
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                onDeleteCharacter={onDelete}
            />
        );
        const deleteBtn = screen.getByText('Delete');
        fireEvent.click(deleteBtn);
        expect(onDelete).toHaveBeenCalledWith('Thorin');
    });

    it('does not call onDeleteCharacter when confirm is cancelled', () => {
        const onDelete = vi.fn();
        vi.stubGlobal('confirm', () => false);
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                onDeleteCharacter={onDelete}
            />
        );
        const deleteBtn = screen.getByText('Delete');
        fireEvent.click(deleteBtn);
        expect(onDelete).not.toHaveBeenCalled();
    });

    it.afterEach(() => {
        vi.unstubAllGlobals();
    });
});

// ---------------------------------------------------------------------------
// Ally modal interactions — handleAllyModalOpen
// ---------------------------------------------------------------------------
describe('CharSummary - Ally Modal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders ally badge with count from stored allies', () => {
        vi.mocked(useRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'selectedAllies') return ['Thorin', 'Ally2'];
            return null;
        });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Allies \(2\)/)).toBeInTheDocument();
        vi.mocked(useRuntimeValue).mockRestore();
    });

    it('renders ally badge with single character when no stored allies', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Allies \(1\)/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Initiative handling — handleInitiative
// ---------------------------------------------------------------------------
describe('CharSummary - Initiative Handling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders initiative element as clickable', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const initiativeEl = screen.getByText(/Initiative:/).closest('span.clickable');
        expect(initiativeEl).not.toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Speed calculations — totalSpeedWithBuff (haste, monk, exhaustion)
// ---------------------------------------------------------------------------
describe('CharSummary - Speed Calculations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('doubles speed when haste buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'haste' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('50 ft');
    });

    it('adds monk unarmored movement when no armor or shield', () => {
        const stats = {
            ...mockPlayerStats,
            level: 5,
            class: { name: 'Monk', major: { name: 'Monk' } },
            inventory: { equipped: [] },
            equipment: [],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('35 ft');
    });

    it('does not add monk unarmored movement when wearing armor', () => {
        const stats = {
            ...mockPlayerStats,
            level: 5,
            class: { name: 'Monk', major: { name: 'Monk' } },
            inventory: { equipped: ['Scale Mail'] },
            equipment: [{ name: 'Scale Mail', equipment_category: 'Armor' }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('25 ft');
    });

    it('does not add monk unarmored movement when wielding shield', () => {
        const stats = {
            ...mockPlayerStats,
            level: 5,
            class: { name: 'Monk', major: { name: 'Monk' } },
            inventory: { equipped: ['Shield'] },
            equipment: [{ name: 'Shield', type: 'Shield' }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const speedEl = screen.getByText(/Speed:/).nextElementSibling;
        expect(speedEl.textContent).toContain('25 ft');
    });
});

// ---------------------------------------------------------------------------
// useEffect for initiative-rolled event — clears wild magic surge effects
// ---------------------------------------------------------------------------
describe('CharSummary - Initiative Rolled Event', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('clears surge effects when initiative-rolled event fires', () => {
        const surgeSetter = vi.fn();
        vi.mocked(useSyncedState).mockImplementation((_name, key, defaultValue) => {
            if (key === 'wildMagicSurgeEffects') {
                return [[{ timestamp: 1000, roll: 5, effect: 'Fireball' }], surgeSetter];
            }
            return [defaultValue, vi.fn()];
        });

        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Surge Effects:/)).toBeInTheDocument();

        const event = new Event('initiative-rolled');
        window.dispatchEvent(event);
        expect(surgeSetter).toHaveBeenCalledWith(null);
    });
});
