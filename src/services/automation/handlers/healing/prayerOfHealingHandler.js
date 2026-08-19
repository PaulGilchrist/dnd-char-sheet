import { createMassHealHandler } from './massHealUtils.js';

const { handle, confirmFn: confirmPrayerOfHealing } = createMassHealHandler({
    spellName: 'Prayer of Healing',
    defaultSlotLevel: 2,
    defaultMaxTargets: 5,
    modalName: 'prayerOfHealingTarget',
    logPrefix: 'prayerOfHealing',
    useCurrentRound: true,
});

export { handle, confirmPrayerOfHealing };
