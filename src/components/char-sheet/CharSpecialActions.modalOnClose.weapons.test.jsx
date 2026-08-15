// @improved-by-ai
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import './CharSpecialActions.modalMocks.jsx';
import CharSpecialActions from './CharSpecialActions.jsx';
import { executeHandler } from '../../services/automation/index.js';
import { mockRuntimeStore } from './CharSpecialActions.modalMocks.jsx';

const basePlayerStats = {
  name: 'TestCharacter',
  specialActions: [],
  class: {
    fightingStyles: [],
  },
  actions: [],
  bonusActions: [],
  reactions: [],
  characterAdvancement: [],
  proficiency: 2,
};

function createPlayerStats(overrides = {}) {
  return { ...basePlayerStats, ...overrides };
}

const weaponModalTests = [
  {
    name: 'WeaponKindMasteryModal',
    modalName: 'weaponKindMastery',
    actionName: 'Weapon Kind Mastery',
    automation: { type: 'weapon_kind_mastery' },
    payload: { action: { name: 'Weapon Kind Mastery' } },
    testId: 'weapon-kind-mastery-modal',
    modalTitle: 'Weapon Kind Mastery',
  },
  {
    name: 'WeaponMasteryChoiceModal',
    modalName: 'weaponMasteryChoice',
    actionName: 'Weapon Mastery',
    automation: { type: 'weapon_mastery_choice' },
    payload: { action: { name: 'Weapon Mastery' } },
    testId: 'weapon-mastery-choice-modal',
    modalTitle: 'Weapon Mastery Choice',
  },
];

describe('CharSpecialActions - Weapon modal onClose handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(key => delete mockRuntimeStore[key]);
  });

  describe.each(weaponModalTests)('$name ($actionName)', ({ modalName, actionName, automation, payload, testId, modalTitle }) => {
    it('opens the modal and closes it when onClose is called', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName,
        payload,
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: actionName, description: `${actionName} description.`, automation },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      expect(executeHandler).not.toHaveBeenCalled();

      fireEvent.click(screen.getAllByText(new RegExp(actionName))[0]);

      await waitFor(() => {
        expect(executeHandler).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(screen.getByTestId(testId)).toBeInTheDocument();
      });

      const modal = screen.getByTestId(testId);
      expect(within(modal).getByText(modalTitle)).toBeInTheDocument();
      expect(within(modal).getByRole('button', { name: 'Close' })).toBeInTheDocument();

      fireEvent.click(within(modal).getByRole('button', { name: 'Close' }));

      await waitFor(() => {
        expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
      });
    });

    it('does not open any modal when no specialActions are defined', async () => {
      const playerStats = createPlayerStats({ specialActions: [] });
      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      await waitFor(() => {
        expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
      });
      expect(executeHandler).not.toHaveBeenCalled();
    });

    it('reopens the modal after closing (re-click behavior)', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName,
        payload,
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: actionName, description: `${actionName} description.`, automation },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      // First open
      fireEvent.click(screen.getAllByText(new RegExp(actionName))[0]);
      await waitFor(() => {
        expect(executeHandler).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(screen.getByTestId(testId)).toBeInTheDocument();
      });

      // Close
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      await waitFor(() => {
        expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
      });

      // Re-click should call executeHandler again
      fireEvent.click(screen.getAllByText(new RegExp(actionName))[0]);
      await waitFor(() => {
        expect(executeHandler).toHaveBeenCalledTimes(2);
      });
      await waitFor(() => {
        expect(screen.getByTestId(testId)).toBeInTheDocument();
      });
    });
  });

  describe('Interaction ordering', () => {
    it('opens a different weapon modal after closing the previous one', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'weaponKindMastery',
        payload: { action: { name: 'Weapon Kind Mastery' } },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Weapon Kind Mastery', description: 'Choose weapon kind.', automation: { type: 'weapon_kind_mastery' } },
          { name: 'Weapon Mastery', description: 'Choose mastery.', automation: { type: 'weapon_mastery_choice' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      // Open first modal
      fireEvent.click(screen.getAllByText(/Weapon Kind Mastery/)[0]);
      await waitFor(() => {
        expect(screen.getByTestId('weapon-kind-mastery-modal')).toBeInTheDocument();
      });

      // Close first modal
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      await waitFor(() => {
        expect(screen.queryByTestId('weapon-kind-mastery-modal')).not.toBeInTheDocument();
      });

      // Set up mock for the second action
      executeHandler.mockResolvedValueOnce({
        type: 'modal',
        modalName: 'weaponMasteryChoice',
        payload: { action: { name: 'Weapon Mastery' } },
      });

      // Open second modal
      fireEvent.click(screen.getAllByText(/Weapon Mastery/)[0]);
      await waitFor(() => {
        expect(screen.getByTestId('weapon-mastery-choice-modal')).toBeInTheDocument();
      });
    });

    it('calls executeHandler once per action click', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'weaponKindMastery',
        payload: { action: { name: 'Weapon Kind Mastery' } },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Weapon Kind Mastery', description: 'Choose weapon kind.', automation: { type: 'weapon_kind_mastery' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      expect(executeHandler).not.toHaveBeenCalled();

      fireEvent.click(screen.getAllByText(/Weapon Kind Mastery/)[0]);

      await waitFor(() => {
        expect(executeHandler).toHaveBeenCalledTimes(1);
      });

      // Close the modal
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      await waitFor(() => {
        expect(screen.queryByTestId('weapon-kind-mastery-modal')).not.toBeInTheDocument();
      });

      // Re-click should call executeHandler again
      fireEvent.click(screen.getAllByText(/Weapon Kind Mastery/)[0]);

      await waitFor(() => {
        expect(executeHandler).toHaveBeenCalledTimes(2);
      });
    });
  });
});
