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

describe('CharSpecialActions - Combat feature modal onClose handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('closes QuiveringPalmModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'quiveringPalm',
      payload: {},
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Quivering Palm', description: 'Palm of quivering.', automation: { type: 'quivering_palm' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Quivering Palm/));

    await waitFor(() => {
      expect(screen.getByTestId('quivering-palm-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('quivering-palm-modal')).not.toBeInTheDocument();
    });
  });

  it('closes StepsOfTheFeyTauntModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'stepsOfTheFeyTaunt',
      payload: {},
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Steps of the Fey Taunt', description: 'Taunt with fey steps.', automation: { type: 'steps_of_the_fey_taunt' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Steps of the Fey Taunt/));

    await waitFor(() => {
      expect(screen.getByTestId('steps-of-the-fey-taunt-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('steps-of-the-fey-taunt-modal')).not.toBeInTheDocument();
    });
  });

  it('closes HurlThroughHellModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'hurlThroughHell',
      payload: {},
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Hurl Through Hell', description: 'Hurl to hell.', automation: { type: 'hurl_through_hell' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Hurl Through Hell/));

    await waitFor(() => {
      expect(screen.getByTestId('hurl-through-hell-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('hurl-through-hell-modal')).not.toBeInTheDocument();
    });
  });

  it('closes ClairvoyantCombatantModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'clairvoyantCombatant',
      payload: {},
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Clairvoyant Combatant', description: 'Combat clairvoyantly.', automation: { type: 'clairvoyant_combatant' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Clairvoyant Combatant/));

    await waitFor(() => {
      expect(screen.getByTestId('clairvoyant-combatant-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('clairvoyant-combatant-modal')).not.toBeInTheDocument();
    });
  });
});
