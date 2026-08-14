// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SpellDetailPopup from './SpellDetailPopup.jsx';
import { getRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';
import { getActiveBuffs } from '../../../services/combat/buffs/buffService.js';

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
  useRuntimeValue: vi.fn(() => null),
}));

vi.mock('../../../services/combat/buffs/buffService.js', () => ({
  getActiveBuffs: vi.fn(() => []),
}));

vi.mock('../../../services/ui/sanitize.js', () => ({
  sanitizeHtml: (html) => html,
}));

const baseMockPlayerStats = {
  name: 'Elara',
  level: 5,
  class: { name: 'Sorcerer', major: { name: 'Sorcerer' } },
  abilities: [{ name: 'Charisma', bonus: 3 }],
  proficiency: 3,
  spellAbilities: {
    spell_slots_level_1: 4,
    spell_slots_level_2: 3,
    spell_slots_level_3: 2,
    spells: [],
  },
  automation: { passives: [], actions: [] },
};

const mockCampaignName = 'test-campaign';

const baseMockSpell = {
  name: 'Magic Missile',
  level: 1,
  description: 'Three darts of force strike a creature.',
  casting_time: '1 action',
  range: '120 feet',
  duration: 'Instantaneous',
  damage: {
    damage_at_slot_level: {
      '1': '3d4+1',
      '2': '4d4+1',
      '3': '5d4+1',
    },
  },
  school: 'Evocation',
};

const renderPopup = (
  spell = baseMockSpell,
  playerStats = baseMockPlayerStats,
  campaignName = mockCampaignName,
  extraProps = {}
) =>
  render(
    <SpellDetailPopup
      spell={spell}
      playerStats={playerStats}
      campaignName={campaignName}
      onClose={vi.fn()}
      {...extraProps}
    />
  );

describe('SpellDetailPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getRuntimeValue).mockReturnValue(null);
    vi.mocked(getActiveBuffs).mockReturnValue([]);
  });

  describe('Close button', () => {
    it('calls onClose when Close button is clicked', () => {
      const onClose = vi.fn();
      renderPopup(baseMockSpell, baseMockPlayerStats, mockCampaignName, { onClose });

      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('renders Close button with secondary styling', () => {
      renderPopup();
      const closeBtn = screen.getByRole('button', { name: 'Close' });
      expect(closeBtn).toHaveClass('char-btn-secondary');
    });
  });

  describe('Slot label formatting', () => {
    it.each([
      { slots: 3, expectedText: '3 slots', label: 'plural' },
      { slots: 1, expectedText: '1 slot', label: 'singular' },
    ])('uses $label slot label for available slots', ({ slots, expectedText }) => {
      const upcastLevels = [
        { level: 2, formula: '4d4+1', availableSlots: slots },
        { level: 3, formula: '5d4+1', availableSlots: 2 },
      ];
      renderPopup(baseMockSpell, baseMockPlayerStats, mockCampaignName, {
        upcastLevels,
      });
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });
  });

  describe('Description rendering', () => {
    it('joins description array strings without separator', () => {
      const spell = {
        ...baseMockSpell,
        description: ['Line 1.', 'Line 2.'],
      };
      renderPopup(spell);
      expect(screen.getByText('Line 1.Line 2.')).toBeInTheDocument();
    });

    it('renders empty string when description is null', () => {
      const spell = {
        ...baseMockSpell,
        description: null,
      };
      renderPopup(spell);
      expect(screen.getByText('Magic Missile')).toBeInTheDocument();
      expect(screen.queryByText('Three darts of force strike a creature.')).not.toBeInTheDocument();
    });

    it('renders empty string when description is undefined', () => {
      const spell = {
        ...baseMockSpell,
        description: undefined,
      };
      renderPopup(spell);
      expect(screen.getByText('Magic Missile')).toBeInTheDocument();
    });
  });

  describe('Area of effect rendering', () => {
    it.each([
      { aoe: { type: 'Circle', size: '20 ft. radius' }, expectedText: 'Circle - 20 ft. radius', label: 'with type and size' },
      { aoe: { type: 'Sphere' }, expectedText: 'Sphere', label: 'type only, no size' },
      { aoe: { type: 'Cone', size: '60 ft. cone' }, expectedText: 'Cone - 60 ft. cone', label: 'cone shape' },
    ])('renders area of effect $label', ({ aoe, expectedText }) => {
      const spell = {
        ...baseMockSpell,
        area_of_effect: aoe,
      };
      renderPopup(spell);
      expect(screen.getByText(/Area:/)).toBeInTheDocument();
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });

    it('does not render area section when area_of_effect is missing', () => {
      const spell = {
        ...baseMockSpell,
        area_of_effect: undefined,
      };
      renderPopup(spell);
      expect(screen.queryByText(/Area:/)).not.toBeInTheDocument();
    });

    it('does not render area section when area_of_effect is null', () => {
      const spell = {
        ...baseMockSpell,
        area_of_effect: null,
      };
      renderPopup(spell);
      expect(screen.queryByText(/Area:/)).not.toBeInTheDocument();
    });
  });

  describe('Missing metadata fields', () => {
    it('renders dash for missing casting_time', () => {
      const spell = {
        ...baseMockSpell,
        casting_time: undefined,
      };
      renderPopup(spell);
      const dashTexts = screen.getAllByText('—');
      expect(dashTexts.length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('1 action')).not.toBeInTheDocument();
    });

    it('renders dash for missing range', () => {
      const spell = {
        ...baseMockSpell,
        range: undefined,
      };
      renderPopup(spell);
      const dashTexts = screen.getAllByText('—');
      expect(dashTexts.length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('120 feet')).not.toBeInTheDocument();
    });

    it('renders dash for missing duration', () => {
      const spell = {
        ...baseMockSpell,
        duration: undefined,
      };
      renderPopup(spell);
      const dashTexts = screen.getAllByText('—');
      expect(dashTexts.length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('Instantaneous')).not.toBeInTheDocument();
    });

    it('does not render school span when school is undefined', () => {
      const spell = {
        ...baseMockSpell,
        school: undefined,
      };
      renderPopup(spell);
      expect(screen.getByText(/Level:/)).toBeInTheDocument();
      expect(screen.queryByText('Evocation')).not.toBeInTheDocument();
      expect(screen.queryByText(/School:/)).not.toBeInTheDocument();
    });

    it('does not render school span when school is null', () => {
      const spell = {
        ...baseMockSpell,
        school: null,
      };
      renderPopup(spell);
      expect(screen.queryByText('Evocation')).not.toBeInTheDocument();
      expect(screen.queryByText(/School:/)).not.toBeInTheDocument();
    });
  });
});
