import { screen } from '@testing-library/react';
import { beforeEach } from 'vitest';
import { enc, q, setup, beforeEachSetup } from './log-test-utils.jsx';

import Log from './Log.jsx';

describe('Log', () => {
  beforeEach(() => {
    beforeEachSetup();
  });

  // ── ENCOUNTER ENTRY component - started ───────────────
  describe('EncounterEntry - started', () => {
    it('shows "Encounter Started" with skull icon, encounter name, and monsters', () => {
      setup(Log, [enc({ action: 'started', monsters: ['Gob x4', 'Troll'] })]);
      expect(screen.getByText(/Encounter Started/i)).toBeInTheDocument();
      expect(q('.log-encounter i.fa-skull')).toBeInTheDocument();
      expect(q('.log-entry.log-encounter.log-encounter-start')).toBeInTheDocument();
      expect(q('.log-encounter-name')).toHaveTextContent(/Orc Ambush/i);
      expect(screen.getByText(/Gob x4/i)).toBeInTheDocument();
      expect(q('.log-encounter-monster')).toBeInTheDocument();
    });
  });

  // ── ENCOUNTER ENTRY component - completed ───────────────
  describe('EncounterEntry - completed', () => {
    it('shows "Encounter Completed" with trophy icon, XP, and loot items', () => {
      setup(Log, [enc({ action: 'completed', xpPerChar: 750, lootItems: ['Sword'] })]);
      expect(screen.getByText(/Encounter Completed/i)).toBeInTheDocument();
      expect(q('.log-encounter i.fa-trophy')).toBeInTheDocument();
      expect(q('.log-entry.log-encounter.log-encounter-end')).toBeInTheDocument();
      expect(screen.getByText(/750 XP per character/i)).toBeInTheDocument();
      expect(q('.log-encounter-xp i.fa-star')).toBeInTheDocument();
      expect(screen.getByText(/Sword/i)).toBeInTheDocument();
      expect(q('.log-encounter-loot-item')).toBeInTheDocument();
    });

    it('hides XP when zero, hides loot when empty', () => {
      setup(Log, [enc({ action: 'completed', xpPerChar: 0 })]);
      expect(screen.queryByText(/XP per character/i)).not.toBeInTheDocument();
      setup(Log, [enc({ action: 'completed' })]);
      expect(screen.queryByText(/log-encounter-loot/i)).not.toBeInTheDocument();
    });
  });
});
