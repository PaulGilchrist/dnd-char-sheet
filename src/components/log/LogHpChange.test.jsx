import { screen } from '@testing-library/react';
import { beforeEach } from 'vitest';
import { hp, q, setup, beforeEachSetup } from './log-test-utils.jsx';

import Log from './Log.jsx';

describe('Log', () => {
  beforeEach(() => {
    beforeEachSetup();
  });

  // ── HP CHANGE ENTRY component - non-NPC ───────────────
  describe('HpChangeEntry - non-NPC', () => {
    it('negative delta -> "Takes Damage" with crack icon and HP display', () => {
      setup(Log, [hp({ delta: -5, currentHp: 20, maxHp: 25 })]);
      expect(screen.getByText(/Takes Damage/i)).toBeInTheDocument();
      expect(q('.log-hp-damage i.fa-heart-crack')).toBeInTheDocument();
      expect(q('.log-entry.log-hp-change.log-hp-damage')).toBeInTheDocument();
      expect(screen.getByText(/20\/25/i)).toBeInTheDocument();
      expect(q('.log-hp-current')).toBeInTheDocument();
    });

    it('positive delta -> "Healed" with heart icon, shows source when set', () => {
      setup(Log, [hp({ delta: 8 })]);
      expect(screen.getByText(/Healed/i)).toBeInTheDocument();
      expect(q('.log-healing i.fa-heart')).toBeInTheDocument();
      setup(Log, [hp({ delta: 8, sourceName: 'Cleric' })]);
      expect(screen.getByText(/Healed \(Cleric\)/i)).toBeInTheDocument();
    });

    it('isUnconscious shows prefix text combined with damage', () => {
      setup(Log, [hp({ delta: -10, isUnconscious: true })]);
      expect(screen.getByText(/Knocked Unconscious/i)).toBeInTheDocument();
      expect(screen.getByText(/Knocked Unconscious.*Takes Damage/i)).toBeInTheDocument();
    });

    it('hides HP current display for NPC (threshold)', () => {
      setup(Log, [hp({ delta: -5, threshold: 'dead' })]);
      expect(q('.log-hp-current')).not.toBeInTheDocument();
    });
  });

  // ── HP CHANGE ENTRY component - NPC thresholds ───────────────
  describe('HpChangeEntry - NPC thresholds', () => {
    it('dead/bloodied/recovering thresholds show correct labels', () => {
      setup(Log, [hp({ delta: -20, threshold: 'dead' })]);
      expect(screen.getByText(/Defeated/i)).toBeInTheDocument();
      setup(Log, [hp({ delta: -15, threshold: 'bloodied' })]);
      expect(screen.getByText(/Bloodied/i)).toBeInTheDocument();
      setup(Log, [hp({ delta: 10, threshold: 'recovering' })]);
      expect(screen.getByText(/Recovering/i)).toBeInTheDocument();
    });

    it('shows paren delta for recovering NPC', () => {
      setup(Log, [hp({ delta: 8, threshold: 'recovering' })]);
      expect(q('.log-name').textContent).toMatch(/\(\+8\)/);
    });

    it('zero delta NPC hides paren display', () => {
      setup(Log, [hp({ delta: 0, threshold: 'bloodied' })]);
      expect(screen.queryByText(/\(0\)/i)).not.toBeInTheDocument();
    });
  });
});
