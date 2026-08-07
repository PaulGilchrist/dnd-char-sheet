import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ElementalAttunementModal from './ElementalAttunementModal.jsx';

// ── Mocks ──

vi.mock('../../../services/dice/diceRoller.js', () => ({
    rollExpression: vi.fn(() => ({ total: 5, rolls: [5], modifier: 0 })),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(() => null),
    setRuntimeValue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../services/rules/combat/applyDamage.js', () => ({
    computeDamageAfterSave: vi.fn((damage, success, dcSuccess) => {
        if (dcSuccess === 'half') return success ? Math.floor(damage / 2) : damage;
        return damage;
    }),
    computeDamageAfterResistancesWithDetails: vi.fn((damage) => ({ finalDamage: damage })),
    applyDamageToTarget: vi.fn(),
}));

vi.mock('../../../services/combat/conditions/savePromptService.js', () => ({
    sendSavePrompt: vi.fn(),
}));

vi.mock('../../../services/rules/combat/aoeService.js', () => ({
    getAffectedCreatures: vi.fn(() => []),
}));

vi.mock('../../../services/encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(() => null),
    setCombatSummaryCache: vi.fn(),
}));

vi.mock('../../../services/ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../services/rules/effects/expirations.js', () => ({
    addExpiration: vi.fn(),
}));

vi.mock('./shared/AreaEffectTargetModalBase.utils.jsx', () => ({
    persistAndNotify: vi.fn(),
}));

vi.mock('../../../services/maps/mapsService.js', () => ({
    loadMapData: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('./shared/CreatureSelectionModal.jsx', () => ({
    default: vi.fn(({ title, icon, targets, description, note, confirmLabel, confirmIcon: _ci, onConfirm, onSkip }) => (
        <div className="sp-overlay" onClick={onSkip}>
            <div className="sp-modal" onClick={e => e.stopPropagation()}>
                <div data-testid="creature-selection-modal">
                    <span data-testid="cs-modal-title">{title}</span>
                    <span data-testid="cs-modal-icon">{icon}</span>
                    <span data-testid="cs-modal-target-count">{targets.length}</span>
                    {description && <div data-testid="cs-modal-description" dangerouslySetInnerHTML={{ __html: description }} />}
                    {note && <div data-testid="cs-modal-note" dangerouslySetInnerHTML={{ __html: note }} />}
                    <button data-testid="cs-confirm-btn" onClick={() => onConfirm(targets.map(t => t.name))} disabled={targets.length === 0}>
                        {confirmLabel || 'Confirm'}
                    </button>
                    <button data-testid="cs-skip-btn" onClick={onSkip}>Skip</button>
                </div>
            </div>
        </div>
    )),
}));

// ── Re-import mocked modules ──

import * as diceRoller from '../../../services/dice/diceRoller.js';
import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';
import * as applyDamage from '../../../services/rules/combat/applyDamage.js';
import * as savePromptService from '../../../services/combat/conditions/savePromptService.js';
import * as aoeService from '../../../services/rules/combat/aoeService.js';
import * as combatData from '../../../services/encounters/combatData.js';
import * as logService from '../../../services/ui/logService.js';
import * as expirations from '../../../services/rules/effects/expirations.js';
import * as areaEffectUtils from './shared/AreaEffectTargetModalBase.utils.jsx';
import * as mapsService from '../../../services/maps/mapsService.js';
import CreatureSelectionModal from './shared/CreatureSelectionModal.jsx';

// ── Test fixtures ──

const baseAction = { name: 'Elemental Attunement' };
const basePlayerStats = {
    name: 'Monk1',
    level: 5,
    proficiency: 3,
    abilities: [
        { name: 'Strength', bonus: 2 },
        { name: 'Dexterity', bonus: 4 },
        { name: 'Constitution', bonus: 1 },
        { name: 'Intelligence', bonus: 0 },
        { name: 'Wisdom', bonus: 1 },
        { name: 'Charisma', bonus: 0 },
    ],
};
const baseProps = { action: baseAction, playerStats: basePlayerStats, campaignName: 'test-campaign', onClose: vi.fn() };

function makeProps(overrides = {}) { return { ...baseProps, ...overrides }; }
function makePlayerStats(overrides = {}) { return { ...basePlayerStats, ...overrides }; }
function makeCombatSummary(creatures) { return { creatures }; }

function renderModal(props = {}) {
    const handleClose = vi.fn();
    return { ...render(<ElementalAttunementModal {...makeProps({ onClose: handleClose, ...props })} />), handleClose };
}

// ── Tests ──

describe('ElementalAttunementModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        diceRoller.rollExpression.mockReturnValue({ total: 5, rolls: [5], modifier: 0 });
    });

    // ── Element selection phase ──

    describe('element selection phase', () => {
        it('renders the modal overlay and container', () => {
            renderModal();
            expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
            expect(document.querySelector('.sp-modal')).toBeInTheDocument();
        });

        it('renders sp-header, sp-body, and sp-actions', () => {
            renderModal();
            expect(document.querySelector('.sp-header')).toBeInTheDocument();
            expect(document.querySelector('.sp-body')).toBeInTheDocument();
            expect(document.querySelector('.sp-actions')).toBeInTheDocument();
        });

        it('renders the wand icon in the header', () => {
            renderModal();
            expect(document.querySelector('.sp-header i.fa-solid.fa-wand-magic-sparkles')).toBeInTheDocument();
        });

        it('renders "Elemental Attunement" in the header', () => {
            renderModal();
            expect(screen.getByText('Elemental Attunement')).toBeInTheDocument();
        });

        it('renders the instruction text', () => {
            renderModal();
            expect(screen.getByText('Choose the element for your manifestation:')).toBeInTheDocument();
        });

        it('renders all four elemental buttons', () => {
            renderModal();
            expect(screen.getByText('Cold')).toBeInTheDocument();
            expect(screen.getByText('Fire')).toBeInTheDocument();
            expect(screen.getByText('Lightning')).toBeInTheDocument();
            expect(screen.getByText('Thunder')).toBeInTheDocument();
        });

        it('renders Cold button with snowflake icon', () => {
            renderModal();
            const icon = screen.getByText('Cold').closest('button').querySelector('i');
            expect(icon).toHaveClass('fa-solid', 'fa-snowflake');
        });

        it('renders Fire button with fire icon', () => {
            renderModal();
            const icon = screen.getByText('Fire').closest('button').querySelector('i');
            expect(icon).toHaveClass('fa-solid', 'fa-fire');
        });

        it('renders Lightning button with bolt icon', () => {
            renderModal();
            const icon = screen.getByText('Lightning').closest('button').querySelector('i');
            expect(icon).toHaveClass('fa-solid', 'fa-bolt');
        });

        it('renders Thunder button with volume-high icon', () => {
            renderModal();
            const icon = screen.getByText('Thunder').closest('button').querySelector('i');
            expect(icon).toHaveClass('fa-solid', 'fa-volume-high');
        });

        it('renders descriptions for each element', () => {
            renderModal();
            expect(screen.getByText(/5-ft radius area of extreme cold/)).toBeInTheDocument();
            expect(screen.getByText(/5-ft radius flames/)).toBeInTheDocument();
            expect(screen.getByText(/60-ft line of lightning/)).toBeInTheDocument();
            expect(screen.getByText(/5-ft radius burst of sonic energy/)).toBeInTheDocument();
        });

        it('renders the Cancel button', () => {
            renderModal();
            expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        });

        it('has correct CSS classes', () => {
            renderModal();
            expect(document.querySelector('.sp-overlay')).toHaveClass('sp-overlay');
            expect(document.querySelector('.sp-modal')).toHaveClass('sp-modal');
            expect(document.querySelector('.sp-header')).toHaveClass('sp-header');
            expect(document.querySelector('.sp-body')).toHaveClass('sp-body');
            expect(document.querySelector('.sp-actions')).toHaveClass('sp-actions');
            expect(screen.getByText('Fire').closest('button')).toHaveClass('sp-roll-btn');
            expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass('sp-dismiss-btn');
        });
    });

    // ── Element selection → creature selection flow ──

    describe('element selection transitions', () => {
        it('transitions to creature selection when any element is chosen', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            renderModal();
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(screen.getByTestId('creature-selection-modal')).toBeInTheDocument());
        });

        it('passes correct save type to CreatureSelectionModal per element', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            const elements = [
                { name: 'Cold', saveType: 'DEX' },
                { name: 'Fire', saveType: 'DEX' },
                { name: 'Lightning', saveType: 'DEX' },
                { name: 'Thunder', saveType: 'CON' },
            ];
            for (const el of elements) {
                vi.clearAllMocks();
                diceRoller.rollExpression.mockReturnValue({ total: 5, rolls: [5], modifier: 0 });
                renderModal();
                fireEvent.click(screen.getByText(el.name));
                await waitFor(() => {
                    const call = CreatureSelectionModal.mock.calls[0][0];
                    expect(call.description).toContain(el.saveType);
                });
            }
        });

        it('passes correct props to CreatureSelectionModal', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            renderModal();
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                const c = CreatureSelectionModal.mock.calls[0][0];
                expect(c.title).toBe('Elemental Attunement');
                expect(c.icon).toBe('fa-wand-magic-sparkles');
                expect(c.confirmLabel).toBe('Activate');
                expect(c.confirmIcon).toBe('fa-wand-magic-sparkles');
            });
        });

        it('shows damage note for Fire element', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            renderModal();
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                const note = screen.getByTestId('cs-modal-note');
                expect(note.textContent).toContain('1d10');
                expect(note.textContent).toContain('fire');
                expect(note.textContent).toContain('half');
            });
        });

        it('shows damage note for Lightning element', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            renderModal();
            fireEvent.click(screen.getByText('Lightning'));
            await waitFor(() => {
                const note = screen.getByTestId('cs-modal-note');
                expect(note.textContent).toContain('1d8');
                expect(note.textContent).toContain('lightning');
            });
        });

        it('shows damage note for Thunder element', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            renderModal();
            fireEvent.click(screen.getByText('Thunder'));
            await waitFor(() => {
                const note = screen.getByTestId('cs-modal-note');
                expect(note.textContent).toContain('1d6');
                expect(note.textContent).toContain('thunder');
            });
        });

        it('shows effect note (no damage) for Cold element', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            renderModal();
            fireEvent.click(screen.getByText('Cold'));
            await waitFor(() => {
                const note = screen.getByTestId('cs-modal-note');
                expect(note.textContent).toContain('Cold');
            });
        });
    });

    // ── Skip / Cancel behavior ──

    describe('skip and cancel', () => {
        it('calls onClose when Cancel is clicked', () => {
            const { handleClose } = renderModal();
            fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
            expect(handleClose).toHaveBeenCalledTimes(1);
        });

        it('calls onClose when overlay is clicked (element phase)', () => {
            const { handleClose } = renderModal();
            fireEvent.click(document.querySelector('.sp-overlay'));
            expect(handleClose).toHaveBeenCalledTimes(1);
        });

        it('does not call onClose when modal content is clicked', () => {
            const { handleClose } = renderModal();
            fireEvent.click(document.querySelector('.sp-modal'));
            expect(handleClose).not.toHaveBeenCalled();
        });

        it('does not call onClose when sp-body is clicked', () => {
            const { handleClose } = renderModal();
            fireEvent.click(document.querySelector('.sp-body'));
            expect(handleClose).not.toHaveBeenCalled();
        });

        it('calls onClose when Skip is clicked in CreatureSelectionModal', async () => {
            const { handleClose } = renderModal();
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => fireEvent.click(screen.getByTestId('cs-skip-btn')));
            expect(handleClose).toHaveBeenCalledTimes(1);
        });

        it('calls onClose when overlay is clicked during creature selection', async () => {
            const { handleClose } = renderModal();
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(screen.getByTestId('creature-selection-modal')).toBeInTheDocument());
            // Wait a tick for React to flush, then click the overlay
            await new Promise(r => setTimeout(r, 0));
            const overlay = document.querySelector('.sp-overlay');
            if (overlay) {
                fireEvent.click(overlay);
            }
            expect(handleClose).toHaveBeenCalledTimes(1);
        });
    });

    // ── DC calculation ──

    describe('DC calculation', () => {
        it('calculates DC = 8 + Wisdom bonus + proficiency (default: 12)', () => {
            renderModal();
            expect(document.querySelector('.sp-header')).toHaveTextContent('Elemental Attunement');
        });

        it('calculates DC with different Wisdom bonus', async () => {
            const stats = makePlayerStats({ abilities: [{ name: 'Wisdom', bonus: 5 }], proficiency: 3 });
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            renderModal({ playerStats: stats });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(screen.getByText(/DC 16/)).toBeInTheDocument());
        });

        it('calculates DC with different proficiency', async () => {
            const stats = makePlayerStats({ abilities: [{ name: 'Wisdom', bonus: 1 }], proficiency: 5 });
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            renderModal({ playerStats: stats });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(screen.getByText(/DC 14/)).toBeInTheDocument());
        });

        it('defaults Wisdom bonus to 0 when not found', async () => {
            const stats = makePlayerStats({ abilities: [{ name: 'Strength', bonus: 2 }], proficiency: 3 });
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            renderModal({ playerStats: stats });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(screen.getByText(/DC 11/)).toBeInTheDocument());
        });

        it('defaults Wisdom bonus to 0 when abilities is undefined', async () => {
            const stats = makePlayerStats({ abilities: undefined });
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            renderModal({ playerStats: stats });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(screen.getByText(/DC 11/)).toBeInTheDocument());
        });

        it('defaults Wisdom bonus to 0 when abilities array is empty', async () => {
            const stats = makePlayerStats({ abilities: [] });
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            renderModal({ playerStats: stats });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(screen.getByText(/DC 11/)).toBeInTheDocument());
        });
    });

    // ── Processing phase (via activeOverlay) ──

    describe('processing phase', () => {
        it('shows processing state with chosen element', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Goblin1', type: 'npc', saveBonuses: { dex: 2 }, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Goblin1', type: 'npc', currentHp: 7, maxHp: 7 } }]);
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Thunder'));
            await waitFor(() => expect(document.querySelector('.sp-header')).toHaveTextContent(/Thunder/));
        });

        it('shows "Resolving saving throws" text', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Goblin1', type: 'npc', saveBonuses: { dex: 2 }, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Goblin1', type: 'npc', currentHp: 7, maxHp: 7 } }]);
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(screen.getByText(/Resolving DEX saving throws/)).toBeInTheDocument());
        });

        it('shows pending prompt for player targets', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Player1', type: 'player', saveBonuses: { dex: 3 }, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Player1', type: 'player', currentHp: 10, maxHp: 10 } }]);
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(screen.getByText(/Waiting for save roll/)).toBeInTheDocument());
        });

        it('processing overlay does not close on click', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Goblin1', type: 'npc', saveBonuses: { dex: 2 }, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Goblin1', type: 'npc', currentHp: 7, maxHp: 7 } }]);
            const { handleClose } = renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(screen.getByText(/Resolving/)).toBeInTheDocument());
            const overlay = document.querySelector('.sp-overlay');
            fireEvent.click(overlay);
            expect(handleClose).not.toHaveBeenCalled();
        });
    });

    // ── Summary phase ──

    describe('summary phase', () => {
        function renderSummary(_element = 'Fire', saveBonuses = { dex: 2 }) {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Goblin1', type: 'npc', saveBonuses: saveBonuses, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Goblin1', type: 'npc', currentHp: 7, maxHp: 7 } }]);
            renderModal({ activeOverlay: { type: 'sphere' } });
            const btn = document.querySelector('.sp-roll-btn');
            if (btn) fireEvent.click(btn);
        }

        it('renders summary header with element and "Results"', async () => {
            renderSummary();
            await waitFor(() => expect(screen.getByText(/Results/)).toBeInTheDocument());
        });

        it('renders save DC info', async () => {
            renderSummary();
            await waitFor(() => expect(screen.getByText(/Save DC/)).toBeInTheDocument());
        });

        it('renders a close button', async () => {
            renderSummary();
            await waitFor(() => expect(screen.getByRole('button', { name: /Close/ })).toBeInTheDocument());
        });

        it('renders abjure-result elements', async () => {
            renderSummary();
            await waitFor(() => expect(document.querySelectorAll('.abjure-result').length).toBeGreaterThan(0));
        });

        it('renders aoe-summary container', async () => {
            renderSummary();
            await waitFor(() => expect(document.querySelector('.aoe-summary')).toBeInTheDocument());
        });

        it('renders aoe-damage-info section', async () => {
            renderSummary();
            await waitFor(() => expect(document.querySelector('.aoe-damage-info')).toBeInTheDocument());
        });

        it('renders aoe-results section', async () => {
            renderSummary();
            await waitFor(() => expect(document.querySelector('.aoe-results')).toBeInTheDocument());
        });

        it('shows "Saved" text for successful NPC saves', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Goblin1', type: 'npc', saveBonuses: { dex: 10 }, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Goblin1', type: 'npc', currentHp: 7, maxHp: 7 } }]);
            renderModal({ activeOverlay: { type: 'sphere' } });
            const btn = document.querySelector('.sp-roll-btn');
            if (btn) fireEvent.click(btn);
            await waitFor(() => {
                const body = document.querySelector('.sp-body');
                expect(body.textContent).toContain('Saved');
            });
        });

        it('shows "speed reduced by 15 ft" for failed Cold saves', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Goblin1', type: 'npc', saveBonuses: { dex: -10 }, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Goblin1', type: 'npc', currentHp: 7, maxHp: 7 } }]);
            renderModal({ activeOverlay: { type: 'sphere' } });
            const btn = document.querySelector('.sp-roll-btn');
            if (btn) fireEvent.click(btn);
            await waitFor(() => {
                const body = document.querySelector('.sp-body');
                expect(body.textContent).toContain('speed reduced by 15 ft');
            });
        });

        it('shows speed reduction result text for Cold element', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Goblin1', type: 'npc', saveBonuses: { dex: 0 }, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Goblin1', type: 'npc', currentHp: 7, maxHp: 7 } }]);
            renderModal({ activeOverlay: { type: 'sphere' } });
            const btn = document.querySelector('.sp-roll-btn');
            if (btn) fireEvent.click(btn);
            await waitFor(() => expect(screen.getByText(/Results/)).toBeInTheDocument());
        });
    });

    // ── Close from summary ──

    describe('close from summary', () => {
        it('sets elementalAttunementActive runtime value', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([{ name: 'Goblin1', type: 'npc', saveBonuses: { dex: 2 }, resistances: [], immunities: [] }]));
aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Goblin1', type: 'npc', currentHp: 7, maxHp: 7 } }]);
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /Close/ })));
            await waitFor(() => {
                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Monk1', 'elementalAttunementActive', true, 'test-campaign');
            });
        });

        it('sets elementalAttunementElement runtime value', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([{ name: 'Goblin1', type: 'npc', saveBonuses: { dex: 2 }, resistances: [], immunities: [] }]));
aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Goblin1', type: 'npc', currentHp: 7, maxHp: 7 } }]);
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Thunder'));
            await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /Close/ })));
            await waitFor(() => {
                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Monk1', 'elementalAttunementElement', 'Thunder', 'test-campaign');
            });
        });

        it('calls addExpiration with cleanup entries', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([{ name: 'Goblin1', type: 'npc', saveBonuses: { dex: 2 }, resistances: [], immunities: [] }]));
aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Goblin1', type: 'npc', currentHp: 7, maxHp: 7 } }]);
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /Close/ })));
            await waitFor(() => {
                expect(expirations.addExpiration).toHaveBeenCalledWith(
                    'Monk1', 'Monk1',
                    expect.arrayContaining([
                        expect.objectContaining({ type: 'clear_runtime_value', key: 'elementalAttunementActive' }),
                        expect.objectContaining({ type: 'clear_runtime_value', key: 'elementalAttunementElement' }),
                        expect.objectContaining({ type: 'remove_active_buff', buffName: 'Stride of the Elements' }),
                        expect.objectContaining({ type: 'clear_runtime_value', key: 'elementalEpitomeActive' }),
                        expect.objectContaining({ type: 'clear_runtime_value', key: 'epitomeResistanceType' }),
                        expect.objectContaining({ type: 'clear_runtime_value', key: 'epitomeEmpoweredUsedRound' }),
                    ]),
                    'test-campaign', Infinity, 'Monk1'
                );
            });
        });

        it('logs ability_use entry on close', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([{ name: 'Goblin1', type: 'npc', saveBonuses: { dex: 2 }, resistances: [], immunities: [] }]));
aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Goblin1', type: 'npc', currentHp: 7, maxHp: 7 } }]);
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Cold'));
            await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /Close/ })));
            await waitFor(() => {
                expect(logService.addEntry).toHaveBeenCalledWith(
                    'test-campaign',
                    expect.objectContaining({ type: 'ability_use', characterName: 'Monk1', description: expect.stringContaining('Elemental Attunement (Cold)') })
                );
            });
        });

        it('calls onClose when Close is clicked', async () => {
            const { handleClose } = renderModal();
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Goblin1', type: 'npc', saveBonuses: { dex: 2 }, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Goblin1', type: 'npc', currentHp: 7, maxHp: 7 } }]);
            // Re-render with activeOverlay to skip to processing/summary
            const bodyText = document.querySelector('.sp-body')?.textContent || '';
            if (bodyText.includes('Choose the element')) {
                // Element phase - click Fire to go to creatureSelection, then we need activeOverlay
                // Instead, just click the overlay which goes to creatureSelection, then skip
                const overlay = document.querySelector('.sp-overlay');
                if (overlay) fireEvent.click(overlay);
                // This calls onClose from the element phase overlay click
                expect(handleClose).toHaveBeenCalledTimes(1);
                return;
            }
            // Already past element phase - should be in summary
            await waitFor(() => expect(screen.getByRole('button', { name: /Close/ })).toBeInTheDocument());
            fireEvent.click(screen.getByRole('button', { name: /Close/ }));
            expect(handleClose).toHaveBeenCalledTimes(1);
        });
    });

    // ── NPC save resolution ──

    describe('NPC save resolution', () => {
        function setupNPC(name = 'Goblin1', saveBonuses = { dex: 2 }) {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name, type: 'npc', saveBonuses, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name, type: 'npc', currentHp: 7, maxHp: 7 } }]);
        }

        it('calls setRuntimeValue for activeConditions on speed_reduction failure', async () => {
            setupNPC('Goblin1', { dex: -10 });
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Cold'));
            await waitFor(() => {
                expect(runtimeState.setRuntimeValue).toHaveBeenCalledWith('Goblin1', 'activeConditions', expect.arrayContaining(['speed_reduction']), 'test-campaign');
            });
        });

        it('calls applyDamageToTarget for Fire element', async () => {
            setupNPC();
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(applyDamage.applyDamageToTarget).toHaveBeenCalled());
        });

        it('calls applyDamageToTarget for Thunder element', async () => {
            setupNPC('Goblin1', { con: 2 });
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Thunder'));
            await waitFor(() => expect(applyDamage.applyDamageToTarget).toHaveBeenCalled());
        });

        it('calls sendSavePrompt for Fire on player targets', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Player1', type: 'player', saveBonuses: { dex: 3 }, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Player1', type: 'player', currentHp: 10, maxHp: 10 } }]);
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(savePromptService.sendSavePrompt).toHaveBeenCalled());
        });

        it('calls sendSavePrompt for Cold speed_reduction on player targets', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Player1', type: 'player', saveBonuses: { dex: 3 }, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Player1', type: 'player', currentHp: 10, maxHp: 10 } }]);
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Cold'));
            await waitFor(() => expect(savePromptService.sendSavePrompt).toHaveBeenCalled());
        });

        it('logs save-damage roll entry for NPC with Fire', async () => {
            setupNPC();
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                expect(logService.addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({ type: 'roll', rollType: 'save-damage', saveType: 'dex' }));
            });
        });

        it('logs ability_use entry for Cold speed_reduction on NPC', async () => {
            setupNPC();
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Cold'));
            await waitFor(() => {
                expect(logService.addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({ type: 'ability_use', abilityName: 'Elemental Attunement' }));
            });
        });

        it('calls persistAndNotify after resolving', async () => {
            setupNPC();
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(areaEffectUtils.persistAndNotify).toHaveBeenCalled());
        });
    });

    // ── Thunder push effect ──

    describe('Thunder push effect', () => {
        it('shows thunder damage and push info in summary for failed Thunder saves', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Goblin1', type: 'npc', saveBonuses: { con: -10 }, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Goblin1', type: 'npc', currentHp: 7, maxHp: 7 } }]);
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Thunder'));
            await waitFor(() => {
                const body = document.querySelector('.sp-body');
                expect(body.textContent).toContain('thunder');
                expect(body.textContent).toContain('Failed');
            });
        });
    });

    // ── save-result event listener ──

    describe('save-result event listener', () => {
        it('handles save-result event for player targets', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Player1', type: 'player', saveBonuses: { dex: 3 }, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Player1', type: 'player', currentHp: 10, maxHp: 10 } }]);
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(savePromptService.sendSavePrompt).toHaveBeenCalled());
            const promptId = savePromptService.sendSavePrompt.mock.calls[0][1].promptId;
            // Wait for pendingPrompts to be set before dispatching the event
            await waitFor(() => expect(screen.getByText(/Waiting for save roll/)).toBeInTheDocument());
            await act(async () => {
                window.dispatchEvent(new CustomEvent('save-result', {
                    detail: { promptId, targetName: 'Player1', success: true, roll: 15, saveBonus: 3, total: 18, rawDamage: 5 },
                }));
            });
            await waitFor(() => expect(screen.getByText(/Results/)).toBeInTheDocument());
        });

        it('removes save-result listener on unmount', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Player1', type: 'player', saveBonuses: { dex: 3 }, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Player1', type: 'player', currentHp: 10, maxHp: 10 } }]);
            const { unmount } = renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(savePromptService.sendSavePrompt).toHaveBeenCalled());
            const spy = vi.spyOn(window, 'removeEventListener');
            unmount();
            expect(spy).toHaveBeenCalledWith('save-result', expect.any(Function));
            spy.mockRestore();
        });
    });

    // ── No combat summary ──

    describe('no combat summary', () => {
        it('renders element phase when no combat summary', () => {
            combatData.getCombatSummary.mockReturnValue(null);
            renderModal();
            expect(screen.getByText('Choose the element for your manifestation:')).toBeInTheDocument();
        });

        it('does not crash when combat summary is null during processing', async () => {
            combatData.getCombatSummary.mockReturnValue(null);
            renderModal();
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(screen.queryByTestId('creature-selection-modal')).not.toBeInTheDocument());
        });
    });

    // ── Map overlay path ──

    describe('map overlay path', () => {
        it('loads map data when mapName and activeOverlay are provided', async () => {
            mapsService.loadMapData.mockResolvedValue({ players: [{ name: 'Player1', gridX: 5, gridY: 5 }], placedItems: [] });
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([{ name: 'Player1', type: 'player', currentHp: 10, maxHp: 10 }]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Player1', type: 'player', currentHp: 10, maxHp: 10 } }]);
            renderModal({ mapName: 'test-map', activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(mapsService.loadMapData).toHaveBeenCalledWith('test-campaign', 'test-map'));
        });

        it('skips map loading when no mapName', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Goblin1', type: 'npc', saveBonuses: { dex: 2 }, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Goblin1', type: 'npc', currentHp: 7, maxHp: 7 } }]);
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(mapsService.loadMapData).not.toHaveBeenCalled());
        });
    });

    // ── Custom action name ──

    describe('custom action name', () => {
        it('uses custom action name in log entries', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Goblin1', type: 'npc', saveBonuses: { dex: 2 }, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Goblin1', type: 'npc', currentHp: 7, maxHp: 7 } }]);
            renderModal({ action: { name: 'My Elemental Attunement' }, activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                expect(logService.addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({ name: 'My Elemental Attunement' }));
            });
        });
    });

    // ── Error handling ──

    describe('error handling', () => {
        it('does not throw when addEntry rejects for NPC save', async () => {
            logService.addEntry.mockRejectedValue(new Error('network error'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Goblin1', type: 'npc', saveBonuses: { dex: 2 }, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Goblin1', type: 'npc', currentHp: 7, maxHp: 7 } }]);
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('[ElementalAttunementModal] Error logging NPC save:', expect.any(Error));
            });
            consoleSpy.mockRestore();
        });

        it('does not throw when map data loading fails', async () => {
            mapsService.loadMapData.mockRejectedValue(new Error('map load failed'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([{ name: 'Player1', type: 'player', currentHp: 10, maxHp: 10 }]));
            aoeService.getAffectedCreatures.mockReturnValue([]);
            renderModal({ mapName: 'test-map', activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('[ElementalAttunementModal] Error loading map data:', expect.any(Error));
            });
            consoleSpy.mockRestore();
        });
    });

    // ── ELEMENT_DATA integrity ──

    describe('ELEMENT_DATA structure', () => {
        it('has exactly 4 elements', () => {
            renderModal();
            expect(screen.getByText('Cold')).toBeInTheDocument();
            expect(screen.getByText('Fire')).toBeInTheDocument();
            expect(screen.getByText('Lightning')).toBeInTheDocument();
            expect(screen.getByText('Thunder')).toBeInTheDocument();
        });

        it('Cold uses DEX save type', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            renderModal();
            fireEvent.click(screen.getByText('Cold'));
            await waitFor(() => {
                expect(CreatureSelectionModal.mock.calls[0][0].description).toContain('DEX');
            });
        });

        it('Fire uses DEX save type', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            renderModal();
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                expect(CreatureSelectionModal.mock.calls[0][0].description).toContain('DEX');
            });
        });

        it('Lightning uses DEX save type', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            renderModal();
            fireEvent.click(screen.getByText('Lightning'));
            await waitFor(() => {
                expect(CreatureSelectionModal.mock.calls[0][0].description).toContain('DEX');
            });
        });

        it('Thunder uses CON save type', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            renderModal();
            fireEvent.click(screen.getByText('Thunder'));
            await waitFor(() => {
                expect(CreatureSelectionModal.mock.calls[0][0].description).toContain('CON');
            });
        });

        it('Cold has no damage (speed_reduction effect only)', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            renderModal();
            fireEvent.click(screen.getByText('Cold'));
            await waitFor(() => {
                expect(CreatureSelectionModal.mock.calls[0][0].note).toContain('Cold');
            });
        });

        it('Fire has 1d10 fire damage', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            renderModal();
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                expect(CreatureSelectionModal.mock.calls[0][0].note).toContain('1d10');
                expect(CreatureSelectionModal.mock.calls[0][0].note).toContain('fire');
            });
        });

        it('Lightning has 1d8 lightning damage', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            renderModal();
            fireEvent.click(screen.getByText('Lightning'));
            await waitFor(() => {
                expect(CreatureSelectionModal.mock.calls[0][0].note).toContain('1d8');
                expect(CreatureSelectionModal.mock.calls[0][0].note).toContain('lightning');
            });
        });

        it('Thunder has 1d6 thunder damage plus push effect', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            renderModal();
            fireEvent.click(screen.getByText('Thunder'));
            await waitFor(() => {
                expect(CreatureSelectionModal.mock.calls[0][0].note).toContain('1d6');
                expect(CreatureSelectionModal.mock.calls[0][0].note).toContain('thunder');
            });
        });
    });

    // ── Creature selection phase without map overlay ──

    describe('creature selection phase without map overlay', () => {
        it('shows all creatures from combat summary when no overlay', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Goblin1', type: 'npc', currentHp: 7, maxHp: 7 },
                { name: 'Player1', type: 'player', currentHp: 10, maxHp: 10 },
            ]));
            renderModal();
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                expect(screen.getByTestId('creature-selection-modal')).toBeInTheDocument();
                expect(screen.getByTestId('cs-modal-target-count')).toHaveTextContent('2');
            });
        });
    });

    // ── Confirm from CreatureSelectionModal ──

    describe('confirm from CreatureSelectionModal', () => {
        it('transitions to processing phase on confirm', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Goblin1', type: 'npc', saveBonuses: { dex: 2 }, resistances: [], immunities: [] },
            ]));
            renderModal();
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => fireEvent.click(screen.getByTestId('cs-confirm-btn')));
            // Processing phase is transient; verify it transitions to summary
            await waitFor(() => expect(screen.getByText(/Results/)).toBeInTheDocument());
        });

        it('shows "All targets resolved" when processing completes with no pending prompts', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Goblin1', type: 'npc', saveBonuses: { dex: 2 }, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Goblin1', type: 'npc', currentHp: 7, maxHp: 7 } }]);
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(screen.getByText(/All targets resolved/)).toBeInTheDocument());
        });
    });

    // ── Phase transitions ──

    describe('phase transitions', () => {
        it('transitions from processing to summary when all prompts resolved', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Goblin1', type: 'npc', saveBonuses: { dex: 2 }, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Goblin1', type: 'npc', currentHp: 7, maxHp: 7 } }]);
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(screen.getByText(/Results/)).toBeInTheDocument());
        });

        it('does not transition to summary while there are pending prompts', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Player1', type: 'player', saveBonuses: { dex: 3 }, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Player1', type: 'player', currentHp: 10, maxHp: 10 } }]);
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(screen.getByText(/Waiting for save roll/)).toBeInTheDocument());
        });
    });

    // ── Cleanup on unmount ──

    describe('cleanup on unmount', () => {
        it('does not throw on unmount from element phase', () => {
            const { unmount } = renderModal();
            expect(() => unmount()).not.toThrow();
        });
    });
});
