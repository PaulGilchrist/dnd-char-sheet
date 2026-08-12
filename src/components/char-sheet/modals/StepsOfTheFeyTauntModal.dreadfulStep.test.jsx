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

describe('StepsOfTheFeyTauntModal - Dreadful Step', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

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
});
