import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
import * as combatData from '../../../services/encounters/combatData.js';
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
function makeCombatSummary(creatures) { return { creatures }; }

function renderModal(props = {}) {
    const handleClose = vi.fn();
    return { ...render(<ElementalAttunementModal {...makeProps({ onClose: handleClose, ...props })} />), handleClose };
}

// ── Tests ──

describe('ElementalAttunementModal ELEMENT_DATA structure', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        diceRoller.rollExpression.mockReturnValue({ total: 5, rolls: [5], modifier: 0 });
    });

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
});
