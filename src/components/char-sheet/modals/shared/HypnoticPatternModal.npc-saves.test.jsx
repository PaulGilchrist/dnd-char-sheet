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
    addTargetResult: vi.fn(),
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
import { storeSpellLastAttack, addTargetResult } from '../../../../services/automation/common/damageRollback.js';
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

function selectAndConfirm(targetIndex, targetCount) {
    const labels = document.querySelectorAll('.secondary-target-row');
    fireEvent.click(labels[targetIndex]);
    return act(async () => {
        fireEvent.click(screen.getByRole('button', { name: new RegExp(`Hypnotic Pattern \\(${targetCount}\\)`) }));
    });
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

describe('HypnoticPatternModal - NPC Saves', () => {
    describe('initial setup', () => {
        it('calls storeSpellLastAttack with correct parameters when targets are selected', async () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            await selectAndConfirm(0, 1);

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
            await selectAndConfirm(0, 1);

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                characterName: 'Wizard1',
                abilityName: 'Hypnotic Pattern',
                description: expect.stringContaining('Selecting 1 target'),
            }));
        });
    });

    describe('NPC save resolution', () => {
        function setupNpcSave() {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            render(<HypnoticPatternModal {...makeProps()} />);
            return selectAndConfirm(0, 1);
        }

        it('applies charmed, incapacitated, and speed_zero conditions on failed NPC save', async () => {
            await setupNpcSave();

            await waitFor(() => {
                const conditionCalls = setRuntimeValue.mock.calls.filter(
                    call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                );
                expect(conditionCalls.length).toBeGreaterThan(0);
                expect(conditionCalls[0][2]).toContain('charmed');
                expect(conditionCalls[0][2]).toContain('incapacitated');
                expect(conditionCalls[0][2]).toContain('speed_zero');
            });
        });

        it('calls addExpiration with all three conditions', async () => {
            await setupNpcSave();

            await waitFor(() => {
                expect(addExpiration).toHaveBeenCalledWith(
                    'Wizard1',
                    'Goblin',
                    [
                        { type: 'charmed', condition: 'charmed' },
                        { type: 'incapacitated', condition: 'incapacitated' },
                        { type: 'speed_zero', condition: 'speed_zero' },
                    ],
                    campaignName,
                );
            });
        });

        it('logs individual condition entries for charmed, incapacitated, and speed_zero', async () => {
            await setupNpcSave();

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
        });

        it('logs combined condition entry with reason and note', async () => {
            await setupNpcSave();

            await waitFor(() => {
                const combinedEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'condition' && call[1]?.reason === 'Hypnotic Pattern spell'
                );
                expect(combinedEntries.length).toBeGreaterThan(0);
                expect(combinedEntries[0][1]).toEqual(expect.objectContaining({
                    type: 'condition',
                    action: 'applied',
                    characterName: 'Goblin',
                    condition: 'Charmed, Incapacitated, Speed 0',
                    reason: 'Hypnotic Pattern spell',
                }));
                expect(combinedEntries[0][1].note).toContain('takes damage');
                expect(combinedEntries[0][1].note).toContain('shake it free');
            });
        });

        it('logs save_result failure entry with roll details', async () => {
            await setupNpcSave();

            await waitFor(() => {
                const saveEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'save_result' && call[1]?.targetName === 'Goblin' && call[1]?.success === false
                );
                expect(saveEntries.length).toBeGreaterThan(0);
                expect(saveEntries[0][1]).toEqual(expect.objectContaining({
                    type: 'save_result',
                    saveType: 'WIS',
                    saveDc: 14,
                    targetName: 'Goblin',
                    success: false,
                    description: expect.stringContaining('Goblin failed'),
                }));
            });
        });

        it('records addTargetResult with failure and conditions', async () => {
            await setupNpcSave();

            await waitFor(() => {
                const targetResultCalls = addTargetResult.mock.calls.filter(
                    call => call[0] === campaignName && call[1]?.targetName === 'Goblin'
                );
                expect(targetResultCalls.length).toBe(1);
                expect(targetResultCalls[0][1]).toEqual(expect.objectContaining({
                    saveResult: 'failure',
                    conditions: ['charmed', 'incapacitated', 'speed_zero'],
                }));
            });
        });
    });

    describe('successful NPC save without metamagic', () => {
        it('does not apply conditions when NPC passes save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.99);

            render(<HypnoticPatternModal {...makeProps()} />);
            await selectAndConfirm(0, 1);

            await waitFor(() => {
                const conditionCalls = setRuntimeValue.mock.calls.filter(
                    call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                );
                expect(conditionCalls.length).toBe(0);
            });
        });

        it('logs save_result success entry for passing NPC', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.99);

            render(<HypnoticPatternModal {...makeProps()} />);
            await selectAndConfirm(0, 1);

            await waitFor(() => {
                const saveEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'save_result' && call[1]?.targetName === 'Goblin' && call[1]?.success === true
                );
                expect(saveEntries.length).toBe(1);
                expect(saveEntries[0][1]).toEqual(expect.objectContaining({
                    type: 'save_result',
                    targetName: 'Goblin',
                    success: true,
                    description: expect.stringContaining('Goblin succeeded'),
                }));
            });
        });

        it('records addTargetResult with success and empty conditions', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.99);

            render(<HypnoticPatternModal {...makeProps()} />);
            await selectAndConfirm(0, 1);

            await waitFor(() => {
                const targetResultCalls = addTargetResult.mock.calls.filter(
                    call => call[0] === campaignName && call[1]?.targetName === 'Goblin'
                );
                expect(targetResultCalls.length).toBe(1);
                expect(targetResultCalls[0][1]).toEqual(expect.objectContaining({
                    saveResult: 'success',
                    conditions: [],
                }));
            });
        });
    });

    describe('multiple targets', () => {
        it('applies conditions to all selected NPC targets', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);

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
                const goblinConditions = setRuntimeValue.mock.calls.filter(
                    call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                );
                expect(goblinConditions.length).toBeGreaterThan(0);
                expect(goblinConditions[0][2]).toContain('charmed');

                const orcConditions = setRuntimeValue.mock.calls.filter(
                    call => call[1] === 'activeConditions' && call[0] === 'Orc'
                );
                expect(orcConditions.length).toBeGreaterThan(0);
                expect(orcConditions[0][2]).toContain('charmed');
            });
        });

        it('records targetResult for all selected NPC targets', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);

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
                const goblinResults = addTargetResult.mock.calls.filter(
                    call => call[0] === campaignName && call[1]?.targetName === 'Goblin'
                );
                expect(goblinResults.length).toBe(1);
                expect(goblinResults[0][1].saveResult).toBe('failure');

                const orcResults = addTargetResult.mock.calls.filter(
                    call => call[0] === campaignName && call[1]?.targetName === 'Orc'
                );
                expect(orcResults.length).toBe(1);
                expect(orcResults[0][1].saveResult).toBe('failure');
            });
        });
    });

    describe('persistAndNotify', () => {
        it('calls persistAndNotify after NPC save resolution', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);

            render(<HypnoticPatternModal {...makeProps()} />);
            await selectAndConfirm(0, 1);

            await waitFor(() => {
                expect(persistAndNotify).toHaveBeenCalled();
            });
        });
    });

    describe('creature not found in combat summary', () => {
        it('does not apply conditions when confirm button shows zero targets', async () => {
            getRuntimeValue.mockReturnValue([]);
            getCombatSummary.mockReturnValue({ creatures: [] });

            render(<HypnoticPatternModal {...makeProps()} />);
            const confirmButton = screen.getByRole('button', { name: /Hypnotic Pattern \(0\)/ });
            expect(confirmButton).toBeDisabled();
        });
    });
});
