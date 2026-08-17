// @cleaned-by-ai
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

    it('shows light mode button text and sun icon when theme is dark', () => {
        render(<CampaignAdmin {...defaultProps} theme="dark" />);
        expect(screen.getByText('Switch to Light Mode')).toBeInTheDocument();
    });

    it('shows dark mode button text and moon icon when theme is light', () => {
        render(<CampaignAdmin {...defaultProps} theme="light" />);
        expect(screen.getByText('Switch to Dark Mode')).toBeInTheDocument();
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
});
