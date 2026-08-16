// @improved-by-ai
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import HypnoticPatternModal from './HypnoticPatternModal.jsx';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../../services/combat/conditions/savePromptService.js', () => ({
    sendSavePrompt: vi.fn(),
}));

vi.mock('../../../../services/encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(),
    setCombatSummaryCache: vi.fn(),
}));

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';

const campaignName = 'test-campaign';

const basePlayerStats = {
    name: 'Wizard1',
    level: 10,
    proficiency: 4,
    abilities: [{ name: 'Intelligence', bonus: 4 }],
};

const baseAction = {
    name: 'Hypnotic Pattern',
    automation: { type: 'hypnotic_pattern' },
};

const baseCombatSummary = {
    creatures: [
        { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 7, saveBonuses: { wis: 0 } },
        { name: 'Orc', type: 'npc', currentHp: 15, maxHp: 22, saveBonuses: { wis: 2 } },
        { name: 'PlayerAlly', type: 'player', currentHp: 30, maxHp: 30, saveBonuses: { wis: 1 } },
    ],
};

function makeProps(overrides = {}) {
    return {
        action: baseAction,
        playerStats: basePlayerStats,
        campaignName,
        saveType: 'WIS',
        saveDc: 14,
        onClose: vi.fn(),
        ...overrides,
    };
}

beforeEach(() => {
    vi.resetAllMocks();
    getCombatSummary.mockReturnValue(baseCombatSummary);
    getRuntimeValue.mockReturnValue([]);
    setRuntimeValue.mockReturnValue(undefined);
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('HypnoticPatternModal - Advanced', () => {
    describe('overlay targeting', () => {
        it('renders empty fragment when player is overlay targeted with active overlay', () => {
            const { container } = render(<HypnoticPatternModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'overlay-123' },
                activeOverlay: { name: 'TestOverlay' },
            })} />);
            expect(container.children.length).toBe(0);
        });

        it('renders normally when player is overlay targeted but no active overlay', () => {
            render(<HypnoticPatternModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'overlay-123' },
            })} />);
            expect(screen.getByText('Hypnotic Pattern')).toBeInTheDocument();
        });

        it('renders normally when player is not overlay targeted', () => {
            render(<HypnoticPatternModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'normal-target' },
                activeOverlay: { name: 'TestOverlay' },
            })} />);
            expect(screen.getByText('Hypnotic Pattern')).toBeInTheDocument();
        });
    });

    describe('pending prompts cleanup', () => {
        it('clears pending prompts on unmount', async () => {
            const onClose = vi.fn();
            const { unmount } = render(<HypnoticPatternModal {...makeProps({ onClose })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
            unmount();
            expect(getRuntimeValue).toHaveBeenCalledWith('campaign', 'pendingSaveListenerPrompts');
        });
    });

    describe('null combat summary', () => {
        it('handles missing combat summary without error', async () => {
            getCombatSummary.mockReturnValue(null);
            render(<HypnoticPatternModal {...makeProps()} />);
            expect(screen.getByText('Hypnotic Pattern')).toBeInTheDocument();
            const confirmButton = screen.getByRole('button', { name: /Hypnotic Pattern \(0\)/ });
            expect(confirmButton).toBeDisabled();
        });
    });
});
