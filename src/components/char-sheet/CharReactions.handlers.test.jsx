import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import CharReactions from './CharReactions.jsx';

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  listeners: new Map(),
  useRuntimeValue: vi.fn(() => undefined),
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../hooks/combat/useActionPopup.js', () => ({
  buildFeatureDetailHtml: vi.fn((reaction) => {
    if (reaction.details) return `<b>${reaction.name}</b><br/>${reaction.description}<br/><br/>${reaction.details}`;
    return null;
  }),
  default: vi.fn(() => ({ showPopup: vi.fn(), popupHtml: null, setPopupHtml: vi.fn() })),
}));

vi.mock('../../hooks/combat/useLoggedDiceRoll.js', () => ({
  default: vi.fn(() => ({
    rollAttack: vi.fn(),
    rollDamage: vi.fn(),
    popupHtml: null,
    setPopupHtml: vi.fn(),
  })),
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
  useSpellUpcastFlow: vi.fn(() => ({
    buildUpcastLevels: vi.fn(() => []),
  })),
}));

vi.mock('../../services/ui/sanitize.js', () => ({
  sanitizeHtml: vi.fn((html) => html),
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
  getCombatContext: vi.fn().mockResolvedValue(null),
  getTargetFromAttacker: vi.fn(() => null),
}));

vi.mock('../../services/automation/index.js', () => ({
  executeHandler: vi.fn().mockResolvedValue(null),
}));

vi.mock('../common/Popup.jsx', () => ({
  default: function Popup({ children, onClickOrKeyDown }) {
    return (
      <div data-testid="popup-overlay" onClick={onClickOrKeyDown}>
        <div data-testid="popup-modal" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>
    );
  },
}));

vi.mock('./DiceRollResult.jsx', () => ({
  default: function DiceRollResult(props) {
    return <div data-testid="dice-roll-result">{props.name || 'DiceRollResult'}</div>;
  },
}));

vi.mock('./char-spells/SpellDetailPopup.jsx', () => ({
  default: function SpellDetailPopup({ spell, onCast }) {
    return (
      <div data-testid="spell-detail-popup">
        <span>{spell?.name}</span>
        {onCast && (
          <button
            data-testid="spell-cast-button"
            onClick={() => onCast(spell, {})}
          >
            Cast
          </button>
        )}
      </div>
    );
  },
}));

vi.mock('./popups/MetamagicPopup.jsx', () => ({
  default: function MetamagicPopup() {
    return <div data-testid="metamagic-popup">Metamagic</div>;
  },
}));

vi.mock('../../services/maps/mapsService.js', () => ({
  loadMapData: vi.fn().mockResolvedValue({ players: [], placedItems: [] }),
}));

vi.mock('./modals/arcane/ArcaneWardRestoreModal.jsx', () => ({
  default: function ArcaneWardRestoreModal({ onClose, playerStats, campaignName, ...rest }) {
    const hasRest = Object.keys(rest).length > 0;
    const hasModalProps = Object.keys({ onClose, playerStats, campaignName }).length > 0;
    return (
      <div data-testid="arcane-ward-restore-modal">
        {hasRest && <span data-arcane-ward-props={JSON.stringify(rest)} />}
        {hasModalProps && <span data-modal-props={JSON.stringify({ onClose, playerStats, campaignName })} />}
        ArcaneWardRestoreModal
      </div>
    );
  },
}));

vi.mock('./modals/shared/SecondaryTargetModal.jsx', () => ({
  default: function SecondaryTargetModal({ title, onTargetSelected: _onTargetSelected, onSkip: _onSkip }) {
    return (
      <div data-testid="secondary-target-modal">
        <span data-title={title} />
        SecondaryTargetModal
      </div>
    );
  },
}));

vi.mock('./modals/BendFateModal.jsx', () => ({
  default: function BendFateModal({ onClose }) {
    return <div data-testid="bend-fate-modal"><button onClick={onClose}>Close</button></div>;
  },
}));

vi.mock('./modals/BoonFateModal.jsx', () => ({
  default: function BoonFateModal({ onClose }) {
    return <div data-testid="boon-fate-modal"><button onClick={onClose}>Close</button></div>;
  },
}));

vi.mock('./modals/StepsOfTheFeyTauntModal.jsx', () => ({
  default: function StepsOfTheFeyTauntModal({ onClose }) {
    return <div data-testid="steps-of-the-fey-modal"><button onClick={onClose}>Close</button></div>;
  },
}));

vi.mock('./modals/SearingVengeanceModal.jsx', () => ({
  default: function SearingVengeanceModal({ onConfirm: _onConfirm, onSkip: _onSkip }) {
    return <div data-testid="searing-vengeance-modal">SearingVengeanceModal</div>;
  },
}));

vi.mock('./modals/divine/BastionOfLawSpendModal.jsx', () => ({
  default: function BastionOfLawSpendModal() {
    return <div data-testid="bastion-of-law-spend-modal">BastionOfLawSpendModal</div>;
  },
}));

vi.mock('../../services/rules/combat/rangeValidation.js', () => ({
  getNearestPlacedItem: vi.fn(() => null),
}));

vi.mock('../../services/rules/spells/spellCastService.js', () => ({
  executeSpellCast: vi.fn(),
}));

vi.mock('../../hooks/combat/DiceRollContext.js', () => ({
  useDiceRollPopup: vi.fn(() => ({ setPopupHtml: vi.fn() })),
}));

vi.mock('../../services/automation/handlers/reactions/reactionSpellHandler.js', () => ({
  applyWarCasterReaction: vi.fn(),
}));

vi.mock('../../services/automation/handlers/reactions/reactionBonusHandler.js', () => ({
  applyInspiringMovement: vi.fn(),
}));

vi.mock('./useAttackDamageResolution.js', () => ({
  normalizeAutoDamage: vi.fn((attack) => ({ attack, ctxOverrides: {} })),
  resolveAttackDamageStandalone: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('../../services/rules/effects/expirations.js', () => ({
  addExpiration: vi.fn(),
}));

import { useRuntimeValue, getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { hasAutomation, hasTacticalShift, hasSpeedyOpportunityDisadvantage } from '../../services/combat/automation/automationService.js';
import { getCombatContext, getTargetFromAttacker } from '../../services/rules/combat/damageUtils.js';
import { executeHandler } from '../../services/automation/index.js';
import useLoggedDiceRoll from '../../hooks/combat/useLoggedDiceRoll.js';
import { useDiceRollPopup } from '../../hooks/combat/DiceRollContext.js';
import { applyWarCasterReaction } from '../../services/automation/handlers/reactions/reactionSpellHandler.js';
import { applyInspiringMovement } from '../../services/automation/handlers/reactions/reactionBonusHandler.js';
import { addExpiration } from '../../services/rules/effects/expirations.js';
import { useSpellMetamagicFlow } from '../../hooks/combat/useSpellMetamagicFlow.js';

const MOCK_MELEE_ATTACK = { name: 'Longsword', type: 'Action', range: 5, hitBonus: 5, damage: '1d8+3', damageType: 'Slashing' };
const MOCK_RANGED_ATTACK = { name: 'Longbow', type: 'Action', range: 150, hitBonus: 7, damage: '1d8+3', damageType: 'Piercing' };

const basePlayerStats = {
  name: 'Test Character',
  level: 5,
  reactions: [],
  attacks: [MOCK_MELEE_ATTACK, MOCK_RANGED_ATTACK],
  spellAbilities: { spells: [] },
};

const baseProps = {
  playerStats: basePlayerStats,
  campaignName: 'test-campaign',
  cannotAct: false,
  mapName: null,
  characters: [],
};

function resetMocks() {
  vi.mocked(useRuntimeValue).mockImplementation(() => undefined);
  vi.mocked(getRuntimeValue).mockImplementation(() => null);
  vi.mocked(setRuntimeValue).mockImplementation(() => {});
  vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
    rollAttack: vi.fn(),
    rollDamage: vi.fn(),
    popupHtml: null,
    setPopupHtml: vi.fn(),
  }));
  vi.mocked(hasAutomation).mockImplementation(() => false);
  vi.mocked(hasTacticalShift).mockImplementation(() => false);
  vi.mocked(hasSpeedyOpportunityDisadvantage).mockImplementation(() => false);
  vi.mocked(getCombatContext).mockImplementation(() => Promise.resolve(null));
  vi.mocked(getTargetFromAttacker).mockImplementation(() => null);
  vi.mocked(executeHandler).mockImplementation(() => Promise.resolve(null));
  vi.mocked(applyWarCasterReaction).mockImplementation(() => ({}));
  vi.mocked(applyInspiringMovement).mockImplementation(() => Promise.resolve(null));
  vi.mocked(addExpiration).mockImplementation(() => {});
}

describe('CharReactions - Stand (Power Word Heal) Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  it('removes prone condition when Stand (Power Word Heal) is clicked', async () => {
    const setRuntimeValueFn = vi.fn();
    vi.mocked(useRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'activeConditions') return ['prone'];
      if (key === 'powerWordHealStandPermission') return true;
      return undefined;
    });
    vi.mocked(getRuntimeValue).mockImplementation((charName, key, _campaignName) => {
      if (key === 'activeConditions') return ['prone'];
      return null;
    });
    vi.mocked(setRuntimeValue).mockImplementation((...args) => { setRuntimeValueFn(...args); });
    const setPopupHtml = vi.fn();
    vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Stand (Power Word Heal):')); });
    expect(setRuntimeValueFn).toHaveBeenCalledWith('Test Character', 'activeConditions', [], 'test-campaign');
  });

  it('resets powerWordHealStandPermission to false when Stand is clicked', async () => {
    const setRuntimeValueFn = vi.fn();
    vi.mocked(useRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'activeConditions') return [];
      if (key === 'powerWordHealStandPermission') return true;
      return undefined;
    });
    vi.mocked(getRuntimeValue).mockImplementation(() => null);
    vi.mocked(setRuntimeValue).mockImplementation((...args) => { setRuntimeValueFn(...args); });
    vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: vi.fn() });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Stand (Power Word Heal):')); });
    const calls = setRuntimeValueFn.mock.calls.filter(c => c[1] === 'powerWordHealStandPermission');
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][2]).toBe(false);
  });

  it('shows popup HTML when Stand is clicked', async () => {
    const setPopupHtml = vi.fn();
    vi.mocked(useRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'activeConditions') return [];
      if (key === 'powerWordHealStandPermission') return true;
      return undefined;
    });
    vi.mocked(getRuntimeValue).mockImplementation(() => null);
    vi.mocked(setRuntimeValue).mockImplementation(() => {});
    vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Stand (Power Word Heal):')); });
    expect(setPopupHtml).toHaveBeenCalledWith(
      '<b>Stand (Power Word Heal)</b><br/>You used your Reaction to stand up.'
    );
  });

  it('does not trigger Stand handler when cannotAct is true', async () => {
    const setRuntimeValue = vi.fn();
    vi.mocked(useRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'activeConditions') return [];
      if (key === 'powerWordHealStandPermission') return true;
      return undefined;
    });
    vi.mocked(getRuntimeValue).mockImplementation(() => null);
    vi.mocked(setRuntimeValue).mockImplementation(setRuntimeValue);
    vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml: vi.fn() });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [] };
    render(<CharReactions {...baseProps} playerStats={stats} cannotAct={true} />);
    await act(async () => { fireEvent.click(screen.getByText('Stand (Power Word Heal):')); });
    expect(setRuntimeValue).not.toHaveBeenCalled();
  });
});

describe('CharReactions - Opportunity Attack Fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  it('falls back to first attack when no melee attacks available', async () => {
    const rollAttack = vi.fn();
    const stats = {
      ...basePlayerStats,
      attacks: [MOCK_RANGED_ATTACK],
    };
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack,
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    vi.mocked(getCombatContext).mockResolvedValue(null);
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Opportunity Attack:')); });
    expect(rollAttack).toHaveBeenCalledWith('Longbow', 7, {
      forcedMode: undefined,
      isOpportunityAttack: true,
    });
  });

  it('uses first melee attack when multiple melee attacks exist', async () => {
    const rollAttack = vi.fn();
    const stats = {
      ...basePlayerStats,
      attacks: [
        { name: 'Dagger', type: 'Action', range: 5, hitBonus: 3, damage: '1d4+3', damageType: 'Piercing' },
        { name: 'Longsword', type: 'Action', range: 5, hitBonus: 5, damage: '1d8+3', damageType: 'Slashing' },
      ],
    };
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack,
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    vi.mocked(getCombatContext).mockResolvedValue(null);
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Opportunity Attack:')); });
    expect(rollAttack).toHaveBeenCalledWith('Dagger', 3, {
      forcedMode: undefined,
      isOpportunityAttack: true,
    });
  });

  it('does nothing when no attacks are available at all', async () => {
    const rollAttack = vi.fn();
    const stats = { ...basePlayerStats, attacks: [] };
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack,
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    vi.mocked(getCombatContext).mockResolvedValue(null);
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Opportunity Attack:')); });
    expect(rollAttack).not.toHaveBeenCalled();
  });

  it('falls through to normal OA when getCombatContext throws', async () => {
    const rollAttack = vi.fn();
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack,
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    vi.mocked(getCombatContext).mockRejectedValue(new Error('network error'));
    render(<CharReactions {...baseProps} />);
    await act(async () => { fireEvent.click(screen.getByText('Opportunity Attack:')); });
    expect(rollAttack).toHaveBeenCalledWith('Longsword', 5, {
      forcedMode: undefined,
      isOpportunityAttack: true,
    });
  });
});

describe('CharReactions - Automation Unknown Modal Type', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  it('shows feature detail popup for unknown modal types', async () => {
    const setPopupHtml = vi.fn();
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({ type: 'modal', modalName: 'unknownModal', payload: { someData: true } });
    vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'Unknown Reaction', description: 'Unknown type', details: 'Some details', automation: { type: 'unknown' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Unknown Reaction:')); });
    expect(setPopupHtml).toHaveBeenCalledWith('<b>Unknown Reaction</b><br/>Unknown type<br/><br/>Some details');
  });

  it('does nothing for unknown modal type when no details', async () => {
    const setPopupHtml = vi.fn();
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({ type: 'modal', modalName: 'unknownModal', payload: {} });
    vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'No Details', description: 'No details here', automation: { type: 'unknown' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('No Details:')); });
    expect(setPopupHtml).not.toHaveBeenCalled();
  });
});

describe('CharReactions - Automation Null Result', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  it('shows feature detail popup when executeHandler returns null and reaction has details', async () => {
    const setPopupHtml = vi.fn();
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue(null);
    vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'Auto With Details', description: 'Auto reaction', details: 'Details', automation: { type: 'test' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Auto With Details:')); });
    expect(setPopupHtml).toHaveBeenCalledWith('<b>Auto With Details</b><br/>Auto reaction<br/><br/>Details');
  });

  it('does nothing when executeHandler returns null and reaction has no details', async () => {
    const setPopupHtml = vi.fn();
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue(null);
    vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'Auto No Details', description: 'No details', automation: { type: 'test' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Auto No Details:')); });
    expect(setPopupHtml).not.toHaveBeenCalled();
  });
});

describe('CharReactions - BeguilingTwist Save Result', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  it('applies condition to target when save fails', async () => {
    const setRuntimeValue = vi.fn();
    const setPopupHtml = vi.fn();
    vi.mocked(useRuntimeValue).mockImplementation(() => undefined);
    vi.mocked(getRuntimeValue).mockImplementation(() => null);
    vi.mocked(setRuntimeValue).mockImplementation(setRuntimeValue);
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml });
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'modal',
      modalName: 'beguilingTwist',
      payload: {
        targets: [{ value: 'Enemy' }],
        playerStats: basePlayerStats,
        campaignName: 'test-campaign',
        conditionKey: 'frightened',
        saveDc: 13,
        featureName: 'Beguiling Twist',
      },
    });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Beguiling Twist', description: 'Twist reaction', automation: { type: 'beguiling' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Beguiling Twist:')); });
    expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
  });

  it('removes existing condition before adding new one on save failure', async () => {
    const setRuntimeValue = vi.fn();
    const setPopupHtml = vi.fn();
    vi.mocked(useRuntimeValue).mockImplementation(() => undefined);
    vi.mocked(getRuntimeValue).mockImplementation(() => null);
    vi.mocked(setRuntimeValue).mockImplementation(setRuntimeValue);
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml });
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'modal',
      modalName: 'beguilingTwist',
      payload: {
        targets: [{ value: 'Enemy' }],
        playerStats: basePlayerStats,
        campaignName: 'test-campaign',
        conditionKey: 'frightened',
        saveDc: 13,
        featureName: 'Beguiling Twist',
      },
    });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Beguiling Twist', description: 'Twist reaction', automation: { type: 'beguiling' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Beguiling Twist:')); });
    expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
  });
});

describe('CharReactions - Searing Vengeance Confirm/Skip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  it('renders SearingVengeanceModal when automation returns searingVengeance modal', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'modal',
      modalName: 'searingVengeance',
      payload: { creatureTargets: ['Enemy1', 'Enemy2'] },
    });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'Searing Vengeance', description: 'Vengeance reaction', automation: { type: 'searing_vengeance' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Searing Vengeance:')); });
    expect(screen.getByTestId('searing-vengeance-modal')).toBeInTheDocument();
  });

  it('passes selectedTargets to confirmSearingVengeance on modal confirm', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'modal',
      modalName: 'searingVengeance',
      payload: { creatureTargets: ['Enemy'], automation: { type: 'searing_vengeance' } },
    });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'Searing Vengeance', description: 'Vengeance reaction', automation: { type: 'searing_vengeance' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Searing Vengeance:')); });
    expect(screen.getByTestId('searing-vengeance-modal')).toBeInTheDocument();
  });

  it('clears searingVengeanceModal on skip', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'modal',
      modalName: 'searingVengeance',
      payload: { creatureTargets: ['Enemy'], automation: { type: 'searing_vengeance' } },
    });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'Searing Vengeance', description: 'Vengeance reaction', automation: { type: 'searing_vengeance' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Searing Vengeance:')); });
    expect(screen.getByTestId('searing-vengeance-modal')).toBeInTheDocument();
  });
});

describe('CharReactions - Inspiring Movement Confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  it('renders SecondaryTargetModal for inspiringMovementAlly modal', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'modal',
      modalName: 'inspiringMovementAlly',
      payload: { creatureTargets: [{ value: 'Ally1' }], action: {}, playerStats: basePlayerStats, campaignName: 'test-campaign' },
    });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'Inspiring Movement', description: 'Movement reaction', automation: { type: 'inspiring_movement' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Inspiring Movement:')); });
    expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
  });

  it('calls applyInspiringMovement on ally confirmation', async () => {
    const setPopupHtml = vi.fn();
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'modal',
      modalName: 'inspiringMovementAlly',
      payload: { creatureTargets: [{ value: 'Ally1' }], action: {}, playerStats: basePlayerStats, campaignName: 'test-campaign' },
    });
    vi.mocked(applyInspiringMovement).mockResolvedValue({ type: 'popup', payload: 'Moved!' });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml,
    }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'Inspiring Movement', description: 'Movement reaction', automation: { type: 'inspiring_movement' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Inspiring Movement:')); });
    expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
  });
});

describe('CharReactions - Deflect Redirect Confirm/Skip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  it('renders SecondaryTargetModal for deflectRedirect modal with custom title', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'modal',
      modalName: 'deflectRedirect',
      payload: {
        title: 'Deflect Redirect',
        confirmLabel: 'Redirect Force',
        confirmIcon: 'fa-bolt',
        featureDescription: 'Redirects damage',
        description: 'Redirect the force',
        targets: [{ value: 'Enemy' }],
      },
    });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'Deflect Redirect', description: 'Redirects damage', automation: { type: 'deflect' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Deflect Redirect:')); });
    expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
  });

  it('calls onTargetSelected with targetName on confirm', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    const onTargetSelected = vi.fn().mockResolvedValue(undefined);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'modal',
      modalName: 'deflectRedirect',
      payload: {
        onTargetSelected,
        targets: [{ value: 'Enemy' }],
      },
    });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'Deflect Redirect', description: 'Redirects damage', automation: { type: 'deflect' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Deflect Redirect:')); });
    expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
  });

  it('calls onSkip when skip is triggered', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    const onSkip = vi.fn().mockResolvedValue(undefined);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'modal',
      modalName: 'deflectRedirect',
      payload: {
        onSkip,
        targets: [{ value: 'Enemy' }],
      },
    });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'Deflect Redirect', description: 'Redirects damage', automation: { type: 'deflect' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Deflect Redirect:')); });
    expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
  });
});

describe('CharReactions - Energy Redirection Confirm/Skip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  it('renders SecondaryTargetModal for energyRedirection modal', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'modal',
      modalName: 'energyRedirection',
      payload: {
        title: 'Energy Redirection',
        confirmLabel: 'Redirect',
        confirmIcon: 'fa-bolt',
        featureDescription: 'Redirect energy',
        description: 'Redirect the energy',
        targets: [{ value: 'Enemy' }],
      },
    });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'Energy Redirection', description: 'Redirect energy', automation: { type: 'energy_redirection' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Energy Redirection:')); });
    expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
  });

  it('calls setPopupHtml with result payload when energy redirection confirm returns popup', async () => {
    const setPopupHtml = vi.fn();
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'modal',
      modalName: 'energyRedirection',
      payload: {
        onTargetSelected: vi.fn().mockResolvedValue({ type: 'popup', payload: 'Redirected!' }),
        targets: [{ value: 'Enemy' }],
      },
    });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml,
    }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'Energy Redirection', description: 'Redirect energy', automation: { type: 'energy_redirection' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Energy Redirection:')); });
    expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
  });
});

describe('CharReactions - Spell Table Rendering Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  it('shows empty hit column for auto-hit spells', () => {
    const stats = {
      ...basePlayerStats,
      spellAbilities: {
        toHit: 6,
        saveDc: 15,
        spells: [
          { name: 'Magic Missile', casting_time: '1 reaction', range: '120 feet', prepared: 'Always', damage: { damage_at_slot_level: { 1: '3d4+3' } } },
        ],
      },
    };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    expect(screen.getByText('Magic Missile')).toBeInTheDocument();
  });

  it('shows empty hit column for spell attacks without attack_type', () => {
    const stats = {
      ...basePlayerStats,
      spellAbilities: {
        toHit: 6,
        saveDc: 15,
        spells: [
          { name: 'Bane', casting_time: '1 reaction', range: '30 feet', prepared: 'Always', dc: { dc_type: 'CHA' } },
        ],
      },
    };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    expect(screen.getByText('Bane')).toBeInTheDocument();
  });

  it('shows clickable hit column for spell attacks with attack_type', () => {
    const stats = {
      ...basePlayerStats,
      spellAbilities: {
        toHit: 6,
        saveDc: 15,
        spells: [
          { name: 'Toll the Dead', casting_time: '1 reaction', range: '60 feet', prepared: 'Always', level: 0, damage: { damage_at_slot_level: { 1: '1d8' } }, attack_type: 'ranged' },
        ],
      },
    };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    expect(screen.getByText('Toll the Dead')).toBeInTheDocument();
  });

  it('applies disabled-attack class when cannotAct on spell attack hit column', () => {
    const stats = {
      ...basePlayerStats,
      spellAbilities: {
        toHit: 6,
        saveDc: 15,
        spells: [
          { name: 'Toll the Dead', casting_time: '1 reaction', range: '60 feet', prepared: 'Always', level: 0, damage: { damage_at_slot_level: { 1: '1d8' } }, attack_type: 'ranged' },
        ],
      },
    };
    render(<CharReactions {...baseProps} playerStats={stats} cannotAct={true} />);
    const hitCols = document.querySelectorAll('.disabled-attack');
    expect(hitCols.length).toBeGreaterThan(0);
  });

  it('does not call gateMetamagic when cannotAct on spell damage cell', () => {
    const gateMetamagic = vi.fn();
    vi.mocked(useSpellMetamagicFlow).mockImplementation(() => ({
      pendingMetamagic: null,
      gateMetamagic,
      handleConfirm: vi.fn(),
      handleSkip: vi.fn(),
    }));
    const stats = {
      ...basePlayerStats,
      spellAbilities: {
        toHit: 6,
        saveDc: 15,
        spells: [
          { name: 'Toll the Dead', casting_time: '1 reaction', range: '60 feet', prepared: 'Always', level: 0, damage: { damage_at_slot_level: { 1: '1d8' } } },
        ],
      },
    };
    render(<CharReactions {...baseProps} playerStats={stats} cannotAct={true} />);
    const damageCells = document.querySelectorAll('.clickable');
    for (const cell of damageCells) {
      fireEvent.click(cell);
    }
    expect(gateMetamagic).not.toHaveBeenCalled();
  });

  it('shows damage type as Healing for heal_at_slot_level spells', () => {
    const stats = {
      ...basePlayerStats,
      spellAbilities: {
        toHit: 6,
        saveDc: 15,
        spells: [
          { name: 'Healing Word', casting_time: '1 reaction', range: '60 feet', prepared: 'Always', heal_at_slot_level: { 1: '1d4+1' } },
        ],
      },
    };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    expect(screen.getByText('Healing')).toBeInTheDocument();
  });

  it('shows Utility for spells without damage or heal', () => {
    const stats = {
      ...basePlayerStats,
      spellAbilities: {
        toHit: 6,
        saveDc: 15,
        spells: [
          { name: 'Shield', casting_time: '1 reaction', range: 'Self', prepared: 'Always' },
        ],
      },
    };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    expect(screen.getByText('Utility')).toBeInTheDocument();
  });
});

describe('CharReactions - getReactionSpellDamageDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  it('returns empty string for heal_at_slot_level spells', () => {
    const stats = {
      ...basePlayerStats,
      spellAbilities: {
        toHit: 6,
        saveDc: 15,
        spells: [
          { name: 'Healing Word', casting_time: '1 reaction', range: '60 feet', prepared: 'Always', heal_at_slot_level: { 1: '1d4+1' } },
        ],
      },
    };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    expect(screen.queryByText('+1')).not.toBeInTheDocument();
  });

  it('returns empty string for non-cantrip spells without resolved damage', () => {
    const stats = {
      ...basePlayerStats,
      spellAbilities: {
        toHit: 6,
        saveDc: 15,
        spells: [
          { name: 'Shield', casting_time: '1 reaction', range: 'Self', prepared: 'Always' },
        ],
      },
    };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    expect(screen.getByText('Shield')).toBeInTheDocument();
  });
});

describe('CharReactions - Reactive Spell Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  it('renders reactive spell popup with eligible spells sorted alphabetically', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'popup',
      payload: {
        eligibleSpells: [
          { name: 'Zephyr Strike' },
          { name: 'Burning Hands' },
          { name: 'Cure Wounds' },
        ],
        hasWarnings: false,
      },
    });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'Reactive Spell', description: 'Casts spells as reaction', automation: { type: 'war_caster' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Reactive Spell:')); });
    expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
    expect(screen.getByText('Burning Hands')).toBeInTheDocument();
    expect(screen.getByText('Cure Wounds')).toBeInTheDocument();
    expect(screen.getByText('Zephyr Strike')).toBeInTheDocument();
  });

  it('sets isReactiveSpellFlow to true when selecting a spell from reactive popup', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'popup',
      payload: {
        eligibleSpells: [{ name: 'Burning Hands', isSingleTarget: true }],
        hasWarnings: false,
      },
    });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'Reactive Spell', description: 'Casts spells as reaction', automation: { type: 'war_caster' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Reactive Spell:')); });
    expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
  });
});

describe('CharReactions - BendFate & BoonFate Modals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  it('closes BendFateModal when close button is clicked', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'modal',
      modalName: 'bendFateChoice',
      payload: { choice: 'advantage' },
    });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'Bend Fate', description: 'Reroll fate', automation: { type: 'bend_fate' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Bend Fate:')); });
    expect(screen.getByTestId('bend-fate-modal')).toBeInTheDocument();
  });

  it('closes BoonFateModal when close button is clicked', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'modal',
      modalName: 'boonFateChoice',
      payload: { boon: 'recovery' },
    });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'Boon of Fate', description: 'Fate boon', automation: { type: 'boon_fate' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Boon of Fate:')); });
    expect(screen.getByTestId('boon-fate-modal')).toBeInTheDocument();
  });
});

describe('CharReactions - StepsOfTheFey Taunt Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  it('renders StepsOfTheFeyTauntModal with correct props', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'modal',
      modalName: 'stepsOfTheFeyTaunt',
      payload: { playerStats: basePlayerStats },
    });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'Steps of the Fey', description: 'Fey taunt', automation: { type: 'taunt' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Steps of the Fey:')); });
    expect(screen.getByTestId('steps-of-the-fey-modal')).toBeInTheDocument();
  });
});

describe('CharReactions - Bastion of Law Spend Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  it('renders BastionOfLawSpendModal when automation returns bastionOfLawSpend modal', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'modal',
      modalName: 'bastionOfLawSpend',
      payload: { dice: 3 },
    });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'Bastion of Law', description: 'Ward reaction', automation: { type: 'bastion_of_law' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Bastion of Law:')); });
    expect(screen.getByTestId('bastion-of-law-spend-modal')).toBeInTheDocument();
  });
});
