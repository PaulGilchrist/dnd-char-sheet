import { screen } from '@testing-library/react';
import { beforeEach } from 'vitest';
import { spell, meta, q, setup, beforeEachSetup } from './log-test-utils.jsx';

import Log from './Log.jsx';

describe('Log', () => {
  beforeEach(() => {
    beforeEachSetup();
  });

  // ── SPELL ENTRY component ───────────────
  describe('SpellEntry', () => {
    it('shows "Cast" + spellName, level, casting time, and wand icon', () => {
      setup(Log, [spell()]);
      expect(screen.getByText(/Cast Fireball/i)).toBeInTheDocument();
      expect(q('.log-spell')).toBeInTheDocument();
      expect(q('.log-spell i.fa-wand-magic-sparkles')).toBeInTheDocument();
    });

    it('shows "No Metamagic" when empty, renders metamagic list and SP cost when present', () => {
      setup(Log, [spell({ metamagic: [] })]);
      expect(screen.getByText(/No Metamagic/i)).toBeInTheDocument();
      setup(Log, [spell({ metamagic: ['Empowered'] })]);
      expect(q('.log-metamagic-list')).toBeInTheDocument();
      expect(q('.log-metamagic-option')).toBeInTheDocument();
      setup(Log, [{ ...spell(), spCost: 2, metamagic: ['Empowered'] }]);
      expect(screen.getByText(/2 SP/i)).toBeInTheDocument();
      expect(q('.log-metamagic-cost')).toBeInTheDocument();
    });

    it('renders multiple metamagics separately', () => {
      setup(Log, [spell({ metamagic: ['E', 'X', 'R'] })]);
      expect(document.querySelectorAll('.log-metamagic-option').length).toBe(3);
    });
  });

  // ── METAMAGIC ENTRY component ───────────────
  describe('MetamagicEntry', () => {
    it('shows spell name, target arrow, damage diff, and positive class', () => {
      setup(Log, [meta({ spellName: 'Vampiric Touch', targetName: 'Dragon', originalDamage: 20, newTotal: 30, damageDifference: 5 })]);
      expect(screen.getByText(/Empowered/i)).toBeInTheDocument();
      expect(screen.getByText(/\u2192 Dragon/i)).toBeInTheDocument();
      expect(screen.getByText(/20 \u2192 30/i)).toBeInTheDocument();
      expect(screen.getByText(/\+5/i)).toBeInTheDocument();
      expect(q('.log-empowered-positive')).toBeInTheDocument();
    });
  });
});
