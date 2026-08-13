// @improved-by-ai
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

vi.mock('./popups/MetamagicPopup.jsx', () => ({
  default: vi.fn((props) => <div data-testid="metamagic-popup">{props.spell?.name || 'MetamagicPopup'}</div>),
}));

vi.mock('../../hooks/combat/DiceRollContext.js', () => ({
  useDiceRollPopup: vi.fn(() => ({ popupHtml: null, setPopupHtml: vi.fn() })),
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

vi.mock('./char-spells/SpellDetailPopup.jsx', () => ({
  default: vi.fn((props) => {
    return (
      <div data-testid="spell-detail-popup">
        <div data-testid="spell-name">{props.spell?.name}</div>
        {props.onClose && <button data-testid="close-btn" onClick={props.onClose}>Close</button>}
        {props.onCast && <button data-testid="cast-btn" onClick={() => props.onCast(props.spell, {})}>Cast</button>}
      </div>
    );
  }),
}));

vi.mock('../../services/rules/spells/spellCastService.js', () => ({
  executeSpellCast: vi.fn(),
}));

import { useSpellMetamagicFlow } from '../../hooks/combat/useSpellMetamagicFlow.js';
import { useSpellUpcastFlow } from '../../hooks/combat/useSpellUpcastFlow.js';
import { addEntry } from '../../services/ui/logService.js';

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

describe('CharBonusActions - Spell Cast Flow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  describe('spell detail popup', () => {
    const bonusActionSpell = { name: 'Shocking Grasp', range: 'Touch', casting_time: '1 bonus action', prepared: 'Prepared' };

    it('opens spell detail popup when clicking a spell name', async () => {
      render(<CharBonusActions playerStats={createStats({ spellAbilities: { spells: [bonusActionSpell] } })} />);
      fireEvent.click(screen.getByText('Shocking Grasp'));
      await waitFor(() => {
        expect(screen.getByTestId('spell-detail-popup')).toBeInTheDocument();
      });
    });

    it('passes upcastLevels to SpellDetailPopup via buildUpcastLevels', async () => {
      const buildUpcastLevelsMock = vi.fn(() => [1, 2, 3]);
      // Replace the module-level mock for useSpellUpcastFlow
      vi.mocked(useSpellUpcastFlow).mockReturnValue({ buildUpcastLevels: buildUpcastLevelsMock });
      render(<CharBonusActions playerStats={createStats({ spellAbilities: { spells: [bonusActionSpell] } })} />);
      fireEvent.click(screen.getByText('Shocking Grasp'));
      await waitFor(() => {
        expect(buildUpcastLevelsMock).toHaveBeenCalledWith(bonusActionSpell);
      });
    });
  });

  describe('MetamagicPopup rendering', () => {
    it('renders MetamagicPopup when pendingMetamagic is set', () => {
      vi.mocked(useSpellMetamagicFlow).mockReturnValue({
        pendingMetamagic: { spellName: 'Fireball', spellLevel: 3, _currentSP: 5 },
        gateMetamagic: vi.fn(),
        handleConfirm: vi.fn(),
        handleSkip: vi.fn(),
        pendingAid: null,
        handleAidConfirm: vi.fn(),
        handleAidSkip: vi.fn(),
        pendingGreaterRestoration: null,
        handleGreaterRestorationConfirm: vi.fn(),
        handleGreaterRestorationSkip: vi.fn(),
      });
      render(<CharBonusActions playerStats={createStats({ spellAbilities: { spells: [{ name: 'Shocking Grasp', range: 'Touch', casting_time: '1 bonus action', prepared: 'Prepared' }] } })} />);
      expect(screen.getByTestId('metamagic-popup')).toBeInTheDocument();
    });

    it('renders SecondaryTargetModal for pendingBarkskin', () => {
      vi.mocked(useSpellMetamagicFlow).mockReturnValue({
        pendingMetamagic: null,
        gateMetamagic: vi.fn(),
        handleConfirm: vi.fn(),
        handleSkip: vi.fn(),
        pendingBarkskin: { creatureTargets: ['Goblin', 'Skeleton'] },
        handleBarkskinConfirm: vi.fn(),
        handleBarkskinSkip: vi.fn(),
        pendingHealingWord: null,
        handleHealingWordConfirm: vi.fn(),
        handleHealingWordSkip: vi.fn(),
        pendingSanctuary: null,
        handleSanctuaryConfirm: vi.fn(),
        handleSanctuarySkip: vi.fn(),
        pendingAid: null,
        handleAidConfirm: vi.fn(),
        handleAidSkip: vi.fn(),
        pendingGreaterRestoration: null,
        handleGreaterRestorationConfirm: vi.fn(),
        handleGreaterRestorationSkip: vi.fn(),
      });
      render(<CharBonusActions playerStats={createStats({ spellAbilities: { spells: [{ name: 'Barkskin', range: '60 ft.', casting_time: '1 bonus action', prepared: 'Prepared' }] } })} />);
      expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
    });

    it('renders SecondaryTargetModal for pendingHealingWord', () => {
      vi.mocked(useSpellMetamagicFlow).mockReturnValue({
        pendingMetamagic: null,
        gateMetamagic: vi.fn(),
        handleConfirm: vi.fn(),
        handleSkip: vi.fn(),
        pendingBarkskin: null,
        handleBarkskinConfirm: vi.fn(),
        handleBarkskinSkip: vi.fn(),
        pendingHealingWord: { creatureTargets: ['Ally1'] },
        handleHealingWordConfirm: vi.fn(),
        handleHealingWordSkip: vi.fn(),
        pendingSanctuary: null,
        handleSanctuaryConfirm: vi.fn(),
        handleSanctuarySkip: vi.fn(),
        pendingAid: null,
        handleAidConfirm: vi.fn(),
        handleAidSkip: vi.fn(),
        pendingGreaterRestoration: null,
        handleGreaterRestorationConfirm: vi.fn(),
        handleGreaterRestorationSkip: vi.fn(),
      });
      render(<CharBonusActions playerStats={createStats({ spellAbilities: { spells: [{ name: 'Healing Word', range: '60 ft.', casting_time: '1 bonus action', prepared: 'Prepared' }] } })} />);
      expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
    });

    it('renders SecondaryTargetModal for pendingSanctuary', () => {
      vi.mocked(useSpellMetamagicFlow).mockReturnValue({
        pendingMetamagic: null,
        gateMetamagic: vi.fn(),
        handleConfirm: vi.fn(),
        handleSkip: vi.fn(),
        pendingBarkskin: null,
        handleBarkskinConfirm: vi.fn(),
        handleBarkskinSkip: vi.fn(),
        pendingHealingWord: null,
        handleHealingWordConfirm: vi.fn(),
        handleHealingWordSkip: vi.fn(),
        pendingSanctuary: { creatureTargets: ['Ally1'] },
        handleSanctuaryConfirm: vi.fn(),
        handleSanctuarySkip: vi.fn(),
        pendingAid: null,
        handleAidConfirm: vi.fn(),
        handleAidSkip: vi.fn(),
        pendingGreaterRestoration: null,
        handleGreaterRestorationConfirm: vi.fn(),
        handleGreaterRestorationSkip: vi.fn(),
      });
      render(<CharBonusActions playerStats={createStats({ spellAbilities: { spells: [{ name: 'Sanctuary', range: '30 ft.', casting_time: '1 bonus action', prepared: 'Prepared' }] } })} />);
      expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
    });
  });

  describe('damage roll gating by cannotAct', () => {
    const bonusActionAttack = { name: 'Main Gauche', range: 5, hitBonus: 5, damage: '1d4+3', damageType: 'Piercing', type: 'Bonus Action' };

    it.each([
      { cannotAct: true, expectLogEntry: false, label: 'blocks' },
      { cannotAct: false, expectLogEntry: true, label: 'allows' },
    ])('($label) damage roll log entry when cannotAct is $cannotAct', async ({ cannotAct, expectLogEntry }) => {
      render(<CharBonusActions playerStats={createStats({ attacks: [bonusActionAttack] })} campaignName="test-campaign" cannotAct={cannotAct} />);
      fireEvent.click(screen.getByText('1d4+3'));
      if (expectLogEntry) {
        await waitFor(() => {
          expect(vi.mocked(addEntry)).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
            type: 'roll',
            rollType: 'damage',
            name: 'Main Gauche',
            formula: '1d4+3',
            note: 'Direct damage roll (no target)',
          }));
        });
      } else {
        await waitFor(() => {
          expect(vi.mocked(addEntry)).not.toHaveBeenCalled();
        });
      }
    });
  });

  describe('bonus action spells with save DC', () => {
    const saveDcSpell = {
      name: 'Bane',
      level: 1,
      range: '30 ft.',
      casting_time: '1 bonus action',
      prepared: 'Prepared',
      dc: { dc_type: 'CHA', dc_success: 'failure' },
      damage: { damage_at_slot_level: { 1: '3d8' }, damage_type: 'Psychic' },
    };

    it('calls gateMetamagic when save DC spell damage is clicked', () => {
      const gateMetamagicMock = vi.fn();
      vi.mocked(useSpellMetamagicFlow).mockReturnValue({
        pendingMetamagic: null,
        gateMetamagic: gateMetamagicMock,
        handleConfirm: vi.fn(),
        handleSkip: vi.fn(),
        pendingBarkskin: null,
        handleBarkskinConfirm: vi.fn(),
        handleBarkskinSkip: vi.fn(),
        pendingHealingWord: null,
        handleHealingWordConfirm: vi.fn(),
        handleHealingWordSkip: vi.fn(),
        pendingSanctuary: null,
        handleSanctuaryConfirm: vi.fn(),
        handleSanctuarySkip: vi.fn(),
        pendingAid: null,
        handleAidConfirm: vi.fn(),
        handleAidSkip: vi.fn(),
        pendingGreaterRestoration: null,
        handleGreaterRestorationConfirm: vi.fn(),
        handleGreaterRestorationSkip: vi.fn(),
      });
      render(<CharBonusActions playerStats={createStats({ spellAbilities: { spells: [saveDcSpell] } })} />);
      fireEvent.click(screen.getByText('3d8'));
      expect(gateMetamagicMock).toHaveBeenCalled();
    });
  });

  describe('bonus action spells with attack type', () => {
    const spellAttack = {
      name: 'Ray of Sickness',
      level: 1,
      range: '60 ft.',
      casting_time: '1 bonus action',
      prepared: 'Prepared',
      attack_type: 'spell',
      damage: { damage_at_slot_level: { 1: '2d8' }, damage_type: 'Poison' },
    };

    it('calls onAttackClick when spell attack hit bonus is clicked', () => {
      const mockOnAttackClick = vi.fn();
      render(<CharBonusActions playerStats={createStats({ spellAbilities: { spells: [spellAttack], toHit: 6 } })} onAttackClick={mockOnAttackClick} exhaustionPenalty={0} />);
      fireEvent.click(screen.getByText('+6'));
      expect(mockOnAttackClick).toHaveBeenCalled();
    });
  });

  describe('spell damage display for healing spells', () => {
    const healingSpell = { name: 'Healing Word', level: 1, range: '60 ft.', casting_time: '1 bonus action', prepared: 'Prepared', heal_at_slot_level: true };

    it('shows "Healing" type label for healing spells', () => {
      render(<CharBonusActions playerStats={createStats({ spellAbilities: { spells: [healingSpell] } })} />);
      expect(screen.getByText('Healing')).toBeInTheDocument();
    });
  });

  describe('spell damage display with resolved damage', () => {
    const damageSpell = { name: 'Wrathful Smite', level: 1, range: 'Touch', casting_time: '1 bonus action', prepared: 'Prepared', damage: { damage_at_slot_level: { 1: '1d6' }, damage_type: 'Psychic' } };

    it('shows resolved damage for bonus action spells', () => {
      render(<CharBonusActions playerStats={createStats({ spellAbilities: { spells: [damageSpell] } })} />);
      expect(screen.getByText('1d6')).toBeInTheDocument();
    });
  });

  describe('cannotAct blocking on bonus action spells', () => {
    const bonusActionSpell = { name: 'Shocking Grasp', range: 'Touch', casting_time: '1 bonus action', prepared: 'Prepared' };

    it('does not call gateMetamagic when cannotAct is true for spell damage click', () => {
      const gateMetamagicMock = vi.fn();
      vi.mocked(useSpellMetamagicFlow).mockReturnValue({
        pendingMetamagic: null,
        gateMetamagic: gateMetamagicMock,
        handleConfirm: vi.fn(),
        handleSkip: vi.fn(),
        pendingBarkskin: null,
        handleBarkskinConfirm: vi.fn(),
        handleBarkskinSkip: vi.fn(),
        pendingHealingWord: null,
        handleHealingWordConfirm: vi.fn(),
        handleHealingWordSkip: vi.fn(),
        pendingSanctuary: null,
        handleSanctuaryConfirm: vi.fn(),
        handleSanctuarySkip: vi.fn(),
        pendingAid: null,
        handleAidConfirm: vi.fn(),
        handleAidSkip: vi.fn(),
        pendingGreaterRestoration: null,
        handleGreaterRestorationConfirm: vi.fn(),
        handleGreaterRestorationSkip: vi.fn(),
      });
      render(<CharBonusActions playerStats={createStats({ spellAbilities: { spells: [bonusActionSpell] } })} campaignName="test-campaign" cannotAct={true} />);
      fireEvent.click(screen.getByText('Shocking Grasp'));
      fireEvent.click(screen.getByTestId('cast-btn'));
      expect(gateMetamagicMock).not.toHaveBeenCalled();
    });
  });

});
