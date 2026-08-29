import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConditionEffectBadges from './ConditionEffectBadges.jsx';
import { setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
    getStore: vi.fn(() => new Map()),
    useSyncedState: vi.fn(() => [null, vi.fn()]),
    listeners: new Map(),
    getRuntimeValue: vi.fn((_name, _key, _campaign) => null),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../services/ui/storage.js', () => ({
    default: {
        set: vi.fn(),
    },
}));

import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';

const RUG = 'Animated Rug of Smothering 1';
const CAMPAIGN = 'test-campaign';

function sapEffect() {
    return { target: RUG, source: 'Hand of Harm', effect: 'disadvantage_next_attack', duration: 'until_used' };
}

describe('ConditionEffectBadges — disadvantage_next_attack badge (CLA-158)', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        getRuntimeValue.mockImplementation((name, key) => {
            if (name === 'campaign' && key === 'targetEffects') return [sapEffect()];
            return null;
        });
    });

    it('renders a Disadv Next Attack badge for the affected creature', () => {
        render(
            <ConditionEffectBadges
                conditions={[]}
                targetEffects={[sapEffect()]}
                creatureName={RUG}
                campaignName={CAMPAIGN}
                isLocalhost={true}
            />
        );
        const badge = screen.getByText('Disadv Next Attack');
        expect(badge).toBeTruthy();
        expect(badge.getAttribute('title')).toContain('Hand of Harm');
    });

    it('does not render the badge for other creatures', () => {
        render(
            <ConditionEffectBadges
                conditions={[]}
                targetEffects={[sapEffect()]}
                creatureName="MercyMonk"
                campaignName={CAMPAIGN}
                isLocalhost={true}
            />
        );
        expect(screen.queryByText('Disadv Next Attack')).toBeNull();
    });

    it('removing the badge filters the effect out of campaign.targetEffects', () => {
        render(
            <ConditionEffectBadges
                conditions={[]}
                targetEffects={[sapEffect()]}
                creatureName={RUG}
                campaignName={CAMPAIGN}
                isLocalhost={true}
            />
        );
        const removeBtn = screen.getByTitle('Remove effect');
        fireEvent.click(removeBtn);
        expect(setRuntimeValue).toHaveBeenCalledWith('campaign', 'targetEffects', [], CAMPAIGN);
    });
});
