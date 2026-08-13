// @improved-by-ai
import { render, screen } from '@testing-library/react';
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

describe('CampaignAdmin - Rendering', () => {
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

    describe('initial render', () => {
        it('renders the header with campaign name', () => {
            render(<CampaignAdmin {...defaultProps} />);
            expect(screen.getByText('Admin — test-campaign')).toBeInTheDocument();
        });

        it('renders the back button with arrow icon', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const backBtn = document.querySelector('.ct-back-btn');
            expect(backBtn).toBeInTheDocument();
            expect(backBtn.querySelector('i.fa-arrow-left')).toBeTruthy();
        });

        it('renders all four admin sections', () => {
            render(<CampaignAdmin {...defaultProps} />);
            expect(screen.getByText('Appearance')).toBeInTheDocument();
            expect(screen.getByText('Campaign Management')).toBeInTheDocument();
            expect(screen.getByText('Data Management')).toBeInTheDocument();
            expect(screen.getByText('Backup & Restore')).toBeInTheDocument();
        });

        it('renders all Campaign Management actions', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const renameActions = screen.getAllByText('Rename Campaign');
            expect(renameActions.length).toBeGreaterThanOrEqual(2);
            const deleteActions = screen.getAllByText('Delete Campaign');
            expect(deleteActions.length).toBeGreaterThanOrEqual(2);
        });

        it('renders all Data Management actions', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const clearChangeActions = screen.getAllByText('Clear Change Data');
            expect(clearChangeActions.length).toBeGreaterThanOrEqual(2);
            const clearLogActions = screen.getAllByText('Clear Campaign Log');
            expect(clearLogActions.length).toBeGreaterThanOrEqual(2);
            const resetActions = screen.getAllByText('Full Reset');
            expect(resetActions.length).toBeGreaterThanOrEqual(2);
        });

        it('renders all Backup & Restore actions', () => {
            render(<CampaignAdmin {...defaultProps} />);
            expect(screen.getByText('Snapshot')).toBeInTheDocument();
            expect(screen.getByText('Download')).toBeInTheDocument();
            expect(screen.getByText('Rollback')).toBeInTheDocument();
            expect(screen.getByText('Upload')).toBeInTheDocument();
        });

        it('shows "Switch to Light Mode" when theme is dark', () => {
            render(<CampaignAdmin {...defaultProps} />);
            expect(screen.getByText('Switch to Light Mode')).toBeInTheDocument();
        });

        it('shows "Switch to Dark Mode" when theme is light', () => {
            render(<CampaignAdmin {...createDefaultProps({ theme: 'light' })} />);
            expect(screen.getByText('Switch to Dark Mode')).toBeInTheDocument();
        });

        it('does not render a status message initially', () => {
            render(<CampaignAdmin {...defaultProps} />);
            expect(screen.queryByText(/Creating snapshot|Rolling back|Clearing|Snapshot created|Download started|Rolled back|Network failed|Upload failed/)).not.toBeInTheDocument();
        });
    });

    describe('danger styling', () => {
        it('applies danger styling to Delete Campaign action', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const deleteAction = [...document.querySelectorAll('.admin-action')].find(
                (a) => a.querySelector('h3')?.textContent === 'Delete Campaign'
            );
            expect(deleteAction).toHaveClass('admin-action--danger');
        });

        it('applies danger styling to Full Reset action', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const resetAction = [...document.querySelectorAll('.admin-action')].find(
                (a) => a.querySelector('h3')?.textContent === 'Full Reset'
            );
            expect(resetAction).toHaveClass('admin-action--danger');
        });

        it('applies danger styling to Rollback action', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const rollbackAction = [...document.querySelectorAll('.admin-action')].find(
                (a) => a.querySelector('h3')?.textContent === 'Rollback'
            );
            expect(rollbackAction).toHaveClass('admin-action--danger');
        });
    });
});
