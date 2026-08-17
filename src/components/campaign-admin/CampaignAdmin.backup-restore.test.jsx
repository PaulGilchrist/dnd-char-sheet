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

    it.each([
        { size: 102400, expected: '100.0 KB' },
        { size: 5120, expected: '5.0 KB' },
        { size: 0, expected: '0.0 KB' },
        { size: 204800, expected: '200.0 KB' },
    ])('shows success with size in KB: %d bytes → %s', async ({ size, expected }) => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ size }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const action = findActionByText('Snapshot');
        const btn = action.querySelector('button');
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByText(`Snapshot created (${expected})`)).toBeInTheDocument();
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
});
