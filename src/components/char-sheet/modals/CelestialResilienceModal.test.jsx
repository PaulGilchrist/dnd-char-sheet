import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

    // ── Rendering ──

    describe('initial render', () => {
        it('renders the Celestial Resilience title', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            expect(screen.getByText('Celestial Resilience')).toBeInTheDocument();
        });

        it('renders the shield-hart icon in the header', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            expect(document.querySelector('.sp-header .fa-solid.fa-shield-hart')).toBeInTheDocument();
        });

        it('renders all creature targets from creatureTargets prop', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            expect(screen.getByText('Ally1')).toBeInTheDocument();
            expect(screen.getByText('Ally2')).toBeInTheDocument();
            expect(screen.getByText('Ally3')).toBeInTheDocument();
        });

        it('renders the confirm button with "Grant Resilience" label', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: /Grant Resilience \(0\)/ })).toBeInTheDocument();
        });

        it('renders the shield-hart icon on the confirm button', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            const btn = screen.getByRole('button', { name: /Grant Resilience/ });
            expect(btn.querySelector('.fa-solid.fa-shield-hart')).toBeInTheDocument();
        });

        it('renders the Skip button', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
        });

        it('wraps content in sp-overlay and sp-modal', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
            expect(document.querySelector('.sp-modal')).toBeInTheDocument();
        });

        it('disables confirm button when no targets are selected', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            const confirmBtn = screen.getByRole('button', { name: /Grant Resilience \(0\)/ });
            expect(confirmBtn).toBeDisabled();
        });
    });

    // ── Description rendering ──

    describe('description rendering', () => {
        it('renders the description text', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            expect(screen.getByText(/Choose up to 5 allies to gain temporary hit points/)).toBeInTheDocument();
        });

        it('renders the description with hardcoded "up to 5" regardless of maxTargets', () => {
            render(<CelestialResilienceModal {...makeProps({ maxTargets: 3 })} />);
            expect(screen.getByText(/Choose up to 5 allies to gain temporary hit points from your Celestial Resilience/)).toBeInTheDocument();
        });

        it('renders the same description when maxTargets is falsy', () => {
            render(<CelestialResilienceModal {...makeProps({ maxTargets: 0 })} />);
            expect(screen.getByText(/Choose up to 5 allies to gain temporary hit points from your Celestial Resilience/)).toBeInTheDocument();
        });
    });

    // ── Note rendering ──

    describe('note rendering', () => {
        it('renders the note with self temp HP value', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            expect(screen.getByText(/You gain 7 temporary hit points/)).toBeInTheDocument();
        });

        it('renders the note with ally temp HP value', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            expect(screen.getByText(/Each selected ally gains 3 temporary hit points/)).toBeInTheDocument();
        });

        it('reflects different self temp HP values', () => {
            render(<CelestialResilienceModal {...makeProps({ selfTempHp: 10 })} />);
            expect(screen.getByText(/You gain 10 temporary hit points/)).toBeInTheDocument();
        });

        it('reflects different ally temp HP values', () => {
            render(<CelestialResilienceModal {...makeProps({ allyTempHp: 5 })} />);
            expect(screen.getByText(/Each selected ally gains 5 temporary hit points/)).toBeInTheDocument();
        });

        it('renders the note inside a sp-note element', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            expect(document.querySelector('.sp-note')).toBeInTheDocument();
        });
    });

    // ── HP display on targets ──

    describe('HP display', () => {
        it('renders HP percentage for non-player targets', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            // Ally3 has 50/50 HP = 100%
            expect(screen.getByText('(100% HP)')).toBeInTheDocument();
        });

        it('does not render HP percentage for player-type targets', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            // Ally1 and Ally2 are type: 'player', so no HP displayed
            const ally1Label = document.querySelector('.secondary-target-row');
            expect(ally1Label.querySelector('.secondary-target-hp')).toBeNull();
        });

        it('does not render HP display for targets without currentHp/maxHp', () => {
            render(<CelestialResilienceModal {...makeProps({ creatureTargets: [{ name: 'Unknown' }] })} />);
            expect(screen.getByText('Unknown')).toBeInTheDocument();
            expect(screen.queryByText(/% HP/)).not.toBeInTheDocument();
        });
    });

    // ── Empty targets ──

    describe('empty targets', () => {
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

    // ── Max targets limiting ──

    describe('max targets limiting', () => {
        it('limits selection to maxTargets when set', async () => {
            render(<CelestialResilienceModal {...makeProps({ maxTargets: 2 })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            // Select first two targets
            await act(async () => fireEvent.click(labels[0]));
            await act(async () => fireEvent.click(labels[1]));
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Grant Resilience \(2\)/ })).toBeInTheDocument();
            });
            // Third target should be disabled
            expect(labels[2]).toHaveClass('secondary-target-disabled');
        });

        it('allows deselecting a target below max', async () => {
            render(<CelestialResilienceModal {...makeProps({ maxTargets: 2 })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => fireEvent.click(labels[0]));
            await act(async () => fireEvent.click(labels[1]));
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Grant Resilience \(2\)/ })).toBeInTheDocument();
            });
            // Deselect first target
            await act(async () => fireEvent.click(labels[0]));
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Grant Resilience \(1\)/ })).toBeInTheDocument();
            });
        });

        it('allows unlimited selection when maxTargets is 0', async () => {
            render(<CelestialResilienceModal {...makeProps({ maxTargets: 0 })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => fireEvent.click(labels[0]));
            await act(async () => fireEvent.click(labels[1]));
            await act(async () => fireEvent.click(labels[2]));
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Grant Resilience \(3\)/ })).toBeInTheDocument();
            });
        });
    });

    // ── User interactions ──

    describe('user interactions', () => {
        it('calls onSkip when Skip button is clicked', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(mockOnSkip).toHaveBeenCalledTimes(1);
        });

        it('calls onSkip when overlay background is clicked', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            fireEvent.click(document.querySelector('.sp-overlay'));
            expect(mockOnSkip).toHaveBeenCalledTimes(1);
        });

        it('does not call onSkip when modal content is clicked', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            const modal = document.querySelector('.sp-modal');
            fireEvent.click(modal);
            expect(mockOnSkip).not.toHaveBeenCalled();
        });

        it('does not call onConfirm when confirm button is clicked with no selection', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            const confirmBtn = screen.getByRole('button', { name: /Grant Resilience \(0\)/ });
            expect(confirmBtn).toBeDisabled();
            fireEvent.click(confirmBtn);
            expect(mockOnConfirm).not.toHaveBeenCalled();
        });

        it('calls onConfirm with selected target names', async () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => fireEvent.click(labels[0]));
            fireEvent.click(screen.getByRole('button', { name: /Grant Resilience \(1\)/ }));
            await waitFor(() => {
                expect(mockOnConfirm).toHaveBeenCalledWith(['Ally1']);
            });
        });

        it('calls onConfirm with multiple selected targets', async () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => fireEvent.click(labels[0]));
            await act(async () => fireEvent.click(labels[2]));
            fireEvent.click(screen.getByRole('button', { name: /Grant Resilience \(2\)/ }));
            await waitFor(() => {
                expect(mockOnConfirm).toHaveBeenCalledWith(['Ally1', 'Ally3']);
            });
        });

        it('updates selection count in confirm button label', async () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => fireEvent.click(labels[0]));
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Grant Resilience \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => fireEvent.click(labels[1]));
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Grant Resilience \(2\)/ })).toBeInTheDocument();
            });
        });

        it('toggles selection when clicking the same target again', async () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => fireEvent.click(labels[0]));
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Grant Resilience \(1\)/ })).toBeInTheDocument();
            });
            // Deselect
            await act(async () => fireEvent.click(labels[0]));
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Grant Resilience \(0\)/ })).toBeInTheDocument();
            });
        });
    });

    // ── String targets ──

    describe('string targets', () => {
        it('renders string targets without name property', () => {
            render(<CelestialResilienceModal {...makeProps({ creatureTargets: ['AllyA', 'AllyB'] })} />);
            expect(screen.getByText('AllyA')).toBeInTheDocument();
            expect(screen.getByText('AllyB')).toBeInTheDocument();
        });

        it('calls onConfirm with string target names', async () => {
            render(<CelestialResilienceModal {...makeProps({ creatureTargets: ['AllyA', 'AllyB', 'AllyC'] })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => fireEvent.click(labels[0]));
            await act(async () => fireEvent.click(labels[2]));
            fireEvent.click(screen.getByRole('button', { name: /Grant Resilience \(2\)/ }));
            await waitFor(() => {
                expect(mockOnConfirm).toHaveBeenCalledWith(['AllyA', 'AllyC']);
            });
        });
    });

    // ── Different temp HP values ──

    describe('temp HP value variations', () => {
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

    // ── Callback passthrough ──

    describe('callback passthrough', () => {
        it('renders without crashing with undefined callbacks', () => {
            render(<CelestialResilienceModal {...makeProps({ onConfirm: undefined, onSkip: undefined })} />);
            expect(screen.getByText('Celestial Resilience')).toBeInTheDocument();
        });
    });

    // ── CreatureSelectionModal prop mapping ──

    describe('CreatureSelectionModal prop mapping', () => {
        it('passes title="Celestial Resilience"', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            expect(screen.getByText('Celestial Resilience')).toBeInTheDocument();
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

        it('passes creatureTargets as targets', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            mockCreatureTargets.forEach(target => {
                expect(screen.getByText(target.name)).toBeInTheDocument();
            });
        });

        it('passes maxTargets to CreatureSelectionModal for selection limiting', () => {
            render(<CelestialResilienceModal {...makeProps({ maxTargets: 3 })} />);
            // Description is hardcoded with "up to 5" regardless of maxTargets
            expect(screen.getByText(/Choose up to 5 allies/)).toBeInTheDocument();
        });

        it('passes onConfirm', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[0]);
            fireEvent.click(screen.getByRole('button', { name: /Grant Resilience \(1\)/ }));
            expect(mockOnConfirm).toHaveBeenCalled();
        });

        it('passes onSkip', () => {
            render(<CelestialResilienceModal {...makeProps()} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(mockOnSkip).toHaveBeenCalled();
        });
    });
});
