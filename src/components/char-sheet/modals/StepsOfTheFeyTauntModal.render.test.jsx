import { render, screen } from '@testing-library/react';
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

describe('StepsOfTheFeyTauntModal - Render', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

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
});
