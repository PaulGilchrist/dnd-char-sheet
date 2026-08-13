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

describe('CampaignAdmin - Snapshot', () => {
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

    it('URL-encodes the campaign name in snapshot endpoint', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ size: 1024 }) })
        );

        render(<CampaignAdmin {...createDefaultProps({ campaignName: 'my campaign/1' })} />);
        const action = findActionByText('Snapshot');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/campaigns/my%20campaign%2F1/admin/snapshot',
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

    it('shows success with zero KB for empty snapshots', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ size: 0 }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Snapshot');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Snapshot created (0.0 KB)')).toBeInTheDocument();
        });
    });

    it('transitions from loading to success status', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ size: 51200 }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Snapshot');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Creating snapshot...')).toBeInTheDocument();
        });

        await waitFor(() => {
            expect(screen.getByText('Snapshot created (50.0 KB)')).toBeInTheDocument();
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

    it('transitions from loading to error status', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Server error' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Snapshot');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Creating snapshot...')).toBeInTheDocument();
        });

        await waitFor(() => {
            expect(screen.getByText('Server error')).toBeInTheDocument();
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

    it('re-enables button after successful completion', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ size: 1024 }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Snapshot');
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
        const action = findActionByText('Snapshot');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        expect(btn).toBeDisabled();

        await waitFor(() => {
            expect(btn).not.toBeDisabled();
        });
    });
});

describe('CampaignAdmin - Download', () => {
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

    const createBlobMock = (content = 'test', type = 'application/zip') =>
        new Blob([content], { type });

    it('sends GET request to correct endpoint', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                blob: () => Promise.resolve(createBlobMock()),
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

    it('URL-encodes the campaign name in download endpoint', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                blob: () => Promise.resolve(createBlobMock()),
            })
        );

        render(<CampaignAdmin {...createDefaultProps({ campaignName: 'my campaign/1' })} />);
        const action = findActionByText('Download');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/campaigns/my%20campaign%2F1/admin/download'
            );
        });
    });

    it('creates and triggers a download link with campaign name', async () => {
        const mockBlob = createBlobMock();
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

    it('creates a download link with the campaign name as filename', async () => {
        const mockBlob = createBlobMock();
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                blob: () => Promise.resolve(mockBlob),
            })
        );

        const originalCreateElement = document.createElement.bind(document);
        let capturedDownload = '';

        document.createElement = vi.fn((tag) => {
            if (tag === 'a') {
                const anchor = originalCreateElement('a');
                Object.defineProperty(anchor, 'download', {
                    set(val) { capturedDownload = val; },
                    get() { return capturedDownload; },
                    configurable: true,
                });
                return anchor;
            }
            return originalCreateElement(tag);
        });

        try {
            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Download');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            await waitFor(() => {
                expect(capturedDownload).toBe('test-campaign.zip');
            });
        } finally {
            document.createElement = originalCreateElement;
        }
    });

    it('revokes the object URL after download', async () => {
        const mockBlob = createBlobMock();
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                blob: () => Promise.resolve(mockBlob),
            })
        );

        const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Download');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(revokeObjectURLSpy).toHaveBeenCalled();
        });

        revokeObjectURLSpy.mockRestore();
    });

    it('shows success status after download starts', async () => {
        const mockBlob = createBlobMock();
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

    it('transitions from loading to success status', async () => {
        const mockBlob = createBlobMock();
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
            expect(screen.getByText('Preparing download...')).toBeInTheDocument();
        });

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

    it('transitions from loading to error status', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: false,
                json: () => Promise.resolve({ error: 'Server error' }),
            })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Download');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText('Preparing download...')).toBeInTheDocument();
        });

        await waitFor(() => {
            expect(screen.getByText('Server error')).toBeInTheDocument();
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

    it('re-enables button after successful completion', async () => {
        const mockBlob = createBlobMock();
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

        expect(btn).toBeDisabled();

        await waitFor(() => {
            expect(btn).not.toBeDisabled();
        });
    });

    it('re-enables button after error completion', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: false,
                json: () => Promise.resolve({ error: 'Failed' }),
            })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Download');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        expect(btn).toBeDisabled();

        await waitFor(() => {
            expect(btn).not.toBeDisabled();
        });
    });
});
