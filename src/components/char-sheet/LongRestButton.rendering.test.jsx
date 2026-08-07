// @cleaned-by-ai
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LongRestButton from './LongRestButton.jsx';

// ── Mocks ──

vi.mock('../../services/rules/effects/tranceRules.js', () => ({
  hasTranceTrait: vi.fn(),
}));

vi.mock('../../services/rules/effects/restRules.js', () => ({
  applyLongRest: vi.fn(),
}));

vi.mock('../../services/automation/handlers/buffs/tempHpService.js', () => ({
  setTempHp: vi.fn(),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('./modals/shared/CreatureSelectionModal.jsx', () => ({
  default: function MockModal({ title, icon, description, note, confirmLabel, confirmIcon, targets }) {
    return (
      <div data-testid="creature-selection-modal">
        <div data-testid="modal-title">{title}</div>
        <div data-testid="modal-icon">{icon}</div>
        <div data-testid="modal-description">{description}</div>
        <div data-testid="modal-note">{note}</div>
        <div data-testid="modal-confirm-label">{confirmLabel}</div>
        <div data-testid="modal-confirm-icon">{confirmIcon}</div>
        {targets && targets.map((t, i) => (
          <div key={i} data-testid={`target-${i}`}>{t.name}</div>
        ))}
      </div>
    );
  },
}));

// ── Re-import mocks ──

import * as tranceRules from '../../services/rules/effects/tranceRules.js';
import * as restRules from '../../services/rules/effects/restRules.js';

// ── Fixtures ──

const basePlayerStats = {
  name: 'TestCharacter',
  level: 5,
  hitPoints: 45,
  class: { name: 'Cleric' },
};

const trancePlayerStats = {
  ...basePlayerStats,
  race: { traits: [{ name: 'Trance' }] },
};

const mockCampaignName = 'test-campaign';

function makeProps(overrides) {
  return {
    playerStats: basePlayerStats,
    campaignName: mockCampaignName,
    onLongRest: vi.fn(),
    ...(overrides || {}),
  };
}

// ── Tests ──

describe('LongRestButton rendering', () => {
  it('renders the long rest button with icon and text', () => {
    tranceRules.hasTranceTrait.mockReturnValue(false);
    render(<LongRestButton {...makeProps()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveTextContent('Long Rest');
  });

  it('shows "(4 hours)" suffix when character has Trance trait', () => {
    tranceRules.hasTranceTrait.mockReturnValue(true);
    render(<LongRestButton {...makeProps({ playerStats: trancePlayerStats })} />);
    expect(screen.getByRole('button')).toHaveTextContent('Long Rest (4 hours)');
  });

  it('omits "(4 hours)" when character does not have Trance trait', () => {
    tranceRules.hasTranceTrait.mockReturnValue(false);
    render(<LongRestButton {...makeProps({ playerStats: basePlayerStats })} />);
    expect(screen.getByRole('button')).not.toHaveTextContent('4 hours');
  });

  it('sets correct title attribute based on Trance trait', () => {
    tranceRules.hasTranceTrait.mockReturnValue(false);
    render(<LongRestButton {...makeProps()} />);
    expect(screen.getByRole('button')).toHaveAttribute(
      'title',
      'Long Rest: restore all HP, spell slots, hit dice, and class resources',
    );
  });

  it('sets correct title with 4 hours when character has Trance', () => {
    tranceRules.hasTranceTrait.mockReturnValue(true);
    render(<LongRestButton {...makeProps({ playerStats: trancePlayerStats })} />);
    expect(screen.getByRole('button')).toHaveAttribute(
      'title',
      'Long Rest (4 hours): restore all HP, spell slots, hit dice, and class resources',
    );
  });

  it('renders with Font Awesome bed icon', () => {
    tranceRules.hasTranceTrait.mockReturnValue(false);
    const { container } = render(<LongRestButton {...makeProps()} />);
    const icon = container.querySelector('i.fa-bed');
    expect(icon).toBeInTheDocument();
  });

  it('applies correct CSS class to button', () => {
    tranceRules.hasTranceTrait.mockReturnValue(false);
    render(<LongRestButton {...makeProps()} />);
    expect(screen.getByRole('button')).toHaveClass('char-btn');
  });

  it('renders without crashing when onLongRest is not provided', () => {
    tranceRules.hasTranceTrait.mockReturnValue(false);
    expect(() =>
      render(<LongRestButton playerStats={basePlayerStats} campaignName={mockCampaignName} />),
    ).not.toThrow();
  });

  it('renders CreatureSelectionModal with correct props when celestialResilienceAllies is returned', async () => {
    tranceRules.hasTranceTrait.mockReturnValue(false);
    const celestialData = {
      creatureTargets: [{ name: 'Ally1', type: 'player' }, { name: 'Ally2', type: 'npc' }],
      allyTempHp: 12,
      selfTempHp: 8,
      maxTargets: 5,
    };
    restRules.applyLongRest.mockResolvedValue({ celestialResilienceAllies: celestialData });

    render(<LongRestButton {...makeProps()} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('creature-selection-modal')).toBeInTheDocument();
    });

    expect(screen.getByTestId('modal-title')).toHaveTextContent('Celestial Resilience');
    expect(screen.getByTestId('modal-icon')).toHaveTextContent('fa-shield-hart');
    expect(screen.getByTestId('modal-description')).toHaveTextContent(
      'Choose up to 5 allies to gain temporary hit points from your Celestial Resilience.',
    );
    expect(screen.getByTestId('modal-note')).toHaveTextContent(
      'You gain 8 temporary hit points. Each selected ally gains 12 temporary hit points.',
    );
    expect(screen.getByTestId('modal-confirm-label')).toHaveTextContent('Grant Resilience');
    expect(screen.getByTestId('modal-confirm-icon')).toHaveTextContent('fa-shield-hart');
    expect(screen.getByTestId('target-0')).toHaveTextContent('Ally1');
    expect(screen.getByTestId('target-1')).toHaveTextContent('Ally2');
  });
});
