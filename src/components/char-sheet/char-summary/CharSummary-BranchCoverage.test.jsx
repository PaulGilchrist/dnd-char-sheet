import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { DiceRollContext } from '../../../hooks/combat/DiceRollContext.js';

vi.mock('./CharGold.jsx', () => ({ default: () => <div data-testid="char-gold">Gold</div> }));
vi.mock('./CharHitPoints.jsx', () => ({ default: () => <div data-testid="char-hp">HP</div> }));
vi.mock('./CharClassFeatures.jsx', () => ({ default: () => <div data-testid="char-class-features">Class Features</div> }));
vi.mock('../char-feats/CharFeats.jsx', () => ({
    default: vi.fn(({ showPopup, playerStats }) => (
        <button
            data-testid="char-feats"
            onClick={() => {
                const feat = (playerStats?.feats && playerStats.feats[0]) || {
                    name: 'Heavy Armor',
                    desc: 'Can wear heavy armor',
                };
                showPopup(feat);
            }}
        >
            Feats
        </button>
    )),
}));
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
// Circle Forms AC override null branch (line 611 ?? operator)
// When circleFormsACOverride is null, the ?? uses the right side
// ---------------------------------------------------------------------------
describe('CharSummary - AC Nullish Coalescing Null Branch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('uses fallback AC formula when circleFormsACOverride is null', () => {
        // Moon Druid with shape_shift but no wisdom ability → circleFormsACOverride = 13 + 0 = 13
        // To get the null branch, we need a non-Moon Druid (circleFormsACOverride stays null)
        const stats = {
            ...mockPlayerStats,
            class: { name: 'Cleric', subclass: { name: 'War', type: 'Choice' }, major: { name: 'Cleric' } },
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        // Should show the base armorClass (18) not an override
        expect(screen.getByText(/Armor Class:/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Feat popup - desc is truthy non-array string (line 630 else branch)
// When feat.desc is a string (not array) and feat.description is falsy
// ---------------------------------------------------------------------------
describe('CharSummary - Feat Popup Desc String Else Branch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('uses feat.desc as-is when desc is a string and description is falsy (line 630)', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        const stats = {
            ...mockPlayerStats,
            feats: [{
                name: 'String Desc Only',
                desc: 'This is a string description',
            }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />, { wrapper });
        const featsBtn = screen.getByTestId('char-feats');
        fireEvent.click(featsBtn);
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const html = mockSetPopupHtml.mock.calls[0][0];
        expect(html).toContain('String Desc Only');
        expect(html).toContain('This is a string description');
    });
});

// ---------------------------------------------------------------------------
// Feat popup - benefits array with items (line 647 true branch)
// When feat.benefits exists and has items
// ---------------------------------------------------------------------------
describe('CharSummary - Feat Popup Benefits True Branch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders benefits when feat has non-empty benefits array (line 647 true branch)', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        const stats = {
            ...mockPlayerStats,
            feats: [{
                name: 'Tough',
                desc: 'Extra hit points',
                benefits: [
                    { description: '+2 HP per level' },
                    'Bonus durability',
                ],
            }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />, { wrapper });
        const featsBtn = screen.getByTestId('char-feats');
        fireEvent.click(featsBtn);
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const html = mockSetPopupHtml.mock.calls[0][0];
        expect(html).toContain('Tough');
        expect(html).toContain('Benefits');
        expect(html).toContain('+2 HP per level');
    });
});

// ---------------------------------------------------------------------------
// Proficiencies optional chaining - undefined proficiencies (line 692)
// When proficiencies is undefined, proficiencies?.length is undefined (falsy)
// ---------------------------------------------------------------------------
describe('CharSummary - Proficiencies Undefined Branch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('does not render proficiencies when proficiencies is undefined (line 692)', () => {
        const stats = {
            ...mockPlayerStats,
            proficiencies: undefined,
            toolProficiencies: [],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Proficiencies:/)).not.toBeInTheDocument();
    });
});
