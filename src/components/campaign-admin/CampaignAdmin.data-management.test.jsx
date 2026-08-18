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

const adminActions = [
    {
        name: 'Clear Change Data',
        confirmMessage: 'This will clear all runtime state for "test-campaign" including HP, conditions, spell slots, death saves, and target effects. You will need to re-establish combat state. Continue?',
        endpoint: '/api/campaigns/test-campaign/admin/clear-change-data',
        successMessage: 'Change data cleared',
        loadingText: 'Clearing change data...',
    },
    {
        name: 'Clear Campaign Log',
        confirmMessage: 'This will permanently delete the campaign log for "test-campaign". Roll history will be lost. Continue?',
        endpoint: '/api/campaigns/test-campaign/admin/clear-log',
        successMessage: 'Log cleared',
        loadingText: 'Clearing log...',
    },
    {
        name: 'Full Reset',
        confirmMessage: 'FULL RESET: This will delete both the campaign log AND all change data for "test-campaign". All runtime state will be lost. This cannot be undone. Continue?',
        endpoint: '/api/campaigns/test-campaign/admin/full-reset',
        successMessage: 'Reset complete',
        loadingText: 'Performing full reset...',
    },
];

describe('CampaignAdmin - Data Management Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.confirm = vi.fn(() => true);
        Object.defineProperty(window, 'location', {
            value: { reload: vi.fn() },
            writable: true,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe.each(adminActions)('$name action', ({ name, confirmMessage, endpoint, successMessage, loadingText }) => {
        const defaultProps = createDefaultProps();

        it('shows confirmation dialog with campaign name', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Done' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            fireEvent.click(screen.getByRole('button', { name }));

            await waitFor(() => {
                expect(window.confirm).toHaveBeenCalledWith(confirmMessage);
            });
        });

        it('cancels when user denies confirmation', () => {
            window.confirm.mockReturnValueOnce(false);
            render(<CampaignAdmin {...defaultProps} />);
            fireEvent.click(screen.getByRole('button', { name }));

            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('sends POST request to correct endpoint on confirm', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Done' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            fireEvent.click(screen.getByRole('button', { name }));

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(endpoint, { method: 'POST' });
            });
        });

        it('shows loading status while action is in progress', async () => {
            global.fetch = vi.fn(() => new Promise(() => {}));

            render(<CampaignAdmin {...defaultProps} />);
            fireEvent.click(screen.getByRole('button', { name }));

            await waitFor(() => {
                const statusEl = screen.getByText(loadingText);
                expect(statusEl).toBeInTheDocument();
            });
        });

        it('shows success status on successful response', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: successMessage }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            fireEvent.click(screen.getByRole('button', { name }));

            await waitFor(() => {
                expect(screen.getByText(successMessage)).toBeInTheDocument();
            });
        });

        it('shows error status on failed response', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Server error' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            fireEvent.click(screen.getByRole('button', { name }));

            await waitFor(() => {
                expect(screen.getByText('Server error')).toBeInTheDocument();
            });
        });

        it('shows error status on network error', async () => {
            global.fetch = vi.fn(() => Promise.reject(new Error('Network failed')));

            render(<CampaignAdmin {...defaultProps} />);
            fireEvent.click(screen.getByRole('button', { name }));

            await waitFor(() => {
                expect(screen.getByText('Network failed')).toBeInTheDocument();
            });
        });
    });

    describe('URL encoding', () => {
        it.each([
            { campaignName: 'my campaign/1', encoded: 'my%20campaign%2F1' },
            { campaignName: 'campaign & stuff', encoded: 'campaign%20%26%20stuff' },
            { campaignName: 'a#b?c', encoded: 'a%23b%3Fc' },
        ])('URL-encodes special characters in campaign name for $campaignName', async ({ campaignName, encoded }) => {
            const action = adminActions[0];
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Done' }) })
            );

            render(<CampaignAdmin {...createDefaultProps({ campaignName })} />);
            fireEvent.click(screen.getByRole('button', { name: action.name }));

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    `/api/campaigns/${encoded}/admin/${action.endpoint.split('/').pop()}`,
                    { method: 'POST' }
                );
            });
        });
    });

    describe('disabled state during busy operation', () => {
        it.each(adminActions)('disables $name button during in-flight request', async ({ name }) => {
            global.fetch = vi.fn(() => new Promise(() => {}));

            render(<CampaignAdmin {...createDefaultProps()} />);
            const btn = screen.getByRole('button', { name });

            fireEvent.click(btn);

            expect(btn).toBeDisabled();
        });

        it.each(adminActions)('re-enables $name button after operation completes', async ({ name }) => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Done' }) })
            );

            render(<CampaignAdmin {...createDefaultProps()} />);
            const btn = screen.getByRole('button', { name });

            fireEvent.click(btn);

            expect(btn).toBeDisabled();

            await waitFor(() => {
                expect(btn).not.toBeDisabled();
            });
        });
    });

    describe('double-click prevention', () => {
        it('prevents multiple fetch calls on rapid clicks', async () => {
            global.fetch = vi.fn(() => new Promise(() => {}));

            render(<CampaignAdmin {...createDefaultProps()} />);
            const btn = screen.getByRole('button', { name: adminActions[0].name });

            fireEvent.click(btn);
            fireEvent.click(btn);
            fireEvent.click(btn);

            expect(global.fetch).toHaveBeenCalledTimes(1);
        });
    });
});
