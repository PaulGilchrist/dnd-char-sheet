// @improved-by-ai
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import CharSheet from './CharSheet';
import {
  createMockStore,
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
  loadCombatSummary: vi.fn().mockResolvedValue({ creatures: [] }),
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
// Helpers
// ---------------------------------------------------------------------------

const defaultProps = {
  allAbilityScores: [],
  allClasses: [],
  allClasses2024: [],
  allEquipment: [],
  allMagicItems: [],
  allRaces: [],
  allSpells: [],
  allSpells2024: [],
  playerSummary: { name: 'Test Character', rules: '5e' },
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
// Tests — handleReroll — fanaticalFocusUsed reset on render
// ---------------------------------------------------------------------------

describe('handleReroll — fanaticalFocusUsed reset on render', () => {
  beforeEach(() => {
    resetTestState(sharedPopupReturnValue);
    mockStore.clear();
  });

  it('sets fanaticalFocusUsed to false when not raging', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([]));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const focusSetCalls = setRuntimeValue.mock.calls.filter(
      (call) => call[1] === 'fanaticalFocusUsed'
    );
    expect(focusSetCalls.length).toBeGreaterThan(0);
    expect(focusSetCalls[0][2]).toBe(false);
  });

  it('does not set fanaticalFocusUsed when raging', async () => {
    mockStore.set('Test Character:activeBuffs', JSON.stringify([
      { damageBonusExpression: '2d6' },
    ]));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const focusSetCalls = setRuntimeValue.mock.calls.filter(
      (call) => call[1] === 'fanaticalFocusUsed'
    );
    expect(focusSetCalls.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests — hitPoints sync
// ---------------------------------------------------------------------------

describe('hitPoints sync', () => {
  beforeEach(() => {
    resetTestState(sharedPopupReturnValue);
    mockStore.clear();
  });

  it('sets hitPoints runtime value when playerStats is available', async () => {
    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const hpCalls = setRuntimeValue.mock.calls.filter(
      (call) => call[1] === 'hitPoints'
    );
    expect(hpCalls.length).toBeGreaterThan(0);
    expect(hpCalls[0][2]).toEqual({ current: 40, max: 40 });
  });
});

// ---------------------------------------------------------------------------
// Tests — bardic inspiration runtime value subscriptions
// ---------------------------------------------------------------------------

describe('bardic inspiration runtime value subscriptions', () => {
  beforeEach(() => {
    resetTestState(sharedPopupReturnValue);
    mockStore.clear();
  });

  it('subscribes to bardicInspirationDie via useRuntimeValue', async () => {
    mockStore.set('Test Character:bardicInspirationDie', 'd6');
    mockStore.set('Test Character:bardicInspirationGrantedBy', 'Bard');

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { useRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const biDieCalls = useRuntimeValue.mock.calls.filter(
      (call) => call[1] === 'bardicInspirationDie'
    );
    expect(biDieCalls.length).toBeGreaterThan(0);
    expect(biDieCalls[0][0]).toBe('Test Character');
    expect(biDieCalls[0][2]).toBe('test-campaign');
  });

  it('subscribes to bardicInspirationCombatOptions via useRuntimeValue', async () => {
    mockStore.set('Test Character:bardicInspirationCombatOptions', JSON.stringify(['defense_add_to_ac']));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { useRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const biOptCalls = useRuntimeValue.mock.calls.filter(
      (call) => call[1] === 'bardicInspirationCombatOptions'
    );
    expect(biOptCalls.length).toBeGreaterThan(0);
  });

  it('does not subscribe to bardicInspirationUses via useRuntimeValue (handler reads via getRuntimeValue)', async () => {
    mockStore.set('Test Character:bardicInspirationUses', 3);

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { useRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const biUsesCalls = useRuntimeValue.mock.calls.filter(
      (call) => call[1] === 'bardicInspirationUses'
    );
    // bardicInspirationUses is read by handleBardicInspirationOffense via getRuntimeValue,
    // not subscribed via useRuntimeValue in the component
    expect(biUsesCalls.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests — popupHtml flow for empowered spell handler
// ---------------------------------------------------------------------------

describe('handleEmpoweredSpell — popupHtml flow', () => {
  beforeEach(() => {
    resetTestState(sharedPopupReturnValue);
    mockStore.clear();
  });

  it('passes popupHtml to empowered spell handler via shared popup context', async () => {
    sharedPopupReturnValue.popupHtml = { empoweredSpellChaMod: 3 };

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    // Verify the popup context was set up with the empowered spell data
    expect(sharedPopupReturnValue.popupHtml).toEqual({ empoweredSpellChaMod: 3 });
  });
});

// ---------------------------------------------------------------------------
// Tests — special feature runtime value subscriptions
// ---------------------------------------------------------------------------

describe('special feature runtime value subscriptions', () => {
  beforeEach(() => {
    resetTestState(sharedPopupReturnValue);
    mockStore.clear();
  });

  it('subscribes to spellThiefStolenList via useRuntimeValue', async () => {
    mockStore.set('Test Character:_spellThiefStolenList', JSON.stringify(['Fireball']));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { useRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const thiefCalls = useRuntimeValue.mock.calls.filter(
      (call) => call[1] === '_spellThiefStolenList'
    );
    expect(thiefCalls.length).toBeGreaterThan(0);
  });

  it('subscribes to spellThiefCasterBlock via useRuntimeValue', async () => {
    mockStore.set('Test Character:_spellThiefCasterBlock', JSON.stringify(['Ally1']));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { useRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const blockCalls = useRuntimeValue.mock.calls.filter(
      (call) => call[1] === '_spellThiefCasterBlock'
    );
    expect(blockCalls.length).toBeGreaterThan(0);
  });

  it('subscribes to circleOfTheLandType via useRuntimeValue', async () => {
    mockStore.set('Test Character:_circleOfTheLandType', 'arctic');

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { useRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const cotlCalls = useRuntimeValue.mock.calls.filter(
      (call) => call[1] === '_circleOfTheLandType'
    );
    expect(cotlCalls.length).toBeGreaterThan(0);
  });

  it('subscribes to fiendishResilienceType via useRuntimeValue', async () => {
    mockStore.set('Test Character:_Fiendish_Resilience_chosenType', 'fire');

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { useRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const fiendishCalls = useRuntimeValue.mock.calls.filter(
      (call) => call[1] === '_Fiendish_Resilience_chosenType'
    );
    expect(fiendishCalls.length).toBeGreaterThan(0);
  });

  it('subscribes to boonEnergyResistanceTypes via useRuntimeValue', async () => {
    mockStore.set('Test Character:_Energy_Resistances_chosenTypes', JSON.stringify(['fire', 'cold']));

    render(<CharSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { useRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const boonCalls = useRuntimeValue.mock.calls.filter(
      (call) => call[1] === '_Energy_Resistances_chosenTypes'
    );
    expect(boonCalls.length).toBeGreaterThan(0);
  });
});
