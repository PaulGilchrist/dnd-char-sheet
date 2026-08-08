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
// Tests — popup rendering paths
// ---------------------------------------------------------------------------

describe('CharSheet popup rendering', () => {
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

  function getRenderedComponent() {
    return render(<CharSheet {...defaultProps} />);
  }

  it('renders string popup with sanitizeHtml', async () => {
    setPopup('<p>Some HTML content</p>');
    getRenderedComponent();

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('popup')).toBeInTheDocument();
    });
  });

  it('renders html-type popup with dice-roll-result class', async () => {
    setPopup({ html: '<span>dice roll result</span>' });
    getRenderedComponent();

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('popup')).toBeInTheDocument();
    });
  });

  it('renders automation_info popup with info icon', async () => {
    setPopup({
      type: 'automation_info',
      name: 'Test Feature',
      description: '<p>Feature description</p>',
    });
    getRenderedComponent();

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('popup')).toBeInTheDocument();
    });
  });

  it('returns null for shield_of_faith_target_selection popup type', async () => {
    setPopup({ type: 'shield_of_faith_target_selection' });
    getRenderedComponent();

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    // Should not render a popup for this type
    expect(screen.queryByTestId('popup')).not.toBeInTheDocument();
  });

  it('returns null for barkskin_target_selection popup type', async () => {
    setPopup({ type: 'barkskin_target_selection' });
    getRenderedComponent();

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('popup')).not.toBeInTheDocument();
  });

  it('renders wild_shape_select with PolymorphSelectionModal', async () => {
    setPopup({
      type: 'wild_shape_select',
      playerStats: createMockPlayerStats(),
      campaignName: 'test-campaign',
      action: { name: 'Wild Shape' },
    });
    getRenderedComponent();

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('polymorph-selection-modal')).toBeInTheDocument();
    });
  });

  it('renders polymorph_select with PolymorphSelectionModal', async () => {
    setPopup({
      type: 'polymorph_select',
      maxCR: 4,
      campaignName: 'test-campaign',
    });
    getRenderedComponent();

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('polymorph-selection-modal')).toBeInTheDocument();
    });
  });

  it('renders shapechange_select with PolymorphSelectionModal', async () => {
    setPopup({
      type: 'shapechange_select',
      maxCR: 8,
      campaignName: 'test-campaign',
    });
    getRenderedComponent();

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('polymorph-selection-modal')).toBeInTheDocument();
    });
  });

  it('renders animal_shapes_target_selection with AnimalShapesSelectionModal', async () => {
    setPopup({
      type: 'animal_shapes_target_selection',
      targets: [{ name: 'Goblin', type: 'creature' }],
      maxCR: 4,
      campaignName: 'test-campaign',
    });
    getRenderedComponent();

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('animal-shapes-selection-modal')).toBeInTheDocument();
    });
  });

  it('renders true_polymorph_select with PolymorphSelectionModal', async () => {
    setPopup({
      type: 'true_polymorph_select',
      maxCR: 8,
      campaignName: 'test-campaign',
      mode: 'creature_to_creature',
    });
    getRenderedComponent();

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('polymorph-selection-modal')).toBeInTheDocument();
    });
  });

  it('renders true_polymorph_object with ObjectTransformModal', async () => {
    setPopup({
      type: 'true_polymorph_object',
      campaignName: 'test-campaign',
    });
    getRenderedComponent();

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('object-transform-modal')).toBeInTheDocument();
    });
  });

  it('renders heal_multi popup with multi-target healing display', async () => {
    setPopup({
      type: 'heal_multi',
      name: 'Healing Word',
      formula: '1d4+2',
      rolls: [3, 1],
      bonusHeal: 2,
      bonusHealDetail: 'Spell Focus',
      results: [
        { targetName: 'Ally1', healAmount: 5, rolls: [3] },
        { targetName: 'Ally2', healAmount: 3, rolls: [1] },
      ],
    });
    getRenderedComponent();

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('popup')).toBeInTheDocument();
    });
  });

  it('renders AttackResultPopup for unknown popup types', async () => {
    setPopup({
      type: 'attack',
      name: 'Longsword Attack',
      hit: true,
      damage: 8,
    });
    getRenderedComponent();

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
    });
  });

  it('renders AttackResultPopup with superiority maneuver callback', async () => {
    setPopup({
      type: 'attack',
      name: 'Longsword Attack',
      availableSuperiorityManeuvers: ['Trip Attack'],
    });
    getRenderedComponent();

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
    });
  });

  it('renders AttackResultPopup with bardic inspiration callback', async () => {
    setPopup({
      type: 'attack',
      name: 'Ability Check',
      bardicInspiration: true,
      rolls: [15],
      bonus: 3,
      modifier: 2,
    });
    getRenderedComponent();

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
    });
  });

  it('renders AttackResultPopup with empowered spell callback', async () => {
    setPopup({
      type: 'attack',
      name: 'Magic Missile',
      empoweredSpell: true,
      empoweredSpellChaMod: 3,
    });
    getRenderedComponent();

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
    });
  });

  it('renders AttackResultPopup with piercer puncture callback', async () => {
    setPopup({
      type: 'attack',
      name: 'Rapier Attack',
      piercerPuncture: true,
    });
    getRenderedComponent();

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
    });
  });

  it('renders AttackResultPopup with savage attacker callback', async () => {
    setPopup({
      type: 'attack',
      name: 'Greatsword Attack',
      savageAttacker: true,
    });
    getRenderedComponent();

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
    });
  });

  it('renders AttackResultPopup with tactical mind callback', async () => {
    setPopup({
      type: 'attack',
      name: 'Stealth Check',
      tacticalMind: true,
    });
    getRenderedComponent();

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
    });
  });

  it('renders AttackResultPopup with dark ones luck callback', async () => {
    setPopup({
      type: 'attack',
      name: 'Persuasion Check',
      darkOnesLuck: true,
    });
    getRenderedComponent();

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
    });
  });

  it('renders AttackResultPopup with psi bolstered knack callback', async () => {
    setPopup({
      type: 'attack',
      name: 'Arcana Check',
      psiBolsteredKnack: true,
    });
    getRenderedComponent();

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
    });
  });

  it('renders AttackResultPopup with bardic inspiration offense callback', async () => {
    setPopup({
      type: 'attack',
      name: 'Attack Roll',
      bardicInspirationOffense: true,
    });
    getRenderedComponent();

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
    });
  });

  it('renders AttackResultPopup with stroke of luck callback', async () => {
    setPopup({
      type: 'attack',
      name: 'Attack Roll',
      strokeOfLuck: true,
    });
    getRenderedComponent();

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
    });
  });

  it('renders AttackResultPopup with stroke of luck for boon of combat prowess', async () => {
    setPopup({
      type: 'attack',
      name: 'Attack Roll',
      strokeOfLuck: true,
    });
    getRenderedComponent();

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
    });
  });
});
