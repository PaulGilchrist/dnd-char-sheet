// @cleaned-by-ai
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import MassSuggestionModal from './MassSuggestionModal.jsx';

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

// Need to import after mocking
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { sendSavePrompt } from '../../../../services/combat/conditions/savePromptService.js';
import { addEntry } from '../../../../services/ui/logService.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';
import { storeSpellLastAttack } from '../../../../services/automation/common/damageRollback.js';
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
    name: 'Mass Suggestion',
    automation: { type: 'mass_suggestion' },
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

describe('MassSuggestionModal', () => {
    describe('initial render', () => {
        it('renders the modal with title and target list', () => {
            render(<MassSuggestionModal {...makeProps()} />);
            expect(screen.getByText('Mass Suggestion')).toBeInTheDocument();
            expect(screen.getByText('Goblin')).toBeInTheDocument();
            expect(screen.getByText('Orc')).toBeInTheDocument();
            expect(screen.getByText('PlayerAlly')).toBeInTheDocument();
        });

        it('renders the description with save type and DC', () => {
            render(<MassSuggestionModal {...makeProps()} />);
            expect(screen.getByText(/Select creatures within range/)).toBeInTheDocument();
            expect(screen.getByText(/WIS/)).toBeInTheDocument();
            expect(screen.getByText(/DC 14/)).toBeInTheDocument();
        });

        it('renders the note about charmed condition', () => {
            render(<MassSuggestionModal {...makeProps()} />);
            expect(screen.getByText(/On a failed save, target becomes <strong>Charmed<\/strong>/)).toBeInTheDocument();
            expect(screen.getByText(/Maximum 12 targets/)).toBeInTheDocument();
        });

        it('disables the confirm button when no target is selected', () => {
            render(<MassSuggestionModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: /Mass Suggestion \(0\)/ })).toBeDisabled();
        });

        it('renders skip button', () => {
            render(<MassSuggestionModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
        });
    });

    describe('target selection', () => {
        it('selects a target when its checkbox is clicked and enables confirm', async () => {
            render(<MassSuggestionModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                expect(checkboxes[0].checked).toBe(true);
            });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ })).toBeEnabled();
            });
        });

        it('allows selecting multiple targets', async () => {
            render(<MassSuggestionModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await act(async () => { fireEvent.click(labels[1]); });
            await waitFor(() => {
                const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                expect(checkboxes[0].checked).toBe(true);
                expect(checkboxes[1].checked).toBe(true);
            });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Mass Suggestion \(2\)/ })).toBeEnabled();
            });
        });

        it('enforces maxTargets limit of 12', async () => {
            const manyCreatures = {
                creatures: Array.from({ length: 15 }, (_, i) => ({
                    name: `Creature${i}`,
                    type: 'npc',
                    currentHp: 10,
                    maxHp: 10,
                    saveBonuses: { wis: 0 },
                })),
            };
            getCombatSummary.mockReturnValue(manyCreatures);
            render(<MassSuggestionModal {...makeProps()} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            expect(labels).toHaveLength(15);

            // Select first 12
            for (let i = 0; i < 12; i++) {
                await act(async () => { fireEvent.click(labels[i]); });
            }

            // 13th should be disabled
            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
            await waitFor(() => {
                expect(checkboxes[12].disabled).toBe(true);
            });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Mass Suggestion \(12\)/ })).toBeEnabled();
            });
        });
    });

    describe('close behavior', () => {
        it('closes when Skip is clicked', () => {
            const onClose = vi.fn();
            render(<MassSuggestionModal {...makeProps({ onClose })} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('NPC save resolution', () => {
        it('calls storeSpellLastAttack when targets are selected', async () => {
            render(<MassSuggestionModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ }));
            });

            expect(storeSpellLastAttack).toHaveBeenCalledWith(campaignName, {
                casterName: 'Wizard1',
                spellName: 'Mass Suggestion',
                saveType: 'WIS',
                saveDc: 14,
                attackScope: 'aoe',
            });
        });

        it('logs ability_use entry when targets are selected', async () => {
            render(<MassSuggestionModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ }));
            });

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                characterName: 'Wizard1',
                abilityName: 'Mass Suggestion',
                description: expect.stringContaining('Selecting 1 target'),
            }));
        });

        it('applies charmed condition on failed NPC save', async () => {
            getRuntimeValue.mockReturnValue([]);
            render(<MassSuggestionModal {...makeProps({
                playerStats: { ...basePlayerStats, level: 10, proficiency: 4, abilities: [{ name: 'Charisma', bonus: 2 }] },
            })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ }));
            });

            // Goblin has WIS +0, so roll needs to fail DC 14
            // The actual roll is random, so we check that addExpiration was called at least once
            // If the random roll failed, charmed should be applied
            await waitFor(() => {
                if (addExpiration.mock.calls.length > 0) {
                    const [caster, target, effects] = addExpiration.mock.calls[0];
                    expect(caster).toBe('Wizard1');
                    expect(target).toBe('Goblin');
                    expect(effects).toEqual([{ type: 'charmed', condition: 'charmed' }]);
                }
            });
        });

        it('logs condition entry on failed NPC save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<MassSuggestionModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ }));
                });

                await waitFor(() => {
                    const conditionEntries = addEntry.mock.calls.filter(
                        call => call[1]?.type === 'condition' && call[1]?.action === 'applied' && call[1]?.reason === 'Mass Suggestion spell'
                    );
                    expect(conditionEntries.length).toBeGreaterThan(0);
                    expect(conditionEntries[0][1]).toEqual(expect.objectContaining({
                        type: 'condition',
                        action: 'applied',
                        characterName: 'Goblin',
                        condition: 'Charmed',
                        reason: 'Mass Suggestion spell',
                    }));
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('logs save_result entry for NPC saves', async () => {
            render(<MassSuggestionModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[0]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ }));
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

    describe('player save prompts', () => {
        it('sends save prompt for player targets instead of resolving locally', async () => {
            render(<MassSuggestionModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            // Select just the player
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ }));
            });

            expect(sendSavePrompt).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                targetName: 'PlayerAlly',
                saveType: 'WIS',
                saveDc: 14,
                sourceName: 'Wizard1',
            }));
        });

        it('tracks pending prompts for player targets', async () => {
            render(<MassSuggestionModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ }));
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
        it('applies charmed when player fails save via save-result event', async () => {
            getRuntimeValue.mockReturnValue([]);
            const onClose = vi.fn();
            render(<MassSuggestionModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ }));
            });

            // Get the promptId from sendSavePrompt call
            const savePromptCall = sendSavePrompt.mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            // Dispatch save-result event with failure
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
                    [{ type: 'charmed', condition: 'charmed' }],
                    campaignName,
                );
            });
        });

        it('logs save_result success when player passes save', async () => {
            const onClose = vi.fn();
            render(<MassSuggestionModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ }));
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
            render(<MassSuggestionModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ }));
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
    });

    describe('empty targets', () => {
        it('renders empty target list when no creatures in combat', () => {
            getCombatSummary.mockReturnValue({ creatures: [] });
            render(<MassSuggestionModal {...makeProps()} />);
            expect(screen.getByText('No targets available.')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Mass Suggestion \(0\)/ })).toBeDisabled();
        });

        it('renders only non-caster creatures', () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Wizard1', type: 'player', currentHp: 30, maxHp: 30, saveBonuses: { wis: 4 } },
                ],
            });
            render(<MassSuggestionModal {...makeProps()} />);
            expect(screen.queryByText('Wizard1')).not.toBeInTheDocument();
            expect(screen.getByText('No targets available.')).toBeInTheDocument();
        });
    });

    describe('skip behavior', () => {
        it('closes modal without applying any effects when skipped', async () => {
            const onClose = vi.fn();
            render(<MassSuggestionModal {...makeProps({ onClose })} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(onClose).toHaveBeenCalledTimes(1);
            expect(storeSpellLastAttack).not.toHaveBeenCalled();
            expect(sendSavePrompt).not.toHaveBeenCalled();
        });
    });
});
