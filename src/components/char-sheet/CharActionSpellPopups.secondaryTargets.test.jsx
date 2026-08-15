// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CharActionSpellPopups from './CharActionSpellPopups.jsx';

vi.mock('../common/popup.jsx', () => ({
  default: function TestPopup({ children }) {
    return <div data-testid="popup">{children}</div>;
  },
}));

vi.mock('./popups/MetamagicPopup.jsx', () => ({
  default: function TestMetamagicPopup() {
    return <div data-testid="metamagic-popup" />;
  },
}));

vi.mock('./modals/shared/CreatureSelectionModal.jsx', () => ({
  default: function TestCreatureSelectionModal() {
    return <div data-testid="creature-selection-modal" />;
  },
}));

vi.mock('./modals/shared/SecondaryTargetModal.jsx', () => ({
  default: function TestSecondaryTargetModal({ title, targets, onTargetSelected, onSkip, description, confirmLabel, hideConfirm }) {
    return (
      <div data-testid={`secondary-modal-${title}`}>
        <span data-testid="title">{title}</span>
        <span data-testid="description">{description}</span>
        <span data-testid="confirm-label">{confirmLabel}</span>
        {targets?.map((t, i) => (
          <span
            key={i}
            data-testid={`target-${i}`}
            data-target-value={t.value !== undefined ? t.value : t.name}
            onClick={() => onTargetSelected(t.value !== undefined ? t.value : t.name)}
          >
            {t.value !== undefined ? t.label : t.name}
          </span>
        ))}
        {!hideConfirm && targets?.length > 0 ? (
          <button data-testid="confirm" onClick={() => onTargetSelected(targets[0].value !== undefined ? targets[0].value : targets[0].name)}>Confirm</button>
        ) : null}
        <button data-testid="skip" onClick={onSkip}>Skip</button>
      </div>
    );
  },
}));

vi.mock('./char-spells/SpellDetailPopup.jsx', () => ({
  default: function TestSpellDetailPopup() {
    return <div data-testid="spell-detail-popup" />;
  },
}));

vi.mock('./popups/MagicMissileTargetPopup.jsx', () => ({
  default: function TestMagicMissileTargetPopup() {
    return <div data-testid="magic-missile-popup" />;
  },
}));

vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getTargetFromAttacker: vi.fn(() => null),
}));

vi.mock('../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => null),
}));

const runtimeStore = new Map();

function buildRuntimeKey(k, p) {
  return `${k}:${p}`;
}

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn((key, prop) => {
    return runtimeStore.get(buildRuntimeKey(key, prop)) ?? null;
  }),
  setRuntimeValue: vi.fn(),
}));

function setTargetEffects(effects) {
  runtimeStore.set(buildRuntimeKey('campaign', 'targetEffects'), effects);
}

function createBaseProps(overrides) {
  return {
    playerStats: { name: 'Test Character', level: 5 },
    campaignName: 'test-campaign',
    selectedActionSpell: null,
    setSelectedActionSpell: vi.fn(),
    buildUpcastLevels: vi.fn(() => []),
    handleActionSpellCast: vi.fn(),
    actionPendingMetamagic: null,
    actionHandleConfirm: vi.fn(),
    actionHandleSkip: vi.fn(),
    actionPendingAid: null,
    actionHandleAidConfirm: vi.fn(),
    actionHandleAidSkip: vi.fn(),
    actionPendingBane: null,
    actionHandleBaneConfirm: vi.fn(),
    actionHandleBaneSkip: vi.fn(),
    actionPendingBless: null,
    actionHandleBlessConfirm: vi.fn(),
    actionHandleBlessSkip: vi.fn(),
    actionPendingFaerieFire: null,
    actionHandleFaerieFireConfirm: vi.fn(),
    actionHandleFaerieFireSkip: vi.fn(),
    actionPendingBeaconOfHope: null,
    actionHandleBeaconOfHopeConfirm: vi.fn(),
    actionHandleBeaconOfHopeSkip: vi.fn(),
    actionPendingPassWithoutTrace: null,
    actionHandlePassWithoutTraceConfirm: vi.fn(),
    actionHandlePassWithoutTraceSkip: vi.fn(),
    actionPendingHaste: null,
    actionHandleHasteConfirm: vi.fn(),
    actionHandleHasteSkip: vi.fn(),
    actionPendingBarkskin: null,
    actionHandleBarkskinConfirm: vi.fn(),
    actionHandleBarkskinSkip: vi.fn(),
    actionPendingHeal: null,
    actionHandleHealConfirm: vi.fn(),
    actionHandleHealSkip: vi.fn(),
    actionPendingGreaterRestoration: null,
    actionHandleGreaterRestorationConfirm: vi.fn(),
    actionHandleGreaterRestorationSkip: vi.fn(),
    actionHandleGreaterRestorationNoEffects: vi.fn(),
    actionPendingRemoveCurse: null,
    actionHandleRemoveCurseConfirm: vi.fn(),
    actionHandleRemoveCurseSkip: vi.fn(),
    actionPendingMagicMissile: null,
    actionHandleMagicMissileConfirm: vi.fn(),
    actionHandleMagicMissileSkip: vi.fn(),
    actionPendingMageArmor: null,
    actionHandleMageArmorConfirm: vi.fn(),
    actionHandleMageArmorSkip: vi.fn(),
    actionPendingCureWounds: null,
    actionHandleCureWoundsConfirm: vi.fn(),
    actionHandleCureWoundsSkip: vi.fn(),
    actionPendingRevivify: null,
    actionHandleRevivifyConfirm: vi.fn(),
    actionHandleRevivifySkip: vi.fn(),
    pendingActionMetamagic: null,
    handleActionMetamagicConfirm: vi.fn(),
    handleActionMetamagicSkip: vi.fn(),
    ...overrides,
  };
}

describe('CharActionSpellPopups - SecondaryTargetModal Spells', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeStore.clear();
    setTargetEffects(null);
  });

  describe('Haste spell', () => {
    it('renders with correct title, description, and confirm label', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingHaste: { creatureTargets: ['Ally1', 'Ally2'] },
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Haste');
      expect(screen.getByTestId('description')).toHaveTextContent('speed doubles');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Haste');
    });

    it('renders targets from creatureTargets', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingHaste: { creatureTargets: ['Ally1', 'Ally2'] },
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally1');
      expect(screen.getByTestId('target-1')).toHaveTextContent('Ally2');
    });

    it('renders no targets when creatureTargets is empty', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingHaste: { creatureTargets: [] },
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Haste');
      expect(screen.queryByTestId('target-0')).not.toBeInTheDocument();
    });

    it('calls actionHandleHasteConfirm with single-element array on target select', () => {
      const actionHandleHasteConfirm = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleHasteConfirm })}
          actionPendingHaste={{ creatureTargets: ['Ally1'] }}
        />
      );
      screen.getByTestId('target-0').click();
      expect(actionHandleHasteConfirm).toHaveBeenCalledWith(['Ally1']);
    });

    it('calls actionHandleHasteSkip on skip', () => {
      const actionHandleHasteSkip = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleHasteSkip })}
          actionPendingHaste={{ creatureTargets: ['Ally1'] }}
        />
      );
      screen.getByTestId('skip').click();
      expect(actionHandleHasteSkip).toHaveBeenCalled();
    });
  });

  describe('Barkskin spell', () => {
    it('renders with correct title, description, and confirm label', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingBarkskin: { creatureTargets: ['Ally1'] },
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Barkskin');
      expect(screen.getByTestId('description')).toHaveTextContent('AC becomes 17');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Barkskin');
    });

    it('calls actionHandleBarkskinConfirm with single-element array on target select', () => {
      const actionHandleBarkskinConfirm = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleBarkskinConfirm })}
          actionPendingBarkskin={{ creatureTargets: ['Ally1'] }}
        />
      );
      screen.getByTestId('target-0').click();
      expect(actionHandleBarkskinConfirm).toHaveBeenCalledWith(['Ally1']);
    });

    it('calls actionHandleBarkskinSkip on skip', () => {
      const actionHandleBarkskinSkip = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleBarkskinSkip })}
          actionPendingBarkskin={{ creatureTargets: ['Ally1'] }}
        />
      );
      screen.getByTestId('skip').click();
      expect(actionHandleBarkskinSkip).toHaveBeenCalled();
    });
  });

  describe('Mage Armor spell', () => {
    it('renders with correct title, description, and confirm label', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingMageArmor: { creatureTargets: ['Ally1'] },
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Mage Armor');
      expect(screen.getByTestId('description')).toHaveTextContent('13 + Dexterity modifier');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Mage Armor');
    });

    it('calls actionHandleMageArmorConfirm with single-element array on target select', () => {
      const actionHandleMageArmorConfirm = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleMageArmorConfirm })}
          actionPendingMageArmor={{ creatureTargets: ['Ally1'] }}
        />
      );
      screen.getByTestId('target-0').click();
      expect(actionHandleMageArmorConfirm).toHaveBeenCalledWith(['Ally1']);
    });

    it('calls actionHandleMageArmorSkip on skip', () => {
      const actionHandleMageArmorSkip = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleMageArmorSkip })}
          actionPendingMageArmor={{ creatureTargets: ['Ally1'] }}
        />
      );
      screen.getByTestId('skip').click();
      expect(actionHandleMageArmorSkip).toHaveBeenCalled();
    });
  });

  describe('Heal spell', () => {
    it('renders with correct title, description, and confirm label', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingHeal: { creatureTargets: ['Ally1'] },
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Heal');
      expect(screen.getByTestId('description')).toHaveTextContent('70 hit points');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Heal');
    });

    it('calls actionHandleHealConfirm with {targetName} object on target select', () => {
      const actionHandleHealConfirm = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleHealConfirm })}
          actionPendingHeal={{ creatureTargets: ['Ally1'] }}
        />
      );
      screen.getByTestId('target-0').click();
      expect(actionHandleHealConfirm).toHaveBeenCalledWith({ targetName: 'Ally1' });
    });

    it('calls actionHandleHealSkip on skip', () => {
      const actionHandleHealSkip = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleHealSkip })}
          actionPendingHeal={{ creatureTargets: ['Ally1'] }}
        />
      );
      screen.getByTestId('skip').click();
      expect(actionHandleHealSkip).toHaveBeenCalled();
    });
  });

  describe('Cure Wounds spell', () => {
    it('renders with correct title, description, and confirm label', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingCureWounds: { creatureTargets: ['Ally1'] },
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Cure Wounds');
      expect(screen.getByTestId('description')).toHaveTextContent('touch range');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Cure Wounds');
    });

    it('calls actionHandleCureWoundsConfirm with {targetName} object on target select', () => {
      const actionHandleCureWoundsConfirm = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleCureWoundsConfirm })}
          actionPendingCureWounds={{ creatureTargets: ['Ally1'] }}
        />
      );
      screen.getByTestId('target-0').click();
      expect(actionHandleCureWoundsConfirm).toHaveBeenCalledWith({ targetName: 'Ally1' });
    });

    it('calls actionHandleCureWoundsSkip on skip', () => {
      const actionHandleCureWoundsSkip = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleCureWoundsSkip })}
          actionPendingCureWounds={{ creatureTargets: ['Ally1'] }}
        />
      );
      screen.getByTestId('skip').click();
      expect(actionHandleCureWoundsSkip).toHaveBeenCalled();
    });
  });

  describe('Revivify spell', () => {
    it('renders with correct title, description, and confirm label', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingRevivify: { creatureTargets: ['Ally1'] },
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Revivify');
      expect(screen.getByTestId('description')).toHaveTextContent('0 Hit Points');
      expect(screen.getByTestId('description')).toHaveTextContent('300+ GP');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Revivify');
    });

    it('calls actionHandleRevivifyConfirm with {targetName} object on target select', () => {
      const actionHandleRevivifyConfirm = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleRevivifyConfirm })}
          actionPendingRevivify={{ creatureTargets: ['Ally1'] }}
        />
      );
      screen.getByTestId('target-0').click();
      expect(actionHandleRevivifyConfirm).toHaveBeenCalledWith({ targetName: 'Ally1' });
    });

    it('calls actionHandleRevivifySkip on skip', () => {
      const actionHandleRevivifySkip = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleRevivifySkip })}
          actionPendingRevivify={{ creatureTargets: ['Ally1'] }}
        />
      );
      screen.getByTestId('skip').click();
      expect(actionHandleRevivifySkip).toHaveBeenCalled();
    });
  });

  describe('Remove Curse spell', () => {
    it('renders with correct title, description, and confirm label', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingRemoveCurse: { creatureTargets: ['Ally1'], range: 'Touch' },
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Remove Curse');
      expect(screen.getByTestId('description')).toHaveTextContent('Touch');
      expect(screen.getByTestId('description')).toHaveTextContent('ends all curses');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Remove Curse');
    });

    it('calls actionHandleRemoveCurseConfirm with {targetName} object on target select', () => {
      const actionHandleRemoveCurseConfirm = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleRemoveCurseConfirm })}
          actionPendingRemoveCurse={{ creatureTargets: ['Ally1'], range: 'Touch' }}
        />
      );
      screen.getByTestId('target-0').click();
      expect(actionHandleRemoveCurseConfirm).toHaveBeenCalledWith({ targetName: 'Ally1' });
    });

    it('calls actionHandleRemoveCurseSkip on skip', () => {
      const actionHandleRemoveCurseSkip = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleRemoveCurseSkip })}
          actionPendingRemoveCurse={{ creatureTargets: ['Ally1'], range: 'Touch' }}
        />
      );
      screen.getByTestId('skip').click();
      expect(actionHandleRemoveCurseSkip).toHaveBeenCalled();
    });
  });

  describe('Forcecage filtering for SecondaryTargetModal spells', () => {
    it('filters out forcecage-trapped targets for Haste', () => {
      setTargetEffects([{ effect: 'forcecage', target: 'Ally1', source: 'Cage1' }]);
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingHaste: { creatureTargets: ['Ally1', 'Ally2'] },
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally2');
      expect(screen.queryByTestId('target-1')).not.toBeInTheDocument();
    });

    it('filters out forcecage-trapped targets for Barkskin', () => {
      setTargetEffects([{ effect: 'forcecage', target: 'Ally1', source: 'Cage1' }]);
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingBarkskin: { creatureTargets: ['Ally1', 'Ally2'] },
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally2');
    });

    it('filters out forcecage-trapped targets for Heal', () => {
      setTargetEffects([{ effect: 'forcecage', target: 'Ally1', source: 'Cage1' }]);
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingHeal: { creatureTargets: ['Ally1', 'Ally2'] },
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally2');
    });

    it('filters out forcecage-trapped targets for Cure Wounds', () => {
      setTargetEffects([{ effect: 'forcecage', target: 'Ally1', source: 'Cage1' }]);
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingCureWounds: { creatureTargets: ['Ally1', 'Ally2'] },
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally2');
    });

    it('filters out forcecage-trapped targets for Revivify', () => {
      setTargetEffects([{ effect: 'forcecage', target: 'Ally1', source: 'Cage1' }]);
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingRevivify: { creatureTargets: ['Ally1', 'Ally2'] },
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally2');
    });

    it('filters out forcecage-trapped targets for Remove Curse', () => {
      setTargetEffects([{ effect: 'forcecage', target: 'Ally1', source: 'Cage1' }]);
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingRemoveCurse: { creatureTargets: ['Ally1', 'Ally2'], range: 'Touch' },
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally2');
    });

    it('filters out forcecage-trapped targets for Mage Armor', () => {
      setTargetEffects([{ effect: 'forcecage', target: 'Ally1', source: 'Cage1' }]);
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingMageArmor: { creatureTargets: ['Ally1', 'Ally2'] },
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally2');
    });

    it('allows all targets when no targetEffects exist', () => {
      setTargetEffects(null);
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingHaste: { creatureTargets: ['Ally1', 'Ally2'] },
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally1');
      expect(screen.getByTestId('target-1')).toHaveTextContent('Ally2');
    });
  });
});
