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

describe('CampaignAdmin - Clear Change Data', () => {
    const defaultProps = createDefaultProps();

    beforeEach(() => {
        vi.clearAllMocks();
        window.alert = vi.fn();
        window.confirm = vi.fn(() => true);
        window.prompt = vi.fn(() => 'test-campaign');
        window.location = { reload: vi.fn() };
    });

    it('shows confirmation dialog with campaign name', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Done' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Clear Change Data');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(window.confirm).toHaveBeenCalledWith(
                'This will clear all runtime state for "test-campaign" including HP, conditions, spell slots, death saves, and target effects. You will need to re-establish combat state. Continue?'
            );
        });
    });

    it('cancels when user denies confirmation', () => {
        window.confirm.mockReturnValueOnce(false);
        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Clear Change Data');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('sends POST request to correct endpoint on confirm', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Done' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Clear Change Data');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/campaigns/test-campaign/admin/clear-change-data',
                { method: 'POST' }
            );
        });
    });

    it('sends POST with URL-encoded campaign name', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Done' }) })
        );

        render(<CampaignAdmin {...defaultProps} campaignName="my campaign/1" />);
        const action = findActionByText('Clear Change Data');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/campaigns/my%20campaign%2F1/admin/clear-change-data',
                { method: 'POST' }
            );
        });
    });

    it('shows success status on successful response', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Change data cleared' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Clear Change Data');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Change data cleared')).toBeInTheDocument();
        });
    });

    it('shows error status on failed response', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Server error' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Clear Change Data');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Server error')).toBeInTheDocument();
        });
    });

    it('shows error status on network error', async () => {
        global.fetch = vi.fn(() => Promise.reject(new Error('Network failed')));

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Clear Change Data');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Network failed')).toBeInTheDocument();
        });
    });

    it('shows loading status while clearing', async () => {
        global.fetch = vi.fn(() => new Promise(() => { }));

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Clear Change Data');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Clearing change data...')).toBeInTheDocument();
        });
    });

    it('disables button while busy', () => {
        global.fetch = vi.fn(() => new Promise(() => { }));

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Clear Change Data');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        expect(btn).toBeDisabled();
    });

    it('re-enables button after successful completion', async () => {
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
        });
    });

    it('re-enables button after error completion', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Failed' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Clear Change Data');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        expect(btn).toBeDisabled();

        await waitFor(() => {
            expect(btn).not.toBeDisabled();
        });
    });
});

describe('CampaignAdmin - Clear Campaign Log', () => {
    const defaultProps = createDefaultProps();

    beforeEach(() => {
        vi.clearAllMocks();
        window.alert = vi.fn();
        window.confirm = vi.fn(() => true);
        window.prompt = vi.fn(() => 'test-campaign');
        window.location = { reload: vi.fn() };
    });

    it('shows confirmation dialog with campaign name', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Done' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Clear Campaign Log');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(window.confirm).toHaveBeenCalledWith(
                'This will permanently delete the campaign log for "test-campaign". Roll history will be lost. Continue?'
            );
        });
    });

    it('cancels when user denies confirmation', () => {
        window.confirm.mockReturnValueOnce(false);
        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Clear Campaign Log');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('sends POST request to correct endpoint on confirm', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Log cleared' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Clear Campaign Log');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/campaigns/test-campaign/admin/clear-log',
                { method: 'POST' }
            );
        });
    });

    it('sends POST with URL-encoded campaign name', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Done' }) })
        );

        render(<CampaignAdmin {...defaultProps} campaignName="my campaign/1" />);
        const action = findActionByText('Clear Campaign Log');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/campaigns/my%20campaign%2F1/admin/clear-log',
                { method: 'POST' }
            );
        });
    });

    it('shows success status on successful response', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Log cleared' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Clear Campaign Log');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Log cleared')).toBeInTheDocument();
        });
    });

    it('shows error status on failed response', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Server error' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Clear Campaign Log');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Server error')).toBeInTheDocument();
        });
    });

    it('shows error status on network error', async () => {
        global.fetch = vi.fn(() => Promise.reject(new Error('Network failed')));

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Clear Campaign Log');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Network failed')).toBeInTheDocument();
        });
    });

    it('shows loading status while clearing', async () => {
        global.fetch = vi.fn(() => new Promise(() => { }));

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Clear Campaign Log');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Clearing log...')).toBeInTheDocument();
        });
    });

    it('disables button while busy', () => {
        global.fetch = vi.fn(() => new Promise(() => { }));

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Clear Campaign Log');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        expect(btn).toBeDisabled();
    });

    it('re-enables button after successful completion', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Done' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Clear Campaign Log');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        expect(btn).toBeDisabled();

        await waitFor(() => {
            expect(btn).not.toBeDisabled();
        });
    });

    it('re-enables button after error completion', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Failed' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Clear Campaign Log');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        expect(btn).toBeDisabled();

        await waitFor(() => {
            expect(btn).not.toBeDisabled();
        });
    });
});

describe('CampaignAdmin - Full Reset', () => {
    const defaultProps = createDefaultProps();

    beforeEach(() => {
        vi.clearAllMocks();
        window.alert = vi.fn();
        window.confirm = vi.fn(() => true);
        window.prompt = vi.fn(() => 'test-campaign');
        window.location = { reload: vi.fn() };
    });

    it('shows confirmation dialog with campaign name', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Done' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Full Reset');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(window.confirm).toHaveBeenCalledWith(
                'FULL RESET: This will delete both the campaign log AND all change data for "test-campaign". All runtime state will be lost. This cannot be undone. Continue?'
            );
        });
    });

    it('cancels when user denies confirmation', () => {
        window.confirm.mockReturnValueOnce(false);
        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Full Reset');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('sends POST request to correct endpoint on confirm', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Reset complete' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Full Reset');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/campaigns/test-campaign/admin/full-reset',
                { method: 'POST' }
            );
        });
    });

    it('sends POST with URL-encoded campaign name', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Done' }) })
        );

        render(<CampaignAdmin {...defaultProps} campaignName="my campaign/1" />);
        const action = findActionByText('Full Reset');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/campaigns/my%20campaign%2F1/admin/full-reset',
                { method: 'POST' }
            );
        });
    });

    it('shows success status on successful response', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Reset complete' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Full Reset');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Reset complete')).toBeInTheDocument();
        });
    });

    it('shows error status on failed response', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Server error' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Full Reset');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Server error')).toBeInTheDocument();
        });
    });

    it('shows error status on network error', async () => {
        global.fetch = vi.fn(() => Promise.reject(new Error('Network failed')));

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Full Reset');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Network failed')).toBeInTheDocument();
        });
    });

    it('shows loading status text', async () => {
        global.fetch = vi.fn(() => new Promise(() => { }));

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Full Reset');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Performing full reset...')).toBeInTheDocument();
        });
    });

    it('disables button while busy', () => {
        global.fetch = vi.fn(() => new Promise(() => { }));

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Full Reset');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        expect(btn).toBeDisabled();
    });

    it('re-enables button after successful completion', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Done' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Full Reset');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        expect(btn).toBeDisabled();

        await waitFor(() => {
            expect(btn).not.toBeDisabled();
        });
    });

    it('re-enables button after error completion', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Failed' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Full Reset');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        expect(btn).toBeDisabled();

        await waitFor(() => {
            expect(btn).not.toBeDisabled();
        });
    });
});
