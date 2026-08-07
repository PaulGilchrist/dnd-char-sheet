// @cleaned-by-ai
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

// We need a way to render popup HTML into the DOM for testing.
// The real useDiceRollPopup provides setPopupHtml which renders a DiceRollResult.
// We mock the hook to return a setPopupHtml that renders into the container.

vi.mock('./DiceRollResult.jsx', () => ({
  default: function DiceRollResult(props) {
    return <div data-testid="dice-roll-result">{props.name || 'DiceRollResult'}</div>;
  },
}));

vi.mock('./char-spells/SpellDetailPopup.jsx', () => ({
  default: function SpellDetailPopup({ spell }) {
    return <div data-testid="spell-detail-popup">{spell?.name}</div>;
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
  default: function ArcaneWardRestoreModal() {
    return <div data-testid="arcane-ward-restore-modal">ArcaneWardRestoreModal</div>;
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

vi.mock('../../services/rules/combat/rangeValidation.js', () => ({
  getNearestPlacedItem: vi.fn(() => null),
}));

vi.mock('../../services/rules/spells/spellCastService.js', () => ({
  executeSpellCast: vi.fn(),
}));

vi.mock('../../hooks/combat/DiceRollContext.js', () => ({
  useDiceRollPopup: vi.fn(() => ({ setPopupHtml: vi.fn() })),
}));

import { useRuntimeValue, getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { hasAutomation, hasTacticalShift, hasSpeedyOpportunityDisadvantage } from '../../services/combat/automation/automationService.js';
import { getCombatContext, getTargetFromAttacker } from '../../services/rules/combat/damageUtils.js';
import { executeHandler } from '../../services/automation/index.js';
import useLoggedDiceRoll from '../../hooks/combat/useLoggedDiceRoll.js';
import { useDiceRollPopup } from '../../hooks/combat/DiceRollContext.js';

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
}

describe('CharReactions - Opportunity Attack & Automation Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  // ===== Opportunity Attack - Target Protection Checks =====

  it('calls setPopupHtml with Inspiring Movement message when target has noOA', async () => {
    const setPopupHtml = vi.fn();
    vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({ rollAttack: vi.fn(), rollDamage: vi.fn(), popupHtml: null, setPopupHtml: vi.fn() }));
    vi.mocked(getCombatContext).mockResolvedValue({});
    vi.mocked(getTargetFromAttacker).mockReturnValue({ name: 'Enemy' });
    vi.mocked(getRuntimeValue).mockImplementation((charName, key) => {
      if (charName === 'Enemy' && key === 'inspiringMovementNoOA') return true;
      return null;
    });
    render(<CharReactions {...baseProps} />);
    await act(async () => { fireEvent.click(screen.getByText('Opportunity Attack:')); });
    expect(setPopupHtml).toHaveBeenCalledWith('<b>Opportunity Attack</b><br/>Enemy is protected by Inspiring Movement and cannot be targeted by Opportunity Attacks right now.');
  });

  it('calls setPopupHtml with Tactical Shift message when target has tactical shift', async () => {
    const setPopupHtml = vi.fn();
    vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({ rollAttack: vi.fn(), rollDamage: vi.fn(), popupHtml: null, setPopupHtml: vi.fn() }));
    vi.mocked(getCombatContext).mockResolvedValue({});
    vi.mocked(getTargetFromAttacker).mockReturnValue({ name: 'Enemy' });
    vi.mocked(hasTacticalShift).mockReturnValue(true);
    render(<CharReactions {...baseProps} />);
    await act(async () => { fireEvent.click(screen.getByText('Opportunity Attack:')); });
    expect(setPopupHtml).toHaveBeenCalledWith('<b>Opportunity Attack</b><br/>Enemy is protected by Inspiring Movement and cannot be targeted by Opportunity Attacks right now.');
  });

  it('calls setPopupHtml with Speedy message when target has speedy disadvantage', async () => {
    const setPopupHtml = vi.fn();
    vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({ rollAttack: vi.fn(), rollDamage: vi.fn(), popupHtml: null, setPopupHtml: vi.fn() }));
    vi.mocked(getCombatContext).mockResolvedValue({});
    vi.mocked(getTargetFromAttacker).mockReturnValue({ name: 'Enemy' });
    vi.mocked(hasTacticalShift).mockReturnValue(false);
    vi.mocked(hasSpeedyOpportunityDisadvantage).mockReturnValue(true);
    render(<CharReactions {...baseProps} />);
    await act(async () => { fireEvent.click(screen.getByText('Opportunity Attack:')); });
    expect(setPopupHtml).toHaveBeenCalledWith('<b>Opportunity Attack</b><br/>Enemy has Agile Movement — opportunity attacks against them have Disadvantage.');
  });

  // ===== handleAutomationReaction - attack_roll result type =====

  it('calls rollAttack with autoDamage when automation returns attack_roll', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'attack_roll',
      payload: {
        attack: { name: 'Test Attack', hitBonus: 5, damage: '1d6', damageType: 'Thunder' },
        targetName: 'Enemy',
      },
    });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Test Auto', description: 'Auto reaction', automation: { type: 'test' } }] };
    const rollAttack = vi.fn();
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({ rollAttack, rollDamage: vi.fn(), popupHtml: null, setPopupHtml: vi.fn() }));
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Test Auto:')); });
    expect(rollAttack).toHaveBeenCalledWith('Test Attack', 5, {
      targetName: 'Enemy',
      forcedMode: undefined,
      isOpportunityAttack: true,
      autoDamageFormula: '1d6',
      autoDamageName: 'Test Attack',
      damageType: 'Thunder',
    });
  });

  // ===== handleAutomationReaction - popup result type =====

  it('shows popup with eligible spells when automation returns popup', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({
      type: 'popup',
      payload: { eligibleSpells: [{ name: 'Burning Hands' }], hasWarnings: false },
    });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Reaction Test', description: 'A test reaction', details: 'Details here', automation: { type: 'test' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Reaction Test:')); });
    expect(screen.getByText('Burning Hands')).toBeInTheDocument();
  });

  // ===== Modal result types =====

  it('renders ArcaneWardRestoreModal when automation returns arcaneWardRestore modal', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({ type: 'modal', modalName: 'arcaneWardRestore', payload: { someData: true } });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Arcane Ward', description: 'Creates a ward', automation: { type: 'arcane_ward' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Arcane Ward:')); });
    expect(screen.getByTestId('arcane-ward-restore-modal')).toBeInTheDocument();
  });

  it('renders BastionOfLawSpendModal when automation returns bastionOfLawSpend modal', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({ type: 'modal', modalName: 'bastionOfLawSpend', payload: { dice: 3 } });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Bastion of Law', description: 'Ward reaction', automation: { type: 'bastion_of_law' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Bastion of Law:')); });
    expect(screen.getByText('Bastion of Law:')).toBeInTheDocument();
  });

  it('renders BendFateModal when automation returns bendFateChoice modal', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({ type: 'modal', modalName: 'bendFateChoice', payload: { choice: 'advantage' } });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Bend Fate', description: 'Reroll fate', automation: { type: 'bend_fate' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Bend Fate:')); });
    expect(screen.getByTestId('bend-fate-modal')).toBeInTheDocument();
  });

  it('renders BoonFateModal when automation returns boonFateChoice modal', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({ type: 'modal', modalName: 'boonFateChoice', payload: { boon: 'recovery' } });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Boon of Fate', description: 'Fate boon', automation: { type: 'boon_fate' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Boon of Fate:')); });
    expect(screen.getByTestId('boon-fate-modal')).toBeInTheDocument();
  });

  it('renders Deflect Redirect modal when automation returns deflectRedirect modal', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({ type: 'modal', modalName: 'deflectRedirect', payload: { targets: [{ value: 'Enemy' }] } });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Deflect Redirect', description: 'Redirects damage', automation: { type: 'deflect' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Deflect Redirect:')); });
    expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
  });

  it('renders SearingVengeanceModal when automation returns searingVengeance modal', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({ type: 'modal', modalName: 'searingVengeance', payload: { creatureTargets: ['Enemy'] } });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Searing Vengeance', description: 'Vengeance reaction', automation: { type: 'searing_vengeance' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Searing Vengeance:')); });
    expect(screen.getByTestId('searing-vengeance-modal')).toBeInTheDocument();
  });

  it('renders StepsOfTheFeyTauntModal when automation returns stepsOfTheFeyTaunt modal', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({ type: 'modal', modalName: 'stepsOfTheFeyTaunt', payload: { playerStats: { name: 'Test Character' } } });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Steps of the Fey', description: 'Fey taunt', automation: { type: 'taunt' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Steps of the Fey:')); });
    expect(screen.getByTestId('steps-of-the-fey-modal')).toBeInTheDocument();
  });

  it('renders InspiringMovementAlly modal when automation returns inspiringMovementAlly modal', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({ type: 'modal', modalName: 'inspiringMovementAlly', payload: { creatureTargets: [{ value: 'Ally' }] } });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Inspiring Movement', description: 'Movement reaction', automation: { type: 'inspiring_movement' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Inspiring Movement:')); });
    expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
  });

  it('renders BeguilingTwist modal when automation returns beguilingTwist modal', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({ type: 'modal', modalName: 'beguilingTwist', payload: { targets: [{ value: 'Enemy' }] } });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Beguiling Twist', description: 'Twist reaction', automation: { type: 'beguiling' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Beguiling Twist:')); });
    expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
  });

  it('renders EnergyRedirection modal when automation returns energyRedirection modal', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    vi.mocked(executeHandler).mockResolvedValue({ type: 'modal', modalName: 'energyRedirection', payload: { targets: [{ value: 'Enemy' }] } });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Energy Redirection', description: 'Redirect energy', automation: { type: 'energy_redirection' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Energy Redirection:')); });
    expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
  });

  // ===== Non-automation reaction click =====

  it('shows feature detail popup for non-automation reaction with details', async () => {
    const setPopupHtml = vi.fn();
    vi.mocked(useDiceRollPopup).mockReturnValue({ setPopupHtml });
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({ rollAttack: vi.fn(), rollDamage: vi.fn(), popupHtml: null, setPopupHtml: vi.fn() }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'Reaction Test', description: 'A test reaction', details: 'Details here', automation: { type: 'test' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Reaction Test:')); });
    expect(setPopupHtml).toHaveBeenCalledWith('<b>Reaction Test</b><br/>A test reaction<br/><br/>Details here');
  });

  it('does not show popup for non-automation reaction without details', async () => {
    const setPopupHtml = vi.fn();
    vi.mocked(useLoggedDiceRoll).mockImplementation(() => ({ rollAttack: vi.fn(), rollDamage: vi.fn(), popupHtml: null, setPopupHtml }));
    const stats = { ...basePlayerStats, reactions: [{ name: 'Plain', description: 'No details' }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Plain:')); });
    expect(setPopupHtml).not.toHaveBeenCalled();
  });

  // ===== Reactive Strike exclusion =====

  it('does not mark Reactive Strike as clickable', () => {
    const stats = { ...basePlayerStats, reactions: [{ name: 'Reactive Strike', description: 'Strikes back', details: 'Details' }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    expect(screen.getByText('Reactive Strike:')).not.toHaveClass('clickable');
  });

  // ===== featuresToIgnore filtering =====

  it('excludes reactions in featuresToIgnore list for 5e', () => {
    const stats = { ...basePlayerStats, reactions: [{ name: 'Spellcasting', description: 'Casts spells' }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    expect(screen.queryByText('Spellcasting:')).not.toBeInTheDocument();
  });

  it('excludes reactions in featuresToIgnore list for 2024', () => {
    const stats = { ...basePlayerStats, rules: '2024', reactions: [{ name: 'Spellcasting', description: 'Casts spells' }, { name: 'Protection', description: 'Protects ally' }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    expect(screen.queryByText('Spellcasting:')).not.toBeInTheDocument();
    expect(screen.getByText('Protection:')).toBeInTheDocument();
  });

  // ===== cannotAct guard =====

  it('does not trigger automation handler when cannotAct is true', async () => {
    vi.mocked(hasAutomation).mockReturnValue(true);
    render(<CharReactions {...baseProps} cannotAct={true} />);
    await act(async () => { fireEvent.click(screen.getByText('Opportunity Attack:')); });
    expect(executeHandler).not.toHaveBeenCalled();
  });
});
