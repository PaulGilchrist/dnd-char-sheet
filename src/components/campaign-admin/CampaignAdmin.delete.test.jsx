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

const findDangerAction = () => {
    const actions = document.querySelectorAll('.admin-action');
    for (const action of actions) {
        const h3 = action.querySelector('h3');
        if (h3 && h3.textContent === 'Delete Campaign') {
            return action;
        }
    }
    return null;
};

describe('CampaignAdmin - Delete Campaign', () => {
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

    describe('prompt confirmation', () => {
        it('prompts user with campaign name for deletion confirmation', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const btn = findDangerAction().querySelector('button');
            fireEvent.click(btn);

            expect(window.prompt).toHaveBeenCalledWith(
                'Type the exact campaign name to confirm deletion of "test-campaign":'
            );
        });

        it('cancels when prompt returns null (user cancelled)', () => {
            window.prompt.mockReturnValueOnce(null);
            render(<CampaignAdmin {...defaultProps} />);
            const btn = findDangerAction().querySelector('button');
            fireEvent.click(btn);

            expect(window.confirm).not.toHaveBeenCalled();
            expect(window.alert).not.toHaveBeenCalled();
        });

        it.each([
            { input: '', description: 'empty string' },
            { input: 'wrong-name', description: 'mismatched name' },
        ])('cancels and shows alert when prompt returns %s', ({ input, description: _description }) => {
            window.prompt.mockReturnValueOnce(input);
            render(<CampaignAdmin {...defaultProps} />);
            const btn = findDangerAction().querySelector('button');
            fireEvent.click(btn);

            expect(window.alert).toHaveBeenCalledWith(
                'Campaign name did not match. Deletion cancelled.'
            );
            expect(window.confirm).not.toHaveBeenCalled();
        });
    });

    describe('double confirmation', () => {
        it('shows first confirmation after name matches', () => {
            window.prompt.mockReturnValueOnce('test-campaign');
            render(<CampaignAdmin {...defaultProps} />);
            const btn = findDangerAction().querySelector('button');
            fireEvent.click(btn);

            expect(window.confirm).toHaveBeenCalledWith(
                'WARNING: This will permanently delete the entire campaign "test-campaign" and ALL its files including characters, maps, encounters, quests, factions, notes, settlements, NPCs, and all runtime data. This CANNOT be undone. Are you absolutely sure?'
            );
        });

        it('cancels when first confirmation is denied', () => {
            window.prompt.mockReturnValueOnce('test-campaign');
            window.confirm.mockReturnValueOnce(false);
            render(<CampaignAdmin {...defaultProps} />);
            const btn = findDangerAction().querySelector('button');
            fireEvent.click(btn);

            expect(window.confirm).toHaveBeenCalledTimes(1);
            expect(window.alert).not.toHaveBeenCalled();
        });

        it('shows second confirmation after first is approved', () => {
            window.prompt.mockReturnValueOnce('test-campaign');
            window.confirm.mockReturnValueOnce(true);
            render(<CampaignAdmin {...defaultProps} />);
            const btn = findDangerAction().querySelector('button');
            fireEvent.click(btn);

            expect(window.confirm).toHaveBeenCalledWith(
                'FINAL WARNING: test-campaign will be completely erased from the server. There is no recovery. Proceed?'
            );
        });

        it('cancels when second confirmation is denied', () => {
            window.prompt.mockReturnValueOnce('test-campaign');
            window.confirm.mockReturnValueOnce(true);
            window.confirm.mockReturnValueOnce(false);
            render(<CampaignAdmin {...defaultProps} />);
            const btn = findDangerAction().querySelector('button');
            fireEvent.click(btn);

            expect(window.confirm).toHaveBeenCalledTimes(2);
            expect(window.alert).not.toHaveBeenCalled();
        });
    });

    describe('API deletion', () => {
        it('sends DELETE request to correct endpoint after both confirmations', async () => {
            window.prompt.mockReturnValueOnce('test-campaign');
            window.confirm.mockReturnValueOnce(true);
            window.confirm.mockReturnValueOnce(true);
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const btn = findDangerAction().querySelector('button');
            fireEvent.click(btn);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    '/api/campaigns/test-campaign',
                    { method: 'DELETE' }
                );
            });
        });

        it('URL-encodes the campaign name in the DELETE endpoint', async () => {
            window.prompt.mockReturnValueOnce('my campaign/1');
            window.confirm.mockReturnValueOnce(true);
            window.confirm.mockReturnValueOnce(true);
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
            );

            render(<CampaignAdmin {...createDefaultProps({ campaignName: 'my campaign/1' })} />);
            const btn = findDangerAction().querySelector('button');
            fireEvent.click(btn);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    '/api/campaigns/my%20campaign%2F1',
                    { method: 'DELETE' }
                );
            });
        });

        it('shows success alert and reloads on successful deletion', async () => {
            window.prompt.mockReturnValueOnce('test-campaign');
            window.confirm.mockReturnValueOnce(true);
            window.confirm.mockReturnValueOnce(true);
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const btn = findDangerAction().querySelector('button');
            fireEvent.click(btn);

            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith('Campaign deleted successfully.');
                expect(window.location.reload).toHaveBeenCalledTimes(1);
            });
        });

        it('shows error alert with server message on failed deletion', async () => {
            window.prompt.mockReturnValueOnce('test-campaign');
            window.confirm.mockReturnValueOnce(true);
            window.confirm.mockReturnValueOnce(true);
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Delete failed' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const btn = findDangerAction().querySelector('button');
            fireEvent.click(btn);

            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith('Failed to delete campaign: Delete failed');
                expect(window.location.reload).not.toHaveBeenCalled();
            });
        });

        it('shows error alert on network error', async () => {
            window.prompt.mockReturnValueOnce('test-campaign');
            window.confirm.mockReturnValueOnce(true);
            window.confirm.mockReturnValueOnce(true);
            global.fetch = vi.fn(() => Promise.reject(new Error('Network failed')));

            render(<CampaignAdmin {...defaultProps} />);
            const btn = findDangerAction().querySelector('button');
            fireEvent.click(btn);

            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith('Failed to delete campaign: Network failed');
            });
        });
    });

    describe('rendering', () => {
        it('renders the Delete Campaign action with danger styling', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const action = findDangerAction();
            expect(action).toHaveClass('admin-action--danger');
        });

        it('renders the delete button with danger class and icon', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const btn = findDangerAction().querySelector('button');
            expect(btn).toHaveClass('ct-btn-danger');
            expect(btn.querySelector('i.fa-exclamation-triangle')).toBeTruthy();
        });

        it('renders the delete action description', () => {
            render(<CampaignAdmin {...defaultProps} />);
            expect(
                screen.getByText('Permanently deletes the entire campaign and ALL its files. This cannot be undone.')
            ).toBeInTheDocument();
        });
    });
});
