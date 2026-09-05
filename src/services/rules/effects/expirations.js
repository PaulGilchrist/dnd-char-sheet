/**
 * Barrel re-export for the expiration system modules.
 *
 * Original file (expirations.js) was 1,499 lines. It has been split into:
 *   - turnStartEffects.js          — applyTurnStartEffects + per-effect handlers
 *   - expirationQueue.js            — addExpiration, processExpirationList, expireForCreature/Target
 *   - clearExpirationEffects.js     — clearExpirationEffects (large switch statement)
 *   - expireStaleEffects.js         — expireStaleEffects
 *   - clearAllExpirationEffects.js  — clearAllExpirationEffects (rest/initiative cleanup)
 *   - auraDamageService.js          — applyAuraDamage, applyHolyNimbusDamage
 *   - toppleCleanup.js              — cleanUpToppleConditions
 *   - turnEndConditionRemoval.js    — applyTurnEndConditionRemoval (CLA-307 owner turn-end)
 *
 * This file re-exports all public APIs so existing consumers continue to work.
 */

export {
    applyTurnStartEffects,
    KEY,
} from './turnStartEffects.js';

export {
    addExpiration,
    processExpirationList,
    expireForCreature,
    expireForTarget,
} from './expirationQueue.js';

export {
    clearExpirationEffects,
} from './clearExpirationEffects.js';

export {
    expireStaleEffects,
} from './expireStaleEffects.js';

export {
    clearAllExpirationEffects,
} from './clearAllExpirationEffects.js';

export {
    applyAuraDamage,
    applyHolyNimbusDamage,
} from './auraDamageService.js';

export {
    applyTurnEndConditionRemoval,
} from './turnEndConditionRemoval.js';
