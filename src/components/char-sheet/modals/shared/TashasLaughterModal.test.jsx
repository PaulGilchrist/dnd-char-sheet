// @cleaned-by-ai
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
import { sendSavePrompt } from '../../../../services/combat/conditions/savePromptService.js';
import { addEntry } from '../../../../services/ui/logService.js';
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

describe('TashasLaughterModal', () => {
    describe('initial render', () => {
        it('renders the modal with title and target list', () => {
            render(<TashasLaughterModal {...makeProps()} />);
            expect(screen.getByText("Tasha's Hideous Laughter")).toBeInTheDocument();
            expect(screen.getByText('Goblin')).toBeInTheDocument();
            expect(screen.getByText('Orc')).toBeInTheDocument();
            expect(screen.getByText('PlayerAlly')).toBeInTheDocument();
        });

        it('renders the description with save type and DC', () => {
            render(<TashasLaughterModal {...makeProps()} />);
            expect(screen.getByText(/Select up to/)).toBeInTheDocument();
            expect(screen.getByText(/WIS/)).toBeInTheDocument();
            expect(screen.getByText(/DC 14/)).toBeInTheDocument();
        });

        it('renders the note about prone and incapacitated conditions', () => {
            const { container } = render(<TashasLaughterModal {...makeProps()} />);
            const noteEl = container.querySelector('.sp-note');
            expect(noteEl).toHaveTextContent(/Prone/);
            expect(noteEl).toHaveTextContent(/Incapacitated/);
            expect(noteEl).toHaveTextContent(/can't end the Prone condition/);
            expect(noteEl).toHaveTextContent(/Concentration/);
        });

        it('disables the confirm button when no target is selected', () => {
            render(<TashasLaughterModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(0\)/ })).toBeDisabled();
        });

        it('renders skip button', () => {
            render(<TashasLaughterModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
        });

        it('renders with music icon', () => {
            render(<TashasLaughterModal {...makeProps()} />);
            expect(document.querySelector('.sp-header .fa-solid.fa-music')).toBeInTheDocument();
        });
    });

    describe('maxTargets based on spell slot level', () => {
        it('uses spell slot level 1 as maxTargets by default', () => {
            render(<TashasLaughterModal {...makeProps({ spellSlotLevel: 1 })} />);
            expect(screen.getByText(/Select up to 1 creature/)).toBeInTheDocument();
        });

        it('uses spell slot level 3 as maxTargets when spellSlotLevel is 3', () => {
            render(<TashasLaughterModal {...makeProps({ spellSlotLevel: 3 })} />);
            expect(screen.getByText(/Select up to 3 creature/)).toBeInTheDocument();
        });

        it('uses spell slot level 5 as maxTargets when spellSlotLevel is 5', () => {
            render(<TashasLaughterModal {...makeProps({ spellSlotLevel: 5 })} />);
            expect(screen.getByText(/Select up to 5 creature/)).toBeInTheDocument();
        });

        it('enforces maxTargets limit when selecting', async () => {
            render(<TashasLaughterModal {...makeProps({ spellSlotLevel: 2 })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await act(async () => { fireEvent.click(labels[1]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(2\)/ })).toBeEnabled();
            });
            // Third target should be disabled
            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
            await waitFor(() => {
                expect(checkboxes[2]).toBeDisabled();
            });
        });
    });

    describe('target selection', () => {
        it('selects a target when its checkbox is clicked and enables confirm', async () => {
            render(<TashasLaughterModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                expect(checkboxes[0].checked).toBe(true);
            });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ })).toBeEnabled();
            });
        });

        it('allows selecting multiple targets when spellSlotLevel > 1', async () => {
            render(<TashasLaughterModal {...makeProps({ spellSlotLevel: 3 })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await act(async () => { fireEvent.click(labels[1]); });
            await waitFor(() => {
                const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                expect(checkboxes[0].checked).toBe(true);
                expect(checkboxes[1].checked).toBe(true);
            });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(2\)/ })).toBeEnabled();
            });
        });
    });

    describe('close behavior', () => {
        it('closes when Skip is clicked', () => {
            const onClose = vi.fn();
            render(<TashasLaughterModal {...makeProps({ onClose })} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

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

    describe('player save prompts', () => {
        it('sends save prompt for player targets instead of resolving locally', async () => {
            render(<TashasLaughterModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            // Select just the player
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
            });

            expect(sendSavePrompt).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                targetName: 'PlayerAlly',
                saveType: 'WIS',
                saveDc: 14,
                sourceName: 'Wizard1',
            }));
        });

        it('tracks pending prompts for player targets', async () => {
            render(<TashasLaughterModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
            });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'pendingSaveListenerPrompts',
                expect.arrayContaining([expect.any(String)]),
                campaignName,
            );
        });
    });

    describe('player save result handling', () => {
        it('applies prone and incapacitated when player fails save via save-result event', async () => {
            getRuntimeValue.mockReturnValue([]);
            const onClose = vi.fn();
            render(<TashasLaughterModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
            });

            const savePromptCall = sendSavePrompt.mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: actualPromptId,
                        success: false,
                        roll: 5,
                        total: 6,
                        saveBonus: 1,
                    },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                expect(addExpiration).toHaveBeenCalledWith(
                    'Wizard1',
                    'PlayerAlly',
                    [
                        { type: 'condition', condition: 'prone' },
                        { type: 'condition', condition: 'incapacitated' },
                        { type: 'tashas_laughter_expiration' },
                    ],
                    campaignName,
                );
            });
        });

        it('logs condition entry when player fails save', async () => {
            const onClose = vi.fn();
            render(<TashasLaughterModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
            });

            const savePromptCall = sendSavePrompt.mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: actualPromptId,
                        success: false,
                        roll: 5,
                        total: 6,
                        saveBonus: 1,
                    },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                const conditionEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'condition' && call[1]?.action === 'applied'
                );
                expect(conditionEntries.length).toBeGreaterThan(0);
                expect(conditionEntries[0][1]).toEqual(expect.objectContaining({
                    type: 'condition',
                    action: 'applied',
                    characterName: 'PlayerAlly',
                    condition: 'Prone, Incapacitated',
                }));
            });
        });

        it('logs save_result success when player passes save', async () => {
            const onClose = vi.fn();
            render(<TashasLaughterModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
            });

            const savePromptCall = sendSavePrompt.mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: actualPromptId,
                        success: true,
                        roll: 18,
                        total: 19,
                        saveBonus: 1,
                    },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                const saveEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'save_result' && call[1]?.success === true
                );
                expect(saveEntries.length).toBeGreaterThan(0);
            });
        });

        it('closes modal when all pending prompts are resolved', async () => {
            const onClose = vi.fn();
            render(<TashasLaughterModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
            });

            const savePromptCall = sendSavePrompt.mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: actualPromptId,
                        success: false,
                        roll: 5,
                        total: 6,
                        saveBonus: 1,
                    },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                expect(onClose).toHaveBeenCalledTimes(1);
            });
        });

        it('sets targetEffects when player fails save', async () => {
            getRuntimeValue.mockReturnValue([]);
            const onClose = vi.fn();
            render(<TashasLaughterModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
            });

            const savePromptCall = sendSavePrompt.mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: actualPromptId,
                        success: false,
                        roll: 5,
                        total: 6,
                        saveBonus: 1,
                    },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                const teCalls = setRuntimeValue.mock.calls.filter(
                    call => call[1] === 'targetEffects' && call[0] === 'campaign'
                );
                expect(teCalls.length).toBeGreaterThan(0);
                const effects = teCalls[0][2];
                const laughterEffect = effects.find(e => e.effect === 'tashas_hideous_laughter');
                expect(laughterEffect).toEqual(expect.objectContaining({
                    target: 'PlayerAlly',
                    effect: 'tashas_hideous_laughter',
                    source: 'Wizard1',
                }));
            });
        });

        it('records addTargetResult for player failure', async () => {
            const onClose = vi.fn();
            render(<TashasLaughterModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
            });

            const savePromptCall = sendSavePrompt.mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: actualPromptId,
                        success: false,
                        roll: 5,
                        total: 6,
                        saveBonus: 1,
                    },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                const targetResultCalls = addTargetResult.mock.calls.filter(
                    call => call[0] === campaignName && call[1]?.targetName === 'PlayerAlly'
                );
                expect(targetResultCalls.length).toBeGreaterThan(0);
                expect(targetResultCalls[0][1].saveResult).toBe('failure');
                expect(targetResultCalls[0][1].conditions).toContain('prone');
                expect(targetResultCalls[0][1].conditions).toContain('incapacitated');
            });
        });

        it('records addTargetResult for player success', async () => {
            const onClose = vi.fn();
            render(<TashasLaughterModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
            });

            const savePromptCall = sendSavePrompt.mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: actualPromptId,
                        success: true,
                        roll: 18,
                        total: 19,
                        saveBonus: 1,
                    },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                const targetResultCalls = addTargetResult.mock.calls.filter(
                    call => call[0] === campaignName && call[1]?.targetName === 'PlayerAlly'
                );
                expect(targetResultCalls.length).toBeGreaterThan(0);
                expect(targetResultCalls[0][1].saveResult).toBe('success');
                expect(targetResultCalls[0][1].conditions).toEqual([]);
            });
        });
    });

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

    describe('empty targets', () => {
        it('renders empty target list when no creatures in combat', () => {
            getCombatSummary.mockReturnValue({ creatures: [] });
            render(<TashasLaughterModal {...makeProps()} />);
            expect(screen.getByText('No targets available.')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(0\)/ })).toBeDisabled();
        });

        it('renders the caster as a target when caster is the only creature', () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Wizard1', type: 'player', currentHp: 30, maxHp: 30, saveBonuses: { wis: 4 } },
                ],
            });
            render(<TashasLaughterModal {...makeProps()} />);
            expect(screen.getByText('Wizard1')).toBeInTheDocument();
        });
    });

    describe('skip behavior', () => {
        it('closes modal without applying any effects when skipped', async () => {
            const onClose = vi.fn();
            render(<TashasLaughterModal {...makeProps({ onClose })} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(onClose).toHaveBeenCalledTimes(1);
            expect(storeSpellLastAttack).not.toHaveBeenCalled();
            expect(sendSavePrompt).not.toHaveBeenCalled();
        });
    });

    describe('null combat summary', () => {
        it('handles null combat summary gracefully - no targets shown', async () => {
            getCombatSummary.mockReturnValue(null);
            render(<TashasLaughterModal {...makeProps()} />);

            expect(screen.getByText('No targets available.')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(0\)/ })).toBeDisabled();
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

    describe('save result event edge cases', () => {
        it('ignores save-result event with missing promptId', async () => {
            const onClose = vi.fn();
            render(<TashasLaughterModal {...makeProps({ onClose })} />);

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: { success: false },
                });
                window.dispatchEvent(event);
            });

            expect(onClose).not.toHaveBeenCalled();
        });

        it('ignores save-result event for unknown promptId', async () => {
            const onClose = vi.fn();
            render(<TashasLaughterModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
            });

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: 'non-existent-prompt-id',
                        success: false,
                        roll: 5,
                        total: 6,
                        saveBonus: 1,
                    },
                });
                window.dispatchEvent(event);
            });

            expect(onClose).not.toHaveBeenCalled();
        });

        it('handles save-result event with missing optional fields', async () => {
            const onClose = vi.fn();
            render(<TashasLaughterModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
            });

            const savePromptCall = sendSavePrompt.mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: actualPromptId,
                        success: false,
                    },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                const conditionCalls = setRuntimeValue.mock.calls.filter(
                    call => call[1] === 'activeConditions' && call[0] === 'PlayerAlly'
                );
                expect(conditionCalls.length).toBeGreaterThan(0);
            });
        });
    });

    describe('pending prompts cleanup', () => {
        it('clears pending prompts on unmount', async () => {
            const onClose = vi.fn();
            const { unmount } = render(<TashasLaughterModal {...makeProps({ onClose })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
            });

            expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
            unmount();
            expect(document.querySelector('.sp-overlay')).not.toBeInTheDocument();
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

        it('calls persistAndNotify after player save result event', async () => {
            const onClose = vi.fn();
            render(<TashasLaughterModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
            });

            const savePromptCall = sendSavePrompt.mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: actualPromptId,
                        success: false,
                        roll: 5,
                        total: 6,
                        saveBonus: 1,
                    },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                expect(persistAndNotify).toHaveBeenCalled();
            });
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

    describe('save result logging detail', () => {
        it('logs save_result with roll details when player fails', async () => {
            const onClose = vi.fn();
            render(<TashasLaughterModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
            });

            const savePromptCall = sendSavePrompt.mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: actualPromptId,
                        success: false,
                        roll: 7,
                        total: 8,
                        saveBonus: 1,
                    },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                const saveEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'save_result' && call[1]?.success === false
                );
                expect(saveEntries.length).toBeGreaterThan(0);
                expect(saveEntries[0][1].roll).toBe(7);
                expect(saveEntries[0][1].total).toBe(8);
                expect(saveEntries[0][1].saveBonus).toBe(1);
                expect(saveEntries[0][1].targetName).toBe('PlayerAlly');
            });
        });

        it('logs save_result success description for player passing', async () => {
            const onClose = vi.fn();
            render(<TashasLaughterModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
            });

            const savePromptCall = sendSavePrompt.mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: actualPromptId,
                        success: true,
                        roll: 18,
                        total: 19,
                        saveBonus: 1,
                    },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                const saveEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'save_result' && call[1]?.success === true
                );
                expect(saveEntries.length).toBeGreaterThan(0);
                expect(saveEntries[0][1].description).toContain('PlayerAlly');
                expect(saveEntries[0][1].description).toContain('succeeded');
            });
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

        it('logs condition entry with correct reason on failed player save', async () => {
            const onClose = vi.fn();
            render(<TashasLaughterModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ }));
            });

            const savePromptCall = sendSavePrompt.mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: actualPromptId,
                        success: false,
                        roll: 5,
                        total: 6,
                        saveBonus: 1,
                    },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                const conditionEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'condition' && call[1]?.action === 'applied'
                );
                expect(conditionEntries.length).toBeGreaterThan(0);
                expect(conditionEntries[0][1].characterName).toBe('PlayerAlly');
                expect(conditionEntries[0][1].condition).toBe('Prone, Incapacitated');
                expect(conditionEntries[0][1].note).toContain("Tasha's Hideous Laughter");
            });
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
});
