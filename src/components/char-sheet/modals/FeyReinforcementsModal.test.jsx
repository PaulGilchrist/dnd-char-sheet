// @improved-by-ai
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
        it('renders the modal overlay with the action name and leaf icon', () => {
            render(<FeyReinforcementsModal {...makeProps()} />);
            expect(screen.getByText('Fey Reinforcements')).toBeInTheDocument();
            expect(document.querySelector('.sp-header .fa-solid.fa-leaf')).toBeInTheDocument();
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

        it('renders the concentration skip checkbox and both description variants', () => {
            render(<FeyReinforcementsModal {...makeProps()} />);
            const checkbox = screen.getByRole('checkbox', { name: /Skip Concentration/ });
            expect(checkbox).not.toBeChecked();
            expect(
                screen.getByText(/require Concentration and last up to 1 hour/)
            ).toBeInTheDocument();
            expect(
                screen.queryByText(/will not require Concentration/)
            ).not.toBeInTheDocument();
        });

        it('renders the Summon Fey and Cancel buttons', () => {
            render(<FeyReinforcementsModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: /Summon Fey/ })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        });
    });

    describe('checkbox interaction', () => {
        it('toggles the checkbox state and updates the description', () => {
            render(<FeyReinforcementsModal {...makeProps()} />);
            const checkbox = screen.getByRole('checkbox', { name: /Skip Concentration/ });

            expect(checkbox.checked).toBe(false);
            expect(
                screen.getByText(/require Concentration and last up to 1 hour/)
            ).toBeInTheDocument();

            fireEvent.click(checkbox);
            expect(checkbox.checked).toBe(true);
            expect(
                screen.getByText(/will not require Concentration and will last 1 minute/)
            ).toBeInTheDocument();
            expect(
                screen.queryByText(/require Concentration and last up to 1 hour/)
            ).not.toBeInTheDocument();

            fireEvent.click(checkbox);
            expect(checkbox.checked).toBe(false);
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

        it('calls confirmFeyReinforcement with noConcentration=true when checkbox is checked', async () => {
            handler.confirmFeyReinforcement.mockResolvedValue({
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Fey Reinforcements',
                    description: 'Test result',
                },
            });
            render(<FeyReinforcementsModal {...makeProps()} />);
            const checkbox = screen.getByRole('checkbox', { name: /Skip Concentration/ });
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

        it('displays the result and transitions to the result state', async () => {
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
            expect(screen.queryByText(/Cast .* without material components/)).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /Summon Fey/ })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
        });

        it('renders HTML content from dangerouslySetInnerHTML in the result', async () => {
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

        it('includes concentration info in the result when noConcentration=true', async () => {
            handler.confirmFeyReinforcement.mockResolvedValue({
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Fey Reinforcements',
                    description:
                        'Fey Reinforcements: Free cast of Summon Fey (0 remaining). Does not require Concentration. Duration: 1 minute.',
                },
            });
            render(<FeyReinforcementsModal {...makeProps()} />);
            const checkbox = screen.getByRole('checkbox', { name: /Skip Concentration/ });
            fireEvent.click(checkbox);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Summon Fey/ }));
            });
            await waitFor(() => {
                expect(screen.getByText(/Does not require Concentration/)).toBeInTheDocument();
                expect(screen.getByText(/Duration: 1 minute/)).toBeInTheDocument();
            });
        });

        it('renders with a custom action name', () => {
            const customAction = { ...baseAction, name: 'Custom Fey Summon' };
            render(<FeyReinforcementsModal {...makeProps({ action: customAction })} />);
            expect(screen.getByText('Custom Fey Summon')).toBeInTheDocument();
        });

        it('shows custom action name in the result header', async () => {
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

    describe('cancel / close', () => {
        it('calls onClose when Cancel button is clicked', () => {
            render(<FeyReinforcementsModal {...makeProps()} />);
            fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });

        it('calls onClose when Done button is clicked after confirmation', async () => {
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
            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });

        it('calls onClose when clicking the overlay background', () => {
            render(<FeyReinforcementsModal {...makeProps()} />);
            fireEvent.click(document.querySelector('.sp-overlay'));
            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });

        it('does not close when clicking inside the modal content', () => {
            render(<FeyReinforcementsModal {...makeProps()} />);
            const modal = document.querySelector('.sp-modal');
            fireEvent.click(modal);
            expect(mockOnClose).not.toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        it('handles the "no free casts remaining" result from the handler', async () => {
            handler.confirmFeyReinforcement.mockResolvedValue({
                type: 'popup',
                payload: {
                    type: 'automation_info',
                    name: 'Fey Reinforcements',
                    description: 'No free casts remaining. Finish a Long Rest to regain them.',
                },
            });
            render(<FeyReinforcementsModal {...makeProps()} />);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Summon Fey/ }));
            });
            await waitFor(() => {
                expect(screen.getByText('No free casts remaining. Finish a Long Rest to regain them.')).toBeInTheDocument();
            });
            expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
        });

        it('renders the leaf icon when action.name is undefined', () => {
            const actionWithoutName = { automation: baseAction.automation };
            render(<FeyReinforcementsModal {...makeProps({ action: actionWithoutName })} />);
            expect(document.querySelector('.sp-header .fa-solid.fa-leaf')).toBeInTheDocument();
            expect(screen.queryByText('Fey Reinforcements')).not.toBeInTheDocument();
        });
    });
});
