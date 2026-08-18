// @improved-by-ai
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

describe('CampaignAdmin - Snapshot', () => {
    const defaultProps = createDefaultProps();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('disables the button while snapshotting', async () => {
        global.fetch = vi.fn(() => new Promise(() => {}));

        render(<CampaignAdmin {...defaultProps} />);
        const btn = screen.getByRole('button', { name: 'Create Snapshot' });

        fireEvent.click(btn);

        await waitFor(() => {
            expect(btn).toBeDisabled();
        });
    });

    it('shows loading status while snapshotting', async () => {
        global.fetch = vi.fn(() => new Promise(() => {}));

        render(<CampaignAdmin {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: 'Create Snapshot' }));

        await waitFor(() => {
            expect(screen.getByText('Creating snapshot...')).toBeInTheDocument();
        });
    });

    it('shows success with snapshot size formatted as KB', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ size: 102400 }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: 'Create Snapshot' }));

        await waitFor(() => {
            expect(screen.getByText('Snapshot created (100.0 KB)')).toBeInTheDocument();
        });
    });

    it('shows error status on failed response', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Snapshot failed' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: 'Create Snapshot' }));

        await waitFor(() => {
            expect(screen.getByText('Snapshot failed')).toBeInTheDocument();
        });
    });

    it('shows error status on network error', async () => {
        global.fetch = vi.fn(() => Promise.reject(new Error('Network failed')));

        render(<CampaignAdmin {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: 'Create Snapshot' }));

        await waitFor(() => {
            expect(screen.getByText('Network failed')).toBeInTheDocument();
        });
    });
});

describe('CampaignAdmin - Download', () => {
    const defaultProps = createDefaultProps();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('disables the button while downloading', async () => {
        const mockBlob = new Blob(['test'], { type: 'application/zip' });
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, blob: () => Promise.resolve(mockBlob) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const btn = screen.getByRole('button', { name: 'Download Campaign' });

        fireEvent.click(btn);

        await waitFor(() => {
            expect(btn).toBeDisabled();
        });
    });

    it('revokes the object URL after download', async () => {
        const mockBlob = new Blob(['test'], { type: 'application/zip' });
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, blob: () => Promise.resolve(mockBlob) })
        );
        const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

        render(<CampaignAdmin {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: 'Download Campaign' }));

        await waitFor(() => {
            expect(revokeObjectURLSpy).toHaveBeenCalled();
        });
    });

    it('shows error status on failed response', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: false,
                json: () => Promise.resolve({ error: 'Download failed' }),
            })
        );

        render(<CampaignAdmin {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: 'Download Campaign' }));

        await waitFor(() => {
            expect(screen.getByText('Download failed')).toBeInTheDocument();
        });
    });

    it('shows error status on network error', async () => {
        global.fetch = vi.fn(() => Promise.reject(new Error('Network failed')));

        render(<CampaignAdmin {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: 'Download Campaign' }));

        await waitFor(() => {
            expect(screen.getByText('Network failed')).toBeInTheDocument();
        });
    });
});
