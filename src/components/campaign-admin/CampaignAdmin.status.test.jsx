import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CampaignAdmin from './CampaignAdmin.jsx';

describe('CampaignAdmin - Status Display', () => {
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

    describe('loading status', () => {
        it('renders loading status with spinner', async () => {
            global.fetch = vi.fn(() => new Promise(() => { }));

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Snapshot');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            await waitFor(() => {
                const status = document.querySelector('.admin-status--loading');
                expect(status).toBeInTheDocument();
            });
        });

        it('applies loading class to status div', async () => {
            global.fetch = vi.fn(() => new Promise(() => { }));

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Snapshot');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            await waitFor(() => {
                expect(document.querySelector('.admin-status--loading')).toBeInTheDocument();
            });
        });

        it('shows spinner icon in loading status', async () => {
            global.fetch = vi.fn(() => new Promise(() => { }));

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Snapshot');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            await waitFor(() => {
                const spinner = document.querySelector('.admin-status--loading .fa-spinner');
                expect(spinner).toBeTruthy();
            });
        });

        it('shows correct loading text for each operation', async () => {
            const tests = [
                { action: 'Snapshot', text: 'Creating snapshot...', needsConfirm: false },
                { action: 'Rollback', text: 'Rolling back...', needsConfirm: true },
                { action: 'Download', text: 'Preparing download...', needsConfirm: false },
                { action: 'Clear Change Data', text: 'Clearing change data...', needsConfirm: false },
                { action: 'Clear Campaign Log', text: 'Clearing log...', needsConfirm: false },
                { action: 'Full Reset', text: 'Performing full reset...', needsConfirm: false },
            ];

            for (const test of tests) {
                vi.clearAllMocks();
                global.fetch = vi.fn(() => new Promise(() => { }));

                render(<CampaignAdmin {...defaultProps} />);
                const action = findActionByText(test.action);
                const btn = action.querySelector('button');
                fireEvent.click(btn);

                if (test.needsConfirm) {
                    const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
                    fireEvent.click(confirmBtn);
                }

                await waitFor(() => {
                    expect(screen.getByText(test.text)).toBeInTheDocument();
                });

                cleanup();
            }
        });
    });

    describe('success status', () => {
        it('renders success status with check icon', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Success' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Clear Change Data');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            await waitFor(() => {
                const status = document.querySelector('.admin-status--success');
                expect(status).toBeInTheDocument();
            });
        });

        it('applies success class to status div', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Success' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Clear Change Data');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            await waitFor(() => {
                expect(document.querySelector('.admin-status--success')).toBeInTheDocument();
            });
        });

        it('shows check icon in success status', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Success' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Clear Change Data');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            await waitFor(() => {
                const icon = document.querySelector('.admin-status--success .fa-check-circle');
                expect(icon).toBeTruthy();
            });
        });

        it('displays the success message', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Data cleared' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Clear Change Data');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            await waitFor(() => {
                expect(screen.getByText('Data cleared')).toBeInTheDocument();
            });
        });
    });

    describe('error status', () => {
        it('renders error status with exclamation icon', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Failed' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Clear Change Data');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            await waitFor(() => {
                const status = document.querySelector('.admin-status--error');
                expect(status).toBeInTheDocument();
            });
        });

        it('applies error class to status div', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Failed' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Clear Change Data');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            await waitFor(() => {
                expect(document.querySelector('.admin-status--error')).toBeInTheDocument();
            });
        });

        it('shows exclamation icon in error status', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Failed' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Clear Change Data');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            await waitFor(() => {
                const icon = document.querySelector('.admin-status--error .fa-exclamation-circle');
                expect(icon).toBeTruthy();
            });
        });

        it('displays the error message', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Something went wrong' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Clear Change Data');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            await waitFor(() => {
                expect(screen.getByText('Something went wrong')).toBeInTheDocument();
            });
        });
    });

    describe('status transitions', () => {
        it('shows success after loading completes', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Done', size: 0 }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Snapshot');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            // Loading state should appear
            await waitFor(() => {
                expect(screen.getByText('Creating snapshot...')).toBeInTheDocument();
            });

            // After fetch resolves, success should appear
            await waitFor(() => {
                expect(screen.getByText('Snapshot created (0.0 KB)')).toBeInTheDocument();
            });
        });

        it('shows error after loading completes with failure', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Error' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Snapshot');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            // Loading state should appear
            await waitFor(() => {
                expect(screen.getByText('Creating snapshot...')).toBeInTheDocument();
            });

            // After fetch resolves with error, error should appear
            await waitFor(() => {
                expect(screen.getByText('Error')).toBeInTheDocument();
            });
        });
    });

    describe('isBusy state', () => {
        it('isBusy is false when status is null', () => {
            render(<CampaignAdmin {...defaultProps} />);
            // No status means buttons should not be disabled
            const action = findActionByText('Snapshot');
            const btn = action.querySelector('button');
            expect(btn).not.toBeDisabled();
        });

        it('isBusy is true when status is a string', async () => {
            global.fetch = vi.fn(() => new Promise(() => { }));

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Snapshot');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            expect(btn).toBeDisabled();
        });

        it('isBusy is false when status is an object (success/error)', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Done' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Clear Change Data');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            await waitFor(() => {
                // After success/error, buttons should be re-enabled
                expect(btn).not.toBeDisabled();
            });
        });

        it('all action buttons are disabled during any operation', async () => {
            global.fetch = vi.fn(() => new Promise(() => { }));

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Snapshot');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            const clearChangeAction = findActionByText('Clear Change Data');
            expect(clearChangeAction.querySelector('button')).toBeDisabled();

            const clearLogAction = findActionByText('Clear Campaign Log');
            expect(clearLogAction.querySelector('button')).toBeDisabled();

            const resetAction = findActionByText('Full Reset');
            expect(resetAction.querySelector('button')).toBeDisabled();

            const downloadAction = findActionByText('Download');
            expect(downloadAction.querySelector('button')).toBeDisabled();

            const rollbackAction = findActionByText('Rollback');
            expect(rollbackAction.querySelector('button')).toBeDisabled();
        });
    });
});
