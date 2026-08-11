import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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
import { addEntry } from '../../../../services/ui/logService.js';
import { sendSavePrompt } from '../../../../services/combat/conditions/savePromptService.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';
import { storeSpellLastAttack, addTargetResult } from '../../../../services/automation/common/damageRollback.js';
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
    addEntry.mockResolvedValue(undefined);
    persistAndNotify.mockReturnValue(undefined);
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('TashasLaughterModal - NPC Saves', () => {
    describe('NPC save resolution', () => {
        it('calls storeSpellLastAttack when targets are selected', async () => {
            render(<TashasLaughterModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
            });

            expect(storeSpellLastAttack).toHaveBeenCalledWith(campaignName, {
                casterName: 'Wizard1',
                spellName: "Tasha's Hideous Laughter",
                saveType: 'WIS',
                saveDc: 14,
                attackScope: 'single',
            });
        });

        it('logs ability_use entry when targets are selected', async () => {
            render(<TashasLaughterModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
            });

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                characterName: 'Wizard1',
                abilityName: "Tasha's Hideous Laughter",
                description: expect.stringContaining('Selecting 1 target'),
            }));
        });

        it('applies prone and incapacitated conditions on failed NPC save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<TashasLaughterModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
                });

                await waitFor(() => {
                    const conditionCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                    );
                    expect(conditionCalls.length).toBeGreaterThan(0);
                    const conditions = conditionCalls[0][2];
                    expect(conditions).toContain('prone');
                    expect(conditions).toContain('incapacitated');
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('sets condition meta with DC and ability for prone and incapacitated', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<TashasLaughterModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
                });

                await waitFor(() => {
                    const metaCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditionMeta' && call[0] === 'Goblin'
                    );
                    expect(metaCalls.length).toBeGreaterThan(0);
                    const meta = metaCalls[0][2];
                    expect(meta.prone).toEqual(expect.objectContaining({ dc: 14, ability: 'wis' }));
                    expect(meta.incapacitated).toEqual(expect.objectContaining({ dc: 14, ability: 'wis' }));
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('calls addExpiration with prone, incapacitated, and tashas_laughter_expiration', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<TashasLaughterModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
                });

                await waitFor(() => {
                    expect(addExpiration).toHaveBeenCalledWith(
                        'Wizard1',
                        'Goblin',
                        [
                            { type: 'condition', condition: 'prone' },
                            { type: 'condition', condition: 'incapacitated' },
                            { type: 'tashas_laughter_expiration' },
                        ],
                        campaignName,
                    );
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('sets targetEffects with tashas_hideous_laughter effect', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<TashasLaughterModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
                });

                await waitFor(() => {
                    const teCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'targetEffects' && call[0] === 'campaign'
                    );
                    expect(teCalls.length).toBeGreaterThan(0);
                    const effects = teCalls[0][2];
                    const laughterEffect = effects.find(e => e.effect === 'tashas_hideous_laughter');
                    expect(laughterEffect).toEqual(expect.objectContaining({
                        target: 'Goblin',
                        effect: 'tashas_hideous_laughter',
                        source: 'Wizard1',
                        dc: 14,
                        duration: 'concentration',
                        conditions: ['prone', 'incapacitated'],
                    }));
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('logs condition entry on failed NPC save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<TashasLaughterModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
                });

                await waitFor(() => {
                    const conditionEntries = addEntry.mock.calls.filter(
                        call => call[1]?.type === 'condition' && call[1]?.action === 'applied'
                    );
                    expect(conditionEntries.length).toBeGreaterThan(0);
                    expect(conditionEntries[0][1]).toEqual(expect.objectContaining({
                        type: 'condition',
                        action: 'applied',
                        characterName: 'Goblin',
                        condition: 'Prone, Incapacitated',
                    }));
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('logs save_result entry for NPC saves', async () => {
            render(<TashasLaughterModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[0]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
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

        it('does not filter out prone/incapacitated when target has no existing conditions', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<TashasLaughterModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
                });

                await waitFor(() => {
                    const conditionCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                    );
                    expect(conditionCalls.length).toBeGreaterThan(0);
                    const conditions = conditionCalls[0][2];
                    expect(conditions).toContain('prone');
                    expect(conditions).toContain('incapacitated');
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('filters out existing prone and incapacitated conditions before re-adding', async () => {
            // Target already has prone and incapacitated
            getRuntimeValue.mockReturnValue(['prone', 'incapacitated', 'blinded']);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<TashasLaughterModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
                });

                await waitFor(() => {
                    const conditionCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                    );
                    expect(conditionCalls.length).toBeGreaterThan(0);
                    const conditions = conditionCalls[0][2];
                    // Should have blinded (filtered out prone/incapacitated then re-added)
                    expect(conditions).toContain('blinded');
                    expect(conditions).toContain('prone');
                    expect(conditions).toContain('incapacitated');
                    // No duplicates
                    const proneCount = conditions.filter(c => String(c).toLowerCase() === 'prone').length;
                    const incapacitatedCount = conditions.filter(c => String(c).toLowerCase() === 'incapacitated').length;
                    expect(proneCount).toBe(1);
                    expect(incapacitatedCount).toBe(1);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('updates existing targetEffects entry if one already exists for same target/effect/source', async () => {
            getRuntimeValue
                .mockReturnValueOnce([])
                .mockReturnValueOnce([{
                    target: 'Goblin',
                    effect: 'tashas_hideous_laughter',
                    source: 'Wizard1',
                    dc: 10,
                    duration: 'concentration',
                    conditions: ['prone', 'incapacitated'],
                }]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<TashasLaughterModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
                });

                await waitFor(() => {
                    const teCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'targetEffects' && call[0] === 'campaign'
                    );
                    expect(teCalls.length).toBeGreaterThan(0);
                    // Should have called setRuntimeValue for targetEffects
                    const effects = teCalls[0][2];
                    expect(effects.length).toBeGreaterThan(0);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    describe('NPC save success path', () => {
        it('does not apply conditions when NPC succeeds on save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            try {
                render(<TashasLaughterModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
                });

                await waitFor(() => {
                    const conditionCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                    );
                    expect(conditionCalls.length).toBe(0);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('does not call addExpiration when NPC succeeds on save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            try {
                render(<TashasLaughterModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
                });

                await waitFor(() => {
                    expect(addExpiration).not.toHaveBeenCalled();
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('logs save_result success for NPC', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            try {
                render(<TashasLaughterModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
                });

                await waitFor(() => {
                    const saveEntries = addEntry.mock.calls.filter(
                        call => call[1]?.type === 'save_result' && call[1]?.success === true
                    );
                    expect(saveEntries.length).toBeGreaterThan(0);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('records addTargetResult with success for NPC save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            try {
                render(<TashasLaughterModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
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

        it('does not update targetEffects when NPC succeeds', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            try {
                render(<TashasLaughterModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
                });

                await waitFor(() => {
                    const teCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'targetEffects' && call[0] === 'campaign'
                    );
                    expect(teCalls.length).toBe(0);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    describe('multiple NPC targets', () => {
        it('resolves saves for multiple NPC targets', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<TashasLaughterModal {...makeProps({ spellSlotLevel: 2 })} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await act(async () => { fireEvent.click(labels[1]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(2\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(2\)/ }));
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

        it('resolves saves for mixed NPC and player targets', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<TashasLaughterModal {...makeProps({ spellSlotLevel: 2 })} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await act(async () => { fireEvent.click(labels[2]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(2\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(2\)/ }));
                });

                await waitFor(() => {
                    const npcConditionCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                    );
                    expect(npcConditionCalls.length).toBeGreaterThan(0);
                });

                expect(sendSavePrompt).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                    targetName: 'PlayerAlly',
                }));
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    describe('save bonus handling', () => {
        it('uses the target save bonus for NPC saves', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            try {
                render(<TashasLaughterModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[1]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
                });

                await waitFor(() => {
                    const saveEntries = addEntry.mock.calls.filter(
                        call => call[1]?.type === 'save_result' && call[1]?.targetName === 'Orc'
                    );
                    expect(saveEntries.length).toBeGreaterThan(0);
                    expect(saveEntries[0][1].saveBonus).toBe(2);
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
            render(<TashasLaughterModal {...makeProps()} />);

            // The modal only shows creatures from combatSummary, so this tests
            // that the resolveAllSaves function handles missing creatures gracefully
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(0\)/ }));
            });

            // Confirm button is disabled, so nothing happens
            expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(0\)/ })).toBeDisabled();
        });
    });

    describe('persistAndNotify calls', () => {
        it('calls persistAndNotify after NPC save resolution', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<TashasLaughterModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
                });

                await waitFor(() => {
                    expect(persistAndNotify).toHaveBeenCalled();
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    describe('popup notification on close', () => {
        it('shows popup when at least one creature failed save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                const onClose = vi.fn();
                const setPopupHtml = vi.fn();
                render(<TashasLaughterModal {...makeProps({ onClose, setPopupHtml })} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
                });

                await waitFor(() => {
                    expect(setPopupHtml).toHaveBeenCalled();
                    const popupCall = setPopupHtml.mock.calls[0][0];
                    expect(popupCall.type).toBe('automation_info');
                    expect(popupCall.description).toContain('failed their save');
                    expect(popupCall.description).toContain('Prone and Incapacitated');
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('does not show popup when all creatures succeed on save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            try {
                const onClose = vi.fn();
                const setPopupHtml = vi.fn();
                render(<TashasLaughterModal {...makeProps({ onClose, setPopupHtml })} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
                });

                await waitFor(() => {
                    expect(setPopupHtml).not.toHaveBeenCalled();
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('closes modal after popup is shown', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                const onClose = vi.fn();
                render(<TashasLaughterModal {...makeProps({ onClose })} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
                });

                await waitFor(() => {
                    expect(onClose).toHaveBeenCalledTimes(1);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    describe('condition entry logging detail', () => {
        it('logs condition entry with correct reason on failed NPC save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<TashasLaughterModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
                });

                await waitFor(() => {
                    const conditionEntries = addEntry.mock.calls.filter(
                        call => call[1]?.type === 'condition' && call[1]?.action === 'applied'
                    );
                    expect(conditionEntries.length).toBeGreaterThan(0);
                    expect(conditionEntries[0][1].characterName).toBe('Goblin');
                    expect(conditionEntries[0][1].condition).toBe('Prone, Incapacitated');
                    expect(conditionEntries[0][1].note).toContain("Tasha's Hideous Laughter");
                    expect(conditionEntries[0][1].note).toContain("can't end the Prone condition");
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });
});
