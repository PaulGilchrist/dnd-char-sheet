import { screen } from '@testing-library/react';
import { beforeEach } from 'vitest';
import { cond, q, setup, beforeEachSetup } from './log-test-utils.jsx';

import Log from './Log.jsx';

describe('Log', () => {
  beforeEach(() => {
    beforeEachSetup();
  });

  // ── CONDITION ENTRY component ───────────────
  describe('ConditionEntry', () => {
    it('applied -> "Condition Applied" with warning icon, shows DC and ability save', () => {
      setup(Log, [cond({ action: 'applied', dc: 15, ability: 'wisdom' })]);
      expect(screen.getByText(/Condition Applied/i)).toBeInTheDocument();
      expect(q('.log-condition i.fa-circle-exclamation')).toBeInTheDocument();
      expect(q('.log-entry.log-condition.log-condition-applied')).toBeInTheDocument();
      expect(q('.log-condition-name')).toHaveTextContent(/charmed/i);
      expect(screen.getByText(/DC 15/i)).toBeInTheDocument();
      expect(q('.log-condition-ability')).toHaveTextContent(/WISDOM save/i);
    });

    it('broken -> "Condition Broken" with check icon, hides DC/ability, shows source', () => {
      setup(Log, [cond({ action: 'broken', dc: 13, ability: 'wisdom', sourceName: 'Hero Potion' })]);
      expect(screen.getByText(/Condition Broken/i)).toBeInTheDocument();
      expect(q('.log-condition i.fa-circle-check')).toBeInTheDocument();
      expect(q('.log-entry.log-condition.log-condition-broken')).toBeInTheDocument();
      expect(screen.queryByText(/DC 13/i)).not.toBeInTheDocument();
      expect(q('.log-condition-ability')).not.toBeInTheDocument();
      expect(q('.log-condition-source')).toBeInTheDocument();
    });

    it('hides source when empty for broken action', () => {
      setup(Log, [cond({ action: 'broken', sourceName: '' })]);
      expect(q('.log-condition-source')).not.toBeInTheDocument();
    });

    it('shows character and timestamp in header', () => {
      setup(Log, [cond({ action: 'applied' })]);
      expect(q('.log-condition .log-character')).toHaveTextContent(/Gollum/i);
      expect(q('.log-condition .log-time')).toBeInTheDocument();
    });
  });
});
