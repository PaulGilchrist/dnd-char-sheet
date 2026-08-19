import { createMassHealHandler } from './massHealUtils.js';

const { handle, confirmFn: confirmMassCureWounds } = createMassHealHandler({
    spellName: 'Mass Cure Wounds',
    defaultSlotLevel: 5,
    defaultMaxTargets: 6,
    modalName: 'massCureWoundsTarget',
    logPrefix: 'massCureWounds',
    emptyMessage: 'No creatures in combat.',
});

export { handle, confirmMassCureWounds };
