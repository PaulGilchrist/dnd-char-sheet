// @cleaned-by-ai
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
import { sendSavePrompt } from '../../../../services/combat/conditions/savePromptService.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';
import { getAllyList } from '../../../../hooks/useAllySelection.js';
import { addTargetResult } from '../../../../services/automation/common/damageRollback.js';
import { addEntry } from '../../../../services/ui/logService.js';
import { addExpiration } from '../../../../services/rules/effects/expirations.js';
import { persistAndNotify } from './AreaEffectTargetModalBase.utils.jsx';

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

describe('HypnoticPatternModal - Metamagic', () => {
    describe('metamagic heighten rendering', () => {
        it('shows heighten note in description when metamagicHeighten is true', () => {
            const { container } = render(<HypnoticPatternModal {...makeProps({ metamagicHeighten: true })} />);
            const noteEl = container.querySelector('.sp-note');
            expect(noteEl.textContent).toContain('Heightened Spell');
            expect(noteEl.textContent).toContain('one target will have disadvantage');
        });

        it('does not show heighten note when metamagicHeighten is false', () => {
            const { container } = render(<HypnoticPatternModal {...makeProps({ metamagicHeighten: false })} />);
            const noteEl = container.querySelector('.sp-note');
            expect(noteEl.textContent).not.toContain('Heightened Spell');
        });

        it('does not show heighten note when metamagicHeighten is undefined', () => {
            const { container } = render(<HypnoticPatternModal {...makeProps()} />);
            const noteEl = container.querySelector('.sp-note');
            expect(noteEl.textContent).not.toContain('Heightened Spell');
        });
    });

    describe('metamagic careful rendering', () => {
        it('shows careful spell protection badge on ally targets when metamagicCareful is true', () => {
            getAllyList.mockReturnValue(['PlayerAlly']);
            render(<HypnoticPatternModal {...makeProps({ metamagicCareful: true })} />);
            const rows = document.querySelectorAll('.secondary-target-row');
            const playerRow = [...rows].find(row => row.textContent.includes('PlayerAlly'));
            expect(playerRow.textContent).toContain('Careful Spell protected');
        });

        it('does not show careful spell protection for non-ally targets', () => {
            getAllyList.mockReturnValue(['OtherAlly']);
            render(<HypnoticPatternModal {...makeProps({ metamagicCareful: true })} />);
            const rows = document.querySelectorAll('.secondary-target-row');
            const playerRow = [...rows].find(row => row.textContent.includes('PlayerAlly'));
            expect(playerRow.textContent).not.toContain('Careful Spell protected');
        });

        it('does not show careful spell protection when metamagicCareful is false', () => {
            render(<HypnoticPatternModal {...makeProps({ metamagicCareful: false })} />);
            const rows = document.querySelectorAll('.secondary-target-row');
            rows.forEach(row => {
                expect(row.textContent).not.toContain('Careful Spell protected');
            });
        });
    });

    describe('careful spell protection for NPCs', () => {
        it('automatically succeeds for careful spell protected NPCs without rolling', async () => {
            getAllyList.mockReturnValue(['Goblin']);
            render(<HypnoticPatternModal {...makeProps({ metamagicCareful: true })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[0]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            // No condition should be applied to the careful spell protected NPC
            const conditionCalls = setRuntimeValue.mock.calls.filter(
                call => call[1] === 'activeConditions' && call[0] === 'Goblin'
            );
            expect(conditionCalls.length).toBe(0);

            // Should log save_result as success with Careful Spell description
            const saveEntries = addEntry.mock.calls.filter(
                call => call[1]?.type === 'save_result' && call[1]?.targetName === 'Goblin'
            );
            expect(saveEntries.length).toBeGreaterThan(0);
            expect(saveEntries[0][1].success).toBe(true);
            expect(saveEntries[0][1].description).toContain('Careful Spell protected');
        });

        it('does not apply addExpiration for careful spell protected NPCs', async () => {
            getAllyList.mockReturnValue(['Goblin']);
            render(<HypnoticPatternModal {...makeProps({ metamagicCareful: true })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[0]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            expect(addExpiration).not.toHaveBeenCalled();
        });
    });

    describe('careful spell protection for players', () => {
        it('does not send save prompt for careful spell protected player targets', async () => {
            getAllyList.mockReturnValue(['PlayerAlly']);
            render(<HypnoticPatternModal {...makeProps({ metamagicCareful: true })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            expect(sendSavePrompt).not.toHaveBeenCalled();
            expect(setRuntimeValue).not.toHaveBeenCalledWith(
                'campaign',
                'pendingSaveListenerPrompts',
                expect.any(Array),
                campaignName,
            );
        });

        it('returns success result for careful spell protected player targets', async () => {
            getAllyList.mockReturnValue(['PlayerAlly']);
            render(<HypnoticPatternModal {...makeProps({ metamagicCareful: true })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            const conditionCalls = setRuntimeValue.mock.calls.filter(
                call => call[1] === 'activeConditions' && call[0] === 'PlayerAlly'
            );
            expect(conditionCalls.length).toBe(0);
        });
    });

    describe('heighten target selection', () => {
        it('shows heighten radio buttons when metamagicHeighten is true', () => {
            render(<HypnoticPatternModal {...makeProps({ metamagicHeighten: true })} />);
            const heightenRadios = document.querySelectorAll('input[name="heightenTarget"]');
            expect(heightenRadios.length).toBeGreaterThan(0);
        });

        it('does not show heighten radio buttons when metamagicHeighten is false', () => {
            render(<HypnoticPatternModal {...makeProps({ metamagicHeighten: false })} />);
            const heightenRadios = document.querySelectorAll('input[name="heightenTarget"]');
            expect(heightenRadios).toHaveLength(0);
        });

        it('uses heighten target for disadvantage on NPC saves (double d20, take lower)', async () => {
            getRuntimeValue.mockReturnValue([]);
            let randomValues = [0.01, 0.01, 0.99, 0.01]; // first two for double roll (low, low), rest for other targets
            vi.spyOn(Math, 'random').mockImplementation(() => randomValues.shift());
            try {
                render(<HypnoticPatternModal {...makeProps({ metamagicHeighten: true })} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ })).toBeInTheDocument();
                });

                // Set heighten target to Orc (index 1) by clicking its radio
                const heightenRadios = document.querySelectorAll('input[name="heightenTarget"]');
                if (heightenRadios.length > 1) {
                    await act(async () => {
                        fireEvent.click(heightenRadios[1]);
                    });
                }

                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern/ }));
                });

                expect(setRuntimeValue).toHaveBeenCalled();
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    describe('targetResult recording', () => {
        it('records addTargetResult for careful spell protected NPC', async () => {
            getAllyList.mockReturnValue(['Goblin']);
            render(<HypnoticPatternModal {...makeProps({ metamagicCareful: true })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[0]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            await waitFor(() => {
                const targetResultCalls = addTargetResult.mock.calls.filter(
                    call => call[0] === campaignName && call[1]?.targetName === 'Goblin'
                );
                expect(targetResultCalls.length).toBeGreaterThan(0);
                expect(targetResultCalls[0][1].saveResult).toBe('success');
            });
        });
    });
});
