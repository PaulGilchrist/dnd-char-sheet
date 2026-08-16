// @improved-by-ai
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
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
import * as aoeService from '../../../services/rules/combat/aoeService.js';
import * as combatData from '../../../services/encounters/combatData.js';
import * as mapsService from '../../../services/maps/mapsService.js';

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

describe('ElementalAttunementModal phase flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        diceRoller.rollExpression.mockReturnValue({ total: 5, rolls: [5], modifier: 0 });
    });

    describe('element selection transitions', () => {
        it('transitions to creature selection when any element is chosen', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            renderModal();
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(screen.getByTestId('creature-selection-modal')).toBeInTheDocument());
        });

        it('passes correct save type to CreatureSelectionModal per element', async () => {
            const elements = [
                { name: 'Cold', saveType: 'DEX' },
                { name: 'Fire', saveType: 'DEX' },
                { name: 'Lightning', saveType: 'DEX' },
                { name: 'Thunder', saveType: 'CON' },
            ];
            for (const el of elements) {
                cleanup();
                combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
                diceRoller.rollExpression.mockReturnValue({ total: 5, rolls: [5], modifier: 0 });
                renderModal();
                fireEvent.click(screen.getByText(el.name));
                await waitFor(() => {
                    expect(screen.getByTestId('cs-modal-description').innerHTML).toContain(el.saveType);
                });
            }
        });

        it('passes correct props to CreatureSelectionModal', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            renderModal();
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                expect(screen.getByTestId('cs-modal-title')).toHaveTextContent('Elemental Attunement');
                expect(screen.getByTestId('cs-modal-icon')).toHaveTextContent('fa-wand-magic-sparkles');
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

    describe('DC calculation', () => {
        it('displays correct DC = 8 + Wisdom bonus + proficiency (default: 12)', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([]));
            renderModal();
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(screen.getByText(/DC 12/)).toBeInTheDocument());
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

        it('shows "Resolving saving throws" text with correct save type', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Goblin1', type: 'npc', saveBonuses: { dex: 2 }, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Goblin1', type: 'npc', currentHp: 7, maxHp: 7 } }]);
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(screen.getByText(/Resolving DEX saving throws/)).toBeInTheDocument());
        });

        it('shows CON save type in processing text for Thunder element', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Goblin1', type: 'npc', saveBonuses: { con: 2 }, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Goblin1', type: 'npc', currentHp: 7, maxHp: 7 } }]);
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Thunder'));
            await waitFor(() => expect(screen.getByText(/Resolving CON saving throws/)).toBeInTheDocument());
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

        it('shows processing overlay that does not close on click', async () => {
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

        it('calls stopPropagation when modal content is clicked during processing', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Goblin1', type: 'npc', saveBonuses: { dex: 2 }, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Goblin1', type: 'npc', currentHp: 7, maxHp: 7 } }]);
            const { handleClose } = renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => expect(screen.getByText(/Resolving/)).toBeInTheDocument());
            const modal = document.querySelector('.sp-modal');
            const spy = vi.spyOn(Event.prototype, 'stopPropagation');
            fireEvent.click(modal);
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
            expect(handleClose).not.toHaveBeenCalled();
        });

        it('shows individual result lines in processing phase', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Goblin1', type: 'npc', saveBonuses: { dex: 2 }, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([{ creature: { name: 'Goblin1', type: 'npc', currentHp: 7, maxHp: 7 } }]);
            renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                const body = document.querySelector('.sp-body');
                expect(body.textContent).toContain('Goblin1');
            });
        });

        it('handles processing when there are no affected creatures', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Goblin1', type: 'npc', saveBonuses: { dex: 2 }, resistances: [], immunities: [] },
            ]));
            aoeService.getAffectedCreatures.mockReturnValue([]);
            const { handleClose } = renderModal({ activeOverlay: { type: 'sphere' } });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                expect(document.querySelector('.sp-body').textContent).toContain('Resolving');
            });
            expect(handleClose).not.toHaveBeenCalled();
        });
    });

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

        it('does not crash when combat summary becomes null during overlay processing', async () => {
            mapsService.loadMapData.mockResolvedValue({ players: [], placedItems: [] });
            const { handleClose } = renderModal({ mapName: 'test-map', activeOverlay: { type: 'sphere' } });
            combatData.getCombatSummary.mockReturnValue(null);
            fireEvent.click(screen.getByText('Fire'));
            await new Promise(r => setTimeout(r, 50));
            expect(handleClose).not.toHaveBeenCalled();
        });
    });

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

    describe('confirm from CreatureSelectionModal', () => {
        it('transitions to processing phase on confirm', async () => {
            combatData.getCombatSummary.mockReturnValue(makeCombatSummary([
                { name: 'Goblin1', type: 'npc', saveBonuses: { dex: 2 }, resistances: [], immunities: [] },
            ]));
            renderModal();
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => fireEvent.click(screen.getByTestId('cs-confirm-btn')));
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
});
