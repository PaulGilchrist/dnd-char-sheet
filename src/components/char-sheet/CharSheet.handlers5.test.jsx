// @improved-by-ai
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import CharSheet from './CharSheet';
import {
  createMockStore,
  createDefaultProps,
  createSharedPopupReturnValue,
  resetTestState,
} from './CharSheet.test-utils';

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
  default: vi.fn(({ title, targets }) => (
    <div data-testid="secondary-target-modal">
      <span>{title}</span>
      <span data-testid="target-count">{targets?.length ?? 0}</span>
    </div>
  )),
}));

vi.mock('./modals/PolymorphSelectionModal.jsx', () => ({
  default: vi.fn(({ title, maxCR, allowAnyCreature, mode }) => (
    <div data-testid="polymorph-selection-modal">
      <span>{title}</span>
      {maxCR !== undefined && <span data-testid="max-cr">{maxCR}</span>}
      {allowAnyCreature && <span data-testid="allow-any-creature">true</span>}
      {mode && <span data-testid="poly-mode">{mode}</span>}
    </div>
  )),
}));

vi.mock('./modals/AnimalShapesSelectionModal.jsx', () => ({
  default: vi.fn(({ title, targets, maxCR }) => (
    <div data-testid="animal-shapes-selection-modal">
      <span>{title}</span>
      <span data-testid="target-count">{targets?.length ?? 0}</span>
      {maxCR !== undefined && <span data-testid="max-cr">{maxCR}</span>}
    </div>
  )),
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

const mockStore = createMockStore();
const sharedPopupReturnValue = createSharedPopupReturnValue();

vi.mock('../../hooks/combat/useSharedPopup.js', () => {
  const mockFn = vi.fn();
  mockFn.mockImplementation(() => {
    return { ...sharedPopupReturnValue, Provider: ({ children }) => children };
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
    if (prop === 'activeBuffs') return mockStore.get(`${key}:activeBuffs`) ? JSON.parse(mockStore.get(`${key}:activeBuffs`)) : [];
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
    getPlayerStats: vi.fn().mockImplementation(() => Promise.resolve({
      name: 'Test Character',
      level: 5,
      hitPoints: { current: 40, max: 40 },
      abilities: [{ name: 'Strength', bonus: 2, save: 4, skills: [] }],
      spellAbilities: { spells: [], maxPreparedSpells: 5 },
      rules: '5e',
      automation: { passives: [] },
      class: { name: 'Fighter' },
      speed: 30,
      race: { speed: 30, traits: [] },
      actions: [],
      bonusActions: [],
      reactions: [],
      specialActions: [],
      characterAdvancement: [],
      skillProficiencies: [],
      saveModifiers: [],
    })),
  },
}));

// ---------------------------------------------------------------------------
// Tests — ShieldOfFaithTargetSelectionModal
// ---------------------------------------------------------------------------

describe('ShieldOfFaithTargetSelectionModal', () => {
  const defaultProps = createDefaultProps();

  beforeEach(() => {
    resetTestState(sharedPopupReturnValue);
    mockStore.clear();
  });

  it('renders shield_of_faith_target_selection modal with correct title', async () => {
    sharedPopupReturnValue.popupHtml = {
      type: 'shield_of_faith_target_selection',
      creatureTargets: [{ name: 'Ally1' }, { name: 'Ally2' }],
      duration: '1 minute',
      range: '60 feet',
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
    expect(screen.getByText('Shield of Faith')).toBeInTheDocument();
    expect(screen.getByTestId('target-count')).toHaveTextContent('2');
  });

  it('renders with empty creatureTargets showing zero targets', async () => {
    sharedPopupReturnValue.popupHtml = {
      type: 'shield_of_faith_target_selection',
      creatureTargets: [],
      duration: '1 minute',
      range: '60 feet',
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
    expect(screen.getByTestId('target-count')).toHaveTextContent('0');
  });

  it('renders with null creatureTargets treating as zero targets', async () => {
    sharedPopupReturnValue.popupHtml = {
      type: 'shield_of_faith_target_selection',
      duration: '1 minute',
      range: '60 feet',
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
    expect(screen.getByTestId('target-count')).toHaveTextContent('0');
  });
});

// ---------------------------------------------------------------------------
// Tests — Wild Shape confirm handler
// ---------------------------------------------------------------------------

describe('Wild Shape confirm handler', () => {
  const defaultProps = createDefaultProps();

  beforeEach(() => {
    resetTestState(sharedPopupReturnValue);
    mockStore.clear();
  });

  it('renders wild_shape_select modal with correct title and action label', async () => {
    sharedPopupReturnValue.popupHtml = {
      type: 'wild_shape_select',
      playerStats: { name: 'Test Character' },
      campaignName: 'test-campaign',
      action: { name: 'Wild Shape' },
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    expect(screen.getByTestId('polymorph-selection-modal')).toBeInTheDocument();
    expect(screen.getByText('Wild Shape')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tests — Polymorph confirm handler
// ---------------------------------------------------------------------------

describe('Polymorph confirm handler', () => {
  const defaultProps = createDefaultProps();

  beforeEach(() => {
    resetTestState(sharedPopupReturnValue);
    mockStore.clear();
  });

  it('renders polymorph_select modal with correct title and maxCR', async () => {
    sharedPopupReturnValue.popupHtml = {
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
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    expect(screen.getByTestId('polymorph-selection-modal')).toBeInTheDocument();
    expect(screen.getByText('Polymorph')).toBeInTheDocument();
    expect(screen.getByTestId('max-cr')).toHaveTextContent('1');
  });
});

// ---------------------------------------------------------------------------
// Tests — Shapechange confirm handler
// ---------------------------------------------------------------------------

describe('Shapechange confirm handler', () => {
  const defaultProps = createDefaultProps();

  beforeEach(() => {
    resetTestState(sharedPopupReturnValue);
    mockStore.clear();
  });

  it('renders shapechange_select modal with allowAnyCreature flag', async () => {
    sharedPopupReturnValue.popupHtml = {
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
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    expect(screen.getByTestId('polymorph-selection-modal')).toBeInTheDocument();
    expect(screen.getByText('Shapechange')).toBeInTheDocument();
    expect(screen.getByTestId('allow-any-creature')).toBeInTheDocument();
    expect(screen.getByTestId('max-cr')).toHaveTextContent('5');
  });
});

// ---------------------------------------------------------------------------
// Tests — Animal Shapes confirm handler
// ---------------------------------------------------------------------------

describe('Animal Shapes confirm handler', () => {
  const defaultProps = createDefaultProps();

  beforeEach(() => {
    resetTestState(sharedPopupReturnValue);
    mockStore.clear();
  });

  it('renders animal_shapes_target_selection modal with correct title and target count', async () => {
    sharedPopupReturnValue.popupHtml = {
      type: 'animal_shapes_target_selection',
      targets: [{ name: 'Ally1' }, { name: 'Ally2' }],
      maxCR: 4,
      campaignName: 'test-campaign',
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    expect(screen.getByTestId('animal-shapes-selection-modal')).toBeInTheDocument();
    expect(screen.getByText('Animal Shapes')).toBeInTheDocument();
    expect(screen.getByTestId('target-count')).toHaveTextContent('2');
    expect(screen.getByTestId('max-cr')).toHaveTextContent('4');
  });
});

// ---------------------------------------------------------------------------
// Tests — True Polymorph confirm handler
// ---------------------------------------------------------------------------

describe('True Polymorph confirm handler', () => {
  const defaultProps = createDefaultProps();

  beforeEach(() => {
    resetTestState(sharedPopupReturnValue);
    mockStore.clear();
  });

  it('renders true_polymorph_select modal with creature_to_creature mode', async () => {
    sharedPopupReturnValue.popupHtml = {
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
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    expect(screen.getByTestId('polymorph-selection-modal')).toBeInTheDocument();
    expect(screen.getByText('True Polymorph')).toBeInTheDocument();
    expect(screen.getByTestId('poly-mode')).toHaveTextContent('creature_to_creature');
    expect(screen.getByTestId('allow-any-creature')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tests — Object Transform confirm handler
// ---------------------------------------------------------------------------

describe('Object Transform confirm handler', () => {
  const defaultProps = createDefaultProps();

  beforeEach(() => {
    resetTestState(sharedPopupReturnValue);
    mockStore.clear();
  });

  it('renders object_transform modal for true_polymorph_object type', async () => {
    sharedPopupReturnValue.popupHtml = {
      type: 'true_polymorph_object',
      campaignName: 'test-campaign',
      targetName: 'Test Character',
      casterName: 'Test Character',
      spell: { name: 'True Polymorph' },
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    expect(screen.getByTestId('object-transform-modal')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tests — renderPopup returns null for special popup types
// ---------------------------------------------------------------------------

describe('renderPopup null-return types', () => {
  const defaultProps = createDefaultProps();

  beforeEach(() => {
    resetTestState(sharedPopupReturnValue);
    mockStore.clear();
  });

  it('does not render secondary-target-modal for barkskin_target_selection popup type', async () => {
    sharedPopupReturnValue.popupHtml = {
      type: 'barkskin_target_selection',
      creatureTargets: [{ name: 'Ally1' }],
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('secondary-target-modal')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tests — renderPopup returns null for unhandled popup types
// ---------------------------------------------------------------------------

describe('renderPopup unknown popup types', () => {
  const defaultProps = createDefaultProps();

  beforeEach(() => {
    resetTestState(sharedPopupReturnValue);
    mockStore.clear();
  });

  it('renders char sheet without extra modals for unknown popup type', async () => {
    sharedPopupReturnValue.popupHtml = {
      type: 'unknown_popup_type',
      someData: 'value',
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('polymorph-selection-modal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('animal-shapes-selection-modal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('object-transform-modal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('secondary-target-modal')).not.toBeInTheDocument();
  });
});
