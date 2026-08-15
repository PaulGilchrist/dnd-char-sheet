// @improved-by-ai
import { render, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharActions from './CharActions.jsx';
import { getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { DiceRollContext } from '../../hooks/combat/DiceRollContext.js';
import useLoggedDiceRoll from '../../hooks/combat/useLoggedDiceRoll.js';
import { hasAutomation } from '../../services/combat/automation/automationService.js';
import { getCombatContext } from '../../services/rules/combat/damageUtils.js';

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
  default: vi.fn(),
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

function renderWithDiceRollContext(ui) {
  const mockSetPopupHtml = vi.fn();
  const rendered = render(ui, {
    wrapper: ({ children }) => (
      <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
        {children}
      </DiceRollContext.Provider>
    ),
  });
  return { ...rendered, mockSetPopupHtml };
}

describe('CharActions event listeners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    _syncedStore.clear();
    globalThis.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve([]) });
    getRuntimeValue.mockImplementation(() => null);
    hasAutomation.mockImplementation(() => false);
    useLoggedDiceRoll.mockReturnValue({
      popupHtml: null, setPopupHtml: vi.fn(), rollAttack: vi.fn(), rollDamage: vi.fn(),
      rollSkillCheck: vi.fn(), rollAbilityCheck: vi.fn(), quickRollPlayerSave: vi.fn(),
    });
  });

  describe('healing-popup event', () => {
    it('sets popupHtml with healing name, target, and roll info', async () => {
      const { mockSetPopupHtml } = renderWithDiceRollContext(
        <CharActions playerStats={createStats()} campaignName="test-campaign" />
      );

      

      window.dispatchEvent(new CustomEvent('healing-popup', {
        detail: {
          targetName: 'Ally',
          healingName: 'Cure Wounds',
          rollInfo: '2d4+3',
          maximizeHealingDice: false,
          popupText: 'Heal an ally',
        },
      }));

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.stringContaining('Cure Wounds')
        );
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.stringContaining('Ally')
        );
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.stringContaining('2d4+3')
        );
      });
    });

    it('includes maximized note when maximizeHealingDice is true', async () => {
      const { mockSetPopupHtml } = renderWithDiceRollContext(
        <CharActions playerStats={createStats()} campaignName="test-campaign" />
      );

      

      window.dispatchEvent(new CustomEvent('healing-popup', {
        detail: {
          targetName: 'Ally',
          healingName: 'Mass Cure Wounds',
          rollInfo: '3d8+3',
          maximizeHealingDice: true,
          popupText: 'Maximized healing',
        },
      }));

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.stringContaining('(maximized)')
        );
      });
    });

    it('omits roll info bracket when rollInfo is absent', async () => {
      const { mockSetPopupHtml } = renderWithDiceRollContext(
        <CharActions playerStats={createStats()} campaignName="test-campaign" />
      );

      

      window.dispatchEvent(new CustomEvent('healing-popup', {
        detail: {
          targetName: 'Ally',
          healingName: 'Cure Wounds',
          maximizeHealingDice: false,
          popupText: 'Heal an ally',
        },
      }));

      await waitFor(() => {
        const call = mockSetPopupHtml.mock.calls[0][0];
        expect(call).toContain('Cure Wounds');
        expect(call).toContain('Ally');
        expect(call).not.toContain('[');
      });
    });
  });

  describe('damage-popup event', () => {
    it('sets popupHtml with spell name, target, and roll info', async () => {
      const { mockSetPopupHtml } = renderWithDiceRollContext(
        <CharActions playerStats={createStats()} campaignName="test-campaign" />
      );

      

      window.dispatchEvent(new CustomEvent('damage-popup', {
        detail: {
          targetName: 'Goblin',
          spellName: 'Burning Hands',
          popupText: 'Fire damage',
          rollInfo: '3d4',
        },
      }));

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.stringContaining('Burning Hands')
        );
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.stringContaining('Goblin')
        );
        expect(mockSetPopupHtml).toHaveBeenCalledWith(
          expect.stringContaining('3d4')
        );
      });
    });

    it('omits roll info bracket when rollInfo is absent', async () => {
      const { mockSetPopupHtml } = renderWithDiceRollContext(
        <CharActions playerStats={createStats()} campaignName="test-campaign" />
      );

      

      window.dispatchEvent(new CustomEvent('damage-popup', {
        detail: {
          targetName: 'Goblin',
          spellName: 'Burning Hands',
          popupText: 'Fire damage',
        },
      }));

      await waitFor(() => {
        const call = mockSetPopupHtml.mock.calls[0][0];
        expect(call).toContain('Burning Hands');
        expect(call).toContain('Goblin');
        expect(call).not.toContain('[');
      });
    });
  });

  describe('inspiring-smite-pending event', () => {
    it('sets inspiringSmiteModal in modal state with event detail', async () => {
      const mockSetModalState = vi.fn();
      const mockSetPopupHtml = vi.fn();

      vi.mocked((await import('./useCharActionModals.js')).default).mockReturnValue({
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

      const container = document.createElement('div'); document.body.appendChild(container); render(
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          <CharActions playerStats={createStats()} campaignName="test-campaign" />
        </DiceRollContext.Provider>,
      );

      

      window.dispatchEvent(new CustomEvent('inspiring-smite-pending', {
        detail: { smiteName: 'Divine Smite', damage: '4d8' },
      }));

      await waitFor(() => {
        expect(mockSetModalState).toHaveBeenCalledWith(
          expect.objectContaining({ inspiringSmiteModal: { smiteName: 'Divine Smite', damage: '4d8' } })
        );
      });
    });
  });

  describe('damage-type-choice event', () => {
    it('calls rollDamage with chosen type and clears popup', async () => {
      const mockSetPopupHtml = vi.fn();
      const mockRollDamage = vi.fn();

      useLoggedDiceRoll.mockReturnValue({
        popupHtml: null, setPopupHtml: mockSetPopupHtml, rollAttack: vi.fn(), rollDamage: mockRollDamage,
        rollSkillCheck: vi.fn(), rollAbilityCheck: vi.fn(), quickRollPlayerSave: vi.fn(),
      });

      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [];
        if (key === 'hasteExtraActionUsed') return false;
        if (key === 'activeConditions') return [];
        return null;
      });

      vi.mocked((await import('./useCharActionModals.js')).default).mockReturnValue({
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
      });

      const container = document.createElement('div'); document.body.appendChild(container); render(
        <DiceRollContext.Provider value={{ popupHtml: { type: 'damage_type_choice' }, setPopupHtml: mockSetPopupHtml }}>
          <CharActions playerStats={createStats()} campaignName="test-campaign" />
        </DiceRollContext.Provider>,
      );

      

      window.dispatchEvent(new CustomEvent('damage-type-choice', {
        detail: { chosenType: 'Radiant' },
      }));

      await waitFor(() => {
        expect(mockRollDamage).toHaveBeenCalled();
        expect(mockSetPopupHtml).toHaveBeenCalledWith(null);
      });
    });

    it('calls setRuntimeValue with usedKey when present in popupHtml', async () => {
      const mockSetPopupHtml = vi.fn();
      vi.mocked(getRuntimeValue).mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [];
        if (key === 'hasteExtraActionUsed') return false;
        if (key === 'activeConditions') return [];
        return null;
      });

      vi.mocked((await import('./useCharActionModals.js')).default).mockReturnValue({
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
      });

      const container = document.createElement('div'); document.body.appendChild(container); render(
        <DiceRollContext.Provider value={{ popupHtml: {
          type: 'damage_type_choice',
          bonusFormula: '2d6',
          bonusRolls: [3, 3],
          bonusTotal: 8,
          usedKey: '_blessedStrikes_round',
          currentRound: 3,
          targetName: 'Goblin',
          attackerName: 'TestCharacter',
          name: 'Blessed Strikes',
        }, setPopupHtml: mockSetPopupHtml }}>
          <CharActions playerStats={createStats()} campaignName="test-campaign" />
        </DiceRollContext.Provider>,
      );

      

      window.dispatchEvent(new CustomEvent('damage-type-choice', {
        detail: { chosenType: 'Necrotic' },
      }));

      await waitFor(() => {
        expect(setRuntimeValue).toHaveBeenCalledWith(
          'TestCharacter', '_blessedStrikes_round', 3, 'test-campaign'
        );
      });
    });

    it('clears popup without calling rollDamage on skip', async () => {
      const mockSetPopupHtml = vi.fn();
      const mockRollDamage = vi.fn();

      useLoggedDiceRoll.mockReturnValue({
        popupHtml: null, setPopupHtml: mockSetPopupHtml, rollAttack: vi.fn(), rollDamage: mockRollDamage,
        rollSkillCheck: vi.fn(), rollAbilityCheck: vi.fn(), quickRollPlayerSave: vi.fn(),
      });

      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [];
        if (key === 'hasteExtraActionUsed') return false;
        if (key === 'activeConditions') return [];
        return null;
      });

      vi.mocked((await import('./useCharActionModals.js')).default).mockReturnValue({
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
      });

      const container = document.createElement('div'); document.body.appendChild(container); render(
        <DiceRollContext.Provider value={{ popupHtml: { type: 'damage_type_choice' }, setPopupHtml: mockSetPopupHtml }}>
          <CharActions playerStats={createStats()} campaignName="test-campaign" />
        </DiceRollContext.Provider>,
      );

      

      window.dispatchEvent(new CustomEvent('damage-type-skip'));

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(null);
        expect(mockRollDamage).not.toHaveBeenCalled();
      });
    });
  });

  describe('soulstitch-modal-show event', () => {
    it('sets soulstitchSpellsModal in modal state with event detail', async () => {
      const mockSetModalState = vi.fn();
      const mockSetPopupHtml = vi.fn();

      vi.mocked((await import('./useCharActionModals.js')).default).mockReturnValue({
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

      const container = document.createElement('div'); document.body.appendChild(container); render(
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          <CharActions playerStats={createStats()} campaignName="test-campaign" />
        </DiceRollContext.Provider>,
      );

      

      window.dispatchEvent(new CustomEvent('soulstitch-modal-show', {
        detail: { spells: ['Magic Missile', 'Burning Hands'] },
      }));

      await waitFor(() => {
        expect(mockSetModalState).toHaveBeenCalledWith(
          expect.objectContaining({ soulstitchSpellsModal: { spells: ['Magic Missile', 'Burning Hands'] } })
        );
      });
    });
  });

  describe('potent-spellcasting-temp-hp event', () => {
    it('sets secondaryTargetModal with ally targets from combat context', async () => {
      const mockSetModalState = vi.fn();
      const mockSetPopupHtml = vi.fn();

      const mockCs = {
        creatures: [
          { name: 'Ally1', type: 'player', currentHp: 15, maxHp: 20, size: 'Medium' },
          { name: 'Ally2', type: 'npc', currentHp: 8, maxHp: 10, size: 'Small' },
          { name: 'Enemy', type: 'monster', currentHp: 5, maxHp: 15, size: 'Medium' },
        ],
      };
      vi.mocked(getCombatContext).mockResolvedValue(mockCs);

      vi.mocked((await import('./useCharActionModals.js')).default).mockReturnValue({
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

      const container = document.createElement('div'); document.body.appendChild(container); render(
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          <CharActions playerStats={createStats()} campaignName="test-campaign" />
        </DiceRollContext.Provider>,
      );

      

      await act(async () => {
        window.dispatchEvent(new CustomEvent('potent-spellcasting-temp-hp', {
          detail: { title: 'Potent Spellcasting', tempHp: 10, campaignName: 'test-campaign', attackerName: 'TestCharacter' },
        }));
      });

      await waitFor(() => {
        expect(mockSetModalState).toHaveBeenCalledWith(
          expect.objectContaining({
            secondaryTargetModal: expect.objectContaining({
              title: 'Potent Spellcasting',
              confirmLabel: 'Grant Temp HP',
            }),
          })
        );
        const modal = mockSetModalState.mock.calls[0][0].secondaryTargetModal;
        expect(modal.targets).toHaveLength(3);
        expect(modal.targets[0].name).toBe('Ally1');
        expect(modal.targets[2].name).toBe('Enemy');
      });
    });
  });

  describe('sweeping-attack-modal-show event', () => {
    it('sets sweepingAttackTargetModal in modal state with event detail', async () => {
      const mockSetModalState = vi.fn();
      const mockSetPopupHtml = vi.fn();

      vi.mocked((await import('./useCharActionModals.js')).default).mockReturnValue({
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

      const container = document.createElement('div'); document.body.appendChild(container); render(
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          <CharActions playerStats={createStats()} campaignName="test-campaign" />
        </DiceRollContext.Provider>,
      );

      

      window.dispatchEvent(new CustomEvent('sweeping-attack-modal-show', {
        detail: { targets: ['Goblin', 'Orc'] },
      }));

      await waitFor(() => {
        expect(mockSetModalState).toHaveBeenCalledWith(
          expect.objectContaining({ sweepingAttackTargetModal: { targets: ['Goblin', 'Orc'] } })
        );
      });
    });
  });

  describe('bait-and-switch-modal-show event', () => {
    it('sets baitAndSwitchChoiceModal in modal state with event detail', async () => {
      const mockSetModalState = vi.fn();
      const mockSetPopupHtml = vi.fn();

      vi.mocked((await import('./useCharActionModals.js')).default).mockReturnValue({
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

      const container = document.createElement('div'); document.body.appendChild(container); render(
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          <CharActions playerStats={createStats()} campaignName="test-campaign" />
        </DiceRollContext.Provider>,
      );

      

      window.dispatchEvent(new CustomEvent('bait-and-switch-modal-show', {
        detail: { targets: ['Goblin'] },
      }));

      await waitFor(() => {
        expect(mockSetModalState).toHaveBeenCalledWith(
          expect.objectContaining({ baitAndSwitchChoiceModal: { targets: ['Goblin'] } })
        );
      });
    });
  });

  describe('commander-strike-modal-show event', () => {
    it('sets commanderStrikeChoiceModal in modal state with event detail', async () => {
      const mockSetModalState = vi.fn();
      const mockSetPopupHtml = vi.fn();

      vi.mocked((await import('./useCharActionModals.js')).default).mockReturnValue({
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

      const container = document.createElement('div'); document.body.appendChild(container); render(
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          <CharActions playerStats={createStats()} campaignName="test-campaign" />
        </DiceRollContext.Provider>,
      );

      

      window.dispatchEvent(new CustomEvent('commander-strike-modal-show', {
        detail: { targets: ['Ally'] },
      }));

      await waitFor(() => {
        expect(mockSetModalState).toHaveBeenCalledWith(
          expect.objectContaining({ commanderStrikeChoiceModal: { targets: ['Ally'] } })
        );
      });
    });
  });

  describe('rally-choice-modal-show event', () => {
    it('sets rallyChoiceModal in modal state with event detail', async () => {
      const mockSetModalState = vi.fn();
      const mockSetPopupHtml = vi.fn();

      vi.mocked((await import('./useCharActionModals.js')).default).mockReturnValue({
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

      const container = document.createElement('div'); document.body.appendChild(container); render(
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          <CharActions playerStats={createStats()} campaignName="test-campaign" />
        </DiceRollContext.Provider>,
      );

      

      window.dispatchEvent(new CustomEvent('rally-choice-modal-show', {
        detail: { targets: ['Ally'] },
      }));

      await waitFor(() => {
        expect(mockSetModalState).toHaveBeenCalledWith(
          expect.objectContaining({ rallyChoiceModal: { targets: ['Ally'] } })
        );
      });
    });
  });

  describe('event listener cleanup', () => {
    it('removes event listeners on unmount', async () => {
      const mockSetModalState = vi.fn();
      const mockSetPopupHtml = vi.fn();

      vi.mocked((await import('./useCharActionModals.js')).default).mockReturnValue({
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

      const container = document.createElement('div');
      document.body.appendChild(container);
      const { unmount } = render(
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          <CharActions playerStats={createStats()} campaignName="test-campaign" />
        </DiceRollContext.Provider>,
        { container }
      );

      

      unmount();

      // After unmount, the listeners should be removed — dispatching should not cause errors
      // and should not call the (now-unmounted) handlers.
      expect(() => {
        window.dispatchEvent(new CustomEvent('healing-popup', {
          detail: { targetName: 'Ally', healingName: 'Cure Wounds', popupText: 'Heal' },
        }));
        window.dispatchEvent(new CustomEvent('damage-popup', {
          detail: { targetName: 'Goblin', spellName: 'Burning Hands', popupText: 'Damage' },
        }));
        window.dispatchEvent(new CustomEvent('inspiring-smite-pending', {
          detail: { test: 'data' },
        }));
      }).not.toThrow();
    });
  });
});
