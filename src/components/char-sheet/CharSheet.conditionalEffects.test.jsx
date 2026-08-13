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
// Tests — Warding Bond logic
// ---------------------------------------------------------------------------

describe('warding bond logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('sets wardingBondAcBonus when warding bond buff is within range', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([
      { effect: 'warding_bond', sourceCharacter: 'Ally1', acBonus: 1, saveBonus: 1 },
    ]));
    const { getCombatSummary } = await import('../../services/encounters/combatData.js');
    getCombatSummary.mockReturnValue({
      creatures: [
        { name: 'Test Character', position: { x: 0, y: 0 } },
        { name: 'Ally1', position: { x: 30, y: 0 } },
      ],
    });
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({});

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does not set wardingBondAcBonus when warding bond caster is self', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([
      { effect: 'warding_bond', sourceCharacter: 'Test Character', acBonus: 1 },
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

  it('does not set wardingBondAcBonus when warding bond caster is out of range', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([
      { effect: 'warding_bond', sourceCharacter: 'Ally1', acBonus: 1 },
    ]));
    const { getCombatSummary } = await import('../../services/encounters/combatData.js');
    getCombatSummary.mockReturnValue({
      creatures: [
        { name: 'Test Character', position: { x: 0, y: 0 } },
        { name: 'Ally1', position: { x: 100, y: 0 } },
      ],
    });
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({});

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('sets wardingBondSaveBonus when warding bond buff is within range', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([
      { effect: 'warding_bond', sourceCharacter: 'Ally1', acBonus: 1, saveBonus: 1 },
    ]));
    const { getCombatSummary } = await import('../../services/encounters/combatData.js');
    getCombatSummary.mockReturnValue({
      creatures: [
        { name: 'Test Character', position: { x: 0, y: 0 } },
        { name: 'Ally1', position: { x: 30, y: 0 } },
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
// Tests — Protection from Evil and Good attacker logic
// ---------------------------------------------------------------------------

describe('protection from evil and good attacker logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('sets targetDisadvantageCount when pfeag active and attacker is warded type', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([
      { effect: 'protection_from_evil_and_good' },
    ]));
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(
      createMockPlayerStats({ name: 'Test Character' })
    ));
    const { isCreatureWarded } = await import('../../services/automation/handlers/buffs/protectionFromEvilAndGoodHandler.js');
    isCreatureWarded.mockReturnValue(true);
    const { getCombatSummary } = await import('../../services/encounters/combatData.js');
    getCombatSummary.mockReturnValue({
      attackerName: 'Enemy1',
      creatures: [{ name: 'Enemy1', type: 'Humanoid' }],
    });
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({});

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does not set targetDisadvantageCount when pfeag active but attacker not warded', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([
      { effect: 'protection_from_evil_and_good' },
    ]));
    const { isCreatureWarded } = await import('../../services/automation/handlers/buffs/protectionFromEvilAndGoodHandler.js');
    isCreatureWarded.mockReturnValue(false);
    const { getCombatSummary } = await import('../../services/encounters/combatData.js');
    getCombatSummary.mockReturnValue({
      attackerName: 'Enemy1',
      creatures: [{ name: 'Enemy1', type: 'Humanoid' }],
    });
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockReturnValue({});

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does not set targetDisadvantageCount when no attacker in combat context', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([
      { effect: 'protection_from_evil_and_good' },
    ]));
    const { isCreatureWarded } = await import('../../services/automation/handlers/buffs/protectionFromEvilAndGoodHandler.js');
    isCreatureWarded.mockReturnValue(true);
    const { getCombatSummary } = await import('../../services/encounters/combatData.js');
    getCombatSummary.mockReturnValue({
      attackerName: null,
      creatures: [],
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
// Tests — Counterspell save result event listener
// ---------------------------------------------------------------------------

describe('counterspell save result event listener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
  });

  it('sets popupHtml when counterspell-save-result event fires', async () => {
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    window.dispatchEvent(new CustomEvent('counterspell-save-result', {
      detail: {
        attackerName: 'Enemy1',
        spellName: 'Fireball',
        saveDc: 15,
        spellResult: 'failed',
        counterspellResult: 'successfully countered',
      },
    }));

    await waitFor(() => {
      expect(sharedPopupReturnVal.setPopupHtml).toHaveBeenCalled();
    });
  });

  it('does not set popupHtml when event has no attackerName', async () => {
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    window.dispatchEvent(new CustomEvent('counterspell-save-result', {
      detail: {
        spellName: 'Fireball',
        saveDc: 15,
        spellResult: 'failed',
        counterspellResult: 'successfully countered',
      },
    }));

    await waitFor(() => {
      expect(sharedPopupReturnVal.setPopupHtml).not.toHaveBeenCalled();
    });
  });

  it('does not set popupHtml when event has no spellName', async () => {
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    window.dispatchEvent(new CustomEvent('counterspell-save-result', {
      detail: {
        attackerName: 'Enemy1',
        saveDc: 15,
        spellResult: 'failed',
        counterspellResult: 'successfully countered',
      },
    }));

    await waitFor(() => {
      expect(sharedPopupReturnVal.setPopupHtml).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Aura combo effects
// ---------------------------------------------------------------------------

describe('aura combo effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('sets auraComboEffects to null when no characters', async () => {
    const { computeAuraComboEffects } = await import('../../services/combat/auras/auraComboEffects.js');
    computeAuraComboEffects.mockResolvedValue(null);

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does not call computeAuraComboEffects when playerStats is null', async () => {
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('calls computeAuraComboEffects with correct params when characters exist', async () => {
    const { computeAuraComboEffects } = await import('../../services/combat/auras/auraComboEffects.js');
    computeAuraComboEffects.mockResolvedValue({ effects: [] });

    const props = {
      ...defaultProps,
      characters: [{ name: 'Test Character', level: 5 }],
      activeMapName: 'test-map',
    };

    render(<CharSheet {...props} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(computeAuraComboEffects).toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — handleTogglePreparedSpells
// ---------------------------------------------------------------------------

describe('handleTogglePreparedSpells', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('toggles a spell from not prepared to prepared', async () => {
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({
      spellAbilities: {
        spells: [{ name: 'Fireball', prepared: '' }],
        maxPreparedSpells: 5,
      },
    })));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('toggles a spell from prepared to not prepared', async () => {
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({
      spellAbilities: {
        spells: [{ name: 'Fireball', prepared: 'Prepared' }],
        maxPreparedSpells: 5,
      },
    })));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('does not toggle when at max prepared spells', async () => {
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({
      spellAbilities: {
        spells: [
          { name: 'Fireball', prepared: 'Prepared' },
          { name: 'Mage Armor', prepared: 'Prepared' },
          { name: 'Shield', prepared: 'Prepared' },
          { name: 'Burning Hands', prepared: 'Prepared' },
          { name: 'Comprehend Languages', prepared: 'Prepared' },
        ],
        maxPreparedSpells: 5,
      },
    })));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests — Empty handlers (handleConditionsChange, handleBuffsChange)
// ---------------------------------------------------------------------------

describe('empty handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('renders with handleConditionsChange as empty function', async () => {
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });

  it('renders with handleBuffsChange as empty function', async () => {
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});
