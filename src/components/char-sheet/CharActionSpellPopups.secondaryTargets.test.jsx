// @cleaned-by-ai
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
  default: function TestSecondaryTargetModal({ title, targets, onTargetSelected, onSkip, description, confirmLabel, confirmIcon: _, hideConfirm }) {
    return (
      <div data-testid={`secondary-modal-${title}`}>
        <span data-testid="title">{title}</span>
        <span data-testid="description">{description}</span>
        <span data-testid="confirm-label">{confirmLabel}</span>
        {targets?.map((t, i) => {
          const targetName = t.value !== undefined ? t.label : t.name;
          return (
            <label key={i} data-testid={`target-${i}`} onClick={() => onTargetSelected(t.value !== undefined ? t.value : t.name)}>
              <span data-testid={`target-name-${i}`}>{targetName}</span>
            </label>
          );
        })}
        {!hideConfirm || targets?.length > 0 ? (
          <button data-testid="confirm" onClick={() => targets?.length > 0 && onTargetSelected(targets[0].value !== undefined ? targets[0].value : targets[0].name)}>Confirm</button>
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
  });

  describe('Haste spell', () => {
    it('renders with correct title and description', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingHaste: { creatureTargets: ['Ally1', 'Ally2'] },
            actionHandleHasteConfirm: vi.fn(),
            actionHandleHasteSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Haste');
      expect(screen.getByTestId('description')).toHaveTextContent('speed doubles');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Haste');
    });

    it('renders targets as {name, type: "creature"} objects', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingHaste: { creatureTargets: ['Ally1', 'Ally2'] },
            actionHandleHasteConfirm: vi.fn(),
            actionHandleHasteSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally1');
      expect(screen.getByTestId('target-1')).toHaveTextContent('Ally2');
    });

    it('calls actionHandleHasteConfirm with single target array on select', () => {
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
    it('renders with correct title and description', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingBarkskin: { creatureTargets: ['Ally1'] },
            actionHandleBarkskinConfirm: vi.fn(),
            actionHandleBarkskinSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Barkskin');
      expect(screen.getByTestId('description')).toHaveTextContent('AC becomes 17');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Barkskin');
    });

    it('calls actionHandleBarkskinConfirm with single target array on select', () => {
      const actionHandleBarkskinConfirm = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleBarkskinConfirm })}
          actionPendingBarkskin={{ creatureTargets: ['Ally1', 'Ally2'] }}
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

  describe('Heal spell', () => {
    it('renders with correct title and description', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingHeal: { creatureTargets: ['Ally1'] },
            actionHandleHealConfirm: vi.fn(),
            actionHandleHealSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Heal');
      expect(screen.getByTestId('description')).toHaveTextContent('70 hit points');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Heal');
    });

    it('calls actionHandleHealConfirm with {targetName} object on select', () => {
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
    it('renders with correct title and description', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingCureWounds: { creatureTargets: ['Ally1'] },
            actionHandleCureWoundsConfirm: vi.fn(),
            actionHandleCureWoundsSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Cure Wounds');
      expect(screen.getByTestId('description')).toHaveTextContent('touch range');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Cure Wounds');
    });

    it('calls actionHandleCureWoundsConfirm with {targetName} object on select', () => {
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
    it('renders with correct title and description', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingRevivify: { creatureTargets: ['Ally1'] },
            actionHandleRevivifyConfirm: vi.fn(),
            actionHandleRevivifySkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Revivify');
      expect(screen.getByTestId('description')).toHaveTextContent('0 Hit Points');
      expect(screen.getByTestId('description')).toHaveTextContent('300+ GP');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Revivify');
    });

    it('calls actionHandleRevivifyConfirm with {targetName} object on select', () => {
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
    it('renders with correct title and description', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingRemoveCurse: { creatureTargets: ['Ally1'], range: 'Touch' },
            actionHandleRemoveCurseConfirm: vi.fn(),
            actionHandleRemoveCurseSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Remove Curse');
      expect(screen.getByTestId('description')).toHaveTextContent('Touch');
      expect(screen.getByTestId('description')).toHaveTextContent('ends all curses');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Remove Curse');
    });

    it('calls actionHandleRemoveCurseConfirm with {targetName} object on select', () => {
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

  describe('Mage Armor spell', () => {
    it('renders with correct title and description', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingMageArmor: { creatureTargets: ['Ally1'] },
            actionHandleMageArmorConfirm: vi.fn(),
            actionHandleMageArmorSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Mage Armor');
      expect(screen.getByTestId('description')).toHaveTextContent('13 + Dexterity modifier');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Mage Armor');
    });

    it('calls actionHandleMageArmorConfirm with single target array on select', () => {
      const actionHandleMageArmorConfirm = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleMageArmorConfirm })}
          actionPendingMageArmor={{ creatureTargets: ['Ally1', 'Ally2'] }}
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
});
