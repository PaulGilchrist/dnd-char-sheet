import { screen, cleanup } from '@testing-library/react';
import { beforeEach } from 'vitest';
import { ds, q, setup, beforeEachSetup } from './log-test-utils.jsx';

import Log from './Log.jsx';

describe('Log', () => {
  beforeEach(() => {
    beforeEachSetup();
  });

  // ── DEATH SAVE ENTRY component ───────────────
  describe('DeathSaveEntry', () => {
    it('normal success/failure with correct text, classes, and die styling', () => {
      setup(Log, [ds({ success: true })]);
      expect(screen.getByText(/Death Save Success/i)).toBeInTheDocument();
      expect(q('.log-entry.log-death-save.log-death-save-success')).toBeInTheDocument();
      expect(q('.log-death-save .log-die-selected')).toBeInTheDocument();
      cleanup();
      setup(Log, [{ ...ds(), success: false }]);
      expect(screen.getByText(/Death Save Failure/i)).toBeInTheDocument();
      expect(q('.log-death-save .log-die-selected')).not.toBeInTheDocument();
    });

    it('nat20 shows "Stabilized!" with NAT 20 badge', () => {
      setup(Log, [ds({ success: true, isNatural20: true })]);
      expect(screen.getByText(/Stabilized!/i)).toBeInTheDocument();
      expect(screen.queryByText(/Death Save Success/i)).not.toBeInTheDocument();
      expect(screen.getByText(/NAT 20/i)).toBeInTheDocument();
    });

    it('nat1 shows "Double Failure" with NAT 1 badge', () => {
      setup(Log, [ds({ success: false, isNatural1: true })]);
      expect(screen.getByText(/Double Failure/i)).toBeInTheDocument();
      expect(screen.queryByText(/Death Save Failure/i)).not.toBeInTheDocument();
      expect(screen.getByText(/NAT 1/i)).toBeInTheDocument();
    });

    it('shows roll value in parens and skull-crossbones icon', () => {
      setup(Log, [ds({ roll: 12 })]);
      expect(screen.getByText(/\(12\)/)).toBeInTheDocument();
      expect(q('.log-death-save i.fa-skull-crossbones')).toBeInTheDocument();
    });

    it('shows both dice with selected/discarded and ADVANTAGE badge when rolls array present', () => {
      setup(Log, [ds({ roll: 17, rolls: [17, 9], hasAdvantage: true })]);
      expect(screen.getByText(/ADVANTAGE/i)).toBeInTheDocument();
      expect(screen.getByText(/selected/i)).toBeInTheDocument();
      expect(screen.getByText(/discarded/i)).toBeInTheDocument();
      expect(screen.getByText(/\(17/)).toBeInTheDocument();
      expect(screen.getByText(/\(9/)).toBeInTheDocument();
    });
  });
});
