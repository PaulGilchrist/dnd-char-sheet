import { screen, cleanup } from '@testing-library/react';
import { beforeEach } from 'vitest';
import { loot, q, setup, beforeEachSetup } from './log-test-utils.jsx';

import Log from './Log.jsx';

describe('Log', () => {
  beforeEach(() => {
    beforeEachSetup();
  });

  // ── LOOT ENTRY component ───────────────
  describe('LootEntry', () => {
    it('renders icon, title, and details container', () => {
      setup(Log, [loot()]);
      expect(q('.log-loot i.fa-coins')).toBeInTheDocument();
      expect(screen.getByText(/Loot/i)).toBeInTheDocument();
      expect(q('.log-loot-details')).toBeInTheDocument();
      expect(q('.log-entry.log-loot')).toBeInTheDocument();
    });

    it('formats XP with locale and shows/hides based on value', () => {
      setup(Log, [loot({ xpPerChar: 1500 })]);
      expect(screen.getByText(/1,500 XP per character/i)).toBeInTheDocument();
      expect(q('.log-loot-xp i.fa-star')).toBeInTheDocument();
      cleanup();
      setup(Log, [loot({ xpPerChar: 0 })]);
      expect(screen.queryByText(/XP per character/i)).not.toBeInTheDocument();
    });

    it('renders loot items as list, hides when empty', () => {
      setup(Log, [loot({ lootItems: ['Ring', 'Potion'] })]);
      expect(document.querySelectorAll('.log-loot-item').length).toBe(2);
      cleanup();
      setup(Log, [loot({ lootItems: [] })]);
      expect(screen.queryByText(/log-loot-items/i)).not.toBeInTheDocument();
    });
  });
});
