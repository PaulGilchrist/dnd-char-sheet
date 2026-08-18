// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('StepsOfTheFeyTauntModal - No Uses', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    describe('no uses remaining (newCount is 0)', () => {
        it('renders the no uses remaining message', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 0 })} />);
            expect(screen.getByText(/No uses remaining — finish a Long Rest to regain/)).toBeInTheDocument();
        });

        it('does not transition to any step confirmation when an option is clicked', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 0 })} />);
            const refreshingOption = screen.getByTestId('step-option-refreshing');
            fireEvent.click(refreshingOption);
            expect(screen.getByText(/Choose how you use/)).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /Refresh/ })).not.toBeInTheDocument();
        });

        it('does not transition to any step confirmation when any option is clicked', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 0 })} />);
            const allOptionKeys = ['refreshing', 'taunting', 'disappearing', 'dreadful'];
            for (const key of allOptionKeys) {
                const option = screen.getByTestId(`step-option-${key}`);
                fireEvent.click(option);
                expect(screen.getByText(/Choose how you use/)).toBeInTheDocument();
            }
        });

        it('still shows the Skip button when no uses', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 0 })} />);
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
        });

        it('shows Misty Step only skip button when mode is mistyEscape and no uses', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 0, mode: 'mistyEscape' })} />);
            expect(screen.getByRole('button', { name: 'Misty Step only (free cast)' })).toBeInTheDocument();
        });

        it('shows Misty Step only skip button when title is Bewitching Magic and no uses', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 0, title: 'Bewitching Magic' })} />);
            expect(screen.getByRole('button', { name: 'Misty Step only (free cast)' })).toBeInTheDocument();
        });

        it('transitions to result view when Skip is clicked with no uses', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 0 })} />);
            const skipButton = screen.getByRole('button', { name: 'Skip' });
            fireEvent.click(skipButton);
            expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
        });

        it('transitions to result view when overlay is clicked with no uses', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 0 })} />);
            const overlay = document.querySelector('.sp-overlay');
            fireEvent.click(overlay);
            expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
        });
    });
});
