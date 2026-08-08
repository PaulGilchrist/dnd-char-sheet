import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { DiceRollContext } from '../../../hooks/combat/DiceRollContext.js';
import { getCombatSummary } from '../../../services/encounters/combatData.js';

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
vi.mock('../../common/AvatarImage.jsx', () => ({
    default: vi.fn(({ onClick }) => (
        <div data-testid="avatar-image" onClick={onClick}>Avatar</div>
    )),
}));
vi.mock('../../common/AvatarModal.jsx', () => ({
    default: vi.fn(({ onClose }) => (
        <div data-testid="avatar-modal">
            Avatar Modal
            <button data-testid="avatar-modal-close" onClick={onClose}>Close</button>
        </div>
    )),
}));
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
vi.mock('../ShortRestButton.jsx', () => ({
    default: vi.fn(({ onClick }) => (
        <button data-testid="short-rest-btn" onClick={onClick}>Short Rest</button>
    )),
}));
vi.mock('../ShortRestModal.jsx', () => {
    const mockDefault = vi.fn(({ onClose, onComplete }) => (
        <div data-testid="short-rest-modal">
            Short Rest Modal
            <button data-testid="short-rest-modal-close" onClick={() => { onClose(); onComplete?.(); }}>Close</button>
        </div>
    ));
    return { default: mockDefault };
});
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

vi.mock('../../../services/encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(() => ({ creatures: [] })),
}));

vi.mock('../../../services/ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
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
// Feat popup prerequisite branch coverage (lines 633-646)
// ---------------------------------------------------------------------------
describe('CharSummary - Feat Popup Prerequisite Branch Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('generates HTML with only level prerequisite (ability_scores=false, proficiency=false)', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        const stats = {
            ...mockPlayerStats,
            feats: [{
                name: 'Heavy Armor',
                desc: 'Can wear heavy armor',
                prerequisites: {
                    level: 1,
                },
            }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />, { wrapper });
        const featsBtn = screen.getByTestId('char-feats');
        fireEvent.click(featsBtn);
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const html = mockSetPopupHtml.mock.calls[0][0];
        expect(html).toContain('Heavy Armor');
        expect(html).toContain('Level 1');
        expect(html).not.toContain('or higher');
        expect(html).not.toContain('Proficiency with');
    });

    it('generates HTML with only ability_scores prerequisite (level=false, proficiency=false)', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        const stats = {
            ...mockPlayerStats,
            feats: [{
                name: 'Heavy Armor',
                desc: 'Can wear heavy armor',
                prerequisites: {
                    ability_scores: [{ name: 'STR', minimum: 16 }],
                },
            }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />, { wrapper });
        const featsBtn = screen.getByTestId('char-feats');
        fireEvent.click(featsBtn);
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const html = mockSetPopupHtml.mock.calls[0][0];
        expect(html).toContain('Heavy Armor');
        expect(html).toContain('STR 16 or higher');
        expect(html).not.toContain('Level');
        expect(html).not.toContain('Proficiency with');
    });

    it('generates HTML with only proficiency prerequisite (level=false, ability_scores=false)', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        const stats = {
            ...mockPlayerStats,
            feats: [{
                name: 'Heavy Armor',
                desc: 'Can wear heavy armor',
                prerequisites: {
                    proficiency: 'Heavy Armor',
                },
            }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />, { wrapper });
        const featsBtn = screen.getByTestId('char-feats');
        fireEvent.click(featsBtn);
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const html = mockSetPopupHtml.mock.calls[0][0];
        expect(html).toContain('Heavy Armor');
        expect(html).toContain('Proficiency with Heavy Armor');
        expect(html).not.toContain('Level');
        expect(html).not.toContain('or higher');
    });

    it('generates HTML with level + ability_scores (proficiency=false)', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        const stats = {
            ...mockPlayerStats,
            feats: [{
                name: 'Heavy Armor',
                desc: 'Can wear heavy armor',
                prerequisites: {
                    level: 1,
                    ability_scores: [{ name: 'STR', minimum: 16 }],
                },
            }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />, { wrapper });
        const featsBtn = screen.getByTestId('char-feats');
        fireEvent.click(featsBtn);
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const html = mockSetPopupHtml.mock.calls[0][0];
        expect(html).toContain('Level 1');
        expect(html).toContain('STR 16 or higher');
        expect(html).not.toContain('Proficiency with');
    });

    it('generates HTML with level + proficiency (ability_scores=false)', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        const stats = {
            ...mockPlayerStats,
            feats: [{
                name: 'Heavy Armor',
                desc: 'Can wear heavy armor',
                prerequisites: {
                    level: 1,
                    proficiency: 'Heavy Armor',
                },
            }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />, { wrapper });
        const featsBtn = screen.getByTestId('char-feats');
        fireEvent.click(featsBtn);
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const html = mockSetPopupHtml.mock.calls[0][0];
        expect(html).toContain('Level 1');
        expect(html).toContain('Proficiency with Heavy Armor');
        expect(html).not.toContain('or higher');
    });

    it('generates HTML with ability_scores + proficiency (level=false)', () => {
        const mockSetPopupHtml = vi.fn();
        const wrapper = ({ children }) => (
            <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
                {children}
            </DiceRollContext.Provider>
        );
        const stats = {
            ...mockPlayerStats,
            feats: [{
                name: 'Heavy Armor',
                desc: 'Can wear heavy armor',
                prerequisites: {
                    ability_scores: [{ name: 'STR', minimum: 16 }],
                    proficiency: 'Heavy Armor',
                },
            }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />, { wrapper });
        const featsBtn = screen.getByTestId('char-feats');
        fireEvent.click(featsBtn);
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const html = mockSetPopupHtml.mock.calls[0][0];
        expect(html).toContain('STR 16 or higher');
        expect(html).toContain('Proficiency with Heavy Armor');
        expect(html).not.toContain('Level');
    });

    it('generates no prerequisites section when prerequisites is null', () => {
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
                prerequisites: null,
            }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />, { wrapper });
        const featsBtn = screen.getByTestId('char-feats');
        fireEvent.click(featsBtn);
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const html = mockSetPopupHtml.mock.calls[0][0];
        expect(html).toContain('Tough');
        expect(html).not.toContain('Prerequisites:');
    });

    it('renders prerequisites section with empty prerequisites object (all inner branches false)', () => {
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
                prerequisites: {},
            }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />, { wrapper });
        const featsBtn = screen.getByTestId('char-feats');
        fireEvent.click(featsBtn);
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const html = mockSetPopupHtml.mock.calls[0][0];
        expect(html).toContain('Tough');
        expect(html).toContain('Prerequisites:');
        expect(html).not.toContain('Level');
        expect(html).not.toContain('or higher');
        expect(html).not.toContain('Proficiency with');
    });

    it('handles multiple ability_scores entries', () => {
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
                desc: 'Casting while distracted',
                prerequisites: {
                    ability_scores: [
                        { name: 'INT', minimum: 13 },
                        { name: 'WIS', minimum: 13 },
                        { name: 'CHA', minimum: 13 },
                    ],
                },
            }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />, { wrapper });
        const featsBtn = screen.getByTestId('char-feats');
        fireEvent.click(featsBtn);
        expect(mockSetPopupHtml).toHaveBeenCalled();
        const html = mockSetPopupHtml.mock.calls[0][0];
        expect(html).toContain('INT 13 or higher');
        expect(html).toContain('WIS 13 or higher');
        expect(html).toContain('CHA 13 or higher');
    });

    it('does not call setPopupHtml when feat has no desc and no description', () => {
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
            }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />, { wrapper });
        const featsBtn = screen.getByTestId('char-feats');
        fireEvent.click(featsBtn);
        expect(mockSetPopupHtml).not.toHaveBeenCalled();
    });

    it('does not call setPopupHtml when feat has null desc explicitly', () => {
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
                desc: null,
            }],
        };
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />, { wrapper });
        const featsBtn = screen.getByTestId('char-feats');
        fireEvent.click(featsBtn);
        expect(mockSetPopupHtml).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Modal onClose handlers (lines 575, 698, 754)
// ---------------------------------------------------------------------------
describe('CharSummary - Modal onClose Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('calls setShowAllyModal false when ally modal cancel is clicked (line 575)', () => {
        const stats = {
            ...mockPlayerStats,
            race: { name: 'Human', type: 'Human', subrace: null },
            class: { name: 'Rogue', subclass: null, major: { name: 'Rogue' } },
            armorClass: 14,
            armorClassFormula: '14 + Dex',
            inventory: { equipped: [] },
            equipment: [],
            automation: { passives: [], actions: [] },
            passives: [],
        };
        vi.mocked(getCombatSummary).mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} characters={[]} />);
        const allyBadge = screen.getByText(/Allies \(1\)/);
        fireEvent.click(allyBadge);
        expect(screen.getByTestId('ally-selection-modal')).toBeInTheDocument();
        const cancelButton = screen.getByTestId('ally-cancel');
        fireEvent.click(cancelButton);
        expect(screen.queryByTestId('ally-selection-modal')).not.toBeInTheDocument();
    });

    it('calls setShowShortRest false when short rest modal close is clicked (line 698)', () => {
        vi.mocked(getCombatSummary).mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const shortRestBtn = screen.getByTestId('short-rest-btn');
        fireEvent.click(shortRestBtn);
        expect(screen.getByTestId('short-rest-modal')).toBeInTheDocument();
        const closeModalBtn = screen.getByTestId('short-rest-modal-close');
        fireEvent.click(closeModalBtn);
        expect(screen.queryByTestId('short-rest-modal')).not.toBeInTheDocument();
    });

    it('calls setShowAvatarModal false when avatar modal close is clicked (line 754)', () => {
        const stats = {
            ...mockPlayerStats,
            imagePath: '/images/thorin.png',
        };
        vi.mocked(getCombatSummary).mockReturnValue({ creatures: [] });
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        const avatarImage = screen.getByTestId('avatar-image');
        fireEvent.click(avatarImage);
        expect(screen.getByTestId('avatar-modal')).toBeInTheDocument();
        const closeModalBtn = screen.getByTestId('avatar-modal-close');
        fireEvent.click(closeModalBtn);
        expect(screen.queryByTestId('avatar-modal')).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Ally modal open fallback (line 557)
// ---------------------------------------------------------------------------
describe('CharSummary - Ally Modal Open Fallback Characters Map', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('uses characters.map fallback when combatSummary.creatures is null (line 557)', () => {
        const stats = {
            ...mockPlayerStats,
            race: { name: 'Human', type: 'Human', subrace: null },
            class: { name: 'Rogue', subclass: null, major: { name: 'Rogue' } },
            armorClass: 14,
            armorClassFormula: '14 + Dex',
            inventory: { equipped: [] },
            equipment: [],
            automation: { passives: [], actions: [] },
            passives: [],
        };
        vi.mocked(getCombatSummary).mockReturnValue(null);
        const characters = [
            { name: 'Thorin', type: 'player' },
            { name: 'Grimjaw', type: 'monster' },
        ];
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} characters={characters} />);
        const allyBadge = screen.getByText(/Allies \(1\)/);
        fireEvent.click(allyBadge);
        expect(screen.getByTestId('ally-selection-modal')).toBeInTheDocument();
    });
});
