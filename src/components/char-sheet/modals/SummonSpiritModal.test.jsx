// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SummonSpiritModal from './SummonSpiritModal.jsx';

// ── Test fixtures ──

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

// ── Helpers ──

function selectVariant(name) {
    fireEvent.click(screen.getByText(name));
}

// ── Tests ──

describe('SummonSpiritModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── Initial render ──

    describe('initial render', () => {
        it('renders the action name in the header', () => {
            render(<SummonSpiritModal {...makeProps()} />);
            expect(screen.getByText('Summon Beast')).toBeInTheDocument();
        });

        it('renders the instruction prompt', () => {
            render(<SummonSpiritModal {...makeProps()} />);
            expect(
                screen.getByText('Choose the form your summoned creature takes:')
            ).toBeInTheDocument();
        });

        it('renders all variant buttons with their names', () => {
            render(<SummonSpiritModal {...makeProps()} />);
            expect(screen.getByText('Bestial Spirit (Air)')).toBeInTheDocument();
            expect(screen.getByText('Bestial Spirit (Land)')).toBeInTheDocument();
            expect(screen.getByText('Bestial Spirit (Water)')).toBeInTheDocument();
        });

        it('renders variant descriptions when present', () => {
            render(<SummonSpiritModal {...makeProps()} />);
            expect(screen.getByText('Flies at 60 ft.')).toBeInTheDocument();
            expect(screen.getByText('Walks and climbs at 30 ft.')).toBeInTheDocument();
            expect(screen.getByText('Swims at 30 ft.')).toBeInTheDocument();
        });

        it('omits the description span when a variant has no description', () => {
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

        it('renders variant buttons when no description is provided on others', () => {
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
            const buttons = document.querySelectorAll('.summon-spirit-option');
            expect(buttons.length).toBe(2);
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

        it('renders the header icon', () => {
            render(<SummonSpiritModal {...makeProps()} />);
            const header = document.querySelector('.sp-header');
            expect(header.querySelector('i.fa-solid.fa-hand-sparkles')).toBeInTheDocument();
        });

        it('renders the Summon button with the header icon', () => {
            render(<SummonSpiritModal {...makeProps()} />);
            const summonButton = screen.getByRole('button', { name: /Summon/ });
            expect(summonButton.querySelector('i.fa-solid.fa-hand-sparkles')).toBeInTheDocument();
        });

        it('renders all buttons with type="button"', () => {
            render(<SummonSpiritModal {...makeProps()} />);
            const buttons = document.querySelectorAll('button[type="button"]');
            expect(buttons.length).toBeGreaterThan(0);
        });

        it('does not call onClose on initial render', () => {
            const onClose = vi.fn();
            render(<SummonSpiritModal {...makeProps({ onClose })} />);
            expect(onClose).not.toHaveBeenCalled();
        });
    });

    // ── Summon button state ──

    describe('summon button state', () => {
        it('is disabled when no variant is selected', () => {
            render(<SummonSpiritModal {...makeProps()} />);
            const summonButton = screen.getByRole('button', { name: /Summon/ });
            expect(summonButton).toBeDisabled();
        });

        it('is enabled after a variant is selected', () => {
            render(<SummonSpiritModal {...makeProps()} />);
            const summonButton = screen.getByRole('button', { name: /Summon/ });
            expect(summonButton).toBeDisabled();

            selectVariant('Bestial Spirit (Air)');
            expect(summonButton).toBeEnabled();
        });

        it('remains enabled after confirm while selection persists', () => {
            render(<SummonSpiritModal {...makeProps()} />);
            const summonButton = screen.getByRole('button', { name: /Summon/ });

            selectVariant('Bestial Spirit (Air)');
            expect(summonButton).toBeEnabled();

            fireEvent.click(summonButton);
            expect(baseProps.onConfirm).toHaveBeenCalled();
            expect(summonButton).toBeEnabled();
        });
    });

    // ── Variant selection ──

    describe('variant selection', () => {
        it('selects a variant on click', () => {
            render(<SummonSpiritModal {...makeProps()} />);
            selectVariant('Bestial Spirit (Land)');

            const selectedBtn = document.querySelector('button.summon-spirit-option-selected');
            expect(selectedBtn).toBeInTheDocument();
            expect(selectedBtn.textContent).toContain('Bestial Spirit (Land)');
        });

        it('deselects the previous selection when another variant is clicked', () => {
            render(<SummonSpiritModal {...makeProps()} />);

            selectVariant('Bestial Spirit (Air)');
            let selectedBtn = document.querySelector('button.summon-spirit-option-selected');
            expect(selectedBtn.textContent).toContain('Bestial Spirit (Air)');

            selectVariant('Bestial Spirit (Land)');
            selectedBtn = document.querySelector('button.summon-spirit-option-selected');
            expect(selectedBtn.textContent).toContain('Bestial Spirit (Land)');
        });

        it('selects a variant that has no description', () => {
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
            selectVariant('Spirit A');

            const selectedBtn = document.querySelector('button.summon-spirit-option-selected');
            expect(selectedBtn).toBeInTheDocument();
            expect(selectedBtn.textContent).toContain('Spirit A');
        });

        it('does not close the modal when a variant is clicked', () => {
            const onClose = vi.fn();
            render(<SummonSpiritModal {...makeProps({ onClose })} />);

            selectVariant('Bestial Spirit (Air)');
            expect(onClose).not.toHaveBeenCalled();
        });
    });

    // ── Confirm behavior ──

    describe('confirm behavior', () => {
        it('calls onConfirm with the selected variant name', () => {
            render(<SummonSpiritModal {...makeProps()} />);
            selectVariant('Bestial Spirit (Land)');
            fireEvent.click(screen.getByRole('button', { name: /Summon/ }));

            expect(baseProps.onConfirm).toHaveBeenCalledWith('Bestial Spirit (Land)');
        });

        it('does not call onConfirm without a selection', () => {
            render(<SummonSpiritModal {...makeProps()} />);
            fireEvent.click(screen.getByRole('button', { name: /Summon/ }));
            expect(baseProps.onConfirm).not.toHaveBeenCalled();
        });

        it('calls onConfirm with the latest selection after switching', () => {
            render(<SummonSpiritModal {...makeProps()} />);
            selectVariant('Bestial Spirit (Air)');
            selectVariant('Bestial Spirit (Water)');
            fireEvent.click(screen.getByRole('button', { name: /Summon/ }));

            expect(baseProps.onConfirm).toHaveBeenCalledWith('Bestial Spirit (Water)');
        });
    });

    // ── Close behavior ──

    describe('close behavior', () => {
        it('calls onClose when the Cancel button is clicked', () => {
            const onClose = vi.fn();
            render(<SummonSpiritModal {...makeProps({ onClose })} />);
            fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('calls onClose when the overlay background is clicked', () => {
            const onClose = vi.fn();
            render(<SummonSpiritModal {...makeProps({ onClose })} />);
            fireEvent.click(document.querySelector('.sp-overlay'));
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('does not close when clicking inside the modal content', () => {
            const onClose = vi.fn();
            render(<SummonSpiritModal {...makeProps({ onClose })} />);
            fireEvent.click(document.querySelector('.sp-modal'));
            expect(onClose).not.toHaveBeenCalled();
        });
    });
});
