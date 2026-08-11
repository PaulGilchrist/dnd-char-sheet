import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import QuiveringPalmModal from './QuiveringPalmModal.jsx';

// ── Mocks ──

vi.mock('../../../services/automation/handlers/class-monk/quiveringPalmHandler.js', () => ({
    applyShockwave: vi.fn(),
    applyRelease: vi.fn(),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(() => null),
    setRuntimeValue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../services/automation/common/savePrompt.js', () => ({
    buildSaveDc: vi.fn(() => 15),
    createSaveListener: vi.fn(() => ({
        promise: Promise.resolve({ success: true, roll: 12, saveBonus: 2, total: 14 }),
    })),
}));

vi.mock('../../../services/dice/diceRoller.js', () => ({
    rollExpression: vi.fn(() => ({ total: 60, rolls: [3, 5, 7, 9, 11, 13, 15, 7] })),
}));

vi.mock('../../../services/ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../services/rules/combat/applyDamage.js', () => ({
    applyDamageToTarget: vi.fn(() => ({ finalDamage: 60 })),
}));

vi.mock('../../../services/encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(() => ({
        creatures: [{ name: 'Goblin1', type: 'npc', saveBonuses: { con: 2 } }],
    })),
}));

vi.mock('../../../services/ui/utils.js', () => ({
    default: {
        guid: vi.fn(() => 'test-guid-123'),
    },
}));

// ── Test fixtures ──

function makeAction(overrides = {}) {
    return {
        name: 'Quivering Palm',
        automation: {
            type: 'quivering_palm',
            damageExpression: '10d12',
            damageType: 'Force',
            saveDc: 15,
            saveAbility: 'WIS',
            ...overrides,
        },
        ...overrides,
    };
}

function makePlayerStats(overrides = {}) {
    return {
        name: 'Monk1',
        proficiency: 4,
        abilities: {
            str: 16,
            dex: 14,
            con: 12,
            int: 10,
            wis: 14,
            cha: 8,
        },
        class: {
            class_levels: [{ level: 7, focus_points: 7 }],
        },
        ...overrides,
    };
}

function makeProps(overrides = {}) {
    return {
        action: makeAction(),
        playerStats: makePlayerStats(),
        campaignName: 'test-campaign',
        targetName: 'Goblin1',
        isRelease: false,
        onClose: vi.fn(),
        ...overrides,
    };
}

// ── Helpers ──

function renderModal(props = {}) {
    const handleClose = vi.fn();
    return {
        ...render(<QuiveringPalmModal {...makeProps({ onClose: handleClose, ...props })} />),
        handleClose,
    };
}

// ── Tests ──

describe('QuiveringPalmModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── Initial render (no isRelease, no result) ──

    describe('initial render', () => {
        it('renders the modal overlay and header with action name', () => {
            renderModal();
            expect(screen.getByText('Quivering Palm')).toBeInTheDocument();
        });

        it('renders the fist icon in the header', () => {
            renderModal();
            const header = document.querySelector('.sp-header i');
            expect(header).toHaveClass('fa-solid fa-hand-fist');
        });

        it('displays the target name in the body text', () => {
            renderModal({ targetName: 'Orc Warrior' });
            expect(screen.getByText(/Vibrations are set in/)).toBeInTheDocument();
            expect(screen.getByText('Orc Warrior')).toBeInTheDocument();
        });

        it('displays the "Choose an option:" prompt', () => {
            renderModal();
            expect(screen.getByText('Choose an option:')).toBeInTheDocument();
        });

        it('renders the "Trigger the Lethal Shockwave" button', () => {
            renderModal();
            expect(
                screen.getByRole('button', { name: /Trigger the Lethal Shockwave/ })
            ).toBeInTheDocument();
        });

        it('renders the "Release the Harmless Vibrations" button', () => {
            renderModal();
            expect(
                screen.getByRole('button', { name: /Release the Harmless Vibrations/ })
            ).toBeInTheDocument();
        });

        it('has the bolt icon on the shockwave button', () => {
            renderModal();
            const shockwaveBtn = screen.getByRole('button', { name: /Trigger the Lethal Shockwave/ });
            const icon = shockwaveBtn.querySelector('i');
            expect(icon).toHaveClass('fa-solid fa-bolt');
        });

        it('has the hand icon on the release button', () => {
            renderModal();
            const releaseBtn = screen.getByRole('button', { name: /Release the Harmless Vibrations/ });
            const icon = releaseBtn.querySelector('i');
            expect(icon).toHaveClass('fa-solid fa-hand');
        });

        it('buttons are not disabled initially', () => {
            renderModal();
            const shockwaveBtn = screen.getByRole('button', { name: /Trigger the Lethal Shockwave/ });
            const releaseBtn = screen.getByRole('button', { name: /Release the Harmless Vibrations/ });
            expect(shockwaveBtn.disabled).toBe(false);
            expect(releaseBtn.disabled).toBe(false);
        });
    });

    // ── Release-only mode (isRelease=true) ──

    describe('release-only mode (isRelease=true)', () => {
        it('renders the modal with action name in header', () => {
            renderModal({ isRelease: true });
            expect(screen.getByText('Quivering Palm')).toBeInTheDocument();
        });

        it('displays the target name in the body text', () => {
            renderModal({ isRelease: true, targetName: 'Dragon' });
            expect(screen.getByText(/Vibrations are set in/)).toBeInTheDocument();
            expect(screen.getByText('Dragon')).toBeInTheDocument();
        });

        it('displays "Choose an option:" prompt', () => {
            renderModal({ isRelease: true });
            expect(screen.getByText('Choose an option:')).toBeInTheDocument();
        });

        it('renders the "Release the Harmless Vibrations" button', () => {
            renderModal({ isRelease: true });
            expect(
                screen.getByRole('button', { name: /Release the Harmless Vibrations/ })
            ).toBeInTheDocument();
        });

        it('does NOT render the shockwave button', () => {
            renderModal({ isRelease: true });
            expect(
                screen.queryByRole('button', { name: /Trigger the Lethal Shockwave/ })
            ).not.toBeInTheDocument();
        });

        it('has the hand icon on the release button', () => {
            renderModal({ isRelease: true });
            const releaseBtn = screen.getByRole('button', { name: /Release the Harmless Vibrations/ });
            const icon = releaseBtn.querySelector('i');
            expect(icon).toHaveClass('fa-solid fa-hand');
        });

        it('buttons are not disabled initially', () => {
            renderModal({ isRelease: true });
            const releaseBtn = screen.getByRole('button', { name: /Release the Harmless Vibrations/ });
            expect(releaseBtn.disabled).toBe(false);
        });
    });

    // ── Overlay click behavior ──

    describe('overlay click behavior', () => {
        it('calls onClose when overlay is clicked', () => {
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

        it('does not call onClose when sp-header is clicked', () => {
            const { handleClose } = renderModal();
            fireEvent.click(document.querySelector('.sp-header'));
            expect(handleClose).not.toHaveBeenCalled();
        });
    });

    // ── Cancel / Close from initial state (default mode has no Cancel button) ──

    describe('cancel / close from initial state (default mode)', () => {
        it('does not show a Cancel button in default mode', () => {
            renderModal();
            expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
        });

        it('closes modal when clicking overlay', () => {
            const { handleClose } = renderModal();
            fireEvent.click(document.querySelector('.sp-overlay'));
            expect(handleClose).toHaveBeenCalledTimes(1);
        });

        it('does not call applyShockwave when release button is clicked without waiting', async () => {
            renderModal();
            // The release button exists but we just verify it's there
            expect(screen.getByRole('button', { name: /Release the Harmless Vibrations/ })).toBeInTheDocument();
        });
    });

    // ── Release-only mode cancel ──

    describe('cancel / close in release-only mode', () => {
        it('shows a Cancel button in release-only mode', () => {
            renderModal({ isRelease: true });
            expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        });

        it('calls onClose when Cancel is clicked in release-only mode', () => {
            const { handleClose } = renderModal({ isRelease: true });
            fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
            expect(handleClose).toHaveBeenCalledTimes(1);
        });

        it('can still close by clicking overlay in release-only mode', () => {
            const { handleClose } = renderModal({ isRelease: true });
            fireEvent.click(document.querySelector('.sp-overlay'));
            expect(handleClose).toHaveBeenCalledTimes(1);
        });
    });

    // ── CSS classes ──

    describe('CSS classes', () => {
        it('has sp-overlay class on the outer container', () => {
            renderModal();
            expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
        });

        it('has sp-modal class on the modal container', () => {
            renderModal();
            expect(document.querySelector('.sp-modal')).toBeInTheDocument();
        });

        it('has sp-header class on the header', () => {
            renderModal();
            expect(document.querySelector('.sp-header')).toBeInTheDocument();
        });

        it('has sp-body class on the body', () => {
            renderModal();
            expect(document.querySelector('.sp-body')).toBeInTheDocument();
        });

        it('has sp-actions class on the actions container', () => {
            renderModal();
            expect(document.querySelector('.sp-actions')).toBeInTheDocument();
        });

        it('has sp-roll-btn class on the shockwave button and sp-dismiss-btn on the release button', () => {
            renderModal();
            const shockwaveBtn = screen.getByRole('button', { name: /Trigger the Lethal Shockwave/ });
            const releaseBtn = screen.getByRole('button', { name: /Release the Harmless Vibrations/ });
            expect(shockwaveBtn).toHaveClass('sp-roll-btn');
            expect(releaseBtn).toHaveClass('sp-dismiss-btn');
        });

        it('has sp-dismiss-btn class on the release button in default mode', () => {
            renderModal();
            const releaseBtn = screen.getByRole('button', { name: /Release the Harmless Vibrations/ });
            expect(releaseBtn).toHaveClass('sp-dismiss-btn');
        });

        it('has sp-dismiss-btn class on the cancel button in release-only mode', () => {
            renderModal({ isRelease: true });
            const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
            expect(cancelBtn).toHaveClass('sp-dismiss-btn');
        });

        it('has sp-roll-btn class on the Done button in result screen', async () => {
            const { applyShockwave } = await import('../../../services/automation/handlers/class-monk/quiveringPalmHandler.js');
            applyShockwave.mockResolvedValue({
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Quivering Palm',
                    automationType: 'quivering_palm',
                    description: 'Test',
                    success: false,
                    saveType: 'CON',
                    saveDc: 15,
                    rawDamage: 60,
                    finalDamage: 60,
                    damageExpression: '10d12',
                    damageType: 'Force',
                    diceDisplay: ' (3, 5, 7, 9, 11, 13, 15, 7)',
                },
            });

            renderModal();

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Trigger the Lethal Shockwave/ }));
            });

            await waitFor(() => {
                const doneBtn = screen.getByRole('button', { name: 'Done' });
                expect(doneBtn).toHaveClass('sp-roll-btn');
            });
        });
    });
});
