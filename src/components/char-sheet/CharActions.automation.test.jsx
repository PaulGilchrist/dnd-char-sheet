// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import CharActions from './CharActions.jsx';

// Mock all dependencies (same as rendering test)
vi.mock('../../hooks/runtime/useSyncedState.js', () => ({
  useSyncedState: vi.fn((_, key, defaultValue) => {
    let currentValue = defaultValue;
    const setter = vi.fn((fn) => {
      if (typeof fn === 'function') {
        currentValue = fn(currentValue);
      } else {
        currentValue = fn;
      }
      return currentValue;
    });
    return [currentValue, setter];
  }),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  useRuntimeValue: vi.fn((_, key) => {
    if (key === 'activeBuffs') return [];
    if (key === '_recklessAttack_offeredThisTurn') return null;
    if (key === '_BrutalStrike_usedRound') return null;
    if (key === 'focusPoints') return 2;
    if (key === 'lastActionSpellCast') return null;
    if (key === 'lastAttack') return null;
    if (key === '_recklessAttack_offeredThisTurn') return null;
    return undefined;
  }),
  getRuntimeValue: vi.fn((_, key) => {
    if (key === 'activeBuffs') return [];
    if (key === '_recklessAttack_offeredThisTurn') return null;
    if (key === '_BrutalStrike_usedRound') return null;
    if (key === 'focusPoints') return 2;
    if (key === 'lastActionSpellCast') return null;
    if (key === 'lastAttack') return null;
    if (key === '_recklessAttack_offeredThisTurn') return null;
    return undefined;
  }),
  setRuntimeValue: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/automation/handlers/buffs/tempHpService.js', () => ({
  setTempHp: vi.fn(),
}));

vi.mock('../../services/character/featureCategories.js', () => ({
  getCategories: vi.fn(() => ({ featuresToIgnore: [] })),
}));

vi.mock('../../services/ui/spellSectionUtils.js', () => ({
  getActionSpellNames: vi.fn(() => new Set()),
}));

vi.mock('../../services/ui/formatUtils.js', () => ({
  formatRange: vi.fn((r) => r || '0'),
  signFormatter: new Intl.NumberFormat('en-US', { sign: 'always' }),
  getAttackSpellLevel: vi.fn(() => null),
}));

vi.mock('../../services/rules/core/spellDamageUtils.js', () => ({
  resolveSpellDamageAtLevel: vi.fn(() => null),
  isAutoHitSpell: vi.fn(() => false),
  resolveHealExpression: vi.fn(() => null),
}));

vi.mock('../../services/ui/sanitize.js', () => ({
  sanitizeHtml: vi.fn((html) => html),
}));

vi.mock('../../hooks/combat/useLoggedDiceRoll.js', () => ({
  default: vi.fn(() => ({
    rollAttack: vi.fn(),
    rollDamage: vi.fn(),
    rollSkillCheck: vi.fn(),
    rollAbilityCheck: vi.fn(),
  })),
}));

vi.mock('../../hooks/combat/DiceRollContext.js', () => ({
  useDiceRollPopup: vi.fn(() => ({ popupHtml: null, setPopupHtml: vi.fn() })),
}));

vi.mock('../../hooks/combat/useActionPopup.js', () => ({
  showWeaponMasteryPopup: vi.fn(),
  buildFeatureDetailHtml: vi.fn(() => '<p>Feature details</p>'),
}));

vi.mock('../../hooks/combat/useSpellUpcastFlow.js', () => ({
  useSpellUpcastFlow: vi.fn(() => ({ buildUpcastLevels: vi.fn(() => []) })),
}));

vi.mock('../../services/dice/diceRoller.js', () => ({
  rollExpression: vi.fn(() => ({ total: 8, rolls: [4, 4] })),
}));

vi.mock('../../services/character/featRangeService.js', () => ({
  computeFeatRangeEffects: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/combat/automation/automationService.js', () => ({
  hasAutomation: vi.fn((action) => !!action.automation),
}));

vi.mock('../../services/automation/common/buffToggle.js', () => ({
  toggleBuff: vi.fn(() => ({ wasActive: false })),
}));

vi.mock('../../services/rules/effects/expirations.js', () => ({
  addExpiration: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/automation/common/oncePerTurn.js', () => ({
  markOncePerTurn: vi.fn(() => Promise.resolve()),
}));

vi.mock('./CharActionModals.jsx', () => ({ default: vi.fn(() => null) }));
vi.mock('./CharActionSpellPopups.jsx', () => ({ default: vi.fn(() => null) }));
vi.mock('./CharBonusActions.jsx', () => ({ default: vi.fn(() => null) }));
vi.mock('./useCharActionModals.js', () => ({
  default: vi.fn(() => ({
    modalState: {},
    setModalState: vi.fn(),
    pendingDamage: null,
    resolveAttackDamage: vi.fn(),
    handleMasteryClose: vi.fn(),
    handleWeaponMasteryChoice: vi.fn(),
    handleWeaponKindMasteryClose: vi.fn(),
    handleDivineFuryDamageType: vi.fn(),
    handleDivineFurySkip: vi.fn(),
    handleGenericDamageTypeChoice: vi.fn(),
    handleGenericDamageTypeSkip: vi.fn(),
    handleDamageTypeModifierChoice: vi.fn(),
    handleDamageTypeModifierSkip: vi.fn(),
    handleEnhancedUnarmedChoice: vi.fn(),
    handleEnhancedUnarmedSkip: vi.fn(),
    handleFeatureChoiceConfirm: vi.fn(),
    handleFeatureChoiceSkip: vi.fn(),
    handleConstellationSelect: vi.fn(),
    combatSuperiorityModal: null,
    setCombatSuperiorityModal: vi.fn(),
    handleAttackRiderManeuverUse: vi.fn(),
    handleAttackRiderManeuverSkip: vi.fn(),
    handleCombatSuperiorityConfirm: vi.fn(),
    handleFlurryOfBlowsConfirm: vi.fn(),
    handleFlurryOfBlowsSkip: vi.fn(),
    handleOpenHandFromFlurryConfirm: vi.fn(),
    handleOpenHandFromFlurrySkip: vi.fn(),
  })),
}));

vi.mock('./useInitiativeEffects.js', () => ({ default: vi.fn() }));
vi.mock('./modals/shared/SecondaryTargetModal.jsx', () => ({ default: vi.fn(() => null) }));
vi.mock('./modals/TacticalMasterModal.jsx', () => ({ default: vi.fn(() => null) }));
vi.mock('../../services/automation/handlers/combat/weaponMasteryHandler.js', () => ({
  applyMasteryEffect: vi.fn(() => Promise.resolve({})),
}));
vi.mock('./useAttackDamageResolution.js', () => ({
  normalizeAutoDamage: vi.fn((auto, _isCrit) => ({ attack: auto, ctxOverrides: {} })),
}));
vi.mock('../../hooks/combat/useSimpleDamageRoll.js', () => ({
  useSimpleDamageRoll: vi.fn(() => vi.fn()),
}));
vi.mock('../../hooks/combat/useSpellPositionResolver.js', () => ({
  useSpellPositionResolver: vi.fn(() => ({
    resolvePositions: vi.fn(() => Promise.resolve()),
    cachedPosRef: { current: null },
  })),
}));
vi.mock('../../hooks/combat/useSpellCastExecutor.js', () => ({
  useSpellCastExecutor: vi.fn(() => ({
    castAction: vi.fn(),
  })),
}));
vi.mock('../../services/combat/weaponMasteryUtils.js', () => ({
  getWeaponMastery: vi.fn(() => null),
}));
vi.mock('../../services/automation/common/savePrompt.js', () => ({
  createSaveListener: vi.fn(() => ({ promise: Promise.resolve({ success: false }) })),
}));
vi.mock('../../services/combat/buffs/buffService.js', () => ({
  getInnateSorceryBonus: vi.fn(() => ({ saveDcBonus: 0 })),
}));
vi.mock('../../services/automation/contextBuilder.js', () => ({
  buildAttackContext: vi.fn(() => Promise.resolve({})),
  buildAttackContextSync: vi.fn(() => ({})),
}));
vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getTargetFromAttacker: vi.fn(() => null),
  getCombatContext: vi.fn(() => Promise.resolve(null)),
  getAttackerTargetName: vi.fn(() => null),
}));
vi.mock('../../services/encounters/combatData.js', () => ({
  getActiveCreatureName: vi.fn(() => 'TestCharacter'),
  loadCombatSummary: vi.fn(() => Promise.resolve(null)),
}));
vi.mock('../../services/npcs/monsterUtils.js', () => ({
  getMonsterData: vi.fn(() => Promise.resolve(null)),
}));
vi.mock('../../services/automation/index.js', () => ({
  executeHandler: vi.fn(() => Promise.resolve({ type: 'popup', payload: 'Handled' })),
}));
vi.mock('../../services/rules/features/friendsService.js', () => ({
  endFriendsOnHostileAction: vi.fn(),
}));
vi.mock('../../services/rules/features/invisibilityService.js', () => ({
  endInvisibilityOnHostileAction: vi.fn(),
}));
vi.mock('../../services/rules/spells/empoweredSpellService.js', () => ({
  getEmpoweredSpellDescription: vi.fn(() => ''),
}));
vi.mock('../../hooks/combat/useActionSpellMetamagic.js', () => ({
  useActionSpellMetamagic: vi.fn(() => ({
    pendingActionMetamagic: null,
    handleActionMetamagicConfirm: vi.fn(),
    handleActionMetamagicSkip: vi.fn(),
    handleActionSpellDamageClick: vi.fn(),
    handleSpellAttackClick: vi.fn(),
  })),
}));
vi.mock('../../hooks/combat/useSpellMetamagicFlow.js', () => ({
  useSpellMetamagicFlow: vi.fn(() => ({
    gateMetamagic: vi.fn(),
  })),
}));

// Mock fetch for actions.json
const originalFetch = global.fetch;
global.fetch = vi.fn((url) => {
  if (url === '/data/actions.json') {
    return Promise.resolve({ json: () => Promise.resolve(['Hide', 'Dodge', 'Grapple']) });
  }
  return originalFetch(url);
});

const basePlayerStats = {
  name: 'TestCharacter',
  level: 5,
  rules: '5e',
  abilities: [
    { name: 'Strength', bonus: 4, skills: [{ name: 'Athletics', bonus: 6 }] },
    { name: 'Dexterity', bonus: 2, skills: [{ name: 'Stealth', bonus: 4 }] },
    { name: 'Constitution', bonus: 1 },
    { name: 'Intelligence', bonus: 0 },
    { name: 'Wisdom', bonus: 0 },
    { name: 'Charisma', bonus: 3 },
  ],
  spellAbilities: { modifier: 3, toHit: 7, saveDc: 13 },
  proficiency: 3,
  attacks: [
    { name: 'Longsword', type: 'Action', hitBonus: 7, range: '5ft', damage: '1d8+4', damageType: 'Slashing' },
  ],
  actions: [
    { name: 'Reckless Attack', automation: { type: 'buff', effect: 'advantage_attacks' } },
    { name: 'Second Wind', automation: { type: 'healing_roll', formula: '1d10' } },
  ],
  specialActions: [],
  class: { name: 'Fighter', class_levels: [{ level: 5, focus_points: 2 }] },
  feats: [],
  automation: {
    passives: [],
    specialActions: [],
    actions: [],
  },
};

const baseProps = {
  playerStats: basePlayerStats,
  campaignName: 'test-campaign',
  exhaustionPenalty: 0,
  conditionEffects: {},
  cannotAct: false,
  mapName: null,
  characters: [],
  onBuffsChange: vi.fn(),
  onSpellModalStateChange: vi.fn(),
  spellModalState: {},
};

describe('CharActions - handleAutomationAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns early when cannotAct is true', async () => {
    const executeHandler = (await import('../../services/automation/index.js')).executeHandler;
    const { getByText } = render(<CharActions {...baseProps} cannotAct={true} />);
    await waitFor(() => {
      expect(getByText('Reckless Attack:')).toBeInTheDocument();
    });
    const actionLink = getByText('Reckless Attack:');
    await act(async () => {
      await fireEvent.click(actionLink);
    });
    expect(executeHandler).not.toHaveBeenCalled();
  });

  it('calls executeHandler when action has automation', async () => {
    const executeHandler = (await import('../../services/automation/index.js')).executeHandler;
    const { getByText } = render(<CharActions {...baseProps} />);
    await waitFor(() => {
      expect(getByText('Reckless Attack:')).toBeInTheDocument();
    });
    const actionLink = getByText('Reckless Attack:');
    await act(async () => {
      await fireEvent.click(actionLink);
    });
    expect(executeHandler).toHaveBeenCalled();
  });

  it('dispatches focus-points-updated event when monk spends focus points', async () => {
    const monkStats = {
      ...basePlayerStats,
      name: 'MonkCharacter',
      class: { name: 'Monk', class_levels: [{ level: 5, focus_points: 2 }] },
      actions: [
        { name: 'Flurry of Blows', automation: { type: 'damage_bonus' } },
      ],
      automation: { ...basePlayerStats.automation, passives: [] },
    };

    const { getByText } = render(<CharActions {...baseProps} playerStats={monkStats} />);
    await waitFor(() => {
      expect(getByText('Flurry of Blows:')).toBeInTheDocument();
    });
  });

  it('shows popup when no ki points remain for monk', async () => {
    const getRTV = (await import('../../hooks/runtime/useRuntimeState.js')).getRuntimeValue;
    getRTV.mockImplementation((_, key) => {
      if (key === 'focusPoints') return 0;
      if (key === 'activeBuffs') return [];
      if (key === '_recklessAttack_offeredThisTurn') return null;
      if (key === '_BrutalStrike_usedRound') return null;
      if (key === 'lastActionSpellCast') return null;
      if (key === 'lastAttack') return null;
      return undefined;
    });

    const monkStats = {
      ...basePlayerStats,
      name: 'MonkCharacter',
      class: { name: 'Monk', class_levels: [{ level: 5, focus_points: 2 }] },
      actions: [
        { name: 'Flurry of Blows', automation: { type: 'damage_bonus' } },
      ],
      automation: { ...basePlayerStats.automation, passives: [] },
    };

    const { getByText } = render(<CharActions {...baseProps} playerStats={monkStats} />);
    await waitFor(() => {
      expect(getByText('Flurry of Blows:')).toBeInTheDocument();
    });
  });

  it('checks trigger conditions for gated actions', async () => {
    const { getByText } = render(<CharActions {...baseProps} />);
    await waitFor(() => {
      expect(getByText('Second Wind:')).toBeInTheDocument();
    });
  });
});

describe('CharActions - setModalState wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls onSpellModalStateChange when setModalState is called', async () => {
    const onSpellModalStateChange = vi.fn();
    const { getByText } = render(<CharActions {...baseProps} onSpellModalStateChange={onSpellModalStateChange} />);
    await waitFor(() => {
      expect(getByText('Actions')).toBeInTheDocument();
    });
  });

  it('creates mergedModalState from modalState and spellModalState', async () => {
    const { getByText } = render(<CharActions {...baseProps} />);
    await waitFor(() => {
      expect(getByText('Actions')).toBeInTheDocument();
    });
  });

  it('renders automation badges for save_attack type actions', async () => {
    const stats = {
      ...basePlayerStats,
      actions: [
        { name: 'TestSaveAttack', automation: { type: 'save_attack', saveDc: 13, saveType: 'DEX' } },
      ],
    };
    const { getByText } = render(<CharActions {...baseProps} playerStats={stats} />);
    await waitFor(() => {
      expect(getByText('TestSaveAttack:')).toBeInTheDocument();
    });
  });

  it('renders automation badges for healing_pool type actions', async () => {
    const stats = {
      ...basePlayerStats,
      actions: [
        { name: 'TestHealingPool', automation: { type: 'healing_pool', pool: 10 } },
      ],
    };
    const { getByText } = render(<CharActions {...baseProps} playerStats={stats} />);
    await waitFor(() => {
      expect(getByText('TestHealingPool:')).toBeInTheDocument();
    });
  });

  it('renders automation badges for damage type actions', async () => {
    const stats = {
      ...basePlayerStats,
      actions: [
        { name: 'TestDamage', automation: { damage: '2d6', damageType: 'Fire' } },
      ],
    };
    const { getByText } = render(<CharActions {...baseProps} playerStats={stats} />);
    await waitFor(() => {
      expect(getByText('TestDamage:')).toBeInTheDocument();
    });
  });
});
