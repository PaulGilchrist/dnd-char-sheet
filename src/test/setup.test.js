// @cleaned-by-ai
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { clearActiveInstances, setApplyBusy, isApplyBusy } from '../components/char-sheet/modals/shared/areaEffectModalInstances.js';

describe('test setup — areaEffectModalInstances cleanup', () => {
  beforeEach(() => {
    clearActiveInstances();
  });

  afterEach(() => {
    clearActiveInstances();
  });

  it('clears busy state via clearActiveInstances', () => {
    setApplyBusy(true);
    expect(isApplyBusy()).toBe(true);

    clearActiveInstances();
    expect(isApplyBusy()).toBe(false);
  });
});
