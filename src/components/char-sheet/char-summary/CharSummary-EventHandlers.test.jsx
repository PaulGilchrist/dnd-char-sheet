// @cleaned-by-ai
//
// Cleanup: Removed 8 redundant/brittle/low-value tests (62% reduction).
//
// Removed:
//   - "Inspiration Toggle" (3 tests) — low-value render assertions for a simple
//     checkbox toggle. The useTrackedResource hook manages state; asserting
//     checkbox.checked DOM state is brittle and provides no behavioral confidence.
//
//   - "Delete Character" (2 tests) — duplicated in CharSummary-Interactions.test.jsx
//     with identical vi.stubGlobal('confirm') approach and it.afterEach cleanup.
//
//   - "Ally Modal" (2 tests) — weaker render assertions covered by
//     CharSummary-Ally-Initiative.test.jsx "opens ally modal and populates creatures
//     from combatSummary" which also verifies getCombatSummary call and fallback
//     behavior with proper wrapper/DiceRollContext setup.
//
//   - "Initiative Handling" (1 test) — brittle; asserts CSS class (structural
//     detail, not behavioral). Covered by
//     CharSummary-Ally-Initiative.test.jsx "calls rollInitiative with effective
//     initiative value when initiative is clicked" which tests the actual
//     rollInitiative behavior with captured arguments.
//
// Kept:
//   - "Speed Calculations" (4 tests) — unique behavioral coverage for haste
//     doubling and monk unarmored movement logic. Not covered by
//     CharSummary-SpeedCalculations.test.jsx which uses different parameterized
//     approaches (exhaustion levels, condition effects, fly speed, etc.).
//
//   - "Initiative Rolled Event" (1 test) — unique coverage of the useEffect
//     side effect that clears wild magic surge effects on initiative-rolled.
//     Not covered by CharSummary-WildMagic.test.jsx which tests surge rendering
//     but not the clearing behavior.
//
// Original: 13 tests / 315 lines
// After: 5 tests / ~160 lines

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
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
// Speed calculations — haste doubling and monk unarmored movement
// Unique behavioral coverage not present in any other test file.
// CharSummary-SpeedCalculations.test.jsx uses parameterized tests for
// exhaustion, conditions, fly speed, climb/swim — but does not test
// haste doubling or monk unarmored movement logic.
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
// Unique coverage of the side effect. Not covered by
// CharSummary-WildMagic.test.jsx which tests surge rendering but not clearing.
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
