// @improved-by-ai
//
// Quality improvements:
//   - Replaced window.location.hostname mutation with Object.defineProperty
//     (isolated, reversible, doesn't leak to sibling tests).
//   - Removed redundant getActiveBuffs.mockReturnValue([]) from beforeEach
//     (module-level mock already returns []).
//   - Fixed ally modal confirm test: added proper microtask await so the
//     async addEntry rejection propagates before assertions run.
//   - Added assertion that setRuntimeValue is called even when addEntry rejects.
//   - Added second click to inspiration toggle to verify bidirectional toggle.
//   - Cleaned up rulesFactory mock (removed duplicate named export).
//   - Fixed useTrackedResource mock signature to include campaign parameter.
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { addEntry } from '../../../services/ui/logService.js';
import { setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
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
    default: vi.fn((_key, _name, init, _deps, _campaign) => ({ current: init(), update: vi.fn() })),
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
    let locationDef;
    let originalHostname;

    beforeEach(() => {
        vi.clearAllMocks();
        // window.location.hostname is non-configurable in JSDOM, so we
        // replace the entire location object via defineProperty on window.
        locationDef = Object.getOwnPropertyDescriptor(window, 'location');
        originalHostname = window.location.hostname;
        Object.defineProperty(window, 'location', {
            value: { ...window.location, hostname: 'localhost' },
            writable: true,
            configurable: true,
        });
    });

    afterEach(() => {
        if (locationDef) {
            Object.defineProperty(window, 'location', locationDef);
        } else {
            // Fallback: restore the original hostname via direct assignment.
            window.location.hostname = originalHostname;
        }
    });

    it('toggles hasInspiration from false to true on first checkbox click', () => {
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

    it('toggles hasInspiration from true to false on second checkbox click', () => {
        let inspirationValue = true;
        const setHasInspirationMock = vi.fn((val) => { inspirationValue = val; });
        vi.mocked(useTrackedResource).mockReturnValue({ current: inspirationValue, update: setHasInspirationMock });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeChecked();
        fireEvent.click(checkbox);
        expect(setHasInspirationMock).toHaveBeenCalledWith(false);
        expect(inspirationValue).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Ally modal confirm error handler
// ---------------------------------------------------------------------------
describe('CharSummary - Ally Modal Confirm Error Handler', () => {
    let locationDef;
    let originalHostname;

    beforeEach(() => {
        vi.clearAllMocks();
        locationDef = Object.getOwnPropertyDescriptor(window, 'location');
        originalHostname = window.location.hostname;
        Object.defineProperty(window, 'location', {
            value: { ...window.location, hostname: 'localhost' },
            writable: true,
            configurable: true,
        });
    });

    afterEach(() => {
        if (locationDef) {
            Object.defineProperty(window, 'location', locationDef);
        } else {
            window.location.hostname = originalHostname;
        }
    });

    it('logs error via console.error and closes modal when addEntry rejects', async () => {
        addEntry.mockRejectedValue(new Error('log failed'));
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const alliesBadge = screen.getByText(/Allies/);
        fireEvent.click(alliesBadge);
        const confirmBtn = screen.getByTestId('ally-confirm');
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        fireEvent.click(confirmBtn);
        // addEntry returns a rejected promise; flush microtask queue so the
        // .catch() handler inside handleAllyModalConfirm executes before assertions.
        await Promise.resolve();
        await Promise.resolve();
        expect(consoleErrorSpy).toHaveBeenCalledWith('[CharSummary] Error logging ally selection:', expect.any(Error));
        // Modal should be removed from DOM (setShowAllyModal(false) fires before addEntry).
        expect(screen.queryByTestId('ally-selection-modal')).not.toBeInTheDocument();
        // setRuntimeValue should still be called even when logging fails.
        expect(setRuntimeValue).toHaveBeenCalledWith(
            'Thorin',
            'selectedAllies',
            ['Thorin'],
            'test-campaign'
        );
        consoleErrorSpy.mockRestore();
    });
});
