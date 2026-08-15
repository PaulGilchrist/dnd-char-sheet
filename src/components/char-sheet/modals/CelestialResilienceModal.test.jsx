// @improved-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CelestialResilienceModal from './CelestialResilienceModal.jsx';

// ── Test fixtures ──

const mockOnConfirm = vi.fn();
const mockOnSkip = vi.fn();

const mockCreatureTargets = [
    { name: 'Ally1', type: 'player', currentHp: 20, maxHp: 30 },
    { name: 'Ally2', type: 'player', currentHp: 15, maxHp: 25 },
    { name: 'Ally3', type: 'npc', currentHp: 50, maxHp: 50 },
];

const defaultProps = {
    creatureTargets: mockCreatureTargets,
    allyTempHp: 3,
    selfTempHp: 7,
    maxTargets: 5,
    onConfirm: mockOnConfirm,
    onSkip: mockOnSkip,
};

function makeProps(overrides) {
    return { ...defaultProps, ...(overrides || {}) };
}

// ── Tests ──

describe('CelestialResilienceModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('renders CreatureSelectionModal with correct props', () => {
        it('passes title="Celestial Resilience"', () => {
            const { container } = render(<CelestialResilienceModal {...makeProps()} />);
            expect(container.textContent).toContain('Celestial Resilience');
        });

        it('passes icon="fa-shield-hart"', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            expect(document.querySelectorAll('.fa-shield-hart').length).toBeGreaterThan(0);
        });

        it('passes confirmLabel="Grant Resilience"', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: /Grant Resilience/ })).toBeInTheDocument();
        });

        it('passes confirmIcon="fa-shield-hart"', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            const btn = screen.getByRole('button', { name: /Grant Resilience/ });
            expect(btn.querySelector('.fa-shield-hart')).toBeInTheDocument();
        });

        it('passes description string', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            expect(screen.getByText(/Choose up to 5 allies to gain temporary hit points from your Celestial Resilience/)).toBeInTheDocument();
        });

        it('passes creatureTargets as targets', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            mockCreatureTargets.forEach(target => {
                expect(screen.getByText(target.name)).toBeInTheDocument();
            });
        });

        it('passes maxTargets for selection limiting', () => {
            render(<CelestialResilienceModal {...makeProps({ maxTargets: 2 })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[0]);
            fireEvent.click(labels[1]);
            expect(labels[2]).toHaveClass('secondary-target-disabled');
        });

        it('passes onConfirm callback', async () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[0]);
            fireEvent.click(screen.getByRole('button', { name: /Grant Resilience \(1\)/ }));
            await waitFor(() => {
                expect(mockOnConfirm).toHaveBeenCalledWith(['Ally1']);
            });
        });

        it('passes onSkip callback', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(mockOnSkip).toHaveBeenCalledTimes(1);
        });
    });

    describe('note interpolation', () => {
        it('renders note with default self and ally temp HP values', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            expect(screen.getByText(/You gain 7 temporary hit points/)).toBeInTheDocument();
            expect(screen.getByText(/Each selected ally gains 3 temporary hit points/)).toBeInTheDocument();
        });

        it('renders note with custom self temp HP', () => {
            render(<CelestialResilienceModal {...makeProps({ selfTempHp: 10 })} />);
            expect(screen.getByText(/You gain 10 temporary hit points/)).toBeInTheDocument();
        });

        it('renders note with custom ally temp HP', () => {
            render(<CelestialResilienceModal {...makeProps({ allyTempHp: 5 })} />);
            expect(screen.getByText(/Each selected ally gains 5 temporary hit points/)).toBeInTheDocument();
        });

        it('renders note with zero temp HP values', () => {
            render(<CelestialResilienceModal {...makeProps({ allyTempHp: 0, selfTempHp: 0 })} />);
            expect(screen.getByText(/You gain 0 temporary hit points/)).toBeInTheDocument();
            expect(screen.getByText(/Each selected ally gains 0 temporary hit points/)).toBeInTheDocument();
        });

        it('renders note with large temp HP values', () => {
            render(<CelestialResilienceModal {...makeProps({ allyTempHp: 100, selfTempHp: 200 })} />);
            expect(screen.getByText(/You gain 200 temporary hit points/)).toBeInTheDocument();
            expect(screen.getByText(/Each selected ally gains 100 temporary hit points/)).toBeInTheDocument();
        });
    });

    describe('description is hardcoded to "up to 5" regardless of maxTargets', () => {
        it('shows "up to 5" when maxTargets is 3', () => {
            render(<CelestialResilienceModal {...makeProps({ maxTargets: 3 })} />);
            expect(screen.getByText(/Choose up to 5 allies/)).toBeInTheDocument();
        });

        it('shows "up to 5" when maxTargets is 0', () => {
            render(<CelestialResilienceModal {...makeProps({ maxTargets: 0 })} />);
            expect(screen.getByText(/Choose up to 5 allies/)).toBeInTheDocument();
        });
    });

    describe('renders within proper modal structure', () => {
        it('wraps content in sp-overlay and sp-modal', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
            expect(document.querySelector('.sp-modal')).toBeInTheDocument();
        });

        it('renders Skip button', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
        });

        it('renders confirm button with selection count', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: /Grant Resilience \(0\)/ })).toBeInTheDocument();
        });

        it('disables confirm button when no targets selected', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            const confirmBtn = screen.getByRole('button', { name: /Grant Resilience \(0\)/ });
            expect(confirmBtn).toBeDisabled();
        });

        it('shows "No targets available." when creatureTargets is empty', () => {
            render(<CelestialResilienceModal {...makeProps({ creatureTargets: [] })} />);
            expect(screen.getByText('No targets available.')).toBeInTheDocument();
        });

        it('disables confirm button when no targets available', () => {
            render(<CelestialResilienceModal {...makeProps({ creatureTargets: [] })} />);
            const confirmBtn = screen.getByRole('button', { name: /Grant Resilience \(0\)/ });
            expect(confirmBtn).toBeDisabled();
        });
    });

    describe('string targets', () => {
        it('renders string targets without name property', () => {
            render(<CelestialResilienceModal {...makeProps({ creatureTargets: ['AllyA', 'AllyB'] })} />);
            expect(screen.getByText('AllyA')).toBeInTheDocument();
            expect(screen.getByText('AllyB')).toBeInTheDocument();
        });

        it('calls onConfirm with string target names', async () => {
            render(<CelestialResilienceModal {...makeProps({ creatureTargets: ['AllyA', 'AllyB', 'AllyC'] })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[0]);
            fireEvent.click(labels[2]);
            fireEvent.click(screen.getByRole('button', { name: /Grant Resilience \(2\)/ }));
            await waitFor(() => {
                expect(mockOnConfirm).toHaveBeenCalledWith(['AllyA', 'AllyC']);
            });
        });
    });

    describe('renders without crashing with edge-case props', () => {
        it('renders with undefined callbacks', () => {
            render(<CelestialResilienceModal {...makeProps({ onConfirm: undefined, onSkip: undefined })} />);
            expect(screen.getByText('Celestial Resilience')).toBeInTheDocument();
        });

        it('renders with targets missing currentHp/maxHp', () => {
            render(<CelestialResilienceModal {...makeProps({ creatureTargets: [{ name: 'Unknown' }] })} />);
            expect(screen.getByText('Unknown')).toBeInTheDocument();
            expect(screen.queryByText(/% HP/)).not.toBeInTheDocument();
        });
    });
});
