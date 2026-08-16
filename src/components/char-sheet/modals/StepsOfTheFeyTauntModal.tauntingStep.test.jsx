// @improved-by-ai
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StepsOfTheFeyTauntModal from './StepsOfTheFeyTauntModal.jsx';
import { createSaveListener } from '../../../services/automation/common/savePrompt.js';
import { addEntry } from '../../../services/ui/logService.js';
import { setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

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
                await act(async () => { fireEvent.click(label); });
                expect(checkbox.checked).toBe(true);
                return label;
            }
        }
    }
    return null;
}

describe('StepsOfTheFeyTauntModal - Taunting Step', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    describe('creature selection modal rendering', () => {
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
    });

    describe('skip flow', () => {
        it('shows result view with "No targets selected" when Skip is clicked', async () => {
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

        it('shows correct remaining count after skipping', async () => {
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

        it('does not decrement count when skipping', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 3, freeCastCountKey: 'stepsRemaining' })} />);
            const tauntingOption = screen.getByText('Taunting Step').closest('.clickable');
            fireEvent.click(tauntingOption);
            const skipButton = screen.getByRole('button', { name: 'Skip' });
            fireEvent.click(skipButton);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
            });
            expect(setRuntimeValue).not.toHaveBeenCalledWith(
                'FeyTrickster',
                'stepsRemaining',
                expect.any(Number),
                'test-campaign'
            );
        });
    });

    describe('confirm flow', () => {
        it('creates a save listener for each selected target', async () => {
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

        it('logs an ability_use entry when taunting is confirmed', async () => {
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

        it('decrements free cast count when freeCastCountKey is provided', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 3, freeCastCountKey: 'stepsRemaining' })} />);
            const tauntingOption = screen.getByText('Taunting Step').closest('.clickable');
            fireEvent.click(tauntingOption);

            await selectTargetByName('Goblin1');

            const tauntButton = screen.getByRole('button', { name: /Taunt/ });
            fireEvent.click(tauntButton);

            await waitFor(() => {
                expect(setRuntimeValue).toHaveBeenCalledWith(
                    'FeyTrickster',
                    'stepsRemaining',
                    2,
                    'test-campaign'
                );
            });
        });

    });
});
