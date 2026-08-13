// @improved-by-ai
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
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

describe('CampaignAdmin - Status Display', () => {
    const defaultProps = createDefaultProps();

    beforeEach(() => {
        vi.clearAllMocks();
        window.alert = vi.fn();
        window.confirm = vi.fn(() => true);
        window.prompt = vi.fn(() => 'test-campaign');
        Object.defineProperty(window, 'location', {
            value: { reload: vi.fn() },
            writable: true,
        });
    });

    afterEach(cleanup);

    describe('loading status', () => {
        it('shows loading class, spinner icon, and text for each operation', async () => {
            const tests = [
                { action: 'Snapshot', text: 'Creating snapshot...', confirm: false },
                { action: 'Rollback', text: 'Rolling back...', confirm: true },
                { action: 'Download', text: 'Preparing download...', confirm: false },
                { action: 'Clear Change Data', text: 'Clearing change data...', confirm: false },
                { action: 'Clear Campaign Log', text: 'Clearing log...', confirm: false },
                { action: 'Full Reset', text: 'Performing full reset...', confirm: false },
            ];

            for (const test of tests) {
                vi.clearAllMocks();
                global.fetch = vi.fn(() => new Promise(() => {}));

                render(<CampaignAdmin {...defaultProps} />);
                const action = findActionByText(test.action);
                const btn = action.querySelector('button');
                fireEvent.click(btn);

                if (test.confirm) {
                    const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
                    fireEvent.click(confirmBtn);
                }

                await waitFor(() => {
                    const statusEl = document.querySelector('.admin-status--loading');
                    expect(statusEl).toBeInTheDocument();
                    expect(statusEl.querySelector('.fa-spinner')).toBeTruthy();
                    expect(statusEl.querySelector('.fa-spin')).toBeTruthy();
                    expect(screen.getByText(test.text)).toBeInTheDocument();
                });

                cleanup();
            }
        });

        it('sets isBusy (buttons disabled) during loading', async () => {
            global.fetch = vi.fn(() => new Promise(() => {}));

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Snapshot');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            expect(btn).toBeDisabled();
        });
    });

    describe('success status', () => {
        it('shows success class, check icon, and message', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Data cleared' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Clear Change Data');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            await waitFor(() => {
                const statusEl = document.querySelector('.admin-status--success');
                expect(statusEl).toBeInTheDocument();
                expect(statusEl.querySelector('.fa-check-circle')).toBeTruthy();
                expect(screen.getByText('Data cleared')).toBeInTheDocument();
            });
        });
    });

    describe('error status', () => {
        it('shows error class, exclamation icon, and message', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Something went wrong' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Clear Change Data');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            await waitFor(() => {
                const statusEl = document.querySelector('.admin-status--error');
                expect(statusEl).toBeInTheDocument();
                expect(statusEl.querySelector('.fa-exclamation-circle')).toBeTruthy();
                expect(screen.getByText('Something went wrong')).toBeInTheDocument();
            });
        });

        it('shows error status from network error (catch block)', async () => {
            global.fetch = vi.fn(() => Promise.reject(new Error('Network failed')));

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Clear Change Data');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            await waitFor(() => {
                const statusEl = document.querySelector('.admin-status--error');
                expect(statusEl).toBeInTheDocument();
                expect(screen.getByText('Network failed')).toBeInTheDocument();
            });
        });
    });

    describe('status transitions', () => {
        it('transitions from loading to success', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Done', size: 0 }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Snapshot');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            await waitFor(() => {
                expect(screen.getByText('Creating snapshot...')).toBeInTheDocument();
            });

            await waitFor(() => {
                expect(screen.getByText('Snapshot created (0.0 KB)')).toBeInTheDocument();
                expect(document.querySelector('.admin-status--loading')).not.toBeInTheDocument();
            });
        });

        it('transitions from loading to error', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Error' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Snapshot');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            await waitFor(() => {
                expect(screen.getByText('Creating snapshot...')).toBeInTheDocument();
            });

            await waitFor(() => {
                expect(screen.getByText('Error')).toBeInTheDocument();
                expect(document.querySelector('.admin-status--loading')).not.toBeInTheDocument();
            });
        });

        it('re-enables all buttons after operation completes', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Done' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Clear Change Data');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            expect(btn).toBeDisabled();

            await waitFor(() => {
                expect(btn).not.toBeDisabled();

                const snapshotAction = findActionByText('Snapshot');
                expect(snapshotAction.querySelector('button')).not.toBeDisabled();

                const rollbackAction = findActionByText('Rollback');
                expect(rollbackAction.querySelector('button')).not.toBeDisabled();
            });
        });
    });

    describe('isBusy state', () => {
        it('buttons are enabled when no operation is in progress', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Snapshot');
            const btn = action.querySelector('button');
            expect(btn).not.toBeDisabled();
        });

        it('all action buttons are disabled during any operation', async () => {
            global.fetch = vi.fn(() => new Promise(() => {}));

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Snapshot');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            expect(btn).toBeDisabled();

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
