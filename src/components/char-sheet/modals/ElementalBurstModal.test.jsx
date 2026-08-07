import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ElementalBurstModal from './ElementalBurstModal.jsx';

// ── Mocks ──

vi.mock('../../../services/ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('./shared/SaveAttackAoeModal.jsx', () => ({
    default: vi.fn(({ action, damage, damageType, saveDc, saveType, onClose }) => (
        <div data-testid="save-attack-aoe-modal">
            <span data-testid="aoe-action">{action?.name}</span>
            <span data-testid="aoe-damage">{damage}</span>
            <span data-testid="aoe-damage-type">{damageType}</span>
            <span data-testid="aoe-save-type">{saveType}</span>
            <span data-testid="aoe-save-dc">{saveDc}</span>
            <button onClick={onClose}>Close AOE Modal</button>
        </div>
    )),
}));

// ── Re-import mocked modules ──

import * as logService from '../../../services/ui/logService.js';

// ── Test fixtures ──

const baseAction = {
    name: 'Elemental Burst',
};

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
    class: {
        class_levels: [
            { level: 1, martial_arts_die: 4 },
            { level: 2, martial_arts_die: 4 },
            { level: 3, martial_arts_die: 4 },
            { level: 4, martial_arts_die: 4 },
            { level: 5, martial_arts_die: 4 },
        ],
    },
};

const baseProps = {
    action: baseAction,
    playerStats: basePlayerStats,
    campaignName: 'test-campaign',
    onClose: vi.fn(),
};

function makeProps(overrides = {}) {
    return { ...baseProps, ...overrides };
}

function makePlayerStats(overrides = {}) {
    return { ...basePlayerStats, ...overrides };
}

// ── Helpers ──

function renderModal(props = {}) {
    const handleClose = vi.fn();
    return {
        ...render(<ElementalBurstModal {...makeProps({ onClose: handleClose, ...props })} />),
        handleClose,
    };
}

// ── Tests ──

describe('ElementalBurstModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    // ── Initial render / display ──

    describe('initial render', () => {
        it('renders the modal overlay', () => {
            renderModal();
            expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
        });

        it('renders the modal container', () => {
            renderModal();
            expect(document.querySelector('.sp-modal')).toBeInTheDocument();
        });

        it('renders the modal header', () => {
            renderModal();
            expect(document.querySelector('.sp-header')).toBeInTheDocument();
        });

        it('renders the body section', () => {
            renderModal();
            expect(document.querySelector('.sp-body')).toBeInTheDocument();
        });

        it('renders the actions section', () => {
            renderModal();
            expect(document.querySelector('.sp-actions')).toBeInTheDocument();
        });

        it('renders the wand icon in the header', () => {
            renderModal();
            const icon = document.querySelector('.sp-header i.fa-solid.fa-wand-magic-sparkles');
            expect(icon).toBeInTheDocument();
        });

        it('renders "Elemental Burst" in the header', () => {
            renderModal();
            expect(screen.getByText('Elemental Burst')).toBeInTheDocument();
        });

        it('renders the description paragraph with DC calculation', () => {
            // DC = 8 + Dex bonus (4) + proficiency (3) = 15
            renderModal();
            expect(screen.getByText(/must make a Dexterity saving throw \(DC 15\)/)).toBeInTheDocument();
        });

        it('renders the note paragraph with damage dice', () => {
            // martial_arts_die is 4 at level 5
            const { container } = renderModal();
            const body = container.querySelector('.sp-body');
            expect(body).toBeTruthy();
            expect(body.textContent).toContain('3d4 damage');
            expect(body.textContent).toContain('half as much damage');
        });

        it('renders the Cancel button', () => {
            renderModal();
            expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        });

        it('renders all five damage type buttons', () => {
            renderModal();
            expect(screen.getByText('Acid')).toBeInTheDocument();
            expect(screen.getByText('Cold')).toBeInTheDocument();
            expect(screen.getByText('Fire')).toBeInTheDocument();
            expect(screen.getByText('Lightning')).toBeInTheDocument();
            expect(screen.getByText('Thunder')).toBeInTheDocument();
        });

        it('renders the acid button with leaf icon', () => {
            renderModal();
            const acidBtn = screen.getByText('Acid').closest('button');
            const icon = acidBtn.querySelector('i');
            expect(icon).toHaveClass('fa-solid');
            expect(icon).toHaveClass('fa-leaf');
        });

        it('renders the cold button with snowflake icon', () => {
            renderModal();
            const coldBtn = screen.getByText('Cold').closest('button');
            const icon = coldBtn.querySelector('i');
            expect(icon).toHaveClass('fa-solid');
            expect(icon).toHaveClass('fa-snowflake');
        });

        it('renders the fire button with fire icon', () => {
            renderModal();
            const fireBtn = screen.getByText('Fire').closest('button');
            const icon = fireBtn.querySelector('i');
            expect(icon).toHaveClass('fa-solid');
            expect(icon).toHaveClass('fa-fire');
        });

        it('renders the lightning button with bolt icon', () => {
            renderModal();
            const lightningBtn = screen.getByText('Lightning').closest('button');
            const icon = lightningBtn.querySelector('i');
            expect(icon).toHaveClass('fa-solid');
            expect(icon).toHaveClass('fa-bolt');
        });

        it('renders the thunder button with volume-high icon', () => {
            renderModal();
            const thunderBtn = screen.getByText('Thunder').closest('button');
            const icon = thunderBtn.querySelector('i');
            expect(icon).toHaveClass('fa-solid');
            expect(icon).toHaveClass('fa-volume-high');
        });
    });

    // ── DC calculation ──

    describe('DC calculation', () => {
        it('calculates DC correctly with default stats (8 + 4 + 3 = 15)', () => {
            renderModal();
            expect(screen.getByText(/DC 15/)).toBeInTheDocument();
        });

        it('calculates DC with different dex bonus', () => {
            const stats = makePlayerStats({
                abilities: [
                    { name: 'Dexterity', bonus: 6 },
                ],
                proficiency: 4,
            });
            renderModal({ playerStats: stats });
            // DC = 8 + 6 + 4 = 18
            expect(screen.getByText(/DC 18/)).toBeInTheDocument();
        });

        it('calculates DC with different proficiency', () => {
            const stats = makePlayerStats({
                proficiency: 6,
            });
            renderModal({ playerStats: stats });
            // DC = 8 + 4 + 6 = 18
            expect(screen.getByText(/DC 18/)).toBeInTheDocument();
        });

        it('defaults dex bonus to 0 when not found', () => {
            const stats = makePlayerStats({
                abilities: [
                    { name: 'Strength', bonus: 2 },
                ],
                proficiency: 3,
            });
            renderModal({ playerStats: stats });
            // DC = 8 + 0 + 3 = 11
            expect(screen.getByText(/DC 11/)).toBeInTheDocument();
        });

        it('defaults dex bonus to 0 when abilities is undefined', () => {
            const stats = makePlayerStats({ abilities: undefined });
            renderModal({ playerStats: stats });
            // DC = 8 + 0 + 3 = 11
            expect(screen.getByText(/DC 11/)).toBeInTheDocument();
        });

        it('defaults dex bonus to 0 when abilities array is empty', () => {
            const stats = makePlayerStats({ abilities: [] });
            renderModal({ playerStats: stats });
            // DC = 8 + 0 + 3 = 11
            expect(screen.getByText(/DC 11/)).toBeInTheDocument();
        });
    });

    // ── Martial arts die resolution ──

    describe('martial arts die resolution', () => {
        it('uses martial_arts_die from the current class level', () => {
            const stats = makePlayerStats({
                level: 17,
                class: {
                    class_levels: [
                        { level: 17, martial_arts_die: 8 },
                    ],
                },
            });
            renderModal({ playerStats: stats });
            expect(screen.getByText(/3d8 damage/)).toBeInTheDocument();
        });

        it('defaults to d4 when no matching class level found', () => {
            const stats = makePlayerStats({
                level: 99,
                class: {
                    class_levels: [],
                },
            });
            renderModal({ playerStats: stats });
            expect(screen.getByText(/3d4 damage/)).toBeInTheDocument();
        });
    });

    // ── Overlay interaction ──

    describe('overlay interaction', () => {
        it('calls onClose when the overlay background is clicked', () => {
            const { handleClose } = renderModal();
            const overlay = document.querySelector('.sp-overlay');
            fireEvent.click(overlay);
            expect(handleClose).toHaveBeenCalledTimes(1);
        });

        it('does not call onClose when modal content is clicked', () => {
            const { handleClose } = renderModal();
            const modal = document.querySelector('.sp-modal');
            fireEvent.click(modal);
            expect(handleClose).not.toHaveBeenCalled();
        });

        it('does not call onClose when sp-body is clicked', () => {
            const { handleClose } = renderModal();
            fireEvent.click(document.querySelector('.sp-body'));
            expect(handleClose).not.toHaveBeenCalled();
        });
    });

    // ── Cancel button ──

    describe('cancel button', () => {
        it('calls onClose when Cancel is clicked', () => {
            const { handleClose } = renderModal();
            fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
            expect(handleClose).toHaveBeenCalledTimes(1);
        });
    });

    // ── Damage type selection ──

    describe('damage type selection', () => {
        it('logs an ability_use entry when Acid is chosen', async () => {
            renderModal();
            fireEvent.click(screen.getByText('Acid'));
            await waitFor(() => {
                expect(logService.addEntry).toHaveBeenCalledWith(
                    'test-campaign',
                    expect.objectContaining({
                        type: 'ability_use',
                        characterName: 'Monk1',
                        abilityName: 'Elemental Burst',
                        description: 'Elemental Burst: Chose Acid damage type.',
                    })
                );
            });
        });

        it('logs an ability_use entry when Cold is chosen', async () => {
            renderModal();
            fireEvent.click(screen.getByText('Cold'));
            await waitFor(() => {
                expect(logService.addEntry).toHaveBeenCalledWith(
                    'test-campaign',
                    expect.objectContaining({
                        description: 'Elemental Burst: Chose Cold damage type.',
                    })
                );
            });
        });

        it('logs an ability_use entry when Fire is chosen', async () => {
            renderModal();
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                expect(logService.addEntry).toHaveBeenCalledWith(
                    'test-campaign',
                    expect.objectContaining({
                        description: 'Elemental Burst: Chose Fire damage type.',
                    })
                );
            });
        });

        it('logs an ability_use entry when Lightning is chosen', async () => {
            renderModal();
            fireEvent.click(screen.getByText('Lightning'));
            await waitFor(() => {
                expect(logService.addEntry).toHaveBeenCalledWith(
                    'test-campaign',
                    expect.objectContaining({
                        description: 'Elemental Burst: Chose Lightning damage type.',
                    })
                );
            });
        });

        it('logs an ability_use entry when Thunder is chosen', async () => {
            renderModal();
            fireEvent.click(screen.getByText('Thunder'));
            await waitFor(() => {
                expect(logService.addEntry).toHaveBeenCalledWith(
                    'test-campaign',
                    expect.objectContaining({
                        description: 'Elemental Burst: Chose Thunder damage type.',
                    })
                );
            });
        });

        it('transitions to AOE phase after choosing a damage type', async () => {
            renderModal();
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                expect(screen.getByTestId('save-attack-aoe-modal')).toBeInTheDocument();
            });
        });

        it('passes correct damage value to AOE modal', async () => {
            renderModal();
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                expect(screen.getByTestId('aoe-damage')).toHaveTextContent('3d4');
            });
        });

        it('passes lowercase damage type to AOE modal', async () => {
            renderModal();
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                expect(screen.getByTestId('aoe-damage-type')).toHaveTextContent('fire');
            });
        });

        it('passes DEX as save type to AOE modal', async () => {
            renderModal();
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                expect(screen.getByTestId('aoe-save-type')).toHaveTextContent('DEX');
            });
        });

        it('passes correct save DC to AOE modal', async () => {
            renderModal();
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                expect(screen.getByTestId('aoe-save-dc')).toHaveTextContent('15');
            });
        });

        it('passes action to AOE modal', async () => {
            renderModal();
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                expect(screen.getByTestId('aoe-action')).toHaveTextContent('Elemental Burst');
            });
        });

        it('renders the AOE modal with Acid damage type', async () => {
            renderModal();
            fireEvent.click(screen.getByText('Acid'));
            await waitFor(() => {
                expect(screen.getByTestId('aoe-damage-type')).toHaveTextContent('acid');
            });
        });

        it('renders the AOE modal with Cold damage type', async () => {
            renderModal();
            fireEvent.click(screen.getByText('Cold'));
            await waitFor(() => {
                expect(screen.getByTestId('aoe-damage-type')).toHaveTextContent('cold');
            });
        });

        it('renders the AOE modal with Lightning damage type', async () => {
            renderModal();
            fireEvent.click(screen.getByText('Lightning'));
            await waitFor(() => {
                expect(screen.getByTestId('aoe-damage-type')).toHaveTextContent('lightning');
            });
        });

        it('renders the AOE modal with Thunder damage type', async () => {
            renderModal();
            fireEvent.click(screen.getByText('Thunder'));
            await waitFor(() => {
                expect(screen.getByTestId('aoe-damage-type')).toHaveTextContent('thunder');
            });
        });
    });

    // ── AOE modal close behavior ──

    describe('AOE modal close behavior', () => {
        it('calls onClose when Close button in AOE modal is clicked', async () => {
            const { handleClose } = renderModal();
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                fireEvent.click(screen.getByRole('button', { name: 'Close AOE Modal' }));
            });
            expect(handleClose).toHaveBeenCalledTimes(1);
        });
    });

    // ── Processing phase (transient) ──

    describe('processing phase', () => {
        it('does not render the initial phase UI after a choice is made', async () => {
            renderModal();
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                expect(screen.queryByText(/Choose a damage type/)).not.toBeInTheDocument();
            });
        });

        it('does not render damage type buttons after a choice is made', async () => {
            renderModal();
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                expect(screen.queryByText('Fire')).not.toBeInTheDocument();
            });
        });
    });

    // ── Custom action name ──

    describe('custom action name', () => {
        it('uses the action name in the log description', async () => {
            const action = { name: 'My Elemental Burst' };
            renderModal({ action });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                expect(logService.addEntry).toHaveBeenCalledWith(
                    'test-campaign',
                    expect.objectContaining({
                        description: 'My Elemental Burst: Chose Fire damage type.',
                    })
                );
            });
        });

        it('passes custom action name to AOE modal', async () => {
            const action = { name: 'My Elemental Burst' };
            renderModal({ action });
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                expect(screen.getByTestId('aoe-action')).toHaveTextContent('My Elemental Burst');
            });
        });
    });

    // ── Error handling in logging ──

    describe('logging error handling', () => {
        it('does not throw when addEntry rejects', async () => {
            logService.addEntry.mockRejectedValue(new Error('network error'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            renderModal();
            // Should not throw
            fireEvent.click(screen.getByText('Fire'));
            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith(
                    '[ElementalBurstModal] Error logging type choice:',
                    expect.any(Error)
                );
            });
            consoleSpy.mockRestore();
        });
    });

    // ── CSS classes ──

    describe('CSS classes', () => {
        it('has sp-overlay class on the outer container', () => {
            renderModal();
            expect(document.querySelector('.sp-overlay')).toHaveClass('sp-overlay');
        });

        it('has sp-modal class on the modal container', () => {
            renderModal();
            expect(document.querySelector('.sp-modal')).toHaveClass('sp-modal');
        });

        it('has sp-header class on the header', () => {
            renderModal();
            expect(document.querySelector('.sp-header')).toHaveClass('sp-header');
        });

        it('has sp-body class on the body', () => {
            renderModal();
            expect(document.querySelector('.sp-body')).toHaveClass('sp-body');
        });

        it('has sp-actions class on the actions container', () => {
            renderModal();
            expect(document.querySelector('.sp-actions')).toHaveClass('sp-actions');
        });

        it('has sp-roll-btn class on damage type buttons', () => {
            renderModal();
            const fireBtn = screen.getByText('Fire').closest('button');
            expect(fireBtn).toHaveClass('sp-roll-btn');
        });

        it('has sp-dismiss-btn class on the Cancel button', () => {
            renderModal();
            const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
            expect(cancelBtn).toHaveClass('sp-dismiss-btn');
        });
    });
});
