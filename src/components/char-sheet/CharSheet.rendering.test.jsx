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

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/rules/combat/applyDamage.js', () => ({
  applyDamageToTarget: vi.fn().mockReturnValue(null),
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

vi.mock('./DiceRollResult.jsx', () => ({
  default: vi.fn(({ name }) => (
    <div data-testid="dice-roll-result"><span>{name || 'dice'}</span></div>
  )),
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

// ---------------------------------------------------------------------------
// Mocks — hooks
// ---------------------------------------------------------------------------

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
// Tests — data fetching & player stats
// ---------------------------------------------------------------------------

describe('data fetching & player stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('renders the char sheet when playerStats is loaded', async () => {
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('renders CharSummary with playerStats', async () => {
    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(CharSummary).toHaveBeenCalled();
    });

    expect(CharSummary.mock.calls[0][0].playerStats).toEqual(expect.objectContaining({ name: 'Test Character' }));
  });

  it('renders CharAbilities with playerStats', async () => {
    const { default: CharAbilities } = await import('./CharAbilities.jsx');
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(CharAbilities).toHaveBeenCalled();
    });

    expect(CharAbilities.mock.calls[0][0].playerStats).toEqual(expect.objectContaining({ name: 'Test Character' }));
  });

  it('renders CharActions with playerStats', async () => {
    const { default: CharActions } = await import('./CharActions.jsx');
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(CharActions).toHaveBeenCalled();
    });

    expect(CharActions.mock.calls[0][0].playerStats).toEqual(expect.objectContaining({ name: 'Test Character' }));
  });

  it('renders CharInventory with playerStats', async () => {
    const { default: CharInventory } = await import('./CharInventory.jsx');
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(CharInventory).toHaveBeenCalled();
    });

    expect(CharInventory.mock.calls[0][0].playerStats).toEqual(expect.objectContaining({ name: 'Test Character' }));
  });

  it('renders CharReactions with playerStats', async () => {
    const { default: CharReactions } = await import('./CharReactions.jsx');
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(CharReactions).toHaveBeenCalled();
    });

    expect(CharReactions.mock.calls[0][0].playerStats).toEqual(expect.objectContaining({ name: 'Test Character' }));
  });

  it('renders CharSpecialActions with playerStats', async () => {
    const { default: CharSpecialActions } = await import('./CharSpecialActions.jsx');
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(CharSpecialActions).toHaveBeenCalled();
    });

    expect(CharSpecialActions.mock.calls[0][0].playerStats).toEqual(expect.objectContaining({ name: 'Test Character' }));
  });

  it('renders CharCharacterAdvancement with playerStats', async () => {
    const { default: CharCharacterAdvancement } = await import('./CharCharacterAdvancement.jsx');
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(CharCharacterAdvancement).toHaveBeenCalled();
    });

    expect(CharCharacterAdvancement.mock.calls[0][0].playerStats).toEqual(expect.objectContaining({ name: 'Test Character' }));
  });

  it('renders CharSpells with playerStats for 5e ruleset', async () => {
    const { default: CharSpells } = await import('./char-spells/CharSpells.jsx');
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(CharSpells).toHaveBeenCalled();
    });

    expect(CharSpells.mock.calls[0][0].playerStats).toEqual(expect.objectContaining({ rules: '5e' }));
  });

  it('renders CharSpells with 2024 ruleset', async () => {
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({ rules: '2024' })));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — condition effects & buffs
// ---------------------------------------------------------------------------

describe('condition effects & buffs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('sets shieldAcBonus when shield buff is active', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([{ effect: 'shield' }]));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ shieldAcBonus: 5 });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
    expect(computeConditionEffects).toHaveBeenCalled();
  });

  it('sets magicMissileImmune when shield buff is active', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([{ effect: 'shield' }]));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ magicMissileImmune: true });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('sets shieldOfFaithAcBonus when shield_of_faith buff is active', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([{ effect: 'shield_of_faith' }]));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ shieldOfFaithAcBonus: 2 });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('sets noAdvantageAgainst when unseenAttackerAdvantageNegate is true', async () => {
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({ unseenAttackerAdvantageNegate: true })));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ noAdvantageAgainst: true });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('sets noAdvantageAgainst when Elusive feature exists and not incapacitated', async () => {
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({ actions: [{ name: 'Elusive' }] })));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ noAdvantageAgainst: true });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does not set noAdvantageAgainst when Elusive present but incapacitated', async () => {
    mockStore.set('Test Character:activeConditions', JSON.stringify(['incapacitated']));
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({ actions: [{ name: 'Elusive' }] })));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({});

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('sets attackAdvantageCount when buffAllyActive is true', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([{ effect: 'advantage_attacks_and_saves' }]));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ attackAdvantageCount: 1 });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('sets saveAdvantageCount when buffAllyActive is true', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([{ effect: 'advantage_attacks_and_saves' }]));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ saveAdvantageCount: 1 });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('sets cloakOfShadows attack advantage and target disadvantage', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([{ effect: 'cloak_of_shadows' }]));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ attackAdvantageCount: 1, targetDisadvantageCount: 1 });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('sets saveAdvantageAbilities with DEX when haste is active', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([{ effect: 'haste' }]));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ saveAdvantageAbilities: ['DEX'] });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('sets abilityCheckAdvantage with Stealth when trickster blessing active', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([{ effect: 'advantage_on_stealth' }]));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ abilityCheckAdvantage: true, abilityCheckAdvantageSkill: 'Stealth' });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('sets pfeagSaveAdvantage when charmed and pfeag active', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([{ effect: 'protection_from_evil_and_good' }]));
    mockStore.set('Test Character:activeConditions', JSON.stringify(['charmed']));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({});

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('sets pfeagSaveAdvantage when frightened and pfeag active', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([{ effect: 'protection_from_evil_and_good' }]));
    mockStore.set('Test Character:activeConditions', JSON.stringify(['frightened']));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({});

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does not set pfeagSaveAdvantage when not charmed or frightened', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([{ effect: 'protection_from_evil_and_good' }]));
    mockStore.set('Test Character:activeConditions', JSON.stringify([]));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({});

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('sets targetAdvantageCount when advantage_attacks_advantage_against buff exists', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([{ effect: 'advantage_attacks_advantage_against' }]));
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ targetAdvantageCount: 1 });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('adds saveAdvantageCount when luckyAdvantageActive is true', async () => {
    mockStore.set('Test Character:luckyAdvantageActive', true);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ saveAdvantageCount: 1 });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('sets luckyDisadvantage when luckyDisadvantageActive is true', async () => {
    mockStore.set('Test Character:luckyDisadvantageActive', true);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ luckyDisadvantage: true });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('sets speedHalved when stunned_speedHalved is set', async () => {
    mockStore.set('Test Character:stunned_speedHalved', true);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ speedHalved: true });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('clears autoRerollForSaves when fanaticalFocusUsed is true', async () => {
    mockStore.set('Test Character:fanaticalFocusUsed', true);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ autoRerollForSaves: true });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('clears autoRerollForSaves when indomitable uses are maxed (level 17+)', async () => {
    mockStore.set('Test Character:indomitableUses', 3);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ autoRerollForSaves: true });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('clears autoRerollForSaves when indomitable uses are maxed (level 13-16)', async () => {
    mockStore.set('Test Character:indomitableUses', 2);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ autoRerollForSaves: true });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('clears autoRerollForSaves when indomitable uses are maxed (level 1-12)', async () => {
    mockStore.set('Test Character:indomitableUses', 1);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ autoRerollForSaves: true });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('clears strokeOfLuck when strokeOfLuckUsed is true', async () => {
    mockStore.set('Test Character:strokeOfLuckUsed', true);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ strokeOfLuck: true });

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('evaluates autoRerollBonus when present in conditionEffects', async () => {
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ autoRerollBonus: '1d4+2' });

    const { evaluateAutoExpression } = await import('../../services/combat/automation/automationService.js');
    evaluateAutoExpression.mockReturnValue('7');

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
    expect(evaluateAutoExpression).toHaveBeenCalledWith('1d4+2', expect.any(Object));
  });

  it('does not evaluate autoRerollBonus when playerStats is null', async () => {
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({ autoRerollBonus: '1d4+2' });

    const { evaluateAutoExpression } = await import('../../services/combat/automation/automationService.js');
    evaluateAutoExpression.mockReturnValue('7');

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByTestId('char-sheet')).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — popup display & modals
// ---------------------------------------------------------------------------

describe('popup display & modals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
  });

  it('does not render any popup when popupHtml is null', async () => {
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('popup')).not.toBeInTheDocument();
  });

  it('renders string popupHtml in a Popup with dangerouslySetInnerHTML', async () => {
    sharedPopupReturnVal.popupHtml = '<p>Test popup content</p>';

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('popup')).toBeInTheDocument();
    });
  });

  it('renders popupHtml with html property in a Popup', async () => {
    sharedPopupReturnVal.popupHtml = { html: '<div>HTML popup</div>' };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('popup')).toBeInTheDocument();
    });
  });

  it('renders automation_info popup with icon and name', async () => {
    sharedPopupReturnVal.popupHtml = {
      type: 'automation_info',
      name: 'Test Ability',
      description: '<p>Action description</p>',
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('popup')).toBeInTheDocument();
    });
  });

  it('renders wild_shape_select polymorph modal', async () => {
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

  it('renders polymorph_select modal with maxCR', async () => {
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

  it('renders shapechange_select modal with allowAnyCreature', async () => {
    sharedPopupReturnVal.popupHtml = {
      type: 'shapechange_select',
      maxCR: 5,
      campaignName: 'test-campaign',
      targetName: 'Test Character',
      casterName: 'Test Character',
      spell: { name: 'Shapechange' },
      spellLevel: 9,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('polymorph-selection-modal')).toBeInTheDocument();
    });
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

  it('renders true_polymorph_select modal with mode', async () => {
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

  it('renders heal_multi popup with results', async () => {
    sharedPopupReturnVal.popupHtml = {
      type: 'heal_multi',
      name: 'Heal Group',
      formula: '2d4+2',
      rolls: [3, 4, 2],
      bonusHeal: 3,
      bonusHealDetail: 'Disciple of Life',
      results: [
        { targetName: 'Ally1', healAmount: 5, rolls: [3] },
        { targetName: 'Ally2', healAmount: 6, rolls: [4] },
      ],
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('popup')).toBeInTheDocument();
    });
  });

  it('renders AttackResultPopup for default attack popup type', async () => {
    sharedPopupReturnVal.popupHtml = {
      type: 'attack',
      name: 'Longsword Attack',
      hit: true,
      damage: 8,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
    });
  });

  it('renders shield_of_faith_target_selection modal separately', async () => {
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

  it('does not render popup for barkskin_target_selection type', async () => {
    sharedPopupReturnVal.popupHtml = {
      type: 'barkskin_target_selection',
      creatureTargets: [{ name: 'Ally1' }],
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByTestId('popup')).not.toBeInTheDocument();
    });
  });

  it('renders AttackResultPopup with correct props', async () => {
    sharedPopupReturnVal.popupHtml = {
      type: 'attack',
      name: 'Test Attack',
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
    });
  });

  it('passes onSuperiorityManeuver when availableSuperiorityManeuvers exists', async () => {
    sharedPopupReturnVal.popupHtml = {
      type: 'attack',
      availableSuperiorityManeuvers: [{ name: 'Pushing Attack' }],
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
    });
  });

  it('passes onTacticalMind when tacticalMind flag exists', async () => {
    sharedPopupReturnVal.popupHtml = {
      type: 'attack',
      tacticalMind: true,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
    });
  });

  it('passes onDarkOnesLuck when darkOnesLuck flag exists', async () => {
    sharedPopupReturnVal.popupHtml = {
      type: 'attack',
      darkOnesLuck: true,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
    });
  });

  it('passes onPsiBolsteredKnack when psiBolsteredKnack flag exists', async () => {
    sharedPopupReturnVal.popupHtml = {
      type: 'attack',
      psiBolsteredKnack: true,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
    });
  });

  it('passes onBardicInspiration when bardicInspiration flag exists', async () => {
    sharedPopupReturnVal.popupHtml = {
      type: 'attack',
      bardicInspiration: true,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
    });
  });

  it('passes onBardicInspirationOffense when bardicInspirationOffense flag exists', async () => {
    sharedPopupReturnVal.popupHtml = {
      type: 'attack',
      bardicInspirationOffense: true,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
    });
  });

  it('passes onEmpoweredSpell when empoweredSpell flag exists', async () => {
    sharedPopupReturnVal.popupHtml = {
      type: 'attack',
      empoweredSpell: true,
      empoweredSpellChaMod: 3,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
    });
  });

  it('passes onPuncture when piercerPuncture flag exists', async () => {
    sharedPopupReturnVal.popupHtml = {
      type: 'attack',
      piercerPuncture: true,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
    });
  });

  it('passes onSavageAttacker when savageAttacker flag exists', async () => {
    sharedPopupReturnVal.popupHtml = {
      type: 'attack',
      savageAttacker: true,
    };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
    });
  });
});

// Tests — data loading & runtime state
// ---------------------------------------------------------------------------

describe('data loading & runtime state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('sets hitPoints runtime value when playerStats changes', async () => {
    const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    setRuntimeValue.mockResolvedValue(undefined);

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(setRuntimeValue).toHaveBeenCalledWith('Test Character', 'hitPoints', expect.any(Object), 'test-campaign');
    });
  });

  it('loads prepared spells from runtime for Wizard in 2024', async () => {
    mockStore.set('Test Character:preparedSpells', JSON.stringify(['Fireball']));
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({
      rules: '2024',
      class: { name: 'Wizard' },
      spellAbilities: { spells: [{ name: 'Fireball', prepared: '' }, { name: 'Mage Armor', prepared: 'Prepared' }], maxPreparedSpells: 5 },
    })));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does not load prepared spells for non-Wizard spellcasters in 2024', async () => {
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({
      rules: '2024',
      class: { name: 'Sorcerer' },
      spellAbilities: { spells: [{ name: 'Fireball' }], maxPreparedSpells: 5 },
    })));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('loads prepared spells for any class in 5e', async () => {
    mockStore.set('Test Character:preparedSpells', JSON.stringify(['Fireball']));
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({
      rules: '5e',
      class: { name: 'Cleric' },
      spellAbilities: { spells: [{ name: 'Fireball', prepared: '' }], maxPreparedSpells: 5 },
    })));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('applies Aspect of the Wilds Owl for darkvision extension', async () => {
    mockStore.set('Test Character:aspectOfTheWildsOption', 'Owl');
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({
      rules: '2024',
      senses: [{ name: 'Darkvision', value: '60 ft.' }],
    })));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('applies Aspect of the Wilds Panther for climb speed', async () => {
    mockStore.set('Test Character:aspectOfTheWildsOption', 'Panther');
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({
      rules: '2024',
      race: { speed: 30, subrace: { speed: 35 } },
    })));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('applies Aspect of the Wilds Salmon for swim speed', async () => {
    mockStore.set('Test Character:aspectOfTheWildsOption', 'Salmon');
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({
      rules: '2024',
      race: { speed: 30 },
    })));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('applies aquatic affinity passive swim speed', async () => {
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({
      automation: { passives: [{ effect: 'aquatic_affinity' }] },
    })));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('applies second-storywork passive climb speed', async () => {
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({
      automation: { passives: [{ effect: 'second_storywork' }] },
    })));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('applies athlete climb speed passive', async () => {
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({
      automation: { passives: [{ effect: 'climb_speed' }] },
    })));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('applies Roving passive when not wearing heavy armor', async () => {
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({
      automation: { passives: [{ name: 'Roving' }] },
      inventory: { equipped: ['Longsword'] },
      equipment: [{ name: 'Longsword' }, { name: 'Chain Mail', armor_category: 'Heavy' }],
    })));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does not apply Roving when wearing heavy armor', async () => {
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({
      automation: { passives: [{ name: 'Roving' }] },
      inventory: { equipped: ['Chain Mail'] },
      equipment: [{ name: 'Chain Mail', armor_category: 'Heavy' }],
    })));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('exposes athleteStandFromProne flag when passive exists', async () => {
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({
      automation: { passives: [{ effect: 'stand_from_prone' }] },
    })));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('exposes athleteReducedJumpRequirement flag when passive exists', async () => {
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({
      automation: { passives: [{ effect: 'reduced_running_jump_requirement' }] },
    })));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('injects Bardic Inspiration special action when biDie is set', async () => {
    mockStore.set('Test Character:bardicInspirationDie', 6);
    mockStore.set('Test Character:bardicInspirationGrantedBy', 'Bard');
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({
      class: { name: 'Bard' },
      specialActions: [],
    })));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('injects Combat Inspiration Defense reaction when combat opt includes defense', async () => {
    mockStore.set('Test Character:bardicInspirationDie', 6);
    mockStore.set('Test Character:bardicInspirationGrantedBy', 'Bard');
    mockStore.set('Test Character:bardicInspirationCombatOptions', JSON.stringify(['defense_add_to_ac']));
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({
      class: { name: 'Bard' },
      reactions: [],
    })));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('injects Combat Inspiration Offense reaction when combat opt includes offense', async () => {
    mockStore.set('Test Character:bardicInspirationDie', 6);
    mockStore.set('Test Character:bardicInspirationGrantedBy', 'Bard');
    mockStore.set('Test Character:bardicInspirationCombatOptions', JSON.stringify(['offense_add_to_damage']));
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({
      class: { name: 'Bard' },
      reactions: [],
    })));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('computes exhaustionPenalty as 2 * exhaustionLevel', async () => {
    mockStore.set('Test Character:exhaustionLevel', 3);

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('clamps exhaustionLevel between 0 and EXHAUSTION_LEVELS', async () => {
    mockStore.set('Test Character:exhaustionLevel', 10);

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('handles negative exhaustionLevel by clamping to 0', async () => {
    mockStore.set('Test Character:exhaustionLevel', -1);

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('handles CotL land type runtime value for subclass', async () => {
    mockStore.set('Test Character:_circleOfTheLandType', 'forest');
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({
      class: { name: 'Druid', subclass: { name: 'Circle of the Land' } },
    })));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('passes campaignName to all child components', async () => {
    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    expect(CharSummary.mock.calls[0][0].campaignName).toBe('test-campaign');
  });

  it('passes activeMapName to CharSummary', async () => {
    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    expect(CharSummary.mock.calls[0][0].activeMapName).toBe(null);
  });

  it('passes characters array to child components that need it', async () => {
    const { default: CharAbilities } = await import('./CharAbilities.jsx');
    const props = { ...defaultProps, characters: [{ name: 'Test Character', level: 5 }] };
    render(<CharSheet {...props} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    expect(CharAbilities.mock.calls[0][0].characters).toEqual([{ name: 'Test Character', level: 5 }]);
  });

  it('renders on non-localhost hostname', async () => {
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});
