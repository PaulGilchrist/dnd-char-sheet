// @improved-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StepsOfTheFeyTauntModal from './StepsOfTheFeyTauntModal.jsx';
import { createSaveListener } from '../../../services/automation/common/savePrompt.js';
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
        return [];
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

async function selectTargetByName(name) {
    const labels = document.querySelectorAll('.secondary-target-row');
    for (const label of labels) {
        if (label.textContent.includes(name)) {
            const checkbox = label.querySelector('input[type="checkbox"]');
            if (checkbox) {
                fireEvent.click(label);
                expect(checkbox.checked).toBe(true);
                return label;
            }
        }
    }
    return null;
}

function renderToResult() {
    const refreshingOption = screen.getByText('Refreshing Step');
    fireEvent.click(refreshingOption);
    const refreshButton = screen.getByRole('button', { name: /Refresh/ });
    fireEvent.click(refreshButton);
}

describe('StepsOfTheFeyTauntModal - Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    describe('result view', () => {
        it('transitions to result view with Done button after applying refreshing step', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            renderToResult();
            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
            });
        });

        it('renders the result header with wand icon', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            renderToResult();
            await waitFor(() => {
                expect(document.querySelector('.sp-header .fa-solid.fa-wand-sparkles')).toBeInTheDocument();
            });
        });

        it('renders result description via dangerouslySetInnerHTML', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            renderToResult();
            await waitFor(() => {
                const body = document.querySelector('.sp-body');
                expect(body).toHaveTextContent('Steps of the Fey');
                expect(body).toHaveTextContent('Refreshing Step');
            });
        });

        it('hides choice options and skip button after applying', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            renderToResult();
            await waitFor(() => {
                expect(screen.queryByText('Taunting Step')).not.toBeInTheDocument();
                expect(screen.queryByText('Disappearing Step')).not.toBeInTheDocument();
                expect(screen.queryByText('Dreadful Step')).not.toBeInTheDocument();
                expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument();
                expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
            });
        });

        it('calls onClose when Done is clicked in result view', async () => {
            const onClose = vi.fn();
            render(<StepsOfTheFeyTauntModal {...makeProps({ onClose })} />);
            renderToResult();
            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
            });
            fireEvent.click(screen.getByRole('button', { name: 'Done' }));
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('does not call onClose when modal content is clicked in result view', async () => {
            const onClose = vi.fn();
            render(<StepsOfTheFeyTauntModal {...makeProps({ onClose })} />);
            renderToResult();
            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
            });
            const modal = document.querySelector('.sp-modal');
            fireEvent.click(modal);
            expect(onClose).not.toHaveBeenCalled();
        });
    });

    describe('overlay interactions', () => {
        it('does not call onClose when overlay is clicked in choice step', () => {
            const onClose = vi.fn();
            render(<StepsOfTheFeyTauntModal {...makeProps({ onClose })} />);
            const overlay = document.querySelector('.sp-overlay');
            fireEvent.click(overlay);
            expect(onClose).not.toHaveBeenCalled();
        });

        it('transitions to result view when overlay is clicked in choice step', async () => {
            const onClose = vi.fn();
            render(<StepsOfTheFeyTauntModal {...makeProps({ onClose })} />);
            const overlay = document.querySelector('.sp-overlay');
            fireEvent.click(overlay);
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
    });

    describe('custom title and feature name', () => {
        it('renders custom title in header when provided', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ title: 'Custom Step Name' })} />);
            const header = document.querySelector('.sp-header');
            expect(header.textContent).toContain('Custom Step Name');
        });

        it('renders feature name in result description', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ featureName: 'Custom Feature' })} />);
            renderToResult();
            await waitFor(() => {
                const body = document.querySelector('.sp-body');
                expect(body.textContent).toContain('Custom Feature');
            });
        });

        it('renders title in result header when provided', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ title: 'My Fey Steps' })} />);
            renderToResult();
            await waitFor(() => {
                expect(screen.getByText('My Fey Steps')).toBeInTheDocument();
            });
        });
    });

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

    describe('free cast flow', () => {
        it('does not call setRuntimeValue when freeCastCountKey is null', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 3, freeCastCountKey: null })} />);
            renderToResult();
            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
            });
            expect(setRuntimeValue).not.toHaveBeenCalled();
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

    describe('multiple targets', () => {
        it('creates save listeners for all selected targets in taunting step', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const tauntingOption = screen.getByText('Taunting Step');
            fireEvent.click(tauntingOption);
            await selectTargetByName('Goblin1');
            await selectTargetByName('Orc1');
            const tauntButton = screen.getByRole('button', { name: /Taunt/ });
            fireEvent.click(tauntButton);
            await waitFor(() => {
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
            const dreadfulOption = screen.getByText('Dreadful Step');
            fireEvent.click(dreadfulOption);
            await selectTargetByName('Goblin1');
            await selectTargetByName('Orc1');
            const dreadfulButton = screen.getByRole('button', { name: /Dreadful/ });
            fireEvent.click(dreadfulButton);
            await waitFor(() => {
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
    });

    describe('edge cases', () => {
        it('does not allow selecting options when no uses remain', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 0 })} />);
            expect(screen.getByText(/No uses remaining/)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
        });

        it('transitions to result view when Disappearing Step is confirmed', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 5 })} />);
            const disappearingOption = screen.getByText('Disappearing Step');
            fireEvent.click(disappearingOption);
            const disappearButton = screen.getByRole('button', { name: 'Disappear' });
            fireEvent.click(disappearButton);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
            });
        });

        it('transitions to result view when skip is pressed in taunting step with no targets', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 5 })} />);
            const tauntingOption = screen.getByText('Taunting Step');
            fireEvent.click(tauntingOption);
            const skipButton = screen.getByRole('button', { name: 'Skip' });
            fireEvent.click(skipButton);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
            });
        });
    });
});
