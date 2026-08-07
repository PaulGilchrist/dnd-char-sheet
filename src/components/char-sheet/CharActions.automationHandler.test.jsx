import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharActions from './CharActions.jsx';
import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { DiceRollContext } from '../../hooks/combat/DiceRollContext.js';
import useLoggedDiceRoll from '../../hooks/combat/useLoggedDiceRoll.js';
import { hasAutomation } from '../../services/combat/automation/automationService.js';
import { executeHandler } from '../../services/automation/index.js';

const _syncedStore = new Map();

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(() => Promise.resolve()),
  getStore: vi.fn(() => _syncedStore),
  useSyncedState: vi.fn((_, key, defaultValue) => {
    const hasValue = _syncedStore.has(key);
    const value = hasValue ? _syncedStore.get(key) : defaultValue;
    const setter = vi.fn((newValue) => { _syncedStore.set(key, newValue); });
    return [value, setter];
  }),
  useRuntimeValue: vi.fn((_, key, _campaignName) => {
    const hasValue = _syncedStore.has(key);
    return hasValue ? _syncedStore.get(key) : null;
  }),
  listeners: new Map(),
}));

vi.mock('../../hooks/combat/useLoggedDiceRoll.js', () => ({
  default: vi.fn(() => ({
    popupHtml: null, setPopupHtml: vi.fn(), rollAttack: vi.fn(), rollDamage: vi.fn(),
    rollSkillCheck: vi.fn(), rollAbilityCheck: vi.fn(), quickRollPlayerSave: vi.fn(),
  })),
}));

vi.mock('../../services/automation/index.js', () => ({
  executeHandler: vi.fn(),
}));

vi.mock('../../services/combat/automation/automationService.js', () => ({
  hasAutomation: vi.fn(() => false),
  collectWeaponMastery: vi.fn(() => ({ baseMastery: null, extraMasteries: [] })),
  evaluateAutoExpression: vi.fn(() => null),
}));

vi.mock('../../hooks/combat/useActionSpellMetamagic.js', () => ({
  useActionSpellMetamagic: vi.fn(() => ({
    pendingActionMetamagic: null, handleActionMetamagicConfirm: vi.fn(), handleActionMetamagicSkip: vi.fn(),
    handleActionSpellDamageClick: vi.fn(), handleSpellAttackClick: vi.fn(), handleSpellDamageClick: vi.fn(),
  })),
}));

vi.mock('../../hooks/combat/useActionPopup.js', () => ({
  showWeaponMasteryPopup: vi.fn(),
  buildFeatureDetailHtml: vi.fn((entity) => {
    if (entity.details) return `<b>${entity.name}</b><br/>${entity.description}<br/><br/>${entity.details}`;
    return null;
  }),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../hooks/combat/useSpellMetamagicFlow.js', () => ({
  useSpellMetamagicFlow: vi.fn(() => ({
    pendingMetamagic: null, gateMetamagic: vi.fn(), handleConfirm: vi.fn(), handleSkip: vi.fn(),
    pendingAid: null, handleAidConfirm: vi.fn(), handleAidSkip: vi.fn(),
    pendingGreaterRestoration: null, handleGreaterRestorationConfirm: vi.fn(), handleGreaterRestorationSkip: vi.fn(),
    pendingRemoveCurse: null, handleRemoveCurseConfirm: vi.fn(), handleRemoveCurseSkip: vi.fn(),
  })),
}));

vi.mock('../../hooks/combat/useSpellUpcastFlow.js', () => ({
  useSpellUpcastFlow: vi.fn(() => ({ buildUpcastLevels: vi.fn(() => []) })),
}));

vi.mock('../../services/automation/handlers/combat/saveAttackHandler.js', () => ({
  isExhausted: vi.fn(() => false),
}));

vi.mock('../../services/combat/buffs/buffService.js', () => ({
  getInnateSorceryBonus: vi.fn(() => ({ saveDcBonus: 0 })),
}));

vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getTargetFromAttacker: vi.fn(() => null),
  getCombatContext: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/ui/sanitize.js', () => ({
  sanitizeHtml: vi.fn((html) => html),
}));

vi.mock('../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => ({ creatures: [] })),
  getCurrentCombatRound: vi.fn(() => 1),
  getActiveCreatureName: vi.fn(() => 'TestCharacter'),
  loadCombatSummary: vi.fn(() => Promise.resolve({ lastAttack: null })),
}));

vi.mock('../../services/npcs/monsterUtils.js', () => ({
  getMonsterData: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/rules/core/attackCalc.js', () => ({
  parseMagicItemName: vi.fn((name) => ({ baseName: name })),
}));

vi.mock('../../services/character/classFeatures.js', () => ({
  getClassFeatures: vi.fn(() => ({ maxFocusPoints: 2 })),
}));

vi.mock('../../services/character/featRangeService.js', () => ({
  computeFeatRangeEffects: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/dice/diceRoller.js', () => ({
  rollExpression: vi.fn(() => ({ total: 5, rolls: [3, 2], modifier: 0 })),
  rollExpressionDoubled: vi.fn(() => ({ total: 10, rolls: [3, 2, 3, 2], modifier: 0 })),
}));

vi.mock('../../services/rules/features/friendsService.js', () => ({
  endFriendsOnHostileAction: vi.fn(),
}));

vi.mock('../../services/rules/features/invisibilityService.js', () => ({
  endInvisibilityOnHostileAction: vi.fn(),
}));

vi.mock('./useInitiativeEffects.js', () => ({
  default: vi.fn(),
}));

vi.mock('./CharBonusActions.jsx', () => ({
  default: vi.fn(() => <div data-testid="char-bonus-actions">CharBonusActions</div>),
}));

vi.mock('./CharActionModals.jsx', () => ({
  default: vi.fn(() => <div data-testid="char-action-modals">CharActionModals</div>),
}));

vi.mock('./CharActionSpellPopups.jsx', () => ({
  default: vi.fn(() => <div data-testid="char-action-spell-popups">CharActionSpellPopups</div>),
}));

vi.mock('./useCharActionModals.js', () => ({
  default: vi.fn(() => ({
    pendingDamage: null, modalState: {}, setModalState: vi.fn(),
    resolveAttackDamage: vi.fn(), handleMasteryClose: vi.fn(), handleWeaponMasteryChoice: vi.fn(),
    handleWeaponKindMasteryClose: vi.fn(), handleDivineFuryDamageType: vi.fn(), handleDivineFurySkip: vi.fn(),
    handleGenericDamageTypeChoice: vi.fn(), handleGenericDamageTypeSkip: vi.fn(),
    handleDamageTypeModifierChoice: vi.fn(), handleDamageTypeModifierSkip: vi.fn(),
    handleEnhancedUnarmedChoice: vi.fn(), handleEnhancedUnarmedSkip: vi.fn(),
    handleFeatureChoiceConfirm: vi.fn(), handleFeatureChoiceSkip: vi.fn(),
    handleConstellationSelect: vi.fn(),
    combatSuperiorityModal: null, setCombatSuperiorityModal: vi.fn(),
    handleCombatSuperiorityConfirm: vi.fn(), handleAttackRiderManeuverUse: vi.fn(), handleAttackRiderManeuverSkip: vi.fn(),
  })),
}));

vi.mock('./modals/shared/SecondaryTargetModal.jsx', () => ({
  default: vi.fn(() => <div data-testid="secondary-target-modal">SecondaryTargetModal</div>),
}));

vi.mock('./modals/TacticalMasterModal.jsx', () => ({
  default: vi.fn(() => <div data-testid="tactical-master-modal">TacticalMasterModal</div>),
}));

vi.mock('../../services/automation/handlers/combat/weaponMasteryHandler.js', () => ({
  applyMasteryEffect: vi.fn(() => Promise.resolve()),
}));

vi.mock('./useAttackDamageResolution.js', () => ({
  normalizeAutoDamage: vi.fn((autoDamage) => ({ attack: autoDamage, ctxOverrides: {} })),
}));

vi.mock('../../services/automation/contextBuilder.js', () => ({
  buildAttackContext: vi.fn(() => Promise.resolve({ hitBonus: 5 })),
  buildAttackContextSync: vi.fn(() => ({ hitBonus: 5 })),
}));

const basePlayerStats = {
  name: 'TestCharacter', rules: '5e', level: 5, attacks: [], actions: [],
  spellAbilities: { spells: [], toHit: 5, saveDc: 13 },
  abilities: [{ name: 'STR', bonus: 3 }], proficiency: 3,
};

function createStats(overrides = {}) {
  return { ...basePlayerStats, ...overrides };
}

describe('CharActions automation action handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    _syncedStore.clear();
    globalThis.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve([]) });
    getRuntimeValue.mockImplementation(() => null);
    hasAutomation.mockImplementation(() => false);
  });

  describe('handleAutomationAction: result type popup', () => {
    it('shows popup payload when executeHandler returns type popup', async () => {
      hasAutomation.mockReturnValue(true);
      executeHandler.mockResolvedValue({ type: 'popup', payload: '<div>Test popup</div>' });

      const mockSetPopupHtml = vi.fn();
      const wrapper = ({ children }) => (
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          {children}
        </DiceRollContext.Provider>
      );

      const stats = createStats({
        actions: [{ name: 'Test Action', description: 'Does something.', automation: { type: 'auto_effect' } }],
      });

      await act(async () => { render(<CharActions playerStats={stats} campaignName="my-campaign" />, { wrapper }); });
      const actionEl = screen.getByText(/Test Action:/);
      await act(async () => { fireEvent.click(actionEl); });

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith('<div>Test popup</div>');
      });
    });
  });

  describe('handleAutomationAction: result type roll', () => {
    it('dispatches rollDamage when executeHandler returns type roll with damage', async () => {
      hasAutomation.mockReturnValue(true);
      executeHandler.mockResolvedValue({
        type: 'roll',
        payload: {
          rollType: 'damage',
          name: 'Thunderwave',
          formula: '2d8',
          total: 10,
          rolls: [5, 5],
          modifier: 0,
          contextConfig: {},
        },
      });

      const mockSetPopupHtml = vi.fn();
      const mockRollDamage = vi.fn();
      useLoggedDiceRoll.mockReturnValue({
        popupHtml: null, setPopupHtml: mockSetPopupHtml, rollAttack: vi.fn(), rollDamage: mockRollDamage,
        rollSkillCheck: vi.fn(), rollAbilityCheck: vi.fn(), quickRollPlayerSave: vi.fn(),
      });

      const stats = createStats({
        actions: [{ name: 'Thunderwave', description: 'Blast yourself.', automation: { type: 'auto_effect' } }],
      });

      await act(async () => { render(<CharActions playerStats={stats} campaignName="my-campaign" />); });
      const actionEl = screen.getByText(/Thunderwave:/);
      await act(async () => { fireEvent.click(actionEl); });

      await waitFor(() => {
        expect(mockRollDamage).toHaveBeenCalledWith('Thunderwave', '2d8', 10, [5, 5], 0, {});
      });
    });
  });

  describe('handleAutomationAction: result type attack_roll', () => {
    it('dispatches rollAttack when executeHandler returns type attack_roll', async () => {
      hasAutomation.mockReturnValue(true);
      executeHandler.mockResolvedValue({
        type: 'attack_roll',
        payload: {
          attack: { name: 'Piercing Spray', hitBonus: 7, autoDamageFormula: '2d6', autoDamageName: 'Piercing Spray', damageType: 'Piercing' },
          targetName: 'Goblin',
        },
      });

      const mockRollAttack = vi.fn();
      useLoggedDiceRoll.mockReturnValue({
        popupHtml: null, setPopupHtml: vi.fn(), rollAttack: mockRollAttack, rollDamage: vi.fn(),
        rollSkillCheck: vi.fn(), rollAbilityCheck: vi.fn(), quickRollPlayerSave: vi.fn(),
      });

      const stats = createStats({
        actions: [{ name: 'Piercing Spray', description: 'Shoot needles.', automation: { type: 'auto_effect' } }],
      });

      await act(async () => { render(<CharActions playerStats={stats} campaignName="my-campaign" />); });
      const actionEl = screen.getByText(/Piercing Spray:/);
      await act(async () => { fireEvent.click(actionEl); });

      await waitFor(() => {
        expect(mockRollAttack).toHaveBeenCalledWith('Piercing Spray', 7, expect.objectContaining({
          targetName: 'Goblin', forcedMode: undefined, isOpportunityAttack: false,
          autoDamageFormula: '2d6', autoDamageName: 'Piercing Spray', damageType: 'Piercing',
        }));
      });
    });
  });

  describe('handleAutomationAction: result type notify_buffs_changed', () => {
    it('calls onBuffsChange when executeHandler returns notify_buffs_changed', async () => {
      hasAutomation.mockReturnValue(true);
      executeHandler.mockResolvedValue({ type: 'notify_buffs_changed' });

      const mockOnBuffsChange = vi.fn();
      const stats = createStats({
        actions: [{ name: 'Test Action', description: 'Changes buffs.', automation: { type: 'auto_effect' } }],
      });

      await act(async () => { render(<CharActions playerStats={stats} onBuffsChange={mockOnBuffsChange} />); });
      const actionEl = screen.getByText(/Test Action:/);
      await act(async () => { fireEvent.click(actionEl); });

      await waitFor(() => {
        expect(mockOnBuffsChange).toHaveBeenCalled();
      });
    });
  });

  describe('handleAutomationAction: trigger conditions', () => {
    it('shows error popup when trigger is after_casting_action_spell and no lastActionSpellCast', async () => {
      hasAutomation.mockReturnValue(true);
      executeHandler.mockResolvedValue({ type: 'popup', payload: 'Should not reach' });

      const mockSetPopupHtml = vi.fn();
      const wrapper = ({ children }) => (
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          {children}
        </DiceRollContext.Provider>
      );

      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'lastActionSpellCast') return null;
        return null;
      });

      const stats = createStats({
        actions: [{ name: 'Erupting Flames', description: 'Flames erupt.', automation: { type: 'auto_effect', trigger: 'after_casting_action_spell' } }],
      });

      await act(async () => { render(<CharActions playerStats={stats} campaignName="my-campaign" />, { wrapper }); });
      const actionEl = screen.getByText(/Erupting Flames:/);
      await act(async () => { fireEvent.click(actionEl); });

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(expect.stringContaining('You must cast a spell'));
        expect(executeHandler).not.toHaveBeenCalled();
      });
    });

    it('proceeds to executeHandler when trigger condition is met', async () => {
      hasAutomation.mockReturnValue(true);
      executeHandler.mockResolvedValue({ type: 'popup', payload: 'Success' });

      const mockSetPopupHtml = vi.fn();
      const wrapper = ({ children }) => (
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          {children}
        </DiceRollContext.Provider>
      );

      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'lastActionSpellCast') return 'Fireball';
        return null;
      });

      const stats = createStats({
        actions: [{ name: 'Erupting Flames', description: 'Flames erupt.', automation: { type: 'auto_effect', trigger: 'after_casting_action_spell' } }],
      });

      await act(async () => { render(<CharActions playerStats={stats} campaignName="my-campaign" />, { wrapper }); });
      const actionEl = screen.getByText(/Erupting Flames:/);
      await act(async () => { fireEvent.click(actionEl); });

      await waitFor(() => {
        expect(executeHandler).toHaveBeenCalled();
      });
    });
  });

  describe('handleAutomationAction: logEntries', () => {
    it('adds log entries from executeHandler result', async () => {
      hasAutomation.mockReturnValue(true);
      executeHandler.mockResolvedValue({
        type: 'popup',
        payload: 'Done',
        logEntries: [
          { type: 'ability_use', characterName: 'TestCharacter', abilityName: 'Test Action', description: 'Test log entry' },
        ],
      });

      const mockSetPopupHtml = vi.fn();
      const wrapper = ({ children }) => (
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          {children}
        </DiceRollContext.Provider>
      );

      const stats = createStats({
        actions: [{ name: 'Test Action', description: 'Logs things.', automation: { type: 'auto_effect' } }],
      });

      await act(async () => { render(<CharActions playerStats={stats} campaignName="my-campaign" />, { wrapper }); });
      const actionEl = screen.getByText(/Test Action:/);
      await act(async () => { fireEvent.click(actionEl); });

      await waitFor(() => {
        expect(executeHandler).toHaveBeenCalled();
      });
    });

    it('does nothing when executeHandler returns null', async () => {
      hasAutomation.mockReturnValue(true);
      executeHandler.mockResolvedValue(null);

      const mockSetPopupHtml = vi.fn();
      const wrapper = ({ children }) => (
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          {children}
        </DiceRollContext.Provider>
      );

      const stats = createStats({
        actions: [{ name: 'Test Action', description: 'Returns nothing.', automation: { type: 'auto_effect' } }],
      });

      await act(async () => { render(<CharActions playerStats={stats} campaignName="my-campaign" />, { wrapper }); });
      const actionEl = screen.getByText(/Test Action:/);
      await act(async () => { fireEvent.click(actionEl); });

      expect(mockSetPopupHtml).not.toHaveBeenCalled();
    });
  });

  describe('handleAutomationAction: cannotAct guard', () => {
    it('does nothing when cannotAct is true', async () => {
      hasAutomation.mockReturnValue(true);
      executeHandler.mockResolvedValue({ type: 'popup', payload: 'Should not reach' });

      const mockSetPopupHtml = vi.fn();
      const wrapper = ({ children }) => (
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          {children}
        </DiceRollContext.Provider>
      );

      const stats = createStats({
        actions: [{ name: 'Test Action', description: 'Blocked.', automation: { type: 'auto_effect' } }],
      });

      await act(async () => { render(<CharActions playerStats={stats} campaignName="my-campaign" cannotAct={true} />, { wrapper }); });
      const actionEl = screen.getByText(/Test Action:/);
      await act(async () => { fireEvent.click(actionEl); });

      expect(executeHandler).not.toHaveBeenCalled();
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
    });
  });

  describe('handleAutomationAction: cloak_of_shadows check', () => {
    it('reads activeBuffs for cloak_of_shadows effect', async () => {
      hasAutomation.mockReturnValue(true);
      executeHandler.mockResolvedValue({ type: 'popup', payload: 'Shadow Flurry' });

      const mockSetPopupHtml = vi.fn();
      const wrapper = ({ children }) => (
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          {children}
        </DiceRollContext.Provider>
      );

      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ effect: 'cloak_of_shadows' }];
        return null;
      });

      const stats = createStats({
        actions: [{ name: 'Flurry of Blows', description: 'Ki flurry.', automation: { type: 'auto_effect' } }],
      });

      await act(async () => { render(<CharActions playerStats={stats} campaignName="my-campaign" />, { wrapper }); });
      const actionEl = screen.getByText(/Flurry of Blows:/);
      await act(async () => { fireEvent.click(actionEl); });

      await waitFor(() => {
        expect(executeHandler).toHaveBeenCalled();
      });
    });
  });
});
