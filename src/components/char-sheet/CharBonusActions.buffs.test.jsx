import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharBonusActions from './CharBonusActions.jsx';

vi.mock('../../hooks/combat/useSpellMetamagicFlow.js', () => ({
  useSpellMetamagicFlow: vi.fn(() => ({
    pendingMetamagic: null,
    gateMetamagic: vi.fn(),
    handleConfirm: vi.fn(),
    handleSkip: vi.fn(),
    pendingAid: null,
    handleAidConfirm: vi.fn(),
    handleAidSkip: vi.fn(),
    pendingGreaterRestoration: null,
    handleGreaterRestorationConfirm: vi.fn(),
    handleGreaterRestorationSkip: vi.fn(),
  })),
}));

vi.mock('../../hooks/combat/useSpellUpcastFlow.js', () => ({
  useSpellUpcastFlow: vi.fn(() => ({
    buildUpcastLevels: vi.fn(() => []),
  })),
}));

vi.mock('../../services/combat/automation/automationService.js', () => ({
  hasAutomation: vi.fn(() => false),
}));

vi.mock('../../services/automation/index.js', () => ({
  executeHandler: vi.fn(),
}));

vi.mock('../../services/automation/handlers/combat/saveAttackHandler.js', () => ({
  isExhausted: vi.fn(() => false),
}));

vi.mock('../../services/rules/spells/postCastRiderService.js', () => ({
  getMultiTargetSpreadForSpell: vi.fn(() => null),
  triggerPostCastRiderSaves: vi.fn(),
}));

vi.mock('../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => ({ creatures: [] })),
  getCurrentCombatRound: vi.fn(() => 1),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../hooks/combat/useMetamagic.js', () => ({
  getCurrentSorceryPoints: vi.fn(() => 10),
  getMaxSorceryPoints: vi.fn(() => 10),
  spendSorceryPoints: vi.fn(),
}));

vi.mock('../../services/combat/buffs/buffService.js', () => ({
  getInnateSorceryBonus: vi.fn((_playerName, _campaignName) => ({ saveDcBonus: 0 })),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  listeners: new Map(),
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(() => Promise.resolve()),
  useRuntimeValue: vi.fn(() => null),
}));

vi.mock('../../services/maps/mapsService.js', () => ({
  loadMapData: vi.fn(() => Promise.resolve({})),
}));

vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getTargetFromAttacker: vi.fn(() => null),
  getCombatContext: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/rules/combat/rangeValidation.js', () => ({
  getNearestPlacedItem: vi.fn(() => null),
}));

vi.mock('../../services/ui/sanitize.js', () => ({
  sanitizeHtml: vi.fn((html) => html),
}));

vi.mock('../../hooks/combat/useActionPopup.js', () => ({
  showWeaponMasteryPopup: vi.fn(),
  buildFeatureDetailHtml: vi.fn((entity) => {
    if (entity.details) {
      return `<b>${entity.name}</b><br/>${entity.description}<br/><br/>${entity.details}`;
    }
    return null;
  }),
}));

vi.mock('../../hooks/combat/DiceRollContext.js', () => ({
  useDiceRollPopup: vi.fn(() => ({ popupHtml: null, setPopupHtml: vi.fn() })),
}));

vi.mock('./popups/MetamagicPopup.jsx', () => ({
  default: vi.fn((_props) => <div data-testid="metamagic-popup">{_props.spell?.name || 'MetamagicPopup'}</div>),
}));

vi.mock('./char-spells/SpellDetailPopup.jsx', () => ({
  default: vi.fn((props) => <div data-testid="spell-detail-popup">{props.spell?.name || 'SpellDetailPopup'}</div>),
}));

vi.mock('./HexAbilityModal.jsx', () => ({
  default: vi.fn((props) => <div data-testid="hex-ability-modal"><button onClick={props.onCancel}>Cancel</button></div>),
}));

vi.mock('./modals/shared/SecondaryTargetModal.jsx', () => ({
  default: vi.fn((props) => <div data-testid="secondary-target-modal">{props.title}</div>),
}));

vi.mock('./ArcaneVigorModal.jsx', () => ({
  default: vi.fn(() => <div data-testid="arcane-vigor-modal">Arcane Vigor</div>),
}));

import { getRuntimeValue, useRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { hasAutomation } from '../../services/combat/automation/automationService.js';

const basePlayerStats = {
  name: 'TestCharacter',
  rules: '5e',
  level: 5,
  attacks: [],
  bonusActions: [],
  spellAbilities: { spells: [] },
};

function createStats(overrides = {}) {
  return { ...basePlayerStats, ...overrides };
}

describe('CharBonusActions - Wrath of the Sea', () => {
  beforeEach(() => {
    getRuntimeValue.mockReset().mockReturnValue(null);
    useRuntimeValue.mockReset().mockReturnValue(null);
    hasAutomation.mockReset().mockReturnValue(false);
    localStorage.clear();
  });

  it('renders Wrath of the Sea when wrathOfTheSeaActive is true and not in bonusActions', () => {
    vi.mocked(getRuntimeValue).mockImplementation((name, key) => {
      if (key === 'wrathOfTheSeaActive') return true;
      return null;
    });
    render(<CharBonusActions playerStats={createStats({ bonusActions: [{ name: 'TestFeature', description: 'test' }] })} onAutomationAction={vi.fn()} />);
    expect(screen.getByText(/Wrath of the Sea:/)).toBeInTheDocument();
    expect(screen.getByText(/Force a creature to make a CON save or take WIS modifier d6 Cold damage/)).toBeInTheDocument();
  });

  it('does not render Wrath of the Sea when already in bonusActions', () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'wrathOfTheSeaActive') return true;
      return null;
    });
    render(<CharBonusActions playerStats={createStats({ bonusActions: [{ name: 'Wrath of the Sea', description: '...' }, { name: 'TestFeature', description: 'test' }] })} onAutomationAction={vi.fn()} />);
    // The feature itself is in bonusActions, so the auto-generated one should not appear
    // We verify by checking that the auto-generated clickable link is not present
    const allWrathElements = screen.queryAllByText(/Wrath of the Sea/);
    expect(allWrathElements.length).toBe(1);
  });

  it('does not render Wrath of the Sea when buff is not active', () => {
    getRuntimeValue.mockReturnValue(null);
    render(<CharBonusActions playerStats={createStats({ bonusActions: [{ name: 'TestFeature', description: 'test' }] })} onAutomationAction={vi.fn()} />);
    expect(screen.queryByText(/Wrath of the Sea:/)).not.toBeInTheDocument();
  });

  it('calls onAutomationAction with correct automation payload when clicked', () => {
    vi.mocked(getRuntimeValue).mockImplementation((name, key) => {
      if (key === 'wrathOfTheSeaActive') return true;
      return null;
    });
    const mockOnAutomationAction = vi.fn();
    render(<CharBonusActions playerStats={createStats({ bonusActions: [{ name: 'TestFeature', description: 'test' }] })} onAutomationAction={mockOnAutomationAction} />);
    fireEvent.click(screen.getByText(/Wrath of the Sea:/));
    expect(mockOnAutomationAction).toHaveBeenCalledWith({
      name: 'Wrath of the Sea',
      description: 'Force a creature to make a CON save or take WIS modifier d6 Cold damage.',
      automation: {
        type: 'wrath_of_the_sea',
        action: 'bonus_action',
        allyAttack: true,
      },
    });
  });
});

describe('CharBonusActions - Starry Form: Luminous Arrow', () => {
  beforeEach(() => {
    getRuntimeValue.mockReset().mockReturnValue(null);
    useRuntimeValue.mockReset().mockReturnValue(null);
    hasAutomation.mockReset().mockReturnValue(false);
    localStorage.clear();
  });

  it('renders Starry Form when Archer constellation buff is active', () => {
    useRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [{ name: 'Starry Form', constellation: 'Archer' }];
      return null;
    });
    const stats = createStats({ level: 5, abilities: [{ name: 'Wisdom', bonus: 3 }], spellAbilities: { toHit: 7 }, bonusActions: [{ name: 'TestFeature', description: 'test' }] });
    render(<CharBonusActions playerStats={stats} onAutomationAction={vi.fn()} />);
    expect(screen.getByText(/Starry Form: Luminous Arrow:/)).toBeInTheDocument();
    expect(screen.getByText(/Ranged spell attack, 60 ft/)).toBeInTheDocument();
  });

  it('shows 2d8 damage for level 10+ characters', () => {
    useRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [{ name: 'Starry Form', constellation: 'Archer' }];
      return null;
    });
    const stats = createStats({ level: 10, abilities: [{ name: 'Wisdom', bonus: 3 }], spellAbilities: { toHit: 12 }, bonusActions: [{ name: 'TestFeature', description: 'test' }] });
    render(<CharBonusActions playerStats={stats} onAutomationAction={vi.fn()} />);
    expect(screen.getByText(/2d8/)).toBeInTheDocument();
  });

  it('shows 1d8 damage for level < 10 characters', () => {
    useRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [{ name: 'Starry Form', constellation: 'Archer' }];
      return null;
    });
    const stats = createStats({ level: 5, abilities: [{ name: 'Wisdom', bonus: 3 }], spellAbilities: { toHit: 7 }, bonusActions: [{ name: 'TestFeature', description: 'test' }] });
    render(<CharBonusActions playerStats={stats} onAutomationAction={vi.fn()} />);
    expect(screen.getByText(/1d8/)).toBeInTheDocument();
  });

  it('does not render when Starry Form buff is absent', () => {
    useRuntimeValue.mockReturnValue(null);
    render(<CharBonusActions playerStats={createStats({ level: 10, bonusActions: [{ name: 'TestFeature', description: 'test' }] })} onAutomationAction={vi.fn()} />);
    expect(screen.queryByText(/Starry Form: Luminous Arrow:/)).not.toBeInTheDocument();
  });

  it('does not render when constellation is not Archer', () => {
    useRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [{ name: 'Starry Form', constellation: 'Hunter' }];
      return null;
    });
    render(<CharBonusActions playerStats={createStats({ level: 10, bonusActions: [{ name: 'TestFeature', description: 'test' }] })} onAutomationAction={vi.fn()} />);
    expect(screen.queryByText(/Starry Form: Luminous Arrow:/)).not.toBeInTheDocument();
  });

  it('calls onAutomationAction with correct payload when clicked', () => {
    useRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeBuffs') return [{ name: 'Starry Form', constellation: 'Archer' }];
      return null;
    });
    const mockOnAutomationAction = vi.fn();
    const stats = createStats({ level: 5, abilities: [{ name: 'Wisdom', bonus: 3 }], spellAbilities: { toHit: 7 }, bonusActions: [{ name: 'TestFeature', description: 'test' }] });
    render(<CharBonusActions playerStats={stats} onAutomationAction={mockOnAutomationAction} />);
    fireEvent.click(screen.getByText(/Starry Form: Luminous Arrow:/));
    expect(mockOnAutomationAction).toHaveBeenCalledWith({
      name: 'Starry Form: Luminous Arrow',
      description: 'Ranged spell attack, 60 ft. On a hit: 1d8 + 3 Radiant damage.',
      automation: {
        type: 'starry_form_arrow',
        action: 'bonus_action',
        damageDice: '1d8',
        damageType: 'Radiant',
        damageBonus: 3,
        spellAttackMod: 7,
        range: '60_ft',
      },
    });
  });
});
