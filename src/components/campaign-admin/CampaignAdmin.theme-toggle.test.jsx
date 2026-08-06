/* @cleaned-by-ai */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CampaignAdmin from './CampaignAdmin.jsx';

describe('CampaignAdmin - Theme Toggle', () => {
    const defaultProps = {
        campaignName: 'test-campaign',
        onBack: vi.fn(),
        theme: 'dark',
        toggleTheme: vi.fn(),
        onRenameCampaign: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls toggleTheme when theme button is clicked', () => {
        render(<CampaignAdmin {...defaultProps} />);
        const btn = screen.getByText('Switch to Light Mode');
        fireEvent.click(btn);
        expect(defaultProps.toggleTheme).toHaveBeenCalledTimes(1);
    });

    it('changes icon based on current theme', () => {
        const { rerender } = render(<CampaignAdmin {...defaultProps} theme="dark" />);
        let themeBtn = screen.getByText('Switch to Light Mode');
        expect(themeBtn.querySelector('i.fa-sun')).toBeTruthy();

        rerender(<CampaignAdmin {...defaultProps} theme="light" />);
        let moonBtn = screen.getByText('Switch to Dark Mode');
        expect(moonBtn.querySelector('i.fa-moon')).toBeTruthy();
    });
});

describe('CampaignAdmin - Back Button', () => {
    const defaultProps = {
        campaignName: 'test-campaign',
        onBack: vi.fn(),
        theme: 'dark',
        toggleTheme: vi.fn(),
        onRenameCampaign: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls onBack when back button is clicked', () => {
        render(<CampaignAdmin {...defaultProps} />);
        const backBtn = document.querySelector('.ct-back-btn');
        fireEvent.click(backBtn);
        expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
    });
});
