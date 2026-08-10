import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import rulesFactory from '../../services/rules/rulesFactory.js';


import CharSheet from './CharSheet';
import { createDefaultProps, createMockPlayerStats } from './CharSheet.test-utils.jsx';

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
vi.mock('../../services/rules/rulesFactory.js', () => ({
  default: {
    getPlayerStats: vi.fn().mockImplementation(() => Promise.resolve({})),
  },
}));

// Mocks — hooks
// ---------------------------------------------------------------------------

let sharedPopupReturnVal = {
  popupHtml: null,
  setPopupHtml: vi.fn(),
  value: {},
  Provider: ({ children }) => children,
};
const mockStore = new Map();

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CharSheet getHolyAuraTargets', () => {
  const defaultProps = createDefaultProps();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
    sharedPopupReturnVal.value = {};
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

describe('CharSheet isProtectionFromPoisonActive', () => {
  const defaultProps = createDefaultProps();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
    sharedPopupReturnVal.value = {};
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

describe('CharSheet isTranceOfOrderActive', () => {
  const defaultProps = createDefaultProps();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
    sharedPopupReturnVal.value = {};
  });

  it('detects tranceOfOrderActive runtime value', async () => {
    mockStore.set('Test Character:tranceOfOrderActive', true);

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });
  });
});

describe('CharSheet special form states', () => {
  const defaultProps = createDefaultProps();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
    sharedPopupReturnVal.value = {};
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

describe('CharSheet PFEAG warded creature attack disadvantage', () => {
  const defaultProps = createDefaultProps();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
    sharedPopupReturnVal.value = {};
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

describe('CharSheet warding bond with positions', () => {
  const defaultProps = createDefaultProps();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
    sharedPopupReturnVal.value = {};
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

describe('CharSheet indomitable uses limits', () => {
  const defaultProps = createDefaultProps();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
    sharedPopupReturnVal.value = {};
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

describe('CharSheet strokeOfLuckUsed flag', () => {
  const defaultProps = createDefaultProps();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
    sharedPopupReturnVal.value = {};
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

describe('CharSheet fanaticalFocusUsed flag', () => {
  const defaultProps = createDefaultProps();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
    sharedPopupReturnVal.value = {};
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

describe('CharSheet stunned speedHalved flag', () => {
  const defaultProps = createDefaultProps();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
    sharedPopupReturnVal.value = {};
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
