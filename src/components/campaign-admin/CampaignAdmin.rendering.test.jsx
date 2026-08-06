/* @cleaned-by-ai */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CampaignAdmin from './CampaignAdmin.jsx';

describe('CampaignAdmin - Rendering', () => {
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

    const getSectionByText = (text) => {
        const sections = document.querySelectorAll('.admin-section');
        for (const section of sections) {
            if (section.textContent.includes(text)) {
                return section;
            }
        }
        return null;
    };

    const getActionByText = (text) => {
        const actions = document.querySelectorAll('.admin-action');
        for (const action of actions) {
            if (action.textContent.includes(text)) {
                return action;
            }
        }
        return null;
    };

    describe('initial render', () => {
        it('renders the header with campaign name', () => {
            render(<CampaignAdmin {...defaultProps} />);
            expect(screen.getByText('Admin — test-campaign')).toBeInTheDocument();
        });

        it('renders the back button', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const backBtn = document.querySelector('.ct-back-btn');
            expect(backBtn).toBeInTheDocument();
            expect(backBtn.querySelector('i.fa-arrow-left')).toBeTruthy();
        });

        it('renders the Appearance section', () => {
            render(<CampaignAdmin {...defaultProps} />);
            expect(getSectionByText('Appearance')).toBeInTheDocument();
        });

        it('renders the Campaign Management section', () => {
            render(<CampaignAdmin {...defaultProps} />);
            expect(getSectionByText('Campaign Management')).toBeInTheDocument();
            expect(getActionByText('Rename Campaign')).toBeInTheDocument();
            expect(getActionByText('Delete Campaign')).toBeInTheDocument();
        });

        it('renders the Data Management section', () => {
            render(<CampaignAdmin {...defaultProps} />);
            expect(getSectionByText('Data Management')).toBeInTheDocument();
            expect(getActionByText('Clear Change Data')).toBeInTheDocument();
            expect(getActionByText('Clear Campaign Log')).toBeInTheDocument();
            expect(getActionByText('Full Reset')).toBeInTheDocument();
        });

        it('renders the Backup & Restore section', () => {
            render(<CampaignAdmin {...defaultProps} />);
            expect(getSectionByText('Backup & Restore')).toBeInTheDocument();
            expect(getActionByText('Snapshot')).toBeInTheDocument();
            expect(getActionByText('Download')).toBeInTheDocument();
            expect(getActionByText('Rollback')).toBeInTheDocument();
            expect(getActionByText('Upload')).toBeInTheDocument();
        });

        it('shows "Switch to Light Mode" when theme is dark', () => {
            render(<CampaignAdmin {...defaultProps} />);
            expect(screen.getByText('Switch to Light Mode')).toBeInTheDocument();
        });

        it('shows "Switch to Dark Mode" when theme is light', () => {
            render(<CampaignAdmin {...defaultProps} theme="light" />);
            expect(screen.getByText('Switch to Dark Mode')).toBeInTheDocument();
        });

        it('does not render status message initially', () => {
            const { container } = render(<CampaignAdmin {...defaultProps} />);
            expect(container.querySelector('.admin-status')).not.toBeInTheDocument();
        });
    });

    describe('danger sections', () => {
        it('applies danger styling to Delete Campaign', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const deleteAction = getActionByText('Delete Campaign');
            expect(deleteAction).toHaveClass('admin-action--danger');
        });

        it('applies danger styling to Full Reset', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const resetAction = getActionByText('Full Reset');
            expect(resetAction).toHaveClass('admin-action--danger');
        });

        it('applies danger styling to Rollback', () => {
            render(<CampaignAdmin {...defaultProps} />);
            const rollbackAction = getActionByText('Rollback to Snapshot');
            expect(rollbackAction).toHaveClass('admin-action--danger');
        });
    });
});
