// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TashasLaughterModal from './TashasLaughterModal.jsx';

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

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';

const campaignName = 'test-campaign';

const basePlayerStats = {
    name: 'Wizard1',
    level: 10,
    proficiency: 4,
    abilities: [{ name: 'Intelligence', bonus: 4 }],
};

const baseAction = {
    name: "Tasha's Hideous Laughter",
    automation: { type: 'tashas_hideous_laughter' },
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
});

describe('TashasLaughterModal - Metamagic & Other', () => {
    describe('metamagic heighten', () => {
        it('shows heighten note in description when metamagicHeighten is true', () => {
            render(<TashasLaughterModal {...makeProps({ metamagicHeighten: true })} />);
            expect(screen.getByText(/Heightened Spell/)).toBeInTheDocument();
            expect(screen.getByText(/one target will have disadvantage/)).toBeInTheDocument();
        });

        it('does not show heighten note when metamagicHeighten is false or undefined', () => {
            render(<TashasLaughterModal {...makeProps({ metamagicHeighten: false })} />);
            expect(screen.queryByText(/Heightened Spell/)).not.toBeInTheDocument();

            render(<TashasLaughterModal {...makeProps()} />);
            expect(screen.queryByText(/Heightened Spell/)).not.toBeInTheDocument();
        });

        it('shows heighten radio buttons when metamagicHeighten is true', () => {
            render(<TashasLaughterModal {...makeProps({ metamagicHeighten: true })} />);
            const heightenRadios = document.querySelectorAll('input[name="heightenTarget"]');
            expect(heightenRadios).toHaveLength(baseCombatSummary.creatures.length);
        });

        it('does not show heighten radio buttons when metamagicHeighten is false', () => {
            render(<TashasLaughterModal {...makeProps({ metamagicHeighten: false })} />);
            expect(document.querySelectorAll('input[name="heightenTarget"]')).toHaveLength(0);
        });

        it('tracks heightenTarget selection state when a radio is clicked', () => {
            render(<TashasLaughterModal {...makeProps({ metamagicHeighten: true })} />);
            const heightenRadios = document.querySelectorAll('input[name="heightenTarget"]');
            expect(heightenRadios).toHaveLength(3);

            fireEvent.click(heightenRadios[0]);
            expect(heightenRadios[0]).toBeChecked();
        });

        it('shows heighten radio buttons equal to creature count', () => {
            const combatSummary = {
                creatures: [
                    { name: 'Spider', type: 'npc', currentHp: 3, maxHp: 5, saveBonuses: { wis: -1 } },
                ],
            };
            getCombatSummary.mockReturnValue(combatSummary);
            render(<TashasLaughterModal {...makeProps({ metamagicHeighten: true })} />);
            expect(document.querySelectorAll('input[name="heightenTarget"]')).toHaveLength(1);
        });

    });

    describe('edge cases', () => {
        it('shows heighten radios when there is only one creature', () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'SoloEnemy', type: 'npc', currentHp: 10, maxHp: 10, saveBonuses: { wis: 3 } },
                ],
            });
            render(<TashasLaughterModal {...makeProps({ metamagicHeighten: true })} />);
            expect(document.querySelectorAll('input[name="heightenTarget"]')).toHaveLength(1);
        });

        it('shows heighten radios when there are no creatures', () => {
            getCombatSummary.mockReturnValue({ creatures: [] });
            render(<TashasLaughterModal {...makeProps({ metamagicHeighten: true })} />);
            expect(document.querySelectorAll('input[name="heightenTarget"]')).toHaveLength(0);
            expect(screen.getByText('No targets available.')).toBeInTheDocument();
        });
    });
});
