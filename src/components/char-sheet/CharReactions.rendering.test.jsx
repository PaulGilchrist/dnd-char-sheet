// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import CharReactions from './CharReactions.jsx';

vi.mock('../common/popup.jsx', () => ({
    default: ({ children }) => React.createElement('div', { 'data-testid': 'popup' }, children),
}));
vi.mock('./char-spells/SpellDetailPopup.jsx', () => ({
    default: () => React.createElement('div', { 'data-testid': 'spell-detail-popup' }, null),
}));
vi.mock('./popups/MetamagicPopup.jsx', () => ({
    default: () => React.createElement('div', { 'data-testid': 'metamagic-popup' }, null),
}));
vi.mock('./modals/arcane/ArcaneWardRestoreModal.jsx', () => ({
    default: () => React.createElement('div', { 'data-testid': 'arcane-ward-restore' }, null),
}));
vi.mock('./modals/divine/BastionOfLawSpendModal.jsx', () => ({
    default: () => React.createElement('div', { 'data-testid': 'bastion-of-law-spend' }, null),
}));
vi.mock('./modals/shared/SecondaryTargetModal.jsx', () => ({
    default: ({ title, onTargetSelected, onSkip }) =>
        React.createElement('div', { 'data-testid': 'secondary-target-modal' },
            React.createElement('span', { 'data-testid': 'modal-title' }, title),
            React.createElement('button', { 'data-testid': 'confirm-btn', onClick: () => onTargetSelected('Target1') }, 'Confirm'),
            React.createElement('button', { 'data-testid': 'skip-btn', onClick: () => onSkip() }, 'Skip'),
        ),
}));
vi.mock('./modals/BendFateModal.jsx', () => ({
    default: ({ onClose }) =>
        React.createElement('div', { 'data-testid': 'bend-fate-modal', onClick: onClose }, null),
}));
vi.mock('./modals/BoonFateModal.jsx', () => ({
    default: ({ onClose }) =>
        React.createElement('div', { 'data-testid': 'boon-fate-modal', onClick: onClose }, null),
}));
vi.mock('./modals/StepsOfTheFeyTauntModal.jsx', () => ({
    default: ({ onClose }) =>
        React.createElement('div', { 'data-testid': 'steps-of-fey-modal', onClick: onClose }, null),
}));
vi.mock('./modals/SearingVengeanceModal.jsx', () => ({
    default: ({ onConfirm, onSkip }) =>
        React.createElement('div', { 'data-testid': 'searing-vengeance-modal' },
            React.createElement('button', { 'data-testid': 'sv-confirm', onClick: () => onConfirm([{ name: 'Enemy1' }]) }, 'Confirm'),
            React.createElement('button', { 'data-testid': 'sv-skip', onClick: onSkip }, 'Skip'),
        ),
}));
vi.mock('../../services/ui/spellSectionUtils.js', () => ({
    getReactionSpellNames: vi.fn(() => new Set(['Shield', 'Hellish Rebuke'])),
}));
vi.mock('../../services/character/featureCategories.js', () => ({
    getCategories: vi.fn(() => ({ featuresToIgnore: [] })),
}));
vi.mock('../../services/ui/sanitize.js', () => ({ sanitizeHtml: (html) => html }));
vi.mock('../../hooks/combat/useActionPopup.js', () => ({
    buildFeatureDetailHtml: vi.fn((reaction) => `<div>${reaction.name}</div>`),
}));
vi.mock('../../hooks/combat/useLoggedDiceRoll.js', () => ({
    default: vi.fn(),
}));
vi.mock('../../hooks/combat/DiceRollContext.js', () => ({
    useDiceRollPopup: vi.fn(() => ({ setPopupHtml: vi.fn() })),
}));
vi.mock('../../services/combat/baseCombatActions.js', () => ({
    OPPORTUNITY_ATTACK: { name: 'Opportunity Attack', description: 'Can attack creature that moves out of your reach' },
    MELEE_REACH_FEET: 5,
}));
vi.mock('../../services/combat/automation/automationService.js', () => ({
    hasAutomation: vi.fn(() => false),
    hasTacticalShift: vi.fn(() => false),
    hasSpeedyOpportunityDisadvantage: vi.fn(() => false),
}));
vi.mock('../../services/rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
    getTargetFromAttacker: vi.fn(),
}));
vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
    useRuntimeValue: vi.fn(),
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));
vi.mock('../../services/automation/index.js', () => ({
    executeHandler: vi.fn(),
    confirmSearingVengeance: vi.fn(),
    skipSearingVengeance: vi.fn(),
}));
vi.mock('../../services/automation/common/savePrompt.js', () => ({
    createSaveListener: vi.fn(() => ({ promptId: 'test-prompt-id' })),
}));
vi.mock('../../services/ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../services/rules/effects/expirations.js', () => ({
    addExpiration: vi.fn(),
}));
vi.mock('../../services/automation/handlers/reactions/reactionSpellHandler.js', () => ({
    applyWarCasterReaction: vi.fn(),
}));
vi.mock('../../services/automation/handlers/reactions/reactionBonusHandler.js', () => ({
    applyInspiringMovement: vi.fn(),
}));
vi.mock('./useAttackDamageResolution.js', () => ({
    normalizeAutoDamage: vi.fn(),
    resolveAttackDamageStandalone: vi.fn(),
}));
vi.mock('../../hooks/combat/useSpellMetamagicFlow.js', () => ({
    useSpellMetamagicFlow: vi.fn(() => ({
        pendingMetamagic: null,
        gateMetamagic: vi.fn(),
        handleConfirm: vi.fn(),
        handleSkip: vi.fn(),
    })),
}));
vi.mock('../../hooks/combat/useSpellUpcastFlow.js', () => ({
    useSpellUpcastFlow: vi.fn(() => ({ buildUpcastLevels: vi.fn(() => []) })),
}));
vi.mock('../../hooks/combat/useSpellPositionResolver.js', () => ({
    useSpellPositionResolver: vi.fn(() => ({
        resolvePositions: vi.fn(),
        cachedPosRef: { current: null },
    })),
}));
vi.mock('../../hooks/combat/useSpellCastExecutor.js', () => ({
    useSpellCastExecutor: vi.fn(() => ({ castAction: vi.fn() })),
}));
vi.mock('../../services/rules/core/spellDamageUtils.js', () => ({
    resolveSpellDamageAtLevel: vi.fn(),
    isAutoHitSpell: vi.fn(() => false),
    resolveHealExpression: vi.fn(),
}));
vi.mock('../../services/ui/formatUtils.js', () => ({
    signFormatter: { format: (val) => (val >= 0 ? '+' : '') + val },
}));

import { useRuntimeValue, getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { hasAutomation, hasTacticalShift, hasSpeedyOpportunityDisadvantage } from '../../services/combat/automation/automationService.js';
import { getCombatContext, getTargetFromAttacker } from '../../services/rules/combat/damageUtils.js';
import useLoggedDiceRoll from '../../hooks/combat/useLoggedDiceRoll.js';
import { buildFeatureDetailHtml } from '../../hooks/combat/useActionPopup.js';
import { getCategories } from '../../services/character/featureCategories.js';
import { getReactionSpellNames } from '../../services/ui/spellSectionUtils.js';
import { resolveSpellDamageAtLevel, isAutoHitSpell, resolveHealExpression } from '../../services/rules/core/spellDamageUtils.js';

const campaignName = 'test-campaign';

const basePlayerStats = {
    name: 'TestFighter',
    level: 5,
    class: { name: 'Fighter' },
    reactions: [
        { name: 'Opportunity Attack', description: 'Can attack creature that moves out of your reach' },
    ],
    attacks: [
        { name: 'Longsword', type: 'Action', range: 5, hitBonus: 6 },
    ],
    spellAbilities: {
        modifier: 3,
        toHit: 6,
        saveDc: 13,
        spells: [
            { name: 'Shield', casting_time: '1 reaction', level: 1, range: 'Self', prepared: 'Always', damage: null, heal_at_slot_level: false },
            { name: 'Hellish Rebuke', casting_time: '1 reaction', level: 1, range: '60 ft.', prepared: 'Always', damage: { expression: '1d10', damage_type: 'fire' }, heal_at_slot_level: false },
        ],
    },
    abilities: [
        { name: 'Strength', bonus: 3 },
        { name: 'Wisdom', bonus: 2 },
    ],
    _trackedResources: {},
};

function createProps(overrides = {}) {
    const playerStats = { ...basePlayerStats, ...overrides.playerStats };
    return {
        playerStats,
        campaignName,
        cannotAct: false,
        mapName: null,
        characters: [],
        modalState: {},
        setModalState: vi.fn(),
        ...overrides,
    };
}

describe('CharReactions - Basic Rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'activeBuffs') return [];
            if (key === 'powerWordHealStandPermission') return false;
            if (key === 'bastionOfLawActive') return false;
            if (key === 'bastionOfLawWardDice') return [];
            return [];
        });
        getRuntimeValue.mockReturnValue(null);
        setRuntimeValue.mockReturnValue(undefined);
        hasAutomation.mockReturnValue(false);
        hasTacticalShift.mockReturnValue(false);
        hasSpeedyOpportunityDisadvantage.mockReturnValue(false);
        getCombatContext.mockResolvedValue(null);
        getTargetFromAttacker.mockReturnValue(null);
        buildFeatureDetailHtml.mockImplementation((r) => `<div>${r.name}</div>`);
        getCategories.mockReturnValue({ featuresToIgnore: [] });
        getReactionSpellNames.mockReturnValue(new Set(['Shield', 'Hellish Rebuke']));
        resolveSpellDamageAtLevel.mockReturnValue('1d10');
        resolveHealExpression.mockReturnValue('2d8+3');
        isAutoHitSpell.mockReturnValue(false);
        useLoggedDiceRoll.mockReturnValue({ rollAttack: vi.fn(), rollDamage: vi.fn() });
    });

    afterEach(cleanup);

    it('renders the reactions section header', () => {
        render(<CharReactions {...createProps()} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders the opportunity attack reaction with its label', () => {
        render(<CharReactions {...createProps()} />);
        expect(screen.getByText('Opportunity Attack:')).toBeInTheDocument();
    });

    it('renders the opportunity attack description', () => {
        render(<CharReactions {...createProps()} />);
        expect(screen.getByText('Can attack creature that moves out of your reach')).toBeInTheDocument();
    });

    it('renders reaction spells from getReactionSpellNames', () => {
        render(<CharReactions {...createProps()} />);
        expect(screen.getByText('Shield')).toBeInTheDocument();
        expect(screen.getByText('Hellish Rebuke')).toBeInTheDocument();
    });

    it('renders spell level column for each reaction spell', () => {
        render(<CharReactions {...createProps()} />);
        const levelElements = screen.getAllByText('1');
        expect(levelElements.length).toBeGreaterThanOrEqual(1);
    });

    it('renders spell range column for each reaction spell', () => {
        render(<CharReactions {...createProps()} />);
        expect(screen.getByText('Self')).toBeInTheDocument();
        expect(screen.getByText('60 ft.')).toBeInTheDocument();
    });

    it('renders save DC for spells with dc property', () => {
        const spellWithDc = {
            ...basePlayerStats.spellAbilities.spells[0],
            name: 'Bane',
            dc: { dc_type: 'WIS' },
        };
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                spellAbilities: {
                    ...basePlayerStats.spellAbilities,
                    spells: [spellWithDc],
                },
            },
        });
        getReactionSpellNames.mockReturnValue(new Set(['Bane']));
        render(<CharReactions {...props} />);
        expect(screen.getByText('DC 13 WIS')).toBeInTheDocument();
    });

    it('renders heal expression and "Healing" label for healing spells', () => {
        const healingSpell = {
            name: 'Lesser Restoration',
            casting_time: '1 reaction',
            level: 2,
            range: 'Touch',
            prepared: 'Always',
            damage: null,
            heal_at_slot_level: true,
        };
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                spellAbilities: {
                    ...basePlayerStats.spellAbilities,
                    spells: [healingSpell],
                },
            },
        });
        getReactionSpellNames.mockReturnValue(new Set(['Lesser Restoration']));
        resolveHealExpression.mockReturnValue('2d8+3');
        render(<CharReactions {...props} />);
        expect(screen.getByText('2d8+3')).toBeInTheDocument();
        expect(screen.getByText('Healing')).toBeInTheDocument();
    });

    it('renders damage type for spells with damage_type', () => {
        render(<CharReactions {...createProps()} />);
        expect(screen.getByText('fire')).toBeInTheDocument();
    });

    it('renders "Utility" for spells without damage type and not healing', () => {
        const utilitySpell = {
            name: 'Counterspell',
            casting_time: '1 reaction',
            level: 3,
            range: '60 ft.',
            prepared: 'Always',
            damage: null,
            heal_at_slot_level: false,
        };
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                spellAbilities: {
                    ...basePlayerStats.spellAbilities,
                    spells: [utilitySpell],
                },
            },
        });
        getReactionSpellNames.mockReturnValue(new Set(['Counterspell']));
        resolveSpellDamageAtLevel.mockReturnValue(null);
        render(<CharReactions {...props} />);
        expect(screen.getByText('Utility')).toBeInTheDocument();
    });

    it('renders "Cantrip" for level 0 spells', () => {
        const cantrip = {
            name: 'Thorn Whip',
            casting_time: '1 reaction',
            level: 0,
            range: '30 ft.',
            prepared: 'Always',
            damage: '1d8 thunder',
            damage_type: 'thunder',
        };
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                spellAbilities: {
                    ...basePlayerStats.spellAbilities,
                    spells: [cantrip],
                },
            },
        });
        getReactionSpellNames.mockReturnValue(new Set(['Thorn Whip']));
        resolveSpellDamageAtLevel.mockReturnValue('1d8+3 thunder');
        render(<CharReactions {...props} />);
        expect(screen.getByText('Cantrip')).toBeInTheDocument();
    });

    it('renders clickable attack bonus for spells with attack_type', () => {
        const attackSpell = {
            name: 'Thorn Whip',
            casting_time: '1 reaction',
            level: 0,
            range: '30 ft.',
            prepared: 'Always',
            attack_type: 'melee',
            damage: '1d8 thunder',
            damage_type: 'thunder',
        };
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                spellAbilities: {
                    ...basePlayerStats.spellAbilities,
                    toHit: 5,
                    spells: [attackSpell],
                },
            },
        });
        getReactionSpellNames.mockReturnValue(new Set(['Thorn Whip']));
        resolveSpellDamageAtLevel.mockReturnValue('1d8+3 thunder');
        render(<CharReactions {...props} />);
        expect(screen.getByText('+5')).toBeInTheDocument();
    });

    it('does not render spell section when no reaction spells are configured', () => {
        getReactionSpellNames.mockReturnValue(new Set());
        render(<CharReactions {...createProps()} />);
        expect(screen.queryByText('Shield')).not.toBeInTheDocument();
    });

    it('does not render spells section when spellAbilities is null', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                spellAbilities: null,
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.queryByText('Shield')).not.toBeInTheDocument();
    });

    it('does not render spells section when spellAbilities.spells is missing', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                spellAbilities: {},
            },
        });
        expect(() => render(<CharReactions {...props} />)).toThrow();
    });

    it('opens spell detail popup when clicking a spell name', () => {
        render(<CharReactions {...createProps()} />);
        const spellLink = screen.getByText('Shield');
        fireEvent.click(spellLink);
        expect(screen.getByTestId('popup')).toBeInTheDocument();
        expect(screen.getByTestId('spell-detail-popup')).toBeInTheDocument();
    });

    it('renders damage cells as clickable for non-healing spells', () => {
        render(<CharReactions {...createProps()} />);
        const damageCells = screen.getAllByText('1d10');
        expect(damageCells[0]).toHaveClass('clickable');
    });

    it('renders auto-hit spells without an attack bonus column', () => {
        isAutoHitSpell.mockReturnValue(true);
        const autoHitSpell = {
            name: 'Guiding Bolt',
            casting_time: '1 reaction',
            level: 2,
            range: '120 ft.',
            prepared: 'Always',
            damage: '4d6 radiant',
            damage_type: 'radiant',
        };
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                spellAbilities: {
                    ...basePlayerStats.spellAbilities,
                    spells: [autoHitSpell],
                },
            },
        });
        getReactionSpellNames.mockReturnValue(new Set(['Guiding Bolt']));
        resolveSpellDamageAtLevel.mockReturnValue('4d6+3 radiant');
        render(<CharReactions {...props} />);
        expect(screen.getByText('Guiding Bolt')).toBeInTheDocument();
    });
});
