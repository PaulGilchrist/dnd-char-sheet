import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BendFateModal from './BendFateModal.jsx';

// ── Mocked modules ──

vi.mock('../../../services/automation/handlers/reactions/reactionBonusHandler.js', () => ({
  applyBendFateChoice: vi.fn(),
}));

vi.mock('../../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

// ── Re-import mocked modules ──

import * as reactionBonusHandler from '../../../services/automation/handlers/reactions/reactionBonusHandler.js';

// ── Test fixtures ──

const baseAction = {
  name: 'Bend Fate',
  automation: {
    type: 'class_feature',
    effect: 'bonus_or_penalty_choice',
  },
};

const basePlayerStats = { name: 'Paladin1', level: 5 };

const baseLastAttack = {
  d20: 14,
  bonus: 6,
  targetAc: 17,
  saveDc: 13,
  saveType: 'Dexterity',
  saveResult: 'success',
  hit: true,
  rollType: 'attack',
  attackerName: 'Goblin1',
};

const baseD4Roll = { total: 3 };

const baseEventLabel = 'Attack by Goblin1';

const baseProps = {
  action: baseAction,
  playerStats: basePlayerStats,
  campaignName: 'test-campaign',
  d4Roll: baseD4Roll,
  lastAttack: baseLastAttack,
  attackerName: baseLastAttack.attackerName,
  eventLabel: baseEventLabel,
  hitStatus: 'Hit',
  saveStatus: null,
  isAttack: true,
  isSave: false,
  onClose: vi.fn(),
};

function makeProps(overrides) {
  return { ...baseProps, ...(overrides || {}) };
}

function makeAction(overrides) {
  return { ...baseAction, ...(overrides || {}) };
}

// ── Helpers ──

function renderModal(props) {
  return render(<BendFateModal {...props} />);
}

// ── Tests ──

describe('BendFateModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ── Initial render / display ──

  describe('initial render', () => {
    it('renders modal with action name in header', () => {
      renderModal(baseProps);
      expect(screen.getByText('Bend Fate')).toBeInTheDocument();
    });

    it('renders default name when action name is missing', () => {
      const noNameAction = makeAction({ name: null });
      renderModal(makeProps({ action: noNameAction }));
      expect(screen.getByText('Bend Fate')).toBeInTheDocument();
    });

    it('renders the Font Awesome hand icon in header', () => {
      renderModal(baseProps);
      const icon = document.querySelector('.sp-header i.fa-solid.fa-hand');
      expect(icon).toBeInTheDocument();
    });

    it('renders event label as bold text', () => {
      renderModal(baseProps);
      expect(screen.getByText('Attack by Goblin1')).toBeInTheDocument();
    });

    it('renders original roll calculation', () => {
      renderModal(baseProps);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('Original roll: d20(14) + 6 = 20');
    });

    it('renders hit status line for attack type', () => {
      renderModal(baseProps);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('vs AC 17 → Hit');
    });

    it('renders d4 roll result', () => {
      renderModal(baseProps);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('Rolled 1d4:');
      expect(body.textContent).toContain('3');
    });

    it('renders "Choose how to apply the modifier" text', () => {
      renderModal(baseProps);
      expect(screen.getByText('Choose how to apply the modifier:')).toBeInTheDocument();
    });

    it('renders bonus button with correct value', () => {
      renderModal(baseProps);
      expect(screen.getByRole('button', { name: 'Apply +3 (Bonus)' })).toBeInTheDocument();
    });

    it('renders penalty button with correct value', () => {
      renderModal(baseProps);
      expect(screen.getByRole('button', { name: 'Apply -3 (Penalty)' })).toBeInTheDocument();
    });

    it('renders cancel button', () => {
      renderModal(baseProps);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('renders up arrow icon on bonus button', () => {
      renderModal(baseProps);
      const upArrow = document.querySelector('.sp-actions .sp-roll-btn i.fa-solid.fa-arrow-up');
      expect(upArrow).toBeInTheDocument();
    });

    it('renders down arrow icon on penalty button', () => {
      renderModal(baseProps);
      const downArrow = document.querySelector('.sp-actions .sp-roll-btn:nth-child(2) i.fa-solid.fa-arrow-down');
      expect(downArrow).toBeInTheDocument();
    });
  });

  // ── Save type display ──

  describe('save type display', () => {
    it('renders save status line for save type', () => {
      const props = makeProps({
        isAttack: false,
        isSave: true,
        saveStatus: 'Failure',
        eventLabel: 'Saving Throw by Goblin1',
      });
      renderModal(props);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('vs DC 13 → Failure');
    });

    it('renders save status with custom save type', () => {
      const props = makeProps({
        isAttack: false,
        isSave: true,
        saveStatus: 'Success',
        eventLabel: 'CON by Goblin1',
        lastAttack: { ...baseLastAttack, saveType: 'Constitution' },
      });
      renderModal(props);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('vs DC 13 → Success');
    });

    it('does not render hit status when isAttack is false', () => {
      const props = makeProps({
        isAttack: false,
        isSave: false,
        hitStatus: null,
      });
      renderModal(props);
      expect(screen.queryByText(/vs AC/)).not.toBeInTheDocument();
    });

    it('does not render save status when isSave is false', () => {
      const props = makeProps({
        isAttack: true,
        isSave: false,
        saveStatus: null,
      });
      renderModal(props);
      expect(screen.queryByText(/vs DC/)).not.toBeInTheDocument();
    });

    it('hides hit status when hitStatus is null', () => {
      const props = makeProps({
        hitStatus: null,
      });
      renderModal(props);
      expect(screen.queryByText(/vs AC/)).not.toBeInTheDocument();
    });

    it('hides save status when saveStatus is null', () => {
      const props = makeProps({
        isSave: true,
        saveStatus: null,
      });
      renderModal(props);
      expect(screen.queryByText(/vs DC/)).not.toBeInTheDocument();
    });
  });

  // ── Bonus value computation edge cases ──

  describe('bonus value computation', () => {
    it('handles bonus as object with modifier', () => {
      const props = makeProps({
        lastAttack: { ...baseLastAttack, bonus: { modifier: 5, total: 8 } },
      });
      renderModal(props);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('Original roll: d20(14) + 5 = 19');
    });

    it('handles bonus as object with total', () => {
      const props = makeProps({
        lastAttack: { ...baseLastAttack, bonus: { total: 7 } },
      });
      renderModal(props);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('Original roll: d20(14) + 7 = 21');
    });

    it('handles bonus as object with neither modifier nor total', () => {
      const props = makeProps({
        lastAttack: { ...baseLastAttack, bonus: {} },
      });
      renderModal(props);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('Original roll: d20(14) + 0 = 14');
    });

    it('handles bonus as a number', () => {
      const props = makeProps({
        lastAttack: { ...baseLastAttack, bonus: 4 },
      });
      renderModal(props);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('Original roll: d20(14) + 4 = 18');
    });

    it('handles missing d20 in lastAttack', () => {
      const props = makeProps({
        lastAttack: { ...baseLastAttack, d20: undefined },
      });
      renderModal(props);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('Original roll: d20() + 6 = 6');
    });
  });

  // ── Bonus/Penalty buttons ──

  describe('bonus and penalty buttons', () => {
    it('calls applyBendFateChoice with "bonus" mode when bonus button is clicked', async () => {
      reactionBonusHandler.applyBendFateChoice.mockResolvedValue({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Bend Fate',
          description: 'Bend Fate result',
        },
      });
      renderModal(baseProps);
      fireEvent.click(screen.getByRole('button', { name: 'Apply +3 (Bonus)' }));
      await waitFor(() => {
        expect(reactionBonusHandler.applyBendFateChoice).toHaveBeenCalledWith(
          baseAction,
          basePlayerStats,
          'test-campaign',
          baseD4Roll,
          baseLastAttack,
          'bonus',
        );
      });
    });

    it('calls applyBendFateChoice with "penalty" mode when penalty button is clicked', async () => {
      reactionBonusHandler.applyBendFateChoice.mockResolvedValue({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Bend Fate',
          description: 'Bend Fate result',
        },
      });
      renderModal(baseProps);
      fireEvent.click(screen.getByRole('button', { name: 'Apply -3 (Penalty)' }));
      await waitFor(() => {
        expect(reactionBonusHandler.applyBendFateChoice).toHaveBeenCalledWith(
          baseAction,
          basePlayerStats,
          'test-campaign',
          baseD4Roll,
          baseLastAttack,
          'penalty',
        );
      });
    });

    it('does not call applyBendFateChoice when cancel is clicked', async () => {
      renderModal(baseProps);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(reactionBonusHandler.applyBendFateChoice).not.toHaveBeenCalled();
    });
  });

  // ── Cancel button ──

  describe('cancel button', () => {
    it('calls onClose when cancel is clicked', () => {
      renderModal(baseProps);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(baseProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Result view ──

  describe('result view', () => {
    it('shows result view after applyBendFateChoice returns a result', async () => {
      reactionBonusHandler.applyBendFateChoice.mockResolvedValue({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Bend Fate',
          description: 'Attack: d20(14) + 6+3 = <strong>23</strong> vs AC 17 → HIT',
        },
      });
      renderModal(baseProps);
      fireEvent.click(screen.getByRole('button', { name: 'Apply +3 (Bonus)' }));
      await waitFor(() => {
        expect(screen.getByText(/Attack: d20/)).toBeInTheDocument();
      });
    });

    it('renders the result description from payload', async () => {
      reactionBonusHandler.applyBendFateChoice.mockResolvedValue({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Bend Fate',
          description: 'Your custom result description',
        },
      });
      renderModal(baseProps);
      fireEvent.click(screen.getByRole('button', { name: 'Apply +3 (Bonus)' }));
      await waitFor(() => {
        expect(screen.getByText('Your custom result description')).toBeInTheDocument();
      });
    });

    it('renders Done button in result view', async () => {
      reactionBonusHandler.applyBendFateChoice.mockResolvedValue({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Bend Fate',
          description: 'Result',
        },
      });
      renderModal(baseProps);
      fireEvent.click(screen.getByRole('button', { name: 'Apply +3 (Bonus)' }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
      });
    });

    it('hides selection buttons after applying', async () => {
      reactionBonusHandler.applyBendFateChoice.mockResolvedValue({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Bend Fate',
          description: 'Result',
        },
      });
      renderModal(baseProps);
      fireEvent.click(screen.getByRole('button', { name: 'Apply +3 (Bonus)' }));
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Apply +3 (Bonus)' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Apply -3 (Penalty)' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
      });
    });

    it('hides choice prompt after applying', async () => {
      reactionBonusHandler.applyBendFateChoice.mockResolvedValue({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Bend Fate',
          description: 'Result',
        },
      });
      renderModal(baseProps);
      fireEvent.click(screen.getByRole('button', { name: 'Apply +3 (Bonus)' }));
      await waitFor(() => {
        expect(screen.queryByText('Choose how to apply the modifier:')).not.toBeInTheDocument();
      });
    });

    it('renders result with custom action name', async () => {
      const customAction = makeAction({ name: 'Divine Favor' });
      reactionBonusHandler.applyBendFateChoice.mockResolvedValue({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Divine Favor',
          description: 'Result',
        },
      });
      renderModal(makeProps({ action: customAction }));
      fireEvent.click(screen.getByRole('button', { name: 'Apply +3 (Bonus)' }));
      await waitFor(() => {
        expect(screen.getByText('Divine Favor')).toBeInTheDocument();
      });
    });

    it('renders result with default name when action name is missing', async () => {
      const noNameAction = makeAction({ name: null });
      reactionBonusHandler.applyBendFateChoice.mockResolvedValue({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Bend Fate',
          description: 'Result',
        },
      });
      renderModal(makeProps({ action: noNameAction }));
      fireEvent.click(screen.getByRole('button', { name: 'Apply +3 (Bonus)' }));
      await waitFor(() => {
        expect(screen.getByText('Bend Fate')).toBeInTheDocument();
      });
    });
  });

  // ── Result view close behavior ──

  describe('result view close behavior', () => {
    it('calls onClose when Done button is clicked', async () => {
      reactionBonusHandler.applyBendFateChoice.mockResolvedValue({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Bend Fate',
          description: 'Result',
        },
      });
      const onClose = vi.fn();
      renderModal(makeProps({ onClose }));
      fireEvent.click(screen.getByRole('button', { name: 'Apply +3 (Bonus)' }));
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when overlay is clicked', async () => {
      reactionBonusHandler.applyBendFateChoice.mockResolvedValue({
        type: 'popup',
        payload: {
          type: 'automation_info',
          name: 'Bend Fate',
          description: 'Result',
        },
      });
      const onClose = vi.fn();
      renderModal(makeProps({ onClose }));
      fireEvent.click(screen.getByRole('button', { name: 'Apply +3 (Bonus)' }));
      await waitFor(() => {
        const overlay = document.querySelector('.sp-overlay');
        fireEvent.click(overlay);
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Initial render close behavior ──

  describe('initial render close behavior', () => {
    it('calls onClose when overlay is clicked on initial render', () => {
      const onClose = vi.fn();
      renderModal(makeProps({ onClose }));
      const overlay = document.querySelector('.sp-overlay');
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when modal content is clicked', () => {
      const onClose = vi.fn();
      renderModal(makeProps({ onClose }));
      const modal = document.querySelector('.sp-modal');
      fireEvent.click(modal);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // ── d4Roll value variations ──

  describe('d4 roll value variations', () => {
    it('renders d4 roll of 1', () => {
      const props = makeProps({ d4Roll: { total: 1 } });
      renderModal(props);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('Rolled 1d4:');
      expect(body.textContent).toContain('1');
      expect(screen.getByRole('button', { name: 'Apply +1 (Bonus)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Apply -1 (Penalty)' })).toBeInTheDocument();
    });

    it('renders d4 roll of 4', () => {
      const props = makeProps({ d4Roll: { total: 4 } });
      renderModal(props);
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('Rolled 1d4:');
      expect(body.textContent).toContain('4');
      expect(screen.getByRole('button', { name: 'Apply +4 (Bonus)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Apply -4 (Penalty)' })).toBeInTheDocument();
    });
  });

  // ── AC display variations ──

  describe('AC display variations', () => {
    it('uses targetAc for AC display', () => {
      const props = makeProps({
        lastAttack: { ...baseLastAttack, targetAc: 18, effectiveAc: null },
      });
      renderModal(props);
      expect(screen.getByText(/vs AC 18/)).toBeInTheDocument();
    });

    it('falls back to effectiveAc when targetAc is missing', () => {
      const props = makeProps({
        lastAttack: { ...baseLastAttack, targetAc: null, effectiveAc: 16 },
      });
      renderModal(props);
      expect(screen.getByText(/vs AC 16/)).toBeInTheDocument();
    });

    it('shows em dash when both AC values are missing', () => {
      const props = makeProps({
        lastAttack: { ...baseLastAttack, targetAc: null, effectiveAc: null },
      });
      renderModal(props);
      expect(screen.getByText(/vs AC —/)).toBeInTheDocument();
    });
  });

  // ── Save DC display variations ──

  describe('save DC display variations', () => {
    it('uses saveDc for DC display', () => {
      const props = makeProps({
        isSave: true,
        saveStatus: 'Failure',
        lastAttack: { ...baseLastAttack, saveDc: 15 },
      });
      renderModal(props);
      expect(screen.getByText(/vs DC 15/)).toBeInTheDocument();
    });

    it('shows em dash when saveDc is missing', () => {
      const props = makeProps({
        isSave: true,
        saveStatus: 'Failure',
        lastAttack: { ...baseLastAttack, saveDc: null },
      });
      renderModal(props);
      expect(screen.getByText(/vs DC —/)).toBeInTheDocument();
    });
  });

  // ── Overlay interaction ──

  describe('overlay interaction', () => {
    it('calls onClose when the overlay background is clicked', () => {
      const onClose = vi.fn();
      renderModal(makeProps({ onClose }));
      const overlay = document.querySelector('.sp-overlay');
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('prevents modal content clicks from closing', () => {
      const onClose = vi.fn();
      renderModal(makeProps({ onClose }));
      const modal = document.querySelector('.sp-modal');
      fireEvent.click(modal);
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
