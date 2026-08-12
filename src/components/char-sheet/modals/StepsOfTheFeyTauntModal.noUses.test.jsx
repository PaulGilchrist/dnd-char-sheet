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

describe('StepsOfTheFeyTauntModal - No Uses', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    describe('no uses remaining', () => {
        it('renders the no uses remaining message when newCount is 0', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 0 })} />);
            expect(screen.getByText(/No uses remaining/)).toBeInTheDocument();
        });

        it('does not make options clickable when newCount is 0', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 0 })} />);
            const options = document.querySelectorAll('.clickable');
            options.forEach(option => {
                expect(option.style.cursor).toBe('default');
                expect(option.style.opacity).toBe('0.4');
            });
        });

        it('still shows the Misty Step only button when no uses', () => {
            render(<StepsOfTheFeyTauntModal {...makeProps({ newCount: 0 })} />);
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
        });
    });
});
