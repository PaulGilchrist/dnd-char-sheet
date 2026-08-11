import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
    useRuntimeValue: vi.fn(() => []),
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
import { hasAutomation } from '../../services/combat/automation/automationService.js';
import useLoggedDiceRoll from '../../hooks/combat/useLoggedDiceRoll.js';
import { buildFeatureDetailHtml } from '../../hooks/combat/useActionPopup.js';
import { getCategories } from '../../services/character/featureCategories.js';
import { getReactionSpellNames } from '../../services/ui/spellSectionUtils.js';
import { resolveSpellDamageAtLevel, isAutoHitSpell, resolveHealExpression } from '../../services/rules/core/spellDamageUtils.js';
import { useSpellMetamagicFlow } from '../../hooks/combat/useSpellMetamagicFlow.js';

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

describe('CharReactions - Spell Click Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useRuntimeValue.mockReturnValue([]);
        getRuntimeValue.mockReturnValue(null);
        setRuntimeValue.mockReturnValue(undefined);
        hasAutomation.mockReturnValue(false);
        buildFeatureDetailHtml.mockImplementation((r) => `<div>${r.name}</div>`);
        getCategories.mockReturnValue({ featuresToIgnore: [] });
        getReactionSpellNames.mockReturnValue(new Set(['Shield', 'Hellish Rebuke']));
        resolveSpellDamageAtLevel.mockReturnValue('1d10');
        resolveHealExpression.mockReturnValue('2d8+3');
        isAutoHitSpell.mockReturnValue(false);
        useLoggedDiceRoll.mockReturnValue({ rollAttack: vi.fn(), rollDamage: vi.fn() });
    });

    it('calls gateMetamagic when clicking reaction spell damage', () => {
        const gateMetamagic = vi.fn();
        useSpellMetamagicFlow.mockReturnValue({
            pendingMetamagic: null,
            gateMetamagic,
            handleConfirm: vi.fn(),
            handleSkip: vi.fn(),
        });
        render(<CharReactions {...createProps()} />);
        const damageCells = screen.getAllByText('1d10');
        fireEvent.click(damageCells[0]);
        expect(gateMetamagic).toHaveBeenCalled();
    });

    it('does not call gateMetamagic when cannotAct is true on damage click', () => {
        const gateMetamagic = vi.fn();
        useSpellMetamagicFlow.mockReturnValue({
            pendingMetamagic: null,
            gateMetamagic,
            handleConfirm: vi.fn(),
            handleSkip: vi.fn(),
        });
        const props = createProps({ cannotAct: true });
        render(<CharReactions {...createProps(props)} />);
        const damageCells = screen.getAllByText('1d10');
        fireEvent.click(damageCells[0]);
        expect(gateMetamagic).not.toHaveBeenCalled();
    });

    it('renders clickable attack for spells with attack_type and no cannotAct', () => {
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
        render(<CharReactions {...createProps(props)} />);
        const attackCell = screen.getByText('+5');
        expect(attackCell).toHaveClass('clickable');
        expect(attackCell).not.toHaveClass('disabled-attack');
    });

    it('renders disabled attack for spells with attack_type when cannotAct', () => {
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
            cannotAct: true,
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
        render(<CharReactions {...createProps(props)} />);
        const attackCell = screen.getByText('+5');
        expect(attackCell).toHaveClass('disabled-attack');
    });

    it('renders auto-hit spell without attack bonus column', () => {
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
        render(<CharReactions {...createProps(props)} />);
        expect(screen.getByText('Guiding Bolt')).toBeInTheDocument();
    });
});
