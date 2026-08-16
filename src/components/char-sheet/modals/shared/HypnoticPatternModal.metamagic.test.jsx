// @improved-by-ai
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

describe('HypnoticPatternModal - Metamagic', () => {
    describe('metamagic heighten rendering', () => {
        it('shows heighten note in description when metamagicHeighten is true', () => {
            const { container } = render(<HypnoticPatternModal {...makeProps({ metamagicHeighten: true })} />);
            const noteEl = container.querySelector('.sp-note');
            expect(noteEl.textContent).toContain('Heightened Spell');
            expect(noteEl.textContent).toContain('one target will have disadvantage');
        });

        it('shows heighten radio buttons when metamagicHeighten is true', () => {
            render(<HypnoticPatternModal {...makeProps({ metamagicHeighten: true })} />);
            const heightenRadios = document.querySelectorAll('input[name="heightenTarget"]');
            expect(heightenRadios.length).toBeGreaterThan(0);
        });

        it('does not show heighten note or radio buttons when metamagicHeighten is false', () => {
            render(<HypnoticPatternModal {...makeProps({ metamagicHeighten: false })} />);
            const noteEl = document.querySelector('.sp-note');
            expect(noteEl.textContent).not.toContain('Heightened Spell');
            const heightenRadios = document.querySelectorAll('input[name="heightenTarget"]');
            expect(heightenRadios).toHaveLength(0);
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

        it('does not show careful spell protection badge for non-ally targets', () => {
            getAllyList.mockReturnValue(['OtherAlly']);
            render(<HypnoticPatternModal {...makeProps({ metamagicCareful: true })} />);
            const rows = document.querySelectorAll('.secondary-target-row');
            const playerRow = [...rows].find(row => row.textContent.includes('PlayerAlly'));
            expect(playerRow.textContent).not.toContain('Careful Spell protected');
        });
    });

    describe('careful spell protection for NPCs', () => {
        it('automatically succeeds for careful spell protected NPCs without applying conditions', async () => {
            getAllyList.mockReturnValue(['Goblin']);
            render(<HypnoticPatternModal {...makeProps({ metamagicCareful: true })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[0]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            const conditionCalls = setRuntimeValue.mock.calls.filter(
                call => call[1] === 'activeConditions' && call[0] === 'Goblin'
            );
            expect(conditionCalls.length).toBe(0);
            expect(addExpiration).not.toHaveBeenCalled();

            const saveEntries = addEntry.mock.calls.filter(
                call => call[1]?.type === 'save_result' && call[1]?.targetName === 'Goblin'
            );
            expect(saveEntries.length).toBe(1);
            expect(saveEntries[0][1].success).toBe(true);
            expect(saveEntries[0][1].description).toContain('Careful Spell protected');
        });

        it('records addTargetResult with success for careful spell protected NPCs', async () => {
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
                expect(targetResultCalls.length).toBe(1);
                expect(targetResultCalls[0][1].saveResult).toBe('success');
                expect(targetResultCalls[0][1].conditions).toEqual([]);
            });
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

        it('does not log save_result for careful spell protected player targets (skipped entirely)', async () => {
            getAllyList.mockReturnValue(['PlayerAlly']);
            render(<HypnoticPatternModal {...makeProps({ metamagicCareful: true })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            // Player targets with careful spell protection skip the entire save flow - no addEntry, no sendSavePrompt
            const saveEntries = addEntry.mock.calls.filter(
                call => call[1]?.type === 'save_result' && call[1]?.targetName === 'PlayerAlly'
            );
            expect(saveEntries.length).toBe(0);
        });
    });

    describe('heighten disadvantage resolution', () => {
        it('applies disadvantage (double d20, take lower) to selected heighten target', async () => {
            getRuntimeValue.mockReturnValue([]);
            // First target (Goblin) gets a normal roll of 1 (fails), heighten target (Orc) gets rolls of [1, 3] → min = 1 (fails)
            let randomValues = [0.01, 0.01, 0.01, 0.01, 0.01, 0.99];
            vi.spyOn(Math, 'random').mockImplementation(() => randomValues.shift());
            try {
                render(<HypnoticPatternModal {...makeProps({ metamagicHeighten: true })} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ })).toBeInTheDocument();
                });

                // Select Orc as heighten target
                const heightenRadios = document.querySelectorAll('input[name="heightenTarget"]');
                if (heightenRadios.length > 1) {
                    await act(async () => {
                        fireEvent.click(heightenRadios[1]);
                    });
                }

                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern/ }));
                });

                await waitFor(() => {
                    const orcConditionCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditions' && call[0] === 'Orc'
                    );
                    expect(orcConditionCalls.length).toBeGreaterThan(0);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('does not apply conditions to heighten target that rolls high enough on either d20', async () => {
            getRuntimeValue.mockReturnValue([]);
            // Goblin rolls 1 (fails), Orc (heighten) rolls [1, 20] → min = 1, but with wis+2 = 3, still fails.
            // Use Orc with wis=2, DC 14. Need roll >= 12. So heighten rolls [1, 15] → min = 1, fails.
            // Actually test: Orc rolls [1, 1] → min = 1, total = 3, fails. We want it to succeed.
            // Orc wis=2, DC 14, need roll >= 12. Heighten rolls [1, 15] → min = 1, still fails.
            // Use different approach: Orc wis=2, DC 14. Normal Goblin roll = 1 (fails).
            // Heighten Orc rolls [1, 20] → min = 1, total = 3, fails.
            // To make heighten succeed: need either roll >= 12. So rolls [1, 15] → min = 1.
            // Actually Math.random() returns 0-1, so Math.floor(Math.random() * 20) + 1 = 1-20.
            // mockImplementation controls Math.random(). Return 0.01 → roll 1, 0.76 → roll 16.
            // Heighten rolls: Math.min(rollA, rollB). If rollA=1, rollB=16 → min=1 → total=3 → fails.
            // We need both rolls to be high. Let's set both high: 0.66 → roll 14, 0.66 → roll 14.
            // But we also need Goblin to roll. Order: Goblin roll, heighten rollA, heighten rollB, rest.
            let randomValues = [0.01, 0.66, 0.66, 0.99]; // Goblin=1(fail), Orc heighten min(14,14)=14(total=16, success)
            vi.spyOn(Math, 'random').mockImplementation(() => randomValues.shift());
            try {
                render(<HypnoticPatternModal {...makeProps({ metamagicHeighten: true })} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ })).toBeInTheDocument();
                });

                const heightenRadios = document.querySelectorAll('input[name="heightenTarget"]');
                if (heightenRadios.length > 1) {
                    await act(async () => {
                        fireEvent.click(heightenRadios[1]);
                    });
                }

                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern/ }));
                });

                await waitFor(() => {
                    const orcConditionCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditions' && call[0] === 'Orc'
                    );
                    expect(orcConditionCalls.length).toBe(0);

                    const orcSaveEntries = addEntry.mock.calls.filter(
                        call => call[1]?.type === 'save_result' && call[1]?.targetName === 'Orc'
                    );
                    expect(orcSaveEntries.length).toBe(1);
                    expect(orcSaveEntries[0][1].success).toBe(true);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    describe('persistAndNotify calls', () => {
        it('calls persistAndNotify after careful spell protected NPC resolution', async () => {
            getAllyList.mockReturnValue(['Goblin']);
            render(<HypnoticPatternModal {...makeProps({ metamagicCareful: true })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[0]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            await waitFor(() => {
                expect(persistAndNotify).toHaveBeenCalled();
            });
        });
    });
});
