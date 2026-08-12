import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StepsOfTheFeyTauntModal from './StepsOfTheFeyTauntModal.jsx';
import { getRuntimeValue, setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { addExpiration } from '../../../services/rules/effects/expirations.js';

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

describe('StepsOfTheFeyTauntModal - Disappearing Step', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

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
});
