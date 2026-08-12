import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import './CharSpecialActions.modalMocks.jsx';
import CharSpecialActions from './CharSpecialActions.jsx';
import { executeHandler } from '../../services/automation/index.js';

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
  });

  it('closes ResourcePoolModal when onClose is called', async () => {
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

    fireEvent.click(screen.getByText(/Resource Pool/));

    await waitFor(() => {
      expect(screen.getByTestId('resource-pool-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('resource-pool-modal')).not.toBeInTheDocument();
    });
  });

  it('closes NaturalRecoveryModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'naturalRecovery',
      payload: {},
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Natural Recovery', description: 'Recover resources.', automation: { type: 'natural_recovery' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Natural Recovery/));

    await waitFor(() => {
      expect(screen.getByTestId('natural-recovery-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('natural-recovery-modal')).not.toBeInTheDocument();
    });
  });

  it('closes CircleOfTheLandSpellsModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'circleOfTheLandSpells',
      payload: {},
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Circle of the Land', description: 'Choose spells.', automation: { type: 'circle_of_the_land' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Circle of the Land/));

    await waitFor(() => {
      expect(screen.getByTestId('circle-of-the-land-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('circle-of-the-land-modal')).not.toBeInTheDocument();
    });
  });
});
