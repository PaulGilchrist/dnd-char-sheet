// @improved-by-ai
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LongRestButton from './LongRestButton.jsx';

// ── Mocks ──

vi.mock('../../services/rules/effects/tranceRules.js', () => ({
  hasTranceTrait: vi.fn(),
}));

vi.mock('../../services/rules/effects/restRules.js', () => ({
  applyLongRest: vi.fn(),
}));

// ── Re-import mocks ──

import * as tranceRules from '../../services/rules/effects/tranceRules.js';

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the button with icon and base text', () => {
    tranceRules.hasTranceTrait.mockReturnValue(false);
    render(<LongRestButton {...makeProps()} />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Long Rest');
  });

  it('appends "(4 hours)" suffix when character has Trance trait', () => {
    tranceRules.hasTranceTrait.mockReturnValue(true);
    render(<LongRestButton {...makeProps({ playerStats: trancePlayerStats })} />);

    expect(screen.getByRole('button')).toHaveTextContent('Long Rest (4 hours)');
  });

  it('omits "(4 hours)" when character does not have Trance trait', () => {
    tranceRules.hasTranceTrait.mockReturnValue(false);
    render(<LongRestButton {...makeProps({ playerStats: basePlayerStats })} />);

    expect(screen.getByRole('button')).not.toHaveTextContent('4 hours');
  });

  it('sets correct title for characters without Trance', () => {
    tranceRules.hasTranceTrait.mockReturnValue(false);
    render(<LongRestButton {...makeProps()} />);

    expect(screen.getByRole('button')).toHaveAttribute(
      'title',
      'Long Rest: restore all HP, spell slots, hit dice, and class resources',
    );
  });

  it('sets correct title with "(4 hours)" prefix for characters with Trance', () => {
    tranceRules.hasTranceTrait.mockReturnValue(true);
    render(<LongRestButton {...makeProps({ playerStats: trancePlayerStats })} />);

    expect(screen.getByRole('button')).toHaveAttribute(
      'title',
      'Long Rest (4 hours): restore all HP, spell slots, hit dice, and class resources',
    );
  });

  it('renders Font Awesome bed icon with correct classes', () => {
    tranceRules.hasTranceTrait.mockReturnValue(false);
    const { container } = render(<LongRestButton {...makeProps()} />);

    const icon = container.querySelector('i.fas.fa-bed');
    expect(icon).toBeInTheDocument();
  });

  it('applies char-btn CSS class to the button', () => {
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

  it('renders without crashing when playerStats has no race property', () => {
    tranceRules.hasTranceTrait.mockReturnValue(false);
    const statsWithoutRace = { name: 'NoRace', level: 1, hitPoints: 10 };

    expect(() =>
      render(<LongRestButton playerStats={statsWithoutRace} campaignName={mockCampaignName} />),
    ).not.toThrow();
  });
});
