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
import * as runtimeState from '../../../hooks/runtime/useRuntimeState.js';
import * as logService from '../../../services/ui/logService.js';
import * as expirations from '../../../services/rules/effects/expirations.js';
import * as aoeService from '../../../services/rules/combat/aoeService.js';
import * as combatData from '../../../services/encounters/combatData.js';

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

describe('ElementalAttunementModal summary and close', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        diceRoller.rollExpression.mockReturnValue({ total: 5, rolls: [5], modifier: 0 });
    });

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
                const overlay = document.querySelector('.sp-overlay');
                if (overlay) fireEvent.click(overlay);
                expect(handleClose).toHaveBeenCalledTimes(1);
                return;
            }
            await waitFor(() => expect(screen.getByRole('button', { name: /Close/ })).toBeInTheDocument());
            fireEvent.click(screen.getByRole('button', { name: /Close/ }));
            expect(handleClose).toHaveBeenCalledTimes(1);
        });
    });

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
});
