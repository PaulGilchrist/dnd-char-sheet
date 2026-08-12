import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StepsOfTheFeyTauntModal from './StepsOfTheFeyTauntModal.jsx';
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

import { setTempHp } from '../../../services/automation/handlers/buffs/tempHpService.js';

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

describe('StepsOfTheFeyTauntModal - Refreshing Step', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

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
});
