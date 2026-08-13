import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import HypnoticPatternModal from './HypnoticPatternModal.jsx';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../../services/combat/conditions/savePromptService.js', () => ({
    sendSavePrompt: vi.fn(),
}));

vi.mock('../../../../services/ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../services/encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(),
}));

vi.mock('../../../../services/automation/common/damageRollback.js', () => ({
    storeSpellLastAttack: vi.fn(),
    addTargetResult: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../services/rules/effects/expirations.js', () => ({
    addExpiration: vi.fn(),
}));

vi.mock('./AreaEffectTargetModalBase.utils.jsx', () => ({
    persistAndNotify: vi.fn(),
}));

vi.mock('../../../../hooks/useAllySelection.js', () => ({
    getAllyList: vi.fn(),
}));

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';
import { getAllyList } from '../../../../hooks/useAllySelection.js';
import { addEntry } from '../../../../services/ui/logService.js';
import { persistAndNotify } from './AreaEffectTargetModalBase.utils.jsx';
import { storeSpellLastAttack } from '../../../../services/automation/common/damageRollback.js';
import { sendSavePrompt } from '../../../../services/combat/conditions/savePromptService.js';

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
    setRuntimeValue.mockReturnValue(undefined);
    addEntry.mockResolvedValue(undefined);
    persistAndNotify.mockReturnValue(undefined);
    getAllyList.mockReturnValue(null);
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('HypnoticPatternModal', () => {
    describe('initial render', () => {
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

        it('renders the note about charmed, incapacitated, and speed 0 conditions', () => {
            const { container } = render(<HypnoticPatternModal {...makeProps()} />);
            const noteEl = container.querySelector('.sp-note');
            expect(noteEl).toHaveTextContent(/On a failed save, target becomes.*Charmed/);
            expect(screen.getByText(/Incapacitated/)).toBeInTheDocument();
            expect(screen.getByText(/Speed 0/)).toBeInTheDocument();
        });

        it('disables the confirm button when no target is selected', () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: /Hypnotic Pattern \(0\)/ })).toBeDisabled();
        });

        it('renders skip button', () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
        });
    });

    describe('target selection', () => {
        it('selects a target when its checkbox is clicked and enables confirm', async () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                expect(checkboxes[0].checked).toBe(true);
            });
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
                const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                expect(checkboxes[0].checked).toBe(true);
                expect(checkboxes[1].checked).toBe(true);
            });
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
        it('renders empty target list when no creatures in combat', () => {
            getCombatSummary.mockReturnValue({ creatures: [] });
            render(<HypnoticPatternModal {...makeProps()} />);
            expect(screen.getByText('No targets available.')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Hypnotic Pattern \(0\)/ })).toBeDisabled();
        });

        it('renders the caster as a target when caster is the only creature', () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Wizard1', type: 'player', currentHp: 30, maxHp: 30, saveBonuses: { wis: 4 } },
                ],
            });
            render(<HypnoticPatternModal {...makeProps()} />);
            expect(screen.getByText('Wizard1')).toBeInTheDocument();
        });
    });

    describe('skip behavior', () => {
        it('closes modal without applying any effects when skipped', async () => {
            const onClose = vi.fn();
            render(<HypnoticPatternModal {...makeProps({ onClose })} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(onClose).toHaveBeenCalledTimes(1);
            expect(storeSpellLastAttack).not.toHaveBeenCalled();
            expect(sendSavePrompt).not.toHaveBeenCalled();
        });
    });
});
