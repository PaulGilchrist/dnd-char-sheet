import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StepsOfTheFeyTauntModal from './StepsOfTheFeyTauntModal.jsx';
import { createSaveListener } from '../../../services/automation/common/savePrompt.js';
import { addEntry } from '../../../services/ui/logService.js';

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

describe('StepsOfTheFeyTauntModal - Taunting Step', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

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
});
