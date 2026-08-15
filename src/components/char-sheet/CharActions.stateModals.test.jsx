// @improved-by-ai
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharActions from './CharActions.jsx';

const _syncedStore = new Map();

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(() => Promise.resolve()),
  getStore: vi.fn(() => _syncedStore),
  useSyncedState: vi.fn((_, key, defaultValue) => {
    const hasValue = _syncedStore.has(key);
    const value = hasValue ? _syncedStore.get(key) : defaultValue;
    const setter = vi.fn((newValue) => {
      _syncedStore.set(key, typeof newValue === 'function' ? newValue(_syncedStore.get(key)) : newValue);
    });
    return [value, setter];
  }),
  useRuntimeValue: vi.fn((_, key, _campaignName) => {
    const hasValue = _syncedStore.has(key);
    return hasValue ? _syncedStore.get(key) : null;
  }),
  listeners: new Map(),
}));

vi.mock('../../hooks/runtime/useSyncedState.js', () => ({
  useSyncedState: vi.fn((_, key, defaultValue) => {
    const hasValue = _syncedStore.has(key);
    const value = hasValue ? _syncedStore.get(key) : defaultValue;
    const setter = vi.fn((newValue) => {
      _syncedStore.set(key, typeof newValue === 'function' ? newValue(_syncedStore.get(key)) : newValue);
    });
    return [value, setter];
  }),
}));

vi.mock('../../hooks/combat/useLoggedDiceRoll.js', () => ({
  default: vi.fn(() => ({
    popupHtml: null, setPopupHtml: vi.fn(), rollAttack: vi.fn(), rollDamage: vi.fn(),
    rollSkillCheck: vi.fn(), rollAbilityCheck: vi.fn(), quickRollPlayerSave: vi.fn(),
  })),
}));

vi.mock('../../hooks/combat/DiceRollContext.js', () => ({
  useDiceRollPopup: vi.fn(() => ({ popupHtml: null, setPopupHtml: vi.fn() })),
}));

vi.mock('../../services/automation/index.js', () => ({
  executeHandler: vi.fn(),
}));

vi.mock('../../services/combat/automation/automationService.js', () => ({
  hasAutomation: vi.fn(() => false),
  collectWeaponMastery: vi.fn(() => ({ baseMastery: null, extraMasteries: [] })),
  evaluateAutoExpression: vi.fn(() => null),
}));

vi.mock('../../services/automation/handlers/combat/saveAttackHandler.js', () => ({
  isExhausted: vi.fn(() => false),
}));

vi.mock('../../services/automation/handlers/class-cleric-paladin/divineInterventionHandler.js', () => ({
  onSpellSelected: vi.fn(),
}));

vi.mock('../../hooks/combat/useMetamagic.js', () => ({
  getCurrentSorceryPoints: vi.fn(() => 10),
  getMaxSorceryPoints: vi.fn(() => 10),
  spendSorceryPoints: vi.fn(),
}));

vi.mock('../../hooks/combat/useSpellMetamagicFlow.js', () => ({
  useSpellMetamagicFlow: vi.fn(() => ({
    pendingMetamagic: null, gateMetamagic: vi.fn(), handleConfirm: vi.fn(), handleSkip: vi.fn(),
    pendingAid: null, handleAidConfirm: vi.fn(), handleAidSkip: vi.fn(),
    pendingGreaterRestoration: null, handleGreaterRestorationConfirm: vi.fn(), handleGreaterRestorationSkip: vi.fn(),
    pendingRemoveCurse: null, handleRemoveCurseConfirm: vi.fn(), handleRemoveCurseSkip: vi.fn(),
    pendingBane: null, handleBaneConfirm: vi.fn(), handleBaneSkip: vi.fn(),
    pendingBless: null, handleBlessConfirm: vi.fn(), handleBlessSkip: vi.fn(),
    pendingFaerieFire: null, handleFaerieFireConfirm: vi.fn(), handleFaerieFireSkip: vi.fn(),
    pendingBeaconOfHope: null, handleBeaconOfHopeConfirm: vi.fn(), handleBeaconOfHopeSkip: vi.fn(),
    pendingPassWithoutTrace: null, handlePassWithoutTraceConfirm: vi.fn(), handlePassWithoutTraceSkip: vi.fn(),
    pendingHaste: null, handleHasteConfirm: vi.fn(), handleHasteSkip: vi.fn(),
    pendingBarkskin: null, handleBarkskinConfirm: vi.fn(), handleBarkskinSkip: vi.fn(),
    pendingHeal: null, handleHealConfirm: vi.fn(), handleHealSkip: vi.fn(),
    pendingMagicMissile: null, handleMagicMissileConfirm: vi.fn(), handleMagicMissileSkip: vi.fn(),
    pendingMageArmor: null, handleMageArmorConfirm: vi.fn(), handleMageArmorSkip: vi.fn(),
    pendingCureWounds: null, handleCureWoundsConfirm: vi.fn(), handleCureWoundsSkip: vi.fn(),
    pendingRevivify: null, handleRevivifyConfirm: vi.fn(), handleRevivifySkip: vi.fn(),
  })),
}));

vi.mock('../../hooks/combat/useSpellUpcastFlow.js', () => ({
  useSpellUpcastFlow: vi.fn(() => ({ buildUpcastLevels: vi.fn(() => []) })),
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
    if (entity.details) {
      return `<b>${entity.name}</b><br/>${entity.description}<br/><br/>${entity.details}`;
    }
    return null;
  }),
}));

vi.mock('../../services/combat/buffs/buffService.js', () => ({
  getInnateSorceryBonus: vi.fn((_playerName, _campaignName) => ({ saveDcBonus: 0 })),
}));

vi.mock('../../services/maps/mapsService.js', () => ({
  loadMapData: vi.fn(() => Promise.resolve({})),
}));

vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getTargetFromAttacker: vi.fn(() => null),
  getCombatContext: vi.fn(() => Promise.resolve(null)),
  getAttackerTargetName: vi.fn(() => null),
}));

vi.mock('../../services/rules/combat/rangeValidation.js', () => ({
  getNearestPlacedItem: vi.fn(() => null),
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

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/rules/core/attackCalc.js', () => ({
  parseMagicItemName: vi.fn((name) => ({ baseName: name })),
  resolveSpellDamageAtLevel: vi.fn(() => '8d6'),
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
  applyMasteryEffect: vi.fn(() => Promise.resolve({})),
}));

vi.mock('./useAttackDamageResolution.js', () => ({
  normalizeAutoDamage: vi.fn((autoDamage) => ({ attack: autoDamage, ctxOverrides: {} })),
}));

vi.mock('../../services/automation/contextBuilder.js', () => ({
  buildAttackContext: vi.fn(() => Promise.resolve({ hitBonus: 5 })),
  buildAttackContextSync: vi.fn(() => ({ hitBonus: 5 })),
}));

vi.mock('../../services/rules/core/spellDamageUtils.js', () => ({
  resolveSpellDamageAtLevel: vi.fn(() => ''),
  isAutoHitSpell: vi.fn(() => false),
  resolveHealExpression: vi.fn(() => null),
}));

vi.mock('../../services/ui/formatUtils.js', () => ({
  formatRange: vi.fn((r) => r || '0'),
  signFormatter: new Intl.NumberFormat('en-US', { sign: 'always' }),
  getAttackSpellLevel: vi.fn(() => null),
}));

vi.mock('../../services/ui/spellSectionUtils.js', () => ({
  getActionSpellNames: vi.fn(() => new Set()),
}));

vi.mock('../../services/character/featureCategories.js', () => ({
  getCategories: vi.fn(() => ({ featuresToIgnore: [] })),
}));

vi.mock('../../hooks/combat/useSimpleDamageRoll.js', () => ({
  useSimpleDamageRoll: vi.fn(() => vi.fn()),
}));

vi.mock('../../hooks/combat/useSpellPositionResolver.js', () => ({
  useSpellPositionResolver: vi.fn(() => ({
    resolvePositions: vi.fn(() => Promise.resolve()),
    cachedPosRef: { current: null },
  })),
}));

vi.mock('../../hooks/combat/useSpellCastExecutor.js', () => ({
  useSpellCastExecutor: vi.fn(() => ({
    castAction: vi.fn(),
  })),
}));

vi.mock('../../services/combat/weaponMasteryUtils.js', () => ({
  getWeaponMastery: vi.fn(() => null),
}));

vi.mock('../../services/automation/common/savePrompt.js', () => ({
  createSaveListener: vi.fn(() => ({ promise: Promise.resolve({ success: false }) })),
}));

import { hasAutomation } from '../../services/combat/automation/automationService.js';

const basePlayerStats = {
  name: 'TestCharacter',
  rules: '5e',
  level: 5,
  attacks: [],
  actions: [],
  spellAbilities: { spells: [] },
};

function createStats(overrides = {}) {
  return { ...basePlayerStats, ...overrides };
}

describe('CharActions feature choice modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _syncedStore.clear();
    localStorage.clear();
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve([]),
    });
  });

  const featureChoiceCases = [
    {
      name: 'Blessed Strikes',
      automation: { type: 'damage_bonus', options: ['Lightning', 'Thunder'] },
      actionText: 'Blessed Strikes:',
    },
    {
      name: 'Defensive Tactics',
      automation: { type: 'defensive_tactics' },
      actionText: 'Defensive Tactics:',
    },
  ];

  it.each(featureChoiceCases)(
    'calls setModalState with featureChoice when clicking action with automation type $automation.type',
    async ({ name, automation, actionText }) => {
      hasAutomation.mockReturnValue(true);

      const mockSetModalState = vi.fn();
      (await import('./useCharActionModals.js')).default.mockReturnValue({
        pendingDamage: null, modalState: {}, setModalState: mockSetModalState,
        resolveAttackDamage: vi.fn(), handleMasteryClose: vi.fn(), handleWeaponMasteryChoice: vi.fn(),
        handleWeaponKindMasteryClose: vi.fn(), handleDivineFuryDamageType: vi.fn(), handleDivineFurySkip: vi.fn(),
        handleGenericDamageTypeChoice: vi.fn(), handleGenericDamageTypeSkip: vi.fn(),
        handleDamageTypeModifierChoice: vi.fn(), handleDamageTypeModifierSkip: vi.fn(),
        handleEnhancedUnarmedChoice: vi.fn(), handleEnhancedUnarmedSkip: vi.fn(),
        handleFeatureChoiceConfirm: vi.fn(), handleFeatureChoiceSkip: vi.fn(),
        handleConstellationSelect: vi.fn(),
        combatSuperiorityModal: null, setCombatSuperiorityModal: vi.fn(),
        handleCombatSuperiorityConfirm: vi.fn(), handleAttackRiderManeuverUse: vi.fn(), handleAttackRiderManeuverSkip: vi.fn(),
      });

      const stats = createStats({
        actions: [{ name, description: 'Choose an option.', automation }],
      });

      await act(async () => {
        render(<CharActions playerStats={stats} />);
      });

      expect(screen.getByText(actionText)).toBeInTheDocument();

      const actionLink = screen.getByText(actionText);
      await act(async () => { fireEvent.click(actionLink); });

      await waitFor(() => {
        expect(mockSetModalState).toHaveBeenCalledWith(
          expect.objectContaining({ featureChoice: expect.objectContaining({ action: expect.objectContaining({ name }) }) })
        );
      });
    }
  );

  it('does not call setModalState when cannotAct is true', async () => {
    hasAutomation.mockReturnValue(true);

    const mockSetModalState = vi.fn();
    (await import('./useCharActionModals.js')).default.mockReturnValue({
      pendingDamage: null, modalState: {}, setModalState: mockSetModalState,
      resolveAttackDamage: vi.fn(), handleMasteryClose: vi.fn(), handleWeaponMasteryChoice: vi.fn(),
      handleWeaponKindMasteryClose: vi.fn(), handleDivineFuryDamageType: vi.fn(), handleDivineFurySkip: vi.fn(),
      handleGenericDamageTypeChoice: vi.fn(), handleGenericDamageTypeSkip: vi.fn(),
      handleDamageTypeModifierChoice: vi.fn(), handleDamageTypeModifierSkip: vi.fn(),
      handleEnhancedUnarmedChoice: vi.fn(), handleEnhancedUnarmedSkip: vi.fn(),
      handleFeatureChoiceConfirm: vi.fn(), handleFeatureChoiceSkip: vi.fn(),
      handleConstellationSelect: vi.fn(),
      combatSuperiorityModal: null, setCombatSuperiorityModal: vi.fn(),
      handleCombatSuperiorityConfirm: vi.fn(), handleAttackRiderManeuverUse: vi.fn(), handleAttackRiderManeuverSkip: vi.fn(),
    });

    const stats = createStats({
      actions: [{ name: 'Blessed Strikes', description: 'Choose.', automation: { type: 'damage_bonus', options: ['Lightning', 'Thunder'] } }],
    });

    await act(async () => {
      render(<CharActions playerStats={stats} cannotAct={true} />);
    });

    expect(screen.getByText('Blessed Strikes:')).toBeInTheDocument();

    const actionLink = screen.getByText('Blessed Strikes:');
    await act(async () => { fireEvent.click(actionLink); });

    await waitFor(() => {
      expect(mockSetModalState).not.toHaveBeenCalled();
    });
  });

  it('renders action text without clicking when automation returns false', async () => {
    hasAutomation.mockReturnValue(false);

    const stats = createStats({
      actions: [{ name: 'Plain Feature', description: 'A plain feature with no automation.', automation: { type: 'buff', effect: 'test' } }],
    });

    await act(async () => {
      render(<CharActions playerStats={stats} />);
    });

    expect(screen.getByText('Plain Feature:')).toBeInTheDocument();
    expect(screen.getByText('A plain feature with no automation.')).toBeInTheDocument();
  });

  it('renders Empowered Spell label for Metamagic action with spell_modifier type', async () => {
    hasAutomation.mockReturnValue(true);

    const stats = createStats({
      actions: [{ name: 'Metamagic', description: 'Modify spell', automation: { type: 'spell_modifier' } }],
    });

    await act(async () => {
      render(<CharActions playerStats={stats} />);
    });

    expect(screen.getByText('Empowered Spell:')).toBeInTheDocument();
  });

  it('hides actions listed in featuresToIgnore', async () => {
    const { getCategories } = await import('../../services/character/featureCategories.js');
    getCategories.mockReturnValue({ featuresToIgnore: ['Ignored Action'] });

    const stats = createStats({
      actions: [
        { name: 'Ignored Action', description: 'This should not appear' },
        { name: 'Visible Action', description: 'This should appear' },
      ],
    });

    await act(async () => {
      render(<CharActions playerStats={stats} />);
    });

    expect(screen.queryByText('Ignored Action:')).not.toBeInTheDocument();
    expect(screen.getByText('Visible Action:')).toBeInTheDocument();
  });

  it('calls setModalState with featureChoice containing correct optionKey', async () => {
    hasAutomation.mockReturnValue(true);

    const mockSetModalState = vi.fn();
    (await import('./useCharActionModals.js')).default.mockReturnValue({
      pendingDamage: null, modalState: {}, setModalState: mockSetModalState,
      resolveAttackDamage: vi.fn(), handleMasteryClose: vi.fn(), handleWeaponMasteryChoice: vi.fn(),
      handleWeaponKindMasteryClose: vi.fn(), handleDivineFuryDamageType: vi.fn(), handleDivineFurySkip: vi.fn(),
      handleGenericDamageTypeChoice: vi.fn(), handleGenericDamageTypeSkip: vi.fn(),
      handleDamageTypeModifierChoice: vi.fn(), handleDamageTypeModifierSkip: vi.fn(),
      handleEnhancedUnarmedChoice: vi.fn(), handleEnhancedUnarmedSkip: vi.fn(),
      handleFeatureChoiceConfirm: vi.fn(), handleFeatureChoiceSkip: vi.fn(),
      handleConstellationSelect: vi.fn(),
      combatSuperiorityModal: null, setCombatSuperiorityModal: vi.fn(),
      handleCombatSuperiorityConfirm: vi.fn(), handleAttackRiderManeuverUse: vi.fn(), handleAttackRiderManeuverSkip: vi.fn(),
    });

    const stats = createStats({
      actions: [{ name: 'Blessed Strikes', description: 'Choose.', automation: { type: 'damage_bonus', options: ['Lightning', 'Thunder'] } }],
    });

    await act(async () => {
      render(<CharActions playerStats={stats} />);
    });

    const actionLink = screen.getByText('Blessed Strikes:');
    await act(async () => { fireEvent.click(actionLink); });

    await waitFor(() => {
      const call = mockSetModalState.mock.calls[0][0];
      expect(call.featureChoice.optionKey).toBe('_Blessed_Strikes_option');
      expect(call.featureChoice.options).toEqual(['Lightning', 'Thunder']);
    });
  });
});
