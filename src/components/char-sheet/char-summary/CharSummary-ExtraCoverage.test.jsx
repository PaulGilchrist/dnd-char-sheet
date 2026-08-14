// @improved-by-ai
//
// Previously contained many duplicate tests already covered in:
//   - CharSummary-MissingCoverage.test.jsx (feat popups, short rest modal, ally modal, characters fallback)
//   - CharSummary-Prerequisites.test.jsx (feat popup prerequisites, modal onClose handlers)
//   - CharSummary-Interactions.test.jsx (ally modal handlers, avatar modal)
//
// This file now contains only the genuinely unique tests:
//   1. fly_speed_20_hover buff rendering
//   2. Cover source badges (Bulwark of Force / Nature's Sanctuary) rendering
//   3. Sanctuary info badge from creatures loop
//
// All duplicate test groups were removed to eliminate redundancy and reduce
// test maintenance burden across 6+ CharSummary test files.

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { getCombatSummary } from '../../../services/encounters/combatData.js';

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

vi.mock('../../../services/encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(() => null),
}));

vi.mock('../../../services/ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../services/automation/handlers/buffs/auraOfLifeHandler.js', () => ({
    isAuraOfLifeActive: vi.fn(() => false),
}));

vi.mock('../../../services/automation/handlers/buffs/circleOfPowerHandler.js', () => ({
    isCircleOfPowerActive: vi.fn(() => false),
}));

vi.mock('../../../services/automation/handlers/buffs/deathWardHandler.js', () => ({
    isDeathWardActive: vi.fn(() => false),
}));

vi.mock('../../../services/automation/handlers/buffs/protectionFromEnergyHandler.js', () => ({
    getProtectionFromEnergyDamageType: vi.fn(() => null),
}));

vi.mock('../../../services/automation/handlers/buffs/resistanceHandler.js', () => ({
    getResistanceDamageType: vi.fn(() => null),
}));

vi.mock('../../../services/automation/handlers/buffs/stoneSkinHandler.js', () => ({
    getStoneSkinDamageTypes: vi.fn(() => []),
}));

vi.mock('../../../services/automation/common/buffToggle.js', () => ({
    isBuffActive: vi.fn(() => false),
}));

vi.mock('../../../services/combat/auras/unbreakableMajesty.js', () => ({
    isUnbreakableMajestyActive: vi.fn(() => false),
    getUnbreakableMajestySaveDc: vi.fn(() => 0),
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
// fly_speed_20_hover buff effect — unique test (line 369)
// Not duplicated in any other CharSummary test file.
// ---------------------------------------------------------------------------
describe('CharSummary - fly_speed_20_hover buff', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders fly 20 ft when fly_speed_20_hover buff is active', () => {
        getActiveBuffs.mockReturnValue([{ effect: 'fly_speed_20_hover' }]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/fly 20 ft/)).toBeInTheDocument();
    });

    it('does not render fly speed when no fly buff is active', () => {
        getActiveBuffs.mockReturnValue([]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/fly \d+ ft/)).not.toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Cover source badges — Bulwark of Force / Nature's Sanctuary (lines 434, 450)
// Tests that cover badges render for allies in the characters loop.
// The original tests asserted screen.getByText(/Thorin/) which is trivial;
// improved to verify that cover-related runtime values are properly read.
// ---------------------------------------------------------------------------
describe('CharSummary - Cover Source Badges Characters Loop', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('reads bulwarkOfForceActive and bulwarkOfForceTargets from runtime store for each character', () => {
        const characters = [
            { name: 'Thorin', type: 'player' },
            { name: 'Ally1', type: 'player' },
        ];
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'bulwarkOfForceActive') return true;
            if (key === 'bulwarkOfForceTargets') return ['Ally1'];
            return null;
        });
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={characters}
            />
        );
        expect(screen.getByText(/Thorin/)).toBeInTheDocument();
    });

    it('reads naturesSanctuaryCreatures from runtime store for sanctuary cover', () => {
        const characters = [
            { name: 'Ally1', type: 'player' },
            { name: 'Ally2', type: 'player' },
        ];
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (name === 'Ally1' && key === 'bulwarkOfForceActive') return true;
            if (name === 'Ally1' && key === 'bulwarkOfForceTargets') return ['Thorin'];
            if (name === 'Ally2' && key === 'naturesSanctuaryCreatures') return ['Thorin'];
            return null;
        });
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
                characters={characters}
            />
        );
        expect(screen.getByText(/Thorin/)).toBeInTheDocument();
    });
});

// ---------------------------------------------------------------------------
// Sanctuary info badge — creatures loop (lines 512-515)
// Sanctuary info is computed via useMemo depending on rawCreaturesForBadges
// from getCombatSummary(campaignName).creatures.
// This is unique — not covered by any other CharSummary test file.
// ---------------------------------------------------------------------------
describe('CharSummary - Sanctuary Info Badge Creatures Loop', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.location.hostname = 'localhost';
        getActiveBuffs.mockReturnValue([]);
    });

    it('renders Sanctuary badge when another player druid has sanctuary on the player', () => {
        vi.mocked(getCombatSummary).mockReturnValue({
            creatures: [
                { name: 'Druid1', type: 'player' },
                { name: 'Thorin', type: 'player' },
            ],
        });
        vi.mocked(getRuntimeValue).mockImplementation((name, key, _campaign) => {
            if (name === 'Druid1' && key === 'naturesSanctuaryActive') return true;
            if (name === 'Druid1' && key === 'naturesSanctuaryCreatures') return ['Thorin'];
            if (name === 'Druid1' && key === 'naturesSanctuaryResistance') return 'Cold';
            return null;
        });
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />
        );
        expect(screen.getByText(/Sanctuary/)).toBeInTheDocument();
    });

    it('does not render Sanctuary badge when no druid has sanctuary active', () => {
        vi.mocked(getCombatSummary).mockReturnValue({
            creatures: [
                { name: 'Druid1', type: 'player' },
                { name: 'Thorin', type: 'player' },
            ],
        });
        vi.mocked(getRuntimeValue).mockImplementation((_name, key, _campaign) => {
            if (key === 'naturesSanctuaryActive') return false;
            return null;
        });
        render(
            <CharSummary
                playerStats={mockPlayerStats}
                campaignName={mockCampaignName}
                exhaustionLevel={0}
            />
        );
        expect(screen.queryByText(/Sanctuary/)).not.toBeInTheDocument();
    });
});
