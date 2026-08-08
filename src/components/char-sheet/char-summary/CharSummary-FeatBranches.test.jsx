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
                    prerequisites: {
                        level: 1,
                        ability_scores: [{ name: 'STR', minimum: 16 }],
                        proficiency: 'Heavy Armor',
                    },
                    benefits: [{ description: '+2 HP per level' }],
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
// Feat popup - prerequisites.level false branch (line 635)
// ---------------------------------------------------------------------------
describe('CharSummary - Feat Popup Prerequisites Level False', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('handles feat with prerequisites but no level (line 635 false branch)', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        const stats = {
            ...mockPlayerStats,
            feats: [{
                name: 'War Caster',
                desc: 'Casting spells while armored',
                prerequisites: {
                    ability_scores: [{ name: 'CON', minimum: 13 }],
                    proficiency: 'Heavy Armor',
                },
            }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />, { wrapper });
        const featsBtn = screen.getByTestId('char-feats');
        fireEvent.click(featsBtn);
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const html = mockSetPopupHtml.mock.calls[0][0];
        expect(html).toContain('War Caster');
        expect(html).toContain('CON 13 or higher');
        expect(html).toContain('Proficiency with Heavy Armor');
        expect(html).not.toContain('Level');
    });
});

// ---------------------------------------------------------------------------
// Feat popup - prerequisites.ability_scores false branch (line 638)
// ---------------------------------------------------------------------------
describe('CharSummary - Feat Popup Prerequisites AbilityScores False', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('handles feat with prerequisites but no ability_scores (line 638 false branch)', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        const stats = {
            ...mockPlayerStats,
            feats: [{
                name: 'Skill Expert',
                desc: 'Gain a skill proficiency',
                prerequisites: {
                    level: 4,
                },
            }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />, { wrapper });
        const featsBtn = screen.getByTestId('char-feats');
        fireEvent.click(featsBtn);
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const html = mockSetPopupHtml.mock.calls[0][0];
        expect(html).toContain('Skill Expert');
        expect(html).toContain('Level 4');
        expect(html).not.toContain('or higher');
    });
});

// ---------------------------------------------------------------------------
// Feat popup - prerequisites.proficiency false branch (line 643)
// ---------------------------------------------------------------------------
describe('CharSummary - Feat Popup Prerequisites Proficiency False', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('handles feat with prerequisites but no proficiency (line 643 false branch)', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        const stats = {
            ...mockPlayerStats,
            feats: [{
                name: 'Lucky',
                desc: 'Reroll dice',
                prerequisites: {
                    level: 3,
                    ability_scores: [{ name: 'CHA', minimum: 13 }],
                },
            }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />, { wrapper });
        const featsBtn = screen.getByTestId('char-feats');
        fireEvent.click(featsBtn);
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const html = mockSetPopupHtml.mock.calls[0][0];
        expect(html).toContain('Lucky');
        expect(html).toContain('Level 3');
        expect(html).toContain('CHA 13 or higher');
        expect(html).not.toContain('Proficiency with');
    });
});

// ---------------------------------------------------------------------------
// Feat popup - empty benefits array (line 647 false branch)
// ---------------------------------------------------------------------------
describe('CharSummary - Feat Popup Empty Benefits', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('handles feat with empty benefits array (line 647 false branch)', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        const stats = {
            ...mockPlayerStats,
            feats: [{
                name: 'No Bonus Feat',
                desc: 'Has benefits array but empty',
                benefits: [],
            }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />, { wrapper });
        const featsBtn = screen.getByTestId('char-feats');
        fireEvent.click(featsBtn);
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const html = mockSetPopupHtml.mock.calls[0][0];
        expect(html).toContain('No Bonus Feat');
        expect(html).not.toContain('Benefits');
    });
});

// ---------------------------------------------------------------------------
// Feat popup - empty prerequisites object (lines 633-646 all false)
// ---------------------------------------------------------------------------
describe('CharSummary - Feat Popup Empty Prerequisites', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('handles feat with empty prerequisites object (line 633 true branch, sub-branches all false)', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        const stats = {
            ...mockPlayerStats,
            feats: [{
                name: 'Inspiring Leader',
                desc: 'Inspire allies',
                prerequisites: {},
            }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />, { wrapper });
        const featsBtn = screen.getByTestId('char-feats');
        fireEvent.click(featsBtn);
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const html = mockSetPopupHtml.mock.calls[0][0];
        expect(html).toContain('Inspiring Leader');
        expect(html).toContain('Inspire allies');
        expect(html).toContain('Prerequisites');
    });
});

// ---------------------------------------------------------------------------
// Feat popup - desc is null (line 630 fallback is unreachable dead code)
// ---------------------------------------------------------------------------
describe('CharSummary - Feat Popup Null Desc', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('does not call showPopup when both desc and description are falsy (line 622 false branch)', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        const stats = {
            ...mockPlayerStats,
            feats: [{
                name: 'Mystery Feat',
                desc: null,
            }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />, { wrapper });
        const featsBtn = screen.getByTestId('char-feats');
        fireEvent.click(featsBtn);
        // Line 622: if (feat.desc || feat.description) is false when both are null/falsy
        // So showPopup callback never calls setPopupHtml
        expect(mockSetPopupHtml).not.toHaveBeenCalled();
    });
});
