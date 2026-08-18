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

const renderCampaignAdmin = (props = {}) =>
    render(<CampaignAdmin {...createDefaultProps(props)} />);

const clickDeleteButton = () => {
    const btn = screen.getByRole('button', { name: /delete campaign/i });
    fireEvent.click(btn);
    return btn;
};

describe('CampaignAdmin - Delete Campaign', () => {
    let originalPrompt;
    let originalConfirm;
    let originalAlert;
    let originalLocation;

    beforeEach(() => {
        originalPrompt = window.prompt;
        originalConfirm = window.confirm;
        originalAlert = window.alert;
        originalLocation = window.location;
        window.prompt = vi.fn();
        window.confirm = vi.fn(() => true);
        window.alert = vi.fn();
        Object.defineProperty(window, 'location', {
            value: { reload: vi.fn() },
            writable: true,
            configurable: true,
        });
    });

    afterEach(() => {
        window.prompt = originalPrompt;
        window.confirm = originalConfirm;
        window.alert = originalAlert;
        Object.defineProperty(window, 'location', {
            value: originalLocation,
            writable: true,
            configurable: true,
        });
    });

    describe('prompt confirmation', () => {
        it('prompts user with campaign name for deletion confirmation', () => {
            renderCampaignAdmin();
            clickDeleteButton();

            expect(window.prompt).toHaveBeenCalledWith(
                'Type the exact campaign name to confirm deletion of "test-campaign":'
            );
        });

        it('uses the campaign name prop in the prompt message', () => {
            window.prompt.mockReturnValueOnce('my-special-campaign');
            renderCampaignAdmin({ campaignName: 'my-special-campaign' });
            clickDeleteButton();

            expect(window.prompt).toHaveBeenCalledWith(
                'Type the exact campaign name to confirm deletion of "my-special-campaign":'
            );
        });

        it('cancels when prompt returns null (user cancelled)', () => {
            window.prompt.mockReturnValueOnce(null);
            renderCampaignAdmin();
            clickDeleteButton();

            expect(window.prompt).toHaveBeenCalled();
            expect(window.confirm).not.toHaveBeenCalled();
            expect(window.alert).not.toHaveBeenCalled();
        });

        it.each([
            { input: '', name: 'empty string' },
            { input: 'wrong-name', name: 'mismatched name' },
        ])('cancels and shows alert when prompt returns %s', ({ input }) => {
            window.prompt.mockReturnValueOnce(input);
            renderCampaignAdmin();
            clickDeleteButton();

            expect(window.alert).toHaveBeenCalledWith(
                'Campaign name did not match. Deletion cancelled.'
            );
            expect(window.confirm).not.toHaveBeenCalled();
        });
    });

    describe('double confirmation', () => {
        it('shows first confirmation after name matches', () => {
            window.prompt.mockReturnValueOnce('test-campaign');
            renderCampaignAdmin();
            clickDeleteButton();

            expect(window.confirm).toHaveBeenCalledWith(
                'WARNING: This will permanently delete the entire campaign "test-campaign" and ALL its files including characters, maps, encounters, quests, factions, notes, settlements, NPCs, and all runtime data. This CANNOT be undone. Are you absolutely sure?'
            );
        });

        it('cancels when first confirmation is denied', () => {
            window.prompt.mockReturnValueOnce('test-campaign');
            window.confirm.mockReturnValueOnce(false);
            renderCampaignAdmin();
            clickDeleteButton();

            expect(window.confirm).toHaveBeenCalledTimes(1);
            expect(window.alert).not.toHaveBeenCalled();
        });

        it('shows second confirmation after first is approved', () => {
            window.prompt.mockReturnValueOnce('test-campaign');
            window.confirm.mockReturnValueOnce(true);
            renderCampaignAdmin();
            clickDeleteButton();

            expect(window.confirm).toHaveBeenCalledWith(
                'FINAL WARNING: test-campaign will be completely erased from the server. There is no recovery. Proceed?'
            );
        });

        it('cancels when second confirmation is denied', () => {
            window.prompt.mockReturnValueOnce('test-campaign');
            window.confirm.mockReturnValueOnce(true);
            window.confirm.mockReturnValueOnce(false);
            renderCampaignAdmin();
            clickDeleteButton();

            expect(window.confirm).toHaveBeenCalledTimes(2);
            expect(window.alert).not.toHaveBeenCalled();
        });

        it('does not call fetch regardless of confirm state', () => {
            const fetchSpy = vi.spyOn(global, 'fetch');
            window.prompt.mockReturnValueOnce('test-campaign');
            window.confirm.mockReturnValueOnce(false);
            renderCampaignAdmin();
            clickDeleteButton();

            expect(fetchSpy).not.toHaveBeenCalled();
            fetchSpy.mockRestore();
        });
    });

    describe('API deletion', () => {
        const setupFetch = (response) => {
            global.fetch = vi.fn(() =>
                Promise.resolve(response)
            );
        };

        it('sends DELETE request to correct endpoint after both confirmations', async () => {
            window.prompt.mockReturnValueOnce('test-campaign');
            window.confirm.mockReturnValueOnce(true);
            window.confirm.mockReturnValueOnce(true);
            setupFetch({ ok: true, json: () => Promise.resolve({}) });

            renderCampaignAdmin();
            clickDeleteButton();

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    '/api/campaigns/test-campaign',
                    { method: 'DELETE' }
                );
            }, { timeout: 5000 });
        });

        it('URL-encodes the campaign name in the DELETE endpoint', async () => {
            window.prompt.mockReturnValueOnce('my campaign/1');
            window.confirm.mockReturnValueOnce(true);
            window.confirm.mockReturnValueOnce(true);
            setupFetch({ ok: true, json: () => Promise.resolve({}) });

            renderCampaignAdmin({ campaignName: 'my campaign/1' });
            clickDeleteButton();

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    '/api/campaigns/my%20campaign%2F1',
                    { method: 'DELETE' }
                );
            }, { timeout: 5000 });
        });

        it('shows success alert and reloads on successful deletion', async () => {
            window.prompt.mockReturnValueOnce('test-campaign');
            window.confirm.mockReturnValueOnce(true);
            window.confirm.mockReturnValueOnce(true);
            setupFetch({ ok: true, json: () => Promise.resolve({}) });

            renderCampaignAdmin();
            clickDeleteButton();

            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith('Campaign deleted successfully.');
                expect(window.location.reload).toHaveBeenCalledTimes(1);
            }, { timeout: 5000 });
        });

        it('shows error alert with server message on failed deletion', async () => {
            window.prompt.mockReturnValueOnce('test-campaign');
            window.confirm.mockReturnValueOnce(true);
            window.confirm.mockReturnValueOnce(true);
            setupFetch({ ok: false, json: () => Promise.resolve({ error: 'Delete failed' }) });

            renderCampaignAdmin();
            clickDeleteButton();

            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith('Failed to delete campaign: Delete failed');
                expect(window.location.reload).not.toHaveBeenCalled();
            }, { timeout: 5000 });
        });

        it('shows error alert on network error', async () => {
            window.prompt.mockReturnValueOnce('test-campaign');
            window.confirm.mockReturnValueOnce(true);
            window.confirm.mockReturnValueOnce(true);
            global.fetch = vi.fn(() => Promise.reject(new Error('Network failed')));

            renderCampaignAdmin();
            clickDeleteButton();

            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith('Failed to delete campaign: Network failed');
            }, { timeout: 5000 });
        });

        it('shows generic error when server returns error without message field', async () => {
            window.prompt.mockReturnValueOnce('test-campaign');
            window.confirm.mockReturnValueOnce(true);
            window.confirm.mockReturnValueOnce(true);
            setupFetch({ ok: false, json: () => Promise.resolve({}) });

            renderCampaignAdmin();
            clickDeleteButton();

            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith('Failed to delete campaign: Unknown error');
            }, { timeout: 5000 });
        });
    });

    describe('rendering', () => {
        it('renders the Delete Campaign action with danger styling', () => {
            renderCampaignAdmin();
            const action = screen.getByRole('heading', { name: 'Delete Campaign' }).closest('.admin-action');
            expect(action).toHaveClass('admin-action--danger');
        });

        it('renders the delete button with danger class and icon', () => {
            renderCampaignAdmin();
            const btn = screen.getByRole('button', { name: /delete campaign/i });
            expect(btn).toHaveClass('ct-btn-danger');
            expect(btn.querySelector('i.fa-exclamation-triangle')).toBeTruthy();
        });

        it('renders the delete action description', () => {
            renderCampaignAdmin();
            expect(
                screen.getByText('Permanently deletes the entire campaign and ALL its files. This cannot be undone.')
            ).toBeInTheDocument();
        });

        it('does not render the delete button when action is not visible', () => {
            renderCampaignAdmin();
            expect(screen.getByRole('button', { name: /delete campaign/i })).toBeInTheDocument();
        });
    });
});
