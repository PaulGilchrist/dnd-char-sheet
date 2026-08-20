// @improved-by-ai
import { screen } from '@testing-library/react';
import { beforeEach } from 'vitest';
import { spell, meta, q, setup, beforeEachSetup } from './log-test-utils.jsx';

import Log from './Log.jsx';

describe('Log', () => {
  beforeEach(() => {
    beforeEachSetup();
  });

  describe('SpellEntry', () => {
    it('shows "Cast" + spellName, characterName, level, casting time, and wand icon', () => {
      setup(Log, [spell()]);
      expect(screen.getByText(/Cast Fireball/i)).toBeInTheDocument();
      expect(screen.getByText(/Gandalf/i)).toBeInTheDocument();
      expect(screen.getByText(/Level 3/i)).toBeInTheDocument();
      expect(screen.getByText(/Action/i)).toBeInTheDocument();
      expect(q('.log-spell')).toBeInTheDocument();
      expect(q('.log-spell i.fa-wand-magic-sparkles')).toBeInTheDocument();
    });

    it('shows target name when present', () => {
      setup(Log, [spell({ targetName: 'Orc' })]);
      expect(screen.getByText(/→ Orc/i)).toBeInTheDocument();
    });

    it('hides target when not present', () => {
      setup(Log, [spell({ targetName: '' })]);
      expect(screen.queryByText(/→ /i)).not.toBeInTheDocument();
    });

    it('shows multiple targets joined by comma', () => {
      setup(Log, [spell({ targets: ['Orc', 'Goblin', 'Skeleton'] })]);
      expect(screen.getByText(/→ Orc, Goblin, Skeleton/i)).toBeInTheDocument();
    });

    it('hides targets when not present', () => {
      setup(Log, [spell({ targets: [] })]);
      expect(screen.queryByText(/→ /i)).not.toBeInTheDocument();
    });

    it('shows damage formula and type when present', () => {
      setup(Log, [spell({ damageFormula: '8d6', damageType: 'fire' })]);
      expect(screen.getByText(/8d6 fire/i)).toBeInTheDocument();
    });

    it('hides damage when not present', () => {
      setup(Log, [spell({ damageFormula: '', damageType: '' })]);
      expect(q('.log-damage')).not.toBeInTheDocument();
    });

    it('shows save DC when present', () => {
      setup(Log, [spell({ saveDC: 15 })]);
      expect(screen.getByText(/Save DC 15/i)).toBeInTheDocument();
    });

    it('hides save DC when not present', () => {
      setup(Log, [spell({ saveDC: null })]);
      expect(q('.log-save-dc')).not.toBeInTheDocument();
    });

    it('shows concentration indicator when present', () => {
      setup(Log, [spell({ concentration: true })]);
      expect(screen.getByText(/Concentration/i)).toBeInTheDocument();
      expect(q('.log-concentration i.fa-link')).toBeInTheDocument();
    });

    it('hides concentration when not present', () => {
      setup(Log, [spell({ concentration: false })]);
      expect(q('.log-concentration')).not.toBeInTheDocument();
    });

    it('renders description with dangerouslySetInnerHTML', () => {
      setup(Log, [spell({ description: '<p>A bright flare streaks down</p>' })]);
      expect(q('.log-spell-description')).toBeInTheDocument();
      expect(q('.log-spell-description')).toHaveTextContent(/A bright flare/i);
    });

    it('hides description when not present', () => {
      setup(Log, [spell({ description: '' })]);
      expect(q('.log-spell-description')).not.toBeInTheDocument();
    });

    it('shows "No Metamagic" when metamagic array is empty', () => {
      setup(Log, [spell({ metamagic: [] })]);
      expect(screen.getByText(/No Metamagic/i)).toBeInTheDocument();
    });

    it('renders metamagic list and SP cost when present', () => {
      setup(Log, [spell({ metamagic: ['Empowered'], spCost: 2 })]);
      expect(q('.log-metamagic-list')).toBeInTheDocument();
      expect(q('.log-metamagic-option')).toBeInTheDocument();
      expect(q('.log-metamagic-option')).toHaveTextContent(/Empowered/i);
      expect(q('.log-metamagic-cost')).toBeInTheDocument();
      expect(screen.getByText(/2 SP/i)).toBeInTheDocument();
    });

    it('hides SP cost when zero', () => {
      setup(Log, [spell({ metamagic: ['Empowered'], spCost: 0 })]);
      expect(q('.log-metamagic-cost')).not.toBeInTheDocument();
    });

    it('renders multiple metamagics as separate items', () => {
      setup(Log, [spell({ metamagic: ['E', 'X', 'R'] })]);
      expect(document.querySelectorAll('.log-metamagic-option').length).toBe(3);
    });
  });

  describe('MetamagicEntry', () => {
    it('shows spell name, target arrow, damage diff, and positive class for empowered spells', () => {
      setup(Log, [meta({ spellName: 'Vampiric Touch', targetName: 'Dragon', originalDamage: 20, newTotal: 30, damageDifference: 5 })]);
      expect(screen.getByText(/Empowered/i)).toBeInTheDocument();
      expect(screen.getByText(/\u2192 Dragon/i)).toBeInTheDocument();
      expect(screen.getByText(/20 \u2192 30/i)).toBeInTheDocument();
      expect(screen.getByText(/\+5/i)).toBeInTheDocument();
      expect(q('.log-empowered-positive')).toBeInTheDocument();
    });
  });
});
