import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FeyReinforcementsModal from './FeyReinforcementsModal.jsx';
import * as handler from '../../../services/automation/handlers/class-warlock/feyReinforcementsHandler.js';

vi.mock('../../../services/automation/handlers/class-warlock/feyReinforcementsHandler.js', () => ({
    confirmFeyReinforcement: vi.fn(),
}));

const baseAction = {
    name: 'Fey Reinforcements',
    automation: {
        type: 'fey_reinforcements',
        usesMax: 1,
        spell: 'Summon Fey',
    },
};

const mockOnClose = vi.fn();
const basePlayerStats = { name: 'TestCharacter' };
const baseCampaignName = 'test-campaign';

function makeProps(overrides) {
    return {
        action: baseAction,
        playerStats: basePlayerStats,
        campaignName: baseCampaignName,
        onClose: mockOnClose,
        ...(overrides || {}),
    };
}

describe('FeyReinforcementsModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('initial render', () => {
        it('renders the modal overlay with the action name', () => {
            render(<FeyReinforcementsModal {...makeProps()} />);
            expect(screen.getByText('Fey Reinforcements')).toBeInTheDocument();
        });

        it('renders the leaf icon in the header', () => {
            render(<FeyReinforcementsModal {...makeProps()} />);
            const icon = document.querySelector('.sp-header .fa-solid.fa-leaf');
            expect(icon).toBeInTheDocument();
        });

        it('renders the description about casting without components', () => {
            render(<FeyReinforcementsModal {...makeProps()} />);
            expect(
                screen.getByText((content, node) => {
                    return node?.tagName === 'STRONG' && node.textContent === 'Summon Fey';
                })
            ).toBeInTheDocument();
            expect(
                screen.getByText(/without material components or spell slot/)
            ).toBeInTheDocument();
            expect(
                screen.getByText(/This use does not consume a spell slot/)
            ).toBeInTheDocument();
        });

        it('renders the concentration skip checkbox', () => {
            render(<FeyReinforcementsModal {...makeProps()} />);
            const label = screen.getByText(/Skip Concentration/);
            expect(label).toBeInTheDocument();
            const checkbox = document.querySelector('input[type="checkbox"]');
            expect(checkbox).not.toBeChecked();
        });

        it('renders the default description when checkbox is unchecked', () => {
            render(<FeyReinforcementsModal {...makeProps()} />);
            expect(
                screen.getByText(/require Concentration and last up to 1 hour/)
            ).toBeInTheDocument();
            expect(
                screen.queryByText(/will not require Concentration/)
            ).not.toBeInTheDocument();
        });

        it('renders the Summon Fey button', () => {
            render(<FeyReinforcementsModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: /Summon Fey/ })).toBeInTheDocument();
        });

        it('renders the Cancel button', () => {
            render(<FeyReinforcementsModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        });
    });

    describe('checkbox interaction', () => {
        it('toggles the checkbox state', () => {
            render(<FeyReinforcementsModal {...makeProps()} />);
            const checkbox = document.querySelector('input[type="checkbox"]');
            expect(checkbox.checked).toBe(false);
            fireEvent.click(checkbox);
            expect(checkbox.checked).toBe(true);
        });

        it('shows the no-concentration description when checked', () => {
            render(<FeyReinforcementsModal {...makeProps()} />);
            const checkbox = document.querySelector('input[type="checkbox"]');
            fireEvent.click(checkbox);
            expect(
                screen.getByText(/will not require Concentration and will last 1 minute/)
            ).toBeInTheDocument();
            expect(
                screen.queryByText(/require Concentration and last up to 1 hour/)
            ).not.toBeInTheDocument();
        });

        it('shows the concentration description when unchecked', () => {
            render(<FeyReinforcementsModal {...makeProps()} />);
            const checkbox = document.querySelector('input[type="checkbox"]');
            fireEvent.click(checkbox);
            fireEvent.click(checkbox);
            expect(
                screen.getByText(/require Concentration and last up to 1 hour/)
            ).toBeInTheDocument();
        });
    });

    describe('confirm action', () => {
        it('calls confirmFeyReinforcement with noConcentration=false on confirm', async () => {
            handler.confirmFeyReinforcement.mockResolvedValue({
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Fey Reinforcements',
                    description: 'Test result',
                },
            });
            render(<FeyReinforcementsModal {...makeProps()} />);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Summon Fey/ }));
            });
            expect(handler.confirmFeyReinforcement).toHaveBeenCalledWith(
                baseAction,
                basePlayerStats,
                baseCampaignName,
                false,
            );
        });

        it('calls confirmFeyReinforcement with noConcentration=true when checked', async () => {
            handler.confirmFeyReinforcement.mockResolvedValue({
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Fey Reinforcements',
                    description: 'Test result',
                },
            });
            render(<FeyReinforcementsModal {...makeProps()} />);
            const checkbox = document.querySelector('input[type="checkbox"]');
            fireEvent.click(checkbox);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Summon Fey/ }));
            });
            expect(handler.confirmFeyReinforcement).toHaveBeenCalledWith(
                baseAction,
                basePlayerStats,
                baseCampaignName,
                true,
            );
        });

        it('shows the result after confirmation', async () => {
            handler.confirmFeyReinforcement.mockResolvedValue({
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Fey Reinforcements',
                    description: 'Fey Reinforcements: Free cast of Summon Fey (0 remaining).',
                },
            });
            render(<FeyReinforcementsModal {...makeProps()} />);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Summon Fey/ }));
            });
            await waitFor(() => {
                expect(screen.getByText('Fey Reinforcements: Free cast of Summon Fey (0 remaining).')).toBeInTheDocument();
            });
        });

        it('shows the result description with dangerouslySetInnerHTML content', async () => {
            handler.confirmFeyReinforcement.mockResolvedValue({
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Fey Reinforcements',
                    description: '<em>Open your spell sheet and cast Summon Fey normally</em>',
                },
            });
            render(<FeyReinforcementsModal {...makeProps()} />);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Summon Fey/ }));
            });
            await waitFor(() => {
                expect(
                    screen.getByText('Open your spell sheet and cast Summon Fey normally')
                ).toBeInTheDocument();
            });
        });

        it('shows "Does not require Concentration" in result when noConcentration=true', async () => {
            handler.confirmFeyReinforcement.mockResolvedValue({
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Fey Reinforcements',
                    description: 'Test',
                },
            });
            render(<FeyReinforcementsModal {...makeProps()} />);
            const checkbox = document.querySelector('input[type="checkbox"]');
            fireEvent.click(checkbox);
            handler.confirmFeyReinforcement.mockResolvedValue({
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Fey Reinforcements',
                    description:
                        'Fey Reinforcements: Free cast of Summon Fey (0 remaining). Does not require Concentration. Duration: 1 minute.',
                },
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Summon Fey/ }));
            });
            await waitFor(() => {
                expect(screen.getByText(/Does not require Concentration/)).toBeInTheDocument();
                expect(screen.getByText(/Duration: 1 minute/)).toBeInTheDocument();
            });
        });

        it('shows normal concentration label in result when noConcentration=false', async () => {
            handler.confirmFeyReinforcement.mockResolvedValue({
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Fey Reinforcements',
                    description:
                        'Fey Reinforcements: Free cast of Summon Fey (0 remaining).',
                },
            });
            render(<FeyReinforcementsModal {...makeProps()} />);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Summon Fey/ }));
            });
            await waitFor(() => {
                expect(screen.getByText(/Fey Reinforcements: Free cast of Summon Fey/)).toBeInTheDocument();
            });
        });
    });

    describe('cancel/close', () => {
        it('calls onClose when Cancel is clicked', () => {
            render(<FeyReinforcementsModal {...makeProps()} />);
            fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('calls onClose when Done is clicked after confirmation', async () => {
            handler.confirmFeyReinforcement.mockResolvedValue({
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Fey Reinforcements',
                    description: 'Test result',
                },
            });
            render(<FeyReinforcementsModal {...makeProps()} />);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Summon Fey/ }));
            });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
            });
            fireEvent.click(screen.getByRole('button', { name: 'Done' }));
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('calls onClose when clicking the overlay background', () => {
            render(<FeyReinforcementsModal {...makeProps()} />);
            fireEvent.click(document.querySelector('.sp-overlay'));
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('does not close when clicking inside the modal content', () => {
            render(<FeyReinforcementsModal {...makeProps()} />);
            const modal = document.querySelector('.sp-modal');
            fireEvent.click(modal);
            expect(mockOnClose).not.toHaveBeenCalled();
        });
    });

    describe('result state', () => {
        it('renders the result modal with leaf icon', async () => {
            handler.confirmFeyReinforcement.mockResolvedValue({
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Fey Reinforcements',
                    description: 'Test result',
                },
            });
            render(<FeyReinforcementsModal {...makeProps()} />);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Summon Fey/ }));
            });
            await waitFor(() => {
                const icon = document.querySelector('.sp-header .fa-solid.fa-leaf');
                expect(icon).toBeInTheDocument();
            });
        });

        it('hides the initial form after confirmation', async () => {
            handler.confirmFeyReinforcement.mockResolvedValue({
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Fey Reinforcements',
                    description: 'Test result',
                },
            });
            render(<FeyReinforcementsModal {...makeProps()} />);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Summon Fey/ }));
            });
            await waitFor(() => {
                expect(screen.queryByText(/Cast .* without material components/)).not.toBeInTheDocument();
                expect(screen.queryByRole('button', { name: /Summon Fey/ })).not.toBeInTheDocument();
                expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
            });
        });

        it('renders the result modal with correct classes', async () => {
            handler.confirmFeyReinforcement.mockResolvedValue({
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Fey Reinforcements',
                    description: 'Test result',
                },
            });
            render(<FeyReinforcementsModal {...makeProps()} />);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Summon Fey/ }));
            });
            await waitFor(() => {
                expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
                expect(document.querySelector('.sp-modal')).toBeInTheDocument();
                expect(document.querySelector('.sp-header')).toBeInTheDocument();
                expect(document.querySelector('.sp-body')).toBeInTheDocument();
                expect(document.querySelector('.sp-actions')).toBeInTheDocument();
            });
        });
    });

    describe('custom action name', () => {
        it('renders with a custom action name', () => {
            const customAction = { ...baseAction, name: 'Custom Fey Summon' };
            render(<FeyReinforcementsModal {...makeProps({ action: customAction })} />);
            expect(screen.getByText('Custom Fey Summon')).toBeInTheDocument();
        });

        it('shows custom action name in result header', async () => {
            const customAction = { ...baseAction, name: 'Custom Fey Summon' };
            handler.confirmFeyReinforcement.mockResolvedValue({
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Custom Fey Summon',
                    description: 'Test result',
                },
            });
            render(<FeyReinforcementsModal {...makeProps({ action: customAction })} />);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Summon Fey/ }));
            });
            await waitFor(() => {
                expect(screen.getByText('Custom Fey Summon')).toBeInTheDocument();
            });
        });
    });
});
