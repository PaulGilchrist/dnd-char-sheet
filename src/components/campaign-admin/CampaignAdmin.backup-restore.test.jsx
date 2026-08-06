/* @cleaned-by-ai */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CampaignAdmin from './CampaignAdmin.jsx';

describe('CampaignAdmin - Snapshot', () => {
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

    it('sends POST request to correct endpoint', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ size: 102400 }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Snapshot');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/campaigns/test-campaign/admin/snapshot',
                { method: 'POST' }
            );
        });
    });

    it('shows loading status while snapshotting', async () => {
        global.fetch = vi.fn(() => new Promise(() => { }));

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Snapshot');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Creating snapshot...')).toBeInTheDocument();
        });
    });

    it('shows success with size in KB on successful response', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ size: 102400 }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Snapshot');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Snapshot created (100.0 KB)')).toBeInTheDocument();
        });
    });

    it('shows success with decimal KB for small snapshots', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ size: 5120 }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Snapshot');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Snapshot created (5.0 KB)')).toBeInTheDocument();
        });
    });

    it('shows error status on failed response', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Snapshot failed' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Snapshot');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Snapshot failed')).toBeInTheDocument();
        });
    });

    it('shows error status on network error', async () => {
        global.fetch = vi.fn(() => Promise.reject(new Error('Network failed')));

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Snapshot');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Network failed')).toBeInTheDocument();
        });
    });

    it('disables button while busy', () => {
        global.fetch = vi.fn(() => new Promise(() => { }));

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Snapshot');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        expect(btn).toBeDisabled();
    });
});

describe('CampaignAdmin - Download', () => {
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

    it('sends GET request to correct endpoint', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                blob: () => Promise.resolve(new Blob()),
            })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Download');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/campaigns/test-campaign/admin/download'
            );
        });
    });

    it('creates and triggers a download link with campaign name', async () => {
        const mockBlob = new Blob(['test'], { type: 'application/zip' });
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                blob: () => Promise.resolve(mockBlob),
            })
        );

        const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL');

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Download');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);
        });

        createObjectURLSpy.mockRestore();
    });

    it('shows success status after download starts', async () => {
        const mockBlob = new Blob(['test'], { type: 'application/zip' });
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                blob: () => Promise.resolve(mockBlob),
            })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Download');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Download started')).toBeInTheDocument();
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
        const action = findActionByText('Download');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Download failed')).toBeInTheDocument();
        });
    });

    it('shows error status on network error', async () => {
        global.fetch = vi.fn(() => Promise.reject(new Error('Network failed')));

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Download');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Network failed')).toBeInTheDocument();
        });
    });

    it('disables button while busy', () => {
        global.fetch = vi.fn(() => new Promise(() => { }));

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Download');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        expect(btn).toBeDisabled();
    });
});
