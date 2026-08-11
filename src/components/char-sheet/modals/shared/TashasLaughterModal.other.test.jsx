import { render, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
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

afterEach(() => {
    vi.clearAllMocks();
});

describe('TashasLaughterModal - Metamagic & Other', () => {
    describe('metamagic heighten', () => {
        it('shows heighten note in description when metamagicHeighten is true', () => {
            const { container } = render(<TashasLaughterModal {...makeProps({ metamagicHeighten: true })} />);
            const noteEl = container.querySelector('.sp-note');
            expect(noteEl.textContent).toContain('Heightened Spell');
            expect(noteEl.textContent).toContain('one target will have disadvantage');
        });

        it('does not show heighten note when metamagicHeighten is false', () => {
            const { container } = render(<TashasLaughterModal {...makeProps({ metamagicHeighten: false })} />);
            const noteEl = container.querySelector('.sp-note');
            expect(noteEl.textContent).not.toContain('Heightened Spell');
        });

        it('does not show heighten note when metamagicHeighten is undefined', () => {
            const { container } = render(<TashasLaughterModal {...makeProps()} />);
            const noteEl = container.querySelector('.sp-note');
            expect(noteEl.textContent).not.toContain('Heightened Spell');
        });

        it('shows heighten radio buttons when metamagicHeighten is true', () => {
            render(<TashasLaughterModal {...makeProps({ metamagicHeighten: true })} />);
            const heightenRadios = document.querySelectorAll('input[name="heightenTarget"]');
            expect(heightenRadios.length).toBeGreaterThan(0);
        });

        it('does not show heighten radio buttons when metamagicHeighten is false', () => {
            render(<TashasLaughterModal {...makeProps({ metamagicHeighten: false })} />);
            const heightenRadios = document.querySelectorAll('input[name="heightenTarget"]');
            expect(heightenRadios).toHaveLength(0);
        });

        it('tracks heightenTarget state', async () => {
            render(<TashasLaughterModal {...makeProps({ metamagicHeighten: true })} />);
            // Click heighten radio for first creature
            const heightenRadios = document.querySelectorAll('input[name="heightenTarget"]');
            if (heightenRadios.length > 0) {
                await act(async () => {
                    fireEvent.click(heightenRadios[0]);
                });
            }
            // Verify the heighten target was set by checking the radio is checked
            expect(heightenRadios[0]).toBeChecked();
        });
    });
});
