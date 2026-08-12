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

describe('CharSpecialActions - Arcane modal onClose handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('closes TeleportModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'teleport',
      payload: { action: { name: 'Blink Steps' }, playerStats: basePlayerStats, campaignName: 'test' },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Blink Steps', description: 'Teleport somewhere.', automation: { type: 'teleport' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Blink Steps/));

    await waitFor(() => {
      expect(screen.getByTestId('teleport-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('teleport-modal')).not.toBeInTheDocument();
    });
  });

  it('closes SignatureSpellsModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'signatureSpells',
      payload: { action: { name: 'Signature Spells' }, playerStats: basePlayerStats, campaignName: 'test' },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Signature Spells', description: 'Choose spells.', automation: { type: 'signature_spells' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Signature Spells/));

    await waitFor(() => {
      expect(screen.getByTestId('signature-spells-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('signature-spells-modal')).not.toBeInTheDocument();
    });
  });

  it('closes SpellMasteryModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'spellMastery',
      payload: { action: { name: 'Spell Mastery' }, playerStats: basePlayerStats, campaignName: 'test' },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Spell Mastery', description: 'Choose spells.', automation: { type: 'spell_mastery' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Spell Mastery/));

    await waitFor(() => {
      expect(screen.getByTestId('spell-mastery-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('spell-mastery-modal')).not.toBeInTheDocument();
    });
  });

  it('closes SavantModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'EvocationSavant',
      payload: { action: { name: 'Evocation Savant' }, playerStats: basePlayerStats, campaignName: 'test', school: 'Evocation' },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Evocation Savant', description: 'Choose spells.', automation: { type: 'passive_rule', effect: 'evocation_savant' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Evocation Savant/));

    await waitFor(() => {
      expect(screen.getByTestId('evocation-savant-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('evocation-savant-modal')).not.toBeInTheDocument();
    });
  });
});
