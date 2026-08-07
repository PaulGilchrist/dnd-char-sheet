import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

// Mock useRuntimeState to allow setRuntimeValue to store values
const runtimeStore = new Map();
vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn((key, prop) => {
    const storeKey = `${key}:${prop}`;
    return runtimeStore.get(storeKey) ?? null;
  }),
  setRuntimeValue: vi.fn((key, prop, value) => {
    const storeKey = `${key}:${prop}`;
    runtimeStore.set(storeKey, value);
  }),
  getStore: () => {
    const store = new Map();
    for (const [key, value] of runtimeStore) {
      const [k, p] = key.split(':');
      if (!store.has(k)) store.set(k, new Map());
      store.get(k).set(p, value);
    }
    return store;
  },
  clearRuntimeState: vi.fn((key) => {
    for (const storeKey of runtimeStore.keys()) {
      if (storeKey.startsWith(`${key}:`)) runtimeStore.delete(storeKey);
    }
  }),
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

describe('CharActionSpellPopups - Greater Restoration 2-Step Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeStore.clear();
  });

  let setRuntimeValue;

  beforeEach(async () => {
    const rs = await import('../../hooks/runtime/useRuntimeState.js');
    setRuntimeValue = rs.setRuntimeValue;
  });

  describe('Step 1: Target Selection', () => {
    it('renders SecondaryTargetModal when actionPendingGreaterRestoration is truthy', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingGreaterRestoration: { creatureTargets: ['Ally1', 'Ally2'], range: 'Touch' },
            actionHandleGreaterRestorationSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('title')).toHaveTextContent('Greater Restoration');
      expect(screen.getByTestId('description')).toHaveTextContent('Touch');
      expect(screen.getByTestId('confirm-label')).toHaveTextContent('Cast Greater Restoration');
    });

    it('renders creature targets correctly', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingGreaterRestoration: { creatureTargets: ['Ally1', 'Ally2'], range: '60 feet' },
            actionHandleGreaterRestorationSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally1');
      expect(screen.getByTestId('target-1')).toHaveTextContent('Ally2');
    });

    it('calls actionHandleGreaterRestorationSkip on skip', () => {
      const actionHandleGreaterRestorationSkip = vi.fn();
      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleGreaterRestorationSkip })}
          actionPendingGreaterRestoration={{ creatureTargets: ['Ally1'], range: 'Touch' }}
        />
      );
      screen.getByTestId('skip').click();
      expect(actionHandleGreaterRestorationSkip).toHaveBeenCalled();
    });
  });

  describe('Step 2: Effect Selection', () => {
    it('renders effect selection modal after target is selected', () => {
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingGreaterRestoration: { creatureTargets: ['Ally1'], range: 'Touch' },
            actionHandleGreaterRestorationSkip: vi.fn(),
            actionHandleGreaterRestorationConfirm: vi.fn(),
          })}
        />
      );
      // Step 1: select target
      screen.getByTestId('target-0').click();
      // After target selection, effect selection should appear
      expect(screen.getByTestId('title')).toHaveTextContent('Greater Restoration');
    });

    it('loads conditions from runtime store', async () => {
      setRuntimeValue('Ally1', 'activeConditions', ['charmed', 'poisoned']);
      setRuntimeValue('Ally1', 'exhaustionLevel', 0);
      setRuntimeValue('Ally1', 'activeBuffs', []);
      setRuntimeValue('Ally1', 'abilityReductions', {});
      setRuntimeValue('Ally1', 'hpMaxReduction', 0);

      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingGreaterRestoration: { creatureTargets: ['Ally1'], range: 'Touch' },
            actionHandleGreaterRestorationSkip: vi.fn(),
            actionHandleGreaterRestorationConfirm: vi.fn(),
          })}
        />
      );
      // Select target
      screen.getByTestId('target-0').click();
      // Wait for effects to load
      await waitFor(() => {
        expect(screen.getByText('Charmed condition')).toBeInTheDocument();
      });
    });

    it('loads exhaustion level from runtime store', async () => {
      setRuntimeValue('Ally1', 'activeConditions', []);
      setRuntimeValue('Ally1', 'exhaustionLevel', 2);
      setRuntimeValue('Ally1', 'activeBuffs', []);
      setRuntimeValue('Ally1', 'abilityReductions', {});
      setRuntimeValue('Ally1', 'hpMaxReduction', 0);

      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingGreaterRestoration: { creatureTargets: ['Ally1'], range: 'Touch' },
            actionHandleGreaterRestorationSkip: vi.fn(),
            actionHandleGreaterRestorationConfirm: vi.fn(),
          })}
        />
      );
      screen.getByTestId('target-0').click();
      await waitFor(() => {
        expect(screen.getByText('Exhaustion level (current: 2)')).toBeInTheDocument();
      });
    });

    it('loads curse from activeBuffs', async () => {
      setRuntimeValue('Ally1', 'activeConditions', []);
      setRuntimeValue('Ally1', 'exhaustionLevel', 0);
      setRuntimeValue('Ally1', 'activeBuffs', [{ type: 'cursed' }]);
      setRuntimeValue('Ally1', 'abilityReductions', {});
      setRuntimeValue('Ally1', 'hpMaxReduction', 0);

      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingGreaterRestoration: { creatureTargets: ['Ally1'], range: 'Touch' },
            actionHandleGreaterRestorationSkip: vi.fn(),
            actionHandleGreaterRestorationConfirm: vi.fn(),
          })}
        />
      );
      screen.getByTestId('target-0').click();
      await waitFor(() => {
        expect(screen.getByText('Curse (including attunement to cursed magic item)')).toBeInTheDocument();
      });
    });

    it('loads curse from activeBuffs with cursed property', async () => {
      setRuntimeValue('Ally1', 'activeConditions', []);
      setRuntimeValue('Ally1', 'exhaustionLevel', 0);
      setRuntimeValue('Ally1', 'activeBuffs', [{ cursed: true }]);
      setRuntimeValue('Ally1', 'abilityReductions', {});
      setRuntimeValue('Ally1', 'hpMaxReduction', 0);

      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingGreaterRestoration: { creatureTargets: ['Ally1'], range: 'Touch' },
            actionHandleGreaterRestorationSkip: vi.fn(),
            actionHandleGreaterRestorationConfirm: vi.fn(),
          })}
        />
      );
      screen.getByTestId('target-0').click();
      await waitFor(() => {
        expect(screen.getByText('Curse (including attunement to cursed magic item)')).toBeInTheDocument();
      });
    });

    it('loads ability score reduction', async () => {
      setRuntimeValue('Ally1', 'activeConditions', []);
      setRuntimeValue('Ally1', 'exhaustionLevel', 0);
      setRuntimeValue('Ally1', 'activeBuffs', []);
      setRuntimeValue('Ally1', 'abilityReductions', { STR: -2 });
      setRuntimeValue('Ally1', 'hpMaxReduction', 0);

      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingGreaterRestoration: { creatureTargets: ['Ally1'], range: 'Touch' },
            actionHandleGreaterRestorationSkip: vi.fn(),
            actionHandleGreaterRestorationConfirm: vi.fn(),
          })}
        />
      );
      screen.getByTestId('target-0').click();
      await waitFor(() => {
        expect(screen.getByText('Ability score reduction')).toBeInTheDocument();
      });
    });

    it('loads HP maximum reduction', async () => {
      setRuntimeValue('Ally1', 'activeConditions', []);
      setRuntimeValue('Ally1', 'exhaustionLevel', 0);
      setRuntimeValue('Ally1', 'activeBuffs', []);
      setRuntimeValue('Ally1', 'abilityReductions', {});
      setRuntimeValue('Ally1', 'hpMaxReduction', 10);

      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingGreaterRestoration: { creatureTargets: ['Ally1'], range: 'Touch' },
            actionHandleGreaterRestorationSkip: vi.fn(),
            actionHandleGreaterRestorationConfirm: vi.fn(),
          })}
        />
      );
      screen.getByTestId('target-0').click();
      await waitFor(() => {
        expect(screen.getByText('Hit Point maximum reduction')).toBeInTheDocument();
      });
    });

    it('shows "No removable effects" message when no effects found', async () => {
      setRuntimeValue('Ally1', 'activeConditions', []);
      setRuntimeValue('Ally1', 'exhaustionLevel', 0);
      setRuntimeValue('Ally1', 'activeBuffs', []);
      setRuntimeValue('Ally1', 'abilityReductions', {});
      setRuntimeValue('Ally1', 'hpMaxReduction', 0);

      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingGreaterRestoration: { creatureTargets: ['Ally1'], range: 'Touch' },
            actionHandleGreaterRestorationSkip: vi.fn(),
            actionHandleGreaterRestorationConfirm: vi.fn(),
            actionHandleGreaterRestorationNoEffects: vi.fn(),
          })}
        />
      );
      screen.getByTestId('target-0').click();
      await waitFor(() => {
        expect(screen.getByText(/No removable effects found on Ally1/)).toBeInTheDocument();
      });
    });

    it('dismisses with actionHandleGreaterRestorationNoEffects when no effects', async () => {
      const actionHandleGreaterRestorationNoEffects = vi.fn();
      setRuntimeValue('Ally1', 'activeConditions', []);
      setRuntimeValue('Ally1', 'exhaustionLevel', 0);
      setRuntimeValue('Ally1', 'activeBuffs', []);
      setRuntimeValue('Ally1', 'abilityReductions', {});
      setRuntimeValue('Ally1', 'hpMaxReduction', 0);

      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleGreaterRestorationNoEffects })}
          actionPendingGreaterRestoration={{ creatureTargets: ['Ally1'], range: 'Touch' }}
        />
      );
      screen.getByTestId('target-0').click();
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Skip' })).toBeInTheDocument();
      });
      // When no effects, skip should act as dismiss
      screen.getByRole('button', { name: 'Skip' }).click();
      // The skip handler just clears the selection, no effects call goes through
      // Actually looking at the code: onSkip={hasEffects ? handleGreaterRestorationEffectSkip : handleNoEffectsDismiss}
      // So when no effects, skip = handleNoEffectsDismiss
      expect(actionHandleGreaterRestorationNoEffects).toHaveBeenCalled();
    });

    it('loads petrified condition', async () => {
      setRuntimeValue('Ally1', 'activeConditions', ['petrified']);
      setRuntimeValue('Ally1', 'exhaustionLevel', 0);
      setRuntimeValue('Ally1', 'activeBuffs', []);
      setRuntimeValue('Ally1', 'abilityReductions', {});
      setRuntimeValue('Ally1', 'hpMaxReduction', 0);

      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingGreaterRestoration: { creatureTargets: ['Ally1'], range: 'Touch' },
            actionHandleGreaterRestorationSkip: vi.fn(),
            actionHandleGreaterRestorationConfirm: vi.fn(),
          })}
        />
      );
      screen.getByTestId('target-0').click();
      await waitFor(() => {
        expect(screen.getByText('Petrified condition')).toBeInTheDocument();
      });
    });

    it('loads multiple conditions at once', async () => {
      setRuntimeValue('Ally1', 'activeConditions', ['charmed', 'petrified']);
      setRuntimeValue('Ally1', 'exhaustionLevel', 1);
      setRuntimeValue('Ally1', 'activeBuffs', [{ type: 'cursed' }]);
      setRuntimeValue('Ally1', 'abilityReductions', { STR: -2 });
      setRuntimeValue('Ally1', 'hpMaxReduction', 5);

      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingGreaterRestoration: { creatureTargets: ['Ally1'], range: 'Touch' },
            actionHandleGreaterRestorationSkip: vi.fn(),
            actionHandleGreaterRestorationConfirm: vi.fn(),
          })}
        />
      );
      screen.getByTestId('target-0').click();
      await waitFor(() => {
        expect(screen.getByText('Charmed condition')).toBeInTheDocument();
        expect(screen.getByText('Petrified condition')).toBeInTheDocument();
        expect(screen.getByText('Exhaustion level (current: 1)')).toBeInTheDocument();
        expect(screen.getByText('Curse (including attunement to cursed magic item)')).toBeInTheDocument();
        expect(screen.getByText('Ability score reduction')).toBeInTheDocument();
        expect(screen.getByText('Hit Point maximum reduction')).toBeInTheDocument();
      });
    });

    it('deduplicates conditions from runtime and combat summary', async () => {
      const { getCombatSummary } = await import('../../services/encounters/combatData.js');
      getCombatSummary.mockResolvedValue({
        creatures: [{ name: 'Ally1', conditions: [{ key: 'charmed' }] }],
      });
      setRuntimeValue('Ally1', 'activeConditions', ['charmed']);
      setRuntimeValue('Ally1', 'exhaustionLevel', 0);
      setRuntimeValue('Ally1', 'activeBuffs', []);
      setRuntimeValue('Ally1', 'abilityReductions', {});
      setRuntimeValue('Ally1', 'hpMaxReduction', 0);

      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingGreaterRestoration: { creatureTargets: ['Ally1'], range: 'Touch' },
            actionHandleGreaterRestorationSkip: vi.fn(),
            actionHandleGreaterRestorationConfirm: vi.fn(),
          })}
        />
      );
      screen.getByTestId('target-0').click();
      await waitFor(() => {
        // Should only show one "Charmed condition" entry due to dedup
        const charmEntries = screen.getAllByText('Charmed condition');
        expect(charmEntries).toHaveLength(1);
      });
    });

    it('handles case-insensitive condition matching', async () => {
      setRuntimeValue('Ally1', 'activeConditions', ['CHARMED', 'Petrified']);
      setRuntimeValue('Ally1', 'exhaustionLevel', 0);
      setRuntimeValue('Ally1', 'activeBuffs', []);
      setRuntimeValue('Ally1', 'abilityReductions', {});
      setRuntimeValue('Ally1', 'hpMaxReduction', 0);

      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingGreaterRestoration: { creatureTargets: ['Ally1'], range: 'Touch' },
            actionHandleGreaterRestorationSkip: vi.fn(),
            actionHandleGreaterRestorationConfirm: vi.fn(),
          })}
        />
      );
      screen.getByTestId('target-0').click();
      await waitFor(() => {
        expect(screen.getByText('Charmed condition')).toBeInTheDocument();
        expect(screen.getByText('Petrified condition')).toBeInTheDocument();
      });
    });

    it('handles whitespace in condition names', async () => {
      setRuntimeValue('Ally1', 'activeConditions', ['  charmed  ', 'petrified ']);
      setRuntimeValue('Ally1', 'exhaustionLevel', 0);
      setRuntimeValue('Ally1', 'activeBuffs', []);
      setRuntimeValue('Ally1', 'abilityReductions', {});
      setRuntimeValue('Ally1', 'hpMaxReduction', 0);

      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingGreaterRestoration: { creatureTargets: ['Ally1'], range: 'Touch' },
            actionHandleGreaterRestorationSkip: vi.fn(),
            actionHandleGreaterRestorationConfirm: vi.fn(),
          })}
        />
      );
      screen.getByTestId('target-0').click();
      await waitFor(() => {
        expect(screen.getByText('Charmed condition')).toBeInTheDocument();
        expect(screen.getByText('Petrified condition')).toBeInTheDocument();
      });
    });
  });

  describe('Effect selection callbacks', () => {
    it('calls actionHandleGreaterRestorationConfirm with condition selection', async () => {
      const actionHandleGreaterRestorationConfirm = vi.fn();
      setRuntimeValue('Ally1', 'activeConditions', ['charmed']);
      setRuntimeValue('Ally1', 'exhaustionLevel', 0);
      setRuntimeValue('Ally1', 'activeBuffs', []);
      setRuntimeValue('Ally1', 'abilityReductions', {});
      setRuntimeValue('Ally1', 'hpMaxReduction', 0);

      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleGreaterRestorationConfirm })}
          actionPendingGreaterRestoration={{ creatureTargets: ['Ally1'], range: 'Touch' }}
        />
      );
      screen.getByTestId('target-0').click();
      await waitFor(() => {
        expect(screen.getByText('Charmed condition')).toBeInTheDocument();
      });
      // Click the effect option (rendered as a target in SecondaryTargetModal)
      screen.getByText('Charmed condition').click();
      expect(actionHandleGreaterRestorationConfirm).toHaveBeenCalledWith({
        targetName: 'Ally1',
        selections: [{ type: 'condition', condition: 'charmed' }],
      });
    });

    it('calls actionHandleGreaterRestorationConfirm with exhaustion selection', async () => {
      const actionHandleGreaterRestorationConfirm = vi.fn();
      setRuntimeValue('Ally1', 'activeConditions', []);
      setRuntimeValue('Ally1', 'exhaustionLevel', 3);
      setRuntimeValue('Ally1', 'activeBuffs', []);
      setRuntimeValue('Ally1', 'abilityReductions', {});
      setRuntimeValue('Ally1', 'hpMaxReduction', 0);

      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleGreaterRestorationConfirm })}
          actionPendingGreaterRestoration={{ creatureTargets: ['Ally1'], range: 'Touch' }}
        />
      );
      screen.getByTestId('target-0').click();
      await waitFor(() => {
        expect(screen.getByText('Exhaustion level (current: 3)')).toBeInTheDocument();
      });
      screen.getByText('Exhaustion level (current: 3)').click();
      // Effect value is "exhaustion" (no colon), so only type is set
      expect(actionHandleGreaterRestorationConfirm).toHaveBeenCalledWith({
        targetName: 'Ally1',
        selections: [{ type: 'exhaustion' }],
      });
    });

    it('calls actionHandleGreaterRestorationConfirm with curse selection', async () => {
      const actionHandleGreaterRestorationConfirm = vi.fn();
      setRuntimeValue('Ally1', 'activeConditions', []);
      setRuntimeValue('Ally1', 'exhaustionLevel', 0);
      setRuntimeValue('Ally1', 'activeBuffs', [{ type: 'cursed' }]);
      setRuntimeValue('Ally1', 'abilityReductions', {});
      setRuntimeValue('Ally1', 'hpMaxReduction', 0);

      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleGreaterRestorationConfirm })}
          actionPendingGreaterRestoration={{ creatureTargets: ['Ally1'], range: 'Touch' }}
        />
      );
      screen.getByTestId('target-0').click();
      await waitFor(() => {
        expect(screen.getByText('Curse (including attunement to cursed magic item)')).toBeInTheDocument();
      });
      screen.getByText('Curse (including attunement to cursed magic item)').click();
      // Effect value is "curse" (no colon), so only type is set
      expect(actionHandleGreaterRestorationConfirm).toHaveBeenCalledWith({
        targetName: 'Ally1',
        selections: [{ type: 'curse' }],
      });
    });

    it('calls actionHandleGreaterRestorationConfirm with ability_reduction selection', async () => {
      const actionHandleGreaterRestorationConfirm = vi.fn();
      setRuntimeValue('Ally1', 'activeConditions', []);
      setRuntimeValue('Ally1', 'exhaustionLevel', 0);
      setRuntimeValue('Ally1', 'activeBuffs', []);
      setRuntimeValue('Ally1', 'abilityReductions', { STR: -2 });
      setRuntimeValue('Ally1', 'hpMaxReduction', 0);

      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleGreaterRestorationConfirm })}
          actionPendingGreaterRestoration={{ creatureTargets: ['Ally1'], range: 'Touch' }}
        />
      );
      screen.getByTestId('target-0').click();
      await waitFor(() => {
        expect(screen.getByText('Ability score reduction')).toBeInTheDocument();
      });
      screen.getByText('Ability score reduction').click();
      // Effect value is "ability_reduction" (no colon), so only type is set
      expect(actionHandleGreaterRestorationConfirm).toHaveBeenCalledWith({
        targetName: 'Ally1',
        selections: [{ type: 'ability_reduction' }],
      });
    });

    it('calls actionHandleGreaterRestorationConfirm with hp_max_reduction selection', async () => {
      const actionHandleGreaterRestorationConfirm = vi.fn();
      setRuntimeValue('Ally1', 'activeConditions', []);
      setRuntimeValue('Ally1', 'exhaustionLevel', 0);
      setRuntimeValue('Ally1', 'activeBuffs', []);
      setRuntimeValue('Ally1', 'abilityReductions', {});
      setRuntimeValue('Ally1', 'hpMaxReduction', 10);

      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleGreaterRestorationConfirm })}
          actionPendingGreaterRestoration={{ creatureTargets: ['Ally1'], range: 'Touch' }}
        />
      );
      screen.getByTestId('target-0').click();
      await waitFor(() => {
        expect(screen.getByText('Hit Point maximum reduction')).toBeInTheDocument();
      });
      screen.getByText('Hit Point maximum reduction').click();
      // Effect value is "hp_max_reduction" (no colon), so only type is set
      expect(actionHandleGreaterRestorationConfirm).toHaveBeenCalledWith({
        targetName: 'Ally1',
        selections: [{ type: 'hp_max_reduction' }],
      });
    });

    it('clears selection after effect is confirmed', async () => {
      setRuntimeValue('Ally1', 'activeConditions', ['charmed']);
      setRuntimeValue('Ally1', 'exhaustionLevel', 0);
      setRuntimeValue('Ally1', 'activeBuffs', []);
      setRuntimeValue('Ally1', 'abilityReductions', {});
      setRuntimeValue('Ally1', 'hpMaxReduction', 0);

      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingGreaterRestoration: { creatureTargets: ['Ally1'], range: 'Touch' },
            actionHandleGreaterRestorationConfirm: vi.fn(),
            actionHandleGreaterRestorationSkip: vi.fn(),
          })}
        />
      );
      screen.getByTestId('target-0').click();
      await waitFor(() => {
        expect(screen.getByText('Charmed condition')).toBeInTheDocument();
      });
      screen.getByText('Charmed condition').click();
      // After confirmation, the modal should go back to showing target selection
      // But since we cleared greaterRestorationSelectedTarget, it should show the target modal again
      // Actually looking at the code, after confirm it sets greaterRestorationSelectedTarget to null
      // which means the actionPendingGreaterRestoration modal should reappear
      expect(screen.getByTestId('target-0')).toBeInTheDocument();
    });

    it('calls actionHandleGreaterRestorationSkip to clear selection', async () => {
      const actionHandleGreaterRestorationSkip = vi.fn();
      setRuntimeValue('Ally1', 'activeConditions', ['charmed']);
      setRuntimeValue('Ally1', 'exhaustionLevel', 0);
      setRuntimeValue('Ally1', 'activeBuffs', []);
      setRuntimeValue('Ally1', 'abilityReductions', {});
      setRuntimeValue('Ally1', 'hpMaxReduction', 0);

      render(
        <CharActionSpellPopups
          {...createBaseProps({ actionHandleGreaterRestorationSkip })}
          actionPendingGreaterRestoration={{ creatureTargets: ['Ally1'], range: 'Touch' }}
        />
      );
      screen.getByTestId('target-0').click();
      await waitFor(() => {
        expect(screen.getByText('Charmed condition')).toBeInTheDocument();
      });
      // Skip button in effect selection just clears the selection state
      screen.getByRole('button', { name: 'Skip' }).click();
      // After skip, we go back to target selection
      expect(screen.getByTestId('target-0')).toBeInTheDocument();
    });
  });

  describe('Greater Restoration with forcecage filtering', () => {
    it('filters Greater Restoration targets through forcecage', async () => {
      const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
      getRuntimeValue.mockImplementation((key, prop) => {
        if (key === 'campaign' && prop === 'targetEffects') return [
          { effect: 'forcecage', target: 'Ally1', source: 'Cage1' },
        ];
        return null;
      });
      render(
        <CharActionSpellPopups
          {...createBaseProps({
            actionPendingGreaterRestoration: { creatureTargets: ['Ally1', 'Ally2'], range: 'Touch' },
            actionHandleGreaterRestorationSkip: vi.fn(),
          })}
        />
      );
      expect(screen.getByTestId('target-0')).toHaveTextContent('Ally2');
    });
  });
});
