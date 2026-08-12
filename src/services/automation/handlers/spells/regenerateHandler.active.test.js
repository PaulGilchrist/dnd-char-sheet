import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../combat/automation/automationExpressions.js', () => ({
    evaluateAutoExpression: vi.fn(),
}));

vi.mock('../../../rules/combat/applyHealing.js', () => ({
    applyHealingToTarget: vi.fn(),
}));

vi.mock('../../../encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(),
}));

import { isRegenerateActive } from './regenerateHandler.js';
import { getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';

const campaignName = 'TestCampaign';

describe('isRegenerateActive', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return true when regenerateActive is true', () => {
        getRuntimeValue.mockReturnValue(true);

        const result = isRegenerateActive('Goblin', campaignName);

        expect(result).toBe(true);
        expect(getRuntimeValue).toHaveBeenCalledWith('Goblin', 'regenerateActive', campaignName);
    });

    it('should return false when regenerateActive is false', () => {
        getRuntimeValue.mockReturnValue(false);

        const result = isRegenerateActive('Goblin', campaignName);

        expect(result).toBe(false);
    });

    it('should return false when regenerateActive is null', () => {
        getRuntimeValue.mockReturnValue(null);

        const result = isRegenerateActive('Goblin', campaignName);

        expect(result).toBe(false);
    });

    it('should return false when regenerateActive is undefined', () => {
        getRuntimeValue.mockReturnValue(undefined);

        const result = isRegenerateActive('Goblin', campaignName);

        expect(result).toBe(false);
    });

    it('should return false when regenerateActive is a string', () => {
        getRuntimeValue.mockReturnValue('true');

        const result = isRegenerateActive('Goblin', campaignName);

        expect(result).toBe(false);
    });

    it('should return false when regenerateActive is 0', () => {
        getRuntimeValue.mockReturnValue(0);

        const result = isRegenerateActive('Goblin', campaignName);

        expect(result).toBe(false);
    });

    it('should use the correct runtime store key', () => {
        getRuntimeValue.mockReturnValue(true);

        isRegenerateActive('Orc', campaignName);

        expect(getRuntimeValue).toHaveBeenCalledWith('Orc', 'regenerateActive', campaignName);
    });
});
