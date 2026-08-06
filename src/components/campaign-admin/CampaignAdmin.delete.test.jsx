/* @cleaned-by-ai */
import { render, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CampaignAdmin from './CampaignAdmin.jsx';

describe('CampaignAdmin - Delete Campaign', () => {
    const defaultProps = {
        campaignName: 'test-campaign',
        onBack: vi.fn(),
        theme: 'dark',
        toggleTheme: vi.fn(),
        onRenameCampaign: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
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

    it('shows prompt asking for campaign name confirmation', () => {
        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Delete Campaign');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        expect(window.prompt).toHaveBeenCalledWith(
            'Type the exact campaign name to confirm deletion of "test-campaign":'
        );
    });

    it('cancels when prompt returns null (user cancelled)', () => {
        window.prompt.mockReturnValueOnce(null);
        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Delete Campaign');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        expect(window.confirm).not.toHaveBeenCalled();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('shows alert and cancels when name does not match', () => {
        window.prompt.mockReturnValueOnce('wrong-name');
        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Delete Campaign');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        expect(window.alert).toHaveBeenCalledWith(
            'Campaign name did not match. Deletion cancelled.'
        );
        expect(window.confirm).not.toHaveBeenCalled();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('shows first confirmation after name matches', () => {
        window.prompt.mockReturnValueOnce('test-campaign');
        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Delete Campaign');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        expect(window.confirm).toHaveBeenCalledWith(
            'WARNING: This will permanently delete the entire campaign "test-campaign" and ALL its files including characters, maps, encounters, quests, factions, notes, settlements, NPCs, and all runtime data. This CANNOT be undone. Are you absolutely sure?'
        );
    });

    it('cancels when first confirmation is denied', () => {
        window.prompt.mockReturnValueOnce('test-campaign');
        window.confirm.mockReturnValueOnce(false);
        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Delete Campaign');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        expect(window.confirm).toHaveBeenCalledTimes(1);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('shows second confirmation after first is approved', () => {
        window.prompt.mockReturnValueOnce('test-campaign');
        window.confirm.mockReturnValueOnce(true);
        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Delete Campaign');
        const btn = action.querySelector('button');
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
        const action = findActionByText('Delete Campaign');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        expect(window.confirm).toHaveBeenCalledTimes(2);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('sends DELETE request to correct endpoint after both confirmations', async () => {
        window.prompt.mockReturnValueOnce('test-campaign');
        window.confirm.mockReturnValueOnce(true);
        window.confirm.mockReturnValueOnce(true);
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Delete Campaign');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/campaigns/test-campaign',
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
        const action = findActionByText('Delete Campaign');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('Campaign deleted successfully.');
            expect(window.location.reload).toHaveBeenCalledTimes(1);
        });
    });

    it('shows error alert on failed deletion', async () => {
        window.prompt.mockReturnValueOnce('test-campaign');
        window.confirm.mockReturnValueOnce(true);
        window.confirm.mockReturnValueOnce(true);
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Delete failed' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Delete Campaign');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('Failed to delete campaign: Delete failed');
            expect(window.location.reload).not.toHaveBeenCalled();
        });
    });

    it('shows error alert with generic message when no error field', async () => {
        window.prompt.mockReturnValueOnce('test-campaign');
        window.confirm.mockReturnValueOnce(true);
        window.confirm.mockReturnValueOnce(true);
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Delete Campaign');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('Failed to delete campaign: Unknown error');
        });
    });

    it('shows error alert on network error', async () => {
        window.prompt.mockReturnValueOnce('test-campaign');
        window.confirm.mockReturnValueOnce(true);
        window.confirm.mockReturnValueOnce(true);
        global.fetch = vi.fn(() => Promise.reject(new Error('Network failed')));

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Delete Campaign');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('Failed to delete campaign: Network failed');
        });
    });
});
