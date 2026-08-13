import { screen } from '@testing-library/react';
import { beforeEach } from 'vitest';
import { travel, q, setup, beforeEachSetup } from './log-test-utils.jsx';

import Log from './Log.jsx';

describe('Log', () => {
  beforeEach(() => {
    beforeEachSetup();
  });

  // ── TRAVEL ENTRY component ───────────────
  describe('TravelEntry', () => {
    it.each([
      ['advance', 'Advanced to', 'fa-person-walking'],
      ['advance_with_event', 'Event triggered at', 'fa-bolt'],
      ['arrived', 'Arrived at', 'fa-flag-checkered'],
      ['camp', 'Camped at', 'fa-campground'],
      ['forced_march', 'Forced march at', 'fa-person-running'],
      ['event_accept', 'Accepted event at', 'fa-check'],
      ['event_skip', 'Skipped event at', 'fa-xmark'],
      ['event_reroll', 'Re-rolled event at', 'fa-dice'],
      ['extreme_weather', 'Weather halted travel at', 'fa-triangle-exclamation'],
      ['day_exhausted', 'Budget exhausted at', 'fa-tent'],
      ['cancel', 'Travel cancelled at', 'fa-ban'],
    ])('action %s -> label "%s" with icon .%s', (action, label, icon) => {
      setup(Log, [travel({ action })]);
      expect(screen.getByText(new RegExp(label, 'i'))).toBeInTheDocument();
      expect(q(`.log-travel i.${icon}`)).toBeInTheDocument();
    });

    it('unknown action falls back to advance config', () => {
      setup(Log, [travel({ action: 'bad' })]);
      expect(screen.getByText(/Advanced to/i)).toBeInTheDocument();
    });

    it('renders hex coords, terrain, weather, and event title', () => {
      setup(Log, [travel({ hex: { q: 5, r: -3 }, terrain: 'Mountain', weather: 'Rainy', eventTitle: 'Ambush!', eventType: 'Enemy' })]);
      expect(screen.getByText(/\(5, -3\)/)).toBeInTheDocument();
      expect(screen.getByText(/Mountain/i)).toBeInTheDocument();
      expect(q('.log-travel-terrain i.fa-mountain')).toBeInTheDocument();
      expect(screen.getByText(/Rainy/i)).toBeInTheDocument();
      expect(screen.getByText(/Ambush!/i)).toBeInTheDocument();
    });

    it('uses custom weather icon when provided', () => {
      setup(Log, [travel({ weather: 'Storms', weatherIcon: 'cloud-showers-heavy' })]);
      expect(q('.log-travel-weather i.fa-cloud-showers-heavy')).toBeInTheDocument();
    });
  });
});
