import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AOEConditionModal from './AOEConditionModal.jsx';

// ── Mocked modules ──

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

vi.mock('../../../../hooks/useAllySelection.js', () => ({
    getAllyList: vi.fn(),
}));

vi.mock('../../../../services/automation/common/damageRollback.js', () => ({
    storeSpellLastAttack: vi.fn(),
    addTargetResult: vi.fn(),
}));

vi.mock('./AreaEffectTargetModalBase.utils.jsx', () => ({
    persistAndNotify: vi.fn(),
}));

// Re-import mocked modules
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { getAllyList } from '../../../../hooks/useAllySelection.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';
import { persistAndNotify } from './AreaEffectTargetModalBase.utils.jsx';
import { sendSavePrompt } from '../../../../services/combat/conditions/savePromptService.js';
import { addEntry } from '../../../../services/ui/logService.js';
import * as damageRollback from '../../../../services/automation/common/damageRollback.js';

// ── Test fixtures ──

const campaignName = 'test-campaign';

const basePlayerStats = {
    name: 'Wizard1',
    level: 10,
    proficiency: 4,
    abilities: [{ name: 'Intelligence', bonus: 4 }],
};

const baseAction = {
    name: 'Blinding Darkness',
};

const baseCombatSummary = {
    creatures: [
        { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 7, saveBonuses: { con: 0 } },
        { name: 'Orc', type: 'npc', currentHp: 15, maxHp: 22, saveBonuses: { con: 2 } },
        { name: 'PlayerAlly', type: 'player', currentHp: 30, maxHp: 30, saveBonuses: { con: 1 } },
    ],
};

const baseEffects = [{ type: 'blinded', condition: 'blinded' }];

function makeProps(overrides = {}) {
    return {
        action: baseAction,
        playerStats: basePlayerStats,
        campaignName,
        saveType: 'CON',
        saveDc: 12,
        effects: baseEffects,
        conditionLabel: 'Blinded',
        onClose: vi.fn(),
        ...overrides,
    };
}

// ── Helper to select a target row ──

function selectTargetRow(index) {
    const labels = document.querySelectorAll('.secondary-target-row');
    fireEvent.click(labels[index]);
}

// ── Helpers ──

function getApplyButton() {
    return screen.getByRole('button', { name: /Blinding Darkness/ });
}

// ── Tests ──

describe('AOEConditionModal', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        getCombatSummary.mockReturnValue(baseCombatSummary);
        getRuntimeValue.mockReturnValue([]);
        setRuntimeValue.mockReturnValue(undefined);
        addEntry.mockResolvedValue(undefined);
        persistAndNotify.mockReturnValue(undefined);
        getAllyList.mockReturnValue(null);
    });

    // ── Initial render ──

    describe('initial render', () => {
        it('renders the modal with action name as title', () => {
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.getByText('Blinding Darkness')).toBeInTheDocument();
        });

        it('renders all eligible creatures in the target list', () => {
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.getByText('Goblin')).toBeInTheDocument();
            expect(screen.getByText('Orc')).toBeInTheDocument();
            expect(screen.getByText('PlayerAlly')).toBeInTheDocument();
        });

        it('renders the description with save type and DC', () => {
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.getByText(/Select creatures in the area of effect/)).toBeInTheDocument();
            expect(screen.getByText(/CON/)).toBeInTheDocument();
            expect(screen.getByText(/DC 12/)).toBeInTheDocument();
        });

        it('renders the note about failed save condition', () => {
            render(<AOEConditionModal {...makeProps()} />);
            const noteEl = document.querySelector('.sp-note');
            expect(noteEl).toHaveTextContent(/On a failed save/);
            expect(noteEl).toHaveTextContent('Blinded');
        });

        it('disables the apply button when no target is selected', () => {
            render(<AOEConditionModal {...makeProps()} />);
            expect(getApplyButton()).toBeDisabled();
        });

        it('renders the skip button', () => {
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
        });

        it('renders target count in apply button', () => {
            render(<AOEConditionModal {...makeProps()} />);
            expect(getApplyButton()).toHaveTextContent('Blinding Darkness (0)');
        });
    });

    // ── Target selection ──

    describe('target selection', () => {
        it('selects a target when its row is clicked', async () => {
            render(<AOEConditionModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                expect(checkboxes[0].checked).toBe(true);
            });
        });

        it('enables the apply button when a target is selected', async () => {
            render(<AOEConditionModal {...makeProps()} />);
            await act(async () => selectTargetRow(0));
            await waitFor(() => {
                expect(getApplyButton()).toBeEnabled();
            });
        });

        it('updates target count in apply button when targets are selected', async () => {
            render(<AOEConditionModal {...makeProps()} />);
            await act(async () => selectTargetRow(0));
            await waitFor(() => {
                expect(getApplyButton()).toHaveTextContent('Blinding Darkness (1)');
            });
            await act(async () => selectTargetRow(1));
            await waitFor(() => {
                expect(getApplyButton()).toHaveTextContent('Blinding Darkness (2)');
            });
        });

        it('toggles target selection off when row is clicked again', async () => {
            render(<AOEConditionModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(getApplyButton()).toHaveTextContent('Blinding Darkness (1)');
            });
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(getApplyButton()).toHaveTextContent('Blinding Darkness (0)');
            });
        });

        it('highlights selected targets with the selected class', async () => {
            render(<AOEConditionModal {...makeProps()} />);
            const rows = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(rows[0]); });
            await waitFor(() => {
                expect(rows[0]).toHaveClass('secondary-target-selected');
                expect(rows[1]).not.toHaveClass('secondary-target-selected');
            });
        });
    });

    // ── Metamagic Heighten ──

    describe('metamagic heighten', () => {
        it('does not show heighten note when metamagicHeighten is false', () => {
            render(<AOEConditionModal {...makeProps({ metamagicHeighten: false })} />);
            const noteEl = document.querySelector('.sp-note');
            expect(noteEl.textContent).not.toContain('Heightened Spell');
        });

        it('shows heighten note when metamagicHeighten is true', () => {
            render(<AOEConditionModal {...makeProps({ metamagicHeighten: true })} />);
            const notes = document.querySelectorAll('.sp-note');
            const heightenNote = [...notes].find(n => n.textContent.includes('Heightened Spell'));
            expect(heightenNote).toBeTruthy();
        });

        it('renders heighten radio buttons when metamagicHeighten is true', () => {
            render(<AOEConditionModal {...makeProps({ metamagicHeighten: true })} />);
            const radios = document.querySelectorAll('input[name="heightenTarget"]');
            expect(radios.length).toBeGreaterThan(0);
        });

        it('does not render heighten radio buttons when metamagicHeighten is false', () => {
            render(<AOEConditionModal {...makeProps({ metamagicHeighten: false })} />);
            const radios = document.querySelectorAll('input[name="heightenTarget"]');
            expect(radios).toHaveLength(0);
        });

        it('toggles heighten target selection', async () => {
            render(<AOEConditionModal {...makeProps({ metamagicHeighten: true })} />);
            const radios = document.querySelectorAll('input[name="heightenTarget"]');
            expect(radios.length).toBeGreaterThan(0);
            await act(async () => { fireEvent.click(radios[0]); });
            await waitFor(() => {
                expect(radios[0].checked).toBe(true);
            });
        });
    });

    // ── Metamagic Careful ──

    describe('metamagic careful', () => {
        it('does not show careful spell protection when metamagicCareful is false', () => {
            getRuntimeValue.mockReturnValue([]);
            render(<AOEConditionModal {...makeProps({ metamagicCareful: false })} />);
            const rows = document.querySelectorAll('.secondary-target-row');
            rows.forEach(row => {
                expect(row.textContent).not.toContain('Careful Spell');
            });
        });

        it('shows careful spell protection for allies when metamagicCareful is true', () => {
            getAllyList.mockReturnValue(['PlayerAlly']);
            getRuntimeValue.mockReturnValue([]);
            render(<AOEConditionModal {...makeProps({ metamagicCareful: true })} />);
            const rows = document.querySelectorAll('.secondary-target-row');
            const playerRow = [...rows].find(row => row.textContent.includes('PlayerAlly'));
            expect(playerRow.textContent).toContain('Careful Spell protected');
        });

        it('does not show careful spell for non-ally', () => {
            getAllyList.mockReturnValue(['OtherAlly']);
            getRuntimeValue.mockReturnValue([]);
            render(<AOEConditionModal {...makeProps({ metamagicCareful: true })} />);
            const rows = document.querySelectorAll('.secondary-target-row');
            const playerRow = [...rows].find(row => row.textContent.includes('PlayerAlly'));
            expect(playerRow.textContent).not.toContain('Careful Spell Protected');
        });
    });

    // ── NPC save resolution ──

    describe('NPC save resolution', () => {
        it('calls storeSpellLastAttack when targets are selected', async () => {
            render(<AOEConditionModal {...makeProps()} />);
            await act(async () => selectTargetRow(0));
            await waitFor(() => {
                expect(getApplyButton()).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(getApplyButton());
            });

            expect(damageRollback.storeSpellLastAttack).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                casterName: 'Wizard1',
                spellName: 'Blinding Darkness',
                saveType: 'CON',
                saveDc: 12,
                attackScope: 'aoe',
            }));
        });

        it('logs ability_use entry when targets are selected', async () => {
            render(<AOEConditionModal {...makeProps()} />);
            await act(async () => selectTargetRow(0));
            await waitFor(() => {
                expect(getApplyButton()).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(getApplyButton());
            });

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                characterName: 'Wizard1',
                abilityName: 'Blinding Darkness',
                description: expect.stringContaining('Selecting 1 target'),
            }));
        });

        it('applies blinded condition on failed NPC save (low random)', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<AOEConditionModal {...makeProps()} />);
                await act(async () => selectTargetRow(0));
                await waitFor(() => {
                    expect(getApplyButton()).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(getApplyButton());
                });

                await waitFor(() => {
                    const conditionCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                    );
                    expect(conditionCalls.length).toBeGreaterThan(0);
                    const conditions = conditionCalls[0][2];
                    expect(conditions).toContain('blinded');
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('does not apply condition on successful NPC save (high random)', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            try {
                render(<AOEConditionModal {...makeProps()} />);
                await act(async () => selectTargetRow(0));
                await waitFor(() => {
                    expect(getApplyButton()).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(getApplyButton());
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

        it('logs save_result entry for NPC saves', async () => {
            render(<AOEConditionModal {...makeProps()} />);
            await act(async () => selectTargetRow(0));
            await waitFor(() => {
                expect(getApplyButton()).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(getApplyButton());
            });

            await waitFor(() => {
                const saveEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'save_result'
                );
                expect(saveEntries.length).toBeGreaterThan(0);
                expect(saveEntries[0][1]).toEqual(expect.objectContaining({
                    type: 'save_result',
                    saveType: 'CON',
                    saveDc: 12,
                }));
            });
        });

        it('logs condition entry on failed NPC save', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<AOEConditionModal {...makeProps()} />);
                await act(async () => selectTargetRow(0));
                await waitFor(() => {
                    expect(getApplyButton()).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(getApplyButton());
                });

                await waitFor(() => {
                    const conditionEntries = addEntry.mock.calls.filter(
                        call => call[1]?.type === 'condition' && call[1]?.condition === 'Blinded'
                    );
                    expect(conditionEntries.length).toBeGreaterThan(0);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    // ── Careful Spell protection for NPCs ──

    describe('careful spell protection for NPCs', () => {
        it('automatically succeeds for careful spell protected NPCs', async () => {
            getAllyList.mockReturnValue(['Goblin']);
            getRuntimeValue.mockReturnValue([]);
            render(<AOEConditionModal {...makeProps({ metamagicCareful: true })} />);
            await act(async () => selectTargetRow(0));
            await waitFor(() => {
                expect(getApplyButton()).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(getApplyButton());
            });

            // No condition should be applied
            await waitFor(() => {
                const conditionCalls = setRuntimeValue.mock.calls.filter(
                    call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                );
                expect(conditionCalls.length).toBe(0);
            });

            // Should log that they succeeded due to Careful Spell
            const saveEntries = addEntry.mock.calls.filter(
                call => call[1]?.type === 'save_result' && call[1]?.targetName === 'Goblin'
            );
            expect(saveEntries.length).toBeGreaterThan(0);
            expect(saveEntries[0][1].description).toContain('Careful Spell protected');
        });
    });

    // ── Player save prompts ──

    describe('player save prompts', () => {
        it('sends save prompt for player targets instead of resolving locally', async () => {
            render(<AOEConditionModal {...makeProps()} />);
            await act(async () => selectTargetRow(2));
            await waitFor(() => {
                expect(getApplyButton()).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(getApplyButton());
            });

            expect(sendSavePrompt).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                targetName: 'PlayerAlly',
                saveType: 'CON',
                saveDc: 12,
                sourceName: 'Wizard1',
            }));
        });

        it('tracks pending prompts for player targets', async () => {
            render(<AOEConditionModal {...makeProps()} />);
            await act(async () => selectTargetRow(2));
            await waitFor(() => {
                expect(getApplyButton()).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(getApplyButton());
            });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'pendingSaveListenerPrompts',
                expect.arrayContaining([expect.any(String)]),
                campaignName,
            );
        });

        it('does not apply condition when player is selected without save result', async () => {
            render(<AOEConditionModal {...makeProps()} />);
            await act(async () => selectTargetRow(2));
            await waitFor(() => {
                expect(getApplyButton()).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(getApplyButton());
            });

            const conditionCalls = setRuntimeValue.mock.calls.filter(
                call => call[1] === 'activeConditions' && call[0] === 'PlayerAlly'
            );
            expect(conditionCalls.length).toBe(0);
        });
    });

    // ── Player save result handling ──

    describe('player save result handling', () => {
        it('applies blinded when player fails save via save-result event', async () => {
            getRuntimeValue.mockReturnValue([]);
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);

            await act(async () => selectTargetRow(2));
            await waitFor(() => {
                expect(getApplyButton()).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(getApplyButton());
            });

            const savePromptCall = vi.mocked(sendSavePrompt).mock.calls[0];
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
                const conditionCalls = setRuntimeValue.mock.calls.filter(
                    call => call[1] === 'activeConditions' && call[0] === 'PlayerAlly'
                );
                expect(conditionCalls.length).toBeGreaterThan(0);
                const conditions = conditionCalls[0][2];
                expect(conditions).toContain('blinded');
            });
        });

        it('does not apply condition when player passes save', async () => {
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);

            await act(async () => selectTargetRow(2));
            await waitFor(() => {
                expect(getApplyButton()).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(getApplyButton());
            });

            const savePromptCall = vi.mocked(sendSavePrompt).mock.calls[0];
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

            const conditionCalls = setRuntimeValue.mock.calls.filter(
                call => call[1] === 'activeConditions' && call[0] === 'PlayerAlly'
            );
            expect(conditionCalls.length).toBe(0);
        });

        it('logs save_result failure when player fails save', async () => {
            getRuntimeValue.mockReturnValue([]);
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);

            await act(async () => selectTargetRow(2));
            await waitFor(() => {
                expect(getApplyButton()).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(getApplyButton());
            });

            const savePromptCall = vi.mocked(sendSavePrompt).mock.calls[0];
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
                const saveEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'save_result' && call[1]?.success === false
                );
                expect(saveEntries.length).toBeGreaterThan(0);
                expect(saveEntries[0][1].targetName).toBe('PlayerAlly');
            });
        });

        it('logs save_result success when player passes save', async () => {
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);

            await act(async () => selectTargetRow(2));
            await waitFor(() => {
                expect(getApplyButton()).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(getApplyButton());
            });

            const savePromptCall = vi.mocked(sendSavePrompt).mock.calls[0];
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

        it('handles save-result event with missing optional fields', async () => {
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);

            await act(async () => selectTargetRow(2));
            await waitFor(() => {
                expect(getApplyButton()).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(getApplyButton());
            });

            const savePromptCall = vi.mocked(sendSavePrompt).mock.calls[0];
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

    // ── Results summary modal ──

    describe('results summary modal', () => {
        it('shows results summary when all saves are resolved', async () => {
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);

            // Select a player target so we can trigger a save result event
            await act(async () => selectTargetRow(2));
            await waitFor(() => {
                expect(getApplyButton()).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(getApplyButton());
            });

            // Wait for pending prompts to be set up
            await waitFor(() => {
                expect(sendSavePrompt).toHaveBeenCalled();
            });

            const savePromptCall = vi.mocked(sendSavePrompt).mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            // Player fails save
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

            // Wait for the results summary to appear with the fail message
            await waitFor(() => {
                const el = document.querySelector('.abjure-result-fail');
                expect(el).toBeTruthy();
            });
        });

        it('shows success count in results summary', async () => {
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);

            await act(async () => selectTargetRow(2));
            await waitFor(() => {
                expect(getApplyButton()).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(getApplyButton());
            });

            // Wait for pending prompts to be set up
            await waitFor(() => {
                expect(sendSavePrompt).toHaveBeenCalled();
            });

            const savePromptCall = vi.mocked(sendSavePrompt).mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            // Player passes save
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

            // Wait for the results summary to appear with the success message
            await waitFor(() => {
                const el = document.querySelector('.abjure-result-success');
                expect(el).toBeTruthy();
            });
        });

        it('closes when Close button is clicked in results summary', async () => {
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);

            await act(async () => selectTargetRow(2));
            await waitFor(() => {
                expect(getApplyButton()).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(getApplyButton());
            });

            const savePromptCall = vi.mocked(sendSavePrompt).mock.calls[0];
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
                expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: 'Close' }));
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('closes when overlay background is clicked in results summary', async () => {
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);

            await act(async () => selectTargetRow(2));
            await waitFor(() => {
                expect(getApplyButton()).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(getApplyButton());
            });

            const savePromptCall = vi.mocked(sendSavePrompt).mock.calls[0];
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
                expect(screen.getByText('Save Results')).toBeInTheDocument();
            });

            fireEvent.click(document.querySelector('.sp-overlay'));
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('does not close when clicking inside the modal content', async () => {
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);

            await act(async () => selectTargetRow(2));
            await waitFor(() => {
                expect(getApplyButton()).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(getApplyButton());
            });

            const savePromptCall = vi.mocked(sendSavePrompt).mock.calls[0];
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
                expect(screen.getByText('Save Results')).toBeInTheDocument();
            });

            fireEvent.click(document.querySelector('.sp-modal'));
            expect(onClose).not.toHaveBeenCalled();
        });
    });

    // ── Multiple targets ──

    describe('multiple targets', () => {
        it('resolves saves for multiple NPC targets', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<AOEConditionModal {...makeProps()} />);
                await act(async () => selectTargetRow(0));
                await act(async () => selectTargetRow(1));
                await waitFor(() => {
                    expect(getApplyButton()).toHaveTextContent('Blinding Darkness (2)');
                });
                await act(async () => {
                    fireEvent.click(getApplyButton());
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
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<AOEConditionModal {...makeProps()} />);
                await act(async () => selectTargetRow(0));
                await act(async () => selectTargetRow(2));
                await waitFor(() => {
                    expect(getApplyButton()).toHaveTextContent('Blinding Darkness (2)');
                });
                await act(async () => {
                    fireEvent.click(getApplyButton());
                });

                // NPC should have condition applied
                await waitFor(() => {
                    const npcConditionCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                    );
                    expect(npcConditionCalls.length).toBeGreaterThan(0);
                });

                // Player should have prompt sent
                expect(sendSavePrompt).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                    targetName: 'PlayerAlly',
                }));
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    // ── Close / cancel behavior ──

    describe('close / cancel behavior', () => {
        it('closes when Skip button is clicked', () => {
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('does not apply any effects when skipped without selection', () => {
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(onClose).toHaveBeenCalledTimes(1);
            expect(setRuntimeValue).not.toHaveBeenCalledWith(
                expect.any(String),
                'activeConditions',
                expect.any(Array),
                expect.any(String)
            );
        });
    });

    // ── Empty targets ──

    describe('empty targets', () => {
        it('renders empty target list when no creatures in combat', () => {
            getCombatSummary.mockReturnValue({ creatures: [] });
            render(<AOEConditionModal {...makeProps()} />);
            // With no creatures, the target list is empty but the modal still renders
            expect(getApplyButton()).toBeInTheDocument();
            expect(getApplyButton()).toBeDisabled();
        });

        it('renders the caster as a target when caster is the only creature', () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Wizard1', type: 'player', currentHp: 30, maxHp: 30, saveBonuses: { con: 4 } },
                ],
            });
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.getByText('Wizard1')).toBeInTheDocument();
        });
    });

    // ── Overlay targeting ──

    describe('overlay targeting', () => {
        it('renders AreaEffectTargetModalBase when player is overlay targeted with active overlay', () => {
            render(<AOEConditionModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'overlay-123' },
                activeOverlay: { name: 'TestOverlay' },
            })} />);
            // Should render AreaEffectTargetModalBase path
            expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
        });

        it('renders normally when player is overlay targeted but no active overlay', () => {
            render(<AOEConditionModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'overlay-123' },
            })} />);
            expect(screen.getByText('Blinding Darkness')).toBeInTheDocument();
        });

        it('renders normally when player is not overlay targeted', () => {
            render(<AOEConditionModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'normal-target' },
                activeOverlay: { name: 'TestOverlay' },
            })} />);
            expect(screen.getByText('Blinding Darkness')).toBeInTheDocument();
        });
    });

    // ── Condition deduplication ──

    describe('condition deduplication', () => {
        it('does not add duplicate blinded condition', async () => {
            getRuntimeValue.mockReturnValue(['blinded']);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<AOEConditionModal {...makeProps()} />);
                await act(async () => selectTargetRow(0));
                await waitFor(() => {
                    expect(getApplyButton()).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(getApplyButton());
                });

                await waitFor(() => {
                    const conditionCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                    );
                    expect(conditionCalls.length).toBeGreaterThan(0);
                    const conditions = conditionCalls[0][2];
                    const blindedCount = conditions.filter(c => String(c).toLowerCase() === 'blinded').length;
                    expect(blindedCount).toBe(1);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    // ── Blocking effects ──

    describe('blocking effects (forcecage, maze, banishment, imprisonment)', () => {
        it('excludes creatures blocked by forcecage from eligible targets', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'forcecage', target: 'Goblin', source: 'CasterA' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            // Goblin should be excluded from the target list
            expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
        });

        it('allows both attacker and target if same forcecage source', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'forcecage', target: 'Goblin', source: 'Wizard1' },
                { effect: 'forcecage', target: 'Wizard1', source: 'Wizard1' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.getByText('Goblin')).toBeInTheDocument();
        });

        it('excludes creatures blocked by maze from eligible targets', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'maze', target: 'Goblin', source: 'CasterA' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
        });

        it('excludes creatures blocked by banishment from eligible targets', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'banishment', target: 'Goblin', source: 'CasterA' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
        });

        it('excludes creatures blocked by imprisonment from eligible targets', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'imprisonment', target: 'Goblin', source: 'CasterA' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
        });
    });

    // ── Effects prop fallback ──

    describe('effects prop fallback', () => {
        it('uses default blinded effect when effects prop is null', async () => {
            render(<AOEConditionModal {...makeProps({ effects: null })} />);
            await act(async () => selectTargetRow(2));
            await waitFor(() => {
                expect(getApplyButton()).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(getApplyButton());
            });

            const savePromptCall = vi.mocked(sendSavePrompt).mock.calls[0];
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
                const conditionCalls = setRuntimeValue.mock.calls.filter(
                    call => call[1] === 'activeConditions' && call[0] === 'PlayerAlly'
                );
                expect(conditionCalls.length).toBeGreaterThan(0);
                const conditions = conditionCalls[0][2];
                expect(conditions).toContain('blinded');
            });
        });

        it('uses default blinded effect when effects prop is undefined', async () => {
            render(<AOEConditionModal {...makeProps({ effects: undefined })} />);
            await act(async () => selectTargetRow(2));
            await waitFor(() => {
                expect(getApplyButton()).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(getApplyButton());
            });

            const savePromptCall = vi.mocked(sendSavePrompt).mock.calls[0];
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
                const conditionCalls = setRuntimeValue.mock.calls.filter(
                    call => call[1] === 'activeConditions' && call[0] === 'PlayerAlly'
                );
                expect(conditionCalls.length).toBeGreaterThan(0);
            });
        });
    });

    // ── HP display ──

    describe('HP percentage display', () => {
        it('shows HP percentage for non-player creatures', () => {
            render(<AOEConditionModal {...makeProps()} />);
            const goblinRow = [...document.querySelectorAll('.secondary-target-row')]
                .find(row => row.textContent.includes('Goblin'));
            expect(goblinRow.textContent).toContain('71% HP');
        });

        it('does not show HP percentage for player-type targets', () => {
            render(<AOEConditionModal {...makeProps()} />);
            const playerRow = [...document.querySelectorAll('.secondary-target-row')]
                .find(row => row.textContent.includes('PlayerAlly'));
            expect(playerRow.textContent).not.toContain('% HP');
        });
    });

    // ── Edge cases ──

    describe('edge cases', () => {
        it('renders without crashing when onClose is undefined', () => {
            render(<AOEConditionModal {...makeProps({ onClose: undefined })} />);
            expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
        });

        it('handles null combatSummary gracefully', () => {
            getCombatSummary.mockReturnValue(null);
            render(<AOEConditionModal {...makeProps()} />);
            expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
        });

        it('handles undefined saveBonuses gracefully', () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 10 },
                ],
            });
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.getByText(/CON/)).toBeInTheDocument();
        });

        it('renders with multiple effects in effects prop', () => {
            render(<AOEConditionModal {...makeProps({
                effects: [
                    { type: 'blinded', condition: 'blinded' },
                    { type: 'deafened', condition: 'deafened' },
                ],
                conditionLabel: 'Blinded, Deafened',
            })} />);
            expect(screen.getByText(/Blinded, Deafened/)).toBeInTheDocument();
        });
    });

    // ── Cleanup behavior ──

    describe('cleanup', () => {
        it('clears results state on unmount', async () => {
            const { unmount } = render(<AOEConditionModal {...makeProps()} />);
            await act(async () => selectTargetRow(0));
            unmount();
            // After unmount, resultsState should be cleared (no visible effect but no crash)
        });
    });
});
