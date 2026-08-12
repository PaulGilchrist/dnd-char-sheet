import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CalmEmotionsModal from './CalmEmotionsModal.jsx';

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

vi.mock('./AreaEffectTargetModalBase.utils.jsx', () => ({
    persistAndNotify: vi.fn(),
}));

vi.mock('../../../../services/automation/handlers/spells/calmEmotionsHandler.js', () => ({
    applyCalmEmotionsImmunity: vi.fn().mockResolvedValue(undefined),
    applyCalmEmotionsCharmed: vi.fn().mockResolvedValue({ immune: false }),
}));

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { getAllyList } from '../../../../hooks/useAllySelection.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';
import { persistAndNotify } from './AreaEffectTargetModalBase.utils.jsx';
import { sendSavePrompt } from '../../../../services/combat/conditions/savePromptService.js';
import { addEntry } from '../../../../services/ui/logService.js';
import { storeSpellLastAttack } from '../../../../services/automation/common/damageRollback.js';
import { applyCalmEmotionsImmunity, applyCalmEmotionsCharmed } from '../../../../services/automation/handlers/spells/calmEmotionsHandler.js';

const campaignName = 'test-campaign';

const basePlayerStats = {
    name: 'Wizard1',
    level: 10,
    proficiency: 4,
    abilities: [{ name: 'Intelligence', bonus: 4 }],
};

const baseAction = {
    name: 'Calm Emotions',
    automation: { type: 'calm_emotions' },
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

describe('CalmEmotionsModal - Cast Flow', () => {
    // ── Confirm / cast behavior ──

    describe('confirm / cast behavior', () => {
        it('logs ability_use entry when cast button is clicked', async () => {
            render(<CalmEmotionsModal {...makeProps()} />);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Cast Calm Emotions \(3\)/ }));
            });

            expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                type: 'ability_use',
                characterName: 'Wizard1',
                abilityName: 'Calm Emotions',
                description: expect.stringContaining('Selecting 3 target'),
            }));
        });

        it('calls storeSpellLastAttack when cast button is clicked', async () => {
            render(<CalmEmotionsModal {...makeProps()} />);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Cast Calm Emotions \(3\)/ }));
            });

            expect(storeSpellLastAttack).toHaveBeenCalledWith(campaignName, {
                casterName: 'Wizard1',
                spellName: 'Calm Emotions',
                saveType: 'CHA',
                saveDc: 14,
                attackScope: 'aoe',
            });
        });

        it('applies immunity for NPC targets with immunity choice (default)', async () => {
            render(<CalmEmotionsModal {...makeProps()} />);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Cast Calm Emotions \(3\)/ }));
            });

            expect(applyCalmEmotionsImmunity).toHaveBeenCalledWith(expect.objectContaining({
                targetName: 'Goblin',
                casterName: 'Wizard1',
                campaignName,
                dc: 14,
            }));
        });

        it('applies immunity for player targets with immunity choice (default)', async () => {
            render(<CalmEmotionsModal {...makeProps()} />);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Cast Calm Emotions \(3\)/ }));
            });

            // PlayerAlly with immunity choice gets immunity directly (no save prompt)
            expect(applyCalmEmotionsImmunity).toHaveBeenCalledWith(expect.objectContaining({
                targetName: 'PlayerAlly',
                casterName: 'Wizard1',
                campaignName,
                dc: 14,
            }));
        });
    });

    // ── NPC save resolution ──

    describe('NPC save resolution with charmed choice', () => {
        it('rolls save and applies charmed on failure for NPC with charmed choice', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<CalmEmotionsModal {...makeProps()} />);
                // Switch all to charmed
                await act(async () => {
                    const goblinRadios = document.querySelectorAll('input[name="choice-Goblin"]');
                    fireEvent.click(goblinRadios[1]);
                });
                await act(async () => {
                    const orcRadios = document.querySelectorAll('input[name="choice-Orc"]');
                    const playerRadios = document.querySelectorAll('input[name="choice-PlayerAlly"]');
                    fireEvent.click(orcRadios[1]);
                    fireEvent.click(playerRadios[1]);
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Cast Calm Emotions \(3\)/ }));
                });

                await waitFor(() => {
                    expect(applyCalmEmotionsCharmed).toHaveBeenCalled();
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('rolls save and skips charmed on success for NPC with charmed choice', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            try {
                render(<CalmEmotionsModal {...makeProps()} />);
                await act(async () => {
                    const goblinRadios = document.querySelectorAll('input[name="choice-Goblin"]');
                    fireEvent.click(goblinRadios[1]);
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Cast Calm Emotions \(3\)/ }));
                });

                await waitFor(() => {
                    expect(applyCalmEmotionsCharmed).not.toHaveBeenCalled();
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('uses heighten target for disadvantage on NPC saves', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<CalmEmotionsModal {...makeProps({ metamagicHeighten: true })} />);
                // Set heighten target to Orc (index 1)
                const heightenRadios = document.querySelectorAll('input[name="heightenTarget"]');
                await act(async () => { fireEvent.click(heightenRadios[1]); });
                // Switch all to charmed choice
                await act(async () => {
                    const goblinRadios = document.querySelectorAll('input[name="choice-Goblin"]');
                    const orcRadios = document.querySelectorAll('input[name="choice-Orc"]');
                    const playerRadios = document.querySelectorAll('input[name="choice-PlayerAlly"]');
                    fireEvent.click(goblinRadios[1]);
                    fireEvent.click(orcRadios[1]);
                    fireEvent.click(playerRadios[1]);
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Cast Calm Emotions \(3\)/ }));
                });

                await waitFor(() => {
                    expect(applyCalmEmotionsCharmed).toHaveBeenCalled();
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
            render(<CalmEmotionsModal {...makeProps({ metamagicCareful: true })} />);
            // Switch Goblin to charmed choice
            await act(async () => {
                const goblinRadios = document.querySelectorAll('input[name="choice-Goblin"]');
                fireEvent.click(goblinRadios[1]);
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Cast Calm Emotions \(3\)/ }));
            });

            // No condition should be applied due to Careful Spell
            expect(applyCalmEmotionsCharmed).not.toHaveBeenCalled();

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
        it('sends save prompt for player targets with charmed choice', async () => {
            render(<CalmEmotionsModal {...makeProps()} />);
            // Switch PlayerAlly to charmed choice
            await act(async () => {
                const playerRadios = document.querySelectorAll('input[name="choice-PlayerAlly"]');
                fireEvent.click(playerRadios[1]);
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Cast Calm Emotions \(3\)/ }));
            });

            expect(sendSavePrompt).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                targetName: 'PlayerAlly',
                saveType: 'CHA',
                saveDc: 14,
                sourceName: 'Wizard1',
            }));
        });

        it('tracks pending prompts for player targets with charmed choice', async () => {
            render(<CalmEmotionsModal {...makeProps()} />);
            await act(async () => {
                const playerRadios = document.querySelectorAll('input[name="choice-PlayerAlly"]');
                fireEvent.click(playerRadios[1]);
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Cast Calm Emotions \(3\)/ }));
            });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'pendingSaveListenerPrompts',
                expect.arrayContaining([expect.any(String)]),
                campaignName,
            );
        });

        it('does not send save prompt for player with immunity choice', async () => {
            render(<CalmEmotionsModal {...makeProps()} />);
            // PlayerAlly stays on immunity (default)
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Cast Calm Emotions \(3\)/ }));
            });

            // Immunity choice = no save prompt, just apply immunity directly
            expect(sendSavePrompt).not.toHaveBeenCalled();
            expect(applyCalmEmotionsImmunity).toHaveBeenCalledWith(expect.objectContaining({
                targetName: 'PlayerAlly',
            }));
        });

        it('does not send save prompt for careful spell protected players', async () => {
            getAllyList.mockReturnValue(['PlayerAlly']);
            render(<CalmEmotionsModal {...makeProps({ metamagicCareful: true })} />);
            await act(async () => {
                const playerRadios = document.querySelectorAll('input[name="choice-PlayerAlly"]');
                fireEvent.click(playerRadios[1]);
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Cast Calm Emotions \(3\)/ }));
            });

            expect(sendSavePrompt).not.toHaveBeenCalled();
        });
    });

    // ── Player save result handling ──

    describe('player save result handling', () => {
        it('applies charmed when player fails save via save-result event with charmed choice', async () => {
            getRuntimeValue.mockReturnValue([]);
            const onClose = vi.fn();
            render(<CalmEmotionsModal {...makeProps({ onClose })} />);

            // Switch PlayerAlly to charmed choice
            await act(async () => {
                const playerRadios = document.querySelectorAll('input[name="choice-PlayerAlly"]');
                fireEvent.click(playerRadios[1]);
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Cast Calm Emotions \(3\)/ }));
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
                expect(applyCalmEmotionsCharmed).toHaveBeenCalledWith(expect.objectContaining({
                    targetName: 'PlayerAlly',
                    casterName: 'Wizard1',
                    campaignName,
                    dc: 14,
                }));
            });
        });

        it('logs save_result failure when player fails save', async () => {
            getRuntimeValue.mockReturnValue([]);
            const onClose = vi.fn();
            render(<CalmEmotionsModal {...makeProps({ onClose })} />);

            await act(async () => {
                const playerRadios = document.querySelectorAll('input[name="choice-PlayerAlly"]');
                fireEvent.click(playerRadios[1]);
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Cast Calm Emotions \(3\)/ }));
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
                const saveEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'save_result' && call[1]?.success === false
                );
                expect(saveEntries.length).toBeGreaterThan(0);
                expect(saveEntries[0][1].targetName).toBe('PlayerAlly');
            });
        });

        it('logs save_result success when player passes save', async () => {
            const onClose = vi.fn();
            render(<CalmEmotionsModal {...makeProps({ onClose })} />);

            await act(async () => {
                const playerRadios = document.querySelectorAll('input[name="choice-PlayerAlly"]');
                fireEvent.click(playerRadios[1]);
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Cast Calm Emotions \(3\)/ }));
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

        it('does not apply charmed when player passes save', async () => {
            const onClose = vi.fn();
            render(<CalmEmotionsModal {...makeProps({ onClose })} />);

            await act(async () => {
                const playerRadios = document.querySelectorAll('input[name="choice-PlayerAlly"]');
                fireEvent.click(playerRadios[1]);
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Cast Calm Emotions \(3\)/ }));
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

            // NPCs still get immunity applied; only check PlayerAlly
            const playerCharmedCalls = applyCalmEmotionsCharmed.mock.calls.filter(
                call => call[0]?.targetName === 'PlayerAlly'
            );
            expect(playerCharmedCalls).toHaveLength(0);
        });

        it('closes modal when all pending prompts are resolved', async () => {
            getRuntimeValue.mockReturnValue([]);
            const onClose = vi.fn();
            render(<CalmEmotionsModal {...makeProps({ onClose })} />);

            await act(async () => {
                const playerRadios = document.querySelectorAll('input[name="choice-PlayerAlly"]');
                fireEvent.click(playerRadios[1]);
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Cast Calm Emotions \(3\)/ }));
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

        it('handles save-result event with missing optional fields', async () => {
            const onClose = vi.fn();
            render(<CalmEmotionsModal {...makeProps({ onClose })} />);

            await act(async () => {
                const playerRadios = document.querySelectorAll('input[name="choice-PlayerAlly"]');
                fireEvent.click(playerRadios[1]);
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Cast Calm Emotions \(3\)/ }));
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

            // Should not crash, defaults to 0 for missing fields
            await waitFor(() => {
                expect(applyCalmEmotionsImmunity).toHaveBeenCalled();
            });
        });
    });

    // ── Multiple targets ──

    describe('multiple targets', () => {
        it('resolves saves for all NPC+player targets with immunity choice', async () => {
            render(<CalmEmotionsModal {...makeProps()} />);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Cast Calm Emotions \(3\)/ }));
            });

            await waitFor(() => {
                expect(applyCalmEmotionsImmunity).toHaveBeenCalledTimes(3);
            });
        });

        it('sends save prompt for player with charmed choice in group', async () => {
            render(<CalmEmotionsModal {...makeProps()} />);
            await act(async () => {
                const playerRadios = document.querySelectorAll('input[name="choice-PlayerAlly"]');
                fireEvent.click(playerRadios[1]);
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Cast Calm Emotions \(3\)/ }));
            });

            expect(sendSavePrompt).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                targetName: 'PlayerAlly',
            }));
            // NPCs still get immunity
            expect(applyCalmEmotionsImmunity).toHaveBeenCalledWith(expect.objectContaining({
                targetName: 'Goblin',
            }));
            expect(applyCalmEmotionsImmunity).toHaveBeenCalledWith(expect.objectContaining({
                targetName: 'Orc',
            }));
        });
    });

    // ── persistAndNotify calls ──

    describe('persistAndNotify calls', () => {
        it('calls persistAndNotify after cast button is clicked', async () => {
            render(<CalmEmotionsModal {...makeProps()} />);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Cast Calm Emotions \(3\)/ }));
            });

            await waitFor(() => {
                expect(persistAndNotify).toHaveBeenCalled();
            });
        });

        it('calls persistAndNotify after player save result event', async () => {
            const onClose = vi.fn();
            render(<CalmEmotionsModal {...makeProps({ onClose })} />);

            await act(async () => {
                const playerRadios = document.querySelectorAll('input[name="choice-PlayerAlly"]');
                fireEvent.click(playerRadios[1]);
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Cast Calm Emotions \(3\)/ }));
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

    // ── Save result event edge cases ──

    describe('save result event edge cases', () => {
        it('ignores save-result event with missing promptId', async () => {
            const onClose = vi.fn();
            render(<CalmEmotionsModal {...makeProps({ onClose })} />);

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
            render(<CalmEmotionsModal {...makeProps({ onClose })} />);

            await act(async () => {
                const playerRadios = document.querySelectorAll('input[name="choice-PlayerAlly"]');
                fireEvent.click(playerRadios[1]);
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Cast Calm Emotions \(3\)/ }));
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
    });
});
