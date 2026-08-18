// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
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

// Shared window mocks — restored after every test to prevent leaks into other tests
beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    vi.spyOn(window, 'prompt').mockImplementation(() => 'test-campaign');
    vi.stubGlobal('location', { reload: vi.fn() });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('CampaignAdmin - Theme Toggle', () => {
    it('calls toggleTheme when theme button is clicked', () => {
        const props = createDefaultProps();
        render(<CampaignAdmin {...props} />);
        const btn = screen.getByRole('button', { name: /switch to/i });
        fireEvent.click(btn);
        expect(props.toggleTheme).toHaveBeenCalledTimes(1);
    });

    it('shows correct button text and icon for each theme', () => {
        const props = createDefaultProps();
        render(<CampaignAdmin {...props} theme="dark" />);
        const darkBtn = screen.getByRole('button', { name: /switch to light mode/i });
        expect(darkBtn).toBeInTheDocument();
        expect(darkBtn.querySelector('i.fa-sun')).toBeInTheDocument();

        render(<CampaignAdmin {...props} theme="light" />);
        const lightBtn = screen.getByRole('button', { name: /switch to dark mode/i });
        expect(lightBtn).toBeInTheDocument();
        expect(lightBtn.querySelector('i.fa-moon')).toBeInTheDocument();
    });
});

describe('CampaignAdmin - Back Button', () => {
    it('calls onBack when back button is clicked', () => {
        const props = createDefaultProps();
        render(<CampaignAdmin {...props} />);
        const backBtn = screen.getByRole('button', { name: /^Back$/ });
        fireEvent.click(backBtn);
        expect(props.onBack).toHaveBeenCalledTimes(1);
    });
});
