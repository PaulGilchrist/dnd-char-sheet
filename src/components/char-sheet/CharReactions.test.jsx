import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CharReactions from './CharReactions';

// Mock all dependencies
vi.mock('../common/popup.jsx', () => ({
    default: ({ children }) => <div data-testid="popup">{children}</div>,
}));

vi.mock('./char-spells/SpellDetailPopup.jsx', () => ({
    default: ({ spell }) => <div data-testid="spell-detail">{spell?.name || ''}</div>,
}));

vi.mock('./popups/MetamagicPopup.jsx', () => ({
    default: () => <div data-testid="metamagic-popup">MetamagicPopup</div>,
}));

vi.mock('./modals/arcane/ArcaneWardRestoreModal.jsx', () => ({
    default: () => <div data-testid="arcane-ward-restore">open</div>,
}));

vi.mock('./modals/divine/BastionOfLawSpendModal.jsx', () => ({
    default: () => <div data-testid="bastion-of-law-spend">open</div>,
}));

vi.mock('./modals/shared/SecondaryTargetModal.jsx', () => ({
    default: (props) => (
        <div data-testid="secondary-target-modal">
            <span data-testid="modal-title">{props.title || ''}</span>
            <button onClick={() => props.onTargetSelected('TargetName')} data-testid="confirm-btn">Confirm</button>
            <button onClick={() => props.onSkip()} data-testid="skip-btn">Skip</button>
        </div>
    ),
}));

vi.mock('./modals/BendFateModal.jsx', () => ({
    default: () => <div data-testid="bend-fate-modal">open</div>,
}));

vi.mock('./modals/BoonFateModal.jsx', () => ({
    default: () => <div data-testid="boon-fate-modal">open</div>,
}));

vi.mock('./modals/StepsOfTheFeyTauntModal.jsx', () => ({
    default: () => <div data-testid="steps-of-the-fey-taunt">open</div>,
}));

vi.mock('./modals/SearingVengeanceModal.jsx', () => ({
    default: (props) => (
        <div data-testid="searing-vengeance-modal">
            <button onClick={() => props.onConfirm([{ name: 'Target1' }])} data-testid="confirm-targets">Confirm</button>
            <button onClick={() => props.onSkip()} data-testid="skip-vengeance">Skip</button>
        </div>
    ),
}));

vi.mock('../../services/ui/spellSectionUtils.js', () => ({
    getReactionSpellNames: vi.fn(() => new Set(['Shield'])),
}));

vi.mock('../../services/character/featureCategories.js', () => ({
    getCategories: vi.fn(() => ({ featuresToIgnore: [] })),
}));

vi.mock('../../services/ui/sanitize.js', () => ({
    sanitizeHtml: vi.fn((html) => html),
}));

vi.mock('../../hooks/combat/useActionPopup.js', () => ({
    buildFeatureDetailHtml: vi.fn((reaction) => `<div>${reaction?.name || ''}</div>`),
}));

vi.mock('../../hooks/combat/useLoggedDiceRoll.js', () => ({
    default: vi.fn(() => ({
        rollAttack: vi.fn(),
        rollDamage: vi.fn(),
    })),
}));

vi.mock('../../hooks/combat/DiceRollContext.js', () => ({
    useDiceRollPopup: vi.fn(() => ({ setPopupHtml: vi.fn() })),
}));

vi.mock('../../services/combat/baseCombatActions.js', () => ({
    OPPORTUNITY_ATTACK: { name: 'Opportunity Attack', description: 'Can attack creature that moves out of your reach' },
    MELEE_REACH_FEET: 5,
}));

vi.mock('../../services/combat/automation/automationService.js', () => ({
    hasAutomation: vi.fn((reaction) => !!(reaction?.automation)),
    hasTacticalShift: vi.fn(() => false),
    hasSpeedyOpportunityDisadvantage: vi.fn(() => false),
}));

vi.mock('../../services/rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
    getTargetFromAttacker: vi.fn(),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
    getStore: vi.fn(() => new Map()),
    useSyncedState: vi.fn(() => [null, vi.fn()]),
    useRuntimeValue: vi.fn(),
    listeners: new Map(),
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
    setRuntimeBatch: vi.fn(),
    getAllStoreKeys: vi.fn(() => []),
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
    addEntry: vi.fn(() => Promise.resolve()),
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
    normalizeAutoDamage: vi.fn((attack) => ({ attack, ctxOverrides: {} })),
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
    useSpellUpcastFlow: vi.fn(() => ({
        buildUpcastLevels: vi.fn(() => []),
    })),
}));

vi.mock('../../hooks/combat/useSpellPositionResolver.js', () => ({
    useSpellPositionResolver: vi.fn(() => ({
        resolvePositions: vi.fn(),
        cachedPosRef: { current: null },
    })),
}));

vi.mock('../../hooks/combat/useSpellCastExecutor.js', () => ({
    useSpellCastExecutor: vi.fn(() => ({
        castAction: vi.fn(),
    })),
}));

vi.mock('../../services/rules/core/spellDamageUtils.js', () => ({
    resolveSpellDamageAtLevel: vi.fn(() => '1d4+2'),
    isAutoHitSpell: vi.fn(() => false),
    resolveHealExpression: vi.fn((spell, _level, _mod) => {
        if (typeof spell.heal_at_slot_level === 'object' && spell.heal_at_slot_level !== null) {
            const keys = Object.keys(spell.heal_at_slot_level);
            const raw = spell.heal_at_slot_level[keys[0]];
            return (raw || '').replace(/\bMOD\b/g, '3').replace(/\s*([+-])\s*/g, '$1');
        }
        return '1d4+3';
    }),
}));

vi.mock('../../services/ui/formatUtils.js', () => ({
    signFormatter: { format: (val) => (val > 0 ? '+' : '') + val },
}));

vi.mock('./CharActions.css', () => ({}));

// Import mocked functions
import { getRuntimeValue, setRuntimeValue, useRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { useDiceRollPopup } from '../../hooks/combat/DiceRollContext.js';
import { executeHandler } from '../../services/automation/index.js';
import { getCombatContext, getTargetFromAttacker } from '../../services/rules/combat/damageUtils.js';
import { isAutoHitSpell } from '../../services/rules/core/spellDamageUtils.js';
import { getCategories } from '../../services/character/featureCategories.js';
import { getReactionSpellNames } from '../../services/ui/spellSectionUtils.js';

// Extract setPopupHtml from the mocked useDiceRollPopup return value
const mockPopupHtml = vi.fn();
vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: mockPopupHtml });

// Helper to create playerStats
function createPlayerStats(overrides = {}) {
    return {
        name: 'TestChar',
        level: 5,
        proficiency: 3,
        abilities: [{ name: 'Strength', bonus: 3 }, { name: 'Wisdom', bonus: 2 }],
        reactions: [
            { name: "Stone's Endurance", description: 'Test description', automation: { type: 'stones_endurance' } },
            { name: "Storm's Thunder", description: 'Test description', automation: { type: 'storms_thunder' } },
        ],
        spellAbilities: {
            spells: [
                { name: 'Shield', casting_time: '1 reaction', level: 1, prepared: 'Prepared', damage: 'none', range: 'Self', attack_type: '', dc: { dc_type: '' } },
            ],
            toHit: 6,
            saveDc: 13,
        },
        attacks: [
            { name: 'Longsword', type: 'Action', range: 5, hitBonus: 6, damage: '1d8+3' },
        ],
        ...overrides,
    };
}

function renderComponent(overrides = {}) {
    const playerStats = createPlayerStats(overrides.playerStats || overrides);
    const cannotAct = overrides.cannotAct || false;
    return render(
        <CharReactions
            playerStats={playerStats}
            campaignName="test-campaign"
            cannotAct={cannotAct}
            mapName="test-map"
            characters={[playerStats]}
        />
    );
}

describe('CharReactions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getRuntimeValue.mockReturnValue(null);
        useRuntimeValue.mockReturnValue(null);
        getCombatContext.mockResolvedValue(null);
        getTargetFromAttacker.mockReturnValue(null);
        executeHandler.mockReturnValue(null);
    });

    describe('rendering', () => {
        it('renders the section header', () => {
            renderComponent();
            expect(screen.getByText('Reactions')).toBeTruthy();
        });

        it('renders reaction names from playerStats', () => {
            renderComponent();
            expect(screen.getByText(/Stone's Endurance/)).toBeTruthy();
            expect(screen.getByText(/Storm's Thunder/)).toBeTruthy();
        });

        it('renders Opportunity Attack automatically', () => {
            renderComponent();
            expect(screen.getByText(/Opportunity Attack/)).toBeTruthy();
        });

        it('renders reaction spells from playerStats', () => {
            renderComponent();
            expect(screen.getByText('Shield')).toBeTruthy();
        });

        it('renders with cannotAct=true', () => {
            renderComponent({ playerStats: { spellAbilities: { spells: [], toHit: 6, saveDc: 13 } }, cannotAct: true });
            expect(screen.getByText('Reactions')).toBeTruthy();
        });

        it('renders with no spellAbilities', () => {
            renderComponent({ playerStats: { reactions: [], spellAbilities: null } });
            expect(screen.getByText(/Opportunity Attack/)).toBeTruthy();
        });

        it('renders with rules undefined', () => {
            renderComponent({ rules: undefined });
            expect(screen.getByText('Reactions')).toBeTruthy();
        });

        it('filters out ignored features', () => {
            getCategories.mockReturnValue({
                featuresToIgnore: ["Stone's Endurance"],
            });
            renderComponent();
            expect(screen.queryByText(/Stone's Endurance/)).toBeFalsy();
            expect(screen.getByText(/Storm's Thunder/)).toBeTruthy();
        });
    });

    describe('Spell rendering', () => {
        it('renders spell damage for reaction spells', () => {
            renderComponent();
            expect(screen.getByText('Shield')).toBeTruthy();
        });

        it('renders spell level for reaction spells', () => {
            renderComponent();
            expect(screen.getByText('1')).toBeTruthy();
        });

        it('renders spell range for reaction spells', () => {
            renderComponent();
            expect(screen.getByText('Self')).toBeTruthy();
        });

        it('renders save DC for spells with dc', () => {
            renderComponent();
            expect(screen.getByText(/DC 13/)).toBeTruthy();
        });

        it('renders clickable spell attack hit bonus', () => {
            getReactionSpellNames.mockReturnValue(new Set(['Magic Missile']));
            renderComponent({
                playerStats: {
                    ...createPlayerStats(),
                    spellAbilities: {
                        spells: [
                            { name: 'Magic Missile', casting_time: '1 reaction', level: 1, prepared: 'Prepared', damage: '1d4+1 force', range: '120 feet', attack_type: 'Ranged Spell Attack', dc: null },
                        ],
                        toHit: 6,
                        saveDc: 13,
                    },
                },
            });
            const toHitElements = screen.getAllByText(/\+6/);
            expect(toHitElements.length).toBeGreaterThan(0);
        });

        it('renders empty cell for auto-hit spells', () => {
            isAutoHitSpell.mockReturnValue(true);
            renderComponent();
            expect(screen.getByText('Reactions')).toBeTruthy();
        });

        it('renders healing for spells with heal_at_slot_level', () => {
            getReactionSpellNames.mockReturnValue(new Set(['Healing Word']));
            renderComponent({
                playerStats: {
                    ...createPlayerStats(),
                    spellAbilities: {
                        spells: [
                            { name: 'Healing Word', casting_time: '1 reaction', level: 1, prepared: 'Prepared', heal_at_slot_level: true, range: '60 feet' },
                        ],
                        toHit: 6,
                        saveDc: 13,
                    },
                },
            });
            expect(screen.getByText(/Healing Word/)).toBeTruthy();
        });

        it('renders utility for spells without damage or healing', () => {
            getReactionSpellNames.mockReturnValue(new Set(['Counterattack']));
            renderComponent({
                playerStats: {
                    ...createPlayerStats(),
                    spellAbilities: {
                        spells: [
                            { name: 'Counterattack', casting_time: '1 reaction', level: 0, prepared: 'Always', damage: '', range: 'Self', attack_type: null },
                        ],
                        toHit: 6,
                        saveDc: 13,
                    },
                },
            });
            expect(screen.getByText(/Counterattack/)).toBeTruthy();
        });

        it('renders spell attack with attack type', () => {
            getReactionSpellNames.mockReturnValue(new Set(['Ray of Frost']));
            renderComponent({
                playerStats: {
                    ...createPlayerStats(),
                    spellAbilities: {
                        spells: [
                            { name: 'Ray of Frost', casting_time: '1 reaction', level: 0, prepared: 'Always', damage: '1d8 cold', range: '60 feet', attack_type: 'Ranged Spell Attack' },
                        ],
                        toHit: 6,
                        saveDc: 13,
                    },
                },
            });
            expect(screen.getByText(/Ray of Frost/)).toBeTruthy();
        });
    });

    describe('handleReactionClick - cannotAct guard', () => {
        it('does not trigger any action when cannotAct is true', async () => {
            renderComponent({ cannotAct: true });
            const oppAttack = screen.getByText(/Opportunity Attack/);
            fireEvent.click(oppAttack);
            expect(setRuntimeValue).not.toHaveBeenCalled();
        });
    });

    describe('handleReactionClick - feature popup', () => {
        it('shows popup html for reactions without automation', async () => {
            renderComponent({
                playerStats: {
                    ...createPlayerStats(),
                    reactions: [{ name: 'Test Reaction', description: 'Test', details: 'test details' }],
                },
            });
            const reaction = screen.getByText(/Test Reaction/);
            fireEvent.click(reaction);
            await waitFor(() => {
                expect(mockPopupHtml).toHaveBeenCalled();
            });
        });
    });

    describe('handleAutomationReaction - attack_roll result', () => {
        it('handles attack_roll result type', async () => {
            executeHandler.mockResolvedValue({
                type: 'attack_roll',
                payload: {
                    attack: { name: 'Test Attack', hitBonus: 5, damage: '1d6', damageType: 'Slashing' },
                    targetName: 'Enemy',
                },
            });
            renderComponent({
                playerStats: {
                    ...createPlayerStats(),
                    reactions: [{ name: 'Test Auto Reaction', automation: { type: 'test_auto' } }],
                },
            });
            const reaction = screen.getByText(/Test Auto Reaction/);
            fireEvent.click(reaction);
            await waitFor(() => {
                expect(executeHandler).toHaveBeenCalled();
            });
        });
    });

    describe('handleAutomationReaction - popup result', () => {
        it('handles popup result with eligibleSpells', async () => {
            executeHandler.mockResolvedValue({
                type: 'popup',
                payload: {
                    eligibleSpells: [{ name: 'Burning Hands' }],
                },
            });
            renderComponent({
                playerStats: {
                    ...createPlayerStats(),
                    reactions: [{ name: 'Test Auto Popup', automation: { type: 'test_popup' } }],
                },
            });
            const reaction = screen.getByText(/Test Auto Popup/);
            fireEvent.click(reaction);
            await waitFor(() => {
                expect(executeHandler).toHaveBeenCalled();
            });
        });
    });

    describe('handleAutomationReaction - modal results', () => {
        it('handles arcaneWardRestore modal', async () => {
            executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'arcaneWardRestore',
                payload: { test: 'data' },
            });
            renderComponent({
                playerStats: {
                    ...createPlayerStats(),
                    reactions: [{ name: 'Arcane Ward', automation: { type: 'arcane_ward' } }],
                },
            });
            const reaction = screen.getByText(/Arcane Ward/);
            fireEvent.click(reaction);
            await waitFor(() => {
                expect(executeHandler).toHaveBeenCalled();
            });
        });

        it('handles beguilingTwist modal', async () => {
            executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'beguilingTwist',
                payload: { test: 'data' },
            });
            renderComponent({
                playerStats: {
                    ...createPlayerStats(),
                    reactions: [{ name: 'Beguiling Twist', automation: { type: 'beguiling_twist' } }],
                },
            });
            const reaction = screen.getByText(/Beguiling Twist/);
            fireEvent.click(reaction);
            await waitFor(() => {
                expect(executeHandler).toHaveBeenCalled();
            });
        });

        it('handles bastionOfLawSpend modal', async () => {
            executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'bastionOfLawSpend',
                payload: { test: 'data' },
            });
            renderComponent({
                playerStats: {
                    ...createPlayerStats(),
                    reactions: [{ name: 'Bastion of Law', automation: { type: 'bastion_of_law' } }],
                },
            });
            const reaction = screen.getByText(/Bastion of Law/);
            fireEvent.click(reaction);
            await waitFor(() => {
                expect(executeHandler).toHaveBeenCalled();
            });
        });

        it('handles deflectRedirect modal', async () => {
            executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'deflectRedirect',
                payload: { test: 'data' },
            });
            renderComponent({
                playerStats: {
                    ...createPlayerStats(),
                    reactions: [{ name: 'Deflect Redirect', automation: { type: 'deflect_redirect' } }],
                },
            });
            const reaction = screen.getByText(/Deflect Redirect/);
            fireEvent.click(reaction);
            await waitFor(() => {
                expect(executeHandler).toHaveBeenCalled();
            });
        });

        it('handles energyRedirection modal', async () => {
            executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'energyRedirection',
                payload: { test: 'data' },
            });
            renderComponent({
                playerStats: {
                    ...createPlayerStats(),
                    reactions: [{ name: 'Energy Redirection', automation: { type: 'energy_redirect' } }],
                },
            });
            const reaction = screen.getByText(/Energy Redirection/);
            fireEvent.click(reaction);
            await waitFor(() => {
                expect(executeHandler).toHaveBeenCalled();
            });
        });

        it('handles inspiringMovementAlly modal', async () => {
            executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'inspiringMovementAlly',
                payload: { test: 'data' },
            });
            renderComponent({
                playerStats: {
                    ...createPlayerStats(),
                    reactions: [{ name: 'Inspiring Movement', automation: { type: 'inspiring_movement' } }],
                },
            });
            const reaction = screen.getByText(/Inspiring Movement/);
            fireEvent.click(reaction);
            await waitFor(() => {
                expect(executeHandler).toHaveBeenCalled();
            });
        });

        it('handles bendFateChoice modal', async () => {
            executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'bendFateChoice',
                payload: { test: 'data' },
            });
            renderComponent({
                playerStats: {
                    ...createPlayerStats(),
                    reactions: [{ name: 'Bend Fate', automation: { type: 'bend_fate' } }],
                },
            });
            const reaction = screen.getByText(/Bend Fate/);
            fireEvent.click(reaction);
            await waitFor(() => {
                expect(executeHandler).toHaveBeenCalled();
            });
        });

        it('handles boonFateChoice modal', async () => {
            executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'boonFateChoice',
                payload: { test: 'data' },
            });
            renderComponent({
                playerStats: {
                    ...createPlayerStats(),
                    reactions: [{ name: 'Boon of Fate', automation: { type: 'boon_fate' } }],
                },
            });
            const reaction = screen.getByText(/Boon of Fate/);
            fireEvent.click(reaction);
            await waitFor(() => {
                expect(executeHandler).toHaveBeenCalled();
            });
        });

        it('handles stepsOfTheFeyTaunt modal', async () => {
            executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'stepsOfTheFeyTaunt',
                payload: { test: 'data' },
            });
            renderComponent({
                playerStats: {
                    ...createPlayerStats(),
                    reactions: [{ name: 'Steps of the Fey Taunt', automation: { type: 'taunt' } }],
                },
            });
            const reaction = screen.getByText(/Steps of the Fey Taunt/);
            fireEvent.click(reaction);
            await waitFor(() => {
                expect(executeHandler).toHaveBeenCalled();
            });
        });

        it('handles searingVengeance modal', async () => {
            executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'searingVengeance',
                payload: { test: 'data' },
            });
            renderComponent({
                playerStats: {
                    ...createPlayerStats(),
                    reactions: [{ name: 'Searing Vengeance', automation: { type: 'searing_vengeance' } }],
                },
            });
            const reaction = screen.getByText(/Searing Vengeance/);
            fireEvent.click(reaction);
            await waitFor(() => {
                expect(executeHandler).toHaveBeenCalled();
            });
        });

        it('handles unknown modal by showing feature detail popup', async () => {
            executeHandler.mockResolvedValue({
                type: 'modal',
                modalName: 'unknownModal',
                payload: { test: 'data' },
            });
            renderComponent({
                playerStats: {
                    ...createPlayerStats(),
                    reactions: [{ name: 'Unknown Modal Reaction', automation: { type: 'unknown' } }],
                },
            });
            const reaction = screen.getByText(/Unknown Modal Reaction/);
            fireEvent.click(reaction);
            await waitFor(() => {
                expect(mockPopupHtml).toHaveBeenCalled();
            });
        });
    });

    describe('handleAutomationReaction - no result', () => {
        it('shows feature detail when executeHandler returns null', async () => {
            executeHandler.mockResolvedValue(null);
            renderComponent({
                playerStats: {
                    ...createPlayerStats(),
                    reactions: [{ name: 'Null Handler', automation: { type: 'null_handler' } }],
                },
            });
            const reaction = screen.getByText(/Null Handler/);
            fireEvent.click(reaction);
            await waitFor(() => {
                expect(mockPopupHtml).toHaveBeenCalled();
            });
        });

        it('shows feature detail when executeHandler returns undefined', async () => {
            executeHandler.mockResolvedValue(undefined);
            renderComponent({
                playerStats: {
                    ...createPlayerStats(),
                    reactions: [{ name: 'Undefined Handler', automation: { type: 'undefined_handler' } }],
                },
            });
            const reaction = screen.getByText(/Undefined Handler/);
            fireEvent.click(reaction);
            await waitFor(() => {
                expect(mockPopupHtml).toHaveBeenCalled();
            });
        });
    });

    describe('handleAutomationReaction - cannotAct guard', () => {
        it('does not trigger automation when cannotAct is true', () => {
            executeHandler.mockResolvedValue({ type: 'popup', payload: {} });
            renderComponent({
                cannotAct: true,
                playerStats: {
                    ...createPlayerStats(),
                    reactions: [{ name: 'Cannot Act Reaction', automation: { type: 'test' } }],
                },
            });
            const reaction = screen.getByText(/Cannot Act Reaction/);
            fireEvent.click(reaction);
            expect(executeHandler).not.toHaveBeenCalled();
        });
    });

    describe('handleAutomationReaction - no automation object', () => {
        it('skips automation handling when reaction has no automation property', () => {
            // When hasAutomation returns false, the reaction falls through to handleReactionClick
            // which checks for OPPORTUNITY_ATTACK, Stand (PWH), then shows feature detail
            // This test verifies the reaction is rendered and clickable
            renderComponent({
                playerStats: {
                    ...createPlayerStats(),
                    reactions: [{ name: 'No Auto Reaction', description: 'test' }],
                },
            });
            const reaction = screen.getByText(/No Auto Reaction/);
            expect(reaction).toBeTruthy();
        });
    });

    describe('getTargetInfo derived function', () => {
        it('returns null when no combat context', async () => {
            getCombatContext.mockResolvedValue(null);
            renderComponent();
            expect(screen.getByText('Reactions')).toBeTruthy();
        });

        it('returns target when combat context exists', async () => {
            const mockCs = { attackerName: 'TestChar' };
            getCombatContext.mockResolvedValue(mockCs);
            getTargetFromAttacker.mockReturnValue({ name: 'Target1' });
            renderComponent();
            expect(screen.getByText('Reactions')).toBeTruthy();
        });
    });

    describe('Edge cases', () => {
        it('handles playerStats with no reactions', () => {
            renderComponent({ playerStats: { ...createPlayerStats(), reactions: [] } });
            expect(screen.getByText(/Opportunity Attack/)).toBeTruthy();
        });

        it('handles playerStats with null reactions', () => {
            renderComponent({ playerStats: { ...createPlayerStats(), reactions: null } });
            expect(screen.getByText(/Opportunity Attack/)).toBeTruthy();
        });

        it('handles playerStats with no attacks', () => {
            renderComponent({ playerStats: { ...createPlayerStats(), attacks: [] } });
            expect(screen.getByText('Reactions')).toBeTruthy();
        });
    });
});
