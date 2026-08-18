// @improved-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CampaignAdmin from './CampaignAdmin.jsx';

const createDefaultProps = (overrides = {}) => ({
    campaignName: 'test-campaign',
    onBack: vi.fn(),
    theme: 'dark',
    toggleTheme: vi.fn(),
    onRenameCampaign: vi.fn(),
    ...overrides,
});

const getActionButton = (buttonText) =>
    screen.getByRole('button', { name: new RegExp(`^${buttonText}$`, 'i') });

describe('CampaignAdmin - Status Display', () => {
    const defaultProps = createDefaultProps();

    beforeEach(() => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        vi.spyOn(window, 'prompt').mockReturnValue('test-campaign');
        vi.spyOn(window, 'alert').mockImplementation(() => {});
        vi.spyOn(window, 'location', 'get').mockReturnValue({ reload: vi.fn() });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('loading feedback', () => {
        const loadingOperations = [
            { button: 'Create Snapshot', statusText: 'Creating snapshot...' },
            { button: 'Rollback to Snapshot', statusText: 'Rolling back...' },
            { button: 'Download Campaign', statusText: 'Preparing download...' },
            { button: 'Clear Change Data', statusText: 'Clearing change data...' },
            { button: 'Clear Campaign Log', statusText: 'Clearing log...' },
            { button: 'Full Reset', statusText: 'Performing full reset...' },
        ];

        for (const op of loadingOperations) {
            it(`shows loading indicator when ${op.button} is triggered`, async () => {
                const fetchMock = vi.fn(() =>
                    Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Done' }) })
                );
                global.fetch = fetchMock;

                render(<CampaignAdmin {...defaultProps} />);
                const btn = getActionButton(op.button);
                fireEvent.click(btn);

                if (op.button === 'Rollback to Snapshot') {
                    const confirmBtn = screen.getByRole('button', { name: /confirm/i });
                    fireEvent.click(confirmBtn);
                }

                await waitFor(() => {
                    expect(fetchMock).toHaveBeenCalled();
                    expect(screen.getByText(op.statusText)).toBeInTheDocument();
                    expect(screen.getByText(op.statusText).closest('.admin-status')).toHaveClass('admin-status--loading');
                });
            });
        }
    });

    describe('button state during operations', () => {
        it('disables all action buttons while an operation is in progress', async () => {
            global.fetch = vi.fn(() => new Promise(() => {}));

            render(<CampaignAdmin {...defaultProps} />);
            const snapshotBtn = getActionButton('Create Snapshot');
            fireEvent.click(snapshotBtn);

            await waitFor(() => {
                expect(snapshotBtn).toBeDisabled();
                expect(getActionButton('Clear Change Data')).toBeDisabled();
                expect(getActionButton('Clear Campaign Log')).toBeDisabled();
                expect(getActionButton('Full Reset')).toBeDisabled();
                expect(getActionButton('Download Campaign')).toBeDisabled();
                expect(getActionButton('Rollback to Snapshot')).toBeDisabled();
            });
        });

        it('re-enables all buttons after operation completes successfully', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Done' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const clearDataBtn = getActionButton('Clear Change Data');
            fireEvent.click(clearDataBtn);

            await waitFor(() => {
                expect(clearDataBtn).not.toBeDisabled();
                expect(getActionButton('Create Snapshot')).not.toBeDisabled();
                expect(getActionButton('Rollback to Snapshot')).not.toBeDisabled();
            });
        });
    });

    describe('error handling', () => {
        it('shows error status when operation fails', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Server error' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const btn = getActionButton('Create Snapshot');
            fireEvent.click(btn);

            await waitFor(() => {
                const statusEl = screen.getByText('Server error').closest('.admin-status');
                expect(statusEl).toHaveClass('admin-status--error');
                expect(statusEl.querySelector('.fa-exclamation-circle')).toBeInTheDocument();
            });
        });

        it('shows error status when fetch throws', async () => {
            global.fetch = vi.fn(() => Promise.reject(new Error('Network failure')));

            render(<CampaignAdmin {...defaultProps} />);
            const btn = getActionButton('Clear Change Data');
            fireEvent.click(btn);

            await waitFor(() => {
                const statusEl = screen.getByText('Network failure').closest('.admin-status');
                expect(statusEl).toHaveClass('admin-status--error');
            });
        });
    });

    describe('success feedback', () => {
        it('shows success message after operation completes', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Snapshot created' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const btn = getActionButton('Create Snapshot');
            fireEvent.click(btn);

            await waitFor(() => {
                const statusEl = screen.getByText(/Snapshot created/i).closest('.admin-status');
                expect(statusEl).toHaveClass('admin-status--success');
                expect(statusEl.querySelector('.fa-check-circle')).toBeInTheDocument();
            });
        });
    });
});
