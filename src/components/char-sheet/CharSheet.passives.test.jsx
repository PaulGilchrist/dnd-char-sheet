// @improved-by-ai
// ---------------------------------------------------------------------------
// CharSheet passives — behavior tests
// ---------------------------------------------------------------------------
// Tests the passive-effect computation block inside CharSheet that derives
// speed flags, swim/climb speeds, and special action injections from
// automation.passives and runtime values.
//
// Each test renders CharSheet and asserts the *computed playerStats* object
// that the component produces — this is the behavior, not the implementation.
// ---------------------------------------------------------------------------

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
// Tests — passive effects on playerStats
// ---------------------------------------------------------------------------

describe('passive effects on playerStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
    sharedPopupReturnVal.popupHtml = null;
    sharedPopupReturnVal.setPopupHtml = vi.fn();
    sharedPopupReturnVal.value = {};
  });

  describe('aquatic_affinity', () => {
    it('sets swimSpeed when the character has no existing swim speed', async () => {
      const stats = createMockPlayerStats({
        automation: { passives: [{ effect: 'aquatic_affinity' }] },
      });
      vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

      render(<CharSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
      const passedStats = CharSummary.mock.calls[0][0].playerStats;
      expect(passedStats.swimSpeed).toBe(30);
    });

    it('does not override existing swimSpeed', async () => {
      const stats = createMockPlayerStats({
        swimSpeed: 40,
        automation: { passives: [{ effect: 'aquatic_affinity' }] },
      });
      vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

      render(<CharSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
      const passedStats = CharSummary.mock.calls[0][0].playerStats;
      expect(passedStats.swimSpeed).toBe(40);
    });

    it('sets aquaticAffinityEmanationRange runtime value', async () => {
      const stats = createMockPlayerStats({
        automation: { passives: [{ effect: 'aquatic_affinity' }] },
      });
      vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

      render(<CharSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      expect(mockStore.get('Test Character:aquaticAffinityEmanationRange')).toBe(10);
    });
  });

  describe('second_storywork', () => {
    it('sets climbSpeed equal to base speed when no existing climb speed', async () => {
      const stats = createMockPlayerStats({
        automation: { passives: [{ effect: 'second_storywork' }] },
      });
      vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

      render(<CharSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
      const passedStats = CharSummary.mock.calls[0][0].playerStats;
      expect(passedStats.climbSpeed).toBe(30);
    });

    it('uses race.subrace.speed when available', async () => {
      const stats = createMockPlayerStats({
        race: { speed: 30, subrace: { speed: 35 } },
        automation: { passives: [{ effect: 'second_storywork' }] },
      });
      vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

      render(<CharSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
      const passedStats = CharSummary.mock.calls[0][0].playerStats;
      expect(passedStats.climbSpeed).toBe(35);
    });

    it('does not override existing climbSpeed', async () => {
      const stats = createMockPlayerStats({
        climbSpeed: 45,
        automation: { passives: [{ effect: 'second_storywork' }] },
      });
      vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

      render(<CharSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
      const passedStats = CharSummary.mock.calls[0][0].playerStats;
      expect(passedStats.climbSpeed).toBe(45);
    });
  });

  describe('climb_speed (Athlete feat)', () => {
    it('sets climbSpeed equal to speed when no existing climb speed', async () => {
      const stats = createMockPlayerStats({
        automation: { passives: [{ effect: 'climb_speed' }] },
      });
      vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

      render(<CharSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
      const passedStats = CharSummary.mock.calls[0][0].playerStats;
      expect(passedStats.climbSpeed).toBe(30);
    });

    it('does not override existing climbSpeed', async () => {
      const stats = createMockPlayerStats({
        climbSpeed: 45,
        automation: { passives: [{ effect: 'climb_speed' }] },
      });
      vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

      render(<CharSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
      const passedStats = CharSummary.mock.calls[0][0].playerStats;
      expect(passedStats.climbSpeed).toBe(45);
    });
  });

  describe('Roving (Ranger level 6)', () => {
    it('sets climbSpeed and swimSpeed + 10 when not wearing heavy armor', async () => {
      const stats = createMockPlayerStats({
        automation: { passives: [{ name: 'Roving' }] },
        inventory: { equipped: ['Longsword'] },
        equipment: [{ name: 'Longsword' }, { name: 'Chain Mail', armor_category: 'Heavy' }],
      });
      vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

      render(<CharSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
      const passedStats = CharSummary.mock.calls[0][0].playerStats;
      expect(passedStats.climbSpeed).toBe(40);
      expect(passedStats.swimSpeed).toBe(40);
    });

    it('does not set climb/swim speeds when wearing heavy armor', async () => {
      const stats = createMockPlayerStats({
        automation: { passives: [{ name: 'Roving' }] },
        inventory: { equipped: ['Chain Mail'] },
        equipment: [{ name: 'Chain Mail', armor_category: 'Heavy' }],
      });
      vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

      render(<CharSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
      const passedStats = CharSummary.mock.calls[0][0].playerStats;
      expect(passedStats.climbSpeed).toBeUndefined();
      expect(passedStats.swimSpeed).toBeUndefined();
    });

    it('does not override existing climb/swim speeds', async () => {
      const stats = createMockPlayerStats({
        climbSpeed: 50,
        swimSpeed: 55,
        automation: { passives: [{ name: 'Roving' }] },
        inventory: { equipped: ['Longsword'] },
        equipment: [{ name: 'Longsword' }],
      });
      vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

      render(<CharSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
      const passedStats = CharSummary.mock.calls[0][0].playerStats;
      expect(passedStats.climbSpeed).toBe(50);
      expect(passedStats.swimSpeed).toBe(55);
    });
  });

  describe('stand_from_prone (Athlete Hop Up)', () => {
    it('sets athleteStandFromProne flag on playerStats', async () => {
      const stats = createMockPlayerStats({
        automation: { passives: [{ effect: 'stand_from_prone' }] },
      });
      vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

      render(<CharSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
      const passedStats = CharSummary.mock.calls[0][0].playerStats;
      expect(passedStats.athleteStandFromProne).toBe(true);
    });
  });

  describe('reduced_running_jump_requirement (Athlete Jumping)', () => {
    it('sets athleteReducedJumpRequirement flag on playerStats', async () => {
      const stats = createMockPlayerStats({
        automation: { passives: [{ effect: 'reduced_running_jump_requirement' }] },
      });
      vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

      render(<CharSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
      const passedStats = CharSummary.mock.calls[0][0].playerStats;
      expect(passedStats.athleteReducedJumpRequirement).toBe(true);
    });
  });

  describe('Aspect of the Wilds (2024 ruleset)', () => {
    it('extends Darkvision range by 60 ft for Owl aspect', async () => {
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

      const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
      const passedStats = CharSummary.mock.calls[0][0].playerStats;
      const dv = passedStats.senses?.find((s) => s.name === 'Darkvision');
      expect(dv.value).toBe('120 ft.');
    });

    it('adds Darkvision 60 ft when Owl aspect and no existing Darkvision', async () => {
      const stats = createMockPlayerStats({
        rules: '2024',
      });
      vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));
      mockStore.set('Test Character:aspectOfTheWildsOption', 'Owl');

      render(<CharSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
      const passedStats = CharSummary.mock.calls[0][0].playerStats;
      const dv = passedStats.senses?.find((s) => s.name === 'Darkvision');
      expect(dv).toBeDefined();
      expect(dv.value).toBe('60 ft.');
    });

    it('sets climbSpeed for Panther aspect equal to race speed', async () => {
      const stats = createMockPlayerStats({
        rules: '2024',
      });
      vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));
      mockStore.set('Test Character:aspectOfTheWildsOption', 'Panther');

      render(<CharSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
      const passedStats = CharSummary.mock.calls[0][0].playerStats;
      expect(passedStats.climbSpeed).toBe(30);
    });

    it('sets swimSpeed for Salmon aspect equal to race speed', async () => {
      const stats = createMockPlayerStats({
        rules: '2024',
      });
      vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));
      mockStore.set('Test Character:aspectOfTheWildsOption', 'Salmon');

      render(<CharSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
      const passedStats = CharSummary.mock.calls[0][0].playerStats;
      expect(passedStats.swimSpeed).toBe(30);
    });

    it('does not apply Aspect of the Wilds for 5e ruleset', async () => {
      const stats = createMockPlayerStats({
        rules: '5e',
        senses: [{ name: 'Darkvision', value: '60 ft.' }],
      });
      vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));
      mockStore.set('Test Character:aspectOfTheWildsOption', 'Owl');

      render(<CharSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      const { default: CharSummary } = await import('./char-summary/CharSummary.jsx');
      const passedStats = CharSummary.mock.calls[0][0].playerStats;
      const dv = passedStats.senses?.find((s) => s.name === 'Darkvision');
      expect(dv.value).toBe('60 ft.');
    });
  });

  describe('Bardic Inspiration injection', () => {
    it('injects "Use Bardic Inspiration" special action when biDie is set', async () => {
      mockStore.set('Test Character:bardicInspirationDie', 8);
      const stats = createMockPlayerStats({
        specialActions: [],
      });
      vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

      render(<CharSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      const { default: CharSpecialActions } = await import('./CharSpecialActions.jsx');
      const passedStats = CharSpecialActions.mock.calls[0][0].playerStats;
      const biAction = passedStats.specialActions.find((a) => a.name === 'Use Bardic Inspiration');
      expect(biAction).toBeDefined();
      expect(biAction.automation.type).toBe('bardic_inspiration_use');
    });

    it('includes grantedBy in the special action description', async () => {
      mockStore.set('Test Character:bardicInspirationDie', 6);
      mockStore.set('Test Character:bardicInspirationGrantedBy', 'Felix the Bard');
      const stats = createMockPlayerStats({
        specialActions: [],
      });
      vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

      render(<CharSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      const { default: CharSpecialActions } = await import('./CharSpecialActions.jsx');
      const passedStats = CharSpecialActions.mock.calls[0][0].playerStats;
      const biAction = passedStats.specialActions.find((a) => a.name === 'Use Bardic Inspiration');
      expect(biAction.description).toContain('Felix the Bard');
    });

    it('does not duplicate the action if already present', async () => {
      mockStore.set('Test Character:bardicInspirationDie', 6);
      const stats = createMockPlayerStats({
        specialActions: [{ name: 'Use Bardic Inspiration', automation: { type: 'bardic_inspiration_use' } }],
      });
      vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

      render(<CharSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      const { default: CharSpecialActions } = await import('./CharSpecialActions.jsx');
      const passedStats = CharSpecialActions.mock.calls[0][0].playerStats;
      const biActions = passedStats.specialActions.filter((a) => a.name === 'Use Bardic Inspiration');
      expect(biActions.length).toBe(1);
    });

    it('does not inject when biDie is not set', async () => {
      const stats = createMockPlayerStats({
        specialActions: [],
      });
      vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

      render(<CharSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      const { default: CharSpecialActions } = await import('./CharSpecialActions.jsx');
      const passedStats = CharSpecialActions.mock.calls[0][0].playerStats;
      const biAction = passedStats.specialActions.find((a) => a.name === 'Use Bardic Inspiration');
      expect(biAction).toBeUndefined();
    });
  });

  describe('Combat Inspiration reactions', () => {
    it('injects Combat Inspiration Defense reaction when combat opt includes defense', async () => {
      mockStore.set('Test Character:bardicInspirationDie', 6);
      mockStore.set('Test Character:bardicInspirationGrantedBy', 'Bard');
      mockStore.set('Test Character:bardicInspirationCombatOptions', JSON.stringify(['defense_add_to_ac']));
      const stats = createMockPlayerStats({
        reactions: [],
      });
      vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

      render(<CharSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      const { default: CharReactions } = await import('./CharReactions.jsx');
      const passedStats = CharReactions.mock.calls[0][0].playerStats;
      const defenseReaction = passedStats.reactions.find((r) => r.name === 'Combat Inspiration - Defense');
      expect(defenseReaction).toBeDefined();
    });

    it('injects Combat Inspiration Offense reaction when combat opt includes offense', async () => {
      mockStore.set('Test Character:bardicInspirationDie', 6);
      mockStore.set('Test Character:bardicInspirationGrantedBy', 'Bard');
      mockStore.set('Test Character:bardicInspirationCombatOptions', JSON.stringify(['offense_add_to_damage']));
      const stats = createMockPlayerStats({
        reactions: [],
      });
      vi.mocked(rulesFactory.getPlayerStats).mockImplementation(() => Promise.resolve(stats));

      render(<CharSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      const { default: CharReactions } = await import('./CharReactions.jsx');
      const passedStats = CharReactions.mock.calls[0][0].playerStats;
      const offenseReaction = passedStats.reactions.find((r) => r.name === 'Combat Inspiration - Offense');
      expect(offenseReaction).toBeDefined();
    });
  });
});
