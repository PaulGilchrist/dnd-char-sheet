// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CharActionModals from './CharActionModals.jsx';
import { createBaseProps } from './CharActionModals.test-utils.jsx';

// ── Mocks ──

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  listeners: new Map(),
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
}));
vi.mock('../../services/automation/common/healingRoll.js', () => ({
  logHealingToSSE: vi.fn(),
}));
vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn().mockResolvedValue(undefined),
}));

// Mock SecondaryTargetModal so we can verify its props and call its callbacks.
// The real SecondaryTargetModal has internal useState logic; mocking it
// isolates the CharActionModals rendering/behavior under test.
vi.mock('./modals/shared/SecondaryTargetModal.jsx', () => {
  const MockSecondaryTargetModal = ({
    title,
    targets,
    onTargetSelected,
    onSkip,
    confirmLabel,
    description,
    showSize,
  }) => (
    <div data-testid="secondary-target-modal">
      <div data-testid="secondary-title">{title}</div>
      {description && <div data-testid="secondary-desc">{description}</div>}
      {showSize && <div data-testid="secondary-show-size">true</div>}
      {targets.map((target, i) => {
        const key = target.value || target.name;
        return (
          <label
            key={i}
            data-testid={`secondary-target-${key}`}
            onClick={() => onTargetSelected(key)}
          >
            {target.label || target.name}
          </label>
        );
      })}
      <button
        data-testid="secondary-confirm"
        onClick={() => onTargetSelected(targets[0]?.value || targets[0]?.name)}
      >
        {confirmLabel}
      </button>
      <button data-testid="secondary-skip" onClick={onSkip}>
        Skip
      </button>
    </div>
  );
  return { default: MockSecondaryTargetModal };
});

// ── Tests ──

describe('CharActionModals inline choice modals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Inline choice modals (Sweeping Attack, Bait and Switch, Commander's Strike)
  // all render SecondaryTargetModal and pass the handler as onTargetSelected.
  // These tests verify that selecting a target triggers the correct handler
  // with the selected value and full modal data — the behavioral contract.
  // Rendering details are SecondaryTargetModal's responsibility.

  const inlineChoiceCases = [
    {
      name: 'Sweeping Attack Target',
      modalProp: 'sweepingAttackTargetModal',
      modalData: {
        primaryTarget: 'Goblin',
        dieValue: 10,
        secondaryTargets: [{ name: 'Ogre' }, { name: 'Skeleton' }],
      },
      handlerProp: 'handleSweepingAttackConfirm',
      selectedKey: 'Ogre',
      confirmLabel: 'Apply Sweeping Attack',
      expectedTitle: 'Sweeping Attack',
      expectedDescription: /Choose a creature within 5 feet of Goblin to take 10 damage:/,
      expectedShowSize: true,
    },
    {
      name: 'Bait and Switch Choice',
      modalProp: 'baitAndSwitchChoiceModal',
      modalData: { description: 'Test', options: [{ label: 'Player', value: 'player' }] },
      handlerProp: 'handleBaitAndSwitchChoiceConfirm',
      selectedKey: 'player',
      confirmLabel: 'Apply AC Bonus',
      expectedTitle: 'Bait and Switch — AC Bonus',
      expectedDescription: 'Test',
      expectedShowSize: false,
    },
    {
      name: "Commander's Strike Choice",
      modalProp: 'commanderStrikeChoiceModal',
      modalData: { description: 'Test', options: [{ label: 'Bard', value: 'bard' }] },
      handlerProp: 'handleCommanderStrikeChoiceConfirm',
      selectedKey: 'bard',
      confirmLabel: "Grant Attack",
      expectedTitle: "Commander's Strike — Ally Attack",
      expectedDescription: 'Test',
      expectedShowSize: false,
    },
  ];

  for (const {
    name,
    modalProp,
    modalData,
    handlerProp,
    selectedKey,
    confirmLabel,
    expectedTitle,
    expectedDescription,
    expectedShowSize,
  } of inlineChoiceCases) {
    describe(name, () => {
      it('renders with correct title', () => {
        render(
          <CharActionModals
            {...createBaseProps()}
            modalState={{ [modalProp]: modalData }}
            setModalState={vi.fn()}
          />
        );
        expect(screen.getByTestId('secondary-title').textContent).toBe(expectedTitle);
      });

      it('renders with correct description', () => {
        render(
          <CharActionModals
            {...createBaseProps()}
            modalState={{ [modalProp]: modalData }}
            setModalState={vi.fn()}
          />
        );
        if (typeof expectedDescription === 'string') {
          expect(screen.getByTestId('secondary-desc').textContent).toBe(expectedDescription);
        } else {
          expect(screen.getByTestId('secondary-desc').textContent).toMatch(expectedDescription);
        }
      });

      it('renders correct confirm label', () => {
        render(
          <CharActionModals
            {...createBaseProps()}
            modalState={{ [modalProp]: modalData }}
            setModalState={vi.fn()}
          />
        );
        expect(screen.getByTestId('secondary-confirm').textContent).toBe(confirmLabel);
      });

      it(`renders ${expectedShowSize ? '' : 'no '}showSize indicator`, () => {
        render(
          <CharActionModals
            {...createBaseProps()}
            modalState={{ [modalProp]: modalData }}
            setModalState={vi.fn()}
          />
        );
        if (expectedShowSize) {
          expect(screen.getByTestId('secondary-show-size')).toBeInTheDocument();
        } else {
          expect(screen.queryByTestId('secondary-show-size')).not.toBeInTheDocument();
        }
      });

      it('renders target options from modal data', () => {
        const targetNames = modalData.secondaryTargets
          ? modalData.secondaryTargets.map((t) => t.name)
          : modalData.options.map((o) => o.label);
        render(
          <CharActionModals
            {...createBaseProps()}
            modalState={{ [modalProp]: modalData }}
            setModalState={vi.fn()}
          />
        );
        targetNames.forEach((targetName) => {
          expect(screen.getByText(targetName)).toBeInTheDocument();
        });
      });

      it('calls handler with selected key and modal data on confirm click', () => {
        const handler = vi.fn();
        render(
          <CharActionModals
            {...createBaseProps({ [handlerProp]: handler })}
            modalState={{ [modalProp]: modalData }}
            setModalState={vi.fn()}
          />
        );
        fireEvent.click(screen.getByTestId('secondary-confirm'));
        expect(handler).toHaveBeenCalledWith(selectedKey, expect.objectContaining(modalData));
      });

      it('calls handler with selected key on target label click', () => {
        const handler = vi.fn();
        render(
          <CharActionModals
            {...createBaseProps({ [handlerProp]: handler })}
            modalState={{ [modalProp]: modalData }}
            setModalState={vi.fn()}
          />
        );
        fireEvent.click(screen.getByTestId(`secondary-target-${selectedKey}`));
        expect(handler).toHaveBeenCalledWith(selectedKey, expect.objectContaining(modalData));
      });

      it('dismisses modal on skip', () => {
        const setModalState = vi.fn();
        render(
          <CharActionModals
            {...createBaseProps()}
            modalState={{ [modalProp]: modalData }}
            setModalState={setModalState}
          />
        );
        fireEvent.click(screen.getByTestId('secondary-skip'));
        expect(setModalState).toHaveBeenCalledWith({ [modalProp]: null });
      });
    });
  }

  describe('modal not rendered when prop is null', () => {
    it('does not render SecondaryTargetModal when sweepingAttackTargetModal is null', () => {
      render(
        <CharActionModals
          {...createBaseProps()}
          modalState={{ sweepingAttackTargetModal: null }}
          setModalState={vi.fn()}
        />
      );
      expect(screen.queryByTestId('secondary-target-modal')).not.toBeInTheDocument();
    });

    it('does not render SecondaryTargetModal when baitAndSwitchChoiceModal is null', () => {
      render(
        <CharActionModals
          {...createBaseProps()}
          modalState={{ baitAndSwitchChoiceModal: null }}
          setModalState={vi.fn()}
        />
      );
      expect(screen.queryByTestId('secondary-target-modal')).not.toBeInTheDocument();
    });

    it('does not render SecondaryTargetModal when commanderStrikeChoiceModal is null', () => {
      render(
        <CharActionModals
          {...createBaseProps()}
          modalState={{ commanderStrikeChoiceModal: null }}
          setModalState={vi.fn()}
        />
      );
      expect(screen.queryByTestId('secondary-target-modal')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('renders secondary target modal with empty secondaryTargets array for Sweeping Attack', () => {
      render(
        <CharActionModals
          {...createBaseProps()}
          modalState={{
            sweepingAttackTargetModal: {
              primaryTarget: 'Goblin',
              dieValue: 10,
              secondaryTargets: [],
            },
          }}
          setModalState={vi.fn()}
        />
      );
      expect(screen.getByTestId('secondary-title')).toBeInTheDocument();
      // The mock renders the confirm button regardless; real component hides it
      // when targets.length === 0 (via `!hideConfirm || targets.length > 0`).
      // The skip button is always present.
      expect(screen.getByTestId('secondary-skip')).toBeInTheDocument();
    });

    it('renders with single target option', () => {
      const modalData = {
        description: 'Single option',
        options: [{ label: 'Only Ally', value: 'ally1' }],
      };
      render(
        <CharActionModals
          {...createBaseProps()}
          modalState={{ baitAndSwitchChoiceModal: modalData }}
          setModalState={vi.fn()}
        />
      );
      expect(screen.getByTestId('secondary-target-ally1')).toBeInTheDocument();
    });
  });
});
