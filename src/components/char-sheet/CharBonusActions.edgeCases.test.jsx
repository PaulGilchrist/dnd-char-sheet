// @improved-by-ai
// @cleaned-by-ai
import { render, screen } from '@testing-library/react';
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

vi.mock('../../services/automation/handlers/combat/saveAttackHandler.js', () => ({
  isExhausted: vi.fn(() => false),
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

vi.mock('./HexAbilityModal.jsx', () => ({
  default: vi.fn((props) => <div data-testid="hex-ability-modal"><button onClick={props.onCancel}>Cancel</button></div>),
}));

vi.mock('./modals/shared/SecondaryTargetModal.jsx', () => ({
  default: vi.fn((props) => <div data-testid="secondary-target-modal">{props.title}</div>),
}));

vi.mock('./ArcaneVigorModal.jsx', () => ({
  default: vi.fn(() => <div data-testid="arcane-vigor-modal">Arcane Vigor</div>),
}));

vi.mock('../../services/rules/core/spellDamageUtils.js', () => ({
  resolveSpellDamageAtLevel: vi.fn(() => null),
  isAutoHitSpell: vi.fn(() => false),
  resolveHealExpression: vi.fn(() => ''),
}));

vi.mock('../../services/ui/spellSectionUtils.js', () => ({
  getBonusActionSpellNames: vi.fn(() => new Set()),
}));

vi.mock('../../services/character/featureCategories.js', () => ({
  getCategories: vi.fn(() => ({ featuresToIgnore: ['Spellcasting'] })),
}));

vi.mock('../../hooks/combat/useSimpleDamageRoll.js', () => ({
  useSimpleDamageRoll: vi.fn(() => vi.fn()),
}));

vi.mock('../../hooks/combat/useSpellPositionResolver.js', () => ({
  useSpellPositionResolver: vi.fn(() => ({ resolvePositions: vi.fn(), cachedPosRef: {} })),
}));

vi.mock('../../hooks/combat/useSpellCastExecutor.js', () => ({
  useSpellCastExecutor: vi.fn(() => ({ castAction: vi.fn() })),
}));

vi.mock('../../services/ui/formatUtils.js', () => ({
  formatRange: vi.fn((range) => range || ''),
  signFormatter: { format: (n) => (n >= 0 ? `+${n}` : `${n}`) },
  getAttackSpellLevel: vi.fn(() => null),
}));

import { getRuntimeValue, useRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { getBonusActionSpellNames } from '../../services/ui/spellSectionUtils.js';

const basePlayerStats = {
  name: 'TestCharacter',
  rules: '2024',
  level: 5,
  attacks: [],
  bonusActions: [],
  spellAbilities: { spells: [] },
};

function createStats(overrides = {}) {
  return { ...basePlayerStats, ...overrides };
}

describe('CharBonusActions - Edge Cases', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  describe('Nick mastery round check (2024 rules)', () => {
    const lightWeaponAttack = {
      name: 'Dagger',
      range: 5,
      hitBonus: 5,
      damage: '1d4+3',
      damageType: 'Piercing',
      type: 'Bonus Action',
      properties: ['Light'],
    };

    it.each([
      { label: 'filters out', nickRound: 1, currentRound: 1, shouldShow: false },
      { label: 'shows when rounds differ', nickRound: 5, currentRound: 1, shouldShow: true },
    ])('Nick mastery: $label Light weapon when _Nick_UsedRound=$nickRound and currentRound=$currentRound', ({ shouldShow }) => {
      vi.mocked(getRuntimeValue).mockImplementation((name, key) => {
        if (key === '_Nick_UsedRound') return shouldShow ? 5 : 1;
        return null;
      });
      const stats = createStats({ attacks: [lightWeaponAttack] });
      render(<CharBonusActions playerStats={stats} getWeaponMastery={() => null} />);
      if (shouldShow) {
        expect(screen.getByText('Dagger')).toBeInTheDocument();
      }
      else {
        expect(screen.queryByText('Dagger')).not.toBeInTheDocument();
      }
    });

    it('does not filter Light weapons when not using 2024 rules', () => {
      vi.mocked(getRuntimeValue).mockImplementation((name, key) => {
        if (key === '_Nick_UsedRound') return 1;
        return null;
      });
      const stats = createStats({ rules: '5e', attacks: [lightWeaponAttack] });
      render(<CharBonusActions playerStats={stats} getWeaponMastery={() => null} />);
      expect(screen.getByText('Dagger')).toBeInTheDocument();
    });
  });

  describe('Elder Champion spell conversion', () => {
    it('shows both bonus action and converted action spells when Elder Champion is active', async () => {
      vi.mocked(getRuntimeValue).mockImplementation((name, key) => {
        if (key === 'activeBuffs') return [{ name: 'Elder Champion' }];
        return null;
      });
      vi.mocked(useRuntimeValue).mockImplementation((name, key) => {
        if (key === 'activeBuffs') return [{ name: 'Elder Champion' }];
        return null;
      });
      vi.mocked(getBonusActionSpellNames).mockImplementation(() => {
        return new Set(['Shocking Grasp', 'Shooting Star', 'Misty Step']);
      });
      const spells = [
        { name: 'Shocking Grasp', range: 'Touch', casting_time: '1 bonus action', prepared: 'Prepared' },
        { name: 'Shooting Star', range: '60 ft.', casting_time: '1 action', prepared: 'Prepared' },
        { name: 'Misty Step', range: '30 ft.', casting_time: '1 bonus action', prepared: 'Prepared' },
      ];
      const stats = createStats({ spellAbilities: { spells } });
      render(<CharBonusActions playerStats={stats} />);
      expect(screen.getByText('Shocking Grasp')).toBeInTheDocument();
      expect(screen.getByText('Shooting Star')).toBeInTheDocument();
      expect(screen.getByText('Misty Step')).toBeInTheDocument();
    });
  });

  describe('cannotAct blocking edge cases', () => {
    const bonusActionAttack = {
      name: 'Main Gauche',
      range: 5,
      hitBonus: 5,
      damage: '1d4+3',
      damageType: 'Piercing',
      type: 'Bonus Action',
    };

    it('adds disabled-attack class to hit bonus when cannotAct is true', () => {
      const mockOnAttackClick = vi.fn();
      const stats = createStats({ attacks: [bonusActionAttack] });
      render(<CharBonusActions playerStats={stats} onAttackClick={mockOnAttackClick} cannotAct={true} exhaustionPenalty={0} />);
      const hitBonusElement = screen.getByText('+5');
      expect(hitBonusElement).toHaveClass('disabled-attack');
    });
  });

  describe('non-Light bonus action attacks in 2024 rules', () => {
    const nonLightAttack = {
      name: 'Main Gauche',
      range: 5,
      hitBonus: 5,
      damage: '1d4+3',
      damageType: 'Piercing',
      type: 'Bonus Action',
    };

    it('shows non-Light bonus action attacks regardless of Nick mastery round', () => {
      vi.mocked(getRuntimeValue).mockImplementation((name, key) => {
        if (key === '_Nick_UsedRound') return 1;
        return null;
      });
      const stats = createStats({ attacks: [nonLightAttack] });
      render(<CharBonusActions playerStats={stats} getWeaponMastery={() => null} />);
      expect(screen.getByText('Main Gauche')).toBeInTheDocument();
    });
  });

  describe('isHordeBreaker always filtered', () => {
    const hordeBreakerAttack = {
      name: 'Horde Breaker',
      range: 30,
      hitBonus: 5,
      damage: '1d8+3',
      damageType: 'Piercing',
      type: 'Bonus Action',
      isHordeBreaker: true,
    };

    it('filters out Horde Breaker regardless of campaignName or other props', () => {
      const stats = createStats({ attacks: [hordeBreakerAttack] });
      render(<CharBonusActions playerStats={stats} campaignName="any-campaign" getWeaponMastery={() => null} />);
      expect(screen.queryByText('Horde Breaker')).not.toBeInTheDocument();
    });
  });
});
