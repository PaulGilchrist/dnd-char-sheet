// @improved-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CampaignAdmin from './CampaignAdmin.jsx';

const createDefaultProps = (overrides = {}) => ({
    campaignName: 'test-campaign',
    onBack: vi.fn(),
    theme: 'dark',
    toggleTheme: vi.fn(),
    onRenameCampaign: vi.fn(),
    ...overrides,
});

describe('CampaignAdmin - Rename Campaign', () => {
    const defaultProps = createDefaultProps();

    beforeEach(() => {
        vi.clearAllMocks();
        window.alert = vi.fn();
        window.confirm = vi.fn(() => true);
        Object.defineProperty(window, 'location', {
            value: { reload: vi.fn() },
            writable: true,
        });
    });

    describe('initial render', () => {
        it('renders the rename action with heading and description', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameActions = screen.getAllByText('Rename Campaign');
            expect(renameActions.length).toBeGreaterThanOrEqual(2);
            expect(screen.getByText('Changes the display name. Character files, maps, and data are preserved.')).toBeInTheDocument();
        });

        it('renders the rename button with icon', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            expect(renameBtn).toBeInTheDocument();
            expect(renameBtn.querySelector('i.fa-pen')).toBeTruthy();
        });
    });

    describe('modal open/close', () => {
        it('opens rename modal when rename button is clicked', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            expect(document.querySelector('.ct-modal')).toBeInTheDocument();
            expect(screen.getByLabelText('New Campaign Name')).toBeInTheDocument();
        });

        it('shows "Rename Campaign" as modal title', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const modalHeader = document.querySelector('.ct-modal-header h3');
            expect(modalHeader).toHaveTextContent('Rename Campaign');
        });

        it('closes modal when cancel button is clicked', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const cancelBtn = screen.getByText('Cancel');
            fireEvent.click(cancelBtn);

            expect(document.querySelector('.ct-modal')).not.toBeInTheDocument();
        });

        it('closes modal when close (X) button is clicked', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const closeBtn = document.querySelector('.ct-modal-close');
            fireEvent.click(closeBtn);

            expect(document.querySelector('.ct-modal')).not.toBeInTheDocument();
        });

        it('closes modal when overlay is clicked', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const overlay = document.querySelector('.ct-modal-overlay');
            fireEvent.click(overlay);

            expect(document.querySelector('.ct-modal')).not.toBeInTheDocument();
        });

        it('prevents modal close when clicking modal body', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const modal = document.querySelector('.ct-modal');
            fireEvent.click(modal);

            expect(document.querySelector('.ct-modal')).toBeInTheDocument();
        });
    });

    describe('input behavior', () => {
        it('renders input with placeholder equal to current campaign name', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            expect(input).toHaveAttribute('placeholder', 'test-campaign');
        });

        it('input is auto-focused when modal opens', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            expect(document.activeElement).toBe(input);
        });

        it('input has correct htmlFor/id association with label', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const input = document.getElementById('rename-campaign-input');
            const label = document.querySelector('label[for="rename-campaign-input"]');
            expect(label).toBeTruthy();
            expect(label.getAttribute('for')).toBe('rename-campaign-input');
            expect(input).toHaveAttribute('id', 'rename-campaign-input');
        });

        it('updates input value on change', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            fireEvent.change(input, { target: { value: 'new-name' } });
            expect(input).toHaveValue('new-name');
        });

        it('submit button is disabled when input is empty', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const submitBtn = screen.getByRole('button', { name: 'Rename' });
            expect(submitBtn).toBeDisabled();
        });

        it('submit button is disabled when input is only whitespace', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            fireEvent.change(input, { target: { value: '   ' } });

            const submitBtn = screen.getByRole('button', { name: 'Rename' });
            expect(submitBtn).toBeDisabled();
        });

        it('submit button is enabled when input has content', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            fireEvent.change(input, { target: { value: 'new-name' } });

            const submitBtn = screen.getByRole('button', { name: 'Rename' });
            expect(submitBtn).not.toBeDisabled();
        });

        it('submit button is enabled when input has leading/trailing whitespace', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            fireEvent.change(input, { target: { value: '  new-name  ' } });

            const submitBtn = screen.getByRole('button', { name: 'Rename' });
            expect(submitBtn).not.toBeDisabled();
        });
    });

    describe('submit behavior', () => {
        it('calls onRenameCampaign with trimmed value on submit button click', async () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            fireEvent.change(input, { target: { value: '  new-name  ' } });

            const submitBtn = screen.getByRole('button', { name: 'Rename' });
            fireEvent.click(submitBtn);

            await waitFor(() => {
                expect(defaultProps.onRenameCampaign).toHaveBeenCalledWith('new-name');
            });
        });

        it('calls onRenameCampaign on Enter key', async () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
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
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            fireEvent.keyDown(input, { key: 'Escape' });

            expect(document.querySelector('.ct-modal')).not.toBeInTheDocument();
        });

        it('clears input and closes modal after submit', async () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            fireEvent.change(input, { target: { value: 'new-name' } });

            const submitBtn = screen.getByRole('button', { name: 'Rename' });
            fireEvent.click(submitBtn);

            await waitFor(() => {
                expect(document.querySelector('.ct-modal')).not.toBeInTheDocument();
            });
        });

        it('does not submit when input is empty on button click', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const submitBtn = screen.getByRole('button', { name: 'Rename' });
            fireEvent.click(submitBtn);

            expect(defaultProps.onRenameCampaign).not.toHaveBeenCalled();
        });

        it('does not submit when input is whitespace only on button click', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            fireEvent.change(input, { target: { value: '   ' } });

            const submitBtn = screen.getByRole('button', { name: 'Rename' });
            fireEvent.click(submitBtn);

            expect(defaultProps.onRenameCampaign).not.toHaveBeenCalled();
        });

        it('resets input to empty after submit with different name', async () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            fireEvent.change(input, { target: { value: 'different-name' } });
            expect(input).toHaveValue('different-name');

            const submitBtn = screen.getByRole('button', { name: 'Rename' });
            fireEvent.click(submitBtn);

            await waitFor(() => {
                expect(document.querySelector('.ct-modal')).not.toBeInTheDocument();
            });

            // Re-open modal and verify input is empty
            fireEvent.click(renameBtn);
            const reOpenedInput = screen.getByLabelText('New Campaign Name');
            expect(reOpenedInput).toHaveValue('');
        });

        it('does not call onRenameCampaign when modal is closed without submitting', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            fireEvent.change(input, { target: { value: 'new-name' } });

            const cancelBtn = screen.getByText('Cancel');
            fireEvent.click(cancelBtn);

            expect(defaultProps.onRenameCampaign).not.toHaveBeenCalled();
        });
    });

    describe('campaign name variations', () => {
        it('uses the campaign name as placeholder with special characters', () => {
            render(<CampaignAdmin {...createDefaultProps({ campaignName: 'my campaign/1' })} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            expect(input).toHaveAttribute('placeholder', 'my campaign/1');
        });

        it('passes trimmed value with special characters to onRenameCampaign', async () => {
            const props = createDefaultProps({ campaignName: 'my campaign/1' });
            render(<CampaignAdmin {...props} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            fireEvent.change(input, { target: { value: '  new-campaign/2  ' } });

            const submitBtn = screen.getByRole('button', { name: 'Rename' });
            fireEvent.click(submitBtn);

            await waitFor(() => {
                expect(props.onRenameCampaign).toHaveBeenCalledWith('new-campaign/2');
            });
        });
    });
});
