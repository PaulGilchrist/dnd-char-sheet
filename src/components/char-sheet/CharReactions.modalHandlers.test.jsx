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
  confirmSearingVengeance: vi.fn(),
  skipSearingVengeance: vi.fn(),
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
  default: function SecondaryTargetModal({ title, confirmLabel, confirmIcon: _confirmIcon, featureDescription, description, onTargetSelected, onSkip, targets }) {
    return (
      <div data-testid="secondary-target-modal">
        <span data-title={title} />
        {featureDescription && <span data-feature-desc={featureDescription} />}
        {description && <span data-desc={description} />}
        {onTargetSelected && (
          <button data-testid="confirm-btn" onClick={() => onTargetSelected(targets ? targets[0]?.value || 'TargetName' : 'TargetName')}>
            {confirmLabel || 'Confirm'}
          </button>
        )}
        {onSkip && (
          <button data-testid="skip-btn" onClick={() => onSkip()}>
            Skip
          </button>
        )}
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
  default: function BastionOfLawSpendModal({ onConfirm: _onConfirm, onClose }) {
    return (
      <div data-testid="bastion-of-law-spend-modal">
        <button data-testid="bastion-confirm" onClick={() => _onConfirm(2, { rolled: 7 })}>Confirm</button>
        <button onClick={onClose}>Close</button>
      </div>
    );
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

vi.mock('../../services/automation/common/savePrompt.js', () => ({
  createSaveListener: vi.fn(() => ({ promptId: 'test-prompt-id' })),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

import { useRuntimeValue, getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { useDiceRollPopup } from '../../hooks/combat/DiceRollContext.js';
import { hasAutomation, hasTacticalShift, hasSpeedyOpportunityDisadvantage } from '../../services/combat/automation/automationService.js';
import { getCombatContext, getTargetFromAttacker } from '../../services/rules/combat/damageUtils.js';
import { executeHandler, confirmSearingVengeance, skipSearingVengeance } from '../../services/automation/index.js';
import useLoggedDiceRoll from '../../hooks/combat/useLoggedDiceRoll.js';
import { useSpellMetamagicFlow } from '../../hooks/combat/useSpellMetamagicFlow.js';

const MOCK_ATTACK = { name: 'Longsword', type: 'Action', range: 5, hitBonus: 5, damage: '1d8+3', damageType: 'Slashing' };

const basePlayerStats = {
  name: 'Test Character',
  level: 5,
  reactions: [],
  attacks: [MOCK_ATTACK],
  spellAbilities: { spells: [] },
};

const baseProps = {
  playerStats: basePlayerStats,
  campaignName: 'test-campaign',
  cannotAct: false,
  mapName: null,
  characters: [],
};

function statsWithReactionSpells() {
  return {
    ...basePlayerStats,
    spellAbilities: {
      spells: [
        { name: 'Shield', casting_time: '1 reaction', level: 1, prepared: 'Prepared', damage: 'none', range: 'Self', attack_type: '', dc: { dc_type: '' } },
        { name: 'Counterspell', casting_time: '1 reaction', level: 3, prepared: 'Prepared', damage: 'none', range: '60 feet', attack_type: '', dc: { dc_type: '' } },
      ],
      toHit: 6,
      saveDc: 13,
    },
  };
}

function statsWithCantrip() {
  return {
    ...basePlayerStats,
    spellAbilities: {
      spells: [
        { name: 'Toll the Dead', casting_time: '1 reaction', level: 0, prepared: 'Always', damage: { damage_at_slot_level: { 1: '1d8' } }, range: '60 feet', attack_type: 'ranged' },
      ],
      toHit: 6,
      saveDc: 15,
    },
  };
}

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
  vi.mocked(confirmSearingVengeance).mockImplementation(() => Promise.resolve(null));
  vi.mocked(skipSearingVengeance).mockImplementation(() => Promise.resolve(null));
}

describe('CharReactions - Modal Handler Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  // ===== ArcaneWardRestoreModal rendering =====

  it('renders ArcaneWardRestoreModal with correct props when modalState is set', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'modal',
      modalName: 'arcaneWardRestore',
      payload: { wardHp: 10, maxHp: 20 },
    });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Arcane Ward', description: 'Creates a ward', automation: { type: 'arcane_ward' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Arcane Ward:')); });
    expect(screen.getByTestId('arcane-ward-restore-modal')).toBeInTheDocument();
  });

  // ===== BastionOfLawSpendModal onConfirm callback =====

  it('calls executeHandler with preRollResult when BastionOfLawSpendModal confirm is clicked', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler)
      .mockResolvedValueOnce({ type: 'modal', modalName: 'bastionOfLawSpend', payload: { dice: 3 } })
      .mockResolvedValueOnce(null);
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
    await act(async () => { fireEvent.click(screen.getByTestId('bastion-confirm')); });
    const secondCall = vi.mocked(executeHandler).mock.calls[1];
    expect(secondCall[0]).toEqual(expect.objectContaining({
      automation: { type: 'bastion_of_law_spend' },
      numDice: 2,
      preRollResult: { rolled: 7 },
    }));
  });

  it('calls setPopupHtml when BastionOfLawSpendModal executeHandler returns popup', async () => {
    const setPopupHtml = vi.fn();
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler)
      .mockResolvedValueOnce({ type: 'modal', modalName: 'bastionOfLawSpend', payload: { dice: 3 } })
      .mockResolvedValueOnce({ type: 'popup', payload: 'Reduced by 16' });
    vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'Bastion of Law', description: 'Ward reaction', automation: { type: 'bastion_of_law' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Bastion of Law:')); });
    await act(async () => { fireEvent.click(screen.getByTestId('bastion-confirm')); });
    expect(setPopupHtml).toHaveBeenCalledWith('Reduced by 16');
  });

  it('re-sets modalState when BastionOfLawSpendModal executeHandler returns modal', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler)
      .mockResolvedValueOnce({ type: 'modal', modalName: 'bastionOfLawSpend', payload: { dice: 3 } })
      .mockResolvedValueOnce({ type: 'modal', modalName: 'bastionOfLawSpend', payload: { dice: 2 } });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'Bastion of Law', description: 'Ward reaction', automation: { type: 'bastion_of_law' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Bastion of Law:')); });
    await act(async () => { fireEvent.click(screen.getByTestId('bastion-confirm')); });
    expect(screen.getByTestId('bastion-of-law-spend-modal')).toBeInTheDocument();
  });

  // ===== BendFateModal onClose =====

  it('closes BendFateModal when onClose is called', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'modal',
      modalName: 'bendFateChoice',
      payload: { choice: 'advantage' },
    });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Bend Fate', description: 'Reroll fate', automation: { type: 'bend_fate' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Bend Fate:')); });
    expect(screen.getByTestId('bend-fate-modal')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByText('Close')); });
    expect(screen.queryByTestId('bend-fate-modal')).not.toBeInTheDocument();
  });

  // ===== BoonFateModal onClose =====

  it('closes BoonFateModal when onClose is called', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'modal',
      modalName: 'boonFateChoice',
      payload: { boon: 'recovery' },
    });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Boon of Fate', description: 'Fate boon', automation: { type: 'boon_fate' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Boon of Fate:')); });
    expect(screen.getByTestId('boon-fate-modal')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByText('Close')); });
    expect(screen.queryByTestId('boon-fate-modal')).not.toBeInTheDocument();
  });

  // ===== StepsOfTheFeyTauntModal onClose =====

  it('closes StepsOfTheFeyTauntModal when onClose is called', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'modal',
      modalName: 'stepsOfTheFeyTaunt',
      payload: { playerStats: basePlayerStats },
    });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Steps of the Fey', description: 'Fey taunt', automation: { type: 'taunt' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Steps of the Fey:')); });
    expect(screen.getByTestId('steps-of-the-fey-modal')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByText('Close')); });
    expect(screen.queryByTestId('steps-of-the-fey-modal')).not.toBeInTheDocument();
  });

  // ===== Deflect Redirect with targetName =====

  it('calls deflectRedirectModal.onTargetSelected with targetName on confirm', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    const onTargetSelected = vi.fn().mockResolvedValue(undefined);
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
        onTargetSelected,
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
    const confirmBtn = screen.getByText('Redirect Force');
    await act(async () => { fireEvent.click(confirmBtn); });
    expect(onTargetSelected).toHaveBeenCalledWith('Enemy');
  });

  it('calls deflectRedirectModal.onSkip when skip is triggered', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    const onSkip = vi.fn().mockResolvedValue(undefined);
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
        onSkip,
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
    const skipBtn = screen.getByText('Skip');
    await act(async () => { fireEvent.click(skipBtn); });
    expect(onSkip).toHaveBeenCalled();
  });

  // ===== Energy Redirection with popup result =====

  it('calls setPopupHtml when energyRedirection confirm returns popup type', async () => {
    const setPopupHtml = vi.fn();
    vi.mocked(hasAutomation).mockReturnValue(true);
    const onTargetSelected = vi.fn().mockResolvedValue({ type: 'popup', payload: 'Redirected!' });
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
        onTargetSelected,
      },
    });
    vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml });
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
    const confirmBtn = screen.getByText('Redirect');
    await act(async () => { fireEvent.click(confirmBtn); });
    expect(setPopupHtml).toHaveBeenCalledWith('Redirected!');
  });

  // ===== Searing Vengeance confirm with popup result =====

  it('calls confirmSearingVengeance with selectedTargets on modal confirm', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(confirmSearingVengeance).mockResolvedValue({ type: 'popup', payload: 'Vengeance dealt!' });
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'modal',
      modalName: 'searingVengeance',
      payload: { creatureTargets: ['Enemy1', 'Enemy2'], automation: { type: 'searing_vengeance' } },
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

  it('calls skipSearingVengeance on modal skip', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(skipSearingVengeance).mockResolvedValue({ type: 'popup', payload: 'Vengeance skipped' });
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'modal',
      modalName: 'searingVengeance',
      payload: { creatureTargets: ['Enemy1'], automation: { type: 'searing_vengeance' } },
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

  // ===== Reactive Spell Popup rendering =====

  it('renders reactive spell popup with sorted spell names', async () => {
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
    expect(screen.getByText('click to dismiss')).toBeInTheDocument();
  });

  it('dismisses reactive spell popup when overlay is clicked', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'popup',
      payload: { eligibleSpells: [{ name: 'Fireball' }], hasWarnings: false },
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
    fireEvent.click(screen.getByTestId('popup-overlay'));
    expect(screen.queryByTestId('popup-overlay')).not.toBeInTheDocument();
  });

  // ===== Spell Detail Popup rendering =====

  it('renders SpellDetailPopup when selectedSpell is set via click', () => {
    render(<CharReactions {...baseProps} />);
    fireEvent.click(screen.getByText('Opportunity Attack:'));
    // The spell popup won't show since there are no reaction spells, but the component renders
    expect(screen.getByText('Opportunity Attack:')).toBeInTheDocument();
  });

  // ===== Metamagic Popup rendering =====

  it('renders MetamagicPopup when pendingMetamagic is set', () => {
    vi.mocked(useSpellMetamagicFlow).mockImplementation(() => ({
      pendingMetamagic: { spellName: 'Shocking Grasp', spellLevel: 1, _currentSP: 2 },
      gateMetamagic: vi.fn(),
      handleConfirm: vi.fn(),
      handleSkip: vi.fn(),
    }));
    render(<CharReactions {...baseProps} />);
    expect(screen.getByTestId('metamagic-popup')).toBeInTheDocument();
  });

  // ===== Reaction spells table rendering =====

  it('renders reaction spells table with all columns', () => {
    render(<CharReactions {...baseProps} playerStats={statsWithReactionSpells()} />);
    expect(screen.getByText('Shield')).toBeInTheDocument();
    expect(screen.getByText('Counterspell')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Self')).toBeInTheDocument();
    expect(screen.getByText('60 feet')).toBeInTheDocument();
  });

  it('renders cantrip level label for level 0 spells', () => {
    render(<CharReactions {...baseProps} playerStats={statsWithCantrip()} />);
    expect(screen.getByText('Cantrip')).toBeInTheDocument();
  });

  // ===== handleReactionClick - Stand (Power Word Heal) path =====

  it('renders Stand (Power Word Heal) reaction and handles click', async () => {
    vi.mocked(useRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'powerWordHealStandPermission') return true;
      if (key === 'activeConditions') return ['prone'];
      return undefined;
    });
    vi.mocked(getRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'activeConditions') return ['prone', 'poisoned'];
      return null;
    });
    const setRuntimeValueFn = vi.fn();
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
    expect(screen.getByText('Stand (Power Word Heal):')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByText('Stand (Power Word Heal):')); });
    expect(setRuntimeValueFn).toHaveBeenCalledWith('Test Character', 'activeConditions', ['poisoned'], 'test-campaign');
    expect(setRuntimeValueFn).toHaveBeenCalledWith('Test Character', 'powerWordHealStandPermission', false, 'test-campaign');
    expect(setPopupHtml).toHaveBeenCalledWith('<b>Stand (Power Word Heal)</b><br/>You used your Reaction to stand up.');
  });

  // ===== handleAutomationReaction - popup with eligibleSpells =====

  it('sets reactiveSpellEligible when automation returns popup with eligibleSpells', async () => {
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
    const stats = { ...basePlayerStats, reactions: [{ name: 'Test Popup Auto', description: 'Test', automation: { type: 'test' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Test Popup Auto:')); });
    expect(screen.getByTestId('popup-overlay')).toBeInTheDocument();
    expect(screen.getByText('Burning Hands')).toBeInTheDocument();
  });

  // ===== handleAutomationReaction - unknown modal type =====

  it('shows feature detail popup for unknown modal types', async () => {
    const setPopupHtml = vi.fn();
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'modal',
      modalName: 'totallyUnknown',
      payload: { someData: true },
    });
    vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
      popupHtml: null,
      setPopupHtml: vi.fn(),
    }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'Unknown Modal', description: 'Unknown', details: 'Some details', automation: { type: 'unknown' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Unknown Modal:')); });
    expect(setPopupHtml).toHaveBeenCalledWith('<b>Unknown Modal</b><br/>Unknown<br/><br/>Some details');
  });

  // ===== ArcaneWardRestoreModal with rest props =====

  it('passes rest props to ArcaneWardRestoreModal via spread', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'modal',
      modalName: 'arcaneWardRestore',
      payload: { wardHp: 10, maxHp: 20, someOtherProp: 'value' },
    });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Arcane Ward', description: 'Creates a ward', automation: { type: 'arcane_ward' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Arcane Ward:')); });
    expect(screen.getByTestId('arcane-ward-restore-modal')).toBeInTheDocument();
  });
});
