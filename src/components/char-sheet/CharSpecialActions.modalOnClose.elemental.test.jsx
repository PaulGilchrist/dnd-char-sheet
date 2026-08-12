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

describe('CharSpecialActions - Elemental modal onClose handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('closes ElementalAffinityModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'elementalAffinity',
      payload: { action: { name: 'Elemental Affinity' } },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Elemental Affinity', description: 'Boost damage.', automation: { type: 'elemental_affinity' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Elemental Affinity/));

    await waitFor(() => {
      expect(screen.getByTestId('elemental-affinity-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('elemental-affinity-modal')).not.toBeInTheDocument();
    });
  });

  it('closes WildMagicSurgeModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'wildMagicSurge',
      payload: {},
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Wild Magic Surge', description: 'Surge with magic.', automation: { type: 'wild_magic_surge' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Wild Magic Surge/));

    await waitFor(() => {
      expect(screen.getByTestId('wild-magic-surge-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('wild-magic-surge-modal')).not.toBeInTheDocument();
    });
  });

  it('closes StrideOfTheElementsModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'strideOfTheElements',
      payload: { action: { name: 'Stride of the Elements' } },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Stride of the Elements', description: 'Stride elementally.', automation: { type: 'stride_of_the_elements' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Stride of the Elements/));

    await waitFor(() => {
      expect(screen.getByTestId('stride-of-the-elements-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('stride-of-the-elements-modal')).not.toBeInTheDocument();
    });
  });

  it('closes DestructiveStrideModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'destructiveStride',
      payload: { action: { name: 'Destructive Stride' } },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Destructive Stride', description: 'Stride destructively.', automation: { type: 'destructive_stride' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Destructive Stride/));

    await waitFor(() => {
      expect(screen.getByTestId('destructive-stride-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('destructive-stride-modal')).not.toBeInTheDocument();
    });
  });
});
