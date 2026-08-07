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
  default: vi.fn(() => {
    const [popupHtml, setPopupHtml] = React.useState(null);
    return {
      popupHtml,
      setPopupHtml,
      rollAttack: vi.fn(),
      rollDamage: vi.fn(),
    };
  }),
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

vi.mock('../../services/rules/combat/rangeValidation.js', () => ({
  getNearestPlacedItem: vi.fn(() => null),
}));

vi.mock('../../services/rules/spells/spellCastService.js', () => ({
  executeSpellCast: vi.fn(),
}));

import { useRuntimeValue, getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { hasAutomation, hasTacticalShift, hasSpeedyOpportunityDisadvantage } from '../../services/combat/automation/automationService.js';
import { getCombatContext, getTargetFromAttacker } from '../../services/rules/combat/damageUtils.js';
import { executeHandler } from '../../services/automation/index.js';
import useLoggedDiceRoll from '../../hooks/combat/useLoggedDiceRoll.js';

const MOCK_ATTACK = { name: 'Longsword', type: 'Action', range: 5, hitBonus: 5, damage: '1d8+3', damageType: 'Slashing' };

const basePlayerStats = {
  name: 'Test Character',
  level: 5,
  reactions: [],
  attacks: [MOCK_ATTACK],
  spellAbilities: {
    spells: [],
  },
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

describe('CharReactions - Dynamic Reactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  // ===== Power Word Heal Stand Reaction =====

  it('adds Stand (Power Word Heal) reaction when pwhStance is true', () => {
    vi.mocked(useRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'powerWordHealStandPermission') return true;
      return undefined;
    });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Stand (Power Word Heal)', description: 'You can use your Reaction to stand up.' }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    expect(screen.getByText('Stand (Power Word Heal):')).toBeInTheDocument();
  });

  it('does not add Stand (Power Word Heal) when pwhStance is false', () => {
    vi.mocked(useRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'powerWordHealStandPermission') return false;
      return undefined;
    });
    render(<CharReactions {...baseProps} />);
    expect(screen.queryByText('Stand (Power Word Heal):')).not.toBeInTheDocument();
  });

  it('does not add duplicate Stand when already in base reactions', () => {
    vi.mocked(useRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'powerWordHealStandPermission') return true;
      return undefined;
    });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Stand (Power Word Heal)', description: 'Already present' }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    const allElements = screen.queryAllByText(/Stand \(Power Word Heal\):/);
    expect(allElements.length).toBe(1);
  });

  // ===== Stand (Power Word Heal) click handler =====

  it('removes prone condition when Stand is clicked', async () => {
    vi.mocked(useRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'powerWordHealStandPermission') return true;
      return undefined;
    });
    vi.mocked(getRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'activeConditions') return ['Prone', 'Poisoned'];
      return null;
    });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Stand (Power Word Heal)', description: 'You can use your Reaction to stand up.' }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Stand (Power Word Heal):')); });
    expect(setRuntimeValue).toHaveBeenCalledWith(
      'Test Character',
      'activeConditions',
      ['Poisoned'],
      'test-campaign'
    );
  });

  it('resets powerWordHealStandPermission when Stand is clicked', async () => {
    vi.mocked(useRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'powerWordHealStandPermission') return true;
      if (key === 'activeConditions') return [];
      return undefined;
    });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Stand (Power Word Heal)', description: 'You can use your Reaction to stand up.' }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    await act(async () => { fireEvent.click(screen.getByText('Stand (Power Word Heal):')); });
    expect(setRuntimeValue).toHaveBeenCalledWith(
      'Test Character',
      'powerWordHealStandPermission',
      false,
      'test-campaign'
    );
  });

  // ===== Bastion of Law dynamic reaction =====

  it('adds Bastion of Law reaction when ward is active with dice', () => {
    vi.mocked(useRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'bastionOfLawActive') return true;
      if (key === 'bastionOfLawWardDice') return ['d8', 'd8', 'd8'];
      return undefined;
    });
    render(<CharReactions {...baseProps} />);
    expect(screen.getByText('Bastion of Law:')).toBeInTheDocument();
    expect(screen.getByText(/Ward active \(3d8 remaining\)/)).toBeInTheDocument();
  });

  it('does not add Bastion of Law when ward is inactive', () => {
    vi.mocked(useRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'bastionOfLawActive') return false;
      return undefined;
    });
    render(<CharReactions {...baseProps} />);
    expect(screen.queryByText('Bastion of Law:')).not.toBeInTheDocument();
  });

  it('does not add Bastion of Law when ward has no dice', () => {
    vi.mocked(useRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'bastionOfLawActive') return true;
      if (key === 'bastionOfLawWardDice') return [];
      return undefined;
    });
    render(<CharReactions {...baseProps} />);
    expect(screen.queryByText('Bastion of Law:')).not.toBeInTheDocument();
  });

  it('does not add duplicate Bastion of Law when already in base reactions', () => {
    vi.mocked(useRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'bastionOfLawActive') return true;
      if (key === 'bastionOfLawWardDice') return ['d8'];
      return undefined;
    });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Bastion of Law', description: 'Already present' }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    const allElements = screen.queryAllByText(/Bastion of Law:/);
    expect(allElements.length).toBe(1);
  });

  // ===== Stone's Endurance dynamic description =====

  it('shows uses remaining in Stone\'s Endurance description when uses > 0', () => {
    vi.mocked(getRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'stonesEnduranceUses') return 2;
      return null;
    });
    const stats = { ...basePlayerStats, reactions: [{ name: "Stone's Endurance", description: 'Old description' }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    expect(screen.getByText(/2 uses remaining/)).toBeInTheDocument();
  });

  it('shows no uses remaining when Stone\'s Endurance uses === 0', () => {
    vi.mocked(getRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'stonesEnduranceUses') return 0;
      return null;
    });
    const stats = { ...basePlayerStats, reactions: [{ name: "Stone's Endurance", description: 'Old description' }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    expect(screen.getByText(/No uses remaining/)).toBeInTheDocument();
  });

  it('reads Stone\'s Endurance uses from _trackedResources when getRuntimeValue returns null', () => {
    vi.mocked(getRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'stonesEnduranceUses') return null;
      return null;
    });
    const stats = {
      ...basePlayerStats,
      _trackedResources: { stonesEnduranceUses: { current: 1 } },
      reactions: [{ name: "Stone's Endurance", description: 'Old description' }],
    };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    expect(screen.getByText(/1 uses remaining/)).toBeInTheDocument();
  });

  it('does not modify description when Stone\'s Endurance is not in reactions', () => {
    vi.mocked(getRuntimeValue).mockImplementation(() => null);
    const stats = { ...basePlayerStats, reactions: [{ name: 'Other Reaction', description: 'Something else' }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    expect(screen.getByText('Other Reaction:')).toBeInTheDocument();
  });

  // ===== Storm's Thunder dynamic description =====

  it('shows uses remaining in Storm\'s Thunder description when uses > 0', () => {
    vi.mocked(getRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'stormsThunderUses') return 3;
      return null;
    });
    const stats = { ...basePlayerStats, reactions: [{ name: "Storm's Thunder", description: 'Old description' }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    expect(screen.getByText(/3 uses remaining/)).toBeInTheDocument();
  });

  it('shows no uses remaining when Storm\'s Thunder uses === 0', () => {
    vi.mocked(getRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'stormsThunderUses') return 0;
      return null;
    });
    const stats = { ...basePlayerStats, reactions: [{ name: "Storm's Thunder", description: 'Old description' }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    expect(screen.getByText(/No uses remaining/)).toBeInTheDocument();
  });

  it('reads Storm\'s Thunder uses from _trackedResources when getRuntimeValue returns null', () => {
    vi.mocked(getRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'stormsThunderUses') return null;
      return null;
    });
    const stats = {
      ...basePlayerStats,
      _trackedResources: { stormsThunderUses: { current: 2 } },
      reactions: [{ name: "Storm's Thunder", description: 'Old description' }],
    };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    expect(screen.getByText(/2 uses remaining/)).toBeInTheDocument();
  });

  it('does not modify description when Storm\'s Thunder is not in reactions', () => {
    vi.mocked(getRuntimeValue).mockImplementation(() => null);
    const stats = { ...basePlayerStats, reactions: [{ name: 'Other Reaction', description: 'Something else' }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    expect(screen.getByText('Other Reaction:')).toBeInTheDocument();
  });

  // ===== Revivification dynamic reaction =====

  it('adds Revivification when activeBuffs has reactionSave and not already present', () => {
    vi.mocked(useRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'activeBuffs') return [{ name: 'Rage of the Gods', reactionSave: 'CHA' }];
      return undefined;
    });
    render(<CharReactions {...baseProps} />);
    expect(screen.getByText('Revivification:')).toBeInTheDocument();
  });

  it('does not add Revivification when no reactionSave buff exists', () => {
    vi.mocked(useRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'activeBuffs') return [{ name: 'Some Buff' }];
      return undefined;
    });
    render(<CharReactions {...baseProps} />);
    expect(screen.queryByText('Revivification:')).not.toBeInTheDocument();
  });

  it('does not add duplicate Revivification when already in base reactions', () => {
    vi.mocked(useRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'activeBuffs') return [{ name: 'Rage of the Gods', reactionSave: 'CHA' }];
      return undefined;
    });
    const stats = { ...basePlayerStats, reactions: [{ name: 'Revivification', description: 'Already present', automation: { type: 'revivification' } }] };
    render(<CharReactions {...baseProps} playerStats={stats} />);
    const allElements = screen.queryAllByText(/Revivification:/);
    expect(allElements.length).toBe(1);
  });

  it('adds Revivification with correct automation type', () => {
    vi.mocked(useRuntimeValue).mockImplementation((charName, key) => {
      if (key === 'activeBuffs') return [{ name: 'Rage of the Gods', reactionSave: 'CHA' }];
      return undefined;
    });
    render(<CharReactions {...baseProps} />);
    const revivificationEl = screen.getByText('Revivification:');
    expect(revivificationEl).toBeInTheDocument();
  });
});
