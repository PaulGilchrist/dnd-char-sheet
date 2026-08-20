// @improved-by-ai
import { screen } from '@testing-library/react';
import { beforeEach } from 'vitest';
import { hp, heal, q, setup, beforeEachSetup } from './log-test-utils.jsx';

import Log from './Log.jsx';

describe('Log', () => {
  beforeEach(() => {
    beforeEachSetup();
  });

  // ── HpChangeEntry - damage breakdown ──────────────────

  describe('HpChangeEntry - damage breakdown', () => {
    it('renders damage breakdown with resistance and immunity badges', () => {
      setup(Log, [hp({
        delta: -10,
        damageBreakdown: [
          { damageType: 'fire', status: 'resistant' },
          { damageType: 'cold', status: 'immune' },
        ],
      })]);
      expect(screen.getByText(/10 HP/i)).toBeInTheDocument();
      expect(screen.getByText(/fire/i)).toBeInTheDocument();
      expect(screen.getByText(/cold/i)).toBeInTheDocument();
      expect(screen.getByText(/Resistance/i)).toBeInTheDocument();
      expect(screen.getByText(/Immune/i)).toBeInTheDocument();
      expect(document.querySelectorAll('.log-damage-breakdown-item').length).toBe(2);
    });

    it('renders damage breakdown with positive delta', () => {
      setup(Log, [hp({
        delta: 5,
        damageBreakdown: [
          { damageType: 'healing', status: 'normal' },
        ],
      })]);
      expect(screen.getByText(/\+5 HP/i)).toBeInTheDocument();
    });

    it('renders rollInfo for healing entries', () => {
      setup(Log, [hp({
        delta: 8,
        rollInfo: '2d8+2',
      })]);
      expect(screen.getByText(/\(2d8\+2\)/i)).toBeInTheDocument();
    });

    it('renders formula for healing entries', () => {
      setup(Log, [hp({
        delta: 6,
        formula: '1d8+1',
      })]);
      expect(screen.getByText(/1d8\+1/i)).toBeInTheDocument();
    });

    it('renders bonusDetails for healing entries', () => {
      setup(Log, [hp({
        delta: 12,
        bonusDetails: [
          { amount: 4, name: 'Inspiration' },
          { amount: 2, name: 'Channel Divinity' },
        ],
      })]);
      expect(screen.getByText(/plus/i)).toBeInTheDocument();
      expect(screen.getByText(/4 \[Inspiration\]/i)).toBeInTheDocument();
      expect(screen.getByText(/2 \[Channel Divinity\]/i)).toBeInTheDocument();
    });

    it('hides rollInfo, formula, and bonusDetails for damage', () => {
      setup(Log, [hp({
        delta: -5,
        rollInfo: 'should not show',
        formula: 'should not show',
        bonusDetails: [{ amount: 1, name: 'test' }],
      })]);
      expect(screen.queryByText(/should not show/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/1 \[test\]/i)).not.toBeInTheDocument();
    });
  });

  // ── HealingEntry - resurrection ───────────────────────

  describe('HealingEntry - resurrection', () => {
    it('renders resurrection badge and "Brought Back to Life"', () => {
      setup(Log, [heal({
        resurrection: true,
        amount: 25,
        sourceName: 'Cleric',
      })]);
      expect(screen.getByText(/Brought Back to Life/i)).toBeInTheDocument();
      expect(screen.getByText(/Resurrection/i)).toBeInTheDocument();
      expect(screen.getByText(/Returns to life with 25 HP/i)).toBeInTheDocument();
      expect(q('.log-entry.log-healing.log-resurrection')).toBeInTheDocument();
      expect(q('.log-healing i.fa-dove')).toBeInTheDocument();
    });

    it('renders normal healing without resurrection badge', () => {
      setup(Log, [heal({ amount: 10, sourceName: 'Cleric' })]);
      expect(screen.getByText(/Healed \(Cleric\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Healed for 10 HP/i)).toBeInTheDocument();
      expect(q('.log-resurrection-badge')).not.toBeInTheDocument();
      expect(q('.log-healing i.fa-heart')).toBeInTheDocument();
    });

    it('renders popupText when present', () => {
      setup(Log, [heal({
        resurrection: true,
        amount: 30,
        popupText: 'You feel the warmth of life returning.',
      })]);
      expect(screen.getByText(/You feel the warmth/i)).toBeInTheDocument();
    });

    it('renders healingName when no sourceName', () => {
      setup(Log, [heal({
        amount: 5,
        sourceName: '',
        healingName: 'Lay on Hands',
      })]);
      expect(q('.log-name')).toHaveTextContent(/Lay on Hands/i);
    });
  });
});
