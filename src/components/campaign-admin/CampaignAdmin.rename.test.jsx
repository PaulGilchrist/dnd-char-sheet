import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CampaignAdmin from './CampaignAdmin.jsx';

describe('CampaignAdmin - Rename Campaign', () => {
    const defaultProps = {
        campaignName: 'test-campaign',
        onBack: vi.fn(),
        theme: 'dark',
        toggleTheme: vi.fn(),
        onRenameCampaign: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        window.alert = vi.fn();
        window.confirm = vi.fn(() => true);
        window.prompt = vi.fn(() => 'test-campaign');
        window.location = { reload: vi.fn() };
    });

    const findActionByText = (text) => {
        const actions = document.querySelectorAll('.admin-action');
        for (const action of actions) {
            const h3 = action.querySelector('h3');
            if (h3 && h3.textContent === text) {
                return action;
            }
        }
        return null;
    };

    describe('modal open/close', () => {
        it('opens rename modal when rename button is clicked', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameAction = findActionByText('Rename Campaign');
            const renameBtn = renameAction.querySelector('button');
            fireEvent.click(renameBtn);

            expect(document.querySelector('.ct-modal')).toBeInTheDocument();
            expect(screen.getByLabelText('New Campaign Name')).toBeInTheDocument();
        });

        it('closes modal when cancel button is clicked', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameAction = findActionByText('Rename Campaign');
            const renameBtn = renameAction.querySelector('button');
            fireEvent.click(renameBtn);

            const cancelBtn = screen.getByText('Cancel');
            fireEvent.click(cancelBtn);

            expect(document.querySelector('.ct-modal')).not.toBeInTheDocument();
        });

        it('closes modal when close (X) button is clicked', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameAction = findActionByText('Rename Campaign');
            const renameBtn = renameAction.querySelector('button');
            fireEvent.click(renameBtn);

            const closeBtn = document.querySelector('.ct-modal-close');
            fireEvent.click(closeBtn);

            expect(document.querySelector('.ct-modal')).not.toBeInTheDocument();
        });

        it('closes modal when overlay is clicked', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameAction = findActionByText('Rename Campaign');
            const renameBtn = renameAction.querySelector('button');
            fireEvent.click(renameBtn);

            const overlay = document.querySelector('.ct-modal-overlay');
            fireEvent.click(overlay);

            expect(document.querySelector('.ct-modal')).not.toBeInTheDocument();
        });

        it('prevents modal close when clicking modal body', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameAction = findActionByText('Rename Campaign');
            const renameBtn = renameAction.querySelector('button');
            fireEvent.click(renameBtn);

            const modal = document.querySelector('.ct-modal');
            fireEvent.click(modal);

            expect(document.querySelector('.ct-modal')).toBeInTheDocument();
        });
    });

    describe('input behavior', () => {
        it('renders input with placeholder equal to current campaign name', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameAction = findActionByText('Rename Campaign');
            const renameBtn = renameAction.querySelector('button');
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            expect(input).toHaveAttribute('placeholder', 'test-campaign');
        });

        it('input is auto-focused', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameAction = findActionByText('Rename Campaign');
            const renameBtn = renameAction.querySelector('button');
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            expect(document.activeElement).toBe(input);
        });

        it('updates input value on change', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameAction = findActionByText('Rename Campaign');
            const renameBtn = renameAction.querySelector('button');
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            fireEvent.change(input, { target: { value: 'new-name' } });
            expect(input).toHaveValue('new-name');
        });

        it('submit button is disabled when input is empty', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameAction = findActionByText('Rename Campaign');
            const renameBtn = renameAction.querySelector('button');
            fireEvent.click(renameBtn);

            const submitBtn = document.querySelector('.ct-modal-footer .ct-btn-primary');
            expect(submitBtn).toBeDisabled();
        });

        it('submit button is disabled when input is only whitespace', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameAction = findActionByText('Rename Campaign');
            const renameBtn = renameAction.querySelector('button');
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            fireEvent.change(input, { target: { value: '   ' } });

            const submitBtn = document.querySelector('.ct-modal-footer .ct-btn-primary');
            expect(submitBtn).toBeDisabled();
        });

        it('submit button is enabled when input has content', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameAction = findActionByText('Rename Campaign');
            const renameBtn = renameAction.querySelector('button');
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            fireEvent.change(input, { target: { value: 'new-name' } });

            const submitBtn = document.querySelector('.ct-modal-footer .ct-btn-primary');
            expect(submitBtn).not.toBeDisabled();
        });
    });

    describe('submit behavior', () => {
        it('calls onRenameCampaign with trimmed value on submit button click', async () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameAction = findActionByText('Rename Campaign');
            const renameBtn = renameAction.querySelector('button');
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            fireEvent.change(input, { target: { value: '  new-name  ' } });

            const submitBtn = document.querySelector('.ct-modal-footer .ct-btn-primary');
            fireEvent.click(submitBtn);

            await waitFor(() => {
                expect(defaultProps.onRenameCampaign).toHaveBeenCalledWith('new-name');
            });
        });

        it('calls onRenameCampaign on Enter key', async () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameAction = findActionByText('Rename Campaign');
            const renameBtn = renameAction.querySelector('button');
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            fireEvent.change(input, { target: { value: 'new-name' } });
            fireEvent.keyDown(input, { key: 'Enter' });

            await waitFor(() => {
                expect(defaultProps.onRenameCampaign).toHaveBeenCalledWith('new-name');
            });
        });

        it('closes modal on Escape key', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameAction = findActionByText('Rename Campaign');
            const renameBtn = renameAction.querySelector('button');
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            fireEvent.keyDown(input, { key: 'Escape' });

            expect(document.querySelector('.ct-modal')).not.toBeInTheDocument();
        });

        it('clears input and closes modal after submit', async () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameAction = findActionByText('Rename Campaign');
            const renameBtn = renameAction.querySelector('button');
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            fireEvent.change(input, { target: { value: 'new-name' } });

            const submitBtn = document.querySelector('.ct-modal-footer .ct-btn-primary');
            fireEvent.click(submitBtn);

            await waitFor(() => {
                expect(document.querySelector('.ct-modal')).not.toBeInTheDocument();
            });
        });

        it('does not submit when input is empty on button click', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameAction = findActionByText('Rename Campaign');
            const renameBtn = renameAction.querySelector('button');
            fireEvent.click(renameBtn);

            const submitBtn = document.querySelector('.ct-modal-footer .ct-btn-primary');
            fireEvent.click(submitBtn);

            expect(defaultProps.onRenameCampaign).not.toHaveBeenCalled();
        });

        it('does not submit when input is whitespace only on button click', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameAction = findActionByText('Rename Campaign');
            const renameBtn = renameAction.querySelector('button');
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            fireEvent.change(input, { target: { value: '   ' } });

            const submitBtn = document.querySelector('.ct-modal-footer .ct-btn-primary');
            fireEvent.click(submitBtn);

            expect(defaultProps.onRenameCampaign).not.toHaveBeenCalled();
        });
    });
});
