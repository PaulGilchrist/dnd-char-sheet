// @improved-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StepsOfTheFeyTauntModal from './StepsOfTheFeyTauntModal.jsx';

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

describe('StepsOfTheFeyTauntModal - Choice Step', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    describe('choice step view transitions', () => {
        it('transitions to Refreshing Step confirmation view when selected', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            expect(screen.getByRole('button', { name: /Refresh/ })).toBeInTheDocument();
        });

        it('transitions to Taunting Step creature selection when selected', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const tauntingOption = screen.getByText('Taunting Step').closest('.clickable');
            fireEvent.click(tauntingOption);
            expect(screen.getByRole('button', { name: /Taunt/ })).toBeInTheDocument();
        });

        it('transitions to Disappearing Step confirmation view when selected', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const disappearingOption = screen.getByText('Disappearing Step').closest('.clickable');
            fireEvent.click(disappearingOption);
            expect(screen.getByRole('button', { name: /Disappear/ })).toBeInTheDocument();
        });

        it('transitions to Dreadful Step creature selection when selected', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const dreadfulOption = screen.getByText('Dreadful Step').closest('.clickable');
            fireEvent.click(dreadfulOption);
            expect(screen.getByRole('button', { name: /Dreadful/ })).toBeInTheDocument();
        });

        it('returns to choice view when Cancel is clicked in Refreshing Step confirmation', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const refreshingOption = screen.getByText('Refreshing Step').closest('.clickable');
            fireEvent.click(refreshingOption);
            const cancelButton = screen.getByRole('button', { name: 'Cancel' });
            fireEvent.click(cancelButton);
            expect(screen.getByText(/Choose how you use/)).toBeInTheDocument();
        });

        it('returns to choice view when Cancel is clicked in Disappearing Step confirmation', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const disappearingOption = screen.getByText('Disappearing Step').closest('.clickable');
            fireEvent.click(disappearingOption);
            const cancelButton = screen.getByRole('button', { name: 'Cancel' });
            fireEvent.click(cancelButton);
            expect(screen.getByText(/Choose how you use/)).toBeInTheDocument();
        });

        it('transitions to result view when Skip is clicked in choice step', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const skipButton = screen.getByRole('button', { name: 'Skip' });
            fireEvent.click(skipButton);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
            });
        });

        it('transitions to result view when overlay is clicked in choice step', async () => {
            render(<StepsOfTheFeyTauntModal {...makeProps()} />);
            const overlay = document.querySelector('.sp-overlay');
            fireEvent.click(overlay);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
            });
        });

        it('does not transition when modal content overlay is clicked', () => {
            const onClose = vi.fn();
            render(<StepsOfTheFeyTauntModal {...makeProps({ onClose })} />);
            const modal = document.querySelector('.sp-modal');
            fireEvent.click(modal);
            expect(onClose).not.toHaveBeenCalled();
        });
    });
});
