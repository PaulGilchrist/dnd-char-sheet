import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StepsOfTheFeyTauntModal from './StepsOfTheFeyTauntModal.jsx';

// ── Mocked modules ──

vi.mock('../../../services/automation/common/savePrompt.js', () => ({
    createSaveListener: vi.fn(({ targetName, saveType, saveDc }) => ({
        promptId: `prompt-${targetName}-${Date.now()}`,
        targetName,
        saveType,
        saveDc,
    })),
}));

vi.mock('../../../services/ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../services/rules/effects/expirations.js', () => ({
    addExpiration: vi.fn(),
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn((characterKey, propertyName, _campaignName) => {
        if (propertyName === 'activeConditions' && characterKey !== 'campaign') {
            return [];
        }
        if (propertyName === 'targetEffects' && characterKey === 'campaign') {
            return [];
        }
        return null;
    }),
    setRuntimeValue: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../services/automation/handlers/buffs/tempHpService.js', () => ({
    setTempHp: vi.fn(),
}));

vi.mock('../../../services/rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(() => Promise.resolve({ creatures: [] })),
}));

// ── Re-import mocked modules ──

import { createSaveListener } from '../../../services/automation/common/savePrompt.js';
import { addEntry } from '../../../services/ui/logService.js';
import { addExpiration } from '../../../services/rules/effects/expirations.js';
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { setTempHp } from '../../../services/automation/handlers/buffs/tempHpService.js';

// ── Test fixtures ──

const basePlayerStats = { name: 'FeyTrickster' };
const baseTargets = [
    { name: 'Goblin1', currentHp: 5, maxHp: 7 },
    { name: 'Orc1', currentHp: 12, maxHp: 15 },
];

const baseProps = {
    mode: 'normal',
    title: 'Steps of the Fey',
    targets: baseTargets,
    action: { name: 'Steps of the Fey', automation: { type: 'class_feature' } },
    playerStats: basePlayerStats,
    campaignName: 'test-campaign',
    saveDc: 14,
    featureName: 'Steps of the Fey',
    newCount: 3,
    onClose: vi.fn(),
};

function makeProps(overrides) {
    return { ...baseProps, ...(overrides || {}) };
}

// Helper to select a target by name in CreatureSelectionModal
async function selectTargetByName(name) {
    const labels = document.querySelectorAll('.secondary-target-row');
    for (const label of labels) {
        if (label.textContent.includes(name)) {
            const checkbox = label.querySelector('input[type="checkbox"]');
            if (checkbox) {
                // Click the label to trigger toggleTarget via onClick
                await act(async () => { fireEvent.click(label); });
                // Verify the checkbox is now checked
                expect(checkbox.checked).toBe(true);
                return label;
            }
        }
    }
    return null;
}

// ── Tests ──

describe('StepsOfTheFeyTauntModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    // ── Initial render / display ──

    describe('initial render', () => {
        it('renders the modal overlay, container, header, body, and actions sections', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
            expect(document.querySelector('.sp-modal')).toBeInTheDocument();
            expect(document.querySelector('.sp-header')).toBeInTheDocument();
            expect(document.querySelector('.sp-body')).toBeInTheDocument();
            expect(document.querySelector('.sp-actions')).toBeInTheDocument();
        });

        it('renders the feature name in the header with wand icon', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const header = document.querySelector('.sp-header');
            expect(header.textContent).toContain('Steps of the Fey');
            expect(header.querySelector('.fa-solid.fa-wand-sparkles')).toBeInTheDocument();
        });

        it('renders the choice prompt text', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            expect(screen.getByText(/Choose how you use/)).toBeInTheDocument();
        });

        it('renders all four step options', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            expect(screen.getByText('Refreshing Step')).toBeInTheDocument();
            expect(screen.getByText('Taunting Step')).toBeInTheDocument();
            expect(screen.getByText('Disappearing Step')).toBeInTheDocument();
            expect(screen.getByText('Dreadful Step')).toBeInTheDocument();
        });

        it('renders the description for each step option', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            expect(screen.getByText(/Gain 1d10 Temporary Hit Points/)).toBeInTheDocument();
            expect(screen.getByText(/Disadvantage on attack rolls/)).toBeInTheDocument();
            expect(screen.getByText(/Invisible condition/)).toBeInTheDocument();
            expect(screen.getByText(/2d10 Psychic damage/)).toBeInTheDocument();
        });

        it('renders the correct icon for each step option', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const clickableOptions = document.querySelectorAll('.clickable');
            // First option: Refreshing Step (heart-pulse)
            expect(clickableOptions[0].querySelector('.fa-solid.fa-heart-pulse')).toBeInTheDocument();
            // Second option: Taunting Step (wand-sparkles)
            expect(clickableOptions[1].querySelector('.fa-solid.fa-wand-sparkles')).toBeInTheDocument();
            // Third option: Disappearing Step (eye-slash)
            expect(clickableOptions[2].querySelector('.fa-solid.fa-eye-slash')).toBeInTheDocument();
            // Fourth option: Dreadful Step (brain)
            expect(clickableOptions[3].querySelector('.fa-solid.fa-brain')).toBeInTheDocument();
        });

        it('renders the Skip button', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
        });

        it('renders the skip button with Misty Step only text when mode is mistyEscape', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ mode: 'mistyEscape' })} />);
            expect(screen.getByRole('button', { name: 'Misty Step only (free cast)' })).toBeInTheDocument();
        });

        it('renders the skip button with Misty Step only text when title is Bewitching Magic', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ title: 'Bewitching Magic' })} />);
            expect(screen.getByRole('button', { name: 'Misty Step only (free cast)' })).toBeInTheDocument();
        });
    });

    // ── No uses remaining ──

    describe('no uses remaining', () => {
        it('renders the no uses remaining message when newCount is 0', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 0 })} />);
            expect(screen.getByText(/No uses remaining/)).toBeInTheDocument();
        });

        it('does not make options clickable when newCount is 0', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 0 })} />);
            const options = document.querySelectorAll('.clickable');
            options.forEach(option => {
                expect(option.style.cursor).toBe('default');
                expect(option.style.opacity).toBe('0.4');
            });
        });

        it('still shows the Misty Step only button when no uses', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 0 })} />);
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
        });
    });

    // ── Choice step interactions ──

    describe('choice step interactions', () => {
        it('selects Refreshing Step when clicked', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            expect(screen.getByText(/Refreshing Step/)).toBeInTheDocument();
        });

        it('selects Taunting Step when clicked', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const tauntingOption = screen.getByText('Taunting Step').closest('.clickable');
            fireEvent.click(tauntingOption);
            expect(screen.getByText(/Taunting Step: Select creatures/)).toBeInTheDocument();
        });

        it('selects Disappearing Step when clicked', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const disappearingOption = screen.getByText('Disappearing Step').closest('.clickable');
            fireEvent.click(disappearingOption);
            expect(screen.getByText(/Disappearing Step/)).toBeInTheDocument();
        });

        it('selects Dreadful Step when clicked', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const dreadfulOption = screen.getByText('Dreadful Step').closest('.clickable');
            fireEvent.click(dreadfulOption);
            expect(screen.getByText(/Dreadful Step: Select creatures/)).toBeInTheDocument();
        });

        it('allows re-selecting a different step after choosing one', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            expect(screen.getByText(/Refreshing Step/)).toBeInTheDocument();

            const cancelButton = screen.getByRole('button', { name: 'Cancel' });
            fireEvent.click(cancelButton);

            expect(document.querySelector('.sp-header').querySelector('.fa-solid.fa-wand-sparkles')).toBeInTheDocument();
            expect(screen.getByText('Refreshing Step')).toBeInTheDocument();
        });
    });

    // ── Refreshing Step flow ──

    describe('refreshing step flow', () => {
        it('shows confirmation dialog when Refreshing Step is selected', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            expect(screen.getByText(/Refreshing Step/)).toBeInTheDocument();
            expect(screen.getByText(/You gain 1d10 Temporary Hit Points/)).toBeInTheDocument();
        });

        it('renders Refresh button with heart-pulse icon in confirmation', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            const refreshButton = screen.getByRole('button', { name: /Refresh/ });
            expect(refreshButton).toBeInTheDocument();
            expect(refreshButton.querySelector('.fa-solid.fa-heart-pulse')).toBeInTheDocument();
        });

        it('renders Cancel button in Refreshing Step confirmation', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        });

        it('applies refreshing step when Refresh button is clicked', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            const refreshButton = screen.getByRole('button', { name: /Refresh/ });
            fireEvent.click(refreshButton);

            await waitFor(() => {
                expect(setTempHp).toHaveBeenCalledWith('FeyTrickster', expect.any(Number), 'test-campaign');
            });
        });

        it('shows result view after applying refreshing step', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            const refreshButton = screen.getByRole('button', { name: /Refresh/ });
            fireEvent.click(refreshButton);

            await waitFor(() => {
                expect(screen.getByText(/Refreshing Step/)).toBeInTheDocument();
                expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
            });
        });

        it('shows temp HP amount in result description', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            const refreshButton = screen.getByRole('button', { name: /Refresh/ });
            fireEvent.click(refreshButton);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
                const body = document.querySelector('.sp-body');
                expect(body.textContent).toContain('Refreshing Step');
                expect(body.textContent).toContain('Temporary Hit Points');
            });
        });

        it('decrements the free cast count after applying refreshing step', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 3, freeCastCountKey: 'stepsRemaining' })} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            const refreshButton = screen.getByRole('button', { name: /Refresh/ });
            fireEvent.click(refreshButton);

            await waitFor(() => {
                expect(setRuntimeValue).toHaveBeenCalledWith(
                    'FeyTrickster',
                    'stepsRemaining',
                    2,
                    'test-campaign'
                );
            });
        });

        it('includes remaining count in result description after refreshing step', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 3 })} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            const refreshButton = screen.getByRole('button', { name: /Refresh/ });
            fireEvent.click(refreshButton);

            await waitFor(() => {
                const body = document.querySelector('.sp-body');
                expect(body.textContent).toContain('2 remaining');
            });
        });

        it('calls onClose when Done is clicked after refreshing step', async () => {
            const onClose = vi.fn();
            render(<StepsOfTheFeyTauntModal {...makeProps({ onClose })} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            const refreshButton = screen.getByRole('button', { name: /Refresh/ });
            fireEvent.click(refreshButton);

            await waitFor(() => {
                fireEvent.click(screen.getByRole('button', { name: 'Done' }));
            });
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('does not decrement count when Refreshing Step is cancelled', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 3 })} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            const cancelButton = screen.getByRole('button', { name: 'Cancel' });
            fireEvent.click(cancelButton);

            expect(screen.getByText('Refreshing Step')).toBeInTheDocument();
            expect(setRuntimeValue).not.toHaveBeenCalled();
        });
    });

    // ── Disappearing Step flow ──

    describe('disappearing step flow', () => {
        it('shows confirmation dialog when Disappearing Step is selected', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const disappearingOption = screen.getByText('Disappearing Step').closest('.clickable');
            fireEvent.click(disappearingOption);
            expect(screen.getByText(/Disappearing Step/)).toBeInTheDocument();
        });

        it('renders Disappear button with eye-slash icon in confirmation', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const disappearingOption = screen.getByText('Disappearing Step').closest('.clickable');
            fireEvent.click(disappearingOption);
            const disappearButton = screen.getByRole('button', { name: /Disappear/ });
            expect(disappearButton).toBeInTheDocument();
            expect(disappearButton.querySelector('.fa-solid.fa-eye-slash')).toBeInTheDocument();
        });

        it('renders Cancel button in Disappearing Step confirmation', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const disappearingOption = screen.getByText('Disappearing Step').closest('.clickable');
            fireEvent.click(disappearingOption);
            expect(screen.getByText(/Disappearing Step/)).toBeInTheDocument();
            expect(screen.getByText(/Invisible condition until the start of your next turn/)).toBeInTheDocument();
        });

        it('applies invisible condition when Disappear button is clicked', async () => {
            vi.mocked(getRuntimeValue).mockImplementation((key, prop) => {
                if (prop === 'activeConditions' && key === 'FeyTrickster') return [];
                return null;
            });

            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const disappearingOption = screen.getByText('Disappearing Step').closest('.clickable');
            fireEvent.click(disappearingOption);
            const disappearButton = screen.getByRole('button', { name: /Disappear/ });
            fireEvent.click(disappearButton);

            await waitFor(() => {
                expect(setRuntimeValue).toHaveBeenCalledWith(
                    'FeyTrickster',
                    'activeConditions',
                    expect.arrayContaining(['invisible']),
                    'test-campaign'
                );
            });
        });

        it('adds expiration for invisible condition when Disappear is clicked', async () => {
            vi.mocked(getRuntimeValue).mockImplementation((key, prop) => {
                if (prop === 'activeConditions' && key === 'FeyTrickster') return [];
                return null;
            });

            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const disappearingOption = screen.getByText('Disappearing Step').closest('.clickable');
            fireEvent.click(disappearingOption);
            const disappearButton = screen.getByRole('button', { name: /Disappear/ });
            fireEvent.click(disappearButton);

            await waitFor(() => {
                expect(addExpiration).toHaveBeenCalledWith(
                    'FeyTrickster',
                    'FeyTrickster',
                    expect.arrayContaining([expect.objectContaining({ type: 'condition', condition: 'invisible' })]),
                    'test-campaign',
                    undefined,
                    'FeyTrickster'
                );
            });
        });

        it('does not add duplicate invisible condition if already present', async () => {
            vi.mocked(getRuntimeValue).mockImplementation((key, prop) => {
                if (prop === 'activeConditions' && key === 'FeyTrickster') return ['invisible'];
                return null;
            });

            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const disappearingOption = screen.getByText('Disappearing Step').closest('.clickable');
            fireEvent.click(disappearingOption);
            const disappearButton = screen.getByRole('button', { name: /Disappear/ });
            fireEvent.click(disappearButton);

            await waitFor(() => {
                // addExpiration should still be called even if condition already exists
                expect(addExpiration).toHaveBeenCalled();
            });
        });

        it('shows result view after applying disappearing step', async () => {
            vi.mocked(getRuntimeValue).mockImplementation((key, prop) => {
                if (prop === 'activeConditions' && key === 'FeyTrickster') return [];
                return null;
            });

            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const disappearingOption = screen.getByText('Disappearing Step').closest('.clickable');
            fireEvent.click(disappearingOption);
            const disappearButton = screen.getByRole('button', { name: /Disappear/ });
            fireEvent.click(disappearButton);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
                const body = document.querySelector('.sp-body');
                expect(body.textContent).toContain('Disappearing Step');
                expect(body.textContent).toContain('Invisible condition');
            });
        });

        it('includes remaining count in result description after disappearing step', async () => {
            vi.mocked(getRuntimeValue).mockImplementation((key, prop) => {
                if (prop === 'activeConditions' && key === 'FeyTrickster') return [];
                return null;
            });

            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 3 })} />);
            const disappearingOption = screen.getByText('Disappearing Step').closest('.clickable');
            fireEvent.click(disappearingOption);
            const disappearButton = screen.getByRole('button', { name: /Disappear/ });
            fireEvent.click(disappearButton);

            await waitFor(() => {
                const body = document.querySelector('.sp-body');
                expect(body.textContent).toContain('2 remaining');
            });
        });

        it('calls onClose when Done is clicked after disappearing step', async () => {
            const onClose = vi.fn();
            vi.mocked(getRuntimeValue).mockImplementation((key, prop) => {
                if (prop === 'activeConditions' && key === 'FeyTrickster') return [];
                return null;
            });

            render(<StepsOfTheFeyTauntModal {...makeProps({ onClose })} />);
            const disappearingOption = screen.getByText('Disappearing Step').closest('.clickable');
            fireEvent.click(disappearingOption);
            const disappearButton = screen.getByRole('button', { name: /Disappear/ });
            fireEvent.click(disappearButton);

            await waitFor(() => {
                fireEvent.click(screen.getByRole('button', { name: 'Done' }));
            });
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('does not apply condition when Disappearing Step is cancelled', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const disappearingOption = screen.getByText('Disappearing Step').closest('.clickable');
            fireEvent.click(disappearingOption);
            const cancelButton = screen.getByRole('button', { name: 'Cancel' });
            fireEvent.click(cancelButton);

            expect(screen.getByText('Disappearing Step')).toBeInTheDocument();
            expect(setRuntimeValue).not.toHaveBeenCalled();
        });
    });

    // ── Taunting Step flow ──

    describe('taunting step flow', () => {
        it('shows CreatureSelectionModal when Taunting Step is selected', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const tauntingOption = screen.getByText('Taunting Step').closest('.clickable');
            fireEvent.click(tauntingOption);
            expect(screen.getByText(/Taunting Step: Select creatures/)).toBeInTheDocument();
        });

        it('renders the taunting description in the creature selection modal', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const tauntingOption = screen.getByText('Taunting Step').closest('.clickable');
            fireEvent.click(tauntingOption);
            expect(screen.getByText(/Disadvantage on attack rolls against creatures other than you/)).toBeInTheDocument();
        });

        it('renders target list from props', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const tauntingOption = screen.getByText('Taunting Step').closest('.clickable');
            fireEvent.click(tauntingOption);
            expect(screen.getByText('Goblin1')).toBeInTheDocument();
            expect(screen.getByText('Orc1')).toBeInTheDocument();
        });

        it('renders Taunt button in creature selection modal', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const tauntingOption = screen.getByText('Taunting Step').closest('.clickable');
            fireEvent.click(tauntingOption);
            expect(screen.getByRole('button', { name: /Taunt/ })).toBeInTheDocument();
        });

        it('renders Skip button in creature selection modal', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const tauntingOption = screen.getByText('Taunting Step').closest('.clickable');
            fireEvent.click(tauntingOption);
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
        });

        it('skips taunting step and shows result when Skip is clicked', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const tauntingOption = screen.getByText('Taunting Step').closest('.clickable');
            fireEvent.click(tauntingOption);
            const skipButton = screen.getByRole('button', { name: 'Skip' });
            fireEvent.click(skipButton);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
                const body = document.querySelector('.sp-body');
                expect(body.textContent).toContain('Taunting Step');
                expect(body.textContent).toContain('No targets selected');
            });
        });

        it('shows result with correct remaining count after skip', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 3 })} />);
            const tauntingOption = screen.getByText('Taunting Step').closest('.clickable');
            fireEvent.click(tauntingOption);
            const skipButton = screen.getByRole('button', { name: 'Skip' });
            fireEvent.click(skipButton);

            await waitFor(() => {
                const body = document.querySelector('.sp-body');
                expect(body.textContent).toContain('3 remaining');
            });
        });

        it('confirms targets and shows save prompt when Taunt is clicked', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const tauntingOption = screen.getByText('Taunting Step').closest('.clickable');
            fireEvent.click(tauntingOption);

            await selectTargetByName('Goblin1');

            const tauntButton = screen.getByRole('button', { name: /Taunt/ });
            fireEvent.click(tauntButton);

            await waitFor(() => {
                expect(createSaveListener).toHaveBeenCalledWith(
                    'test-campaign',
                    expect.objectContaining({
                        targetName: 'Goblin1',
                        saveType: 'WIS',
                        saveDc: 14,
                    })
                );
            });
        });

        it('creates save listeners for all selected targets', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const tauntingOption = screen.getByText('Taunting Step').closest('.clickable');
            fireEvent.click(tauntingOption);

            await selectTargetByName('Goblin1');
            await selectTargetByName('Orc1');

            const tauntButton = screen.getByRole('button', { name: /Taunt/ });
            fireEvent.click(tauntButton);

            await waitFor(() => {
                expect(createSaveListener).toHaveBeenCalledTimes(2);
            });
        });

        it('logs ability_use entry when taunting is confirmed', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const tauntingOption = screen.getByText('Taunting Step').closest('.clickable');
            fireEvent.click(tauntingOption);

            await selectTargetByName('Goblin1');

            const tauntButton = screen.getByRole('button', { name: /Taunt/ });
            fireEvent.click(tauntButton);

            await waitFor(() => {
                expect(addEntry).toHaveBeenCalledWith(
                    'test-campaign',
                    expect.objectContaining({
                        type: 'ability_use',
                        characterName: 'FeyTrickster',
                        abilityName: 'Steps of the Fey',
                    })
                );
            });
        });
    });

    // ── Dreadful Step flow ──

    describe('dreadful step flow', () => {
        it('shows CreatureSelectionModal when Dreadful Step is selected', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const dreadfulOption = screen.getByText('Dreadful Step').closest('.clickable');
            fireEvent.click(dreadfulOption);
            expect(screen.getByText(/Dreadful Step: Select creatures/)).toBeInTheDocument();
        });

        it('renders the dreadful description in the creature selection modal', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const dreadfulOption = screen.getByText('Dreadful Step').closest('.clickable');
            fireEvent.click(dreadfulOption);
            expect(screen.getByText(/2d10 Psychic damage/)).toBeInTheDocument();
        });

        it('renders the save DC in the dreadful description', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ saveDc: 16 })} />);
            const dreadfulOption = screen.getByText('Dreadful Step').closest('.clickable');
            fireEvent.click(dreadfulOption);
            expect(screen.getByText(/DC 16/)).toBeInTheDocument();
        });

        it('renders Dreadful button with brain icon in creature selection modal', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const dreadfulOption = screen.getByText('Dreadful Step').closest('.clickable');
            fireEvent.click(dreadfulOption);
            const dreadfulButton = screen.getByRole('button', { name: /Dreadful/ });
            expect(dreadfulButton).toBeInTheDocument();
            expect(dreadfulButton.querySelector('.fa-solid.fa-brain')).toBeInTheDocument();
        });

        it('renders Skip button in dreadful creature selection modal', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const dreadfulOption = screen.getByText('Dreadful Step').closest('.clickable');
            fireEvent.click(dreadfulOption);
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
        });

        it('skips dreadful step and shows result when Skip is clicked', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const dreadfulOption = screen.getByText('Dreadful Step').closest('.clickable');
            fireEvent.click(dreadfulOption);
            const skipButton = screen.getByRole('button', { name: 'Skip' });
            fireEvent.click(skipButton);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
                const body = document.querySelector('.sp-body');
                // Note: skip handler uses mode-based label, not step-based
                expect(body.textContent).toContain('No targets selected');
            });
        });

        it('shows result with correct remaining count after dreadful skip', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 3 })} />);
            const dreadfulOption = screen.getByText('Dreadful Step').closest('.clickable');
            fireEvent.click(dreadfulOption);
            const skipButton = screen.getByRole('button', { name: 'Skip' });
            fireEvent.click(skipButton);

            await waitFor(() => {
                const body = document.querySelector('.sp-body');
                expect(body.textContent).toContain('3 remaining');
            });
        });

        it('confirms targets and shows save prompt when Dreadful is clicked', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const dreadfulOption = screen.getByText('Dreadful Step').closest('.clickable');
            fireEvent.click(dreadfulOption);

            await selectTargetByName('Goblin1');

            const dreadfulButton = screen.getByRole('button', { name: /Dreadful/ });
            fireEvent.click(dreadfulButton);

            await waitFor(() => {
                expect(createSaveListener).toHaveBeenCalledWith(
                    'test-campaign',
                    expect.objectContaining({
                        targetName: 'Goblin1',
                        saveType: 'WIS',
                        saveDc: 14,
                    })
                );
            });
        });

        it('logs ability_use entry when dreadful is confirmed', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const dreadfulOption = screen.getByText('Dreadful Step').closest('.clickable');
            fireEvent.click(dreadfulOption);

            await selectTargetByName('Goblin1');

            const dreadfulButton = screen.getByRole('button', { name: /Dreadful/ });
            fireEvent.click(dreadfulButton);

            await waitFor(() => {
                expect(addEntry).toHaveBeenCalledWith(
                    'test-campaign',
                    expect.objectContaining({
                        type: 'ability_use',
                        characterName: 'FeyTrickster',
                        abilityName: 'Steps of the Fey',
                    })
                );
            });
        });
    });

    // ── Result view ──

    describe('result view', () => {
        it('renders Done button in result view', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            const refreshButton = screen.getByRole('button', { name: /Refresh/ });
            fireEvent.click(refreshButton);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
            });
        });

        it('renders the result header with wand icon', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            const refreshButton = screen.getByRole('button', { name: /Refresh/ });
            fireEvent.click(refreshButton);

            await waitFor(() => {
                expect(document.querySelector('.sp-header .fa-solid.fa-wand-sparkles')).toBeInTheDocument();
            });
        });

        it('renders result description via dangerouslySetInnerHTML', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            const refreshButton = screen.getByRole('button', { name: /Refresh/ });
            fireEvent.click(refreshButton);

            await waitFor(() => {
                const body = document.querySelector('.sp-body');
                expect(body).toHaveTextContent('Steps of the Fey');
                expect(body).toHaveTextContent('Refreshing Step');
            });
        });

        it('hides the choice options after applying', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            const refreshButton = screen.getByRole('button', { name: /Refresh/ });
            fireEvent.click(refreshButton);

            await waitFor(() => {
                expect(screen.queryByText('Taunting Step')).not.toBeInTheDocument();
                expect(screen.queryByText('Disappearing Step')).not.toBeInTheDocument();
                expect(screen.queryByText('Dreadful Step')).not.toBeInTheDocument();
            });
        });

        it('hides the skip button after applying', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            const refreshButton = screen.getByRole('button', { name: /Refresh/ });
            fireEvent.click(refreshButton);

            await waitFor(() => {
                expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument();
            });
        });

        it('calls onClose when Done is clicked in result view', async () => {
            const onClose = vi.fn();
            render(<StepsOfTheFeyTauntModal {...makeProps({ onClose })} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            const refreshButton = screen.getByRole('button', { name: /Refresh/ });
            fireEvent.click(refreshButton);

            await waitFor(() => {
                fireEvent.click(screen.getByRole('button', { name: 'Done' }));
            });
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('calls onClose when overlay is clicked in result view', async () => {
            const onClose = vi.fn();
            render(<StepsOfTheFeyTauntModal {...makeProps({ onClose })} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            const refreshButton = screen.getByRole('button', { name: /Refresh/ });
            fireEvent.click(refreshButton);

            await waitFor(() => {
                const overlay = document.querySelector('.sp-overlay');
                fireEvent.click(overlay);
            });
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('does not call onClose when modal content is clicked in result view', async () => {
            const onClose = vi.fn();
            render(<StepsOfTheFeyTauntModal {...makeProps({ onClose })} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            const refreshButton = screen.getByRole('button', { name: /Refresh/ });
            fireEvent.click(refreshButton);

            await waitFor(() => {
                const modal = document.querySelector('.sp-modal');
                fireEvent.click(modal);
            });
            expect(onClose).not.toHaveBeenCalled();
        });
    });

    // ── Overlay interactions ──

    describe('overlay interactions', () => {
        it('clicking the overlay in choice step transitions to result view (free cast skip)', async () => {
            const onClose = vi.fn();
            render(<StepsOfTheFeyTauntModal {...makeProps({ onClose })} />);
            const overlay = document.querySelector('.sp-overlay');
            fireEvent.click(overlay);
            // Overlay click triggers handleSkipChoice -> handleFreeCastSkip -> result view
            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
            });
            expect(onClose).not.toHaveBeenCalled();
        });

        it('does not call onClose when modal content is clicked in choice step', () => {
            const onClose = vi.fn();
            render(<StepsOfTheFeyTauntModal {...makeProps({ onClose })} />);
            const modal = document.querySelector('.sp-modal');
            fireEvent.click(modal);
            expect(onClose).not.toHaveBeenCalled();
        });

        it('calls onClose when the overlay is clicked in confirmation step', () => {
            const onClose = vi.fn();
            render(<StepsOfTheFeyTauntModal {...makeProps({ onClose })} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            const overlay = document.querySelector('.sp-overlay');
            fireEvent.click(overlay);
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    // ── Custom title / feature name ──

    describe('custom title and feature name', () => {
        it('renders custom title in header when provided', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ title: 'Custom Step Name' })} />);
            const header = document.querySelector('.sp-header');
            expect(header.textContent).toContain('Custom Step Name');
        });

        it('renders feature name in result description', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ featureName: 'Custom Feature' })} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            const refreshButton = screen.getByRole('button', { name: /Refresh/ });
            fireEvent.click(refreshButton);

            await waitFor(() => {
                const body = document.querySelector('.sp-body');
                expect(body.textContent).toContain('Custom Feature');
            });
        });

        it('renders title in result header when provided', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ title: 'My Fey Steps' })} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            const refreshButton = screen.getByRole('button', { name: /Refresh/ });
            fireEvent.click(refreshButton);

            await waitFor(() => {
                expect(screen.getByText('My Fey Steps')).toBeInTheDocument();
            });
        });
    });

    // ── Mode-specific skip button label ──

    describe('mode-specific skip button label', () => {
        it('shows "Misty Step only (free cast)" when mode is mistyEscape', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ mode: 'mistyEscape' })} />);
            expect(screen.getByRole('button', { name: 'Misty Step only (free cast)' })).toBeInTheDocument();
        });

        it('shows "Misty Step only (free cast)" when title is Bewitching Magic', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ title: 'Bewitching Magic' })} />);
            expect(screen.getByRole('button', { name: 'Misty Step only (free cast)' })).toBeInTheDocument();
        });

        it('shows "Skip" for normal mode', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ mode: 'normal' })} />);
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
        });
    });

    // ── Free cast flow (no count decrement) ──

    describe('free cast flow', () => {
        it('does not decrement count when freeCastCountKey is null in refreshing step', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 3, freeCastCountKey: null })} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            const refreshButton = screen.getByRole('button', { name: /Refresh/ });
            fireEvent.click(refreshButton);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
            });
            const body = document.querySelector('.sp-body');
            // Description always uses newCount-1 for remaining, but runtime value isn't updated
            expect(body.textContent).toContain('2 remaining');
        });

        it('shows correct remaining count after free cast skip in mistyEscape mode', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ mode: 'mistyEscape', newCount: 3 })} />);
            const skipButton = screen.getByRole('button', { name: 'Misty Step only (free cast)' });
            fireEvent.click(skipButton);

            await waitFor(() => {
                const body = document.querySelector('.sp-body');
                expect(body.textContent).toContain('3 remaining');
            });
        });
    });

    // ── Multiple targets ──

    describe('multiple targets', () => {
        it('creates save listeners for all selected targets in taunting step', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const tauntingOption = screen.getByText('Taunting Step').closest('.clickable');
            fireEvent.click(tauntingOption);

            await selectTargetByName('Goblin1');
            await selectTargetByName('Orc1');

            const tauntButton = screen.getByRole('button', { name: /Taunt/ });
            fireEvent.click(tauntButton);

            await waitFor(() => {
                expect(createSaveListener).toHaveBeenCalledTimes(2);
                expect(createSaveListener).toHaveBeenCalledWith(
                    'test-campaign',
                    expect.objectContaining({ targetName: 'Goblin1' })
                );
                expect(createSaveListener).toHaveBeenCalledWith(
                    'test-campaign',
                    expect.objectContaining({ targetName: 'Orc1' })
                );
            });
        });

        it('creates save listeners for all selected targets in dreadful step', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const dreadfulOption = screen.getByText('Dreadful Step').closest('.clickable');
            fireEvent.click(dreadfulOption);

            await selectTargetByName('Goblin1');
            await selectTargetByName('Orc1');

            const dreadfulButton = screen.getByRole('button', { name: /Dreadful/ });
            fireEvent.click(dreadfulButton);

            await waitFor(() => {
                expect(createSaveListener).toHaveBeenCalledTimes(2);
            });
        });
    });

});
