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

describe('CharSpecialActions - Elemental modal onClose handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(key => delete mockRuntimeStore[key]);
  });

  describe('Elemental Affinity modal', () => {
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

    it('renders the action name inside the modal', async () => {
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

      expect(within(screen.getByTestId('elemental-affinity-modal')).getByText('Elemental Affinity')).toBeInTheDocument();
    });
  });

  describe('Wild Magic Surge modal', () => {
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

    it('renders the modal title text', async () => {
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

      expect(within(screen.getByTestId('wild-magic-surge-modal')).getByText('Wild Magic Surge')).toBeInTheDocument();
    });
  });

  describe('Stride of the Elements modal', () => {
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

    it('renders confirm buttons for movement options', async () => {
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

      const modal = screen.getByTestId('stride-of-the-elements-modal');
      expect(within(modal).getByText('Confirm Ice Walk')).toBeInTheDocument();
      expect(within(modal).getByText('Confirm Speed')).toBeInTheDocument();
      expect(within(modal).getByText('Confirm Fly')).toBeInTheDocument();
      expect(within(modal).getByText('Confirm Teleport')).toBeInTheDocument();
    });
  });

  describe('Destructive Stride modal', () => {
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

    it('renders confirm buttons for target and popup outcomes', async () => {
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

      const modal = screen.getByTestId('destructive-stride-modal');
      expect(within(modal).getByText('Confirm Target')).toBeInTheDocument();
      expect(within(modal).getByText('Confirm Popup')).toBeInTheDocument();
    });
  });

  describe('Interaction ordering', () => {
    it('calls executeHandler once when clicking an elemental action', async () => {
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

      expect(executeHandler).not.toHaveBeenCalled();

      fireEvent.click(screen.getByText(/Elemental Affinity/));

      await waitFor(() => {
        expect(executeHandler).toHaveBeenCalledTimes(1);
      });
    });

    it('opens a different elemental modal after closing the previous one', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'elementalAffinity',
        payload: { action: { name: 'Elemental Affinity' } },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          { name: 'Elemental Affinity', description: 'Boost damage.', automation: { type: 'elemental_affinity' } },
          { name: 'Wild Magic Surge', description: 'Surge with magic.', automation: { type: 'wild_magic_surge' } },
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      // Open first modal
      fireEvent.click(screen.getByText(/Elemental Affinity/));
      await waitFor(() => {
        expect(screen.getByTestId('elemental-affinity-modal')).toBeInTheDocument();
      });

      // Close first modal
      fireEvent.click(screen.getByText('Close'));
      await waitFor(() => {
        expect(screen.queryByTestId('elemental-affinity-modal')).not.toBeInTheDocument();
      });

      // Set up mock for the second action
      executeHandler.mockResolvedValueOnce({
        type: 'modal',
        modalName: 'wildMagicSurge',
        payload: {},
      });

      // Open second modal
      fireEvent.click(screen.getByText(/Wild Magic Surge/));
      await waitFor(() => {
        expect(screen.getByTestId('wild-magic-surge-modal')).toBeInTheDocument();
      });
    });
  });
});
