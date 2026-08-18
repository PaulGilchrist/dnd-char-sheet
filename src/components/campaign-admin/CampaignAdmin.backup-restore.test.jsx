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

/**
 * Find an admin action card by its h3 heading text and return the button inside it.
 */
const findActionButton = (text) => {
    const heading = screen.getByText(text);
    const actionCard = heading.closest('.admin-action');
    return actionCard.querySelector('button');
};

describe('CampaignAdmin - Snapshot', () => {
    const defaultProps = createDefaultProps();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('disables the button while snapshotting', async () => {
        global.fetch = vi.fn(() => new Promise(() => {}));

        render(<CampaignAdmin {...defaultProps} />);
        const btn = findActionButton('Snapshot');

        fireEvent.click(btn);

        await waitFor(() => {
            expect(btn).toBeDisabled();
        });
    });

    it('shows loading status while snapshotting', async () => {
        global.fetch = vi.fn(() => new Promise(() => {}));

        render(<CampaignAdmin {...defaultProps} />);
        fireEvent.click(findActionButton('Snapshot'));

        await waitFor(() => {
            expect(screen.getByText('Creating snapshot...')).toBeInTheDocument();
        });
    });

    it.each([
        { size: 102400, expected: '100.0 KB' },
        { size: 5120, expected: '5.0 KB' },
        { size: 0, expected: '0.0 KB' },
        { size: 204800, expected: '200.0 KB' },
        { size: 1048576, expected: '1024.0 KB' },
        { size: 10485760, expected: '10240.0 KB' },
    ])('shows success with size: %d bytes → %s', async ({ size, expected }) => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ size }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        fireEvent.click(findActionButton('Snapshot'));

        await waitFor(() => {
            expect(screen.getByText(`Snapshot created (${expected})`)).toBeInTheDocument();
        });
    });

    it('shows error status on failed response', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Snapshot failed' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        fireEvent.click(findActionButton('Snapshot'));

        await waitFor(() => {
            expect(screen.getByText('Snapshot failed')).toBeInTheDocument();
        });
    });

    it('shows error status on network error', async () => {
        global.fetch = vi.fn(() => Promise.reject(new Error('Network failed')));

        render(<CampaignAdmin {...defaultProps} />);
        fireEvent.click(findActionButton('Snapshot'));

        await waitFor(() => {
            expect(screen.getByText('Network failed')).toBeInTheDocument();
        });
    });
});

describe('CampaignAdmin - Download', () => {
    const defaultProps = createDefaultProps();

    // Capture original document.createElement once, before any spy is set up.
    // This prevents infinite recursion when the spy calls back into document.createElement.
    const originalCreateElement = document.createElement.bind(document);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('disables the button while downloading', async () => {
        const mockBlob = new Blob(['test'], { type: 'application/zip' });
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, blob: () => Promise.resolve(mockBlob) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const btn = findActionButton('Download');

        fireEvent.click(btn);

        await waitFor(() => {
            expect(btn).toBeDisabled();
        });
    });

    it('creates an object URL from the response blob', async () => {
        const mockBlob = new Blob(['test'], { type: 'application/zip' });
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, blob: () => Promise.resolve(mockBlob) })
        );
        const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL');

        render(<CampaignAdmin {...defaultProps} />);
        fireEvent.click(findActionButton('Download'));

        await waitFor(() => {
            expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);
        });
    });

    it('triggers a click on the download anchor element', async () => {
        const mockBlob = new Blob(['test'], { type: 'application/zip' });
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, blob: () => Promise.resolve(mockBlob) })
        );

        const createElementSpy = vi.spyOn(document, 'createElement');
        const mockAnchor = {
            href: null,
            download: null,
            click: vi.fn(),
        };

        createElementSpy.mockImplementation((tag) => {
            if (tag === 'a') {
                return mockAnchor;
            }
            return originalCreateElement(tag);
        });

        render(<CampaignAdmin {...defaultProps} />);
        fireEvent.click(findActionButton('Download'));

        await waitFor(() => {
            expect(mockAnchor.click).toHaveBeenCalled();
        });
    });

    it('revokes the object URL after download', async () => {
        const mockBlob = new Blob(['test'], { type: 'application/zip' });
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, blob: () => Promise.resolve(mockBlob) })
        );
        const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

        render(<CampaignAdmin {...defaultProps} />);
        fireEvent.click(findActionButton('Download'));

        await waitFor(() => {
            expect(revokeObjectURLSpy).toHaveBeenCalled();
        });
    });

    it('uses the campaign name as the download filename', async () => {
        const mockBlob = new Blob(['test'], { type: 'application/zip' });
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, blob: () => Promise.resolve(mockBlob) })
        );

        const createElementSpy = vi.spyOn(document, 'createElement');
        let capturedDownload = '';

        createElementSpy.mockImplementation((tag) => {
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

        render(<CampaignAdmin {...defaultProps} />);
        fireEvent.click(findActionButton('Download'));

        await waitFor(() => {
            expect(capturedDownload).toBe('test-campaign.zip');
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
        fireEvent.click(findActionButton('Download'));

        await waitFor(() => {
            expect(screen.getByText('Download failed')).toBeInTheDocument();
        });
    });

    it('shows error status on network error', async () => {
        global.fetch = vi.fn(() => Promise.reject(new Error('Network failed')));

        render(<CampaignAdmin {...defaultProps} />);
        fireEvent.click(findActionButton('Download'));

        await waitFor(() => {
            expect(screen.getByText('Network failed')).toBeInTheDocument();
        });
    });
});

describe('CampaignAdmin - Rollback', () => {
    const defaultProps = createDefaultProps();

    beforeEach(() => {
        vi.clearAllMocks();
        window.alert = vi.fn();
        window.confirm = vi.fn(() => true);
        window.location = { reload: vi.fn() };
    });

    it('opens rollback confirmation modal when button is clicked', () => {
        render(<CampaignAdmin {...defaultProps} />);
        const btn = findActionButton('Rollback');
        fireEvent.click(btn);

        expect(document.querySelector('.ct-modal')).toBeInTheDocument();
        expect(screen.getByText(/overwrite ALL current campaign data/)).toBeInTheDocument();
    });

    it('closes modal via cancel, close button, and overlay', () => {
        render(<CampaignAdmin {...defaultProps} />);
        const btn = findActionButton('Rollback');
        fireEvent.click(btn);

        expect(document.querySelector('.ct-modal')).toBeInTheDocument();

        // Cancel button
        fireEvent.click(screen.getByText('Cancel'));
        expect(document.querySelector('.ct-modal')).not.toBeInTheDocument();

        // Re-open for next test
        fireEvent.click(btn);
        expect(document.querySelector('.ct-modal')).toBeInTheDocument();

        // Close (X) button
        fireEvent.click(document.querySelector('.ct-modal-close'));
        expect(document.querySelector('.ct-modal')).not.toBeInTheDocument();

        // Re-open for next test
        fireEvent.click(btn);
        expect(document.querySelector('.ct-modal')).toBeInTheDocument();

        // Overlay click
        fireEvent.click(document.querySelector('.ct-modal-overlay'));
        expect(document.querySelector('.ct-modal')).not.toBeInTheDocument();
    });

    it('sends POST request to rollback endpoint on confirm', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Rolled back' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const btn = findActionButton('Rollback');
        fireEvent.click(btn);

        const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/campaigns/test-campaign/admin/rollback',
                { method: 'POST' }
            );
        });
    });

    it('URL-encodes the campaign name in rollback endpoint', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Rolled back' }) })
        );

        render(<CampaignAdmin {...createDefaultProps({ campaignName: 'my campaign/1' })} />);
        const btn = findActionButton('Rollback');
        fireEvent.click(btn);

        const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/campaigns/my%20campaign%2F1/admin/rollback',
                { method: 'POST' }
            );
        });
    });

    it('shows loading status while rolling back', async () => {
        global.fetch = vi.fn(() => new Promise(() => {}));

        render(<CampaignAdmin {...defaultProps} />);
        const btn = findActionButton('Rollback');
        fireEvent.click(btn);

        const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(screen.getByText('Rolling back...')).toBeInTheDocument();
        });
    });

    it('shows success message on successful rollback', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Rolled back successfully' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const btn = findActionButton('Rollback');
        fireEvent.click(btn);

        const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(screen.getByText('Rolled back successfully')).toBeInTheDocument();
        });
    });

    it('reloads page after successful rollback', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Rolled back' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const btn = findActionButton('Rollback');
        fireEvent.click(btn);

        const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(window.location.reload).toHaveBeenCalledTimes(1);
        });
    });

    it('does not reload on failed rollback', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Rollback failed' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const btn = findActionButton('Rollback');
        fireEvent.click(btn);

        const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(window.location.reload).not.toHaveBeenCalled();
        });
    });

    it('shows error status on failed rollback', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Rollback failed' }) })
        );

        render(<CampaignAdmin {...defaultProps} />);
        const btn = findActionButton('Rollback');
        fireEvent.click(btn);

        const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(screen.getByText('Rollback failed')).toBeInTheDocument();
        });
    });

    it('shows error status on network error', async () => {
        global.fetch = vi.fn(() => Promise.reject(new Error('Network failed')));

        render(<CampaignAdmin {...defaultProps} />);
        const btn = findActionButton('Rollback');
        fireEvent.click(btn);

        const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(screen.getByText('Network failed')).toBeInTheDocument();
        });
    });

    it('disables rollback button after confirm during async operation', async () => {
        global.fetch = vi.fn(() => new Promise(() => {}));

        render(<CampaignAdmin {...defaultProps} />);
        const btn = findActionButton('Rollback');
        fireEvent.click(btn);

        const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(btn).toBeDisabled();
        });
    });
});

describe('CampaignAdmin - Upload', () => {
    const defaultProps = createDefaultProps();

    beforeEach(() => {
        vi.clearAllMocks();
        window.alert = vi.fn();
        window.location = { reload: vi.fn() };
    });

    const getFileInput = () => document.querySelector('input[type="file"]');

    describe('file validation', () => {
        it('shows error when non-zip file is selected', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const file = new File(['test'], 'test.txt', { type: 'text/plain' });

            fireEvent.change(getFileInput(), { target: { files: [file] } });

            expect(screen.getByText('Please select a .zip file')).toBeInTheDocument();
        });

        it('clears file input after non-zip error', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const file = new File(['test'], 'test.txt', { type: 'text/plain' });

            fireEvent.change(getFileInput(), { target: { files: [file] } });

            expect(getFileInput().value).toBe('');
        });

        it('does not show error for .zip file', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const file = new File(['test'], 'test.zip', { type: 'application/zip' });

            fireEvent.change(getFileInput(), { target: { files: [file] } });

            expect(screen.queryByText('Please select a .zip file')).not.toBeInTheDocument();
        });

        it('rejects .ZIP and .Zip extensions (case-sensitive)', () => {
            render(<CampaignAdmin {...defaultProps} />);

            fireEvent.change(getFileInput(), {
                target: { files: [new File(['test'], 'test.ZIP', { type: 'application/zip' })] },
            });
            expect(screen.getByText('Please select a .zip file')).toBeInTheDocument();

            fireEvent.change(getFileInput(), {
                target: { files: [new File(['test'], 'test.Zip', { type: 'application/zip' })] },
            });
            expect(screen.getByText('Please select a .zip file')).toBeInTheDocument();
        });
    });

    describe('confirmation modal', () => {
        it('opens upload confirmation modal when valid zip is selected', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const file = new File(['test'], 'backup.zip', { type: 'application/zip' });

            fireEvent.change(getFileInput(), { target: { files: [file] } });

            expect(document.querySelector('.ct-modal')).toBeInTheDocument();
            expect(screen.getByText(/backup\.zip/)).toBeInTheDocument();
        });

        it('shows campaign name in upload message', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const file = new File(['test'], 'backup.zip', { type: 'application/zip' });

            fireEvent.change(getFileInput(), { target: { files: [file] } });

            expect(screen.getByText(/"test-campaign"/)).toBeInTheDocument();
        });

        it('closes modal via cancel, close button, and overlay', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const file = new File(['test'], 'backup.zip', { type: 'application/zip' });

            fireEvent.change(getFileInput(), { target: { files: [file] } });
            expect(document.querySelector('.ct-modal')).toBeInTheDocument();

            // Cancel button
            fireEvent.click(screen.getByText('Cancel'));
            expect(document.querySelector('.ct-modal')).not.toBeInTheDocument();

            // Re-open
            fireEvent.change(getFileInput(), { target: { files: [file] } });
            expect(document.querySelector('.ct-modal')).toBeInTheDocument();

            // Close (X) button
            fireEvent.click(document.querySelector('.ct-modal-close'));
            expect(document.querySelector('.ct-modal')).not.toBeInTheDocument();

            // Re-open
            fireEvent.change(getFileInput(), { target: { files: [file] } });
            expect(document.querySelector('.ct-modal')).toBeInTheDocument();

            // Overlay click
            fireEvent.click(document.querySelector('.ct-modal-overlay'));
            expect(document.querySelector('.ct-modal')).not.toBeInTheDocument();
        });

        it('prevents body click from closing the modal', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const file = new File(['test'], 'backup.zip', { type: 'application/zip' });

            fireEvent.change(getFileInput(), { target: { files: [file] } });
            expect(document.querySelector('.ct-modal')).toBeInTheDocument();

            // Body click is prevented
            fireEvent.click(document.querySelector('.ct-modal'));
            expect(document.querySelector('.ct-modal')).toBeInTheDocument();
        });
    });

    describe('upload action', () => {
        const selectZipFile = () => {
            const file = new File(['test'], 'backup.zip', { type: 'application/zip' });
            fireEvent.change(getFileInput(), { target: { files: [file] } });
        };

        const clickConfirm = () => {
            fireEvent.click(document.querySelector('.ct-modal-footer .ct-btn-danger'));
        };

        it('sends POST request with FormData on confirm', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Upload complete' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            selectZipFile();
            clickConfirm();

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    '/api/campaigns/test-campaign/admin/upload',
                    expect.objectContaining({ method: 'POST' })
                );
            });
        });

        it('URL-encodes the campaign name in upload endpoint', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Upload complete' }) })
            );

            render(<CampaignAdmin {...createDefaultProps({ campaignName: 'my campaign/1' })} />);
            selectZipFile();
            clickConfirm();

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    '/api/campaigns/my%20campaign%2F1/admin/upload',
                    expect.objectContaining({ method: 'POST' })
                );
            });
        });

        it('includes the selected file in FormData', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Upload complete' }) })
            );

            const file = new File(['test'], 'backup.zip', { type: 'application/zip' });
            let capturedBody = null;
            global.fetch.mockImplementation(async (url, options) => {
                capturedBody = options.body;
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Upload complete' }) });
            });

            render(<CampaignAdmin {...defaultProps} />);
            fireEvent.change(getFileInput(), { target: { files: [file] } });
            clickConfirm();

            await waitFor(() => {
                expect(capturedBody).toBeInstanceOf(FormData);
                expect(capturedBody.get('file')).toBe(file);
            });
        });

        it('shows loading status while uploading', async () => {
            global.fetch = vi.fn(() => new Promise(() => {}));

            render(<CampaignAdmin {...defaultProps} />);
            selectZipFile();
            clickConfirm();

            await waitFor(() => {
                expect(screen.getByText('Uploading and extracting...')).toBeInTheDocument();
            });
        });

        it('shows success message on successful upload', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Upload complete' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            selectZipFile();
            clickConfirm();

            await waitFor(() => {
                expect(screen.getByText('Upload complete')).toBeInTheDocument();
            });
        });

        it('reloads page after successful upload', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Upload complete' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            selectZipFile();
            clickConfirm();

            await waitFor(() => {
                expect(window.location.reload).toHaveBeenCalledTimes(1);
            });
        });

        it('shows error alert on failed upload', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Upload failed' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            selectZipFile();
            clickConfirm();

            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith(
                    'Upload failed. Campaign has been rolled back to the previous state.\n\nError: Upload failed'
                );
            });
        });

        it('includes details in error alert when present', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Upload failed', details: 'File too large' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            selectZipFile();
            clickConfirm();

            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith(
                    'Upload failed. Campaign has been rolled back to the previous state.\n\nError: Upload failed\nDetails: File too large'
                );
            });
        });

        it('shows error alert on network error', async () => {
            global.fetch = vi.fn(() => Promise.reject(new Error('Network failed')));

            render(<CampaignAdmin {...defaultProps} />);
            selectZipFile();
            clickConfirm();

            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith(
                    'Upload failed. Campaign has been rolled back to the previous state.\n\nError: Network failed'
                );
            });
        });

        it('clears file input after upload completes', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Upload complete' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            selectZipFile();
            clickConfirm();

            await waitFor(() => {
                expect(getFileInput().value).toBe('');
            });
        });

        it('clears file input after upload error', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Upload failed' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            selectZipFile();
            clickConfirm();

            await waitFor(() => {
                expect(getFileInput().value).toBe('');
            });
        });

        it('clears file input after network error', async () => {
            global.fetch = vi.fn(() => Promise.reject(new Error('Network failed')));

            render(<CampaignAdmin {...defaultProps} />);
            selectZipFile();
            clickConfirm();

            await waitFor(() => {
                expect(getFileInput().value).toBe('');
            });
        });

        it('disables upload button after confirm during async operation', async () => {
            global.fetch = vi.fn(() => new Promise(() => {}));

            render(<CampaignAdmin {...defaultProps} />);
            selectZipFile();
            clickConfirm();

            await waitFor(() => {
                const uploadLabel = document.querySelector('.admin-upload-label');
                const uploadInput = uploadLabel.querySelector('input[type="file"]');
                expect(uploadInput).toBeDisabled();
            });
        });
    });
});
