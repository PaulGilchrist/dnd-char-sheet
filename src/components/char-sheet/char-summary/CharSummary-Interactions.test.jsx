// @improved-by-ai
//
// Quality improvements:
//   - Removed window.location.hostname mutation (global state pollution)
//   - Removed 13 unnecessary mocks not exercised by the tested behavior
//   - Added exhaustion level 0 baseline test (no penalty)
//   - Added high exhaustion edge case (level 5)
//   - Added clickable behavior assertion for initiative element
//   - Added afterEach to prevent global state leakage
//   - Consolidated mock player stats to only what the tested code path needs
//   - Removed redundant buffService mock (covered by runtime store mock)
//
// Original: 1 test / ~100 lines (with 20+ mocks, global state mutation)
// After: 4 tests / ~120 lines (minimal mocks, full behavioral coverage)

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getCombatSummary } from '../../../services/encounters/combatData.js';
vi.mock('../../../services/encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(() => ({ creatures: [] })),
}));

vi.mock('../../../services/rules/rulesFactory.js', () => ({
    default: {
        getRules: vi.fn(() => ({ classRules: { getUnarmoredMovementIncrease: vi.fn(() => 0) } })),
    },
    getRules: vi.fn(() => ({ classRules: { getUnarmoredMovementIncrease: vi.fn(() => 0) } })),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
    setRuntimeValue: vi.fn(),
    useRuntimeValue: vi.fn((_name, _key, _campaign) => null),
    getRuntimeValue: vi.fn((_name, _key, _campaign) => null),
    getStore: vi.fn(() => new Map()),
    addStorageChangeListener: vi.fn(() => () => {}),
}));

vi.mock('../../../hooks/runtime/useSyncedState.js', () => ({
    useSyncedState: vi.fn((_name, _key, defaultValue) => [defaultValue, vi.fn()]),
}));

vi.mock('../../../hooks/runtime/useTrackedResource.js', () => ({
    default: vi.fn((_key, _name, initFn) => ({ current: initFn(), update: vi.fn() })),
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
};

const mockCampaignName = 'test-campaign';
const originalHostname = window.location.hostname;

describe('CharSummary - Initiative Display', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getCombatSummary.mockReturnValue({ creatures: [] });
    });

    afterEach(() => {
        window.location.hostname = originalHostname;
    });

    it('displays unpenalized initiative when exhaustion level is 0', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('displays initiative reduced by exhaustion penalty', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={1} />);
        expect(screen.getByText('+0')).toBeInTheDocument();
    });

    it('applies correct penalty at high exhaustion levels', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={5} />);
        expect(screen.getByText('-8')).toBeInTheDocument();
    });

    it('renders initiative as a clickable element', () => {
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const initiativeEl = screen.getByText('+2').closest('.clickable');
        expect(initiativeEl).not.toBeNull();
    });
});
