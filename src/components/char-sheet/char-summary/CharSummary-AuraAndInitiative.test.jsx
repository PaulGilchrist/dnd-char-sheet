// @improved-by-ai
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharSummary from './CharSummary.jsx';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';
import { mockPlayerStats, mockCampaignName } from './CharSummary.test-mocks.test.jsx';

vi.mock('./CharGold.jsx', () => ({ default: () => <div data-testid="char-gold">Gold</div> }));
vi.mock('./CharHitPoints.jsx', () => ({ default: () => <div data-testid="char-hp">HP</div> }));
vi.mock('./CharClassFeatures.jsx', () => ({ default: () => <div data-testid="char-class-features">Class Features</div> }));
vi.mock('../char-feats/CharFeats.jsx', () => ({ default: () => <div data-testid="char-feats">Feats</div> }));
vi.mock('../../common/Popup.jsx', () => ({ default: ({ children, onClick }) => <div data-testid="popup" onClick={onClick}>{children}</div> }));
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

vi.mock('../../../services/ui/sanitize.js', () => ({
    sanitizeHtml: (html) => html,
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

vi.mock('../../../services/combat/auras/unbreakableMajesty.js', () => ({
    isUnbreakableMajestyActive: vi.fn(() => false),
    getUnbreakableSaveDc: vi.fn(() => 0),
}));

vi.mock('../../../services/automation/handlers/buffs/auraOfLifeHandler.js', () => ({
    isAuraOfLifeActive: vi.fn(() => false),
    handle: vi.fn(),
}));

vi.mock('../../../services/automation/handlers/buffs/circleOfPowerHandler.js', () => ({
    isCircleOfPowerActive: vi.fn(() => false),
    handle: vi.fn(),
}));

vi.mock('../../../services/automation/handlers/buffs/deathWardHandler.js', () => ({
    isDeathWardActive: vi.fn(() => false),
    handle: vi.fn(),
}));

describe('CharSummary - Aura Sources', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getActiveBuffs.mockReturnValue([]);
    });

    it('displays aura source marker for resistance from auraComboEffects', () => {
        const stats = { ...mockPlayerStats, resistances: [] };
        render(<CharSummary
            playerStats={stats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            auraComboEffects={{ resistances: ['radiant'], resistanceSource: 'Aura of Protection' }}
        />);
        expect(screen.getByText('Radiant')).toBeInTheDocument();
        expect(screen.getByTitle(/Aura of Protection/)).toBeInTheDocument();
    });

    it('displays aura source marker for immunity from auraComboEffects', () => {
        const stats = { ...mockPlayerStats, immunities: [] };
        render(<CharSummary
            playerStats={stats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            auraComboEffects={{ immunities: ['poison'], immunitySources: { poison: 'Aura of Protection' } }}
        />);
        expect(screen.getByText('Poison')).toBeInTheDocument();
    });

    it('merges base and aura resistances with deduplication', () => {
        const stats = { ...mockPlayerStats, resistances: ['fire'] };
        render(<CharSummary
            playerStats={stats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            auraComboEffects={{ resistances: ['fire', 'cold'], resistanceSource: 'Aura of Protection' }}
        />);
        expect(screen.getByText(/Fire/)).toBeInTheDocument();
        expect(screen.getByText(/Cold/)).toBeInTheDocument();
    });

    it('merges base and aura immunities with deduplication', () => {
        const stats = { ...mockPlayerStats, immunities: ['poison'] };
        render(<CharSummary
            playerStats={stats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            auraComboEffects={{ immunities: ['poison', 'cold'], immunitySources: { cold: 'Aura of Protection' } }}
        />);
        expect(screen.getByText(/Poison/)).toBeInTheDocument();
        expect(screen.getByText(/Cold/)).toBeInTheDocument();
    });

    it('does not crash when auraComboEffects is null', () => {
        render(<CharSummary
            playerStats={mockPlayerStats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            auraComboEffects={null}
        />);
        expect(screen.getByText(mockPlayerStats.name)).toBeInTheDocument();
    });

    it('does not crash when auraComboEffects is undefined', () => {
        render(<CharSummary
            playerStats={mockPlayerStats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
        />);
        expect(screen.getByText(mockPlayerStats.name)).toBeInTheDocument();
    });
});

describe('CharSummary - Rage of the Wilds', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('displays Rage of the Wilds Bear resistances', () => {
        getActiveBuffs.mockReturnValue([
            { name: 'Rage of the Wilds', optionName: 'Bear', resistanceTypes: ['acid', 'bludgeoning', 'cold', 'fire', 'lightning', 'piercing', 'poison', 'slashing', 'thunder'] }
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Acid/)).toBeInTheDocument();
        expect(screen.getByText(/Bludgeoning/)).toBeInTheDocument();
        expect(screen.getByText(/Lightning/)).toBeInTheDocument();
    });

    it('merges Rage of the Wilds resistances with base resistances', () => {
        const stats = { ...mockPlayerStats, resistances: ['fire'] };
        getActiveBuffs.mockReturnValue([
            { name: 'Rage of the Wilds', optionName: 'Bear', resistanceTypes: ['cold', 'poison'] }
        ]);
        render(<CharSummary playerStats={stats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Cold/)).toBeInTheDocument();
        expect(screen.getByText(/Poison/)).toBeInTheDocument();
    });

    it('does not display resistances section when no buffs provide resistances', () => {
        getActiveBuffs.mockReturnValue([]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Resistances:/)).not.toBeInTheDocument();
    });
});

describe('CharSummary - Heroes Feast', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('displays Heroes Feast poison resistance and condition immunities', () => {
        getActiveBuffs.mockReturnValue([
            { name: "Heroes' Feast", effect: 'heroes_feast', resistanceTypes: ['poison'], conditionImmunity: ['Frightened', 'Poisoned'] }
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Resistances:/)).toBeInTheDocument();
        expect(screen.getByText(/Immunities:/)).toBeInTheDocument();
        expect(screen.getByText(/Poisoned/)).toBeInTheDocument();
        expect(screen.getByText(/Frightened/)).toBeInTheDocument();
    });

    it('displays Heroes Feast badge in the badges section', () => {
        getActiveBuffs.mockReturnValue([
            { name: "Heroes' Feast", effect: 'heroes_feast', resistanceTypes: ['poison'], conditionImmunity: ['Frightened', 'Poisoned'] }
        ]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.getByText(/Heroes' Feast/)).toBeInTheDocument();
    });

    it('does not display Heroes Feast badge when buff is not active', () => {
        getActiveBuffs.mockReturnValue([]);
        render(<CharSummary playerStats={mockPlayerStats} campaignName={mockCampaignName} exhaustionLevel={0} />);
        expect(screen.queryByText(/Heroes' Feast/)).not.toBeInTheDocument();
    });
});

describe('CharSummary - Speed CSS Classes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getActiveBuffs.mockReturnValue([]);
    });

    it.each([
        [{ exhaustionLevel: 1 }, true, 'exhaustion level > 0 penalizes speed'],
        [{ exhaustionLevel: 0, conditionEffects: { speedZero: true } }, true, 'speedZero condition penalizes speed'],
        [{ exhaustionLevel: 0, conditionEffects: {} }, false, 'no penalties leaves speed unpenalized'],
    ])('applies stat--penalized class when %s', (_props, expectedClass, _desc) => {
        render(<CharSummary
            playerStats={mockPlayerStats}
            campaignName={mockCampaignName}
            {..._props}
        />);
        const speedLabel = screen.getByText((content, element) => {
            return element?.tagName === 'B' && content.includes('Speed');
        });
        const speedSpan = speedLabel.nextElementSibling;
        if (expectedClass) {
            expect(speedSpan).toHaveClass('stat--penalized');
        } else {
            expect(speedSpan).not.toHaveClass('stat--penalized');
        }
    });

    it('displays speed halved indicator when slow spell applies', () => {
        render(<CharSummary
            playerStats={mockPlayerStats}
            campaignName={mockCampaignName}
            exhaustionLevel={0}
            conditionEffects={{ speedHalved: true }}
        />);
        expect(screen.getByTitle('Slow spell penalty')).toBeInTheDocument();
    });
});
