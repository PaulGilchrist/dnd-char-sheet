import { createMassHealHandler } from './massHealUtils.js';

const { handle, confirmFn: confirmMassHealingWord } = createMassHealHandler({
    spellName: 'Mass Healing Word',
    defaultSlotLevel: 3,
    defaultMaxTargets: 6,
    modalName: 'massHealingWordTarget',
    logPrefix: 'massHealingWord',
    emptyMessage: 'No creatures in combat.',
});

export { handle, confirmMassHealingWord };
