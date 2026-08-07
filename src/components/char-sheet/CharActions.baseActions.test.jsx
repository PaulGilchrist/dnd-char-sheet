import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharActions from './CharActions.jsx';
import { getRuntimeValue, setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { DiceRollContext } from '../../hooks/combat/DiceRollContext.js';
import useLoggedDiceRoll from '../../hooks/combat/useLoggedDiceRoll.js';

const _syncedStore = new Map();

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
    popupHtml: null, setPopupHtml: vi.fn(), rollAttack: vi.fn(), rollDamage: vi.fn(), rollSkillCheck: vi.fn(), rollAbilityCheck: vi.fn(), quickRollPlayerSave: vi.fn(),
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
  computeFeatRangeEffects: vi.fn(() => Promise.resolve({ rangeBonus: 5 })),
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

describe('CharActions base actions rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    _syncedStore.clear();
    globalThis.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve(['Hide', 'Dash', 'Disengage', 'Dodge', 'Grapple']) });
    getRuntimeValue.mockImplementation(() => null);
  });

  describe('base actions rendering', () => {
    it('renders base actions as a comma-separated list', async () => {
      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [];
        if (key === 'hasteExtraActionUsed') return false;
        if (key === 'activeConditions') return [];
        return null;
      });

      const stats = createStats({ actions: ['Hide', 'Dash', 'Disengage'] });

      await act(async () => { render(<CharActions playerStats={stats} />); });

      const baseActionsEl = screen.getByText(/Base Actions:/);
      expect(baseActionsEl).toBeInTheDocument();
    });

    it('renders Hide as a clickable action with special behavior', async () => {
      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [];
        if (key === 'hasteExtraActionUsed') return false;
        if (key === 'activeConditions') return [];
        return null;
      });

      const stats = createStats({ actions: ['Hide', 'Dash'] });

      await act(async () => { render(<CharActions playerStats={stats} />); });

      expect(screen.getByText('Hide')).toHaveClass('base-action-clickable');
      expect(screen.getByText(/Dash/)).toBeInTheDocument();
    });

    it('renders Dodge as a clickable action with toggle behavior', async () => {
      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [];
        if (key === 'hasteExtraActionUsed') return false;
        if (key === 'activeConditions') return [];
        return null;
      });

      const stats = createStats({ actions: ['Dodge', 'Dash'] });

      await act(async () => { render(<CharActions playerStats={stats} />); });

      expect(screen.getByText('Dodge')).toHaveClass('base-action-clickable');
    });

    it('renders Grapple as a clickable action', async () => {
      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [];
        if (key === 'hasteExtraActionUsed') return false;
        if (key === 'activeConditions') return [];
        return null;
      });

      const stats = createStats({ actions: ['Grapple', 'Dash'] });

      await act(async () => { render(<CharActions playerStats={stats} />); });

      expect(screen.getByText('Grapple')).toHaveClass('base-action-clickable');
    });
  });

  describe('Hide action behavior', () => {
    it('Hide shows popup when already invisible', async () => {
      const mockSetPopupHtml = vi.fn();
      const wrapper = ({ children }) => (
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          {children}
        </DiceRollContext.Provider>
      );

      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ effect: 'advantage_on_stealth' }];
        if (key === 'hasteExtraActionUsed') return false;
        if (key === 'activeConditions') return ['invisible'];
        return null;
      });

      await act(async () => {
        render(<CharActions playerStats={createStats({ actions: ['Hide'] })} />, { wrapper });
      });

      const hideBtn = screen.getByText('Hide');
      await act(async () => { fireEvent.click(hideBtn); });

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Hide',
          description: expect.stringContaining('already hidden'),
        }));
      });
    });

    it('Hide rolls Stealth check and sets invisible condition on success (>= DC 15)', async () => {
      const mockSetPopupHtml = vi.fn();
      const mockRollSkillCheck = vi.fn().mockResolvedValue(undefined);
      const wrapper = ({ children }) => (
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          {children}
        </DiceRollContext.Provider>
      );

      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [];
        if (key === 'hasteExtraActionUsed') return false;
        if (key === 'activeConditions') return [];
        if (_name === 'campaign' && key === 'lastAttack') return { d20: 12, bonus: stealthSkillBonus, total: 12 + stealthSkillBonus };
        return null;
      });

      const stealthSkillBonus = 5;
      const stats = createStats({ actions: ['Hide'], skillProficiencies: ['Stealth'], level: 5 });
      stats.abilities = [
        { name: 'Dexterity', bonus: 2, skills: [{ name: 'Stealth', bonus: stealthSkillBonus }] },
        { name: 'Strength', bonus: 0, skills: [] },
        { name: 'Constitution', bonus: 0, skills: [] },
        { name: 'Intelligence', bonus: 0, skills: [] },
        { name: 'Wisdom', bonus: 0, skills: [] },
        { name: 'Charisma', bonus: 0, skills: [] },
      ];

      useLoggedDiceRoll.mockReturnValue({
        popupHtml: null, setPopupHtml: mockSetPopupHtml, rollAttack: vi.fn(), rollDamage: vi.fn(), rollSkillCheck: mockRollSkillCheck, quickRollPlayerSave: vi.fn(),
      });

      await act(async () => {
        render(<CharActions playerStats={stats} campaignName="my-campaign" />, { wrapper });
      });

      const hideBtn = screen.getByText('Hide');
      await act(async () => { fireEvent.click(hideBtn); });

      await waitFor(() => {
        expect(mockRollSkillCheck).toHaveBeenCalledWith('Stealth', expect.any(Number), expect.any(Object));
      });

      await waitFor(() => {
        expect(setRuntimeValue).toHaveBeenCalledWith('TestCharacter', 'activeConditions', expect.arrayContaining(['invisible']), 'my-campaign');
        expect(mockSetPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Hide',
          description: expect.stringContaining('Hide successful'),
        }));
      });
    });

    it('Hide rolls Stealth check but does NOT set invisible on failure (< DC 15)', async () => {
      const mockSetPopupHtml = vi.fn();
      const mockRollSkillCheck = vi.fn().mockResolvedValue(undefined);
      const wrapper = ({ children }) => (
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          {children}
        </DiceRollContext.Provider>
      );

      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [];
        if (key === 'hasteExtraActionUsed') return false;
        if (key === 'activeConditions') return [];
        if (_name === 'campaign' && key === 'lastAttack') return { d20: 3, bonus: stealthSkillBonus, total: 3 + stealthSkillBonus };
        return null;
      });

      const stealthSkillBonus = 5;
      const stats = createStats({ actions: ['Hide'], skillProficiencies: ['Stealth'], level: 5 });
      stats.abilities = [
        { name: 'Dexterity', bonus: 2, skills: [{ name: 'Stealth', bonus: stealthSkillBonus }] },
        { name: 'Strength', bonus: 0, skills: [] },
        { name: 'Constitution', bonus: 0, skills: [] },
        { name: 'Intelligence', bonus: 0, skills: [] },
        { name: 'Wisdom', bonus: 0, skills: [] },
        { name: 'Charisma', bonus: 0, skills: [] },
      ];

      useLoggedDiceRoll.mockReturnValue({
        popupHtml: null, setPopupHtml: mockSetPopupHtml, rollAttack: vi.fn(), rollDamage: vi.fn(), rollSkillCheck: mockRollSkillCheck, quickRollPlayerSave: vi.fn(),
      });

      await act(async () => {
        render(<CharActions playerStats={stats} campaignName="my-campaign" />, { wrapper });
      });

      const hideBtn = screen.getByText('Hide');
      await act(async () => { fireEvent.click(hideBtn); });

      await waitFor(() => {
        expect(mockRollSkillCheck).toHaveBeenCalledWith('Stealth', expect.any(Number), expect.any(Object));
      });

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Hide',
          description: expect.stringContaining('Hide failed'),
        }));
      });

      expect(setRuntimeValue).not.toHaveBeenCalledWith('TestCharacter', 'activeConditions', expect.arrayContaining(['invisible']), 'my-campaign');
    });

    it('Hide does not add duplicate stealth buff when advantage already active and succeeds', async () => {
      const mockSetPopupHtml = vi.fn();
      const mockRollSkillCheck = vi.fn().mockResolvedValue(undefined);
      const wrapper = ({ children }) => (
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          {children}
        </DiceRollContext.Provider>
      );

      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [{ effect: 'advantage_on_stealth' }];
        if (key === 'hasteExtraActionUsed') return false;
        if (key === 'activeConditions') return [];
        if (_name === 'campaign' && key === 'lastAttack') return { d20: 12, bonus: stealthSkillBonus, total: 12 + stealthSkillBonus };
        return null;
      });

      const stealthSkillBonus = 5;
      const stats = createStats({ actions: ['Hide'], skillProficiencies: ['Stealth'], level: 5 });
      stats.abilities = [
        { name: 'Dexterity', bonus: 2, skills: [{ name: 'Stealth', bonus: stealthSkillBonus }] },
        { name: 'Strength', bonus: 0, skills: [] },
        { name: 'Constitution', bonus: 0, skills: [] },
        { name: 'Intelligence', bonus: 0, skills: [] },
        { name: 'Wisdom', bonus: 0, skills: [] },
        { name: 'Charisma', bonus: 0, skills: [] },
      ];

      useLoggedDiceRoll.mockReturnValue({
        popupHtml: null, setPopupHtml: mockSetPopupHtml, rollAttack: vi.fn(), rollDamage: vi.fn(), rollSkillCheck: mockRollSkillCheck, quickRollPlayerSave: vi.fn(),
      });

      await act(async () => {
        render(<CharActions playerStats={stats} campaignName="my-campaign" />, { wrapper });
      });

      const hideBtn = screen.getByText('Hide');
      await act(async () => { fireEvent.click(hideBtn); });

      await waitFor(() => {
        expect(mockRollSkillCheck).toHaveBeenCalledWith('Stealth', expect.any(Number), expect.any(Object));
      });

      await waitFor(() => {
        expect(setRuntimeValue).toHaveBeenCalledWith('TestCharacter', 'activeConditions', ['invisible'], 'my-campaign');
        expect(setRuntimeValue).toHaveBeenNthCalledWith(2, 'TestCharacter', 'activeBuffs', [{ effect: 'advantage_on_stealth' }], 'my-campaign');
      });
    });

    it('Hide does nothing when cannotAct is true', async () => {
      const mockSetPopupHtml = vi.fn();
      const wrapper = ({ children }) => (
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          {children}
        </DiceRollContext.Provider>
      );

      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [];
        if (key === 'hasteExtraActionUsed') return false;
        if (key === 'activeConditions') return [];
        return null;
      });

      await act(async () => {
        render(<CharActions playerStats={createStats({ actions: ['Hide'] })} cannotAct={true} />, { wrapper });
      });

      const hideBtn = screen.getByText('Hide');
      await act(async () => { fireEvent.click(hideBtn); });

      expect(setRuntimeValue).not.toHaveBeenCalled();
      expect(mockSetPopupHtml).not.toHaveBeenCalled();
    });

    it('Hide applies Wisdom modifier when conditionEffects has wisCheckReplace', async () => {
      const mockSetPopupHtml = vi.fn();
      const mockRollSkillCheck = vi.fn().mockResolvedValue(undefined);
      const wrapper = ({ children }) => (
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          {children}
        </DiceRollContext.Provider>
      );

      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [];
        if (key === 'hasteExtraActionUsed') return false;
        if (key === 'activeConditions') return [];
        if (_name === 'campaign' && key === 'lastAttack') return { d20: 12, bonus: stealthSkillBonus, total: 12 + stealthSkillBonus };
        return null;
      });

      const stealthSkillBonus = 5;
      const stats = createStats({ actions: ['Hide'], skillProficiencies: ['Stealth'], level: 5 });
      stats.abilities = [
        { name: 'Dexterity', bonus: 2, skills: [{ name: 'Stealth', bonus: stealthSkillBonus }] },
        { name: 'Wisdom', bonus: 4, skills: [] },
        { name: 'Strength', bonus: 0, skills: [] },
        { name: 'Constitution', bonus: 0, skills: [] },
        { name: 'Intelligence', bonus: 0, skills: [] },
        { name: 'Charisma', bonus: 0, skills: [] },
      ];

      useLoggedDiceRoll.mockReturnValue({
        popupHtml: null, setPopupHtml: mockSetPopupHtml, rollAttack: vi.fn(), rollDamage: vi.fn(), rollSkillCheck: mockRollSkillCheck, quickRollPlayerSave: vi.fn(),
      });

      await act(async () => {
        render(<CharActions
          playerStats={stats}
          campaignName="my-campaign"
          conditionEffects={{ wisCheckReplace: true }}
        />, { wrapper });
      });

      const hideBtn = screen.getByText('Hide');
      await act(async () => { fireEvent.click(hideBtn); });

      await waitFor(() => {
        expect(mockRollSkillCheck).toHaveBeenCalledWith('Stealth', expect.any(Number), expect.any(Object));
      });
    });

    it('Hide applies Skulker feat advantage for 2024 rules', async () => {
      const mockSetPopupHtml = vi.fn();
      const mockRollSkillCheck = vi.fn().mockResolvedValue(undefined);
      const wrapper = ({ children }) => (
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          {children}
        </DiceRollContext.Provider>
      );

      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [];
        if (key === 'hasteExtraActionUsed') return false;
        if (key === 'activeConditions') return [];
        if (_name === 'campaign' && key === 'lastAttack') return { d20: 12, bonus: 5, total: 17 };
        return null;
      });

      const stats = createStats({
        actions: ['Hide'],
        rules: '2024',
        feats: ['Skulker'],
        level: 5,
      });
      stats.abilities = [
        { name: 'Dexterity', bonus: 2, skills: [{ name: 'Stealth', bonus: 5 }] },
        { name: 'Strength', bonus: 0, skills: [] },
        { name: 'Constitution', bonus: 0, skills: [] },
        { name: 'Intelligence', bonus: 0, skills: [] },
        { name: 'Wisdom', bonus: 0, skills: [] },
        { name: 'Charisma', bonus: 0, skills: [] },
      ];

      useLoggedDiceRoll.mockReturnValue({
        popupHtml: null, setPopupHtml: mockSetPopupHtml, rollAttack: vi.fn(), rollDamage: vi.fn(), rollSkillCheck: mockRollSkillCheck, quickRollPlayerSave: vi.fn(),
      });

      await act(async () => {
        render(<CharActions playerStats={stats} campaignName="my-campaign" />, { wrapper });
      });

      const hideBtn = screen.getByText('Hide');
      await act(async () => { fireEvent.click(hideBtn); });

      await waitFor(() => {
        expect(mockRollSkillCheck).toHaveBeenCalledWith('Stealth', expect.any(Number), expect.objectContaining({ forcedMode: 'advantage' }));
      });
    });

    it('Hide applies Pass Without Trace bonus when conditionEffects has it', async () => {
      const mockSetPopupHtml = vi.fn();
      const mockRollSkillCheck = vi.fn().mockResolvedValue(undefined);
      const wrapper = ({ children }) => (
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          {children}
        </DiceRollContext.Provider>
      );

      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [];
        if (key === 'hasteExtraActionUsed') return false;
        if (key === 'activeConditions') return [];
        if (_name === 'campaign' && key === 'lastAttack') return { d20: 12, bonus: 10, total: 22 };
        return null;
      });

      const stats = createStats({ actions: ['Hide'], skillProficiencies: ['Stealth'], level: 5 });
      stats.abilities = [
        { name: 'Dexterity', bonus: 2, skills: [{ name: 'Stealth', bonus: 5 }] },
        { name: 'Strength', bonus: 0, skills: [] },
        { name: 'Constitution', bonus: 0, skills: [] },
        { name: 'Intelligence', bonus: 0, skills: [] },
        { name: 'Wisdom', bonus: 0, skills: [] },
        { name: 'Charisma', bonus: 0, skills: [] },
      ];

      useLoggedDiceRoll.mockReturnValue({
        popupHtml: null, setPopupHtml: mockSetPopupHtml, rollAttack: vi.fn(), rollDamage: vi.fn(), rollSkillCheck: mockRollSkillCheck, quickRollPlayerSave: vi.fn(),
      });

      await act(async () => {
        render(<CharActions
          playerStats={stats}
          campaignName="my-campaign"
          conditionEffects={{ passWithoutTraceBonus: '5' }}
        />, { wrapper });
      });

      const hideBtn = screen.getByText('Hide');
      await act(async () => { fireEvent.click(hideBtn); });

      await waitFor(() => {
        expect(mockRollSkillCheck).toHaveBeenCalledWith('Stealth', expect.any(Number), expect.any(Object));
      });
    });

    it('Hide applies hex disadvantage when hexAbilityCheckDisadvantage applies to DEX', async () => {
      const mockSetPopupHtml = vi.fn();
      const mockRollSkillCheck = vi.fn().mockResolvedValue(undefined);
      const wrapper = ({ children }) => (
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          {children}
        </DiceRollContext.Provider>
      );

      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [];
        if (key === 'hasteExtraActionUsed') return false;
        if (key === 'activeConditions') return [];
        if (_name === 'campaign' && key === 'lastAttack') return { d20: 12, bonus: 5, total: 17 };
        return null;
      });

      const stats = createStats({ actions: ['Hide'], skillProficiencies: ['Stealth'], level: 5 });
      stats.abilities = [
        { name: 'Dexterity', bonus: 2, skills: [{ name: 'Stealth', bonus: 5 }] },
        { name: 'Strength', bonus: 0, skills: [] },
        { name: 'Constitution', bonus: 0, skills: [] },
        { name: 'Intelligence', bonus: 0, skills: [] },
        { name: 'Wisdom', bonus: 0, skills: [] },
        { name: 'Charisma', bonus: 0, skills: [] },
      ];

      useLoggedDiceRoll.mockReturnValue({
        popupHtml: null, setPopupHtml: mockSetPopupHtml, rollAttack: vi.fn(), rollDamage: vi.fn(), rollSkillCheck: mockRollSkillCheck, quickRollPlayerSave: vi.fn(),
      });

      await act(async () => {
        render(<CharActions
          playerStats={stats}
          campaignName="my-campaign"
          conditionEffects={{ hexAbilityCheckDisadvantage: true, hexAbilityCheckDisadvantageAbility: 'DEX' }}
        />, { wrapper });
      });

      const hideBtn = screen.getByText('Hide');
      await act(async () => { fireEvent.click(hideBtn); });

      await waitFor(() => {
        expect(mockRollSkillCheck).toHaveBeenCalledWith('Stealth', expect.any(Number), expect.objectContaining({ forcedMode: 'disadvantage' }));
      });
    });

    it('Hide applies Peerless Athlete advantage when listed in advantageSkills', async () => {
      const mockSetPopupHtml = vi.fn();
      const mockRollSkillCheck = vi.fn().mockResolvedValue(undefined);
      const wrapper = ({ children }) => (
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          {children}
        </DiceRollContext.Provider>
      );

      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [];
        if (key === 'hasteExtraActionUsed') return false;
        if (key === 'activeConditions') return [];
        if (_name === 'campaign' && key === 'lastAttack') return { d20: 12, bonus: 5, total: 17 };
        return null;
      });

      const stats = createStats({ actions: ['Hide'], skillProficiencies: ['Stealth'], level: 5 });
      stats.abilities = [
        { name: 'Dexterity', bonus: 2, skills: [{ name: 'Stealth', bonus: 5 }] },
        { name: 'Strength', bonus: 0, skills: [] },
        { name: 'Constitution', bonus: 0, skills: [] },
        { name: 'Intelligence', bonus: 0, skills: [] },
        { name: 'Wisdom', bonus: 0, skills: [] },
        { name: 'Charisma', bonus: 0, skills: [] },
      ];

      useLoggedDiceRoll.mockReturnValue({
        popupHtml: null, setPopupHtml: mockSetPopupHtml, rollAttack: vi.fn(), rollDamage: vi.fn(), rollSkillCheck: mockRollSkillCheck, quickRollPlayerSave: vi.fn(),
      });

      await act(async () => {
        render(<CharActions
          playerStats={stats}
          campaignName="my-campaign"
          conditionEffects={{ peerlessAthleteAdvantageSkills: ['Stealth'] }}
        />, { wrapper });
      });

      const hideBtn = screen.getByText('Hide');
      await act(async () => { fireEvent.click(hideBtn); });

      await waitFor(() => {
        expect(mockRollSkillCheck).toHaveBeenCalledWith('Stealth', expect.any(Number), expect.objectContaining({ forcedMode: 'advantage' }));
      });
    });

    it('Hide cancels advantage when both hex disadvantage and peerless athlete advantage are present', async () => {
      // peerlessAthleteAdvantageSkills comes after hexAbilityCheckDisadvantage in the code
      // so peerless athlete advantage wins
      const mockSetPopupHtml = vi.fn();
      const mockRollSkillCheck = vi.fn().mockResolvedValue(undefined);
      const wrapper = ({ children }) => (
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          {children}
        </DiceRollContext.Provider>
      );

      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [];
        if (key === 'hasteExtraActionUsed') return false;
        if (key === 'activeConditions') return [];
        if (_name === 'campaign' && key === 'lastAttack') return { d20: 12, bonus: 5, total: 17 };
        return null;
      });

      const stats = createStats({ actions: ['Hide'], skillProficiencies: ['Stealth'], level: 5 });
      stats.abilities = [
        { name: 'Dexterity', bonus: 2, skills: [{ name: 'Stealth', bonus: 5 }] },
        { name: 'Strength', bonus: 0, skills: [] },
        { name: 'Constitution', bonus: 0, skills: [] },
        { name: 'Intelligence', bonus: 0, skills: [] },
        { name: 'Wisdom', bonus: 0, skills: [] },
        { name: 'Charisma', bonus: 0, skills: [] },
      ];

      useLoggedDiceRoll.mockReturnValue({
        popupHtml: null, setPopupHtml: mockSetPopupHtml, rollAttack: vi.fn(), rollDamage: vi.fn(), rollSkillCheck: mockRollSkillCheck, quickRollPlayerSave: vi.fn(),
      });

      await act(async () => {
        render(<CharActions
          playerStats={stats}
          campaignName="my-campaign"
          conditionEffects={{
            hexAbilityCheckDisadvantage: true,
            hexAbilityCheckDisadvantageAbility: 'DEX',
            peerlessAthleteAdvantageSkills: ['Stealth'],
          }}
        />, { wrapper });
      });

      const hideBtn = screen.getByText('Hide');
      await act(async () => { fireEvent.click(hideBtn); });

      await waitFor(() => {
        // peerless athlete advantage cancels hex disadvantage, so forcedMode = undefined
        expect(mockRollSkillCheck).toHaveBeenCalledWith('Stealth', expect.any(Number), {});
      });
    });
  });

  describe('Dodge action behavior', () => {
    it('Dodge toggles dodge buff on click', async () => {
      const mockSetPopupHtml = vi.fn();
      const wrapper = ({ children }) => (
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          {children}
        </DiceRollContext.Provider>
      );

      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [];
        if (key === 'hasteExtraActionUsed') return false;
        if (key === 'activeConditions') return [];
        return null;
      });

      await act(async () => {
        render(<CharActions playerStats={createStats({ actions: ['Dodge'] })} campaignName="my-campaign" />, { wrapper });
      });

      const dodgeBtn = screen.getByText('Dodge');
      await act(async () => { fireEvent.click(dodgeBtn); });

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Dodge',
          description: expect.stringContaining('Dodge activated'),
        }));
      });
    });

    it('Dodge does nothing when cannotAct is true', async () => {
      const mockSetPopupHtml = vi.fn();
      const wrapper = ({ children }) => (
        <DiceRollContext.Provider value={{ popupHtml: null, setPopupHtml: mockSetPopupHtml }}>
          {children}
        </DiceRollContext.Provider>
      );

      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'activeBuffs') return [];
        if (key === 'hasteExtraActionUsed') return false;
        if (key === 'activeConditions') return [];
        return null;
      });

      await act(async () => {
        render(<CharActions playerStats={createStats({ actions: ['Dodge'] })} campaignName="my-campaign" cannotAct={true} />, { wrapper });
      });

      const dodgeBtn = screen.getByText('Dodge');
      await act(async () => { fireEvent.click(dodgeBtn); });

      expect(mockSetPopupHtml).not.toHaveBeenCalled();
    });
  });

  describe('non-hide base actions', () => {
    it('renders non-hide base actions as plain text (not clickable)', async () => {
      getRuntimeValue.mockImplementation(() => null);

      const stats = createStats({ actions: ['Dash', 'Disengage', 'Dodge'] });

      await act(async () => { render(<CharActions playerStats={stats} />); });

      const dashEl = screen.getByText(/Dash/);
      expect(dashEl).not.toHaveClass('clickable');
    });
  });
});
