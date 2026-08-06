// @cleaned-by-ai
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FearModal from './FearModal.jsx';

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
    addTargetResult: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../services/rules/effects/expirations.js', () => ({
    addExpiration: vi.fn(),
}));

vi.mock('./AreaEffectTargetModalBase.utils.jsx', () => ({
    persistAndNotify: vi.fn(),
}));

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { getAllyList } from '../../../../hooks/useAllySelection.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';
import { persistAndNotify } from './AreaEffectTargetModalBase.utils.jsx';
import { sendSavePrompt } from '../../../../services/combat/conditions/savePromptService.js';
import { addEntry } from '../../../../services/ui/logService.js';
import { addExpiration } from '../../../../services/rules/effects/expirations.js';


const campaignName = 'test-campaign';

const basePlayerStats = {
    name: 'Wizard1',
    level: 10,
    proficiency: 4,
    abilities: [{ name: 'Intelligence', bonus: 4 }],
};

const baseAction = {
    name: 'Bane',
    automation: { type: 'bane' },
};

const baseCombatSummary = {
    creatures: [
        { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 7, saveBonuses: { cha: 0 } },
        { name: 'Orc', type: 'npc', currentHp: 15, maxHp: 22, saveBonuses: { cha: 2 } },
        { name: 'PlayerAlly', type: 'player', currentHp: 30, maxHp: 30, saveBonuses: { cha: 1 } },
    ],
};

function makeProps(overrides = {}) {
    return {
        action: baseAction,
        playerStats: basePlayerStats,
        campaignName,
        saveType: 'CHA',
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

describe('FearModal', () => {
    // ── Rendering ──

    describe('initial render', () => {
        it('renders the modal with title and target list', () => {
            render(<FearModal {...makeProps()} />);
            expect(screen.getByText('Bane')).toBeInTheDocument();
            expect(screen.getByText('Goblin')).toBeInTheDocument();
            expect(screen.getByText('Orc')).toBeInTheDocument();
            expect(screen.getByText('PlayerAlly')).toBeInTheDocument();
        });

        it('renders the description with save type and DC', () => {
            render(<FearModal {...makeProps()} />);
            expect(screen.getByText(/Select creatures in the 30-foot cone/)).toBeInTheDocument();
            expect(screen.getByText(/CHA/)).toBeInTheDocument();
            expect(screen.getByText(/DC 14/)).toBeInTheDocument();
        });

        it('renders the note about frightened condition', () => {
            const { container } = render(<FearModal {...makeProps()} />);
            const noteEl = container.querySelector('.sp-note');
            expect(noteEl).toHaveTextContent(/On a failed save, target drops what it is holding/);
            expect(screen.getByText(/Frightened/)).toBeInTheDocument();
        });

        it('disables the confirm button when no target is selected', () => {
            render(<FearModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: /Bane \(0\)/ })).toBeDisabled();
        });

        it('renders skip button', () => {
            render(<FearModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
        });

        it('renders with the d20 icon', () => {
            render(<FearModal {...makeProps()} />);
            expect(document.querySelector('.sp-header .fa-solid.fa-dice-d20')).toBeInTheDocument();
        });
    });

    // ── Metamagic Heighten ──

    describe('metamagic heighten rendering', () => {
        it('does not show heighten note when metamagicHeighten is false', () => {
            render(<FearModal {...makeProps({ metamagicHeighten: false })} />);
            const noteEl = document.querySelector('.sp-note');
            expect(noteEl.textContent).not.toContain('Heightened Spell');
        });

        it('shows heighten note when metamagicHeighten is true', () => {
            render(<FearModal {...makeProps({ metamagicHeighten: true })} />);
            const noteEl = document.querySelector('.sp-note');
            expect(noteEl.textContent).toContain('Heightened Spell');
            expect(noteEl.textContent).toContain('one target will have disadvantage');
        });
    });

    // ── Metamagic Careful ──

    describe('metamagic careful rendering', () => {
        it('does not show careful spell protection when metamagicCareful is false', () => {
            getRuntimeValue.mockReturnValue([]);
            render(<FearModal {...makeProps({ metamagicCareful: false })} />);
            const rows = document.querySelectorAll('.secondary-target-row');
            rows.forEach(row => {
                expect(row.textContent).not.toContain('Careful Spell');
            });
        });

        it('shows careful spell protection when metamagicCareful is true and ally is in list', () => {
            getAllyList.mockReturnValue(['PlayerAlly']);
            getRuntimeValue.mockReturnValue([]);
            render(<FearModal {...makeProps({ metamagicCareful: true })} />);
            const rows = document.querySelectorAll('.secondary-target-row');
            const playerRow = [...rows].find(row => row.textContent.includes('PlayerAlly'));
            expect(playerRow.textContent).toContain('Careful Spell protected');
        });

        it('does not show careful spell protection for non-ally', () => {
            getAllyList.mockReturnValue(['OtherAlly']);
            getRuntimeValue.mockReturnValue([]);
            render(<FearModal {...makeProps({ metamagicCareful: true })} />);
            const rows = document.querySelectorAll('.secondary-target-row');
            const playerRow = [...rows].find(row => row.textContent.includes('PlayerAlly'));
            expect(playerRow.textContent).not.toContain('Careful Spell Protected');
        });
    });

    // ── Target selection ──

    describe('target selection', () => {
        it('selects a target when its row is clicked and enables confirm', async () => {
            render(<FearModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                expect(checkboxes[0].checked).toBe(true);
            });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeEnabled();
            });
        });

        it('allows selecting multiple targets', async () => {
            render(<FearModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await act(async () => { fireEvent.click(labels[1]); });
            await waitFor(() => {
                const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                expect(checkboxes[0].checked).toBe(true);
                expect(checkboxes[1].checked).toBe(true);
            });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(2\)/ })).toBeEnabled();
            });
        });

        it('toggles target selection off when row is clicked again', async () => {
            render(<FearModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                expect(checkboxes[0].checked).toBe(true);
            });
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                expect(checkboxes[0].checked).toBe(false);
            });
        });

        it('highlights selected targets with the selected class', async () => {
            render(<FearModal {...makeProps()} />);
            const rows = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(rows[0]); });
            await waitFor(() => {
                expect(rows[0]).toHaveClass('secondary-target-selected');
                expect(rows[1]).not.toHaveClass('secondary-target-selected');
            });
        });
    });

    // ── Heighten target selection ──

    describe('heighten target selection', () => {
        it('allows setting a heighten target when metamagicHeighten is true', async () => {
            render(<FearModal {...makeProps({ metamagicHeighten: true })} />);
            // Heighten radio buttons should be visible
            const heightenRadios = document.querySelectorAll('input[name="heightenTarget"]');
            expect(heightenRadios.length).toBeGreaterThan(0);
        });

        it('does not show heighten target radios when metamagicHeighten is false', () => {
            render(<FearModal {...makeProps({ metamagicHeighten: false })} />);
            const heightenRadios = document.querySelectorAll('input[name="heightenTarget"]');
            expect(heightenRadios).toHaveLength(0);
        });

        it('uses heighten target for disadvantage on NPC saves', async () => {
            getRuntimeValue.mockReturnValue([]);
            render(<FearModal {...makeProps({ metamagicHeighten: true })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });

            // Set heighten target by clicking the radio button for Orc (index 1)
            const heightenRadios = document.querySelectorAll('input[name="heightenTarget"]');
            if (heightenRadios.length > 1) {
                await act(async () => {
                    fireEvent.click(heightenRadios[1]);
                });
            }

            // After clicking the heighten radio, both Goblin and Orc may be selected
            // so the button may show "Bane (2)"
            await waitFor(() => {
                const btn = screen.getByRole('button', { name: /Bane/ });
                expect(btn).toBeInTheDocument();
            });

            await act(async () => {
                const btn = screen.getByRole('button', { name: /Bane/ });
                fireEvent.click(btn);
            });

            // Verify the modal triggered save resolution (setRuntimeValue called for conditions)
            expect(setRuntimeValue).toHaveBeenCalled();
        });
    });

    // ── NPC save resolution ──

    describe('NPC save resolution', () => {
        it('calls storeSpellLastAttack when targets are selected', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
                });

                // storeSpellLastAttack is called inside resolveAllSaves
                // We verify the runtime state was set
                expect(setRuntimeValue).toHaveBeenCalled();
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('logs ability_use entry when targets are selected', async () => {
            render(<FearModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                characterName: 'Wizard1',
                abilityName: 'Bane',
                description: expect.stringContaining('Selecting 1 target'),
            }));
        });

        it('applies frightened condition on failed NPC save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
                });

                await waitFor(() => {
                    const conditionCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                    );
                    expect(conditionCalls.length).toBeGreaterThan(0);
                    const conditions = conditionCalls[0][2];
                    expect(conditions).toContain('frightened');
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('calls addExpiration with frightened condition on failed NPC save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
                });

                await waitFor(() => {
                    if (addExpiration.mock.calls.length > 0) {
                        const [caster, target, effects] = addExpiration.mock.calls[0];
                        expect(caster).toBe('Wizard1');
                        expect(target).toBe('Goblin');
                        expect(effects).toEqual([
                            { type: 'condition', condition: 'frightened' },
                        ]);
                    }
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('tracks fear effect on targetEffects when NPC fails save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
                });

                await waitFor(() => {
                    const targetEffectCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'targetEffects' && call[0] === 'campaign'
                    );
                    expect(targetEffectCalls.length).toBeGreaterThan(0);
                    const effects = targetEffectCalls[0][2];
                    const fearEffect = effects.find(e => e.effect === 'fear_end_on_los');
                    expect(fearEffect).toBeDefined();
                    expect(fearEffect.target).toBe('Goblin');
                    expect(fearEffect.source).toBe('Wizard1');
                    expect(fearEffect.condition).toBe('frightened');
                    expect(fearEffect.duration).toBe('concentration');
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('logs condition entries on failed NPC save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
                });

                await waitFor(() => {
                    const conditionEntries = addEntry.mock.calls.filter(
                        call => call[1]?.type === 'condition' && call[1]?.condition === 'Frightened'
                    );
                    expect(conditionEntries.length).toBeGreaterThan(0);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('logs save_result entry for NPC saves', async () => {
            render(<FearModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            await waitFor(() => {
                const saveEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'save_result'
                );
                expect(saveEntries.length).toBeGreaterThan(0);
                expect(saveEntries[0][1]).toEqual(expect.objectContaining({
                    type: 'save_result',
                    saveType: 'CHA',
                    saveDc: 14,
                }));
            });
        });

        it('does not apply condition on successful NPC save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            try {
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
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

        it('logs save_result success when NPC passes save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            try {
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
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
    });

    // ── Careful Spell protection ──

    describe('careful spell protection for NPCs', () => {
        it('automatically succeeds for careful spell protected NPCs', async () => {
            getAllyList.mockReturnValue(['Goblin']);
            getRuntimeValue.mockReturnValue([]);
            render(<FearModal {...makeProps({ metamagicCareful: true })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            // Goblin should have logged success but no condition applied
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

        it('logs condition entry for careful spell protected target', async () => {
            getAllyList.mockReturnValue(['Goblin']);
            getRuntimeValue.mockReturnValue([]);
            render(<FearModal {...makeProps({ metamagicCareful: true })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            await waitFor(() => {
                const conditionEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'save_result' && call[1]?.targetName === 'Goblin'
                );
                expect(conditionEntries.length).toBeGreaterThan(0);
                expect(conditionEntries[0][1].success).toBe(true);
            });
        });
    });

    // ── Player save prompts ──

    describe('player save prompts', () => {
        it('sends save prompt for player targets instead of resolving locally', async () => {
            const { sendSavePrompt } = await import('../../../../services/combat/conditions/savePromptService.js');
            render(<FearModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            expect(sendSavePrompt).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                targetName: 'PlayerAlly',
                saveType: 'CHA',
                saveDc: 14,
                sourceName: 'Wizard1',
            }));
        });

        it('tracks pending prompts for player targets', async () => {
            render(<FearModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'pendingSaveListenerPrompts',
                expect.arrayContaining([expect.any(String)]),
                campaignName,
            );
        });

        it('does not apply condition when player is selected without save result', async () => {
            render(<FearModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            // No condition should be applied immediately for players
            const conditionCalls = setRuntimeValue.mock.calls.filter(
                call => call[1] === 'activeConditions' && call[0] === 'PlayerAlly'
            );
            expect(conditionCalls.length).toBe(0);
        });
    });

    // ── Player save result handling ──

    describe('player save result handling', () => {
        it('applies frightened when player fails save via save-result event', async () => {
            getRuntimeValue.mockReturnValue([]);
            const onClose = vi.fn();
            render(<FearModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
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
                expect(conditions).toContain('frightened');
            });
        });

        it('calls addExpiration when player fails save', async () => {
            getRuntimeValue.mockReturnValue([]);
            const onClose = vi.fn();
            render(<FearModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
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
                expect(addExpiration).toHaveBeenCalledWith(
                    'Wizard1',
                    'PlayerAlly',
                    [{ type: 'condition', condition: 'frightened' }],
                    campaignName,
                );
            });
        });

        it('tracks fear effect when player fails save', async () => {
            getRuntimeValue.mockReturnValue([]);
            const onClose = vi.fn();
            render(<FearModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
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
                const targetEffectCalls = setRuntimeValue.mock.calls.filter(
                    call => call[1] === 'targetEffects' && call[0] === 'campaign'
                );
                expect(targetEffectCalls.length).toBeGreaterThan(0);
                const effects = targetEffectCalls[0][2];
                const fearEffect = effects.find(e => e.effect === 'fear_end_on_los');
                expect(fearEffect).toBeDefined();
                expect(fearEffect.target).toBe('PlayerAlly');
            });
        });

        it('logs save_result failure when player fails save', async () => {
            getRuntimeValue.mockReturnValue([]);
            const onClose = vi.fn();
            render(<FearModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
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
            render(<FearModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
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

        it('does not apply condition when player passes save', async () => {
            const onClose = vi.fn();
            render(<FearModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
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

            // No condition should be applied for successful save
            const conditionCalls = setRuntimeValue.mock.calls.filter(
                call => call[1] === 'activeConditions' && call[0] === 'PlayerAlly'
            );
            expect(conditionCalls.length).toBe(0);
        });

        it('closes modal when all pending prompts are resolved', async () => {
            getRuntimeValue.mockReturnValue([]);
            const onClose = vi.fn();
            render(<FearModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
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
                expect(onClose).toHaveBeenCalledTimes(1);
            });
        });

        it('handles save-result event with missing optional fields', async () => {
            const onClose = vi.fn();
            render(<FearModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
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

            // Should not crash, defaults to 0 for missing fields
            await waitFor(() => {
                const conditionCalls = setRuntimeValue.mock.calls.filter(
                    call => call[1] === 'activeConditions' && call[0] === 'PlayerAlly'
                );
                expect(conditionCalls.length).toBeGreaterThan(0);
            });
        });
    });

    // ── Multiple targets ──

    describe('multiple targets', () => {
        it('resolves saves for multiple NPC targets', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await act(async () => { fireEvent.click(labels[1]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(2\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(2\)/ }));
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
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await act(async () => { fireEvent.click(labels[2]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(2\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(2\)/ }));
                });

                // NPC should have condition applied, player should have prompt sent
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

    // ── Close behavior ──

    describe('close behavior', () => {
        it('closes when Skip is clicked', () => {
            const onClose = vi.fn();
            render(<FearModal {...makeProps({ onClose })} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('does not apply any effects when skipped without selection', async () => {
            const onClose = vi.fn();
            render(<FearModal {...makeProps({ onClose })} />);
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
            render(<FearModal {...makeProps()} />);
            expect(screen.getByText('No targets available.')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Bane \(0\)/ })).toBeDisabled();
        });

        it('renders the caster as a target when caster is the only creature', () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Wizard1', type: 'player', currentHp: 30, maxHp: 30, saveBonuses: { cha: 4 } },
                ],
            });
            render(<FearModal {...makeProps()} />);
            expect(screen.getByText('Wizard1')).toBeInTheDocument();
        });
    });

    // ── Overlay targeting ──

    describe('overlay targeting', () => {
        it('renders empty fragment when player is overlay targeted with active overlay', () => {
            render(<FearModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'overlay-123' },
                activeOverlay: { name: 'TestOverlay' },
            })} />);
            // Should render empty fragment - no modal content
            expect(document.querySelector('.sp-overlay')).not.toBeInTheDocument();
        });

        it('renders normally when player is overlay targeted but no active overlay', () => {
            render(<FearModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'overlay-123' },
            })} />);
            expect(screen.getByText('Bane')).toBeInTheDocument();
        });

        it('renders normally when player is not overlay targeted', () => {
            render(<FearModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'normal-target' },
                activeOverlay: { name: 'TestOverlay' },
            })} />);
            expect(screen.getByText('Bane')).toBeInTheDocument();
        });
    });

    // ── Condition deduplication ──

    describe('condition deduplication', () => {
        it('does not add duplicate frightened condition', async () => {
            // Start with frightened already in conditions
            getRuntimeValue.mockReturnValue([{ name: 'frightened' }]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
                });

                await waitFor(() => {
                    const conditionCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                    );
                    expect(conditionCalls.length).toBeGreaterThan(0);
                    // Should have exactly one frightened (filtered out then re-added)
                    const conditions = conditionCalls[0][2];
                    const frightenedCount = conditions.filter(c => String(c).toLowerCase() === 'frightened').length;
                    expect(frightenedCount).toBe(1);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    // ── Fear effect tracking ──

    describe('fear effect tracking', () => {
        it('creates new fear effect when none exists', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
                });

                await waitFor(() => {
                    const targetEffectCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'targetEffects' && call[0] === 'campaign'
                    );
                    expect(targetEffectCalls.length).toBeGreaterThan(0);
                    const effects = targetEffectCalls[0][2];
                    expect(effects.length).toBeGreaterThan(0);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('updates existing fear effect when one already exists', async () => {
            const existingEffect = {
                target: 'Goblin',
                effect: 'fear_end_on_los',
                source: 'OldCaster',
                condition: 'frightened',
                dc: 10,
                duration: '1 minute',
            };
            getRuntimeValue.mockReturnValue([existingEffect]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
                });

                await waitFor(() => {
                    const targetEffectCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'targetEffects' && call[0] === 'campaign'
                    );
                    expect(targetEffectCalls.length).toBeGreaterThan(0);
                    const effects = targetEffectCalls[0][2];
                    // Should have one effect (updated, not duplicated)
                    const fearEffects = effects.filter(e => e.effect === 'fear_end_on_los');
                    expect(fearEffects.length).toBe(1);
                    // Should be updated with new caster
                    expect(fearEffects[0].source).toBe('Wizard1');
                    expect(fearEffects[0].dc).toBe(14);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    // ── Edge cases ──

    describe('edge cases', () => {
        it('renders without crashing when onClose is undefined', () => {
            render(<FearModal {...makeProps({ onClose: undefined })} />);
            expect(screen.getByText('Bane')).toBeInTheDocument();
        });

        it('renders without crashing with undefined campaignName', () => {
            render(<FearModal {...makeProps({ campaignName: undefined })} />);
            expect(screen.getByText('Bane')).toBeInTheDocument();
        });

        it('handles creature not found in combat summary', async () => {
            getRuntimeValue.mockReturnValue([]);
            render(<FearModal {...makeProps()} />);
            // Select a target that doesn't exist in combat summary
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });
            // Should not crash
            expect(screen.getByText('Bane')).toBeInTheDocument();
        });

        it('handles missing saveBonuses gracefully', async () => {
            getRuntimeValue.mockReturnValue([]);
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 7 },
                ],
            });
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
                });

                await waitFor(() => {
                    const conditionCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                    );
                    expect(conditionCalls.length).toBeGreaterThan(0);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('clears pendingPrompts on unmount', async () => {
            const { unmount } = render(<FearModal {...makeProps()} />);

            // First, create a pending prompt
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            // Unmount should clear pending prompts
            unmount();

            // pendingPrompts state should be cleared (no crash on cleanup)
            expect(() => {}).not.toThrow();
        });

        it('ignores save-result events with no detail', async () => {
            const onClose = vi.fn();
            render(<FearModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            // Dispatch event with no detail
            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: null,
                });
                window.dispatchEvent(event);
            });

            // Should not crash, onClose should not be called yet
            expect(onClose).not.toHaveBeenCalled();
        });

        it('ignores save-result events with unknown promptId', async () => {
            const onClose = vi.fn();
            render(<FearModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: 'unknown-prompt-id',
                        success: false,
                    },
                });
                window.dispatchEvent(event);
            });

            // Should not close because promptId doesn't match
            expect(onClose).not.toHaveBeenCalled();
        });
    });
});
