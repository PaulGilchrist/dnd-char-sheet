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
vi.mock('../../services/ui/sanitize.js', () => ({ sanitizeHtml: (html) => (typeof html === 'string' ? html : String(html ?? '')) }));
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

describe('CharReactions - Edge Cases', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useRuntimeValue.mockReturnValue([]);
        getRuntimeValue.mockReturnValue(null);
        setRuntimeValue.mockReturnValue(undefined);
        hasAutomation.mockReturnValue(false);
        buildFeatureDetailHtml.mockImplementation((r) => `<div>${r.name}</div>`);
        getCategories.mockReturnValue({ featuresToIgnore: [] });
        getReactionSpellNames.mockReturnValue(new Set());
        resolveSpellDamageAtLevel.mockReturnValue(null);
        useLoggedDiceRoll.mockReturnValue({ rollAttack: vi.fn(), rollDamage: vi.fn() });
    });

    it('throws when playerStats is null', () => {
        expect(() => render(<CharReactions playerStats={null} campaignName={campaignName} />)).toThrow();
    });

    it('renders header and opportunity attack when reactions is null', () => {
        const props = createProps({ playerStats: { ...basePlayerStats, reactions: null } });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
        expect(screen.getByText('Opportunity Attack:')).toBeInTheDocument();
    });

    it('renders header and opportunity attack when reactions is an empty array', () => {
        const props = createProps({ playerStats: { ...basePlayerStats, reactions: [] } });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
        expect(screen.getByText('Opportunity Attack:')).toBeInTheDocument();
    });

    it('renders header when playerStats.name is undefined', () => {
        const props = createProps({ playerStats: { ...basePlayerStats, name: undefined } });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when campaignName is undefined', () => {
        const props = createProps({ campaignName: undefined });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders reaction with details property as clickable', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [
                    { name: 'Custom Reaction', description: 'Has details', details: 'Some detail' },
                ],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Custom Reaction:')).toHaveClass('clickable');
    });

    it('renders reactive strike as non-clickable', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [
                    { name: 'Reactive Strike', description: 'Reactive strike desc' },
                ],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactive Strike:')).not.toHaveClass('clickable');
    });

    it('renders header when playerStats.class is null', () => {
        const props = createProps({ playerStats: { ...basePlayerStats, class: null } });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when playerStats.level is null', () => {
        const props = createProps({ playerStats: { ...basePlayerStats, level: null } });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when playerStats.attacks is null', () => {
        const props = createProps({ playerStats: { ...basePlayerStats, attacks: null } });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when playerStats.abilities is null', () => {
        const props = createProps({ playerStats: { ...basePlayerStats, abilities: null } });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when playerStats._trackedResources is null', () => {
        const props = createProps({ playerStats: { ...basePlayerStats, _trackedResources: null } });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('throws when spellAbilities.spells is null (cannot access .length)', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                spellAbilities: { ...basePlayerStats.spellAbilities, spells: null },
            },
        });
        expect(() => render(<CharReactions {...props} />)).toThrow();
    });

    it('renders header when spellAbilities is null', () => {
        const props = createProps({
            playerStats: { ...basePlayerStats, spellAbilities: null },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when spellAbilities.spells is an empty array', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                spellAbilities: { ...basePlayerStats.spellAbilities, spells: [] },
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when playerStats.rules is 2024', () => {
        const props = createProps({ playerStats: { ...basePlayerStats, rules: '2024' } });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when playerStats.automation has potentSpellcasting feature', () => {
        const potentFeature = {
            type: 'damage_bonus',
            name: 'Potent Spellcasting',
            options: ['Spellcasting', 'Strength'],
        };
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                automation: { actions: [potentFeature] },
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when playerStats.automation.actions is empty array', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                automation: { actions: [] },
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when playerStats.automation is null', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                automation: null,
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when playerStats.abilities has entry with null bonus', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                abilities: [{ name: 'Strength', bonus: null }],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when spellAbilities.modifier is null', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                spellAbilities: { ...basePlayerStats.spellAbilities, modifier: null },
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when spellAbilities.toHit is null', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                spellAbilities: { ...basePlayerStats.spellAbilities, toHit: null },
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when spellAbilities.saveDc is null', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                spellAbilities: { ...basePlayerStats.spellAbilities, saveDc: null },
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when campaignName is null', () => {
        const props = createProps({ campaignName: null });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when characters is null', () => {
        const props = createProps({ characters: null });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when mapName is undefined', () => {
        const props = createProps({ mapName: undefined });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when cannotAct is true', () => {
        const props = createProps({ cannotAct: true });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when modalState is null', () => {
        const props = createProps({ modalState: null });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('throws when reactions contains null element', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [null, { name: 'Opportunity Attack', description: '...' }],
            },
        });
        expect(() => render(<CharReactions {...props} />)).toThrow();
    });

    it('renders header when reactions contains empty string name', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [{ name: '', description: 'Empty name' }],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when reactions contain reaction with no description', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [{ name: 'No Desc Reaction' }],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when attacks array has entry with missing range', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                attacks: [{ name: 'Fist', type: 'Action', hitBonus: 3 }],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when attacks array has entry with null hitBonus', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                attacks: [{ name: 'Fist', type: 'Action', range: 5, hitBonus: null }],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when spellAbilities.modifier is undefined', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                spellAbilities: { ...basePlayerStats.spellAbilities, modifier: undefined },
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when Wisdom ability bonus is 0', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                abilities: [
                    { name: 'Strength', bonus: 3 },
                    { name: 'Wisdom', bonus: 0 },
                ],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when Wisdom ability is missing', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                abilities: [
                    { name: 'Strength', bonus: 3 },
                ],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when playerStats.name is empty string', () => {
        const props = createProps({ playerStats: { ...basePlayerStats, name: '' } });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when playerStats.level is 0', () => {
        const props = createProps({ playerStats: { ...basePlayerStats, level: 0 } });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when playerStats.level is negative', () => {
        const props = createProps({ playerStats: { ...basePlayerStats, level: -1 } });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when spellAbilities.toHit is negative', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                spellAbilities: { ...basePlayerStats.spellAbilities, toHit: -5 },
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when spellAbilities.saveDc is 0', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                spellAbilities: { ...basePlayerStats.spellAbilities, saveDc: 0 },
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('hides all reactions when getCategories returns featuresToIgnore with all reaction names', () => {
        getCategories.mockReturnValue({
            featuresToIgnore: ['Opportunity Attack', 'Revivification', "Stone's Endurance", "Storm's Thunder", 'Bastion of Law', 'Stand (Power Word Heal)', 'Reactive Strike'],
        });
        const props = createProps();
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
        expect(screen.queryByText('Opportunity Attack:')).not.toBeInTheDocument();
    });

    it('throws when getCategories throws', () => {
        getCategories.mockImplementation(() => { throw new Error('category error'); });
        const props = createProps();
        expect(() => render(<CharReactions {...props} />)).toThrow('category error');
    });

    it('renders header when buildFeatureDetailHtml returns null for a reaction', () => {
        buildFeatureDetailHtml.mockReturnValue(null);
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [{ name: 'No Detail Reaction', description: 'No details' }],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when buildFeatureDetailHtml returns empty string', () => {
        buildFeatureDetailHtml.mockReturnValue('');
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [{ name: 'Empty Detail Reaction', description: 'Empty' }],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when useRuntimeValue returns undefined for activeBuffs', () => {
        useRuntimeValue.mockReturnValue(undefined);
        const props = createProps();
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when useRuntimeValue returns undefined for powerWordHealStandPermission', () => {
        useRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'powerWordHealStandPermission') return undefined;
            return [];
        });
        const props = createProps();
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when useRuntimeValue returns undefined for bastionOfLawActive', () => {
        useRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'bastionOfLawActive') return undefined;
            if (key === 'bastionOfLawWardDice') return [];
            return [];
        });
        const props = createProps();
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when useRuntimeValue returns undefined for bastionOfLawWardDice', () => {
        useRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'bastionOfLawActive') return true;
            if (key === 'bastionOfLawWardDice') return undefined;
            return [];
        });
        const props = createProps();
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when getRuntimeValue returns undefined for stonesEnduranceUses', () => {
        getRuntimeValue.mockReturnValue(undefined);
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [{ name: "Stone's Endurance", description: 'Original desc' }],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText("Stone's Endurance:")).toBeInTheDocument();
    });

    it('renders header when getRuntimeValue returns undefined for stormsThunderUses', () => {
        getRuntimeValue.mockReturnValue(undefined);
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [{ name: "Storm's Thunder", description: 'Original desc' }],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText("Storm's Thunder:")).toBeInTheDocument();
    });

    it('renders "No uses remaining" when getRuntimeValue returns 0 for stonesEnduranceUses', () => {
        getRuntimeValue.mockReturnValue(0);
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [{ name: "Stone's Endurance", description: 'Original desc' }],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText(/No uses remaining/)).toBeInTheDocument();
    });

    it('renders "No uses remaining" when getRuntimeValue returns 0 for stormsThunderUses', () => {
        getRuntimeValue.mockReturnValue(0);
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [{ name: "Storm's Thunder", description: 'Original desc' }],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText(/No uses remaining/)).toBeInTheDocument();
    });

    it('renders uses from _trackedResources fallback when getRuntimeValue returns null for stonesEnduranceUses', () => {
        getRuntimeValue.mockReturnValue(null);
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                _trackedResources: { stonesEnduranceUses: { current: 5 } },
                reactions: [{ name: "Stone's Endurance", description: 'Original desc' }],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText(/5 uses remaining/)).toBeInTheDocument();
    });

    it('renders uses from _trackedResources fallback when getRuntimeValue returns null for stormsThunderUses', () => {
        getRuntimeValue.mockReturnValue(null);
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                _trackedResources: { stormsThunderUses: { current: 3 } },
                reactions: [{ name: "Storm's Thunder", description: 'Original desc' }],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText(/3 uses remaining/)).toBeInTheDocument();
    });

    it('renders "No uses remaining" when both runtime and _trackedResources sources are missing', () => {
        getRuntimeValue.mockReturnValue(null);
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                _trackedResources: {},
                reactions: [{ name: "Stone's Endurance", description: 'Original desc' }],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText(/No uses remaining/)).toBeInTheDocument();
    });

    it('adds Revivification reaction when activeBuffs has buff with reactionSave', () => {
        useRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'activeBuffs') return [{ reactionSave: { dc: 15, type: 'CON' } }];
            return [];
        });
        const props = createProps();
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
        expect(screen.getByText('Revivification:')).toBeInTheDocument();
    });

    it('does not add Revivification when activeBuffs has buff without reactionSave', () => {
        useRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'activeBuffs') return [{ effect: 'some_buff' }];
            return [];
        });
        const props = createProps();
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
        expect(screen.queryByText('Revivification:')).not.toBeInTheDocument();
    });

    it('does not add duplicate Stand reaction when pwhStance is true and reaction already present', () => {
        useRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'powerWordHealStandPermission') return true;
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
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('does not add Bastion of Law when wardActive is true but wardDice is empty', () => {
        useRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'bastionOfLawActive') return true;
            if (key === 'bastionOfLawWardDice') return [];
            return [];
        });
        const props = createProps();
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
        expect(screen.queryByText('Bastion of Law:')).not.toBeInTheDocument();
    });

    it('adds Bastion of Law when wardActive is true and wardDice has one element', () => {
        useRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'bastionOfLawActive') return true;
            if (key === 'bastionOfLawWardDice') return [{ value: 8 }];
            return [];
        });
        const props = createProps();
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
        expect(screen.getByText('Bastion of Law:')).toBeInTheDocument();
    });

    it('does not add Bastion of Law when wardActive is falsy but wardDice has elements', () => {
        useRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'bastionOfLawActive') return false;
            if (key === 'bastionOfLawWardDice') return [{ value: 8 }];
            return [];
        });
        const props = createProps();
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
        expect(screen.queryByText('Bastion of Law:')).not.toBeInTheDocument();
    });

    it('does not add duplicate Revivification when multiple buffs have reactionSave', () => {
        useRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'activeBuffs') return [
                { reactionSave: { dc: 15, type: 'CON' } },
                { reactionSave: { dc: 12, type: 'CHA' } },
                { reactionSave: { dc: 10, type: 'WIS' } },
            ];
            return [];
        });
        const props = createProps();
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
        const revivificationElements = screen.queryAllByText(/Revivification/);
        expect(revivificationElements).toHaveLength(1);
    });

    it('does not add duplicate Opportunity Attack when already in reactions', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [
                    { name: 'Opportunity Attack', description: 'Custom desc' },
                ],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
        const oaElements = screen.queryAllByText(/Opportunity Attack/);
        expect(oaElements).toHaveLength(1);
    });

    it('adds Opportunity Attack automatically when missing from reactions', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
        expect(screen.getByText('Opportunity Attack:')).toBeInTheDocument();
    });

    it('renders header when playerStats has extra unknown properties', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                unknownProp1: 'value1',
                unknownProp2: { nested: 'object' },
                unknownProp3: [1, 2, 3],
                unknownProp4: null,
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when playerStats.name is very long', () => {
        const longName = 'A'.repeat(1000);
        const props = createProps({
            playerStats: { ...basePlayerStats, name: longName },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when playerStats.reactions has reaction with automation property', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [
                    {
                        name: 'Automated Reaction',
                        description: 'Has automation',
                        automation: { type: 'custom', payload: { key: 'value' } },
                    },
                ],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when playerStats.reactions has reaction with automation but no type', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [
                    {
                        name: 'Partial Automation',
                        description: 'Automation without type',
                        automation: { payload: { key: 'value' } },
                    },
                ],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when playerStats.reactions has reaction with automation type revivification', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [
                    {
                        name: 'Revivification',
                        description: 'Rage reaction',
                        automation: { type: 'revivification', reactionSave: { dc: 15, type: 'CON' } },
                    },
                ],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when playerStats.reactions has reaction with automation type bastion_of_law_spend', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [
                    {
                        name: 'Bastion of Law',
                        description: 'Ward reaction',
                        automation: { type: 'bastion_of_law_spend' },
                    },
                ],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when hasAutomation returns true for a reaction', () => {
        hasAutomation.mockReturnValue(true);
        const props = createProps();
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when getRuntimeValue for activeConditions throws', () => {
        getRuntimeValue.mockImplementation((_charKey, key, _cn) => {
            if (key === 'activeConditions') throw new Error('runtime error');
            return null;
        });
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [{ name: 'Stand (Power Word Heal)', description: 'Stand up' }],
            },
        });
        useRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'powerWordHealStandPermission') return true;
            return [];
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when setRuntimeValue for activeConditions throws', () => {
        setRuntimeValue.mockImplementation(() => { throw new Error('set error'); });
        getRuntimeValue.mockImplementation((_charKey, key, _cn) => {
            if (key === 'activeConditions') return ['Prone'];
            return null;
        });
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [{ name: 'Stand (Power Word Heal)', description: 'Stand up' }],
            },
        });
        useRuntimeValue.mockImplementation((_charKey, key) => {
            if (key === 'powerWordHealStandPermission') return true;
            return [];
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('calls useRuntimeValue with correct keys for runtime reads', () => {
        const calls = [];
        useRuntimeValue.mockImplementation((charKey, key) => {
            calls.push({ charKey, key });
            return [];
        });
        getRuntimeValue.mockImplementation((charKey, key) => {
            calls.push({ charKey, key });
            return null;
        });
        const props = createProps();
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
        expect(calls.some(c => c.key === 'stonesEnduranceUses')).toBe(true);
        expect(calls.some(c => c.key === 'stormsThunderUses')).toBe(true);
    });

    it('renders header when playerStats.spellAbilities.spells has entry with heal_at_slot_level', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                spellAbilities: {
                    ...basePlayerStats.spellAbilities,
                    spells: [{ name: 'Lesser Restoration', casting_time: '1 reaction', level: 2, range: 'Touch', prepared: 'Always', damage: null, heal_at_slot_level: true }],
                },
            },
        });
        getReactionSpellNames.mockReturnValue(new Set(['Lesser Restoration']));
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when playerStats.spellAbilities.spells has entry with dc', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                spellAbilities: {
                    ...basePlayerStats.spellAbilities,
                    spells: [{ name: 'Bane', casting_time: '1 reaction', level: 1, range: '60 ft.', prepared: 'Always', damage: null, dc: { dc_type: 'WIS' } }],
                },
            },
        });
        getReactionSpellNames.mockReturnValue(new Set(['Bane']));
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when playerStats.spellAbilities.spells has entry with attack_type', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                spellAbilities: {
                    ...basePlayerStats.spellAbilities,
                    toHit: 5,
                    spells: [{ name: 'Thorn Whip', casting_time: '1 reaction', level: 0, range: '30 ft.', prepared: 'Always', damage: '1d8 thunder', attack_type: 'melee' }],
                },
            },
        });
        getReactionSpellNames.mockReturnValue(new Set(['Thorn Whip']));
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when playerStats.attacks has entry with type other than Action', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                attacks: [
                    { name: 'Bonus Attack', type: 'Bonus Action', range: 5, hitBonus: 6 },
                ],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when playerStats.attacks has entry with non-numeric range', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                attacks: [
                    { name: 'Fist', type: 'Action', range: 'melee', hitBonus: 6 },
                ],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when playerStats.abilities has extra abilities beyond Strength and Wisdom', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                abilities: [
                    { name: 'Strength', bonus: 3 },
                    { name: 'Dexterity', bonus: 2 },
                    { name: 'Constitution', bonus: 1 },
                    { name: 'Intelligence', bonus: 0 },
                    { name: 'Wisdom', bonus: 2 },
                    { name: 'Charisma', bonus: -1 },
                ],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders header when playerStats.abilities has entry with negative bonus', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                abilities: [
                    { name: 'Strength', bonus: 3 },
                    { name: 'Wisdom', bonus: -2 },
                ],
            },
        });
        render(<CharReactions {...props} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });
});
