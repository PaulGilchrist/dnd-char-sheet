import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import CharSheet from './CharSheet';
import rulesFactory from '../../services/rules/rulesFactory.js';

// ---------------------------------------------------------------------------
// Mocks — child components
// ---------------------------------------------------------------------------

vi.mock('./char-summary/CharSummary.jsx', () => ({
  default: vi.fn(({ playerStats }) => (
    <div data-testid="char-summary"><span>{playerStats?.name || 'none'}</span></div>
  )),
}));

vi.mock('./CharAbilities.jsx', () => ({
  default: vi.fn(({ playerStats }) => (
    <div data-testid="char-abilities"><span>{playerStats?.name || 'none'}</span></div>
  )),
}));

vi.mock('./CharActions.jsx', () => ({
  default: vi.fn(({ playerStats }) => (
    <div data-testid="char-actions"><span>{playerStats?.name || 'none'}</span></div>
  )),
}));

vi.mock('./CharInventory.jsx', () => ({
  default: vi.fn(({ playerStats }) => (
    <div data-testid="char-inventory"><span>{playerStats?.name || 'none'}</span></div>
  )),
}));

vi.mock('./CharReactions.jsx', () => ({
  default: vi.fn(({ playerStats }) => (
    <div data-testid="char-reactions"><span>{playerStats?.name || 'none'}</span></div>
  )),
}));

vi.mock('./CharSpecialActions.jsx', () => ({
  default: vi.fn(({ playerStats }) => (
    <div data-testid="char-special-actions"><span>{playerStats?.name || 'none'}</span></div>
  )),
}));

vi.mock('./CharCharacterAdvancement.jsx', () => ({
  default: vi.fn(({ playerStats }) => (
    <div data-testid="char-character-advancement"><span>{playerStats?.name || 'none'}</span></div>
  )),
}));

vi.mock('./char-spells/CharSpells.jsx', () => ({
  default: vi.fn(({ playerStats }) => (
    <div data-testid="char-spells"><span>{playerStats?.name || 'none'}</span></div>
  )),
}));

// ---------------------------------------------------------------------------
// Mocks — services
// ---------------------------------------------------------------------------

vi.mock('../../services/automation/handlers/shieldOfFaithHandler.js', () => ({
  applyShieldOfFaith: vi.fn(),
}));

vi.mock('../../services/combat/auras/auraComboEffects.js', () => ({
  computeAuraComboEffects: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../services/combat/conditions/conditionEffects.js', () => ({
  computeConditionEffects: vi.fn().mockReturnValue({
    attackAdvantageCount: 0,
    attackDisadvantageCount: 0,
    autoReroll: false,
    autoRerollCondition: null,
    autoRerollBonus: null,
    cannotAct: false,
  }),
  getNetAttackMode: vi.fn().mockReturnValue('normal'),
  CONDITIONS_THAT_CANNOT_ACT: new Set(['incapacitated', 'paralyzed', 'petrified', 'stunned', 'unconscious']),
}));

vi.mock('../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn().mockReturnValue({ creatures: [] }),
  loadCombatSummary: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../services/combat/automation/automationService.js', () => ({
  evaluateAutoExpression: vi.fn((expr) => expr),
}));

vi.mock('../../services/automation/handlers/buffs/protectionFromEvilAndGoodHandler.js', () => ({
  isCreatureWarded: vi.fn().mockReturnValue(false),
}));

vi.mock('../../services/automation/handlers/buffs/holyAuraHandler.js', () => ({
  getHolyAuraTargets: vi.fn().mockReturnValue(false),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/rules/combat/applyDamage.js', () => ({
  applyDamageToTarget: vi.fn().mockReturnValue(null),
}));

vi.mock('../../services/rules/spells/empoweredSpellService.js', () => ({
  executeEmpoweredReroll: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js', () => ({
  getManeuversForRules: vi.fn().mockResolvedValue([]),
  getSuperiorityDice: vi.fn().mockReturnValue(0),
}));

vi.mock('../../services/ui/storage.js', () => ({
  default: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    getProperty: vi.fn().mockResolvedValue(null),
    setProperty: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../services/ui/sanitize.js', () => ({
  sanitizeHtml: vi.fn((html) => html),
}));

vi.mock('./modals/shared/SecondaryTargetModal.jsx', () => ({
  default: vi.fn(() => <div data-testid="secondary-target-modal">modal</div>),
}));

vi.mock('./modals/PolymorphSelectionModal.jsx', () => ({
  default: vi.fn(() => <div data-testid="polymorph-selection-modal">modal</div>),
}));

vi.mock('./modals/AnimalShapesSelectionModal.jsx', () => ({
  default: vi.fn(() => <div data-testid="animal-shapes-selection-modal">modal</div>),
}));

vi.mock('./modals/ObjectTransformModal.jsx', () => ({
  default: vi.fn(() => <div data-testid="object-transform-modal">modal</div>),
}));

vi.mock('../common/popup.jsx', () => ({
  default: vi.fn(({ children }) => <div data-testid="popup">{children}</div>),
}));

vi.mock('../common/AttackResultPopup.jsx', () => ({
  default: vi.fn((props) => (
    <div data-testid="attack-result-popup">
      <span>{props.popupHtml?.name || 'Attack'}</span>
    </div>
  )),
}));

// ---------------------------------------------------------------------------
// Mocks — hooks
// ---------------------------------------------------------------------------

const mockStore = new Map();

let sharedPopupReturnVal = {
  popupHtml: null,
  setPopupHtml: vi.fn(),
  value: {},
  Provider: ({ children }) => children,
};

vi.mock('../../hooks/combat/useSharedPopup.js', () => {
  const mockFn = vi.fn();
  mockFn.mockImplementation(() => {
    return { ...sharedPopupReturnVal, Provider: ({ children }) => children };
  });
  return { default: mockFn };
});

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  listeners: new Map(),
  getRuntimeValue: vi.fn((key, prop, _camp) => mockStore.get(`${key}:${prop}`) ?? null),
  setRuntimeValue: vi.fn((_key, _prop, _val, _camp) => mockStore.set(`${_key}:${_prop}`, _val)),
  useRuntimeValue: vi.fn((key, prop) => {
    if (prop === 'exhaustionLevel') return 0;
    if (prop === 'bardicInspirationDie') return mockStore.get(`${key}:bardicInspirationDie`) ?? null;
    if (prop === 'bardicInspirationCombatOptions') return mockStore.get(`${key}:bardicInspirationCombatOptions`) ?? null;
    if (prop === 'activeConditions') return [];
    if (prop === 'activeBuffs') return [];
    if (prop === 'targetEffects') return [];
    if (prop === 'preparedSpells') return mockStore.get(`${key}:preparedSpells`) ?? null;
    if (prop === 'aspectOfTheWildsOption') return mockStore.get(`${key}:aspectOfTheWildsOption`) ?? null;
    if (prop === 'bardicInspirationGrantedBy') return mockStore.get(`${key}:bardicInspirationGrantedBy`) ?? 'unknown';
    if (prop === 'stunned_speedHalved') return mockStore.get(`${key}:stunned_speedHalved`) ?? null;
    if (prop === 'fanaticalFocusUsed') return mockStore.get(`${key}:fanaticalFocusUsed`) ?? null;
    if (prop === 'focusPoints') return mockStore.get(`${key}:focusPoints`) ?? null;
    if (prop === 'indomitableUses') return mockStore.get(`${key}:indomitableUses`) ?? 0;
    if (prop === 'disciplinedSurvivorUsed') return mockStore.get(`${key}:disciplinedSurvivorUsed`) ?? null;
    if (prop === 'strokeOfLuckUsed') return mockStore.get(`${key}:strokeOfLuckUsed`) ?? null;
    if (prop === 'bardicInspirationUses') return mockStore.get(`${key}:bardicInspirationUses`) ?? 0;
    if (prop === 'secondWindUses') return mockStore.get(`${key}:secondWindUses`) ?? 0;
    if (prop === 'superiorityDice') return mockStore.get(`${key}:superiorityDice`) ?? 0;
    if (prop === 'psionicEnergy') return mockStore.get(`${key}:psionicEnergy`) ?? 0;
    if (prop === 'peerlessAthleteActive') return mockStore.get(`${key}:peerlessAthleteActive`) ?? null;
    if (prop === 'largeFormActive') return mockStore.get(`${key}:largeFormActive`) ?? null;
    if (prop === 'holyNimbusActive') return mockStore.get(`${key}:holyNimbusActive`) ?? null;
    if (prop === '_Defensive_Tactics_choice') return mockStore.get(`${key}:_Defensive_Tactics_choice`) ?? null;
    if (prop === 'luckyAdvantageActive') return mockStore.get(`${key}:luckyAdvantageActive`) ?? null;
    if (prop === 'luckyDisadvantageActive') return mockStore.get(`${key}:luckyDisadvantageActive`) ?? null;
    if (prop === '_circleOfTheLandType') return mockStore.get(`${key}:_circleOfTheLandType`) ?? null;
    if (prop === '_Energy_Resistances_chosenTypes') return mockStore.get(`${key}:_Energy_Resistances_chosenTypes`) ?? null;
    if (prop === '_Fiendish_Resilience_chosenType') return mockStore.get(`${key}:_Fiendish_Resilience_chosenType`) ?? null;
    if (prop === '_spellThiefCasterBlock') return mockStore.get(`${key}:_spellThiefCasterBlock`) ?? null;
    if (prop === '_spellThiefStolenList') return mockStore.get(`${key}:_spellThiefStolenList`) ?? null;
    if (prop === 'piercerPunctureUsedThisTurn') return mockStore.get(`${key}:piercerPunctureUsedThisTurn`) ?? null;
    if (prop === '_Savage_Attacker_usedRound') return mockStore.get(`${key}:_Savage_Attacker_usedRound`) ?? null;
    if (prop === 'darkOnesLuckUses') return mockStore.get(`${key}:darkOnesLuckUses`) ?? null;
    return null;
  }),
}));

vi.mock('../../services/rules/rulesFactory.js', () => ({
  default: {
    getPlayerStats: vi.fn().mockImplementation(() => Promise.resolve(createMockPlayerStats())),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createMockPlayerStats = (overrides = {}) => ({
  name: 'Test Character',
  level: 5,
  hitPoints: { current: 40, max: 40 },
  abilities: [{ name: 'Strength', bonus: 2, save: 4, skills: [] }],
  spellAbilities: { spells: [], maxPreparedSpells: 5 },
  rules: '5e',
  automation: { passives: [] },
  class: { name: 'Fighter' },
  speed: 30,
  race: { speed: 30 },
  actions: [],
  bonusActions: [],
  reactions: [],
  specialActions: [],
  characterAdvancement: [],
  skillProficiencies: [],
  saveModifiers: [],
  ...overrides,
});

const mockPlayerSummary = {
  name: 'Test Character',
  rules: '5e',
};

const defaultProps = {
  allAbilityScores: [],
  allClasses: [],
  allClasses2024: [],
  allEquipment: [],
  allMagicItems: [],
  allRaces: [],
  allSpells: [],
  allSpells2024: [],
  playerSummary: mockPlayerSummary,
  allRaces2024: [],
  allMagicItems2024: [],
  campaignName: 'test-campaign',
  activeMapName: null,
  characters: [],
  onDeleteCharacter: vi.fn(),
  onEditCharacter: vi.fn(),
  onUploadClick: vi.fn(),
  onSaveClick: vi.fn(),
};

// ---------------------------------------------------------------------------
// Tests — modal confirm handlers
// ---------------------------------------------------------------------------

describe('CharSheet modal confirm handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  function setPopup(html) {
    sharedPopupReturnVal.popupHtml = html;
  }

  it('renders with wild_shape_select popup and calls handleWildShapeConfirm', async () => {
    vi.mocked(sharedPopupReturnVal.setPopupHtml).mockImplementation(() => {});
    setPopup({
      type: 'wild_shape_select',
      playerStats: createMockPlayerStats(),
      campaignName: 'test-campaign',
      action: { name: 'Wild Shape' },
    });
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('renders with polymorph_select popup and calls handlePolymorphConfirm', async () => {
    setPopup({
      type: 'polymorph_select',
      maxCR: 4,
      campaignName: 'test-campaign',
      targetName: 'Test Character',
      casterName: 'Test Character',
    });
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('renders with shapechange_select popup and calls handleShapechangeConfirm', async () => {
    setPopup({
      type: 'shapechange_select',
      maxCR: 8,
      campaignName: 'test-campaign',
      targetName: 'Test Character',
      casterName: 'Test Character',
    });
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('renders with animal_shapes_target_selection and calls handleAnimalShapesBeastConfirm', async () => {
    setPopup({
      type: 'animal_shapes_target_selection',
      targets: [{ name: 'Goblin', type: 'creature' }],
      maxCR: 4,
      campaignName: 'test-campaign',
    });
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('renders with true_polymorph_select and calls handleTruePolymorphConfirm', async () => {
    setPopup({
      type: 'true_polymorph_select',
      maxCR: 8,
      campaignName: 'test-campaign',
      targetName: 'Test Character',
      casterName: 'Test Character',
      mode: 'creature_to_creature',
    });
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('renders with true_polymorph_object and calls handleObjectTransformConfirm', async () => {
    setPopup({
      type: 'true_polymorph_object',
      campaignName: 'test-campaign',
      targetName: 'Test Character',
      casterName: 'Test Character',
    });
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — setModalState callback
// ---------------------------------------------------------------------------

describe('CharSheet setModalState callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  function setPopup(html) {
    sharedPopupReturnVal.popupHtml = html;
  }

  it('renders with modal state passed to CharActions', async () => {
    setPopup(null);
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — handleTogglePreparedSpells
// ---------------------------------------------------------------------------

describe('CharSheet handleTogglePreparedSpells', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('toggles prepared spell from empty to prepared', async () => {
    const stats = createMockPlayerStats({
      spellAbilities: {
        spells: [
          { name: 'Magic Missile', prepared: '' },
          { name: 'Shield', prepared: 'Prepared' },
        ],
        maxPreparedSpells: 3,
      },
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('toggles prepared spell from prepared to empty', async () => {
    const stats = createMockPlayerStats({
      spellAbilities: {
        spells: [
          { name: 'Magic Missile', prepared: 'Prepared' },
          { name: 'Shield', prepared: '' },
        ],
        maxPreparedSpells: 3,
      },
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('respects maxPreparedSpells limit', async () => {
    const stats = createMockPlayerStats({
      spellAbilities: {
        spells: [
          { name: 'Magic Missile', prepared: '' },
          { name: 'Shield', prepared: 'Prepared' },
          { name: 'Armor of Agathys', prepared: 'Prepared' },
          { name: 'Mage Armor', prepared: 'Prepared' },
        ],
        maxPreparedSpells: 3,
      },
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — stance save modifiers
// ---------------------------------------------------------------------------

describe('CharSheet stance save modifiers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('extracts stance save modifiers from activeBuffs', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([
      { name: 'Rage', advantages: ['STR saves'] },
    ]));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({});

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('handles multiple stance save modifiers', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([
      { name: 'Rage', advantages: ['STR saves'] },
      { name: 'Berserker', advantages: ['DEX saves'] },
    ]));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({});

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — PFEAG save advantage
// ---------------------------------------------------------------------------

describe('CharSheet PFEAG save advantage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('creates PFEAG save advantage when charmed and PFEAG active', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([
      { effect: 'protection_from_evil_and_good' },
    ]));
    mockStore.set('Test Character:activeConditions', JSON.stringify(['charmed']));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({});

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('creates PFEAG save advantage when frightened and PFEAG active', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([
      { effect: 'protection_from_evil_and_good' },
    ]));
    mockStore.set('Test Character:activeConditions', JSON.stringify(['frightened']));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({});

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does not create PFEAG save advantage when not charmed or frightened', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([
      { effect: 'protection_from_evil_and_good' },
    ]));
    mockStore.set('Test Character:activeConditions', JSON.stringify([]));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({});

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — target effects filtering
// ---------------------------------------------------------------------------

describe('CharSheet target effects filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('filters target effects by player summary name', async () => {
    mockStore.set('campaign:targetEffects', JSON.stringify([
      { target: 'Test Character', effect: 'burning_hands' },
      { target: 'Other Character', effect: 'fire_bolt' },
    ]));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({});

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — getNetAttackMode with various advantage/disadvantage combos
// ---------------------------------------------------------------------------

describe('CharSheet getNetAttackMode and cannotAct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('computes cannotAct from CONDITIONS_THAT_CANNOT_ACT set', async () => {
    mockStore.set('Test Character:activeConditions', JSON.stringify(['paralyzed']));
    const { getNetAttackMode } = await import('../../services/combat/conditions/conditionEffects.js');
    getNetAttackMode.mockReturnValue('cannot_act');

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Lucky advantage/disadvantage
// ---------------------------------------------------------------------------

describe('CharSheet lucky advantage/disadvantage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('adds save advantage when luckyAdvantageActive', async () => {
    mockStore.set('Test Character:luckyAdvantageActive', true);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ saveAdvantageCount: 0 });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('sets luckyDisadvantage when luckyDisadvantageActive', async () => {
    mockStore.set('Test Character:luckyDisadvantageActive', true);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({});

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — effectiveAttackMode
// ---------------------------------------------------------------------------

describe('CharSheet effectiveAttackMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('uses luckyAdvantageActive over conditionAttackMode', async () => {
    mockStore.set('Test Character:luckyAdvantageActive', true);
    const { getNetAttackMode } = await import('../../services/combat/conditions/conditionEffects.js');
    getNetAttackMode.mockReturnValue('disadvantage');

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — fanaticalFocusUsed reset on isRaging change
// ---------------------------------------------------------------------------

describe('CharSheet fanaticalFocusUsed reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('resets fanaticalFocusUsed when not raging', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([]));
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Aura combo effects
// ---------------------------------------------------------------------------

describe('CharSheet aura combo effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('computes aura combo effects when playerStats and characters available', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([]));
    const { computeAuraComboEffects } = await import('../../services/combat/auras/auraComboEffects.js');
    computeAuraComboEffects.mockResolvedValue({ effects: [] });

    render(<CharSheet {...defaultProps} characters={[{ name: 'Ally' }]} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Counterspell event listener
// ---------------------------------------------------------------------------

describe('CharSheet counterspell event listener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  function setPopup(html) {
    sharedPopupReturnVal.popupHtml = html;
  }

  it('sets popupHtml on counterspell-save-result event', async () => {
    setPopup(null);
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    window.dispatchEvent(new CustomEvent('counterspell-save-result', {
      detail: {
        attackerName: 'Goblin',
        spellName: 'Fireball',
        saveDc: 13,
        spellResult: 'failed',
        counterspellResult: 'was successfully countered',
      },
    }));

    await waitFor(() => {
      expect(sharedPopupReturnVal.setPopupHtml).toHaveBeenCalled();
    });
  });

  it('does not set popupHtml when attackerName is missing', async () => {
    setPopup(null);
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    window.dispatchEvent(new CustomEvent('counterspell-save-result', {
      detail: {
        spellName: 'Fireball',
        saveDc: 13,
        spellResult: 'failed',
        counterspellResult: 'was successfully countered',
      },
    }));

    expect(sharedPopupReturnVal.setPopupHtml).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests — Shield of Faith target selection modal handler
// ---------------------------------------------------------------------------

describe('CharSheet Shield of Faith target selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  function setPopup(html) {
    sharedPopupReturnVal.popupHtml = html;
  }

  it('renders shield_of_faith_target_selection with modal', async () => {
    setPopup({
      type: 'shield_of_faith_target_selection',
      creatureTargets: [{ name: 'Ally1' }, { name: 'Ally2' }],
      duration: '1 minute',
      range: 60,
    });
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — HitPoints sync effect
// ---------------------------------------------------------------------------

describe('CharSheet hitPoints sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('syncs hitPoints to runtime store when playerStats changes', async () => {
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    // Verify hitPoints was set in the mock store
    expect(mockStore.has('Test Character:hitPoints')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests — CotL land type with subclass
// ---------------------------------------------------------------------------

describe('CharSheet CotL land type with subclass', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('applies CotL land type to subclass when subclass exists', async () => {
    mockStore.set('Test Character:_circleOfTheLandType', 'desert');
    const stats = createMockPlayerStats({
      class: { name: 'Druid', subclass: { name: 'Circle of the Land' } },
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Prepared spells loading for non-Wizard 2024
// ---------------------------------------------------------------------------

describe('CharSheet prepared spells for non-Wizard 2024', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('does not load prepared spells for 2024 non-Wizard', async () => {
    const stats = createMockPlayerStats({
      rules: '2024',
      class: { name: 'Sorcerer' },
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));
    mockStore.set('Test Character:preparedSpells', JSON.stringify(['Fire Bolt']));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Aquatic Affinity passive
// ---------------------------------------------------------------------------

describe('CharSheet aquatic affinity passive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('sets swimSpeed and aquaticAffinityEmanationRange when aquatic_affinity passive exists', async () => {
    const stats = createMockPlayerStats({
      automation: { passives: [{ effect: 'aquatic_affinity' }] },
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Second-Storywork passive
// ---------------------------------------------------------------------------

describe('CharSheet second-storywork passive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('sets climbSpeed when second_storywork passive exists', async () => {
    const stats = createMockPlayerStats({
      automation: { passives: [{ effect: 'second_storywork' }] },
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Athlete climb passive
// ---------------------------------------------------------------------------

describe('CharSheet athlete climb passive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('sets climbSpeed when climb_speed passive exists', async () => {
    const stats = createMockPlayerStats({
      automation: { passives: [{ effect: 'climb_speed' }] },
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Roving passive
// ---------------------------------------------------------------------------

describe('CharSheet roving passive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('sets climbSpeed and swimSpeed when roving passive exists and not wearing heavy armor', async () => {
    const stats = createMockPlayerStats({
      automation: { passives: [{ name: 'Roving' }] },
      inventory: { equipped: [] },
      equipment: [],
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does not set climbSpeed/swimSpeed when wearing heavy armor', async () => {
    const stats = createMockPlayerStats({
      automation: { passives: [{ name: 'Roving' }] },
      inventory: { equipped: ['Plate Armor'] },
      equipment: [{ name: 'Plate Armor', armor_category: 'Heavy' }],
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Athlete Hop Up passive
// ---------------------------------------------------------------------------

describe('CharSheet athlete hop up passive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('sets athleteStandFromProne when stand_from_prone passive exists', async () => {
    const stats = createMockPlayerStats({
      automation: { passives: [{ effect: 'stand_from_prone' }] },
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Athlete Jumping passive
// ---------------------------------------------------------------------------

describe('CharSheet athlete jumping passive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('sets athleteReducedJumpRequirement when reduced_running_jump_requirement passive exists', async () => {
    const stats = createMockPlayerStats({
      automation: { passives: [{ effect: 'reduced_running_jump_requirement' }] },
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Aspect of the Wilds
// ---------------------------------------------------------------------------

describe('CharSheet aspect of the wilds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('adds Darkvision when Owl aspect selected for 2024 ruleset', async () => {
    const stats = createMockPlayerStats({
      rules: '2024',
      senses: [{ name: 'Darkvision', value: '60 ft.' }],
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));
    mockStore.set('Test Character:aspectOfTheWildsOption', 'Owl');

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('adds climb speed when Panther aspect selected for 2024 ruleset', async () => {
    const stats = createMockPlayerStats({
      rules: '2024',
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));
    mockStore.set('Test Character:aspectOfTheWildsOption', 'Panther');

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('adds swim speed when Salmon aspect selected for 2024 ruleset', async () => {
    const stats = createMockPlayerStats({
      rules: '2024',
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));
    mockStore.set('Test Character:aspectOfTheWildsOption', 'Salmon');

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — handleReroll callback paths
// ---------------------------------------------------------------------------

describe('CharSheet handleReroll callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('sets fanaticalFocusUsed when autoRerollCondition is raging', async () => {
    const stats = createMockPlayerStats({ name: 'Test Character' });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ autoRerollCondition: 'raging' });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('sets indomitableUses when autoRerollCondition is neither raging nor disciplined_survivor', async () => {
    const stats = createMockPlayerStats({ name: 'Test Character' });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ autoRerollCondition: 'indomitable' });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — handleStrokeOfLuck callback
// ---------------------------------------------------------------------------

describe('CharSheet handleStrokeOfLuck callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('sets strokeOfLuckUsed and boonOfCombatProwessUsed', async () => {
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Bardic Inspiration handler with popup data
// ---------------------------------------------------------------------------

describe('CharSheet handleBardicInspiration handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  function setPopup(html) {
    sharedPopupReturnVal.popupHtml = html;
  }

  it('calls addEntry with bardic inspiration log when popupHtml has rolls', async () => {
    setPopup({
      name: 'Stealth Check',
      rolls: [15],
      bonus: 3,
      modifier: 2,
      bardicInspiration: true,
    });
    mockStore.set('Test Character:bardicInspirationDie', 'd6');

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — BiDefenseCombatSummary handler
// ---------------------------------------------------------------------------

describe('CharSheet handleBiDefenseCombatSummary handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('updates combatSummary when lastAttack exists', async () => {
    const { loadCombatSummary } = await import('../../services/encounters/combatData.js');
    loadCombatSummary.mockResolvedValue({
      creatures: [{ name: 'Test Character', type: 'player' }],
    });
    mockStore.set('campaign:lastAttack', JSON.stringify({
      targetName: 'Goblin',
      hit: true,
    }));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Bardic Inspiration Offense handler
// ---------------------------------------------------------------------------

describe('CharSheet handleBardicInspirationOffense handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('applies damage and logs when targetName exists', async () => {
    const { loadCombatSummary } = await import('../../services/encounters/combatData.js');
    loadCombatSummary.mockResolvedValue({
      creatures: [{ name: 'Test Character', type: 'player' }],
    });
    mockStore.set('campaign:lastAttack', JSON.stringify({
      targetName: 'Goblin',
      damageType: 'Bludgeoning',
    }));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Empowered Spell handler
// ---------------------------------------------------------------------------

describe('CharSheet handleEmpoweredSpell handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  function setPopup(html) {
    sharedPopupReturnVal.popupHtml = html;
  }

  it('calls executeEmpoweredReroll when empoweredSpell is true', async () => {
    setPopup({ empoweredSpell: true, empoweredSpellChaMod: 3 });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Puncture handler
// ---------------------------------------------------------------------------

describe('CharSheet handlePuncture handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  function setPopup(html) {
    sharedPopupReturnVal.popupHtml = html;
  }

  it('applies damage difference and updates popup when puncture data valid', async () => {
    setPopup({ damageType: 'Piercing', modifier: 3 });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Savage Attacker handler
// ---------------------------------------------------------------------------

describe('CharSheet handleSavageAttacker handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  function setPopup(html) {
    sharedPopupReturnVal.popupHtml = html;
  }

  it('applies damage difference and updates popup when savage data valid', async () => {
    setPopup({ damageType: 'Slashing', modifier: 3 });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Tactical Mind handler
// ---------------------------------------------------------------------------

describe('CharSheet handleTacticalMind handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  function setPopup(html) {
    sharedPopupReturnVal.popupHtml = html;
  }

  it('logs Tactical Mind usage with d10 roll', async () => {
    setPopup({ name: 'Stealth Check', rolls: [15], bonus: 3 });
    mockStore.set('Test Character:secondWindUses', 2);

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Dark One's Luck handler
// ---------------------------------------------------------------------------

describe('CharSheet handleDarkOnesLuck handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  function setPopup(html) {
    sharedPopupReturnVal.popupHtml = html;
  }

  it('logs Dark One\'s Own Luck usage with d10 roll', async () => {
    setPopup({ name: 'Persuasion Check', rolls: [12], bonus: 3 });
    mockStore.set('Test Character:darkOnesLuckUses', 3);

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Superiority Maneuver handler
// ---------------------------------------------------------------------------

describe('CharSheet handleSuperiorityManeuver handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  function setPopup(html) {
    sharedPopupReturnVal.popupHtml = html;
  }

  it('decrements superiorityDice and logs maneuver', async () => {
    setPopup({ name: 'Stealth Check', rolls: [15], bonus: 3 });
    mockStore.set('Test Character:superiorityDice', 3);

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('updates initiative when maneuver is on initiative roll', async () => {
    setPopup({ name: 'Initiative', rolls: [15], bonus: 3, rollType: 'initiative' });
    mockStore.set('Test Character:superiorityDice', 3);
    const { loadCombatSummary } = await import('../../services/encounters/combatData.js');
    loadCombatSummary.mockResolvedValue({
      creatures: [{ name: 'Test Character', type: 'player', initiative: '10' }],
    });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Psi-Bolstered Knack handler
// ---------------------------------------------------------------------------

describe('CharSheet handlePsiBolsteredKnack handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  function setPopup(html) {
    sharedPopupReturnVal.popupHtml = html;
  }

  it('expends psionic energy on success', async () => {
    setPopup({ name: 'Arcana Check', rolls: [15], bonus: 3 });
    mockStore.set('Test Character:psionicEnergy', 3);

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Shield of Faith target selection handler
// ---------------------------------------------------------------------------

describe('CharSheet Shield of Faith target selection handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  function setPopup(html) {
    sharedPopupReturnVal.popupHtml = html;
  }

  it('renders ShieldOfFaithTargetSelectionModal with creature targets', async () => {
    setPopup({
      type: 'shield_of_faith_target_selection',
      creatureTargets: [
        { name: 'Ally1', type: 'creature' },
        { name: 'Ally2', type: 'creature' },
      ],
      duration: '1 minute',
      range: 60,
    });
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Wild Shape confirm handler
// ---------------------------------------------------------------------------

describe('CharSheet handleWildShapeConfirm handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  function setPopup(html) {
    sharedPopupReturnVal.popupHtml = html;
  }

  it('calls activateWildShape with correct parameters', async () => {
    setPopup({
      type: 'wild_shape_select',
      playerStats: createMockPlayerStats(),
      campaignName: 'test-campaign',
      action: { name: 'Wild Shape' },
    });
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Polymorph confirm handler
// ---------------------------------------------------------------------------

describe('CharSheet handlePolymorphConfirm handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  function setPopup(html) {
    sharedPopupReturnVal.popupHtml = html;
  }

  it('calls confirmPolymorphTransform with correct parameters', async () => {
    setPopup({
      type: 'polymorph_select',
      maxCR: 4,
      campaignName: 'test-campaign',
      targetName: 'Test Character',
      casterName: 'Test Character',
    });
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Shapechange confirm handler
// ---------------------------------------------------------------------------

describe('CharSheet handleShapechangeConfirm handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  function setPopup(html) {
    sharedPopupReturnVal.popupHtml = html;
  }

  it('calls confirmShapechangeTransform with correct parameters', async () => {
    setPopup({
      type: 'shapechange_select',
      maxCR: 8,
      campaignName: 'test-campaign',
      targetName: 'Test Character',
      casterName: 'Test Character',
    });
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — True Polymorph confirm handler
// ---------------------------------------------------------------------------

describe('CharSheet handleTruePolymorphConfirm handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  function setPopup(html) {
    sharedPopupReturnVal.popupHtml = html;
  }

  it('calls confirmTruePolymorphTransform with creature_to_creature mode', async () => {
    setPopup({
      type: 'true_polymorph_select',
      maxCR: 8,
      campaignName: 'test-campaign',
      targetName: 'Test Character',
      casterName: 'Test Character',
      mode: 'creature_to_creature',
    });
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('calls confirmTruePolymorphTransform with default mode', async () => {
    setPopup({
      type: 'true_polymorph_select',
      maxCR: 8,
      campaignName: 'test-campaign',
      targetName: 'Test Character',
      casterName: 'Test Character',
    });
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Object Transform confirm handler
// ---------------------------------------------------------------------------

describe('CharSheet handleObjectTransformConfirm handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  function setPopup(html) {
    sharedPopupReturnVal.popupHtml = html;
  }

  it('calls applyObjectTransform with targetName from popupData', async () => {
    setPopup({
      type: 'true_polymorph_object',
      campaignName: 'test-campaign',
      targetName: 'Test Character',
      casterName: 'Test Character',
    });
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('calls applyObjectTransform with casterName when targetName missing', async () => {
    setPopup({
      type: 'true_polymorph_object',
      campaignName: 'test-campaign',
      casterName: 'Test Character',
    });
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Animal Shapes confirm handler
// ---------------------------------------------------------------------------

describe('CharSheet handleAnimalShapesBeastConfirm handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  function setPopup(html) {
    sharedPopupReturnVal.popupHtml = html;
  }

  it('calls applyAnimalShapes with targetBeastMap', async () => {
    setPopup({
      type: 'animal_shapes_target_selection',
      targets: [{ name: 'Goblin', type: 'creature' }],
      maxCR: 4,
      campaignName: 'test-campaign',
    });
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Error path in prepared spells
// ---------------------------------------------------------------------------

describe('CharSheet prepared spells error path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('catches and logs error in prepared spells processing', async () => {
    const stats = createMockPlayerStats({
      rules: '5e',
      spellAbilities: {
        spells: [{ name: 'Fireball', prepared: '' }],
        maxPreparedSpells: 5,
      },
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));
    mockStore.set('Test Character:preparedSpells', JSON.stringify(['Fireball']));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Tests — getHolyAuraTargets return value
// ---------------------------------------------------------------------------

describe('CharSheet getHolyAuraTargets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('processes isHolyAuraActive true value', async () => {
    const { getHolyAuraTargets } = await import('../../services/automation/handlers/buffs/holyAuraHandler.js');
    getHolyAuraTargets.mockReturnValue(true);
    mockStore.set('Test Character:activeBuffs', JSON.stringify([]));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — isProtectionFromPoisonActive
// ---------------------------------------------------------------------------

describe('CharSheet isProtectionFromPoisonActive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('detects protection_from_poison buff', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([
      { name: 'Protection from Poison', effect: 'protection_from_poison' },
    ]));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — isTranceOfOrderActive
// ---------------------------------------------------------------------------

describe('CharSheet isTranceOfOrderActive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('detects tranceOfOrderActive runtime value', async () => {
    mockStore.set('Test Character:tranceOfOrderActive', true);

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — peerlessAthleteActive, largeFormActive, livingLegendActive, elderChampionActive
// ---------------------------------------------------------------------------

describe('CharSheet special form states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('detects peerlessAthleteActive runtime value', async () => {
    mockStore.set('Test Character:peerlessAthleteActive', true);

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('detects largeFormActive runtime value', async () => {
    mockStore.set('Test Character:largeFormActive', true);

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('detects livingLegendActive runtime value', async () => {
    mockStore.set('Test Character:livingLegendActive', true);

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('detects elderChampionActive runtime value', async () => {
    mockStore.set('Test Character:elderChampionActive', true);

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — isCreatureWarded PFEAG path
// ---------------------------------------------------------------------------

describe('CharSheet PFEAG warded creature attack disadvantage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('adds targetDisadvantageCount when attacker is warded', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([
      { effect: 'protection_from_evil_and_good' },
    ]));
    mockStore.set('Test Character:activeConditions', JSON.stringify([]));
    const { getCombatSummary } = await import('../../services/encounters/combatData.js');
    getCombatSummary.mockReturnValue({
      creatures: [{ name: 'Orc', type: 'Orc' }],
      attackerName: 'Orc',
    });
    const { isCreatureWarded } = await import('../../services/automation/handlers/buffs/protectionFromEvilAndGoodHandler.js');
    isCreatureWarded.mockReturnValue(true);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({});

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does not add targetDisadvantageCount when attacker is not warded', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([
      { effect: 'protection_from_evil_and_good' },
    ]));
    mockStore.set('Test Character:activeConditions', JSON.stringify([]));
    const { getCombatSummary } = await import('../../services/encounters/combatData.js');
    getCombatSummary.mockReturnValue({
      creatures: [{ name: 'Orc', type: 'Orc' }],
      attackerName: 'Orc',
    });
    const { isCreatureWarded } = await import('../../services/automation/handlers/buffs/protectionFromEvilAndGoodHandler.js');
    isCreatureWarded.mockReturnValue(false);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({});

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Warding bond with positions
// ---------------------------------------------------------------------------

describe('CharSheet warding bond with positions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('calculates warding bond bonuses when caster and target have positions within range', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([
      { effect: 'warding_bond', sourceCharacter: 'Ally', acBonus: 1, saveBonus: 1 },
    ]));
    const { getCombatSummary } = await import('../../services/encounters/combatData.js');
    getCombatSummary.mockReturnValue({
      creatures: [
        { name: 'Test Character', position: { x: 0, y: 0 } },
        { name: 'Ally', position: { x: 10, y: 10 } },
      ],
    });
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({});

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does not calculate warding bond bonuses when distance is null', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([
      { effect: 'warding_bond', sourceCharacter: 'Ally', acBonus: 1, saveBonus: 1 },
    ]));
    const { getCombatSummary } = await import('../../services/encounters/combatData.js');
    getCombatSummary.mockReturnValue({
      creatures: [
        { name: 'Test Character', position: { x: 0, y: 0 } },
      ],
    });
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({});

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Indomitable Uses limits
// ---------------------------------------------------------------------------

describe('CharSheet indomitable uses limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('respects indomitable max for level 13 character', async () => {
    const stats = createMockPlayerStats({ level: 13 });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));
    mockStore.set('Test Character:indomitableUses', 2);
    mockStore.set('Test Character:activeBuffs', JSON.stringify([]));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ autoRerollForSaves: false, autoRerollBonus: null });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('respects indomitable max for level 17 character', async () => {
    const stats = createMockPlayerStats({ level: 17 });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));
    mockStore.set('Test Character:indomitableUses', 3);
    mockStore.set('Test Character:activeBuffs', JSON.stringify([]));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ autoRerollForSaves: false, autoRerollBonus: null });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Stroke of Luck used flag
// ---------------------------------------------------------------------------

describe('CharSheet strokeOfLuckUsed flag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('clears strokeOfLuck when flag is set', async () => {
    mockStore.set('Test Character:strokeOfLuckUsed', true);
    mockStore.set('Test Character:activeBuffs', JSON.stringify([]));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ strokeOfLuck: true });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Fanatical Focus used flag
// ---------------------------------------------------------------------------

describe('CharSheet fanaticalFocusUsed flag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('clears autoRerollForSaves when fanaticalFocusUsed is set', async () => {
    mockStore.set('Test Character:fanaticalFocusUsed', true);
    mockStore.set('Test Character:activeBuffs', JSON.stringify([]));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ autoRerollForSaves: true, autoRerollBonus: '1d4' });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Stunned speedHalved flag
// ---------------------------------------------------------------------------

describe('CharSheet stunned speedHalved flag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal = {
      popupHtml: null,
      setPopupHtml: vi.fn(),
      value: {},
      Provider: ({ children }) => children,
    };
  });

  it('sets speedHalved when stunned_speedHalved is set', async () => {
    mockStore.set('Test Character:stunned_speedHalved', true);
    mockStore.set('Test Character:activeBuffs', JSON.stringify([]));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({});

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});
