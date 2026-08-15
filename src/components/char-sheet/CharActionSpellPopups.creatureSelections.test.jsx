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
  default: function TestCreatureSelectionModal({ title, icon, targets, maxTargets, description, confirmLabel, confirmIcon: _, onConfirm, onSkip }) {
    return (
      <div data-testid={`creature-selection-${title}`}>
        <span data-testid="title">{title}</span>
        <span data-testid="icon">{icon}</span>
        <span data-testid="description">{description}</span>
        <span data-testid="creature-count">{targets?.length}</span>
        <span data-testid="max-targets">{maxTargets}</span>
        <span data-testid="confirm-label">{confirmLabel}</span>
        {onConfirm && <button data-testid="confirm" onClick={() => onConfirm(targets?.map(t => t.name || t))}>Confirm</button>}
        {onSkip && <button data-testid="skip" onClick={onSkip}>Skip</button>}
        {targets?.map((t, i) => (
          <span key={i} data-testid={`target-${i}`}>{typeof t === 'string' ? t : t.name}</span>
        ))}
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
    pendingActionMetamagic: null,
    handleActionMetamagicConfirm: vi.fn(),
    handleActionMetamagicSkip: vi.fn(),
    ...overrides,
  };
}

describe('CharActionSpellPopups - CreatureSelectionModal Spells', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Aid spell', () => {
    it('renders with correct title, icon, description, maxTargets, and confirmLabel', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingAid: { creatureTargets: ['Ally1', 'Ally2'], maxTargets: 3 },
            actionHandleAidConfirm: vi.fn(),
            actionHandleAidSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Aid');
      expect(screen.getByTestId('icon')).toHaveTextContent('fa-hand-holding-heart');
      expect(screen.getByTestId('description')).toHaveTextContent('bolsters your allies');
      expect(screen.getByTestId('max-targets')).toHaveTextContent('3');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Aid');
    });

    it('passes creature count correctly', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingAid: { creatureTargets: ['Ally1', 'Ally2', 'Ally3'], maxTargets: 3 },
            actionHandleAidConfirm: vi.fn(),
            actionHandleAidSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('creature-count')).toHaveTextContent('3');
    });

    it('renders creature targets from string array', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingAid: { creatureTargets: ['Ally1', 'Ally2'], maxTargets: 3 },
            actionHandleAidConfirm: vi.fn(),
            actionHandleAidSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally1');
      expect(screen.getByTestId('target-1')).toHaveTextContent('Ally2');
    });

    it('renders creature targets from object array with name property', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingAid: { creatureTargets: [{ name: 'Ally1' }, { name: 'Ally2' }], maxTargets: 3 },
            actionHandleAidConfirm: vi.fn(),
            actionHandleAidSkip: vi.fn(),
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
            actionPendingAid: { creatureTargets: [], maxTargets: 3 },
            actionHandleAidConfirm: vi.fn(),
            actionHandleAidSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Aid');
      expect(screen.getByTestId('creature-count')).toHaveTextContent('0');
      expect(screen.queryByTestId('target-0')).not.toBeInTheDocument();
    });

    it('calls actionHandleAidConfirm on confirm with target names', () => {
      const actionHandleAidConfirm = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleAidConfirm })}
          actionPendingAid={{ creatureTargets: ['Ally1', 'Ally2'], maxTargets: 3 }}
        />
      );
      screen.getByTestId('confirm').click();
      expect(actionHandleAidConfirm).toHaveBeenCalledWith(['Ally1', 'Ally2']);
    });

    it('calls actionHandleAidSkip on skip', () => {
      const actionHandleAidSkip = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleAidSkip })}
          actionPendingAid={{ creatureTargets: ['Ally1'], maxTargets: 3 }}
        />
      );
      screen.getByTestId('skip').click();
      expect(actionHandleAidSkip).toHaveBeenCalled();
    });
  });

  describe('Bane spell', () => {
    it('renders with correct title, icon, description, maxTargets, and confirmLabel', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingBane: { creatureTargets: ['Goblin1', 'Goblin2'], maxTargets: 3 },
            actionHandleBaneConfirm: vi.fn(),
            actionHandleBaneSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Bane');
      expect(screen.getByTestId('icon')).toHaveTextContent('fa-shield-halved');
      expect(screen.getByTestId('description')).toHaveTextContent('Curse up to three creatures');
      expect(screen.getByTestId('max-targets')).toHaveTextContent('3');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Bane');
    });

    it('calls actionHandleBaneConfirm on confirm with target names', () => {
      const actionHandleBaneConfirm = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleBaneConfirm })}
          actionPendingBane={{ creatureTargets: ['Goblin1'], maxTargets: 3 }}
        />
      );
      screen.getByTestId('confirm').click();
      expect(actionHandleBaneConfirm).toHaveBeenCalledWith(['Goblin1']);
    });

    it('calls actionHandleBaneSkip on skip', () => {
      const actionHandleBaneSkip = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleBaneSkip })}
          actionPendingBane={{ creatureTargets: ['Goblin1'], maxTargets: 3 }}
        />
      );
      screen.getByTestId('skip').click();
      expect(actionHandleBaneSkip).toHaveBeenCalled();
    });
  });

  describe('Bless spell', () => {
    it('renders with correct title, icon, description, maxTargets, and confirmLabel', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingBless: { creatureTargets: ['Ally1', 'Ally2'], maxTargets: 3 },
            actionHandleBlessConfirm: vi.fn(),
            actionHandleBlessSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Bless');
      expect(screen.getByTestId('icon')).toHaveTextContent('fa-hands');
      expect(screen.getByTestId('description')).toHaveTextContent('You bless up to three creatures');
      expect(screen.getByTestId('max-targets')).toHaveTextContent('3');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Bless');
    });

    it('calls actionHandleBlessConfirm on confirm with target names', () => {
      const actionHandleBlessConfirm = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleBlessConfirm })}
          actionPendingBless={{ creatureTargets: ['Ally1'], maxTargets: 3 }}
        />
      );
      screen.getByTestId('confirm').click();
      expect(actionHandleBlessConfirm).toHaveBeenCalledWith(['Ally1']);
    });

    it('calls actionHandleBlessSkip on skip', () => {
      const actionHandleBlessSkip = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleBlessSkip })}
          actionPendingBless={{ creatureTargets: ['Ally1'], maxTargets: 3 }}
        />
      );
      screen.getByTestId('skip').click();
      expect(actionHandleBlessSkip).toHaveBeenCalled();
    });
  });

  describe('Faerie Fire spell', () => {
    it('renders with correct title, icon, description, and confirmLabel (no maxTargets)', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingFaerieFire: { creatureTargets: ['Goblin1', 'Goblin2'] },
            actionHandleFaerieFireConfirm: vi.fn(),
            actionHandleFaerieFireSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Faerie Fire');
      expect(screen.getByTestId('icon')).toHaveTextContent('fa-fire');
      expect(screen.getByTestId('description')).toHaveTextContent('20-foot Cube');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Faerie Fire');
      expect(screen.getByTestId('max-targets')).toHaveTextContent('');
    });

    it('renders with confirmIcon passed to modal', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingFaerieFire: { creatureTargets: ['Goblin1'] },
            actionHandleFaerieFireConfirm: vi.fn(),
            actionHandleFaerieFireSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Faerie Fire');
    });

    it('calls actionHandleFaerieFireConfirm on confirm with target names', () => {
      const actionHandleFaerieFireConfirm = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleFaerieFireConfirm })}
          actionPendingFaerieFire={{ creatureTargets: ['Goblin1', 'Goblin2'] }}
        />
      );
      screen.getByTestId('confirm').click();
      expect(actionHandleFaerieFireConfirm).toHaveBeenCalledWith(['Goblin1', 'Goblin2']);
    });

    it('calls actionHandleFaerieFireSkip on skip', () => {
      const actionHandleFaerieFireSkip = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleFaerieFireSkip })}
          actionPendingFaerieFire={{ creatureTargets: ['Goblin1'] }}
        />
      );
      screen.getByTestId('skip').click();
      expect(actionHandleFaerieFireSkip).toHaveBeenCalled();
    });
  });

  describe('Beacon of Hope spell', () => {
    it('renders with correct title, icon, description, and confirmLabel (no maxTargets)', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingBeaconOfHope: { creatureTargets: ['Ally1', 'Ally2', 'Ally3'] },
            actionHandleBeaconOfHopeConfirm: vi.fn(),
            actionHandleBeaconOfHopeSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Beacon of Hope');
      expect(screen.getByTestId('icon')).toHaveTextContent('fa-heart-pulse');
      expect(screen.getByTestId('description')).toHaveTextContent('bestows hope and vitality');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Beacon of Hope');
      expect(screen.getByTestId('max-targets')).toHaveTextContent('');
    });

    it('renders all targets when no maxTargets is specified', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingBeaconOfHope: { creatureTargets: ['Ally1', 'Ally2', 'Ally3'] },
            actionHandleBeaconOfHopeConfirm: vi.fn(),
            actionHandleBeaconOfHopeSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally1');
      expect(screen.getByTestId('target-1')).toHaveTextContent('Ally2');
      expect(screen.getByTestId('target-2')).toHaveTextContent('Ally3');
    });

    it('calls actionHandleBeaconOfHopeConfirm on confirm with target names', () => {
      const actionHandleBeaconOfHopeConfirm = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleBeaconOfHopeConfirm })}
          actionPendingBeaconOfHope={{ creatureTargets: ['Ally1', 'Ally2'] }}
        />
      );
      screen.getByTestId('confirm').click();
      expect(actionHandleBeaconOfHopeConfirm).toHaveBeenCalledWith(['Ally1', 'Ally2']);
    });

    it('calls actionHandleBeaconOfHopeSkip on skip', () => {
      const actionHandleBeaconOfHopeSkip = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleBeaconOfHopeSkip })}
          actionPendingBeaconOfHope={{ creatureTargets: ['Ally1'] }}
        />
      );
      screen.getByTestId('skip').click();
      expect(actionHandleBeaconOfHopeSkip).toHaveBeenCalled();
    });
  });

  describe('Pass Without Trace spell', () => {
    it('renders with correct title, icon, description, and confirmLabel (no maxTargets)', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingPassWithoutTrace: { creatureTargets: ['Ally1', 'Ally2'] },
            actionHandlePassWithoutTraceConfirm: vi.fn(),
            actionHandlePassWithoutTraceSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Pass Without Trace');
      expect(screen.getByTestId('icon')).toHaveTextContent('fa-ghost');
      expect(screen.getByTestId('description')).toHaveTextContent('veil of shadows and silence');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Pass Without Trace');
      expect(screen.getByTestId('max-targets')).toHaveTextContent('');
    });

    it('calls actionHandlePassWithoutTraceConfirm on confirm with target names', () => {
      const actionHandlePassWithoutTraceConfirm = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandlePassWithoutTraceConfirm })}
          actionPendingPassWithoutTrace={{ creatureTargets: ['Ally1'] }}
        />
      );
      screen.getByTestId('confirm').click();
      expect(actionHandlePassWithoutTraceConfirm).toHaveBeenCalledWith(['Ally1']);
    });

    it('calls actionHandlePassWithoutTraceSkip on skip', () => {
      const actionHandlePassWithoutTraceSkip = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandlePassWithoutTraceSkip })}
          actionPendingPassWithoutTrace={{ creatureTargets: ['Ally1'] }}
        />
      );
      screen.getByTestId('skip').click();
      expect(actionHandlePassWithoutTraceSkip).toHaveBeenCalled();
    });
  });

  describe('no CreatureSelectionModal spells pending', () => {
    it('does not render any creature selection modal when all pending flags are null', () => {
      const { container } = render(
        <CharActionSpellPopups {...createBaseProps()} />
      );
      expect(container).toBeEmptyDOMElement();
    });
  });
});
