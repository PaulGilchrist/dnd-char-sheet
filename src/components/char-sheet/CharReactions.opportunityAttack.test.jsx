import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    getReactionSpellNames: vi.fn(() => new Set()),
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
import { hasAutomation, hasTacticalShift, hasSpeedyOpportunityDisadvantage } from '../../services/combat/automation/automationService.js';
import { getCombatContext, getTargetFromAttacker } from '../../services/rules/combat/damageUtils.js';
import useLoggedDiceRoll from '../../hooks/combat/useLoggedDiceRoll.js';
import { buildFeatureDetailHtml } from '../../hooks/combat/useActionPopup.js';
import { getCategories } from '../../services/character/featureCategories.js';
import { getReactionSpellNames } from '../../services/ui/spellSectionUtils.js';
import { resolveSpellDamageAtLevel } from '../../services/rules/core/spellDamageUtils.js';

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
        spells: [],
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

describe('CharReactions - handleOpportunityAttack', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useRuntimeValue.mockReturnValue([]);
        getRuntimeValue.mockReturnValue(null);
        setRuntimeValue.mockReturnValue(undefined);
        hasAutomation.mockReturnValue(false);
        hasTacticalShift.mockReturnValue(false);
        hasSpeedyOpportunityDisadvantage.mockReturnValue(false);
        buildFeatureDetailHtml.mockImplementation((r) => `<div>${r.name}</div>`);
        getCategories.mockReturnValue({ featuresToIgnore: [] });
        getReactionSpellNames.mockReturnValue(new Set());
        resolveSpellDamageAtLevel.mockReturnValue(null);
        getCombatContext.mockResolvedValue(null);
        useLoggedDiceRoll.mockReturnValue({ rollAttack: vi.fn(), rollDamage: vi.fn() });
    });

    it('falls through to normal OA when no combat context', async () => {
        const rollAttack = vi.fn();
        useLoggedDiceRoll.mockImplementation(() => ({ rollAttack, rollDamage: vi.fn() }));
        render(<CharReactions {...createProps()} />);
        const reaction = screen.getByText('Opportunity Attack:');
        fireEvent.click(reaction);
        await waitFor(() => expect(rollAttack).toHaveBeenCalled());
        expect(rollAttack).toHaveBeenCalledWith(
            'Longsword',
            6,
            expect.objectContaining({ isOpportunityAttack: true })
        );
    });

    it('shows popup when target has inspiring movement protection', async () => {
        getCombatContext.mockResolvedValue({});
        getTargetFromAttacker.mockReturnValue({ name: 'Ally1' });
        const mockGrv = vi.fn((charKey, key) => {
            if (key === 'inspiringMovementNoOA') return true;
            return null;
        });
        getRuntimeValue.mockImplementation(mockGrv);
        render(<CharReactions {...createProps()} />);
        const reaction = screen.getByText('Opportunity Attack:');
        fireEvent.click(reaction);
        await new Promise(r => setTimeout(r, 100));
        expect(mockGrv).toHaveBeenCalledWith('Ally1', 'inspiringMovementNoOA');
    });

    it('shows popup when target has tactical shift', async () => {
        getCombatContext.mockResolvedValue({});
        getTargetFromAttacker.mockReturnValue({ name: 'Enemy1' });
        const mockGrv = vi.fn((charKey, key) => {
            if (key === 'inspiringMovementNoOA') return false;
            return null;
        });
        getRuntimeValue.mockImplementation(mockGrv);
        hasTacticalShift.mockReturnValue(true);
        render(<CharReactions {...createProps()} />);
        const reaction = screen.getByText('Opportunity Attack:');
        fireEvent.click(reaction);
        await new Promise(r => setTimeout(r, 100));
        expect(hasTacticalShift).toHaveBeenCalledWith({ name: 'Enemy1' });
    });

    it('shows popup when target has speedy disadvantage', async () => {
        getCombatContext.mockResolvedValue({});
        getTargetFromAttacker.mockReturnValue({ name: 'Enemy1' });
        const mockGrv = vi.fn((charKey, key) => {
            if (key === 'inspiringMovementNoOA') return false;
            return null;
        });
        getRuntimeValue.mockImplementation(mockGrv);
        hasTacticalShift.mockReturnValue(false);
        hasSpeedyOpportunityDisadvantage.mockReturnValue(true);
        render(<CharReactions {...createProps()} />);
        const reaction = screen.getByText('Opportunity Attack:');
        fireEvent.click(reaction);
        await new Promise(r => setTimeout(r, 100));
        expect(hasSpeedyOpportunityDisadvantage).toHaveBeenCalledWith({ name: 'Enemy1' });
    });

    it('uses first melee attack for OA roll', async () => {
        const rollAttack = vi.fn();
        useLoggedDiceRoll.mockImplementation(() => ({ rollAttack, rollDamage: vi.fn() }));
        getCombatContext.mockResolvedValue(null);
        render(<CharReactions {...createProps()} />);
        const reaction = screen.getByText('Opportunity Attack:');
        fireEvent.click(reaction);
        await waitFor(() => expect(rollAttack).toHaveBeenCalled());
        expect(rollAttack).toHaveBeenCalledWith('Longsword', 6, expect.any(Object));
    });

    it('uses first attack when no melee attacks available', async () => {
        const rollAttack = vi.fn();
        useLoggedDiceRoll.mockImplementation(() => ({ rollAttack, rollDamage: vi.fn() }));
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                attacks: [
                    { name: 'Ranged Bolt', type: 'Action', range: 120, hitBonus: 6 },
                ],
            },
        });
        getCombatContext.mockResolvedValue(null);
        render(<CharReactions {...createProps(props)} />);
        const reaction = screen.getByText('Opportunity Attack:');
        fireEvent.click(reaction);
        await waitFor(() => expect(rollAttack).toHaveBeenCalled());
        expect(rollAttack).toHaveBeenCalledWith('Ranged Bolt', 6, expect.any(Object));
    });

    it('does nothing when no attacks available', async () => {
        const rollAttack = vi.fn();
        useLoggedDiceRoll.mockImplementation(() => ({ rollAttack, rollDamage: vi.fn() }));
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                attacks: [],
            },
        });
        getCombatContext.mockResolvedValue(null);
        render(<CharReactions {...createProps(props)} />);
        const reaction = screen.getByText('Opportunity Attack:');
        fireEvent.click(reaction);
        await new Promise(r => setTimeout(r, 50));
        expect(rollAttack).not.toHaveBeenCalled();
    });

    it('handles getCombatContext rejection gracefully', async () => {
        const rollAttack = vi.fn();
        useLoggedDiceRoll.mockImplementation(() => ({ rollAttack, rollDamage: vi.fn() }));
        getCombatContext.mockRejectedValue(new Error('network error'));
        render(<CharReactions {...createProps()} />);
        const reaction = screen.getByText('Opportunity Attack:');
        fireEvent.click(reaction);
        await waitFor(() => expect(rollAttack).toHaveBeenCalled());
    });
});
