// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
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
import { hasAutomation } from '../../services/combat/automation/automationService.js';
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

describe('CharReactions - Dynamic Reactions', () => {
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
        buildFeatureDetailHtml.mockImplementation((r) => `<div>${r.name}</div>`);
        getCategories.mockReturnValue({ featuresToIgnore: [] });
        getReactionSpellNames.mockReturnValue(new Set());
        resolveSpellDamageAtLevel.mockReturnValue(null);
        useLoggedDiceRoll.mockReturnValue({ rollAttack: vi.fn(), rollDamage: vi.fn() });
    });

    it('adds Revivification reaction when buff has reactionSave and not already present', () => {
        useRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'activeBuffs') return [{ reactionSave: { dc: 15, type: 'CON' } }];
            return [];
        });
        render(<CharReactions {...createProps()} />);
        expect(screen.getByText('Revivification:')).toBeInTheDocument();
    });

    it('does not add duplicate Revivification if already in reactions', () => {
        useRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'activeBuffs') return [{ reactionSave: { dc: 15, type: 'CON' } }];
            return [];
        });
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [
                    { name: 'Opportunity Attack', description: '...' },
                    { name: 'Revivification', description: 'Already present' },
                ],
            },
        });
        render(<CharReactions {...props} />);
        const revivificationElements = screen.queryAllByText(/Revivification/);
        expect(revivificationElements).toHaveLength(1);
    });

    it('does not add Revivification when multiple buffs have reactionSave', () => {
        useRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'activeBuffs') return [
                { reactionSave: { dc: 15, type: 'CON' } },
                { reactionSave: { dc: 12, type: 'CHA' } },
            ];
            return [];
        });
        render(<CharReactions {...createProps()} />);
        const revivificationElements = screen.queryAllByText(/Revivification/);
        expect(revivificationElements).toHaveLength(1);
    });

    it('does not add Stand reaction when pwhStance is falsy', () => {
        render(<CharReactions {...createProps()} />);
        expect(screen.queryByText('Stand (Power Word Heal):')).not.toBeInTheDocument();
    });

    it('adds Stand (Power Word Heal) reaction when pwhStance is truthy', () => {
        useRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'powerWordHealStandPermission') return true;
            if (key === 'activeBuffs') return [];
            return [];
        });
        render(<CharReactions {...createProps()} />);
        expect(screen.getByText('Stand (Power Word Heal):')).toBeInTheDocument();
    });

    it('does not add duplicate Stand reaction if already present', () => {
        useRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'powerWordHealStandPermission') return true;
            if (key === 'activeBuffs') return [];
            return [];
        });
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [
                    { name: 'Opportunity Attack', description: '...' },
                    { name: 'Stand (Power Word Heal)', description: 'Already present' },
                ],
            },
        });
        render(<CharReactions {...props} />);
        const standElements = screen.queryAllByText(/Stand \(Power Word Heal\)/);
        expect(standElements).toHaveLength(1);
    });

    it('adds Bastion of Law reaction when ward is active with dice', () => {
        useRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'bastionOfLawActive') return true;
            if (key === 'bastionOfLawWardDice') return [{ value: 8 }, { value: 8 }];
            if (key === 'activeBuffs') return [];
            return [];
        });
        render(<CharReactions {...createProps()} />);
        expect(screen.getByText("Bastion of Law:")).toBeInTheDocument();
        expect(screen.getByText(/Ward active \(2d8 remaining/)).toBeInTheDocument();
    });

    it('does not add Bastion of Law if already present', () => {
        useRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'bastionOfLawActive') return true;
            if (key === 'bastionOfLawWardDice') return [{ value: 8 }];
            if (key === 'activeBuffs') return [];
            return [];
        });
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [
                    { name: 'Opportunity Attack', description: '...' },
                    { name: 'Bastion of Law', description: 'Already present' },
                ],
            },
        });
        render(<CharReactions {...props} />);
        const bastionElements = screen.queryAllByText(/Bastion of Law/);
        expect(bastionElements).toHaveLength(1);
    });

    it('does not add Bastion of Law when no ward dice', () => {
        useRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'bastionOfLawActive') return true;
            if (key === 'bastionOfLawWardDice') return [];
            if (key === 'activeBuffs') return [];
            return [];
        });
        render(<CharReactions {...createProps()} />);
        expect(screen.queryByText("Bastion of Law:")).not.toBeInTheDocument();
    });

    it('does not add Bastion of Law when ward is not active', () => {
        useRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'bastionOfLawActive') return false;
            if (key === 'bastionOfLawWardDice') return [{ value: 8 }];
            if (key === 'activeBuffs') return [];
            return [];
        });
        render(<CharReactions {...createProps()} />);
        expect(screen.queryByText("Bastion of Law:")).not.toBeInTheDocument();
    });

    it('updates Stone\'s Endurance description when uses > 0', () => {
        getRuntimeValue.mockReturnValue(3);
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [
                    { name: "Stone's Endurance", description: 'Original desc' },
                ],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText(/3 uses remaining/)).toBeInTheDocument();
    });

    it('updates Stone\'s Endurance description when no uses remaining', () => {
        getRuntimeValue.mockReturnValue(0);
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [
                    { name: "Stone's Endurance", description: 'Original desc' },
                ],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText(/No uses remaining/)).toBeInTheDocument();
    });

    it('falls back to _trackedResources for Stone\'s Endurance uses', () => {
        getRuntimeValue.mockReturnValue(null);
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                _trackedResources: { stonesEnduranceUses: { current: 2 } },
                reactions: [
                    { name: "Stone's Endurance", description: 'Original desc' },
                ],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText(/2 uses remaining/)).toBeInTheDocument();
    });

    it('falls back to 0 when Stone\'s Endurance uses are missing from both sources', () => {
        getRuntimeValue.mockReturnValue(null);
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                _trackedResources: {},
                reactions: [
                    { name: "Stone's Endurance", description: 'Original desc' },
                ],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText(/No uses remaining/)).toBeInTheDocument();
    });

    it('does not update Stone\'s Endurance when reaction is absent', () => {
        getRuntimeValue.mockReturnValue(5);
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [
                    { name: 'Opportunity Attack', description: '...' },
                ],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.queryByText(/5 uses remaining/)).not.toBeInTheDocument();
    });

    it('updates Storm\'s Thunder description when uses > 0', () => {
        getRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'stormsThunderUses') return 2;
            return null;
        });
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [
                    { name: "Storm's Thunder", description: 'Original desc' },
                ],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText(/2 uses remaining/)).toBeInTheDocument();
    });

    it('updates Storm\'s Thunder description when no uses remaining', () => {
        getRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'stormsThunderUses') return 0;
            return null;
        });
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [
                    { name: "Storm's Thunder", description: 'Original desc' },
                ],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText(/No uses remaining/)).toBeInTheDocument();
    });

    it('falls back to _trackedResources for Storm\'s Thunder uses', () => {
        getRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'stormsThunderUses') return null;
            return null;
        });
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                _trackedResources: { stormsThunderUses: { current: 1 } },
                reactions: [
                    { name: "Storm's Thunder", description: 'Original desc' },
                ],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText(/1 uses remaining/)).toBeInTheDocument();
    });

    it('does not update Storm\'s Thunder when reaction is absent', () => {
        getRuntimeValue.mockReturnValue(3);
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [
                    { name: 'Opportunity Attack', description: '...' },
                ],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.queryByText(/3 uses remaining/)).not.toBeInTheDocument();
    });

    it('hides reactions in featuresToIgnore list', () => {
        getCategories.mockReturnValue({ featuresToIgnore: ['Opportunity Attack'] });
        render(<CharReactions {...createProps()} />);
        expect(screen.queryByText('Opportunity Attack:')).not.toBeInTheDocument();
    });

    it('renders dynamic reactions with featuresToIgnore applied', () => {
        useRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'activeBuffs') return [{ reactionSave: { dc: 15, type: 'CON' } }];
            return [];
        });
        // Revivification is in the ignore list but Opportunity Attack is not
        getCategories.mockReturnValue({ featuresToIgnore: ['Revivification'] });
        render(<CharReactions {...createProps()} />);
        expect(screen.queryByText('Revivification:')).not.toBeInTheDocument();
        expect(screen.getByText('Opportunity Attack:')).toBeInTheDocument();
    });

    it('renders correctly when activeBuffs is null', () => {
        useRuntimeValue.mockReturnValue(null);
        render(<CharReactions {...createProps()} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
        expect(screen.getByText('Opportunity Attack:')).toBeInTheDocument();
    });

    it('renders correctly when playerStats.reactions is undefined', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: undefined,
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
        expect(screen.getByText('Opportunity Attack:')).toBeInTheDocument();
    });
});
