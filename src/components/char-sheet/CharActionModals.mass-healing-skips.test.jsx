// @improved-by-ai
// Tests for skip handlers in HealingModals.jsx (rendered through CharActionModals):
// - MassHealModal onSkip
// - MassCureWoundsModal onSkip
// - PrayerOfHealingModal onSkip
// - PowerWordFortifyModal onSkip
// - MassHealingWordModal onSkip
// - ClockworkCavalcadeHealModal onSkip
// - ClockworkCavalcadeDispelModal onSkip
// - NaturesSanctuaryCreaturesModal onSkip

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CharActionModals from './CharActionModals.jsx';
import { createBaseProps } from './CharActionModals.test-utils.jsx';

// ── Minimal mocks — only what skip tests need ──

vi.mock('./modals/MassHealModal.jsx', () => ({
  default: function TestModal({ onSkip, onConfirm }) {
    return (
      <div data-testid="mass-heal-modal">
        <button data-testid="mass-heal-skip" onClick={onSkip}>Skip</button>
        <button data-testid="mass-heal-confirm" onClick={() => onConfirm([])}>Confirm</button>
      </div>
    );
  },
}));

vi.mock('./modals/MassCureWoundsModal.jsx', () => ({
  default: function TestModal({ onSkip, onConfirm }) {
    return (
      <div data-testid="mass-cure-wounds-modal">
        <button data-testid="mass-cure-skip" onClick={onSkip}>Skip</button>
        <button data-testid="mass-cure-confirm" onClick={() => onConfirm([])}>Confirm</button>
      </div>
    );
  },
}));

vi.mock('./modals/PrayerOfHealingModal.jsx', () => ({
  default: function TestModal({ onSkip, onConfirm }) {
    return (
      <div data-testid="prayer-of-healing-modal">
        <button data-testid="prayer-skip" onClick={onSkip}>Skip</button>
        <button data-testid="prayer-confirm" onClick={() => onConfirm([])}>Confirm</button>
      </div>
    );
  },
}));

vi.mock('./modals/PowerWordFortifyModal.jsx', () => ({
  default: function TestModal({ onSkip, onConfirm }) {
    return (
      <div data-testid="power-word-fortify-modal">
        <button data-testid="fortify-skip" onClick={onSkip}>Skip</button>
        <button data-testid="fortify-confirm" onClick={() => onConfirm([])}>Confirm</button>
      </div>
    );
  },
}));

vi.mock('./modals/MassHealingWordModal.jsx', () => ({
  default: function TestModal({ onSkip, onConfirm }) {
    return (
      <div data-testid="mass-healing-word-modal">
        <button data-testid="healing-word-skip" onClick={onSkip}>Skip</button>
        <button data-testid="healing-word-confirm" onClick={() => onConfirm([])}>Confirm</button>
      </div>
    );
  },
}));

vi.mock('./modals/divine/ClockworkCavalcadeModal.jsx', () => ({
  default: function TestModal({ onChoose, onClose }) {
    return (
      <div data-testid="clockwork-cavalcade-modal">
        <button data-testid="cc-close" onClick={onClose}>Close</button>
        <button data-testid="cc-heal" onClick={() => onChoose('heal')}>Heal</button>
        <button data-testid="cc-dispel" onClick={() => onChoose('dispel')}>Dispel</button>
        <button data-testid="cc-repair" onClick={() => onChoose('repair')}>Repair</button>
      </div>
    );
  },
}));

vi.mock('./modals/shared/CreatureSelectionModal.jsx', () => ({
  default: function TestModal({ title, targets, onConfirm, onSkip, confirmLabel, note }) {
    return (
      <div data-testid="creature-selection-modal">
        <div data-testid="creature-title">{title}</div>
        {note && <div data-testid="creature-note">{note}</div>}
        {targets.map((target, i) => (
          <label key={i} data-testid={`creature-target-${target.name}`} onClick={() => onConfirm([target.name])}>
            {target.name}
          </label>
        ))}
        <button data-testid="creature-confirm" onClick={() => onConfirm(targets.map(t => t.name))}>{confirmLabel}</button>
        <button data-testid="creature-skip" onClick={onSkip}>Skip</button>
      </div>
    );
  },
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/automation/common/healingRoll.js', () => ({
  logHealingToSSE: vi.fn(),
}));

vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn().mockResolvedValue({ creatures: [] }),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn().mockResolvedValue(undefined),
}));

// ── Tests ──

describe('CharActionModals — mass healing modal skip handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderModal({ modalKey, modalData, handlerName, skipTestId }) {
    const setModalState = vi.fn();
    const renderResult = render(
      <CharActionModals
        {...createBaseProps({ [handlerName]: vi.fn() })}
        modalState={{ [modalKey]: modalData }}
        setModalState={setModalState}
      />,
    );
    fireEvent.click(screen.getByTestId(skipTestId));
    return { setModalState, renderResult };
  }

  describe('MassHealModal', () => {
    it('closes modal on skip', () => {
      const { setModalState } = renderModal({
        modalKey: 'massHealModal',
        modalData: { creatureTargets: ['Goblin'], totalPool: 50, campaignName: 'test-campaign', combatSummary: {} },
        handlerName: 'handleMassHealConfirm',
        skipTestId: 'mass-heal-skip',
      });
      expect(setModalState).toHaveBeenCalledWith({ massHealModal: null });
    });

    it('does not call the confirm handler on skip', () => {
      const handleMassHealConfirm = vi.fn();
      render(
        <CharActionModals
          {...createBaseProps({ handleMassHealConfirm })}
          modalState={{ massHealModal: { creatureTargets: ['Goblin'], totalPool: 50, campaignName: 'test-campaign', combatSummary: {} } }}
          setModalState={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByTestId('mass-heal-skip'));
      expect(handleMassHealConfirm).not.toHaveBeenCalled();
    });
  });

  describe('MassCureWoundsModal', () => {
    it('closes modal on skip', () => {
      const { setModalState } = renderModal({
        modalKey: 'massCureWoundsModal',
        modalData: { creatureTargets: ['Goblin'], maxTargets: 5 },
        handlerName: 'handleMassCureWoundsConfirm',
        skipTestId: 'mass-cure-skip',
      });
      expect(setModalState).toHaveBeenCalledWith({ massCureWoundsModal: null });
    });

    it('does not call the confirm handler on skip', () => {
      const handleMassCureWoundsConfirm = vi.fn();
      render(
        <CharActionModals
          {...createBaseProps({ handleMassCureWoundsConfirm })}
          modalState={{ massCureWoundsModal: { creatureTargets: ['Goblin'], maxTargets: 5 } }}
          setModalState={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByTestId('mass-cure-skip'));
      expect(handleMassCureWoundsConfirm).not.toHaveBeenCalled();
    });
  });

  describe('PrayerOfHealingModal', () => {
    it('closes modal on skip', () => {
      const { setModalState } = renderModal({
        modalKey: 'prayerOfHealingModal',
        modalData: { creatureTargets: ['Goblin'], maxTargets: 5 },
        handlerName: 'handlePrayerOfHealingConfirm',
        skipTestId: 'prayer-skip',
      });
      expect(setModalState).toHaveBeenCalledWith({ prayerOfHealingModal: null });
    });

    it('does not call the confirm handler on skip', () => {
      const handlePrayerOfHealingConfirm = vi.fn();
      render(
        <CharActionModals
          {...createBaseProps({ handlePrayerOfHealingConfirm })}
          modalState={{ prayerOfHealingModal: { creatureTargets: ['Goblin'], maxTargets: 5 } }}
          setModalState={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByTestId('prayer-skip'));
      expect(handlePrayerOfHealingConfirm).not.toHaveBeenCalled();
    });
  });

  describe('PowerWordFortifyModal', () => {
    it('closes modal on skip', () => {
      const { setModalState } = renderModal({
        modalKey: 'powerWordFortifyModal',
        modalData: { creatureTargets: ['Goblin'], totalTempHp: 10 },
        handlerName: 'handlePowerWordFortifyConfirm',
        skipTestId: 'fortify-skip',
      });
      expect(setModalState).toHaveBeenCalledWith({ powerWordFortifyModal: null });
    });

    it('does not call the confirm handler on skip', () => {
      const handlePowerWordFortifyConfirm = vi.fn();
      render(
        <CharActionModals
          {...createBaseProps({ handlePowerWordFortifyConfirm })}
          modalState={{ powerWordFortifyModal: { creatureTargets: ['Goblin'], totalTempHp: 10 } }}
          setModalState={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByTestId('fortify-skip'));
      expect(handlePowerWordFortifyConfirm).not.toHaveBeenCalled();
    });
  });

  describe('MassHealingWordModal', () => {
    it('closes modal on skip', () => {
      const { setModalState } = renderModal({
        modalKey: 'massHealingWordModal',
        modalData: { creatureTargets: ['Goblin'], maxTargets: 5 },
        handlerName: 'handleMassHealingWordConfirm',
        skipTestId: 'healing-word-skip',
      });
      expect(setModalState).toHaveBeenCalledWith({ massHealingWordModal: null });
    });

    it('does not call the confirm handler on skip', () => {
      const handleMassHealingWordConfirm = vi.fn();
      render(
        <CharActionModals
          {...createBaseProps({ handleMassHealingWordConfirm })}
          modalState={{ massHealingWordModal: { creatureTargets: ['Goblin'], maxTargets: 5 } }}
          setModalState={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByTestId('healing-word-skip'));
      expect(handleMassHealingWordConfirm).not.toHaveBeenCalled();
    });
  });

  describe('ClockworkCavalcadeHealModal', () => {
    it('closes modal on skip', () => {
      const { setModalState } = renderModal({
        modalKey: 'clockworkCavalcadeHealModal',
        modalData: { creatureTargets: ['Goblin'], maxHeal: 100, campaignName: 'test-campaign', combatSummary: {} },
        handlerName: 'handleClockworkCavalcadeHealConfirm',
        skipTestId: 'mass-heal-skip',
      });
      expect(setModalState).toHaveBeenCalledWith({ clockworkCavalcadeHealModal: null });
    });
  });

  describe('ClockworkCavalcadeDispelModal', () => {
    it('closes modal on skip', () => {
      const { setModalState } = renderModal({
        modalKey: 'clockworkCavalcadeDispelModal',
        modalData: { creatureTargets: [{ name: 'Goblin' }] },
        handlerName: 'handleClockworkCavalcadeDispelConfirm',
        skipTestId: 'creature-skip',
      });
      expect(setModalState).toHaveBeenCalledWith({ clockworkCavalcadeDispelModal: null });
    });
  });

  describe('NaturesSanctuaryCreaturesModal', () => {
    it('closes modal on skip', () => {
      const { setModalState } = renderModal({
        modalKey: 'naturesSanctuaryCreaturesModal',
        modalData: { creatureTargets: [{ name: 'Goblin' }], isMove: false },
        handlerName: 'handleNaturesSanctuaryConfirm',
        skipTestId: 'creature-skip',
      });
      expect(setModalState).toHaveBeenCalledWith({ naturesSanctuaryCreaturesModal: null });
    });
  });
});
