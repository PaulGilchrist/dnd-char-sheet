// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('CampaignAdmin - Theme Toggle', () => {
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

    it('calls toggleTheme when theme button is clicked', () => {
        render(<CampaignAdmin {...defaultProps} />);
        const btn = screen.getByText('Switch to Light Mode');
        fireEvent.click(btn);
        expect(defaultProps.toggleTheme).toHaveBeenCalledTimes(1);
    });

    it('shows sun icon when theme is dark', () => {
        render(<CampaignAdmin {...defaultProps} theme="dark" />);
        const btn = screen.getByText('Switch to Light Mode');
        expect(btn.querySelector('i.fa-sun')).toBeTruthy();
    });

    it('shows moon icon when theme is light', () => {
        render(<CampaignAdmin {...defaultProps} theme="light" />);
        const btn = screen.getByText('Switch to Dark Mode');
        expect(btn.querySelector('i.fa-moon')).toBeTruthy();
    });

    it('toggles button text based on current theme', () => {
        const { rerender } = render(<CampaignAdmin {...defaultProps} theme="dark" />);
        expect(screen.getByText('Switch to Light Mode')).toBeInTheDocument();

        rerender(<CampaignAdmin {...defaultProps} theme="light" />);
        expect(screen.getByText('Switch to Dark Mode')).toBeInTheDocument();
    });

    it('is not disabled while other operations are in progress', () => {
        global.fetch = vi.fn(() => new Promise(() => {}));

        render(<CampaignAdmin {...defaultProps} />);
        const btn = screen.getByText('Switch to Light Mode');
        const snapshotBtn = document.querySelector('.admin-action').querySelectorAll('button')[0];
        fireEvent.click(snapshotBtn);

        expect(btn).not.toBeDisabled();
    });
});

describe('CampaignAdmin - Back Button', () => {
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

    it('calls onBack when back button is clicked', () => {
        render(<CampaignAdmin {...defaultProps} />);
        const backBtn = document.querySelector('.ct-back-btn');
        fireEvent.click(backBtn);
        expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
    });

    it('renders with arrow-left icon', () => {
        render(<CampaignAdmin {...defaultProps} />);
        const backBtn = document.querySelector('.ct-back-btn');
        expect(backBtn.querySelector('i.fa-arrow-left')).toBeTruthy();
    });
});
