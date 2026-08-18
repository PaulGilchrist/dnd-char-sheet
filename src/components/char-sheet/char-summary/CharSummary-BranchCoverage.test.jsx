// @cleaned-by-ai
//
// Cleanup: Removed 3 redundant tests (75% reduction).
//
// Removed:
//   - "renders feat with string desc when desc is a string and description is falsy" —
//     duplicate of CharSummary-Prerequisites.test.jsx it.each "level only" which tests
//     string desc rendering with identical HTML assertions (name + desc in popup).
//   - "renders benefits when feat has a non-empty benefits array" —
//     duplicate of CharSummary-Prerequisites.test.jsx it.each "level only" which tests
//     benefits rendering with identical HTML assertions (Benefits header + li items).
//   - "does not call setPopupHtml when feat has no desc and no description" —
//     duplicate of CharSummary-Prerequisites.test.jsx "does not call setPopupHtml when
//     feat has no desc or description" which covers both undefined and null desc in one
//     parameterized test.
//
// All 3 removed tests used the brittle charFeatsShowPopupState callback mechanism
// (capturing the showPopup closure in a shared module-level object) instead of
// testing observable behavior. The same behavioral coverage exists in
// CharSummary-Prerequisites.test.jsx with better assertions and parameterized setup.
//
// Kept:
//   - "renders base armorClass when circleFormsACOverride is null" — unique coverage
//     for the ?? operator fallback path with a non-Moon-Druid character. Not covered
//     by CharSummary-BadgesAndAC.test.jsx (slow penalty), CharSummary-BuffEffects.test.jsx
//     (buff overrides), or CharSummary-Branches.test.jsx (defensive duelist bonus).
//
// Original: 4 tests / 251 lines
// After: 1 test / ~50 lines

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';

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
// AC nullish coalescing — null branch (circleFormsACOverride ?? fallback)
// Unique behavioral coverage: verifies base AC renders when no Moon-Druid
// circle form override is active. Not covered by any other test file.
// ---------------------------------------------------------------------------
describe('CharSummary - AC Nullish Coalescing Null Branch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders base armorClass when circleFormsACOverride is null (non-Moon-Druid)', () => {
        const stats = {
            ...mockPlayerStats,
            class: { name: 'Cleric', subclass: { name: 'War', type: 'Choice' }, major: { name: 'Cleric' } },
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Armor Class:/)).toBeInTheDocument();
        expect(screen.getByText(/^18$/)).toBeInTheDocument();
    });
});
