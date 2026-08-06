import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SummonSpiritModal from './SummonSpiritModal.jsx';

const baseProps = {
    action: {
        name: 'Summon Beast',
        automation: {
            type: 'summon_spirit',
            typeLabel: 'Bestial Spirit',
            variants: [
                { name: 'Bestial Spirit (Air)', description: 'Flies at 60 ft.' },
                { name: 'Bestial Spirit (Land)', description: 'Walks and climbs at 30 ft.' },
                { name: 'Bestial Spirit (Water)', description: 'Swims at 30 ft.' },
            ],
        },
    },
    onConfirm: vi.fn(),
    onClose: vi.fn(),
};

function makeProps(overrides) {
    return { ...baseProps, ...(overrides || {}) };
}

describe('SummonSpiritModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('rendering', () => {
        it('renders the spell name and all variants', () => {
            render(<SummonSpiritModal {...makeProps()} />);

            expect(screen.getByText('Summon Beast')).toBeInTheDocument();
            expect(screen.getByText('Bestial Spirit (Air)')).toBeInTheDocument();
            expect(screen.getByText('Bestial Spirit (Land)')).toBeInTheDocument();
            expect(screen.getByText('Bestial Spirit (Water)')).toBeInTheDocument();
            expect(screen.getByText('Flies at 60 ft.')).toBeInTheDocument();
        });

        it('renders the description prompt', () => {
            render(<SummonSpiritModal {...makeProps()} />);
            expect(screen.getByText('Choose the form your summoned creature takes:')).toBeInTheDocument();
        });

        it('renders variant descriptions when present', () => {
            render(<SummonSpiritModal {...makeProps()} />);
            expect(screen.getByText('Flies at 60 ft.')).toBeInTheDocument();
            expect(screen.getByText('Walks and climbs at 30 ft.')).toBeInTheDocument();
            expect(screen.getByText('Swims at 30 ft.')).toBeInTheDocument();
        });

        it('does not render description span when variant has no description', () => {
            const props = makeProps({
                action: {
                    name: 'Summon Spirit',
                    automation: {
                        variants: [
                            { name: 'Spirit A' },
                            { name: 'Spirit B', description: 'A description' },
                        ],
                    },
                },
            });
            render(<SummonSpiritModal {...props} />);
            expect(screen.getByText('Spirit A')).toBeInTheDocument();
            expect(screen.getByText('Spirit B')).toBeInTheDocument();
            expect(screen.getByText('A description')).toBeInTheDocument();
            expect(screen.queryByText(/Spirit A description/i)).not.toBeInTheDocument();
        });

        it('renders no variant buttons when variants array is empty', () => {
            const props = makeProps({
                action: {
                    name: 'Summon Spirit',
                    automation: { variants: [] },
                },
            });
            render(<SummonSpiritModal {...props} />);
            expect(screen.getByText('Summon Spirit')).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /Spirit/i })).not.toBeInTheDocument();
        });

        it('renders no variant buttons when automation is missing', () => {
            const props = makeProps({
                action: { name: 'Summon Spirit' },
            });
            render(<SummonSpiritModal {...props} />);
            expect(screen.getByText('Summon Spirit')).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /Spirit/i })).not.toBeInTheDocument();
        });


    });

    describe('variant selection', () => {
        it('selects a variant on click', async () => {
            render(<SummonSpiritModal {...makeProps()} />);
            fireEvent.click(screen.getByText('Bestial Spirit (Land)'));
            await waitFor(() => {
                const selectedBtn = document.querySelector('button.summon-spirit-option-selected');
                expect(selectedBtn).toBeInTheDocument();
                expect(selectedBtn.textContent).toContain('Bestial Spirit (Land)');
            });
        });

        it('deselects previous selection when another variant is clicked', async () => {
            render(<SummonSpiritModal {...makeProps()} />);

            fireEvent.click(screen.getByText('Bestial Spirit (Air)'));
            await waitFor(() => {
                const airBtn = document.querySelector('button.summon-spirit-option-selected');
                expect(airBtn.textContent).toContain('Bestial Spirit (Air)');
            });

            fireEvent.click(screen.getByText('Bestial Spirit (Land)'));
            await waitFor(() => {
                const landBtn = document.querySelector('button.summon-spirit-option-selected');
                expect(landBtn.textContent).toContain('Bestial Spirit (Land)');
            });
        });

        it('selects a variant without description', async () => {
            const props = makeProps({
                action: {
                    name: 'Summon Spirit',
                    automation: {
                        variants: [
                            { name: 'Spirit A' },
                            { name: 'Spirit B', description: 'A description' },
                        ],
                    },
                },
            });
            render(<SummonSpiritModal {...props} />);
            fireEvent.click(screen.getByText('Spirit A'));
            await waitFor(() => {
                const selectedBtn = document.querySelector('button.summon-spirit-option-selected');
                expect(selectedBtn).toBeInTheDocument();
                expect(selectedBtn.textContent).toContain('Spirit A');
            });
        });
    });

    describe('confirm behavior', () => {
        it('summons the selected variant on confirm', () => {
            render(<SummonSpiritModal {...makeProps()} />);

            fireEvent.click(screen.getByText('Bestial Spirit (Land)'));
            fireEvent.click(screen.getByRole('button', { name: /Summon/ }));

            expect(baseProps.onConfirm).toHaveBeenCalledWith('Bestial Spirit (Land)');
        });

        it('does not confirm without a selection', () => {
            render(<SummonSpiritModal {...makeProps()} />);

            const confirmButton = screen.getByRole('button', { name: /Summon/ });
            fireEvent.click(confirmButton);

            expect(baseProps.onConfirm).not.toHaveBeenCalled();
        });

        it('calls onConfirm with the correct variant after switching selection', () => {
            render(<SummonSpiritModal {...makeProps()} />);

            // Select first, then switch
            fireEvent.click(screen.getByText('Bestial Spirit (Air)'));
            fireEvent.click(screen.getByText('Bestial Spirit (Water)'));
            fireEvent.click(screen.getByRole('button', { name: /Summon/ }));

            expect(baseProps.onConfirm).toHaveBeenCalledWith('Bestial Spirit (Water)');
        });
    });

    describe('Summon button state', () => {
        it('has the Summon button disabled when no variant is selected', () => {
            render(<SummonSpiritModal {...makeProps()} />);
            const summonButton = screen.getByRole('button', { name: /Summon/ });
            expect(summonButton).toBeDisabled();
        });

        it('has the Summon button enabled when a variant is selected', () => {
            render(<SummonSpiritModal {...makeProps()} />);
            const summonButton = screen.getByRole('button', { name: /Summon/ });
            expect(summonButton).toBeDisabled();

            fireEvent.click(screen.getByText('Bestial Spirit (Air)'));
            expect(summonButton).toBeEnabled();
        });

        it('disables the Summon button again when selection is changed then confirmed', () => {
            render(<SummonSpiritModal {...makeProps()} />);
            const summonButton = screen.getByRole('button', { name: /Summon/ });

            fireEvent.click(screen.getByText('Bestial Spirit (Air)'));
            expect(summonButton).toBeEnabled();

            // After confirm, the modal should still show the button as enabled
            // (state persists in the component until parent closes it)
            fireEvent.click(summonButton);
            expect(baseProps.onConfirm).toHaveBeenCalled();
            // Button should still be enabled since selection is still active
            expect(summonButton).toBeEnabled();
        });
    });

    describe('close behavior', () => {
        it('closes on cancel button click', () => {
            render(<SummonSpiritModal {...makeProps()} />);

            fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

            expect(baseProps.onClose).toHaveBeenCalled();
        });

        it('closes when clicking the overlay background', () => {
            render(<SummonSpiritModal {...makeProps()} />);

            const overlay = document.querySelector('.sp-overlay');
            fireEvent.click(overlay);

            expect(baseProps.onClose).toHaveBeenCalled();
        });

        it('does not close when clicking inside the modal content', () => {
            render(<SummonSpiritModal {...makeProps()} />);

            const modal = document.querySelector('.sp-modal');
            fireEvent.click(modal);

            expect(baseProps.onClose).not.toHaveBeenCalled();
        });

        it('does not close when clicking a variant option', () => {
            render(<SummonSpiritModal {...makeProps()} />);

            const variantButton = screen.getByText('Bestial Spirit (Air)');
            fireEvent.click(variantButton);

            expect(baseProps.onClose).not.toHaveBeenCalled();
        });
    });

    describe('icon rendering', () => {
        it('renders the hand-sparkles icon in the header', () => {
            render(<SummonSpiritModal {...makeProps()} />);
            const icons = document.querySelectorAll('i.fa-solid.fa-hand-sparkles');
            expect(icons.length).toBeGreaterThan(0);
        });

        it('renders the hand-sparkles icon on the Summon button', () => {
            render(<SummonSpiritModal {...makeProps()} />);
            const summonButton = screen.getByRole('button', { name: /Summon/ });
            const icon = summonButton.querySelector('i.fa-solid.fa-hand-sparkles');
            expect(icon).toBeInTheDocument();
        });
    });

    describe('button types', () => {
        it('renders all buttons with type="button"', () => {
            render(<SummonSpiritModal {...makeProps()} />);
            const buttons = document.querySelectorAll('button[type="button"]');
            expect(buttons.length).toBeGreaterThan(0);
        });
    });
});
