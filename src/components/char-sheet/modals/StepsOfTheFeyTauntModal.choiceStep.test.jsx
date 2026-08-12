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

describe('StepsOfTheFeyTauntModal - Choice Step', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

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
});
