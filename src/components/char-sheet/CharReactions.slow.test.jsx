// SP-109: a slowed creature can't take Reactions — every reaction row click
// is refused with a popup and an 'automation' log entry.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CharReactions from './CharReactions.jsx';

const mockSetPopupHtml = vi.fn();

vi.mock('../common/popup.jsx', () => ({
    default: ({ children }) => React.createElement('div', { 'data-testid': 'popup' }, children),
}));
vi.mock('./char-spells/SpellDetailPopup.jsx', () => ({
    default: () => React.createElement('div', { 'data-testid': 'spell-detail-popup' }, null),
}));
vi.mock('./popups/MetamagicPopup.jsx', () => ({
    default: () => React.createElement('div', { 'data-testid': 'metamagic-popup' }, null),
}));
vi.mock('./modals/arcane/ArcaneWardRestoreModal.jsx', () => ({
    default: () => null,
}));
vi.mock('./modals/divine/BastionOfLawSpendModal.jsx', () => ({
    default: () => null,
}));
vi.mock('./modals/shared/SecondaryTargetModal.jsx', () => ({
    default: () => null,
}));
vi.mock('./modals/BendFateModal.jsx', () => ({ default: () => null }));
vi.mock('./modals/BoonFateModal.jsx', () => ({ default: () => null }));
vi.mock('./modals/StepsOfTheFeyTauntModal.jsx', () => ({ default: () => null }));
vi.mock('./modals/SearingVengeanceModal.jsx', () => ({ default: () => null }));
vi.mock('../../services/ui/spellSectionUtils.js', () => ({
    getReactionSpellNames: vi.fn(() => new Set()),
}));
vi.mock('../../services/character/featureCategories.js', () => ({
    getCategories: vi.fn(() => ({ featuresToIgnore: [] })),
}));
vi.mock('../../services/ui/sanitize.js', () => ({ sanitizeHtml: (html) => html }));
vi.mock('../../hooks/combat/useActionPopup.js', () => ({
    buildFeatureDetailHtml: vi.fn((reaction) => `<div>${reaction.name}</div>`),
}));
vi.mock('../../hooks/combat/useLoggedDiceRoll.js', () => ({
    default: vi.fn(() => ({ rollAttack: vi.fn(), rollDamage: vi.fn() })),
}));
vi.mock('../../hooks/combat/DiceRollContext.js', () => ({
    useDiceRollPopup: vi.fn(() => ({ setPopupHtml: mockSetPopupHtml })),
}));
vi.mock('../../services/combat/baseCombatActions.js', () => ({
    OPPORTUNITY_ATTACK: { name: 'Opportunity Attack', description: 'Can attack creature that moves out of your reach' },
    MELEE_REACH_FEET: 5,
}));
vi.mock('../../services/combat/automation/automationService.js', () => ({
    hasAutomation: vi.fn(() => false),
    hasTacticalShift: vi.fn(() => false),
    hasSpeedyOpportunityDisadvantage: vi.fn(() => false),
}));
vi.mock('../../services/rules/combat/damageUtils.js', () => ({
    getCombatContext: vi.fn(async () => null),
    getTargetFromAttacker: vi.fn(() => null),
}));
vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
    useRuntimeValue: vi.fn(() => []),
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));
vi.mock('../../services/automation/index.js', () => ({
    executeHandler: vi.fn(),
    confirmSearingVengeance: vi.fn(),
    skipSearingVengeance: vi.fn(),
}));
vi.mock('../../services/automation/common/savePrompt.js', () => ({
    createSaveListener: vi.fn(() => ({ promptId: 'test-prompt-id' })),
}));
vi.mock('../../services/ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../services/rules/effects/expirations.js', () => ({
    addExpiration: vi.fn(),
}));
vi.mock('../../services/automation/handlers/reactions/reactionSpellHandler.js', () => ({
    applyWarCasterReaction: vi.fn(),
}));
vi.mock('../../services/automation/handlers/reactions/reactionBonusHandler.js', () => ({
    applyInspiringMovement: vi.fn(),
}));
vi.mock('./useAttackDamageResolution.js', () => ({
    normalizeAutoDamage: vi.fn(),
    resolveAttackDamageStandalone: vi.fn(),
}));
vi.mock('../../hooks/combat/useSpellMetamagicFlow.js', () => ({
    useSpellMetamagicFlow: vi.fn(() => ({
        pendingMetamagic: null,
        gateMetamagic: vi.fn(),
        handleConfirm: vi.fn(),
        handleSkip: vi.fn(),
    })),
}));
vi.mock('../../hooks/combat/useSpellUpcastFlow.js', () => ({
    useSpellUpcastFlow: vi.fn(() => ({ buildUpcastLevels: vi.fn(() => []) })),
}));
vi.mock('../../hooks/combat/useSpellPositionResolver.js', () => ({
    useSpellPositionResolver: vi.fn(() => ({
        resolvePositions: vi.fn(),
        cachedPosRef: { current: null },
    })),
}));
vi.mock('../../hooks/combat/useSpellCastExecutor.js', () => ({
    useSpellCastExecutor: vi.fn(() => ({ castAction: vi.fn() })),
}));
vi.mock('../../services/rules/core/spellDamageUtils.js', () => ({
    resolveSpellDamageAtLevel: vi.fn(),
    isAutoHitSpell: vi.fn(() => false),
    resolveHealExpression: vi.fn(),
}));
vi.mock('../../services/ui/formatUtils.js', () => ({
    signFormatter: { format: (val) => (val >= 0 ? '+' : '') + val },
}));

import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../services/ui/logService.js';
import useLoggedDiceRoll from '../../hooks/combat/useLoggedDiceRoll.js';

const campaignName = 'test-campaign';

const playerStats = {
    name: 'AberrantSorcerer',
    level: 20,
    reactions: [{ name: 'Opportunity Attack', description: 'Can attack creature that moves out of your reach' }],
    attacks: [{ name: 'Mace', type: 'Action', range: 5, hitBonus: 3 }],
    spellAbilities: { spells: [], toHit: 9, saveDc: 17 },
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLoggedDiceRoll).mockReturnValue({ rollAttack: vi.fn(), rollDamage: vi.fn() });
    getRuntimeValue.mockReturnValue(null);
});

function renderReactions() {
    return render(<CharReactions playerStats={playerStats} campaignName={campaignName} cannotAct={false} mapName={null} characters={[]} />);
}

describe('CharReactions — SP-109 slow reaction gate', () => {
    it('refuses a reaction click with popup + automation log while slowed', () => {
        getRuntimeValue.mockImplementation((name, key) => {
            if (key === 'activeConditions') return ['slow'];
            return null;
        });
        renderReactions();
        fireEvent.click(screen.getByText('Opportunity Attack:'));
        expect(mockSetPopupHtml).toHaveBeenCalledWith(expect.stringContaining('Slowed'));
        expect(addEntry).toHaveBeenCalledWith(
            campaignName,
            expect.objectContaining({ type: 'automation', creatureName: 'AberrantSorcerer', name: 'Slow' }),
        );
    });

    it('still allows reactions when not slowed', () => {
        getRuntimeValue.mockImplementation((name, key) => {
            if (key === 'activeConditions') return [];
            return null;
        });
        renderReactions();
        fireEvent.click(screen.getByText('Opportunity Attack:'));
        expect(addEntry).not.toHaveBeenCalled();
    });
});
