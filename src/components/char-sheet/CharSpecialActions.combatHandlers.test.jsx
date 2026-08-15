// @improved-by-ai
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import './CharSpecialActions.modalMocks.jsx';
import CharSpecialActions from './CharSpecialActions.jsx';
import { executeHandler } from '../../services/automation/index.js';
import { applyPortentChoice } from '../../services/automation/handlers/class-wizard/portentHandler.js';
import { applyTargetChoice } from '../../services/automation/handlers/combat/destructiveStrideHandler.js';
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

function createSpecialAction(name, automation) {
  return { name, description: `${name} description.`, automation };
}

describe('CharSpecialActions - Destructive Stride', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(key => delete mockRuntimeStore[key]);
  });

  describe('handleDestructiveStrideConfirm', () => {
    it('opens destructive stride target modal when result is modal', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'destructiveStride',
        payload: {
          action: { name: 'Destructive Stride' },
          playerStats: createPlayerStats(),
          campaignName: 'test',
          chosenType: 'bludgeoning',
          martialArtsDie: '1d6',
        },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Destructive Stride', { type: 'destructive_stride' }),
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      expect(executeHandler).not.toHaveBeenCalled();

      fireEvent.click(screen.getAllByText(/Destructive Stride/)[0]);

      await waitFor(() => {
        expect(executeHandler).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(screen.getByTestId('destructive-stride-modal')).toBeInTheDocument();
      });

      expect(within(screen.getByTestId('destructive-stride-modal')).getByText('Destructive Stride')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Confirm Target'));

      await waitFor(() => {
        expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
      });
    });

    it('shows popup when result is popup', async () => {
      const mockSetPopupHtml = vi.fn();
      vi.mocked((await import('../../hooks/combat/DiceRollContext.js')).useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'destructiveStride',
        payload: {
          action: { name: 'Destructive Stride' },
          playerStats: createPlayerStats(),
          campaignName: 'test',
          chosenType: 'piercing',
          martialArtsDie: '1d4',
        },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Destructive Stride', { type: 'destructive_stride' }),
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Destructive Stride/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('destructive-stride-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm Popup'));

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalled();
      });

      expect(mockSetPopupHtml).toHaveBeenCalledTimes(1);
      const popupCall = mockSetPopupHtml.mock.calls[0][0];
      expect(popupCall).toContain('Destructive Stride');
      expect(popupCall).toContain('Struck target.');
      expect(screen.queryByTestId('destructive-stride-modal')).not.toBeInTheDocument();
    });

    it('closes destructive stride modal when onClose is called', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'destructiveStride',
        payload: {
          action: { name: 'Destructive Stride' },
          playerStats: createPlayerStats(),
          campaignName: 'test',
          chosenType: 'slashing',
          martialArtsDie: '1d8',
        },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Destructive Stride', { type: 'destructive_stride' }),
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Destructive Stride/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('destructive-stride-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Close'));

      await waitFor(() => {
        expect(screen.queryByTestId('destructive-stride-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('handleDestructiveStrideTargetConfirm', () => {
    it('calls applyTargetChoice and shows popup on result', async () => {
      const mockSetPopupHtml = vi.fn();
      vi.mocked((await import('../../hooks/combat/DiceRollContext.js')).useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'destructiveStride',
        payload: {
          action: { name: 'Destructive Stride' },
          playerStats: createPlayerStats(),
          campaignName: 'test',
          chosenType: 'bludgeoning',
          martialArtsDie: '1d6',
        },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Destructive Stride', { type: 'destructive_stride' }),
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Destructive Stride/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('destructive-stride-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm Target'));

      await waitFor(() => {
        expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Strike'));

      await waitFor(() => {
        expect(applyTargetChoice).toHaveBeenCalledOnce();
      });

      expect(mockSetPopupHtml).toHaveBeenCalled();
      const popupCall = mockSetPopupHtml.mock.calls[0][0];
      expect(popupCall).toContain('Destructive Stride');
      expect(popupCall).toContain('Struck target.');
    });

    it('closes target modal after confirm regardless of result type', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'destructiveStride',
        payload: {
          action: { name: 'Destructive Stride' },
          playerStats: createPlayerStats(),
          campaignName: 'test',
          chosenType: 'piercing',
          martialArtsDie: '1d4',
        },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Destructive Stride', { type: 'destructive_stride' }),
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Destructive Stride/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('destructive-stride-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm Target'));

      await waitFor(() => {
        expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Strike'));

      await waitFor(() => {
        expect(screen.queryByTestId('secondary-target-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('handleDestructiveStrideTargetSkip', () => {
    it('closes the target modal when skip is clicked', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'destructiveStride',
        payload: {
          action: { name: 'Destructive Stride' },
          playerStats: createPlayerStats(),
          campaignName: 'test',
          chosenType: 'slashing',
          martialArtsDie: '1d8',
        },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Destructive Stride', { type: 'destructive_stride' }),
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Destructive Stride/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('destructive-stride-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm Target'));

      await waitFor(() => {
        expect(screen.getByTestId('secondary-target-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Skip'));

      await waitFor(() => {
        expect(screen.queryByTestId('secondary-target-modal')).not.toBeInTheDocument();
      });
    });
  });
});

describe('CharSpecialActions - Moonlight Step Fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(key => delete mockRuntimeStore[key]);
  });

  describe('handleMoonlightStepFallbackConfirm', () => {
    it('renders the moonlight step fallback modal with correct slot level', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'moonlightStepFallback',
        payload: {
          action: { name: 'Moonlight Step' },
          playerStats: createPlayerStats(),
          campaignName: 'test',
          slotLevel: 3,
        },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Moonlight Step', { type: 'teleport', effect: 'moonlight_step_teleport' }),
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Moonlight Step/)[0]);

      await waitFor(() => {
        expect(screen.getByText(/Consume a level 3 spell slot to use Moonlight Step/)).toBeInTheDocument();
        expect(screen.getByText('Yes, Consume Slot')).toBeInTheDocument();
        expect(screen.getByText('No')).toBeInTheDocument();
      });
    });

    it('closes moonlight step fallback modal when onClose is called', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'moonlightStepFallback',
        payload: {
          action: { name: 'Moonlight Step' },
          playerStats: createPlayerStats(),
          campaignName: 'test',
          slotLevel: 2,
        },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Moonlight Step', { type: 'teleport', effect: 'moonlight_step_teleport' }),
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Moonlight Step/)[0]);

      await waitFor(() => {
        expect(screen.getByText(/Consume a level 2 spell slot to use Moonlight Step/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('No'));

      await waitFor(() => {
        expect(screen.queryByText(/Consume a level 2 spell slot to use Moonlight Step/)).not.toBeInTheDocument();
      });
    });
  });
});

describe('CharSpecialActions - Portent Die Choice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(key => delete mockRuntimeStore[key]);
  });

  describe('handlePortentDieChoice', () => {
    it('calls applyPortentChoice and shows popup on result', async () => {
      const mockSetPopupHtml = vi.fn();
      vi.mocked((await import('../../hooks/combat/DiceRollContext.js')).useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'portentDiceChoice',
        payload: {
          action: { name: 'Portent' },
          playerStats: createPlayerStats(),
          campaignName: 'test',
          targetName: 'Orc',
          eventType: 'save',
          eventData: { d20: 10, bonus: 2, saveType: 'Dexterity' },
          context: {},
          diceOptions: [5, 15],
        },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Portent', { type: 'portent' }),
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Portent/)[0]);

      await waitFor(() => {
        expect(screen.getByText('Orc')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('5'));

      await waitFor(() => {
        expect(applyPortentChoice).toHaveBeenCalledOnce();
      });

      expect(applyPortentChoice).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Portent' }),
        expect.any(Object),
        'test',
        'Orc',
        'save',
        expect.objectContaining({ d20: 10, bonus: 2, saveType: 'Dexterity' }),
        expect.any(Object),
        5
      );

      expect(mockSetPopupHtml).toHaveBeenCalled();
      const popupCall = mockSetPopupHtml.mock.calls[0][0];
      expect(popupCall).toContain('Portent');
      expect(popupCall).toContain('Die applied');
    });

    it('handles error in applyPortentChoice by closing modal', async () => {
      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Portent', { type: 'portent' }),
        ],
      });

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'portentDiceChoice',
        payload: {
          action: { name: 'Portent' },
          playerStats: createPlayerStats(),
          campaignName: 'test',
          targetName: 'Troll',
          eventType: 'attack',
          eventData: { d20: 18, bonus: 5, targetName: 'Troll', hit: true },
          context: {},
          diceOptions: [3, 8],
        },
      });

      applyPortentChoice.mockRejectedValue(new Error('Portent failed'));

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Portent/)[0]);

      await waitFor(() => {
        expect(screen.getByText('Troll')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('3'));

      await waitFor(() => {
        expect(screen.queryByText('Troll')).not.toBeInTheDocument();
      });
    });
  });

  describe('handlePortentModalClose', () => {
    it('closes the portent modal when cancel is clicked', async () => {
      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Portent', { type: 'portent' }),
        ],
      });

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'portentDiceChoice',
        payload: {
          action: { name: 'Portent' },
          playerStats: createPlayerStats(),
          campaignName: 'test',
          targetName: 'Dragon',
          eventType: 'attack',
          eventData: { d20: 20, bonus: 7, targetName: 'Dragon', hit: true },
          context: {},
          diceOptions: [10, 14],
        },
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Portent/)[0]);

      await waitFor(() => {
        expect(screen.getByText('Dragon')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByText('Dragon')).not.toBeInTheDocument();
      });
    });
  });
});

describe('CharSpecialActions - Stride of the Elements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(key => delete mockRuntimeStore[key]);
  });

  describe('handleStrideConfirm', () => {
    it('shows popup with chosen option description on confirm', async () => {
      const mockSetPopupHtml = vi.fn();
      vi.mocked((await import('../../hooks/combat/DiceRollContext.js')).useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'strideOfTheElements',
        payload: {
          action: { name: 'Stride of the Elements' },
          playerStats: createPlayerStats(),
          campaignName: 'test',
        },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Stride of the Elements', { type: 'stride_of_the_elements' }),
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Stride of the Elements/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('stride-of-the-elements-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm Ice Walk'));

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalled();
      });

      expect(mockSetPopupHtml).toHaveBeenCalledTimes(1);
      const popupCall = mockSetPopupHtml.mock.calls[0][0];
      expect(popupCall).toContain('Stride of the Elements');
      expect(popupCall).toContain('Ice Walk');
      expect(screen.queryByTestId('stride-of-the-elements-modal')).not.toBeInTheDocument();
    });

    it('closes stride modal when onClose is called', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'strideOfTheElements',
        payload: {
          action: { name: 'Stride of the Elements' },
          playerStats: createPlayerStats(),
          campaignName: 'test',
        },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Stride of the Elements', { type: 'stride_of_the_elements' }),
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Stride of the Elements/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('stride-of-the-elements-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Close'));

      await waitFor(() => {
        expect(screen.queryByTestId('stride-of-the-elements-modal')).not.toBeInTheDocument();
      });
    });
  });
});

describe('CharSpecialActions - Elemental Epitome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(key => delete mockRuntimeStore[key]);
  });

  describe('handleEpitomeConfirm', () => {
    it('shows popup with payload description on confirm', async () => {
      const mockSetPopupHtml = vi.fn();
      vi.mocked((await import('../../hooks/combat/DiceRollContext.js')).useDiceRollPopup).mockReturnValue({ setPopupHtml: mockSetPopupHtml });

      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'elementalEpitome',
        payload: {
          action: { name: 'Elemental Epitome' },
          playerStats: createPlayerStats(),
          campaignName: 'test',
        },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Elemental Epitome', { type: 'elemental_epitome' }),
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Elemental Epitome/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('elemental-epitome-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(mockSetPopupHtml).toHaveBeenCalled();
      });

      const popupCall = mockSetPopupHtml.mock.calls[0][0];
      expect(popupCall).toContain('Elemental Epitome');
      expect(popupCall).toContain('Elemental Epitome activated');
      expect(screen.queryByTestId('elemental-epitome-modal')).not.toBeInTheDocument();
    });

    it('closes epitome modal when onClose is called', async () => {
      executeHandler.mockResolvedValue({
        type: 'modal',
        modalName: 'elementalEpitome',
        payload: {
          action: { name: 'Elemental Epitome' },
          playerStats: createPlayerStats(),
          campaignName: 'test',
        },
      });

      const playerStats = createPlayerStats({
        specialActions: [
          createSpecialAction('Elemental Epitome', { type: 'elemental_epitome' }),
        ],
      });

      render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

      fireEvent.click(screen.getAllByText(/Elemental Epitome/)[0]);

      await waitFor(() => {
        expect(screen.getByTestId('elemental-epitome-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Close'));

      await waitFor(() => {
        expect(screen.queryByTestId('elemental-epitome-modal')).not.toBeInTheDocument();
      });
    });
  });
});

describe('CharSpecialActions - Elemental Affinity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(key => delete mockRuntimeStore[key]);
  });

  it('closes ElementalAffinityModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'elementalAffinity',
      payload: {
        action: { name: 'Elemental Affinity' },
        playerStats: createPlayerStats(),
        campaignName: 'test',
      },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        createSpecialAction('Elemental Affinity', { type: 'elemental_affinity' }),
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getAllByText(/Elemental Affinity/)[0]);

    await waitFor(() => {
      expect(screen.getByTestId('elemental-affinity-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('elemental-affinity-modal')).not.toBeInTheDocument();
    });
  });
});

describe('CharSpecialActions - Wild Magic Surge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(key => delete mockRuntimeStore[key]);
  });

  it('closes WildMagicSurgeModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'wildMagicSurge',
      payload: {
        action: { name: 'Wild Magic Surge' },
        playerStats: createPlayerStats(),
        campaignName: 'test',
      },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        createSpecialAction('Wild Magic Surge', { type: 'wild_magic_surge' }),
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getAllByText(/Wild Magic Surge/)[0]);

    await waitFor(() => {
      expect(screen.getByTestId('wild-magic-surge-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('wild-magic-surge-modal')).not.toBeInTheDocument();
    });
  });
});

describe('CharSpecialActions - cannotAct guard for combat handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(key => delete mockRuntimeStore[key]);
  });

  it('does not execute destructive stride when cannotAct is true', async () => {
    const playerStats = createPlayerStats({
      specialActions: [
        createSpecialAction('Destructive Stride', { type: 'destructive_stride' }),
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" cannotAct={true} />);

      fireEvent.click(screen.getAllByText(/Destructive Stride/)[0]);

      await waitFor(() => {
        expect(executeHandler).not.toHaveBeenCalled();
      });

      expect(screen.queryByTestId('destructive-stride-modal')).not.toBeInTheDocument();
  });

  it('does not execute portent when cannotAct is true', async () => {
    const playerStats = createPlayerStats({
      specialActions: [
        createSpecialAction('Portent', { type: 'portent' }),
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" cannotAct={true} />);

    fireEvent.click(screen.getAllByText(/Portent/)[0]);

    await waitFor(() => {
      expect(executeHandler).not.toHaveBeenCalled();
    });

    expect(screen.queryByTestId('portent-modal')).not.toBeInTheDocument();
  });

  it('does not execute stride of elements when cannotAct is true', async () => {
    const playerStats = createPlayerStats({
      specialActions: [
        createSpecialAction('Stride of the Elements', { type: 'stride_of_the_elements' }),
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" cannotAct={true} />);

    fireEvent.click(screen.getAllByText(/Stride of the Elements/)[0]);

    await waitFor(() => {
      expect(executeHandler).not.toHaveBeenCalled();
    });

    expect(screen.queryByTestId('stride-of-the-elements-modal')).not.toBeInTheDocument();
  });
});

describe('CharSpecialActions - executeHandler error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockRuntimeStore).forEach(key => delete mockRuntimeStore[key]);
  });

  it('handles executeHandler returning null silently without opening modal', async () => {
    executeHandler.mockResolvedValue(null);

    const playerStats = createPlayerStats({
      specialActions: [
        createSpecialAction('Destructive Stride', { type: 'destructive_stride' }),
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getAllByText(/Destructive Stride/)[0]);

    await waitFor(() => {
      expect(executeHandler).toHaveBeenCalled();
    });

    expect(screen.queryByTestId('destructive-stride-modal')).not.toBeInTheDocument();
  });

  it('handles executeHandler returning undefined silently', async () => {
    executeHandler.mockResolvedValue(undefined);

    const playerStats = createPlayerStats({
      specialActions: [
        createSpecialAction('Portent', { type: 'portent' }),
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getAllByText(/Portent/)[0]);

    await waitFor(() => {
      expect(executeHandler).toHaveBeenCalled();
    });

    expect(screen.queryByTestId('portent-modal')).not.toBeInTheDocument();
  });
});
