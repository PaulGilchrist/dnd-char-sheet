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

describe('CharSpecialActions - Weapon modal onClose handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('closes WeaponKindMasteryModal when onClose is called', async () => {
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

    fireEvent.click(screen.getByText(/Weapon Kind Mastery/));

    await waitFor(() => {
      expect(screen.getByTestId('weapon-kind-mastery-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('weapon-kind-mastery-modal')).not.toBeInTheDocument();
    });
  });

  it('closes WeaponMasteryChoiceModal when onClose is called', async () => {
    executeHandler.mockResolvedValue({
      type: 'modal',
      modalName: 'weaponMasteryChoice',
      payload: { action: { name: 'Weapon Mastery' } },
    });

    const playerStats = createPlayerStats({
      specialActions: [
        { name: 'Weapon Mastery', description: 'Choose mastery.', automation: { type: 'weapon_mastery_choice' } },
      ],
    });

    render(<CharSpecialActions playerStats={playerStats} campaignName="test" />);

    fireEvent.click(screen.getByText(/Weapon Mastery/));

    await waitFor(() => {
      expect(screen.getByTestId('weapon-mastery-choice-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('weapon-mastery-choice-modal')).not.toBeInTheDocument();
    });
  });
});
