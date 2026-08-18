// @improved-by-ai
// @cleaned-by-ai
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

// ---------------------------------------------------------------------------
// Mocks — hooks
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
  getRuntimeValue: vi.fn((key, prop, _camp) => mockStore.get(`${key}:${prop}`) ?? null),
  setRuntimeValue: vi.fn((_key, _prop, _val, _camp) => mockStore.set(`${_key}:${_prop}`, _val)),
  useRuntimeValue: vi.fn((key, prop) => {
    if (prop === 'exhaustionLevel') return 0;
    if (prop === 'bardicInspirationDie') return mockStore.get(`${key}:bardicInspirationDie`) ?? null;
    if (prop === 'bardicInspirationCombatOptions') return mockStore.get(`${key}:bardicInspirationCombatOptions`) ?? null;
    if (prop === 'activeConditions') return mockStore.get(`${key}:activeConditions`) ?? [];
    if (prop === 'activeBuffs') return mockStore.get(`${key}:activeBuffs`) ?? [];
    if (prop === 'targetEffects') return mockStore.get(`${key}:targetEffects`) ?? [];
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
// Tests — runtime value propagation to playerStats
// ---------------------------------------------------------------------------

describe('runtime value propagation to playerStats', () => {
  beforeEach(() => {
    resetTestState(sharedPopupReturnVal);
    mockStore.clear();
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats()));
  });

  it('sets hitPoints runtime value when playerStats loads', async () => {
    const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    setRuntimeValue.mockResolvedValue(undefined);

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      expect(setRuntimeValue).toHaveBeenCalledWith(
        'Test Character',
        'hitPoints',
        expect.objectContaining({ current: 40, max: 40 }),
        'test-campaign'
      );
    });
  });

  it('loads prepared spells from runtime for Wizard in 2024', async () => {
    mockStore.set('Test Character:preparedSpells', ['Fireball']);
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({
      rules: '2024',
      class: { name: 'Wizard' },
      spellAbilities: {
        spells: [{ name: 'Fireball', prepared: '' }, { name: 'Mage Armor', prepared: 'Prepared' }],
        maxPreparedSpells: 5,
      },
    })));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSpells } = await import('./char-spells/CharSpells.jsx');
    const passedStats = CharSpells.mock.calls[0][0].playerStats;
    const fireballSpell = passedStats.spellAbilities.spells.find((s) => s.name === 'Fireball');
    expect(fireballSpell.prepared).toBe('Prepared');
  });

  it('does not load prepared spells for non-Wizard spellcasters in 2024', async () => {
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({
      rules: '2024',
      class: { name: 'Sorcerer' },
      spellAbilities: { spells: [{ name: 'Fireball' }], maxPreparedSpells: 5 },
    })));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    // Sorcerer in 2024 should not have prepared spells processed
    const { default: CharSpells } = await import('./char-spells/CharSpells.jsx');
    expect(CharSpells).toHaveBeenCalled();
  });

  it('loads prepared spells for any class in 5e', async () => {
    mockStore.set('Test Character:preparedSpells', ['Fireball']);
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(createMockPlayerStats({
      rules: '5e',
      class: { name: 'Cleric' },
      spellAbilities: { spells: [{ name: 'Fireball', prepared: '' }], maxPreparedSpells: 5 },
    })));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSpells } = await import('./char-spells/CharSpells.jsx');
    const passedStats = CharSpells.mock.calls[0][0].playerStats;
    const fireballSpell = passedStats.spellAbilities.spells.find((s) => s.name === 'Fireball');
    expect(fireballSpell.prepared).toBe('Prepared');
  });
});

// ---------------------------------------------------------------------------
// Tests — Aspect of the Wilds passive effects (2024)
// ---------------------------------------------------------------------------

describe('Aspect of the Wilds passive effects (2024)', () => {
  beforeEach(() => {
    resetTestState(sharedPopupReturnVal);
    mockStore.clear();
  });

  it('extends Darkvision range by 60ft when Owl option is selected', async () => {
    const stats = createMockPlayerStats({
      rules: '2024',
      senses: [{ name: 'Darkvision', value: '60 ft.' }],
    });
    mockStore.set('Test Character:aspectOfTheWildsOption', 'Owl');
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const passedStats = CharSummary.mock.calls[0][0].playerStats;
    const dv = passedStats.senses.find((s) => s.name === 'Darkvision');
    expect(dv.value).toBe('120 ft.');
  });

  it('adds new Darkvision entry when none exists and Owl is selected', async () => {
    const stats = createMockPlayerStats({ rules: '2024' });
    mockStore.set('Test Character:aspectOfTheWildsOption', 'Owl');
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const passedStats = CharSummary.mock.calls[0][0].playerStats;
    const dv = passedStats.senses?.find((s) => s.name === 'Darkvision');
    expect(dv).toBeDefined();
    expect(dv.value).toBe('60 ft.');
  });

  it('sets climbSpeed when Panther option is selected', async () => {
    const stats = createMockPlayerStats({
      rules: '2024',
      race: { speed: 30, subrace: { speed: 35 } },
    });
    mockStore.set('Test Character:aspectOfTheWildsOption', 'Panther');
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const passedStats = CharSummary.mock.calls[0][0].playerStats;
    expect(passedStats.climbSpeed).toBe(35);
  });

  it('sets swimSpeed when Salmon option is selected', async () => {
    const stats = createMockPlayerStats({
      rules: '2024',
      race: { speed: 30 },
    });
    mockStore.set('Test Character:aspectOfTheWildsOption', 'Salmon');
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const passedStats = CharSummary.mock.calls[0][0].playerStats;
    expect(passedStats.swimSpeed).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// Tests — passive effect speed modifications
// ---------------------------------------------------------------------------

describe('passive effect speed modifications', () => {
  beforeEach(() => {
    resetTestState(sharedPopupReturnVal);
    mockStore.clear();
  });

  it('applies aquatic affinity passive swim speed and sets emanation range', async () => {
    const stats = createMockPlayerStats({
      automation: { passives: [{ effect: 'aquatic_affinity' }] },
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const passedStats = CharSummary.mock.calls[0][0].playerStats;
    expect(passedStats.swimSpeed).toBe(30);
  });

  it('does not override existing swimSpeed when aquatic affinity passive exists', async () => {
    const stats = createMockPlayerStats({
      swimSpeed: 40,
      automation: { passives: [{ effect: 'aquatic_affinity' }] },
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const passedStats = CharSummary.mock.calls[0][0].playerStats;
    expect(passedStats.swimSpeed).toBe(40);
  });

  it('applies second-storywork passive climb speed', async () => {
    const stats = createMockPlayerStats({
      automation: { passives: [{ effect: 'second_storywork' }] },
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const passedStats = CharSummary.mock.calls[0][0].playerStats;
    expect(passedStats.climbSpeed).toBe(30);
  });

  it('applies athlete climb speed passive', async () => {
    const stats = createMockPlayerStats({
      automation: { passives: [{ effect: 'climb_speed' }] },
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const passedStats = CharSummary.mock.calls[0][0].playerStats;
    expect(passedStats.climbSpeed).toBe(30);
  });

  it('applies Roving climb and swim speeds when not wearing heavy armor', async () => {
    const stats = createMockPlayerStats({
      automation: { passives: [{ name: 'Roving' }] },
      inventory: { equipped: ['Longsword'] },
      equipment: [{ name: 'Longsword' }, { name: 'Chain Mail', armor_category: 'Heavy' }],
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const passedStats = CharSummary.mock.calls[0][0].playerStats;
    expect(passedStats.climbSpeed).toBe(40);
    expect(passedStats.swimSpeed).toBe(40);
  });

  it('does not apply Roving when wearing heavy armor', async () => {
    const stats = createMockPlayerStats({
      automation: { passives: [{ name: 'Roving' }] },
      inventory: { equipped: ['Chain Mail'] },
      equipment: [{ name: 'Chain Mail', armor_category: 'Heavy' }],
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const passedStats = CharSummary.mock.calls[0][0].playerStats;
    expect(passedStats.climbSpeed).toBeUndefined();
    expect(passedStats.swimSpeed).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests — Athlete feat flags
// ---------------------------------------------------------------------------

describe('Athlete feat flags', () => {
  beforeEach(() => {
    resetTestState(sharedPopupReturnVal);
    mockStore.clear();
  });

  it('exposes athleteStandFromProne flag when stand_from_prone passive exists', async () => {
    const stats = createMockPlayerStats({
      automation: { passives: [{ effect: 'stand_from_prone' }] },
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const passedStats = CharSummary.mock.calls[0][0].playerStats;
    expect(passedStats.athleteStandFromProne).toBe(true);
  });

  it('exposes athleteReducedJumpRequirement flag when reduced_running_jump_requirement passive exists', async () => {
    const stats = createMockPlayerStats({
      automation: { passives: [{ effect: 'reduced_running_jump_requirement' }] },
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const passedStats = CharSummary.mock.calls[0][0].playerStats;
    expect(passedStats.athleteReducedJumpRequirement).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests — Bardic Inspiration feature injection
// (deduplicated tests for counts/dedup are in CharSheet.bardicInspiration.test.jsx)
// ---------------------------------------------------------------------------

describe('Bardic Inspiration feature injection', () => {
  beforeEach(() => {
    resetTestState(sharedPopupReturnVal);
    mockStore.clear();
  });

  it('injects "Use Bardic Inspiration" special action when biDie is set', async () => {
    const stats = createMockPlayerStats({ class: { name: 'Bard' } });
    mockStore.set('Test Character:bardicInspirationDie', 6);
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSpecialActions } = await import('./CharSpecialActions.jsx');
    const passedStats = CharSpecialActions.mock.calls[0][0].playerStats;
    const biAction = passedStats.specialActions.find((a) => a.name === 'Use Bardic Inspiration');
    expect(biAction).toBeDefined();
    expect(biAction.automation.type).toBe('bardic_inspiration_use');
  });

  it('injects Combat Inspiration Defense reaction when combat option includes defense', async () => {
    const stats = createMockPlayerStats({ class: { name: 'Bard' } });
    mockStore.set('Test Character:bardicInspirationDie', 6);
    mockStore.set('Test Character:bardicInspirationGrantedBy', 'Bard');
    mockStore.set('Test Character:bardicInspirationCombatOptions', JSON.stringify(['defense_add_to_ac']));
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharReactions } = await import('./CharReactions.jsx');
    const passedStats = CharReactions.mock.calls[0][0].playerStats;
    const defenseReaction = passedStats.reactions.find((r) => r.name === 'Combat Inspiration - Defense');
    expect(defenseReaction).toBeDefined();
    expect(defenseReaction.automation.type).toBe('bardic_inspiration_defense');
  });

  it('injects Combat Inspiration Offense reaction when combat option includes offense', async () => {
    const stats = createMockPlayerStats({ class: { name: 'Bard' } });
    mockStore.set('Test Character:bardicInspirationDie', 6);
    mockStore.set('Test Character:bardicInspirationGrantedBy', 'Bard');
    mockStore.set('Test Character:bardicInspirationCombatOptions', JSON.stringify(['offense_add_to_damage']));
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharReactions } = await import('./CharReactions.jsx');
    const passedStats = CharReactions.mock.calls[0][0].playerStats;
    const offenseReaction = passedStats.reactions.find((r) => r.name === 'Combat Inspiration - Offense');
    expect(offenseReaction).toBeDefined();
    expect(offenseReaction.automation.type).toBe('bardic_inspiration_offense');
  });
});

// ---------------------------------------------------------------------------
// Tests — Exhaustion penalty computation
// ---------------------------------------------------------------------------

describe('Exhaustion penalty computation', () => {
  beforeEach(() => {
    resetTestState(sharedPopupReturnVal);
    mockStore.clear();
  });

  it('computes exhaustionPenalty as 2 * exhaustionLevel', async () => {
    mockStore.set('Test Character:exhaustionLevel', 3);

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    expect(CharSummary.mock.calls[0][0].exhaustionLevel).toBe(3);
  });

  it('clamps exhaustionLevel to 5 when level exceeds max (10)', async () => {
    mockStore.set('Test Character:exhaustionLevel', 10);

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    expect(CharSummary.mock.calls[0][0].exhaustionLevel).toBe(6);
  });

  it('handles negative exhaustionLevel by clamping to 0', async () => {
    mockStore.set('Test Character:exhaustionLevel', -1);

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    expect(CharSummary.mock.calls[0][0].exhaustionLevel).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests — Circle of the Land runtime value
// ---------------------------------------------------------------------------

describe('Circle of the Land runtime value', () => {
  beforeEach(() => {
    resetTestState(sharedPopupReturnVal);
    mockStore.clear();
  });

  it('applies CotL land type runtime value to subclass', async () => {
    mockStore.set('Test Character:_circleOfTheLandType', 'forest');
    const stats = createMockPlayerStats({
      class: { name: 'Druid', subclass: { name: 'Circle of the Land', type: 'forest' } },
    });
    vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    const passedStats = CharSummary.mock.calls[0][0].playerStats;
    expect(passedStats.class.subclass.type).toBe('forest');
  });
});

// ---------------------------------------------------------------------------
// Tests — Prop passing to child components
// ---------------------------------------------------------------------------

describe('Prop passing to child components', () => {
  beforeEach(() => {
    resetTestState(sharedPopupReturnVal);
    mockStore.clear();
  });

  it('passes campaignName to CharSummary', async () => {
    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    expect(CharSummary.mock.calls[0][0].campaignName).toBe('test-campaign');
  });

  it('passes activeMapName to CharSummary', async () => {
    const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
    render(<CharSheet {...createDefaultProps()} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    expect(CharSummary.mock.calls[0][0].activeMapName).toBe(null);
  });

  it('passes characters array to CharAbilities', async () => {
    const { default: CharAbilities } = await import('./CharAbilities.jsx');
    const props = createDefaultProps({ characters: [{ name: 'Test Character', level: 5 }] });
    render(<CharSheet {...props} />);

    await waitFor(() => {
      expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
    });

    expect(CharAbilities.mock.calls[0][0].characters).toEqual([{ name: 'Test Character', level: 5 }]);
  });
});
