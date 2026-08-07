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

vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getTargetFromAttacker: vi.fn(() => null),
}));

vi.mock('../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => null),
}));

// Create a shared mock object that both vi.mock and the tests can access
// Using vi.hoisted to ensure it's available at the top of the file where vi.mock is hoisted
const sharedMocks = vi.hoisted(() => ({
  getRuntimeValue: vi.fn(),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => sharedMocks);

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

describe('CharActionSpellPopups - Forcecage Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sharedMocks.getRuntimeValue.mockReset();
  });

  describe('isForcecageBlocked logic', () => {
    it('returns false when no targetEffects exist in runtime store', () => {
      // No runtime values set - getRuntimeValue returns null
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingAid: { creatureTargets: ['Ally1'] },
            actionHandleAidConfirm: vi.fn(),
            actionHandleAidSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally1');
    });

    it('returns false when targetEffects is not an array', () => {
      sharedMocks.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return 'not-an-array';
        return null;
      });
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingAid: { creatureTargets: ['Ally1'] },
            actionHandleAidConfirm: vi.fn(),
            actionHandleAidSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally1');
    });

    it('returns false when targetEffects is an empty array', () => {
      sharedMocks.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [];
        return null;
      });
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingAid: { creatureTargets: ['Ally1'] },
            actionHandleAidConfirm: vi.fn(),
            actionHandleAidSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally1');
    });

    it('returns false when neither attacker nor target is forcecage trapped', () => {
      sharedMocks.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [
          { effect: 'blinded', target: 'Goblin', source: 'Goblin' },
        ];
        return null;
      });
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingAid: { creatureTargets: ['Ally1'] },
            actionHandleAidConfirm: vi.fn(),
            actionHandleAidSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally1');
    });

    it('filters out targets when attacker is forcecage trapped but target is not', () => {
      sharedMocks.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [
          { effect: 'forcecage', target: 'Test Character', source: 'Cage1' },
        ];
        return null;
      });
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingAid: { creatureTargets: ['Ally1', 'Ally2'] },
            actionHandleAidConfirm: vi.fn(),
            actionHandleAidSkip: vi.fn(),
          })}
        />
      );
      // When attacker is trapped, all targets are blocked (attacker can't reach them)
      expect(screen.queryByTestId('target-0')).not.toBeInTheDocument();
    });

    it('filters out target when target is forcecage trapped but attacker is not', () => {
      sharedMocks.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [
          { effect: 'forcecage', target: 'Ally1', source: 'Cage1' },
        ];
        return null;
      });
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingAid: { creatureTargets: ['Ally1', 'Ally2'] },
            actionHandleAidConfirm: vi.fn(),
            actionHandleAidSkip: vi.fn(),
          })}
        />
      );
      // Ally1 is trapped, so only Ally2 remains
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally2');
    });

    it('filters out target when both attacker and target are trapped but from different sources', () => {
      sharedMocks.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [
          { effect: 'forcecage', target: 'Test Character', source: 'CageA' },
          { effect: 'forcecage', target: 'Ally1', source: 'CageB' },
        ];
        return null;
      });
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingAid: { creatureTargets: ['Ally1', 'Ally2'] },
            actionHandleAidConfirm: vi.fn(),
            actionHandleAidSkip: vi.fn(),
          })}
        />
      );
      // Attacker is trapped by CageA. Ally2 is not trapped at all.
      // isForcecageBlocked returns true when attacker is trapped but target is not.
      // So Ally2 is blocked (attacker can't reach untrapped targets).
      expect(screen.queryByTestId('target-0')).not.toBeInTheDocument();
    });

    it('allows target when both attacker and target are trapped from the same source', () => {
      sharedMocks.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [
          { effect: 'forcecage', target: 'Test Character', source: 'CageA' },
          { effect: 'forcecage', target: 'Ally1', source: 'CageA' },
        ];
        return null;
      });
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingAid: { creatureTargets: ['Ally1', 'Ally2'] },
            actionHandleAidConfirm: vi.fn(),
            actionHandleAidSkip: vi.fn(),
          })}
        />
      );
      // Ally1 shares CageA with attacker, so Ally1 is allowed.
      // Ally2 is not trapped, so isForcecageBlocked returns true (blocked).
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally1');
    });

    it('allows target when attacker is trapped by multiple sources but target shares one', () => {
      sharedMocks.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [
          { effect: 'forcecage', target: 'Test Character', source: 'CageA' },
          { effect: 'forcecage', target: 'Test Character', source: 'CageB' },
          { effect: 'forcecage', target: 'Ally1', source: 'CageB' },
        ];
        return null;
      });
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingAid: { creatureTargets: ['Ally1', 'Ally2'] },
            actionHandleAidConfirm: vi.fn(),
            actionHandleAidSkip: vi.fn(),
          })}
        />
      );
      // Ally1 shares CageB with attacker, so Ally1 is allowed.
      // Ally2 is not trapped, so it's blocked.
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally1');
    });

    it('blocks target when attacker shares one source but not another', () => {
      sharedMocks.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [
          { effect: 'forcecage', target: 'Test Character', source: 'CageA' },
          { effect: 'forcecage', target: 'Test Character', source: 'CageB' },
          { effect: 'forcecage', target: 'Ally1', source: 'CageC' },
        ];
        return null;
      });
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingAid: { creatureTargets: ['Ally1', 'Ally2'] },
            actionHandleAidConfirm: vi.fn(),
            actionHandleAidSkip: vi.fn(),
          })}
        />
      );
      // Ally1 trapped by CageC (no shared source with attacker), so blocked.
      // Ally2 not trapped, so blocked (attacker is trapped).
      expect(screen.queryByTestId('target-0')).not.toBeInTheDocument();
    });
  });

  describe('filterForcecageBlockedTargets with string and object targets', () => {
    it('handles string targets', () => {
      sharedMocks.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [
          { effect: 'forcecage', target: 'Ally1', source: 'Cage1' },
        ];
        return null;
      });
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingAid: { creatureTargets: ['Ally1', 'Ally2'] },
            actionHandleAidConfirm: vi.fn(),
            actionHandleAidSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally2');
    });

    it('handles object targets with name property', () => {
      sharedMocks.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [
          { effect: 'forcecage', target: 'Ally1', source: 'Cage1' },
        ];
        return null;
      });
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingAid: { creatureTargets: [{ name: 'Ally1' }, { name: 'Ally2' }] },
            actionHandleAidConfirm: vi.fn(),
            actionHandleAidSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally2');
    });

    it('handles mixed string and object targets', () => {
      sharedMocks.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [
          { effect: 'forcecage', target: 'Ally1', source: 'Cage1' },
        ];
        return null;
      });
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingAid: { creatureTargets: ['Ally1', { name: 'Ally2' }] },
            actionHandleAidConfirm: vi.fn(),
            actionHandleAidSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally2');
    });

    it('returns all targets when no forcecage effects exist', async () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingAid: { creatureTargets: ['Ally1', 'Ally2', 'Ally3'] },
            actionHandleAidConfirm: vi.fn(),
            actionHandleAidSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally1');
      expect(screen.getByTestId('target-1')).toHaveTextContent('Ally2');
      expect(screen.getByTestId('target-2')).toHaveTextContent('Ally3');
    });
  });

  describe('forcecage filtering across all spells', () => {
    it('filters Bane targets through forcecage', () => {
      sharedMocks.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [
          { effect: 'forcecage', target: 'Goblin1', source: 'Cage1' },
        ];
        return null;
      });
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
      expect(screen.getByTestId('target-0')).toHaveTextContent('Goblin2');
    });

    it('filters Bless targets through forcecage', () => {
      sharedMocks.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [
          { effect: 'forcecage', target: 'Ally1', source: 'Cage1' },
        ];
        return null;
      });
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingBless: { creatureTargets: ['Ally1', 'Ally2'], maxTargets: 3 },
            actionHandleBlessConfirm: vi.fn(),
            actionHandleBlessSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally2');
    });

    it('filters Faerie Fire targets through forcecage', () => {
      sharedMocks.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [
          { effect: 'forcecage', target: 'Goblin1', source: 'Cage1' },
        ];
        return null;
      });
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingFaerieFire: { creatureTargets: ['Goblin1', 'Goblin2'] },
            actionHandleFaerieFireConfirm: vi.fn(),
            actionHandleFaerieFireSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Goblin2');
    });

    it('filters Beacon of Hope targets through forcecage', () => {
      sharedMocks.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [
          { effect: 'forcecage', target: 'Ally1', source: 'Cage1' },
        ];
        return null;
      });
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingBeaconOfHope: { creatureTargets: ['Ally1', 'Ally2'] },
            actionHandleBeaconOfHopeConfirm: vi.fn(),
            actionHandleBeaconOfHopeSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally2');
    });

    it('filters Pass Without Trace targets through forcecage', () => {
      sharedMocks.getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [
          { effect: 'forcecage', target: 'Ally1', source: 'Cage1' },
        ];
        return null;
      });
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingPassWithoutTrace: { creatureTargets: ['Ally1', 'Ally2'] },
            actionHandlePassWithoutTraceConfirm: vi.fn(),
            actionHandlePassWithoutTraceSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally2');
    });
  });
});
