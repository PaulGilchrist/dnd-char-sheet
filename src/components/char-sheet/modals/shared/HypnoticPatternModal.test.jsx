// @improved-by-ai
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HypnoticPatternModal from './HypnoticPatternModal.jsx';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../../services/encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(),
}));

import { getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';

const campaignName = 'test-campaign';

const basePlayerStats = {
    name: 'Wizard1',
    level: 10,
    proficiency: 4,
    abilities: [{ name: 'Intelligence', bonus: 4 }],
};

const baseAction = {
    name: 'Hypnotic Pattern',
    automation: { type: 'hypnotic_pattern' },
};

const baseCombatSummary = {
    creatures: [
        { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 7, saveBonuses: { wis: 0 } },
        { name: 'Orc', type: 'npc', currentHp: 15, maxHp: 22, saveBonuses: { wis: 2 } },
        { name: 'PlayerAlly', type: 'player', currentHp: 30, maxHp: 30, saveBonuses: { wis: 1 } },
    ],
};

function makeProps(overrides = {}) {
    return {
        action: baseAction,
        playerStats: basePlayerStats,
        campaignName,
        saveType: 'WIS',
        saveDc: 14,
        onClose: vi.fn(),
        ...overrides,
    };
}

beforeEach(() => {
    vi.resetAllMocks();
    getCombatSummary.mockReturnValue(baseCombatSummary);
    getRuntimeValue.mockReturnValue([]);
});

describe('HypnoticPatternModal', () => {
    describe('rendering', () => {
        it('renders the modal with title and target list', () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            expect(screen.getByText('Hypnotic Pattern')).toBeInTheDocument();
            expect(screen.getByText('Goblin')).toBeInTheDocument();
            expect(screen.getByText('Orc')).toBeInTheDocument();
            expect(screen.getByText('PlayerAlly')).toBeInTheDocument();
        });

        it('renders the description with save type and DC', () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            expect(screen.getByText(/Select creatures in the 20-foot-radius sphere/)).toBeInTheDocument();
            expect(screen.getByText(/WIS/)).toBeInTheDocument();
            expect(screen.getByText(/DC 14/)).toBeInTheDocument();
        });

        it('renders the note about conditions on failed save', () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            expect(screen.getByText(/Charmed/)).toBeInTheDocument();
            expect(screen.getByText(/Incapacitated/)).toBeInTheDocument();
            expect(screen.getByText(/Speed 0/)).toBeInTheDocument();
        });

        it('displays HP percentage for NPC targets', () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            expect(screen.getByText(/71% HP/)).toBeInTheDocument();
            expect(screen.getByText(/68% HP/)).toBeInTheDocument();
        });

        it('does not display HP for player targets', () => {
            const { container } = render(<HypnoticPatternModal {...makeProps()} />);
            const playerRow = [...container.querySelectorAll('.secondary-target-row')].find(
                row => row.textContent.includes('PlayerAlly'),
            );
            expect(playerRow.textContent).not.toContain('HP');
        });

        it('renders the confirm button with target count', () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: /Hypnotic Pattern \(0\)/ })).toBeInTheDocument();
        });

        it('renders the skip button', () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
        });
    });

    describe('target selection', () => {
        it('disables the confirm button when no target is selected', () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: /Hypnotic Pattern \(0\)/ })).toBeDisabled();
        });

        it('enables the confirm button after selecting a target', async () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ })).toBeEnabled();
            });
        });

        it('allows selecting multiple targets', async () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await act(async () => { fireEvent.click(labels[1]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Hypnotic Pattern \(2\)/ })).toBeEnabled();
            });
        });
    });

    describe('close behavior', () => {
        it('closes when Skip is clicked', () => {
            const onClose = vi.fn();
            render(<HypnoticPatternModal {...makeProps({ onClose })} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('empty targets', () => {
        it('shows no targets message when combat summary has no creatures', () => {
            getCombatSummary.mockReturnValue({ creatures: [] });
            render(<HypnoticPatternModal {...makeProps()} />);
            expect(screen.getByText('No targets available.')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Hypnotic Pattern \(0\)/ })).toBeDisabled();
        });

        it('includes the caster as a target when caster is the only creature', () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Wizard1', type: 'player', currentHp: 30, maxHp: 30, saveBonuses: { wis: 4 } },
                ],
            });
            render(<HypnoticPatternModal {...makeProps()} />);
            expect(screen.getByText('Wizard1')).toBeInTheDocument();
        });
    });
});
