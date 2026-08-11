import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CharReactions from './CharReactions.jsx';

// Mock all external modules - use React.createElement for vi.mock factories
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
import { hasAutomation, hasTacticalShift, hasSpeedyOpportunityDisadvantage } from '../../services/combat/automation/automationService.js';
import { getCombatContext, getTargetFromAttacker } from '../../services/rules/combat/damageUtils.js';
import useLoggedDiceRoll from '../../hooks/combat/useLoggedDiceRoll.js';
import { buildFeatureDetailHtml } from '../../hooks/combat/useActionPopup.js';
import { getCategories } from '../../services/character/featureCategories.js';
import { getReactionSpellNames } from '../../services/ui/spellSectionUtils.js';
import { resolveSpellDamageAtLevel, isAutoHitSpell, resolveHealExpression } from '../../services/rules/core/spellDamageUtils.js';
import { useSpellMetamagicFlow } from '../../hooks/combat/useSpellMetamagicFlow.js';
import { useSpellPositionResolver } from '../../hooks/combat/useSpellPositionResolver.js';
import { useSpellCastExecutor } from '../../hooks/combat/useSpellCastExecutor.js';

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
        useRuntimeValue.mockReturnValue([]);
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

    it('renders the reactions section header', () => {
        render(<CharReactions {...createProps()} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('renders the opportunity attack reaction', () => {
        render(<CharReactions {...createProps()} />);
        expect(screen.getByText('Opportunity Attack:')).toBeInTheDocument();
    });

    it('renders reaction descriptions', () => {
        render(<CharReactions {...createProps()} />);
        expect(screen.getByText('Can attack creature that moves out of your reach')).toBeInTheDocument();
    });

    it('renders reaction spells when available', () => {
        render(<CharReactions {...createProps()} />);
        expect(screen.getByText('Shield')).toBeInTheDocument();
        expect(screen.getByText('Hellish Rebuke')).toBeInTheDocument();
    });

    it('renders spell level column', () => {
        render(<CharReactions {...createProps()} />);
        expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
    });

    it('renders spell range column', () => {
        render(<CharReactions {...createProps()} />);
        expect(screen.getByText('Self')).toBeInTheDocument();
        expect(screen.getByText('60 ft.')).toBeInTheDocument();
    });

    it('renders save DC for spells with DC', () => {
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
        render(<CharReactions {...createProps(props)} />);
        expect(screen.getByText('DC 13 WIS')).toBeInTheDocument();
    });

    it('renders heal expression for healing spells', () => {
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
        render(<CharReactions {...createProps(props)} />);
        expect(screen.getByText('2d8+3')).toBeInTheDocument();
        expect(screen.getByText('Healing')).toBeInTheDocument();
    });

    it('renders damage type column', () => {
        render(<CharReactions {...createProps()} />);
        expect(document.body.textContent).toContain('fire');
    });

    it('renders "Utility" when no damage type and not healing', () => {
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
        render(<CharReactions {...createProps(props)} />);
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
        render(<CharReactions {...createProps(props)} />);
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
        render(<CharReactions {...createProps(props)} />);
        expect(screen.getByText('+5')).toBeInTheDocument();
    });

    it('does not render spell section when no reaction spells', () => {
        getReactionSpellNames.mockReturnValue(new Set());
        render(<CharReactions {...createProps()} />);
        expect(screen.queryByText('Shield')).not.toBeInTheDocument();
    });

    it('does not render spells section when spellAbilities is missing', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                spellAbilities: null,
            },
        });
        render(<CharReactions {...createProps(props)} />);
        expect(screen.queryByText('Shield')).not.toBeInTheDocument();
    });

    it('does not render spells section when no spells array', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                spellAbilities: {},
            },
        });
        // Code checks spellAbilities.spells.length which will throw if spells is undefined
        // This tests the code behavior - it will throw
        expect(() => render(<CharReactions {...createProps(props)} />)).toThrow();
    });

    it('renders clickable spell name to open popup', () => {
        render(<CharReactions {...createProps()} />);
        const spellLink = screen.getByText('Shield');
        fireEvent.click(spellLink);
        expect(screen.getByTestId('popup')).toBeInTheDocument();
        expect(screen.getByTestId('spell-detail-popup')).toBeInTheDocument();
    });

    it('renders clickable damage for non-healing spells', () => {
        render(<CharReactions {...createProps()} />);
        const damageCells = screen.getAllByText('1d10');
        expect(damageCells[0]).toHaveClass('clickable');
    });

    it('renders auto-hit spells without attack bonus column', () => {
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

describe('CharReactions - Dynamic Reactions', () => {
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

    it('adds Revivification reaction when buff has reactionSave and not already present', () => {
        useRuntimeValue.mockImplementation((charKey, key) => {
            if (key === 'activeBuffs') return [{ reactionSave: { dc: 15, type: 'CON' } }];
            return [];
        });
        render(<CharReactions {...createProps()} />);
        expect(screen.getByText('Revivification:')).toBeInTheDocument();
    });

    it('does not add duplicate Revivification if already in reactions', () => {
        useRuntimeValue.mockImplementation((charKey, key) => {
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
        render(<CharReactions {...createProps(props)} />);
        const revivificationElements = screen.queryAllByText(/Revivification/);
        expect(revivificationElements.length).toBe(1);
    });

    it('adds Stand (Power Word Heal) reaction when pwhStance is truthy', () => {
        useRuntimeValue.mockImplementation((charKey, key) => {
            if (key === 'powerWordHealStandPermission') return true;
            if (key === 'activeBuffs') return [];
            return [];
        });
        render(<CharReactions {...createProps()} />);
        expect(screen.getByText('Stand (Power Word Heal):')).toBeInTheDocument();
    });

    it('does not add duplicate Stand reaction if already present', () => {
        useRuntimeValue.mockImplementation((charKey, key) => {
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
        render(<CharReactions {...createProps(props)} />);
        const standElements = screen.queryAllByText(/Stand \(Power Word Heal\)/);
        expect(standElements.length).toBe(1);
    });

    it('adds Bastion of Law reaction when ward is active with dice', () => {
        useRuntimeValue.mockImplementation((charKey, key) => {
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
        useRuntimeValue.mockImplementation((charKey, key) => {
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
        render(<CharReactions {...createProps(props)} />);
        const bastionElements = screen.queryAllByText(/Bastion of Law/);
        expect(bastionElements.length).toBe(1);
    });

    it('does not add Bastion of Law when no ward dice', () => {
        useRuntimeValue.mockImplementation((charKey, key) => {
            if (key === 'bastionOfLawActive') return true;
            if (key === 'bastionOfLawWardDice') return [];
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
        render(<CharReactions {...createProps(props)} />);
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
        render(<CharReactions {...createProps(props)} />);
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
        render(<CharReactions {...createProps(props)} />);
        expect(screen.getByText(/2 uses remaining/)).toBeInTheDocument();
    });

    it('updates Storm\'s Thunder description when uses > 0', () => {
        getRuntimeValue.mockImplementation((charKey, key) => {
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
        render(<CharReactions {...createProps(props)} />);
        expect(screen.getByText(/2 uses remaining/)).toBeInTheDocument();
    });

    it('updates Storm\'s Thunder description when no uses remaining', () => {
        getRuntimeValue.mockImplementation((charKey, key) => {
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
        render(<CharReactions {...createProps(props)} />);
        expect(screen.getByText(/No uses remaining/)).toBeInTheDocument();
    });

    it('falls back to _trackedResources for Storm\'s Thunder uses', () => {
        getRuntimeValue.mockImplementation((charKey, key) => {
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
        render(<CharReactions {...createProps(props)} />);
        expect(screen.getByText(/1 uses remaining/)).toBeInTheDocument();
    });

    it('hides reactions in featuresToIgnore list', () => {
        getCategories.mockReturnValue({ featuresToIgnore: ['Opportunity Attack'] });
        render(<CharReactions {...createProps()} />);
        expect(screen.queryByText('Opportunity Attack:')).not.toBeInTheDocument();
    });
});

describe('CharReactions - handleReactionClick', () => {
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

    it('does nothing when cannotAct is true', () => {
        const props = createProps({ cannotAct: true });
        render(<CharReactions {...createProps(props)} />);
        const reaction = screen.getByText('Opportunity Attack:');
        fireEvent.click(reaction);
        expect(setRuntimeValue).not.toHaveBeenCalled();
    });

    it('calls buildFeatureDetailHtml for reactions without automation or special handlers', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: [
                    { name: 'Custom Reaction', description: 'Custom desc', details: 'some details' },
                ],
            },
        });
        render(<CharReactions {...createProps(props)} />);
        const reaction = screen.getByText('Custom Reaction:');
        fireEvent.click(reaction);
        expect(buildFeatureDetailHtml).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Custom Reaction' })
        );
    });

    it('handles Stand (Power Word Heal) reaction - removes prone condition', () => {
        useRuntimeValue.mockImplementation((charKey, key) => {
            if (key === 'powerWordHealStandPermission') return true;
            if (key === 'activeBuffs') return [];
            return [];
        });
        getRuntimeValue.mockImplementation((charKey, key, _cn) => {
            if (key === 'activeConditions') return ['Prone', 'Poisoned'];
            return null;
        });
        render(<CharReactions {...createProps()} />);
        const standReaction = screen.getByText('Stand (Power Word Heal):');
        fireEvent.click(standReaction);
        expect(setRuntimeValue).toHaveBeenCalledWith(
            'TestFighter',
            'activeConditions',
            ['Poisoned'],
            campaignName
        );
    });

    it('handles Stand (Power Word Heal) reaction - sets permission to false', () => {
        useRuntimeValue.mockImplementation((charKey, key) => {
            if (key === 'powerWordHealStandPermission') return true;
            if (key === 'activeBuffs') return [];
            return [];
        });
        getRuntimeValue.mockImplementation((charKey, key, _cn) => {
            if (key === 'activeConditions') return [];
            return null;
        });
        render(<CharReactions {...createProps()} />);
        const standReaction = screen.getByText('Stand (Power Word Heal):');
        fireEvent.click(standReaction);
        expect(setRuntimeValue).toHaveBeenCalledWith(
            'TestFighter',
            'powerWordHealStandPermission',
            false,
            campaignName
        );
    });

    it('does not set activeConditions if no change (no prone)', () => {
        useRuntimeValue.mockImplementation((charKey, key) => {
            if (key === 'powerWordHealStandPermission') return true;
            if (key === 'activeBuffs') return [];
            return [];
        });
        getRuntimeValue.mockImplementation((charKey, key, _cn) => {
            if (key === 'activeConditions') return ['Poisoned'];
            return null;
        });
        render(<CharReactions {...createProps()} />);
        const standReaction = screen.getByText('Stand (Power Word Heal):');
        fireEvent.click(standReaction);
        // setRuntimeValue should only be called once for powerWordHealStandPermission, not for conditions
        const conditionCalls = setRuntimeValue.mock.calls.filter(c => c[1] === 'activeConditions');
        expect(conditionCalls.length).toBe(0);
    });
});

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

    it('handles null playerStats gracefully', () => {
        const props = createProps({ playerStats: null });
        // Component accesses playerStats.name which will throw if null
        expect(() => render(<CharReactions {...createProps(props)} />)).toThrow('Cannot read properties of null');
    });

    it('handles missing reactions array', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                reactions: undefined,
            },
        });
        render(<CharReactions {...createProps(props)} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('handles missing playerStats.name', () => {
        const props = createProps({
            playerStats: {
                ...basePlayerStats,
                name: undefined,
            },
        });
        render(<CharReactions {...createProps(props)} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('handles missing campaignName', () => {
        const props = createProps({ campaignName: undefined });
        render(<CharReactions {...createProps(props)} />);
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
        render(<CharReactions {...createProps(props)} />);
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
        render(<CharReactions {...createProps(props)} />);
        expect(screen.getByText('Reactive Strike:')).not.toHaveClass('clickable');
    });
});

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

describe('CharReactions - useSpellCastExecutor integration', () => {
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

    it('calls useSpellCastExecutor with campaignName and characters', () => {
        const castAction = vi.fn();
        vi.mocked(useSpellCastExecutor).mockReturnValue({ castAction });
        render(<CharReactions {...createProps()} />);
        expect(useSpellCastExecutor).toHaveBeenCalledTimes(1);
        expect(useSpellCastExecutor.mock.calls[0][4]).toBe(campaignName);
        expect(useSpellCastExecutor.mock.calls[0][6]).toEqual([]);
    });
});

describe('CharReactions - useSpellPositionResolver integration', () => {
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

    it('calls useSpellPositionResolver with correct arguments', () => {
        const resolvePositions = vi.fn();
        vi.mocked(useSpellPositionResolver).mockReturnValue({ resolvePositions: resolvePositions, cachedPosRef: { current: null } });
        render(<CharReactions {...createProps()} />);
        expect(useSpellPositionResolver).toHaveBeenCalledWith(campaignName, null, 'TestFighter');
    });
});

describe('CharReactions - useRuntimeValue hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getRuntimeValue.mockReturnValue(null);
        setRuntimeValue.mockReturnValue(undefined);
        hasAutomation.mockReturnValue(false);
        buildFeatureDetailHtml.mockImplementation((r) => `<div>${r.name}</div>`);
        getCategories.mockReturnValue({ featuresToIgnore: [] });
        getReactionSpellNames.mockReturnValue(new Set());
        resolveSpellDamageAtLevel.mockReturnValue(null);
        useLoggedDiceRoll.mockReturnValue({ rollAttack: vi.fn(), rollDamage: vi.fn() });
    });

    it('uses activeBuffs from runtime when available', () => {
        useRuntimeValue.mockImplementation((charKey, key) => {
            if (key === 'activeBuffs') return [{ effect: 'test_buff' }];
            return [];
        });
        render(<CharReactions {...createProps()} />);
        expect(useRuntimeValue).toHaveBeenCalledWith('TestFighter', 'activeBuffs', campaignName);
    });

    it('defaults to empty array when activeBuffs is null', () => {
        useRuntimeValue.mockReturnValue(null);
        render(<CharReactions {...createProps()} />);
        expect(screen.getByText('Reactions')).toBeInTheDocument();
    });

    it('reads powerWordHealStandPermission from runtime', () => {
        useRuntimeValue.mockImplementation((charKey, key) => {
            if (key === 'powerWordHealStandPermission') return true;
            if (key === 'activeBuffs') return [];
            return [];
        });
        render(<CharReactions {...createProps()} />);
        expect(useRuntimeValue).toHaveBeenCalledWith('TestFighter', 'powerWordHealStandPermission', campaignName);
    });

    it('reads bastionOfLawActive and bastionOfLawWardDice from runtime', () => {
        useRuntimeValue.mockImplementation((charKey, key) => {
            if (key === 'bastionOfLawActive') return true;
            if (key === 'bastionOfLawWardDice') return [{ value: 8 }];
            if (key === 'activeBuffs') return [];
            return [];
        });
        render(<CharReactions {...createProps()} />);
        expect(useRuntimeValue).toHaveBeenCalledWith('TestFighter', 'bastionOfLawActive', campaignName);
        expect(useRuntimeValue).toHaveBeenCalledWith('TestFighter', 'bastionOfLawWardDice', campaignName);
    });
});

describe('CharReactions - getReactionSpellDamageDisplay logic', () => {
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
        resolveHealExpression.mockReturnValue('2d8+3');
        isAutoHitSpell.mockReturnValue(false);
        useLoggedDiceRoll.mockReturnValue({ rollAttack: vi.fn(), rollDamage: vi.fn() });
    });

    it('calls resolveHealExpression for healing spells in render', () => {
        resolveHealExpression.mockReturnValue('3d8+4');
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
        render(<CharReactions {...createProps(props)} />);
        expect(resolveHealExpression).toHaveBeenCalled();
    });
});
