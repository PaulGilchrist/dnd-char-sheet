// @improved-by-ai
//
// Improved: removed global state mutation, added missing mocks, uses shared
// mock data, added non-null circleFormsACOverride branch coverage, cleaned up
// overly complex mock definitions.
//
// Issues fixed:
//   - Removed window.location.hostname mutation (global state modification)
//   - Added missing '@testing-library/jest-dom' import for toBeInTheDocument()
//   - Uses shared mock data from CharSummary.test-mocks.test.jsx
//   - Added missing mocks: combatData, logService, buffToggle, unbreakableMajesty
//   - Cleaned up rulesFactory mock (removed unnecessary vi.fn() wrappers)
//   - Added circleFormsACOverride non-null branch test (Moon Druid with shape shift)
//   - Removed redundant getActiveBuffs.mockReturnValue([]) from beforeEach
//   - Replaced @cleaned-by-ai marker with @improved-by-ai

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import CharSummary from './CharSummary.jsx';
import { mockPlayerStats, mockCampaignName } from './CharSummary.test-mocks.test.jsx';
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

vi.mock('../../../services/encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(() => ({ creatures: [] })),
}));

vi.mock('../../../services/ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../services/combat/buffs/buffService.js', () => ({
    getActiveBuffs: vi.fn(() => []),
}));

vi.mock('../../../services/rules/rulesFactory.js', () => ({
    default: {
        getRules: () => ({ classRules: { getUnarmoredMovementIncrease: () => 0 } }),
    },
    getRules: () => ({ classRules: { getUnarmoredMovementIncrease: () => 0 } }),
}));

vi.mock('../../../services/rules/core/attackCalc.js', () => ({
    parseMagicItemName: (name) => ({ baseName: name }),
}));

vi.mock('../../../services/automation/common/buffToggle.js', () => ({
    isBuffActive: vi.fn(() => false),
}));

vi.mock('../../../services/combat/auras/unbreakableMajesty.js', () => ({
    isUnbreakableMajestyActive: vi.fn(() => false),
    getUnbreakableMajestySaveDc: vi.fn(() => 0),
}));

// ---------------------------------------------------------------------------
// AC nullish coalescing — both branches (circleFormsACOverride ?? fallback)
// Covers: non-Moon-Druid base AC path AND Moon Druid shape shift override path.
// ---------------------------------------------------------------------------
describe('CharSummary - AC Nullish Coalescing', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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

    it('renders circleFormsACOverride when Moon Druid with shape shift active', () => {
        const moonDruidStats = {
            ...mockPlayerStats,
            class: { name: 'Druid', subclass: { name: 'Moon', type: 'Circle of the Moon' }, major: { name: 'Moon' } },
            abilities: [
                { name: 'Wisdom', bonus: 3 },
                { name: 'Strength', bonus: 2 },
                { name: 'Dexterity', bonus: 2 },
            ],
        };
        getActiveBuffs.mockReturnValue([{ effect: 'shape_shift', name: 'Wild Shape' }]);
        render(<CharSummary playerStats={moonDruidStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        // circleFormsACOverride = 13 + wisMod(3) = 16
        expect(screen.getByText(/Armor Class:/)).toBeInTheDocument();
        expect(screen.getByText(/^16$/)).toBeInTheDocument();
    });
});
