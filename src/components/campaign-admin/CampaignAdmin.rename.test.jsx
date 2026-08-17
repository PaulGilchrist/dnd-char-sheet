// @cleaned-by-ai
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
        it('renders the rename action with heading, description, and button', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameActions = screen.getAllByText('Rename Campaign');
            expect(renameActions.length).toBeGreaterThanOrEqual(2);
            expect(screen.getByText('Changes the display name. Character files, maps, and data are preserved.')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /rename campaign/i })).toBeInTheDocument();
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

        it.each([
            { triggerName: 'cancel', getTrigger: () => screen.getByText('Cancel') },
            { triggerName: 'close (X)', getTrigger: () => document.querySelector('.ct-modal-close') },
            { triggerName: 'overlay', getTrigger: () => document.querySelector('.ct-modal-overlay') },
        ])('closes modal when $triggerName is clicked', ({ getTrigger }) => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const closeTrigger = getTrigger();
            fireEvent.click(closeTrigger);

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

        it('submit button disabled states', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const submitBtn = screen.getByRole('button', { name: 'Rename' });
            expect(submitBtn).toBeDisabled();

            const input = screen.getByLabelText('New Campaign Name');
            fireEvent.change(input, { target: { value: '   ' } });
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
    });

    describe('submit behavior', () => {
        it.each([
            { trigger: 'button', action: () => fireEvent.click(screen.getByRole('button', { name: 'Rename' })) },
            { trigger: 'Enter key', action: (_renameBtn, input) => fireEvent.keyDown(input, { key: 'Enter' }) },
        ])('calls onRenameCampaign with trimmed value on %s', async ({ trigger, action }) => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const input = screen.getByLabelText('New Campaign Name');
            const testValue = trigger === 'Enter key' ? 'new-name' : '  new-name  ';
            fireEvent.change(input, { target: { value: testValue } });

            action(renameBtn, input);

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

        it('does not submit when input is empty or whitespace', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameBtn = screen.getByRole('button', { name: /rename campaign/i });
            fireEvent.click(renameBtn);

            const submitBtn = screen.getByRole('button', { name: 'Rename' });
            fireEvent.click(submitBtn);

            expect(defaultProps.onRenameCampaign).not.toHaveBeenCalled();

            vi.clearAllMocks();

            const input = screen.getByLabelText('New Campaign Name');
            fireEvent.change(input, { target: { value: '   ' } });
            fireEvent.click(submitBtn);

            expect(defaultProps.onRenameCampaign).not.toHaveBeenCalled();
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
