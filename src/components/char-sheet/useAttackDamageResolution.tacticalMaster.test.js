// Regression tests for WM-003: Tactical Master modal must render (synced mirror write)
// and the paused pipeline must RESUME on confirm/skip so the chain is never stalled.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/combat/steps/index.js', () => ({
  buildPipelineForAction: vi.fn(() => ({
    run: vi.fn(async (_event, _ctx, resumeRef) => {
      resumeRef.current = {
        ...resumeRef.current,
        _pausedStep: 'tacticalMaster',
        _modalType: 'tacticalMaster',
        _modalProps: { attackName: 'Scimitar', baseMastery: 'Nick', replaceOptions: ['Push', 'Sap', 'Slow'], targetName: 'Animated Rug of Smothering 1' },
        pipelineStash: { pipeline: { resume: vi.fn(async (_c, rr) => { rr.current = null; }) }, ctx: {} },
      };
    }),
    resume: vi.fn(async (_ctx, resumeRef) => { resumeRef.current = null; }),
  })),
}));

import useAttackDamageResolution from './useAttackDamageResolution.js';

const attack = { name: 'Scimitar', damage: '1d6+0', damageType: 'Slashing', weaponType: 'weapon', properties: ['Light'], type: 'Action' };
const playerStats = { name: 'EvasiveFighter', level: 18, proficiency: 6, abilities: [{ name: 'Strength', bonus: 0 }], automation: { passives: [] } };

function makeDeps(resumeRef) {
  return {
    playerStats,
    campaignName: 'test-campaign',
    mapName: null,
    popupHtml: { hit: true, targetName: 'Animated Rug of Smothering 1' },
    setPopupHtml: vi.fn(),
    rollDamage: vi.fn(),
    buildCtx: vi.fn(() => Promise.resolve({})),
    buildCtxSync: vi.fn(() => Promise.resolve({})),
    setModalState: vi.fn(),
    modalState: {},
    setPendingDamage: vi.fn(),
    setTacticalMasterModal: vi.fn(),
    resumeRef,
  };
}

describe('useAttackDamageResolution — Tactical Master pause render + resume (WM-003)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates the synced tacticalMasterModal mirror so the modal renders on pause', async () => {
    const resumeRef = { current: null };
    const deps = makeDeps(resumeRef);
    const { resolveAttackDamage } = useAttackDamageResolution(deps);

    await resolveAttackDamage(attack, { hit: true, targetName: 'Animated Rug of Smothering 1' });

    expect(resumeRef.current?._pausedStep).toBe('tacticalMaster');
    expect(deps.setTacticalMasterModal).toHaveBeenCalledWith(
      expect.objectContaining({ attackName: 'Scimitar', baseMastery: 'Nick', targetName: 'Animated Rug of Smothering 1' })
    );
  });

  it('resumeAttackPipeline resumes when paused at tacticalMaster (not stalled)', async () => {
    const resumeRef = { current: null };
    const deps = makeDeps(resumeRef);
    const { resolveAttackDamage, resumeAttackPipeline } = useAttackDamageResolution(deps);

    await resolveAttackDamage(attack, { hit: true, targetName: 'Animated Rug of Smothering 1' });
    expect(resumeRef.current?._pausedStep).toBe('tacticalMaster');

    await resumeAttackPipeline();
    expect(resumeRef.current).toBeNull();
  });

  it('resumeAttackPipeline is a no-op for unrelated paused steps', async () => {
    const resumeRef = { current: { _pausedStep: 'damageTypeChoice', pipelineStash: { pipeline: { resume: vi.fn() }, ctx: {} } } };
    const deps = makeDeps(resumeRef);
    const { resumeAttackPipeline } = useAttackDamageResolution(deps);

    await resumeAttackPipeline();
    expect(resumeRef.current._pausedStep).toBe('damageTypeChoice');
  });
});
