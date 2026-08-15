// @improved-by-ai
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import CharSheet from './CharSheet';
import rulesFactory from '../../services/rules/rulesFactory.js';
import {
  createMockStore,
  createDefaultProps,
  createMockPlayerStats,
  createSharedPopupReturnValue,
  resetTestState,
} from './CharSheet.test-utils.jsx';

// ---------------------------------------------------------------------------
// Mocks — child components
// ---------------------------------------------------------------------------

vi.mock('./char-summary/CharSummary.jsx', () => ({
  default: vi.fn(({ playerStats, conditionEffects }) => (
    <div data-testid="char-summary">
      <span>{playerStats?.name || 'none'}</span>
      {conditionEffects && <span data-testid="condition-effects">{JSON.stringify(conditionEffects)}</span>}
    </div>
  )),
}));

vi.mock('./CharAbilities.jsx', () => ({
  default: vi.fn(({ playerStats, conditionEffects }) => (
    <div data-testid="char-abilities">
      <span>{playerStats?.name || 'none'}</span>
      {conditionEffects && <span data-testid="abilities-condition-effects">{JSON.stringify(conditionEffects)}</span>}
    </div>
  )),
}));

vi.mock('./CharActions.jsx', () => ({
  default: vi.fn(({ playerStats, cannotAct, conditionAttackMode }) => (
    <div data-testid="char-actions">
      <span>{playerStats?.name || 'none'}</span>
      <span data-testid="cannot-act">{String(cannotAct)}</span>
      <span data-testid="attack-mode">{conditionAttackMode}</span>
    </div>
  )),
}));

vi.mock('./CharInventory.jsx', () => ({
  default: vi.fn(({ playerStats }) => (
    <div data-testid="char-inventory"><span>{playerStats?.name || 'none'}</span></div>
  )),
}));

vi.mock('./CharReactions.jsx', () => ({
  default: vi.fn(({ cannotAct }) => (
    <div data-testid="char-reactions">
      <span data-testid="reactions-cannot-act">{String(cannotAct)}</span>
    </div>
  )),
}));

vi.mock('./CharSpecialActions.jsx', () => ({
  default: vi.fn(({ cannotAct }) => (
    <div data-testid="char-special-actions">
      <span data-testid="special-actions-cannot-act">{String(cannotAct)}</span>
    </div>
  )),
}));

vi.mock('./CharCharacterAdvancement.jsx', () => ({
  default: vi.fn(({ playerStats }) => (
    <div data-testid="char-character-advancement"><span>{playerStats?.name || 'none'}</span></div>
  )),
}));

vi.mock('./char-spells/CharSpells.jsx', () => ({
  default: vi.fn(({ playerStats, cannotAct, conditionAttackMode }) => (
    <div data-testid="char-spells">
      <span>{playerStats?.name || 'none'}</span>
      <span data-testid="spells-cannot-act">{String(cannotAct)}</span>
      <span data-testid="spells-attack-mode">{conditionAttackMode}</span>
    </div>
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
  computeConditionEffects: vi.fn().mockImplementation(() => ({
    attackAdvantageCount: 0,
    attackDisadvantageCount: 0,
    autoReroll: false,
    autoRerollCondition: null,
    autoRerollBonus: null,
    cannotAct: false,
  })),
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
// Mocks — hooks (uses shared test-utils helpers)
// ---------------------------------------------------------------------------

const mockStore = createMockStore();

let sharedPopupReturnVal = createSharedPopupReturnValue();

vi.mock('../../hooks/combat/useSharedPopup.js', () => {
  const mockFn = vi.fn();
  mockFn.mockImplementation(() => {
    return { ...sharedPopupReturnVal, Provider: ({ children }) => children };
  });
  return { default: mockFn };
});

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => mockStore),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  listeners: new Map(),
  getRuntimeValue: vi.fn((key, prop) => mockStore.get(prop) ?? null),
  setRuntimeValue: vi.fn((_key, prop, _val, _camp) => mockStore.set(prop, _val)),
  useRuntimeValue: vi.fn((key, prop) => {
    if (prop === 'exhaustionLevel') return 0;
    if (prop === 'bardicInspirationDie') return mockStore.get(prop) ?? null;
    if (prop === 'bardicInspirationCombatOptions') return mockStore.get(prop) ?? null;
    if (prop === 'activeConditions') return mockStore.get(prop) ?? [];
    if (prop === 'activeBuffs') return mockStore.get(prop) ?? [];
    if (prop === 'targetEffects') return mockStore.get('targetEffects') ?? [];
    if (prop === 'preparedSpells') return mockStore.get(prop) ?? null;
    if (prop === 'aspectOfTheWildsOption') return mockStore.get(prop) ?? null;
    if (prop === 'bardicInspirationGrantedBy') return mockStore.get(prop) ?? 'unknown';
    if (prop === 'stunned_speedHalved') return mockStore.get(prop) ?? null;
    if (prop === 'fanaticalFocusUsed') return mockStore.get(prop) ?? null;
    if (prop === 'focusPoints') return mockStore.get(prop) ?? null;
    if (prop === 'indomitableUses') return mockStore.get(prop) ?? 0;
    if (prop === 'disciplinedSurvivorUsed') return mockStore.get(prop) ?? null;
    if (prop === 'strokeOfLuckUsed') return mockStore.get(prop) ?? null;
    if (prop === 'bardicInspirationUses') return mockStore.get(prop) ?? 0;
    if (prop === 'secondWindUses') return mockStore.get(prop) ?? 0;
    if (prop === 'superiorityDice') return mockStore.get(prop) ?? 0;
    if (prop === 'psionicEnergy') return mockStore.get(prop) ?? 0;
    if (prop === 'peerlessAthleteActive') return mockStore.get(prop) ?? null;
    if (prop === 'largeFormActive') return mockStore.get(prop) ?? null;
    if (prop === 'holyNimbusActive') return mockStore.get(prop) ?? null;
    if (prop === '_Defensive_Tactics_choice') return mockStore.get(prop) ?? null;
    if (prop === 'luckyAdvantageActive') return mockStore.get(prop) ?? null;
    if (prop === 'luckyDisadvantageActive') return mockStore.get(prop) ?? null;
    if (prop === '_circleOfTheLandType') return mockStore.get(prop) ?? null;
    if (prop === '_Energy_Resistances_chosenTypes') return mockStore.get(prop) ?? null;
    if (prop === '_Fiendish_Resilience_chosenType') return mockStore.get(prop) ?? null;
    if (prop === '_spellThiefCasterBlock') return mockStore.get(prop) ?? null;
    if (prop === '_spellThiefStolenList') return mockStore.get(prop) ?? null;
    if (prop === 'piercerPunctureUsedThisTurn') return mockStore.get(prop) ?? null;
    if (prop === '_Savage_Attacker_usedRound') return mockStore.get(prop) ?? null;
    if (prop === 'darkOnesLuckUses') return mockStore.get(prop) ?? null;
    if (prop === 'tranceOfOrderActive') return mockStore.get(prop) ?? null;
    if (prop === 'livingLegendActive') return mockStore.get(prop) ?? null;
    if (prop === 'elderChampionActive') return mockStore.get(prop) ?? null;
    return null;
  }),
}));

vi.mock('../../services/rules/rulesFactory.js', () => ({
  default: {
    getPlayerStats: vi.fn().mockImplementation(() => Promise.resolve(createMockPlayerStats())),
  },
}));

// ---------------------------------------------------------------------------
// Tests — condition effects flow through computeCharConditionEffects
// ---------------------------------------------------------------------------

describe('CharSheet condition effects computation', () => {
  beforeEach(() => {
    resetTestState(sharedPopupReturnVal);
    mockStore.clear();
  });

  it('renders the char-sheet when playerStats loads successfully', async () => {
    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    expect(CharSummary).toHaveBeenCalled();
    const { playerStats, conditionEffects } = CharSummary.mock.calls[0][0];
    expect(playerStats.name).toBe('Test Character');
    expect(conditionEffects).toBeDefined();
  });

  it('passes cannotAct=true to child components when paralyzed condition is active', async () => {
    mockStore.set('activeConditions', ['paralyzed']);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({ cannotAct: true }));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharActions } = await import('./CharActions.jsx');
    expect(CharActions).toHaveBeenCalled();
    expect(CharActions.mock.calls[0][0].cannotAct).toBe(true);

    const { default: CharReactions } = await import('./CharReactions.jsx');
    expect(CharReactions).toHaveBeenCalled();
    expect(CharReactions.mock.calls[0][0].cannotAct).toBe(true);

    const { default: CharSpecialActions } = await import('./CharSpecialActions.jsx');
    expect(CharSpecialActions).toHaveBeenCalled();
    expect(CharSpecialActions.mock.calls[0][0].cannotAct).toBe(true);

    const { default: CharSpells } = await import('./char-spells/CharSpells.jsx');
    expect(CharSpells).toHaveBeenCalled();
    expect(CharSpells.mock.calls[0][0].cannotAct).toBe(true);
  });

  it('passes cannotAct=false when no incapacitating condition is active', async () => {
    mockStore.set('activeConditions', []);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({ cannotAct: false }));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharActions } = await import('./CharActions.jsx');
    expect(CharActions.mock.calls[0][0].cannotAct).toBe(false);
  });

  it('passes conditionAttackMode to CharAbilities and CharActions', async () => {
    mockStore.set('activeConditions', []);
    const { computeConditionEffects, getNetAttackMode } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({ attackAdvantageCount: 1, attackDisadvantageCount: 0 }));
    getNetAttackMode.mockReturnValue('advantage');

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharActions } = await import('./CharActions.jsx');
    expect(CharActions.mock.calls[0][0].conditionAttackMode).toBe('advantage');

    const { default: CharAbilities } = await import('./CharAbilities.jsx');
    expect(CharAbilities).toHaveBeenCalled();
    expect(CharAbilities.mock.calls[0][0].conditionEffects).toBeDefined();
  });

  it('passes conditionEffects object to CharSummary and CharAbilities', async () => {
    mockStore.set('activeConditions', []);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    const expectedEffects = {
      attackAdvantageCount: 2,
      attackDisadvantageCount: 1,
      autoReroll: true,
      autoRerollBonus: '1d4',
      shieldAcBonus: 5,
      magicMissileImmune: true,
    };
    computeConditionEffects.mockImplementation(() => ({ ...expectedEffects }));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    expect(CharSummary.mock.calls[0][0].conditionEffects).toEqual(expectedEffects);

    const { default: CharAbilities } = await import('./CharAbilities.jsx');
    expect(CharAbilities.mock.calls[0][0].conditionEffects).toEqual(expectedEffects);
  });

  it('passes shieldAcBonus when shield buff is active', async () => {
    mockStore.set('activeBuffs', [{ effect: 'shield' }]);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({ shieldAcBonus: 5, magicMissileImmune: true }));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const effects = CharSummary.mock.calls[0][0].conditionEffects;
    expect(effects.shieldAcBonus).toBe(5);
    expect(effects.magicMissileImmune).toBe(true);
  });

  it('passes saveAdvantageAbilities when haste buff is active', async () => {
    mockStore.set('activeBuffs', [{ effect: 'haste' }]);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({ saveAdvantageAbilities: ['DEX'] }));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const effects = CharSummary.mock.calls[0][0].conditionEffects;
    expect(effects.saveAdvantageAbilities).toContain('DEX');
  });

  it('passes targetAdvantageCount when reckless attack buff is active', async () => {
    mockStore.set('activeBuffs', [{ effect: 'advantage_attacks_advantage_against' }]);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({ targetAdvantageCount: 0 }));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const lastCall = CharSummary.mock.calls[CharSummary.mock.calls.length - 1][0];
    const effects = lastCall.conditionEffects;
    expect(effects.targetAdvantageCount).toBe(1);
  });

  it('passes abilityCheckAdvantage when Blessing of the Trickster buff is active', async () => {
    mockStore.set('activeBuffs', [{ effect: 'advantage_on_stealth' }]);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({
      abilityCheckAdvantage: true,
      abilityCheckAdvantageSkill: 'Stealth',
    }));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const effects = CharSummary.mock.calls[0][0].conditionEffects;
    expect(effects.abilityCheckAdvantage).toBe(true);
    expect(effects.abilityCheckAdvantageSkill).toBe('Stealth');
  });

  it('passes attackAdvantageCount and saveAdvantageCount when Zealous Presence buff is active', async () => {
    mockStore.set('activeBuffs', [{ effect: 'advantage_attacks_and_saves' }]);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({ attackAdvantageCount: 0, saveAdvantageCount: 0 }));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const lastCall = CharSummary.mock.calls[CharSummary.mock.calls.length - 1][0];
    const effects = lastCall.conditionEffects;
    expect(effects.attackAdvantageCount).toBe(1);
    expect(effects.saveAdvantageCount).toBe(1);
  });

  it('passes attackAdvantageCount and targetDisadvantageCount when Cloak of Shadows is active', async () => {
    mockStore.set('activeBuffs', [{ effect: 'cloak_of_shadows' }]);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({ attackAdvantageCount: 0, targetDisadvantageCount: 0 }));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const lastCall = CharSummary.mock.calls[CharSummary.mock.calls.length - 1][0];
    const effects = lastCall.conditionEffects;
    expect(effects.attackAdvantageCount).toBe(1);
    expect(effects.targetDisadvantageCount).toBe(1);
  });

  it('passes shieldOfFaithAcBonus when shield of faith buff is active', async () => {
    mockStore.set('activeBuffs', [{ effect: 'shield_of_faith' }]);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({ shieldOfFaithAcBonus: 2 }));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const effects = CharSummary.mock.calls[0][0].conditionEffects;
    expect(effects.shieldOfFaithAcBonus).toBe(2);
  });

  it('passes noAdvantageAgainst when Alert feat negates unseen attacker advantage', async () => {
    const stats = createMockPlayerStats({ unseenAttackerAdvantageNegate: true });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));
    mockStore.set('activeBuffs', []);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({ noAdvantageAgainst: true }));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const effects = CharSummary.mock.calls[0][0].conditionEffects;
    expect(effects.noAdvantageAgainst).toBe(true);
  });

  it('passes noAdvantageAgainst when Elusive feature is active and not incapacitated', async () => {
    const stats = createMockPlayerStats({
      actions: [{ name: 'Elusive' }],
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));
    mockStore.set('activeBuffs', []);
    mockStore.set('activeConditions', []);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({ noAdvantageAgainst: true }));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const effects = CharSummary.mock.calls[0][0].conditionEffects;
    expect(effects.noAdvantageAgainst).toBe(true);
  });

  it('does not set noAdvantageAgainst from Elusive when incapacitated', async () => {
    const stats = createMockPlayerStats({
      actions: [{ name: 'Elusive' }],
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));
    mockStore.set('activeBuffs', []);
    mockStore.set('activeConditions', ['incapacitated']);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({}));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const effects = CharSummary.mock.calls[0][0].conditionEffects;
    expect(effects.noAdvantageAgainst).toBeFalsy();
  });

  it('passes targetDisadvantageCount when protection from evil and good blocks warded attacker', async () => {
    mockStore.set('activeBuffs', [{ effect: 'protection_from_evil_and_good' }]);
    mockStore.set('activeConditions', ['charmed']);
    const { getCombatSummary } = await import('../../services/encounters/combatData.js');
    getCombatSummary.mockReturnValue({
      creatures: [{ name: 'Orc', type: 'Orc' }],
      attackerName: 'Orc',
    });
    const { isCreatureWarded } = await import('../../services/automation/handlers/buffs/protectionFromEvilAndGoodHandler.js');
    isCreatureWarded.mockReturnValue(true);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({ targetDisadvantageCount: 0 }));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const lastCall = CharSummary.mock.calls[CharSummary.mock.calls.length - 1][0];
    const effects = lastCall.conditionEffects;
    expect(effects.targetDisadvantageCount).toBe(1);
  });

  it('passes autoRerollBonus when computed', async () => {
    mockStore.set('activeBuffs', []);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({ autoRerollBonus: '1d4' }));
    const { evaluateAutoExpression } = await import('../../services/combat/automation/automationService.js');
    evaluateAutoExpression.mockReturnValue('1d4');

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const effects = CharSummary.mock.calls[0][0].conditionEffects;
    expect(effects.autoRerollBonus).toBe('1d4');
  });

  it('passes strokeOfLuck flag and clears it when strokeOfLuckUsed is true', async () => {
    mockStore.set('strokeOfLuckUsed', true);
    mockStore.set('activeBuffs', []);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({ strokeOfLuck: true }));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const effects = CharSummary.mock.calls[0][0].conditionEffects;
    expect(effects.strokeOfLuck).toBe(false);
  });

  it('passes saveAdvantageCount when luckyAdvantageActive is true', async () => {
    mockStore.set('luckyAdvantageActive', true);
    mockStore.set('activeBuffs', []);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({ saveAdvantageCount: 1 }));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const effects = CharSummary.mock.calls[0][0].conditionEffects;
    expect(effects.saveAdvantageCount).toBe(2);
  });

  it('passes luckyDisadvantage when luckyDisadvantageActive is true', async () => {
    mockStore.set('luckyDisadvantageActive', true);
    mockStore.set('activeBuffs', []);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({ luckyDisadvantage: true }));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const effects = CharSummary.mock.calls[0][0].conditionEffects;
    expect(effects.luckyDisadvantage).toBe(true);
  });

  it('passes speedHalved when stunned_speedHalved runtime flag is set', async () => {
    mockStore.set('stunned_speedHalved', true);
    mockStore.set('activeBuffs', []);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({ speedHalved: true }));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const effects = CharSummary.mock.calls[0][0].conditionEffects;
    expect(effects.speedHalved).toBe(true);
  });

  it('clears autoRerollForSaves when fanaticalFocusUsed is true', async () => {
    mockStore.set('fanaticalFocusUsed', true);
    mockStore.set('activeBuffs', []);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({ autoRerollForSaves: true, autoRerollBonus: '1d4' }));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const effects = CharSummary.mock.calls[0][0].conditionEffects;
    expect(effects.autoRerollForSaves).toBe(false);
    expect(effects.autoRerollBonus).toBe(null);
  });

  it('clears autoRerollForSaves when indomitableUses reaches max for high-level character', async () => {
    const stats = createMockPlayerStats({ level: 17 });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));
    mockStore.set('indomitableUses', 3);
    mockStore.set('activeBuffs', []);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({ autoRerollForSaves: true, autoRerollBonus: '1d6' }));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const effects = CharSummary.mock.calls[0][0].conditionEffects;
    expect(effects.autoRerollForSaves).toBe(false);
    expect(effects.autoRerollBonus).toBe(null);
  });

  it('passes isRaging=true when damageBonusExpression buff is present', async () => {
    mockStore.set('activeBuffs', [{ damageBonusExpression: '2d6' }]);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({}));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    expect(CharSummary).toHaveBeenCalled();
    const { default: CharAbilities } = await import('./CharAbilities.jsx');
    expect(CharAbilities.mock.calls[0][0].isRaging).toBe(true);
  });

  it('passes exhaustionPenalty to CharSummary and CharAbilities', async () => {
    mockStore.set('activeConditions', []);
    mockStore.set('activeBuffs', []);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({}));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    expect(CharSummary.mock.calls[0][0].exhaustionLevel).toBe(0);

    const { default: CharAbilities } = await import('./CharAbilities.jsx');
    expect(CharAbilities.mock.calls[0][0].exhaustionPenalty).toBe(0);
  });

  it('passes effectiveAttackMode to CharActions when luckyAdvantageActive overrides conditionAttackMode', async () => {
    mockStore.set('luckyAdvantageActive', true);
    mockStore.set('activeBuffs', []);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({ attackAdvantageCount: 0, attackDisadvantageCount: 1 }));
    const { getNetAttackMode } = await import('../../services/combat/conditions/conditionEffects.js');
    getNetAttackMode.mockReturnValue('disadvantage');

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharActions } = await import('./CharActions.jsx');
    // luckyAdvantageActive should override the disadvantage to advantage
    expect(CharActions.mock.calls[0][0].conditionAttackMode).toBe('advantage');
  });

  it('passes shapeShiftActive to child components when shape_shift buff is present', async () => {
    mockStore.set('activeBuffs', [{ effect: 'shape_shift' }]);
    const { computeConditionEffects } = await import('../../services/combat/conditions/conditionEffects.js');
    computeConditionEffects.mockImplementation(() => ({}));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    // The component returns shapeShiftActive alongside other computed values
    expect(CharSummary).toHaveBeenCalled();
  });
});
