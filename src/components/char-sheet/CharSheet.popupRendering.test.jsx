// @improved-by-ai
// @cleaned-by-ai
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import CharSheet from './CharSheet';
import {
  createDefaultProps,
  createMockPlayerStats,
  createMockStore,
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
// Tests — popup rendering paths
// ---------------------------------------------------------------------------

describe('CharSheet popup rendering', () => {
  const defaultProps = createDefaultProps();

  beforeEach(() => {
    resetTestState(sharedPopupReturnValue);
    mockStore.clear();
  });

  function getRenderedComponent() {
    return render(<CharSheet {...defaultProps} />);
  }

  describe('null/absent popup', () => {
    it('renders char-sheet without a popup when popupHtml is null', async () => {
      sharedPopupReturnValue.popupHtml = null;
      getRenderedComponent();

      await waitFor(() => {
        expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('popup')).not.toBeInTheDocument();
    });
  });

  describe('popup rendering', () => {
    const popupCases = [
      { name: 'string popup', html: '<p>Some HTML content</p>', expectedText: 'Some HTML content' },
      { name: 'html-type popup', html: { html: '<span>dice roll result</span>' }, expectedText: 'dice roll result' },
      {
        name: 'automation_info popup',
        html: { type: 'automation_info', name: 'Test Feature', description: '<p>Feature description</p>' },
        expectedText: 'Test Feature',
        expectedDesc: 'Feature description',
      },
      { name: 'shield_of_faith_target_selection', html: { type: 'shield_of_faith_target_selection' }, expectedText: null },
      { name: 'barkskin_target_selection', html: { type: 'barkskin_target_selection' }, expectedText: null },
    ];

    for (const { name, html, expectedText, expectedDesc } of popupCases) {
      it(`renders ${name}`, async () => {
        sharedPopupReturnValue.popupHtml = html;
        getRenderedComponent();

        await waitFor(() => {
          if (expectedText) {
            expect(screen.getByTestId('popup')).toBeInTheDocument();
          } else {
            expect(screen.getByTestId('char-sheet')).toBeInTheDocument();
            expect(screen.queryByTestId('popup')).not.toBeInTheDocument();
          }
        });

        if (expectedText) {
          expect(screen.getByText(expectedText)).toBeInTheDocument();
        }
        if (expectedDesc) {
          expect(screen.getByText(expectedDesc)).toBeInTheDocument();
        }
      });
    }
  });

  describe('heal_multi popup', () => {
    it('renders a heal_multi popup with multi-target healing breakdown', async () => {
      sharedPopupReturnValue.popupHtml = {
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
      };
      getRenderedComponent();

      await waitFor(() => {
        expect(screen.getByTestId('popup')).toBeInTheDocument();
      });

      expect(screen.getByText('Healing Word')).toBeInTheDocument();
      expect(screen.getByText(/1d4\+2/)).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText(/Bonus: \+2 \(Spell Focus\)/)).toBeInTheDocument();
      expect(screen.getByText('Ally1')).toBeInTheDocument();
      expect(screen.getByText('Ally2')).toBeInTheDocument();
    });

    it('renders heal_multi popup without bonus when bonusHeal is zero', async () => {
      sharedPopupReturnValue.popupHtml = {
        type: 'heal_multi',
        name: 'Cure Wounds',
        formula: '1d8+1',
        rolls: [6],
        bonusHeal: 0,
        bonusHealDetail: '',
        results: [
          { targetName: 'Ally1', healAmount: 7, rolls: [6] },
        ],
      };
      getRenderedComponent();

      await waitFor(() => {
        expect(screen.getByTestId('popup')).toBeInTheDocument();
      });

      expect(screen.getByText('Cure Wounds')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.queryByText(/Bonus:/)).not.toBeInTheDocument();
    });
  });

  describe('AttackResultPopup fallback', () => {
    it('renders AttackResultPopup for unknown popup types', async () => {
      sharedPopupReturnValue.popupHtml = {
        type: 'attack',
        name: 'Longsword Attack',
        hit: true,
        damage: 8,
      };
      getRenderedComponent();

      await waitFor(() => {
        expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
      });

      expect(screen.getByText('Longsword Attack')).toBeInTheDocument();
    });

    it('renders AttackResultPopup with feature flags (superiority, bardic inspiration, empowered spell, piercer, savage attacker, tactical mind, dark ones luck, psi bolstered knack, bardic offense, stroke of luck)', async () => {
      const featureFlags = [
        { key: 'availableSuperiorityManeuvers', value: ['Trip Attack'] },
        { key: 'bardicInspiration', value: true },
        { key: 'empoweredSpell', value: true },
        { key: 'piercerPuncture', value: true },
        { key: 'savageAttacker', value: true },
        { key: 'tacticalMind', value: true },
        { key: 'darkOnesLuck', value: true },
        { key: 'psiBolsteredKnack', value: true },
        { key: 'bardicInspirationOffense', value: true },
        { key: 'strokeOfLuck', value: true },
      ];

      for (const { key, value } of featureFlags) {
        sharedPopupReturnValue.popupHtml = {
          type: 'attack',
          name: 'Test Attack',
          [key]: value,
        };
        getRenderedComponent();

        await waitFor(() => {
          expect(screen.getByTestId('attack-result-popup')).toBeInTheDocument();
        });

        cleanup();
      }
    });
  });
});
