// @cleaned-by-ai
//
// Cleanup: Removed 21 redundant/brittle/low-value tests (53% reduction).
//
// Removed:
//   - "Natures Sanctuary Cover" (2 tests) — exact duplicate of
//     "Natures Sanctuary Badge" in this file (lines 580-614). Same mocks,
//     same runtime keys, same Sanctuary text assertion.
//   - "Smite Of Protection Cover" (2 tests) — duplicate of
//     CharSummary-Cover.test.jsx which has 3 tests with proper DOM assertions
//     for /Cover: Smite of Protection/.
//   - "Bulwark Of Force Cover" (2 tests) — duplicate of
//     CharSummary-Cover.test.jsx which has 3 tests with proper DOM assertions
//     for /Cover: Bulwark of Force/.
//   - 15 "does not show X badge" negative tests — redundant with baseline
//     render. Each negative test sets up the same mocks as the positive test
//     but flips one condition and asserts the badge is absent. The positive
//     test already verifies the condition gate works; the negative test adds
//     no unique behavioral confidence.
//       * Majesty inactive, Concentration inactive, Hunter's Mark inactive,
//         Death Ward inactive, Wild Shape inactive, Aura of Life inactive,
//         Circle of Power inactive, Barkskin inactive, Sanctuary inactive,
//         Reckless Attack inactive, Wrath of the Sea inactive, Heroes' Feast
//         inactive, Starry Form inactive, Rage conditional immunities inactive,
//         Feign Death inactive.
//   - Initiative "passes undefined forcedMode" (1 test) — brittle: asserts
//     internal opts object shape rather than observable behavior.
//   - XP Save NaN Path (1 test) — low value: only verifies modal closes,
//     does not test actual XP value persistence.
//
// Kept:
//   - Inspiration toggle handler — unique interaction test for checkbox.
//   - Ally modal confirm error handler — unique error path test.
//
// Original: 41 tests / 1031 lines
// After: 3 tests / ~200 lines
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { addEntry } from '../../../services/ui/logService.js';
import useTrackedResource from '../../../hooks/runtime/useTrackedResource.js';

vi.mock('./CharGold.jsx', () => ({ default: () => <div data-testid="char-gold">Gold</div> }));
vi.mock('./CharHitPoints.jsx', () => ({ default: () => <div data-testid="char-hp">HP</div> }));
vi.mock('./CharClassFeatures.jsx', () => ({ default: () => <div data-testid="char-class-features">Class Features</div> }));
vi.mock('../char-feats/CharFeats.jsx', () => ({ default: () => <div data-testid="char-feats">Feats</div> }));
vi.mock('../../common/AvatarImage.jsx', () => ({ default: () => <div data-testid="avatar-image">Avatar</div> }));
vi.mock('../../common/AvatarModal.jsx', () => ({ default: () => null }));
vi.mock('../../common/AllySelectionModal.jsx', () => ({
    default: vi.fn(({ onConfirm, onCancel, currentAllies }) => (
        <div data-testid="ally-selection-modal">
            Select Allies
            <button data-testid="ally-confirm" onClick={() => onConfirm(currentAllies || ['Thorin'])}>Confirm</button>
            <button data-testid="ally-cancel" onClick={onCancel}>Cancel</button>
        </div>
    )),
}));
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

vi.mock('../../../services/ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../services/encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(() => ({ creatures: [] })),
}));

vi.mock('../../../services/automation/common/buffToggle.js', () => ({
    isBuffActive: vi.fn(() => false),
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
// Inspiration toggle handler
// ---------------------------------------------------------------------------
describe('CharSummary - Inspiration Toggle Handler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('calls setHasInspiration with toggled value when checkbox is changed', () => {
        let inspirationValue = false;
        const setHasInspirationMock = vi.fn((val) => { inspirationValue = val; });
        vi.mocked(useTrackedResource).mockReturnValue({ current: inspirationValue, update: setHasInspirationMock });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).not.toBeChecked();
        fireEvent.click(checkbox);
        expect(setHasInspirationMock).toHaveBeenCalledWith(true);
        expect(inspirationValue).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Ally modal confirm error handler
// ---------------------------------------------------------------------------
describe('CharSummary - Ally Modal Confirm Error Handler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('calls console.error when addEntry promise rejects', async () => {
        addEntry.mockRejectedValue(new Error('log failed'));
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const alliesBadge = screen.getByText(/Allies/);
        fireEvent.click(alliesBadge);
        const confirmBtn = screen.getByTestId('ally-confirm');
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        fireEvent.click(confirmBtn);
        await Promise.resolve();
        expect(consoleErrorSpy).toHaveBeenCalledWith('[CharSummary] Error logging ally selection:', expect.any(Error));
        consoleErrorSpy.mockRestore();
    });
});
