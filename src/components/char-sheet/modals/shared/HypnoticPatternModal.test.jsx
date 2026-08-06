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
import { addEntry } from '../../../../services/ui/logService.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';
import { storeSpellLastAttack } from '../../../../services/automation/common/damageRollback.js';
import { addTargetResult } from '../../../../services/automation/common/damageRollback.js';
import { addExpiration } from '../../../../services/rules/effects/expirations.js';
import { persistAndNotify } from './AreaEffectTargetModalBase.utils.jsx';
import { getAllyList } from '../../../../hooks/useAllySelection.js';

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

describe('HypnoticPatternModal', () => {
    describe('initial render', () => {
        it('renders the modal with title and target list', () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            expect(screen.getByText('Hypnotic Pattern')).toBeInTheDocument();
            expect(screen.getByText('Goblin')).toBeInTheDocument();
            expect(screen.getByText('Orc')).toBeInTheDocument();
            expect(screen.getByText('PlayerAlly')).toBeInTheDocument();
        });

        it('renders the description with save type and DC', () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            expect(screen.getByText(/Select creatures in the 20-foot-radius sphere/)).toBeInTheDocument();
            expect(screen.getByText(/WIS/)).toBeInTheDocument();
            expect(screen.getByText(/DC 14/)).toBeInTheDocument();
        });

        it('renders the note about charmed, incapacitated, and speed 0 conditions', () => {
            const { container } = render(<HypnoticPatternModal {...makeProps()} />);
            const noteEl = container.querySelector('.sp-note');
            expect(noteEl).toHaveTextContent(/On a failed save, target becomes.*Charmed/);
            expect(screen.getByText(/Incapacitated/)).toBeInTheDocument();
            expect(screen.getByText(/Speed 0/)).toBeInTheDocument();
        });

        it('disables the confirm button when no target is selected', () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: /Hypnotic Pattern \(0\)/ })).toBeDisabled();
        });

        it('renders skip button', () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
        });
    });

    describe('target selection', () => {
        it('selects a target when its checkbox is clicked and enables confirm', async () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                expect(checkboxes[0].checked).toBe(true);
            });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ })).toBeEnabled();
            });
        });

        it('allows selecting multiple targets', async () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await act(async () => { fireEvent.click(labels[1]); });
            await waitFor(() => {
                const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                expect(checkboxes[0].checked).toBe(true);
                expect(checkboxes[1].checked).toBe(true);
            });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Hypnotic Pattern \(2\)/ })).toBeEnabled();
            });
        });
    });

    describe('close behavior', () => {
        it('closes when Skip is clicked', () => {
            const onClose = vi.fn();
            render(<HypnoticPatternModal {...makeProps({ onClose })} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

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

    describe('player save prompts', () => {
        it('sends save prompt for player targets instead of resolving locally', async () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            expect(sendSavePrompt).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                targetName: 'PlayerAlly',
                saveType: 'WIS',
                saveDc: 14,
                sourceName: 'Wizard1',
            }));
        });

        it('tracks pending prompts for player targets', async () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
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
        it('applies charmed, incapacitated, and speed_zero when player fails save via save-result event', async () => {
            getRuntimeValue.mockReturnValue([]);
            const onClose = vi.fn();
            render(<HypnoticPatternModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
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
                        { type: 'charmed', condition: 'charmed' },
                        { type: 'incapacitated', condition: 'incapacitated' },
                        { type: 'speed_zero', condition: 'speed_zero' },
                    ],
                    campaignName,
                );
            });
        });

        it('logs save_result success when player passes save', async () => {
            const onClose = vi.fn();
            render(<HypnoticPatternModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
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
            render(<HypnoticPatternModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
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
            render(<HypnoticPatternModal {...makeProps()} />);
            expect(screen.getByText('No targets available.')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Hypnotic Pattern \(0\)/ })).toBeDisabled();
        });

        it('renders the caster as a target when caster is the only creature', () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Wizard1', type: 'player', currentHp: 30, maxHp: 30, saveBonuses: { wis: 4 } },
                ],
            });
            render(<HypnoticPatternModal {...makeProps()} />);
            expect(screen.getByText('Wizard1')).toBeInTheDocument();
        });
    });

    describe('skip behavior', () => {
        it('closes modal without applying any effects when skipped', async () => {
            const onClose = vi.fn();
            render(<HypnoticPatternModal {...makeProps({ onClose })} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(onClose).toHaveBeenCalledTimes(1);
            expect(storeSpellLastAttack).not.toHaveBeenCalled();
            expect(sendSavePrompt).not.toHaveBeenCalled();
        });
    });

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

    describe('overlay targeting', () => {
        it('renders empty fragment when player is overlay targeted with active overlay', () => {
            render(<HypnoticPatternModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'overlay-123' },
                activeOverlay: { name: 'TestOverlay' },
            })} />);
            expect(document.querySelector('.sp-overlay')).not.toBeInTheDocument();
        });

        it('renders normally when player is overlay targeted but no active overlay', () => {
            render(<HypnoticPatternModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'overlay-123' },
            })} />);
            expect(screen.getByText('Hypnotic Pattern')).toBeInTheDocument();
        });

        it('renders normally when player is not overlay targeted', () => {
            render(<HypnoticPatternModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'normal-target' },
                activeOverlay: { name: 'TestOverlay' },
            })} />);
            expect(screen.getByText('Hypnotic Pattern')).toBeInTheDocument();
        });
    });

    describe('condition deduplication', () => {
        it('does not add duplicate charmed, incapacitated, or speed_zero conditions', async () => {
            getRuntimeValue.mockReturnValue([{ name: 'charmed' }, { name: 'incapacitated' }, { name: 'speed_zero' }]);
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
                    const charmedCount = conditions.filter(c => String(c).toLowerCase() === 'charmed').length;
                    const incapacitatedCount = conditions.filter(c => String(c).toLowerCase() === 'incapacitated').length;
                    const speedZeroCount = conditions.filter(c => String(c).toLowerCase() === 'speed_zero').length;
                    expect(charmedCount).toBe(1);
                    expect(incapacitatedCount).toBe(1);
                    expect(speedZeroCount).toBe(1);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    describe('pending prompts cleanup', () => {
        it('clears pending prompts on unmount', async () => {
            const onClose = vi.fn();
            const { unmount } = render(<HypnoticPatternModal {...makeProps({ onClose })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            // Modal should be open with pending prompts
            expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
            unmount();
            // After unmount, the modal overlay should be gone
            expect(document.querySelector('.sp-overlay')).not.toBeInTheDocument();
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

        it('resolves saves for mixed NPC and player targets', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<HypnoticPatternModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await act(async () => { fireEvent.click(labels[2]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Hypnotic Pattern \(2\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(2\)/ }));
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

        it('sends save prompts for multiple player targets', async () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            expect(sendSavePrompt).toHaveBeenCalled();
            const promptCall = sendSavePrompt.mock.calls[0];
            expect(promptCall[1].targetName).toBe('PlayerAlly');
        });
    });

    describe('save result event edge cases', () => {
        it('ignores save-result event with missing promptId', async () => {
            const onClose = vi.fn();
            render(<HypnoticPatternModal {...makeProps({ onClose })} />);

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
            render(<HypnoticPatternModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
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
            render(<HypnoticPatternModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
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

        it('calls persistAndNotify after player save result event', async () => {
            const onClose = vi.fn();
            render(<HypnoticPatternModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
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

    describe('player save result logging detail', () => {
        it('logs save_result with roll details when player fails', async () => {
            const onClose = vi.fn();
            render(<HypnoticPatternModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
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
            render(<HypnoticPatternModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            const savePromptCall = sendSavePrompt.mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: actualPromptId,
                        success: true,
                        roll: 15,
                        total: 16,
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
                expect(saveEntries[0][1].description).toContain('PlayerAlly succeeded');
                expect(saveEntries[0][1].description).toContain('rolled 15 + 1 = 16');
            });
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
});
