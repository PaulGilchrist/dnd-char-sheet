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

describe('CharSpecialActions - Resource modal onClose handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(key => delete mockRuntimeStore[key]);
  });

  const resourceModalTests = [
    {
      name: 'ResourcePoolModal',
      modalName: 'resourcePool',
      actionName: 'Resource Pool',
      automation: { type: 'resource_pool' },
      payload: { automation: { type: 'resource_pool' } },
      testId: 'resource-pool-modal',
      modalTitle: 'Resource Pool',
    },
    {
      name: 'NaturalRecoveryModal',
      modalName: 'naturalRecovery',
      actionName: 'Natural Recovery',
      automation: { type: 'natural_recovery' },
      payload: {},
      testId: 'natural-recovery-modal',
      modalTitle: 'Natural Recovery',
    },
    {
      name: 'CircleOfTheLandSpellsModal',
      modalName: 'circleOfTheLandSpells',
      actionName: 'Circle of the Land',
      automation: { type: 'circle_of_the_land' },
      payload: {},
      testId: 'circle-of-the-land-modal',
      modalTitle: 'Circle of the Land',
    },
  ];

  describe.each(resourceModalTests)('$name ($actionName)', ({ modalName, actionName, automation, payload, testId, modalTitle }) => {
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
    it('opens a different resource modal after closing the previous one', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'resourcePool',
        payload: { automation: { type: 'resource_pool' } },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Resource Pool', description: 'Use resource pool.', automation: { type: 'resource_pool' } },
          { name: 'Natural Recovery', description: 'Recover resources.', automation: { type: 'natural_recovery' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      // Open first modal
      fireEvent.click(screen.getAllByText(/Resource Pool/)[0]);
      await waitFor(() => {
        expect(screen.getByTestId('resource-pool-modal')).toBeInTheDocument();
      });

      // Close first modal
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      await waitFor(() => {
        expect(screen.queryByTestId('resource-pool-modal')).not.toBeInTheDocument();
      });

      // Set up mock for the second action
      executeHandler.mockResolvedValueOnce({
        type: 'modal',
        modalName: 'naturalRecovery',
        payload: {},
      });

      // Open second modal
      fireEvent.click(screen.getAllByText(/Natural Recovery/)[0]);
      await waitFor(() => {
        expect(screen.getByTestId('natural-recovery-modal')).toBeInTheDocument();
      });
    });

    it('calls executeHandler once per action click', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'resourcePool',
        payload: { automation: { type: 'resource_pool' } },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Resource Pool', description: 'Use resource pool.', automation: { type: 'resource_pool' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      expect(executeHandler).not.toHaveBeenCalled();

      fireEvent.click(screen.getAllByText(/Resource Pool/)[0]);

      await waitFor(() => {
        expect(executeHandler).toHaveBeenCalledTimes(1);
      });

      // Close the modal
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      await waitFor(() => {
        expect(screen.queryByTestId('resource-pool-modal')).not.toBeInTheDocument();
      });

      // Re-click should call executeHandler again
      fireEvent.click(screen.getAllByText(/Resource Pool/)[0]);

      await waitFor(() => {
        expect(executeHandler).toHaveBeenCalledTimes(2);
      });
    });
  });
});
