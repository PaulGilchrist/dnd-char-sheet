import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DestructiveStrideModal from './DestructiveStrideModal.jsx';
import { applyDamageTypeChoice, skipTargetChoice } from '../../../services/automation/handlers/combat/destructiveStrideHandler.js';

// Mock the handler functions that the modal calls
vi.mock('../../../services/automation/handlers/combat/destructiveStrideHandler.js', () => ({
    applyDamageTypeChoice: vi.fn().mockResolvedValue(null),
    skipTargetChoice: vi.fn().mockResolvedValue(null),
}));

// ── Test fixtures ──

const mockAction = { name: 'Destructive Stride' };
const mockPlayerStats = { name: 'TestMonk', level: 5 };
const mockOnClose = vi.fn();
const mockOnConfirm = vi.fn();

const baseProps = {
    action: mockAction,
    playerStats: mockPlayerStats,
    campaignName: 'test-campaign',
    onConfirm: mockOnConfirm,
    onClose: mockOnClose,
};

function makeProps(overrides) {
    return { ...baseProps, ...(overrides || {}) };
}

// ── Helpers ──

function findDamageTypeLabel(type) {
    const labels = document.querySelectorAll('label');
    for (const label of labels) {
        if (label.textContent.includes(type)) {
            return label;
        }
    }
    return null;
}

// ── Tests ──

describe('DestructiveStrideModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── Initial render ──

    describe('initial render', () => {
        it('renders the modal overlay and container', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
            expect(document.querySelector('.sp-modal')).toBeInTheDocument();
        });

        it('renders the sp-header, sp-body, and sp-actions sections', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            expect(document.querySelector('.sp-header')).toBeInTheDocument();
            expect(document.querySelector('.sp-body')).toBeInTheDocument();
            expect(document.querySelector('.sp-actions')).toBeInTheDocument();
        });

        it('renders the header with running icon and action name', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            const headerIcon = document.querySelector('.sp-header i');
            expect(headerIcon).toHaveClass('fa-solid fa-person-running');
            expect(screen.getByText('Destructive Stride')).toBeInTheDocument();
        });

        it('renders the instruction text', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            expect(screen.getByText('Choose the damage type for Destructive Stride:')).toBeInTheDocument();
        });

        it('renders all five damage type radio buttons', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            const labels = document.querySelectorAll('label');
            const damageTypeLabels = Array.from(labels).filter(l =>
                ['Acid', 'Cold', 'Fire', 'Lightning', 'Thunder'].some(t => l.textContent.includes(t))
            );
            expect(damageTypeLabels).toHaveLength(5);
        });

        it('renders each damage type with correct icon and description', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            const iconMap = {
                Acid: 'fa-biohazard',
                Cold: 'fa-snowflake',
                Fire: 'fa-fire',
                Lightning: 'fa-bolt-lightning',
                Thunder: 'fa-volume-high',
            };
            for (const [name, icon] of Object.entries(iconMap)) {
                expect(screen.getByText(name)).toBeInTheDocument();
                const label = findDamageTypeLabel(name);
                expect(label.querySelector(`i.fa-solid.${icon}`)).toBeInTheDocument();
            }
        });

        it('renders the descriptions for each damage type', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            expect(screen.getByText(/Corrosive acid damage/)).toBeInTheDocument();
            expect(screen.getByText(/Biting cold damage/)).toBeInTheDocument();
            expect(screen.getByText(/Searing fire damage/)).toBeInTheDocument();
            expect(screen.getByText(/Crackling lightning damage/)).toBeInTheDocument();
            expect(screen.getByText(/Deafening thunder damage/)).toBeInTheDocument();
        });

        it('renders the Choose Type button with crosshairs icon', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            const chooseBtn = screen.getByRole('button', { name: /Choose Type/ });
            expect(chooseBtn).toBeInTheDocument();
            expect(chooseBtn.querySelector('.fa-solid.fa-crosshairs')).toBeInTheDocument();
        });

        it('renders the Skip Target button with times icon', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            const skipBtn = screen.getByRole('button', { name: /Skip Target/ });
            expect(skipBtn).toBeInTheDocument();
            expect(skipBtn.querySelector('.fa-solid.fa-times')).toBeInTheDocument();
        });

        it('disables the Choose Type button when no option is selected', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: /Choose Type/ })).toBeDisabled();
        });

        it('renders the note about 5 ft creature proximity', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            expect(screen.getByText(/Choose a creature only if the monk comes within 5 ft/)).toBeInTheDocument();
        });

        it('does not show result state on initial render', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            expect(screen.queryByText(/Selected/)).not.toBeInTheDocument();
        });
    });

    // ── Default action name ──

    describe('default action name', () => {
        it('uses fallback text when action prop is undefined', () => {
            render(<DestructiveStrideModal {...makeProps({ action: undefined })} />);
            expect(screen.getByText('Destructive Stride')).toBeInTheDocument();
        });

        it('uses fallback text when action prop is null', () => {
            render(<DestructiveStrideModal {...makeProps({ action: null })} />);
            expect(screen.getByText('Destructive Stride')).toBeInTheDocument();
        });

        it('displays custom action name when provided', () => {
            render(<DestructiveStrideModal {...makeProps({ action: { name: 'Custom Stride' } })} />);
            expect(screen.getByText('Custom Stride')).toBeInTheDocument();
        });
    });

    // ── Radio selection ──

    describe('radio selection', () => {
        it('selects the Acid option when clicked', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            const acidLabel = findDamageTypeLabel('Acid');
            const radio = acidLabel.querySelector('input[type="radio"]');
            expect(radio).not.toBeChecked();
            fireEvent.click(radio);
            expect(radio).toBeChecked();
        });

        it('selects the Cold option when clicked', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            const coldLabel = findDamageTypeLabel('Cold');
            const radio = coldLabel.querySelector('input[type="radio"]');
            fireEvent.click(radio);
            expect(radio).toBeChecked();
        });

        it('selects the Fire option when clicked', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            const fireLabel = findDamageTypeLabel('Fire');
            const radio = fireLabel.querySelector('input[type="radio"]');
            fireEvent.click(radio);
            expect(radio).toBeChecked();
        });

        it('selects the Lightning option when clicked', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            const lightningLabel = findDamageTypeLabel('Lightning');
            const radio = lightningLabel.querySelector('input[type="radio"]');
            fireEvent.click(radio);
            expect(radio).toBeChecked();
        });

        it('selects the Thunder option when clicked', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            const thunderLabel = findDamageTypeLabel('Thunder');
            const radio = thunderLabel.querySelector('input[type="radio"]');
            fireEvent.click(radio);
            expect(radio).toBeChecked();
        });

        it('switches selection when a different option is clicked', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            const acidLabel = findDamageTypeLabel('Acid');
            const fireLabel = findDamageTypeLabel('Fire');
            const acidRadio = acidLabel.querySelector('input[type="radio"]');
            const fireRadio = fireLabel.querySelector('input[type="radio"]');
            fireEvent.click(acidRadio);
            expect(acidRadio).toBeChecked();
            fireEvent.click(fireRadio);
            expect(fireRadio).toBeChecked();
            expect(acidRadio).not.toBeChecked();
        });

        it('enables the Choose Type button after an option is selected', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            const chooseBtn = screen.getByRole('button', { name: /Choose Type/ });
            expect(chooseBtn).toBeDisabled();
            const fireLabel = findDamageTypeLabel('Fire');
            const fireRadio = fireLabel.querySelector('input[type="radio"]');
            fireEvent.click(fireRadio);
            expect(chooseBtn).not.toBeDisabled();
        });
    });

    // ── Visual selection state ──

    describe('visual selection state', () => {
        it('applies selected background styling to the chosen label', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            const acidLabel = findDamageTypeLabel('Acid');
            expect(acidLabel.style.background).toBe('transparent');
            const radio = acidLabel.querySelector('input[type="radio"]');
            fireEvent.click(radio);
            expect(acidLabel.style.background).toMatch(/rgba/);
            expect(acidLabel.style.background).toContain('0.15');
        });

        it('applies selected border styling to the chosen label', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            const acidLabel = findDamageTypeLabel('Acid');
            expect(acidLabel.style.border).toBe('1px solid transparent');
            const radio = acidLabel.querySelector('input[type="radio"]');
            fireEvent.click(radio);
            expect(acidLabel.style.border).toContain('var(--color-link)');
        });

        it('removes selection styling from previously selected label', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            const acidLabel = findDamageTypeLabel('Acid');
            const fireLabel = findDamageTypeLabel('Fire');
            const acidRadio = acidLabel.querySelector('input[type="radio"]');
            const fireRadio = fireLabel.querySelector('input[type="radio"]');
            fireEvent.click(acidRadio);
            expect(acidLabel.style.background).toMatch(/rgba/);
            fireEvent.click(fireRadio);
            expect(acidLabel.style.background).toBe('transparent');
        });
    });

    // ── Confirm flow (handleApply) ──

    describe('confirm flow', () => {
        it('calls applyDamageTypeChoice with correct args when Fire is selected', async () => {
            applyDamageTypeChoice.mockResolvedValue({ type: 'modal', modalName: 'destructiveStrideTarget' });

            render(<DestructiveStrideModal {...makeProps()} />);
            const fireLabel = findDamageTypeLabel('Fire');
            const fireRadio = fireLabel.querySelector('input[type="radio"]');
            fireEvent.click(fireRadio);
            fireEvent.click(screen.getByRole('button', { name: /Choose Type/ }));

            await waitFor(() => {
                expect(applyDamageTypeChoice).toHaveBeenCalledWith(
                    mockAction,
                    mockPlayerStats,
                    'test-campaign',
                    'Fire',
                );
            });
            await waitFor(() => {
                expect(mockOnConfirm).toHaveBeenCalledWith({ type: 'modal', modalName: 'destructiveStrideTarget' });
            });
        });

        it('calls applyDamageTypeChoice with correct args when Thunder is selected', async () => {
            applyDamageTypeChoice.mockResolvedValue({ type: 'popup', payload: { type: 'automation_info' } });

            render(<DestructiveStrideModal {...makeProps()} />);
            const thunderLabel = findDamageTypeLabel('Thunder');
            const radio = thunderLabel.querySelector('input[type="radio"]');
            fireEvent.click(radio);
            fireEvent.click(screen.getByRole('button', { name: /Choose Type/ }));

            await waitFor(() => {
                expect(applyDamageTypeChoice).toHaveBeenCalledWith(
                    mockAction,
                    mockPlayerStats,
                    'test-campaign',
                    'Thunder',
                );
            });
            await waitFor(() => {
                expect(mockOnConfirm).toHaveBeenCalledWith({ type: 'popup', payload: { type: 'automation_info' } });
            });
        });

        it('does not call onConfirm when applyDamageTypeChoice returns null', async () => {
            applyDamageTypeChoice.mockResolvedValue(null);

            render(<DestructiveStrideModal {...makeProps()} />);
            const fireLabel = findDamageTypeLabel('Fire');
            const fireRadio = fireLabel.querySelector('input[type="radio"]');
            fireEvent.click(fireRadio);
            fireEvent.click(screen.getByRole('button', { name: /Choose Type/ }));

            await waitFor(() => {
                expect(mockOnConfirm).not.toHaveBeenCalled();
            });
        });

        it('does not call onConfirm when result type is neither modal nor popup', async () => {
            applyDamageTypeChoice.mockResolvedValue({ type: 'other' });

            render(<DestructiveStrideModal {...makeProps()} />);
            const fireLabel = findDamageTypeLabel('Fire');
            const fireRadio = fireLabel.querySelector('input[type="radio"]');
            fireEvent.click(fireRadio);
            fireEvent.click(screen.getByRole('button', { name: /Choose Type/ }));

            await waitFor(() => {
                expect(mockOnConfirm).not.toHaveBeenCalled();
            });
        });

        it('does not call applyDamageTypeChoice when no option is selected', async () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            fireEvent.click(screen.getByRole('button', { name: /Choose Type/ }));
            await Promise.resolve();

            expect(applyDamageTypeChoice).not.toHaveBeenCalled();
        });
    });

    // ── Skip flow (handleSkip) ──

    describe('skip flow', () => {
        it('calls skipTargetChoice with correct args', async () => {
            skipTargetChoice.mockResolvedValue({ type: 'popup', payload: { type: 'automation_info' } });

            render(<DestructiveStrideModal {...makeProps()} />);
            fireEvent.click(screen.getByRole('button', { name: /Skip Target/ }));

            await waitFor(() => {
                expect(skipTargetChoice).toHaveBeenCalledWith(
                    mockAction,
                    mockPlayerStats,
                    'test-campaign',
                );
            });
        });

        it('calls onConfirm with skip result when result type is popup', async () => {
            skipTargetChoice.mockResolvedValue({ type: 'popup', payload: { type: 'automation_info' } });

            render(<DestructiveStrideModal {...makeProps()} />);
            fireEvent.click(screen.getByRole('button', { name: /Skip Target/ }));

            await waitFor(() => {
                expect(mockOnConfirm).toHaveBeenCalledWith({ type: 'popup', payload: { type: 'automation_info' } });
            });
        });

        it('calls onClose after skip completes', async () => {
            skipTargetChoice.mockResolvedValue({ type: 'popup', payload: { type: 'automation_info' } });

            render(<DestructiveStrideModal {...makeProps()} />);
            fireEvent.click(screen.getByRole('button', { name: /Skip Target/ }));

            await waitFor(() => {
                expect(mockOnClose).toHaveBeenCalledTimes(1);
            });
        });

        it('calls onClose even when skip result has no onConfirm trigger', async () => {
            skipTargetChoice.mockResolvedValue(null);

            render(<DestructiveStrideModal {...makeProps()} />);
            fireEvent.click(screen.getByRole('button', { name: /Skip Target/ }));

            await waitFor(() => {
                expect(mockOnClose).toHaveBeenCalledTimes(1);
            });
        });
    });

    // ── Overlay click behavior ──

    describe('overlay click behavior', () => {
        it('calls skipTargetChoice when the overlay is clicked', async () => {
            skipTargetChoice.mockResolvedValue({ type: 'popup', payload: { type: 'automation_info' } });

            render(<DestructiveStrideModal {...makeProps()} />);
            fireEvent.click(document.querySelector('.sp-overlay'));

            await waitFor(() => {
                expect(skipTargetChoice).toHaveBeenCalledWith(
                    mockAction,
                    mockPlayerStats,
                    'test-campaign',
                );
            });
            await waitFor(() => {
                expect(mockOnClose).toHaveBeenCalledTimes(1);
            });
        });

        it('does not call skipTargetChoice when the modal content is clicked', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            fireEvent.click(document.querySelector('.sp-modal'));
            expect(mockOnClose).not.toHaveBeenCalled();
        });

        it('does not call skipTargetChoice when the header is clicked', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            fireEvent.click(document.querySelector('.sp-header'));
            expect(mockOnClose).not.toHaveBeenCalled();
        });

        it('does not call skipTargetChoice when the body is clicked', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            fireEvent.click(document.querySelector('.sp-body'));
            expect(mockOnClose).not.toHaveBeenCalled();
        });

        it('does not call skipTargetChoice when the actions area is clicked', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            fireEvent.click(document.querySelector('.sp-actions'));
            expect(mockOnClose).not.toHaveBeenCalled();
        });
    });

    // ── Props variations ──

    describe('additional props', () => {
        it('renders correctly when playerStats and campaignName are provided', () => {
            render(<DestructiveStrideModal {...makeProps()} />);
            expect(screen.getByText('Destructive Stride')).toBeInTheDocument();
            expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
        });

        it('renders correctly without onConfirm callback', () => {
            render(<DestructiveStrideModal {...makeProps({ onConfirm: undefined })} />);
            const fireLabel = findDamageTypeLabel('Fire');
            const fireRadio = fireLabel.querySelector('input[type="radio"]');
            fireEvent.click(fireRadio);
            fireEvent.click(screen.getByRole('button', { name: /Choose Type/ }));
            // Should not throw even without onConfirm
            expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
        });
    });
});
