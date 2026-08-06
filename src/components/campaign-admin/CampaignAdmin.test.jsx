// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import CampaignAdmin from './CampaignAdmin.jsx';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const renderCampaignAdmin = (props = {}) =>
  render(
    <CampaignAdmin
      campaignName="test-campaign"
      onBack={vi.fn()}
      theme="dark"
      toggleTheme={vi.fn()}
      onRenameCampaign={vi.fn()}
      {...props}
    />,
  );

describe('CampaignAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Rendering ────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders the header with campaign name and back button', () => {
      renderCampaignAdmin();
      expect(screen.getByRole('heading', { name: 'Admin — test-campaign' })).toBeInTheDocument();
      expect(document.querySelector('.ct-back-btn')).toBeInTheDocument();
    });

    it('renders the Appearance section with theme toggle', () => {
      renderCampaignAdmin({ theme: 'dark' });
      expect(screen.getByRole('heading', { name: 'Appearance' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /switch to light/i })).toBeInTheDocument();
    });

    it('renders Appearance section with light mode button text', () => {
      renderCampaignAdmin({ theme: 'light' });
      expect(screen.getByRole('button', { name: /switch to dark/i })).toBeInTheDocument();
    });

    it('renders the Campaign Management section', () => {
      renderCampaignAdmin();
      expect(screen.getByRole('heading', { name: 'Campaign Management' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Rename Campaign' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /rename campaign/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Delete Campaign' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete campaign/i })).toBeInTheDocument();
    });

    it('renders the Data Management section', () => {
      renderCampaignAdmin();
      expect(screen.getByRole('heading', { name: 'Data Management' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear change data/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear campaign log/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /full reset/i })).toBeInTheDocument();
    });

    it('renders the Backup & Restore section', () => {
      renderCampaignAdmin();
      expect(screen.getByRole('heading', { name: 'Backup & Restore' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create snapshot/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /download campaign/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /rollback to snapshot/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Upload' })).toBeInTheDocument();
    });

    it('renders the upload file input', () => {
      renderCampaignAdmin();
      expect(screen.getByRole('heading', { name: 'Upload' })).toBeInTheDocument();
      const fileInput = document.querySelector('input[type="file"][accept=".zip"]');
      expect(fileInput).toBeInTheDocument();
    });
  });

  // ─── Rename Campaign ──────────────────────────────────────────

  describe('rename campaign', () => {
    it('opens the rename modal when Rename Campaign button is clicked', () => {
      renderCampaignAdmin();
      fireEvent.click(screen.getByRole('button', { name: /rename campaign/i }));
      const headings = screen.getAllByRole('heading', { name: 'Rename Campaign' });
      expect(headings.length).toBeGreaterThan(1);
    });

    it('renders the new name input in the rename modal', () => {
      renderCampaignAdmin();
      fireEvent.click(screen.getByRole('button', { name: /rename campaign/i }));
      expect(screen.getByLabelText('New Campaign Name')).toBeInTheDocument();
    });

    it('autofocuses the input in the rename modal', () => {
      renderCampaignAdmin();
      fireEvent.click(screen.getByRole('button', { name: /rename campaign/i }));
      const input = screen.getByLabelText('New Campaign Name');
      expect(document.activeElement).toBe(input);
    });

    it('closes the rename modal when Cancel is clicked', () => {
      renderCampaignAdmin();
      fireEvent.click(screen.getByRole('button', { name: /rename campaign/i }));
      // Should have 2 headings: one in admin section, one in modal
      const headingsBefore = screen.getAllByRole('heading', { name: 'Rename Campaign' });
      expect(headingsBefore.length).toBeGreaterThan(1);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      // Should have only 1 heading left (admin section)
      const headingsAfter = screen.getAllByRole('heading', { name: 'Rename Campaign' });
      expect(headingsAfter.length).toBe(1);
    });

    it('closes the rename modal when the close button is clicked', () => {
      renderCampaignAdmin();
      fireEvent.click(screen.getByRole('button', { name: /rename campaign/i }));
      const headingsBefore = screen.getAllByRole('heading', { name: 'Rename Campaign' });
      expect(headingsBefore.length).toBeGreaterThan(1);
      fireEvent.click(document.querySelector('.ct-modal-close'));
      const headingsAfter = screen.getAllByRole('heading', { name: 'Rename Campaign' });
      expect(headingsAfter.length).toBe(1);
    });

    it('does not submit when the input is empty and Rename is clicked', async () => {
      const onRenameCampaign = vi.fn();
      renderCampaignAdmin({ onRenameCampaign });
      fireEvent.click(screen.getByRole('button', { name: /rename campaign/i }));
      const renameBtn = screen.getByRole('button', { name: 'Rename' });
      expect(renameBtn).toBeDisabled();
      fireEvent.click(renameBtn);
      expect(onRenameCampaign).not.toHaveBeenCalled();
    });

    it('submits the rename when a new name is entered and Rename is clicked', async () => {
      const onRenameCampaign = vi.fn();
      renderCampaignAdmin({ onRenameCampaign });
      fireEvent.click(screen.getByRole('button', { name: /rename campaign/i }));
      const input = screen.getByLabelText('New Campaign Name');
      await act(async () => {
        fireEvent.change(input, { target: { value: 'New Campaign Name' } });
      });
      const renameBtn = screen.getByRole('button', { name: 'Rename' });
      expect(renameBtn).not.toBeDisabled();
      fireEvent.click(renameBtn);
      expect(onRenameCampaign).toHaveBeenCalledWith('New Campaign Name');
      const headingsAfter = screen.getAllByRole('heading', { name: 'Rename Campaign' });
      expect(headingsAfter.length).toBe(1);
    });

    it('submits the rename when Enter is pressed in the input', async () => {
      const onRenameCampaign = vi.fn();
      renderCampaignAdmin({ onRenameCampaign });
      fireEvent.click(screen.getByRole('button', { name: /rename campaign/i }));
      const input = screen.getByLabelText('New Campaign Name');
      await act(async () => {
        fireEvent.change(input, { target: { value: 'New Campaign Name' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });
      expect(onRenameCampaign).toHaveBeenCalledWith('New Campaign Name');
    });

    it('closes the rename modal when Escape is pressed in the input', async () => {
      renderCampaignAdmin();
      fireEvent.click(screen.getByRole('button', { name: /rename campaign/i }));
      const input = screen.getByLabelText('New Campaign Name');
      await act(async () => {
        fireEvent.keyDown(input, { key: 'Escape' });
      });
      const headingsAfter = screen.getAllByRole('heading', { name: 'Rename Campaign' });
      expect(headingsAfter.length).toBe(1);
    });

    it('clears the input after successful rename submission', async () => {
      const onRenameCampaign = vi.fn();
      renderCampaignAdmin({ onRenameCampaign });
      fireEvent.click(screen.getByRole('button', { name: /rename campaign/i }));
      const input = screen.getByLabelText('New Campaign Name');
      await act(async () => {
        fireEvent.change(input, { target: { value: 'New Campaign Name' } });
      });
      fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
      const headingsAfter = screen.getAllByRole('heading', { name: 'Rename Campaign' });
      expect(headingsAfter.length).toBe(1);
    });
  });

  // ─── Delete Campaign ──────────────────────────────────────────

  describe('delete campaign', () => {
    it('prompts for the campaign name via prompt before the confirmations', () => {
      global.window.confirm = vi.fn(() => true);
      global.window.prompt = vi.fn(() => 'test-campaign');
      renderCampaignAdmin();
      fireEvent.click(screen.getByRole('button', { name: /delete campaign/i }));
      expect(global.window.prompt).toHaveBeenCalledWith(
        expect.stringContaining('test-campaign'),
      );
    });

    it('prompts for confirmation with the campaign name after prompt succeeds', () => {
      global.window.confirm = vi.fn(() => true);
      global.window.prompt = vi.fn(() => 'test-campaign');
      renderCampaignAdmin();
      fireEvent.click(screen.getByRole('button', { name: /delete campaign/i }));
      expect(global.window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('test-campaign'),
      );
    });

    it('cancels deletion when the user declines the prompt', () => {
      global.window.confirm = vi.fn(() => true);
      global.window.prompt = vi.fn(() => false);
      renderCampaignAdmin();
      fireEvent.click(screen.getByRole('button', { name: /delete campaign/i }));
      expect(global.window.confirm).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('shows an alert and cancels when the prompt name does not match', () => {
      global.window.alert = vi.fn();
      global.window.prompt = vi.fn(() => 'wrong-name');
      renderCampaignAdmin();
      fireEvent.click(screen.getByRole('button', { name: /delete campaign/i }));
      expect(global.window.alert).toHaveBeenCalledWith(
        'Campaign name did not match. Deletion cancelled.',
      );
      expect(global.window.confirm).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('cancels when the user cancels the prompt (null)', () => {
      global.window.alert = vi.fn();
      global.window.prompt = vi.fn(() => null);
      renderCampaignAdmin();
      fireEvent.click(screen.getByRole('button', { name: /delete campaign/i }));
      expect(global.window.alert).not.toHaveBeenCalled();
      expect(global.window.confirm).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('shows two confirmations before the DELETE request', () => {
      global.window.confirm = vi.fn(() => true);
      global.window.prompt = vi.fn(() => 'test-campaign');
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      renderCampaignAdmin();
      fireEvent.click(screen.getByRole('button', { name: /delete campaign/i }));
      expect(global.window.confirm).toHaveBeenCalledTimes(2);
    });

    it('sends a DELETE request to the campaign admin endpoint', async () => {
      global.window.confirm = vi.fn(() => true);
      global.window.prompt = vi.fn(() => 'test-campaign');
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /delete campaign/i }));
      });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/campaigns/test-campaign',
        { method: 'DELETE' },
      );
    });

    it('shows a success alert and reloads on successful deletion', async () => {
      global.window.alert = vi.fn();
      global.window.confirm = vi.fn(() => true);
      global.window.prompt = vi.fn(() => 'test-campaign');
      global.window.location = { reload: vi.fn() };
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /delete campaign/i }));
      });
      expect(global.window.alert).toHaveBeenCalledWith('Campaign deleted successfully.');
      expect(global.window.location.reload).toHaveBeenCalled();
    });

    it('shows an error alert when the DELETE request fails', async () => {
      global.window.alert = vi.fn();
      global.window.confirm = vi.fn(() => true);
      global.window.prompt = vi.fn(() => 'test-campaign');
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Deletion failed' }),
      });
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /delete campaign/i }));
      });
      expect(global.window.alert).toHaveBeenCalledWith(
        'Failed to delete campaign: Deletion failed',
      );
      expect(global.window.location.reload).not.toHaveBeenCalled();
    });

    it('shows an error alert when the DELETE request throws', async () => {
      global.window.alert = vi.fn();
      global.window.confirm = vi.fn(() => true);
      global.window.prompt = vi.fn(() => 'test-campaign');
      mockFetch.mockRejectedValue(new Error('Network error'));
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /delete campaign/i }));
      });
      expect(global.window.alert).toHaveBeenCalledWith(
        'Failed to delete campaign: Network error',
      );
    });
  });

  // ─── Clear Change Data ────────────────────────────────────────

  describe('clear change data', () => {
    it('prompts for confirmation before clearing change data', () => {
      global.window.confirm = vi.fn(() => true);
      renderCampaignAdmin();
      fireEvent.click(screen.getByRole('button', { name: /clear change data/i }));
      expect(global.window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('test-campaign'),
      );
    });

    it('cancels when the user declines the confirmation', () => {
      global.window.confirm = vi.fn(() => false);
      renderCampaignAdmin();
      fireEvent.click(screen.getByRole('button', { name: /clear change data/i }));
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('sends a POST request to the clear-change-data endpoint', async () => {
      global.window.confirm = vi.fn(() => true);
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ message: 'Done' }) });
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /clear change data/i }));
      });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/campaigns/test-campaign/admin/clear-change-data',
        { method: 'POST' },
      );
    });

    it('shows a success status message on successful clear', async () => {
      global.window.confirm = vi.fn(() => true);
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ message: 'Change data cleared' }) });
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /clear change data/i }));
      });
      await waitFor(() => {
        expect(screen.getByText('Change data cleared')).toBeInTheDocument();
      });
    });

    it('shows an error status message when the request fails', async () => {
      global.window.confirm = vi.fn(() => true);
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Clear failed' }),
      });
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /clear change data/i }));
      });
      await waitFor(() => {
        expect(screen.getByText('Clear failed')).toBeInTheDocument();
      });
    });

    it('shows an error status message when the request throws', async () => {
      global.window.confirm = vi.fn(() => true);
      mockFetch.mockRejectedValue(new Error('Network error'));
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /clear change data/i }));
      });
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  // ─── Clear Log ────────────────────────────────────────────────

  describe('clear campaign log', () => {
    it('prompts for confirmation before clearing the log', () => {
      global.window.confirm = vi.fn(() => true);
      renderCampaignAdmin();
      fireEvent.click(screen.getByRole('button', { name: /clear campaign log/i }));
      expect(global.window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('test-campaign'),
      );
    });

    it('cancels when the user declines the confirmation', () => {
      global.window.confirm = vi.fn(() => false);
      renderCampaignAdmin();
      fireEvent.click(screen.getByRole('button', { name: /clear campaign log/i }));
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('sends a POST request to the clear-log endpoint', async () => {
      global.window.confirm = vi.fn(() => true);
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ message: 'Log cleared' }) });
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /clear campaign log/i }));
      });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/campaigns/test-campaign/admin/clear-log',
        { method: 'POST' },
      );
    });

    it('shows a success status message on successful clear', async () => {
      global.window.confirm = vi.fn(() => true);
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ message: 'Log cleared' }) });
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /clear campaign log/i }));
      });
      await waitFor(() => {
        expect(screen.getByText('Log cleared')).toBeInTheDocument();
      });
    });

    it('shows an error status message when the request fails', async () => {
      global.window.confirm = vi.fn(() => true);
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Log clear failed' }),
      });
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /clear campaign log/i }));
      });
      await waitFor(() => {
        expect(screen.getByText('Log clear failed')).toBeInTheDocument();
      });
    });
  });

  // ─── Full Reset ───────────────────────────────────────────────

  describe('full reset', () => {
    it('prompts for confirmation before full reset', () => {
      global.window.confirm = vi.fn(() => true);
      renderCampaignAdmin();
      fireEvent.click(screen.getByRole('button', { name: /full reset/i }));
      expect(global.window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('test-campaign'),
      );
    });

    it('cancels when the user declines the confirmation', () => {
      global.window.confirm = vi.fn(() => false);
      renderCampaignAdmin();
      fireEvent.click(screen.getByRole('button', { name: /full reset/i }));
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('sends a POST request to the full-reset endpoint', async () => {
      global.window.confirm = vi.fn(() => true);
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ message: 'Reset done' }) });
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /full reset/i }));
      });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/campaigns/test-campaign/admin/full-reset',
        { method: 'POST' },
      );
    });

    it('shows a success status message on successful reset', async () => {
      global.window.confirm = vi.fn(() => true);
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ message: 'Reset done' }) });
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /full reset/i }));
      });
      await waitFor(() => {
        expect(screen.getByText('Reset done')).toBeInTheDocument();
      });
    });

    it('shows an error status message when the request fails', async () => {
      global.window.confirm = vi.fn(() => true);
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Reset failed' }),
      });
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /full reset/i }));
      });
      await waitFor(() => {
        expect(screen.getByText('Reset failed')).toBeInTheDocument();
      });
    });
  });

  // ─── Snapshot ─────────────────────────────────────────────────

  describe('snapshot', () => {
    it('sends a POST request to the snapshot endpoint', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ size: 102400 }) });
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /create snapshot/i }));
      });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/campaigns/test-campaign/admin/snapshot',
        { method: 'POST' },
      );
    });

    it('shows a loading status while snapshotting', async () => {
      mockFetch.mockReturnValue(new Promise(() => { }));
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /create snapshot/i }));
      });
      expect(screen.getByText('Creating snapshot...')).toBeInTheDocument();
    });

    it('shows a success status with size in KB on successful snapshot', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ size: 102400 }) });
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /create snapshot/i }));
      });
      await waitFor(() => {
        expect(screen.getByText(/Snapshot created \(100\.0 KB\)/)).toBeInTheDocument();
      });
    });

    it('shows an error status message when the request fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Snapshot failed' }),
      });
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /create snapshot/i }));
      });
      await waitFor(() => {
        expect(screen.getByText('Snapshot failed')).toBeInTheDocument();
      });
    });

    it('shows an error status message when the request throws', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /create snapshot/i }));
      });
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  // ─── Download ─────────────────────────────────────────────────

  describe('download', () => {
    it('sends a GET request to the download endpoint', async () => {
      const blob = new Blob(['fake-zip'], { type: 'application/zip' });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(blob),
      });
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /download campaign/i }));
      });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/campaigns/test-campaign/admin/download',
      );
    });

    it('shows a loading status while downloading', async () => {
      mockFetch.mockReturnValue(new Promise(() => { }));
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /download campaign/i }));
      });
      expect(screen.getByText('Preparing download...')).toBeInTheDocument();
    });

    it('creates and triggers a download link with the campaign name', async () => {
      const blob = new Blob(['fake-zip'], { type: 'application/zip' });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(blob),
      });
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /download campaign/i }));
      });
      await waitFor(() => {
        expect(screen.getByText('Download started')).toBeInTheDocument();
      });
      // The component creates an anchor element and calls .click() on it
      // but doesn't append it to the DOM, so we verify via the download status
      expect(screen.getByText('Download started')).toBeInTheDocument();
    });

    it('shows an error status message when the request fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Download failed' }),
      });
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /download campaign/i }));
      });
      await waitFor(() => {
        expect(screen.getByText('Download failed')).toBeInTheDocument();
      });
    });

    it('shows an error status message when the request throws', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /download campaign/i }));
      });
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  // ─── Rollback ─────────────────────────────────────────────────

  describe('rollback', () => {
    it('opens a confirmation modal with the rollback message', () => {
      renderCampaignAdmin();
      fireEvent.click(screen.getByRole('button', { name: /rollback to snapshot/i }));
      expect(screen.getByRole('heading', { name: 'Rollback Campaign' })).toBeInTheDocument();
      expect(screen.getByText(/overwrite ALL current campaign data/i)).toBeInTheDocument();
    });

    it('closes the rollback modal when Cancel is clicked', () => {
      renderCampaignAdmin();
      fireEvent.click(screen.getByRole('button', { name: /rollback to snapshot/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('heading', { name: 'Rollback Campaign' })).not.toBeInTheDocument();
    });

    it('closes the rollback modal when the close button is clicked', () => {
      renderCampaignAdmin();
      fireEvent.click(screen.getByRole('button', { name: /rollback to snapshot/i }));
      fireEvent.click(document.querySelector('.ct-modal-close'));
      expect(screen.queryByRole('heading', { name: 'Rollback Campaign' })).not.toBeInTheDocument();
    });

    it('closes the rollback modal when the overlay is clicked', () => {
      renderCampaignAdmin();
      fireEvent.click(screen.getByRole('button', { name: /rollback to snapshot/i }));
      const overlay = document.querySelector('.ct-modal-overlay');
      fireEvent.click(overlay);
      expect(screen.queryByRole('heading', { name: 'Rollback Campaign' })).not.toBeInTheDocument();
    });

    it('sends a POST request to the rollback endpoint when confirmed', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ message: 'Rolled back' }) });
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /rollback to snapshot/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
      });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/campaigns/test-campaign/admin/rollback',
        { method: 'POST' },
      );
    });

    it('shows a loading status while rolling back', async () => {
      mockFetch.mockReturnValue(new Promise(() => { }));
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /rollback to snapshot/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
      });
      expect(screen.getByText('Rolling back...')).toBeInTheDocument();
    });

    it('shows a success status on successful rollback and reloads', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ message: 'Rolled back' }) });
      global.window.location = { reload: vi.fn() };
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /rollback to snapshot/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
      });
      await waitFor(() => {
        expect(screen.getByText('Rolled back')).toBeInTheDocument();
      });
      expect(global.window.location.reload).toHaveBeenCalled();
    });

    it('shows an error status message when the request fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Rollback failed' }),
      });
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /rollback to snapshot/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
      });
      await waitFor(() => {
        expect(screen.getByText('Rollback failed')).toBeInTheDocument();
      });
    });

    it('shows an error status message when the request throws', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /rollback to snapshot/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
      });
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  // ─── Upload ───────────────────────────────────────────────────

  describe('upload', () => {
    it('validates that the file is a .zip file', () => {
      renderCampaignAdmin();
      const fileInput = document.querySelector('input[type="file"][accept=".zip"]');
      const nonZipFile = new File(['content'], 'file.txt', { type: 'text/plain' });
      fireEvent.change(fileInput, { target: { files: [nonZipFile] } });
      expect(screen.getByText('Please select a .zip file')).toBeInTheDocument();
    });

    it('resets the file input after a non-.zip file', () => {
      renderCampaignAdmin();
      const fileInput = document.querySelector('input[type="file"][accept=".zip"]');
      const nonZipFile = new File(['content'], 'file.txt', { type: 'text/plain' });
      fireEvent.change(fileInput, { target: { files: [nonZipFile] } });
      expect(fileInput.value).toBe('');
    });

    it('opens a confirmation modal when a .zip file is selected', () => {
      renderCampaignAdmin();
      const fileInput = document.querySelector('input[type="file"][accept=".zip"]');
      const zipFile = new File(['content'], 'campaign.zip', { type: 'application/zip' });
      fireEvent.change(fileInput, { target: { files: [zipFile] } });
      expect(screen.getByRole('heading', { name: 'Upload Campaign' })).toBeInTheDocument();
    });

    it('shows the uploaded filename in the upload confirmation message', () => {
      renderCampaignAdmin();
      const fileInput = document.querySelector('input[type="file"][accept=".zip"]');
      const zipFile = new File(['content'], 'my-campaign.zip', { type: 'application/zip' });
      fireEvent.change(fileInput, { target: { files: [zipFile] } });
      expect(screen.getByText(/my-campaign\.zip/i)).toBeInTheDocument();
    });

    it('closes the upload modal when Cancel is clicked', () => {
      renderCampaignAdmin();
      const fileInput = document.querySelector('input[type="file"][accept=".zip"]');
      const zipFile = new File(['content'], 'campaign.zip', { type: 'application/zip' });
      fireEvent.change(fileInput, { target: { files: [zipFile] } });
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('heading', { name: 'Upload Campaign' })).not.toBeInTheDocument();
    });

    it('closes the upload modal when the close button is clicked', () => {
      renderCampaignAdmin();
      const fileInput = document.querySelector('input[type="file"][accept=".zip"]');
      const zipFile = new File(['content'], 'campaign.zip', { type: 'application/zip' });
      fireEvent.change(fileInput, { target: { files: [zipFile] } });
      fireEvent.click(document.querySelector('.ct-modal-close'));
      expect(screen.queryByRole('heading', { name: 'Upload Campaign' })).not.toBeInTheDocument();
    });

    it('closes the upload modal when the overlay is clicked', () => {
      renderCampaignAdmin();
      const fileInput = document.querySelector('input[type="file"][accept=".zip"]');
      const zipFile = new File(['content'], 'campaign.zip', { type: 'application/zip' });
      fireEvent.change(fileInput, { target: { files: [zipFile] } });
      const overlay = document.querySelector('.ct-modal-overlay');
      fireEvent.click(overlay);
      expect(screen.queryByRole('heading', { name: 'Upload Campaign' })).not.toBeInTheDocument();
    });

    it('sends a POST request with FormData to the upload endpoint when confirmed', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ message: 'Uploaded' }) });
      global.window.location = { reload: vi.fn() };
      renderCampaignAdmin();
      const fileInput = document.querySelector('input[type="file"][accept=".zip"]');
      const zipFile = new File(['content'], 'campaign.zip', { type: 'application/zip' });
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [zipFile] } });
        fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
      });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/campaigns/test-campaign/admin/upload',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('shows a loading status while uploading', async () => {
      mockFetch.mockReturnValue(new Promise(() => { }));
      renderCampaignAdmin();
      const fileInput = document.querySelector('input[type="file"][accept=".zip"]');
      const zipFile = new File(['content'], 'campaign.zip', { type: 'application/zip' });
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [zipFile] } });
        fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
      });
      expect(screen.getByText('Uploading and extracting...')).toBeInTheDocument();
    });

    it('shows a success status on successful upload and reloads', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ message: 'Uploaded' }) });
      global.window.location = { reload: vi.fn() };
      renderCampaignAdmin();
      const fileInput = document.querySelector('input[type="file"][accept=".zip"]');
      const zipFile = new File(['content'], 'campaign.zip', { type: 'application/zip' });
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [zipFile] } });
        fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
      });
      await waitFor(() => {
        expect(screen.getByText('Uploaded')).toBeInTheDocument();
      });
      expect(global.window.location.reload).toHaveBeenCalled();
    });

    it('shows an error alert and status when the upload request fails', async () => {
      global.window.alert = vi.fn();
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Upload failed', details: 'Invalid format' }),
      });
      renderCampaignAdmin();
      const fileInput = document.querySelector('input[type="file"][accept=".zip"]');
      const zipFile = new File(['content'], 'campaign.zip', { type: 'application/zip' });
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [zipFile] } });
        fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
      });
      await waitFor(() => {
        expect(screen.getByText('Upload failed: Invalid format')).toBeInTheDocument();
      });
      expect(global.window.alert).toHaveBeenCalledWith(
        expect.stringContaining('Upload failed'),
      );
    });

    it('shows an error alert and status when the upload request throws', async () => {
      global.window.alert = vi.fn();
      mockFetch.mockRejectedValue(new Error('Network error'));
      renderCampaignAdmin();
      const fileInput = document.querySelector('input[type="file"][accept=".zip"]');
      const zipFile = new File(['content'], 'campaign.zip', { type: 'application/zip' });
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [zipFile] } });
        fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
      });
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
      expect(global.window.alert).toHaveBeenCalledWith(
        expect.stringContaining('Upload failed'),
      );
    });

    it('resets the file input after a successful upload', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ message: 'Uploaded' }) });
      renderCampaignAdmin();
      const fileInput = document.querySelector('input[type="file"][accept=".zip"]');
      const zipFile = new File(['content'], 'campaign.zip', { type: 'application/zip' });
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [zipFile] } });
        fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
      });
      await waitFor(() => {
        expect(fileInput.value).toBe('');
      });
    });

    it('resets the file input after a failed upload', async () => {
      global.window.alert = vi.fn();
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Upload failed' }),
      });
      renderCampaignAdmin();
      const fileInput = document.querySelector('input[type="file"][accept=".zip"]');
      const zipFile = new File(['content'], 'campaign.zip', { type: 'application/zip' });
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [zipFile] } });
        fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
      });
      await waitFor(() => {
        expect(fileInput.value).toBe('');
      });
    });
  });

  // ─── Busy State ───────────────────────────────────────────────

  describe('busy state', () => {
    it('disables clear change data button during snapshot', async () => {
      mockFetch.mockReturnValue(new Promise(() => { }));
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /create snapshot/i }));
      });
      expect(screen.getByRole('button', { name: /clear change data/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /clear campaign log/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /full reset/i })).toBeDisabled();
    });

    it('disables rollback button during snapshot', async () => {
      mockFetch.mockReturnValue(new Promise(() => { }));
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /create snapshot/i }));
      });
      expect(screen.getByRole('button', { name: /rollback to snapshot/i })).toBeDisabled();
    });

    it('disables download button during snapshot', async () => {
      mockFetch.mockReturnValue(new Promise(() => { }));
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /create snapshot/i }));
      });
      expect(screen.getByRole('button', { name: /download campaign/i })).toBeDisabled();
    });

    it('disables the upload file input during snapshot', async () => {
      mockFetch.mockReturnValue(new Promise(() => { }));
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /create snapshot/i }));
      });
      const fileInput = document.querySelector('input[type="file"][accept=".zip"]');
      expect(fileInput).toBeDisabled();
    });
  });

  // ─── Status Display ───────────────────────────────────────────

  describe('status display', () => {
    it('shows a loading status with spinner during snapshot', async () => {
      mockFetch.mockReturnValue(new Promise(() => { }));
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /create snapshot/i }));
      });
      const statusEl = document.querySelector('.admin-status--loading');
      expect(statusEl).toBeInTheDocument();
    });

    it('shows a success status with check icon', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ message: 'Done' }) });
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /clear change data/i }));
      });
      const statusEl = document.querySelector('.admin-status--success');
      expect(statusEl).toBeInTheDocument();
    });

    it('shows an error status with exclamation icon', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed' }),
      });
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /clear change data/i }));
      });
      const statusEl = document.querySelector('.admin-status--error');
      expect(statusEl).toBeInTheDocument();
    });

    it('shows "Performing full reset..." during full reset', async () => {
      mockFetch.mockReturnValue(new Promise(() => { }));
      global.window.confirm = vi.fn(() => true);
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /full reset/i }));
      });
      expect(screen.getByText('Performing full reset...')).toBeInTheDocument();
    });

    it('shows "Clearing change data..." during clear change data', async () => {
      mockFetch.mockReturnValue(new Promise(() => { }));
      global.window.confirm = vi.fn(() => true);
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /clear change data/i }));
      });
      expect(screen.getByText('Clearing change data...')).toBeInTheDocument();
    });

    it('shows "Clearing log..." during clear log', async () => {
      mockFetch.mockReturnValue(new Promise(() => { }));
      global.window.confirm = vi.fn(() => true);
      renderCampaignAdmin();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /clear campaign log/i }));
      });
      expect(screen.getByText('Clearing log...')).toBeInTheDocument();
    });
  });

  // ─── Theme Toggle ─────────────────────────────────────────────

  describe('theme toggle', () => {
    it('calls toggleTheme when the theme button is clicked', () => {
      const toggleTheme = vi.fn();
      renderCampaignAdmin({ theme: 'dark', toggleTheme });
      fireEvent.click(screen.getByRole('button', { name: /switch to light/i }));
      expect(toggleTheme).toHaveBeenCalled();
    });

    it('shows the sun icon when theme is dark', () => {
      renderCampaignAdmin({ theme: 'dark' });
      const icon = screen.getByRole('button', { name: /switch to light/i }).querySelector('i');
      expect(icon).toHaveClass('fa-sun');
    });

    it('shows the moon icon when theme is light', () => {
      renderCampaignAdmin({ theme: 'light' });
      const icon = screen.getByRole('button', { name: /switch to dark/i }).querySelector('i');
      expect(icon).toHaveClass('fa-moon');
    });
  });

  // ─── Back Button ──────────────────────────────────────────────

  describe('back button', () => {
    it('calls onBack when the back button is clicked', () => {
      const onBack = vi.fn();
      renderCampaignAdmin({ onBack });
      fireEvent.click(document.querySelector('.ct-back-btn'));
      expect(onBack).toHaveBeenCalled();
    });
  });

  // ─── Campaign Name Encoding ───────────────────────────────────

  describe('campaign name encoding', () => {
    it('URL-encodes the campaign name in API requests for clear-change-data', async () => {
      global.window.confirm = vi.fn(() => true);
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ message: 'Done' }) });
      renderCampaignAdmin({ campaignName: 'my campaign/1' });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /clear change data/i }));
      });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/campaigns/my%20campaign%2F1/admin/clear-change-data',
        { method: 'POST' },
      );
    });

    it('URL-encodes the campaign name in API requests for delete', async () => {
      global.window.confirm = vi.fn(() => true);
      global.window.prompt = vi.fn(() => 'my campaign/1');
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      renderCampaignAdmin({ campaignName: 'my campaign/1' });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /delete campaign/i }));
      });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/campaigns/my%20campaign%2F1',
        { method: 'DELETE' },
      );
    });
  });
});
