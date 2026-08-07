// @cleaned-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharBonusActions from './CharBonusActions.jsx';

vi.mock('../../hooks/combat/useSpellMetamagicFlow.js', () => ({
  useSpellMetamagicFlow: vi.fn(() => ({
    pendingMetamagic: null,
    gateMetamagic: vi.fn(),
    handleConfirm: vi.fn(),
    handleSkip: vi.fn(),
    pendingAid: null,
    handleAidConfirm: vi.fn(),
    handleAidSkip: vi.fn(),
    pendingGreaterRestoration: null,
    handleGreaterRestorationConfirm: vi.fn(),
    handleGreaterRestorationSkip: vi.fn(),
  })),
}));

vi.mock('../../hooks/combat/useSpellUpcastFlow.js', () => ({
  useSpellUpcastFlow: vi.fn(() => ({
    buildUpcastLevels: vi.fn(() => []),
  })),
}));

vi.mock('../../services/combat/automation/automationService.js', () => ({
  hasAutomation: vi.fn(() => false),
}));

vi.mock('../../services/automation/index.js', () => ({
  executeHandler: vi.fn(),
}));

vi.mock('../../services/automation/handlers/buffs/tempHpService.js', () => ({
  setTempHp: vi.fn(),
}));

vi.mock('../../services/rules/spells/postCastRiderService.js', () => ({
  getMultiTargetSpreadForSpell: vi.fn(() => null),
  triggerPostCastRiderSaves: vi.fn(),
}));

vi.mock('../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => ({ creatures: [] })),
  getCurrentCombatRound: vi.fn(() => 1),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../hooks/combat/useMetamagic.js', () => ({
  getCurrentSorceryPoints: vi.fn(() => 10),
  getMaxSorceryPoints: vi.fn(() => 10),
  spendSorceryPoints: vi.fn(),
}));

vi.mock('../../services/combat/buffs/buffService.js', () => ({
  getInnateSorceryBonus: vi.fn((_playerName, _campaignName) => ({ saveDcBonus: 0 })),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  listeners: new Map(),
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(() => Promise.resolve()),
  useRuntimeValue: vi.fn(() => null),
}));

vi.mock('../../services/maps/mapsService.js', () => ({
  loadMapData: vi.fn(() => Promise.resolve({})),
}));

vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getTargetFromAttacker: vi.fn(() => null),
  getCombatContext: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/rules/combat/rangeValidation.js', () => ({
  getNearestPlacedItem: vi.fn(() => null),
}));

vi.mock('../../services/ui/sanitize.js', () => ({
  sanitizeHtml: vi.fn((html) => html),
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

vi.mock('../../hooks/combat/DiceRollContext.js', () => ({
  useDiceRollPopup: vi.fn(() => ({ popupHtml: null, setPopupHtml: vi.fn() })),
}));

vi.mock('./popups/MetamagicPopup.jsx', () => ({
  default: vi.fn((props) => <div data-testid="metamagic-popup">{props.spell?.name || 'MetamagicPopup'}</div>),
}));

vi.mock('./char-spells/SpellDetailPopup.jsx', () => ({
  default: vi.fn((props) => <div data-testid="spell-detail-popup">{props.spell?.name || 'SpellDetailPopup'}</div>),
}));

import { hasAutomation } from '../../services/combat/automation/automationService.js';
import { getRuntimeValue, setRuntimeValue, useRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../services/ui/logService.js';
import { setTempHp } from '../../services/automation/handlers/buffs/tempHpService.js';

const basePlayerStats = {
  name: 'TestCharacter',
  rules: '5e',
  level: 5,
  attacks: [],
  bonusActions: [],
  spellAbilities: { spells: [] },
};

function createStats(overrides = {}) {
  return { ...basePlayerStats, ...overrides };
}

describe('CharBonusActions - Interactive', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  describe('automation handling', () => {
    const automatedBonusAction = {
      name: 'War Priest',
      description: 'You can make one weapon attack as a bonus action.',
      automation: { type: 'bonus_action_attack', trigger: 'after_action' },
    };

    it('calls onAutomationAction when a bonus action with automation is clicked', () => {
      hasAutomation.mockReturnValue(true);
      const onAutomationAction = vi.fn();
      render(<CharBonusActions playerStats={createStats({ bonusActions: [automatedBonusAction] })} onAutomationAction={onAutomationAction} />);
      const actionName = screen.getByText(/War Priest:/);
      fireEvent.click(actionName);
      expect(onAutomationAction).toHaveBeenCalledWith(automatedBonusAction);
    });
  });

  describe('rage expendable features', () => {
    const rageBonusAction = {
      name: 'Berserker Rage',
      description: 'You enter a rage.',
      automation: { type: 'combat_stance', recharge: 'long_rest_or_expend_rage', resourceKey: 'ragePoints' },
    };

    it('shows rage-expendable bonus action as clickable even when exhausted', async () => {
      hasAutomation.mockReturnValue(true);
      render(<CharBonusActions playerStats={createStats({ bonusActions: [rageBonusAction] })} />);
      expect(screen.getByText(/Berserker Rage:/)).toHaveClass('clickable');
    });

    it('dispatches automation on click when exhausted (handler manages rage)', async () => {
      hasAutomation.mockReturnValue(true);
      vi.mocked(getRuntimeValue).mockImplementation((name, key) => {
        if (key === 'ragePoints') return 1;
        return null;
      });

      const mockOnAutomationAction = vi.fn();
      render(<CharBonusActions playerStats={createStats({ bonusActions: [rageBonusAction] })} onAutomationAction={mockOnAutomationAction} />);
      const actionName = screen.getByText(/Berserker Rage:/);
      fireEvent.click(actionName);

      expect(mockOnAutomationAction).toHaveBeenCalledWith(rageBonusAction);
    });
  });

  describe('attack and damage click handlers', () => {
    const bonusActionAttack = { name: 'Main Gauche', range: 5, hitBonus: 5, damage: '1d4+3', damageType: 'Piercing', type: 'Bonus Action' };

    it('calls onAttackClick when hit bonus is clicked', () => {
      const mockOnAttackClick = vi.fn();
      render(<CharBonusActions playerStats={createStats({ attacks: [bonusActionAttack] })} onAttackClick={mockOnAttackClick} exhaustionPenalty={0} />);
      const hitBonusElement = screen.getByText('+5');
      fireEvent.click(hitBonusElement);
      expect(mockOnAttackClick).toHaveBeenCalledWith(bonusActionAttack);
    });

    it('logs a simple damage roll when damage is clicked for to-hit bonus action attacks (no targeting or riders)', async () => {
      const mockOnAttackClick = vi.fn();
      render(<CharBonusActions playerStats={createStats({ attacks: [bonusActionAttack] })} campaignName="test-campaign" onAttackClick={mockOnAttackClick} />);
      const damageElement = screen.getByText('1d4+3');
      fireEvent.click(damageElement);
      await waitFor(() => {
        expect(vi.mocked(addEntry)).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
          type: 'roll',
          rollType: 'damage',
          name: 'Main Gauche',
          formula: '1d4+3',
          note: 'Direct damage roll (no target)',
        }));
      });
    });
  });

  describe('spell detail popup', () => {
    const bonusActionSpell = { name: 'Shocking Grasp', range: 'Touch', casting_time: '1 bonus action', prepared: 'Prepared' };

    it('opens spell detail popup when a bonus action spell is clicked', async () => {
      render(<CharBonusActions playerStats={createStats({ spellAbilities: { spells: [bonusActionSpell] } })} />);
      const spellLink = screen.getByText('Shocking Grasp');
      fireEvent.click(spellLink);
      expect(screen.getByTestId('spell-detail-popup')).toBeInTheDocument();
    });
  });

  describe('save DC attack resolve spell damage', () => {
    const saveDcAttack = {
      name: 'Cone of Cold',
      range: 60,
      saveDc: 14,
      saveType: 'CON',
      damage: '8d8',
      damageType: 'Cold',
      type: 'Bonus Action',
    };

    it('calls onResolveSpellDamage when save DC attack damage is clicked', () => {
      const mockOnResolveSpellDamage = vi.fn();
      render(<CharBonusActions playerStats={createStats({ attacks: [saveDcAttack] })} onResolveSpellDamage={mockOnResolveSpellDamage} />);
      const damageElement = screen.getByText('8d8');
      fireEvent.click(damageElement);
      expect(mockOnResolveSpellDamage).toHaveBeenCalledWith(saveDcAttack);
    });
  });

  describe('bolstering treat', () => {
    it('shows Eat Bolstering Treat when hasBolsteringTreat is true', () => {
      useRuntimeValue.mockImplementation((name, key) => {
        if (key === 'bolsteringTreat') return 2;
        if (key === 'chefBolsteringTreats') return 0;
        if (key === 'activeBuffs') return null;
        if (key === 'poisonDoses') return 0;
        return null;
      });
      getRuntimeValue.mockReturnValue(null);
      const stats = createStats({ level: 5, bonusActions: [{ name: 'TestFeature', description: 'test' }] });
      render(<CharBonusActions playerStats={stats} campaignName="test" />);
      expect(screen.getByText(/Eat Bolstering Treat:/)).toBeInTheDocument();
      expect(screen.getByText(/gain a number of Temporary Hit Points equal to your Proficiency Bonus/)).toBeInTheDocument();
    });

    it('shows Eat Bolstering Treat when hasChefBolsteringTreats is true', () => {
      useRuntimeValue.mockImplementation((name, key) => {
        if (key === 'bolsteringTreat') return 0;
        if (key === 'chefBolsteringTreats') return 1;
        if (key === 'activeBuffs') return null;
        if (key === 'poisonDoses') return 0;
        return null;
      });
      getRuntimeValue.mockReturnValue(null);
      const stats = createStats({ level: 5, bonusActions: [{ name: 'TestFeature', description: 'test' }] });
      render(<CharBonusActions playerStats={stats} campaignName="test" />);
      expect(screen.getByText(/Eat Bolstering Treat:/)).toBeInTheDocument();
    });

    it('does not show Eat Bolstering Treat when both counts are 0', () => {
      useRuntimeValue.mockImplementation((name, key) => {
        if (key === 'bolsteringTreat') return 0;
        if (key === 'chefBolsteringTreats') return 0;
        if (key === 'activeBuffs') return null;
        if (key === 'poisonDoses') return 0;
        return null;
      });
      getRuntimeValue.mockReturnValue(null);
      render(<CharBonusActions playerStats={createStats({ bonusActions: [{ name: 'TestFeature', description: 'test' }] })} />);
      expect(screen.queryByText(/Eat Bolstering Treat:/)).not.toBeInTheDocument();
    });

    it('does not show Eat Bolstering Treat when both are null', () => {
      useRuntimeValue.mockReturnValue(null);
      getRuntimeValue.mockReturnValue(null);
      render(<CharBonusActions playerStats={createStats({ bonusActions: [{ name: 'TestFeature', description: 'test' }] })} />);
      expect(screen.queryByText(/Eat Bolstering Treat:/)).not.toBeInTheDocument();
    });

    it('calls setTempHp and decrements treat count when clicked', async () => {
      useRuntimeValue.mockImplementation((name, key) => {
        if (key === 'bolsteringTreat') return 2;
        if (key === 'chefBolsteringTreats') return 0;
        if (key === 'activeBuffs') return null;
        if (key === 'poisonDoses') return 0;
        return null;
      });
      getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'bolsteringTreat') return 2;
        return null;
      });
      const stats = createStats({ level: 5, abilities: [{ name: 'Wisdom', bonus: 3 }], bonusActions: [{ name: 'TestFeature', description: 'test' }] });
      render(<CharBonusActions playerStats={stats} campaignName="test" />);
      fireEvent.click(screen.getByText(/Eat Bolstering Treat:/));
      await waitFor(() => {
        expect(setRuntimeValue).toHaveBeenCalledWith('TestCharacter', 'bolsteringTreat', 1, 'test');
      });
    });

    it('blocks Eat Bolstering Treat when cannotAct is true', () => {
      useRuntimeValue.mockImplementation((name, key) => {
        if (key === 'bolsteringTreat') return 2;
        if (key === 'chefBolsteringTreats') return 0;
        if (key === 'activeBuffs') return null;
        if (key === 'poisonDoses') return 0;
        return null;
      });
      getRuntimeValue.mockReturnValue(null);
      const stats = createStats({ level: 5, bonusActions: [{ name: 'TestFeature', description: 'test' }] });
      render(<CharBonusActions playerStats={stats} campaignName="test" cannotAct={true} />);
      fireEvent.click(screen.getByText(/Eat Bolstering Treat:/));
      expect(vi.mocked(setTempHp)).not.toHaveBeenCalled();
    });
  });

  describe('apply poison', () => {
    it('shows Apply Poison when hasApplyPoison and poisonDoses > 0', () => {
      useRuntimeValue.mockImplementation((name, key) => {
        if (key === 'poisonDoses') return 3;
        if (key === 'bolsteringTreat') return 0;
        if (key === 'chefBolsteringTreats') return 0;
        if (key === 'activeBuffs') return null;
        return null;
      });
      getRuntimeValue.mockReturnValue(null);
      const stats = createStats({
        abilities: [
          { name: 'Dexterity', bonus: 3 },
          { name: 'Intelligence', bonus: 1 },
        ],
        proficiency: 3,
        automation: { bonusActions: [{ type: 'apply_poison', name: 'Apply Poison' }] },
        bonusActions: [{ name: 'TestFeature', description: 'test' }],
      });
      render(<CharBonusActions playerStats={stats} campaignName="test" />);
      expect(screen.getByText(/Apply Poison:/)).toBeInTheDocument();
    });

    it('does not show Apply Poison when poisonDoses is 0', () => {
      useRuntimeValue.mockImplementation((name, key) => {
        if (key === 'poisonDoses') return 0;
        if (key === 'bolsteringTreat') return 0;
        if (key === 'chefBolsteringTreats') return 0;
        if (key === 'activeBuffs') return null;
        return null;
      });
      getRuntimeValue.mockReturnValue(null);
      const stats = createStats({
        automation: { bonusActions: [{ type: 'apply_poison', name: 'Apply Poison' }] },
        bonusActions: [{ name: 'TestFeature', description: 'test' }],
      });
      render(<CharBonusActions playerStats={stats} campaignName="test" />);
      expect(screen.queryByText(/Apply Poison:/)).not.toBeInTheDocument();
    });

    it('does not show Apply Poison when cannotAct is true', () => {
      useRuntimeValue.mockImplementation((name, key) => {
        if (key === 'poisonDoses') return 3;
        if (key === 'bolsteringTreat') return 0;
        if (key === 'chefBolsteringTreats') return 0;
        if (key === 'activeBuffs') return null;
        return null;
      });
      getRuntimeValue.mockReturnValue(null);
      const stats = createStats({
        automation: { bonusActions: [{ type: 'apply_poison', name: 'Apply Poison' }] },
        bonusActions: [{ name: 'TestFeature', description: 'test' }],
      });
      render(<CharBonusActions playerStats={stats} campaignName="test" cannotAct={true} />);
      expect(screen.queryByText(/Apply Poison:/)).not.toBeInTheDocument();
    });

    it('decrements poisonDoses and sets poisonedWeaponsActive when clicked', async () => {
      useRuntimeValue.mockImplementation((name, key) => {
        if (key === 'poisonDoses') return 2;
        if (key === 'bolsteringTreat') return 0;
        if (key === 'chefBolsteringTreats') return 0;
        if (key === 'activeBuffs') return null;
        return null;
      });
      getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'poisonDoses') return 2;
        return null;
      });
      const stats = createStats({
        name: 'PoisonCharacter',
        abilities: [
          { name: 'Dexterity', bonus: 3 },
          { name: 'Intelligence', bonus: 1 },
        ],
        proficiency: 3,
        automation: { bonusActions: [{ type: 'apply_poison', name: 'Apply Poison' }] },
        bonusActions: [{ name: 'TestFeature', description: 'test' }],
      });
      render(<CharBonusActions playerStats={stats} campaignName="test" />);
      fireEvent.click(screen.getByText(/Apply Poison:/));
      await waitFor(() => {
        expect(setRuntimeValue).toHaveBeenCalledWith('PoisonCharacter', 'poisonDoses', 1, 'test');
        expect(setRuntimeValue).toHaveBeenCalledWith('PoisonCharacter', 'poisonedWeaponsActive', true, 'test');
      });
    });

    it('logs apply poison entry with correct save DC', async () => {
      useRuntimeValue.mockImplementation((name, key) => {
        if (key === 'poisonDoses') return 1;
        if (key === 'bolsteringTreat') return 0;
        if (key === 'chefBolsteringTreats') return 0;
        if (key === 'activeBuffs') return null;
        return null;
      });
      getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'poisonDoses') return 1;
        return null;
      });
      const stats = createStats({
        abilities: [
          { name: 'Dexterity', bonus: 3 },
          { name: 'Intelligence', bonus: 1 },
        ],
        proficiency: 3,
        automation: { bonusActions: [{ type: 'apply_poison', name: 'Apply Poison' }] },
        bonusActions: [{ name: 'TestFeature', description: 'test' }],
      });
      render(<CharBonusActions playerStats={stats} campaignName="test" />);
      fireEvent.click(screen.getByText(/Apply Poison:/));
      await waitFor(() => {
        expect(addEntry).toHaveBeenCalledWith('test', expect.objectContaining({
          type: 'ability_use',
          abilityName: 'Apply Poison',
        }));
      });
    });

    it('computes save DC from max(dex, int) mod + proficiency', async () => {
      vi.mocked(useRuntimeValue).mockImplementation((name, key) => {
        if (key === 'poisonDoses') return 1;
        if (key === 'bolsteringTreat') return 0;
        if (key === 'chefBolsteringTreats') return 0;
        if (key === 'activeBuffs') return null;
        return null;
      });
      const poisonDosesMock = vi.fn((name, key) => {
        if (key === 'poisonDoses') return 1;
        return null;
      });
      getRuntimeValue.mockImplementation(poisonDosesMock);
      const stats = createStats({
        abilities: [
          { name: 'Dexterity', bonus: 5 },
          { name: 'Intelligence', bonus: 2 },
        ],
        proficiency: 3,
        automation: { bonusActions: [{ type: 'apply_poison', name: 'Apply Poison' }] },
        bonusActions: [{ name: 'TestFeature', description: 'test' }],
      });
      render(<CharBonusActions playerStats={stats} campaignName="test" />);
      fireEvent.click(screen.getByText(/Apply Poison:/));
      await waitFor(() => {
        expect(poisonDosesMock).toHaveBeenCalled();
        expect(addEntry).toHaveBeenCalled();
        expect(addEntry.mock.calls[0][1].type).toBe('ability_use');
        expect(addEntry.mock.calls[0][1].abilityName).toBe('Apply Poison');
      });
    });
  });

  describe('sacred weapon buff on hit bonus', () => {
    it('adds sacred weapon bonus to hit for melee attacks when buff is active', () => {
      const mockGrv = vi.fn((name, key) => {
        if (key === 'activeBuffs') return [{ effect: 'sacred_weapon' }];
        return null;
      });
      getRuntimeValue.mockImplementation(mockGrv);
      const stats = createStats({
        abilities: [{ name: 'Charisma', bonus: 4 }],
        attacks: [{ name: 'Rapier', range: 5, hitBonus: 5, damage: '1d8+3', damageType: 'Piercing', type: 'Bonus Action', weaponType: 'melee' }],
      });
      render(<CharBonusActions playerStats={stats} exhaustionPenalty={0} />);
      expect(screen.getByText(/\+9/)).toBeInTheDocument();
    });

    it('does not add sacred weapon bonus for ranged attacks', () => {
      const mockGrv = vi.fn((name, key) => {
        if (key === 'activeBuffs') return [{ effect: 'sacred_weapon' }];
        return null;
      });
      getRuntimeValue.mockImplementation(mockGrv);
      const stats = createStats({
        abilities: [{ name: 'Charisma', bonus: 4 }],
        attacks: [{ name: 'Shortbow', range: 80, hitBonus: 5, damage: '1d6+3', damageType: 'Piercing', type: 'Bonus Action', weaponType: 'ranged' }],
      });
      render(<CharBonusActions playerStats={stats} exhaustionPenalty={0} />);
      expect(screen.getByText(/\+5/)).toBeInTheDocument();
    });

    it('adds sacred weapon bonus for unarmed attacks', () => {
      const mockGrv = vi.fn((name, key) => {
        if (key === 'activeBuffs') return [{ effect: 'sacred_weapon' }];
        return null;
      });
      getRuntimeValue.mockImplementation(mockGrv);
      const stats = createStats({
        abilities: [{ name: 'Charisma', bonus: 4 }],
        attacks: [{ name: 'Unarmed Strike', range: 5, hitBonus: 5, damage: '1d4+3', damageType: 'Bludgeoning', type: 'Bonus Action', weaponType: 'unarmed' }],
      });
      render(<CharBonusActions playerStats={stats} exhaustionPenalty={0} />);
      expect(screen.getByText(/\+9/)).toBeInTheDocument();
    });
  });

});
