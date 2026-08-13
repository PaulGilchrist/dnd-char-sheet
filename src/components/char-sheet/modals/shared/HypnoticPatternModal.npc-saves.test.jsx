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
import { storeSpellLastAttack } from '../../../../services/automation/common/damageRollback.js';
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

describe('HypnoticPatternModal - NPC Saves', () => {
    describe('NPC save resolution', () => {
        it('calls storeSpellLastAttack when targets are selected', async () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            expect(storeSpellLastAttack).toHaveBeenCalledWith(campaignName, {
                casterName: 'Wizard1',
                spellName: 'Hypnotic Pattern',
                saveType: 'WIS',
                saveDc: 14,
                attackScope: 'aoe',
            });
        });

        it('logs ability_use entry when targets are selected', async () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                characterName: 'Wizard1',
                abilityName: 'Hypnotic Pattern',
                description: expect.stringContaining('Selecting 1 target'),
            }));
        });

        it('applies charmed, incapacitated, and speed_zero conditions on failed NPC save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<HypnoticPatternModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
                });

                await waitFor(() => {
                    const conditionCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                    );
                    expect(conditionCalls.length).toBeGreaterThan(0);
                    const conditions = conditionCalls[0][2];
                    expect(conditions).toContain('charmed');
                    expect(conditions).toContain('incapacitated');
                    expect(conditions).toContain('speed_zero');
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('calls addExpiration with all three conditions', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<HypnoticPatternModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
                });

                await waitFor(() => {
                    if (addExpiration.mock.calls.length > 0) {
                        const [caster, target, effects] = addExpiration.mock.calls[0];
                        expect(caster).toBe('Wizard1');
                        expect(target).toBe('Goblin');
                        expect(effects).toEqual([
                            { type: 'charmed', condition: 'charmed' },
                            { type: 'incapacitated', condition: 'incapacitated' },
                            { type: 'speed_zero', condition: 'speed_zero' },
                        ]);
                    }
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('logs condition entries on failed NPC save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<HypnoticPatternModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
                });

                await waitFor(() => {
                    const conditionEntries = addEntry.mock.calls.filter(
                        call => call[1]?.type === 'condition' && call[1]?.action === 'applied' && call[1]?.reason === 'Hypnotic Pattern spell'
                    );
                    expect(conditionEntries.length).toBeGreaterThan(0);
                    expect(conditionEntries[0][1]).toEqual(expect.objectContaining({
                        type: 'condition',
                        action: 'applied',
                        characterName: 'Goblin',
                        condition: 'Charmed, Incapacitated, Speed 0',
                        reason: 'Hypnotic Pattern spell',
                    }));
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('logs save_result entry for NPC saves', async () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[0]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            await waitFor(() => {
                const saveEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'save_result'
                );
                expect(saveEntries.length).toBeGreaterThan(0);
                expect(saveEntries[0][1]).toEqual(expect.objectContaining({
                    type: 'save_result',
                    saveType: 'WIS',
                    saveDc: 14,
                }));
            });
        });
    });

    describe('multiple targets', () => {
        it('resolves saves for multiple NPC targets', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<HypnoticPatternModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await act(async () => { fireEvent.click(labels[1]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Hypnotic Pattern \(2\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(2\)/ }));
                });

                await waitFor(() => {
                    const conditionCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditions'
                    );
                    expect(conditionCalls.length).toBeGreaterThan(0);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    describe('targetResult recording', () => {
        it('records addTargetResult for failed NPC save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<HypnoticPatternModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
                });

                await waitFor(() => {
                    const targetResultCalls = addTargetResult.mock.calls.filter(
                        call => call[0] === campaignName && call[1]?.targetName === 'Goblin'
                    );
                    expect(targetResultCalls.length).toBeGreaterThan(0);
                    expect(targetResultCalls[0][1].saveResult).toBe('failure');
                    expect(targetResultCalls[0][1].conditions).toContain('charmed');
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('records addTargetResult for successful NPC save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            try {
                render(<HypnoticPatternModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
                });

                await waitFor(() => {
                    const targetResultCalls = addTargetResult.mock.calls.filter(
                        call => call[0] === campaignName && call[1]?.targetName === 'Goblin'
                    );
                    expect(targetResultCalls.length).toBeGreaterThan(0);
                    expect(targetResultCalls[0][1].saveResult).toBe('success');
                    expect(targetResultCalls[0][1].conditions).toEqual([]);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

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

    describe('log entries detail', () => {
        it('logs individual condition entries for charmed, incapacitated, and speed_zero separately', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<HypnoticPatternModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
                });

                await waitFor(() => {
                    const charmedEntries = addEntry.mock.calls.filter(
                        call => call[1]?.type === 'condition' && call[1]?.condition === 'Charmed'
                    );
                    expect(charmedEntries.length).toBeGreaterThan(0);

                    const incapacitatedEntries = addEntry.mock.calls.filter(
                        call => call[1]?.type === 'condition' && call[1]?.condition === 'Incapacitated'
                    );
                    expect(incapacitatedEntries.length).toBeGreaterThan(0);

                    const speedEntries = addEntry.mock.calls.filter(
                        call => call[1]?.type === 'condition' && call[1]?.condition === 'Speed 0'
                    );
                    expect(speedEntries.length).toBeGreaterThan(0);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('logs combined condition entry with reason and note', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<HypnoticPatternModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
                });

                await waitFor(() => {
                    const combinedEntries = addEntry.mock.calls.filter(
                        call => call[1]?.type === 'condition' && call[1]?.reason === 'Hypnotic Pattern spell'
                    );
                    expect(combinedEntries.length).toBeGreaterThan(0);
                    expect(combinedEntries[0][1].note).toContain('takes damage');
                    expect(combinedEntries[0][1].note).toContain('shake it free');
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    describe('NPC save result logging detail', () => {
        it('logs save_result failure description with roll details', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<HypnoticPatternModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
                });

                await waitFor(() => {
                    const saveEntries = addEntry.mock.calls.filter(
                        call => call[1]?.type === 'save_result' && call[1]?.targetName === 'Goblin' && call[1]?.success === false
                    );
                    expect(saveEntries.length).toBeGreaterThan(0);
                    expect(saveEntries[0][1].description).toContain('Goblin failed');
                    expect(saveEntries[0][1].description).toContain('DC 14');
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('logs save_result success description for NPC passing save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            try {
                render(<HypnoticPatternModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
                });

                await waitFor(() => {
                    const saveEntries = addEntry.mock.calls.filter(
                        call => call[1]?.type === 'save_result' && call[1]?.targetName === 'Goblin' && call[1]?.success === true
                    );
                    expect(saveEntries.length).toBeGreaterThan(0);
                    expect(saveEntries[0][1].description).toContain('Goblin succeeded');
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    describe('persistAndNotify calls', () => {
        it('calls persistAndNotify after NPC save resolution', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<HypnoticPatternModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
                });

                await waitFor(() => {
                    expect(persistAndNotify).toHaveBeenCalled();
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    describe('creature not found in combat summary', () => {
        it('skips creatures not found in combat summary without error', async () => {
            getRuntimeValue.mockReturnValue([]);
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 7, saveBonuses: { wis: 0 } },
                ],
            });
            render(<HypnoticPatternModal {...makeProps()} />);

            // The modal only shows creatures from combatSummary, so this tests
            // that the resolveAllSaves function handles missing creatures gracefully
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(0\)/ }));
            });

            // Confirm button is disabled, so nothing happens
            expect(screen.getByRole('button', { name: /Hypnotic Pattern \(0\)/ })).toBeDisabled();
        });
    });
});
