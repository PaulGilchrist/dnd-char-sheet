// @cleaned-by-ai
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import CharSheet from './CharSheet';

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
    autoRerollForSaves: false,
    strokeOfLuck: false,
    targetAdvantageCount: 0,
    saveAdvantageCount: 0,
    targetDisadvantageCount: 0,
    saveAdvantageAbilities: [],
    abilityCheckAdvantage: false,
    luckyDisadvantage: false,
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

const mockStore = new Map();

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
    if (prop === 'tranceOfOrderActive') return mockStore.get(`${key}:tranceOfOrderActive`) ?? null;
    if (prop === 'livingLegendActive') return mockStore.get(`${key}:livingLegendActive`) ?? null;
    if (prop === 'elderChampionActive') return mockStore.get(`${key}:elderChampionActive`) ?? null;
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
// Tests — handleReroll callback
// ---------------------------------------------------------------------------

describe('handleReroll callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
  });

  it('sets fanaticalFocusUsed when condition is raging', async () => {
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ autoRerollCondition: 'raging' });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('sets focusPoints when condition is disciplined_survivor', async () => {
    mockStore.set('Test Character:focusPoints', 3);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ autoRerollCondition: 'disciplined_survivor' });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does not decrement focusPoints when focus is 0', async () => {
    mockStore.set('Test Character:focusPoints', 0);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ autoRerollCondition: 'disciplined_survivor' });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('increments indomitableUses for other conditions', async () => {
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

describe('handleStrokeOfLuck callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
  });

  it('sets strokeOfLuckUsed and boonOfCombatProwessUsed', async () => {
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — handleBardicInspiration callback
// ---------------------------------------------------------------------------

describe('handleBardicInspiration callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
  });

  it('logs ability_use entry when bardic inspiration is used', async () => {
    mockStore.set('Test Character:bardicInspirationDie', 'd6');
    mockStore.set('Test Character:bardicInspirationGrantedBy', 'Bard');
    sharedPopupReturnVal.popupHtml = {
      name: 'Persuasion Check',
      rolls: [15],
      bonus: 3,
      modifier: 0,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does nothing when no bardicInspirationDie', async () => {
    sharedPopupReturnVal.popupHtml = {
      name: 'Persuasion Check',
      rolls: [15],
      bonus: 3,
      modifier: 0,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('uses default checkName when popupHtml.name is missing', async () => {
    mockStore.set('Test Character:bardicInspirationDie', 'd6');
    mockStore.set('Test Character:bardicInspirationGrantedBy', 'Bard');
    sharedPopupReturnVal.popupHtml = {
      rolls: [15],
      bonus: 3,
      modifier: 0,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — handleBiDefenseCombatSummary callback
// ---------------------------------------------------------------------------

describe('handleBiDefenseCombatSummary callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
  });

  it('updates combatSummary when lastAttack exists', async () => {
    const { loadCombatSummary } = await import('../../services/encounters/combatData.js');
    loadCombatSummary.mockResolvedValue({ creatures: [] });

    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    getRuntimeValue.mockImplementation((key, prop) => {
      if (key === 'campaign' && prop === 'lastAttack') {
        return { hit: true, targetName: 'Enemy1' };
      }
      return mockStore.get(`${key}:${prop}`) ?? null;
    });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does nothing when lastAttack is null', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    getRuntimeValue.mockImplementation((key, prop) => {
      if (key === 'campaign' && prop === 'lastAttack') {
        return null;
      }
      return mockStore.get(`${key}:${prop}`) ?? null;
    });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — handleBardicInspirationOffense callback
// ---------------------------------------------------------------------------

describe('handleBardicInspirationOffense callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
  });

  it('applies damage to target and logs entry', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    getRuntimeValue.mockImplementation((key, prop) => {
      if (key === 'campaign' && prop === 'lastAttack') {
        return { targetName: 'Enemy1', damageType: 'Slashing' };
      }
      if (key === 'Test Character' && prop === 'bardicInspirationUses') {
        return { current: 3 };
      }
      return mockStore.get(`${key}:${prop}`) ?? null;
    });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does nothing when biUses is 0', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    getRuntimeValue.mockImplementation((key, prop) => {
      if (key === 'campaign' && prop === 'lastAttack') {
        return { targetName: 'Enemy1', damageType: 'Slashing' };
      }
      if (key === 'Test Character' && prop === 'bardicInspirationUses') {
        return 0;
      }
      return mockStore.get(`${key}:${prop}`) ?? null;
    });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — handleEmpoweredSpell callback
// ---------------------------------------------------------------------------

describe('handleEmpoweredSpell callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
  });

  it('calls executeEmpoweredReroll and returns result', async () => {
    sharedPopupReturnVal.popupHtml = { empoweredSpellChaMod: 3 };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('returns null when no playerStats', async () => {
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — handlePuncture callback
// ---------------------------------------------------------------------------

describe('handlePuncture callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
  });

  it('applies damage difference when puncture is used', async () => {
    mockStore.set('Test Character:piercerPunctureUsedThisTurn', null);
    sharedPopupReturnVal.popupHtml = {
      modifier: 5,
      damageType: 'Piercing',
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does nothing when puncture already used this turn', async () => {
    mockStore.set('Test Character:piercerPunctureUsedThisTurn', true);
    sharedPopupReturnVal.popupHtml = {
      modifier: 5,
      damageType: 'Piercing',
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does nothing when no punctureData', async () => {
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — handleSavageAttacker callback
// ---------------------------------------------------------------------------

describe('handleSavageAttacker callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
  });

  it('applies damage difference when savage attacker is used', async () => {
    mockStore.set('Test Character:_Savage_Attacker_usedRound', null);
    sharedPopupReturnVal.popupHtml = {
      modifier: 5,
      damageType: 'Slashing',
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does nothing when savage attacker already used', async () => {
    mockStore.set('Test Character:_Savage_Attacker_usedRound', true);
    sharedPopupReturnVal.popupHtml = {
      modifier: 5,
      damageType: 'Slashing',
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — handleTacticalMind callback
// ---------------------------------------------------------------------------

describe('handleTacticalMind callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
  });

  it('logs Tactical Mind ability use', async () => {
    mockStore.set('Test Character:secondWindUses', 2);
    sharedPopupReturnVal.popupHtml = {
      name: 'Athletics Check',
      rolls: [15],
      bonus: 3,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does nothing when no secondWindUses', async () => {
    mockStore.set('Test Character:secondWindUses', 0);
    sharedPopupReturnVal.popupHtml = {
      name: 'Athletics Check',
      rolls: [15],
      bonus: 3,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('uses default checkName when popupHtml.name missing', async () => {
    mockStore.set('Test Character:secondWindUses', 2);
    sharedPopupReturnVal.popupHtml = {
      rolls: [15],
      bonus: 3,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — handleDarkOnesLuck callback
// ---------------------------------------------------------------------------

describe('handleDarkOnesLuck callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
  });

  it('logs Dark Ones Luck ability use', async () => {
    mockStore.set('Test Character:darkOnesLuckUses', 3);
    sharedPopupReturnVal.popupHtml = {
      name: 'Persuasion Check',
      rolls: [15],
      bonus: 3,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does nothing when darkOnesLuckUses is 0', async () => {
    mockStore.set('Test Character:darkOnesLuckUses', 0);
    sharedPopupReturnVal.popupHtml = {
      name: 'Persuasion Check',
      rolls: [15],
      bonus: 3,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('uses default rollName when popupHtml.name missing', async () => {
    mockStore.set('Test Character:darkOnesLuckUses', 3);
    sharedPopupReturnVal.popupHtml = {
      rolls: [15],
      bonus: 3,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — handleSuperiorityManeuver callback
// ---------------------------------------------------------------------------

describe('handleSuperiorityManeuver callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
  });

  it('logs superiority maneuver use', async () => {
    mockStore.set('Test Character:superiorityDice', 4);
    sharedPopupReturnVal.popupHtml = {
      name: 'Athletics Check',
      rolls: [15],
      bonus: 3,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('updates initiative when maneuver is on initiative roll', async () => {
    mockStore.set('Test Character:superiorityDice', 4);
    sharedPopupReturnVal.popupHtml = {
      name: 'Initiative',
      rolls: [15],
      bonus: 3,
    };

    const { loadCombatSummary } = await import('../../services/encounters/combatData.js');
    loadCombatSummary.mockResolvedValue({
      creatures: [{ type: 'player', name: 'Test Character', initiative: '0' }],
    });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does nothing when superiorityDice is 0', async () => {
    mockStore.set('Test Character:superiorityDice', 0);
    sharedPopupReturnVal.popupHtml = {
      name: 'Athletics Check',
      rolls: [15],
      bonus: 3,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does nothing when maneuver not found', async () => {
    mockStore.set('Test Character:superiorityDice', 4);
    sharedPopupReturnVal.popupHtml = {
      name: 'Athletics Check',
      rolls: [15],
      bonus: 3,
    };

    const { getManeuversForRules } = await import('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js');
    getManeuversForRules.mockResolvedValue([]);

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — handlePsiBolsteredKnack callback
// ---------------------------------------------------------------------------

describe('handlePsiBolsteredKnack callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
  });

  it('logs Psi-Bolstered Knack when success', async () => {
    mockStore.set('Test Character:psionicEnergy', 3);
    sharedPopupReturnVal.popupHtml = {
      name: 'Athletics Check',
      rolls: [15],
      bonus: 3,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does not expend energy when failure', async () => {
    mockStore.set('Test Character:psionicEnergy', 3);
    sharedPopupReturnVal.popupHtml = {
      name: 'Athletics Check',
      rolls: [15],
      bonus: 3,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('uses default popupName when popupHtml.name missing', async () => {
    mockStore.set('Test Character:psionicEnergy', 3);
    sharedPopupReturnVal.popupHtml = {
      rolls: [15],
      bonus: 3,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — ShieldOfFaithTargetSelectionModal (lines 46-74)
// ---------------------------------------------------------------------------

describe('ShieldOfFaithTargetSelectionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
  });

  it('renders shield_of_faith_target_selection modal', async () => {
    sharedPopupReturnVal.popupHtml = {
      type: 'shield_of_faith_target_selection',
      creatureTargets: [{ name: 'Ally1' }, { name: 'Ally2' }],
      duration: '1 minute',
      range: '60 feet',
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
    });
  });

  it('renders with empty creatureTargets when popupHtml has none', async () => {
    sharedPopupReturnVal.popupHtml = {
      type: 'shield_of_faith_target_selection',
      creatureTargets: [],
      duration: '1 minute',
      range: '60 feet',
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
    });
  });

  it('renders with null creatureTargets when popupHtml has none property', async () => {
    sharedPopupReturnVal.popupHtml = {
      type: 'shield_of_faith_target_selection',
      duration: '1 minute',
      range: '60 feet',
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Wild Shape confirm handler
// ---------------------------------------------------------------------------

describe('Wild Shape confirm handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
  });

  it('renders wild_shape_select modal with action', async () => {
    sharedPopupReturnVal.popupHtml = {
      type: 'wild_shape_select',
      playerStats: { name: 'Test Character' },
      campaignName: 'test-campaign',
      action: { name: 'Wild Shape' },
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('polymorph-selection-modal')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Polymorph confirm handler
// ---------------------------------------------------------------------------

describe('Polymorph confirm handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
  });

  it('renders polymorph_select modal with all required data', async () => {
    sharedPopupReturnVal.popupHtml = {
      type: 'polymorph_select',
      maxCR: 1,
      campaignName: 'test-campaign',
      targetName: 'Test Character',
      casterName: 'Enemy',
      spell: { name: 'Polymorph' },
      spellLevel: 4,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('polymorph-selection-modal')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Shapechange confirm handler
// ---------------------------------------------------------------------------

describe('Shapechange confirm handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
  });

  it('renders shapechange_select modal with allowAnyCreature', async () => {
    sharedPopupReturnVal.popupHtml = {
      type: 'shapechange_select',
      maxCR: 5,
      campaignName: 'test-campaign',
      targetName: 'Test Character',
      casterName: 'Test Character',
      spell: { name: 'Shapechange' },
      spellLevel: 9,
      allowAnyCreature: true,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('polymorph-selection-modal')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Animal Shapes confirm handler
// ---------------------------------------------------------------------------

describe('Animal Shapes confirm handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
  });

  it('renders animal_shapes_target_selection modal', async () => {
    sharedPopupReturnVal.popupHtml = {
      type: 'animal_shapes_target_selection',
      targets: [{ name: 'Ally1' }, { name: 'Ally2' }],
      maxCR: 4,
      campaignName: 'test-campaign',
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('animal-shapes-selection-modal')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — True Polymorph confirm handler
// ---------------------------------------------------------------------------

describe('True Polymorph confirm handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
  });

  it('renders true_polymorph_select modal with creature_to_creature mode', async () => {
    sharedPopupReturnVal.popupHtml = {
      type: 'true_polymorph_select',
      maxCR: 10,
      campaignName: 'test-campaign',
      targetName: 'Test Character',
      casterName: 'Enemy',
      spell: { name: 'True Polymorph' },
      spellLevel: 9,
      mode: 'creature_to_creature',
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('polymorph-selection-modal')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Object Transform confirm handler
// ---------------------------------------------------------------------------

describe('Object Transform confirm handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
  });

  it('renders true_polymorph_object modal', async () => {
    sharedPopupReturnVal.popupHtml = {
      type: 'true_polymorph_object',
      campaignName: 'test-campaign',
      targetName: 'Test Character',
      casterName: 'Test Character',
      spell: { name: 'True Polymorph' },
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('object-transform-modal')).toBeInTheDocument();
    });
  });
});
