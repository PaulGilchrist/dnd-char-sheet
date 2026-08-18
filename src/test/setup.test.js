// @improved-by-ai
import { describe, it, expect, afterEach } from 'vitest';
import { clearActiveInstances, setApplyBusy, isApplyBusy } from '../components/char-sheet/modals/shared/areaEffectModalInstances.js';

describe('areaEffectModalInstances — applyBusy flag management', () => {
  afterEach(() => {
    clearActiveInstances();
  });

  it('starts as not busy', () => {
    expect(isApplyBusy()).toBe(false);
  });

  it('sets busy state to true', () => {
    setApplyBusy(true);
    expect(isApplyBusy()).toBe(true);
  });

  it('sets busy state to false', () => {
    setApplyBusy(true);
    setApplyBusy(false);
    expect(isApplyBusy()).toBe(false);
  });

  it('clears busy state', () => {
    setApplyBusy(true);
    clearActiveInstances();
    expect(isApplyBusy()).toBe(false);
  });

  it('clear is idempotent — clearing twice has same effect', () => {
    setApplyBusy(true);
    clearActiveInstances();
    clearActiveInstances();
    expect(isApplyBusy()).toBe(false);
  });

  it('clear when already false is a no-op', () => {
    expect(isApplyBusy()).toBe(false);
    clearActiveInstances();
    expect(isApplyBusy()).toBe(false);
  });
});
