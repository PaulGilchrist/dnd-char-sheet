import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

vi.mock('./AreaEffectTargetModalBase.utils.jsx', () => ({
    persistAndNotify: vi.fn(),
}));

vi.mock('../../../../services/automation/handlers/spells/calmEmotionsHandler.js', () => ({
    applyCalmEmotionsImmunity: vi.fn().mockResolvedValue(undefined),
    applyCalmEmotionsCharmed: vi.fn().mockResolvedValue({ immune: false }),
    handle: vi.fn().mockResolvedValue(undefined),
}));

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { getAllyList } from '../../../../hooks/useAllySelection.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';
import { persistAndNotify } from './AreaEffectTargetModalBase.utils.jsx';
import { sendSavePrompt } from '../../../../services/combat/conditions/savePromptService.js';
import { addEntry } from '../../../../services/ui/logService.js';
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

afterEach(() => {
    vi.clearAllMocks();
});

describe('CalmEmotionsModal', () => {
    // ── Rendering ──

    describe('initial render', () => {
        it('renders the modal with title and target list', () => {
            render(<CalmEmotionsModal {...makeProps()} />);
            expect(screen.getByText('Calm Emotions')).toBeInTheDocument();
            expect(screen.getByText('Goblin')).toBeInTheDocument();
            expect(screen.getByText('Orc')).toBeInTheDocument();
            expect(screen.getByText('PlayerAlly')).toBeInTheDocument();
        });

        it('renders the description with save type and DC', () => {
            render(<CalmEmotionsModal {...makeProps()} />);
            expect(screen.getByText(/20-foot-radius sphere/)).toBeInTheDocument();
            expect(screen.getByText(/CHA/)).toBeInTheDocument();
            expect(screen.getByText(/DC 14/)).toBeInTheDocument();
        });

        it('renders the note about failed save effect choice', () => {
            const { container } = render(<CalmEmotionsModal {...makeProps()} />);
            const noteEl = container.querySelector('.sp-note');
            expect(noteEl).toHaveTextContent(/On a failed save, choose the effect/);
        });

        it('includes all targets by default so the button shows count 3', () => {
            render(<CalmEmotionsModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: /Cast Calm Emotions \(3\)/ })).toBeInTheDocument();
        });

        it('disables the confirm button when no targets available', () => {
            getCombatSummary.mockReturnValue({ creatures: [] });
            render(<CalmEmotionsModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: /Cast Calm Emotions \(0\)/ })).toBeDisabled();
        });

        it('renders skip button', () => {
            render(<CalmEmotionsModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
        });

        it('renders with the hand-holding-heart icon', () => {
            render(<CalmEmotionsModal {...makeProps()} />);
            expect(document.querySelector('.sp-header .fa-solid.fa-hand-holding-heart')).toBeInTheDocument();
        });
    });

    // ── Target list behavior ──

    describe('target list rendering', () => {
        it('shows all eligible targets by default', () => {
            render(<CalmEmotionsModal {...makeProps()} />);
            const rows = document.querySelectorAll('.secondary-target-row');
            expect(rows).toHaveLength(3);
        });

        it('shows HP percentage for NPC targets', () => {
            render(<CalmEmotionsModal {...makeProps()} />);
            expect(screen.getByText('(71% HP)')).toBeInTheDocument();
            expect(screen.getByText('(68% HP)')).toBeInTheDocument();
        });

        it('does not show HP for player targets', () => {
            render(<CalmEmotionsModal {...makeProps()} />);
            const rows = document.querySelectorAll('.secondary-target-row');
            const playerRow = [...rows].find(row => row.textContent.includes('PlayerAlly'));
            expect(playerRow.textContent).not.toContain('% HP');
        });

        it('highlights all targets as selected by default', () => {
            render(<CalmEmotionsModal {...makeProps()} />);
            const rows = document.querySelectorAll('.secondary-target-row');
            rows.forEach(row => {
                expect(row).toHaveClass('secondary-target-selected');
            });
        });
    });

    // ── Choice selection (immunity vs charmed) ──

    describe('choice selection', () => {
        it('shows choice radios for all targets by default', () => {
            render(<CalmEmotionsModal {...makeProps()} />);
            const goblinRadios = document.querySelectorAll('input[name="choice-Goblin"]');
            expect(goblinRadios).toHaveLength(2);
            const orcRadios = document.querySelectorAll('input[name="choice-Orc"]');
            expect(orcRadios).toHaveLength(2);
            const playerRadios = document.querySelectorAll('input[name="choice-PlayerAlly"]');
            expect(playerRadios).toHaveLength(2);
        });

        it('defaults to immunity choice for all targets', () => {
            render(<CalmEmotionsModal {...makeProps()} />);
            const goblinRadios = document.querySelectorAll('input[name="choice-Goblin"]');
            expect(goblinRadios[0].checked).toBe(true);
            const orcRadios = document.querySelectorAll('input[name="choice-Orc"]');
            expect(orcRadios[0].checked).toBe(true);
        });

        it('allows switching between immunity and charmed choices', async () => {
            render(<CalmEmotionsModal {...makeProps()} />);
            const goblinRadios = document.querySelectorAll('input[name="choice-Goblin"]');
            // Switch to charmed (second radio)
            await act(async () => { fireEvent.click(goblinRadios[1]); });
            await waitFor(() => {
                expect(goblinRadios[1].checked).toBe(true);
            });
        });

        it('has independent choice radio groups per target', () => {
            render(<CalmEmotionsModal {...makeProps()} />);
            const goblinRadios = document.querySelectorAll('input[name="choice-Goblin"]');
            const orcRadios = document.querySelectorAll('input[name="choice-Orc"]');
            expect(goblinRadios).toHaveLength(2);
            expect(orcRadios).toHaveLength(2);
            expect(goblinRadios[0].checked).toBe(true);
            expect(orcRadios[0].checked).toBe(true);
        });
    });

    // ── Metamagic Heighten ──

    describe('metamagic heighten rendering', () => {
        it('does not show heighten radios when metamagicHeighten is false', () => {
            render(<CalmEmotionsModal {...makeProps({ metamagicHeighten: false })} />);
            const heightenRadios = document.querySelectorAll('input[name="heightenTarget"]');
            expect(heightenRadios).toHaveLength(0);
        });

        it('shows heighten radios when metamagicHeighten is true', () => {
            render(<CalmEmotionsModal {...makeProps({ metamagicHeighten: true })} />);
            const heightenRadios = document.querySelectorAll('input[name="heightenTarget"]');
            expect(heightenRadios).toHaveLength(3);
        });

        it('allows selecting a heighten target', async () => {
            render(<CalmEmotionsModal {...makeProps({ metamagicHeighten: true })} />);
            const heightenRadios = document.querySelectorAll('input[name="heightenTarget"]');
            await act(async () => { fireEvent.click(heightenRadios[1]); });
            await waitFor(() => {
                expect(heightenRadios[1].checked).toBe(true);
            });
        });
    });

    // ── Metamagic Careful ──

    describe('metamagic careful rendering', () => {
        it('does not show careful spell protection when metamagicCareful is false', () => {
            getRuntimeValue.mockReturnValue([]);
            render(<CalmEmotionsModal {...makeProps({ metamagicCareful: false })} />);
            const rows = document.querySelectorAll('.secondary-target-row');
            rows.forEach(row => {
                expect(row.textContent).not.toContain('Careful');
            });
        });

        it('shows careful spell protection when metamagicCareful is true and ally is in list', () => {
            getAllyList.mockReturnValue(['PlayerAlly']);
            getRuntimeValue.mockReturnValue([]);
            render(<CalmEmotionsModal {...makeProps({ metamagicCareful: true })} />);
            const rows = document.querySelectorAll('.secondary-target-row');
            const playerRow = [...rows].find(row => row.textContent.includes('PlayerAlly'));
            expect(playerRow.textContent).toContain('Careful');
        });

        it('does not show careful spell protection for non-ally', () => {
            getAllyList.mockReturnValue(['OtherAlly']);
            getRuntimeValue.mockReturnValue([]);
            render(<CalmEmotionsModal {...makeProps({ metamagicCareful: true })} />);
            const rows = document.querySelectorAll('.secondary-target-row');
            const playerRow = [...rows].find(row => row.textContent.includes('PlayerAlly'));
            expect(playerRow.textContent).not.toContain('Careful');
        });
    });

    // ── Close behavior ──

    describe('close behavior', () => {
        it('closes when Skip is clicked', () => {
            const onClose = vi.fn();
            render(<CalmEmotionsModal {...makeProps({ onClose })} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('does not apply any effects when skipped', () => {
            const onClose = vi.fn();
            render(<CalmEmotionsModal {...makeProps({ onClose })} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(onClose).toHaveBeenCalledTimes(1);
            expect(applyCalmEmotionsImmunity).not.toHaveBeenCalled();
            expect(applyCalmEmotionsCharmed).not.toHaveBeenCalled();
            expect(sendSavePrompt).not.toHaveBeenCalled();
        });
    });

    // ── Empty targets ──

    describe('empty targets', () => {
        it('renders empty target list when no creatures in combat', () => {
            getCombatSummary.mockReturnValue({ creatures: [] });
            render(<CalmEmotionsModal {...makeProps()} />);
            expect(screen.getByText('No targets available.')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Cast Calm Emotions \(0\)/ })).toBeDisabled();
        });

        it('renders the caster as a target when caster is the only creature', () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Wizard1', type: 'player', currentHp: 30, maxHp: 30, saveBonuses: { cha: 4 } },
                ],
            });
            render(<CalmEmotionsModal {...makeProps()} />);
            expect(screen.getByText('Wizard1')).toBeInTheDocument();
        });
    });

    // ── Overlay targeting ──

    describe('overlay targeting', () => {
        it('renders empty fragment when player is overlay targeted with active overlay', () => {
            render(<CalmEmotionsModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'overlay-123' },
                activeOverlay: { name: 'TestOverlay' },
            })} />);
            expect(document.querySelector('.sp-overlay')).not.toBeInTheDocument();
        });

        it('renders normally when player is overlay targeted but no active overlay', () => {
            render(<CalmEmotionsModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'overlay-123' },
            })} />);
            expect(screen.getByText('Calm Emotions')).toBeInTheDocument();
        });

        it('renders normally when player is not overlay targeted', () => {
            render(<CalmEmotionsModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'normal-target' },
                activeOverlay: { name: 'TestOverlay' },
            })} />);
            expect(screen.getByText('Calm Emotions')).toBeInTheDocument();
        });
    });

    // ── Null combat summary ──

    describe('null combat summary', () => {
        it('handles null combat summary gracefully - no targets shown', () => {
            getCombatSummary.mockReturnValue(null);
            render(<CalmEmotionsModal {...makeProps()} />);
            expect(screen.getByText('No targets available.')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Cast Calm Emotions \(0\)/ })).toBeDisabled();
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
