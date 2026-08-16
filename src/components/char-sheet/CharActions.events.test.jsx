// @improved-by-ai
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharActions from './CharActions.jsx';
import { DiceRollContext } from '../../hooks/combat/DiceRollContext.js';
import useLoggedDiceRoll from '../../hooks/combat/useLoggedDiceRoll.js';

const _syncedStore = new Map();

vi.mock('../../hooks/runtime/useSyncedState.js', () => ({
  useSyncedState: vi.fn((_, key, defaultValue) => {
    const hasValue = _syncedStore.has(key);
    const value = hasValue ? _syncedStore.get(key) : defaultValue;
    const setter = vi.fn((newValue) => {
      _syncedStore.set(key, newValue);
    });
    return [value, setter];
  }),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(() => Promise.resolve()),
  getStore: vi.fn(() => _syncedStore),
  useSyncedState: vi.fn((_, key, defaultValue) => {
    const hasValue = _syncedStore.has(key);
    const value = hasValue ? _syncedStore.get(key) : defaultValue;
    const setter = vi.fn((newValue) => {
      _syncedStore.set(key, newValue);
    });
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
    pendingDamage: null,
    modalState: {},
    setModalState: vi.fn((state) => {
      _syncedStore.set('modalState', state);
    }),
    resolveAttackDamage: vi.fn(),
    handleMasteryClose: vi.fn(),
    handleWeaponMasteryChoice: vi.fn(),
    handleWeaponKindMasteryClose: vi.fn(),
    handleDivineFuryDamageType: vi.fn(),
    handleDivineFurySkip: vi.fn(),
    handleGenericDamageTypeChoice: vi.fn(),
    handleGenericDamageTypeSkip: vi.fn(),
    handleDamageTypeModifierChoice: vi.fn(),
    handleDamageTypeModifierSkip: vi.fn(),
    handleEnhancedUnarmedChoice: vi.fn(),
    handleEnhancedUnarmedSkip: vi.fn(),
    handleFeatureChoiceConfirm: vi.fn(),
    handleFeatureChoiceSkip: vi.fn(),
    handleConstellationSelect: vi.fn(),
    combatSuperiorityModal: null,
    setCombatSuperiorityModal: vi.fn(),
    handleCombatSuperiorityConfirm: vi.fn(),
    handleAttackRiderManeuverUse: vi.fn(),
    handleAttackRiderManeuverSkip: vi.fn(),
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

vi.mock('../../services/automation/common/savePrompt.js', () => ({
  createSaveListener: vi.fn(() => ({ promise: Promise.resolve({ success: false }) })),
}));

vi.mock('./useAttackDamageResolution.js', () => ({
  normalizeAutoDamage: vi.fn((autoDamage) => ({ attack: autoDamage, ctxOverrides: {} })),
}));

vi.mock('../../services/automation/contextBuilder.js', () => ({
  buildAttackContext: vi.fn(() => Promise.resolve({ hitBonus: 5 })),
  buildAttackContextSync: vi.fn(() => ({ hitBonus: 5 })),
}));

vi.mock('../../services/automation/handlers/buffs/tempHpService.js', () => ({
  setTempHp: vi.fn(),
}));

const basePlayerStats = {
  name: 'TestCharacter', rules: '5e', level: 5, attacks: [], actions: [],
  spellAbilities: { spells: [], toHit: 5, saveDc: 13 },
  abilities: [{ name: 'STR', bonus: 3 }], proficiency: 3,
};

function createStats(overrides = {}) {
  return { ...basePlayerStats, ...overrides };
}

function renderWithWrapper(component, wrapper) {
  return act(async () => render(component, { wrapper }));
}

function makeDefaultWrapper(mockSetPopupHtml) {
  return ({ children }) => (
    <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
      {children}
    </DiceRollContext.Provider>
  );
}

function makeWrapperWithPopupHtml(mockSetPopupHtml, popupHtmlValue) {
  return ({ children }) => (
    <DiceRollContext.Provider value={{ popupHtml: popupHtmlValue, setPopupHtml: mockSetPopupHtml }}>
      {children}
    </DiceRollContext.Provider>
  );
}

// Helper to dispatch a custom event on window
function dispatchCustomEvent(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

describe('CharActions window event listeners — integration behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    _syncedStore.clear();
    globalThis.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve([]) });
  });

  describe('healing-popup event listener', () => {
    it('displays healing popup content when healing-popup event fires', async () => {
      const mockSetPopupHtml = vi.fn();
      const wrapper = makeDefaultWrapper(mockSetPopupHtml);

      await renderWithWrapper(<CharActions playerStats={createStats()} />, wrapper);

      dispatchCustomEvent('healing-popup', {
        targetName: 'Ally1',
        healingName: 'Healing Word',
        rollInfo: '7+3',
        maximizeHealingDice: false,
        popupText: 'Restores hit points',
      });

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          '<b>Healing Word</b> on Ally1 [7+3]<br/><br/>Restores hit points'
        );
      });
    });

    it('includes maximized note when maximizeHealingDice is true', async () => {
      const mockSetPopupHtml = vi.fn();
      const wrapper = makeDefaultWrapper(mockSetPopupHtml);

      await renderWithWrapper(<CharActions playerStats={createStats()} />, wrapper);

      dispatchCustomEvent('healing-popup', {
        targetName: 'Ally2',
        healingName: 'Cure Wounds',
        rollInfo: null,
        maximizeHealingDice: true,
        popupText: 'Maximized healing',
      });

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          '<b>Cure Wounds</b> on Ally2 (maximized)<br/><br/>Maximized healing'
        );
      });
    });

    it('omits roll info brackets when rollInfo is null', async () => {
      const mockSetPopupHtml = vi.fn();
      const wrapper = makeDefaultWrapper(mockSetPopupHtml);

      await renderWithWrapper(<CharActions playerStats={createStats()} />, wrapper);

      dispatchCustomEvent('healing-popup', {
        targetName: 'Ally3',
        healingName: 'Lay on Hands',
        rollInfo: null,
        maximizeHealingDice: false,
        popupText: 'Heals wounds',
      });

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          '<b>Lay on Hands</b> on Ally3<br/><br/>Heals wounds'
        );
      });
    });

  });

  describe('damage-popup event listener', () => {
    it('displays damage popup content when damage-popup event fires', async () => {
      const mockSetPopupHtml = vi.fn();
      const wrapper = makeDefaultWrapper(mockSetPopupHtml);

      await renderWithWrapper(<CharActions playerStats={createStats()} />, wrapper);

      dispatchCustomEvent('damage-popup', {
        targetName: 'Goblin',
        spellName: 'Fire Bolt',
        popupText: 'Deals fire damage',
        rollInfo: '5+4',
      });

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          '<b>Fire Bolt</b> on Goblin [5+4]<br/><br/>Deals fire damage'
        );
      });
    });

    it('omits roll info brackets when rollInfo is null', async () => {
      const mockSetPopupHtml = vi.fn();
      const wrapper = makeDefaultWrapper(mockSetPopupHtml);

      await renderWithWrapper(<CharActions playerStats={createStats()} />, wrapper);

      dispatchCustomEvent('damage-popup', {
        targetName: 'Skeleton',
        spellName: 'Ray of Frost',
        popupText: 'Deals cold damage',
        rollInfo: null,
      });

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          '<b>Ray of Frost</b> on Skeleton<br/><br/>Deals cold damage'
        );
      });
    });

  });

  describe('inspiring-smite-pending event listener', () => {
    it('sets modal state with inspiringSmiteModal when event fires', async () => {
      const mockSetPopupHtml = vi.fn();
      const wrapper = makeDefaultWrapper(mockSetPopupHtml);

      await renderWithWrapper(<CharActions playerStats={createStats()} />, wrapper);

      dispatchCustomEvent('inspiring-smite-pending', {
        attackName: 'Longsword',
        bonusDamage: '1d6',
      });

      await waitFor(() => {
        expect(_syncedStore.get('modalState')).toEqual(
          expect.objectContaining({ inspiringSmiteModal: { attackName: 'Longsword', bonusDamage: '1d6' } })
        );
      });
    });
  });

  describe('soulstitch-modal-show event listener', () => {
    it('sets modal state with soulstitchSpellsModal when event fires', async () => {
      const mockSetPopupHtml = vi.fn();
      const wrapper = makeDefaultWrapper(mockSetPopupHtml);

      await renderWithWrapper(<CharActions playerStats={createStats()} />, wrapper);

      dispatchCustomEvent('soulstitch-modal-show', { spells: ['Magic Missile', 'Shield'] });

      await waitFor(() => {
        expect(_syncedStore.get('modalState')).toEqual(
          expect.objectContaining({ soulstitchSpellsModal: { spells: ['Magic Missile', 'Shield'] } })
        );
      });
    });
  });

  describe('potent-spellcasting-temp-hp event listener', () => {
    it('opens secondary target modal for temp HP selection when event fires', async () => {
      const mockSetPopupHtml = vi.fn();
      const wrapper = makeDefaultWrapper(mockSetPopupHtml);
      const mockGetCombatContext = vi.fn().mockResolvedValue({
        creatures: [
          { name: 'Ally1', type: 'player', currentHp: 15, maxHp: 20, size: 'Medium' },
          { name: 'Ally2', type: 'npc', currentHp: 8, maxHp: 12, size: 'Small' },
          { name: 'Goblin', type: 'monster', currentHp: 3, maxHp: 7, size: 'Small' },
        ],
      });

      // Replace the mocked getCombatContext with our resolving mock
      const { getCombatContext } = await import('../../services/rules/combat/damageUtils.js');
      getCombatContext.mockImplementation(mockGetCombatContext);

      await renderWithWrapper(<CharActions playerStats={createStats()} />, wrapper);

      dispatchCustomEvent('potent-spellcasting-temp-hp', {
        title: 'Potent Spellcasting',
        tempHp: 10,
        campaignName: 'test-campaign',
        attackerName: 'TestCharacter',
        confirmLabel: 'Grant Temp HP',
      });

      await waitFor(() => {
        const modalState = _syncedStore.get('modalState');
        expect(modalState).toEqual(
          expect.objectContaining({
            secondaryTargetModal: expect.objectContaining({
              title: 'Potent Spellcasting',
              confirmLabel: 'Grant Temp HP',
              onTargetSelected: expect.any(Function),
              onSkip: expect.any(Function),
            }),
          })
        );
        const targets = modalState.secondaryTargetModal.targets;
        expect(targets).toHaveLength(3);
        expect(targets[0].name).toBe('Ally1');
        expect(targets[0].type).toBe('player');
        expect(targets[1].name).toBe('Ally2');
        expect(targets[1].type).toBe('npc');
        expect(targets[2].name).toBe('Goblin');
        expect(targets[2].type).toBe('monster');
      });

      getCombatContext.mockRestore();
    });
  });

  describe('sweeping-attack-modal-show event listener', () => {
    it('sets modal state with sweepingAttackTargetModal when event fires', async () => {
      const mockSetPopupHtml = vi.fn();
      const wrapper = makeDefaultWrapper(mockSetPopupHtml);

      await renderWithWrapper(<CharActions playerStats={createStats()} />, wrapper);

      dispatchCustomEvent('sweeping-attack-modal-show', { attackName: 'Greatsword', targets: ['Goblin', 'Orc'] });

      await waitFor(() => {
        expect(_syncedStore.get('modalState')).toEqual(
          expect.objectContaining({ sweepingAttackTargetModal: { attackName: 'Greatsword', targets: ['Goblin', 'Orc'] } })
        );
      });
    });
  });

  describe('bait-and-switch-modal-show event listener', () => {
    it('sets modal state with baitAndSwitchChoiceModal when event fires', async () => {
      const mockSetPopupHtml = vi.fn();
      const wrapper = makeDefaultWrapper(mockSetPopupHtml);

      await renderWithWrapper(<CharActions playerStats={createStats()} />, wrapper);

      dispatchCustomEvent('bait-and-switch-modal-show', { attackName: 'Shortsword', options: ['Attack', 'Disengage'] });

      await waitFor(() => {
        expect(_syncedStore.get('modalState')).toEqual(
          expect.objectContaining({ baitAndSwitchChoiceModal: { attackName: 'Shortsword', options: ['Attack', 'Disengage'] } })
        );
      });
    });
  });

  describe('commander-strike-modal-show event listener', () => {
    it('sets modal state with commanderStrikeChoiceModal when event fires', async () => {
      const mockSetPopupHtml = vi.fn();
      const wrapper = makeDefaultWrapper(mockSetPopupHtml);

      await renderWithWrapper(<CharActions playerStats={createStats()} />, wrapper);

      dispatchCustomEvent('commander-strike-modal-show', { attackName: 'Longbow', allyName: 'Rogue' });

      await waitFor(() => {
        expect(_syncedStore.get('modalState')).toEqual(
          expect.objectContaining({ commanderStrikeChoiceModal: { attackName: 'Longbow', allyName: 'Rogue' } })
        );
      });
    });
  });

  describe('rally-choice-modal-show event listener', () => {
    it('sets modal state with rallyChoiceModal when event fires', async () => {
      const mockSetPopupHtml = vi.fn();
      const wrapper = makeDefaultWrapper(mockSetPopupHtml);

      await renderWithWrapper(<CharActions playerStats={createStats()} />, wrapper);

      dispatchCustomEvent('rally-choice-modal-show', { attackName: 'War Cry', rallyAmount: 5 });

      await waitFor(() => {
        expect(_syncedStore.get('modalState')).toEqual(
          expect.objectContaining({ rallyChoiceModal: { attackName: 'War Cry', rallyAmount: 5 } })
        );
      });
    });
  });

  describe('damage-type-skip event listener', () => {
    it('clears popupHtml when damage-type-skip fires and popupHtml.type is damage_type_choice', async () => {
      const mockSetPopupHtml = vi.fn();
      const popupHtmlValue = {
        type: 'damage_type_choice',
        bonusFormula: '1d6',
        bonusRolls: [3],
        bonusTotal: 3,
        usedKey: 'test_key',
        currentRound: 1,
        targetName: 'Goblin',
        attackerName: 'TestCharacter',
        name: 'Blessed Strikes',
      };
      const wrapper = makeWrapperWithPopupHtml(mockSetPopupHtml, popupHtmlValue);

      await renderWithWrapper(<CharActions playerStats={createStats()} />, wrapper);

      dispatchCustomEvent('damage-type-skip');

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(null);
      });
    });

    it('does not respond to damage-type-skip when popupHtml.type is not damage_type_choice', async () => {
      const mockSetPopupHtml = vi.fn();
      const wrapper = makeDefaultWrapper(mockSetPopupHtml);

      await renderWithWrapper(<CharActions playerStats={createStats()} />, wrapper);

      dispatchCustomEvent('damage-type-skip');

      await waitFor(() => {
        expect(mockSetPopupHtml).not.toHaveBeenCalled();
      });
    });
  });

  describe('damage-type-choice event listener', () => {
    it('calls rollDamage with chosen type and clears popupHtml when damage-type-choice fires', async () => {
      const mockSetPopupHtml = vi.fn();
      const mockRollDamage = vi.fn();
      const popupHtmlValue = {
        type: 'damage_type_choice',
        bonusFormula: '1d6',
        bonusRolls: [3],
        bonusTotal: 3,
        usedKey: 'test_key',
        currentRound: 1,
        targetName: 'Goblin',
        attackerName: 'TestCharacter',
        name: 'Blessed Strikes',
      };

      const wrapper = ({ children }) => (
        <DiceRollContext.Provider value={{ popupHtml: popupHtmlValue, setPopupHtml: mockSetPopupHtml }}>
          {children}
        </DiceRollContext.Provider>
      );

      // Replace the mocked rollDamage with our resolving mock
      useLoggedDiceRoll.mockReturnValue({
        popupHtml: null, setPopupHtml: mockSetPopupHtml, rollAttack: vi.fn(),
        rollDamage: mockRollDamage, rollSkillCheck: vi.fn(),
        rollAbilityCheck: vi.fn(), quickRollPlayerSave: vi.fn(),
      });

      await renderWithWrapper(<CharActions playerStats={createStats()} />, wrapper);

      dispatchCustomEvent('damage-type-choice', { chosenType: 'Radiant' });

      await waitFor(() => {
        expect(mockRollDamage).toHaveBeenCalledWith(
          'Blessed Strikes',
          '1d6',
          3,
          [3],
          0,
          expect.objectContaining({ damageType: 'Radiant', targetName: 'Goblin', attackerName: 'TestCharacter' })
        );
      });

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(null);
      });
    });

    it('does not respond to damage-type-choice when popupHtml.type is not damage_type_choice', async () => {
      const mockSetPopupHtml = vi.fn();
      const mockRollDamage = vi.fn();
      const wrapper = makeDefaultWrapper(mockSetPopupHtml);

      useLoggedDiceRoll.mockReturnValue({
        popupHtml: null, setPopupHtml: mockSetPopupHtml, rollAttack: vi.fn(),
        rollDamage: mockRollDamage, rollSkillCheck: vi.fn(),
        rollAbilityCheck: vi.fn(), quickRollPlayerSave: vi.fn(),
      });

      await renderWithWrapper(<CharActions playerStats={createStats()} />, wrapper);

      dispatchCustomEvent('damage-type-choice', { chosenType: 'Radiant' });

      await waitFor(() => {
        expect(mockRollDamage).not.toHaveBeenCalled();
        expect(mockSetPopupHtml).not.toHaveBeenCalled();
      });
    });
  });
});

describe('CharActions event listeners — cleanup behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    _syncedStore.clear();
    globalThis.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve([]) });
  });

  it('removes all event listeners on unmount', async () => {
    const mockSetPopupHtml = vi.fn();
    const mockSetModalState = vi.fn();
    const wrapper = ({ children }) => (
      <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
        {children}
      </DiceRollContext.Provider>
    );

    // Override setModalState to track calls directly
    const { default: useCharActionModals } = await import('./useCharActionModals.js');
    useCharActionModals.mockReturnValue({
      pendingDamage: null,
      modalState: {},
      setModalState: mockSetModalState,
      resolveAttackDamage: vi.fn(),
      handleMasteryClose: vi.fn(),
      handleWeaponMasteryChoice: vi.fn(),
      handleWeaponKindMasteryClose: vi.fn(),
      handleDivineFuryDamageType: vi.fn(),
      handleDivineFurySkip: vi.fn(),
      handleGenericDamageTypeChoice: vi.fn(),
      handleGenericDamageTypeSkip: vi.fn(),
      handleDamageTypeModifierChoice: vi.fn(),
      handleDamageTypeModifierSkip: vi.fn(),
      handleEnhancedUnarmedChoice: vi.fn(),
      handleEnhancedUnarmedSkip: vi.fn(),
      handleFeatureChoiceConfirm: vi.fn(),
      handleFeatureChoiceSkip: vi.fn(),
      handleConstellationSelect: vi.fn(),
      combatSuperiorityModal: null,
      setCombatSuperiorityModal: vi.fn(),
      handleAttackRiderManeuverUse: vi.fn(),
      handleAttackRiderManeuverSkip: vi.fn(),
      handleCombatSuperiorityConfirm: vi.fn(),
    });

    const { unmount } = await renderWithWrapper(<CharActions playerStats={createStats()} />, wrapper);

    await waitFor(() => {
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    unmount();

    // After unmount, dispatching events should not call any handlers
    dispatchCustomEvent('healing-popup', {
      targetName: 'Ally1',
      healingName: 'Healing Word',
      popupText: 'Should not appear',
    });

    dispatchCustomEvent('damage-popup', {
      targetName: 'Goblin',
      spellName: 'Fire Bolt',
      popupText: 'Should not appear',
    });

    dispatchCustomEvent('inspiring-smite-pending', {
      attackName: 'Longsword',
      bonusDamage: '1d6',
    });

    await waitFor(() => {
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
      expect(mockSetModalState).not.toHaveBeenCalled();
    });
  });
});
