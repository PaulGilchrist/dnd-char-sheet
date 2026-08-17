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

describe('CampaignAdmin - Rollback & Upload', () => {
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

    describe('Rollback - confirmation modal', () => {
        it('opens rollback confirmation modal when button is clicked', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Rollback');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            expect(document.querySelector('.ct-modal')).toBeInTheDocument();
            expect(screen.getByText(/overwrite ALL current campaign data/)).toBeInTheDocument();
        });

        it('closes modal via cancel, close button, and overlay', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Rollback');
            const btn = action.querySelector('button');
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
    });

    describe('Rollback - confirm action', () => {
        it('sends POST request to rollback endpoint on confirm', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Rolled back' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Rollback');
            const btn = action.querySelector('button');
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
            const action = findActionByText('Rollback');
            const btn = action.querySelector('button');
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
            global.fetch = vi.fn(() => new Promise(() => { }));

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Rollback');
            const btn = action.querySelector('button');
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
            const action = findActionByText('Rollback');
            const btn = action.querySelector('button');
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
            const action = findActionByText('Rollback');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
            fireEvent.click(confirmBtn);

            await waitFor(() => {
                expect(window.location.reload).toHaveBeenCalledTimes(1);
            });
        });

        it('shows error status on failed rollback', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Rollback failed' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Rollback');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
            fireEvent.click(confirmBtn);

            await waitFor(() => {
                expect(screen.getByText('Rollback failed')).toBeInTheDocument();
                expect(window.location.reload).not.toHaveBeenCalled();
            });
        });

        it('shows error status on network error', async () => {
            global.fetch = vi.fn(() => Promise.reject(new Error('Network failed')));

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Rollback');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
            fireEvent.click(confirmBtn);

            await waitFor(() => {
                expect(screen.getByText('Network failed')).toBeInTheDocument();
            });
        });

        it('disables rollback action button after confirm during async operation', async () => {
            global.fetch = vi.fn(() => new Promise(() => { }));

            render(<CampaignAdmin {...defaultProps} />);
            const action = findActionByText('Rollback');
            const btn = action.querySelector('button');
            fireEvent.click(btn);

            const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
            fireEvent.click(confirmBtn);

            await waitFor(() => {
                expect(btn).toBeDisabled();
            });
        });
    });

    describe('Upload - file validation', () => {
        it('shows error when non-zip file is selected', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'test.txt', { type: 'text/plain' });

            fireEvent.change(fileInput, { target: { files: [file] } });

            expect(screen.getByText('Please select a .zip file')).toBeInTheDocument();
        });

        it('clears file input after non-zip error', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'test.txt', { type: 'text/plain' });

            fireEvent.change(fileInput, { target: { files: [file] } });

            expect(fileInput.value).toBe('');
        });

        it('does not show error for .zip file', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'test.zip', { type: 'application/zip' });

            fireEvent.change(fileInput, { target: { files: [file] } });

            expect(screen.queryByText('Please select a .zip file')).not.toBeInTheDocument();
        });

        it('rejects .ZIP and .Zip extensions (case-sensitive check)', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');

            // Test .ZIP
            fireEvent.change(fileInput, { target: { files: [new File(['test'], 'test.ZIP', { type: 'application/zip' })] } });
            expect(screen.getByText('Please select a .zip file')).toBeInTheDocument();

            // Test .Zip
            fireEvent.change(fileInput, { target: { files: [new File(['test'], 'test.Zip', { type: 'application/zip' })] } });
            expect(screen.getByText('Please select a .zip file')).toBeInTheDocument();
        });
    });

    describe('Upload - confirmation modal', () => {
        it('opens upload confirmation modal when valid zip is selected', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'backup.zip', { type: 'application/zip' });

            fireEvent.change(fileInput, { target: { files: [file] } });

            expect(document.querySelector('.ct-modal')).toBeInTheDocument();
            expect(screen.getByText(/backup\.zip/)).toBeInTheDocument();
        });

        it('shows campaign name in upload message', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'backup.zip', { type: 'application/zip' });

            fireEvent.change(fileInput, { target: { files: [file] } });

            expect(screen.getByText(/"test-campaign"/)).toBeInTheDocument();
        });

        it('closes modal via cancel, close button, and overlay; body click is ignored', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'backup.zip', { type: 'application/zip' });

            fireEvent.change(fileInput, { target: { files: [file] } });

            expect(document.querySelector('.ct-modal')).toBeInTheDocument();

            // Cancel button
            fireEvent.click(screen.getByText('Cancel'));
            expect(document.querySelector('.ct-modal')).not.toBeInTheDocument();

            // Re-open for next test
            fireEvent.change(fileInput, { target: { files: [file] } });
            expect(document.querySelector('.ct-modal')).toBeInTheDocument();

            // Close (X) button
            fireEvent.click(document.querySelector('.ct-modal-close'));
            expect(document.querySelector('.ct-modal')).not.toBeInTheDocument();

            // Re-open for next test
            fireEvent.change(fileInput, { target: { files: [file] } });
            expect(document.querySelector('.ct-modal')).toBeInTheDocument();

            // Overlay click
            fireEvent.click(document.querySelector('.ct-modal-overlay'));
            expect(document.querySelector('.ct-modal')).not.toBeInTheDocument();

            // Re-open for body click test
            fireEvent.change(fileInput, { target: { files: [file] } });
            expect(document.querySelector('.ct-modal')).toBeInTheDocument();

            // Body click is prevented
            fireEvent.click(document.querySelector('.ct-modal'));
            expect(document.querySelector('.ct-modal')).toBeInTheDocument();
        });
    });

    describe('Upload - confirm action', () => {
        it('sends POST request with FormData on confirm', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Upload complete' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'backup.zip', { type: 'application/zip' });

            fireEvent.change(fileInput, { target: { files: [file] } });

            const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
            fireEvent.click(confirmBtn);

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
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'backup.zip', { type: 'application/zip' });

            fireEvent.change(fileInput, { target: { files: [file] } });

            const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
            fireEvent.click(confirmBtn);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    '/api/campaigns/my%20campaign%2F1/admin/upload',
                    expect.objectContaining({ method: 'POST' })
                );
            });
        });

        it('includes file in FormData', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Upload complete' }) })
            );

            const formDataSpy = vi.fn();
            global.fetch.mockImplementation(async (url, options) => {
                formDataSpy(options.body);
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Upload complete' }) });
            });

            render(<CampaignAdmin {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'backup.zip', { type: 'application/zip' });

            fireEvent.change(fileInput, { target: { files: [file] } });

            const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
            fireEvent.click(confirmBtn);

            await waitFor(() => {
                expect(formDataSpy).toHaveBeenCalled();
                const body = formDataSpy.mock.calls[0][0];
                expect(body instanceof FormData).toBe(true);
                expect(body.get('file')).toBe(file);
            });
        });

        it('shows loading status while uploading', async () => {
            global.fetch = vi.fn(() => new Promise(() => { }));

            render(<CampaignAdmin {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'backup.zip', { type: 'application/zip' });

            fireEvent.change(fileInput, { target: { files: [file] } });

            const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
            fireEvent.click(confirmBtn);

            await waitFor(() => {
                expect(screen.getByText('Uploading and extracting...')).toBeInTheDocument();
            });
        });

        it('shows success message on successful upload', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Upload complete' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'backup.zip', { type: 'application/zip' });

            fireEvent.change(fileInput, { target: { files: [file] } });

            const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
            fireEvent.click(confirmBtn);

            await waitFor(() => {
                expect(screen.getByText('Upload complete')).toBeInTheDocument();
            });
        });

        it('reloads page after successful upload', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'Upload complete' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'backup.zip', { type: 'application/zip' });

            fireEvent.change(fileInput, { target: { files: [file] } });

            const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
            fireEvent.click(confirmBtn);

            await waitFor(() => {
                expect(window.location.reload).toHaveBeenCalledTimes(1);
            });
        });

        it('shows error alert on failed upload', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Upload failed' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'backup.zip', { type: 'application/zip' });

            fireEvent.change(fileInput, { target: { files: [file] } });

            const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
            fireEvent.click(confirmBtn);

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
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'backup.zip', { type: 'application/zip' });

            fireEvent.change(fileInput, { target: { files: [file] } });

            const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
            fireEvent.click(confirmBtn);

            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith(
                    'Upload failed. Campaign has been rolled back to the previous state.\n\nError: Upload failed\nDetails: File too large'
                );
            });
        });

        it('shows error alert on network error', async () => {
            global.fetch = vi.fn(() => Promise.reject(new Error('Network failed')));

            render(<CampaignAdmin {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'backup.zip', { type: 'application/zip' });

            fireEvent.change(fileInput, { target: { files: [file] } });

            const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
            fireEvent.click(confirmBtn);

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
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'backup.zip', { type: 'application/zip' });

            fireEvent.change(fileInput, { target: { files: [file] } });

            const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
            fireEvent.click(confirmBtn);

            await waitFor(() => {
                expect(fileInput.value).toBe('');
            });
        });

        it('clears file input after upload error', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Upload failed' }) })
            );

            render(<CampaignAdmin {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'backup.zip', { type: 'application/zip' });

            fireEvent.change(fileInput, { target: { files: [file] } });

            const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
            fireEvent.click(confirmBtn);

            await waitFor(() => {
                expect(fileInput.value).toBe('');
            });
        });

        it('clears file input after network error', async () => {
            global.fetch = vi.fn(() => Promise.reject(new Error('Network failed')));

            render(<CampaignAdmin {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'backup.zip', { type: 'application/zip' });

            fireEvent.change(fileInput, { target: { files: [file] } });

            const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
            fireEvent.click(confirmBtn);

            await waitFor(() => {
                expect(fileInput.value).toBe('');
            });
        });

        it('disables buttons after confirm during async operation', async () => {
            global.fetch = vi.fn(() => new Promise(() => { }));

            render(<CampaignAdmin {...defaultProps} />);
            const fileInput = document.querySelector('input[type="file"]');
            const file = new File(['test'], 'backup.zip', { type: 'application/zip' });

            fireEvent.change(fileInput, { target: { files: [file] } });

            const confirmBtn = document.querySelector('.ct-modal-footer .ct-btn-danger');
            fireEvent.click(confirmBtn);

            await waitFor(() => {
                const uploadLabel = document.querySelector('.admin-upload-label');
                const uploadInput = uploadLabel.querySelector('input[type="file"]');
                expect(uploadInput).toBeDisabled();
            });
        });
    });
});
